plugins {
    id("java")
    id("idea")
}

allprojects {
    group = "com.dsu"
    version = "1.0.0"
    
    repositories {
        mavenCentral()
    }
}

subprojects {
    apply(plugin = "java")
    apply(plugin = "idea")
    
    java {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }
    
    tasks.withType<JavaCompile> {
        options.encoding = "UTF-8"
        options.compilerArgs.add("-parameters")
    }
    
    tasks.withType<Test> {
        useJUnitPlatform()
    }
    
    // Конфигурация для IDEA
    idea {
        module {
            isDownloadJavadoc = true
            isDownloadSources = true
        }
    }
}
