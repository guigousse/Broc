# Fondation notifications locales (🅰) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Généraliser le wrapper de notifications spécifique à l'énergie en un module local réutilisable (iOS + Android via Tauri), et ajouter un rappel de retour par inactivité (série J+1 / J+3 / J+7).

**Architecture:** Un cœur générique `index.ts` (programmer / annuler / permission) est le seul à importer le plugin Tauri. Un registre `ids.ts` centralise les IDs. `rappelRetour.ts` programme la série d'inactivité ; `energieNotif.ts` est réécrit par-dessus le cœur en gardant son API publique. Tout est no-op hors runtime Tauri et n'échoue jamais (try/catch avalés).

**Tech Stack:** Next.js (export statique) + Tauri 2, `@tauri-apps/plugin-notification` (import dynamique), Vitest (jsdom).

**Spec:** `docs/superpowers/specs/2026-06-25-fondation-notifications-design.md`

---

## File Structure

- `src/lib/notifications/index.ts` — **créé.** Cœur générique neutre. Seul point qui importe le plugin Tauri.
- `src/lib/notifications/ids.ts` — **créé.** Registre central des IDs 32-bit stables.
- `src/lib/notifications/rappelRetour.ts` — **créé.** Série de rappels d'inactivité (logique pure `construireRappels` + effets `programmerRappelRetour`/`annulerRappelRetour`).
- `src/lib/notifications/energieNotif.ts` — **modifié.** Réécrit pour déléguer au cœur ; API publique inchangée.
- `src/lib/notifications/index.test.ts` — **créé.** No-op hors Tauri.
- `src/lib/notifications/rappelRetour.test.ts` — **créé.** Offsets/messages (pur) + no-op hors Tauri.
- `src/lib/notifications/energieNotif.test.ts` — **inchangé** (non-régression).
- `src/context/GameContext.tsx` — **modifié.** Câble le rappel de retour (effet visibilité).

---

## Task 1: Cœur générique (`index.ts`) + registre d'IDs (`ids.ts`)

**Files:**
- Create: `src/lib/notifications/ids.ts`
- Create: `src/lib/notifications/index.ts`
- Test: `src/lib/notifications/index.test.ts`

- [ ] **Step 1: Créer le registre d'IDs**

Create `src/lib/notifications/ids.ts`:

```ts
/**
 * Registre central des IDs de notifications locales (32-bit stables).
 * Centraliser ici évite les collisions entre types de notifs. Plages
 * réservées pour les sous-projets à venir (restauration, quêtes).
 */
export const NOTIF_IDS = {
  ENERGIE_PLEINE: 1,
  RAPPEL_RETOUR: [10, 11, 12] as const, // J+1, J+3, J+7
  // Réservé 🅱️ restauration : 100–199 (1 par slot d'atelier)
  // Réservé 🅲 quêtes      : 200–299
} as const;
```

- [ ] **Step 2: Écrire le test (no-op hors Tauri)**

Create `src/lib/notifications/index.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  notificationsDisponibles,
  permissionAccordee,
  demanderPermission,
  programmer,
  annuler,
} from "./index";

// En test, `window.__TAURI_INTERNALS__` est absent → hors Tauri : tout est no-op.
describe("notifications/index hors Tauri", () => {
  it("notificationsDisponibles() est false sans runtime Tauri", () => {
    expect(notificationsDisponibles()).toBe(false);
  });

  it("permissionAccordee() renvoie false sans lever", async () => {
    await expect(permissionAccordee()).resolves.toBe(false);
  });

  it("demanderPermission() renvoie false sans lever", async () => {
    await expect(demanderPermission()).resolves.toBe(false);
  });

  it("programmer() est un no-op sans lever", async () => {
    await expect(
      programmer({ id: 1, title: "t", body: "b", atMs: Date.now() + 1000 }),
    ).resolves.toBeUndefined();
  });

  it("annuler() est un no-op sans lever", async () => {
    await expect(annuler([1, 2])).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/lib/notifications/index.test.ts`
Expected: FAIL (le module `./index` n'existe pas encore — erreur de résolution).

- [ ] **Step 4: Écrire le cœur générique**

Create `src/lib/notifications/index.ts`:

```ts
/**
 * Cœur générique des notifications locales. Seul module qui importe le plugin
 * Tauri (`@tauri-apps/plugin-notification`), en import DYNAMIQUE pour que son
 * code natif ne soit jamais évalué hors Tauri. Tout est no-op hors runtime
 * Tauri et toute erreur plugin est avalée — une panne de notif ne doit jamais
 * casser le jeu.
 */

/** Spécification d'une notification locale à programmer. */
export interface NotifSpec {
  /** Identifiant 32-bit stable (cf. ids.ts) — réutilisé pour replacer/annuler. */
  id: number;
  title: string;
  body: string;
  /** Horodatage de déclenchement (epoch ms). */
  atMs: number;
}

/** Vrai uniquement sous runtime Tauri (internals injectés par Tauri). */
export function notificationsDisponibles(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Lit la permission SANS la demander (pas de prompt). */
export async function permissionAccordee(): Promise<boolean> {
  if (!notificationsDisponibles()) return false;
  try {
    const { isPermissionGranted } = await import(
      "@tauri-apps/plugin-notification"
    );
    return await isPermissionGranted();
  } catch {
    return false;
  }
}

/** Demande la permission. Idempotent (iOS ne re-prompt pas une fois décidé). */
export async function demanderPermission(): Promise<boolean> {
  if (!notificationsDisponibles()) return false;
  try {
    const { isPermissionGranted, requestPermission } = await import(
      "@tauri-apps/plugin-notification"
    );
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Programme (ou replace) une notif locale à `spec.atMs`. */
export async function programmer(spec: NotifSpec): Promise<void> {
  if (!notificationsDisponibles()) return;
  try {
    const { sendNotification, cancel, Schedule } = await import(
      "@tauri-apps/plugin-notification"
    );
    await cancel([spec.id]).catch(() => {});
    sendNotification({
      id: spec.id,
      title: spec.title,
      body: spec.body,
      schedule: Schedule.at(new Date(spec.atMs), false, true),
    });
  } catch {
    // no-op : ne jamais casser le jeu si la notif échoue.
  }
}

/** Annule les notifs programmées portant ces IDs (si présentes). */
export async function annuler(ids: number[]): Promise<void> {
  if (!notificationsDisponibles()) return;
  try {
    const { cancel } = await import("@tauri-apps/plugin-notification");
    await cancel(ids);
  } catch {
    // no-op.
  }
}
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/lib/notifications/index.test.ts`
Expected: PASS (5 tests verts).

- [ ] **Step 6: Commit**

```bash
git add src/lib/notifications/ids.ts src/lib/notifications/index.ts src/lib/notifications/index.test.ts
git commit -m "feat(notifs): cœur générique de notifications locales + registre d'IDs"
```

---

## Task 2: Rappel de retour (`rappelRetour.ts`)

**Files:**
- Create: `src/lib/notifications/rappelRetour.ts`
- Test: `src/lib/notifications/rappelRetour.test.ts`

- [ ] **Step 1: Écrire le test**

Create `src/lib/notifications/rappelRetour.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  construireRappels,
  programmerRappelRetour,
  annulerRappelRetour,
} from "./rappelRetour";
import { NOTIF_IDS } from "./ids";

const JOUR_MS = 24 * 60 * 60 * 1000;

describe("construireRappels (pur)", () => {
  it("programme 3 rappels aux offsets J+1 / J+3 / J+7 avec les bons IDs", () => {
    const now = 1_000_000_000_000;
    const specs = construireRappels(now);

    expect(specs).toHaveLength(3);
    expect(specs.map((s) => s.id)).toEqual([...NOTIF_IDS.RAPPEL_RETOUR]);
    expect(specs.map((s) => s.atMs)).toEqual([
      now + 1 * JOUR_MS,
      now + 3 * JOUR_MS,
      now + 7 * JOUR_MS,
    ]);
  });

  it("chaque rappel a un titre et un corps non vides", () => {
    for (const s of construireRappels(0)) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
    }
  });
});

describe("rappelRetour hors Tauri", () => {
  it("programmerRappelRetour() est un no-op sans lever (pas de permission)", async () => {
    await expect(programmerRappelRetour(Date.now())).resolves.toBeUndefined();
  });

  it("annulerRappelRetour() est un no-op sans lever", async () => {
    await expect(annulerRappelRetour()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/lib/notifications/rappelRetour.test.ts`
Expected: FAIL (le module `./rappelRetour` n'existe pas encore).

- [ ] **Step 3: Écrire l'implémentation**

Create `src/lib/notifications/rappelRetour.ts`:

```ts
/**
 * Rappel de retour par inactivité : série progressive J+1 / J+3 / J+7.
 * Programmée quand l'app passe en arrière-plan, annulée à la réouverture.
 * Ne prompt JAMAIS la permission (no-op silencieux si non accordée) — le
 * prompt reste l'affaire du flux énergie.
 */
import { NOTIF_IDS } from "./ids";
import {
  type NotifSpec,
  programmer,
  annuler,
  permissionAccordee,
} from "./index";

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Définition de la série (offset depuis la sortie + textes, ton du jeu). */
const RAPPELS: { offsetMs: number; title: string; body: string }[] = [
  {
    offsetMs: 1 * JOUR_MS,
    title: "Ta brocante prend la poussière…",
    body: "Reviens chiner, le camion t'attend !",
  },
  {
    offsetMs: 3 * JOUR_MS,
    title: "Des affaires t'attendent !",
    body: "De nouvelles trouvailles sont à dénicher.",
  },
  {
    offsetMs: 7 * JOUR_MS,
    title: "On range le camion ?",
    body: "Reviens vite récupérer ton énergie ⚡",
  },
];

/** Construit les 3 specs à partir de l'instant de sortie `now` (epoch ms). Pur. */
export function construireRappels(now: number): NotifSpec[] {
  return RAPPELS.map((r, i) => ({
    id: NOTIF_IDS.RAPPEL_RETOUR[i],
    title: r.title,
    body: r.body,
    atMs: now + r.offsetMs,
  }));
}

/** (Re)programme la série depuis `now`. No-op si permission non déjà accordée. */
export async function programmerRappelRetour(now: number): Promise<void> {
  if (!(await permissionAccordee())) return;
  for (const spec of construireRappels(now)) {
    await programmer(spec);
  }
}

/** Annule toute la série (à la réouverture de l'app). */
export async function annulerRappelRetour(): Promise<void> {
  await annuler([...NOTIF_IDS.RAPPEL_RETOUR]);
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/lib/notifications/rappelRetour.test.ts`
Expected: PASS (4 tests verts).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/rappelRetour.ts src/lib/notifications/rappelRetour.test.ts
git commit -m "feat(notifs): rappel de retour par inactivité (série J+1/J+3/J+7)"
```

---

## Task 3: Migrer `energieNotif.ts` par-dessus le cœur

**Files:**
- Modify: `src/lib/notifications/energieNotif.ts` (réécriture complète)
- Test: `src/lib/notifications/energieNotif.test.ts` (inchangé — non-régression)

- [ ] **Step 1: Vérifier que le test existant passe AVANT (point de départ vert)**

Run: `npx vitest run src/lib/notifications/energieNotif.test.ts`
Expected: PASS (3 tests verts, version actuelle).

- [ ] **Step 2: Réécrire l'implémentation par-dessus le cœur**

Replace the entire content of `src/lib/notifications/energieNotif.ts` with:

```ts
/**
 * Notif « énergie pleine ». Mince couche métier au-dessus du cœur générique
 * (`./index`) : un titre/corps + l'ID dédié. API publique INCHANGÉE pour
 * GameContext (`planifierPleinEnergie`, `annulerPleinEnergie`,
 * `assurerPermission`, `notificationsDisponibles`).
 */
import { NOTIF_IDS } from "./ids";
import {
  notificationsDisponibles,
  demanderPermission,
  programmer,
  annuler,
} from "./index";

export { notificationsDisponibles };

/** Demande/contrôle la permission (idempotent). Alias métier du cœur. */
export async function assurerPermission(): Promise<boolean> {
  return demanderPermission();
}

/** Programme (ou replace) la notif « énergie pleine » à `atMs` (epoch ms). */
export async function planifierPleinEnergie(atMs: number): Promise<void> {
  await programmer({
    id: NOTIF_IDS.ENERGIE_PLEINE,
    title: "Énergie pleine ⚡",
    body: "Tes 5 énergies sont prêtes — reviens chiner !",
    atMs,
  });
}

/** Annule la notif « énergie pleine » programmée (si présente). */
export async function annulerPleinEnergie(): Promise<void> {
  await annuler([NOTIF_IDS.ENERGIE_PLEINE]);
}
```

- [ ] **Step 3: Vérifier que le test existant passe APRÈS (non-régression)**

Run: `npx vitest run src/lib/notifications/energieNotif.test.ts`
Expected: PASS (3 tests verts — API publique préservée).

- [ ] **Step 4: Commit**

```bash
git add src/lib/notifications/energieNotif.ts
git commit -m "refactor(notifs): migrer energieNotif par-dessus le cœur générique"
```

---

## Task 4: Câbler le rappel de retour dans `GameContext`

**Files:**
- Modify: `src/context/GameContext.tsx` (imports ~ligne 80-86 ; nouvel effet après l'effet notif énergie ~ligne 344)

- [ ] **Step 1: Ajouter l'import du rappel de retour**

In `src/context/GameContext.tsx`, locate the existing import block from the notifications module (around lines 81-86):

```tsx
  notificationsDisponibles,
  assurerPermission,
  planifierPleinEnergie,
  annulerPleinEnergie,
```

Immediately after that import statement (after its closing `} from "...";`), add a new import:

```tsx
import {
  programmerRappelRetour,
  annulerRappelRetour,
} from "@/lib/notifications/rappelRetour";
```

- [ ] **Step 2: Ajouter l'effet de rappel de retour**

In `src/context/GameContext.tsx`, find the end of the energy-notification `useEffect` (the one whose dependency array is `[isHydrated, energie, energieDerniereMaj, tempsConfiance]`, around line 344). Immediately AFTER that effect's closing `);`, add:

```tsx
  // Rappel de retour : programme la série J+1/J+3/J+7 quand l'app passe en
  // arrière-plan, l'annule à la réouverture. No-op hors Tauri ou si la
  // permission n'est pas déjà accordée (jamais de prompt à la sortie).
  useEffect(() => {
    if (!isHydrated) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void programmerRappelRetour(Date.now());
      } else {
        void annulerRappelRetour();
      }
    };
    // pagehide : filet pour iOS quand la WebView est suspendue.
    const onPageHide = () => void programmerRappelRetour(Date.now());
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [isHydrated]);
```

- [ ] **Step 3: Vérifier le typecheck/lint**

Run: `npx tsc --noEmit`
Expected: aucune erreur liée à `GameContext.tsx` ni aux modules notifications.

- [ ] **Step 4: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(notifs): câbler le rappel de retour (effet visibilité) dans GameContext"
```

---

## Task 5: Vérification finale

**Files:** aucun (vérification globale).

- [ ] **Step 1: Lancer toute la suite de tests**

Run: `npm run test:run`
Expected: PASS — toute la suite verte, dont `index.test.ts`, `rappelRetour.test.ts`, `energieNotif.test.ts`.

- [ ] **Step 2: Typecheck complet**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Build statique (sanity)**

Run: `npm run build`
Expected: build Next.js réussi (export statique généré dans `out/`).

- [ ] **Step 4: Commit final éventuel**

S'il reste des fichiers générés ou ajustements mineurs non commités liés à la tâche, les committer. Sinon, rien à faire.

```bash
git status
```

---

## Notes de vérification manuelle (post-implémentation, sur device TestFlight)

Non automatisable ici (le plugin est no-op hors Tauri). À valider sur iPhone via TestFlight :
1. Énergie : consommer de l'énergie → notif « Énergie pleine ⚡ » programmée → arrive à 5/5 (non-régression).
2. Rappel de retour : permission déjà accordée → mettre l'app en arrière-plan → vérifier (via réglages OS / patience) la programmation ; rouvrir → la série est annulée (pas de notif si on revient avant 24h).
3. Permission non accordée → aucun prompt déclenché par la mise en arrière-plan.
