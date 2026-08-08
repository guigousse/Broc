# Audit compétences 2026-08-06 — décisions de design

Suite à l'audit du système de compétences (rapport artifact : redondances,
équilibrage, alternatives), quatre décisions validées par Guillaume.
Constat central : 23/96 points (24 %) achetaient la même statistique de
tolérance de négociation, côté vente uniquement, sans jamais relever le
plafond payé — et aucune compétence permanente n'agissait sur les prix
d'achat en chine.

## R1 — La branche thématique « Œil aiguisé » devient « Marchandage »

- Les paliers `cat.<Cat>.oeil_aiguise.1-3` (Verbe agile/haut/or, tolérance
  vente +10/20/30 % — doublon de Négociation P1-P2 générale) sont remplacés
  par `cat.<Cat>.marchandage.1-3` :
  - P1 « Marchandeur » : plancher vendeur −4 points de % (du prix affiché)
  - P2 « Fin marchandeur » : −8 pts de % (remplace P1)
  - P3 « Roi du marchandage » : −12 pts de % (remplace P2)
- Application à l'OUVERTURE de la négociation d'achat (cible secrète
  réduite), jamais dans `instancier()` — pas d'accès au state à la
  génération. `plancher = max(1, prixMinAccept − round(prixVendeur × bonus))`.
- La tolérance de négociation vente redevient l'exclusivité de
  Négociation P1-P2 générale (+20/40 %, inchangée).
- Migration v18 : ids legacy retirés AVANT la purge générique (sinon reset
  total des compétences), remboursement au barème payé (1/2/3 pour saves
  v9-14, 1 pour v15-17, recalc pour <v9), écrêtage à vie inchangé.
- Les 3 visuels `theme.oeil_aiguise.*.webp` sont réutilisés tels quels
  (renommés `theme.marchandage.*.webp`).
- Effet de bord voulu : les collisions de noms disparaissent — « Verbe
  haut/d'or » et « Œil aiguisé » ne désignent plus qu'une seule chose chacun.

## R2a — Hiérarchie Diplomate / Boniment rétablie

- Diplomate (Négociation P3, 3 pts, N30) : après révélation du plafond, la
  dernière offre est acceptée jusqu'à **110 %** du plafond révélé
  (`DIPLOMATE_MARGE = 1.10`).
- Le Boniment (atout N20) : closing à **105 %** du plafond tant que le
  2ᵉ usage n'est pas atteint (N50), **115 %** ensuite (`margeBoniment`).

## R3 — Le Flair v2

- Si la cote de l'objet est déjà connue (Connaisseur P3 sur la catégorie,
  ou Flair déjà joué dessus), le Flair révèle à la place le **prix plancher
  du vendeur** (`prixMinAccept`). Bloqué seulement quand cote ET plancher
  sont connus. Synergie voulue avec la branche Marchandage.

## R4 — Charisme P1 : assumé tel quel (aucun changement)

## R5 — Estimateur de bourse enrichi

- Le palier (Présentation P2) affiche en plus les catégories préférées et
  évitées du client dans la fiche de négociation (données déjà présentes
  dans le persona).

Invariants : `COUT_TOTAL_COMPETENCES` reste 96 (3 paliers ↔ 3 paliers) ;
chiffres identiques dans les 4 langues ; jamais de chaîne localisée en save.
