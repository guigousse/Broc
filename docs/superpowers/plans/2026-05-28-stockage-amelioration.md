# Stockage Amélioration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rendre le stockage explicitement améliorable (LVL1→4, capacités 10/25/50/100, coûts 100/250/500€, loyers 10/25/50/100€/sem) avec capacité stricte (achat brocante et retrait collection bloqués quand plein).

**Architecture :** Pattern identique à l'atelier. Nouveau champ `GameState.niveauStockage`, helpers dans `src/lib/stockage.ts` (`totalEnStock` somme inventaire + vitrine), garde-fous dans GameContext (`ajouterObjet`, `retirerDeCollection`), bouton upgrade sur la page Stockage, items grisés + message "STOCKAGE PLEIN" sur la page Chiner.

**Spec :** `docs/superpowers/specs/2026-05-28-stockage-amelioration-design.md`

---

### Task 1 : Types + data + helpers (inline batch)

**Files :**
- Modify : `src/types/game.ts`
- Modify : `src/data/stockage.ts`
- Create : `src/lib/stockage.ts`

- [ ] **Step 1 : Ajouter `niveauStockage` à GameState**

Dans `src/types/game.ts`, dans l'interface `GameState`, juste après `niveauAtelier: 1 | 2 | 3;`, ajouter :

```ts
  /** Niveau du stockage (1 à 4). Détermine capacité et loyer. */
  niveauStockage: 1 | 2 | 3 | 4;
```

- [ ] **Step 2 : Réécrire `src/data/stockage.ts`**

Remplacer intégralement par :

```ts
export interface StockageTier {
  niveau: 1 | 2 | 3 | 4;
  nom: string;
  capaciteMax: number;
  loyerHebdo: number;
}

export const STOCKAGE_TIERS: readonly StockageTier[] = [
  { niveau: 1, nom: "Garage", capaciteMax: 10, loyerHebdo: 10 },
  { niveau: 2, nom: "Cave aménagée", capaciteMax: 25, loyerHebdo: 25 },
  { niveau: 3, nom: "Hangar", capaciteMax: 50, loyerHebdo: 50 },
  { niveau: 4, nom: "Entrepôt", capaciteMax: 100, loyerHebdo: 100 },
];

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

export function getStockageTier(nbObjets: number): StockageTier {
  for (const tier of STOCKAGE_TIERS) {
    if (nbObjets <= tier.capaciteMax) return tier;
  }
  return STOCKAGE_TIERS[STOCKAGE_TIERS.length - 1];
}

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

- [ ] **Step 3 : Créer `src/lib/stockage.ts`**

```ts
import type { GameState } from "@/types/game";
import { getStockageTierParNiveau } from "@/data/stockage";

export function totalEnStock(state: GameState): number {
  return state.inventaireJoueur.length + (state.vitrine?.objets.length ?? 0);
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

- [ ] **Step 4 : Typecheck (échec attendu sur GameContext)**

Run : `npx tsc --noEmit`
Expected : erreurs liées à `niveauStockage` manquant dans GameContext, à corriger Task 2.

- [ ] **Step 5 : Commit**

```bash
git add src/types/game.ts src/data/stockage.ts src/lib/stockage.ts
git commit -m "feat(stockage): types + tiers (10/25/50/100) + upgrades + helpers"
```

---

### Task 2 : GameContext (init, migration, ameliorerStockage, gardes, loyer)

**Files :**
- Modify : `src/context/GameContext.tsx`

Implémenter dans cet ordre :

- [ ] **Step 1 : Imports**

Ajouter dans les imports en haut :

```ts
import {
  getProchaineUpgradeStockage,
  getStockageTierParNiveau,
} from "@/data/stockage";
import { stockageEstPlein } from "@/lib/stockage";
```

(Adapter l'import existant de `getStockageTier` pour conserver uniquement les noms utilisés.)

- [ ] **Step 2 : Étendre l'interface `GameContextValue`**

Après `ameliorerAtelier: () => { ok: boolean; raison?: string };`, ajouter :

```ts
  ameliorerStockage: () => { ok: boolean; raison?: string };
```

- [ ] **Step 3 : Init `niveauStockage` dans `nouvellePartie`**

Dans l'objet passé à `setState`, juste après `niveauAtelier: 1,`, ajouter :

```ts
      niveauStockage: 1,
```

- [ ] **Step 4 : Migration save**

Dans `migrerSauvegarde`, juste avant la fermeture du return object, ajouter :

```ts
    niveauStockage: (() => {
      const v = (loaded as Partial<GameState>).niveauStockage;
      if (v === 2 || v === 3 || v === 4) return v;
      // Save legacy : prendre le tier auto correspondant à l'inventaire courant.
      const inv = loaded.inventaireJoueur ?? [];
      const vit = loaded.vitrine?.objets ?? [];
      const total = inv.length + vit.length;
      const fallbackTier =
        total <= 10 ? 1 : total <= 25 ? 2 : total <= 50 ? 3 : 4;
      return fallbackTier as 1 | 2 | 3 | 4;
    })(),
```

- [ ] **Step 5 : Implémenter `ameliorerStockage`**

Juste après `ameliorerAtelier` (avant `definirPrixVenteSouhaite`), ajouter :

```ts
  const ameliorerStockage = useCallback((): { ok: boolean; raison?: string } => {
    const current = stateRef.current;
    if (!current) return { ok: false, raison: "Pas de partie." };
    const upgrade = getProchaineUpgradeStockage(current.niveauStockage);
    if (!upgrade) return { ok: false, raison: "Stockage déjà au maximum." };
    if (current.budget < upgrade.cout)
      return {
        ok: false,
        raison: `Il manque ${upgrade.cout - current.budget} €.`,
      };
    setState((prev) =>
      prev
        ? {
            ...prev,
            budget: prev.budget - upgrade.cout,
            niveauStockage: upgrade.niveauCible,
          }
        : prev,
    );
    return { ok: true };
  }, []);
```

- [ ] **Step 6 : Garde `retirerDeCollection`**

Dans la fonction `retirerDeCollection`, juste après la vérification du template, ajouter :

```ts
      if (stockageEstPlein(current))
        return { ok: false, raison: "Stockage plein." };
```

- [ ] **Step 7 : Garde `ajouterObjet`**

Repérer la fonction `ajouterObjet`. Aujourd'hui :

```ts
const ajouterObjet = useCallback((objet: Objet) => {
  setState((prev) =>
    prev ? { ...prev, inventaireJoueur: [...prev.inventaireJoueur, objet] } : prev,
  );
}, []);
```

Remplacer par :

```ts
const ajouterObjet = useCallback((objet: Objet) => {
  setState((prev) => {
    if (!prev) return prev;
    if (stockageEstPlein(prev)) return prev;
    return { ...prev, inventaireJoueur: [...prev.inventaireJoueur, objet] };
  });
}, []);
```

- [ ] **Step 8 : Modifier le calcul du loyer dans `avancerJour`**

Dans la fonction `avancerJour`, repérer :

```ts
const tierStockage = refresh ? getStockageTier(inv.length) : null;
```

Le remplacer par :

```ts
const tierStockage = refresh ? getStockageTierParNiveau(prev.niveauStockage) : null;
```

- [ ] **Step 9 : Exposer `ameliorerStockage` dans le `value`**

Dans le `useMemo` du provider, ajouter `ameliorerStockage,` dans le `value` ET dans le tableau de dépendances.

- [ ] **Step 10 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur (sauf éventuellement sur la page Stockage si elle utilise `getStockageTier(inv.length)` — corrigée Task 3).

- [ ] **Step 11 : Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(stockage): GameContext — ameliorerStockage, capacité stricte, migration"
```

---

### Task 3 : Page Stockage — UI niveau + upgrade

**Files :**
- Modify : `src/app/stockage/page.tsx`

- [ ] **Step 1 : Imports**

Remplacer l'import existant :

```ts
import { getStockageTier } from "@/data/stockage";
```

par :

```ts
import {
  getProchaineUpgradeStockage,
  getStockageTierParNiveau,
} from "@/data/stockage";
import { totalEnStock, getCapaciteStockage } from "@/lib/stockage";
```

Dans la destructure `useGame()`, ajouter `ameliorerStockage` :

```ts
const {
  state,
  isHydrated,
  mettreEnVitrine,
  restaurerObjet,
  donnerACollection,
  definirPrixVenteSouhaite,
  ameliorerStockage,
} = useGame();
```

- [ ] **Step 2 : Recalcul tier et ratio**

Remplacer :

```ts
const tier = getStockageTier(state.inventaireJoueur.length);
const ratio = state.inventaireJoueur.length / tier.capaciteMax;
```

par :

```ts
const tier = getStockageTierParNiveau(state.niveauStockage);
const totalStock = totalEnStock(state);
const capacite = getCapaciteStockage(state);
const ratio = capacite > 0 ? totalStock / capacite : 0;
```

- [ ] **Step 3 : Mettre à jour les affichages capacité**

Dans le StickyTop, remplacer la ligne qui affiche `{state.inventaireJoueur.length} / {tier.capaciteMax} obj.` par `{totalStock} / {capacite} obj.`.

- [ ] **Step 4 : Ajouter [flash, setFlash] state et bloc Améliorer**

Ajouter l'état pour les feedbacks Améliorer (réutiliser le `flash` existant si déjà présent ; sinon ajouter `const [flashUpgrade, setFlashUpgrade] = useState<string | null>(null);`).

Puisque `flash` existe déjà dans le composant (pour les actions Atelier/Collection), on peut le réutiliser.

Juste avant le bloc `{flash && (...)}` (ou en tête du body si tu préfères), ajouter :

```tsx
          <div
            style={{
              border: "1px solid var(--brass-500)",
              background: "var(--paper-100)",
              padding: "10px 14px",
              boxShadow:
                "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                }}
              >
                Stockage LVL {state.niveauStockage}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--ink-500)",
                  marginTop: 1,
                }}
              >
                {capacite} obj. · loyer {tier.loyerHebdo} €/sem
              </div>
            </div>
            {(() => {
              const up = getProchaineUpgradeStockage(state.niveauStockage);
              if (!up) {
                return (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--brass-700)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Maximum
                  </span>
                );
              }
              const peut = state.budget >= up.cout;
              return (
                <button
                  type="button"
                  disabled={!peut}
                  onClick={() => {
                    const res = ameliorerStockage();
                    if (!res.ok) setFlash(res.raison ?? "Impossible");
                    else setFlash(`Stockage amélioré au LVL ${up.niveauCible}.`);
                    setTimeout(() => setFlash(null), 2500);
                  }}
                  style={{
                    padding: "8px 12px",
                    fontFamily: "var(--font-display)",
                    fontSize: 10.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    border: "1px solid var(--brass-500)",
                    background: peut ? "var(--forest-800)" : "var(--paper-200)",
                    color: peut ? "var(--brass-300)" : "var(--ink-500)",
                    cursor: peut ? "pointer" : "not-allowed",
                    opacity: peut ? 1 : 0.6,
                  }}
                >
                  LVL {up.niveauCible} · {up.cout} €
                </button>
              );
            })()}
          </div>
```

- [ ] **Step 5 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 6 : Commit**

```bash
git add src/app/stockage/page.tsx
git commit -m "feat(stockage): UI niveau + bouton améliorer + capacité dynamique"
```

---

### Task 4 : QgEtatDesLieux — ligne Stockage niveau-based

**Files :**
- Modify : `src/components/mobile/QgEtatDesLieux.tsx`

- [ ] **Step 1 : Mettre à jour les imports + meta de la ligne Stockage**

Remplacer :

```ts
import { getStockageTier } from "@/data/stockage";
```

par :

```ts
import { getStockageTierParNiveau } from "@/data/stockage";
import { totalEnStock } from "@/lib/stockage";
```

Puis remplacer :

```ts
const stockTier = getStockageTier(state.inventaireJoueur.length);
```

par :

```ts
const stockTier = getStockageTierParNiveau(state.niveauStockage);
const totalStock = totalEnStock(state);
```

Dans la définition de la ligne Stockage (cherche `titre: "Stockage"`), remplacer l'expression `meta` actuelle par :

```ts
meta:
  stockTier.capaciteMax === Number.POSITIVE_INFINITY
    ? `${stockTier.nom} · ${totalStock} obj. · loyer ${stockTier.loyerHebdo} €/sem`
    : `${stockTier.nom} · ${totalStock}/${stockTier.capaciteMax} · loyer ${stockTier.loyerHebdo} €/sem`,
```

(La branche `Infinity` ne sera plus active après la réécriture de `STOCKAGE_TIERS` ; on la laisse par sécurité.)

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/QgEtatDesLieux.tsx
git commit -m "feat(qg): ligne Stockage utilise niveauStockage + totalEnStock"
```

---

### Task 5 : Chiner — items grisés + message stockage plein

**Files :**
- Modify : `src/app/chiner/[brocanteId]/ClientPage.tsx`

- [ ] **Step 1 : Lire les zones concernées**

Run : `cat "src/app/chiner/[brocanteId]/ClientPage.tsx"` ou Read pour repérer :
1. La liste des items de la brocante (avec leur bouton "Acheter" / "Proposer offre").
2. Le bouton "Finir la session" / "Quitter la brocante" en bas.

- [ ] **Step 2 : Ajouter l'import et calculer `plein`**

En haut, ajouter :

```ts
import { stockageEstPlein } from "@/lib/stockage";
```

Dans le composant, juste après les hooks `useGame()` et autres, calculer :

```ts
const plein = stockageEstPlein(state);
```

(Placer après le early-return `if (!isHydrated || !state) return ...`.)

- [ ] **Step 3 : Désactiver les boutons d'achat / offre**

Sur chaque bouton qui déclenche un achat (typiquement `handleProposerOffre`, `handleAchat` etc.) : ajouter `|| plein` à la condition `disabled` existante. Si pas de `disabled`, ajouter `disabled={plein}`. Ajouter aussi un style grisé : `opacity: plein ? 0.5 : 1, cursor: plein ? "not-allowed" : "pointer"`.

Si les boutons sont dans une boucle, factoriser via `const disabled = item.statut !== "disponible" || plein;`.

- [ ] **Step 4 : Bande "STOCKAGE PLEIN" au-dessus du bouton fin de session**

Repérer le bouton de fin de session (souvent une `ActionFab` ou un bouton plein-largeur). Juste avant, ajouter :

```tsx
{plein && (
  <div
    role="status"
    style={{
      padding: "8px 12px",
      background: "var(--vermillion-600)",
      color: "var(--paper-100)",
      border: "1px solid var(--velvet-700)",
      fontFamily: "var(--font-display)",
      fontSize: 11,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      textAlign: "center",
      marginBottom: 8,
    }}
  >
    Stockage plein
  </div>
)}
```

- [ ] **Step 5 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 6 : Commit**

```bash
git add "src/app/chiner/[brocanteId]/ClientPage.tsx"
git commit -m "feat(chiner): items grisés + message STOCKAGE PLEIN si plein"
```

---

### Task 6 : Collection — bouton Retirer grisé si plein

**Files :**
- Modify : `src/app/collection/page.tsx`

- [ ] **Step 1 : Ajouter l'import et calculer `plein`**

En haut, ajouter :

```ts
import { stockageEstPlein } from "@/lib/stockage";
```

Après le early-return de hydratation :

```ts
const plein = stockageEstPlein(state);
```

- [ ] **Step 2 : Désactiver le bouton Retirer**

Repérer le bouton qui appelle `retirerDeCollection`. Ajouter sur son `disabled` la condition `|| plein`. Styliser comme grisé si `plein`.

Si plusieurs boutons existent, traiter chacun.

- [ ] **Step 3 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/app/collection/page.tsx
git commit -m "feat(collection): bouton Retirer grisé si stockage plein"
```

---

### Task 7 : Validation finale

- [ ] **Step 1 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 2 : Build**

Run : `npm run build`
Expected : succès.

- [ ] **Step 3 : Test visuel `npm run dev`**

Vérifier :
1. Nouvelle partie : Stockage LVL1, capacité 10, loyer 10€/sem.
2. Bouton "Améliorer · LVL 2 · 100 €" visible et fonctionnel si budget ≥ 100€.
3. Sur QG, ligne État des lieux Stockage affiche `Garage · X/10 · loyer 10 €/sem`.
4. Aller chiner avec stockage plein : items grisés, bouton acheter indisponible, bandeau rouge "STOCKAGE PLEIN" affiché.
5. Collection : bouton "Retirer" grisé sur les dons quand stockage plein. Confirmation remplacement fonctionne toujours (net-zéro).
6. Mettre un objet en vitrine : `totalStock` reste identique (l'objet bouge entre inv → vitrine).
7. Save existante chargée : niveau correspond au tier auto qu'on avait (cohérence).
