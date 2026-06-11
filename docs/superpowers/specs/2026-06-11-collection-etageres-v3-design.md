# Collection — Étagères v3 : épaisseur et espaces proportionnels au zoom

Date : 2026-06-11
Statut : validé par Guillaume

## Contexte

Les étagères de la Collection (rangées + planches, zoom 1-5 items par ligne)
utilisent une planche d'épaisseur fixe (16px) et des espaces fixes (6px entre
rangée et planche, 16px sous la planche). Au zoom 1 item, la planche paraît
trop fine sous de grands items ; au zoom 5, trop épaisse. Objectif : planche
et espaces proportionnels à la taille des items, la dimension de base étant
celle à 3 items par ligne (valeurs actuelles inchangées à colonnes=3).

## Décisions

- Dans `CollectionGrid`, le style `planche` (constante module) devient une
  fonction de `colonnes`, calculée une fois par rendu :
  - **hauteur** : `Math.round(48 / colonnes)` → 48 / 24 / 16 / 12 / 10 px ;
  - **espace rangée → planche** (`marginTop`) : `Math.round(18 / colonnes)`
    → 18 / 9 / 6 / 5 / 4 px (l'espace est conservé — les items ne touchent
    pas la planche — mais proportionné) ;
  - **espace sous la planche** (`marginBottom`, entre étagères) :
    `Math.round(48 / colonnes)` → 48 / 24 / 16 / 12 / 10 px.
- Le chant clair (`borderTop` 2px `--shelf-edge`), le gradient
  (`--gradient-shelf`) et l'ombre portée ne changent pas.
- Aucun changement d'API : la prop `colonnes` existe déjà.

## Périmètre

`src/components/CollectionGrid.tsx` + son test. Rien d'autre.

## Tests / vérification

- Tests vitest : pour colonnes=1, 3 et 5, la planche a height/marginTop/
  marginBottom à 48/18/48, 16/6/16 et 10/4/10 px respectivement.
- Vérification visuelle sur téléphone : proportions cohérentes aux 5 zooms.
