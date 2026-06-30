# Vendeur mystère & boîte mystère — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un vendeur mystère qui apparaît aléatoirement dans une brocante et propose une boîte mystère — un objet aléatoire obtenu gratuitement contre une pub récompensée.

**Architecture:** Logique de domaine pure et testée dans `src/lib/boiteMystere.ts` (apparition à probabilité décroissante, tirage du contenu via le pool tier-gated existant, table de rareté/état boostée). Une action fine `reclamerBoiteMystere` dans `GameContext` mute l'état. Deux morceaux d'UI (une carte spéciale dans la grille du chinage + une modale d'ouverture calquée sur `EnergieRecharge`) câblent le tout au provider de pub déjà en place (`getAdProvider().showRewardedAd()`).

**Tech Stack:** Next.js 15 (App Router, `output: "export"`), TypeScript, React 19, Vitest. Images statiques non optimisées → balises `<img>` natives. Pas de `next/image`.

## Global Constraints

- Spec de référence : `docs/superpowers/specs/2026-06-30-vendeur-mystere-boite-design.md`.
- L'objet de la boîte est **gratuit** (0 budget dépensé) ; le paiement = la pub.
- **Probabilité décroissante** : `chance(n) = 0.10 / 2 ** n`, `n` = boîtes déjà *réclamées* le jour de jeu courant. Pas de cap dur. Reset chaque `jourActuel`.
- **Table de rareté (boîte)** : commun 70 / rare 26 / légendaire 4.
- **Table d'état (boîte)** : Mauvais 10 / Bon 30 / Très bon 45 / Pristin 15.
- Le contenu puise dans `poolPourTier(brocante.tier)` (gating économie). Le pool exclut déjà les uniques (boss-only) → aucune gestion d'unique nécessaire.
- **Ne jamais gâcher une pub** : le vendeur n'apparaît que si `placeRestante(state) >= 1` ; re-vérifier `stockageEstPlein` **avant** de lancer la pub.
- Mystère total : aucun indice de contenu avant la pub.
- Art fourni : `public/personas/vendeur-mystere.webp` (420×399, déjà committé).
- Le contenu est tiré **à l'ouverture** (après la pub), pas à l'apparition.
- Test runner : `npx vitest run <chemin>`. Type-check : `npx tsc --noEmit`.

---

### Task 1: Logique de domaine — `lib/boiteMystere.ts` + champ `GameState`

**Files:**
- Modify: `src/types/game.ts` (ajout d'un champ optionnel dans `interface GameState`)
- Create: `src/lib/boiteMystere.ts`
- Test: `src/lib/boiteMystere.test.ts`

**Interfaces:**
- Consumes : `poolPourTier`, `ObjetTemplate` (`@/data/objetTemplates`) ; `FACTEUR_ETAT` (`@/lib/etat`) ; types `Brocante`, `EtatObjet`, `GameState`, `Objet`, `Rarete` (`@/types/game`).
- Produces (utilisés par les tâches suivantes) :
  - `CHANCE_APPARITION_BASE: number`
  - `POIDS_RARETE_BOITE: Record<Rarete, number>`
  - `DISTRIB_ETAT_BOITE: ReadonlyArray<{ etat: EtatObjet; poids: number }>`
  - `VENDEUR_MYSTERE_ILLUSTRATION: string`
  - `nbBoitesReclamees(state: Pick<GameState, "boiteMystere">, jourActuel: number): number`
  - `chanceApparition(n: number): number`
  - `tenterApparition(n: number, rng?: () => number): boolean`
  - `tirerContenuBoite(brocante: Pick<Brocante, "tier">, rng?: () => number): Objet`
  - `appliquerReclamation<S extends Pick<GameState, "boiteMystere" | "jourActuel" | "inventaireJoueur">>(state: S, objet: Objet): S`
  - Champ `GameState.boiteMystere?: { jour: number; reclamees: number }`

- [ ] **Step 1: Ajouter le champ `boiteMystere` au type `GameState`**

Dans `src/types/game.ts`, juste après le champ `energieDerniereMaj: number;` (dernier champ de `interface GameState`, ~ligne 269), ajouter :

```ts
  /** Suivi des boîtes mystère réclamées le jour de jeu courant
   *  (pilote la probabilité d'apparition décroissante). Absent = aucune. */
  boiteMystere?: { jour: number; reclamees: number };
```

- [ ] **Step 2: Écrire le test (échoue d'abord)**

Créer `src/lib/boiteMystere.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import {
  CHANCE_APPARITION_BASE,
  chanceApparition,
  tenterApparition,
  nbBoitesReclamees,
  tirerContenuBoite,
  appliquerReclamation,
  DISTRIB_ETAT_BOITE,
  POIDS_RARETE_BOITE,
} from "./boiteMystere";
import { FACTEUR_ETAT } from "./etat";
import { poolPourTier } from "@/data/objetTemplates";
import type { GameState, Objet } from "@/types/game";

describe("chanceApparition", () => {
  it("vaut la base à n=0 puis divise par 2", () => {
    expect(chanceApparition(0)).toBeCloseTo(CHANCE_APPARITION_BASE);
    expect(chanceApparition(1)).toBeCloseTo(CHANCE_APPARITION_BASE / 2);
    expect(chanceApparition(2)).toBeCloseTo(CHANCE_APPARITION_BASE / 4);
  });
});

describe("tenterApparition", () => {
  it("réussit quand le tirage est sous le seuil", () => {
    expect(tenterApparition(0, () => 0.05)).toBe(true); // 0.05 < 0.10
    expect(tenterApparition(0, () => 0.5)).toBe(false); // 0.5 >= 0.10
    expect(tenterApparition(1, () => 0.06)).toBe(false); // 0.06 >= 0.05
  });
});

describe("nbBoitesReclamees", () => {
  it("renvoie le compteur du jour courant, sinon 0", () => {
    expect(nbBoitesReclamees({ boiteMystere: undefined }, 3)).toBe(0);
    expect(
      nbBoitesReclamees({ boiteMystere: { jour: 3, reclamees: 2 } }, 3),
    ).toBe(2);
    expect(
      nbBoitesReclamees({ boiteMystere: { jour: 2, reclamees: 5 } }, 3),
    ).toBe(0);
  });
});

describe("tirerContenuBoite", () => {
  it("produit un objet valide du pool, prix cohérent avec l'état", () => {
    const poolIds = new Set(poolPourTier(1).map((t) => t.templateId));
    const o = tirerContenuBoite({ tier: 1 }, () => 0);
    expect(poolIds.has(o.templateId)).toBe(true);
    expect(["commun", "rare", "legendaire"]).toContain(o.rarete);
    expect(["Mauvais", "Bon", "Très bon", "Pristin état"]).toContain(o.etat);
    expect(o.prixReferenceReel).toBeGreaterThanOrEqual(1);
    expect(typeof o.id).toBe("string");
  });

  it("peut sortir du Pristin (introuvable en chinage normal)", () => {
    let pristinVu = false;
    let i = 0;
    // rng séquentiel déterministe couvrant toute la distribution d'état.
    const rng = () => ((i++ % 100) + 0.5) / 100;
    for (let k = 0; k < 400 && !pristinVu; k++) {
      if (tirerContenuBoite({ tier: 3 }, rng).etat === "Pristin état") {
        pristinVu = true;
      }
    }
    expect(pristinVu).toBe(true);
  });

  it("respecte grossièrement la table de rareté sur un gros échantillon", () => {
    const counts = { commun: 0, rare: 0, legendaire: 0 };
    for (let k = 0; k < 5000; k++) {
      counts[tirerContenuBoite({ tier: 3 }).rarete] += 1;
    }
    // Communs largement majoritaires, légendaires les plus rares.
    expect(counts.commun).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.legendaire);
    expect(counts.legendaire).toBeGreaterThan(0);
  });
});

describe("appliquerReclamation", () => {
  const base = {
    jourActuel: 3,
    inventaireJoueur: [] as Objet[],
    boiteMystere: undefined as GameState["boiteMystere"],
  };
  const objet = { id: "x", templateId: "t", nom: "N" } as unknown as Objet;

  it("démarre le compteur du jour et ajoute l'objet", () => {
    const r = appliquerReclamation(base, objet);
    expect(r.boiteMystere).toEqual({ jour: 3, reclamees: 1 });
    expect(r.inventaireJoueur).toHaveLength(1);
  });

  it("incrémente si déjà réclamé le même jour", () => {
    const r = appliquerReclamation(
      { ...base, boiteMystere: { jour: 3, reclamees: 1 } },
      objet,
    );
    expect(r.boiteMystere).toEqual({ jour: 3, reclamees: 2 });
  });

  it("réinitialise à 1 si le dernier jour diffère", () => {
    const r = appliquerReclamation(
      { ...base, boiteMystere: { jour: 2, reclamees: 5 } },
      objet,
    );
    expect(r.boiteMystere).toEqual({ jour: 3, reclamees: 1 });
  });
});

describe("constantes de table", () => {
  it("la table d'état somme à 100", () => {
    expect(DISTRIB_ETAT_BOITE.reduce((s, e) => s + e.poids, 0)).toBe(100);
  });
  it("la table de rareté correspond au spec", () => {
    expect(POIDS_RARETE_BOITE).toEqual({ commun: 70, rare: 26, legendaire: 4 });
  });
});
```

- [ ] **Step 3: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/lib/boiteMystere.test.ts`
Expected: FAIL — `Failed to resolve import "./boiteMystere"` (le module n'existe pas encore).

- [ ] **Step 4: Implémenter `src/lib/boiteMystere.ts`**

```ts
import type { Brocante, EtatObjet, GameState, Objet, Rarete } from "@/types/game";
import { poolPourTier, type ObjetTemplate } from "@/data/objetTemplates";
import { FACTEUR_ETAT } from "@/lib/etat";

/** Chemin de l'illustration du PNJ vendeur mystère (public/). */
export const VENDEUR_MYSTERE_ILLUSTRATION = "/personas/vendeur-mystere.webp";

/** Probabilité d'apparition de la 1ʳᵉ boîte du jour (par entrée en brocante). */
export const CHANCE_APPARITION_BASE = 0.1;

/** Poids de tirage par rareté dans la boîte (boostés vs chinage normal). */
export const POIDS_RARETE_BOITE: Record<Rarete, number> = {
  commun: 70,
  rare: 26,
  legendaire: 4,
};

/** Distribution d'état dans la boîte (somme = 100). Inclut Pristin (atelier-only en chinage). */
export const DISTRIB_ETAT_BOITE: ReadonlyArray<{ etat: EtatObjet; poids: number }> = [
  { etat: "Mauvais", poids: 10 },
  { etat: "Bon", poids: 30 },
  { etat: "Très bon", poids: 45 },
  { etat: "Pristin état", poids: 15 },
];

/** Boîtes déjà réclamées le jour de jeu courant (0 si autre jour / jamais). */
export function nbBoitesReclamees(
  state: Pick<GameState, "boiteMystere">,
  jourActuel: number,
): number {
  const b = state.boiteMystere;
  return b && b.jour === jourActuel ? b.reclamees : 0;
}

/** Chance d'apparition décroissante : base / 2^n. */
export function chanceApparition(n: number): number {
  return CHANCE_APPARITION_BASE / 2 ** n;
}

/** Tire l'apparition du vendeur pour une entrée, sachant n boîtes déjà réclamées. */
export function tenterApparition(n: number, rng: () => number = Math.random): boolean {
  return rng() < chanceApparition(n);
}

function tirerEtatBoite(rng: () => number): EtatObjet {
  const total = DISTRIB_ETAT_BOITE.reduce((s, e) => s + e.poids, 0);
  let r = rng() * total;
  for (const e of DISTRIB_ETAT_BOITE) {
    r -= e.poids;
    if (r <= 0) return e.etat;
  }
  return DISTRIB_ETAT_BOITE[DISTRIB_ETAT_BOITE.length - 1].etat;
}

function tirerTemplateBoite(
  pool: readonly ObjetTemplate[],
  rng: () => number,
): ObjetTemplate {
  const total = pool.reduce((s, t) => s + POIDS_RARETE_BOITE[t.rarete], 0);
  let r = rng() * total;
  for (const t of pool) {
    r -= POIDS_RARETE_BOITE[t.rarete];
    if (r <= 0) return t;
  }
  return pool[pool.length - 1];
}

/**
 * Tire le contenu d'une boîte : un `Objet` prêt à ajouter à l'inventaire.
 * Puise dans le pool tier-gated de la brocante hôte (gating économie) ;
 * applique les tables de rareté + état boostées. Pas de négociation/prix vendeur.
 */
export function tirerContenuBoite(
  brocante: Pick<Brocante, "tier">,
  rng: () => number = Math.random,
): Objet {
  const pool = poolPourTier(brocante.tier);
  const template = tirerTemplateBoite(pool, rng);
  const etat = tirerEtatBoite(rng);
  const prixReferenceReel = Math.max(
    1,
    Math.round(template.prixRefBase * FACTEUR_ETAT[etat]),
  );
  return {
    id: crypto.randomUUID(),
    templateId: template.templateId,
    nom: template.nom,
    categorie: template.categorie,
    etat,
    prixReferenceReel,
    rarete: template.rarete,
  };
}

/**
 * Applique une réclamation à l'état : ajoute l'objet et incrémente le compteur
 * du jour (reset si le dernier jour diffère). Fonction pure. La vérification de
 * capacité de stockage reste à la charge de l'appelant (action contexte).
 */
export function appliquerReclamation<
  S extends Pick<GameState, "boiteMystere" | "jourActuel" | "inventaireJoueur">,
>(state: S, objet: Objet): S {
  const reclamees =
    state.boiteMystere && state.boiteMystere.jour === state.jourActuel
      ? state.boiteMystere.reclamees + 1
      : 1;
  return {
    ...state,
    inventaireJoueur: [...state.inventaireJoueur, objet],
    boiteMystere: { jour: state.jourActuel, reclamees },
  };
}
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/lib/boiteMystere.test.ts`
Expected: PASS (tous les `describe`/`it` verts).

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add src/types/game.ts src/lib/boiteMystere.ts src/lib/boiteMystere.test.ts
git commit -m "feat(boite-mystere): logique de domaine (apparition, tirage, réclamation)"
```

---

### Task 2: Action `reclamerBoiteMystere` dans `GameContext`

**Files:**
- Modify: `src/context/GameContext.tsx` (interface `GameActionsValue`, définition `useCallback`, objet `actionsValue` + son tableau de deps)

**Interfaces:**
- Consumes : `appliquerReclamation` (`@/lib/boiteMystere`), `stockageEstPlein` (`@/lib/stockage`, déjà importé), type `Objet`.
- Produces : action `reclamerBoiteMystere(objet: Objet): void` exposée via `useGame()`.

- [ ] **Step 1: Déclarer l'action dans l'interface**

Dans `src/context/GameContext.tsx`, interface `GameActionsValue`, juste après la ligne `crediterEnergiePub: () => void;` (~ligne 183), ajouter :

```ts
  /** Réclame une boîte mystère : ajoute l'objet (si place) et incrémente le compteur du jour. */
  reclamerBoiteMystere: (objet: Objet) => void;
```

- [ ] **Step 2: Ajouter l'import de `appliquerReclamation`**

`stockageEstPlein` est déjà importé (ligne ~57). Ajouter en tête de fichier, près des autres imports `@/lib/...` :

```ts
import { appliquerReclamation } from "@/lib/boiteMystere";
```

- [ ] **Step 3: Implémenter le `useCallback`**

Juste après la définition de `crediterEnergiePub` (le `useCallback` se termine ~ligne 292), ajouter :

```ts
  const reclamerBoiteMystere = useCallback((objet: Objet) => {
    setState((prev) => {
      if (!prev) return prev;
      // Filet : ne jamais ajouter en silence si le stockage est plein
      // (l'UI bloque déjà avant la pub, ceci couvre la course).
      if (stockageEstPlein(prev)) return prev;
      return appliquerReclamation(prev, objet);
    });
  }, []);
```

- [ ] **Step 4: Enregistrer l'action dans `actionsValue`**

Dans l'objet `actionsValue` (`useMemo`, ~ligne 1385) ajouter `reclamerBoiteMystere,` juste après `crediterEnergiePub,` (~ligne 1427), ET dans le tableau de dépendances (~ligne 1472) ajouter de même `reclamerBoiteMystere,` après `crediterEnergiePub,`.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 6: Vérifier que la suite de tests existante passe toujours**

Run: `npx vitest run`
Expected: PASS (aucune régression).

- [ ] **Step 7: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(boite-mystere): action reclamerBoiteMystere dans GameContext"
```

---

### Task 3: Modale d'ouverture — `BoiteMystereOverlay`

**Files:**
- Create: `src/components/mobile/BoiteMystereOverlay.tsx`

**Interfaces:**
- Consumes : `useGame` (`state`, `reclamerBoiteMystere`), `useToast` (`@/components/ui/Toast`), `getAdProvider` (`@/lib/ads/adProvider`), `tirerContenuBoite` + `VENDEUR_MYSTERE_ILLUSTRATION` (`@/lib/boiteMystere`), `stockageEstPlein` (`@/lib/stockage`), `ItemCard` (`@/components/ui/ItemCard`), type `Brocante`, `Objet`.
- Produces : composant `BoiteMystereOverlay` (export nommé) avec props `{ brocante: Brocante; onClose: () => void; onClaimed: () => void }`.

- [ ] **Step 1: Créer le composant**

Créer `src/components/mobile/BoiteMystereOverlay.tsx` :

```tsx
"use client";

import { useState, type CSSProperties } from "react";
import { Gift, X } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { useToast } from "@/components/ui/Toast";
import { getAdProvider } from "@/lib/ads/adProvider";
import {
  tirerContenuBoite,
  VENDEUR_MYSTERE_ILLUSTRATION,
} from "@/lib/boiteMystere";
import { stockageEstPlein } from "@/lib/stockage";
import { ItemCard } from "@/components/ui/ItemCard";
import type { Brocante, Objet } from "@/types/game";

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 340,
  background: "var(--forest-800)",
  border: "3px solid var(--brass-500)",
  borderRadius: 14,
  padding: "18px 16px",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  position: "relative",
  textAlign: "center",
};

const boutonStyle = (disabled: boolean): CSSProperties => ({
  width: "100%",
  padding: "12px",
  borderRadius: 10,
  border: "2px solid var(--brass-500)",
  background: disabled ? "var(--forest-700)" : "var(--brass-500)",
  color: disabled ? "var(--brass-700)" : "var(--forest-900)",
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
});

export function BoiteMystereOverlay({
  brocante,
  onClose,
  onClaimed,
}: {
  brocante: Brocante;
  onClose: () => void;
  onClaimed: () => void;
}) {
  const { state, reclamerBoiteMystere } = useGame();
  const { toast } = useToast();
  const [enCours, setEnCours] = useState(false);
  const [objet, setObjet] = useState<Objet | null>(null);

  if (!state) return null;

  const ouvrir = async () => {
    if (enCours || objet) return;
    // Ne jamais gâcher une pub : si le stock est plein, on bloque avant.
    if (stockageEstPlein(state)) {
      toast("Stockage plein — fais de la place avant d'ouvrir la boîte.", {
        type: "info",
      });
      return;
    }
    setEnCours(true);
    try {
      const { rewarded } = await getAdProvider().showRewardedAd();
      if (!rewarded) return; // pub non terminée : la boîte reste ouvrable
      const gagne = tirerContenuBoite(brocante);
      reclamerBoiteMystere(gagne);
      setObjet(gagne);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "transparent",
            border: "none",
            color: "var(--brass-700)",
            cursor: "pointer",
          }}
        >
          <X size={20} />
        </button>

        {objet ? (
          <>
            <h2 style={{ fontSize: 18, margin: "4px 0 12px" }}>
              Tu as trouvé&nbsp;:
            </h2>
            <div style={{ maxWidth: 180, margin: "0 auto 14px" }}>
              <ItemCard
                templateId={objet.templateId}
                categorie={objet.categorie}
                etat={objet.etat}
                rarete={objet.rarete}
                nom={objet.nom}
              />
            </div>
            <p style={{ fontSize: 12, color: "var(--brass-200)", margin: "0 0 14px" }}>
              Ajouté à ton stock.
            </p>
            <button onClick={onClaimed} style={boutonStyle(false)}>
              Parfait !
            </button>
          </>
        ) : (
          <>
            <img
              src={VENDEUR_MYSTERE_ILLUSTRATION}
              alt="Vendeur mystère"
              style={{
                width: 140,
                height: "auto",
                margin: "0 auto 10px",
                display: "block",
                borderRadius: 10,
              }}
            />
            <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>Vendeur mystère</h2>
            <p style={{ fontSize: 13, color: "var(--brass-200)", margin: "0 0 16px" }}>
              Une boîte scellée… personne ne sait ce qu'elle cache. Regarde une
              pub pour l'ouvrir.
            </p>
            <button
              onClick={ouvrir}
              disabled={enCours}
              style={boutonStyle(enCours)}
            >
              <Gift size={16} />
              {enCours ? "Ouverture…" : "Regarder une pub pour ouvrir"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: aucune erreur. (Si `ItemCard` n'accepte pas exactement ces props, ouvrir `src/components/ui/ItemCard.tsx` et aligner — les props `templateId`, `categorie`, `etat`, `rarete`, `nom` sont celles utilisées dans `ClientPage.tsx` § `ObjetCardMobile`.)

- [ ] **Step 3: Lint**

Run: `npx next lint --file src/components/mobile/BoiteMystereOverlay.tsx`
Expected: aucune erreur bloquante. (Un warning `@next/next/no-img-element` est attendu et acceptable — l'app est en export statique avec `images.unoptimized`. Si la config lint le traite en erreur, ajouter au-dessus de la balise : `{/* eslint-disable-next-line @next/next/no-img-element */}`.)

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/BoiteMystereOverlay.tsx
git commit -m "feat(boite-mystere): modale d'ouverture (pub + révélation)"
```

---

### Task 4: Intégration dans le mode chinage — `ClientPage`

**Files:**
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx`

**Interfaces:**
- Consumes : `nbBoitesReclamees`, `tenterApparition`, `VENDEUR_MYSTERE_ILLUSTRATION` (`@/lib/boiteMystere`) ; `placeRestante` (`@/lib/stockage`) ; `BoiteMystereOverlay` (`@/components/mobile/BoiteMystereOverlay`).
- Produces : feature complète jouable (carte vendeur mystère dans la grille + modale).

- [ ] **Step 1: Ajouter les imports**

En tête de `src/app/chiner/[brocanteId]/ClientPage.tsx`, ajouter :

```ts
import { nbBoitesReclamees, tenterApparition, VENDEUR_MYSTERE_ILLUSTRATION } from "@/lib/boiteMystere";
import { BoiteMystereOverlay } from "@/components/mobile/BoiteMystereOverlay";
```

Et modifier l'import existant `import { stockageEstPlein } from "@/lib/stockage";` (ligne ~25) en :

```ts
import { placeRestante, stockageEstPlein } from "@/lib/stockage";
```

- [ ] **Step 2: Ajouter les états locaux du vendeur**

Juste après la déclaration `const [negoOuverte, setNegoOuverte] = useState<string | null>(null);` (~ligne 76), ajouter :

```ts
  /** Le vendeur mystère est-il présent dans cette session (tiré à l'entrée) ? */
  const [vendeurPresent, setVendeurPresent] = useState(false);
  /** La modale de la boîte mystère est-elle ouverte ? */
  const [boiteOuverte, setBoiteOuverte] = useState(false);
```

- [ ] **Step 3: Tirer l'apparition au moment de la génération de session**

Dans le `useEffect` d'entrée, juste après la boucle `for (const it of session) { marquerVuTemplate(it.objet.templateId); }` (~ligne 129) et avant la fermeture du bloc `if`, ajouter :

```ts
      // Vendeur mystère : tirage à probabilité décroissante (1/10, puis ÷2 par
      // boîte déjà réclamée aujourd'hui). N'apparaît que s'il reste de la place
      // (jamais de pub gâchée).
      const nReclamees = nbBoitesReclamees(state, state.jourActuel);
      if (placeRestante(state) >= 1 && tenterApparition(nReclamees)) {
        setVendeurPresent(true);
      }
```

- [ ] **Step 4: Rendre la carte du vendeur en tête de grille**

Dans le JSX, à l'intérieur du `<div>` de la grille (celui dont le style contient `gridTemplateColumns: "repeat(auto-fill, ...)"`, ~ligne 273), juste avant `{(items ?? []).filter(...)`, insérer :

```tsx
          {vendeurPresent && (
            <button
              type="button"
              onClick={() => setBoiteOuverte(true)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 6,
                padding: 8,
                background: "var(--forest-800)",
                border: "2px solid var(--brass-500)",
                borderRadius: 10,
                cursor: "pointer",
                color: "var(--brass-300)",
                fontFamily: "var(--font-display)",
                aspectRatio: "3 / 4",
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={VENDEUR_MYSTERE_ILLUSTRATION}
                alt="Vendeur mystère"
                style={{ width: "100%", height: "auto", borderRadius: 6 }}
              />
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Vendeur mystère
              </span>
            </button>
          )}
```

- [ ] **Step 5: Monter la modale**

Juste avant la dernière balise fermante du composant (après le `.map(...)` des `NegociationSheet`, ~ligne 361, avant le `</div>` final), ajouter :

```tsx
      {boiteOuverte && (
        <BoiteMystereOverlay
          brocante={brocante}
          onClose={() => setBoiteOuverte(false)}
          onClaimed={() => {
            setBoiteOuverte(false);
            setVendeurPresent(false); // consommée pour cette session
          }}
        />
      )}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 7: Build de validation (export statique)**

Run: `npm run build`
Expected: build réussi, aucune erreur de type/lint bloquante.

- [ ] **Step 8: Vérification manuelle**

Démarrer l'app (`npm run dev`), entrer dans une brocante plusieurs fois. Attendu :
- Le vendeur mystère apparaît parfois en tête de grille (≈ 1 entrée sur 10 ; pour forcer la vérif, baisser temporairement `CHANCE_APPARITION_BASE` à `1` dans `boiteMystere.ts`, tester, puis remettre `0.1`).
- Tap → modale (art du PNJ + bouton pub). Bouton → délai (StubAdProvider 800 ms) → révélation d'un objet → l'objet est dans le stock (vérifier le stockage).
- Stock plein → la carte n'apparaît pas ; et si on ouvre une boîte alors que le stock se remplit, un toast « Stockage plein » bloque avant la pub.

- [ ] **Step 9: Commit**

```bash
git add "src/app/chiner/[brocanteId]/ClientPage.tsx"
git commit -m "feat(boite-mystere): intégration vendeur mystère dans le chinage"
```

---

## Self-Review

**1. Spec coverage**
- Apparition % par entrée + proba décroissante → Task 1 (`chanceApparition`/`tenterApparition`) + Task 4 (tirage à l'entrée). ✓
- Contenu objets uniquement, pool tier-gated, table rareté + état → Task 1 (`tirerContenuBoite`). ✓
- Réclamation = pub + compteur du jour → Task 1 (`appliquerReclamation`) + Task 2 (action) + Task 3 (modale). ✓
- Stockage plein jamais de pub gâchée → Task 3 (check avant pub) + Task 4 (carte masquée si `placeRestante < 1`) + Task 2 (filet dans l'action). ✓
- Mystère total → Task 3 (aucun indice avant la pub). ✓
- Contenu tiré à l'ouverture → Task 3 (`tirerContenuBoite` appelé après `rewarded`). ✓
- Art du PNJ → Task 1 (`VENDEUR_MYSTERE_ILLUSTRATION`) + Tasks 3 & 4. ✓
- Champ d'état `boiteMystere` + reset par jour → Task 1 (type + `appliquerReclamation`). ✓
- Migration : champ **optionnel additif** ; absent = 0 boîte (géré par `nbBoitesReclamees`). Aucune transformation ni bump `SAVE_VERSION` requis (simplification assumée vs note du spec — aucun comportement cassé : `...loaded` conserve le champ s'il existe, et l'absence est traitée comme défaut sûr). ✓

**2. Placeholder scan** : aucun TODO/TBD ; chaque étape contient le code réel. ✓

**3. Type consistency** : `tirerContenuBoite(brocante: Pick<Brocante,"tier">)` — appelé avec `brocante` complet (Task 3/4) et `{ tier: n }` (tests) ✓. `appliquerReclamation` générique sur `Pick<GameState,...>` ✓. `reclamerBoiteMystere(objet: Objet)` cohérent interface/usage ✓. `nbBoitesReclamees(state, jourActuel)` signatures identiques partout ✓.

**Note de scope** : aucun dédup d'unique/légendaire possédé en v1 — le pool (`POOL_CHINAGE`) exclut déjà les uniques par construction ; un doublon de légendaire reste une valeur revendable acceptable. Conforme au comportement du chinage normal.
