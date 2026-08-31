# Classeur de cartes & album de timbres — design

Date : 2026-08-30 · Branche : `feat/classeur-album` (depuis `feat/quetes-quotidiennes-variees`)

## 1. Intention

Deux collections à part, achetées au Bazar, qui donnent au joueur une raison de
retourner chiner une fois le registre principal bien avancé : **50 cartes** à
ranger dans un classeur et **50 timbres** à poser librement dans un album.
Les pièces se trouvent en brocante (une par session au plus) et en paquets au
Bazar. Compléter ne rapporte rien d'autre que la collection elle-même ; les
doublons se recyclent en pièces de réparation.

Ce chantier livre **la mécanique avec des visuels provisoires**. L'art (50
cartes « toonifiées » depuis les objets du jeu, 50 timbres à thème) est un
chantier séparé qui remplacera des fichiers sans toucher au code.

## 2. Décisions prises (avec Guillaume, 2026-08-30)

| Sujet | Décision |
|---|---|
| Modèle | Catalogue à part (`PieceCollection`), enveloppé en `Objet` au tirage de chine (approche A). Les pièces ne sont jamais dans `OBJET_TEMPLATES`. |
| Bazar | Classeur 10 Ƶ, Album 10 Ƶ ; après achat, au même endroit : Paquet de 3 cartes 5 Ƶ / Pochette de 3 timbres 5 Ƶ (stock illimité). Ils prennent 2 des 3 cases de lots de pièces (planche du bas). |
| Chine | La pièce **précise** apparaît sur l'étal, négociable, ≤ 1 par session. Sans l'album correspondant : inachetable, message « Classeur de cartes manquant » / « Album de timbres manquant ». |
| Cycle de vie | Achetée → directement dans l'album. Jamais en réserve, en vitrine, ni à l'atelier. Doublons empilés (×N). Bouton « Recycler les doublons » → 1 pièce de réparation par exemplaire recyclé (cartes → Jeux & Loisirs, timbres → Livres & Papeterie). |
| Raretés | 3 raretés par album (30 communes / 15 rares / 5 légendaires), poids de tirage 70 / 25 / 5 %. |
| Récompense | Aucune récompense de complétion en monnaie. |
| Collection | Case « Classeur de cartes » en tête de Jeux & Loisirs, « Album de timbres » en tête de Livres & Papeterie. Sur les 5 lots de cartes existants, 4 deviennent 4 nouveaux objets, le 5ᵉ disparaît. |
| Bureau | L'ancien livre de comptes (`public/qg/carnet.webp`, retiré le 2026-08-23 en `d9995f44`) revient sur la table de la zone gauche ; tap → 2 boutons (cartes / timbres). |
| Classeur | Pages 3×3 à feuilleter. |
| Album | 2 pages de 5 lignes ; timbres glissés depuis un bac « en vrac », **Y aimanté à la ligne, X libre, chevauchement autorisé**. |
| Art | Placeholders d'abord. |

Conséquence assumée : les lots de pièces de réparation du Bazar passent de 3
catégories par semaine à **1**. Le recyclage des doublons compense en partie.

## 3. Données

### 3.1 Catalogues

`src/data/cartes.ts` et `src/data/timbres.ts` exportent chacun 50
`PieceCollection` :

```ts
export type AlbumId = "classeur" | "timbres";

export interface PieceCollection {
  /** "carte.<slug>" ou "timbre.<slug>" — le préfixe identifie l'album. */
  id: string;
  nom: string;
  album: AlbumId;
  /** Cartes : catégorie de l'objet source. Timbres : thème. */
  serie: string;
  rarete: Rarete;
  /** Valeur de référence (état « Très bon ») pour le prix en brocante. */
  prixRefBase: number;
  /** Cartes uniquement : templateId de l'objet toonifié (placeholder). */
  source?: string;
  /** Ordre dans l'album (0..49) : stable, sert aux pochettes du classeur. */
  ordre: number;
}
```

- **Cartes** : `serie` = catégorie d'objet (7 catégories, 7 à 8 cartes chacune,
  50 au total). Chaque carte pointe un objet existant via `source`.
- **Timbres** : `serie` ∈ { `voyage`, `faune`, `monuments`, `celebrites`,
  `culture-pop` }, 10 par thème. Personnages et références de culture pop
  **fictifs** (cf. `docs/renommage-droits-auteur.md`).
- Raretés : 30 / 15 / 5 par album. Prix de référence indicatifs : commune
  ~10 €, rare ~40 €, légendaire ~150 €.
- Garde de test : 50 pièces par album, ids uniques et préfixés, 30/15/5,
  `ordre` = permutation de 0..49, `source` résolu par `getTemplate` pour
  toutes les cartes.

### 3.2 Façade `getTemplate`

`getTemplate(id)` (`src/data/objetTemplates.ts`, 31 appelants) résout aussi
`carte.*` et `timbre.*` en renvoyant une vue `ObjetTemplate` (`templateId`,
`nom`, `categorie` = Jeux & Loisirs pour les cartes, Livres & Papeterie pour
les timbres, `rarete`, `prixRefBase`, `taille: "XS"`). Helpers :
`estPiece(id)`, `albumDe(id): AlbumId | null`, `getPiece(id)`.

Invariant : les pièces ne figurent dans **aucun** pool dérivé de
`OBJET_TEMPLATES` (`poolPourTier`, `poolDeGamme`, `initCollection`, quêtes,
boîte mystère, colis, cadeaux). Un test le garde.

### 3.3 Sauvegarde

```ts
export interface AlbumState {
  achete: boolean;
  /** id → quantité possédée (≥ 1). Absent = jamais obtenu. */
  pieces: Record<string, number>;
  /** Pièces obtenues pas encore consultées dans l'album (pastille). */
  nouvelles: string[];
}
export interface AlbumTimbresState extends AlbumState {
  /** Timbres posés sur une page. Absent = dans le bac. */
  placements: Record<string, { page: 0 | 1; ligne: 0 | 1 | 2 | 3 | 4; x: number }>;
  /** Ordre d'empilement : les derniers ids passent dessus. */
  ordreZ: string[];
}
export interface AlbumsState {
  classeur: AlbumState;
  timbres: AlbumTimbresState;
}
// GameState
albums: AlbumsState;
```

`x` ∈ [0, 1] = centre du timbre en fraction de la largeur de page.

**SAVE_VERSION 21 → 22.** Migration :
- `albums` absent → `initAlbums()` (rien acheté, vide).
- Renommages des lots de cartes (`OLD_TO_NEW_TEMPLATE_ID`) :
  `jx.lot_de_cartes_l_assemblee_des_mages`, `jx.lot_de_cartes_de_yo_hi_ah`,
  `jx.cartes_pocket_monster_set_jungle`, `jx.cartes_pocket_monster_1ere_edition`
  → 4 nouveaux objets Jeux & Loisirs, même rareté et même prix que l'objet
  remplacé, sans marque :
  - `jx.puzzle_en_bois_1000_pieces_paysage_alpin` « Puzzle en bois 1000 pièces — paysage alpin » (80)
  - `jx.jeu_de_l_oie_lithographie_1900` « Jeu de l'oie lithographié (1900) » (35)
  - `jx.boite_de_construction_metallique_no_3` « Boîte de construction métallique n°3 » (60)
  - `jx.locomotive_a_vapeur_electrique_1950` « Locomotive à vapeur électrique (1950) » (220)

  `jx.cartes_pocket_monster_holographiques_japonaise` (360) est retiré ; ses
  instances rebasculent sur la locomotive. Le jeu de cartes « Long Trajet »
  reste. À suivre pour chaque id : `objetTemplatesTailles.ts`, `ITEMS_WITH_IMAGE`
  + `public/items/{,thumbs/}*.webp` (les 5 images actuelles servent de
  placeholders renommés, l'art viendra après), et les traductions
  `src/lib/i18n/contenu/{en,es,el}/objets.ts`.
- La collection est déjà reconstruite depuis le pool par la migration
  existante : les 4 slots renommés conservent `vu`/`dejaPossede`/`donation`
  via la table de renommage, le 5ᵉ disparaît.
- Toute autre référence à ces 5 ids (tutoriel, poolExclusif, quêtes, cadeaux,
  `ITEMS_WITH_IMAGE`, images) est relevée au plan et suivie.

### 3.4 Logique pure (`src/lib/albums.ts`)

- `initAlbums()`, `ajouterPiece(albums, id)` (+1, pousse dans `nouvelles` si
  première fois), `marquerConsultee(albums, id)`.
- `doublons(album)` = Σ (quantité − 1) ; `recyclerDoublons(state, albumId)`
  → chaque quantité repasse à 1, `piecesAmelioration[catégorie] += n`,
  renvoie `n`.
- `tirerPiece(albumId, rng)` : poids 70/25/5 par rareté, uniforme dans la
  rareté, **doublons possibles**.
- `ouvrirPaquet(albumId, rng)` → 3 `tirerPiece`.
- Timbres : `poserTimbre(albums, id, page, ligne, x)` (borne `x` à [0, 1],
  met l'id en tête de `ordreZ`), `rendreAuBac(albums, id)`,
  `premierePlaceLibre(albums, page)` (chemin sans glisser : ligne 0, x
  ≈ 0,1 + 0,2 k jusqu'à trouver un x dont aucun timbre posé n'est à moins de
  0,15 ; sinon x = 0,5 — le chevauchement est permis, ce n'est qu'un confort).

## 4. Chine

### 4.1 Tirage (`genererSession`)

Après le remplissage normal, avec une chance `CHANCE_PIECE_PAR_SESSION[tier]`
= 0,35 / 0,45 / 0,55 / 0,65, **un** emplacement (position uniforme) est
remplacé par une pièce : album à 50/50, puis `tirerPiece`. Un seul par session,
indépendant de l'emplacement exclusif. Les bourses à thème (`specialisation`)
ne changent rien : la pièce y sort aussi (elle n'appartient pas à l'étal
thématique, c'est un petit extra du vendeur).

Jamais : par la Fouille (`genererRemplacement`), dans `poolExclusif`, dans la
session scriptée du tutoriel, chez les clients de vitrine.

### 4.2 Enveloppe

`instancierPiece(piece, brocante)` construit un `ObjetEnVente` dont l'`Objet`
a `templateId = piece.id`, la catégorie de l'album, `rarete`, **état forcé
« Très bon »** (`prixReferenceReel = prixRefBase`), persona et négociation
comme un objet normal. Fiche, loupe de cote, tampons, dialogues : inchangés.

### 4.3 Verrou sans album

Dans le carrousel de chine, si `albums[albumDe(id)].achete` est faux : pas de
bouton Négocier/Acheter ; à la place une plaque de laiton « Classeur de cartes
manquant » / « Album de timbres manquant » (4 langues), avec l'aide
« En vente au Bazar ». La pièce reste consultable. `acheterObjet` refuse aussi
côté logique (`raison: "albumManquant"`) — le verrou n'est pas qu'à l'écran.

### 4.4 Achat

`acheterObjet` (GameContext) aiguille par `estPiece(templateId)` :
- pièce → `ajouterPiece`, **pas** de contrôle de capacité de la réserve,
  argent/énergie/XP d'achat comme aujourd'hui, `marquerVu` ignoré (pas de
  slot de collection).
- Le bilan de chinage liste la pièce avec la mention « rangée dans l'album »
  et l'envol vise l'icône d'album plutôt que la réserve.

### 4.5 Loupe de brocante

`objetsTrouvables` ne liste pas les pièces ; la loupe ajoute une ligne
« Cartes & timbres à collectionner » quand la chance du tier est > 0 (toujours).

## 5. Bazar

### 5.1 Étal

`NB_LOTS_PIECES` 3 → 1 : `genererEtal` ne tire plus qu'une catégorie. Les
cases 5 et 6 de la planche du bas montrent, sans rien stocker dans
`EtalBazar` :

| Case | `albums.X.achete` faux | vrai |
|---|---|---|
| 5 | Classeur de cartes — 10 Ƶ | Paquet de 3 cartes — 5 Ƶ |
| 6 | Album de timbres — 10 Ƶ | Pochette de 3 timbres — 5 Ƶ |

Constantes `PRIX_ALBUM = 10`, `PRIX_PAQUET = 5`, `TAILLE_PAQUET = 3` dans
`src/lib/bazar/albums.ts`. `acheterAlbum(state, albumId)` et
`acheterPaquet(state, albumId, rng)` renvoient `ResultatAchat` (refus
`"jetons"`). Les assets des 4 articles (classeur fermé, album fermé, paquet,
pochette) sont des placeholders (`public/bazar/albums/*.webp`) à remplacer.

### 5.2 Cérémonie d'ouverture

`OuverturePaquetOverlay` : les 3 pièces retournées une à une au tap (ou après
800 ms sans tap), chacune avec « Nouveau ! » ou un badge ×N, puis « Ranger »
qui ferme. `prefers-reduced-motion` : les trois retournées d'un coup. L'état
est déjà écrit avant la cérémonie (un kill de l'app ne perd rien).

## 6. Classeur & album (UI)

Deux overlays sur `FloatingRoomOverlay`, ouverts par la collection, le bureau,
et depuis le Bazar après ouverture d'un paquet (bouton « Voir »).

### 6.1 `ClasseurOverlay`

- 6 pages 3×3 (ordre `ordre`), swipe horizontal + points de pagination ; la
  dernière page a 5 cartes et 4 pochettes vides « à venir ».
- Pochette : non possédée = silhouette grise + « ? » (nom masqué) ; possédée =
  carte + badge ×N si N > 1 + pastille « nouveau » si dans `nouvelles`.
- En-tête : « 12 / 50 » et le bouton « Recycler les doublons (N) » (inactif à
  0) → confirmation → toast « +N pièces Jeux & Loisirs ».
- Tap sur une carte possédée → `FicheObjet` (sticker, rareté, série, ×N) et
  `marquerConsultee`.

### 6.2 `AlbumTimbresOverlay`

- 2 pages swipables, 5 lignes tracées (guides), bac « en vrac » en bas
  (scroll horizontal, ×N, pastille nouveau).
- Glisser (pointer events, comme le coffre) du bac → page : au lâcher, `ligne`
  = la plus proche, `x` = fraction bornée ; **pas de collision**, le timbre
  passe en tête de `ordreZ`. Glisser un timbre posé : le déplacer, ou le rendre
  au bac en le lâchant sur la zone du bac. Le swipe de page est désactivé
  pendant un glisser.
- Tap sans glisser → fiche ; la fiche d'un timbre du bac offre « Poser sur la
  page » (`premierePlaceLibre`) — chemin sans glisser.
- En-tête : compteur, recyclage (→ pièces Livres & Papeterie).
- Taille d'un timbre : ~1/6 de la largeur de page ; le bac garde la même
  échelle.

### 6.3 Placeholders

- Carte : `<CartePlaceholder>` = image de l'objet `source` dans un cadre CSS
  (bord, bandeau du nom, filtre `saturate(1.4) contrast(1.1)`), couleur du
  cadre selon la rareté (`getRarityColors`).
- Timbre : `<TimbrePlaceholder>` = SVG dentelé, fond selon le thème, icône
  lucide du thème, numéro `ordre + 1`.
- Résolution : `pieceImageSrc(id)` → `/cartes/<id>.webp` ou
  `/timbres/<id>.webp` si le fichier est déclaré dans `PIECES_AVEC_IMAGE`
  (même mécanisme qu'`ITEMS_WITH_IMAGE`), sinon le placeholder. Le chantier
  art ne fera que déposer des fichiers et remplir ce Set.

## 7. Entrées

### 7.1 Collection (`src/app/collection/page.tsx`)

Deux tuiles spéciales injectées en tête de leur catégorie (pas des
`CollectionSlot`) : Classeur → Jeux & Loisirs, Album → Livres & Papeterie.
Avant achat : cadenas laiton + « En vente au Bazar ». Après : miniature +
« 12/50 » + pastille si `nouvelles` non vide. Tap → overlay. Les compteurs de
catégorie et la valeur de collection ne les comptent pas.

### 7.2 Bureau (`QgCarnet` ressuscité)

Asset `public/qg/carnet.webp` restauré depuis `d9995f44^`, composant
`QgCarnet.tsx` remis sur la table de la zone gauche du panorama, rendu
seulement si `albums.classeur.achete || albums.timbres.achete`. Tap → sheet
QG « Mes albums » à 2 boutons ; celui de l'album non acheté est grisé « Au
Bazar ». Aucune main de tutoriel ne le vise.

## 8. i18n

Tout ce qui est UI passe par `src/lib/i18n/ui/{fr,en,es,el}.ts` : noms des
4 articles Bazar, plaques « manquant », en-têtes, recyclage, cérémonie,
sheet du bureau, tuiles de collection, ligne de la loupe. Les noms des pièces
suivent la règle des objets : `nom` FR dans le catalogue et **traductions
EN/ES/EL dans `src/lib/i18n/contenu/<langue>/objets.ts`** (100 entrées × 3,
comme les objets). Jamais de chaîne localisée en save.

## 9. Tests

- Catalogues : gardes de §3.1 et l'invariant « hors de tout pool » (§3.2).
- `albums.ts` : ajout/doublons/recyclage, tirage pondéré (rng injecté),
  pose/bornes/`ordreZ`/`premierePlaceLibre`.
- Migration v22 : parties sans `albums`, renommages des 5 ids (réserve,
  vitrine, collection), instances du 5ᵉ.
- Chine : ≤ 1 pièce par session, chance par tier, jamais en Fouille ni en
  tutoriel, état forcé « Très bon », refus `albumManquant`.
- Bazar : étal à 1 lot, cases 5/6 selon `achete`, refus jetons, paquet = 3.
- Composants (jsdom) : plaque « manquant », tuiles de collection, sheet du
  bureau, classeur (pagination, ×N, recyclage), album (aimantation au lâcher,
  retour au bac, « Poser sur la page »), cérémonie.
- Toujours `npx vitest run --maxWorkers=4`.

## 10. Hors périmètre

- L'art définitif (100 illustrations + 4 articles Bazar) : chantier séparé.
- Échanges entre joueurs, séries à récompense, notifications.
- Toute retouche du fond peint du Bazar ou du bureau.
