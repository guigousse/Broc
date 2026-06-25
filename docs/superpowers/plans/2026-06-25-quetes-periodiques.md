# Quêtes quotidiennes / hebdomadaires (🅲) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la génération des commandes secondaires par jour-jeu par 3 commandes quotidiennes + 3 hebdomadaires en temps réel (reset minuit local / lundi), avec notification « Nouvelles quêtes », en conservant les principales.

**Architecture:** Modules purs `src/lib/quetes/` (`periode` = clés jour/semaine locales + prochains resets ; `periodiques` = génération réutilisant l'existant ; `settlePeriodiques` = régénère un lot quand sa clé change). Le settle est câblé dans GameContext là où l'énergie settle (focus/intervalle/hydratation), via le temps de confiance. Notif via le cœur 🅰 (horloge murale).

**Tech Stack:** Next.js (export statique) + Tauri 2, React 19, Vitest (jsdom).

**Spec:** `docs/superpowers/specs/2026-06-25-quetes-periodiques-design.md`

---

## File Structure

- `src/lib/quetes/periode.ts` (+ test) — **créé.** `cleJourLocal`, `cleSemaineLocale`, `prochainMinuitLocalMs`, `prochainLundiLocalMs`.
- `src/lib/notifications/ids.ts` — **modifié.** `QUETES: [200, 201]`.
- `src/lib/notifications/quetesNotif.ts` (+ test) — **créé.** `synchroniserNotifsQuetes`.
- `src/types/game.ts` — **modifié.** `MissionCategorie` + `GameState.quetesPeriodiques`.
- `src/lib/quetes/generateurSecondaire.ts` (+ test) — **supprimé.**
- `src/lib/quetes/tick.ts` — **modifié.** Garde seulement le déblocage des principales.
- `src/lib/quetes/periodiques.ts` (+ test) — **créé.** `genererLot`.
- `src/lib/quetes/settlePeriodiques.ts` (+ test) — **créé.** `settleQuetesPeriodiques`.
- `src/context/GameContext.tsx` — **modifié.** Init `quetesPeriodiques`, settle + effet notif, retrait du tick secondaire.
- `src/lib/migrations.ts` (+ test) — **modifié.** `SAVE_VERSION = 7`, drop secondaires, ajoute `quetesPeriodiques`.
- `src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx` — **modifié.** Sections Quotidiennes/Hebdomadaires + compte à rebours.

---

## Task 1: Période — `periode.ts`

**Files:**
- Create: `src/lib/quetes/periode.ts`
- Test: `src/lib/quetes/periode.test.ts`

Les fonctions utilisent le **fuseau local** (exigence « minuit local »). Les tests
assertent des **invariants** (indépendants du fuseau du runner), pas des chaînes absolues.

- [ ] **Step 1: Écrire le test**

Create `src/lib/quetes/periode.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  cleJourLocal,
  cleSemaineLocale,
  prochainMinuitLocalMs,
  prochainLundiLocalMs,
} from "./periode";

const JOUR = 24 * 60 * 60 * 1000;

describe("cleJourLocal", () => {
  it("format YYYY-MM-DD et change d'un jour à l'autre", () => {
    const t = Date.UTC(2026, 5, 25, 12, 0, 0);
    expect(cleJourLocal(t)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(cleJourLocal(t)).not.toBe(cleJourLocal(t + JOUR));
  });
});

describe("prochainMinuitLocalMs", () => {
  it("est dans le futur, ≤ 24 h, et tombe à minuit local", () => {
    const now = Date.UTC(2026, 5, 25, 12, 0, 0);
    const m = prochainMinuitLocalMs(now);
    expect(m).toBeGreaterThan(now);
    expect(m - now).toBeLessThanOrEqual(JOUR);
    const d = new Date(m);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });
});

describe("cleSemaineLocale", () => {
  it("format YYYY-Www et stable sur la même semaine, change la suivante", () => {
    const t = Date.UTC(2026, 5, 24, 12, 0, 0); // un mercredi
    expect(cleSemaineLocale(t)).toMatch(/^\d{4}-W\d{2}$/);
    expect(cleSemaineLocale(t)).toBe(cleSemaineLocale(t + JOUR)); // jeudi, même semaine
    expect(cleSemaineLocale(t)).not.toBe(cleSemaineLocale(t + 7 * JOUR));
  });
});

describe("prochainLundiLocalMs", () => {
  it("est dans le futur, ≤ 7 j, tombe un lundi à minuit local", () => {
    const now = Date.UTC(2026, 5, 25, 12, 0, 0);
    const l = prochainLundiLocalMs(now);
    expect(l).toBeGreaterThan(now);
    expect(l - now).toBeLessThanOrEqual(7 * JOUR);
    const d = new Date(l);
    expect(d.getDay()).toBe(1); // lundi
    expect(d.getHours()).toBe(0);
  });
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/lib/quetes/periode.test.ts` (module absent).

- [ ] **Step 3: Implémenter** — Create `src/lib/quetes/periode.ts`:

```ts
/** Périodes en temps réel, en fuseau LOCAL de l'appareil. `now` = epoch ms. */

function deuxChiffres(n: number): string {
  return String(n).padStart(2, "0");
}

/** "YYYY-MM-DD" du jour local. */
export function cleJourLocal(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}`;
}

/** Epoch ms du prochain minuit local (strictement après `now`). */
export function prochainMinuitLocalMs(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0); // minuit du jour suivant, en local
  return d.getTime();
}

/** "YYYY-Www" (semaine ISO, lundi = début ; le jeudi fixe l'année ISO). */
export function cleSemaineLocale(now: number): string {
  const src = new Date(now);
  const date = new Date(src.getFullYear(), src.getMonth(), src.getDate());
  const jour = (date.getDay() + 6) % 7; // lundi=0 … dimanche=6
  date.setDate(date.getDate() - jour + 3); // jeudi de cette semaine
  const anneeISO = date.getFullYear();
  const premierJeudi = new Date(anneeISO, 0, 4);
  const decalPremier = (premierJeudi.getDay() + 6) % 7;
  premierJeudi.setDate(premierJeudi.getDate() - decalPremier + 3);
  const semaine =
    1 +
    Math.round(
      (date.getTime() - premierJeudi.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
  return `${anneeISO}-W${deuxChiffres(semaine)}`;
}

/** Epoch ms du prochain lundi 00:00 local (strictement après `now`). */
export function prochainLundiLocalMs(now: number): number {
  const d = new Date(now);
  const jour = (d.getDay() + 6) % 7; // lundi=0
  const dans = jour === 0 ? 7 : 7 - jour; // si lundi, le prochain est dans 7 j
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + dans,
    0,
    0,
    0,
    0,
  ).getTime();
}
```

- [ ] **Step 4: Run → PASS** — `npx vitest run src/lib/quetes/periode.test.ts`.

- [ ] **Step 5: Commit**
```bash
git add src/lib/quetes/periode.ts src/lib/quetes/periode.test.ts
git commit -m "feat(quetes): helpers de période locale (clés jour/semaine, prochains resets)"
```

---

## Task 2: Notification « Nouvelles quêtes »

**Files:**
- Modify: `src/lib/notifications/ids.ts`
- Create: `src/lib/notifications/quetesNotif.ts`
- Test: `src/lib/notifications/quetesNotif.test.ts`

- [ ] **Step 1: Ajouter les IDs** — In `src/lib/notifications/ids.ts`, inside `NOTIF_IDS`, after the `RESTAURATION` line, add:
```ts
  QUETES: [200, 201] as const, // 200 = reset quotidien, 201 = reset hebdo
```

- [ ] **Step 2: Écrire le test** — Create `src/lib/notifications/quetesNotif.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { notifsQuetes, synchroniserNotifsQuetes } from "./quetesNotif";
import { NOTIF_IDS } from "./ids";

describe("notifsQuetes (pur)", () => {
  it("2 notifs (quotidien+hebdo) aux bons IDs, à l'horloge murale", () => {
    const now = 1_000_000;
    const specs = notifsQuetes(now);
    expect(specs.map((s) => s.id)).toEqual([
      NOTIF_IDS.QUETES[0],
      NOTIF_IDS.QUETES[1],
    ]);
    // chaque échéance est dans le futur
    for (const s of specs) expect(s.atMs).toBeGreaterThan(now);
    expect(specs[0].body.length).toBeGreaterThan(0);
  });
});

describe("synchroniserNotifsQuetes hors Tauri", () => {
  it("est un no-op sans lever", async () => {
    await expect(synchroniserNotifsQuetes(Date.now())).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: Run → FAIL** — `npx vitest run src/lib/notifications/quetesNotif.test.ts`.

- [ ] **Step 4: Implémenter** — Create `src/lib/notifications/quetesNotif.ts`:

```ts
/**
 * Notifs « Nouvelles quêtes » : une au prochain minuit local (commandes
 * quotidiennes), une au prochain lundi (hebdomadaires). Réutilise le cœur 🅰.
 */
import { NOTIF_IDS } from "./ids";
import { type NotifSpec, programmer, annuler, permissionAccordee } from "./index";
import { prochainMinuitLocalMs, prochainLundiLocalMs } from "@/lib/quetes/periode";

/** Construit les 2 specs aux prochains resets. `now` = epoch ms (temps de confiance). */
export function notifsQuetes(now: number): NotifSpec[] {
  return [
    {
      id: NOTIF_IDS.QUETES[0],
      title: "Nouvelles commandes",
      body: "De nouvelles commandes du jour t'attendent !",
      sound: "default",
      atMs: prochainMinuitLocalMs(now),
    },
    {
      id: NOTIF_IDS.QUETES[1],
      title: "Commandes de la semaine",
      body: "De nouvelles commandes hebdomadaires sont disponibles !",
      sound: "default",
      atMs: prochainLundiLocalMs(now),
    },
  ];
}

/** (Re)programme les 2 notifs. No-op si permission non accordée. `nowMural` = Date.now()
 *  côté appelant (les atMs sont déjà en horloge murale via periode.ts). */
export async function synchroniserNotifsQuetes(now: number): Promise<void> {
  await annuler([...NOTIF_IDS.QUETES]);
  if (!(await permissionAccordee())) return;
  for (const spec of notifsQuetes(now)) {
    await programmer(spec);
  }
}
```

> Note : `prochainMinuitLocalMs`/`prochainLundiLocalMs` renvoient des epoch ms en horloge
> de l'appareil (= horloge murale du planificateur OS). On les appellera donc avec
> `Date.now()` côté GameContext (pas le temps de confiance), pour que la notif tombe au
> bon instant réel.

- [ ] **Step 5: Run → PASS** — `npx vitest run src/lib/notifications/quetesNotif.test.ts`.

- [ ] **Step 6: Commit**
```bash
git add src/lib/notifications/ids.ts src/lib/notifications/quetesNotif.ts src/lib/notifications/quetesNotif.test.ts
git commit -m "feat(notifs): notification « Nouvelles quêtes » (IDs 200-201)"
```

---

## Task 3: Bascule du modèle + retrait de la génération secondaire

Tâche transversale : `MissionCategorie` change, on supprime l'ancien générateur, et on
ajoute le champ d'ancre. Le projet doit compiler et les tests passer à la fin.

**Files:**
- Modify: `src/types/game.ts`
- Delete: `src/lib/quetes/generateurSecondaire.ts`, `src/lib/quetes/generateurSecondaire.test.ts`
- Modify: `src/lib/quetes/tick.ts`
- Modify: `src/context/GameContext.tsx` (init `quetesPeriodiques`, retrait de l'usage secondaire)
- Modify: any file comparing `categorie === "secondaire"` (carnet, etc.) to compile

- [ ] **Step 1: Type `MissionCategorie` + champ d'ancre** — In `src/types/game.ts`:

Replace:
```ts
export type MissionCategorie = "principale" | "secondaire";
```
with:
```ts
export type MissionCategorie = "principale" | "quotidienne" | "hebdomadaire";
```

Add near the other top-level interfaces (e.g. just before `MissionResolution`):
```ts
/** Lot de commandes périodiques en cours (quotidien ou hebdo). */
export interface LotPeriodique {
  /** Clé de période : "2026-06-25" (jour local) ou "2026-W26" (semaine ISO locale). */
  cle: string;
  /** IDs des courriers du lot courant. */
  courrierIds: string[];
}
```

In the `GameState` interface, add the field (near `missions`):
```ts
  quetesPeriodiques: {
    quotidien: LotPeriodique;
    hebdo: LotPeriodique;
  };
```

- [ ] **Step 2: Supprimer l'ancien générateur**
```bash
git rm src/lib/quetes/generateurSecondaire.ts src/lib/quetes/generateurSecondaire.test.ts
```

- [ ] **Step 3: Nettoyer `tick.ts`** — Replace the whole content of `src/lib/quetes/tick.ts` with:

```ts
import type { Courrier, GameState, MissionResolution } from "@/types/game";
import { debloquerQuetesPrincipales } from "./principales";

/**
 * Tick quotidien des quêtes : débloque le chapitre principal dû. (Les commandes
 * quotidiennes/hebdomadaires sont gérées en TEMPS RÉEL via settleQuetesPeriodiques,
 * plus par jour de jeu.)
 */
export function tickQuetes(
  state: GameState,
  jour: number,
): { courriers: Courrier[]; missions: MissionResolution[] } {
  const nouveaux = debloquerQuetesPrincipales(state, jour);
  if (nouveaux.length === 0) {
    return { courriers: state.courriers, missions: state.missions };
  }
  return {
    courriers: [...state.courriers, ...nouveaux],
    missions: [
      ...state.missions,
      ...nouveaux.map((c) => ({ courrierId: c.id, statut: "active" as const })),
    ],
  };
}
```

- [ ] **Step 4: Initialiser `quetesPeriodiques`** — In `src/context/GameContext.tsx`, find the `nouvellePartie` initial `GameState` object (the literal with `missions: [...]`). Add:
```ts
      quetesPeriodiques: {
        quotidien: { cle: "", courrierIds: [] },
        hebdo: { cle: "", courrierIds: [] },
      },
```
Also update the `tickQuetes(initial, initial.jourActuel, () => 0.99)` call (it no longer takes an `rng`) to `tickQuetes(initial, initial.jourActuel)`, and the `tickQuetes(baseAvecMissions, nouveauJour)` call stays `tickQuetes(baseAvecMissions, nouveauJour)` (already 2 args). Remove any now-unused `rng`/secondary import.

- [ ] **Step 5: Réparer les références `"secondaire"`** — Run:
```bash
grep -rn '"secondaire"' src --include="*.ts" --include="*.tsx"
```
For each hit (e.g. the carnet's section filter, any test fixture), update it so the file compiles:
- In `src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx`: wherever it filters `categorie === "secondaire"` for a "Secondaires" section, replace that section's filter to `categorie === "quotidienne" || categorie === "hebdomadaire"` for now (single combined list, titled "Commandes") — the proper two-section split + countdown is Task 8. This keeps it compiling.
- In any `*.test.ts` fixture using `categorie: "secondaire"`, change to `"quotidienne"`.
Also handle fixtures/initial-state builders that must now include `quetesPeriodiques` — add `quetesPeriodiques: { quotidien: { cle: "", courrierIds: [] }, hebdo: { cle: "", courrierIds: [] } }` to any `GameState` test fixture/factory that `tsc` flags as missing the field (e.g. `src/lib/__test-fixtures__/gameState.ts`).

- [ ] **Step 6: Vérifier** — `npx tsc --noEmit` → 0 erreur. `npx vitest run` → PASS. If a test asserted secondary-generation behavior (in a former `tick.test.ts` or elsewhere), update/remove it to match the new tick (principales only).

- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "feat(quetes): bascule MissionCategorie (quotidienne/hebdomadaire) + retrait génération secondaire jour-jeu"
```

---

## Task 4: Génération d'un lot — `periodiques.ts`

**Files:**
- Create: `src/lib/quetes/periodiques.ts`
- Test: `src/lib/quetes/periodiques.test.ts`

- [ ] **Step 1: Écrire le test** — Create `src/lib/quetes/periodiques.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { genererLot } from "./periodiques";
import { creerEtatTest } from "@/lib/__test-fixtures__/gameState";

// rng déterministe.
function rngSeq(vals: number[]): () => number {
  let i = 0;
  return () => vals[i++ % vals.length];
}

describe("genererLot", () => {
  it("quotidienne : courriers de catégorie quotidienne, 1 cible chacun", () => {
    const state = creerEtatTest();
    const lot = genererLot(state, "quotidienne", "2026-06-25", rngSeq([0.1, 0.5, 0.9]));
    expect(lot.length).toBeGreaterThan(0);
    expect(lot.length).toBeLessThanOrEqual(3);
    for (const c of lot) {
      expect(c.payload.type).toBe("mission");
      if (c.payload.type === "mission") {
        expect(c.payload.categorie).toBe("quotidienne");
        expect(c.payload.cibles).toHaveLength(1);
      }
      expect(c.id).toContain("2026-06-25");
    }
  });

  it("hebdomadaire : 2 à 3 cibles par commande", () => {
    const state = creerEtatTest();
    const lot = genererLot(state, "hebdomadaire", "2026-W26", rngSeq([0.1, 0.5, 0.9, 0.3]));
    for (const c of lot) {
      if (c.payload.type === "mission") {
        expect(c.payload.cibles.length).toBeGreaterThanOrEqual(2);
        expect(c.payload.cibles.length).toBeLessThanOrEqual(3);
        expect(c.payload.categorie).toBe("hebdomadaire");
      }
    }
  });

  it("ids uniques dans le lot", () => {
    const state = creerEtatTest();
    const lot = genererLot(state, "quotidienne", "2026-06-25", rngSeq([0.2, 0.7, 0.4]));
    const ids = lot.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

> Avant d'écrire l'implémentation, ouvre `src/lib/__test-fixtures__/gameState.ts` et
> confirme le nom du factory (`creerEtatTest` ou équivalent) ; adapte l'import du test si
> le nom diffère. Le factory doit produire un état avec au moins quelques brocantes
> débloquées pour que `objetsAtteignables` renvoie un pool non vide ; si ce n'est pas le
> cas, le test doit construire un état minimal viable (réutilise un fixture existant des
> tests `quetes/*`).

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/lib/quetes/periodiques.test.ts`.

- [ ] **Step 3: Implémenter** — Create `src/lib/quetes/periodiques.ts`:

```ts
import { creerCourrierMission } from "@/lib/courrier";
import { EXPEDITEURS } from "@/data/expediteursCourrier";
import type { ObjetTemplate } from "@/data/objetTemplates";
import type { Courrier, GameState, MissionCible } from "@/types/game";
import { objetsAtteignables } from "./atteignables";
import { calculerRecompense } from "./recompense";
import { genererTexte } from "./textes";

export type TypePeriodique = "quotidienne" | "hebdomadaire";

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Génère UNE commande périodique en évitant les templateId déjà pris dans `pris`. */
function genererUne(
  state: GameState,
  type: TypePeriodique,
  id: string,
  pris: Set<string>,
  rng: () => number,
): Courrier | null {
  const pool = objetsAtteignables(state).filter((t) => !pris.has(t.templateId));
  if (pool.length === 0) return null;

  const commanditaires = Object.values(EXPEDITEURS).filter(
    (e) => e.id !== "maman" && e.id !== "grand-pere" && e.domaine,
  );
  const candidats = commanditaires.filter((e) => pool.some((t) => t.categorie === e.domaine));
  const exp = candidats.length > 0 ? pick(candidats, rng) : pick(commanditaires, rng);
  const poolDomaine = pool.filter((t) => t.categorie === exp.domaine);
  const poolCible = poolDomaine.length > 0 ? poolDomaine : pool;

  // Quotidienne = 1 cible ; hebdomadaire = 2-3 cibles (plus dure).
  const nbVoulu = type === "quotidienne" ? 1 : 2 + Math.floor(rng() * 2);
  const choisis: ObjetTemplate[] = [];
  const restant = [...poolCible];
  for (let i = 0; i < nbVoulu && restant.length > 0; i++) {
    choisis.push(restant.splice(Math.floor(rng() * restant.length), 1)[0]);
  }
  if (choisis.length === 0) return null;
  for (const t of choisis) pris.add(t.templateId);

  // Hebdo plus exigeante : état minimum « Très bon » avec proba.
  const etatMin = type === "hebdomadaire" && rng() < 0.5 ? ("Très bon" as const) : undefined;
  const cibles: MissionCible[] = choisis.map((t) => ({
    templateId: t.templateId,
    ...(etatMin ? { etatMin } : {}),
  }));
  const templates = new Map(choisis.map((t) => [t.templateId, t]));
  const recompense = { argent: calculerRecompense(cibles, templates) };
  const texte = genererTexte(exp.id, choisis.map((t) => t.nom), etatMin, rng);

  return {
    ...creerCourrierMission({
      id,
      jour: state.jourActuel,
      expediteurId: exp.id,
      titre: texte.titre,
      corps: texte.corps,
      categorie: type,
      cibles,
      recompense,
    }),
    lu: true,
  };
}

/** Génère le lot de 3 commandes du type pour la période `cle`. IDs déterministes. */
export function genererLot(
  state: GameState,
  type: TypePeriodique,
  cle: string,
  rng: () => number = Math.random,
): Courrier[] {
  const prefixe = type === "quotidienne" ? "quo" : "heb";
  const pris = new Set<string>();
  const lot: Courrier[] = [];
  for (let i = 0; i < 3; i++) {
    const c = genererUne(state, type, `${prefixe}_${cle}_${i}`, pris, rng);
    if (c) lot.push(c);
  }
  return lot;
}
```

- [ ] **Step 4: Run → PASS** — `npx vitest run src/lib/quetes/periodiques.test.ts`. Then `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 5: Commit**
```bash
git add src/lib/quetes/periodiques.ts src/lib/quetes/periodiques.test.ts
git commit -m "feat(quetes): génération d'un lot quotidien/hebdomadaire (réutilise atteignables/recompense/textes)"
```

---

## Task 5: Settle — `settlePeriodiques.ts`

**Files:**
- Create: `src/lib/quetes/settlePeriodiques.ts`
- Test: `src/lib/quetes/settlePeriodiques.test.ts`

- [ ] **Step 1: Écrire le test** — Create `src/lib/quetes/settlePeriodiques.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { settleQuetesPeriodiques } from "./settlePeriodiques";
import { cleJourLocal, cleSemaineLocale } from "./periode";
import { creerEtatTest } from "@/lib/__test-fixtures__/gameState";

const now = Date.UTC(2026, 5, 25, 12, 0, 0);

describe("settleQuetesPeriodiques", () => {
  it("génère les lots quand les clés sont vides (nouvelle partie)", () => {
    const state = creerEtatTest();
    const out = settleQuetesPeriodiques(state, now);
    expect(out.quetesPeriodiques.quotidien.cle).toBe(cleJourLocal(now));
    expect(out.quetesPeriodiques.hebdo.cle).toBe(cleSemaineLocale(now));
    expect(out.quetesPeriodiques.quotidien.courrierIds.length).toBeGreaterThan(0);
    // Les courriers du lot existent et sont des missions quotidiennes.
    for (const id of out.quetesPeriodiques.quotidien.courrierIds) {
      const c = out.courriers.find((x) => x.id === id);
      expect(c?.payload.type).toBe("mission");
    }
  });

  it("est idempotent si les clés n'ont pas changé", () => {
    const state = settleQuetesPeriodiques(creerEtatTest(), now);
    const again = settleQuetesPeriodiques(state, now);
    expect(again).toBe(state); // référence inchangée
  });

  it("régénère le lot quotidien quand le jour change (et supprime l'ancien)", () => {
    const j1 = settleQuetesPeriodiques(creerEtatTest(), now);
    const anciensIds = j1.quetesPeriodiques.quotidien.courrierIds;
    const j2 = settleQuetesPeriodiques(j1, now + 24 * 60 * 60 * 1000);
    expect(j2.quetesPeriodiques.quotidien.cle).not.toBe(j1.quetesPeriodiques.quotidien.cle);
    // anciens courriers retirés
    for (const id of anciensIds) {
      expect(j2.courriers.find((c) => c.id === id)).toBeUndefined();
      expect(j2.missions.find((m) => m.courrierId === id)).toBeUndefined();
    }
  });

  it("ne touche pas aux missions principales", () => {
    const state = creerEtatTest();
    const principalCourrier = state.courriers.find(
      (c) => c.payload.type === "mission" && c.payload.categorie === "principale",
    );
    const out = settleQuetesPeriodiques(state, now);
    if (principalCourrier) {
      expect(out.courriers.find((c) => c.id === principalCourrier.id)).toBeDefined();
    }
  });
});
```

> Adapte l'import/nom du factory `creerEtatTest` au fichier réel (cf. Task 4). Si le
> factory n'a pas de courrier principal, le 4ᵉ test passe trivialement (branche `if`).

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/lib/quetes/settlePeriodiques.test.ts`.

- [ ] **Step 3: Implémenter** — Create `src/lib/quetes/settlePeriodiques.ts`:

```ts
import type { GameState, LotPeriodique } from "@/types/game";
import { cleJourLocal, cleSemaineLocale } from "./periode";
import { genererLot, type TypePeriodique } from "./periodiques";

/** Régénère un lot si sa clé a changé. Retourne le nouvel état partiel ou null si inchangé. */
function settleUnLot(
  state: GameState,
  type: TypePeriodique,
  lot: LotPeriodique,
  cleActuelle: string,
): Pick<GameState, "courriers" | "missions"> & { lot: LotPeriodique } | null {
  if (lot.cle === cleActuelle) return null;
  const aRetirer = new Set(lot.courrierIds);
  const courriers = state.courriers.filter((c) => !aRetirer.has(c.id));
  const missions = state.missions.filter((m) => !aRetirer.has(m.courrierId));
  const nouveaux = genererLot({ ...state, courriers, missions }, type, cleActuelle);
  return {
    courriers: [...courriers, ...nouveaux],
    missions: [
      ...missions,
      ...nouveaux.map((c) => ({ courrierId: c.id, statut: "active" as const })),
    ],
    lot: { cle: cleActuelle, courrierIds: nouveaux.map((c) => c.id) },
  };
}

/**
 * Régénère les lots quotidien/hebdo dont la clé de période a changé. Pur.
 * `now` = temps de confiance (epoch ms). Idempotent si rien n'a changé (même référence).
 */
export function settleQuetesPeriodiques(state: GameState, now: number): GameState {
  let courriers = state.courriers;
  let missions = state.missions;
  let quotidien = state.quetesPeriodiques.quotidien;
  let hebdo = state.quetesPeriodiques.hebdo;
  let change = false;

  const q = settleUnLot(
    { ...state, courriers, missions },
    "quotidienne",
    quotidien,
    cleJourLocal(now),
  );
  if (q) {
    courriers = q.courriers;
    missions = q.missions;
    quotidien = q.lot;
    change = true;
  }

  const h = settleUnLot(
    { ...state, courriers, missions },
    "hebdomadaire",
    hebdo,
    cleSemaineLocale(now),
  );
  if (h) {
    courriers = h.courriers;
    missions = h.missions;
    hebdo = h.lot;
    change = true;
  }

  if (!change) return state;
  return {
    ...state,
    courriers,
    missions,
    quetesPeriodiques: { quotidien, hebdo },
  };
}
```

- [ ] **Step 4: Run → PASS** — `npx vitest run src/lib/quetes/settlePeriodiques.test.ts`. Then `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 5: Commit**
```bash
git add src/lib/quetes/settlePeriodiques.ts src/lib/quetes/settlePeriodiques.test.ts
git commit -m "feat(quetes): settle des lots périodiques (régénère au changement de clé, idempotent)"
```

---

## Task 6: Câblage settle + notif dans GameContext

**Files:** Modify `src/context/GameContext.tsx`.

- [ ] **Step 1: Imports** — Add near the `@/lib` imports:
```ts
import { settleQuetesPeriodiques } from "@/lib/quetes/settlePeriodiques";
import { synchroniserNotifsQuetes } from "@/lib/notifications/quetesNotif";
```

- [ ] **Step 2: `rafraichirQuetes` (à côté de `rafraichirEnergie`)** — After the `rafraichirEnergie` `useCallback` definition, add:
```ts
  const rafraichirQuetes = useCallback(() => {
    const now = tempsConfiance() ?? Date.now();
    setState((prev) => (prev ? settleQuetesPeriodiques(prev, now) : prev));
  }, [tempsConfiance]);
```

- [ ] **Step 3: Appeler au settle** — In the energy-settle `useEffect` (the one with `sync`, `onFocus`, `syncTimer`, `tickTimer`): inside `sync` (after `rafraichirEnergie()`), add `rafraichirQuetes();`. In the 60 s `tickTimer` callback, change it to also call `rafraichirQuetes()` (e.g. `() => { rafraichirEnergie(); rafraichirQuetes(); }`). Add `rafraichirQuetes` to that effect's dependency array.

- [ ] **Step 4: Effet notif** — After the restauration-notif `useEffect`, add:
```ts
  // Notif « Nouvelles quêtes » : programme aux prochains resets (minuit / lundi).
  // Relancée quand un lot change de clé. Échéances déjà en horloge murale (periode.ts).
  const quetesCles = `${state?.quetesPeriodiques.quotidien.cle ?? ""}|${state?.quetesPeriodiques.hebdo.cle ?? ""}`;
  useEffect(() => {
    if (!isHydrated) return;
    void synchroniserNotifsQuetes(Date.now());
  }, [isHydrated, quetesCles]);
```

- [ ] **Step 5: Settle initial à l'hydratation** — Ensure a settle runs right after load: in the energy-settle effect, `sync()` is already called once on mount and now also calls `rafraichirQuetes()`, so the initial generation happens on hydration. No extra code needed; verify by reading.

- [ ] **Step 6: Vérifier** — `npx tsc --noEmit` → 0 erreur. `npx vitest run` → PASS.

- [ ] **Step 7: Commit**
```bash
git add src/context/GameContext.tsx
git commit -m "feat(quetes): settle temps réel des lots + notif « Nouvelles quêtes » dans GameContext"
```

---

## Task 7: Migration `SAVE_VERSION = 7`

**Files:**
- Modify: `src/lib/migrations.ts`
- Test: `src/lib/migrations.test.ts`

- [ ] **Step 1: Écrire le test** — In `src/lib/migrations.test.ts`, add:

```ts
import { migrerSauvegarde } from "./migrations";

describe("migration quêtes périodiques (v7)", () => {
  it("supprime les courriers/missions secondaires et ajoute quetesPeriodiques", () => {
    const ancienne = {
      version: 6,
      courriers: [
        { id: "p1", type: "mission", jourRecu: 1, lu: true, payload: { type: "mission", categorie: "principale", expediteurId: "grand-pere", titre: "t", corps: [], cibles: [], recompense: { argent: 0 } } },
        { id: "s1", type: "mission", jourRecu: 1, lu: true, payload: { type: "mission", categorie: "secondaire", expediteurId: "maman", titre: "t", corps: [], cibles: [], recompense: { argent: 0 } } },
      ],
      missions: [
        { courrierId: "p1", statut: "active" },
        { courrierId: "s1", statut: "active" },
      ],
    } as unknown as Parameters<typeof migrerSauvegarde>[0];

    const migre = migrerSauvegarde(ancienne);
    expect(migre.courriers.find((c) => c.id === "s1")).toBeUndefined();
    expect(migre.missions.find((m) => m.courrierId === "s1")).toBeUndefined();
    expect(migre.courriers.find((c) => c.id === "p1")).toBeDefined();
    expect(migre.quetesPeriodiques).toEqual({
      quotidien: { cle: "", courrierIds: [] },
      hebdo: { cle: "", courrierIds: [] },
    });
  });
});
```

> Si `migrerSauvegarde` exige d'autres champs minimaux pour ne pas planter, ajoute-les au
> fixture en suivant le style des tests existants du fichier.

- [ ] **Step 2: Run → FAIL** — `npx vitest run src/lib/migrations.test.ts`.

- [ ] **Step 3: Implémenter** — In `src/lib/migrations.ts`:
1. `export const SAVE_VERSION = 7;`
2. In `appliquerMigrations`, after the courriers/missions are computed (or at the start using `loaded.courriers`/`loaded.missions`), drop secondary missions and add the anchor. Add this logic so the returned state:
```ts
  // v7 : retrait des anciennes commandes secondaires (catégorie supprimée) +
  // ajout de l'ancre des quêtes périodiques (générée au 1er settle).
  const courriersSansSecondaires = (loaded.courriers ?? []).filter(
    (c) =>
      !(c.payload?.type === "mission" && c.payload.categorie === "secondaire"),
  );
  const idsRetires = new Set(
    (loaded.courriers ?? [])
      .filter((c) => c.payload?.type === "mission" && c.payload.categorie === "secondaire")
      .map((c) => c.id),
  );
  const missionsSansSecondaires = (loaded.missions ?? []).filter(
    (m) => !idsRetires.has(m.courrierId),
  );
```
Wire these into the object `appliquerMigrations` returns: set `courriers: courriersSansSecondaires`, `missions: missionsSansSecondaires` (merge with the file's existing courrier migration — if the file already maps `loaded.courriers` via `migrerCourriers`, apply the secondary filter to that result instead, and keep its output), and add:
```ts
    quetesPeriodiques: loaded.quetesPeriodiques ?? {
      quotidien: { cle: "", courrierIds: [] },
      hebdo: { cle: "", courrierIds: [] },
    },
```
Read the existing `appliquerMigrations` return object first and integrate these consistently (the file already filters/maps courriers; thread the secondary-removal through that pipeline rather than duplicating it). Cast `c.payload.categorie === "secondaire"` may need `(c.payload as { categorie?: string }).categorie` since `"secondaire"` is no longer in the type — use a loose access to compare the legacy string.

- [ ] **Step 4: Run → PASS** — `npx vitest run src/lib/migrations.test.ts`. Then `npx vitest run` (full) + `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 5: Commit**
```bash
git add src/lib/migrations.ts src/lib/migrations.test.ts
git commit -m "feat(quetes): migration SAVE_VERSION 7 — drop secondaires + ancre quetesPeriodiques"
```

---

## Task 8: Carnet — sections Quotidiennes / Hebdomadaires + compte à rebours

**Files:** Modify `src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx`.

- [ ] **Step 1: Lire le fichier** — Read `src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx`. Identify how sections are built (the Principales / [combined] / Terminées structure left by Task 3), how a mission's `categorie` is read, and how the game context (`tempsConfiance`) is obtained.

- [ ] **Step 2: Deux sections périodiques** — Replace the single combined "Commandes" section (from Task 3) with two sections:
  - **Quotidiennes** : missions actives dont le courrier a `categorie === "quotidienne"`.
  - **Hebdomadaires** : `categorie === "hebdomadaire"`.
  Keep the existing **Principales** and **Terminées** sections. Reuse the existing section/row rendering (`CommandeRow`) — only the filter predicate changes per section.

- [ ] **Step 3: Compte à rebours** — Import the period helpers:
```ts
import { prochainMinuitLocalMs, prochainLundiLocalMs } from "@/lib/quetes/periode";
```
Add a 1 s ticker in the component (same pattern as the atelier page):
```ts
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
```
(ensure `useState`/`useEffect` are imported). In each periodic section header, show the remaining time until reset, e.g.:
```tsx
  const now = tempsConfiance() ?? Date.now();
  const resteQuotidien = Math.max(0, prochainMinuitLocalMs(now) - now);
  // header quotidien : `Renouvellement dans ${formatRestant(resteQuotidien)}`
```
Add a small local `formatRestant(ms)` → `"Xh"` / `"Xmin"` (or reuse one if the file already imports a formatter). For weekly use `prochainLundiLocalMs(now)`.

- [ ] **Step 4: Vérifier** — `npx tsc --noEmit` → 0 erreur. `npx vitest run` → PASS. `npm run build` → succès.

- [ ] **Step 5: Commit**
```bash
git add src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx
git commit -m "feat(quetes): carnet — sections Quotidiennes/Hebdomadaires + compte à rebours de reset"
```

---

## Task 9: Vérification finale

- [ ] **Step 1: Suite complète** — `npx vitest run` → PASS.
- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → 0 erreur.
- [ ] **Step 3: Build** — `npm run build` → succès (export statique).
- [ ] **Step 4: Grep de salubrité** — `grep -rn '"secondaire"\|generateurSecondaire' src` → aucun résultat (hors specs/plans docs).
- [ ] **Step 5: Commit éventuel** — `git status` ; committer tout reliquat.

---

## Vérification manuelle (post-implémentation, device TestFlight)

1. Au lancement : 3 commandes quotidiennes + 3 hebdomadaires dans le carnet, avec comptes à rebours.
2. Livrer une quotidienne → reste « terminée » ; pas de nouvelle avant minuit.
3. Mettre l'app en arrière-plan → à minuit local, notif « Nouvelles commandes ». Rouvrir → 3 nouvelles quotidiennes.
4. Les principales (grand-père) restent inchangées.
