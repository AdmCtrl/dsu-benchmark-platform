#!/usr/bin/env pwsh
# Полная очистка Docker для проекта
Write-Host "🧹 Очистка Docker для DSU Benchmark..." -ForegroundColor Yellow

# Останавливаем и удаляем контейнеры
docker-compose down -v --remove-orphans

# Удаляем volumes
docker volume rm dsu-postgres-data 2>$null
docker volume rm dsu-kafka-data 2>$null
docker volume rm dsu-prometheus-data 2>$null
docker volume rm dsu-grafana-data 2>$null

# Удаляем сеть
docker network rm dsu-network 2>$null

Write-Host "✅ Docker полностью очищен!" -ForegroundColor Green