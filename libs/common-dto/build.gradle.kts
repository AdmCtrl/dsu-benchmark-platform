plugins {
    id("java-library")
}

dependencies {
    // Spring Boot для валидации и JSON
    implementation("org.springframework.boot:spring-boot-starter-validation:3.2.0")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.15.3")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310:2.15.3")
    
    // Lombok для уменьшения boilerplate кода
    compileOnly("org.projectlombok:lombok:1.18.30")
    annotationProcessor("org.projectlombok:lombok:1.18.30")
    
    // Тестирование
    testImplementation("org.springframework.boot:spring-boot-starter-test:3.2.0")
    testImplementation("org.junit.jupiter:junit-jupiter-api:5.10.0")
    testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine:5.10.0")
}

tasks.jar {
    archiveBaseName.set("common-dto")
    archiveVersion.set("1.0.0")
    manifest {
        attributes(
            "Implementation-Title" to "Common DTO",
            "Implementation-Version" to archiveVersion.get()
        )
    }
}