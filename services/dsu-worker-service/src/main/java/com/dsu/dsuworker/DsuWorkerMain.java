package com.dsu.dsuworker;

import com.dsu.dsuworker.algorithm.DsuAlgorithm;

import java.io.*;
import java.nio.file.*;
import java.util.*;

/**
 * Main entry point for standalone DSU processing.
 * Reads CSV of edges (id1,id2) and outputs groups to output.txt.
 */
public class DsuWorkerMain {
    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: java -jar dsu-worker.jar <input-file.csv> [max-nodes]");
            System.exit(1);
        }

        String inputPath = args[0];
        int maxNodes = args.length > 1 ? Integer.parseInt(args[1]) : 1_000_001;

        System.out.println("🚀 Starting Java DSU Processing...");
        System.out.println("Processing file: " + inputPath);

        long startTime = System.currentTimeMillis();
        DsuAlgorithm dsu = new DsuAlgorithm(maxNodes);
        
        long rowsProcessed = 0;
        try (BufferedReader reader = Files.newBufferedReader(Paths.get(inputPath))) {
            String line;
            // Пропускаем заголовок если есть
            reader.readLine(); 
            
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split(",");
                if (parts.length >= 2) {
                    try {
                        int u = Integer.parseInt(parts[0].trim());
                        int v = Integer.parseInt(parts[1].trim());
                        if (u < maxNodes && v < maxNodes) {
                            dsu.union(u, v);
                        }
                    } catch (NumberFormatException e) {
                        // Игнорируем некорректные строки
                    }
                }
                rowsProcessed++;
                if (rowsProcessed % 100_000 == 0) {
                    System.out.println("Processed " + rowsProcessed + " rows...");
                }
            }
        } catch (IOException e) {
            System.err.println("❌ IO Error: " + e.getMessage());
            System.exit(1);
        }

        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;

        System.out.println("✅ Processing finished!");
        System.out.println("Total Rows: " + rowsProcessed);
        System.out.println("Final Groups: " + dsu.getCount());
        System.out.println("Time taken: " + duration + " ms");
        
        // В будущем здесь будет сохранение результата в output.txt или в БД
    }
}
