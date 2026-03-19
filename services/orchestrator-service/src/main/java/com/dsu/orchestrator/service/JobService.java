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
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.*;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

@Service
public class JobService {
    private final JobEventBus events;
    private final Map<String, Job> jobs = new ConcurrentHashMap<>();
    private final Path worksRoot;
    private final Path dsuJar;
    private final ExecutorService executor;
    private final int maxConcurrent;


    public JobService(
            JobEventBus events,
            @Value("${dsu.works-dir:works}") String worksDir,
            @Value("${dsu.jar:dsu.jar}") String dsuJarPath,
            @Value("${dsu.max-concurrent:2}") int maxConcurrent
    ) {
        try {
            this.events = events;

            this.worksRoot = Paths.get(worksDir).toAbsolutePath();
            if (!Files.exists(worksRoot)) Files.createDirectories(worksRoot);

            this.dsuJar = Paths.get(dsuJarPath).toAbsolutePath();
//        if (!Files.exists(this.dsuJar)) {
//            throw new IllegalStateException("DSU jar not found: " + this.dsuJar);
//        }

            this.maxConcurrent = maxConcurrent <= 0 ? 2 : maxConcurrent;
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

    public void runJobAsync(String id, List<String> extraArgs, String xmx) {
        Job job = jobs.get(id);
        if (job == null) throw new IllegalArgumentException("no job " + id);

        executor.submit(() -> {
            Path input = job.getWorkDir().resolve(job.getInputFileName());
            Path output = job.getWorkDir().resolve(job.getOutputFileName());
            Path logFile = job.getWorkDir().resolve("job.log");
            List<String> cmd = new ArrayList<>();
            cmd.add("java");
            cmd.add(xmx != null ? "-Xmx" + xmx : "-Xmx1G");
            cmd.add("-jar");
            cmd.add(dsuJar.toString());
            cmd.add(input.toString());
            if (extraArgs != null) cmd.addAll(extraArgs);

            ProcessBuilder pb = new ProcessBuilder(cmd)
                    .directory(job.getWorkDir().toFile())
                    .redirectErrorStream(true);
            int exitCode = -1;

            try {
                Process p = pb.start();
                job.markRunning();
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(p.getInputStream(), "windows-1251"))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        events.publish(JobEvent.log(job, line));
                    }
                }
                exitCode = p.waitFor();
                if (exitCode == 0) {
                    finishJob(job, JobStatus.FINISHED, null);
                } else {
                    finishJob(job, JobStatus.FAILED, "Exit code " + exitCode);
                }

            } catch (Exception e) {
                finishJob(job, JobStatus.FAILED, e.getMessage());
            } finally {
                job.setFinishedAt(Instant.now());
                events.publish(JobEvent.of(JobEventType.UPDATED, job));
            }
        });
    }

    public void deleteJob(String id) throws IOException {
        Job job = jobs.remove(id);
        if (job.getStatus() == JobStatus.RUNNING) {
            throw new IllegalStateException("Cannot delete running job");
        }
        if (job != null) {
            events.publish(JobEvent.of(JobEventType.DELETED, job));
            Path dir = job.getWorkDir();
            if (Files.exists(dir)) {
                Files.walk(dir)
                        .sorted(Comparator.reverseOrder())
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
                    // Попробуем найти какой-то входной файл (любой)
                    Optional<Path> inputFile = Files.list(dir)
                            .filter(Files::isRegularFile)
                            .findFirst();

                    String inputFileName = inputFile.map(Path::getFileName)
                            .map(Path::toString)
                            .orElse("unknown.csv");

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


