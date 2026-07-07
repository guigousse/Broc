# Intégration des visuels de compétences dans l'arbre — Design

**Date** : 2026-07-07 · **Statut** : design validé par Guillaume

## Objectif

Les 24 visuels (`public/competences/*.webp`, série v2 plein cadre) remplacent
les chiffres « 1 / 2 / 3 » dans les tuiles de l'arbre des compétences
(`src/app/bibliotheque/page.tsx`) et s'affichent en grand dans la sheet de
détail. Suite directe du chantier
`2026-07-07-visuels-competences-design.md` (section « Hors périmètre »).

## Décisions validées

- **Portée** : vignettes de l'arbre **et** sheet de détail.
- **Verrouillée = grisée** : `filter: grayscale(1)` + opacité réduite,
  dans les tuiles comme dans la sheet.
- **Cadre Art déco** : overlay **dans la sheet seulement** — sur les tuiles
  (~100 px) les filets seraient illisibles et redondants avec les bordures
  d'état existantes.

## Composants

### 1. Mapping compétence → asset (`src/data/competences.ts`)

```ts
export function visuelCompetence(comp: CompetenceDef): string
```

- Arbre général → `/competences/general.{brancheId}.{palierNumero}.webp`
- Les 7 arbres de catégorie → `/competences/theme.{brancheId}.{palierNumero}.webp`
  (visuels partagés entre catégories, conformément au spec des visuels)

Les 96 `CompetenceDef` (12 générales + 7 × 12 thématiques) se projettent sur
les 24 fichiers existants.

### 2. Tuiles (`PalierTile`, `src/app/bibliotheque/page.tsx`)

- `<img>` plein cadre (fill absolu, `object-fit: cover`, `loading="lazy"`,
  `alt=""` — le bouton porte déjà `title={comp.nom}`) à la place du chiffre.
- Overlays conservés par-dessus l'image :
  - ✓ haut-droite si débloquée, sur pastille sombre pour la lisibilité ;
  - badge « N{niveauBrocanteurRequis} » en bas, bandeau papier translucide.
- États :
  - **débloquée** : pleine couleur + liseré laiton actuel (boxShadow inset) ;
  - **disponible** : pleine couleur, bordure laiton simple ;
  - **verrouillée** : grisée + opacité réduite, bordure pointillée conservée.

### 3. Sheet de détail (`PalierDetail`)

- Image pleine largeur (carrée) au-dessus de la description.
- Cadre Art déco en overlay : `scripts/competences-frame.svg` copié vers
  `public/competences/frame.svg` (le script reste la source de vérité).
- Grisée si verrouillée.

### 4. Tests

Extension de `src/data/competencesVisuels.test.ts` : pour chacune des 96
compétences de `COMPETENCES`, `visuelCompetence()` retourne un chemin dont le
fichier existe dans `public/` — filet anti-image cassée.

## Hors périmètre

- Achat/états logiques des compétences, `TreePicker`, `ParcoursSheet` : inchangés.
- Cadre sur les tuiles, animations d'apparition : non.
