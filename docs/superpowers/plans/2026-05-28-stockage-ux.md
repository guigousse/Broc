# Stockage UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre le Stockage — supprimer le bandeau "Vitrine ouverte" et le bouton inline "→ ÉTAL", rendre les lignes swipables (gauche) pour révéler les actions Atelier et Collection, ajouter un overlay détail avec prix de vente éditable, et introduire une capacité d'atelier améliorable (1→2→3 slots) avec nouvelles durées de restauration par transition d'état.

**Architecture :** Le composant `StockageItemRow` encapsule le swipe gesture (pointer events + transform). La page Stockage calcule les statuts Atelier/Collection par objet (mémoïsés) et les passe à la grille. Deux nouveaux modaux : `ObjetDetailOverlay` (tap → édition prix vente + ajout vitrine) et `ConfirmReplaceModal` (confirmation remplacement donation). Côté state, deux champs nouveaux : `Objet.prixVenteSouhaite?` et `GameState.niveauAtelier`. La durée de restauration devient fonction de la transition d'état (Mauvais→Bon = 7 j, Bon→TB = 14 j, TB→Pristin = 28 j), divisée par 2 si Maître Réparer.

**Tech Stack :** Next.js 15 (app router), React 19, TypeScript, lucide-react (icônes `Wrench`, `BookOpen`, `Store`, `X`), pointer events natifs (pas de lib swipe).

**Spec :** `docs/superpowers/specs/2026-05-28-stockage-ux-design.md`

**Pas de tests automatisés** (le projet n'en a pas). Validation = `npx tsc --noEmit` + `npm run build` + inspection manuelle.

---

### Task 1 : Types `prixVenteSouhaite` et `niveauAtelier`

**Files :**
- Modify : `src/types/game.ts`

- [ ] **Step 1 : Ajouter `prixVenteSouhaite` sur `Objet`**

Dans `src/types/game.ts`, dans l'interface `Objet`, juste après `prixAchat?: number;`, ajouter :

```ts
  /** Prix de vente fixé par le joueur dans l'overlay. Utilisé par défaut à la mise à l'étal. */
  prixVenteSouhaite?: number;
```

- [ ] **Step 2 : Ajouter `niveauAtelier` sur `GameState`**

Dans la même file, dans l'interface `GameState`, juste après `dernierHuissier?: HuissierEvent | null;` (dernier champ avant la fermeture), ajouter :

```ts
  /** Niveau de l'atelier (1, 2 ou 3). Nombre de slots = niveau. Par défaut 1. */
  niveauAtelier: 1 | 2 | 3;
```

- [ ] **Step 3 : Typecheck (échec attendu sur les sites qui construisent GameState)**

Run : `npx tsc --noEmit`
Expected : erreurs sur `nouvellePartie()` (un objet GameState manque `niveauAtelier`) — c'est attendu, on les corrigera dans la Task 5.

- [ ] **Step 4 : Commit**

```bash
git add src/types/game.ts
git commit -m "feat(types): ajoute prixVenteSouhaite et niveauAtelier"
```

(Note : ce commit laisse un état temporairement non-compilable. Les tâches 5 et 6 le résolvent. Si vous préférez bundler, sauter ce commit et batcher avec Task 5.)

---

### Task 2 : `src/data/atelier.ts` — slots et upgrades

**Files :**
- Create : `src/data/atelier.ts`

- [ ] **Step 1 : Créer le fichier**

Contenu de `src/data/atelier.ts` :

```ts
export const ATELIER_SLOTS: Record<1 | 2 | 3, number> = {
  1: 1,
  2: 2,
  3: 3,
};

export interface AtelierUpgrade {
  niveauActuel: 1 | 2;
  niveauCible: 2 | 3;
  cout: number;
}

export const ATELIER_UPGRADES: readonly AtelierUpgrade[] = [
  { niveauActuel: 1, niveauCible: 2, cout: 500 },
  { niveauActuel: 2, niveauCible: 3, cout: 2000 },
] as const;

export function getProchaineUpgrade(niveau: 1 | 2 | 3): AtelierUpgrade | null {
  if (niveau === 1) return ATELIER_UPGRADES[0];
  if (niveau === 2) return ATELIER_UPGRADES[1];
  return null;
}

export function getCapaciteAtelier(niveau: 1 | 2 | 3): number {
  return ATELIER_SLOTS[niveau];
}
```

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
(Les erreurs Task 1 sont toujours là, mais ce fichier doit être OK.)

- [ ] **Step 3 : Commit**

```bash
git add src/data/atelier.ts
git commit -m "feat(atelier): ATELIER_SLOTS + ATELIER_UPGRADES (500€, 2000€)"
```

---

### Task 3 : `src/lib/atelier.ts` — helpers

**Files :**
- Create : `src/lib/atelier.ts`

- [ ] **Step 1 : Créer le fichier**

Contenu de `src/lib/atelier.ts` :

```ts
import type {
  CategorieObjet,
  CollectionSlot,
  EtatObjet,
  GameState,
  Objet,
} from "@/types/game";
import {
  peutRestaurerBonVersTresBon,
  peutRestaurerMauvaisVersBon,
  peutRestaurerTresBonVersPristin,
} from "@/lib/competences";
import { getCapaciteAtelier } from "@/data/atelier";

/** Renvoie l'état cible naturel pour la prochaine restauration, ou null si déjà Pristin. */
export function prochaineEtatCible(etat: EtatObjet): EtatObjet | null {
  if (etat === "Mauvais") return "Bon";
  if (etat === "Bon") return "Très bon";
  if (etat === "Très bon") return "Pristin état";
  return null;
}

/** Vrai si le joueur a la compétence pour cette transition d'état précise. */
export function peutRestaurerTransition(
  state: GameState,
  cat: CategorieObjet,
  etatActuel: EtatObjet,
): boolean {
  if (etatActuel === "Mauvais") return peutRestaurerMauvaisVersBon(state, cat);
  if (etatActuel === "Bon") return peutRestaurerBonVersTresBon(state, cat);
  if (etatActuel === "Très bon")
    return peutRestaurerTresBonVersPristin(state, cat);
  return false;
}

/** Cherche le slot collection pour un templateId donné. Retourne null si introuvable. */
export function trouverSlotCollection(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
): CollectionSlot | null {
  for (const cat of Object.keys(collection) as CategorieObjet[]) {
    const slots = collection[cat] ?? [];
    const slot = slots.find((s) => s.templateId === templateId);
    if (slot) return slot;
  }
  return null;
}

/** Nombre d'objets actuellement en restauration. */
export function nbRestaurationsEnCours(state: GameState): number {
  return state.inventaireJoueur.filter((o) => o.enRestauration).length;
}

/** Vrai si on peut accueillir une restauration supplémentaire. */
export function atelierAuneSlotLibre(state: GameState): boolean {
  return nbRestaurationsEnCours(state) < getCapaciteAtelier(state.niveauAtelier);
}

export interface AtelierStatus {
  disponible: boolean;
  raison?: string;
}

/** Calcule si un objet précis peut être envoyé à l'atelier. */
export function atelierStatusPourObjet(
  state: GameState,
  o: Objet,
): AtelierStatus {
  if (o.enRestauration) return { disponible: false, raison: "Déjà en cours." };
  if (o.etat === "Pristin état")
    return { disponible: false, raison: "Déjà en parfait état." };
  if (!atelierAuneSlotLibre(state))
    return { disponible: false, raison: "Atelier plein." };
  if (!prochaineEtatCible(o.etat))
    return { disponible: false, raison: "Non restaurable." };
  if (!peutRestaurerTransition(state, o.categorie, o.etat))
    return { disponible: false, raison: "Compétence Réparer manquante." };
  return { disponible: true };
}

export interface CollectionStatus {
  disponible: boolean;
  necessiteConfirmation: boolean;
  ancienneDonation?: { etat: EtatObjet; valeur: number };
}

/** Calcule si un objet précis peut être donné à la collection. */
export function collectionStatusPourObjet(
  state: GameState,
  o: Objet,
): CollectionStatus {
  if (o.enRestauration)
    return { disponible: false, necessiteConfirmation: false };
  const slot = trouverSlotCollection(state.collection, o.templateId);
  if (!slot) return { disponible: true, necessiteConfirmation: false };
  if (slot.donation === null)
    return { disponible: true, necessiteConfirmation: false };
  if (slot.donation.etat === o.etat) {
    return { disponible: false, necessiteConfirmation: false };
  }
  return {
    disponible: true,
    necessiteConfirmation: true,
    ancienneDonation: slot.donation,
  };
}
```

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
(Les erreurs Task 1 persistent.)

- [ ] **Step 3 : Commit**

```bash
git add src/lib/atelier.ts
git commit -m "feat(atelier): helpers statuts atelier/collection + capacité"
```

---

### Task 4 : Refactor `dureeRestauration`

**Files :**
- Modify : `src/lib/competences.ts`

- [ ] **Step 1 : Remplacer la fonction `dureeRestauration`**

Dans `src/lib/competences.ts`, repérer la fonction actuelle (vers ligne 101-107) :

```ts
/** Renvoie la durée (en jours) d'une restauration pour cette catégorie. */
export function dureeRestauration(
  state: GameState,
  cat: CategorieObjet,
): number {
  return aMaitreReparer(state, cat) ? 3 : 7;
}
```

La remplacer par :

```ts
/** Renvoie la durée (en jours) de la restauration pour atteindre l'état cible. */
export function dureeRestauration(
  state: GameState,
  cat: CategorieObjet,
  etatCible: EtatObjet,
): number {
  const baseParCible: Partial<Record<EtatObjet, number>> = {
    Bon: 7,
    "Très bon": 14,
    "Pristin état": 28,
  };
  const base = baseParCible[etatCible] ?? 7;
  if (aMaitreReparer(state, cat)) return Math.ceil(base / 2);
  return base;
}
```

- [ ] **Step 2 : Vérifier les imports**

`EtatObjet` est déjà importé en haut du fichier si la signature actuelle ne l'utilise pas. Vérifier la ligne d'import des types depuis `@/types/game` — s'il manque, ajouter :

```ts
import type { CategorieObjet, EtatObjet, GameState } from "@/types/game";
```

(Adapter à la forme existante de l'import.)

- [ ] **Step 3 : Typecheck**

Run : `npx tsc --noEmit`
Expected : nouvelles erreurs sur les callsites de `dureeRestauration` (atelier page) — corrigées Task 6.

- [ ] **Step 4 : Commit**

```bash
git add src/lib/competences.ts
git commit -m "feat(atelier): dureeRestauration prend etatCible (7/14/28 j)"
```

---

### Task 5 : `GameContext` — migration, init, actions atelier + prix vente

**Files :**
- Modify : `src/context/GameContext.tsx`

- [ ] **Step 1 : Ajouter les imports**

En haut de `src/context/GameContext.tsx`, ajouter :

```ts
import { ATELIER_SLOTS, getProchaineUpgrade } from "@/data/atelier";
```

- [ ] **Step 2 : Étendre l'interface `GameContextValue`**

Dans l'interface (vers la ligne 70-100), ajouter deux nouvelles méthodes :

```ts
  ameliorerAtelier: () => { ok: boolean; raison?: string };
  definirPrixVenteSouhaite: (objetId: string, prix: number) => void;
```

(Les placer après `restaurerObjet` pour la cohérence thématique.)

- [ ] **Step 3 : Initialiser `niveauAtelier` dans `nouvellePartie`**

Dans la fonction `nouvellePartie` (vers ligne 330), ajouter le champ dans l'objet initial :

```ts
      dernierLoyer: null,
      dernierHuissier: null,
      niveauAtelier: 1,
```

- [ ] **Step 4 : Migration save**

Repérer le bloc qui charge l'état depuis le repository (autour de la ligne 280, dans le `useEffect` d'init). Après le parse du `loaded`, juste avant `setState(loaded)`, ajouter une normalisation :

Localiser le bloc qui fait quelque chose comme `setState(loaded)` ou `setState({ ...loaded, ... })`. Y injecter :

```ts
      const niveauAtelier: 1 | 2 | 3 =
        loaded?.niveauAtelier === 2 || loaded?.niveauAtelier === 3
          ? loaded.niveauAtelier
          : 1;
```

puis remplacer le `setState(loaded)` par :

```ts
      setState({ ...loaded, niveauAtelier });
```

Si la forme exacte du code est différente (par exemple `setState(...)` avec spread déjà), adapter : l'objectif est de forcer `niveauAtelier: 1` quand le champ est `undefined` ou invalide dans la save chargée.

- [ ] **Step 5 : Ajouter le check capacité dans `restaurerObjet`**

Dans la fonction `restaurerObjet` (vers ligne 715), juste après la vérification `if (objet.enRestauration)` et avant le check de compétence, ajouter :

```ts
      const nbEnCours = current.inventaireJoueur.filter((o) => o.enRestauration).length;
      const capacite = ATELIER_SLOTS[current.niveauAtelier];
      if (nbEnCours >= capacite)
        return {
          ok: false,
          raison: `Atelier plein (${nbEnCours}/${capacite} slot${capacite > 1 ? "s" : ""}).`,
        };
```

- [ ] **Step 6 : Implémenter `ameliorerAtelier`**

Juste avant le bloc `const reset = ...` (vers ligne 553), ajouter :

```ts
  const ameliorerAtelier = useCallback((): { ok: boolean; raison?: string } => {
    const current = stateRef.current;
    if (!current) return { ok: false, raison: "Pas de partie." };
    const upgrade = getProchaineUpgrade(current.niveauAtelier);
    if (!upgrade) return { ok: false, raison: "Atelier déjà au maximum." };
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
            niveauAtelier: upgrade.niveauCible,
          }
        : prev,
    );
    return { ok: true };
  }, []);
```

- [ ] **Step 7 : Implémenter `definirPrixVenteSouhaite`**

Juste après le bloc précédent, ajouter :

```ts
  const definirPrixVenteSouhaite = useCallback(
    (objetId: string, prix: number) => {
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          inventaireJoueur: prev.inventaireJoueur.map((o) => {
            if (o.id !== objetId) return o;
            if (prix <= 0) {
              const { prixVenteSouhaite, ...rest } = o;
              void prixVenteSouhaite;
              return rest;
            }
            return { ...o, prixVenteSouhaite: prix };
          }),
        };
      });
    },
    [],
  );
```

- [ ] **Step 8 : Exposer les deux nouvelles méthodes dans le `value`**

Repérer le bloc de `useMemo`/`value` (vers ligne 900-940) où toutes les méthodes sont passées. Y ajouter :

```ts
      ameliorerAtelier,
      definirPrixVenteSouhaite,
```

(Dans l'objet `value` ET dans le tableau des dépendances du `useMemo`.)

- [ ] **Step 9 : Typecheck**

Run : `npx tsc --noEmit`
Expected : reste les erreurs sur les callsites de `dureeRestauration` côté atelier page (corrigées Task 6) ; pas d'autres erreurs nouvelles.

- [ ] **Step 10 : Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(atelier): ameliorerAtelier + capacité + definirPrixVenteSouhaite + migration save"
```

---

### Task 6 : Page Atelier — capacité + upgrade + callsites dureeRestauration

**Files :**
- Modify : `src/app/atelier/page.tsx`

- [ ] **Step 1 : Lire le fichier en entier pour repérer les callsites**

Run : `cat src/app/atelier/page.tsx` (ou Read complet) pour situer tous les appels `dureeRestauration(state, ...)` et la zone d'affichage du compteur "X en chantier".

- [ ] **Step 2 : Ajouter les imports nécessaires**

Au début, ajouter (si pas déjà présents) :

```ts
import { ATELIER_SLOTS, getProchaineUpgrade } from "@/data/atelier";
```

et dans la destructure `useGame()` :

```ts
const { state, isHydrated, restaurerObjet, ameliorerAtelier } = useGame();
```

- [ ] **Step 3 : Mettre à jour TOUS les appels `dureeRestauration`**

Chaque ligne du type `dureeRestauration(state, o.categorie)` ou `dureeRestauration(state, cat)` devient `dureeRestauration(state, o.categorie, cible)` où `cible` est l'état cible déjà calculé localement (dans la fonction `handleRestaurer(objet, cible)`, par exemple, `cible` est déjà le paramètre).

Concrètement : repérer les variables passées à `restaurerObjet(..., cible, { dureeJours: duree })` et remplacer la ligne précédente :

```ts
const duree = dureeRestauration(state, objet.categorie);
```

par :

```ts
const duree = dureeRestauration(state, objet.categorie, cible);
```

S'il y a plusieurs callsites (par exemple un par bouton "→ Bon", "→ Très bon", "→ Pristin"), traiter chacun individuellement en passant la cible adéquate (en réutilisant la `cible` locale de chaque bouton).

- [ ] **Step 4 : Afficher la capacité dans le StickyTop**

Dans le bloc où s'affichent `{enCours.length} en chantier`, modifier en :

```tsx
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                color: "var(--forest-800)",
              }}
            >
              {enCours.length} / {ATELIER_SLOTS[state.niveauAtelier]} en chantier
            </span>
```

- [ ] **Step 5 : Ajouter un bloc "Améliorer l'atelier" dans le body**

Juste après le StickyTop (au début du body), avant la liste des objets en cours, ajouter :

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
                Atelier LVL {state.niveauAtelier}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--ink-500)",
                  marginTop: 1,
                }}
              >
                {ATELIER_SLOTS[state.niveauAtelier]} slot
                {ATELIER_SLOTS[state.niveauAtelier] > 1 ? "s" : ""}
              </div>
            </div>
            {(() => {
              const up = getProchaineUpgrade(state.niveauAtelier);
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
                    const res = ameliorerAtelier();
                    if (!res.ok) setFlash(res.raison ?? "Impossible");
                    else setFlash(`Atelier amélioré au LVL ${up.niveauCible}.`);
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

- [ ] **Step 6 : Désactiver les boutons "Restaurer" si capacité atteinte**

Repérer les boutons de restauration (ils appellent `handleRestaurer(objet, cible)`). Ajouter à leur attribut `disabled` une condition supplémentaire :

```ts
const pleine = enCours.length >= ATELIER_SLOTS[state.niveauAtelier];
```

Calculer cette variable une fois en haut du composant. Puis sur chaque bouton restaurer :

```tsx
disabled={pleine /* + autres conditions existantes */}
```

(Adapter au pattern réel des boutons.)

- [ ] **Step 7 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 8 : Commit**

```bash
git add src/app/atelier/page.tsx
git commit -m "feat(atelier): UI capacité + bouton améliorer + durées par cible"
```

---

### Task 7 : Composant `StockageItemRow`

**Files :**
- Create : `src/components/mobile/StockageItemRow.tsx`

- [ ] **Step 1 : Créer le composant complet**

Contenu de `src/components/mobile/StockageItemRow.tsx` :

```tsx
"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { BookOpen, Wrench } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import type { Objet } from "@/types/game";

interface StockageItemRowProps {
  objet: Objet;
  valeurConnue: boolean;
  atelier: { disponible: boolean; raison?: string };
  collection: { disponible: boolean; necessiteConfirmation: boolean };
  onTap: (objet: Objet) => void;
  onEnvoyerAtelier: (objet: Objet) => void;
  onEnvoyerCollection: (objet: Objet) => void;
  isLast: boolean;
}

const ACTIONS_WIDTH = 112;
const SNAP_THRESHOLD = 60;
const TAP_THRESHOLD = 8;

const wrap: CSSProperties = {
  position: "relative",
  overflow: "hidden",
};

const actions: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  justifyContent: "flex-end",
};

const actionBtn = (
  bg: string,
  enabled: boolean,
): CSSProperties => ({
  width: 56,
  height: "100%",
  border: "none",
  background: enabled ? bg : "var(--paper-500)",
  color: enabled ? "var(--paper-100)" : "var(--ink-500)",
  display: "grid",
  placeItems: "center",
  cursor: enabled ? "pointer" : "not-allowed",
  opacity: enabled ? 1 : 0.55,
  fontFamily: "var(--font-mono)",
  fontSize: 8,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
});

const item: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px 1fr auto",
  gap: 10,
  alignItems: "center",
  padding: "8px 12px",
  background: "var(--paper-100)",
  touchAction: "pan-y",
};

const thumb: CSSProperties = {
  width: 44,
  height: 44,
  background:
    "linear-gradient(135deg, var(--paper-500) 0%, var(--brass-700) 100%)",
  border: "1px solid var(--brass-700)",
  display: "grid",
  placeItems: "center",
};

export function StockageItemRow({
  objet,
  valeurConnue,
  atelier,
  collection,
  onTap,
  onEnvoyerAtelier,
  onEnvoyerCollection,
  isLast,
}: StockageItemRowProps) {
  const [dragX, setDragX] = useState(0);
  const [snapped, setSnapped] = useState<"open" | "closed">("closed");
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const axisLockedRef = useRef<"h" | "v" | null>(null);

  const baseX = snapped === "open" ? -ACTIONS_WIDTH : 0;
  const translateX = baseX + dragX;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    axisLockedRef.current = null;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (!axisLockedRef.current) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        axisLockedRef.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
    }
    if (axisLockedRef.current !== "h") return;
    movedRef.current = true;
    const clamped = Math.max(-ACTIONS_WIDTH - baseX, Math.min(-baseX, dx));
    setDragX(clamped);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) {
      setDragging(false);
      return;
    }
    const finalDelta = dragX;
    setDragging(false);
    setDragX(0);
    startRef.current = null;
    if (!movedRef.current || axisLockedRef.current !== "h") {
      // Tap pur
      if (Math.abs(finalDelta) < TAP_THRESHOLD) {
        onTap(objet);
      }
      return;
    }
    // Déterminer le snap
    const totalX = baseX + finalDelta;
    if (totalX < -SNAP_THRESHOLD) setSnapped("open");
    else setSnapped("closed");
  };

  const handleAtelier = () => {
    if (!atelier.disponible) return;
    onEnvoyerAtelier(objet);
    setSnapped("closed");
  };

  const handleCollection = () => {
    if (!collection.disponible) return;
    onEnvoyerCollection(objet);
    setSnapped("closed");
  };

  return (
    <div
      style={{
        ...wrap,
        borderBottom: isLast ? "none" : "1px dotted var(--paper-500)",
      }}
    >
      <div style={actions} aria-hidden>
        <button
          type="button"
          style={actionBtn("var(--brass-600)", atelier.disponible)}
          onClick={handleAtelier}
          disabled={!atelier.disponible}
          aria-label="Envoyer à l'atelier"
        >
          <Wrench size={20} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          style={actionBtn("var(--forest-700)", collection.disponible)}
          onClick={handleCollection}
          disabled={!collection.disponible}
          aria-label="Envoyer dans la collection"
        >
          <BookOpen size={20} strokeWidth={1.5} />
        </button>
      </div>
      <div
        style={{
          ...item,
          transform: `translateX(${translateX}px)`,
          transition: dragging ? "none" : "transform 180ms ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div style={thumb}>
          <CategorieIcon
            categorie={objet.categorie}
            size={20}
            strokeWidth={1.5}
            color="var(--brass-100)"
          />
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              fontWeight: 700,
            }}
          >
            {objet.nom}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              color: "var(--ink-500)",
              marginTop: 2,
            }}
          >
            {objet.etat} · {objet.rarete} · {objet.categorie}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13,
              color: "var(--forest-800)",
            }}
          >
            {valeurConnue ? `${Math.round(objet.prixReferenceReel)} €` : "?"}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--brass-700)",
              letterSpacing: "0.06em",
            }}
          >
            ref.
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/StockageItemRow.tsx
git commit -m "feat(stockage): StockageItemRow swipable (atelier + collection)"
```

---

### Task 8 : Refactor `InventoryGrid`

**Files :**
- Modify : `src/components/InventoryGrid.tsx`

- [ ] **Step 1 : Remplacer le composant intégralement**

Remplacer le contenu de `src/components/InventoryGrid.tsx` par :

```tsx
import type { CSSProperties } from "react";
import type { CategorieObjet, Objet } from "@/types/game";
import { StockageItemRow } from "@/components/mobile/StockageItemRow";
import type {
  AtelierStatus,
  CollectionStatus,
} from "@/lib/atelier";

interface InventoryGridProps {
  objets: Objet[];
  categoriesConnues: ReadonlySet<CategorieObjet>;
  onTapObjet: (objet: Objet) => void;
  onEnvoyerAtelier: (objet: Objet) => void;
  onEnvoyerCollection: (objet: Objet) => void;
  atelierStatus: (objet: Objet) => AtelierStatus;
  collectionStatus: (objet: Objet) => CollectionStatus;
}

const card: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "6px 0",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

export function InventoryGrid({
  objets,
  categoriesConnues,
  onTapObjet,
  onEnvoyerAtelier,
  onEnvoyerCollection,
  atelierStatus,
  collectionStatus,
}: InventoryGridProps) {
  if (objets.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 16,
            color: "var(--ink-500)",
            marginBottom: 12,
          }}
        >
          Aucun objet dans cette catégorie.
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          Partez chiner pour la garnir.
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      {objets.map((o, i) => {
        const valeurConnue = categoriesConnues.has(o.categorie);
        return (
          <StockageItemRow
            key={o.id}
            objet={o}
            valeurConnue={valeurConnue}
            atelier={atelierStatus(o)}
            collection={collectionStatus(o)}
            onTap={onTapObjet}
            onEnvoyerAtelier={onEnvoyerAtelier}
            onEnvoyerCollection={onEnvoyerCollection}
            isLast={i === objets.length - 1}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur dans ce fichier, mais des erreurs sur `src/app/stockage/page.tsx` (anciennes props) — corrigées Task 11.

- [ ] **Step 3 : Commit**

```bash
git add src/components/InventoryGrid.tsx
git commit -m "refactor(inventory): InventoryGrid utilise StockageItemRow + nouvelles props"
```

---

### Task 9 : Composant `ConfirmReplaceModal`

**Files :**
- Create : `src/components/mobile/ConfirmReplaceModal.tsx`

- [ ] **Step 1 : Créer le composant**

Contenu de `src/components/mobile/ConfirmReplaceModal.tsx` :

```tsx
"use client";

import type { CSSProperties } from "react";
import type { EtatObjet } from "@/types/game";

interface ConfirmReplaceModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  nouvelObjet: { nom: string; etat: EtatObjet; valeur: number };
  ancienneDonation: { etat: EtatObjet; valeur: number };
}

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 110,
  background: "rgba(15,31,24,0.78)",
  display: "grid",
  placeItems: "center",
  padding: "20px",
};

const card: CSSProperties = {
  maxWidth: 360,
  width: "100%",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
  padding: "20px",
};

const title: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center",
  marginBottom: 16,
};

const body: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 14,
  lineHeight: 1.45,
  color: "var(--ink-700)",
  marginBottom: 18,
};

const btn = (variant: "ghost" | "primary"): CSSProperties => ({
  flex: 1,
  padding: "10px 12px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  background:
    variant === "primary" ? "var(--forest-800)" : "var(--paper-200)",
  color: variant === "primary" ? "var(--brass-300)" : "var(--ink-700)",
  cursor: "pointer",
});

export function ConfirmReplaceModal({
  open,
  onClose,
  onConfirm,
  nouvelObjet,
  ancienneDonation,
}: ConfirmReplaceModalProps) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Remplacer la donation"
      style={backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={card}>
        <div style={title}>— Remplacer la donation ? —</div>
        <p style={body}>
          « {nouvelObjet.nom} » est déjà dans votre collection en{" "}
          {ancienneDonation.etat.toLowerCase()} (valeur {ancienneDonation.valeur} €).
          Le remplacer par votre nouvel exemplaire en {nouvelObjet.etat.toLowerCase()}{" "}
          ({nouvelObjet.valeur} €) ? L&apos;ancien reviendra dans votre inventaire.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={btn("ghost")}>
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={btn("primary")}
          >
            Remplacer
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
Expected : pas d'erreur nouvelle sur ce fichier.

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/ConfirmReplaceModal.tsx
git commit -m "feat(stockage): ConfirmReplaceModal (remplacement donation)"
```

---

### Task 10 : Composant `ObjetDetailOverlay`

**Files :**
- Create : `src/components/mobile/ObjetDetailOverlay.tsx`

- [ ] **Step 1 : Créer le composant**

Contenu de `src/components/mobile/ObjetDetailOverlay.tsx` :

```tsx
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Store, X } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import type { Objet } from "@/types/game";

interface ObjetDetailOverlayProps {
  objet: Objet | null;
  open: boolean;
  onClose: () => void;
  prixMarche: number;
  onSetPrixVente: (objetId: string, prix: number) => void;
  onAjouterEtal: ((objet: Objet, prix: number) => void) | null;
  brocanteOuverteNom: string | null;
}

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 105,
  background: "rgba(15,31,24,0.78)",
  display: "grid",
  placeItems: "center",
  padding: "20px",
};

const card: CSSProperties = {
  maxWidth: 380,
  width: "100%",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
  padding: "16px",
  maxHeight: "90vh",
  overflowY: "auto",
};

const topBar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  fontWeight: 700,
  flex: 1,
};

const closeBtn: CSSProperties = {
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-700)",
  padding: 4,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

const previewWrap: CSSProperties = {
  width: 120,
  height: 120,
  margin: "8px auto 12px",
  background:
    "linear-gradient(135deg, var(--paper-500) 0%, var(--brass-700) 100%)",
  border: "1px solid var(--brass-700)",
  display: "grid",
  placeItems: "center",
};

const meta: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.12em",
  color: "var(--ink-500)",
  textAlign: "center",
  marginBottom: 16,
};

const priceGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 14,
};

const priceBox: CSSProperties = {
  border: "1px dotted var(--brass-500)",
  padding: "8px 10px",
  background: "var(--paper-200)",
};

const priceLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};

const priceValue: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  color: "var(--forest-800)",
  marginTop: 2,
};

const venteRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 14,
};

const venteInput: CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  border: "1px solid var(--brass-500)",
  background: "var(--paper-200)",
  fontFamily: "var(--font-display)",
  fontSize: 14,
  color: "var(--forest-800)",
  outline: "none",
};

const etalBtn: CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid var(--brass-500)",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

export function ObjetDetailOverlay({
  objet,
  open,
  onClose,
  prixMarche,
  onSetPrixVente,
  onAjouterEtal,
  brocanteOuverteNom,
}: ObjetDetailOverlayProps) {
  const [prixLocal, setPrixLocal] = useState<number>(0);

  useEffect(() => {
    if (!objet) return;
    const defaut =
      objet.prixVenteSouhaite ?? Math.max(1, Math.round(prixMarche * 1.4));
    setPrixLocal(defaut);
  }, [objet, prixMarche]);

  if (!open || !objet) return null;

  const commitPrix = () => {
    if (!objet) return;
    onSetPrixVente(objet.id, prixLocal);
  };

  const enRestauration = !!objet.enRestauration;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Détail de l'objet"
      style={backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={card}>
        <div style={topBar}>
          <div style={titleStyle}>{objet.nom}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={closeBtn}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div style={previewWrap}>
          <CategorieIcon
            categorie={objet.categorie}
            size={56}
            strokeWidth={1.2}
            color="var(--brass-100)"
          />
        </div>

        <div style={meta}>
          {objet.etat} · {objet.rarete} · {objet.categorie}
        </div>

        {enRestauration && (
          <div
            style={{
              padding: "8px 10px",
              background: "var(--paper-300)",
              border: "1px dotted var(--brass-700)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "var(--brass-700)",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            En restauration jusqu&apos;au jour {objet.enRestauration?.jourFin}
          </div>
        )}

        <div style={priceGrid}>
          <div style={priceBox}>
            <div style={priceLabel}>Prix d&apos;achat</div>
            <div style={priceValue}>
              {objet.prixAchat !== undefined ? `${objet.prixAchat} €` : "—"}
            </div>
          </div>
          <div style={priceBox}>
            <div style={priceLabel}>Prix du marché</div>
            <div style={priceValue}>{Math.round(prixMarche)} €</div>
          </div>
        </div>

        <div style={priceLabel}>Prix de vente</div>
        <div style={venteRow}>
          <input
            type="number"
            min={0}
            value={prixLocal}
            onChange={(e) => setPrixLocal(Number(e.target.value) || 0)}
            onBlur={commitPrix}
            style={venteInput}
            disabled={enRestauration}
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              color: "var(--brass-700)",
            }}
          >
            €
          </span>
        </div>

        {onAjouterEtal && !enRestauration && (
          <button
            type="button"
            onClick={() => {
              commitPrix();
              onAjouterEtal(objet, prixLocal);
              onClose();
            }}
            style={etalBtn}
          >
            <Store size={16} strokeWidth={1.5} />
            Mettre à l&apos;étal
            {brocanteOuverteNom ? ` · ${brocanteOuverteNom}` : ""}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur dans ce fichier.

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/ObjetDetailOverlay.tsx
git commit -m "feat(stockage): ObjetDetailOverlay (aperçu, prix vente éditable, → Étal)"
```

---

### Task 11 : Page Stockage — refonte intégrale

**Files :**
- Modify : `src/app/stockage/page.tsx`

- [ ] **Step 1 : Remplacer le contenu intégralement**

Remplacer le contenu de `src/app/stockage/page.tsx` par :

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { CategoriePicker } from "@/components/mobile/CategoriePicker";
import { InventoryGrid } from "@/components/InventoryGrid";
import { ObjetDetailOverlay } from "@/components/mobile/ObjetDetailOverlay";
import { ConfirmReplaceModal } from "@/components/mobile/ConfirmReplaceModal";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { getStockageTier } from "@/data/stockage";
import { aConnaisseurVitrine } from "@/lib/competences";
import {
  atelierStatusPourObjet,
  collectionStatusPourObjet,
  prochaineEtatCible,
} from "@/lib/atelier";
import { getBrocanteById } from "@/data/brocantes";
import type { CategorieObjet, EtatObjet, Objet } from "@/types/game";

export default function StockagePage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    mettreEnVitrine,
    restaurerObjet,
    donnerACollection,
    definirPrixVenteSouhaite,
  } = useGame();
  const [filtre, setFiltre] = useState<CategorieObjet | null>(null);
  const [objetOuvert, setObjetOuvert] = useState<Objet | null>(null);
  const [askReplace, setAskReplace] = useState<{
    objet: Objet;
    ancienne: { etat: EtatObjet; valeur: number };
  } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const categoriesConnuesVitrine = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurVitrine(state, c)) s.add(c);
    return s;
  }, [state]);

  const objetsFiltres = useMemo(() => {
    if (!state) return [];
    return filtre
      ? state.inventaireJoueur.filter((o) => o.categorie === filtre)
      : state.inventaireJoueur;
  }, [state, filtre]);

  const comptes = useMemo(() => {
    const acc: Partial<Record<CategorieObjet, number>> = {};
    if (!state) return acc;
    for (const o of state.inventaireJoueur) {
      acc[o.categorie] = (acc[o.categorie] ?? 0) + 1;
    }
    return acc;
  }, [state]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          fontSize: 12,
        }}
      >
        — ouverture du stockage…
      </main>
    );
  }

  const tier = getStockageTier(state.inventaireJoueur.length);
  const ratio = state.inventaireJoueur.length / tier.capaciteMax;

  const atelierStatus = (o: Objet) => atelierStatusPourObjet(state, o);
  const collectionStatus = (o: Objet) => collectionStatusPourObjet(state, o);

  const envoyerAtelier = (o: Objet) => {
    const cible = prochaineEtatCible(o.etat);
    if (!cible) return;
    const res = restaurerObjet(o.id, cible);
    if (res.ok) setFlash(`${o.nom} envoyé à l'atelier.`);
    else setFlash(`Impossible : ${res.raison ?? "condition non remplie"}`);
    setTimeout(() => setFlash(null), 2500);
  };

  const envoyerCollection = (o: Objet) => {
    const status = collectionStatusPourObjet(state, o);
    if (!status.disponible && !status.necessiteConfirmation) return;
    if (status.necessiteConfirmation && status.ancienneDonation) {
      setAskReplace({ objet: o, ancienne: status.ancienneDonation });
      return;
    }
    const res = donnerACollection(o.id);
    if (res.ok) setFlash(`${o.nom} ajouté à la collection.`);
    else setFlash(`Impossible : ${res.raison ?? "condition non remplie"}`);
    setTimeout(() => setFlash(null), 2500);
  };

  const confirmerReplace = () => {
    if (!askReplace) return;
    const res = donnerACollection(askReplace.objet.id);
    if (res.ok) setFlash("Donation remplacée.");
    else setFlash(`Impossible : ${res.raison ?? "condition non remplie"}`);
    setTimeout(() => setFlash(null), 2500);
  };

  const ajouterAEtal = state.vitrine
    ? (o: Objet, prix: number) => mettreEnVitrine(o.id, prix)
    : null;

  const brocanteOuverteNom = state.vitrine
    ? (getBrocanteById(state.vitrine.brocanteId)?.nom ?? null)
    : null;

  return (
    <>
      <MobileLayout
        header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
        stickyTop={
          <StickyTop>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 9,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
                textAlign: "center",
                marginBottom: 6,
              }}
            >
              — Stockage · {tier.nom} —
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 17,
                  color: "var(--forest-800)",
                }}
              >
                {state.inventaireJoueur.length} / {tier.capaciteMax} obj.
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--brass-700)",
                }}
              >
                Loyer {tier.loyerHebdo} €/sem.
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "var(--paper-300)",
                border: "1px solid var(--brass-500)",
                margin: "6px 0 8px",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background:
                    ratio >= 1
                      ? "var(--vermillion-600)"
                      : "var(--forest-800)",
                  width: `${Math.min(100, Math.round(ratio * 100))}%`,
                }}
              />
            </div>
            <CategoriePicker
              selection={filtre}
              onChange={setFiltre}
              comptesParCat={comptes}
              total={state.inventaireJoueur.length}
            />
          </StickyTop>
        }
      >
        {flash && (
          <div
            role="status"
            style={{
              padding: "8px 12px",
              background: "var(--paper-100)",
              border: "1px solid var(--brass-500)",
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {flash}
          </div>
        )}
        <InventoryGrid
          objets={objetsFiltres}
          categoriesConnues={categoriesConnuesVitrine}
          onTapObjet={setObjetOuvert}
          onEnvoyerAtelier={envoyerAtelier}
          onEnvoyerCollection={envoyerCollection}
          atelierStatus={atelierStatus}
          collectionStatus={collectionStatus}
        />
      </MobileLayout>

      <ObjetDetailOverlay
        objet={objetOuvert}
        open={objetOuvert !== null}
        onClose={() => setObjetOuvert(null)}
        prixMarche={objetOuvert?.prixReferenceReel ?? 0}
        onSetPrixVente={definirPrixVenteSouhaite}
        onAjouterEtal={ajouterAEtal}
        brocanteOuverteNom={brocanteOuverteNom}
      />

      <ConfirmReplaceModal
        open={askReplace !== null}
        onClose={() => setAskReplace(null)}
        onConfirm={confirmerReplace}
        nouvelObjet={
          askReplace
            ? {
                nom: askReplace.objet.nom,
                etat: askReplace.objet.etat,
                valeur: askReplace.objet.prixReferenceReel,
              }
            : { nom: "", etat: "Bon", valeur: 0 }
        }
        ancienneDonation={
          askReplace ? askReplace.ancienne : { etat: "Bon", valeur: 0 }
        }
      />
    </>
  );
}
```

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/app/stockage/page.tsx
git commit -m "feat(stockage): refonte page — swipe rows, overlay détail, modale remplacement"
```

---

### Task 12 : Validation finale

**Files :** aucun

- [ ] **Step 1 : Typecheck global**

Run : `npx tsc --noEmit`
Expected : 0 erreur.

- [ ] **Step 2 : Build production**

Run : `npm run build`
Expected : succès, 62+ pages.

- [ ] **Step 3 : Test visuel `npm run dev`**

Lancer `npm run dev`, ouvrir `http://localhost:3000/stockage` et vérifier :

1. **Bandeau "Vitrine ouverte" supprimé** quand une vitrine est ouverte (créer une vitrine via QG → Exposer).
2. **Pas de bouton "→ ÉTAL" inline** sur les lignes.
3. **Swipe gauche** sur une ligne révèle les boutons Atelier (clé à molette) + Collection (livre). Swipe droit referme.
4. **Tap (sans drag)** sur une ligne ouvre l'overlay détail.
5. **Overlay** : nom, aperçu agrandi, méta, prix achat / marché, input prix vente.
6. **Modifier prix vente + fermer + rouvrir** → la valeur est persistée.
7. **Bouton "Mettre à l'étal" (icône Store)** visible UNIQUEMENT si vitrine ouverte. Clic → ajoute à la vitrine au prix affiché, ferme l'overlay.
8. **Atelier grisé** quand objet déjà Pristin, ou compétence manquante, ou en cours de resto, ou capacité atteinte.
9. **Collection grisée** quand même templateId+etat déjà donné.
10. **Collection avec etat différent** → la modale custom "Remplacer la donation ?" s'ouvre. Confirmer → ancienne donation revient en inventaire. Annuler → rien.
11. **Aller dans /atelier** : compteur "X / 1 en chantier" affiché. Bloc "Atelier LVL 1" avec bouton "LVL 2 · 500 €". Si budget suffisant → cliquer améliore, sinon disabled.
12. **Lancer une restauration** : la durée affichée correspond à la cible (Mauvais→Bon: 7 j, Bon→TB: 14 j, TB→Pristin: 28 j) — divisée par 2 si Maître Réparer pour cette catégorie.
13. **Charger une save ancienne** sans `niveauAtelier` (par exemple celle créée avant le merge) : `niveauAtelier` est forcé à 1, aucune erreur.

- [ ] **Step 4 : Reporter à l'utilisateur**

Si tout OK, la branche est prête à merger. Si un point échoue, escalader.
