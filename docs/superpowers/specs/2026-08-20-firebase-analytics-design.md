# Firebase Analytics — mesure d'audience iOS — conception

**Date :** 2026-08-20
**Périmètre :** iOS uniquement (Android en chantier séparé, voir « Ce qui n'est pas
dans ce chantier »)

## Pourquoi

Le jeu est en production sur l'App Store depuis la 1.0.0 et ne mesure **rien**.
Les seuls chiffres disponibles viennent de consoles tierces qui regardent chacune
un bout du problème : App Store Connect donne les installs, AdMob donne le revenu
publicitaire, Apple Ads donne les clics. Aucune ne dit ce que fait un joueur
*dans* le jeu, ni s'il revient.

Concrètement, quatre questions restent aujourd'hui sans réponse :

1. **Décrochage** — combien de joueurs finissent le tutoriel, et à quelle étape
   partent les autres ?
2. **Monétisation** — quel emplacement de pub rapporte, et à quel moment du jeu
   un joueur regarde l'écran de l'IAP ?
3. **Acquisition** — les joueurs installés pendant une campagne restent-ils mieux
   que les autres ?
4. **Équilibrage** — quels niveaux, quels jours de jeu, quelles compétences les
   vrais joueurs atteignent-ils, comparés au simulateur ?

Le 2026-08-20, les premiers revenus réels ont montré un eCPM meilleur que prévu
mais un volume minuscule : les arbitrages marketing à venir se feront sur des
sommes réelles, et les faire à l'aveugle serait cher.

## Ce qui n'est pas dans ce chantier

- **Android.** Le socle Android existe mais n'est pas publié. Le pont Kotlin, la
  configuration Gradle et `google-services.json` feront un chantier séparé, qui
  réutilisera la façade TypeScript à l'identique.
- **L'attribution par canal.** Voir « La limite assumée » ci-dessous.
- **Crashlytics, Remote Config, A/B testing.** Le produit `FirebaseAnalytics` est
  ajouté seul. Le reste du SDK Firebase n'entre pas dans l'app.
- **Tout écran de réglage dédié à la vie privée.** Le consentement passe par le
  formulaire UMP déjà en place.

## La limite assumée

Firebase ne saura **jamais** qu'un joueur vient de TikTok ou de Facebook : ces
réseaux s'auto-attribuent via leurs propres SDK ou via SKAdNetwork. Ce que ce
chantier livre pour l'objectif « acquisition », c'est l'analyse **par cohorte de
date d'installation**, croisée à la main avec les consoles publicitaires : *les
joueurs arrivés pendant la campagne X restent-ils mieux que les autres ?*

C'est utile. Ce n'est pas de l'attribution par canal. Le document l'acte pour
qu'on ne s'attende pas à autre chose.

## Le coût du consentement, lui aussi assumé

La collecte est adossée au formulaire UMP existant : un joueur européen qui
refuse ne produit **aucune** donnée — ni rétention, ni événement métier. En
France, il faut s'attendre à perdre 20 à 40 % de la population dans les rapports.
Tous les chiffres produits sont des chiffres **de consentants**, pas des chiffres
absolus, et doivent être lus comme tels (les taux restent justes, les volumes
sont sous-estimés).

---

## 1. Architecture

Quatre couches, calquées à l'identique sur le chemin AdMob déjà éprouvé.

### 1.1 Le plugin vendoré — `src-tauri/vendor/tauri-plugin-firebase/`

Structure identique à `tauri-plugin-admob` : `Cargo.toml`, `build.rs`,
`src/{lib,mobile,desktop,commands,models,error}.rs`, `permissions/`,
`ios/Package.swift`, `ios/Sources/FirebasePlugin.swift`.

Ce plugin **ne peut pas importer le SDK Firebase** : il est compilé par
`swift build` (swift-rs), qui n'expose pas les modules des xcframeworks binaires
SPM. C'est exactement la contrainte documentée en tête d'`AdmobPlugin.swift`
(tauri#13332). Il rejoint donc le pont au runtime par
`NSClassFromString("BrocFirebaseBridge")`.

Trois commandes seulement :

| Commande | Arguments | Retour |
|---|---|---|
| `initialize` | — | `()` |
| `log_event` | `nom: String`, `params: HashMap<String, JsonValue>` | `()` |
| `set_user_property` | `nom: String`, `valeur: Option<String>` | `()` |

Aucune commande ne rejette pour une raison métier : une panne de mesure ne doit
jamais interrompre une partie. Pont absent → `resolve()` silencieux (contrairement
à AdMob, où l'absence de pont prive le joueur de sa récompense et mérite un
`reject`). Sur desktop, l'implémentation `desktop.rs` est un no-op.

Câblage : dépendance dans `src-tauri/Cargo.toml`, `.plugin(tauri_plugin_firebase::init())`
dans `src-tauri/src/lib.rs`, et `"firebase:default"` ajouté aux permissions de
`src-tauri/capabilities/default.json`.

### 1.2 Le pont — `src-tauri/gen/apple/Sources/app/FirebaseBridge.swift`

Seul fichier autorisé à `import FirebaseCore` / `import FirebaseAnalytics`. Il est
compilé par Xcode, qui résout le paquet SPM.

```
@objc(BrocFirebaseBridge) public class BrocFirebaseBridge: NSObject {
  @objc public static let shared = BrocFirebaseBridge()
  @objc public func demarrer()                                  // FirebaseApp.configure()
  @objc public func appliquerConsentement(_ consenti: Bool)
  @objc public func loguer(_ nom: String, params: [String: Any])
  @objc public func definirPropriete(_ nom: String, valeur: String?)
}
```

`demarrer()` est appelé par la commande `initialize` du plugin, elle-même
déclenchée au boot par `<FirebaseBootstrap/>` côté React — **exactement le chemin
d'`<AdMobBootstrap/>`**. Il est idempotent.

Pourquoi pas depuis `main.mm`, qui s'exécute plus tôt : ce fichier est en
Objective-C++ et devrait passer par l'en-tête Swift généré, alors qu'il porte déjà
un correctif viewport délicat et documenté. Le gain de quelques centaines de
millisecondes ne vaut pas ce risque : `first_open` et `session_start` sont émis
par le SDK **après** `configure()`, donc rien n'est perdu à démarrer au boot de la
WebView.

`FirebaseApp.configure()` n'ouvre aucune connexion réseau tant que la collecte est
désactivée — il est donc sûr de l'appeler avant que le consentement soit connu.

### 1.3 La configuration Xcode — `src-tauri/gen/apple/project.yml`

Trois ajouts :

```yaml
packages:
  Firebase:
    url: https://github.com/firebase/firebase-ios-sdk
    from: 11.0.0

# dans targets.app_iOS.dependencies :
  - package: Firebase
    product: FirebaseAnalytics

# dans targets.app_iOS.info.properties :
  FIREBASE_ANALYTICS_COLLECTION_ENABLED: false
```

Plus le fichier `GoogleService-Info.plist` déposé dans `gen/apple/app_iOS/` (déjà
listé comme source du target). Ce fichier est une configuration client, embarquée
dans l'IPA de toute façon : il est **versionné**, comme l'est déjà
`GADApplicationIdentifier` dans `project.yml`.

Seul le produit `FirebaseAnalytics` est ajouté — pas le paquet Firebase entier.
Impact attendu sur la taille : quelques mégaoctets.

### 1.4 La façade TypeScript — `src/lib/analytics/`

Trois fichiers, calqués sur `src/lib/ads/` :

- `analytics.ts` — l'interface `AnalyticsProvider`, le catalogue des noms
  d'événements (`EVENEMENTS`, `as const`, mêmes conventions que `EMPLACEMENTS_PUB`),
  le `StubAnalyticsProvider` qui **enregistre** les appels dans un tableau
  (c'est lui qui rend les tests possibles), et le singleton `getAnalytics()`.
- `firebaseProvider.ts` — `FirebaseAnalyticsProvider`, import **dynamique** de
  `@tauri-apps/api/core` pour que rien de natif ne soit évalué hors runtime Tauri,
  et `firebaseDisponible()` réutilisant `tauriIosDisponible()` de `src/lib/plateforme.ts`.
- `contexte.ts` — l'injection automatique décrite en §3.

Plus un composant `src/components/mobile/FirebaseBootstrap.tsx`, jumeau
d'`AdMobBootstrap` : monté dans le layout racine, il appelle `initialize` une fois
au boot et ne rend rien.

Le jeu n'appelle **jamais** que cette façade. Hors device (web, simulateur, dev
desktop, vitest), c'est le stub : tout est inerte.

**Toute erreur est avalée.** Un `catch (() => {})` systématique : une panne de
mesure ne casse pas une partie. Même règle que `AdMobBootstrap`.

---

## 2. Le consentement

### 2.1 Le principe

Firebase démarre **collecte désactivée** grâce à
`FIREBASE_ANALYTICS_COLLECTION_ENABLED = false` dans l'Info.plist — c'est le
réglage officiel pour attendre une décision de l'utilisateur. Rien ne part avant
que le joueur ait répondu au formulaire UMP.

### 2.2 Le raccordement au parcours UMP existant

`AdmobBridge.parcoursConsentement` reste **inchangé dans sa logique** : il est
délicat (ordre UMP → ATT, repli hors-ligne) et déjà recetté sur appareil. On y
ajoute une seule ligne, à la toute fin, qui publie le verdict :

```
ConsentementBroc.shared.resoudre(canRequestAds: ConsentInformation.shared.canRequestAds)
```

`ConsentementBroc` est un nouveau fichier minuscule (`gen/apple/Sources/app/`) :
un état `resolu: Bool?` et une liste d'abonnés. `FirebaseBridge` s'y abonne au
démarrage. Ce choix évite de déplacer le code de consentement existant, donc de
rouvrir sa recette.

### 2.3 Ce que fait le pont au verdict

```
Analytics.setUserProperty(consenti ? "true" : "false",
                          forName: AnalyticsUserPropertyAllowAdPersonalizationSignals)
Analytics.setAnalyticsCollectionEnabled(consenti)
```

L'ordre compte : la personnalisation publicitaire doit être posée **avant**
l'activation de la collecte.

**Le verdict est réappliqué à chaque boot**, pas seulement au premier.
`setAnalyticsCollectionEnabled` persiste entre les sessions et surcharge
l'Info.plist : si un joueur révoque son consentement plus tard, la collecte doit
repasser à `false`, ce qui n'arrive que si on rejoue l'application du verdict.

### 2.4 Cas limites

| Situation | Comportement |
|---|---|
| Hors UE — UMP juge le formulaire non requis | `canRequestAds` vrai → collecte activée |
| Joueur européen qui refuse | Collecte désactivée, aucun événement ne part |
| Hors-ligne au premier lancement | UMP échoue, `fin()` est appelé sans verdict fiable → **collecte non activée** (fail-closed). Le prochain lancement réessaiera. |
| Pont Firebase absent (ne devrait pas arriver) | Le plugin résout silencieusement, le jeu ne voit rien |

---

## 3. La taxonomie d'événements

### 3.1 Trois règles

1. **Agrégation au niveau session.** Jamais un événement par objet ni par tap.
   Une session de chine produit *un* événement, pas quinze.
2. **Peu de paramètres.** GA4 gratuit plafonne à 50 dimensions personnalisées
   événementielles.
3. **Rien de nominatif.** Aucun identifiant, aucun texte libre, aucune chaîne
   localisée.

### 3.2 Ce qui vient gratuitement

`first_open`, `session_start`, `user_engagement`, `app_update`, `app_remove`,
l'achat StoreKit (`in_app_purchase`), et — dès que le compte AdMob est lié au
projet Firebase dans la console — `ad_impression` avec le **revenu réel par
joueur**. C'est déjà l'essentiel des objectifs « rétention » et « monétisation ».

### 3.3 `screen_view` doit être manuel

Le suivi d'écran automatique de Firebase s'appuie sur le cycle de vie des
`UIViewController`. Dans une WebView Tauri il n'y en a qu'un : sans intervention,
tous les écrans du jeu seraient confondus en un seul.

On logue donc `screen_view` à la main sur les changements de route, avec un nom
d'écran stable et non localisé : `bureau`, `stockage`, `atelier`, `bibliotheque`,
`collection`, `chiner`, `vitrine-prep`, `vitrine-journee`, `bazar`, `menu`.

**Le suivi automatique n'est pas désactivé par la seule collecte à `false`.**
`FIREBASE_ANALYTICS_COLLECTION_ENABLED` coupe la collecte, mais le suivi d'écran
automatique est un réglage **séparé**, actif par défaut et indépendant : laissé
tel quel, le SDK logue son propre `screen_view` pour l'unique
`UIViewController`, et surtout entretient un `firebase_screen_class` **collant**
qui vient ré-étiqueter *tous les autres événements* du jeu avec le nom de ce
contrôleur, écrasant les écrans que `ecrans.ts` calcule. Il faut donc aussi
poser `FirebaseAutomaticScreenReportingEnabled: false` dans l'Info.plist (voir
Tâche 4 du plan).

### 3.4 Les événements métier

**Décrochage** — la famille la plus précieuse.

| Événement | Paramètres | Déclencheur |
|---|---|---|
| `tuto_etape` | `etape` (identifiant d'étape) | chaque `avancerTutoriel` |
| `tuto_termine` | — | `terminerTutoriel` |
| `mini_tuto_termine` | `lequel` : `vinyle` \| `carnet` \| `atelier`¹ | les trois `terminerMiniTuto*` |

¹ **`atelier` reporté.** `terminerMiniTutoAtelier` vit sur `feat/tuto-corrections`
(non fusionnée) : cette branche n'a rien à appeler. Émis dès que cette branche
est mergée et que la fonction existe.

**Rétention & progression**

| Événement | Paramètres | Déclencheur |
|---|---|---|
| `jour_atteint` | `jour` | `avancerJour`, **uniquement** quand un nouveau record de jour est franchi |
| `niveau_atteint` | `niveau` | montée de niveau du brocanteur |
| `competence_debloquee` | `competence_id` | `debloquerCompetence` réussi |

**Économie**

| Événement | Paramètres | Déclencheur |
|---|---|---|
| `session_chine_terminee` | `objets_achetes`, `depense`, `energie_depensee`² | fin d'une session de chine |
| `session_vente_terminee` | `objets_vendus`, `recette`, `marge` | `enregistrerSession` |
| `amelioration_achetee` | `quoi` : `atelier` \| `stockage` \| `camion`, `niveau` | `ameliorerAtelier` / `ameliorerStockage` / `acheterCamion` |
| `bazar_achat`³ | `article`, `prix_jetons` | `acheterAuBazar` réussi |

² **`energie_depensee` reporté.** Aucun champ de `SessionChinage`
(`src/types/game.ts`) ne porte cette donnée : l'envoyer aurait exigé de la
fabriquer. Émis quand une vraie source existera.

³ **`bazar_achat` reporté.** `acheterAuBazar` vit sur `feat/jetons-bazar`
(non fusionnée) : cette branche n'a rien à appeler. Émis dès que cette branche
est mergée et que la fonction existe.

**Monétisation**

| Événement | Paramètres | Déclencheur |
|---|---|---|
| `energie_epuisee` | — | l'énergie tombe à 0 (le moment qui déclenche pub et IAP) |
| `pub_demandee` | `emplacement` | appel à `showRewardedAd` |
| `pub_terminee` | `emplacement`, `rewarded` | retour de `showRewardedAd` |
| `iap_ecran_vu` | `source` | ouverture de l'écran d'achat énergie infinie |

`pub_demandee` / `pub_terminee` donnent le **taux de complétion dans le contexte
du jeu**, que la console AdMob ne fournit pas.

### 3.5 Le jour de jeu, injecté partout

C'est la dimension qui rend tout le reste lisible. Une **propriété utilisateur**
GA4 ne conserve que sa dernière valeur : un joueur arrivé au jour 80 verrait ses
événements du jour 3 étiquetés « jour 80 », ce qui rend toute analyse de
décrochage fausse. Le jour de jeu doit donc être un **paramètre d'événement**.

`src/lib/analytics/contexte.ts` injecte automatiquement dans **chaque** événement :

- `jour` — la valeur exacte de `jourActuel`, déclarée en **métrique personnalisée**
  (numérique) côté console. Pas de plafond de cardinalité, et on obtient des
  moyennes et des médianes (« jour médian où un joueur regarde sa première pub »).
- `jour_tranche` — `1-7`, `8-14`, `15-30`, `31-60`, `61+`, déclarée en **dimension**.
  Sert à segmenter n'importe quel rapport sans approcher le plafond de 500 valeurs
  distinctes par dimension.
- `niveau` — le niveau de brocanteur, même traitement (métrique numérique).

Le jeu n'a jamais à passer ces paramètres : la façade les lit dans l'état courant.

**Mise en garde — emplacements de sauvegarde multiples.** Une installation
Firebase correspond à **un seul** utilisateur GA4, alors que le jeu propose
trois emplacements de sauvegarde indépendants. Un joueur au jour 80 dans
l'emplacement 1 qui démarre l'emplacement 2 fait repartir `jour` à des valeurs
basses, et tous les événements suivants portent ce jour bas jusqu'à ce que
l'emplacement 2 rattrape ou dépasse le record. Les courbes de rétention et de
décrochage d'un joueur multi-emplacements ne sont donc pas monotones, et rien
dans ce chantier ne le corrige (il faudrait un champ de sauvegarde, que ce
document s'interdit). À garder en tête avant de tirer une conclusion d'un
rapport de rétention.

**Hors partie** (menu, crédits, pages légales), il n'y a pas d'état de jeu à lire —
la sauvegarde reste pourtant chargée en mémoire, piège connu du layout racine. La
façade doit donc s'appuyer sur `estRoutePartie()` et **omettre** `jour`,
`jour_tranche` et `niveau` plutôt que d'envoyer les valeurs périmées d'une partie
qu'on ne joue pas. Un test de garde couvre ce cas.

### 3.6 Propriétés utilisateur

Pour découper la population, pas pour dater les événements :
`tuto_termine` (booléen), `acheteur_iap` (booléen), `langue`, `niveau_tranche`.

---

## 4. Tests

### 4.1 Ce qui est testable — la façade TS, en vitest

`StubAnalyticsProvider` enregistre `{ nom, params }` à chaque appel. Les tests
vérifient :

- un test par famille d'événements : nom exact et paramètres attendus, déclenchés
  par l'action de jeu réelle (pas par un appel direct à la façade) ;
- **test de garde** : `jour`, `jour_tranche` et `niveau` sont présents sur *tout*
  événement émis, quel qu'il soit ;
- **test de garde** : hors runtime Tauri, `getAnalytics()` rend le stub et aucun
  `invoke` n'est tenté ;
- les bornes de `jour_tranche` (7/8, 14/15, 30/31, 60/61) ;
- `jour_atteint` n'est émis **que** sur un nouveau record, pas à chaque
  `avancerJour`.

Rappel de méthode : `vitest` doit tourner avec `--maxWorkers=4` sur ce Mac, sans
quoi une quarantaine de faux échecs apparaissent par famine de workers.

### 4.2 Ce qui n'est pas testable — le pont natif

Le code Swift n'a pas de test unitaire. Sa preuve est la recette sur appareil.

---

## 5. Recette sur appareil

Firebase fournit **DebugView** : lancé avec l'argument `-FIRDebugEnabled` (ajouté
au schéma Xcode, jamais à la build de production), l'appareil pousse ses
événements en direct dans la console, à la seconde. C'est ce qui rend la recette
faisable en une session au lieu d'attendre 24 h.

Points de recette :

1. **Refus UMP → zéro événement.** Le point critique. Réinstaller, refuser le
   formulaire, vérifier que DebugView reste vide.
2. **Acceptation → `first_open` visible** dans DebugView.
3. **Révocation.** Refuser après avoir accepté, relancer, vérifier que la collecte
   s'arrête (le verdict est bien réappliqué au boot).
4. **Entonnoir du tutoriel** : dérouler les premières étapes, voir `tuto_etape`
   s'enchaîner avec les bons identifiants.
5. **Une pub** : `pub_demandee` puis `pub_terminee` avec le bon `emplacement`.
6. **Le jour** : vérifier que `jour` et `jour_tranche` sont corrects sur chaque
   événement, sur une partie avancée.
7. **`screen_view`** : naviguer entre les pièces, vérifier les noms d'écran.
8. **Aucune régression AdMob** : la pub récompensée fonctionne toujours, l'ordre
   UMP → ATT est intact.
9. **Aucun `screen_view` automatique concurrent** : dans DebugView, vérifier
   qu'il n'y a pas un second flux de `screen_view` (celui du suivi automatique
   Firebase) et que `firebase_screen_class` sur les autres événements ne
   s'est pas figé sur le nom du contrôleur natif — confirme que
   `FirebaseAutomaticScreenReportingEnabled: false` est bien posé.

---

## 6. Juridique — bloquant avant soumission

1. **`src/app/privacy/page.tsx`** — une section « mesure d'audience » dans les
   **quatre langues** (FR, EN, ES, EL) : ce qui est collecté (événements de jeu,
   identifiant d'installation, modèle d'appareil, pays), par qui (Google via
   Firebase Analytics), pourquoi, et le fait que la collecte est conditionnée au
   consentement donné au premier lancement.
2. **App Store Connect** — mise à jour des étiquettes de confidentialité :
   « Données d'utilisation → Analyses » et « Identifiants ». Sans cette mise à
   jour, le rejet Apple est probable.

---

## 7. Les actions manuelles en console

Elles ne peuvent pas être faites depuis le code, et **deux d'entre elles ne sont
pas rétroactives** — donc à faire **avant** la première build instrumentée, sous
peine de perdre définitivement les données de la période.

| Action | Rétroactif ? |
|---|---|
| Créer le projet Firebase, ajouter l'app iOS `com.guigousse.broc` | — |
| Télécharger `GoogleService-Info.plist` | — |
| Lier le compte AdMob au projet Firebase (revenu par joueur) | — |
| **Activer l'export BigQuery** | **Non** |
| **Passer la conservation des données de 2 à 14 mois** | **Non** |
| Déclarer `jour` et `niveau` en métriques, `jour_tranche` en dimension | Non (mais rattrapable par BigQuery) |

---

## 8. Découpage en chantiers

Chacun est livrable et prouvable indépendamment.

| | Chantier | Preuve d'achèvement |
|---|---|---|
| ① | **Socle natif** — plugin vendoré, `FirebaseBridge`, `ConsentementBroc`, `project.yml`, consentement | DebugView voit `first_open` après acceptation, et rien après refus |
| ② | **Façade TS** — providers, catalogue d'événements, injection `jour`/`niveau`, `screen_view` | Tests vitest verts, y compris les tests de garde |
| ③ | **Instrumentation métier** — les quatre familles du §3.4 | Un test par famille |
| ④ | **Console & juridique** — §6 et §7 | Étiquettes App Store à jour, privacy en 4 langues |
| ⑤ | **Recette appareil + PR** | Les 8 points du §5 |

L'ordre est contraint : ② dépend de ①, ③ dépend de ②, ⑤ dépend de tout. ④ peut
être mené en parallèle de ②-③, mais les deux réglages non rétroactifs du §7
doivent être faits **avant** la première build de ⑤.

## Pas de changement de sauvegarde

Aucun champ n'est ajouté à `EtatJeu` et `SAVE_VERSION` reste inchangé : la mesure
lit l'état existant, elle n'en stocke rien. Le seul état retenu est le record de
jour déjà porté par `jourActuel`.

## Risques connus

- **Espace disque.** Une build iOS complète est gourmande, et le disque a déjà été
  l'adversaire sur le socle Android. Vérifier l'espace libre avant ①.
- **Le paquet SPM Firebase est volumineux** à la première résolution. Elle est
  lente, une seule fois.
- **`project.yml` est regénéré** par `tauri ios init`. Ne jamais relancer cette
  commande sans reporter les ajouts Firebase, exactement comme pour
  `GADApplicationIdentifier` et les `SKAdNetworkItems` aujourd'hui.
