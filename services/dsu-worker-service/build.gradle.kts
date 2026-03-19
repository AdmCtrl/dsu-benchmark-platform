plugins {
    id("java")
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
    id("application")  // Добавляем plugin application
}

group = "com.dsu"
version = "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_21
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

dependencies {
    // Spring Boot
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    
    // Kafka
    implementation("org.springframework.kafka:spring-kafka")
    
    // Общие библиотеки нашего проекта
    implementation(project(":libs:common-dto"))
    implementation(project(":libs:kafka-events"))
    
    // Monitoring
    implementation("io.micrometer:micrometer-registry-prometheus")
    
    // Utilities
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")
    
    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

// Временно отключаем bootJar пока нет main класса
tasks.bootJar {
    enabled = false
}

tasks.jar {
    enabled = true
    archiveBaseName.set("dsu-worker-service")
    archiveVersion.set("1.0.0")
}

tasks.test {
    useJUnitPlatform()
}

// Указываем, что это библиотека, а не приложение
apply(plugin = "java-library")