# Bureau — Cahier de Compte journalier + Carnet de Notes des missions

**Date** : 2026-06-18
**Statut** : design validé

## Contexte

L'overlay `CarnetOverlay` actuel (issu de la spec du 2026-06-15) fusionne deux préoccupations distinctes dans un seul cahier à deux onglets :

- un **grand livre ligne-à-ligne** des écritures de budget (chinage, vente, loyer, gazette, courriers, upgrades) ;
- une **liste de cartes** pour les missions (actives / livrées / expirées).

À l'usage, les deux onglets n'ont pas la même fonction. Le grand livre est trop granulaire (chaque ligne = une écriture) alors que le joueur raisonne en **journées de jeu**. Et les missions méritent leur propre objet narratif sur le bureau, pas un onglet caché.

Cette spec recompose le bureau en **deux objets physiques distincts** (un gros cahier comptable, un petit carnet rouge), redessine la vue Historique en lignes journalières, et unifie le rendu d'une session vue depuis le Cahier avec la page de fin de chinage/vente (`SessionSummary`).

## Objectifs

1. Refonte du **Cahier de Compte** : une ligne par journée, résultat net journalier, dépliage via `SessionSummary` réutilisé.
2. Introduction d'un **petit carnet rouge** posé sur le bureau (asset distinct), overlay dédié aux missions en cours / terminées.
3. Redesign de `SessionSummary` : suppression du sous-titre redondant, **vignettes kraft** d'items à la place des icônes catégorie, typo nom plus discrète.
4. Recomposition du bureau : ajout d'un **porte-revues** au sol qui accueille le journal (libère l'emplacement du carnet rouge).
5. Stockage du XP gagné dans la session pour permettre le replay fidèle depuis le Cahier.
6. Démantèlement de `CarnetOverlay` en deux composants disjoints.

## Non-objectifs

- **Génération automatique des missions** : traitée dans la spec B (à suivre). Cette spec consomme le modèle existant (`Courrier` + `MissionResolution`).
- Pas de filtres / recherche / pagination dans l'Historique (volume reste sous la centaine de journées sur une partie).
- Pas de changement de la mécanique d'écritures du grand livre — les `LedgerEntry` continuent d'être créées comme aujourd'hui ; on en change uniquement la **vue**.

## Architecture

### 1. Modèle — XP stocké dans la session

```ts
// src/types/game.ts
export interface SessionChinage {
  id: string;
  type: "chinage";
  jour: number;
  timestamp: number;
  brocanteId: string;
  brocanteNom: string;
  achats: AchatHistorique[];
  /** XP gagné pendant cette session, par arbre. Vide pour les sessions
   *  antérieures à la migration. */
  xpGagne: Record<CompetenceTreeId, number>;
}

export interface SessionVente {
  id: string;
  type: "vente";
  jour: number;
  timestamp: number;
  niveauCamion: NiveauCamion;
  loyer: number;
  ventes: VenteHistorique[];
  invendus: number;
  xpGagne: Record<CompetenceTreeId, number>;
}
```

**Migration** : bump `SAVE_VERSION`. Les sessions existantes reçoivent `xpGagne: {}` ; le panel XP du replay affichera « Aucune expérience enregistrée pour cette session » dans ce cas (libellé spécifique pour distinguer d'un vrai zéro).

**Écriture** : `enregistrerSession(...)` reçoit déjà le XP gagné via les callbacks `chiner` / `vendre`. On le passe désormais directement à la session, pas seulement aux arbres de compétences.

### 2. Bureau — recomposition des assets

**Layout (`src/components/mobile/qg/layout.ts`)**

| Objet | Position actuelle | Nouvelle position | Asset |
|---|---|---|---|
| `carnet` (Cahier de Compte) | left 11.2, bottom 20.2, w 49.1 | inchangée | `carnet.webp` (inchangé) |
| `journal` | left 16.4, bottom 8.2, w 21.9 | **déplacé** au sol près du fauteuil (valeurs à fine-tuner en `npm run dev`) | `journal.webp` + nouveau `porte-revues.webp` |
| `carnetRouge` (nouveau) | — | left ≈ 16.4, bottom ≈ 8.2, w ≈ 14 | `carnet-rouge.webp` (nouveau, fourni hors code) |
| `porteRevues` (nouveau) | — | au sol, près du fauteuil, valeurs à fine-tuner | `porte-revues.webp` (nouveau) |

**Nouveau composant `QgPorteRevues`** : porte-revues décoratif qui contient le journal ; tap = ouvre l'overlay journal (`QgJournal` actuel devient enfant logique du porte-revues, le composant `QgJournal` reste tel quel pour le rendu de l'overlay mais sa position est désormais portée par `QgPorteRevues`). Alternative simple si on veut éviter le couplage : le journal reste un objet positionné indépendamment, juste rendu **par-dessus** le porte-revues à la position du porte-revues. → On part sur cette alternative simple (deux entrées de layout, le journal positionné légèrement décalé en `bottom` pour qu'il dépasse visuellement du panier).

**Nouveau composant `QgCarnetNotes`** : bouton image, signale l'état des missions de façon **diégétique** (pas de badge UI) :

- aucune mission active → asset neutre, ruban marque-page rentré ;
- au moins une active → coin de page corné visible (overlay CSS d'un coin replié, ou variante d'asset) ;
- au moins une **livrable** → marque-page rouge bien sorti (variante d'asset OU élément CSS surimposé).

Pour éviter trois variantes d'asset, on superpose le `carnet-rouge.webp` (état neutre) avec deux petits éléments CSS positionnés en absolu : un triangle pour le coin corné, un trait rouge pour le ruban dépassant. Les deux apparaissent conditionnellement.

### 3. Cahier de Compte — vue Historique journalière

**Renommage** : `CarnetOverlay` → `CahierDeCompteOverlay`. Suppression des tabs ; un seul contenu : l'Historique.

**Agrégation par journée** (helper `lib/historiqueJournalier.ts`, nouveau) :

```ts
export type TypeJournee = "chinage" | "vente" | "repos";

export interface JourneeHistorique {
  jour: number;
  type: TypeJournee;
  /** Session du jour si type=chinage ou vente, sinon null. */
  session: Session | null;
  /** Libellé principal :
   *  - chinage : nom de la brocante,
   *  - vente   : "Marché du jour" (ou équivalent),
   *  - repos   : libellé dérivé de l'écriture la plus marquante du jour
   *              ("Loyer prélevé", "Atelier amélioré", …) ; "Journée de repos"
   *              si aucune écriture significative. */
  libelle: string;
  /** Toutes les écritures du grand livre datées de ce jour, par timestamp asc. */
  entries: LedgerEntry[];
  /** Net du jour = somme(recette) − somme(depense) sur toutes les entries. */
  net: number;
  /** Solde après la dernière écriture du jour (= entries[last].soldeApres). */
  soldeFin: number;
}

export function agregerJournees(
  grandLivre: LedgerEntry[],
  historique: Session[],
): JourneeHistorique[];
```

Règles :

- Les journées **sans aucune écriture** ne génèrent **pas** de ligne (rien à raconter visuellement, on ne pollue pas l'historique avec des jours « vides »).
- Si une session existe sur le jour, `type = session.type`, `libelle = session.brocanteNom` (chinage) ou « Marché du jour » (vente).
- Sinon, `type = "repos"` et `libelle` est dérivé des `entries` selon cette priorité décroissante : `upgrade_atelier`/`upgrade_stockage`/`upgrade_camion` > `loyer` > `gazette` > `courrier_recompense`/`mission_recompense`. La première écriture matchant cette priorité fournit le libellé (« Atelier amélioré », « Loyer prélevé », « Gazette achetée », « Récompense reçue »…). Si aucune écriture du jour ne matche cette priorité, `libelle = "Journée de repos"`.
- Le **type reste « repos »** même quand un événement coûteux a eu lieu — c'est le libellé qui parle. Le joueur n'a fait ni chinage ni vente : c'est une journée passée au QG, point.

**Rendu d'une ligne** (composant `LigneJournee`) :

```
J7  ┊  Vente — Boulevard des Antiquaires        +124 €   ▸
```

- Colonne 1 : jour (`J7`), typo mono, couleur sépia.
- Colonne 2 : type (eyebrow uppercase petit) + libellé (serif).
- Colonne 3 : net du jour, vert si `> 0`, rouge si `< 0`, neutre si `0`. Gras si `|net| ≥ 100`.
- Colonne 4 : chevron `▸` / `▾` (passé en `▾` quand la ligne ouverte).

**Comportement au tap** :

- Si `journee.session != null` → ouverture **plein écran** de `SessionSummary` (cf. §4) en mode replay. Bouton primaire = « Retour au Cahier » (au lieu de « Rentrer au QG »).
- Sinon → expansion inline d'un mini-bloc « Bilan de journée » qui liste les `entries` du jour (libellé + recette/dépense). Pas de plein écran pour ces journées sans session.

**En-tête** : reste « Cahier de Compte · Jour {n} · Solde {budget} € ».

**Empty state** : si aucune journée à afficher → la phrase italique existante.

### 4. SessionSummary redesigné

**Changements**

1. **Suppression de la duplication de sous-titre**. Une seule ligne italique sous le titre, contenant le texte « X pièce(s) ramenée(s) de la chine. » (chinage) ou « X vente(s) conclue(s). » (vente). Les guillemets et la ligne dupliquée visibles dans la capture sont supprimés.
2. **Vignettes kraft**. Chaque item du bilan voit son `CategorieIcon` remplacé par une vignette ~52×60 px :
   - fond : texture kraft (`/textures/kraft.webp`, nouveau — petite tile répétable, ton brun chaud) ;
   - image item : `getItemImageUrl(templateId)` en `object-fit: contain`, offset en `transform: translate(2px, 3px)` pour l'effet « collé pas tout à fait au centre » ;
   - fallback : `CategorieIcon` centré dans la vignette kraft si `getItemImageUrl` retourne `null`.
   La vignette n'a **pas** de bordure carrée — c'est juste le rectangle de kraft, légèrement plus haut que large. Léger box-shadow `0 1px 2px rgba(0,0,0,0.18)` pour donner l'épaisseur. Pas de rotation (l'offset suffit).
3. **Typo nom**. Passer le nom de l'item de `font-size: 13` à `11`, garder uppercase + letter-spacing. Le total reste à 16 (point d'accroche).
4. **Réception du templateId**. `SummaryItem` (props) gagne `templateId: string` pour pouvoir résoudre l'image. Les deux appelants actuels (`chiner/[brocanteId]/ClientPage.tsx`, `vitrine/[brocanteId]/journee/ClientPage.tsx`) doivent passer cette donnée. Pour la vente : `templateId` est déjà sur les `VenteHistorique` via `ObjetSnapshot`. Pour le chinage : idem via `AchatHistorique`. → **À vérifier dans le plan** que `templateId` est bien sur ces snapshots ; si non, l'ajouter au snapshot.
5. **Bouton de retour contextuel**. Nouvelle prop optionnelle `retourLabel?: string` (défaut : "Rentrer au QG"). En mode replay depuis le Cahier, le parent passe `retourLabel="Retour au Cahier"` et un `onRetour` qui ferme le SessionSummary plutôt que de naviguer.

**Mode replay depuis le Cahier**

Quand on ouvre `SessionSummary` depuis le Cahier :

- `type` : `session.type` ;
- `titre` : `session.brocanteNom` (chinage) ou « Marché du jour J{n} » (vente) ;
- `sousTitre` : reconstitué selon le type ;
- `items` : reconstitués depuis `session.achats` ou `session.ventes` (avec `templateId`, `nom`, `categorie`, `prix`) ;
- `xpGagne` : `session.xpGagne` (vide si pré-migration) ;
- `bravo` : faux en replay (réservé au temps réel) ;
- `retourLabel` : « Retour au Cahier » ;
- `onRetour` : ferme le replay et rend la main au `CahierDeCompteOverlay`.

Le replay est monté **à l'intérieur** du `CahierDeCompteOverlay` via un état local `replayOf: Session | null`. Quand `replayOf` est non-null, on rend `SessionSummary` à la place du contenu du cahier (même zone modale, même fond paper).

### 5. Carnet de Notes — overlay missions

**Nouveau composant `CarnetNotesOverlay`**, séparé du Cahier de Compte.

**Style** : carnet de poche bordeaux, plus petit que le Cahier (`max-width: 360`, `max-height: 85dvh`). Fond papier crème quadrillé léger (lignes horizontales + verticales très pâles pour l'effet carnet quadrillé) — ou bien lignées horizontales seulement, à valider sur première implémentation. Couture centrale légère verticale (gradient sombre 1px). Ruban marque-page tissu qui dépasse du haut (élément décoratif visuel, statique).

**Contenu — flux vertical unique**, pas d'onglet :

1. En-tête : titre « Carnet de Notes » (display, taille 18) ; sous-titre mono « Jour {n} » petit.
2. Section **En cours** (`MissionResolution.statut === "active"`) :
   - Titre de section : `— EN COURS —` (display uppercase, lettre-spacing élargi, fines lignes de chaque côté).
   - Cartes missions : reprise du `MissionCarte` actuel, simplifié pour le ton « carnet ». Statut « Livrable » mis en valeur (cadre légèrement plus dense, bouton « Livrer » plus saillant en bordeaux foncé).
   - Tri : `jourLimite` croissant (le plus urgent en haut), puis `jourRecu` croissant.
3. Section **Terminées** (`livree` ∪ `expiree`) :
   - Séparateur : `— TERMINÉES —`.
   - Cartes en version **aplatie** : un seul bloc compact, sans bouton, le texte du titre + cible barré (`text-decoration: line-through`), opacité 0.55. Le statut (« Livrée J5 » / « Expirée J3 ») affiché en marge droite, encre rouge pour `expiree`, encre verte pour `livree`.
   - Tri : `jourResolution` décroissant.

**Empty states** :

- Aucune mission : phrase italique « Aucune mission reçue pour l'instant. ».
- Toutes terminées : section En cours affiche « Aucune mission en cours. » en italique, la section Terminées s'affiche normalement.

### 6. Refactor de `CarnetOverlay`

- `src/components/mobile/qg/overlays/CarnetOverlay.tsx` est **supprimé**.
- Nouveau : `src/components/mobile/qg/overlays/CahierDeCompteOverlay.tsx` (Historique journalier + replay SessionSummary).
- Nouveau : `src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx` (missions).
- `QgPanorama` (ou le parent qui orchestrait le `CarnetOverlay`) doit câbler deux overlays distincts et deux objets cliquables (`QgCarnet` pour le Cahier, `QgCarnetNotes` pour le Carnet).
- Le hook `onLivrerMission` qui circulait par le `CarnetOverlay` est désormais consommé par `CarnetNotesOverlay`.

## Flux d'interaction

1. Joueur tape sur le **gros cahier** → `CahierDeCompteOverlay` s'ouvre, Historique journalier visible.
2. Tap sur une ligne journée avec session → plein écran `SessionSummary` (replay) à l'intérieur du même overlay ; bouton « Retour au Cahier » referme le replay.
3. Tap sur une ligne journée sans session → expansion inline (mini-bilan).
4. Joueur tape sur le **petit carnet rouge** → `CarnetNotesOverlay` s'ouvre. Missions actives en haut, terminées en bas barrées.
5. Tap « Livrer » sur une mission livrable → `livrerMission(courrierId)`, la mission migre en bas (statut livree).
6. Joueur tape sur le **porte-revues** → ouvre `QgJournal` overlay (comportement journal actuel inchangé).

## Modèle visuel / tokens

- Cahier de Compte : palette inchangée (parchemin, encre brune, accent laiton).
- Carnet de Notes : palette à introduire — `--carnet-rouge-cover: #6e1f1f`, `--carnet-rouge-page: #f4e9cd` (légèrement plus chaud que le cahier), `--carnet-rouge-ligne: #c8b58a` (lignes quadrillé). Encre rouge pour les barrages : `--carnet-encre-rouge: #b03030`.
- Texture kraft : `--kraft-base: #8a6f3f`, image `/textures/kraft.webp` (tile 200×200 px max, légère granularité). Si pas livrée à temps : fallback CSS = gradient radial brun + bruit en `box-shadow inset` (acceptable, ticket de suivi).

## Migration / compatibilité

- `SAVE_VERSION` bump avec un test couvrant : ancienne save sans `xpGagne` → sessions migrées avec `xpGagne: {}`.
- Pas de migration pour les missions / courriers (modèle inchangé).
- Pas de migration de layout : les coordonnées du journal et du carnet sont modifiées dans `layout.ts`, les saves ne contiennent pas de layout (côté serveur).

## Tests à prévoir (côté plan)

- `agregerJournees` : journée chinage seule, vente seule, vente + loyer, événement seul (upgrade), repos avec un courrier, journée vide ignorée.
- Tri : journées plus récentes en tête.
- `SessionSummary` props `retourLabel` + image kraft : snapshot ou interaction (tap chevron → ouverture replay → tap retour).
- `CarnetNotesOverlay` : tri actives par urgence, terminées en bas barrées, livraison déplace la carte.
- Migration save v(n) → v(n+1) : sessions sans `xpGagne` reçoivent `{}`.

## Risques / arbitrages

- **Repositionnement du journal** : risque de casse visuelle si les coords ne sont pas finement ajustées. À calibrer en `npm run dev` après livraison des nouveaux assets.
- **`templateId` sur snapshots** : à vérifier en début de plan. Si absent, ajout au modèle `ObjetSnapshot` + migration.
- **Affordance du carnet rouge** : la stratégie « overlay CSS de coin corné + ruban » dépend de l'asset livré. Si l'asset est trop chargé, on peut tomber sur un simple ruban CSS positionné en absolu — design accepté.
- **Texture kraft manquante** : fallback CSS accepté pour première itération.

## Hors scope (suite : Spec B)

- Génération automatique des missions (cadence, expéditeurs, templates de lettre modulaires, calcul de récompense, échéance dynamique).
- Bibliothèque d'expéditeurs avec ton/style propre.
- Système de variantes textuelles dans les lettres.
