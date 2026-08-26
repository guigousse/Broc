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

- **APK debug** : `app-universal-debug.apk` — **159 Mo** à la première build,
  **311 Mo** après les correctifs de zone sûre
  (`src-tauri/gen/android/app/build/outputs/apk/universal/debug/`)
- Une seule ABI par build → Tauri nomme la sortie `universal`, pas `x86_64`.
- Le poste dominant est `lib/x86_64/libapp_lib.so`, **152 Mo**, stocké non compressé et
  non *strippé* : `CARGO_PROFILE_DEV_DEBUG=0` supprime les sections DWARF mais laisse la
  table des symboles. C'est une build **de debug** ; le chiffre qui comptera est celui de
  l'AAB de release (sous-projet D), où le `.so` sera optimisé et strippé. Ne pas lire ces
  311 Mo comme la taille du jeu sur le Play Store.

## Les dix points

| # | Point | Verdict |
|---|---|---|
| 1 | Lancement | ✅ |
| 2 | Plein écran / safe areas | ❌ **les deux insets absents** → corrigé le jour même |
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

### 2. Plein écran et safe areas — ❌ le défaut de cette recette, corrigé depuis

Mesuré dans la webview (console CDP, cf. « Outillage » plus bas) :

```
innerHeight 915  ==  screen.height 915      → la webview occupe tout l'écran
env(safe-area-inset-bottom) → --safe-bottom = 0px    ❌  en permanence
env(safe-area-inset-top)    → --safe-top    = 49px puis 0px  ❌  intermittent
```

Le bas d'abord : `dumpsys window displays` donne un écran de 1080×2400 pour une zone
applicative de 1080×2209, soit **62 px physiques ≈ 24 px CSS** de barre de gestes, que la
WebView **ne déclare pas**. Le dock (`COLLECTION / OFFICE / STORAGE / WORKSHOP`) était
rogné, la rangée `BACK / CONTINUE` de la chine passait sous la pilule.

Le haut ensuite, et c'est le plus vicieux : l'inset valait **49 px à 13h22 et 0 px à
13h37**, sur le même APK, sans jamais revenir. La WebView Android les perd à certains
relayouts. Le header se retrouve alors collé à `y = 0` : l'heure par-dessus le logo
`BROC`, le Wi-Fi sur `TILL`, et `LEVEL` — centré en haut — sous le poinçon de la caméra.

**Correction retenue : mesurer côté natif, laisser le front venir chercher.**

- `MainActivity.kt` pose un `OnApplyWindowInsetsListener` sur la WebView (sans consommer
  les insets : le bord à bord est conservé), met les deux hauteurs en cache `@Volatile`
  et les expose par `window.BrocInsets.hautPx()` / `.basPx()`.
- `src/lib/zoneSureAndroid.ts` les lit et **refuse** tout ce qui n'est pas une mesure
  plausible (pont absent ou incomplet, `NaN`, négatif, > 120 px, exception) : on retombe
  alors sur `env()`, jamais sur une valeur inventée. Arrondi à l'entier supérieur.
- `<ZoneSureAndroid />` (monté dans le layout racine) publie `--safe-top-natif` et
  `--safe-bottom-natif`, relus au `resize` **et au retour au premier plan** — c'est là que
  la WebView perd ses insets.
- `globals.css` combine :
  `--safe-top: max(env(safe-area-inset-top, 0px), var(--safe-top-natif, 0px))`, idem en
  bas. Les ~30 usages existants en héritent sans être touchés, et **iOS est inchangé** :
  sans le pont, les variables n'existent pas et `env()` garde la main.

C'est le front qui interroge, jamais le natif qui pousse : les insets sont appliqués
avant que le document existe, une écriture depuis Kotlin serait perdue au chargement.

Vérifié sur l'émulateur après correction : `--safe-top` = 49 px, `--safe-bottom` = 24 px,
header dégagé sous la barre d'état, dock au-dessus de la pilule.

**Reste ouvert — le contraste des icônes système.** Android les dessine en sombre
(`mLastAppearance=LIGHT_STATUS_BARS`, le thème de l'app est clair) : gris foncé sur le
bandeau vert forêt du jeu, lisible mais laid. Les forcer en blanc arrangerait le jeu et
casserait le menu, dont le haut est une façade beige. La correction propre est de rendre
l'apparence dépendante de l'écran, donc un second pont JS → natif. Non fait.

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

**⚠ Portée réelle du « fermer l'overlay », mesurée le 2026-08-26 — plus étroite
qu'il n'y paraît ici.** Le contexte éprouvé ci-dessus (l'encart de négociation) est
un `BottomSheet`, et `BottomSheet.tsx` est **le seul composant du dépôt** à appeler
`empilerFermeture` (`src/lib/retourAndroid.ts`). Tout overlay qui n'en est pas un
ignore donc le bouton retour. Constaté sur la borne d'arcade du Bazar : deux appuis,
la borne reste ouverte (l'app ne quitte pas, au moins).

La liste des couches plein écran concernées est longue — `ObjetDetailOverlay`,
`CollectionDetailOverlay`, `GazetteSheet`, `ParcoursSheet`, `EnergieRecharge`,
`PartiesModal`, `ArticleDetailBazar`, `CreditsModal`, la borne d'arcade… Sur Android,
Retour est *le* geste de retour arrière : un testeur qui appuie sans effet en conclut
que l'app est cassée.

Ce n'est PAS une correction d'une ligne : chaque overlay doit être jugé
individuellement, et certains ne doivent surtout pas se fermer sur Retour
(`LevelUpOverlay`, `BandeauSauvegarde`, `Toast`, `TabBar`). Chantier laissé ouvert
sciemment le 2026-08-26 : le défaut existait déjà dans la 1.3.0 déposée sur Play, il
ne régresse rien, et la mise à jour des testeurs ne devait pas l'attendre.

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

1. Décider du contraste des icônes système (point 2, seul reliquat).
2. Confirmer les points 5-7 et 9 à l'écran.
3. Sous-projet B (AdMob Android), puis C (achat), puis D (AAB de release, qui exigera
   les quatre ABI et donc `aarch64-linux-android` de nouveau).
