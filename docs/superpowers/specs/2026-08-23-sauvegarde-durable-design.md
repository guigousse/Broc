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

Conséquence à vérifier avant livraison : `site/privacy.html` affirme aujourd'hui
« le contenu de votre sauvegarde ne quitte jamais votre appareil ». La phrase
reste vraie (la sauvegarde iPhone est un mécanisme système, pas un envoi par le
jeu), mais la section « stockage local du système » gagnerait à mentionner le
fichier. À trancher à la relecture, en quatre langues.

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

L'avertissement disque et l'export se recettent au simulateur en abaissant
temporairement la constante. Un interrupteur de debug forçant `ecrire_save` à
échouer permettra de recetter toute la chaîne d'alerte sans toucher au disque.

**Le vrai chemin `ENOSPC` restera non prouvé en recette** : le reproduire demande
de remplir réellement un iPhone, et la recette device passe obligatoirement par
TestFlight sur ce Mac (iPhone iOS 26.2 contre Xcode 16.2). C'est la principale
incertitude résiduelle du chantier, assumée.

## Risques

| Risque | Traitement |
|---|---|
| La migration casse chez un joueur | No-op total, miroir jamais supprimé, retente au lancement suivant |
| Le miroir plus frais que le fichier | Arbitrage par révision |
| Traversée de répertoire depuis la webview | `quoi` est un énuméré, chemin construit en Rust |
| Faux avertissement disque | API Apple de place purgeable, pas `statvfs` |
| Deux bannières superposées | Empilement ou priorité, à traiter à l'implémentation |
| `ENOSPC` non recettable | Interrupteur de debug ; incertitude assumée |
