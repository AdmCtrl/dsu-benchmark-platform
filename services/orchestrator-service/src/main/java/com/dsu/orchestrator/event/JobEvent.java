package com.dsu.orchestrator.event;

import com.dsu.orchestrator.model.Job;

import java.time.Instant;

public record JobEvent(
        JobEventType type,
        String jobId,
        String executionId,
        Job payload,
        String message,
        Instant ts
) {

    /** Событие изменения состояния Job (CREATED, DELETED) */
    public static JobEvent of(JobEventType type, Job job) {
        return new JobEvent(type, job.getId(), null, job, null, Instant.now());
    }

    /** UPDATED-событие от конкретного запуска — фронт знает, какой executionId завершился */
    public static JobEvent ofExecution(JobEventType type, Job job, String executionId) {
        return new JobEvent(type, job.getId(), executionId, job, null, Instant.now());
    }

    /** LOG-событие с привязкой к конкретному запуску (executionId) */
    public static JobEvent log(Job job, String executionId, String line) {
        return new JobEvent(
                JobEventType.LOG,
                job.getId(),
                executionId,
                null,
                line,
                Instant.now()
        );
    }
}
