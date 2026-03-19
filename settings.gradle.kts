rootProject.name = "dsu-benchmark-platform"

// Общие библиотеки
include(":libs:common-dto")
include(":libs:kafka-events") 
include(":libs:redis-client")

// Микросервисы
include(":services:orchestrator-service")
include(":services:dsu-worker-service")
include(":services:postgres-worker-service")
include(":services:query-service")
include(":services:analytics-service")
include(":services:notification-service")

// Настройки для улучшения работы в IDEA
pluginManagement {
    plugins {
        id("org.springframework.boot") version "3.2.0"
        id("io.spring.dependency-management") version "1.1.4"
        id("java")
        id("idea")
    }
    repositories {
        mavenCentral()
        gradlePluginPortal()
    }
}

// Включаем кэширование для ускорения сборки
buildCache {
    local {
        isEnabled = true
    }
}