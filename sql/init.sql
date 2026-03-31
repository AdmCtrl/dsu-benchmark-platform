-- Инициализация базы данных DSU Benchmark
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица задач
CREATE TABLE tasks (
    task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    algorithm VARCHAR(50),
    total_chunks INTEGER,
    processed_chunks INTEGER DEFAULT 0,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Таблица групп DSU
CREATE TABLE dsu_groups (
    group_id SERIAL PRIMARY KEY,
    task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
    algorithm VARCHAR(50) NOT NULL,
    root_element_id INTEGER,
    group_size INTEGER NOT NULL,
    elements JSONB NOT NULL,
    processing_time_ms BIGINT,
    memory_used_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created ON tasks(created_at);
CREATE INDEX idx_tasks_algorithm ON tasks(algorithm);
CREATE INDEX idx_dsu_groups_task ON dsu_groups(task_id);
CREATE INDEX idx_dsu_groups_algorithm ON dsu_groups(algorithm);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Представление для статистики
CREATE VIEW tasks_statistics AS
SELECT 
    algorithm,
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_tasks,
    AVG(file_size) as avg_file_size,
    MIN(created_at) as first_task,
    MAX(created_at) as last_task
FROM tasks
GROUP BY algorithm;

-- Таблица ребер для SQL-алгоритмов (Stage 2)
CREATE TABLE dsu_edges (
    task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
    node_a INTEGER NOT NULL,
    node_b INTEGER NOT NULL
);

-- Индексы для ускорения поиска в SQL-алгоритмах
CREATE INDEX idx_dsu_edges_task ON dsu_edges(task_id);
CREATE INDEX idx_dsu_edges_nodes ON dsu_edges(node_a, node_b);

-- Таблица детальных бенчмарков (T1, T2, Total)
CREATE TABLE dsu_benchmarks (
    benchmark_id SERIAL PRIMARY KEY,
    task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
    algorithm VARCHAR(50) NOT NULL,
    ingestion_ms BIGINT,  -- T1
    processing_ms BIGINT, -- T2
    total_ms BIGINT,      -- Total
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dsu_benchmarks_task ON dsu_benchmarks(task_id);

-- Таблица для первичного импорта CSV (N-колонный формат в длинный список)
CREATE TABLE dsu_input_data (
    task_id UUID REFERENCES tasks(task_id) ON DELETE CASCADE,
    row_id INTEGER NOT NULL,
    column_index INTEGER NOT NULL,
    val TEXT NOT NULL
);

CREATE INDEX idx_dsu_input_task ON dsu_input_data(task_id);
CREATE INDEX idx_dsu_input_val ON dsu_input_data(column_index, val) WHERE val != '';