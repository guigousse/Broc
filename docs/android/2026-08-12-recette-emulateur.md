# Recette Android sur émulateur — 2026-08-12

Livrable non-code de la Task 11 du plan `docs/superpowers/plans/2026-08-10-android-socle.md`.
Première exécution de BROC sur Android, de bout en bout.

## Environnement réellement installé

Le plan prévoyait Android Studio ; il n'est **pas** installé. Le Mac (MacBook Pro 15,1,
Intel, macOS 14.7.6) n'avait pas les 15 Gi demandés, et la voie « command-line tools »
coûte ~2,4 Gi au lieu de ~13 Gi.

| Élément | Version / chemin |
|---|---|
| JDK | `openjdk@17` Homebrew — `/usr/local/opt/openjdk@17` |
| SDK | `android-commandlinetools` — `/usr/local/share/android-commandlinetools` |
| Platform-tools (`adb`) | 37.0.1 |
| Plateformes / build-tools | android-34, android-35 / 34.0.0, 35.0.0 |
| NDK | 27.3.13750724 |
| Cible Rust | `x86_64-linux-android` (émulateur ; l'hôte est Intel) |
| Émulateur | 37.1.11, image `android-34;google_apis;x86_64` |
| AVD | `broc-pixel6` — Pixel 6, 1080×2400, 420 dpi, RAM 2,5 Gi, data 2 Gi |

Les variables sont dans `~/.zshrc` (`JAVA_HOME`, `ANDROID_HOME`, `NDK_HOME`, `PATH`).

**Image « Google APIs » et non « Google Play »** : les services Google y sont (prérequis
du sous-projet B, AdMob) sans le Play Store, ce qui économise ~1 Gi. Si le sous-projet C
(achat intégré) exige un vrai compte Play, il faudra ajouter l'image `google_apis_playstore`.

## Mesure de départ

- **APK debug** : `app-universal-debug.apk` — **159 Mo**
  (`src-tauri/gen/android/app/build/outputs/apk/universal/debug/`)
- Une seule ABI par build → Tauri nomme la sortie `universal`, pas `x86_64`.

## Les dix points

| # | Point | Verdict |
|---|---|---|
| 1 | Lancement | ✅ |
| 2 | Plein écran / safe areas | ❌ **inset bas absent** |
| 3 | Bouton retour | ✅ (3 contextes) |
| 4 | Orientation portrait | ✅ prouvé dans l'APK |
| 5 | Publicités indisponibles | ⏳ à confirmer à l'écran |
| 6 | Achat indisponible | ⏳ à confirmer à l'écran |
| 7 | Vendeur mystère absent | ⏳ à confirmer à l'écran |
| 8 | Audio | ✅ (focus audio obtenu, musique du menu) |
| 9 | Sauvegarde / reprise | ⏳ |
| 10 | Taille de l'APK | ✅ 159 Mo, noté ci-dessus |

### 1. Lancement — ✅

Menu principal complet et net : façade, titre `BROC`, cinq boutons, « CONTINUE » grisé
tant qu'aucune sauvegarde n'existe. Aucun flash blanc. « NEW GAME » enchaîne sur le
tutoriel (dialogue du grand-père, HUD, calendrier) sans accroc.

Piège de méthode : la capture prise 10 s après `am start` ne montrait que le fond vert
forêt du thème. Ce n'était pas une panne, mais l'hydratation React pas encore terminée —
sur cet émulateur en rendu **logiciel**, laisser ~30 s avant de juger.

### 2. Plein écran et safe areas — ❌ le défaut de cette recette

Mesuré dans la webview (console CDP, cf. « Outillage » plus bas) :

```
innerHeight 915  ==  screen.height 915      → la webview occupe tout l'écran
env(safe-area-inset-top)    → --safe-top    = 49px   ✅
env(safe-area-inset-bottom) → --safe-bottom = 0px    ❌
```

Or l'appareil a une barre de gestes : `dumpsys window displays` donne un écran de
1080×2400 pour une zone applicative de 1080×2209, soit **62 px physiques ≈ 24 px CSS**
en bas, que la WebView Android **ne déclare pas**.

Conséquence visible : le dock du bas (`COLLECTION / OFFICE / STORAGE / WORKSHOP`) est
rogné, et la rangée `BACK / CONTINUE` de la chine passe sous la pilule de navigation.
Le haut, lui, est correct — c'était le doute principal du plan, il est levé.

**Pistes de correction** (sous-projet à ouvrir, hors socle) :
1. côté natif, lire `WindowInsetsCompat.Type.navigationBars()` et l'injecter en variable
   CSS — la seule voie exacte, y compris barre à 3 boutons (48 dp) ;
2. côté CSS, replier `--safe-bottom` sur un minimum quand la plateforme est Android et
   que l'inset vaut 0 — simple, approximatif, suffisant si l'on vise la barre de gestes.

### 3. Bouton retour matériel — ✅

Trois contextes éprouvés, conformes à la Task 8 :

| Depuis | Attendu | Observé |
|---|---|---|
| Menu (`/`) | confirmation | toast « PRESS BACK AGAIN TO EXIT », l'app reste |
| Chine, encart de négociation ouvert | fermer l'overlay | encart fermé, route inchangée |
| Chine, sans overlay | remonter d'un niveau | route inchangée, app conservée |

**Anomalie observée une fois, non reproduite.** Au tout premier lancement après
installation, un appui sur Retour a quitté l'application. Le plugin `AppPlugin.kt`
(tauri 2.11.2) ne rend la main au système que si **aucun** écouteur `back-button`
n'existe : au moment de cet appui, l'écouteur était donc absent. Le journal de cette
session porte sept avertissements `[TAURI] Couldn't find callback id …`, signature d'un
**rechargement de la webview** — l'émulateur avait par ailleurs annoncé une pression
mémoire (« Software GL rendering will be used due to system memory pressure »). Un
redémarrage du processus de rendu laisse une fenêtre où l'écouteur n'est pas encore
réenregistré, et l'appui y retombe sur le comportement natif.

Non reproductible après `pm clear` + relance (dix appuis, trois écrans). À surveiller sur
un vrai appareil, où la pression mémoire est différente. Si cela se confirme, le remède
n'est pas dans le composant React mais côté natif : garder l'écouteur enregistré, ou
neutraliser le `OnBackPressedCallback` par défaut.

### 4. Orientation portrait — ✅

`android:screenOrientation="1"` (portrait) lu **dans l'APK construit** via `apkanalyzer`,
et non seulement dans le source : le réglage a bien survécu à la chaîne de build.

### 5-7, 9. Points restant à confirmer à l'écran

Le code est couvert par les tests unitaires (Tasks 5, 6, 7) et aucun libellé de pub ou
d'achat n'apparaît dans les écrans parcourus. Restent à valider à l'œil, sur l'émulateur
déjà démarré : la modale de recharge d'énergie (aucun cartel de pub, aucun bouton
d'achat), la section « Achats » des réglages (absente), le vendeur mystère (jamais
proposé en chine), et la reprise après retour à l'accueil.

### 8. Audio — ✅

`MediaFocusControl … requestAudioFocus() from com.guigousse.broc.debug` : le focus audio
est obtenu, la musique du menu démarre.

## Outillage : une console JS sur l'appareil

Les builds debug activent le débogage WebView. De quoi mesurer au lieu de deviner :

```bash
PID=$(adb shell pidof com.guigousse.broc.debug | tr -d '\r')
adb forward tcp:9222 localabstract:webview_devtools_remote_$PID
curl -s http://localhost:9222/json          # liste les pages + l'URL WebSocket
```

Puis n'importe quelle expression via `Runtime.evaluate` du protocole CDP (Node ≥ 22 a
`WebSocket` en global). C'est ainsi qu'ont été relevés les insets ci-dessus.

## Ce qui a coûté le plus cher : le disque

Trois builds tuées par `No space left on device`, l'erreur réelle noyée sous une cascade
de messages Tauri. Deux enseignements :

- **`CARGO_PROFILE_DEV_DEBUG=0`** est désormais posé par `scripts/android-sim.sh` : les
  artefacts Rust de debug pesaient 4,2 Gi par cible, contre ~1 Gi sans les informations de
  débogage, inutiles ici (on débogue par la webview et `logcat`).
- Prévoir **~10 Gi libres** avant de lancer l'émulateur : il refuse de démarrer sous
  ~2,4× la taille de sa partition de données (`Not enough space to create userdata
  partition`).

## Suite

1. Corriger l'inset bas (point 2) — le seul vrai défaut trouvé.
2. Confirmer les points 5-7 et 9 à l'écran.
3. Sous-projet B (AdMob Android), puis C (achat), puis D (AAB de release, qui exigera
   les quatre ABI et donc `aarch64-linux-android` de nouveau).
