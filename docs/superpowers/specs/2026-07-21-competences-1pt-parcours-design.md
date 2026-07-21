# Compétences à 1 pt, plafond de points, parcours & fiches déblocage — design

**Date** : 2026-07-21
**Statut** : validé par Guillaume

## Objectif

Simplifier l'économie des points de compétence (1 pt par palier, plus aucun
point gagné une fois l'arbre entier payable), grossir les pastilles de niveau
du parcours pour que le texte tienne entier, et offrir une fiche
description/effet au tap sur chaque ligne du parcours de déblocage.

## 1. Coût unique : 1 point par palier — `src/data/competences.ts`

- `PALIER_DEFAULTS` : coûts 1/2/3 → **1/1/1**. Les 96 paliers (8 arbres ×
  branches × 3 paliers) utilisent tous les défauts (vérifié : coût total
  actuel 192 = 32 branches × (1+2+3)) — aucun override explicite à toucher.
- Les verrous de niveau des paliers (`niveauBrocanteurRequis` : 0/N10/N30)
  ne changent PAS.
- Coût total de l'arbre après refonte : **96 pts**.

## 2. Plafond de points « à vie » — `src/lib/xp.ts` + chapitres

- Nouvelle constante **dérivée des données** (pas codée en dur) :
  `COUT_TOTAL_COMPETENCES` = Σ `coutPoints` de tous les paliers (= 96).
  Exportée depuis `src/data/competences.ts`.
- Règle : `points gagnés à vie` = `pointsDisponibles` + `points dépensés`
  (après refonte, dépensés = nombre de compétences débloquées × 1). Aucun
  octroi ne peut porter ce total au-delà de `COUT_TOTAL_COMPETENCES`.
- `appliquerGainXPBrocanteur(b, gain, pointsDepenses)` : nouveau paramètre ;
  l'octroi de `POINTS_PAR_NIVEAU` par niveau franchi est écrêté par le
  plafond. Tous les points d'appel passent `state.competencesDebloquees.length`.
- Même écrêtage pour `POINTS_BONUS_CHAPITRE` (2 pts) à la livraison d'un
  chapitre de la trame (les deux octrois de `src/lib/quetes/principales.ts`
  et tout autre point d'octroi direct).
- **XP et niveaux inchangés** : la courbe continue jusqu'à
  `NIVEAU_BROCANTEUR_MAX = 100` ; seuls les points s'arrêtent.
- Note de bas de page du parcours (`sheets.chaqueNiveauPoint`, FR/EN/ES) :
  « Chaque niveau : +1 point de compétence » → « Chaque niveau : +1 point de
  compétence, tant qu'il reste des compétences à débloquer » (adapté EN/ES).

## 3. Migration des saves — `src/lib/migrations.ts`

Nouveau pas de migration (version suivante du schéma) :

1. **Remboursement** : pour chaque compétence débloquée, recréditer
   `(ancien coût − 1)` où l'ancien coût = numéro du palier (P1=1, P2=2,
   P3=3, extrait de la définition de la compétence).
2. **Écrêtage** : après remboursement,
   `pointsDisponibles ← min(pointsDisponibles, COUT_TOTAL_COMPETENCES − nbDebloquees)`
   (jamais négatif).

## 4. Parcours : pastilles plus grosses — `ParcoursSheet.tsx`

- Pastille « atteint »/« à venir » : 34 → **48 px** (fontSize 11 → 13).
- Pastille « prochain » : 40 → **56 px** (fontSize 13 → 15).
- Colonne du rail : 52 → **64 px**.
- Objectif : « Niv. 100 » (le plus long) tient entier dans le cercle, sans
  chevauchement ni retour à la ligne.

## 5. Fiche de déblocage au tap — `ParcoursSheet.tsx` + données + i18n

- Chaque ligne de déblocage devient un `<button>` ; au tap, petite fenêtre
  modale par-dessus la sheet (scrim + carte, style des overlays existants,
  fermeture ✕/scrim/Échap) affichant : titre, « Niveau {n} », statut
  (débloqué ✓ si `niveau <= niveauCourant`, sinon « À venir »), et
  **description de l'effet**.
- Données : `DeblocageNiveau` gagne un champ `description: string` (FR),
  rédigé d'après les effets réels en code :
  - écran Compétences (N1), quêtes quotidiennes/hebdo, paliers 2 (N10),
    paliers 3 (N30) ;
  - les 6 atouts (effet concret de chacun, à extraire de leurs
    implémentations : flair, lot garni, fouille, boniment, tchatche, criée) ;
  - 2ᵉ/3ᵉ usages : description générique « +1 usage par jour » adaptée.
- i18n : overlays `titre` existants dans `contenu/{en,es}/deblocages.ts` —
  y ajouter `description` (même mécanique de lookup par titre FR ou par clé,
  suivre le pattern en place) ; nouvelle fonction `descriptionDeblocage(dep, locale)`.

## 6. Simulateur d'équilibrage

`niveauSim` (ou la sonde de calibration) peut supposer les coûts 1/2/3 —
vérifier et aligner sur le coût unique (sans re-calibrer la courbe d'XP).

## Hors périmètre (YAGNI)

- Aucune retouche de la courbe d'XP ni des gates N10/N30.
- Pas de refonte de l'écran Compétences (PalierOverlay existant inchangé,
  hormis l'affichage du coût qui suit les données).
- Pas d'historique des points ni d'UI « points à vie ».

## Tests

- Données : coût total = 96 ; chaque palier coûte 1.
- xp : écrêtage au plafond (niveau qui franchit le plafond → octroi partiel
  puis nul ; bonus chapitre écrêté ; XP/niveau continuent après 96 pts).
- Migration : remboursement (P2 → +1, P3 → +2), écrêtage post-remboursement,
  idempotence.
- ParcoursSheet : tap sur une ligne → fiche avec titre + description ;
  fermeture ; statut débloqué/à venir.
