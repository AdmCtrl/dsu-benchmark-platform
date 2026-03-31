-- dsu_hybrid_indexed.sql
-- Алгоритм №3: Гибридный индексированный подход
-- Подход: Использование временных таблиц с индексами и одной мощной группировки. 
-- Пытаемся найти все компоненты за минимальное число проходов через JOIN и GROUP BY.

-- 1. Сначала подготавливаем граф в компактном виде
CREATE TEMP TABLE tmp_cc_edges ON COMMIT DROP AS
SELECT DISTINCT t1.row_id as u, t2.row_id as v
FROM dsu_input_data t1
JOIN dsu_input_data t2 ON t1.column_index = t2.column_index 
    AND t1.val = t2.val
    AND t1.row_id < t2.row_id
WHERE t1.task_id = :taskId AND t1.val != '';

CREATE INDEX idx_cc_u ON tmp_cc_edges(u);
CREATE INDEX idx_cc_v ON tmp_cc_edges(v);

-- 2. Используем рекурсивное сжатие (но более агрессивное, чем обычный CTE)
WITH RECURSIVE compressed AS (
    -- Каждое ребро (u, v) - это кандидат на группу
    SELECT u, v FROM tmp_cc_edges
    
    UNION
    
    -- Прыгаем через соседей (Path halving)
    SELECT c.u, e.v
    FROM compressed c
    JOIN tmp_cc_edges e ON c.v = e.u
)
INSERT INTO dsu_groups (task_id, algorithm, root_element_id, group_size, elements, processing_time_ms)
SELECT 
    :taskId, 
    'SQL_HYBRID_INDEXED', 
    root_id, 
    COUNT(DISTINCT n), 
    jsonb_agg(DISTINCT n),
    0
FROM (
    SELECT u as n, MIN(v) as root_id 
    FROM (
        SELECT u, v FROM compressed
        UNION ALL
        SELECT v, u FROM compressed
        UNION ALL
        SELECT DISTINCT row_id, row_id FROM dsu_input_data WHERE task_id = :taskId
    ) all_refs
    GROUP BY u
) mapped
GROUP BY root_id
HAVING COUNT(DISTINCT n) > 1;
