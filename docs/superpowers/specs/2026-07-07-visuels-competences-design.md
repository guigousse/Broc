# Visuels de compétences — style réclame années 1920

**Date** : 2026-07-07 · **Statut** : phase 1 (test de style) validée à l'oral, en cours

## But

Donner à chaque compétence un visuel carré (1:1), sans texte, dans le style des
affiches publicitaires françaises des années 1920, pour enrichir l'écran
Bibliothèque (arbres de compétences).

## Périmètre cible : 24 visuels

- **12 pour l'arbre Général** : 4 branches (Négociation, Charisme, Présentation,
  Vision du marché) × 3 paliers, chacun son visuel propre.
- **12 pour les branches thématiques** : 4 branches (Réparer, Connaisseur,
  Passion, Œil aiguisé) × 3 paliers, **partagés entre les 7 catégories**
  (les compétences thématiques sont identiques d'une catégorie à l'autre).

## Décisions

- **Sans texte** : visuels purement picturaux ; le nom de la compétence reste en
  HTML. Zéro risque d'orthographe générée, et le partage inter-catégories reste
  possible.
- **Format carré 1:1**, génération Gemini (pipeline existante à terme).
- **Phase 1 — test de style avant tout** : 3 images de la même compétence témoin
  (*Négociation*, arbre Général) dans 3 écoles :
  1. **Cappiello** — personnage théâtral détouré sur fond uni saturé ;
  2. **Cassandre / Art déco géométrique** — aplats nets, formes stylisées ;
  3. **Lithographie douce** — grain crème, palette sépia/vert forêt proche du
     style maison existant (`STYLE_BRIEF_BASE` de `scripts/generate-qg-images.mjs`).

  Générées via un script jetable (le brief maison préfixé par
  `generate-qg-images.mjs` contaminerait les styles testés), sorties non
  commitées. Guillaume tranche, puis on écrit le plan des 24 (palette commune,
  cadre récurrent, iconographie par branche/palier) — hors périmètre de cette
  phase.

## Phase 2 (après choix du style — à planifier)

- Prompts définitifs des 24 visuels, intégrés à la pipeline
  (`scripts/qg-prompts.json` ou fichier dédié + sortie `public/competences/`).
- Intégration UI dans `src/app/bibliotheque/page.tsx` (vignettes de paliers
  et/ou sheet de détail).
