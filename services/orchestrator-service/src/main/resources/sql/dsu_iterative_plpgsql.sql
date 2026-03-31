-- dsu_iterative_plpgsql.sql
-- Алгоритм №2: Итеративное "схлопывание" (Label Propagation) на PL/pgSQL
-- Подход: Цикл UPDATE, пока ID групп не перестанут меняться. 
-- Хорошо для глубоких графов, где рекурсия тонет.

DO $$
DECLARE
    affected_rows INTEGER;
    current_task_id UUID := :taskId;
BEGIN
    -- 1. Создаем ребра графа (локальные связи)
    CREATE TEMP TABLE tmp_edges ON COMMIT DROP AS
    SELECT DISTINCT t1.row_id as u, t2.row_id as v
    FROM dsu_input_data t1
    JOIN dsu_input_data t2 ON t1.task_id = t2.task_id 
        AND t1.column_index = t2.column_index 
        AND t1.val = t2.val
        AND t1.row_id < t2.row_id
    WHERE t1.task_id = current_task_id AND t1.val != '';

    CREATE INDEX idx_tmp_edges ON tmp_edges(u, v);

    -- 2. Инициализация групп
    CREATE TEMP TABLE tmp_groups (row_id INTEGER PRIMARY KEY, group_id INTEGER) ON COMMIT DROP;
    
    INSERT INTO tmp_groups (row_id, group_id)
    SELECT DISTINCT r, r
    FROM (
        SELECT u as r FROM tmp_edges
        UNION
        SELECT v as r FROM tmp_edges
        UNION
        SELECT DISTINCT row_id FROM dsu_input_data WHERE task_id = current_task_id
    ) all_nodes;

    -- 3. Цикл стабилизации
    LOOP
        UPDATE tmp_groups g
        SET group_id = sub.min_neigh_group
        FROM (
            -- Находим минимальный group_id среди соседей
            SELECT g2.row_id, MIN(LEAST(g2.group_id, neigh.group_id)) as min_neigh_group
            FROM tmp_groups g2
            JOIN (
                -- Симметричные ребра
                SELECT u as node, v as neighbor FROM tmp_edges
                UNION ALL
                SELECT v as node, u as neighbor FROM tmp_edges
            ) e ON g2.row_id = e.node
            JOIN tmp_groups neigh ON e.neighbor = neigh.row_id
            GROUP BY g2.row_id
        ) sub
        WHERE g.row_id = sub.row_id AND g.group_id > sub.min_neigh_group;

        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        EXIT WHEN affected_rows = 0;
    END LOOP;

    -- 4. Сброс результатов в dsu_groups
    INSERT INTO dsu_groups (task_id, algorithm, root_element_id, group_size, elements, processing_time_ms)
    SELECT 
        current_task_id, 
        'SQL_ITERATIVE_MERGE', 
        group_id, 
        COUNT(*), 
        jsonb_agg(row_id),
        0
    FROM tmp_groups
    GROUP BY group_id
    HAVING COUNT(*) > 1;

END $$;
