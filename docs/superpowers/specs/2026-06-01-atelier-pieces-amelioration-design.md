# Atelier — Pièces d'amélioration & démantèlement (design)

**Date :** 2026-06-01
**Branche cible :** à créer depuis `main` (post-merge de `feat/frame-item-stockage`)
**Statut :** spec validée, en attente du plan d'implémentation

## Contexte

Aujourd'hui, la restauration à l'atelier est **gratuite en monnaie** mais coûteuse en temps (durée variable selon l'état cible et les compétences). Le joueur n'a aucun moyen de "consommer" des objets sans les vendre ou les donner à la collection.

Cette spec introduit une économie de **pièces d'amélioration** consommables par la restauration, alimentée par une nouvelle action de **démantèlement**. Elle renforce les arbitrages tactiques (vendre / donner / restaurer / démanteler) et donne du poids aux objets en double ou de faible valeur marchande.

## Concept central

- Les **7 catégories** du jeu deviennent aussi **7 types de pièces d'amélioration** (1 type par catégorie).
- **Restaurer** un objet coûte des pièces de **sa catégorie**.
- **Démanteler** un objet en stock rend des pièces de **sa catégorie** ; l'objet est détruit.
- La **durée de restauration** est uniformisée à **7 jours** pour toute transition d'état (`Mauvais → Bon`, `Bon → Très bon`, `Très bon → Pristin état`).

## Économie

| Action | Formule | Plancher |
|---|---|---|
| Coût restauration | `Math.ceil(gain_prixRéfRéel / 5)` pièces de la catégorie | 1 |
| Rendement démantèlement | `Math.floor(prixRéfRéel_actuel / 5)` pièces de la catégorie | 1 |
| Durée restauration | 7 jours fixe (toutes transitions) | — |

`gain_prixRéfRéel` = `recalculerPrixReference(prix, étatActuel, étatCible) − prix`.

`prixRéfRéel_actuel` = `objet.prixReferenceReel` (cohérent avec l'affichage joueur, et corrèle naturellement le rendement à l'état actuel).

Les pièces sont **débitées au lancement** de la restauration (pas au retour de l'objet). En cas d'annulation impossible côté UI, ce comportement reste cohérent : le joueur a payé pour le chantier, pas pour son résultat.

### Exemple de calibration (objet base 100 €)

| Action | Calcul | Pièces |
|---|---|---|
| Démantelement Mauvais (30 €) | `floor(30/5)` | 6 |
| Démantelement Très bon (100 €) | `floor(100/5)` | 20 |
| Démantelement Pristin (140 €) | `floor(140/5)` | 28 |
| Restauration Mauvais → Bon (gain 30 €) | `ceil(30/5)` | 6 |
| Restauration Très bon → Pristin (gain 40 €) | `ceil(40/5)` | 8 |

## Data model

### Nouveau champ `GameState`

```ts
piecesAmelioration: Record<CategorieObjet, number>
```

- Initial : `{ Musique: 0, "Jeux & Loisirs": 0, "Livres & Papeterie": 0, Mode: 0, Maison: 0, "Objets d'art": 0, Bricolage: 0 }`.
- Pas de cap, valeurs illimitées.
- Stocké tel quel dans la sauvegarde localStorage.

### Migration des saves existantes

À l'hydratation : si `state.piecesAmelioration` est absent ou incomplet, le compléter avec `0` pour chaque catégorie manquante. Pas de fenêtre de migration, pas de wipe.

### Aucun changement sur `Objet`

La catégorie de l'objet (`o.categorie`) sert d'index dans `piecesAmelioration`. Aucun nouveau champ sur l'objet ou son template.

## Règles métier

### Démantelable

- L'objet est dans `state.inventaireJoueur`.
- L'objet n'est pas en restauration (`enRestauration` undefined).
- L'objet n'est pas en vitrine (n'apparaît pas dans `state.vitrine?.objets`).
- **Pas de prérequis de compétence.**
- L'action détruit définitivement l'objet et crédite les pièces de manière instantanée.

### Restaurable

Toutes les conditions actuelles inchangées :

- Objet non en restauration, état restaurable, slot d'atelier libre, compétence Réparer correspondante débloquée.

**Ajout :** disposer d'au moins `coutAmelioration(o, cible)` pièces de `o.categorie`.

### Compétence Réparer

Reste un prérequis (les pièces ne la remplacent pas). Une éventuelle refonte de l'arbre Atelier (réductions de coût, etc.) est hors-scope v1 — voir « Hors-scope ».

## API existante à modifier

| Fonction | Changement |
|---|---|
| `dureeRestauration(state, cat, cible)` (`src/lib/competences.ts`) | Retourne **7** systématiquement (durée uniformisée). |
| `atelierStatusPourObjet(state, o)` (`src/lib/atelier.ts`) | Ajoute un cas `disponible: false, raison: "Manque N pièce·s [catégorie]"` quand le solde est insuffisant. Évalué après les autres conditions. |
| `restaurerObjet(...)` (`GameContext`) | Vérifie le solde de pièces ; débite avant de poser `enRestauration` ; retourne `{ok: false, raison}` si insuffisant. |

### Nouvelles fonctions

- `coutAmelioration(o, cible)` → `number` : `max(1, ceil((recalculerPrixReference(o.prixReferenceReel, o.etat, cible) - o.prixReferenceReel) / 5))`.
- `rendementDemantelement(o)` → `number` : `max(1, floor(o.prixReferenceReel / 5))`.
- `peutDemanteler(state, objetId)` → `AtelierStatus` (raisons : déjà en restauration, en vitrine, introuvable).
- `demantelerObjet(objetId)` dans `GameContext` : validation + retrait de l'inventaire + crédit des pièces. Retourne `{ok, raison?, pieces?}`.

## UI page Atelier

### Bandeau supérieur — Inventaire de pièces

Placé **au-dessus** du bloc "Atelier LVL X" actuel (donc dans `StickyTop` ou juste sous, à arbitrer côté implémentation pour ne pas alourdir le sticky mobile).

- Rangée horizontale de **7 cases**, scrollable horizontalement si nécessaire (viewport 360 px → ~45 px par case avec gap).
- Chaque case = un **engrenage stylisé** (rendu graphique à finaliser plus tard — v1 = simple bordure circulaire + fond papier + emoji de la catégorie au centre).
- **Centre** : emoji de la catégorie (depuis `CompetenceTreeDef.emoji` : 🎵 🎲 📚 👕 🏠 🎨 🔧 — à confirmer pendant l'implémentation).
- **Sous** : nombre de pièces, typo `font-mono`, taille ~11px.

### Section "Restaurations possibles"

Inchangée structurellement, avec deux ajouts par ligne :

- Affichage du **coût en pièces** : `coût : N ⚙ [catégorie]`.
- Le **bouton "Lancer"** est désactivé si :
  - L'atelier est plein (existant)
  - Le solde de pièces est insuffisant → tooltip/sous-ligne `"Manque N pièce·s [catégorie]"`.

### Section nouvelle "Démantèlement"

Sous "Restaurations possibles" :

- Liste les objets en stock libre (hors restauration, hors vitrine) — peut être longue, scroll naturel de la page.
- Chaque ligne : nom, état, prix de référence, rendement (`rendement : N ⚙ [catégorie]`), bouton "Démanteler".
- **Confirmation** : modal `BottomSheet` rapide « Démanteler [nom] · gain N pièces [catégorie] · Action irréversible » avec bouton Annuler / Confirmer. Pas de double-tap inline (trop risqué pour une action destructive).
- Après démantèlement : flash `« [nom] démantelé · +N ⚙ [catégorie] »`.

## Tests à prévoir

- Démantèlement d'un objet à prix réf < 5 € rend bien 1 pièce (plancher).
- Restauration d'un objet à gain < 5 € coûte bien 1 pièce (plancher).
- Démantèlement refusé si objet en restauration.
- Démantèlement refusé si objet en vitrine (présent dans `vitrine.objets`).
- Pièces décrémentées exactement une fois au lancement de la restauration.
- Pièces non re-débitées au retour de l'objet (jour de fin).
- Restauration refusée si solde de pièces insuffisant, avec raison claire.
- Migration save sans `piecesAmelioration` → injection 0/catégorie, pas de crash, partie jouable.
- `dureeRestauration` retourne 7 quelle que soit la transition.

## Hors-scope v1

- Comptoir d'échange entre catégories (3 d'une cat → 1 d'une autre).
- Pièces à rareté variable (commun/rare/légendaire).
- Compétences "Frugalité / Récupération / Affûtage" qui modulent coûts et durées.
- Bonus de rendement explicite selon l'état démantelé (au-delà du naturel via `prixRéfRéel`).
- Démantèlement depuis la page Stockage (rester centré sur l'Atelier en v1).
- Rendu graphique final des engrenages (SVG dédiés, animations) — v1 = bordure + emoji.
- Refonte des compétences Atelier suite à l'ajout des pièces.

## Risques & points d'attention

- **Rythme** : démanteler un Pristin (28 pièces pour un objet base 100€) finance largement la restauration M→P d'un autre objet (15 pièces). Si trop généreux à l'usage, ajuster le divisor (de 5 vers 6 ou 7) sans changer la structure.
- **Affichage** : 7 engrenages sur 360 px de large = ~45 px/case. À tester avec emoji + nombre lisibles. Sinon → scroll horizontal accepté.
- **Sticky** : si on intègre les engrenages dans le `StickyTop`, attention au cumul de hauteurs (header + inventaire pièces + bloc LVL). Préférer mettre les engrenages **hors sticky** au-dessus de la section "Travaux en cours" si la hauteur cumulée dépasse ~140 px.
