package com.dsu.orchestrator.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserConfig {
    private String lastCsvPath;
    private String outputFolder;
}

