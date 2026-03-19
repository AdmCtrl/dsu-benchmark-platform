package com.dsu.orchestrator.model;

import java.nio.file.Path;
import java.time.Instant;
import java.util.Objects;

public class Job {

    private final String id;
    private final Path workDir;
    private final String inputFileName;
    private final String outputFileName;

    // mutable state
    private volatile JobStatus status;
    private volatile Instant createdAt;
    private volatile Instant startedAt;
    private volatile Instant finishedAt;
    private volatile String errorMessage;

    public Job(String id, Path workDir, String inputFileName, String outputFileName) {
        this.id = Objects.requireNonNull(id, "id");
        this.workDir = Objects.requireNonNull(workDir, "workDir");
        this.inputFileName = Objects.requireNonNull(inputFileName, "inputFileName");
        this.outputFileName = Objects.requireNonNull(outputFileName, "outputFileName");
        this.status = JobStatus.PENDING;
        this.createdAt = Instant.now();
    }

    // --- getters (used by service / controller) ---
    public String getId() {
        return id;
    }

    public Path getWorkDir() {
        return workDir;
    }

    public String getInputFileName() {
        return inputFileName;
    }

    public String getOutputFileName() {
        return outputFileName;
    }

    public JobStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    // --- setters / state changes ---
    // use synchronized where multiple fields are changed together
    public synchronized void setStatus(JobStatus status) {
        this.status = status;
    }

    public synchronized void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public synchronized void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }

    public synchronized void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public synchronized void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    // convenience: set status + started timestamp
    public synchronized void markRunning() {
        this.status = JobStatus.RUNNING;
        this.startedAt = Instant.now();
    }

    public synchronized void markSuccess() {
        this.status = JobStatus.FINISHED;
        this.finishedAt = Instant.now();
    }

    public synchronized void markFailed(String errorMessage) {
        this.status = JobStatus.FAILED;
        this.errorMessage = errorMessage;
        this.finishedAt = Instant.now();
    }

    @Override
    public String toString() {
        return "Job{" +
                "id='" + id + '\'' +
                ", workDir=" + workDir +
                ", inputFileName='" + inputFileName + '\'' +
                ", outputFileName='" + outputFileName + '\'' +
                ", status=" + status +
                ", createdAt=" + createdAt +
                ", startedAt=" + startedAt +
                ", finishedAt=" + finishedAt +
                ", errorMessage='" + errorMessage + '\'' +
                '}';
    }
}


