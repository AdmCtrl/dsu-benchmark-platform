#!/usr/bin/env pwsh
Write-Host "🛑 Останавливаем инфраструктуру DSU Benchmark..." -ForegroundColor Yellow
docker-compose down
Write-Host "✅ Инфраструктура остановлена!" -ForegroundColor Green