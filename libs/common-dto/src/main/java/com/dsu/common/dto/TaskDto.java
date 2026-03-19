package com.dsu.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TaskDto {
    
    private UUID taskId;
    private String fileName;
    private Long fileSize;
    private TaskStatus status;
    private String fileUrl;
    private Instant createdAt;
    private Instant updatedAt;
    private Integer totalChunks;
    private Integer processedChunks;
    private AlgorithmType algorithm;
    
    public enum TaskStatus {
        PENDING,
        PROCESSING,
        COMPLETED,
        FAILED,
        CANCELLED
    }
    
    public enum AlgorithmType {
        JAVA_DSU_BASIC,
        JAVA_DSU_OPTIMIZED,
        JAVA_DSU_PARALLEL,
        PG_RECURSIVE,
        PG_ITERATIVE,
        PG_HYBRID
    }
}
