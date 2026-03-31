package com.dsu.dsuworker.algorithm;

import java.util.Arrays;

/**
 * High-performance Disjoint Set Union (DSU) implementation.
 * Supports Path Compression and Union by Rank.
 */
public class DsuAlgorithm {
    private final int[] parent;
    private final int[] rank;
    private int count;

    public DsuAlgorithm(int n) {
        if (n < 0) throw new IllegalArgumentException("Capacity cannot be negative");
        parent = new int[n];
        rank = new int[n];
        count = n;
        for (int i = 0; i < n; i++) {
            parent[i] = i;
            rank[i] = 0;
        }
    }

    /**
     * Finds the root of the set containing element x.
     * Implements Path Compression (Recursive).
     */
    public int find(int x) {
        if (parent[x] == x) {
            return x;
        }
        return parent[x] = find(parent[x]); // Path compression
    }

    /**
     * Unites sets containing elements x and y.
     * Implements Union by Rank.
     * @return true if sets were merged, false if they were already in the same set.
     */
    public boolean union(int x, int y) {
        int rootX = find(x);
        int rootY = find(y);
        
        if (rootX != rootY) {
            if (rank[rootX] < rank[rootY]) {
                parent[rootX] = rootY;
            } else if (rank[rootX] > rank[rootY]) {
                parent[rootY] = rootX;
            } else {
                parent[rootY] = rootX;
                rank[rootX]++;
            }
            count--;
            return true;
        }
        return false;
    }

    public int getCount() {
        return count;
    }

    public boolean isConnected(int x, int y) {
        return find(x) == find(y);
    }
    
    public int[] getParents() {
        return parent;
    }
}
