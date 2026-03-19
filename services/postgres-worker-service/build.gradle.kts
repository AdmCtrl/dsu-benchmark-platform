plugins {
    id("java")
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
    id("java-library")
}

group = "com.dsu"
version = "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_21
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    compileOnly("org.projectlombok:lombok:1.18.30")
    annotationProcessor("org.projectlombok:lombok:1.18.30")
    testImplementation("org.springframework.boot:spring-boot-starter-test:3.2.0")
}

tasks.bootJar {
    enabled = false
}

tasks.jar {
    enabled = true
    archiveBaseName.set("postgres-worker-service")
    archiveVersion.set("1.0.0")
}

tasks.test {
    useJUnitPlatform()
}
