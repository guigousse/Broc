# Sauvegarde durable et observable — conception

**Date :** 2026-08-23
**Périmètre :** persistance sur fichier + alerte d'échec + avertissement disque +
export. iOS d'abord, Android dégradé proprement (voir « Ce qui n'est pas dans ce
chantier »).

## Pourquoi

Le 2026-08-23, une session d'environ une heure a été perdue sur un iPhone dont le
stockage était quasi plein. Le jeu est revenu sur un **état plus ancien** : le
magasin WebKit n'avait pas été purgé, il avait cessé d'accepter des écritures
durables en cours de route.

L'enquête a établi trois choses.

**La piste du quota localStorage est écartée par la mesure.** Une sauvegarde réelle
de jour 34 pèse 87 Ko, dont 81 Ko pour la seule `collection` (93 %). Le catalogue
comptant 364 templates, la collection est **bornée** à ~100 Ko. Le pire cas de
l'application — 3 slots × (principal + backup) — plafonne à ~660 Ko, soit un
facteur 8 sous le quota WebKit d'au moins 5 Mo. Le quota n'a pas pu être atteint.

**Le mode de panne restant est invisible au JavaScript.** Dans WKWebView,
`localStorage` est synchrone côté JS mais sa persistance sur disque est
asynchrone et déportée dans le processus de stockage WebKit. Disque plein →
l'écriture disque échoue, la valeur reste en mémoire, `setItem` ne lève rien, et
les relectures renvoient la bonne valeur. Le jeu paraît sauvegarder. Une
relecture de contrôle ne prouverait rien : elle serait servie par la copie
mémoire.

**Le garde-fou existant ne pouvait pas alerter.** `TOAST_DUREE_MS = 2500`
(`src/components/ui/Toast.tsx:31`) et la garde `saveEnEchecRef`
(`src/context/GameContext.tsx:367`) ne déclenchent le toast qu'à la bascule
succès→échec. Sur une heure de sauvegardes en échec, le jeu émet **un seul
avertissement de 2,5 secondes**. Que `setItem` ait levé une exception au début ou
jamais, le résultat observé est le même.

Racine du problème : **le seul stockage durable du jeu est celui de WebKit, dont
l'application ne peut pas observer la durabilité.**

## Ce qui n'est pas dans ce chantier

- **La compression de la sauvegarde.** La `collection` duplique `nom`,
  `categorie` et `rarete`, tous retrouvables depuis `templateId`. La compacter
  ferait tomber la save de 87 Ko à ~30 Ko, mais elle impose une migration
  `SAVE_VERSION` indépendante et à risque, et **elle n'aurait pas empêché cet
  incident** (660 Ko contre ≥ 5 Mo de quota). Chantier séparé.
- **La sauvegarde cloud.** Étudiée puis écartée pour maintenant : elle résout la
  perte d'appareil, pas ce bug. Voir « Bénéfice collatéral » plus bas — ce
  chantier en couvre gratuitement le cas d'usage principal.
- **L'import de sauvegarde.** L'export permet d'archiver, pas de restaurer
  soi-même ; une restauration passe par le développeur. Un import écrase une
  partie existante : opération destructive qui mérite sa propre conception.
- **Le natif Android** pour l'espace disque et le partage. Lecture et écriture,
  elles, fonctionnent sur Android dès ce chantier (Rust pur).

## Décisions prises

| Sujet | Décision |
|---|---|
| Source de vérité | Le fichier ; localStorage devient un miroir, **jamais supprimé** |
| Seuil d'avertissement disque | 50 Mo, constante nommée |
| Escalade de l'alerte | Bandeau persistant + modale, **sans blocage de la progression** |
| Déclencheur d'escalade | Le temps passé en échec, pas le nombre d'échecs |

Le seuil disque a été discuté à 200, 50 puis 5 Mo. Retenu : **50 Mo**. Trop haut,
l'avertissement se déclenche chez une grande part des joueurs alors que tout va
bien et on apprend à le balayer — ce qui décrédibiliserait du même coup l'alerte
d'échec réel. Trop bas (5 Mo), il arrive en même temps que l'échec et ne prévient
plus rien.

## Architecture

### Disposition sur disque

Répertoire : `app_data_dir()` de Tauri, soit `Library/Application Support/` du
conteneur iOS. Ce n'est **pas** `Caches`, donc iOS ne le purge pas sous pression
de stockage.

```
slots.json     ← index : slot actif + métas (nom, dernière session, révision)
slot-1.json    ← une partie
slot-2.json
slot-3.json
```

Un fichier par emplacement : le `rename` atomique ne touche qu'un slot, on
n'écrit que les ~87 Ko du slot modifié, et un fichier corrompu ne peut pas
emporter les autres parties.

**L'index passe aussi sur disque.** Si `projet-broc:slots:v1` devient illisible,
`chargerIndex()` retombe sur « slot 1 actif » — le commentaire de
`src/lib/storage/slots.ts:170` le signale déjà : « un joueur dont la partie vit
dans le slot 2/3 verrait sa partie disparaître ». Cette clé est la carte qui mène
aux saves ; la laisser dans le magasin non fiable reviendrait à blinder la porte
en laissant la clé sous le paillasson.

### Écriture atomique

Pour un slot donné :

1. écrire dans `slot-N.json.tmp`
2. `sync_all()` — force le contenu sur le disque, **c'est ici que `ENOSPC`
   remonte**
3. `rename()` sur `slot-N.json` — atomique sur POSIX, même système de fichiers
4. `fsync` du répertoire, pour que le renommage survive à un kill

À aucun instant il n'existe de `slot-N.json` à moitié écrit. C'est ce qui rend le
double-buffer principal/backup du localStorage obsolète. Un kill pendant l'étape
1 ou 2 laisse un `.tmp` orphelin, ignoré à la lecture et écrasé à l'écriture
suivante.

**L'ordre slot puis index est conservé** (`toucherDerniereSession`). Une save sans
entrée d'index est récupérable — `premierSlotLibre()` et `renommerSlot()` savent
déjà traiter les clés orphelines — alors qu'une entrée d'index sans save serait un
emplacement fantôme.

### Volume d'écriture

Identique à aujourd'hui, pas moindre : 2 × 87 Ko hier (principal + backup
localStorage), 87 Ko de fichier + 87 Ko de miroir demain, **à condition de
supprimer le double-buffer localStorage**. À volume égal, l'exemplaire qui fait
autorité devient atomique par construction. Les clés `:backup` orphelines sont effacées **une fois, à la
migration réussie**, récupérant ~260 Ko.

### Le plugin natif

`src-tauri/vendor/tauri-plugin-stockage`, calqué sur `tauri-plugin-firebase`
(`Cargo.toml`, `build.rs`, `src/{lib,commands,desktop,mobile,models,error}.rs`,
`ios/Sources/`, `permissions/`), enregistré dans `src-tauri/src/lib.rs` à la suite
des cinq autres. Commandes nommées en français, comme `tauri-plugin-iap`.

| Commande | Implémentation | iOS | Android | Bureau |
|---|---|---|---|---|
| `lire_save(quoi)` | Rust `std::fs` | oui | oui | oui |
| `ecrire_save(quoi, contenu)` | Rust, atomique | oui | oui | oui |
| `espace_libre()` | Swift | oui | `None` | `None` |
| `partager_fichier(quoi)` | Swift | oui | erreur | erreur |

Lecture et écriture restent en **Rust pur** : `std::fs` fonctionne à l'identique
sur iOS et Android, donc le cœur du correctif n'attend aucun code natif par
plateforme.

`espace_libre` exige Swift parce qu'un `statvfs` via libc **sous-estime** l'espace
disponible : il ignore la place purgeable qu'iOS rendra au besoin. Apple impose
`volumeAvailableCapacityForImportantUsageKey`. Sans ce pont, le seuil de 50 Mo se
déclencherait à tort — précisément le bruit qu'on cherche à éviter.

**`quoi` est un énuméré (`Index`, `Slot1`, `Slot2`, `Slot3`), pas un chemin.** Une
commande Tauri est appelable depuis n'importe quel JS de la webview ; une chaîne
libre ouvrirait une traversée de répertoire sur le conteneur. Le chemin est
construit côté Rust.

**Le modèle d'erreur dévie de celui d'`iap`**, qui sérialise en simple chaîne. La
couche TS doit brancher sur la cause, et matcher un message texte serait fragile
en quatre langues :

```
{ genre: "disque_plein" | "io" | "indisponible", message: string }
```

`disque_plein` est décidé côté Rust par `raw_os_error() == Some(28)` (`ENOSPC`),
plutôt que `io::ErrorKind::StorageFull` qui n'est pas stabilisé.

**Dégradation Android explicite** : `espace_libre` renvoie `None` (pas de chiffre
faux) et `partager_fichier` renvoie `indisponible` (bouton masqué). Les deux
s'allumeront avec le Kotlin, sans toucher au TS.

### Le repository composite

`src/lib/storage/fichierGameRepository.ts`, choisi par `createGameRepository()`
quand Tauri est présent — la détection existe à `src/lib/plateforme.ts:9`. Hors
Tauri (`next dev`), délégation totale à `localGameRepository`, qui reste inchangé.

Le contrat change, `boolean` ne suffit plus :

```ts
type ResultatSave =
  | { ok: true }
  | { ok: false; genre: "disque_plein" | "io" | "indisponible" }
```

Deux sites d'appel (`GameContext.tsx:366` et `:1442`), trois implémentations à
suivre (`local`, `memory`, la nouvelle).

**`save()`** : le fichier du slot d'abord — écriture atomique, **il rend le
verdict** —, puis le fichier d'index, puis le miroir localStorage en best-effort
dont le résultat est ignoré.

**`load()`** : lit `slots.json`. Absent → migration. Présent → lit le slot actif ;
fichier corrompu → retombée sur le miroir avec un `console.warn`, comme le fait
déjà `localGameRepository.ts:39`.

### Arbitrage par révision

Seule machinerie ajoutée au-delà du minimum, et elle traite le scénario exact de
l'incident : disque plein, l'écriture fichier échoue, l'écriture localStorage
« réussit » puisqu'elle ne touche que la mémoire, app tuée, relance. Le fichier
porte l'état ancien, le miroir peut porter un état plus récent. « Le fichier gagne
toujours » jetterait ce plus récent ; « le miroir gagne » ramènerait au magasin
non fiable.

Chaque sauvegarde incrémente un compteur, écrit dans les **deux** index. Au
chargement, on retient le magasin dont la révision est la plus haute pour ce
slot.

Concrètement, `MetaSlot` (`slots.ts:16`) gagne un champ `revision: number`.
`estMetaSlotValide()` le tolère absent — c'est le cas de toutes les données
existantes — et une révision manquante vaut 0, ce qui fait perdre l'arbitrage
au magasin qui ne l'a pas encore. Au tout premier chargement après migration,
les deux index portent la même révision : l'égalité tranche en faveur du
fichier.

### Migration des joueurs actuels

Déclenchée par la seule absence de `slots.json`, dans le style paranoïaque de
`tenterMigrationLegacy()` (`slots.ts:104`) :

1. lire l'index et les slots via les fonctions actuelles — `chargerIndex()` gère
   déjà au passage la très ancienne clé unique, inutile de dupliquer
2. écrire les fichiers
3. **relire par `lire_save` et comparer** — cette relecture prouve quelque chose,
   contrairement à une relecture localStorage servie par la copie mémoire

Le moindre échec est un **no-op total** : rien n'est détruit, le jeu continue sur
localStorage, on retente au prochain lancement. Un joueur ne peut pas perdre sa
partie parce que la migration s'est mal passée.

**Le miroir n'est jamais supprimé.** Il coûte ~260 Ko au pire et c'est le
parachute.

## L'alerte qui escalade

Accrochée au **temps passé en échec**, pas au nombre d'échecs : avec le debounce
de 400 ms, trois sauvegardes ratées tiennent en deux secondes et un compteur
escaladerait sur du bruit.

| Moment | Ce qui se passe |
|---|---|
| 1er échec | Le bandeau apparaît et **ne s'efface pas** |
| 2 min d'échec continu | Modale : « Ta progression n'est plus sauvegardée depuis 2 minutes » |
| puis toutes les 5 min | La modale revient |
| 1er succès retrouvé | Bandeau retiré + toast « Sauvegarde rétablie » (clé existante) |

Pire cas : **deux minutes** de jeu à risque avant un avertissement impossible à
manquer, contre une heure aujourd'hui. Le message varie selon le `genre` :
`disque_plein` invite à libérer de l'espace, `io` reste générique.

**Deux contraintes de placement.** `TutorielBanniere` est en `position: fixed`,
ancrée `top: calc(var(--safe-top) + var(--mobile-header-h) + …)`, `zIndex: 90`
(`TutorielBanniere.tsx:21-27`) : deux bannières fixes au même endroit se
superposeraient, à empiler ou à prioriser. Et le bandeau doit être gaté sur
`estRoutePartie()` comme tout composant du layout racine, sinon il s'afficherait
au menu où aucune partie n'est chargée.

Nouvelles clés i18n dans `src/lib/i18n/ui/{fr,en,es,el}.ts`.

## Avertissement disque

Un appel à `espace_libre()` après hydratation, une fois par lancement. Sous
`SEUIL_ESPACE_LIBRE_OCTETS = 50 * 1024 * 1024`, une modale. `None` ne déclenche
rien.

## Export

Une icône de partage par ligne dans `PartiesModal.tsx`, à côté du crayon et de la
poubelle, appelant `partager_fichier(SlotN)` — la feuille de partage iOS.
Masquée quand la commande répond `indisponible`.

Le fichier partagé est le `slot-N.json` tel quel, copié sous un nom lisible
porteur du jour de jeu (`broc-partie-jour-34.json`) pour que le joueur
distingue deux archives. Le nom se construit depuis `resumeSlot()`, qui lit
déjà `jourActuel` de façon défensive.

## Bénéfice collatéral

`Library/Application Support/` est **inclus dans la sauvegarde iPhone**. Dès ce
chantier, une partie traverse donc un changement de téléphone via la restauration
iOS : sans iCloud, sans compte, sans backend. Ce n'est pas la sauvegarde cloud
étudiée, mais ça en couvre le cas d'usage principal pour zéro effort
supplémentaire.

Conséquence tranchée en tâche 11 (2026-08-23) : `site/privacy.html` affirmait
« le contenu de votre sauvegarde ne quitte jamais votre appareil ». Cette
phrase reste vraie (la sauvegarde iPhone est un mécanisme système, pas un
envoi par le jeu) — mais rester vraie ne suffisait pas à rester complète, et
le style du reste de la page (qui détaille déjà, par exemple, l'appel réseau
à `timeapi.io`) est celui de la transparence maximale, pas du minimum légal.
**Décision : compléter la phrase dans les quatre langues** plutôt que la
laisser telle quelle avec une justification écrite. Une phrase a été ajoutée
juste après, dans `src/app/privacy/page.tsx` (section 1, les quatre blocs
FR/EN/ES/EL), précisant que ce stockage local est inclus dans la sauvegarde
système de l'appareil (iCloud ou ordinateur) et que c'est un mécanisme
d'Apple, pas un envoi par le jeu. `site/privacy.html` a été régénéré depuis
ce build (`python3 scripts/site/gen-pages-legales.py`, après `npm run
build`) — c'est le seul chemin qui produit ce fichier, il n'est jamais édité
à la main.

## Tests

Unitaires (`vitest --maxWorkers=4` — sans ce drapeau ce Mac produit ~41 faux
échecs par famine de workers) :

- migration au cas passant
- migration en échec → **no-op total**, rien de détruit
- arbitrage par révision, dans les deux sens
- fichier corrompu → retombée sur le miroir
- `ENOSPC` → `{ ok: false, genre: "disque_plein" }`
- machine à états de l'escalade, avec faux temps

**Piège à ne pas retomber dedans :** espionner le localStorage impose
`vi.spyOn(Storage.prototype, …)`. Réassigner `window.localStorage.setItem` ne
remplace rien — le proxy `Storage` en fait une entrée stockée — et donne un test
creux qui reste vert.

Côté Rust : écriture atomique, et construction de chemin par énuméré (pas de
traversée).

## Recette, et sa limite

### Ce qui a été vérifié automatiquement (tâche 11, 2026-08-23)

| Vérification | Commande | Résultat |
|---|---|---|
| Suite complète | `npx vitest run --maxWorkers=4` | **257 fichiers, 2551 tests passés, 2 skip, 0 échec** (baseline du chantier : 2551/2/0 — identique, ce qui est attendu puisque cette tâche n'ajoute aucun test) |
| Lint | `npx eslint src` | propre, aucune sortie |
| Build web | `npm run build` | succès (71 pages), seuls avertissements `metadataBase` préexistants et sans rapport |
| Compilation Rust hôte | `cd src-tauri && cargo check` | succès, 0 avertissement |

Ces quatre commandes ont été exécutées par l'agent de la tâche 11, dans ce
worktree, le 2026-08-23. Elles ne demandent ni simulateur ni appareil et sont
rejouables à l'identique par quiconque avant de fusionner.

**Ce que ces quatre commandes ne couvrent PAS**, et qui reste à la charge de
Guillaume : tout ce qui suit dans cette section, plus le Swift (voir plus bas).

### Recette au simulateur — quatre points, chacun avec sa preuve

Aucun des quatre points suivants n'a pu être exécuté par un agent : ils
demandent de lancer l'app dans le simulateur iOS, ce qu'aucun agent de ce
chantier n'a pu faire. Chaque point ci-dessous dit précisément quoi poser,
quoi regarder, et quel résultat prouve que ça marche.

**1. La migration d'un joueur existant vers les fichiers.**

La migration se déclenche uniquement quand `slots.json` est absent de
`app_data_dir()` (`Library/Application Support/` du conteneur iOS,
identifiant `com.guigousse.broc`) — c'est-à-dire au premier lancement de ce
build chez un joueur qui n'avait jusque-là que le miroir `localStorage`
(`src/lib/storage/migrationFichiers.ts`, `fichierGameRepository.ts:210`).

- Pour la provoquer sur le simulateur : installer une version du jeu
  antérieure à ce chantier — `git checkout ff253008` (point de départ de la
  branche, `git merge-base` avec `main`) est le dernier commit qui n'a aucun
  fichier de ce chantier — y jouer quelques minutes pour créer une sauvegarde
  dans
  `localStorage` (n'importe quelle progression suffit), puis installer
  PAR-DESSUS, sur le même simulateur, le build de cette branche — comme le
  ferait une mise à jour App Store réelle. `public/dev-save-bazar.html`,
  mentionné dans le plan d'origine de cette tâche, **n'existe pas dans ce
  worktree** (probablement une confusion avec un autre chantier) ; ce n'est
  de toute façon pas l'outil adapté ici, puisqu'une page HTML chargée dans
  Safari écrit dans le `localStorage` de Safari, pas dans celui, isolé, de la
  webview Tauri de l'app installée.
- **Important : le code n'écrit AUCUNE ligne dans la console à la migration
  réussie** — seuls les chemins d'échec ou de repli le font
  (`console.warn` dans `fichierGameRepository.ts:170` et `:191`). Une
  migration silencieuse est donc le comportement NORMAL, pas un signe
  d'échec. La preuve qui compte est le fichier lui-même, pas les journaux :
  après ce premier lancement, inspecter le conteneur du simulateur —
  `xcrun simctl get_app_container <udid> com.guigousse.broc data` donne le
  chemin, `slots.json` doit s'y trouver sous `Library/Application Support/`,
  aux côtés d'un ou plusieurs `slot-N.json`.
- Relancer l'app une seconde fois (sans rien effacer) : `slots.json` étant
  désormais présent, `lireEtatIndexFichier()` rend `"ok"` directement et
  `migrerVersFichiers()` n'est jamais rappelée
  (`fichierGameRepository.ts:210` ne s'exécute que sur `etat.genre ===
  "absent"`). Preuve : l'horodatage de `slots.json` dans le conteneur ne
  bouge pas entre la fin du premier lancement et la fin du second (une
  écriture de sauvegarde normale, elle, touche `slot-N.json` mais pas
  nécessairement `slots.json` — vérifier l'un ET l'autre si le doute
  persiste).

**2. La chaîne d'alerte d'échec de sauvegarde — sans toucher au disque.**

Un interrupteur de debug existe pour ça (`src/lib/storage/pontNatif.ts:51-60`) :
poser `localStorage["broc.debug.echec-save"] = "1"` (Safari Web Inspector, à
distance, sur la webview de l'app dans le simulateur) fait échouer tout appel
à `ecrireSave` comme le ferait un disque plein (`genre: "disque_plein"`),
sans jamais toucher au disque réel. La clé n'est posée par aucun code du
jeu — sans danger en production.

Séquence à observer, dans l'ordre, une fois la clé posée en jouant :
1. **Immédiat** : le bandeau apparaît et reste affiché — texte exact
   « Sauvegarde impossible — ta progression n'est pas enregistrée. »
   (`BandeauSauvegarde.tsx`, clé i18n `sauvegardeBandeau`).
2. **À 2 minutes d'échec continu** (`DELAI_MODALE_MS = 120_000`,
   `BandeauSauvegarde.tsx:21`) : une modale apparaît, titre « Ta progression
   n'est pas sauvegardée », variante de texte selon le genre (`disque_plein`
   invite à libérer de l'espace).
3. **La modale revient toutes les 5 minutes** tant que l'échec continue.
4. Retirer la clé (`localStorage.removeItem("broc.debug.echec-save")`), puis
   déclencher une sauvegarde (toute action qui en provoque une) : le bandeau
   disparaît et un toast « Sauvegarde rétablie. » s'affiche (clé i18n
   `sauvegardeRetablie`).

**3. L'avertissement disque.**

`SEUIL_ESPACE_LIBRE_OCTETS`, exporté par
`src/components/mobile/AvertissementEspace.tsx:50`, vaut `50 * 1024 * 1024`
(50 Mo). Pour recetter sans avoir à vider réellement le simulateur : monter
temporairement cette constante à une valeur énorme (par ex.
`Number.MAX_SAFE_INTEGER`), reconstruire, relancer l'app — la modale
« Le stockage de ton téléphone est presque plein » doit apparaître au
lancement (elle ne se déclenche qu'une fois par lancement, sur l'espace
libre réel du simulateur, qui est presque toujours confortable ; monter le
seuil au-dessus de cet espace réel est ce qui force le déclenchement).
**Remettre la constante à `50 * 1024 * 1024` avant de committer quoi que ce
soit** — c'est un changement de recette, jamais un changement livré.

**4. L'ordre d'empilement de la feuille de consentement UMP/ATT contre la
modale `AvertissementEspace`.**

Au tout premier lancement, deux choses peuvent apparaître à l'écran en même
temps : la feuille système UMP/ATT (déclenchée par `AdMobBootstrap` — une
feuille SYSTÈME, hors DOM, hors `z-index` web) et la modale de l'avertissement
disque (point 3 ci-dessus), qui elle est en DOM, `z-index: 120`
(`AvertissementEspace.tsx`, commentaire de tête, lignes 28-39). Aucun test
automatisé ni aucune inspection de code ne peut trancher cet ordre — c'est
une collision entre le rendu web et une présentation UIKit native. **Ce que
la recette doit vérifier n'est PAS « laquelle passe devant » (les deux
issues sont acceptables) mais qu'aucune des deux ne devient
INATTEIGNABLE** : si la feuille UMP/ATT s'affiche derrière la modale, elle
doit rester joignable une fois la modale fermée (« J'ai compris ») ; si la
modale s'affiche derrière la feuille système, elle doit rester joignable une
fois la feuille système traitée (accepter/refuser). Le point d'échec à
chercher : un écran bloqué où aucun des deux boutons ne répond au tap.

### Une course non recettable en simulateur, à garder en tête

**L'export (`partagerFichier`, `StockagePlugin.swift:46-106`) résout la
promesse Tauri (`invoke.resolve()`, ligne 104) dès que
`racine.present(feuille, animated: true)` a été APPELÉ (ligne 103), pas une
fois que la feuille de partage a fini de s'afficher** — `present(animated:)`
est asynchrone côté UIKit, et rien dans ce code n'attend sa fin avant de
résoudre. De plus, aucune garde n'empêche un second appel à
`partagerFichier` de se déclencher pendant que la présentation est encore en
cours (pas de flag « présentation en cours », pas de désactivation du
bouton côté `PartiesModal.tsx` pendant l'appel). Un double-tap rapide sur
l'icône de partage pourrait donc déclencher une seconde présentation avant
que la première n'ait fini d'apparaître — UIKit refuserait probablement la
seconde présentation silencieusement (ou lèverait une exception visible en
device uniquement), alors que le code JS aurait déjà vu deux résolutions
« succès ». Ce n'est **pas corrigé dans ce chantier** (identifié en revue de
la tâche 10, laissé explicitement de côté) : à surveiller en recette device
en tapant deux fois vite sur le bouton d'export, et à traiter dans un
chantier séparé si reproduit.

### Ce que le Swift peut et ne peut pas revendiquer

Le plugin `tauri-plugin-stockage` a été vérifié à la **compilation**
seulement, jamais à l'**exécution** :
- `cargo check --target aarch64-apple-ios` (dans
  `src-tauri/vendor/tauri-plugin-stockage`) force la compilation de
  `mobile.rs`, invisible à un `cargo check` hôte ordinaire (`#[cfg(target_os
  = "ios")]`) — propre.
- `swift build --sdk $(xcrun --sdk iphonesimulator --show-sdk-path) --triple
  arm64-apple-ios13.0-simulator` (dans `ios/`) compile `StockagePlugin.swift`
  contre les vrais paquets `Tauri`/`SwiftRs` — propre.

Aucun de ces deux n'exerce le code au runtime. Restent NON vérifiés,
uniquement recettables au simulateur ou sur device :
- que `manager.viewController` (ligne 77) rende bien un contrôleur racine
  utilisable au moment où `partagerFichier` est appelé, et pas seulement à
  un autre instant du cycle de vie ;
- la géométrie du popover sur iPad (`UIUtils.centerPopover`, ligne 92) —
  jamais affichée, seulement lue ;
- que la copie sandboxée du fichier (`FileManager.default.copyItem`, ligne
  71) se comporte comme prévu dans le vrai bac à sable de l'app, pas
  seulement en lecture de code ;
- que `resourceValues(forKeys:
  [.volumeAvailableCapacityForImportantUsageKey])` (espace disque) ne lève
  pas sur simulateur — Apple ne documente que le comportement sur device réel.

### Le vrai chemin `ENOSPC` — non reproduit, et pourquoi

**Le vrai chemin `ENOSPC` reste non prouvé en recette.** Le reproduire
demande de remplir réellement le stockage d'un iPhone jusqu'à l'épuiser, ce
qu'aucun des points ci-dessus ne fait (le point 2 simule l'échec en
JavaScript, avant même l'appel Rust — il ne prouve pas que `sync_all()`
remonte bien `ENOSPC` sur un vrai disque plein, seulement que la couche TS
réagit correctement à un `{genre: "disque_plein"}`). La recette device sur
ce Mac passe obligatoirement par TestFlight (iPhone en iOS 26.2 contre Xcode
16.2, qui plafonne le simulateur local) — remplir un iPhone de test jusqu'à
`ENOSPC` via TestFlight est possible mais lourd (il faut le temps, un
appareil dédié, et le risque de devoir le vider ensuite). C'est la
principale incertitude résiduelle du chantier, assumée consciemment plutôt
que non détectée.

## Risques

| Risque | Traitement |
|---|---|
| La migration casse chez un joueur | No-op total, miroir jamais supprimé, retente au lancement suivant |
| Le miroir plus frais que le fichier | Arbitrage par révision |
| Traversée de répertoire depuis la webview | `quoi` est un énuméré, chemin construit en Rust |
| Faux avertissement disque | API Apple de place purgeable, pas `statvfs` |
| Deux bannières superposées | Empilement ou priorité, à traiter à l'implémentation |
| `ENOSPC` non recettable | Interrupteur de debug ; incertitude assumée |
