# Vendeurs nommés + 4 nouvelles personnalités (mode chinage)

**Date** : 2026-07-03
**Statut** : validé par Guillaume

## Objectif

Donner un nom fixe à chaque archétype de vendeur du mode chinage (affiché dans le
tiroir de négociation, qui montre aujourd'hui « Un vendeur » en dur), et ajouter
4 nouvelles personnalités — dont un spécialiste introduisant une mécanique
d'affinité de catégorie.

## 1. Noms fixes

Un nom par archétype (modèle « un personnage = une tête »), nouveau record
`NOM_VENDEUR` dans `src/lib/personas.ts`. `NOM_ARCHETYPE` (rôle : « Le Naïf »…)
est conservé tel quel.

| Archétype | Nom |
|---|---|
| naif | P'tit Lucien |
| bonhomme | Dédé la Bretelle |
| mamie | Mamie Odette |
| malin | Anatole la Combine |
| grincheux | Père Anselme |
| antiquaire | Madame Vasseur |
| pipelette 🆕 | Tata Monique |
| videcave 🆕 | Jeannot Vide-Cave |
| bonimenteur 🆕 | Oscar la Tchatche |
| disquaire 🆕 | Barnabé 33-Tours |

Affichage : la plaque du `ChineNegoDrawer` (`src/components/mobile/chine/ChineNegoDrawer.tsx`,
actuellement « Un vendeur ») affiche `NOM_VENDEUR[persona.archetype]`, avec
fallback « Un vendeur » si l'archétype est inconnu.

## 2. Nouveaux archétypes

`VendeurArchetypeId` (dans `src/types/game.ts`) étendu avec :
`pipelette`, `videcave`, `bonimenteur`, `disquaire`.

Stats (médianes, jitter ±10 % existant conservé) :

| Archétype | margePct | elanPct | patience | tolerancePct | sangFroid |
|---|---|---|---|---|---|
| pipelette | 0.55 | 0.30 | 6 | 0.85 | 0.98 |
| videcave | 0.70 | 0.80 | 2 | 0.85 | 0.70 |
| bonimenteur | 0.65 | 0.40 | 4 | 0.60 | 0.75 |
| disquaire | 0.15 | 0.35 | 5 | 0.40 | 0.90 |

Poids de tirage par tier (`POIDS_PAR_TIER`) :

| Archétype | t1 | t2 | t3 | t4 |
|---|---|---|---|---|
| pipelette | 14 | 8 | 3 | 1 |
| videcave | 10 | 8 | 3 | 0 |
| bonimenteur | 6 | 10 | 8 | 4 |
| disquaire | 0 | 0 | 0 | 0 (spawn uniquement via affinité) |

Biais d'ambiance additionnels (`BIAIS_AMBIANCE`) : Familial → pipelette +6 ;
Vinyle → disquaire +10 (s'ajoute au bonus d'affinité).

## 3. Mécanique d'affinité de catégorie

Nouvelle structure dans `personas.ts` :

```ts
const AFFINITE_CATEGORIE: Partial<Record<VendeurArchetypeId, {
  categorie: CategorieObjet;
  boostPoids: number;    // bonus additif de poids quand l'objet matche
  facteurCoteMin: number; // plancher du facteur prix aléatoire (connaît la cote)
}>> = {
  disquaire: { categorie: "Musique", boostPoids: 25, facteurCoteMin: 0.95 },
};
```

- `tirerPersonaVendeur(brocante, categorie)` reçoit désormais la catégorie de
  l'objet ; le `boostPoids` s'ajoute au poids de l'archétype si la catégorie
  matche. Sans match, le poids reste celui du tier (0 pour le disquaire →
  il n'apparaît que sur des objets Musique).
- **Connaissance de la cote** : dans `instancier()` (`src/lib/chine.ts`), le
  facteur vendeur aléatoire (0.6–1.4) est plancher à `facteurCoteMin` pour un
  spécialiste sur sa catégorie → jamais de pépite sous-cotée chez lui.

La structure est générique pour ajouter plus tard d'autres spécialistes
(Jeux & Loisirs, Livres & Papeterie, Mode…).

## 4. Prix gonflé du bonimenteur

Dans `instancier()`, le persona est tiré **avant** le calcul de `prixVendeur`
(réordonnancement ; l'affinité a de toute façon besoin de la catégorie, pas du
prix). Si `archetype === "bonimenteur"`, le prix affiché est multiplié par
**1.35**. Son `prixMinAccept` reste dérivé du prix gonflé via sa marge 0.65 →
plancher ≈ 47 % du prix affiché. Effet gameplay : payer sans négocier = se faire
avoir (~+35 % du juste prix) ; négocier fort = vraie affaire.

Constante exportée : `SURCOTE_BONIMENTEUR = 1.35`.

## 5. Illustrations

8 fichiers attendus dans `public/personas/` :
`vendeur-pipelette.webp`, `vendeur-pipelette-fache.webp`, `vendeur-videcave.webp`,
`vendeur-videcave-fache.webp`, `vendeur-bonimenteur.webp`,
`vendeur-bonimenteur-fache.webp`, `vendeur-disquaire.webp`,
`vendeur-disquaire-fache.webp`.

Ils seront générés par Guillaume (même style aquarelle rétro). En attendant,
`getVendeurIllustration()` / `getVendeurIllustrationFache()` retombent sur
`/personas/vendeur-mystere.webp` pour tout archétype dont le fichier n'existe
pas encore (mapping explicite ; pas de test d'existence de fichier à l'exécution).

Pistes visuelles (pour la génération) : Tata Monique = dame ronde et souriante,
gilet coloré ; Jeannot = quadra débraillé devant ses cartons ; Oscar = bagout de
forain, veste voyante ; Barnabé = binocles, gilet en laine, vinyle à la main.

## 6. Tests

- `personas.test.ts` : `NOM_VENDEUR` défini et unique pour les 10 archétypes ;
  les 4 nouveaux présents dans `PERSONAS_VENDEUR_BASE` et `POIDS_PAR_TIER`.
- Affinité : `tirerPersonaVendeur` ne sort jamais `disquaire` sur une catégorie
  ≠ Musique ; le sort avec une fréquence significative sur Musique.
- `chine.test.ts` : surcote bonimenteur appliquée ; facteur de cote plancher
  ≥ 0.95 pour un disquaire sur Musique.

## Hors périmètre

- Les autres spécialistes (Kiki la Manette, Père Firmin, Rosalie Petites-Mains)
  — la structure les permet, ils ne sont pas ajoutés.
- Phrases d'ambiance par vendeur (modèle « nom + phrase » écarté).
- Tout changement côté clients (mode vente).
