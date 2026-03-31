package com.dsu.orchestrator.service;

import com.dsu.orchestrator.event.JobEventBus;
import com.dsu.orchestrator.model.AlgorithmType;
import com.dsu.orchestrator.model.Job;
import com.dsu.orchestrator.event.JobEvent;
import com.dsu.orchestrator.event.JobEventType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class SqlJobExecutor {

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final JobEventBus eventBus;

    public SqlJobExecutor(NamedParameterJdbcTemplate jdbcTemplate, JobEventBus eventBus) {
        this.jdbcTemplate = jdbcTemplate;
        this.eventBus = eventBus;
    }

    public void executeSqlJob(Job job, AlgorithmType type, String executionId) {
        String sqlFile = getSqlFileForType(type);
        if (sqlFile == null) {
            logError(job, executionId, "Unknown SQL algorithm type: " + type);
            return;
        }

        try {
            // 1. Читаем SQL скрипт
            String sqlTemplate = loadSqlFromResources(sqlFile);
            
            // 2. Логируем начало (T2)
            long startTime = System.currentTimeMillis();
            logInfo(job, executionId, "🚀 Starting SQL Algorithm: " + type.getDescription());

            // 3. Выполняем (предполагаем, что taskId в скрипте используется как именованный параметр :taskId)
            // Важно: UUID в Postgres должен передаваться как объект UUID
            jdbcTemplate.update(sqlTemplate, Map.of("taskId", UUID.fromString(job.getId())));

            long duration = System.currentTimeMillis() - startTime;
            logInfo(job, executionId, "✅ SQL Execution finished in " + duration + " ms (T2)");

            // 4. Финализируем (в реальности здесь еще будет вставка в dsu_benchmarks)
            // Но пока просто логируем завершение
            
        } catch (Exception e) {
            log.error("Failed to execute SQL job", e);
            logError(job, executionId, "SQL Error: " + e.getMessage());
        }
    }

    private String getSqlFileForType(AlgorithmType type) {
        return switch (type) {
            case SQL_RECURSIVE_CTE -> "sql/dsu_recursive_cte.sql";
            case SQL_ITERATIVE_MERGE -> "sql/dsu_iterative_plpgsql.sql";
            case SQL_HYBRID_INDEXED -> "sql/dsu_hybrid_indexed.sql";
            default -> null;
        };
    }

    private String loadSqlFromResources(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        return StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
    }

    private void logInfo(Job job, String executionId, String message) {
        eventBus.publish(JobEvent.log(job, executionId, message));
    }

    private void logError(Job job, String executionId, String message) {
        eventBus.publish(JobEvent.log(job, executionId, "❌ " + message));
        job.markFailed(message);
    }
}
