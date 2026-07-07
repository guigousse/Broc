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
- **RÉVISION 2026-07-07 (retour Guillaume sur la série v1)** :
  - **Plein cadre** : l'illustration remplit **tout le carré, bord à bord** —
    aucune marge parchemin, aucun vide autour du sujet ; le décor s'étend
    au-delà des quatre bords (cadrage coupé).
  - **Pas de cadre incrusté** : les assets sont livrés **sans cadre** ; le
    cadre Art déco sera posé **ultérieurement par-dessus** (overlay, côté UI).
    `scripts/competences-frame.svg` est conservé pour cet usage futur mais
    n'est plus composité par le pipeline.
  - **Gradation renforcée** : la progression palier 1 → 3 d'une même branche
    doit se *sentir* immédiatement — palier 1 modeste/épuré/lumière pâle du
    matin, palier 2 confirmé/plus riche/lumière chaude, palier 3 apothéose
    dorée/abondance/triomphe. Chaque prompt porte explicitement son cran.

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
  `public/competences/{id}.webp` **sans cadre, plein cadre bord à bord**.
- Cadre : asset unique versionné (`scripts/competences-frame.svg`) réservé à
  l'overlay UI futur — plus composité dans les assets.
- Nommage : `general.{branche}.{palier}.webp` et `theme.{branche}.{palier}.webp`.

## Hors périmètre (chantiers suivants)

- Intégration UI dans `src/app/bibliotheque/page.tsx` (vignettes + sheet de détail).
- Historique phase 1 : test de style (3 images témoin *Négociation*) réalisé le
  2026-07-07 via script jetable, artifact de comparaison partagé, option III retenue.
