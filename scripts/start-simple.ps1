Write-Host "🚀 Запуск простой инфраструктуры..." -ForegroundColor Green

# Проверяем Docker
docker version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker не запущен!" -ForegroundColor Red
    exit 1
}

# Проверяем есть ли docker-compose.yml
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "❌ docker-compose.yml не найден!" -ForegroundColor Red
    exit 1
}

# Запускаем
Write-Host "🐳 Запускаем docker-compose..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "⏳ Ждем 10 секунд..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "📊 Проверяем контейнеры:" -ForegroundColor Green
docker ps --filter "name=dsu-"

Write-Host ""
Write-Host "✅ Готово!" -ForegroundColor Green
Write-Host "PostgreSQL: localhost:5433"
Write-Host "Kafka:      localhost:9093"
