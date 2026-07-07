# Visuels de compétences — style réclame années 1920

**Date** : 2026-07-07 · **Statut** : design validé (style + cadre), plan des 24 à écrire

## But

Donner à chaque compétence un visuel carré (1:1), sans texte, dans l'esprit des
publicités illustrées des années 1920, pour enrichir l'écran Bibliothèque
(arbres de compétences).

## Périmètre : 24 visuels

- **12 pour l'arbre Général** : 4 branches (Négociation, Charisme, Présentation,
  Vision du marché) × 3 paliers, chacun son visuel propre.
- **12 pour les branches thématiques** : 4 branches (Réparer, Connaisseur,
  Passion, Œil aiguisé) × 3 paliers, **partagés entre les 7 catégories** —
  les objets représentés doivent donc rester génériques « brocante »
  (pendule, vase, chaise…), jamais liés à une catégorie précise.

## Décisions validées

- **Sans texte** : visuels purement picturaux ; le nom de la compétence reste en
  HTML. (Décision 2026-07-07.)
- **Style : lithographie douce** (option III du test de style, choisie par
  Guillaume le 2026-07-07 parmi Cappiello / Cassandre / litho) : trait d'encre,
  lavis sépia et vert forêt, parchemin crème, lumière chaude — c'est la
  continuité du style maison (`STYLE_BRIEF_BASE` de
  `scripts/generate-qg-images.mjs`), donc la pipeline existante convient telle
  quelle côté rendu.
- **Cadre identique incrusté** : la génération IA ne reproduit jamais deux fois
  le même cadre → les scènes sont générées **sans cadre** (marge parchemin
  simple), puis un **cadre Art déco unique** (dessiné une fois, déterministe)
  est composité par le pipeline (sharp) sur les 24 images. Les fichiers livrés
  sont autonomes et strictement identiques côté cadre.

## Iconographie (schéma directeur)

Un même sujet par branche, enrichi à chaque palier (palier 1 sobre → palier 3
apothéose), cadrage et échelle constants pour une lecture en série.

| Branche | Sujet | Distinction clé |
|---|---|---|
| Négociation (G) | le marchand en tractation face au client | l'éloquence, la joute verbale |
| Charisme (G) | l'étal et la foule qu'il attire | l'affluence croissante |
| Présentation (G) | lire le client (visage, bourse) | le regard porté sur la personne |
| Vision du marché (G) | gazette, météo, mondanités | l'information, le monde extérieur |
| Réparer (T) | l'établi, l'objet en restauration | le geste artisanal |
| Connaisseur (T) | l'objet examiné (loupe, catalogue) | le regard porté sur l'objet |
| Passion (T) | le collectionneur épris de sa pièce | l'émotion, l'attachement |
| Œil aiguisé (T) | la tractation autour d'un objet précis | négociation centrée sur l'objet |

Les paires proches (Négociation/Œil aiguisé, Présentation/Connaisseur) se
distinguent par ce sur quoi porte l'attention : la personne vs l'objet.

## Mécanique de production

- Prompts dans un fichier dédié (`scripts/competences-prompts.json`), généré via
  la pipeline Gemini (modèle pro, 1:1, brief maison), sortie
  `public/competences/{id}.webp` après composite du cadre.
- Cadre : asset unique versionné (SVG déterministe, filets + coins Art déco,
  encre/or sur transparent), appliqué par sharp.
- Nommage : `general.{branche}.{palier}.webp` et `theme.{branche}.{palier}.webp`.

## Hors périmètre (chantiers suivants)

- Intégration UI dans `src/app/bibliotheque/page.tsx` (vignettes + sheet de détail).
- Historique phase 1 : test de style (3 images témoin *Négociation*) réalisé le
  2026-07-07 via script jetable, artifact de comparaison partagé, option III retenue.
