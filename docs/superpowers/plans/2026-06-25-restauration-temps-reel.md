# Restauration en temps réel (🅱) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire passer la restauration d'objet d'un délai en jours de jeu à un timer en temps réel (1 h / 2 h / 4 h selon l'état de départ), avec notification « Objet restauré » et mécanique de fin anticipée (skip pub, déclencheur stub).

**Architecture:** Logique pure dans `src/lib/restauration.ts` (durées + restant/progression/prêt, sur le modèle de `energie.ts`), consommée par GameContext via le temps de confiance (ancre anti-triche). `enRestauration` stocke `debutMs`/`finMs` au lieu de `jourFin`. Notifications via le cœur 🅰. UI atelier avec compte à rebours temps réel.

**Tech Stack:** Next.js (export statique) + Tauri 2, React 19, Vitest (jsdom).

**Spec:** `docs/superpowers/specs/2026-06-25-restauration-temps-reel-design.md`

---

## File Structure

- `src/lib/restauration.ts` — **créé.** Constantes de durée + logique pure (`dureeRestaurationMs`, `restantMs`, `progression`, `estPret`, `peutTerminerImmediat`).
- `src/lib/restauration.test.ts` — **créé.**
- `src/lib/notifications/ids.ts` — **modifié.** Ajoute `RESTAURATION: [100, 101, 102]`.
- `src/lib/notifications/restaurationNotif.ts` — **créé.** `notifsRestauration` (pur) + `synchroniserNotifsRestauration` (effet).
- `src/lib/notifications/restaurationNotif.test.ts` — **créé.**
- `src/types/game.ts` — **modifié.** `enRestauration` → `{ etatCible, debutMs, finMs }`.
- `src/lib/atelier.ts` — **modifié.** `appliquerRecuperation(state, id, now)`.
- `src/lib/atelier.test.ts` — **modifié.** Fixtures `finMs` + signature.
- `src/lib/missions.test.ts` — **modifié.** Fixture `enRestauration`.
- `src/context/GameContext.tsx` — **modifié.** `restaurerObjet`, `recupererObjetRestaure`, `terminerRestaurationImmediate`, effet notif.
- `src/lib/migrations.ts` — **modifié.** `SAVE_VERSION = 6` + migration `enRestauration`.
- `src/lib/migrations.test.ts` — **modifié.**
- `src/lib/competences.ts` — **modifié.** Retire `dureeRestauration` (jours).
- `src/app/atelier/gerer/page.tsx` (+ lignes/rows associées) — **modifié.** Compte à rebours temps réel, libellé de durée, bouton « Terminer (pub) ».

---

## Task 1: Logique pure `restauration.ts`

**Files:**
- Create: `src/lib/restauration.ts`
- Test: `src/lib/restauration.test.ts`

- [ ] **Step 1: Écrire le test**

Create `src/lib/restauration.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  DUREE_RESTAURATION_MS,
  FENETRE_PUB_MS,
  dureeRestaurationMs,
  restantMs,
  progression,
  estPret,
  peutTerminerImmediat,
} from "./restauration";
import type { GameState } from "@/types/game";

const H = 60 * 60 * 1000;

// État minimal : `aMaitreReparer` lit competencesDebloquees. Vide = pas maître.
function stateSansMaitre(): GameState {
  return { competencesDebloquees: [] } as unknown as GameState;
}
function stateMaitreLivres(): GameState {
  // catTreeId("Livres") = "livres" → palier "livres.reparer.3".
  return { competencesDebloquees: ["livres.reparer.3"] } as unknown as GameState;
}

describe("dureeRestaurationMs", () => {
  it("durées par état de départ (sans maître)", () => {
    const s = stateSansMaitre();
    expect(dureeRestaurationMs(s, "Livres", "Mauvais")).toBe(1 * H);
    expect(dureeRestaurationMs(s, "Livres", "Bon")).toBe(2 * H);
    expect(dureeRestaurationMs(s, "Livres", "Très bon")).toBe(4 * H);
  });

  it("Maître Réparer applique le facteur 0,6", () => {
    expect(dureeRestaurationMs(stateMaitreLivres(), "Livres", "Bon")).toBe(
      Math.round(2 * H * 0.6),
    );
  });
});

describe("restant / progression / prêt", () => {
  const enRest = { etatCible: "Bon" as const, debutMs: 1000, finMs: 1000 + 2 * H };

  it("restantMs décroît, plancher à 0", () => {
    expect(restantMs(enRest, 1000)).toBe(2 * H);
    expect(restantMs(enRest, 1000 + 2 * H + 5000)).toBe(0);
  });

  it("progression va de 0 à 1", () => {
    expect(progression(enRest, 1000)).toBe(0);
    expect(progression(enRest, 1000 + H)).toBeCloseTo(0.5, 5);
    expect(progression(enRest, 1000 + 3 * H)).toBe(1);
  });

  it("estPret quand now >= finMs", () => {
    expect(estPret(enRest, 1000 + 2 * H - 1)).toBe(false);
    expect(estPret(enRest, 1000 + 2 * H)).toBe(true);
  });
});

describe("peutTerminerImmediat (fenêtre pub)", () => {
  const enRest = { etatCible: "Bon" as const, debutMs: 0, finMs: 10 * H };

  it("faux si > 30 min restantes", () => {
    expect(peutTerminerImmediat(enRest, 10 * H - FENETRE_PUB_MS - 1)).toBe(false);
  });
  it("vrai si 0 < restant <= 30 min", () => {
    expect(peutTerminerImmediat(enRest, 10 * H - FENETRE_PUB_MS)).toBe(true);
    expect(peutTerminerImmediat(enRest, 10 * H - 1)).toBe(true);
  });
  it("faux si déjà fini (restant = 0)", () => {
    expect(peutTerminerImmediat(enRest, 10 * H)).toBe(false);
  });
});

it("DUREE_RESTAURATION_MS couvre tous les états", () => {
  expect(DUREE_RESTAURATION_MS["Mauvais"]).toBe(1 * H);
  expect(DUREE_RESTAURATION_MS["Pristin état"]).toBe(0);
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `npx vitest run src/lib/restauration.test.ts`
Expected: FAIL (module `./restauration` absent).

- [ ] **Step 3: Écrire l'implémentation**

Create `src/lib/restauration.ts`:

```ts
import type { CategorieObjet, EtatObjet, GameState } from "@/types/game";
import { aMaitreReparer } from "@/lib/competences";

/** Durée totale par état de DÉPART (plus l'objet est bon, plus c'est long). */
export const DUREE_RESTAURATION_MS: Record<EtatObjet, number> = {
  Mauvais: 1 * 60 * 60 * 1000,
  Bon: 2 * 60 * 60 * 1000,
  "Très bon": 4 * 60 * 60 * 1000,
  "Pristin état": 0, // non restaurable
};

/** Facteur appliqué à la durée si la catégorie a le palier « Maître Réparer ». */
export const MAITRE_REPARER_FACTEUR = 0.6;

/** Fenêtre (avant la fin) pendant laquelle on peut terminer via pub. */
export const FENETRE_PUB_MS = 30 * 60 * 1000;

/** Sous-ensemble temporel d'`enRestauration` manipulé par les fonctions pures. */
type Timer = { debutMs: number; finMs: number };

/** Durée totale (ms) pour restaurer un objet de `etatDepart`, compétence incluse. */
export function dureeRestaurationMs(
  state: GameState,
  cat: CategorieObjet,
  etatDepart: EtatObjet,
): number {
  const base = DUREE_RESTAURATION_MS[etatDepart];
  return aMaitreReparer(state, cat)
    ? Math.round(base * MAITRE_REPARER_FACTEUR)
    : base;
}

/** Millisecondes restantes (plancher 0). `now` = temps de confiance. */
export function restantMs(enRest: Timer, now: number): number {
  return Math.max(0, enRest.finMs - now);
}

/** Progression 0→1. Renvoie 1 si la fenêtre est nulle/négative. */
export function progression(enRest: Timer, now: number): number {
  const total = enRest.finMs - enRest.debutMs;
  if (total <= 0) return 1;
  const p = (now - enRest.debutMs) / total;
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

/** Restauration terminée (récupérable). */
export function estPret(enRest: Timer, now: number): boolean {
  return now >= enRest.finMs;
}

/** Vrai si on est dans la fenêtre pub : 0 < restant <= 30 min. */
export function peutTerminerImmediat(enRest: Timer, now: number): boolean {
  const r = enRest.finMs - now;
  return r > 0 && r <= FENETRE_PUB_MS;
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `npx vitest run src/lib/restauration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/restauration.ts src/lib/restauration.test.ts
git commit -m "feat(restauration): logique pure temps réel (durées, restant, prêt, fenêtre pub)"
```

---

## Task 2: Notification « Objet restauré »

**Files:**
- Modify: `src/lib/notifications/ids.ts`
- Create: `src/lib/notifications/restaurationNotif.ts`
- Test: `src/lib/notifications/restaurationNotif.test.ts`

- [ ] **Step 1: Ajouter les IDs**

In `src/lib/notifications/ids.ts`, inside the `NOTIF_IDS` object, after the `RAPPEL_RETOUR` line, add:

```ts
  RESTAURATION: [100, 101, 102] as const, // 1 par slot d'atelier (max niveau 3)
```

- [ ] **Step 2: Écrire le test**

Create `src/lib/notifications/restaurationNotif.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  notifsRestauration,
  synchroniserNotifsRestauration,
} from "./restaurationNotif";
import { NOTIF_IDS } from "./ids";

describe("notifsRestauration (pur)", () => {
  it("une notif par objet non terminé, IDs 100..102, à finMs", () => {
    const now = 1000;
    const specs = notifsRestauration(
      [
        { nom: "Vase", finMs: 5000 },
        { nom: "Lampe", finMs: 8000 },
      ],
      now,
    );
    expect(specs.map((s) => s.id)).toEqual([
      NOTIF_IDS.RESTAURATION[0],
      NOTIF_IDS.RESTAURATION[1],
    ]);
    expect(specs.map((s) => s.atMs)).toEqual([5000, 8000]);
    expect(specs[0].body).toContain("Vase");
    expect(specs[0].sound).toBe("default");
  });

  it("ignore les objets déjà terminés (finMs <= now)", () => {
    expect(notifsRestauration([{ nom: "X", finMs: 500 }], 1000)).toHaveLength(0);
  });

  it("plafonne à 3 notifs (nombre d'IDs réservés)", () => {
    const objets = Array.from({ length: 5 }, (_, i) => ({
      nom: `O${i}`,
      finMs: 10000 + i,
    }));
    expect(notifsRestauration(objets, 0)).toHaveLength(3);
  });
});

describe("synchroniserNotifsRestauration hors Tauri", () => {
  it("est un no-op sans lever", async () => {
    await expect(
      synchroniserNotifsRestauration([{ nom: "X", finMs: 9_999_999_999 }], 0),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: Lancer le test → échec**

Run: `npx vitest run src/lib/notifications/restaurationNotif.test.ts`
Expected: FAIL (module absent).

- [ ] **Step 4: Écrire l'implémentation**

Create `src/lib/notifications/restaurationNotif.ts`:

```ts
/**
 * Notifs « Objet restauré » : une par objet en restauration (max 3, = slots
 * d'atelier), programmée à l'échéance `finMs`. Réutilise le cœur générique 🅰.
 */
import { NOTIF_IDS } from "./ids";
import { type NotifSpec, programmer, annuler, permissionAccordee } from "./index";

/** Objet en cours, vu par les notifs. */
export interface ObjetEnRestau {
  nom: string;
  finMs: number;
}

/** Construit les specs (objets non terminés, plafonnés au nombre d'IDs). Pur. */
export function notifsRestauration(
  objets: ObjetEnRestau[],
  now: number,
): NotifSpec[] {
  return objets
    .filter((o) => o.finMs > now)
    .slice(0, NOTIF_IDS.RESTAURATION.length)
    .map((o, i) => ({
      id: NOTIF_IDS.RESTAURATION[i],
      title: "Atelier",
      body: `« ${o.nom} » est restauré ✓`,
      sound: "default",
      atMs: o.finMs,
    }));
}

/** Annule la plage puis (re)programme. No-op si permission non accordée. */
export async function synchroniserNotifsRestauration(
  objets: ObjetEnRestau[],
  now: number,
): Promise<void> {
  await annuler([...NOTIF_IDS.RESTAURATION]);
  if (!(await permissionAccordee())) return;
  for (const spec of notifsRestauration(objets, now)) {
    await programmer(spec);
  }
}
```

- [ ] **Step 5: Lancer le test → succès**

Run: `npx vitest run src/lib/notifications/restaurationNotif.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/notifications/ids.ts src/lib/notifications/restaurationNotif.ts src/lib/notifications/restaurationNotif.test.ts
git commit -m "feat(notifs): notification « Objet restauré » (IDs 100-102)"
```

---

## Task 3: Bascule du modèle de données en temps réel

Tâche transversale : le type `enRestauration` change, donc tous ses lecteurs/écrivains
changent ensemble pour que le projet compile et que les tests passent.

**Files:**
- Modify: `src/types/game.ts` (bloc `enRestauration?`)
- Modify: `src/lib/atelier.ts` (`appliquerRecuperation`)
- Modify: `src/lib/atelier.test.ts` (fixtures + appel)
- Modify: `src/lib/missions.test.ts` (fixture ligne ~50)
- Modify: `src/context/GameContext.tsx` (`restaurerObjet`, `recupererObjetRestaure`, ajout `terminerRestaurationImmediate`)

- [ ] **Step 1: Changer le type**

In `src/types/game.ts`, replace the `enRestauration?` block:

```ts
  /** Présent si l'objet est en cours de restauration à l'atelier. */
  enRestauration?: {
    etatCible: EtatObjet;
    /** Jour à partir duquel la restauration sera terminée (>=). */
    jourFin: number;
  };
```

with:

```ts
  /** Présent si l'objet est en cours de restauration à l'atelier (temps réel). */
  enRestauration?: {
    etatCible: EtatObjet;
    /** Ancre (temps de confiance, epoch ms) du début. */
    debutMs: number;
    /** Échéance (epoch ms) : restauration prête quand now >= finMs. */
    finMs: number;
  };
```

- [ ] **Step 2: Adapter `appliquerRecuperation` (temps réel)**

In `src/lib/atelier.ts`, replace the whole `appliquerRecuperation` function (currently
checking `state.jourActuel < objet.enRestauration.jourFin`) with:

```ts
/**
 * Applique la fin de restauration d'un objet : mute son état vers `etatCible`,
 * recalcule son prix de référence, et efface `enRestauration`. Retourne null si
 * l'objet n'existe pas, n'est pas en restauration, ou si la restauration n'est
 * pas encore terminée (`now < finMs`). `now` = temps de confiance (epoch ms).
 *
 * Helper pur — appelé par GameContext.
 */
export function appliquerRecuperation(
  state: GameState,
  objetId: string,
  now: number,
): GameState | null {
  const objet = state.inventaireJoueur.find((o) => o.id === objetId);
  if (!objet || !objet.enRestauration) return null;
  if (now < objet.enRestauration.finMs) return null;
  const cible = objet.enRestauration.etatCible;
  const inv = state.inventaireJoueur.map((o) =>
    o.id === objetId
      ? {
          ...o,
          etat: cible,
          prixReferenceReel: recalculerPrixReference(
            o.prixReferenceReel,
            o.etat,
            cible,
          ),
          enRestauration: undefined,
        }
      : o,
  );
  return { ...state, inventaireJoueur: inv };
}
```

- [ ] **Step 3: Adapter les fixtures de test**

In `src/lib/atelier.test.ts`, replace every literal `enRestauration: { etatCible: "<X>", jourFin: <N> }`
with `enRestauration: { etatCible: "<X>", debutMs: 0, finMs: <N> }` (garder la même valeur
numérique comme `finMs`). Et pour chaque appel `appliquerRecuperation(state, id)`, ajouter
l'argument `now` : `appliquerRecuperation(state, id, <now>)`. Pour les cas « prêt »,
passer `now` >= `finMs` (ex. `appliquerRecuperation(state, id, 999999)`); pour « pas prêt »,
passer `now` < `finMs` (ex. `0`).

In `src/lib/missions.test.ts` line ~50, replace
`enRestauration: { etatCible: "Très bon", jourFin: 99 }` with
`enRestauration: { etatCible: "Très bon", debutMs: 0, finMs: 99 }`.

- [ ] **Step 4: Lancer les tests concernés → succès**

Run: `npx vitest run src/lib/atelier.test.ts src/lib/missions.test.ts`
Expected: PASS (fixtures + signature à jour).

- [ ] **Step 5: Adapter `restaurerObjet` (GameContext)**

In `src/context/GameContext.tsx`, in `restaurerObjet` :

1. Change the signature — remove the `options` param:

```ts
  const restaurerObjet = useCallback(
    (
      objetId: string,
      etatCible: EtatObjet,
    ): { ok: boolean; raison?: string } => {
```

2. Replace the duration/jourFin computation block:

```ts
      const duree = Math.max(1, options.dureeJours ?? 7);
      const jourFin = current.jourActuel + duree;
```

with:

```ts
      const now = tempsConfiance() ?? Date.now();
      const debutMs = now;
      const finMs = now + dureeRestaurationMs(current, objet.categorie, objet.etat);
```

3. Replace the `enRestauration` assignment inside `setState`:

```ts
            ? { ...o, enRestauration: { etatCible, jourFin } }
```

with:

```ts
            ? { ...o, enRestauration: { etatCible, debutMs, finMs } }
```

4. Update the `useCallback` dependency array of `restaurerObjet` from `[]` to `[tempsConfiance]`.

5. Add the import near the other `@/lib` imports at the top of the file:

```ts
import { dureeRestaurationMs, peutTerminerImmediat } from "@/lib/restauration";
```

- [ ] **Step 6: Adapter `recupererObjetRestaure` + ajouter `terminerRestaurationImmediate`**

In `recupererObjetRestaure`, replace:

```ts
      if (current.jourActuel < objet.enRestauration.jourFin)
        return { ok: false, raison: "Restauration pas terminée." };

      setState((prev) => {
        if (!prev) return prev;
        const next = appliquerRecuperation(prev, objetId);
        return next ?? prev;
      });
      return { ok: true };
    },
    [],
  );
```

with:

```ts
      const now = tempsConfiance() ?? Date.now();
      if (now < objet.enRestauration.finMs)
        return { ok: false, raison: "Restauration pas terminée." };

      setState((prev) => {
        if (!prev) return prev;
        const next = appliquerRecuperation(prev, objetId, now);
        return next ?? prev;
      });
      return { ok: true };
    },
    [tempsConfiance],
  );
```

Immediately after `recupererObjetRestaure`'s closing `);`, add the new action:

```ts
  // Terminer une restauration via pub (fenêtre < 30 min). Le DÉCLENCHEUR pub est
  // un stub : cette action est appelée par le bouton UI, lui-même masqué tant que
  // PUB_DISPONIBLE est faux. La mécanique (fonction pure + mutation) est prête.
  const terminerRestaurationImmediate = useCallback(
    (objetId: string): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: "Pas de partie." };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet?.enRestauration)
        return { ok: false, raison: "Objet pas en restauration." };
      const now = tempsConfiance() ?? Date.now();
      if (!peutTerminerImmediat(objet.enRestauration, now))
        return { ok: false, raison: "Hors fenêtre (≤ 30 min)." };
      const fin = objet.enRestauration.finMs;
      setState((prev) => {
        if (!prev) return prev;
        // Forcer la complétion : on applique avec now = finMs (>= finMs).
        const next = appliquerRecuperation(prev, objetId, fin);
        return next ?? prev;
      });
      return { ok: true };
    },
    [tempsConfiance],
  );
```

- [ ] **Step 7: Exposer `terminerRestaurationImmediate` + corriger le type du contexte**

In `src/context/GameContext.tsx`, find the actions interface (the type listing
`restaurerObjet: (...)`, around line 137-147). Replace the `restaurerObjet` signature
in that interface:

```ts
  restaurerObjet: (
    objetId: string,
    etatCible: EtatObjet,
    options?: { dureeJours?: number },
  ) => { ok: boolean; raison?: string };
```

with:

```ts
  restaurerObjet: (
    objetId: string,
    etatCible: EtatObjet,
  ) => { ok: boolean; raison?: string };
  terminerRestaurationImmediate: (
    objetId: string,
  ) => { ok: boolean; raison?: string };
```

Then add `terminerRestaurationImmediate` to BOTH `useMemo` value objects that already
list `restaurerObjet` (around lines 1309 and 1352 — the actions context values). Add the
line `terminerRestaurationImmediate,` right after each `restaurerObjet,`.

- [ ] **Step 8: Vérifier compilation + tests**

Run: `npx tsc --noEmit`
Expected: aucune erreur (les appels `restaurerObjet(o.id, cible)` existants restent
valides ; `stockage/gerer` n'utilisait déjà pas `options`).

Run: `npx vitest run`
Expected: PASS (atelier/missions adaptés).

> Note : `src/app/atelier/gerer/page.tsx` appelle encore `restaurerObjet(objet.id, etatCible, { dureeJours: duree })` et lit `jourFin`. Cela provoquera des erreurs `tsc` jusqu'à la Task 6. Si `tsc` signale UNIQUEMENT des erreurs dans `atelier/gerer/page.tsx`, c'est attendu — passer à la suite ; elles seront corrigées en Task 6. Toute autre erreur doit être corrigée maintenant.

- [ ] **Step 9: Commit**

```bash
git add src/types/game.ts src/lib/atelier.ts src/lib/atelier.test.ts src/lib/missions.test.ts src/context/GameContext.tsx
git commit -m "feat(restauration): bascule enRestauration en temps réel (debutMs/finMs) + terminerRestaurationImmediate"
```

---

## Task 4: Migration des sauvegardes

**Files:**
- Modify: `src/lib/migrations.ts` (`SAVE_VERSION`, migration `enRestauration`)
- Test: `src/lib/migrations.test.ts`

- [ ] **Step 1: Écrire le test**

In `src/lib/migrations.test.ts`, add this test (adapter le helper d'appel à celui déjà
utilisé dans le fichier — `migrerSauvegarde` ou `appliquerMigrations`) :

```ts
import { migrerSauvegarde } from "./migrations";

describe("migration enRestauration jour → temps réel", () => {
  it("convertit l'ancien jourFin en {debutMs:0, finMs:0} (prêt immédiatement)", () => {
    const ancienne = {
      version: 5,
      inventaireJoueur: [
        {
          id: "x",
          templateId: "t",
          categorie: "Livres",
          etat: "Bon",
          rarete: "commun",
          prixReferenceReel: 10,
          enRestauration: { etatCible: "Très bon", jourFin: 42 },
        },
      ],
    } as unknown as Parameters<typeof migrerSauvegarde>[0];

    const migre = migrerSauvegarde(ancienne);
    const o = migre.inventaireJoueur[0];
    expect(o.enRestauration).toEqual({
      etatCible: "Très bon",
      debutMs: 0,
      finMs: 0,
    });
  });
});
```

- [ ] **Step 2: Lancer → échec**

Run: `npx vitest run src/lib/migrations.test.ts`
Expected: FAIL (l'objet garde `jourFin`, pas `debutMs/finMs`).

- [ ] **Step 3: Implémenter**

In `src/lib/migrations.ts`, bump the version:

```ts
export const SAVE_VERSION = 6;
```

Add this pure helper near the other `migrer*` helpers (e.g. just after `migrerEtat`):

```ts
/** Convertit un `enRestauration` legacy ({jourFin}) en temps réel. Prêt immédiatement. */
export function migrerEnRestauration(
  enRest: unknown,
): { etatCible: string; debutMs: number; finMs: number } | undefined {
  if (!enRest || typeof enRest !== "object") return undefined;
  const e = enRest as Record<string, unknown>;
  if (typeof e.finMs === "number" && typeof e.debutMs === "number") {
    return e as { etatCible: string; debutMs: number; finMs: number };
  }
  // Ancien format (jourFin) ou incomplet → prêt immédiatement.
  return { etatCible: String(e.etatCible), debutMs: 0, finMs: 0 };
}
```

In `appliquerMigrations`, in the `inventaire` map (the `(loaded.inventaireJoueur ?? []).map((o) => ({ ...o, ... }))` block), add one line so the mapped object includes:

```ts
    enRestauration: o.enRestauration
      ? migrerEnRestauration(o.enRestauration)
      : undefined,
```

(`as` cast may be needed to satisfy the `Objet` type — append `as GameState["inventaireJoueur"]` to the `.map(...)` result if `tsc` complains, matching how the file already handles such casts.)

- [ ] **Step 4: Lancer → succès**

Run: `npx vitest run src/lib/migrations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/migrations.ts src/lib/migrations.test.ts
git commit -m "feat(restauration): migration SAVE_VERSION 6 — enRestauration jour → prêt"
```

---

## Task 5: Câbler la notification dans GameContext

**Files:**
- Modify: `src/context/GameContext.tsx` (import + effet)

- [ ] **Step 1: Ajouter l'import**

In `src/context/GameContext.tsx`, after the existing `rappelRetour` import block, add:

```ts
import { synchroniserNotifsRestauration } from "@/lib/notifications/restaurationNotif";
```

- [ ] **Step 2: Ajouter l'effet de synchronisation**

In `src/context/GameContext.tsx`, immediately AFTER the rappel-de-retour `useEffect`
(dependency array `[isHydrated]`), add:

```ts
  // Notif « Objet restauré » : (re)programme une notif par objet en restauration
  // à son échéance, à chaque changement de l'ensemble. No-op hors Tauri / sans
  // permission. Clé de dépendance = ids+finMs sérialisés (relance sur changement).
  const restauKey = (state?.inventaireJoueur ?? [])
    .filter((o) => o.enRestauration)
    .map((o) => `${o.id}:${o.enRestauration!.finMs}`)
    .join("|");
  useEffect(() => {
    if (!isHydrated) return;
    const objets = (stateRef.current?.inventaireJoueur ?? [])
      .filter((o) => o.enRestauration)
      .map((o) => ({ nom: o.nom, finMs: o.enRestauration!.finMs }));
    const now = tempsConfiance() ?? Date.now();
    void synchroniserNotifsRestauration(objets, now);
  }, [isHydrated, restauKey, tempsConfiance]);
```

> `stateRef` et `tempsConfiance` sont déjà en portée dans ce composant (utilisés par
> les effets énergie). `o.nom` existe sur `Objet`. Ne pas réintroduire d'import en double.

- [ ] **Step 3: Vérifier compilation + tests**

Run: `npx tsc --noEmit`
Expected: pas de nouvelle erreur (hors `atelier/gerer/page.tsx`, corrigé en Task 6).

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(restauration): programme la notif « Objet restauré » sur changement"
```

---

## Task 6: UI atelier — compte à rebours temps réel + bouton « Terminer (pub) »

**Files:**
- Modify: `src/app/atelier/gerer/page.tsx`

- [ ] **Step 1: Lire le fichier et repérer les zones**

Read `src/app/atelier/gerer/page.tsx`. Repérer : l'import `dureeRestauration` (ligne ~10),
l'appel `restaurerObjet(..., { dureeJours: duree })` (~259), l'affichage `jourFin`/`restant`
(~360-385), et les usages `dureeRestauration(state, …)` (~210, 512, 755).

- [ ] **Step 2: Remplacer l'import et les usages de durée**

Replace the import of `dureeRestauration` (from `@/lib/competences`) with an import from
the new module:

```ts
import { dureeRestaurationMs, restantMs, estPret, peutTerminerImmediat } from "@/lib/restauration";
```

Add a constant near the top of the module (after imports):

```ts
/** Le SDK pub n'existe pas encore : bouton « Terminer (pub) » masqué au lancement. */
const PUB_DISPONIBLE = false;

/** Formate une durée (ms) en « 1 h », « 1 h 30 », « 45 min », « 0:42 ». */
function formatDuree(ms: number): string {
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
  }
  if (totalMin >= 1) return `${totalMin} min`;
  return `${Math.ceil(ms / 1000)} s`;
}
```

Replace each `dureeRestauration(state, <cat>, <cible>)` call (which returned days) with a
real-time label `formatDuree(dureeRestaurationMs(state, <cat>, <cible>))` where a string is
displayed, and pass nothing extra to `restaurerObjet`. Specifically:

- At the start call (~259): `restaurerObjet(objet.id, etatCible)` (remove the
  `{ dureeJours: duree }` argument).
- The flash/label (~261) and any `{duree} j.` display (~535, ~755): use
  `formatDuree(dureeRestaurationMs(state, <cat>, <cible>))` instead of `{duree} j.`.

- [ ] **Step 3: Ajouter un ticker 1 s pour le re-render temps réel**

Near the top of the component body, add:

```ts
  // Re-render chaque seconde pour rafraîchir les comptes à rebours de restauration.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
```

Ensure `useState` and `useEffect` are imported from `react` at the top of the file (add
them to the existing `react` import if missing).

- [ ] **Step 4: Remplacer l'affichage du compte à rebours**

Replace the block computing `const fin = o.enRestauration!.jourFin; const restant = Math.max(0, fin - state.jourActuel); const ready = state.jourActuel >= fin;` and its label (the `ready ? "prêt ✓" : \`fin jour N°...\`` around lines 366-383) with a real-time version:

```ts
            const now = tempsConfiance() ?? Date.now();
            const enRest = o.enRestauration!;
            const ready = estPret(enRest, now);
            const reste = restantMs(enRest, now);
            const peutPub = PUB_DISPONIBLE && peutTerminerImmediat(enRest, now);
```

and render the label as:

```tsx
                    {ready ? "prêt ✓" : formatDuree(reste)}
```

If `tempsConfiance` is not already available in this page, get it from the game context
hook used elsewhere in the file (the same hook that provides `restaurerObjet`). It is
exposed as `tempsConfiance: () => number | null` on the context value.

- [ ] **Step 5: Ajouter le bouton « Terminer (pub) »**

In the same restoration row, near the « Récupérer » button, conditionally render (only
when `peutPub`):

```tsx
                  {peutPub && (
                    <button
                      type="button"
                      onClick={() => terminerRestaurationImmediate(o.id)}
                    >
                      Terminer (pub)
                    </button>
                  )}
```

Add `terminerRestaurationImmediate` to the destructured actions from the game context
hook at the top of the component (alongside `restaurerObjet`). Since `PUB_DISPONIBLE` is
`false`, this button never renders at launch — it is wired and ready for when ads land.

- [ ] **Step 6: Vérifier compilation + lint + tests**

Run: `npx tsc --noEmit`
Expected: 0 erreur (y compris `atelier/gerer/page.tsx` désormais).

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/atelier/gerer/page.tsx
git commit -m "feat(restauration): UI atelier — compte à rebours temps réel + bouton terminer (pub, masqué)"
```

---

## Task 7: Nettoyage `competences.ts` + vérification finale

**Files:**
- Modify: `src/lib/competences.ts` (retire `dureeRestauration`)

- [ ] **Step 1: Vérifier qu'il ne reste aucun appelant**

Run: `grep -rn "dureeRestauration\b" src --include="*.ts" --include="*.tsx" | grep -v "dureeRestaurationMs"`
Expected: aucun résultat (tous migrés vers `dureeRestaurationMs`). S'il reste un appelant,
le migrer vers `dureeRestaurationMs` avant de continuer.

- [ ] **Step 2: Retirer la fonction obsolète**

In `src/lib/competences.ts`, delete the `dureeRestauration` function (the one returning
`aMaitreReparer(state, cat) ? 3 : 5`) and its doc comment. Keep `aMaitreReparer`.

- [ ] **Step 3: Vérification finale complète**

Run: `npx vitest run`
Expected: PASS (toute la suite).

Run: `npx tsc --noEmit`
Expected: 0 erreur.

Run: `npm run build`
Expected: build statique réussi.

- [ ] **Step 4: Commit**

```bash
git add src/lib/competences.ts
git commit -m "chore(restauration): retire dureeRestauration (jours) au profit de dureeRestaurationMs"
```

---

## Vérification manuelle (post-implémentation, device TestFlight)

Non automatisable (notif = no-op hors Tauri). À valider sur device :
1. Lancer une restauration (Mauvais→Bon) → compte à rebours ~1 h, libellé correct.
2. Mettre l'app en arrière-plan → à l'échéance, la notif « « X » est restauré ✓ » tombe.
3. Rouvrir → objet « prêt ✓ », « Récupérer » applique le nouvel état.
4. (Quand le flag `PUB_DISPONIBLE` sera mis à true + pub câblée) bouton « Terminer (pub) »
   visible seulement dans les 30 dernières minutes.
