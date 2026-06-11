# Collection — Étagères v2 : zoom 1-5, slider discret, texture bois réelle

Date : 2026-06-11
Statut : validé par Guillaume (itération sur les étagères livrées le même jour)

## Contexte

Les étagères de la Collection sont en place (rangées + planches, fond
`--wood-light` en gradient beige, slider laiton 3 crans persisté). Retours
après test sur téléphone : permettre jusqu'à 5 items par ligne, rendre le
slider plus discret, et remplacer le gradient du fond par une vraie texture
bois (photo de parquet sapin clair fournie, 1024×724 px, 105 Ko).

## Décisions

### 1. Zoom 1 → 5 items par ligne

- `type Colonnes = 1 | 2 | 3 | 4 | 5` (dans `src/lib/useColonnesCollection.ts`).
- Validation du hook élargie : toute valeur entière 1-5 relue du localStorage
  est acceptée, sinon défaut **3** (inchangé).
- `CollectionGrid` : prop `colonnes?: Colonnes` (importe le type du hook au
  lieu de redéclarer `1 | 2 | 3`).
- `ColonnesSlider` : `max=5`, rail à **5 crans** laiton (5 radial-gradients
  alignés sur les positions d'arrêt du potard de 18px :
  `calc(9px + (100% - 18px) * F)` avec F = 0, 0.25, 0.5, 0.75, 1).

### 2. Slider plus discret

- Pill moins haute : padding vertical du wrapper 6px → 2px.
- Input : hauteur 40px → 28px (zone tactile réduite mais acceptable — choix
  assumé de Guillaume pour la discrétion).
- Potard : 22px → 18px (`margin-top` recalculé : (4 − 18) / 2 = −7px),
  bordure et stries conservées.

### 3. Texture bois réelle

- L'image fournie est copiée dans `public/textures/bois-clair.jpg` (105 Ko,
  1024×724 — taille acceptable telle quelle, pas de conversion).
- `--wood-light` devient :
  `url("/textures/bois-clair.jpg") repeat top left / 512px auto, #EDD9A3`
  — mosaïque (taille réduite de moitié pour un grain plus fin sur téléphone),
  couleur beige moyenne de la texture en fallback pendant le chargement.
- Aucun autre usage de `--wood-light` dans le code : seul le wrapper de la
  page Collection est affecté. Les planches (`--gradient-shelf`) ne changent
  pas.

## Périmètre

- Mêmes fichiers que la v1 : hook, slider, grille, globals.css, + nouvel
  asset public. Aucun changement de modèle de données ni des autres pages.

## Tests / vérification

- Hook : valeurs 4 et 5 acceptées, 0/6/invalide → 3.
- Slider : `max="5"`, remonte 4/5 en nombre.
- Grille : `colonnes={5}` → `repeat(5, 1fr)` et ceil(N/5) planches.
- Vérification visuelle sur téléphone : texture visible, slider fin,
  5 niveaux de zoom fonctionnels et persistés.
