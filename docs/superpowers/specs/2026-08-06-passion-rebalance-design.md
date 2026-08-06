# Rééquilibrage de la branche Passion : +5 / +10 / +20 %

**Date** : 2026-08-06 · **Statut** : validé par Guillaume

## Décision

Les trois paliers Passion (par catégorie) passent de +10/+20/+30 % à
**+5/+10/+20 %** sur le prix payé par les clients (et, mécaniquement, sur
l'extension du plafond de bourse en vitrine, qui réutilise le même bonus).

## Points touchés

- `src/lib/competences.ts` — `bonusPassionCategorie` : `0.05 / 0.10 / 0.20`
  (seul point de calcul ; la vitrine en découle). `aSpecialisteCategorie`
  (« équivaut à palier ≥ 2 », sans usage actif) passe de `>= 0.20` à
  `>= 0.10` pour conserver la sémantique documentée.
- `src/data/competences.ts` — descriptions FR de `branchePassion`.
- `src/lib/i18n/contenu/{en,es,el}/competences.ts` — descriptions traduites
  des paliers `passion.1/2/3`.
- `src/lib/competences.test.ts` — assertions de valeurs.

## Hors périmètre

- Aucune migration de save : les compétences débloquées sont stockées par id.
- Les autres branches (Œil aiguisé +10/+20/+30 en négo) ne bougent pas.
