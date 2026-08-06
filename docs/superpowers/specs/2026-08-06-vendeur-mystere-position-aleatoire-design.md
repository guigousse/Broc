# Vendeur mystère : position aléatoire dans le deck de chine

**Date** : 2026-08-06 · **Statut** : validé par Guillaume

## Problème

Quand le vendeur mystère (boîte mystère) apparaît en brocante, sa slide est
toujours insérée en tête du deck (`ClientPage.tsx`, construction de `slides` :
`liste.push({ kind: "mystere" })` avant la boucle des objets). L'apparition est
donc prévisible : dès la première carte, le joueur sait s'il est là. On perd
l'effet de surprise.

## Décision

La slide mystère est insérée à une **position aléatoire uniforme** parmi les
N+1 positions possibles (avant le premier objet, entre deux objets, ou après le
dernier), tirée **une seule fois** au moment où le vendeur apparaît.

## Conception

- Nouvelle fonction pure dans `src/lib/boiteMystere.ts` :
  `tirerPositionVendeur(nbItems: number, rng: () => number = Math.random): number`
  → entier uniforme dans `[0, nbItems]`. RNG injectable pour les tests.
- Dans `ClientPage.tsx`, le state `vendeurPresent: boolean` devient (ou est
  complété par) une position : au moment du tirage d'apparition réussi, on tire
  aussi la position avec le nombre d'objets de la session et on la stocke.
- Le `useMemo` des slides insère `{ kind: "mystere" }` à
  `Math.min(position, liste.length)` (clamp : la liste peut rétrécir quand des
  objets passent en statut « refuse »). La position ne bouge pas entre
  re-renders car elle est en state, pas retirée dans le memo.

## Hors périmètre

- Aucun changement de save, de probabilité d'apparition, ni du contenu de la
  boîte.
- Pas d'ancrage sur un objet précis (approche écartée : plus de code pour un
  gain imperceptible).

## Tests

- `tirerPositionVendeur` : bornes incluses (0 et N atteignables), uniformité de
  principe via rng stubé, N = 0 → 0.
- Slides : la slide mystère apparaît à la position stockée ; clamp quand la
  liste est plus courte que la position tirée.
