package com.dsu.orchestrator.event;

import com.dsu.orchestrator.model.Job;

import java.time.Instant;

public record JobEvent(
        JobEventType type,
        String jobId,
        Job payload,
        String message,
        Instant ts
) {

    public static JobEvent of(JobEventType type, Job job) {
        return new JobEvent(type, job.getId(), job, null, Instant.now());
    }

    public static JobEvent log(Job job, String line) {
        return new JobEvent(
                JobEventType.LOG,
                job.getId(),
                null,
                line,
                Instant.now()
        );
    }
}
