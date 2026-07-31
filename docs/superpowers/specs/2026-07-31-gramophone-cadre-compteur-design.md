# Gramophone — cadre laiton sur la pochette + compteur de vinyles

Date : 2026-07-31 · Statut : validé (choix utilisateur via questions)

## Contexte

La bande de vignettes du `GramophoneSheet` était en cours de refonte (non
commitée) vers des tuiles rondes de 96 px avec anneau laiton circulaire.
Constat : les visuels des vinyles sont des **pochettes carrées**, pas des
disques ronds — l'anneau circulaire ne suit donc pas les bords du visuel.

## Décisions (validées par Guillaume)

1. **Cadre carré sur la pochette.** Les tuiles restent à 96 px mais
   redeviennent carrées (coins légèrement arrondis, ~10 px, overflow
   hidden). La vignette sélectionnée porte un anneau laiton
   (`box-shadow 0 0 0 2px var(--brass-300)`) qui épouse les bords de la
   pochette. Pas de cadre de rareté (tuile nue, fond transparent), comme
   dans la refonte en cours.
2. **Compteur x/y dans la section titre.** Sous le titre du vinyle
   courant, un petit texte mono laiton « x / y » : x = vinyles débloqués
   (possédés + audio jouable, la liste `vinyles` déjà filtrée par le
   layout QG), y = total des vinyles écoutables = entrées de
   `VINYLE_AUDIO_URLS` (24 aujourd'hui, tous vérifiés présents dans
   `objetTemplates`). Nouvel export `nombreVinylesEcoutables()` dans
   `src/data/vinylesAudio.ts`. Le compteur s'affiche aussi à 0 débloqué,
   et cohabite avec le lien Suno quand celui-ci existe (actuellement
   jamais : pistes locales).

## Contraintes

- Mini-tuto vinyles : la tuile guidée doit garder `overflow: visible`
  (la main pointeuse est un `::after` — test existant le couvre).
- Aucun changement de save ni d'i18n (chiffres bruts, pas de libellé).

## Tests

- Compteur « 1 / 24 » rendu avec 1 vinyle possédé (total non codé en dur
  dans l'assertion : dérivé de `nombreVinylesEcoutables()`).
- Tests guide existants inchangés et verts.
