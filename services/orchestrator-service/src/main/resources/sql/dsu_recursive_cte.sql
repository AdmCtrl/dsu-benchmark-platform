-- dsu_recursive_cte.sql
-- Алгоритм №1: Рекурсивный CTE
-- Подход: Поиск всех достижимых узлов через рекурсию. 
-- ВАЖНО: Может потреблять много памяти на глубоких графах.

WITH RECURSIVE dsu_edges_local AS (
    -- Находим все пары строк, имеющие общие значения в тех же колонках
    SELECT DISTINCT t1.row_id as u, t2.row_id as v
    FROM dsu_input_data t1
    JOIN dsu_input_data t2 ON t1.task_id = t2.task_id 
        AND t1.column_index = t2.column_index 
        AND t1.val = t2.val
        AND t1.row_id < t2.row_id
    WHERE t1.task_id = :taskId AND t1.val != ''
),
connected_nodes AS (
    SELECT u as node_a, v as node_b FROM dsu_edges_local
    UNION
    SELECT v as node_a, u as node_b FROM dsu_edges_local
),
traversal AS (
    -- Базовый случай: все прямые связи
    SELECT node_a, node_b, ARRAY[node_a, node_b] as path
    FROM connected_nodes
    
    UNION
    
    -- Рекурсия: приклеиваем соседа
    SELECT t.node_a, e.node_b, t.path || e.node_b
    FROM traversal t
    JOIN connected_nodes e ON t.node_b = e.node_a
    WHERE NOT e.node_b = ANY(t.path) -- Защита от циклов
)
-- Вставляем результаты в финальную таблицу dsu_groups
INSERT INTO dsu_groups (task_id, algorithm, root_element_id, group_size, elements, processing_time_ms)
SELECT 
    :taskId, 
    'SQL_RECURSIVE_CTE', 
    min_node, 
    COUNT(DISTINCT node_id), 
    jsonb_agg(DISTINCT node_id),
    0 -- Время замеряется оркестратором (T2)
FROM (
    SELECT node_a as node_id, MIN(node_b) as min_node
    FROM (
        -- Все найденные связи + сами узлы (для групп из 1 элемента)
        SELECT node_a, node_b FROM traversal
        UNION ALL
        SELECT DISTINCT row_id, row_id FROM dsu_input_data WHERE task_id = :taskId
    ) all_pairs
    GROUP BY node_a
) components
GROUP BY min_node
HAVING COUNT(DISTINCT node_id) > 1;
