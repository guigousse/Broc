# Corrections UI — Section Collection

Date : 2026-06-11
Statut : validé par Guillaume

## Contexte

Trois défauts visuels dans la page Collection (`src/app/collection/page.tsx` +
`src/components/CollectionGrid.tsx`) :

1. Les items non découverts (silhouettes "?") ont une bordure pointillée dont
   seuls les bords haut et bas sont visibles sur mobile.
2. Le header sticky a un titre centré tronqué et un compteur `X/Y` redondant
   avec le `CategoriePicker` juste en dessous.
3. Le badge `*` (nouveauté non consultée) est grisé par le filtre appliqué au
   bouton entier ; et il manque un indicateur pour les items présents dans
   l'inventaire mais pas encore donnés à la collection.

## Décisions

### 1. Cellules non découvertes

- **Bordure pointillée** : remplacer `1.5px dashed` par une largeur entière
  (`1px dashed`) — les largeurs fractionnaires en `dashed` rendent mal sur
  WebKit. Si le rendu reste cassé sur téléphone, fallback en tirets dessinés
  via `background-image` (repeating-linear-gradient sur les 4 bords).
- **Pas de silhouette d'objet** : on conserve le `?`.
- **Police du `?`** : `var(--font-broc-title)` (la police Art Déco du titre
  "Broc"), au lieu de `var(--font-display)`.

### 2. Header de page (PageHeaderBar)

- Disposition cible : **"Collection" à gauche**, **"Catégorie · somme €" à
  droite** (catégorie = filtre actif ou "Total").
- Le compteur `possédé/total` est **supprimé** du header (déjà visible dans le
  CategoriePicker).
- `PageHeaderBar` reçoit une option d'alignement du titre (gauche ou centré) ;
  les autres pages (Atelier, Stockage, Compétences) gardent le titre centré.

### 3. Badges des cellules

- **Nouveau badge `(+)`** : affiché en haut à droite (emplacement actuel du
  `*`) quand `state.inventaireJoueur` contient au moins un objet du
  `templateId` du slot ET que le slot n'est pas donné (`donation === null`).
  La page calcule un `Set<string>` des templateIds en stock et le passe en
  prop à `CollectionGrid`.
- **Priorité** : `(+)` prioritaire sur `*` — si les deux conditions sont
  vraies, seul `(+)` s'affiche.
- **Correctif `*` au premier plan** : le filtre grisaille
  (`grayscale/brightness/opacity`) appliqué au `<button>` entier est déplacé
  sur la couche image uniquement, pour que les badges gardent leurs couleurs
  pleines.

## Hors périmètre

- Aucun changement de modèle de données ni de logique de jeu.
- Aucun changement des autres pages utilisant `PageHeaderBar` au-delà de la
  nouvelle prop optionnelle (comportement par défaut inchangé).

## Tests / vérification

- Vérification visuelle dans le navigateur (grille Collection : silhouettes,
  badges `*` et `(+)`, header avec et sans filtre de catégorie).
- `npm run lint` + build/typecheck existants.
