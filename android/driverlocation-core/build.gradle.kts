plugins {
    // Same Kotlin version as ../build.gradle (kotlinVersion = "2.1.20").
    kotlin("jvm") version "2.1.20"
}

group = "co.ordering.driver"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    // Main code: Kotlin stdlib only (added by the plugin). No JSON library: the one body
    // the module writes is built by hand (BodyBuilder).
    testImplementation("junit:junit:4.13.2")
}

kotlin {
    jvmToolchain(17)
}

tasks.test {
    testLogging {
        events("passed", "skipped", "failed")
        showStandardStreams = false
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
    }
}
