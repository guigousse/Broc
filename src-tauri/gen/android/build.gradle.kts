// ⚠ Fichier généré par `tauri android init` mais ÉDITÉ À LA MAIN : Kotlin relevé de
//   1.9.25 à 2.1.21, minimum exigé par play-services-ads ≥ 24.1 (sous-projet B).
//   PAS PLUS HAUT : depuis Kotlin 2.2, `kotlinOptions {}` est une erreur de
//   compilation de script, et quatre modules du registre Cargo l'utilisent encore
//   (tauri-api de Tauri 2.11.2, tauri-plugin-haptics, in-app-review, opener) —
//   ils ne sont pas éditables de façon reproductible en CI. Le SDK 25.4.0 portant
//   des métadonnées Kotlin 2.3.0, le module admob les lit avec
//   -Xskip-metadata-version-check (voir vendor/tauri-plugin-admob/android).
//   Ne pas régénérer sans reporter ce réglage — même situation que
//   AndroidManifest.xml, MainActivity.kt et app/build.gradle.kts.
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.11.0")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.21")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

tasks.register("clean").configure {
    delete("build")
}

