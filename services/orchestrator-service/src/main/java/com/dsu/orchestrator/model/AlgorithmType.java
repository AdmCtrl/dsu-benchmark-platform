package com.dsu.orchestrator.model;

public enum AlgorithmType {
    JAVA_JAR("Java Optimized JAR"),
    SQL_RECURSIVE_CTE("PostgreSQL Recursive CTE"),
    SQL_ITERATIVE_MERGE("PostgreSQL Iterative Merge"),
    SQL_HYBRID_INDEXED("PostgreSQL Hybrid Indexed");

    private final String description;

    AlgorithmType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
