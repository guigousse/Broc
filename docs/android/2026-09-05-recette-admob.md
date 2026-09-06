# Recette émulateur — pubs AdMob Android (sous-projet B) — 2026-09-05

Livrable de la Task 7 du plan `docs/superpowers/plans/2026-09-05-android-admob.md`
(spec `docs/superpowers/specs/2026-09-05-android-admob-design.md`). Build debug x86_64
de `feat/android-admob`, AVD `broc-pixel6` (image `google_apis`, 4 CPU), App ID et bloc
rewarded **de test Google** (les blocs Android n'existent pas encore dans la console).

Tout ce qui suit a été **mesuré** (CDP, `logcat`, `dumpsys`, SharedPreferences), pas
jugé sur capture. Outillage : `scripts/android-cdp.mjs` (évalue du JS dans la WebView du
jeu) et `scripts/android-inject-save.mjs` (injecte une partie de démo, cf. pièges §3).

## 1. Les huit points de la spec (§9)

| # | Point | Attendu | Mesuré | Verdict |
|---|---|---|---|---|
| 1 | Formulaire UMP au premier lancement (géographie UE forcée en debug) | formulaire Google, clés IABTCF écrites | formulaire « Publisher Test Ads » affiché ; après Consent : `IABTCF_gdprApplies=1`, `IABTCF_PurposeConsents=11111111111`, `IABTCF_TCString` présent ; `Ads: SDK version afma-sdk-a-v262180000` | ✅ |
| 2 | Machine à énergie → pub → récompense | pub de test, +1 ⚡ | `pluginId: admob, command: showRewardedAd` → `AdActivity` affichée en 693 ms → vidéo Flood-It → « Reward granted » → fermeture → jauge 2/5 → **3/5**, `energie=3` dans la save (écriture différée de quelques secondes) | ✅ |
| 3 | Boîte mystère et Atelier | même chemin | **non rejoué à l'écran** : les trois appelants passent par le même `showRewardedAd(emplacement)` (garde vitest `emplacementsAppeles.test.ts`, appelants ET table Kotlin), et les trois emplacements pointent aujourd'hui le même bloc de test | ➖ couvert par test |
| 4 | Fermer la pub avant la récompense | pas de +1, pas de toast d'erreur | **non reproductible avec les créations de test Google** : les deux variantes servies (vidéo 30 s, image statique) accordent la récompense avant que la croix n'apparaisse ; Retour pendant la pub = fermeture après récompense (+1 conservé). Le mécanisme est structurel : `rewarded` n'est vrai que dans `OnUserEarnedRewardListener` | ➖ structurel |
| 5 | Mode avion → pub → toast, pas de plantage | toast `erreurPub`, jauge intacte | réseau coupé (`svc wifi/data disable`), pub demandée : toast « Ad error — try again. » à t+3 s, bouton réarmé, jauge 1/5 inchangée, `Ads: Unable to resolve host googleads.g.doubleclick.net` puis `Ad failed to load : 0`, aucun `FATAL` | ✅ |
| 6 | Réglages → Confidentialité → rouvrir → tout refuser → pubs encore servies | section visible, formulaire, `PurposeConsents=000…`, pub non personnalisée | section « Privacy » + bouton « Privacy options (ads) » rendus (`privacyOptionsRequired` → `{requis:true}`) ; formulaire rouvert ; « Do not consent » → `IABTCF_PurposeConsents=00000000000`, l'invoke se résout à la fermeture (78 s) ; Continue → machine → pub : `AdActivity` affichée | ✅ (avec le défaut 2.2) |
| 7 | Permission AD_ID | présente | `dumpsys package` : `com.google.android.gms.permission.AD_ID` (4 occurrences, dont `granted=true`) | ✅ |
| 8 | Journal Ads sain | rien sur APPLICATION_ID / format | aucun `APPLICATION_ID` manquant, aucun refus de format ; seul avertissement : « will not integrate with Firebase » (attendu, F n'existe pas sur Android) | ✅ |

Captures : `Test Ad` Flood-It plein écran, « Reward granted », machine à 3/5 puis 4/5,
Réglages avec la section Privacy, formulaire rouvert depuis les Réglages.

## 2. Défauts trouvés

### 2.1 ⛔ P0 — `notification.request_permission` bloque un worker Rust pour toujours (HORS B, préexistant)

**Symptôme** : après la première pub récompensée, le jeu a demandé la permission
notifications (dialogue Android « Allow Broc to send notifications? », accordée). Quelques
minutes plus tard, **toute commande asynchrone** ne répondait plus : `admob|initialize`,
`admob|privacy_options_required`, `notification|is_permission_granted`,
`stockage|espace_libre` → aucune n'atteignait Kotlin (pas de ligne
`Tauri plugin: pluginId:` dans logcat), alors que les commandes **synchrones**
(`app|version`) et le rejet ACL (`admob|nexistepas not allowed`) répondaient. Un
rechargement de page restait figé sur « Ouverture du local… ».

**Cause, prouvée par backtrace natif** (`adb root` + `debuggerd -b <pid>`) : les
**4 `tokio-rt-worker`** (= 4 CPU de l'AVD) étaient tous bloqués dans
`std::sync::mpsc::Receiver::recv` ← `PluginHandle::run_mobile_plugin` ←
**`tauri_plugin_notification::mobile::Notification::request_permission`**. Le côté
Kotlin de `requestPermission` (plugin notification vendoré / mécanisme de callback de
permission de Tauri) **ne répond jamais**, même une fois la permission accordée. Chaque
appel consomme un worker ; au quatrième, le runtime async est mort. Le jeu appelle
`request_permission` plusieurs fois (chaque changement d'énergie / replanification ?).

**Portée** : ce code est dans la 1.5.0 **en production**. À traiter en chantier dédié,
avant toute nouvelle sortie Android : (a) comprendre pourquoi le callback Kotlin ne
revient pas ; (b) côté jeu, ne demander la permission qu'une fois par session et
seulement sur geste ; (c) envisager de ne pas bloquer un worker (`spawn_blocking`).

**Conséquence sur cette recette** : l'app a été relancée (`am force-stop`) et la
permission étant désormais accordée, le plugin ne bloque plus ; la suite s'est déroulée
dans un processus propre.

### 2.2 ⚠ `showPrivacyOptions` ne s'affichait pas au premier appui — CORRIGÉ

Au premier clic, `showPrivacyOptionsForm` a répondu sans afficher (`UserMessagingPlatform:
No valid response received yet.`) ; le second clic, 3 min plus tard, a affiché le
formulaire. Cause : la requête d'infos de consentement du boot avait échoué
(`SocketException: Software caused connection abort`, réseau de l'émulateur instable
après mes coupures), le SDK n'avait donc pas de formulaire chargé. Correctif :
`showPrivacyOptions` refait `requestConsentInfoUpdate` avant d'afficher (instantané quand
les infos sont en cache), et l'échec remonte au joueur par le toast. Vérification après
rebuild : §4.

### 2.3 ℹ Le bouton Retour n'agit pas sur la modale de la machine à énergie

Retour pressé pendant le chargement d'une pub (avant l'`AdActivity`) : rien. Défaut déjà
ouvert depuis la recette du 2026-08-26 (`empilerFermeture` n'est appelé que par
`BottomSheet`), sous-projet qualité.

### 2.4 ℹ Rechargement à froid sur `/bureau` figé sur « Ouverture du local… »

`location.reload()` sur `/bureau` (hors du P0 ci-dessus, reproduit après relance) reste
sur l'écran d'ouverture ; passer par `/` fonctionne. Non investigué (hors B) ;
`android-inject-save.mjs` repasse par le menu.

## 3. Pièges d'outillage (réutilisables)

- **Le SDK GMA expose ses propres WebViews cachées en CDP** (`googleads.g.doubleclick.net/mads/…`),
  listées AVANT celle du jeu. Évaluer dedans écrit dans le mauvais `localStorage`, et un
  `location.reload()` y est pris pour un clic sur une pub : **Chrome s'ouvre**. Ne cibler
  que l'URL `tauri.localhost` (fait dans les deux scripts).
- **La copie durable de la save l'emporte sur `localStorage`** au démarrage quand elle est
  plus récente : une partie injectée est écrasée (énergie revenue à 5/5). Effacer
  `slot-N.json` et `slots.json` à la racine du conteneur (`run-as`) avant d'injecter.
- **Une jauge pleine n'a pas de bouton pub** : injecter avec `--energie 1` ou 2.
- **Les réponses du fil principal Kotlin sont lentes** sur l'émulateur : 4 s ne suffisent
  pas toujours pour voir la section Confidentialité apparaître ; relire avant de conclure.
- **`pm clear` efface aussi les slots** ; `scripts/gen-save-demo.ts` fournit une partie de
  niveau 75 (SAVE_VERSION courante) en une commande.
- **Une capture prise trop tôt montre une image figée** (menu vu à la place du bureau) —
  toujours confirmer par CDP (`location.pathname`, `performance.now()`).
- Le pare-feu de la session refuse les commandes dont le binaire est calculé
  (`$ADB devices`) : écrire le chemin complet de `adb`.

## 4. Vérification du correctif 2.2 (build 5)

Rebuild, réinstallation, **démarrage à froid** (`am force-stop` puis relance), donc dans
l'état exact où le défaut se produisait — le SDK n'a rien en cache.

| Chemin | Mesuré | Verdict |
|---|---|---|
| Appel direct `plugin:admob|show_privacy_options` | `command: showPrivacyOptions` → `Wall html loaded` → **formulaire affiché** (capture), l'invoke reste en attente tant que le joueur n'a pas répondu, puis se résout | ✅ |
| Bouton « Privacy options (ads) » des Réglages, **premier appui** | formulaire affiché par-dessus la modale Réglages (capture), 19 s sur l'émulateur entre le clic et `Wall html loaded` | ✅ |
| Réponse « Consent » | `IABTCF_PurposeConsents=11111111111` | ✅ |
| Après fermeture | aucun toast d'erreur, section « Privacy » toujours là, **0 `FATAL EXCEPTION`** | ✅ |

Plus aucun « No valid response received yet ». Le défaut 2.2 est fermé.

⚠ La latence de l'émulateur (jusqu'à 19 s) est trompeuse : ne pas conclure à un échec
avant ~25 s, et confirmer par capture plutôt que par `dumpsys window` — le formulaire UMP
est un **dialogue dans l'activité du jeu**, `mCurrentFocus` reste `MainActivity`.

## 5. Deuxième passe avec les identifiants de PRODUCTION — 2026-09-06

Guillaume a créé l'app AdMob « Broc Android » et ses trois blocs le 2026-09-05 au soir,
puis publié son message de consentement européen. App ID `…~4045707660` dans le
manifeste, trois blocs dans `AdmobPlugin.kt`. Rebuild, réinstallation, `pm clear`.

| Point | Mesuré | Verdict |
|---|---|---|
| App ID de production reconnu | **le message de consentement de Guillaume s'affiche**, avec son logo, son texte « Broc asks for your consent », ses 210 partenaires et le bouton Refuser qu'il venait d'activer. C'est la preuve que l'App ID correspond à son compte et à son app, et que le message est publié et ciblé sur Broc Android | ✅ |
| Acceptation | `IABTCF_gdprApplies=1`, `IABTCF_PurposeConsents=11111111111` | ✅ |
| Bloc **énergie** de production | une **vraie campagne** est servie, en mode Test Ad puisque l'émulateur est appareil de test. Le bloc est donc bien au format « Avec récompense », sinon `RewardedAd.load` l'aurait refusé | ✅ |
| **Fermeture avant la récompense** | enfin testable : les vraies créations durent plus longtemps que celles de test et exposent la croix avant la fin. Google demande confirmation, puis la fermeture donne **pas de gain**, jauge et sauvegarde inchangées à 1, **aucun toast d'erreur**, bouton réarmé sur « +1 » | ✅ |
| Blocs **boîte mystère** et **restauration** | pas chargés sur l'appareil : trois tentatives, trois échecs de nature réseau sur un émulateur dégradé par mes coupures répétées, `Ad failed to load : 2`, puis `unexpected end of stream`, puis `Missing required "js" parameter`. Aucun n'est un refus de format. **Format confirmé par Guillaume dans la console** le 2026-09-06 : les trois lignes affichent « Avec récompense » | ✅ par la console |

Le contrôle qui manquait le 2026-08-18, quand un bloc iOS créé en « Interstitiel avec
récompense » a produit un toast rouge en production, est donc fait. La colonne Format de
la console répond en cinq secondes là où l'émulateur a résisté une heure : c'est le
premier réflexe à avoir, avant de chercher un défaut dans le code.

**Défaut d'environnement à retenir** : couper et rétablir le réseau plusieurs fois par
`svc wifi disable` finit par casser durablement la pile réseau de l'AVD, jusqu'à survivre
à un redémarrage. Le System UI part alors en boucle d'ANR. Pour recetter un mode
hors-ligne, préférer une seule coupure en fin de session.

## 6. Ce que l'émulateur ne prouve pas

- Les revenus réels et le taux de remplissage des vrais blocs (Task 8, IDs à créer par
  Guillaume) ; le trafic de test ne remonte pas dans AdMob.
- Le comportement hors UE (le formulaire est forcé « UE » en debug ; en release, le
  statut vient de la géolocalisation réelle).
- Un vrai téléphone avec Play Services à jour, une pub réelle fermée avant la récompense,
  et la fatigue mémoire d'un appareil modeste.
