# QG — Refonte ludique du décor

**Date :** 2026-06-01
**Statut :** spec validée, en attente du plan d'implémentation
**Branche cible :** dédiée (à créer, p. ex. `feat/qg-decor-ludique`)

## 1. Contexte

Le QG actuel (`src/app/qg/page.tsx`) empile en colonnes une `WeekTimeline`, trois boutons texte (Chiner / Étal / Passer), un bandeau huissier conditionnel, un encart « État des lieux » qui doublonne la TabBar, un teaser de gazette, puis une liste « Dernières sessions ». L'écran est fonctionnel mais visuellement plat et sans identité.

L'objectif est de transformer le QG en une **scène habitée**, plus ludique et mémorable, sans casser les flux de jeu existants. Toute la navigation entre les autres pages (Stockage, Atelier, Collection, Compétences) reste dans la TabBar du bas — la section « État des lieux » n'a donc plus de raison d'être au centre de l'écran.

## 2. Vue d'ensemble

Le QG devient un **panorama horizontal swipable** représentant un cabinet de brocanteur d'époque, en 3 zones contiguës :

- **Bureau (gauche)** : bibliothèque murale, fenêtre à châssis bois, table de bureau portant le **journal** (gazette) et le **carnet** (historique).
- **Porte (centre, vue par défaut)** : porte d'entrée en bois avec **boîte aux lettres en laiton**. Selon l'état du jeu, 0 à N **lettres au sol** signalent du courrier non lu.
- **Coin repos (droite)** : cheminée maçonnée, fenêtre à châssis bois, tapis, **fauteuil** Chesterfield au centre, **gramophone** sur un guéridon (décoratif en V1).

Le sticky haut (jour + budget en `MobileHeader`, `WeekTimeline` dans `StickyTop`) et la `TabBar` bas restent inchangés. L'eyebrow « Quartier Général · Semaine N » est supprimé : la métaphore du lieu suffit à signifier où l'on est.

Architecture visuelle en **calques** :

1. *(arrière)* Vue extérieure dynamique (panorama de ciel/rue, alignée sur les fenêtres) — V1 : un seul visuel statique, conçu pour pouvoir varier plus tard (météo, jour/nuit).
2. **Fond cabinet** : panorama large unique avec carreaux des fenêtres **transparents** (PNG à canal alpha), bibliothèque et cheminée intégrées au décor.
3. **Objets interactifs** (PNG transparents) positionnés en `position: absolute` par-dessus le fond : porte, fauteuil, journal, carnet, gramophone, lettres.
4. *(avant)* UI sticky / sheets / TabBar.

## 3. Architecture front

### Composants à créer

```
src/components/mobile/qg/
  ├─ QgPanorama.tsx              ← container scroll-snap + pagination
  ├─ QgScene.tsx                 ← couches fond + objets
  ├─ QgPorte.tsx                 ← zone tap → PorteSheet
  ├─ QgFauteuil.tsx              ← zone tap → PasserConfirmSheet
  ├─ QgJournal.tsx               ← zone tap → ouvre GazetteSheet
  ├─ QgCarnet.tsx                ← zone tap → CarnetSheet
  ├─ QgGramophone.tsx            ← décoratif, hover/wobble cosmétique
  └─ QgCourrier.tsx              ← 0..N PNG lettres, tap → CourrierSheet
src/components/mobile/qg/sheets/
  ├─ PorteSheet.tsx              ← 2 actions : Chiner / Tenir l'étal
  ├─ PasserConfirmSheet.tsx      ← confirmation passer un jour
  ├─ CarnetSheet.tsx             ← contient QgHistorique
  └─ CourrierSheet.tsx           ← liste des courriers non lus
```

### Composants supprimés ou refactorés

- `QgEtatDesLieux` : **supprimé** (sa fonction est couverte par la TabBar).
- `GazetteTeaser` : **supprimé** (la teaser disparaît, le tap sur le journal du décor ouvre directement la `GazetteSheet`, qui contient déjà l'état « acheté/non acheté »).
- Bandeau huissier inline dans `qg/page.tsx` : **supprimé** au profit du système de courrier.
- `QgHistorique` : **conservé**, mais déplacé dans `CarnetSheet`.

### Page `src/app/qg/page.tsx`

Devient un orchestrateur léger :

```tsx
<MobileLayout
  header={<MobileHeader ... />}
  stickyTop={<StickyTop><WeekTimeline ... /></StickyTop>}
>
  <QgPanorama
    initialZone="centre"
    state={state}
    onOpenGazette={...}
    onOpenCarnet={...}
    onOpenCourrier={...}
    onOpenPorte={...}
    onConfirmerPasser={...}
  />
</MobileLayout>
```

Les sheets vivent au même niveau et sont ouvertes via état local de la page.

## 4. Panorama — technique

### Layout et swipe

- Conteneur `QgPanorama` :
  ```css
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  ```
- Le fond panoramique est rendu **une seule fois**, dimensionné `width: 300vw` (ou `300%` du conteneur de référence). Trois sections **vides** servent uniquement d'ancres de snap, chacune `width: 100vw; flex-shrink: 0; scroll-snap-align: center`. Les objets interactifs sont positionnés en `position: absolute` par rapport au conteneur du panorama, indépendamment des sections.
- Au montage : `containerRef.scrollLeft = containerRef.clientWidth` pour positionner la vue par défaut sur la zone centre (porte).
- Pagination par 3 points fixes en bas (overlay), mis à jour via `IntersectionObserver` ou listener `scroll`.
- Le free-scroll est autorisé entre deux snaps. Au relâchement, le scroll-snap CSS gère le calage.

### Couches de la scène

`QgScene` rend, pour chaque zone, un fragment `width: 100vw` (à l'intérieur du conteneur de 300vw) :

```
<div class="scene" style="width: 300vw">
  <img class="exterior-layer" src="/qg/exterieur-jour.png" />
  <img class="fond" src="/qg/fond-cabinet.png" />
  <QgJournal style={{ left: '14vw', bottom: '32vh' }} />
  <QgCarnet style={{ left: '22vw', bottom: '32vh' }} />
  <QgPorte style={{ left: '142vw', bottom: '14vh' }} />
  <QgCourrier style={{ left: '136vw', bottom: '6vh' }} />
  <QgFauteuil style={{ left: '232vw', bottom: '12vh' }} />
  <QgGramophone style={{ left: '258vw', bottom: '22vh' }} />
</div>
```

Coordonnées exprimées en `vw`/`vh` pour rester proportionnelles à l'écran. Le fond cabinet est dimensionné `width: 300vw; height: 100%`, les objets `width: Xvw` pour des tailles cohérentes.

L'**exterior-layer** est positionnée en `z-index: 0`, `pointer-events: none`, alignée pour que le ciel/extérieur visible passe à travers les carreaux transparents du fond (z-index: 1). Les objets interactifs sont en z-index: 2+.

### Coordonnées des objets

Les coordonnées exactes seront fixées une fois les premiers visuels Gemini disponibles (itération visuelle). On les centralise dans un fichier de constantes :

```ts
// src/components/mobile/qg/layout.ts
export const QG_LAYOUT = {
  panoramaWidth: 300, // en vw
  zones: { bureau: 0, porte: 100, repos: 200 },
  objets: {
    journal: { left: 14, bottom: 32, width: 12 },
    carnet:  { left: 22, bottom: 32, width: 12 },
    porte:   { left: 142, bottom: 14, width: 28 },
    courrier:{ left: 136, bottom: 6,  width: 10 },
    fauteuil:{ left: 232, bottom: 12, width: 30 },
    gramophone:{ left: 258, bottom: 22, width: 16 },
  },
} as const;
```

## 5. Système de courrier

### Modèle

```ts
// src/types/game.ts
export type CourrierType = "huissier";  // extensible

export interface CourrierHuissierPayload {
  type: "huissier";
  detteAvantSaisie: number;
  saisies: Array<{
    nom: string;
    type: "inventaire" | "collection";
    valeur: number;
    montantRecupere: number;
  }>;
}

export interface Courrier {
  id: string;
  type: CourrierType;
  jourReçu: number;
  lu: boolean;
  payload: CourrierHuissierPayload; // discriminé par `type` à terme
}
```

Dans `GameState` :

- **Ajouter** : `courriers: Courrier[]` (init `[]`).
- **Supprimer** : `dernierHuissier?: HuissierEvent | null`.

### Migration

Au chargement d'une sauvegarde antérieure (`isHydrated`), si `state.dernierHuissier` est présent et non null, on crée un `Courrier` à partir de ses champs (id = `"huissier-<jourReçu>"`, `lu: false`), on le pousse dans `state.courriers`, puis on supprime `state.dernierHuissier`. La logique de génération de l'événement huissier (déjà existante) est modifiée pour pousser directement dans `state.courriers`.

### Actions sur GameContext

- **Ajouter** : `marquerCourrierLu(id: string)` qui met `lu: true` sur le courrier ciblé.
- **Retirer** : `marquerHuissierVu()` (remplacé).

### Affichage

`QgCourrier` calcule `nbNonLus = state.courriers.filter(c => !c.lu).length`. Visuel :

| nbNonLus | rendu |
| -------- | ----- |
| 0 | rien |
| 1 | `/qg/lettre.png` posée à plat devant la porte |
| 2 | `/qg/lettre.png` × 2 avec léger décalage et rotation |
| 3+ | `/qg/lettre.png` × 3 (la pile n'est pas un compteur, c'est une indication) |

Tap → `CourrierSheet` affichant la liste des courriers non lus, du plus récent au plus ancien, chacun avec son contenu (détail huissier identique au bandeau actuel) et un bouton « Compris ✕ » qui appelle `marquerCourrierLu(id)`. Les lettres lues disparaissent de la liste et du sol au prochain rendu.

## 6. Pipeline d'assets Gemini

### Script

Nouveau script : `scripts/generate-qg-images.mjs`, calqué sur `scripts/generate-brocante-images.mjs` (même chargement `.env`, même choix Pro/Flash, même boucle d'écriture).

- Config : `scripts/qg-prompts.json`.
- Sortie : `public/qg/{slug}.png`.
- Commande : `npm run gen:qg` (à ajouter dans `package.json`).
- Options : `--force`, `--model=pro|flash`, filtre par slug.

### Style brief commun

Reprend le style global Art Déco existant :

> Vintage Art Déco illustration in a museum catalog style. Elegant ink line-art with subtle sepia and forest green color wash. Cream parchment background with subtle paper grain texture. **Soft warm light coming from the upper-left** (windows). Cohesive lighting and color palette across all assets so that pieces composite naturally on top of each other.

### Slugs à générer en V1

| Slug | Description prompt-clé | Format |
| ---- | ---------------------- | ------ |
| `fond-cabinet` | Wide panoramic interior (format aimed at ≈ 3 viewport widths on mobile portrait — exact aspect ratio à valider selon ce que Gemini accepte, viser 5:2 à 3:1) of a cozy antique dealer's cabinet. Three zones from left to right: **(left) writing-desk corner** with a tall built-in **bookshelf** filled with old leather-bound books, a **tall wooden-framed window** above the desk (warm sunlight streaming in), and an empty mahogany writing desk in front; **(center) entrance wall** with a heavy wooden front door fitted with a polished brass letterbox slot, vintage wallpaper; **(right) reading nook** with a **stone fireplace** (small fire burning), a **wooden-framed window** with view to outside, a Persian rug on parquet floor, a small side table, empty space where an armchair will be placed. **Window panes must be fully transparent (alpha channel)** so the exterior can show through. PNG with transparency on window glass areas only. No people. | 5:2, PNG transparent dans les fenêtres |
| `exterieur-jour` | Soft impressionistic view of a Parisian street rooftops at midday, used as background seen through windows. Aspect aligné sur `fond-cabinet` (peut être un peu plus large pour éviter les bords visibles). Designed to tile or align so left zone window shows treetops, right zone window shows roof slopes. | 5:2 |
| `porte` | Transparent background. Heavy wooden front door, ajar position closed, with a polished brass letterbox slot at mid-height. Eye-level perspective. Same lighting as fond. | PNG transparent |
| `fauteuil` | Transparent background. Vintage tufted Chesterfield armchair in deep emerald-green velvet, three-quarter front view. Designed to sit naturally in a cozy reading nook lit from upper-left. Eye-level perspective. | PNG transparent |
| `journal` | Transparent background. Rolled-up vintage newspaper, lying flat on a desk, slight perspective from above. | PNG transparent |
| `carnet` | Transparent background. Small leather-bound notebook, closed, lying flat on a desk, slight perspective from above. | PNG transparent |
| `gramophone` | Transparent background. Vintage gramophone with brass horn, sitting on a wooden side table. Eye-level perspective. Lit from upper-left. | PNG transparent |
| `lettre` | Transparent background. Single white envelope as if dropped on the floor, slight perspective from above, soft shadow underneath. | PNG transparent |

### Contraintes communes aux prompts d'objets

- `transparent background, isolated subject`
- `consistent lighting: warm soft light from upper-left, matching ambiance of the cabinet scene`
- `same line weight and color treatment as fond-cabinet for visual cohesion`

## 7. Comportements détaillés par objet

| Objet | Tap | Sheet ouverte | État réactif |
| ----- | --- | ------------- | ------------ |
| **Porte** | ouvre `PorteSheet` | 2 boutons : *Sortir chiner* (→ `/chiner`) et *Tenir l'étal* / *Exposer une vitrine* (→ `/vitrine` ou `/vitrine/X`) | — |
| **Fauteuil** | ouvre `PasserConfirmSheet` | « Passer la journée ? » + Confirmer (`avancerJour(1)`) / Annuler | — |
| **Journal** | appelle `setGazetteOuverte(true)` | `GazetteSheet` existante (acheter / lire selon état) | la `GazetteSheet` gère elle-même son contenu en fonction de `state.gazetteAchetee` |
| **Carnet** | appelle `setCarnetOuvert(true)` | `CarnetSheet` (nouvelle, contient `QgHistorique`) | — |
| **Gramophone** | aucun (V1) | — | cosmétique : léger `transform: translateY(-2px)` au survol pour signaler « plus tard » |
| **Courrier (lettres au sol)** | ouvre `CourrierSheet` | liste des courriers non lus, bouton de lecture par lettre | reactif à `state.courriers` |

## 8. Hors V1 (notés pour la suite)

- Gramophone interactif : lecture aléatoire d'un vinyle de la collection (filtre catégorie `vinyles`).
- États visuels alternatifs des objets : porte ouverte, journal déroulé, carnet ouvert.
- Animations riches : porte qui s'ouvre, lettre qui glisse depuis la boîte aux lettres, fumée de la cheminée.
- Vues extérieures variables : jour/nuit, météo, saison, événements (carnaval, neige…). Le système de calques le permet déjà — il suffit de générer plusieurs `exterieur-*.png` et de choisir au moment du rendu.
- Autres types de courrier (clients, invitations de collectionneurs, célébrités) — le type `CourrierType` est déjà extensible.

## 9. Risques et points d'attention

- **Cohérence de lumière** entre fond et objets : le prompt impose la direction de lumière, mais il faudra probablement plusieurs itérations Gemini pour obtenir une fusion crédible. Prévoir des allers-retours dans le plan d'implémentation.
- **Coordonnées des objets** : les valeurs de `QG_LAYOUT` ne pourront être finalisées qu'une fois le `fond-cabinet` choisi. Le plan doit prévoir une phase d'ajustement après livraison du fond.
- **Alignement des fenêtres avec l'extérieur** : nécessite que les apertures du fond et la composition de `exterieur-jour` soient pensées ensemble. Conseil : générer `fond-cabinet` d'abord, puis `exterieur-jour` en lui passant `fond-cabinet` comme référence si la pipeline le supporte (Gemini accepte des images-référence en input).
- **Performance mobile** : un fond panoramique 300vw en PNG transparent peut être lourd. Cibler une largeur native ≈ 2400 px en PNG-8 ou en WebP. Idem pour l'extérieur. Compression à valider en fin de pipeline.
- **Migration save** : tester le passage d'une sauvegarde existante avec `dernierHuissier` non null pour s'assurer que la lettre apparaît bien.

## 10. Étapes de réalisation suggérées

(à détailler dans le plan d'implémentation)

1. Pipeline et premiers visuels : script, prompts, premier rendu du fond + objets.
2. Refactor du modèle (`courriers`, migration, suppression `dernierHuissier`).
3. Composants `QgPanorama` + `QgScene` avec placeholders (les visuels schématiques actuels ou des solid colors), validation du swipe et du snap.
4. Intégration des PNG Gemini, ajustement des coordonnées dans `QG_LAYOUT`.
5. Sheets (`PorteSheet`, `PasserConfirmSheet`, `CarnetSheet`, `CourrierSheet`).
6. Suppression des composants devenus obsolètes (`QgEtatDesLieux`, `GazetteTeaser`, bandeau huissier).
7. Vérification visuelle sur appareil mobile + tests de migration de sauvegarde.
