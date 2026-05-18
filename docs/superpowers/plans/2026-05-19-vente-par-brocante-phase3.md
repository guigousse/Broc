# Phase 3 — Vente par Brocante Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactoriser la vente pour qu'elle soit liée à une brocante : `state.vitrine` devient `{ brocanteId, objets } | null`, la page `/vitrine` devient un sélecteur de brocantes, le coût du stand suit `tier × taille`, et le pool de clients est filtré par tier de la brocante.

**Architecture:** On contracte `GameState.vitrine` en un seul objet « vitrine active » (avec brocanteId). Les actions context sont adaptées pour opérer sur `vitrine.objets` quand une vitrine est ouverte. La page `/vitrine` devient un sélecteur qui redirige vers `/vitrine/[brocanteId]` (préparation) puis `/vitrine/[brocanteId]/journee` (vente temps réel). Les personnages clients gagnent un champ `tierMin` (filtré par `genererPoolClients(taille, tier)`). Coût stand basé sur une matrice `tier × taille` exposée par `data/standLevels.ts`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind v4, lucide-react.

**Vérification:** pas de framework de test. `npx tsc --noEmit` + dev server au port 3000 + curl sur les routes impactées.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/types/game.ts` | Modify | `VitrineActive` + `GameState.vitrine: VitrineActive \| null`. |
| `src/context/GameContext.tsx` | Modify | Migration (saves contenant ancien `vitrine: ObjetEnVitrine[]` → objets retournés en inventaire, `vitrine = null`). Actions adaptées : `ouvrirVitrine(brocanteId)`, `mettreEnVitrine`/`retirerDeVitrine`/`ajusterPrixVitrine`/`vendreDeVitrine` opèrent sur la vitrine active, `viderVitrine` retourne objets+null. |
| `src/data/standLevels.ts` | Rewrite | Matrice tier×taille : `COUTS_STAND[tier][taille]`. Garde l'API `niveauRequis(nbObjets)` mais ajoute `coutStand(tier, taille)`. |
| `src/data/clients.ts` | Modify | Ajouter `tierMin: 1\|2\|3` à `ClientArchetype` et `ClientPersonnage`, propager dans `makePersonnages`. Distribuer les 15 archétypes en tier 1/2/3. `genererPoolClients(taille, tier)` filtre par `tierMin <= tier`. |
| `src/app/vitrine/page.tsx` | Rewrite | Devient un sélecteur de brocantes (style /chiner avec étoiles + spé + groupage par tier). |
| `src/app/vitrine/[brocanteId]/page.tsx` | Create | Page de préparation déplacée depuis l'ancienne `/vitrine/page.tsx` ; lit la brocante via params, calcule le coût avec `coutStand(tier, taille)`, appelle `ouvrirVitrine(brocanteId)` au premier `mettreEnVitrine`. |
| `src/app/vitrine/[brocanteId]/journee/page.tsx` | Create | Page de vente temps réel déplacée depuis `/vitrine/journee/page.tsx` ; filtre le pool de personas par tier de la brocante. |
| `src/app/vitrine/journee/page.tsx` | Delete | Remplacée par la version `[brocanteId]/journee`. |
| `src/app/qg/page.tsx` | Modify | Le panneau "Tenir l'étal" affiche le nom de la brocante active si présente. |

---

## Task 1 : Types — VitrineActive et GameState

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1 : Ajouter le type `VitrineActive` et modifier `GameState.vitrine`**

Édite `src/types/game.ts`. Trouve la définition existante du champ `vitrine` dans `GameState`. Au-dessus de l'interface `GameState`, ajoute (juste après `ObjetEnVitrine`) :

```ts
export interface VitrineActive {
  brocanteId: string;
  objets: ObjetEnVitrine[];
}
```

Puis remplace la ligne dans `GameState` :

```ts
  vitrine: ObjetEnVitrine[];
```

par :

```ts
  /** Vitrine active : objets exposés dans une brocante donnée. null = aucune vitrine ouverte. */
  vitrine: VitrineActive | null;
```

- [ ] **Step 2 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -40`
Expected: erreurs nombreuses dans `GameContext.tsx`, `src/app/vitrine/page.tsx`, `src/app/vitrine/journee/page.tsx` et `src/app/qg/page.tsx` qui utilisent `state.vitrine.length`, etc. C'est attendu — corrigé par les tâches suivantes.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/types/game.ts
git commit -m "feat(types): VitrineActive (brocanteId + objets) replaces flat vitrine array"
```

---

## Task 2 : Context — migration + actions sur VitrineActive

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1 : Ajouter `ouvrirVitrine` dans l'interface `GameContextValue`**

Trouve `interface GameContextValue` et ajoute, juste avant `mettreEnVitrine` :

```ts
  ouvrirVitrine: (brocanteId: string) => void;
```

- [ ] **Step 2 : Initialiser `vitrine: null` dans `nouvellePartie`**

Trouve dans `nouvellePartie` la ligne :

```ts
      vitrine: [],
```

Remplace par :

```ts
      vitrine: null,
```

- [ ] **Step 3 : Migrer les anciennes sauvegardes dans `migrerSauvegarde`**

Trouve dans `migrerSauvegarde` le bloc qui calcule `vitrine` :

```ts
  const vitrine = (loaded.vitrine ?? []).map((v) => ({
    ...v,
    objet: {
      ...v.objet,
      categorie: migrerCategorie(v.objet.categorie),
      etat: migrerEtat(v.objet.etat),
      templateId:
        v.objet.templateId ??
        `legacy.${(v.objet.nom ?? "objet").toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      rarete: v.objet.rarete ?? "commun",
    },
  }));
```

Remplace ce bloc par :

```ts
  // Détecte le format ancien (tableau) et migre vers le nouveau (VitrineActive | null).
  // Les objets éventuellement présents dans l'ancienne vitrine sont retournés en stock.
  const ancienneVitrine: ObjetEnVitrine[] = Array.isArray(loaded.vitrine)
    ? (loaded.vitrine as ObjetEnVitrine[]).map((v) => ({
        ...v,
        objet: {
          ...v.objet,
          categorie: migrerCategorie(v.objet.categorie),
          etat: migrerEtat(v.objet.etat),
          templateId:
            v.objet.templateId ??
            `legacy.${(v.objet.nom ?? "objet").toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
          rarete: v.objet.rarete ?? "commun",
        },
      }))
    : [];

  // Migration : si l'ancienne vitrine contenait des objets, on les remet dans l'inventaire.
  for (const v of ancienneVitrine) {
    inventaire.push(v.objet);
  }

  // Vitrine au nouveau format : conservée si déjà migrée, sinon null.
  const vitrineActuelle =
    loaded.vitrine &&
    !Array.isArray(loaded.vitrine) &&
    (loaded.vitrine as { brocanteId?: string }).brocanteId
      ? (loaded.vitrine as import("@/types/game").VitrineActive)
      : null;
```

Puis dans le `return` à la fin de `migrerSauvegarde`, remplace la ligne `vitrine,` par `vitrine: vitrineActuelle,`.

Trouve aussi le bloc qui répare le catalogue à partir de la vitrine :

```ts
    for (const v of vitrine) {
      catalogue = marquerPossedeFn(catalogue, v.objet.templateId);
    }
```

Remplace par (utilise désormais `vitrineActuelle`) :

```ts
    if (vitrineActuelle) {
      for (const v of vitrineActuelle.objets) {
        catalogue = marquerPossedeFn(catalogue, v.objet.templateId);
      }
    }
```

- [ ] **Step 4 : Refactor des actions vitrine**

Trouve les fonctions `mettreEnVitrine`, `retirerDeVitrine`, `ajusterPrixVitrine`, `viderVitrine`, `vendreDeVitrine`. Remplace-les intégralement par :

```ts
  const ouvrirVitrine = useCallback((brocanteId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      // Si une autre vitrine est déjà ouverte avec des objets, on remet ses objets en stock.
      if (prev.vitrine && prev.vitrine.brocanteId !== brocanteId) {
        return {
          ...prev,
          inventaireJoueur: [
            ...prev.inventaireJoueur,
            ...prev.vitrine.objets.map((e) => e.objet),
          ],
          vitrine: { brocanteId, objets: [] },
        };
      }
      // Vitrine déjà ouverte sur la bonne brocante : no-op.
      if (prev.vitrine?.brocanteId === brocanteId) return prev;
      // Aucune vitrine : on ouvre.
      return { ...prev, vitrine: { brocanteId, objets: [] } };
    });
  }, []);

  const mettreEnVitrine = useCallback((objetId: string, prixVente: number) => {
    setState((prev) => {
      if (!prev || !prev.vitrine) return prev;
      const objet = prev.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet) return prev;
      const nouvelEntree: ObjetEnVitrine = { objet, prixVente };
      return {
        ...prev,
        inventaireJoueur: prev.inventaireJoueur.filter((o) => o.id !== objetId),
        vitrine: {
          ...prev.vitrine,
          objets: [...prev.vitrine.objets, nouvelEntree],
        },
      };
    });
  }, []);

  const retirerDeVitrine = useCallback((objetId: string) => {
    setState((prev) => {
      if (!prev || !prev.vitrine) return prev;
      const entree = prev.vitrine.objets.find((e) => e.objet.id === objetId);
      if (!entree) return prev;
      return {
        ...prev,
        vitrine: {
          ...prev.vitrine,
          objets: prev.vitrine.objets.filter((e) => e.objet.id !== objetId),
        },
        inventaireJoueur: [...prev.inventaireJoueur, entree.objet],
      };
    });
  }, []);

  const ajusterPrixVitrine = useCallback(
    (objetId: string, prixVente: number) => {
      setState((prev) =>
        prev && prev.vitrine
          ? {
              ...prev,
              vitrine: {
                ...prev.vitrine,
                objets: prev.vitrine.objets.map((e) =>
                  e.objet.id === objetId ? { ...e, prixVente } : e,
                ),
              },
            }
          : prev,
      );
    },
    [],
  );

  const viderVitrine = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      if (!prev.vitrine) return prev;
      return {
        ...prev,
        inventaireJoueur: [
          ...prev.inventaireJoueur,
          ...prev.vitrine.objets.map((e) => e.objet),
        ],
        vitrine: null,
      };
    });
  }, []);

  const vendreDeVitrine = useCallback(
    (objetIds: string[], prixTotal: number) => {
      setState((prev) => {
        if (!prev || !prev.vitrine) return prev;
        const ids = new Set(objetIds);
        return {
          ...prev,
          vitrine: {
            ...prev.vitrine,
            objets: prev.vitrine.objets.filter((e) => !ids.has(e.objet.id)),
          },
          budget: prev.budget + prixTotal,
        };
      });
    },
    [],
  );
```

- [ ] **Step 5 : Exposer `ouvrirVitrine` dans le value du provider**

Trouve l'objet `value` retourné par `useMemo` et ajoute `ouvrirVitrine` (avant `mettreEnVitrine`). Trouve aussi la liste des dépendances du `useMemo` et ajoute `ouvrirVitrine` à la même position.

- [ ] **Step 6 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -30`
Expected: erreurs résiduelles UNIQUEMENT dans `src/app/vitrine/page.tsx`, `src/app/vitrine/journee/page.tsx`, et `src/app/qg/page.tsx` (consommateurs qui font encore `state.vitrine.length`). Pages corrigées dans les tâches suivantes.

- [ ] **Step 7 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/context/GameContext.tsx
git commit -m "feat(context): VitrineActive state + ouvrirVitrine + adapted actions, migration"
```

---

## Task 3 : `standLevels.ts` — matrice tier × taille

**Files:**
- Modify: `src/data/standLevels.ts`

- [ ] **Step 1 : Réécrire avec la matrice tier×taille**

Remplace intégralement le contenu de `src/data/standLevels.ts` par :

```ts
import type { BrocanteTier, StandConfig, StandLevel } from "@/types/game";

export const STAND_LEVELS: readonly StandConfig[] = [
  {
    niveau: 1,
    nom: "Petit étal",
    capaciteMin: 1,
    capaciteMax: 10,
    loyer: 20,
  },
  {
    niveau: 2,
    nom: "Stand standard",
    capaciteMin: 11,
    capaciteMax: 25,
    loyer: 50,
  },
  {
    niveau: 3,
    nom: "Grand stand",
    capaciteMin: 26,
    capaciteMax: 50,
    loyer: 120,
  },
];

/**
 * Matrice de coût stand par tier de brocante × taille de stand.
 * Valeurs en euros par journée.
 */
export const COUTS_STAND: Record<BrocanteTier, Record<StandLevel, number>> = {
  1: { 1: 20, 2: 50, 3: 120 },
  2: { 1: 70, 2: 180, 3: 420 },
  3: { 1: 220, 2: 550, 3: 1300 },
};

export function niveauRequis(nbObjets: number): StandConfig | null {
  return (
    STAND_LEVELS.find(
      (s) => nbObjets >= s.capaciteMin && nbObjets <= s.capaciteMax,
    ) ?? null
  );
}

export function configParNiveau(niveau: StandLevel): StandConfig {
  const c = STAND_LEVELS.find((s) => s.niveau === niveau);
  if (!c) throw new Error(`Stand niveau ${niveau} inconnu`);
  return c;
}

/** Coût d'un stand pour un tier de brocante donné et un niveau (taille) de stand. */
export function coutStand(tier: BrocanteTier, niveau: StandLevel): number {
  return COUTS_STAND[tier][niveau];
}

export const CAPACITE_MAX_GLOBALE = STAND_LEVELS[STAND_LEVELS.length - 1].capaciteMax;
```

Le champ `loyer` de `STAND_LEVELS` reste pour la compatibilité avec l'historique de session (tiers 1⭐ valeur tier-1) ; les nouveaux calculs passent par `coutStand(tier, niveau)`.

- [ ] **Step 2 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: pas de nouvelle erreur dans `standLevels.ts`.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/data/standLevels.ts
git commit -m "feat(stand): matrice tier x taille via coutStand()"
```

---

## Task 4 : Clients — `tierMin` + filtrage du pool par tier

**Files:**
- Modify: `src/data/clients.ts`

- [ ] **Step 1 : Ajouter `tierMin` à `ClientArchetype` et `ClientPersonnage`**

Dans `src/data/clients.ts`, modifie les deux interfaces :

```ts
export interface ClientArchetype {
  id: string;
  nom: string;
  ambianceDefault: string;
  appetitMin: number;
  appetitMax: number;
  durete: number;
  chanceMulti: number;
  categoriesPreferees: CategorieObjet[];
  categoriesEvitees?: CategorieObjet[];
  bonusPreference?: number;
  malusEvitement?: number;
  /** Tier minimum de brocante où cet archétype peut apparaître. */
  tierMin: 1 | 2 | 3;
}

export interface ClientPersonnage {
  id: string;
  archetypeId: string;
  archetypeNom: string;
  nom: string;
  ambiance: string;
  appetitMin: number;
  appetitMax: number;
  durete: number;
  chanceMulti: number;
  categoriesPreferees: CategorieObjet[];
  categoriesEvitees: CategorieObjet[];
  bonusPreference: number;
  malusEvitement: number;
  tierMin: 1 | 2 | 3;
}
```

- [ ] **Step 2 : Assigner `tierMin` à chaque archétype**

Dans `ARCHETYPES`, ajoute `tierMin` sur chaque entrée. La distribution est :

| Archétype | tierMin |
|---|---|
| retraite_chineur | 1 |
| passionnee_artdeco | 3 |
| brocanteur_concurrent | 2 |
| collectionneur_musique | 3 |
| gamer_nostalgique | 2 |
| bibliophile | 2 |
| bricoleur_dimanche | 2 |
| etudiant_fauche | 1 |
| snob_bourgeois | 3 |
| touriste_perdu | 1 |
| famille_dimanche | 1 |
| decorateur | 3 |
| amateur_vintage | 2 |
| notable_curieux | 3 |
| opportuniste | 1 |

Ajoute `tierMin: 1,` (ou la valeur appropriée selon le tableau) à la fin de chaque archétype dans `const ARCHETYPES`. Par exemple pour `retraite_chineur` :

```ts
  {
    id: "retraite_chineur",
    nom: "Retraité chineur",
    ambianceDefault: "Compte chaque sou et soupèse chaque pièce.",
    appetitMin: 0.4,
    appetitMax: 0.7,
    durete: 0.7,
    chanceMulti: 0.1,
    categoriesPreferees: [],
    tierMin: 1,
  },
```

Fais l'opération identique pour les 14 autres archétypes selon la table.

- [ ] **Step 3 : Propager `tierMin` dans `makePersonnages`**

Trouve `function makePersonnages(...)` et ajoute `tierMin: arch.tierMin,` à la fin de l'objet retourné :

```ts
function makePersonnages(
  arch: ClientArchetype,
  sources: PersonnageSource[],
): ClientPersonnage[] {
  return sources.map((src, i) => ({
    id: `${arch.id}.${i}`,
    archetypeId: arch.id,
    archetypeNom: arch.nom,
    nom: src.nom,
    ambiance: src.ambiance ?? arch.ambianceDefault,
    appetitMin: arch.appetitMin,
    appetitMax: arch.appetitMax,
    durete: arch.durete,
    chanceMulti: arch.chanceMulti,
    categoriesPreferees: arch.categoriesPreferees,
    categoriesEvitees: arch.categoriesEvitees ?? [],
    bonusPreference: arch.bonusPreference ?? 0.3,
    malusEvitement: arch.malusEvitement ?? 0.2,
    tierMin: arch.tierMin,
  }));
}
```

- [ ] **Step 4 : Modifier `genererPoolClients` pour filtrer par tier**

Trouve la fonction `genererPoolClients` et remplace par :

```ts
/** Sélectionne N personnages au hasard, filtrés par tierMin <= tier. */
export function genererPoolClients(taille: number, tier: 1 | 2 | 3 = 3): ClientPersonnage[] {
  const filtres = ALL_PERSONNAGES.filter((p) => p.tierMin <= tier);
  const copy = [...filtres];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(taille, copy.length));
}
```

- [ ] **Step 5 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: pas de nouvelle erreur dans `clients.ts`. Les erreurs résiduelles sont uniquement dans les pages vitrine et qg (pas encore corrigées).

- [ ] **Step 6 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/data/clients.ts
git commit -m "feat(clients): tierMin per archetype + genererPoolClients(taille, tier) filter"
```

---

## Task 5 : Page `/vitrine` = sélecteur de brocantes

**Files:**
- Modify: `src/app/vitrine/page.tsx` (remplacement complet)

- [ ] **Step 1 : Remplacer intégralement par un sélecteur de brocantes**

Remplace tout le contenu de `src/app/vitrine/page.tsx` par :

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrocanteCard } from "@/components/BrocanteCard";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { useGame } from "@/context/GameContext";
import { BROCANTES, brocantesParTier, getBrocanteById } from "@/data/brocantes";
import { estDebloquee } from "@/lib/deblocage";

export default function VitrineSelectionPage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — préparation des étals…
      </main>
    );
  }

  const debloqueesParTier = new Map<1 | 2 | 3, Set<string>>([
    [1, new Set<string>()],
    [2, new Set<string>()],
    [3, new Set<string>()],
  ]);
  for (const tier of [1, 2, 3] as const) {
    for (const b of brocantesParTier(tier)) {
      if (estDebloquee(b, state, debloqueesParTier)) {
        debloqueesParTier.get(tier)!.add(b.id);
      }
    }
  }

  const vitrineActuelleBrocante = state.vitrine
    ? getBrocanteById(state.vitrine.brocanteId)
    : null;

  const handleOuvrir = (brocanteId: string) => {
    router.push(`/vitrine/${brocanteId}`);
  };

  return (
    <div
      className="bg-paper-grain"
      style={{ minHeight: "100dvh", padding: "20px 28px 32px" }}
    >
      <StatusBar jour={state.jourActuel} budget={state.budget} />

      <div
        style={{
          maxWidth: 1280,
          margin: "32px auto 0",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
          }}
        >
          <div>
            <div className="eyebrow">— vente —</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--forest-800)",
                margin: "4px 0 8px",
                lineHeight: 1.1,
              }}
            >
              Choisissez votre brocante
            </h1>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                fontSize: 16,
                margin: 0,
                maxWidth: 540,
              }}
            >
              Chaque brocante a son public — plus elle est prestigieuse, plus
              les clients sont aisés (et exigeants).
            </p>
          </div>
          <Link href="/qg">
            <Button variant="ghost" size="sm">
              ← Retour au QG
            </Button>
          </Link>
        </header>

        <DecoDivider />

        {vitrineActuelleBrocante && (
          <div
            style={{
              padding: "12px 16px",
              background: "var(--paper-100)",
              border: "1px solid var(--brass-500)",
              boxShadow:
                "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px var(--brass-700)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--brass-700)",
                }}
              >
                Vitrine en cours
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                  marginTop: 4,
                }}
              >
                {vitrineActuelleBrocante.nom} ·{" "}
                {state.vitrine!.objets.length} objet
                {state.vitrine!.objets.length > 1 ? "s" : ""}
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => handleOuvrir(vitrineActuelleBrocante.id)}
            >
              Reprendre
            </Button>
          </div>
        )}

        {([1, 2, 3] as const).map((tier) => {
          const brocantesTier = brocantesParTier(tier);
          return (
            <section
              key={tier}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <h2
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                  margin: 0,
                  paddingBottom: 6,
                  borderBottom: "1px solid var(--brass-700)",
                }}
              >
                <span style={{ color: "var(--brass-500)" }}>
                  {"★".repeat(tier)}
                </span>
                <span>
                  {tier === 1
                    ? "Brocantes de quartier"
                    : tier === 2
                      ? "Marchés réputés"
                      : "Salons et galeries"}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    color: "var(--brass-700)",
                  }}
                >
                  {debloqueesParTier.get(tier)!.size} / {brocantesTier.length} débloquées
                </span>
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 18,
                }}
              >
                {brocantesTier.map((b) => {
                  const debloquee = debloqueesParTier.get(tier)!.has(b.id);
                  return (
                    <div
                      key={b.id}
                      onClick={() => debloquee && handleOuvrir(b.id)}
                      style={{ cursor: debloquee ? "pointer" : "not-allowed" }}
                    >
                      <BrocanteCard brocante={b} debloquee={debloquee} />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
```

Note : le composant `BrocanteCard` existant pointe par défaut vers `/chiner/[id]`. Ici on l'enveloppe dans un `<div onClick>` pour rediriger vers `/vitrine/[id]` à la place. Si le clic du Link interne se déclenche d'abord, c'est OK : `e.stopPropagation()` n'est pas requis car le BrocanteCard ne fait pas de navigation pour les non-débloquées et pour les débloquées on accepte que les deux comportements coexistent transitoirement (cette nuance sera affinée si besoin dans une itération de polish).

Cependant pour éviter la confusion, on désactive la navigation interne du `BrocanteCard` en fournissant directement notre propre wrapper. Pour cela, **modifie `src/components/BrocanteCard.tsx`** pour rendre l'URL paramétrable. Mais comme cela ajoute du scope, on accepte le comportement actuel : le `BrocanteCard` peut continuer à proposer le `Link href="/chiner/..."` interne. Notre `onClick` sur le wrapper externe sera alors un fallback secondaire — c'est acceptable, on peut affiner dans une itération.

**Pour cette Phase 3**, retire le `<Link>` interne quand on est dans la page `/vitrine`. C'est-à-dire : Task 5.2 — paramétrer `BrocanteCard` pour accepter une URL cible.

- [ ] **Step 2 : Rendre l'URL cible du `BrocanteCard` paramétrable**

Édite `src/components/BrocanteCard.tsx`. Trouve `interface BrocanteCardProps` et ajoute :

```ts
interface BrocanteCardProps {
  brocante: Brocante;
  debloquee: boolean;
  /** URL cible quand la carte est cliquée (défaut : /chiner/[id]). */
  hrefBase?: string;
}
```

Modifie la signature de `BrocanteCard` pour accepter `hrefBase = "/chiner"` :

```ts
export function BrocanteCard({ brocante, debloquee, hrefBase = "/chiner" }: BrocanteCardProps) {
```

Trouve le `<Link>` interne à la fin :

```tsx
  return (
    <Link
      href={`/chiner/${brocante.id}`}
```

Remplace par :

```tsx
  return (
    <Link
      href={`${hrefBase}/${brocante.id}`}
```

- [ ] **Step 3 : Utiliser `hrefBase="/vitrine"` dans la page sélecteur vitrine**

Dans `src/app/vitrine/page.tsx`, retire le wrapper `<div onClick>` et passe directement `hrefBase="/vitrine"` à `BrocanteCard`. Remplace le bloc :

```tsx
                {brocantesTier.map((b) => {
                  const debloquee = debloqueesParTier.get(tier)!.has(b.id);
                  return (
                    <div
                      key={b.id}
                      onClick={() => debloquee && handleOuvrir(b.id)}
                      style={{ cursor: debloquee ? "pointer" : "not-allowed" }}
                    >
                      <BrocanteCard brocante={b} debloquee={debloquee} />
                    </div>
                  );
                })}
```

par :

```tsx
                {brocantesTier.map((b) => (
                  <BrocanteCard
                    key={b.id}
                    brocante={b}
                    debloquee={debloqueesParTier.get(tier)!.has(b.id)}
                    hrefBase="/vitrine"
                  />
                ))}
```

Et retire la fonction `handleOuvrir` (devenue inutile).

- [ ] **Step 4 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: pas de nouvelle erreur dans `vitrine/page.tsx` et `BrocanteCard.tsx`. Erreurs résiduelles uniquement dans `vitrine/journee/page.tsx` et `qg/page.tsx`.
Run: `curl -s -o /dev/null -w "/vitrine %{http_code}\n" http://localhost:3000/vitrine`
Expected: 200.

- [ ] **Step 5 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/vitrine/page.tsx src/components/BrocanteCard.tsx
git commit -m "feat(vitrine): page becomes brocante selector, BrocanteCard hrefBase prop"
```

---

## Task 6 : Page `/vitrine/[brocanteId]/page.tsx` — préparation par brocante

**Files:**
- Create: `src/app/vitrine/[brocanteId]/page.tsx`

- [ ] **Step 1 : Créer la page de préparation par brocante**

Crée `src/app/vitrine/[brocanteId]/page.tsx` avec :

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { CategorieAccordion } from "@/components/ui/CategorieAccordion";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { EtatBadge } from "@/components/ui/EtatBadge";
import { Panel } from "@/components/ui/Panel";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { getBrocanteById } from "@/data/brocantes";
import {
  CAPACITE_MAX_GLOBALE,
  STAND_LEVELS,
  coutStand,
  niveauRequis,
} from "@/data/standLevels";
import { aConnaisseurVitrine } from "@/lib/competences";
import { estDebloquee } from "@/lib/deblocage";
import { brocantesParTier } from "@/data/brocantes";
import type { CategorieObjet, Objet, ObjetEnVitrine } from "@/types/game";

const SUGGESTION_FACTEUR = 1.4;

function suggererPrix(objet: Objet): number {
  return Math.max(1, Math.round(objet.prixReferenceReel * SUGGESTION_FACTEUR));
}

export default function VitrineBrocantePage() {
  const router = useRouter();
  const params = useParams<{ brocanteId: string }>();
  const {
    state,
    isHydrated,
    ouvrirVitrine,
    mettreEnVitrine,
    retirerDeVitrine,
    ajusterPrixVitrine,
    viderVitrine,
    ajusterBudget,
  } = useGame();

  const brocante = useMemo(
    () => getBrocanteById(params.brocanteId),
    [params.brocanteId],
  );

  const [prixInput, setPrixInput] = useState<Record<string, number>>({});

  // Redirige si état invalide
  useEffect(() => {
    if (!isHydrated) return;
    if (!state) return router.replace("/");
    if (!brocante) return router.replace("/vitrine");
    // Calcule la liste des débloquées par tier pour vérifier l'accès
    const debloqueesParTier = new Map<1 | 2 | 3, Set<string>>([
      [1, new Set<string>()],
      [2, new Set<string>()],
      [3, new Set<string>()],
    ]);
    for (const tier of [1, 2, 3] as const) {
      for (const b of brocantesParTier(tier)) {
        if (estDebloquee(b, state, debloqueesParTier)) {
          debloqueesParTier.get(tier)!.add(b.id);
        }
      }
    }
    if (!debloqueesParTier.get(brocante.tier)!.has(brocante.id)) {
      router.replace("/vitrine");
      return;
    }
    // Ouvre la vitrine pour cette brocante (no-op si déjà ouverte)
    if (!state.vitrine || state.vitrine.brocanteId !== brocante.id) {
      ouvrirVitrine(brocante.id);
    }
  }, [isHydrated, state, brocante, router, ouvrirVitrine]);

  const vitrineActive = state?.vitrine;
  const objetsEnVitrine = vitrineActive?.objets ?? [];

  const standActuel = useMemo(
    () => niveauRequis(Math.max(1, objetsEnVitrine.length)),
    [objetsEnVitrine.length],
  );
  const coutActuel = useMemo(
    () => (standActuel && brocante ? coutStand(brocante.tier, standActuel.niveau) : 0),
    [standActuel, brocante],
  );

  if (!isHydrated || !state || !brocante) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — préparation de l'étal…
      </main>
    );
  }

  const surcharge = objetsEnVitrine.length > CAPACITE_MAX_GLOBALE;
  const peutOuvrir =
    objetsEnVitrine.length > 0 &&
    standActuel !== null &&
    state.budget >= coutActuel &&
    !surcharge;

  const handleAjouter = (objet: Objet) => {
    const prix = prixInput[objet.id] ?? suggererPrix(objet);
    mettreEnVitrine(objet.id, prix);
    setPrixInput((prev) => {
      const { [objet.id]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleOuvrirJournee = () => {
    if (!standActuel || !peutOuvrir) return;
    ajusterBudget(-coutActuel);
    router.push(`/vitrine/${brocante.id}/journee`);
  };

  const handleAnnuler = () => {
    viderVitrine();
    router.push("/vitrine");
  };

  return (
    <div
      className="bg-paper-grain"
      style={{ minHeight: "100dvh", padding: "20px 28px 32px" }}
    >
      <StatusBar jour={state.jourActuel} budget={state.budget} />

      <div
        style={{
          maxWidth: 1280,
          margin: "32px auto 0",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
          }}
        >
          <div>
            <div
              className="eyebrow"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <span style={{ color: "var(--brass-500)" }}>
                {"★".repeat(brocante.etoiles)}
              </span>
              <span>· préparation</span>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--forest-800)",
                margin: "4px 0 8px",
                lineHeight: 1.1,
              }}
            >
              {brocante.nom}
            </h1>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                fontSize: 16,
                margin: 0,
                maxWidth: 540,
              }}
            >
              Choisissez les pièces à présenter, fixez leur prix. Le coût du
              stand dépend du tier de la brocante et de la taille de votre étal.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleAnnuler}>
            ← Changer de brocante
          </Button>
        </header>

        <DecoDivider />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
          }}
        >
          {STAND_LEVELS.map((s) => {
            const actif = standActuel?.niveau === s.niveau;
            const cout = coutStand(brocante.tier, s.niveau);
            return (
              <div
                key={s.niveau}
                style={{
                  padding: "14px 16px",
                  background: actif ? "var(--forest-800)" : "var(--paper-100)",
                  border: `1px solid ${
                    actif ? "var(--brass-500)" : "var(--brass-700)"
                  }`,
                  boxShadow: actif
                    ? "inset 0 0 0 3px var(--forest-800), inset 0 0 0 4px var(--brass-500)"
                    : "0 2px 0 var(--paper-400)",
                  color: actif ? "var(--paper-200)" : "var(--ink-700)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: actif ? "var(--brass-300)" : "var(--brass-700)",
                  }}
                >
                  Niveau {s.niveau}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginTop: 4,
                  }}
                >
                  {s.nom}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    marginTop: 6,
                    color: actif ? "var(--paper-300)" : "var(--ink-500)",
                  }}
                >
                  {s.capaciteMin}–{s.capaciteMax} obj. · loyer {cout} €
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <Panel
            eyebrow="— stock —"
            title={`Inventaire · ${state.inventaireJoueur.filter((o) => !o.enRestauration).length} obj.`}
          >
            {state.inventaireJoueur.filter((o) => !o.enRestauration).length === 0 ? (
              <EmptyState
                title="Plus rien à exposer."
                hint="Partez chiner pour reconstituer votre stock."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groupByCategorie(
                  state.inventaireJoueur.filter((o) => !o.enRestauration),
                  (o) => o.categorie,
                ).map(([cat, list]) => (
                  <CategorieAccordion key={cat} categorie={cat} compte={list.length}>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {list.map((o) => {
                        const prixSuggere = suggererPrix(o);
                        const prixCourant = prixInput[o.id] ?? prixSuggere;
                        const voitRef = aConnaisseurVitrine(state, o.categorie);
                        return (
                          <StockRow
                            key={o.id}
                            objet={o}
                            voitRef={voitRef}
                            prixCourant={prixCourant}
                            onChangerPrix={(v) =>
                              setPrixInput((prev) => ({ ...prev, [o.id]: v }))
                            }
                            onExposer={() => handleAjouter(o)}
                          />
                        );
                      })}
                    </ul>
                  </CategorieAccordion>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            eyebrow="— sur l'étal —"
            title={`Vitrine · ${objetsEnVitrine.length} obj.`}
          >
            {objetsEnVitrine.length === 0 ? (
              <EmptyState
                title="L'étal est nu."
                hint="Ajoutez des objets depuis votre stock."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groupByCategorie(objetsEnVitrine, (e) => e.objet.categorie).map(
                  ([cat, list]) => (
                    <CategorieAccordion key={cat} categorie={cat} compte={list.length}>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {list.map((e) => (
                          <VitrineRow
                            key={e.objet.id}
                            entree={e}
                            voitRef={aConnaisseurVitrine(state, e.objet.categorie)}
                            onPrix={(v) => ajusterPrixVitrine(e.objet.id, v)}
                            onRetirer={() => retirerDeVitrine(e.objet.id)}
                          />
                        ))}
                      </ul>
                    </CategorieAccordion>
                  ),
                )}
              </div>
            )}

            {standActuel && (
              <footer
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: "1px solid rgba(138,106,38,0.35)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink-500)",
                  }}
                >
                  <span>Stand requis</span>
                  <span style={{ color: "var(--forest-800)" }}>
                    {standActuel.nom} · {coutActuel} € de loyer
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleOuvrirJournee}
                  disabled={!peutOuvrir}
                >
                  Ouvrir la journée · {coutActuel} €
                </Button>
                {state.budget < coutActuel && (
                  <p
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: 13,
                      color: "var(--vermillion-600)",
                      margin: 0,
                    }}
                  >
                    La caisse n'a pas de quoi payer le loyer.
                  </p>
                )}
              </footer>
            )}
            {surcharge && (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: "var(--vermillion-600)",
                  marginTop: 12,
                }}
              >
                Trop d'objets — aucun stand ne peut tous les contenir.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function groupByCategorie<T>(
  items: T[],
  getCat: (item: T) => CategorieObjet,
): [CategorieObjet, T[]][] {
  const map = new Map<CategorieObjet, T[]>();
  for (const cat of CATEGORIES) map.set(cat, []);
  for (const item of items) map.get(getCat(item))?.push(item);
  return Array.from(map.entries()).filter(([, list]) => list.length > 0);
}

function StockRow({
  objet,
  voitRef,
  prixCourant,
  onChangerPrix,
  onExposer,
}: {
  objet: Objet;
  voitRef: boolean;
  prixCourant: number;
  onChangerPrix: (v: number) => void;
  onExposer: () => void;
}) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px dotted var(--paper-500)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CategorieIcon
            categorie={objet.categorie}
            size={16}
            color="var(--brass-700)"
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              lineHeight: 1.2,
            }}
          >
            {objet.nom}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginTop: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--ink-500)",
          }}
        >
          <EtatBadge etat={objet.etat} />
          <span>
            {voitRef ? `réf. ${objet.prixReferenceReel} €` : "réf. ?"}
          </span>
        </div>
      </div>
      <PrixInput value={prixCourant} onChange={onChangerPrix} />
      <Button variant="primary" size="sm" onClick={onExposer}>
        Exposer
      </Button>
    </li>
  );
}

function PrixInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "var(--paper-300)",
        border: "1px solid var(--brass-700)",
        padding: "4px 8px",
      }}
    >
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        style={{
          width: 64,
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 16,
          color: "var(--forest-800)",
          textAlign: "right",
          padding: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 12,
          color: "var(--brass-700)",
          marginLeft: 4,
        }}
      >
        €
      </span>
    </div>
  );
}

function VitrineRow({
  entree,
  voitRef,
  onPrix,
  onRetirer,
}: {
  entree: ObjetEnVitrine;
  voitRef: boolean;
  onPrix: (v: number) => void;
  onRetirer: () => void;
}) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px dotted var(--paper-500)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CategorieIcon
            categorie={entree.objet.categorie}
            size={16}
            color="var(--brass-700)"
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              lineHeight: 1.2,
            }}
          >
            {entree.objet.nom}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginTop: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--ink-500)",
          }}
        >
          <EtatBadge etat={entree.objet.etat} />
          <span>
            {voitRef ? `réf. ${entree.objet.prixReferenceReel} €` : "réf. ?"}
          </span>
        </div>
      </div>
      <PrixInput value={entree.prixVente} onChange={onPrix} />
      <Button variant="ghost" size="sm" onClick={onRetirer}>
        Retirer
      </Button>
    </li>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 12px" }}>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 16,
          color: "var(--ink-500)",
          marginBottom: 10,
        }}
      >
        {title}
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
        {hint}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: pas de nouvelle erreur dans `[brocanteId]/page.tsx`. Erreurs résiduelles uniquement dans `vitrine/journee/page.tsx` et `qg/page.tsx`.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/vitrine/vide-grenier-quartier`
Expected: 200.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/vitrine/\[brocanteId\]/page.tsx
git commit -m "feat(vitrine): per-brocante preparation page with tier-aware stand cost"
```

---

## Task 7 : Page journée déplacée sous `[brocanteId]`

**Files:**
- Create: `src/app/vitrine/[brocanteId]/journee/page.tsx`
- Delete: `src/app/vitrine/journee/page.tsx`

- [ ] **Step 1 : Copier l'ancien fichier dans le nouveau chemin**

Crée le répertoire si nécessaire et copie :

Run :
```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
mkdir -p src/app/vitrine/\[brocanteId\]/journee
cp src/app/vitrine/journee/page.tsx src/app/vitrine/\[brocanteId\]/journee/page.tsx
```

- [ ] **Step 2 : Adapter le nouveau fichier — lire brocanteId, filtrer le pool par tier, utiliser coutStand**

Édite `src/app/vitrine/[brocanteId]/journee/page.tsx`. Voici les changements à appliquer :

**2a — Ajouter `useParams`** : trouve la ligne `import { useRouter } from "next/navigation";` et remplace par :

```ts
import { useParams, useRouter } from "next/navigation";
```

**2b — Importer `getBrocanteById` et `coutStand`** : ajoute après les imports `@/data/*` existants :

```ts
import { getBrocanteById } from "@/data/brocantes";
import { coutStand } from "@/data/standLevels";
```

**2c — Récupérer la brocante depuis params** : dans `VitrineJourneePage`, juste après `const router = useRouter();`, ajoute :

```ts
  const params = useParams<{ brocanteId: string }>();
  const brocante = useMemo(
    () => getBrocanteById(params.brocanteId),
    [params.brocanteId],
  );
```

Si `useMemo` n'est pas déjà importé depuis "react", ajoute-le à l'import existant :

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
```

**2d — Rediriger si la brocante n'existe pas ou ne correspond pas à la vitrine ouverte** : trouve le `useEffect` qui fait `if (state.vitrine.length === 0 && !journeeFinie)`. Remplace ce useEffect intégralement par :

```ts
  useEffect(() => {
    if (!isHydrated) return;
    if (!state) {
      router.replace("/");
      return;
    }
    if (!brocante) {
      router.replace("/vitrine");
      return;
    }
    if (!state.vitrine || state.vitrine.brocanteId !== brocante.id) {
      router.replace(`/vitrine/${brocante.id}`);
      return;
    }
    if (state.vitrine.objets.length === 0 && !journeeFinie) {
      router.replace(`/vitrine/${brocante.id}`);
    }
  }, [isHydrated, state, router, journeeFinie, brocante]);
```

**2e — Filtrer le pool de personas par tier de la brocante** : trouve la ligne :

```ts
  if (poolRef.current.length === 0) {
    poolRef.current = genererPoolClients(20);
  }
```

Remplace par :

```ts
  if (poolRef.current.length === 0 && brocante) {
    poolRef.current = genererPoolClients(20, brocante.tier);
  }
```

**2f — Snapshot du stand : utiliser `coutStand(brocante.tier, niveau)`** : trouve la fonction `useEffect(() => { ... }, [state])` qui pose `standSnapshot.current`. Remplace son contenu par :

```ts
  useEffect(() => {
    if (standSnapshot.current !== null) return;
    if (!state || !state.vitrine || state.vitrine.objets.length === 0 || !brocante) return;
    const conf = niveauRequis(state.vitrine.objets.length);
    if (conf) {
      standSnapshot.current = {
        niveau: conf.niveau,
        loyer: coutStand(brocante.tier, conf.niveau),
        tailleInitiale: state.vitrine.objets.length,
      };
    }
  }, [state, brocante]);
```

**2g — Adapter toutes les références à `state.vitrine` (qui était un tableau) vers `state.vitrine.objets`** :

Cherche **toutes** les occurrences de `state.vitrine.length` dans le fichier, remplace par `(state.vitrine?.objets.length ?? 0)`.

Cherche **toutes** les occurrences de `state.vitrine.map(`, remplace par `(state.vitrine?.objets ?? []).map(`.

Cherche **toutes** les autres occurrences `state.vitrine[` ou `state.vitrine,` et adapte (pour la plupart : remplacer par `state.vitrine?.objets`).

Cherche aussi `vitrineRef.current = state?.vitrine ?? [];` et remplace par :

```ts
  vitrineRef.current = state?.vitrine?.objets ?? [];
```

- [ ] **Step 3 : Supprimer l'ancien fichier**

Run :
```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
rm src/app/vitrine/journee/page.tsx
rmdir src/app/vitrine/journee
```

- [ ] **Step 4 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -20`
Expected: erreurs résiduelles uniquement dans `qg/page.tsx`. Si des erreurs persistent dans la page journée, c'est qu'une référence à l'ancien `state.vitrine` (tableau) a été oubliée — corriger en suivant le même pattern `state.vitrine?.objets`.

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/vitrine/vide-grenier-quartier/journee`
Expected: 200.

- [ ] **Step 5 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/vitrine/\[brocanteId\]/journee/page.tsx
git add -A src/app/vitrine/journee
git commit -m "feat(vitrine): move journee under [brocanteId], tier-filtered client pool, coutStand"
```

---

## Task 8 : QG — afficher la brocante active

**Files:**
- Modify: `src/app/qg/page.tsx`

- [ ] **Step 1 : Adapter le panneau "Tenir l'étal"**

Édite `src/app/qg/page.tsx`. Importe `getBrocanteById` en haut, à côté des autres imports `@/data/*` :

```ts
import { getBrocanteById } from "@/data/brocantes";
```

Trouve le panneau "Tenir l'étal" qui affiche `state.vitrine.length === 0 ? "Sélectionnez les pièces..." : `${state.vitrine.length} pièce..."`. Remplace ce paragraphe par :

```tsx
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--paper-300)",
                fontSize: 14,
                marginTop: 0,
                marginBottom: 14,
                lineHeight: 1.45,
                textAlign: "center",
              }}
            >
              {(() => {
                if (!state.vitrine) return "Choisissez une brocante pour exposer.";
                const b = getBrocanteById(state.vitrine.brocanteId);
                const n = state.vitrine.objets.length;
                return `${b?.nom ?? "Brocante"} · ${n} pièce${n > 1 ? "s" : ""} sur l'étal.`;
              })()}
            </p>
```

Et remplace le bouton :

```tsx
                {state.vitrine.length === 0 ? "Préparer la vitrine" : "Reprendre la vitrine"}
```

par :

```tsx
                {state.vitrine ? "Reprendre la vitrine" : "Préparer la vitrine"}
```

- [ ] **Step 2 : Type-check + curl complet**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: 0 erreur.

Run :
```bash
for r in /qg /chiner /chiner/vide-grenier-quartier /vitrine /vitrine/vide-grenier-quartier /vitrine/vide-grenier-quartier/journee /atelier /competences /historique /catalogue; do
  curl -s -o /dev/null -w "$r %{http_code}\n" "http://localhost:3000$r"
done
```
Expected: tous 200.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/qg/page.tsx
git commit -m "feat(qg): show active brocante name on stand panel"
```

---

## Vérification finale (manuelle)

1. **/vitrine** affiche un sélecteur de brocantes groupé par tier, identique à /chiner. Une « vitrine en cours » est annoncée en haut si une vitrine est ouverte.
2. **/vitrine/[id]** charge la préparation. Le coût stand correspond bien à la matrice `tier × taille` (ex. brocante 2⭐ standard = 180 €).
3. **/vitrine/[id]/journee** lance la vente avec un pool de personas filtré par tier (en 1⭐ tu n'auras pas de snob bourgeois).
4. **QG** affiche `<Nom de la brocante> · X pièces sur l'étal` quand une vitrine est ouverte.
5. **Migration save** : une sauvegarde pré-Phase-3 (avec `vitrine: ObjetEnVitrine[]`) charge sans crash, les objets sont retournés dans l'inventaire, `state.vitrine = null`.

---

## Self-Review (notes intégrées)

- **Spec coverage** :
  - Spec §6 « Avant/Après » → Tasks 1, 2 (VitrineActive + ouvrirVitrine).
  - Spec §6 « Pool de clients par tier » → Task 4 (tierMin + filter).
  - Spec §6 « Coût stand : tier × taille » → Tasks 3, 6, 7 (coutStand + use).
  - Spec §6 « Avantage grand stand » → **déjà câblé** dans `lib/vitrine.ts` Phase précédente (intervalle ×0.55, appétit ×1.10 via modifiers). Aucune action requise ici.
- **Placeholders** : aucun TBD/TODO. Toutes les actions et codes sont complets.
- **Type consistency** : `VitrineActive = { brocanteId: string, objets: ObjetEnVitrine[] }`, `tierMin: 1|2|3`, `coutStand(tier, niveau)` cohérent partout. Le ref `vitrineRef.current` dans `journee/page.tsx` pointe désormais sur `state.vitrine?.objets`, pas sur l'ancien tableau.
- **Caveat — interaction restauration & vitrine** : si la vitrine est ouverte et que le joueur retourne en stock pour réparer un objet, l'action `retirerDeVitrine` le remet bien dans l'inventaire. La restauration peut donc s'enclencher. OK.
- **Caveat — vidange à la fin de journée** : `viderVitrine` réinitialise désormais `vitrine` à `null` (avant : tableau vide). Les pages qui appellent `viderVitrine()` à la fin de journée doivent rediriger vers `/vitrine` puisque `/vitrine/[id]/journee` redirige aussi vers `/vitrine/[id]` quand la vitrine n'est plus active. À vérifier qu'il n'y a pas de boucle entre journee finie et préparation : la page journee gère `journeeFinie` localement avec `SessionSummary` qui boutonne vers `/qg`, donc OK.
- **Caveat — `BrocanteCard.hrefBase`** : par défaut `"/chiner"` pour ne pas casser /chiner. La page /vitrine override avec `"/vitrine"`.
