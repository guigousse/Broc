# Collection — Étagères en bois + slider de zoom

Date : 2026-06-11
Statut : validé par Guillaume (mockup fourni : rangées d'items posées sur des
planches « étagère bois », fond bois clair)

## Contexte

La grille Collection (`src/components/CollectionGrid.tsx`, utilisée par
`src/app/collection/page.tsx`) affiche les cellules sur le fond papier
standard, en colonnes auto (`repeat(auto-fill, minmax(var(--card-w), 1fr))`,
soit 2 colonnes sur téléphone). Objectif : un décor d'étagères — chaque rangée
d'items posée sur une planche de bois, fond bois clair derrière la grille — et
un contrôle de zoom (1 à 3 items par ligne).

## Décisions

### 1. Étagères — rangées explicites (option B)

- `CollectionGrid` reçoit une prop `colonnes: 1 | 2 | 3` (défaut 3) et
  remplace l'auto-fill par des rangées explicites : les slots sont découpés en
  groupes de `colonnes`, chaque groupe rendu dans une grid
  `repeat(colonnes, 1fr)` suivie d'une **planche** (div décorative).
- **Planche** : bande horizontale pleine largeur, gradient bois brun (dans
  l'esprit de la bande du mockup et en harmonie avec
  `--gradient-cargo-wood`), fine tranche claire en haut (chant de la planche)
  et ombre portée vers le bas. Hauteur ~14-18px. `aria-hidden`.
- **Fond bois clair** : la zone de grille de la page Collection reçoit un fond
  bois clair (gradient/teinte beige-bois). Nouvelles variables CSS dans
  `globals.css` : `--wood-light` (fond) et `--gradient-shelf` (planche).
- Les cellules existantes (cadres rareté, coins Art Déco, badges `*`/`+`,
  silhouettes "?") ne changent pas ; elles sont simplement posées sur les
  étagères. La perf conserve `content-visibility` (`.broc-grid-cell`) et la
  mémoïsation des cellules.
- Le texte « ETAGERE BOIS » du mockup est une annotation, rien à afficher.

### 2. Slider de zoom (1 → 3 items par ligne)

- Nouveau composant `ColonnesSlider` : flottant en bas à **gauche**, au-dessus
  de la TabBar, uniquement sur la page Collection.
- 3 crans (1, 2, 3 items par ligne). Défaut : 3.
- Design intégré à l'app : rail sombre, curseur **laiton strié** esprit
  potards d'enceintes Marshall (doré `--brass-*`, stries, relief). Implémenté
  avec un vrai `<input type="range" min="1" max="3" step="1">` stylé
  (accessibilité clavier/lecteur d'écran gratuite), `aria-label`
  « Items par ligne ».
- **Persistance** : la valeur est mémorisée dans `localStorage`
  (clé `broc.collection.colonnes`), relue au montage de la page. Valeur
  invalide ou absente → 3.

### 3. Périmètre

- Page Collection uniquement (toutes catégories, y compris la vue Total).
- Aucun changement du modèle de données ni des autres pages.
- `CollectionGrid` garde la même API par ailleurs (`slots`, `onTap`,
  `enStockIds`).

## Tests / vérification

- Tests vitest sur `CollectionGrid` : découpage en rangées (N slots,
  colonnes=3 → ceil(N/3) planches), prop `colonnes` respectée, cellules et
  badges inchangés, mémoïsation préservée.
- Tests sur `ColonnesSlider` : valeur par défaut, changement → callback,
  persistance localStorage (lecture/écriture), valeur invalide → 3.
- Vérification visuelle sur téléphone (Vercel) : alignement planches/rangées
  aux 3 niveaux de zoom, rendu du fond bois, slider au-dessus de la TabBar.
