# Notification « énergie au maximum » — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notifier le joueur (notification système iOS/Android, même app fermée) quand son énergie atteint 5/5, via une notification locale **planifiée** à l'avance et replanifiée quand l'énergie change.

**Architecture:** Plugin Tauri v2 `notification` ajouté ; un module wrapper `energieNotif.ts` isole le plugin derrière une interface étroite et **no-op hors Tauri** (import dynamique). Un helper pur `secondesAvantPlein` calcule l'instant du plein ; un `useEffect` dans `GameContext` (re)planifie/annule la notif à chaque variation d'énergie, et demande la permission à la 1ʳᵉ consommation.

**Tech Stack:** Tauri 2 (Rust + `@tauri-apps/plugin-notification`), Next.js 16 / React 19 / TypeScript / Vitest.

**Spec de référence :** `docs/superpowers/specs/2026-06-24-notif-energie-pleine-design.md`

---

## Structure des fichiers

**Créés :**
- `src/lib/notifications/energieNotif.ts` — wrapper plugin (no-op hors Tauri).
- `src/lib/notifications/energieNotif.test.ts` — tests du chemin no-op.

**Modifiés :**
- `package.json` — dépendance `@tauri-apps/plugin-notification`.
- `src-tauri/Cargo.toml` — crate `tauri-plugin-notification`.
- `src-tauri/src/lib.rs` — enregistrement du plugin.
- `src-tauri/capabilities/default.json` — permission `notification:default`.
- `src/lib/energie.ts` — helper pur `secondesAvantPlein` (+ test dans `energie.test.ts`).
- `src/lib/energie.test.ts` — tests `secondesAvantPlein`.
- `src/context/GameContext.tsx` — `useEffect` de (re)planification.

---

## Task 1 : Installer & enregistrer le plugin notification

**Files:**
- Modify: `package.json` (via npm)
- Modify: `src-tauri/Cargo.toml:20-25` (section `[dependencies]`)
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1 : Installer la dépendance JS**

Run: `npm install @tauri-apps/plugin-notification@^2`
Expected: ajoute `@tauri-apps/plugin-notification` dans `dependencies` de `package.json`, install OK.

- [ ] **Step 2 : Ajouter la crate Rust**

Dans `src-tauri/Cargo.toml`, sous `[dependencies]` (après la ligne `tauri-plugin-log = "2"`), ajouter :

```toml
tauri-plugin-notification = "2"
```

- [ ] **Step 3 : Enregistrer le plugin dans `lib.rs`**

Dans `src-tauri/src/lib.rs`, ajouter l'enregistrement du plugin dans le builder, **hors** du bloc `cfg!(debug_assertions)` (le plugin doit être actif en release aussi). Remplacer :

```rust
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
```

par :

```rust
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
```

- [ ] **Step 4 : Ajouter la permission dans les capabilities**

Dans `src-tauri/capabilities/default.json`, ajouter `"notification:default"` au tableau `permissions` :

```json
  "permissions": [
    "core:default",
    "notification:default"
  ]
```

- [ ] **Step 5 : Vérifier que le frontend compile toujours**

Run: `npx tsc --noEmit`
Expected: 0 erreur (le module JS est résolu maintenant qu'il est installé).

- [ ] **Step 6 : Vérifier la compilation Rust (best-effort)**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: compile sans erreur. ⚠️ Le premier build télécharge/compile le plugin → peut prendre plusieurs minutes. Si le toolchain Rust/réseau est indisponible dans l'environnement, vérifier visuellement que les 3 éditions (Cargo.toml, lib.rs, capabilities) correspondent exactement au format documenté ci-dessus, et continuer.

- [ ] **Step 7 : Commit**

```bash
git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "chore(notif): installe et enregistre le plugin Tauri notification"
```

---

## Task 2 : Helper pur `secondesAvantPlein`

**Files:**
- Modify: `src/lib/energie.ts` (après `secondesAvantProchaine`)
- Test: `src/lib/energie.test.ts`

- [ ] **Step 1 : Écrire les tests (échouent)**

Dans `src/lib/energie.test.ts`, ajouter `secondesAvantPlein` à l'import en tête du fichier (la liste qui contient déjà `secondesAvantProchaine`), puis ajouter ce bloc après le `describe("energieCourante / secondesAvantProchaine", ...)` :

```ts
describe("secondesAvantPlein", () => {
  it("renvoie null si déjà plein", () => {
    expect(secondesAvantPlein(etat({ energie: ENERGIE_MAX }), T0)).toBeNull();
  });

  it("4/5 fraîchement settle → 30 min", () => {
    expect(secondesAvantPlein(etat({ energie: 4 }), T0)).toBe(30 * 60);
  });

  it("0/5 fraîchement settle → 5 paliers de 30 min", () => {
    // 1 palier pour le prochain +1, puis 4 paliers jusqu'à 5/5.
    expect(secondesAvantPlein(etat({ energie: 0 }), T0)).toBe(5 * 30 * 60);
  });

  it("3/5 avec 10 min déjà écoulées sur le prochain palier", () => {
    const r = secondesAvantPlein(etat({ energie: 3 }), T0 + 10 * 60 * 1000);
    // 20 min pour le prochain +1, puis 1 palier de 30 min → 50 min.
    expect(r).toBe(20 * 60 + 30 * 60);
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/energie.test.ts`
Expected: FAIL — `secondesAvantPlein is not a function` / import manquant.

- [ ] **Step 3 : Implémenter le helper**

Dans `src/lib/energie.ts`, ajouter juste après la fonction `secondesAvantProchaine` :

```ts
/** Secondes avant d'atteindre ENERGIE_MAX, ou null si déjà plein. */
export function secondesAvantPlein(
  state: EnergieState,
  now: number,
): number | null {
  const courante = energieCourante(state, now);
  if (courante >= ENERGIE_MAX) return null;
  const prochaine = secondesAvantProchaine(state, now) ?? 0;
  const paliersRestants = ENERGIE_MAX - courante - 1; // paliers pleins après le prochain +1
  return prochaine + paliersRestants * (RECHARGE_INTERVAL_MS / 1000);
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `npx vitest run src/lib/energie.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/energie.ts src/lib/energie.test.ts
git commit -m "feat(energie): helper secondesAvantPlein"
```

---

## Task 3 : Module wrapper `energieNotif.ts`

**Files:**
- Create: `src/lib/notifications/energieNotif.ts`
- Test: `src/lib/notifications/energieNotif.test.ts`

- [ ] **Step 1 : Écrire les tests (échouent)**

Créer `src/lib/notifications/energieNotif.test.ts` :

```ts
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  notificationsDisponibles,
  assurerPermission,
  planifierPleinEnergie,
  annulerPleinEnergie,
} from "./energieNotif";

// En environnement de test, `window.__TAURI_INTERNALS__` est absent → hors Tauri.
describe("energieNotif hors Tauri", () => {
  it("notificationsDisponibles() est false sans runtime Tauri", () => {
    expect(notificationsDisponibles()).toBe(false);
  });

  it("assurerPermission() renvoie false sans lever", async () => {
    await expect(assurerPermission()).resolves.toBe(false);
  });

  it("planifier/annuler sont des no-op sans lever", async () => {
    await expect(planifierPleinEnergie(Date.now() + 1000)).resolves.toBeUndefined();
    await expect(annulerPleinEnergie()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/notifications/energieNotif.test.ts`
Expected: FAIL — `Cannot find module './energieNotif'`.

- [ ] **Step 3 : Implémenter le wrapper**

Créer `src/lib/notifications/energieNotif.ts` :

```ts
/**
 * Wrapper autour du plugin Tauri `notification`. Tout est no-op hors runtime
 * Tauri (navigateur `npm run dev`) et toute erreur plugin est avalée — une panne
 * de notification ne doit jamais casser le jeu. Le plugin est chargé en import
 * dynamique pour que son code natif ne soit jamais évalué hors Tauri.
 */

/** Identifiant fixe (32-bit) de la notif « énergie pleine » — réutilisé pour replacer/annuler. */
const NOTIF_ENERGIE_PLEINE_ID = 1;

/** Vrai uniquement sous runtime Tauri (présence des internals injectés par Tauri). */
export function notificationsDisponibles(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Demande/contrôle la permission. Idempotent (iOS ne re-prompt pas une fois décidé). */
export async function assurerPermission(): Promise<boolean> {
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

/** Programme (ou replace) la notif « énergie pleine » à l'horodatage `atMs` (epoch ms). */
export async function planifierPleinEnergie(atMs: number): Promise<void> {
  if (!notificationsDisponibles()) return;
  try {
    const { sendNotification, cancel, Schedule } = await import(
      "@tauri-apps/plugin-notification"
    );
    await cancel([NOTIF_ENERGIE_PLEINE_ID]).catch(() => {});
    sendNotification({
      id: NOTIF_ENERGIE_PLEINE_ID,
      title: "Énergie pleine ⚡",
      body: "Tes 5 énergies sont prêtes — reviens chiner !",
      schedule: Schedule.at(new Date(atMs), false, true),
    });
  } catch {
    // no-op : ne jamais casser le jeu si la notif échoue.
  }
}

/** Annule la notif « énergie pleine » programmée (si présente). */
export async function annulerPleinEnergie(): Promise<void> {
  if (!notificationsDisponibles()) return;
  try {
    const { cancel } = await import("@tauri-apps/plugin-notification");
    await cancel([NOTIF_ENERGIE_PLEINE_ID]);
  } catch {
    // no-op.
  }
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `npx vitest run src/lib/notifications/energieNotif.test.ts`
Expected: PASS.

- [ ] **Step 5 : Vérifier la compilation (types du plugin résolus)**

Run: `npx tsc --noEmit`
Expected: 0 erreur (le plugin est installé → l'import dynamique typé résout).

- [ ] **Step 6 : Commit**

```bash
git add src/lib/notifications/energieNotif.ts src/lib/notifications/energieNotif.test.ts
git commit -m "feat(notif): wrapper plugin notification (no-op hors Tauri)"
```

---

## Task 4 : (Re)planification dans `GameContext`

**Files:**
- Modify: `src/context/GameContext.tsx` (imports ; corps de `GameProvider`, après le `useEffect` de synchro du temps)

- [ ] **Step 1 : Ajouter les imports**

En tête de `src/context/GameContext.tsx`, ajouter :

```ts
import { secondesAvantPlein } from "@/lib/energie";
import {
  notificationsDisponibles,
  assurerPermission,
  planifierPleinEnergie,
  annulerPleinEnergie,
} from "@/lib/notifications/energieNotif";
```

> Note : `ENERGIE_MAX` est déjà importé depuis `@/lib/energie` dans ce fichier ;
> ajouter `secondesAvantPlein` à cet import existant plutôt que de dupliquer la ligne.

- [ ] **Step 2 : Ajouter l'effet de (re)planification**

Dans le composant `GameProvider`, juste après le `useEffect` commenté « Temps effectif & recharge », ajouter :

```ts
  // Notification « énergie pleine » : (re)planifie une notif système à l'instant
  // où l'énergie atteindra 5/5, et l'annule quand elle est pleine. La permission
  // est demandée la 1ʳᵉ fois que l'énergie passe sous le max (= 1ʳᵉ consommation).
  // Tout est no-op hors Tauri.
  const energie = state?.energie;
  const energieDerniereMaj = state?.energieDerniereMaj;
  const pubsRecharge = state?.pubsRecharge;
  useEffect(() => {
    if (
      !isHydrated ||
      energie === undefined ||
      energieDerniereMaj === undefined ||
      !pubsRecharge ||
      !notificationsDisponibles()
    ) {
      return;
    }
    const snap = { energie, energieDerniereMaj, pubsRecharge };
    let annule = false;
    (async () => {
      if (energie >= ENERGIE_MAX) {
        await annulerPleinEnergie();
        return;
      }
      const ok = await assurerPermission();
      if (annule || !ok) return;
      const reste = secondesAvantPlein(snap, tempsConfiance() ?? Date.now());
      if (reste === null) return;
      await planifierPleinEnergie(Date.now() + reste * 1000);
    })();
    return () => {
      annule = true;
    };
  }, [isHydrated, energie, energieDerniereMaj, pubsRecharge, tempsConfiance]);
```

- [ ] **Step 3 : Vérifier compilation + suite de tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 erreur TypeScript ; tous les tests verts (la suite était à 510/510 + nouveaux tests de Task 2 & 3).

- [ ] **Step 4 : Build de production**

Run: `npm run build`
Expected: build Next.js réussi sans erreur.

- [ ] **Step 5 : Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(notif): planifie la notif energie pleine sur variation d'energie"
```

---

## Vérification finale (manuelle, sur device/app réelle)

> Les notifications système ne s'affichent **pas** dans `npm run dev` (navigateur) — il
> faut la vraie app Tauri (idéalement iOS/Android).

- [ ] Lancer l'app Tauri, partie avec énergie 5/5 → aucune notif programmée.
- [ ] Entrer dans une brocante (consomme 1 énergie) → une **demande de permission** de notification apparaît (1ʳᵉ fois).
- [ ] Accorder la permission ; fermer l'app.
- [ ] Attendre que l'énergie se recharge à 5/5 (ou réduire temporairement `RECHARGE_INTERVAL_MS` pour tester) → une notification « Énergie pleine ⚡ » s'affiche, app fermée.
- [ ] Rouvrir l'app : énergie à 5/5, pas de notif en double programmée.
- [ ] Consommer puis regarder une pub (+1) → la notif est replanifiée plus tôt.

---

## Notes d'exécution
- L'ordre des tasks importe : Task 1 (install dep) doit précéder Task 3 & 4 (qui importent le plugin).
- `secondesAvantPlein` est pur et injecte `now` → testable sans horloge réelle, cohérent avec le reste de `energie.ts`.
- Le wrapper avale toutes les erreurs et no-op hors Tauri : aucune régression possible en dev navigateur.
- Permission demandée à la 1ʳᵉ conso (énergie < max), jamais au lancement (guidelines iOS).
