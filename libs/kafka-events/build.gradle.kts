plugins {
    id("java-library")
}

dependencies {
    implementation(project(":libs:common-dto"))
    
    // Kafka
    implementation("org.springframework.kafka:spring-kafka:3.1.0")
    
    // JSON
    implementation("com.fasterxml.jackson.core:jackson-databind:2.15.3")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310:2.15.3")
    
    // Lombok
    compileOnly("org.projectlombok:lombok:1.18.30")
    annotationProcessor("org.projectlombok:lombok:1.18.30")
    
    testImplementation("org.springframework.boot:spring-boot-starter-test:3.2.0")
}

tasks.jar {
    archiveBaseName.set("kafka-events")
    archiveVersion.set("1.0.0")
}