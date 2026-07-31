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

3. **Vignette sélectionnée agrandie** (ajout 2026-07-31). La tuile
   sélectionnée passe à 125 px (~+30 % vs 96 px) pour marquer la
   différence ; les autres restent à 96 px, centrées verticalement
   (`align-items: center` sur la bande), transition douce 160 ms.

4. **Disque central en rotation pendant la lecture** (ajout 2026-07-31).
   Sur la vignette sélectionnée, quand la musique joue, un recadrage
   circulaire du centre de la pochette (80 % de la tuile, ajusté depuis
   62 % après recette) tourne sur lui-même (4 s/tour, ralenti depuis
   1,8 s ; keyframe `broc-vinyle-spin`). L'image intérieure fait 100/80
   de son cercle → recadrage aligné au pixel sur la pochette dessous,
   seule la rotation le rend visible.
   Rien n'est affiché en pause ni si le template n'a pas d'image.

5. **Fermeture élargie + croix sous le header** (ajout 2026-08-01). Un
   tap sur les zones transparentes de l'image gramophone ferme le sheet
   (échantillonnage du canal alpha via canvas hors écran, construit au
   premier tap ; seuil alpha < 32 ; fail-open si canvas indisponible —
   cohérent avec le scrim). La croix descend sous le header haut :
   `top: calc(var(--safe-top) + var(--mobile-header-h) + 12px)`.

## Contraintes

- Mini-tuto vinyles : la tuile guidée doit garder `overflow: visible`
  (la main pointeuse est un `::after` — test existant le couvre).
- Aucun changement de save ni d'i18n (chiffres bruts, pas de libellé).

## Tests

- Compteur « 1 / 24 » rendu avec 1 vinyle possédé (total non codé en dur
  dans l'assertion : dérivé de `nombreVinylesEcoutables()`).
- Tests guide existants inchangés et verts.
