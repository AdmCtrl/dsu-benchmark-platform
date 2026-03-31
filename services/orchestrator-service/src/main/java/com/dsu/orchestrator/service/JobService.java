package com.dsu.orchestrator.service;

import com.dsu.orchestrator.event.JobEvent;
import com.dsu.orchestrator.event.JobEventBus;
import com.dsu.orchestrator.event.JobEventType;
import com.dsu.orchestrator.model.Job;
import com.dsu.orchestrator.model.JobStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PreDestroy;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.Connection;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import lombok.extern.slf4j.Slf4j;
import com.dsu.orchestrator.model.AlgorithmType;

@Slf4j
@Service
public class JobService {
    private final JobEventBus events;
    private final Map<String, Job> jobs = new ConcurrentHashMap<>();
    private final Path worksRoot;
    private final Path dsuJar;
    private final ExecutorService executor;
    private final SqlJobExecutor sqlExecutor;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final int maxConcurrent;
    private final String defaultXmx;


    public JobService(
            JobEventBus events,
            SqlJobExecutor sqlExecutor,
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate,
            @Value("${dsu.works-dir:works}") String worksDir,
            @Value("${dsu.jar:groupmerger-1.0.jar}") String dsuJarPath,
            @Value("${dsu.max-concurrent:2}") int maxConcurrent,
            @Value("${dsu.xmx:256m}") String defaultXmx
    ) {
        try {
            this.events = events;

            this.worksRoot = Paths.get(worksDir).toAbsolutePath();
            if (!Files.exists(worksRoot)) Files.createDirectories(worksRoot);

            this.dsuJar = Paths.get(dsuJarPath).toAbsolutePath();
//        if (!Files.exists(this.dsuJar)) {
//            throw new IllegalStateException("DSU jar not found: " + this.dsuJar);
//        }

            this.sqlExecutor = sqlExecutor;
            this.jdbcTemplate = jdbcTemplate;
            this.maxConcurrent = maxConcurrent <= 0 ? 2 : maxConcurrent;
            this.defaultXmx = defaultXmx;
            this.executor = Executors.newFixedThreadPool(this.maxConcurrent);

        } catch (IOException e) {
            throw new IllegalStateException("Failed to initialize JobService", e);
        }
    }


    public Job createJob(MultipartFile file) throws IOException {
        String id = randomKey8();
        Path jobDir = worksRoot.resolve(id);
        Files.createDirectories(jobDir);
        String inputFileName = Objects.requireNonNull(file.getOriginalFilename());
        Path inputPath = jobDir.resolve(inputFileName);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, inputPath, StandardCopyOption.REPLACE_EXISTING);
        }
        Job job = new Job(id, jobDir, inputFileName, "output.txt");
        jobs.put(id, job);
        events.publish(JobEvent.of(JobEventType.CREATED, job));
        return job;
    }

    public List<Job> listJobs() {
        return new ArrayList<>(jobs.values());
    }

    public Job getJob(String id) {
        return jobs.get(id);
    }

    public String runJobAsync(String id, List<String> extraArgs, String xmx) {
        Job job = jobs.get(id);
        if (job == null) throw new IllegalArgumentException("no job " + id);

        final String executionId = UUID.randomUUID().toString();

        executor.submit(() -> {
            job.markRunning();
            events.publish(JobEvent.ofExecution(JobEventType.UPDATED, job, executionId));

            if (job.getAlgorithmType() == AlgorithmType.JAVA_JAR) {
                runJarJob(job, executionId, extraArgs, xmx);
            } else {
                runSqlJob(job, executionId);
            }
        });
        return executionId;
    }

    private void runJarJob(Job job, String executionId, List<String> extraArgs, String xmx) {
        Path input = job.getWorkDir().resolve(job.getInputFileName());
        List<String> cmd = new ArrayList<>();
        cmd.add("java");
        cmd.add("-Xmx" + (xmx != null ? xmx : this.defaultXmx));
        cmd.add("-XX:MaxMetaspaceSize=64m");
        cmd.add("-Xss256k");
        cmd.add("-jar");
        cmd.add(dsuJar.toString());
        cmd.add(input.toString());
        if (extraArgs != null) cmd.addAll(extraArgs);

        ProcessBuilder pb = new ProcessBuilder(cmd)
                .directory(job.getWorkDir().toFile())
                .redirectErrorStream(true);
        try {
            Process p = pb.start();
            job.setCurrentProcess(p);
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(p.getInputStream(), "windows-1251"))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    events.publish(JobEvent.log(job, executionId, line));
                }
            }
            int exitCode = p.waitFor();
            if (exitCode == 0) {
                job.markSuccess();
            } else {
                job.markFailed("Exit code " + exitCode);
            }
        } catch (Exception e) {
            job.markFailed(e.getMessage());
        } finally {
            cleanupProcess(job, executionId);
        }
    }

    private void runSqlJob(Job job, String executionId) {
        try {
            // STEP 1: Ingestion (T1)
            long t1Start = System.currentTimeMillis();
            events.publish(JobEvent.log(job, executionId, "📥 Importing CSV to PostgreSQL (T1)..."));
            importCsvToPostgres(job);
            long t1End = System.currentTimeMillis();
            events.publish(JobEvent.log(job, executionId, "✅ Import finished in " + (t1End - t1Start) + " ms"));

            // STEP 2: Processing (T2)
            sqlExecutor.executeSqlJob(job, job.getAlgorithmType(), executionId);
            
            job.markSuccess();
        } catch (Exception e) {
            job.markFailed("SQL Execution failed: " + e.getMessage());
            events.publish(JobEvent.log(job, executionId, "❌ SQL Execution failed: " + e.getMessage()));
        } finally {
            cleanupProcess(job, executionId);
        }
    }

    private void importCsvToPostgres(Job job) throws Exception {
        UUID taskId = UUID.fromString(job.getId());
        
        // 1. Очищаем старые данные
        jdbcTemplate.update("DELETE FROM dsu_input_data WHERE task_id = ?", taskId);
        
        Path csvPath = job.getWorkDir().resolve(job.getInputFileName());
        
        // 2. Используем нативный COPY для максимальной скорости T1
        // Форматируем данные во временный строковый поток в формате "taskId,rowId,colIdx,val"
        try (Connection conn = Objects.requireNonNull(jdbcTemplate.getDataSource()).getConnection()) {
            org.postgresql.PGConnection pgConn = conn.unwrap(org.postgresql.PGConnection.class);
            org.postgresql.copy.CopyManager copyManager = pgConn.getCopyAPI();
            
            // Мы будем переливать данные через PipedOutputStream/InputStream для производительности
            PipedInputStream pin = new PipedInputStream();
            PipedOutputStream pout = new PipedOutputStream(pin);
            
            executor.submit(() -> {
                try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(pout, StandardCharsets.UTF_8));
                     BufferedReader reader = Files.newBufferedReader(csvPath)) {
                    
                    String line;
                    int rowId = 0;
                    // Пропускаем заголовок
                    reader.readLine();
                    
                    while ((line = reader.readLine()) != null) {
                        String[] parts = line.split(";", -1);
                        for (int colIdx = 0; colIdx < parts.length; colIdx++) {
                            String val = parts[colIdx].trim().replace("\"", "");
                            if (!val.isEmpty()) {
                                // CSV format for COPY: taskId,rowId,colIdx,val
                                writer.write(taskId + "\t" + rowId + "\t" + colIdx + "\t" + val + "\n");
                            }
                        }
                        rowId++;
                    }
                } catch (IOException e) {
                    log.error("Error piping data to COPY", e);
                }
            });
            
            copyManager.copyIn("COPY dsu_input_data (task_id, row_id, column_index, val) FROM STDOUT", pin);
        }
    }

    private void cleanupProcess(Job job, String executionId) {
        Process p = job.getCurrentProcess();
        if (p != null && p.isAlive()) {
            p.destroyForcibly();
        }
        job.setCurrentProcess(null);
        job.setFinishedAt(Instant.now());
        events.publish(JobEvent.ofExecution(JobEventType.UPDATED, job, executionId));
    }

    public void stopJob(String id) {
        Job job = jobs.get(id);
        if (job != null && job.getCurrentProcess() != null) {
            job.getCurrentProcess().destroyForcibly();
            job.markFailed("Stopped by user");
        }
    }

    public void deleteJob(String id) throws IOException {
        Job job = jobs.get(id);
        if (job == null) return;
        if (job.getStatus() == JobStatus.RUNNING) {
            throw new IllegalStateException("Cannot delete running job");
        }
        jobs.remove(id);
        events.publish(JobEvent.of(JobEventType.DELETED, job));
        Path dir = job.getWorkDir();
        if (Files.exists(dir)) {
            try (var walk = Files.walk(dir)) {
                walk.sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
            }
        }
    }

    private static String randomKey8() {
        var rnd = new Random();
        var sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) sb.append(rnd.nextInt(10));
        return sb.toString();
    }

    private void finishJob(Job job, JobStatus status, String error) {
        synchronized (job) {
            job.setStatus(status);
            job.setErrorMessage(error);
            job.setFinishedAt(Instant.now());
        }
    }

    public List<Job> repairJobs() {
        try {
            // 1️⃣ Создаём worksRoot, если нет
            if (!Files.exists(worksRoot)) Files.createDirectories(worksRoot);

            // 2️⃣ Собираем все папки в worksRoot
            Set<String> folders = new HashSet<>();
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(worksRoot)) {
                for (Path p : stream) {
                    if (Files.isDirectory(p)) folders.add(p.getFileName().toString());
                }
            }

            // 3️⃣ Убираем джобы, которых нет на диске
            jobs.entrySet().removeIf(entry -> !folders.contains(entry.getKey()));

            // 4️⃣ Добавляем джобы для новых папок
            for (String folderId : folders) {
                if (!jobs.containsKey(folderId)) {
                    Path dir = worksRoot.resolve(folderId);
                    String inputFileName = "unknown.csv";
                    try (var fileStream = Files.list(dir)) {
                        Optional<Path> inputFile = fileStream
                            .filter(Files::isRegularFile)
                            .findFirst();
                        
                        inputFileName = inputFile.map(Path::getFileName)
                            .map(Path::toString)
                            .orElse("unknown.csv");
                    } catch (IOException e) {
                        // Если папка занята или пуста - игнорируем конкретный джоб, но не вешаем весь сервис
                    }

                    Job job = new Job(folderId, dir, inputFileName, "output.txt");
                    job.setStatus(JobStatus.PENDING);
                    job.setCreatedAt(Instant.now());
                    jobs.put(folderId, job);
                    events.publish(JobEvent.of(JobEventType.CREATED, job));
                }
            }

            // 5️⃣ Вернуть актуальный список
            return new ArrayList<>(jobs.values());

        } catch (IOException e) {
            throw new IllegalStateException("Repair jobs failed", e);
        }
    }

    @PreDestroy
    public void shutdown() {
        executor.shutdownNow();
    }
}


