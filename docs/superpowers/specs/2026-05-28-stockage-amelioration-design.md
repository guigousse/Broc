# Stockage — amélioration payante + capacité stricte

**Date :** 2026-05-28
**Branche cible :** `feat/stockage-amelioration`

## Objectif

À l'instar de l'atelier, le stockage devient **explicitement amélioré** par le joueur (LVL1 → LVL4), avec un coût. La capacité du tier est **strictement appliquée** : on ne peut pas acheter dans une brocante si le stockage est plein, ni retirer une donation. Les items en vitrine continuent de compter dans le stockage.

## 1. Données

**Fichier :** `src/data/stockage.ts`

Réécrire `STOCKAGE_TIERS` :

```ts
export const STOCKAGE_TIERS: readonly StockageTier[] = [
  { niveau: 1, nom: "Garage", capaciteMax: 10, loyerHebdo: 10 },
  { niveau: 2, nom: "Cave aménagée", capaciteMax: 25, loyerHebdo: 25 },
  { niveau: 3, nom: "Hangar", capaciteMax: 50, loyerHebdo: 50 },
  { niveau: 4, nom: "Entrepôt", capaciteMax: 100, loyerHebdo: 100 },
];
```

Ajouter :

```ts
export interface StockageUpgrade {
  niveauActuel: 1 | 2 | 3;
  niveauCible: 2 | 3 | 4;
  cout: number;
}

export const STOCKAGE_UPGRADES: readonly StockageUpgrade[] = [
  { niveauActuel: 1, niveauCible: 2, cout: 100 },
  { niveauActuel: 2, niveauCible: 3, cout: 250 },
  { niveauActuel: 3, niveauCible: 4, cout: 500 },
] as const;

export function getStockageTierParNiveau(niveau: 1 | 2 | 3 | 4): StockageTier {
  return STOCKAGE_TIERS[niveau - 1];
}

export function getProchaineUpgradeStockage(
  niveau: 1 | 2 | 3 | 4,
): StockageUpgrade | null {
  if (niveau === 1) return STOCKAGE_UPGRADES[0];
  if (niveau === 2) return STOCKAGE_UPGRADES[1];
  if (niveau === 3) return STOCKAGE_UPGRADES[2];
  return null;
}
```

**L'ancienne fonction `getStockageTier(nbObjets)` est conservée** (utilisée potentiellement ailleurs) mais ne sera plus l'API préférée. On peut la marquer `@deprecated`. Pour MVP, on la garde sans tag.

## 2. Helpers capacité

**Fichier nouveau :** `src/lib/stockage.ts`

```ts
import type { GameState } from "@/types/game";
import { getStockageTierParNiveau } from "@/data/stockage";

export function totalEnStock(state: GameState): number {
  return (
    state.inventaireJoueur.length + (state.vitrine?.objets.length ?? 0)
  );
}

export function getCapaciteStockage(state: GameState): number {
  return getStockageTierParNiveau(state.niveauStockage).capaciteMax;
}

export function stockageEstPlein(state: GameState): boolean {
  return totalEnStock(state) >= getCapaciteStockage(state);
}

export function placeRestante(state: GameState): number {
  return Math.max(0, getCapaciteStockage(state) - totalEnStock(state));
}
```

## 3. Types

**Fichier :** `src/types/game.ts`

Ajouter sur `GameState` :

```ts
/** Niveau du stockage (1 à 4). Détermine capacité et loyer. */
niveauStockage: 1 | 2 | 3 | 4;
```

## 4. GameContext

**Fichier :** `src/context/GameContext.tsx`

- `nouvellePartie()` : init `niveauStockage: 1`.
- `migrerSauvegarde` : `niveauStockage` ∈ {1,2,3,4} sinon 1.
- Nouvelle action `ameliorerStockage()` (identique à `ameliorerAtelier`, basée sur `getProchaineUpgradeStockage`).
- **`avancerJour` : changer le calcul du loyer** : remplacer `getStockageTier(inv.length)` par `getStockageTierParNiveau(prev.niveauStockage)`.
- **`ajouterObjet`** (utilisé par les achats chiner) : si stockage plein → retourner sans rien faire. Pour permettre au caller de réagir, on peut soit garder le silence (l'UI bloque déjà), soit retourner un boolean. Décision : pour MVP, garder la signature `void` mais ne rien faire si plein. L'UI Chiner empêche déjà l'achat — `ajouterObjet` reste un garde-fou silencieux.
- **`retirerDeCollection`** : ajouter en premier check :
  ```ts
  if (stockageEstPlein(current))
    return { ok: false, raison: "Stockage plein." };
  ```

## 5. UI Stockage

**Fichier :** `src/app/stockage/page.tsx`

- Header / sticky : remplacer `getStockageTier(inv.length)` par `getStockageTierParNiveau(state.niveauStockage)`. Le calcul de `ratio` utilise `totalEnStock(state) / tier.capaciteMax`.
- Affichage `x / cap obj.` montre `totalEnStock` (inclut vitrine).
- Si stockage plein : barre vermillon (déjà le cas avec `ratio >= 1`).
- Ajouter un bloc "Améliorer le stockage" identique à celui de l'atelier (`getProchaineUpgradeStockage`, bouton `Améliorer (LVL X · Y €)`), placé juste sous le StickyTop ou au tout début du body — décision : tout début du body, comme atelier.

## 6. UI Atelier

**Fichier :** `src/components/mobile/QgEtatDesLieux.tsx`

Ligne Stockage : utiliser `getStockageTierParNiveau(state.niveauStockage)` + `totalEnStock(state)` au lieu de `getStockageTier(inv.length)`.

## 7. UI Chiner (brocante)

**Fichier :** `src/app/chiner/[brocanteId]/ClientPage.tsx`

- Calculer `plein = stockageEstPlein(state)`.
- Sur chaque item de la liste : bouton d'achat / d'offre **disabled** si `plein`. Visuel grisé (opacity 0.5).
- Au-dessus du bouton "Finir la session" (ou équivalent) : si `plein`, afficher une bande "STOCKAGE PLEIN" en vermillon.

## 8. UI Collection

**Fichier :** `src/app/collection/page.tsx`

Sur chaque slot avec donation : bouton "Retirer" disabled si `plein`. Tooltip ou flash "Stockage plein".

## 9. Hors-scope

- Items en restauration : restent dans `inventaireJoueur` (et donc comptent dans le stockage). Pas de bouton "récupérer" à ajouter.
- Items en vitrine : comptés via `totalEnStock`.
- Bloc dur sur `mettreEnVitrine` : non nécessaire (déplacement intra-stock).
- Migration : pour les saves anciennes, `niveauStockage = 1`. Si le joueur avait beaucoup d'objets et son tier auto était haut, il se retrouve LVL1 avec un loyer faible mais potentiellement en surcharge. **Solution** : pendant la migration, prendre `niveauStockage` initial = `getStockageTier(inv.length).niveau`, pour préserver la situation existante. Donc : `niveauStockage = niveauActuelAuto`.

## Critères d'acceptation

- [ ] Nouvelle partie : `niveauStockage = 1`, capacité 10.
- [ ] Save existante : niveau migré au tier auto correspondant à l'inventaire.
- [ ] Loyers : 10 / 25 / 50 / 100 €/sem selon niveau.
- [ ] Bouton "Améliorer le stockage" affiche LVL 2 (100€) / LVL 3 (250€) / LVL 4 (500€) puis "Maximum".
- [ ] Capacité affichée = `totalEnStock` (inventaire + vitrine).
- [ ] Stockage plein : impossible d'acheter dans une brocante (items grisés + message).
- [ ] Stockage plein : impossible de `retirerDeCollection`. Bouton grisé.
- [ ] Possible d'échanger un don en collection (différents états) — déjà géré par `donnerACollection` qui retire l'ancien et ajoute le nouveau (net-zéro).
- [ ] `npx tsc --noEmit` 0 erreur ; `npm run build` succès.

## Fichiers touchés

**Création** :
- `src/lib/stockage.ts`

**Modification** :
- `src/data/stockage.ts` (tiers + upgrades + helper niveau)
- `src/types/game.ts` (niveauStockage)
- `src/context/GameContext.tsx` (init, migration, ameliorerStockage, avancerJour loyer, retirerDeCollection check, ajouterObjet check)
- `src/app/stockage/page.tsx` (UI capacité + bloc upgrade)
- `src/components/mobile/QgEtatDesLieux.tsx` (ligne Stockage : niveau + totalEnStock)
- `src/app/chiner/[brocanteId]/ClientPage.tsx` (disable + message)
- `src/app/collection/page.tsx` (disable retirer)
