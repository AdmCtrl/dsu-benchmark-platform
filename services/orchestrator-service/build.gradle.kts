plugins {
    id("java")
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
    id("application")
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
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    implementation ("jakarta.annotation:jakarta.annotation-api:2.1.1")
    
    // Kafka
    implementation("org.springframework.kafka:spring-kafka")
    
    // Database
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation ("org.postgresql:postgresql:42.6.0")
    
    // Redis
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    
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
    testImplementation("org.springframework.kafka:spring-kafka-test")
}

// Включаем bootJar для orchestrator-service
tasks.bootJar {
    archiveFileName.set("orchestrator-service.jar")
    mainClass.set("com.dsu.orchestrator.Application")
}

tasks.jar {
    enabled = true
}

tasks.test {
    useJUnitPlatform()
}

application {
    mainClass.set("com.dsu.orchestrator.Application")
}
