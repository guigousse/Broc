# Pubs AdMob Android (sous-projet B) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre les pubs récompensées AdMob disponibles sur Android avec le contrat exact du pont iOS, et offrir sur Android le bouton « options de confidentialité » qui rouvre le formulaire UMP.

**Architecture:** Le plugin Tauri vendoré `tauri-plugin-admob` gagne un module Android (Gradle + une classe Kotlin `AdmobPlugin` qui importe le SDK Google directement — pas de pont `NSClassFromString` comme sur iOS). Côté Rust, `register_android_plugin` et deux commandes de plus. Côté web, `adMobDisponible()`/`pubDisponible()` deviennent vrais sur Android, `IndisponibleAdProvider` disparaît, et une section « Confidentialité » gatée sur Android apparaît dans les Réglages.

**Tech Stack:** Tauri 2.11.2 (CLI 2.11.2), Kotlin, Gradle (AGP 8.11), `play-services-ads:25.4.0`, `user-messaging-platform:4.0.0`, Rust, TypeScript/React, vitest, émulateur Android `broc-pixel6` piloté par CDP.

**Spec:** `docs/superpowers/specs/2026-09-05-android-admob-design.md`

## Global Constraints

- Branche `feat/android-admob` dans le worktree `.claude/worktrees/android-admob`, créée depuis `feat/android-socle`. **Ne pas pousser `feat/android-socle`** avant la Task 9 : chaque push y lance une build CI de 1-2 h et consomme un `versionCode`.
- Tests : `npx vitest run --maxWorkers=4` **obligatoirement avec `--maxWorkers=4`** (sinon ~41 faux échecs par famine de workers sur ce Mac Intel).
- Lint : `npx eslint src` (pas `npm run lint`, cassé sous Next 16). Types : `npx tsc --noEmit`.
- Rust cible Android : `scripts/android-cargo-check.sh -p tauri-plugin-admob` (créé en Task 1, il pose l'environnement NDK).
- Build Android locale : `CARGO_PROFILE_DEV_DEBUG=0 npx tauri android build --debug --target x86_64` après `npm run build`. Prévoir ≥ 10 Gi libres (`df -h /`) ; 13 Gi au 2026-09-05.
- Versions exactes : `com.google.android.gms:play-services-ads:25.4.0`, `com.google.android.ump:user-messaging-platform:4.0.0`, `org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.21` (le SDK exige Kotlin ≥ 2.1.0 ; le projet généré porte 1.9.25).
- Identifiants de TEST Google tant que Guillaume n'a pas fourni les vrais : App ID `ca-app-pub-3940256099942544~3347511713`, bloc rewarded `ca-app-pub-3940256099942544/5224354917`.
- Noms des commandes : Rust/TS `initialize`, `show_rewarded_ad`, `privacy_options_required`, `show_privacy_options` ; Kotlin `initialize`, `showRewardedAd`, `privacyOptionsRequired`, `showPrivacyOptions` (c'est le nom Kotlin qui est passé à `run_mobile_plugin`).
- `PLUGIN_IDENTIFIER = "com.guigousse.broc.admob"`, classe `AdmobPlugin`.
- Aucune ligne Swift ne change (`AdmobPlugin.swift`, `AdmobBridge.swift` intouchés).
- Libellés : toute clé ajoutée dans `src/lib/i18n/ui/fr.ts` doit l'être dans `en.ts`, `es.ts`, `el.ts` (le type `DictionnaireUI` dérive du français ; `tsc` échoue sinon).
- Commits : message en français, corps expliquant le pourquoi, pied `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` et `Claude-Session: https://claude.ai/code/session_01GdE92ttvZyjtxzsLeQhVK9`.
- Les fichiers de `src-tauri/gen/android` suivis et édités à la main (`AndroidManifest.xml`, `MainActivity.kt`, `app/build.gradle.kts`, désormais `build.gradle.kts` racine) portent un commentaire d'avertissement en tête : le conserver / l'ajouter.

---

### Task 1 : module Android vide qui compile (le risque CI d'abord)

Même séquencement que la spec iOS : on prouve que Gradle résout le SDK Google et que Kotlin 2.1 compile le projet **avant** d'écrire la moindre logique. Le squelette Kotlin résout `initialize` et rejette `showRewardedAd` ; le jeu ne l'appelle pas encore (Task 2).

**Files:**
- Create: `scripts/android-cargo-check.sh` (déjà écrit le 2026-09-05, à committer)
- Create: `src-tauri/vendor/tauri-plugin-admob/android/build.gradle.kts`
- Create: `src-tauri/vendor/tauri-plugin-admob/android/settings.gradle`
- Create: `src-tauri/vendor/tauri-plugin-admob/android/proguard-rules.pro`
- Create: `src-tauri/vendor/tauri-plugin-admob/android/.gitignore`
- Create: `src-tauri/vendor/tauri-plugin-admob/android/src/main/AndroidManifest.xml`
- Create: `src-tauri/vendor/tauri-plugin-admob/android/src/main/java/AdmobPlugin.kt`
- Modify: `src-tauri/vendor/tauri-plugin-admob/build.rs`
- Modify: `src-tauri/vendor/tauri-plugin-admob/src/lib.rs`
- Modify: `src-tauri/vendor/tauri-plugin-admob/src/mobile.rs`
- Modify: `src-tauri/vendor/tauri-plugin-admob/src/error.rs`
- Modify: `src-tauri/gen/android/build.gradle.kts` (Kotlin 1.9.25 → 2.1.21)
- Modify: `src-tauri/gen/android/app/src/main/AndroidManifest.xml` (App ID + AD_ID)

**Interfaces:**
- Produces: classe Kotlin `AdmobPlugin(activity: Activity) : Plugin(activity)` avec `@Command fun initialize(invoke: Invoke)` et `@Command fun showRewardedAd(invoke: Invoke)` ; côté Rust, `Admob<R>` construit par `register_android_plugin` sur Android.

- [ ] **Step 1 : vérifier l'espace disque et l'état de départ**

Run : `df -h / | tail -1 && cd src-tauri && cargo check -p tauri-plugin-admob 2>&1 | tail -1 && cd ..`
Expected : ≥ 10 Gi libres ; `Finished` (le crate compile en hôte).

- [ ] **Step 2 : le module Gradle du plugin**

`src-tauri/vendor/tauri-plugin-admob/android/build.gradle.kts` :

```kotlin
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
    }
}

dependencies {
    // Google Mobile Ads SDK 25.4.0 (2026-06-17) — exige Kotlin ≥ 2.1.0 et minSdk ≥ 23.
    // Il embarque déjà UMP 4.0.0 ; la dépendance explicite fige la version qu'on
    // importe dans AdmobPlugin.kt.
    implementation("com.google.android.gms:play-services-ads:25.4.0")
    implementation("com.google.android.ump:user-messaging-platform:4.0.0")
    implementation("androidx.core:core-ktx:1.9.0")
    implementation("androidx.appcompat:appcompat:1.6.0")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.15.3")
    implementation(project(":tauri-android"))
}
```

`src-tauri/vendor/tauri-plugin-admob/android/settings.gradle` :

```groovy
include ':tauri-android'
project(':tauri-android').projectDir = new File('./.tauri/tauri-api')
```

`src-tauri/vendor/tauri-plugin-admob/android/proguard-rules.pro` :

```
# Le SDK Google Mobile Ads livre ses propres consumer rules ; rien à ajouter ici.
```

`src-tauri/vendor/tauri-plugin-admob/android/.gitignore` :

```
/build
/.tauri
```

`src-tauri/vendor/tauri-plugin-admob/android/src/main/AndroidManifest.xml` :

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- L'App ID AdMob (meta-data APPLICATION_ID) et la permission AD_ID vivent dans
         le manifeste de l'APP (gen/android/app), pas ici : ce sont des réglages de
         l'application, pas du plugin. -->
</manifest>
```

- [ ] **Step 3 : le squelette Kotlin**

`src-tauri/vendor/tauri-plugin-admob/android/src/main/java/AdmobPlugin.kt` :

```kotlin
package com.guigousse.broc.admob

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin

/**
 * Pubs récompensées AdMob sur Android. Pendant Kotlin de AdmobBridge.swift
 * (gen/apple/Sources/app), sans pont intermédiaire : contrairement à swift-rs,
 * Gradle résout le SDK Google, la classe l'importe directement.
 *
 * Squelette de la Task 1 : prouve que le module compile et se charge. La
 * logique arrive en Task 3.
 */
@InvokeArg
class ArgsRewarded {
  var emplacement: String = ""
}

@TauriPlugin
class AdmobPlugin(private val activity: Activity) : Plugin(activity) {
  @Command
  fun initialize(invoke: Invoke) {
    invoke.resolve()
  }

  @Command
  fun showRewardedAd(invoke: Invoke) {
    invoke.reject("Pubs Android pas encore implémentées (Task 3)")
  }
}
```

- [ ] **Step 4 : câblage Rust**

`src-tauri/vendor/tauri-plugin-admob/build.rs` :

```rust
const COMMANDS: &[&str] = &["initialize", "show_rewarded_ad"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
```

`src-tauri/vendor/tauri-plugin-admob/src/lib.rs` — remplacer les quatre `cfg` par les alias Tauri `mobile`/`desktop` (posés par `tauri-build`, c'est ce que fait le plugin notification) :

```rust
#[cfg(mobile)]
mod mobile;
#[cfg(desktop)]
mod desktop;

#[cfg(mobile)]
use mobile::Admob;
#[cfg(desktop)]
use desktop::Admob;
```

et dans `init` :

```rust
        .setup(|app, api| {
            #[cfg(mobile)]
            let admob = mobile::init(app, api)?;
            #[cfg(desktop)]
            let admob = desktop::init(app, api)?;
            app.manage(admob);
            Ok(())
        })
```

`src-tauri/vendor/tauri-plugin-admob/src/mobile.rs` — enregistrement par plateforme :

```rust
use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::AdResult;

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.guigousse.broc.admob";

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_admob);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Admob<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "AdmobPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_admob)?;
    Ok(Admob(handle))
}
```

(le reste du fichier — `pub struct Admob<R>`, `initialize`, `show_rewarded_ad` — inchangé).

`src-tauri/vendor/tauri-plugin-admob/src/error.rs` : `#[cfg(target_os = "ios")]` → `#[cfg(mobile)]` sur la variante `PluginInvoke`.

- [ ] **Step 5 : compilation Rust en cible Android**

Run : `scripts/android-cargo-check.sh -p tauri-plugin-admob 2>&1 | tail -3`
Expected : `Finished` sans erreur. Si `register_android_plugin` est introuvable, c'est que `cfg(mobile)` n'est pas posé : vérifier que `tauri-plugin = { version = "2", features = ["build"] }` est bien en `build-dependencies` du plugin (il l'est).

- [ ] **Step 6 : Kotlin 2.1 dans le projet généré**

`src-tauri/gen/android/build.gradle.kts`, en tête de fichier puis ligne 8 :

```kotlin
// ⚠ Fichier généré par `tauri android init` mais ÉDITÉ À LA MAIN : Kotlin relevé de
//   1.9.25 à 2.1.21, minimum exigé par play-services-ads ≥ 24.1 (sous-projet B).
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
```

- [ ] **Step 7 : manifeste de l'app — App ID et AD_ID**

`src-tauri/gen/android/app/src/main/AndroidManifest.xml` : compléter le commentaire d'en-tête et ajouter la permission et le `meta-data` :

```xml
<!-- ⚠ Fichier généré par `tauri android init` mais ÉDITÉ À LA MAIN :
     `android:screenOrientation="portrait"` (le jeu est conçu en portrait, la
     rotation casse la mise en page) ; permission AD_ID et meta-data
     APPLICATION_ID AdMob (sous-projet B — sans ce meta-data, le SDK plante
     l'app au lancement). Ne pas régénérer sans reporter ces réglages. -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <!-- Ajoutée de toute façon par le manifeste du SDK Google Mobile Ads ;
         déclarée ici pour que la Data safety se lise depuis le dépôt. -->
    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />
```

et, premier enfant de `<application …>` :

```xml
        <!-- App ID AdMob Android. Valeur de TEST Google tant que l'app Android
             n'existe pas dans la console AdMob ; le vrai vaut
             ca-app-pub-6928338731034491~… (Task 8). -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-3940256099942544~3347511713" />
```

- [ ] **Step 8 : build Android debug complète**

Run :
```bash
npm run build 2>&1 | tail -2
CARGO_PROFILE_DEV_DEBUG=0 npx tauri android build --debug --target x86_64 2>&1 | tee /tmp/broc-android-build.log | tail -15
```
Expected : `BUILD SUCCESSFUL` ; `grep -c "play-services-ads:25.4.0" /tmp/broc-android-build.log` ≥ 1 ou, à défaut, `find src-tauri/gen/android/app/build -name "*.apk"` renvoie un APK debug. Durée attendue 15-30 min la première fois.

Si Gradle refuse (Kotlin/AGP), lire le message réel : le repli documenté dans la spec §11 est d'épingler GMA `24.6.0` (Kotlin 2.1 aussi) — mais on ne le fait que sur erreur constatée.

- [ ] **Step 9 : l'APK se lance sans plantage**

L'AVD `broc-pixel6` doit tourner (`$ANDROID_HOME/emulator/emulator -avd broc-pixel6 -no-snapshot -no-boot-anim &`, attendre ~1 min).

Run :
```bash
ADB=$ANDROID_HOME/platform-tools/adb
APK=$(find src-tauri/gen/android/app/build/outputs/apk -name "*debug*.apk" | head -1)
$ADB install -r "$APK" && $ADB logcat -c && $ADB shell am start -n com.guigousse.broc.debug/com.guigousse.broc.MainActivity
sleep 15; $ADB logcat -d | grep -E "FATAL|MobileAds|APPLICATION_ID" | head
$ADB shell dumpsys package com.guigousse.broc.debug | grep -c "AD_ID"
```
Expected : aucun `FATAL EXCEPTION` du pid de BROC ; la permission AD_ID compte ≥ 1 ; le menu du jeu s'affiche (`$ADB exec-out screencap -p > /tmp/broc-t1.png`, regarder l'image).

- [ ] **Step 10 : vérifier que rien de suivi dans gen/android n'a bougé hors des deux fichiers voulus**

Run : `git status --porcelain src-tauri/gen/android`
Expected : exactement `M src-tauri/gen/android/build.gradle.kts` et `M src-tauri/gen/android/app/src/main/AndroidManifest.xml`.

- [ ] **Step 11 : commit**

```bash
git add scripts/android-cargo-check.sh src-tauri/vendor/tauri-plugin-admob src-tauri/gen/android/build.gradle.kts src-tauri/gen/android/app/src/main/AndroidManifest.xml
git commit -m "feat(android): module Android du plugin admob — squelette qui compile, Kotlin 2.1, App ID de test

Le SDK Google Mobile Ads 25.4.0 exige Kotlin ≥ 2.1 ; le projet généré par le
CLI Tauri portait 1.9.25. Le plugin vendoré enregistre désormais une classe
Kotlin sur Android (register_android_plugin) à côté du plugin Swift ; elle ne
fait rien encore. Sans meta-data APPLICATION_ID le SDK plante l'app au boot :
l'App ID de test Google est posé dans le manifeste de l'app.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GdE92ttvZyjtxzsLeQhVK9"
```

---

### Task 2 : la couche web considère Android comme une plateforme à pubs

**Files:**
- Modify: `src/lib/ads/adMobProvider.ts:11-14`
- Modify: `src/lib/ads/adProvider.ts:42-72`
- Modify: `src/lib/ads/adProvider.android.test.ts` (réécrit)
- Modify: `src/lib/ads/adMobProvider.test.ts` (un cas de plus)

**Interfaces:**
- Consumes: `plateformeNative(): "ios" | "android" | null` de `src/lib/plateforme.ts`.
- Produces: `adMobDisponible(): boolean` vrai sur toute plateforme native ; `pubDisponible(): boolean` toujours vrai ; `getAdProvider()` → `AdMobAdProvider` sous Tauri iOS et Android, `StubAdProvider` ailleurs. `IndisponibleAdProvider` n'est plus exporté.

- [ ] **Step 1 : réécrire le test Android (attentes inversées)**

Remplacer intégralement `src/lib/ads/adProvider.android.test.ts` :

```ts
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const uaOrigine = window.navigator.userAgent;

function simulerTauri(ua: string) {
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

const UA_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36";
const UA_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X)";

async function chargerFrais() {
  vi.resetModules();
  return {
    provider: await import("./adProvider"),
    adMob: await import("./adMobProvider"),
  };
}

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  Object.defineProperty(window.navigator, "userAgent", {
    value: uaOrigine,
    configurable: true,
  });
});

/**
 * Depuis le sous-projet B, Android a sa régie (plugin Kotlin) : les gardes qui
 * privaient l'UI de pub sur Android disparaissent. `pubDisponible()` reste la
 * garde que l'UI consulte — elle vaut vrai partout aujourd'hui.
 */
describe("pubDisponible", () => {
  it("vrai sous Tauri Android — le plugin Kotlin est branché", async () => {
    simulerTauri(UA_ANDROID);
    const { provider } = await chargerFrais();
    expect(provider.pubDisponible()).toBe(true);
  });

  it("vrai sous Tauri iOS", async () => {
    simulerTauri(UA_IOS);
    const { provider } = await chargerFrais();
    expect(provider.pubDisponible()).toBe(true);
  });

  it("vrai hors Tauri (le stub de dev reste disponible)", async () => {
    const { provider } = await chargerFrais();
    expect(provider.pubDisponible()).toBe(true);
  });
});

describe("getAdProvider selon la plateforme", () => {
  it("sur Android, renvoie le provider AdMob natif", async () => {
    simulerTauri(UA_ANDROID);
    const { provider, adMob } = await chargerFrais();
    expect(provider.getAdProvider()).toBeInstanceOf(adMob.AdMobAdProvider);
  });

  it("sur iOS, renvoie le provider AdMob natif", async () => {
    simulerTauri(UA_IOS);
    const { provider, adMob } = await chargerFrais();
    expect(provider.getAdProvider()).toBeInstanceOf(adMob.AdMobAdProvider);
  });

  it("hors Tauri, renvoie le stub", async () => {
    const { provider } = await chargerFrais();
    expect(provider.getAdProvider()).toBeInstanceOf(provider.StubAdProvider);
  });

  it("GARDE : le provider « indisponible » n'existe plus", async () => {
    const { provider } = await chargerFrais();
    expect("IndisponibleAdProvider" in provider).toBe(false);
  });
});
```

Ajouter dans `src/lib/ads/adMobProvider.test.ts`, dans `describe("adMobDisponible")`, après le cas « vrai sous Tauri iOS » :

```ts
  it("vrai sous Tauri Android (plugin Kotlin du sous-projet B)", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36",
      configurable: true,
    });
    const { adMob } = await chargerFrais();
    expect(adMob.adMobDisponible()).toBe(true);
  });
```

- [ ] **Step 2 : constater l'échec**

Run : `npx vitest run --maxWorkers=4 src/lib/ads 2>&1 | tail -15`
Expected : échecs sur « vrai sous Tauri Android », « sur Android, renvoie le provider AdMob natif », « le provider indisponible n'existe plus ».

- [ ] **Step 3 : implémentation**

`src/lib/ads/adMobProvider.ts` lignes 11-14 :

```ts
/** Vrai sous runtime Tauri sur iOS ET Android : le plugin existe sur les deux
 *  (Swift d'un côté, Kotlin de l'autre, même contrat). */
export function adMobDisponible(): boolean {
  return plateformeNative() !== null;
}
```

`src/lib/ads/adProvider.ts` : supprimer la classe `IndisponibleAdProvider` et son commentaire (lignes 42-55), puis :

```ts
/** Garde consultée par l'UI avant de proposer une pub. Vraie partout depuis
 *  que le plugin Android existe (sous-projet B) ; conservée parce que c'est
 *  ELLE que les écrans interrogent — une plateforme sans régie la remettra à
 *  faux sans toucher aux appelants. */
export function pubDisponible(): boolean {
  return true;
}

// Singleton injectable — AdMob natif sous Tauri (iOS et Android), stub partout
// ailleurs (web Safari, simulateur, dev desktop).
let instance: AdProvider | null = null;
export function getAdProvider(): AdProvider {
  if (!instance) {
    instance = adMobDisponible() ? new AdMobAdProvider() : new StubAdProvider();
  }
  return instance;
}
```

Retirer l'import `plateformeNative` de `adProvider.ts` s'il n'a plus d'usage.

- [ ] **Step 4 : tests verts, types, lint**

Run : `npx vitest run --maxWorkers=4 src/lib/ads 2>&1 | tail -5 && npx tsc --noEmit && npx eslint src/lib/ads`
Expected : tous verts, aucune erreur.

- [ ] **Step 5 : suite complète (les appelants lisent `pubDisponible`)**

Run : `npx vitest run --maxWorkers=4 2>&1 | tail -6`
Expected : `Tests … passed`, aucun échec. Si un test d'écran attendait l'absence de pub sur Android (`ClientPage`, `EnergieRecharge`, `AtelierContenu`), l'inverser : le contrat est désormais « pub proposée sur Android ».

- [ ] **Step 6 : commit**

```bash
git add src/lib/ads
git commit -m "feat(ads): Android est une plateforme à pubs — plus de provider indisponible

adMobDisponible() vaut vrai sur toute plateforme native, pubDisponible() vaut
vrai partout mais reste la garde que les écrans consultent. Le provider
« indisponible » du socle Android (sous-projet A) n'a plus de raison d'être.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GdE92ttvZyjtxzsLeQhVK9"
```

---

### Task 3 : le plugin Kotlin — consentement UMP, init, pubs récompensées

Le cœur de B. Pas de harnais de test Kotlin dans ce dépôt : la vérification est la garde vitest sur la table `AD_UNITS` (Step 1), la compilation (Step 4) et la recette émulateur (Task 7).

**Files:**
- Modify: `src-tauri/vendor/tauri-plugin-admob/android/src/main/java/AdmobPlugin.kt` (réécrit)
- Modify: `src/lib/ads/emplacementsAppeles.test.ts` (garde sur la table Kotlin)

**Interfaces:**
- Consumes: `ArgsRewarded { emplacement: String }` (Task 1).
- Produces: `showRewardedAd` résout `{ rewarded: Boolean }` ou rejette avec un message ; `initialize` résout après UMP + `MobileAds.initialize`. Champ privé `consentInformation: ConsentInformation` réutilisé par la Task 4.

- [ ] **Step 1 : étendre la garde « un bloc distinct par emplacement » à la table Kotlin**

Dans `src/lib/ads/emplacementsAppeles.test.ts`, ajouter après le `describe("AD_UNITS (pont natif)…")` existant :

```ts
/**
 * Même garde pour le plugin Kotlin (sous-projet B). Syntaxe Kotlin :
 *   "energie" to AD_UNIT_ENERGIE,
 *   "boite-mystere" to "ca-app-pub-…/…",
 * Tant que les blocs Android n'existent pas dans la console AdMob, les trois
 * entrées pointent le bloc rewarded de TEST Google : la distinction est alors
 * volontairement absente, le test la saute en le disant.
 */
describe("AD_UNITS (plugin Kotlin Android) — un bloc distinct par emplacement", () => {
  const BLOC_TEST_GOOGLE = "ca-app-pub-3940256099942544/5224354917";
  const source = readFileSync(
    "src-tauri/vendor/tauri-plugin-admob/android/src/main/java/AdmobPlugin.kt",
    "utf8",
  );
  const constantes = new Map(
    [...source.matchAll(/private const val (\w+) = (?:"([^"]*)"|(\w+))/g)].map((m) => [
      m[1],
      m[2] ?? m[3],
    ]),
  );
  const resoudre = (v: string): string =>
    v.startsWith('"') ? v.slice(1, -1) : (constantes.get(v) !== undefined ? resoudre(JSON.stringify(constantes.get(v))) : v);
  const table = source.match(/AD_UNITS: Map<String, String> = mapOf\(([\s\S]*?)\n\)/);
  const blocs = new Map(
    [...(table?.[1] ?? "").matchAll(/"([^"]+)" to ("[^"]*"|\w+)/g)].map((m) => [
      m[1],
      resoudre(m[2]),
    ]),
  );
  const ids = [...blocs.values()];
  const enTest = ids.length > 0 && ids.every((id) => id === BLOC_TEST_GOOGLE);

  it.each(Object.values(EMPLACEMENTS_PUB))("%s a son propre bloc AdMob", (emplacement) => {
    const bloc = blocs.get(emplacement);
    expect(bloc, `emplacement absent de AD_UNITS (Kotlin)`).toBeDefined();
    expect(bloc, `bloc AdMob non renseigné`).not.toBe("");
  });

  it.skipIf(enTest)("aucun bloc n'est partagé entre deux emplacements", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2 : constater l'échec**

Run : `npx vitest run --maxWorkers=4 src/lib/ads/emplacementsAppeles.test.ts 2>&1 | tail -12`
Expected : les trois cas « %s a son propre bloc AdMob » du bloc Kotlin échouent (`emplacement absent de AD_UNITS (Kotlin)`).

- [ ] **Step 3 : la classe Kotlin complète**

Remplacer intégralement `src-tauri/vendor/tauri-plugin-admob/android/src/main/java/AdmobPlugin.kt` :

```kotlin
package com.guigousse.broc.admob

import android.app.Activity
import android.content.pm.ApplicationInfo
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.ump.ConsentDebugSettings
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform

// Blocs rewarded, UN PAR EMPLACEMENT du jeu. Les clés sont les valeurs de
// EMPLACEMENTS_PUB (src/lib/ads/adProvider.ts) : c'est ce qui rend les revenus
// et le taux de complétion lisibles écran par écran dans la console AdMob.
// Un emplacement inconnu ou vide retombe sur AD_UNIT_DEFAUT — le joueur garde
// sa récompense, seule la ventilation est perdue.
//
// Bloc rewarded de TEST Google tant que les 3 blocs Android n'existent pas dans
// la console AdMob (spec §10, étape 2). À remplacer par les vrais blocs
// ca-app-pub-6928338731034491/… dès qu'ils sont créés (Task 8). L'émulateur est
// automatiquement un appareil de test GMA : les vrais blocs pourront y être
// recettés sans générer de trafic invalide.
private const val AD_UNIT_TEST = "ca-app-pub-3940256099942544/5224354917"
private const val AD_UNIT_ENERGIE = AD_UNIT_TEST
private val AD_UNITS: Map<String, String> = mapOf(
  "energie" to AD_UNIT_ENERGIE,
  "boite-mystere" to AD_UNIT_TEST,
  "restauration" to AD_UNIT_TEST,
)

// Bloc servi quand l'emplacement est inconnu ou pas encore créé côté AdMob.
private const val AD_UNIT_DEFAUT = AD_UNIT_ENERGIE

/** Arguments de `showRewardedAd` — `emplacement` est l'écran appelant. */
@InvokeArg
class ArgsRewarded {
  var emplacement: String = ""
}

/**
 * Pubs récompensées AdMob sur Android. Pendant Kotlin de AdmobBridge.swift
 * (gen/apple/Sources/app), même contrat, mêmes invariants — sans pont
 * intermédiaire : Gradle résout le SDK Google, la classe l'importe directement.
 *
 * Invariant de threading : tout l'état ci-dessous n'est touché QUE sur le fil
 * principal. Les callbacks du SDK GMA y arrivent ; les commandes Tauri arrivent
 * sur un fil secondaire et sont systématiquement reportées par runOnUiThread.
 */
@TauriPlugin
class AdmobPlugin(private val activity: Activity) : Plugin(activity) {
  /** Une pub préchargée par bloc, indexée par ad unit ID : les emplacements ne
   *  se volent pas leur précharge. */
  private val rewardedAds = HashMap<String, RewardedAd>()
  /** Bloc de la pub en cours d'affichage — sert à le recharger à la fermeture. */
  private var unitEnCours: String? = null
  private var finEnAttente: ((Boolean, String?) -> Unit)? = null
  private var recompenseGagnee = false
  private var sdkPret = false

  private val consentInformation: ConsentInformation by lazy {
    UserMessagingPlatform.getConsentInformation(activity)
  }

  /** Bloc AdMob d'un emplacement, avec repli sur le bloc par défaut. */
  private fun unit(pour: String): String {
    val u = AD_UNITS[pour]
    return if (u.isNullOrEmpty()) AD_UNIT_DEFAUT else u
  }

  // MARK: - Commandes Tauri

  @Command
  fun initialize(invoke: Invoke) {
    activity.runOnUiThread {
      if (sdkPret) {
        // Déjà prêt (la couche TS mémorise sa promesse d'init, mais un second
        // appel reste possible après un échec réseau) : pas de second UMP.
        invoke.resolve()
        return@runOnUiThread
      }
      parcoursConsentement {
        MobileAds.initialize(activity) {
          sdkPret = true
          // Seul le bloc par défaut est préchargé au boot : précharger les trois
          // ferait trois requêtes par session pour au plus une impression, ce
          // que le match rate AdMob paie cher. Les autres blocs se chargent à la
          // demande, puis restent préchargés après leur première utilisation.
          prechargerPub(AD_UNIT_DEFAUT)
          invoke.resolve()
        }
      }
    }
  }

  @Command
  fun showRewardedAd(invoke: Invoke) {
    // Argument absent/illisible : repli sur le bloc par défaut plutôt que de
    // priver le joueur de sa récompense.
    val emplacement = try { invoke.parseArgs(ArgsRewarded::class.java).emplacement } catch (_: Exception) { "" }
    activity.runOnUiThread {
      if (!sdkPret) {
        invoke.reject("SDK non initialisé")
        return@runOnUiThread
      }
      if (finEnAttente != null) {
        // Une pub est déjà en cours (affichée OU en chargement) : refus
        // immédiat plutôt qu'écraser la completion en attente (elle ne serait
        // jamais rappelée).
        invoke.reject("Pub déjà en cours")
        return@runOnUiThread
      }
      val unit = unit(emplacement)
      // Réservation SYNCHRONE : ferme la fenêtre de course pendant le
      // chargement réseau du chemin sans pub préchargée. Toute sortie d'échec
      // doit libérer la réservation.
      finEnAttente = { rewarded, erreur ->
        if (erreur != null) invoke.reject(erreur)
        else invoke.resolve(JSObject().put("rewarded", rewarded))
      }
      unitEnCours = unit
      val prechargee = rewardedAds.remove(unit)
      if (prechargee != null) {
        presenter(prechargee)
      } else {
        // Pas de pub préchargée pour ce bloc (premier usage de l'emplacement,
        // hors-ligne au boot, no-fill…) : tentative à la demande — le SDK gère
        // son propre timeout réseau.
        RewardedAd.load(activity, unit, AdRequest.Builder().build(), object : RewardedAdLoadCallback() {
          override fun onAdLoaded(pub: RewardedAd) = presenter(pub)
          override fun onAdFailedToLoad(erreur: LoadAdError) {
            val fin = finEnAttente
            liberer()
            fin?.invoke(false, erreur.message.ifEmpty { "Aucune pub disponible" })
          }
        })
      }
    }
  }

  // MARK: - Consentement (UMP)

  private fun parcoursConsentement(suite: () -> Unit) {
    val params = ConsentRequestParameters.Builder()
      .setTagForUnderAgeOfConsent(false)
    if (estDebogable()) {
      // Seul moyen de faire apparaître le formulaire sur un émulateur situé
      // hors UE. Ne doit JAMAIS atteindre une build release : la garde est le
      // drapeau debuggable de l'app, pas une constante à ne pas oublier.
      params.setConsentDebugSettings(
        ConsentDebugSettings.Builder(activity)
          .setDebugGeography(ConsentDebugSettings.DebugGeography.DEBUG_GEOGRAPHY_EEA)
          .build()
      )
    }
    consentInformation.requestConsentInfoUpdate(
      activity,
      params.build(),
      {
        // Le formulaire n'est montré que si UMP le juge requis (UE) et pas
        // encore répondu. UMP écrit ses choix dans les SharedPreferences par
        // défaut sous les clés IABTCF_* : c'est là que la mesure d'audience
        // (sous-projet F) viendra lire son verdict.
        UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { _ -> suite() }
      },
      {
        // Hors-ligne : on continue sans bloquer, les pubs échoueront proprement.
        suite()
      }
    )
  }

  private fun estDebogable(): Boolean =
    (activity.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

  // MARK: - Cycle de vie des pubs

  private fun prechargerPub(unit: String) {
    RewardedAd.load(activity, unit, AdRequest.Builder().build(), object : RewardedAdLoadCallback() {
      override fun onAdLoaded(pub: RewardedAd) {
        rewardedAds[unit] = pub
      }
      override fun onAdFailedToLoad(erreur: LoadAdError) {
        rewardedAds.remove(unit)
      }
    })
  }

  // Précondition : `finEnAttente` a été réservée par `showRewardedAd`.
  private fun presenter(pub: RewardedAd) {
    recompenseGagnee = false
    pub.fullScreenContentCallback = object : FullScreenContentCallback() {
      // La réponse part à la FERMETURE (pas au gain) : le jeu ne doit reprendre
      // la main qu'une fois la pub disparue de l'écran.
      override fun onAdDismissedFullScreenContent() {
        val fin = finEnAttente
        val gagnee = recompenseGagnee
        // On ne recharge que le bloc qui vient de servir : l'emplacement
        // suivant chargera le sien à la demande.
        val unit = unitEnCours ?: AD_UNIT_DEFAUT
        liberer()
        fin?.invoke(gagnee, null)
        prechargerPub(unit)
      }

      override fun onAdFailedToShowFullScreenContent(erreur: AdError) {
        val fin = finEnAttente
        val unit = unitEnCours ?: AD_UNIT_DEFAUT
        liberer()
        fin?.invoke(false, erreur.message)
        prechargerPub(unit)
      }
    }
    // Le listener n'est appelé QUE si la pub est visionnée jusqu'au bout.
    pub.show(activity) { recompenseGagnee = true }
  }

  private fun liberer() {
    finEnAttente = null
    unitEnCours = null
  }
}
```

- [ ] **Step 4 : garde vitest verte, compilation Kotlin**

Run :
```bash
npx vitest run --maxWorkers=4 src/lib/ads/emplacementsAppeles.test.ts 2>&1 | tail -8
CARGO_PROFILE_DEV_DEBUG=0 npx tauri android build --debug --target x86_64 2>&1 | tail -8
```
Expected : les trois « a son propre bloc AdMob » verts, « aucun bloc partagé » **skipped** (mode test) ; `BUILD SUCCESSFUL`. Une erreur Kotlin se lit dans la sortie Gradle (`e: file://…AdmobPlugin.kt:LIGNE`).

- [ ] **Step 5 : fumée sur l'émulateur — l'init UMP se déroule**

L'AVD tourne. Installer et lancer comme en Task 1 Step 9, puis :
```bash
ADB=$ANDROID_HOME/platform-tools/adb
$ADB logcat -d | grep -E "UserMessagingPlatform|Ads|FATAL" | head -20
$ADB exec-out screencap -p > /tmp/broc-t3.png
```
Expected : le formulaire de consentement Google (géographie UE forcée en debug) est à l'écran au premier lancement, ou déjà répondu si l'app avait été lancée avant (`$ADB shell pm clear com.guigousse.broc.debug` pour repartir de zéro). Aucun `FATAL`. La recette complète des pubs est en Task 7.

- [ ] **Step 6 : commit**

```bash
git add src-tauri/vendor/tauri-plugin-admob/android src/lib/ads/emplacementsAppeles.test.ts
git commit -m "feat(android): pubs récompensées AdMob — consentement UMP, une pub préchargée par bloc

Pendant Kotlin du pont Swift, invariants compris : réservation synchrone d'une
seule pub à la fois, réponse à la fermeture et non au gain, rechargement du
seul bloc servi, repli sur le bloc par défaut. Géographie UE forcée en build
debug pour recetter le formulaire sur émulateur. La garde vitest « un bloc
distinct par emplacement » couvre désormais la table Kotlin, en se sautant
tant que les blocs de test Google sont en place.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GdE92ttvZyjtxzsLeQhVK9"
```

---

### Task 4 : commandes « options de confidentialité » (Rust + Kotlin)

**Files:**
- Modify: `src-tauri/vendor/tauri-plugin-admob/build.rs`
- Modify: `src-tauri/vendor/tauri-plugin-admob/src/commands.rs`
- Modify: `src-tauri/vendor/tauri-plugin-admob/src/models.rs`
- Modify: `src-tauri/vendor/tauri-plugin-admob/src/mobile.rs`
- Modify: `src-tauri/vendor/tauri-plugin-admob/src/desktop.rs`
- Modify: `src-tauri/vendor/tauri-plugin-admob/src/lib.rs`
- Modify: `src-tauri/vendor/tauri-plugin-admob/permissions/default.toml`
- Modify: `src-tauri/vendor/tauri-plugin-admob/android/src/main/java/AdmobPlugin.kt`

**Interfaces:**
- Consumes: `consentInformation` (Task 3).
- Produces: commandes Tauri `plugin:admob|privacy_options_required` → `{ requis: boolean }` et `plugin:admob|show_privacy_options` → `()`. Sur iOS, `run_mobile_plugin("privacyOptionsRequired"|"showPrivacyOptions")` échouera (méthode Swift absente) : la couche TS ne les appelle que sur Android (Task 5-6).

- [ ] **Step 1 : Rust — modèle, commandes, permissions**

`build.rs` :

```rust
const COMMANDS: &[&str] = &[
    "initialize",
    "show_rewarded_ad",
    "privacy_options_required",
    "show_privacy_options",
];
```

`src/models.rs`, ajouter :

```rust
/// Réponse de `privacy_options_required` : vrai quand UMP exige (UE) un point
/// d'entrée permettant de rouvrir le formulaire de consentement.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptionsConfidentialite {
    pub requis: bool,
}
```

`src/lib.rs` : `pub use models::{AdResult, OptionsConfidentialite};` et dans `generate_handler!` ajouter `commands::privacy_options_required, commands::show_privacy_options`.

`src/commands.rs`, ajouter :

```rust
use crate::models::OptionsConfidentialite;

/// Vrai quand UMP exige un point d'entrée « options de confidentialité ».
#[command]
pub(crate) async fn privacy_options_required<R: Runtime>(
    app: AppHandle<R>,
) -> Result<OptionsConfidentialite> {
    app.admob().privacy_options_required()
}

/// Rouvre le formulaire de consentement UMP (options de confidentialité).
#[command]
pub(crate) async fn show_privacy_options<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.admob().show_privacy_options()
}
```

`src/mobile.rs`, dans `impl<R: Runtime> Admob<R>` :

```rust
    pub fn privacy_options_required(&self) -> crate::Result<OptionsConfidentialite> {
        self.0
            .run_mobile_plugin("privacyOptionsRequired", serde_json::json!({}))
            .map_err(Into::into)
    }
    pub fn show_privacy_options(&self) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("showPrivacyOptions", serde_json::json!({}))
            .map_err(Into::into)
    }
```

(et `use crate::models::{AdResult, OptionsConfidentialite};`).

`src/desktop.rs`, dans `impl<R: Runtime> Admob<R>` :

```rust
    pub fn privacy_options_required(&self) -> crate::Result<OptionsConfidentialite> {
        Err(crate::Error::UnsupportedPlatform)
    }
    pub fn show_privacy_options(&self) -> crate::Result<()> {
        Err(crate::Error::UnsupportedPlatform)
    }
```

(et `use crate::models::{AdResult, OptionsConfidentialite};`).

`permissions/default.toml` :

```toml
[default]
description = "Permissions par défaut du plugin AdMob : init du SDK, affichage de rewarded ads, options de confidentialité UMP."
permissions = [
  "allow-initialize",
  "allow-show-rewarded-ad",
  "allow-privacy-options-required",
  "allow-show-privacy-options",
]
```

- [ ] **Step 2 : compilation hôte et Android**

Run : `cd src-tauri && cargo check -p tauri-plugin-admob 2>&1 | tail -2 && cd .. && scripts/android-cargo-check.sh -p tauri-plugin-admob 2>&1 | tail -2`
Expected : `Finished` deux fois. Les fichiers `permissions/autogenerated/` se régénèrent au build (ils sont suivis : `git status` doit montrer deux nouveaux fichiers `allow-privacy-options-required.toml`, `allow-show-privacy-options.toml` et le `schemas/schema.json` modifié — à committer).

- [ ] **Step 3 : Kotlin — les deux commandes**

Dans `AdmobPlugin.kt`, section « Commandes Tauri », ajouter :

```kotlin
  /** Vrai quand UMP exige un point d'entrée « options de confidentialité »
   *  (joueur en UE). Avant `requestConsentInfoUpdate`, le statut vaut UNKNOWN
   *  → faux : le bouton apparaîtra à la prochaine ouverture des Réglages. */
  @Command
  fun privacyOptionsRequired(invoke: Invoke) {
    activity.runOnUiThread {
      val requis = consentInformation.privacyOptionsRequirementStatus ==
        ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
      invoke.resolve(JSObject().put("requis", requis))
    }
  }

  /** Rouvre le formulaire de consentement. Le SDK GMA relit lui-même la chaîne
   *  TCF pour les requêtes suivantes ; les pubs déjà préchargées sont servies
   *  telles quelles (comportement Google standard). */
  @Command
  fun showPrivacyOptions(invoke: Invoke) {
    activity.runOnUiThread {
      UserMessagingPlatform.showPrivacyOptionsForm(activity) { erreur ->
        if (erreur != null) invoke.reject(erreur.message ?: "Formulaire indisponible")
        else invoke.resolve()
      }
    }
  }
```

- [ ] **Step 4 : compilation Kotlin**

Run : `CARGO_PROFILE_DEV_DEBUG=0 npx tauri android build --debug --target x86_64 2>&1 | tail -5`
Expected : `BUILD SUCCESSFUL`.

- [ ] **Step 5 : commit**

```bash
git add src-tauri/vendor/tauri-plugin-admob
git commit -m "feat(admob): commandes privacy_options_required et show_privacy_options (Android)

Google exige, pour les joueurs européens, un point d'entrée qui rouvre le
formulaire de consentement sans réinstaller l'app. Le plugin expose le statut
UMP et l'ouverture du formulaire ; seul le Kotlin les implémente, la couche TS
ne les appelle que sur Android (iOS suivra dans un lot séparé).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GdE92ttvZyjtxzsLeQhVK9"
```

---

### Task 5 : fonctions TS `optionsConfidentialiteRequises` / `montrerOptionsConfidentialite`

**Files:**
- Modify: `src/lib/ads/adMobProvider.ts`
- Modify: `src/lib/ads/adMobProvider.test.ts`

**Interfaces:**
- Produces: `optionsConfidentialiteRequises(): Promise<boolean>` (faux sur toute erreur) et `montrerOptionsConfidentialite(): Promise<void>` (propage l'erreur), exportées de `src/lib/ads/adMobProvider.ts`. Fonctions de module — pas des méthodes de `AdProvider`, dont l'interface reste « pubs uniquement ».

- [ ] **Step 1 : tests**

Ajouter en fin de `src/lib/ads/adMobProvider.test.ts` :

```ts
describe("options de confidentialité (UMP)", () => {
  it("optionsConfidentialiteRequises interroge le natif et lit `requis`", async () => {
    simulerTauriIos();
    invokeMock.mockResolvedValue({ requis: true });
    const { adMob } = await chargerFrais();
    await expect(adMob.optionsConfidentialiteRequises()).resolves.toBe(true);
    expect(invokeMock).toHaveBeenCalledWith("plugin:admob|privacy_options_required");
  });

  it("optionsConfidentialiteRequises vaut faux quand le natif répond faux", async () => {
    simulerTauriIos();
    invokeMock.mockResolvedValue({ requis: false });
    const { adMob } = await chargerFrais();
    await expect(adMob.optionsConfidentialiteRequises()).resolves.toBe(false);
  });

  it("optionsConfidentialiteRequises vaut faux sur erreur (pas de bouton plutôt qu'un bouton mort)", async () => {
    simulerTauriIos();
    invokeMock.mockRejectedValue(new Error("commande inconnue"));
    const { adMob } = await chargerFrais();
    await expect(adMob.optionsConfidentialiteRequises()).resolves.toBe(false);
  });

  it("montrerOptionsConfidentialite appelle le natif et propage l'erreur", async () => {
    simulerTauriIos();
    invokeMock.mockResolvedValue(undefined);
    const { adMob } = await chargerFrais();
    await expect(adMob.montrerOptionsConfidentialite()).resolves.toBeUndefined();
    expect(invokeMock).toHaveBeenCalledWith("plugin:admob|show_privacy_options");
    invokeMock.mockRejectedValue(new Error("formulaire indisponible"));
    await expect(adMob.montrerOptionsConfidentialite()).rejects.toThrow("formulaire indisponible");
  });
});
```

- [ ] **Step 2 : constater l'échec**

Run : `npx vitest run --maxWorkers=4 src/lib/ads/adMobProvider.test.ts 2>&1 | tail -10`
Expected : 4 échecs (`optionsConfidentialiteRequises is not a function`).

- [ ] **Step 3 : implémentation**

Ajouter en fin de `src/lib/ads/adMobProvider.ts` :

```ts
/**
 * Vrai quand UMP exige un point d'entrée « options de confidentialité »
 * (joueur en UE). Faux sur toute erreur : mieux vaut pas de bouton qu'un
 * bouton qui échoue. Implémenté côté natif sur Android seulement (sous-projet
 * B) ; l'appelant gate sur la plateforme.
 */
export async function optionsConfidentialiteRequises(): Promise<boolean> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<{ requis: boolean }>("plugin:admob|privacy_options_required");
    return res.requis === true;
  } catch {
    return false;
  }
}

/** Rouvre le formulaire de consentement UMP. L'erreur remonte à l'UI (toast). */
export async function montrerOptionsConfidentialite(): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("plugin:admob|show_privacy_options");
}
```

- [ ] **Step 4 : vert, types, lint**

Run : `npx vitest run --maxWorkers=4 src/lib/ads 2>&1 | tail -5 && npx tsc --noEmit && npx eslint src/lib/ads`
Expected : verts, aucune erreur.

- [ ] **Step 5 : commit**

```bash
git add src/lib/ads/adMobProvider.ts src/lib/ads/adMobProvider.test.ts
git commit -m "feat(ads): façade TS des options de confidentialité UMP

Deux fonctions de module — l'interface AdProvider reste « pubs uniquement ».
Le statut vaut faux sur toute erreur : pas de bouton plutôt qu'un bouton mort.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GdE92ttvZyjtxzsLeQhVK9"
```

---

### Task 6 : section « Confidentialité » des Réglages (Android) + libellés 4 langues

**Files:**
- Modify: `src/components/mobile/ReglagesModal.tsx:316-318` (rendu) + nouvelle fonction `SectionConfidentialite`
- Create: `src/components/mobile/ReglagesModal.confidentialite.test.tsx`
- Modify: `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts`, `el.ts` (bloc `reglages`)

**Interfaces:**
- Consumes: `plateformeNative()` (`@/lib/plateforme`), `optionsConfidentialiteRequises`, `montrerOptionsConfidentialite` (Task 5), `d.sheets.erreurPub` (existant), `carte`, `sectionTitle`, `segBtn` (styles existants du fichier).

- [ ] **Step 1 : test dédié (mocks propres au fichier — `vi.mock` est hissé par fichier)**

`src/components/mobile/ReglagesModal.confidentialite.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import { ToastProvider } from "@/components/ui/Toast";
import { ReglagesModal } from "./ReglagesModal";

const etat = vi.hoisted(() => ({
  plateforme: null as "ios" | "android" | null,
  requis: false,
  montrer: vi.fn<() => Promise<void>>(),
}));

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    audioPrefs: { volume: 1, musique: true, effets: true, ambiance: true },
    setAudioPref: vi.fn(),
    setVolume: vi.fn(),
    playClick: vi.fn(),
    tailleFonte: "normal",
    setTailleFonte: vi.fn(),
  }),
}));
vi.mock("@/lib/notifications", () => ({
  demanderPermission: vi.fn(),
  notificationsDisponibles: () => false,
  permissionAccordee: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/notifications/prefs", () => ({
  notifsActives: () => false,
  setNotifsActives: vi.fn(),
}));
vi.mock("@/lib/iap/iapProvider", () => ({
  getIapProvider: () => ({ restaurer: async () => false }),
  achatDisponible: () => true,
}));
vi.mock("@/lib/plateforme", () => ({
  plateformeNative: () => etat.plateforme,
  tauriDisponible: () => etat.plateforme !== null,
  tauriIosDisponible: () => etat.plateforme === "ios",
  tauriAndroidDisponible: () => etat.plateforme === "android",
}));
vi.mock("@/lib/ads/adMobProvider", () => ({
  adMobDisponible: () => etat.plateforme !== null,
  AdMobAdProvider: class {},
  optionsConfidentialiteRequises: async () => etat.requis,
  montrerOptionsConfidentialite: () => etat.montrer(),
}));

const ouvrir = () =>
  render(
    <LangueProvider>
      <ToastProvider>
        <ReglagesModal open onClose={() => {}} />
      </ToastProvider>
    </LangueProvider>,
  );

describe("ReglagesModal — options de confidentialité (UMP, Android)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.stubGlobal("navigator", { language: "fr-FR" });
    etat.plateforme = "android";
    etat.requis = true;
    etat.montrer.mockReset();
    etat.montrer.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("sur Android, quand UMP l'exige : la section et son bouton sont là", async () => {
    ouvrir();
    expect(
      await screen.findByRole("button", { name: /Options de confidentialité/ }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Confidentialité" })).toBeTruthy();
  });

  it("le bouton rouvre le formulaire natif", async () => {
    ouvrir();
    fireEvent.click(await screen.findByRole("button", { name: /Options de confidentialité/ }));
    await waitFor(() => expect(etat.montrer).toHaveBeenCalledTimes(1));
  });

  it("en erreur du natif, le toast rouge des pubs s'affiche", async () => {
    etat.montrer.mockRejectedValue(new Error("formulaire indisponible"));
    ouvrir();
    fireEvent.click(await screen.findByRole("button", { name: /Options de confidentialité/ }));
    expect(await screen.findByText(/Erreur lors de la pub/)).toBeTruthy();
  });

  it("sur Android, quand UMP ne l'exige pas : rien", async () => {
    etat.requis = false;
    ouvrir();
    // La section Achats (toujours rendue ici) prouve que la modale a fini de
    // se peindre avant qu'on affirme l'absence.
    await screen.findByRole("button", { name: /Restaurer les achats/ });
    expect(screen.queryByRole("button", { name: /Options de confidentialité/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Confidentialité" })).toBeNull();
  });

  it("sur iOS : rien, même si UMP l'exigeait (lot séparé)", async () => {
    etat.plateforme = "ios";
    ouvrir();
    await screen.findByRole("button", { name: /Restaurer les achats/ });
    expect(screen.queryByRole("heading", { name: "Confidentialité" })).toBeNull();
  });

  it("hors Tauri (web/dev) : rien", async () => {
    etat.plateforme = null;
    ouvrir();
    await screen.findByRole("button", { name: /Restaurer les achats/ });
    expect(screen.queryByRole("heading", { name: "Confidentialité" })).toBeNull();
  });
});
```

- [ ] **Step 2 : constater l'échec**

Run : `npx vitest run --maxWorkers=4 src/components/mobile/ReglagesModal.confidentialite.test.tsx 2>&1 | tail -12`
Expected : les trois premiers cas échouent (bouton introuvable), les trois derniers passent déjà.

- [ ] **Step 3 : libellés**

`src/lib/i18n/ui/fr.ts`, bloc `reglages`, après `permissionAccordee` :

```ts
    confidentialite: "Confidentialité",
    optionsConfidentialite: "Options de confidentialité (publicités)",
```

`en.ts` :
```ts
    confidentialite: "Privacy",
    optionsConfidentialite: "Privacy options (ads)",
```

`es.ts` :
```ts
    confidentialite: "Privacidad",
    optionsConfidentialite: "Opciones de privacidad (anuncios)",
```

`el.ts` :
```ts
    confidentialite: "Απόρρητο",
    optionsConfidentialite: "Επιλογές απορρήτου (διαφημίσεις)",
```

- [ ] **Step 4 : la section**

`src/components/mobile/ReglagesModal.tsx` — imports :

```ts
import { plateformeNative } from "@/lib/plateforme";
import {
  montrerOptionsConfidentialite,
  optionsConfidentialiteRequises,
} from "@/lib/ads/adMobProvider";
```

Rendu (lignes 316-318 actuelles) :

```tsx
        <SectionNotifications />
        {plateformeNative() === "android" && <SectionConfidentialite />}
        {achatDisponible() && <SectionAchats />}
```

Nouvelle fonction, entre `SectionNotifications` et `SectionAchats` :

```tsx
/**
 * Encadré Confidentialité : rouvre le formulaire de consentement UMP (pubs
 * personnalisées ou non ; la mesure d'audience y est adossée). Google l'exige
 * pour les joueurs européens — sans lui, la seule issue est de réinstaller.
 * Android seulement (sous-projet B) : le pont iOS ne l'implémente pas encore.
 * Rendu uniquement quand UMP juge le point d'entrée requis.
 */
function SectionConfidentialite() {
  const { playClick } = useSettings();
  const { d } = useLangue();
  const { toast } = useToastSafe();
  const [requis, setRequis] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    let vivant = true;
    void optionsConfidentialiteRequises().then((r) => {
      if (vivant) setRequis(r);
    });
    return () => {
      vivant = false;
    };
  }, []);

  if (!requis) return null;

  const ouvrir = async () => {
    if (enCours) return;
    playClick();
    setEnCours(true);
    try {
      await montrerOptionsConfidentialite();
    } catch {
      toast(d.sheets.erreurPub, { type: "erreur" });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section style={carte} aria-label={d.reglages.confidentialite}>
      <h3 style={sectionTitle}>{d.reglages.confidentialite}</h3>
      <button
        type="button"
        onClick={() => void ouvrir()}
        disabled={enCours}
        style={segBtn(true, enCours)}
      >
        {d.reglages.optionsConfidentialite}
      </button>
    </section>
  );
}
```

- [ ] **Step 5 : vert, suite Réglages, types, lint**

Run : `npx vitest run --maxWorkers=4 src/components/mobile/ReglagesModal src/lib/i18n 2>&1 | tail -6 && npx tsc --noEmit && npx eslint src/components/mobile/ReglagesModal.tsx src/lib/i18n/ui`
Expected : tous verts (le test historique `ReglagesModal.test.tsx` ne mocke pas `@/lib/plateforme` : hors Tauri, `plateformeNative()` rend `null`, la section n'est pas rendue, rien ne casse).

- [ ] **Step 6 : suite complète**

Run : `npx vitest run --maxWorkers=4 2>&1 | tail -6`
Expected : tout vert.

- [ ] **Step 7 : commit**

```bash
git add src/components/mobile/ReglagesModal.tsx src/components/mobile/ReglagesModal.confidentialite.test.tsx src/lib/i18n/ui
git commit -m "feat(reglages): section Confidentialité — rouvrir le formulaire de consentement (Android)

Rendue seulement sur Android et seulement quand UMP juge le point d'entrée
requis (UE). Un bouton, le style de « Restaurer les achats », le toast rouge
des pubs en cas d'échec. Libellés en quatre langues.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GdE92ttvZyjtxzsLeQhVK9"
```

---

### Task 7 : recette émulateur (CDP) et compte rendu

Pas de code produit attendu ; des corrections si la recette en révèle (chacune commitée séparément, avec son test si elle touche le TS).

**Files:**
- Create: `docs/android/2026-09-XX-recette-admob.md` (XX = jour réel)
- Create: `scripts/android-cdp.mjs` (petit pilote CDP réutilisable)

- [ ] **Step 1 : le pilote CDP**

`scripts/android-cdp.mjs` :

```js
#!/usr/bin/env node
// Évalue une expression JS dans la WebView de BROC (build debug) sur l'émulateur.
// Usage : node scripts/android-cdp.mjs "document.title"
// Prérequis : adb forward tcp:9222 localabstract:webview_devtools_remote_$PID
// (PID = adb shell pidof com.guigousse.broc.debug). Node ≥ 22 (WebSocket global).
const expression = process.argv[2] ?? "location.href";
const pages = await (await fetch("http://localhost:9222/json")).json();
const page = pages.find((p) => p.type === "page") ?? pages[0];
if (!page) throw new Error("Aucune page CDP — le forward adb est-il posé ?");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
const msg = await new Promise((r) => (ws.onmessage = (e) => r(JSON.parse(e.data))));
console.log(JSON.stringify(msg.result?.result?.value ?? msg, null, 2));
ws.close();
```

- [ ] **Step 2 : build, installation, remise à zéro**

```bash
npm run build 2>&1 | tail -1
CARGO_PROFILE_DEV_DEBUG=0 npx tauri android build --debug --target x86_64 2>&1 | tail -3
ADB=$ANDROID_HOME/platform-tools/adb
$ADB install -r "$(find src-tauri/gen/android/app/build/outputs/apk -name '*debug*.apk' | head -1)"
$ADB shell pm clear com.guigousse.broc.debug
$ADB logcat -c
$ADB shell am start -n com.guigousse.broc.debug/com.guigousse.broc.MainActivity
sleep 20
PID=$($ADB shell pidof com.guigousse.broc.debug | tr -d '\r'); $ADB forward tcp:9222 localabstract:webview_devtools_remote_$PID
```

- [ ] **Step 3 : les huit points de la spec §9**

Pour chaque point, noter dans le compte rendu **la mesure** (sortie logcat, valeur CDP, capture), pas l'impression :

1. **Formulaire UMP** au premier lancement : `$ADB exec-out screencap -p > /tmp/r1.png` (le formulaire Google est visible) ; l'accepter au doigt ou par `$ADB shell input tap X Y`. Puis
   `$ADB shell run-as com.guigousse.broc.debug cat shared_prefs/com.guigousse.broc.debug_preferences.xml | grep IABTCF` → `IABTCF_gdprApplies` = 1 et `IABTCF_PurposeConsents` non vide.
2. **Machine à énergie** : ouvrir la recharge, taper « regarder une pub ». La pub de test Google s'affiche (capture). La fermer à la fin → `node scripts/android-cdp.mjs "JSON.parse(localStorage.getItem('broc.save.slot-1')||'{}').energie"` (adapter la clé de save à celle réellement utilisée : `localStorage.length` puis `Object.keys(localStorage)` pour la trouver) a gagné +1.
3. **Boîte mystère** et **Atelier** : même procédure ; `$ADB logcat -d | grep -c "onAdLoaded\|Ads"` croît ; aucune erreur `Ads` rouge.
4. **Fermeture avant la fin** : lancer une pub, taper la croix dès qu'elle apparaît → pas de +1, **pas de toast d'erreur** (capture).
5. **Mode avion** : `$ADB shell svc wifi disable && $ADB shell svc data disable`, lancer une pub → toast rouge « Erreur lors de la pub » (capture), l'app ne plante pas (`$ADB logcat -d | grep FATAL` vide). Réactiver le réseau.
6. **Réglages → Confidentialité** : la section est là (capture) ; le bouton rouvre le formulaire ; **tout refuser** ; retour au jeu ; une pub se charge encore (non personnalisée) ; `grep IABTCF_PurposeConsents` → `00000000000`.
7. `$ADB shell dumpsys package com.guigousse.broc.debug | grep AD_ID` → présente.
8. `$ADB logcat -d | grep -iE "APPLICATION_ID|invalid ad unit|format"` → rien d'alarmant.

- [ ] **Step 4 : compte rendu**

`docs/android/2026-09-XX-recette-admob.md` : tableau point / attendu / mesuré / verdict, captures référencées, défauts trouvés et commits de correction. Terminer par la liste de ce que l'émulateur **ne prouve pas** (revenus réels, comportement d'un vrai appareil hors UE, Play Services à jour).

- [ ] **Step 5 : commit**

```bash
git add docs/android/2026-09-*-recette-admob.md scripts/android-cdp.mjs
git commit -m "docs(android): recette émulateur des pubs AdMob — huit points mesurés

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GdE92ttvZyjtxzsLeQhVK9"
```

---

### Task 8 : brancher les vrais identifiants AdMob Android (quand Guillaume les fournit)

Cette tâche attend quatre valeurs que seul Guillaume peut créer dans la console AdMob (spec §10, étapes 1-2) : l'App ID Android (`ca-app-pub-6928338731034491~…`) et trois blocs **« Récompensé »** (`ca-app-pub-6928338731034491/…`), un par emplacement. Si elles ne sont pas disponibles, **sauter cette tâche** et le dire dans le compte rendu — B est livrable avec les IDs de test, mais la fusion (Task 9) ne doit alors PAS partir en production.

**Files:**
- Modify: `src-tauri/vendor/tauri-plugin-admob/android/src/main/java/AdmobPlugin.kt` (table)
- Modify: `src-tauri/gen/android/app/src/main/AndroidManifest.xml` (meta-data)

- [ ] **Step 1 : la table**

```kotlin
// Blocs rewarded de PRODUCTION, UN PAR EMPLACEMENT du jeu (créés le 2026-09-XX,
// format « Récompensé »). Pour tout débogage, remettre le bloc de test Google
// "ca-app-pub-3940256099942544/5224354917" — l'émulateur est déjà appareil de
// test, mais un vrai téléphone qui clique ses propres pubs = ban AdMob.
private const val AD_UNIT_ENERGIE = "ca-app-pub-6928338731034491/<ID_ENERGIE>"
private val AD_UNITS: Map<String, String> = mapOf(
  "energie" to AD_UNIT_ENERGIE,
  "boite-mystere" to "ca-app-pub-6928338731034491/<ID_BOITE_MYSTERE>",
  "restauration" to "ca-app-pub-6928338731034491/<ID_RESTAURATION>",
)
```

(supprimer `AD_UNIT_TEST` ; `<ID_…>` = valeurs données par Guillaume).

- [ ] **Step 2 : le manifeste**

```xml
        <!-- App ID AdMob Android (console AdMob, app com.guigousse.broc). -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-6928338731034491~<APP_ID_ANDROID>" />
```

- [ ] **Step 3 : la garde « aucun bloc partagé » se réveille**

Run : `npx vitest run --maxWorkers=4 src/lib/ads/emplacementsAppeles.test.ts 2>&1 | tail -8`
Expected : plus aucun `skipped` ; « aucun bloc n'est partagé » **vert** (trois IDs distincts). S'il échoue, deux blocs ont le même ID : erreur de copie.

- [ ] **Step 4 : fumée émulateur avec les vrais blocs**

Rebuild debug (Task 7 Step 2), lancer une pub depuis la machine à énergie : une pub s'affiche (marquée « Test Ad » par Google puisque l'émulateur est appareil de test) ; `$ADB logcat -d | grep -i "invalid\|format"` vide. Si « no fill » : normal les premières heures après création d'un bloc, ne pas conclure à une erreur avant 24 h.

- [ ] **Step 5 : commit**

```bash
git add src-tauri/vendor/tauri-plugin-admob/android/src/main/java/AdmobPlugin.kt src-tauri/gen/android/app/src/main/AndroidManifest.xml
git commit -m "feat(android): blocs AdMob Android de production, un par emplacement

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GdE92ttvZyjtxzsLeQhVK9"
```

---

### Task 9 : fusion dans `feat/android-socle`, build CI, mémoire

**Files:**
- Modify: `docs/android/2026-08-12-publication-play.md` (section « Sous-projet B »)

- [ ] **Step 1 : vérifications finales sur la branche**

Run : `npx vitest run --maxWorkers=4 2>&1 | tail -4 && npx tsc --noEmit && npx eslint src && npm run build 2>&1 | tail -1 && scripts/android-cargo-check.sh -p tauri-plugin-admob 2>&1 | tail -1`
Expected : tout vert.

- [ ] **Step 2 : note de publication**

Ajouter à `docs/android/2026-08-12-publication-play.md` une section « Sous-projet B — pubs AdMob (2026-09-XX) » : ce que la build embarque (SDK 25.4.0, Kotlin 2.1.21, permission AD_ID, App ID), ce qui change **dans Play Console au moment de la sortie monétisée** (Annonces → oui ; Data safety → identifiant publicitaire collecté et partagé avec Google, finalité publicité ; AD_ID déclarée) et le rappel que l'AAB de cette build va sur une piste de **test**, pas en production, tant que ces déclarations ne sont pas faites. Commit :

```bash
git add docs/android/2026-08-12-publication-play.md
git commit -m "docs(android): ce que la build B change dans Play Console

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GdE92ttvZyjtxzsLeQhVK9"
```

- [ ] **Step 3 : fusion (dans le worktree, sans toucher au checkout principal)**

```bash
git fetch origin feat/android-socle
git log --oneline feat/android-admob..origin/feat/android-socle   # doit être vide, sinon rebaser d'abord
git push origin feat/android-admob
```

Puis **demander à Guillaume** avant de fusionner : la fusion dans `feat/android-socle` et son push lancent la build CI d'1-2 h et consomment un `versionCode`. Sur son accord :

```bash
git checkout -b tmp-socle origin/feat/android-socle
git merge --no-ff feat/android-admob -m "Merge feat/android-admob : pubs AdMob Android (sous-projet B)"
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin HEAD:feat/android-socle
git checkout feat/android-admob && git branch -D tmp-socle
```

- [ ] **Step 4 : suivre la build**

Run : `gh run list --workflow android-play.yml --limit 1` puis `gh run watch <id>`.
Expected : succès ; dans les logs Gradle, `play-services-ads:25.4.0` résolu ; artefact `broc-aab`. Télécharger (`gh run download <id> -n broc-aab`), `jarsigner -verify` → `jar verified`. Guillaume dépose sur la piste **interne** pour vérifier sur son Xiaomi si l'occasion se présente.

- [ ] **Step 5 : mémoire**

Mettre à jour `~/.claude/projects/-Users-guillaume-dev-Projet-Broc-V2/memory/android-admob.md` (état, commits, ce qui reste : IDs réels si Task 8 sautée, C ensuite) et sa ligne dans `MEMORY.md`.

---

## Auto-revue du plan (faite le 2026-09-05)

**Couverture de la spec** : §3.2 fichiers → T1/T2/T4/T5/T6 ; §3.4 versions → T1 ; §4 comportement Kotlin → T3 ; §4.6 options → T4 ; §5 TS → T2/T5 ; §6 Réglages + libellés → T6 ; §7 manifeste → T1 (+T8) ; §8 erreurs → T3 (rejets), T5 (faux sur erreur), T6 (toast) ; §9 tests → T2/T3/T5/T6 (vitest), T1/T4 (cargo), T7 (recette), T9 (CI) ; §10 console → T8 + T9 Step 2 ; §11 Kotlin → T1 Step 6/8.

**Cohérence des noms** : `ArgsRewarded.emplacement` (T1, T3) ; `consentInformation` (T3, T4) ; `OptionsConfidentialite { requis }` Rust ↔ `{ requis }` Kotlin ↔ `res.requis` TS (T4, T5) ; `optionsConfidentialiteRequises` / `montrerOptionsConfidentialite` (T5, T6) ; clés `reglages.confidentialite` / `reglages.optionsConfidentialite` (T6) ; `AD_UNIT_TEST` présent en T3, supprimé en T8, garde `skipIf(enTest)` cohérente avec les deux états.
