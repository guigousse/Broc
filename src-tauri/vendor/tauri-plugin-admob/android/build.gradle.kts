plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.guigousse.broc.admob"
    compileSdk = 36

    defaultConfig {
        minSdk = 24
        consumerProguardFiles("consumer-rules.pro")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
        // play-services-ads 25.4.0 est compilé avec des métadonnées Kotlin 2.3.0 ;
        // le compilateur 2.1 du projet les refuse par défaut (« Module was compiled
        // with an incompatible version of Kotlin »). Monter le projet en 2.2+ est
        // impossible tant que Tauri 2.11 et trois plugins du registre gardent le
        // `kotlinOptions {}` devenu erreur de script en 2.2 (voir
        // gen/android/build.gradle.kts). Les API du SDK qu'on appelle sont des
        // classes Java : ignorer la version des métadonnées Kotlin est sans effet
        // à l'exécution. À retirer quand Tauri passera à `compilerOptions {}`.
        freeCompilerArgs += listOf("-Xskip-metadata-version-check")
    }
}

dependencies {
    // Google Mobile Ads SDK 25.4.0 (2026-06-17) — minSdk ≥ 23, métadonnées Kotlin
    // 2.3.0 (cf. -Xskip-metadata-version-check ci-dessus). Il embarque déjà UMP
    // 4.0.0 ; la dépendance explicite fige la version qu'on importe dans
    // AdmobPlugin.kt.
    implementation("com.google.android.gms:play-services-ads:25.4.0")
    implementation("com.google.android.ump:user-messaging-platform:4.0.0")
    implementation("androidx.core:core-ktx:1.9.0")
    implementation("androidx.appcompat:appcompat:1.6.0")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.15.3")
    implementation(project(":tauri-android"))
}
