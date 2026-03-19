#!/usr/bin/env pwsh

Write-Host "🚀 Запуск инфраструктуры DSU Benchmark..." -ForegroundColor Green

# Проверяем Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker не установлен!" -ForegroundColor Red
    exit 1
}

Write-Host "🐳 Проверяем Docker Compose..." -ForegroundColor Cyan
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Docker Compose не найден, пробуем docker compose..." -ForegroundColor Yellow
    # Проверяем docker compose v2
    docker compose version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker Compose не работает!" -ForegroundColor Red
        exit 1
    }
    $composeCmd = "docker compose"
} else {
    $composeCmd = "docker-compose"
}

# Останавливаем старые контейнеры если есть
Write-Host "🛑 Останавливаем старые контейнеры..." -ForegroundColor Yellow
Invoke-Expression "$composeCmd down 2>`$null"

# Создаем сеть если не существует
Write-Host "🌐 Создаем сеть dsu-network..." -ForegroundColor Cyan
docker network create dsu-network 2>$null

# Запускаем инфраструктуру
Write-Host "🐳 Запускаем контейнеры..." -ForegroundColor Cyan
Invoke-Expression "$composeCmd up -d"

Write-Host "⏳ Ожидаем запуска сервисов (15 секунд)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Проверяем статус
Write-Host "📊 Статус сервисов:" -ForegroundColor Green
Invoke-Expression "$composeCmd ps"

Write-Host ""
Write-Host "✅ Инфраструктура запущена!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Доступные сервисы:" -ForegroundColor Cyan
Write-Host "  PostgreSQL:      localhost:5433 (dsudb/dsuadmin/dsupass123)"
Write-Host "  Kafka:           localhost:9093"
Write-Host "  Kafka UI:        http://localhost:8080"
Write-Host "  Redis:           localhost:6380 (пароль: redispass123)"
Write-Host "  Prometheus:      http://localhost:9090"
Write-Host "  Grafana:         http://localhost:3000 (admin/admin)"
Write-Host ""
Write-Host "🔧 Для остановки: $composeCmd down" -ForegroundColor Yellow
