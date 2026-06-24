# Système d'Énergie — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer les « tickets » cosmétiques en un système d'Énergie opérationnel (consommée au chinage/vente, rechargée 1/30 min en temps réel, anti-triche horloge, + pub optionnelle ×10/jour).

**Architecture:** Logique de recharge isolée dans un module pur testable (`lib/energie.ts`) piloté par un **temps de confiance** (réseau + horloge monotone, `lib/temps/`) qui neutralise la triche d'horloge. État dans `GameState` (localStorage, migration v4→v5). UI : header (icône `Zap` + compteur + bouton `+`) et panneau de recharge avec provider de pub abstrait (stub aujourd'hui, AdMob plus tard).

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Context API / Vitest / lucide-react / Tauri.

**Spec de référence :** `docs/superpowers/specs/2026-06-24-systeme-energie-design.md`

---

## Structure des fichiers

**Créés :**
- `src/lib/energie.ts` — module pur : constantes + settle/regen/pubs.
- `src/lib/energie.test.ts` — tests du module pur.
- `src/lib/temps/horloge.ts` — horloge monotone (ancre temps de confiance).
- `src/lib/temps/horloge.test.ts` — tests horloge.
- `src/lib/temps/timeSource.ts` — `TimeSource` réseau + `HttpTimeSource` + `getTimeSource`.
- `src/lib/temps/timeSource.test.ts` — tests TimeSource.
- `src/lib/ads/adProvider.ts` — `AdProvider` + `StubAdProvider` + `getAdProvider`.
- `src/lib/ads/adProvider.test.ts` — tests provider.
- `src/components/mobile/EnergieRecharge.tsx` — panneau de recharge (jauge, minuteur, bouton pub).

**Modifiés :**
- `src/types/game.ts` — 3 champs `GameState` (`energie`, `energieDerniereMaj`, `pubsRecharge`).
- `src/lib/migrations.ts` — `SAVE_VERSION` 4→5 + défauts.
- `src/lib/migrations.test.ts` — version 5 + défauts.
- `src/context/GameContext.tsx` — init + actions énergie + câblage temps de confiance.
- `src/components/mobile/MobileHeader.tsx` — « Énergie » + `Zap` + bouton `+`.
- `src/components/mobile/brocante-pano/BrocanteDetailFloating.tsx` — `Ticket`→`Zap`.
- `src/app/chiner/[brocanteId]/ClientPage.tsx` — garde + consommation à l'entrée.
- `src/app/vitrine/[brocanteId]/ClientPage.tsx` — garde + consommation à l'ouverture.

---

## Task 1 : Module pur `energie.ts` + champs `GameState`

**Files:**
- Modify: `src/types/game.ts` (interface `GameState`, après `missions`)
- Create: `src/lib/energie.ts`
- Test: `src/lib/energie.test.ts`

- [ ] **Step 1 : Ajouter les champs au type `GameState`**

Dans `src/types/game.ts`, ajouter à la fin de l'interface `GameState` (juste après la ligne `missions: MissionResolution[];`) :

```ts
  /** Énergie courante (0..ENERGIE_MAX). Démarre pleine. */
  energie: number;
  /** Ancre du dernier calcul d'énergie : timestamp de TEMPS DE CONFIANCE (epoch ms),
   *  jamais l'horloge brute du device (cf. lib/temps). */
  energieDerniereMaj: number;
  /** Pubs de recharge regardées dans le jour de confiance courant. */
  pubsRecharge: { jourCle: string; compte: number };
```

- [ ] **Step 2 : Écrire les tests (échouent — le module n'existe pas)**

Créer `src/lib/energie.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import {
  ENERGIE_MAX,
  RECHARGE_INTERVAL_MS,
  PUBS_MAX_PAR_JOUR,
  cleJour,
  settleEnergie,
  energieCourante,
  secondesAvantProchaine,
  compteursPubs,
  peutRegarderPub,
  type EnergieState,
} from "./energie";

const T0 = 1_700_000_000_000; // ancre de référence arbitraire (epoch ms)

function etat(partial: Partial<EnergieState> = {}): EnergieState {
  return {
    energie: 0,
    energieDerniereMaj: T0,
    pubsRecharge: { jourCle: cleJour(T0), compte: 0 },
    ...partial,
  };
}

describe("settleEnergie", () => {
  it("crédite +1 toutes les 30 min", () => {
    const r = settleEnergie(etat({ energie: 0 }), T0 + RECHARGE_INTERVAL_MS);
    expect(r.energie).toBe(1);
    expect(r.energieDerniereMaj).toBe(T0 + RECHARGE_INTERVAL_MS);
  });

  it("conserve le reste (29 min ne créditent rien, l'ancre ne bouge pas)", () => {
    const r = settleEnergie(etat({ energie: 0 }), T0 + 29 * 60 * 1000);
    expect(r.energie).toBe(0);
    expect(r.energieDerniereMaj).toBe(T0);
  });

  it("avance l'ancre du temps consommé et garde le surplus", () => {
    const r = settleEnergie(etat({ energie: 0 }), T0 + RECHARGE_INTERVAL_MS + 10 * 60 * 1000);
    expect(r.energie).toBe(1);
    expect(r.energieDerniereMaj).toBe(T0 + RECHARGE_INTERVAL_MS);
  });

  it("plafonne à ENERGIE_MAX et ré-ancre à now (pas de banque)", () => {
    const r = settleEnergie(etat({ energie: 4 }), T0 + 10 * RECHARGE_INTERVAL_MS);
    expect(r.energie).toBe(ENERGIE_MAX);
    expect(r.energieDerniereMaj).toBe(T0 + 10 * RECHARGE_INTERVAL_MS);
  });

  it("déjà plein : ancre = now, énergie inchangée", () => {
    const r = settleEnergie(etat({ energie: ENERGIE_MAX }), T0 + RECHARGE_INTERVAL_MS);
    expect(r.energie).toBe(ENERGIE_MAX);
    expect(r.energieDerniereMaj).toBe(T0 + RECHARGE_INTERVAL_MS);
  });

  it("anti-recul : temps antérieur → ré-ancre sans créditer", () => {
    const r = settleEnergie(etat({ energie: 2 }), T0 - RECHARGE_INTERVAL_MS);
    expect(r.energie).toBe(2);
    expect(r.energieDerniereMaj).toBe(T0 - RECHARGE_INTERVAL_MS);
  });
});

describe("energieCourante / secondesAvantProchaine", () => {
  it("energieCourante reflète le settle", () => {
    expect(energieCourante(etat({ energie: 1 }), T0 + RECHARGE_INTERVAL_MS)).toBe(2);
  });

  it("secondesAvantProchaine = null si plein", () => {
    expect(secondesAvantProchaine(etat({ energie: ENERGIE_MAX }), T0)).toBeNull();
  });

  it("secondesAvantProchaine compte le temps restant jusqu'au prochain +1", () => {
    const s = secondesAvantProchaine(etat({ energie: 0 }), T0 + 10 * 60 * 1000);
    expect(s).toBe(20 * 60); // 30 - 10 min restantes
  });
});

describe("pubs", () => {
  it("compte le jour courant, restant = max - compte", () => {
    const r = compteursPubs(etat({ pubsRecharge: { jourCle: cleJour(T0), compte: 3 } }), T0);
    expect(r.compte).toBe(3);
    expect(r.restant).toBe(PUBS_MAX_PAR_JOUR - 3);
  });

  it("reset au changement de jour calendaire", () => {
    const veille = etat({ pubsRecharge: { jourCle: cleJour(T0), compte: 10 } });
    const lendemain = T0 + 24 * 60 * 60 * 1000;
    const r = compteursPubs(veille, lendemain);
    expect(r.compte).toBe(0);
    expect(r.restant).toBe(PUBS_MAX_PAR_JOUR);
  });

  it("peutRegarderPub faux au plafond du jour", () => {
    const e = etat({ pubsRecharge: { jourCle: cleJour(T0), compte: PUBS_MAX_PAR_JOUR } });
    expect(peutRegarderPub(e, T0)).toBe(false);
  });
});
```

- [ ] **Step 3 : Lancer les tests, vérifier l'échec**

Run: `npx vitest run src/lib/energie.test.ts`
Expected: FAIL — `Cannot find module './energie'`.

- [ ] **Step 4 : Implémenter `src/lib/energie.ts`**

```ts
import type { GameState } from "@/types/game";

export const ENERGIE_MAX = 5;
export const RECHARGE_INTERVAL_MS = 30 * 60 * 1000; // 30 min
export const PUBS_MAX_PAR_JOUR = 10;
export const ENERGIE_PAR_PUB = 1;

/** Sous-ensemble de GameState manipulé par ce module (facilite tests + appels). */
export type EnergieState = Pick<
  GameState,
  "energie" | "energieDerniereMaj" | "pubsRecharge"
>;

/** Clé de jour calendaire local `YYYY-MM-DD` à partir d'un epoch ms. */
export function cleJour(now: number): string {
  const d = new Date(now);
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/**
 * Crédite l'énergie écoulée depuis l'ancre. `now` = TEMPS DE CONFIANCE (epoch ms),
 * jamais l'horloge brute. Fonction pure.
 */
export function settleEnergie(
  state: EnergieState,
  now: number,
): { energie: number; energieDerniereMaj: number } {
  const { energie, energieDerniereMaj } = state;
  // Anti-recul : temps de confiance antérieur à l'ancre → ré-ancre, pas de crédit.
  if (now < energieDerniereMaj) {
    return { energie, energieDerniereMaj: now };
  }
  // Déjà plein : pas de banque de temps, l'ancre suit `now`.
  if (energie >= ENERGIE_MAX) {
    return { energie: ENERGIE_MAX, energieDerniereMaj: now };
  }
  const gagne = Math.floor((now - energieDerniereMaj) / RECHARGE_INTERVAL_MS);
  if (gagne <= 0) {
    return { energie, energieDerniereMaj };
  }
  const nouvelle = Math.min(ENERGIE_MAX, energie + gagne);
  const ancre =
    nouvelle >= ENERGIE_MAX
      ? now
      : energieDerniereMaj + gagne * RECHARGE_INTERVAL_MS;
  return { energie: nouvelle, energieDerniereMaj: ancre };
}

/** Énergie courante effective (après settle), pour l'affichage. */
export function energieCourante(state: EnergieState, now: number): number {
  return settleEnergie(state, now).energie;
}

/** Secondes avant le prochain +1, ou null si déjà plein. */
export function secondesAvantProchaine(
  state: EnergieState,
  now: number,
): number | null {
  const settled = settleEnergie(state, now);
  if (settled.energie >= ENERGIE_MAX) return null;
  const prochaine = settled.energieDerniereMaj + RECHARGE_INTERVAL_MS;
  return Math.max(0, Math.ceil((prochaine - now) / 1000));
}

/** Compteur de pubs du jour de confiance courant (reset implicite si nouveau jour). */
export function compteursPubs(
  state: EnergieState,
  now: number,
): { compte: number; restant: number } {
  const compte =
    state.pubsRecharge.jourCle === cleJour(now) ? state.pubsRecharge.compte : 0;
  return { compte, restant: Math.max(0, PUBS_MAX_PAR_JOUR - compte) };
}

export function peutRegarderPub(state: EnergieState, now: number): boolean {
  return compteursPubs(state, now).restant > 0;
}
```

- [ ] **Step 5 : Lancer les tests, vérifier le succès**

Run: `npx vitest run src/lib/energie.test.ts`
Expected: PASS (tous les tests verts).

- [ ] **Step 6 : Commit**

```bash
git add src/types/game.ts src/lib/energie.ts src/lib/energie.test.ts
git commit -m "feat(energie): module pur de recharge + champs GameState"
```

---

## Task 2 : Horloge monotone `lib/temps/horloge.ts`

**Files:**
- Create: `src/lib/temps/horloge.ts`
- Test: `src/lib/temps/horloge.test.ts`

- [ ] **Step 1 : Écrire les tests (échouent)**

Créer `src/lib/temps/horloge.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { poserAncre, tempsConfianceCourant } from "./horloge";

describe("horloge monotone", () => {
  it("extrapole le temps de confiance via le delta monotone", () => {
    const ancre = poserAncre(1_700_000_000_000, 5_000);
    // 12 s de monotone écoulées → +12 000 ms de temps de confiance.
    expect(tempsConfianceCourant(ancre, 17_000)).toBe(1_700_000_012_000);
  });

  it("est insensible à l'heure système (ne dépend que de l'ancre + monotone)", () => {
    const ancre = poserAncre(1_700_000_000_000, 0);
    // Peu importe l'heure système : seul le monotone fait avancer le résultat.
    expect(tempsConfianceCourant(ancre, 60_000)).toBe(1_700_000_060_000);
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/temps/horloge.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3 : Implémenter `src/lib/temps/horloge.ts`**

```ts
/** Lie un temps de confiance (epoch ms) à une lecture d'horloge monotone. */
export interface AncreTemps {
  /** Temps de confiance au moment de la pose (epoch ms). */
  confiance: number;
  /** Lecture `performance.now()` au moment de la pose (ms monotones). */
  mono: number;
}

export function poserAncre(confiance: number, mono: number): AncreTemps {
  return { confiance, mono };
}

/**
 * Temps de confiance courant, extrapolé via l'horloge monotone.
 * Insensible aux changements d'heure système : `mono` ne recule jamais et
 * n'est pas affecté par un réglage manuel de l'horloge.
 */
export function tempsConfianceCourant(ancre: AncreTemps, mono: number): number {
  return ancre.confiance + (mono - ancre.mono);
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `npx vitest run src/lib/temps/horloge.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/temps/horloge.ts src/lib/temps/horloge.test.ts
git commit -m "feat(temps): horloge monotone pour temps de confiance"
```

---

## Task 3 : Source de temps réseau `lib/temps/timeSource.ts`

**Files:**
- Create: `src/lib/temps/timeSource.ts`
- Test: `src/lib/temps/timeSource.test.ts`

Note CORS : on lit le temps dans le **corps JSON** d'une API publique (CORS permissif), pas le header `Date` (non exposé sans CORS côté navigateur). Endpoint remplaçable par Supabase plus tard.

- [ ] **Step 1 : Écrire les tests (échouent)**

Créer `src/lib/temps/timeSource.test.ts` :

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { HttpTimeSource } from "./timeSource";

afterEach(() => vi.restoreAllMocks());

describe("HttpTimeSource", () => {
  it("renvoie un epoch ms depuis le champ unixtime", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ unixtime: 1_700_000_000 }),
      }),
    );
    const src = new HttpTimeSource("https://exemple.test", 1000);
    expect(await src.maintenant()).toBe(1_700_000_000_000);
  });

  it("renvoie null sur réponse non ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await new HttpTimeSource("https://exemple.test").maintenant()).toBeNull();
  });

  it("renvoie null si fetch rejette (offline/timeout)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await new HttpTimeSource("https://exemple.test").maintenant()).toBeNull();
  });

  it("renvoie null si unixtime absent/non numérique", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    expect(await new HttpTimeSource("https://exemple.test").maintenant()).toBeNull();
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/temps/timeSource.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3 : Implémenter `src/lib/temps/timeSource.ts`**

```ts
/** Source de temps de confiance (non contrôlée par l'horloge du device). */
export interface TimeSource {
  /** Temps de confiance courant (epoch ms), ou null si indisponible (offline). */
  maintenant(): Promise<number | null>;
}

/** Endpoint par défaut (corps JSON `{ unixtime: <secondes> }`, CORS permissif). */
const TIME_API_URL = "https://worldtimeapi.org/api/timezone/Etc/UTC";

export class HttpTimeSource implements TimeSource {
  constructor(
    private readonly url: string = TIME_API_URL,
    private readonly timeoutMs: number = 4000,
  ) {}

  async maintenant(): Promise<number | null> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
      const res = await fetch(this.url, { cache: "no-store", signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) return null;
      const data = (await res.json()) as { unixtime?: unknown };
      const sec = typeof data.unixtime === "number" ? data.unixtime : NaN;
      const ms = sec * 1000;
      return Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }
}

// Singleton injectable — swap futur vers SupabaseTimeSource ici uniquement.
let instance: TimeSource | null = null;
export function getTimeSource(): TimeSource {
  if (!instance) instance = new HttpTimeSource();
  return instance;
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `npx vitest run src/lib/temps/timeSource.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/temps/timeSource.ts src/lib/temps/timeSource.test.ts
git commit -m "feat(temps): TimeSource reseau (HttpTimeSource) + singleton"
```

---

## Task 4 : Provider de pub `lib/ads/adProvider.ts`

**Files:**
- Create: `src/lib/ads/adProvider.ts`
- Test: `src/lib/ads/adProvider.test.ts`

- [ ] **Step 1 : Écrire le test (échoue)**

Créer `src/lib/ads/adProvider.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { StubAdProvider, getAdProvider } from "./adProvider";

describe("StubAdProvider", () => {
  it("résout une pub récompensée", async () => {
    const res = await new StubAdProvider(0).showRewardedAd();
    expect(res.rewarded).toBe(true);
  });

  it("getAdProvider renvoie un singleton stable", () => {
    expect(getAdProvider()).toBe(getAdProvider());
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/ads/adProvider.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3 : Implémenter `src/lib/ads/adProvider.ts`**

```ts
export interface AdResult {
  /** true si la pub a été visionnée jusqu'au bout (récompense due). */
  rewarded: boolean;
}

export interface AdProvider {
  showRewardedAd(): Promise<AdResult>;
}

/** Provider factice : simule un court délai puis accorde la récompense. */
export class StubAdProvider implements AdProvider {
  constructor(private readonly delaiMs: number = 800) {}

  async showRewardedAd(): Promise<AdResult> {
    await new Promise((r) => setTimeout(r, this.delaiMs));
    return { rewarded: true };
  }
}

// Singleton injectable — swap futur vers AdMobAdProvider (Tauri natif) ici uniquement.
let instance: AdProvider | null = null;
export function getAdProvider(): AdProvider {
  if (!instance) instance = new StubAdProvider();
  return instance;
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `npx vitest run src/lib/ads/adProvider.test.ts`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/ads/adProvider.ts src/lib/ads/adProvider.test.ts
git commit -m "feat(ads): AdProvider abstrait + StubAdProvider"
```

---

## Task 5 : Migration v4 → v5

**Files:**
- Modify: `src/lib/migrations.ts` (`SAVE_VERSION` ligne 85 ; objet retourné par `appliquerMigrations` ~ligne 385)
- Test: `src/lib/migrations.test.ts` (assertion version ~ligne 240)

- [ ] **Step 1 : Mettre à jour les tests**

Dans `src/lib/migrations.test.ts`, remplacer l'assertion de version existante :

```ts
  it("SAVE_VERSION incrémenté à 4", () => {
    expect(SAVE_VERSION).toBe(4);
  });
```

par :

```ts
  it("SAVE_VERSION incrémenté à 5", () => {
    expect(SAVE_VERSION).toBe(5);
  });

  it("pose des défauts énergie sur un vieux save sans ces champs", () => {
    const migré = migrerSauvegarde({ version: 4 } as unknown as GameState);
    expect(migré.energie).toBe(5);
    expect(typeof migré.energieDerniereMaj).toBe("number");
    expect(migré.pubsRecharge.compte).toBe(0);
    expect(typeof migré.pubsRecharge.jourCle).toBe("string");
  });

  it("conserve les valeurs énergie d'un save déjà v5", () => {
    const base = migrerSauvegarde({ version: 4 } as unknown as GameState);
    const v5 = {
      ...base,
      energie: 2,
      energieDerniereMaj: 1234,
      pubsRecharge: { jourCle: "2026-06-24", compte: 7 },
    } as GameState;
    const migré = migrerSauvegarde(v5);
    expect(migré.energie).toBe(2);
    expect(migré.energieDerniereMaj).toBe(1234);
    expect(migré.pubsRecharge).toEqual({ jourCle: "2026-06-24", compte: 7 });
  });
```

> Note : `migrerSauvegarde` et `GameState` sont déjà importés en tête du fichier de test ; sinon ajouter `migrerSauvegarde` à l'import existant `from "./migrations"` et `import type { GameState } from "@/types/game";`.

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `npx vitest run src/lib/migrations.test.ts`
Expected: FAIL — `SAVE_VERSION` vaut 4 et les champs énergie sont `undefined`.

- [ ] **Step 3 : Bump `SAVE_VERSION`**

Dans `src/lib/migrations.ts`, ligne 85 :

```ts
export const SAVE_VERSION = 5;
```

- [ ] **Step 4 : Ajouter les défauts dans `appliquerMigrations`**

En tête de `src/lib/migrations.ts`, ajouter à l'import existant `from "@/lib/energie"` (ou créer l'import) :

```ts
import { ENERGIE_MAX, cleJour } from "@/lib/energie";
```

Dans l'objet `return { ...loaded, ... }` de `appliquerMigrations`, juste après `missions: missionsFinales,`, ajouter :

```ts
    energie: (() => {
      const v = (loaded as Partial<GameState>).energie;
      if (typeof v === "number" && Number.isFinite(v)) {
        return Math.max(0, Math.min(ENERGIE_MAX, Math.floor(v)));
      }
      return ENERGIE_MAX;
    })(),
    energieDerniereMaj:
      typeof (loaded as Partial<GameState>).energieDerniereMaj === "number"
        ? (loaded as GameState).energieDerniereMaj
        : Date.now(),
    pubsRecharge: (() => {
      const p = (loaded as Partial<GameState>).pubsRecharge;
      if (
        p &&
        typeof p === "object" &&
        typeof (p as { jourCle?: unknown }).jourCle === "string" &&
        typeof (p as { compte?: unknown }).compte === "number"
      ) {
        return { jourCle: p.jourCle, compte: Math.max(0, Math.floor(p.compte)) };
      }
      return { jourCle: cleJour(Date.now()), compte: 0 };
    })(),
```

- [ ] **Step 5 : Lancer, vérifier le succès**

Run: `npx vitest run src/lib/migrations.test.ts`
Expected: PASS.

- [ ] **Step 6 : Commit**

```bash
git add src/lib/migrations.ts src/lib/migrations.test.ts
git commit -m "feat(energie): migration save v4 -> v5 (defauts energie)"
```

---

## Task 6 : Câblage `GameContext` (init + actions + temps de confiance)

**Files:**
- Modify: `src/context/GameContext.tsx` (imports ; interface `GameActionsValue` ~ligne 83-148 ; `nouvellePartie` ~ligne 200-236 ; nouvelles actions ; `actionsValue` useMemo ~ligne 1110-1190 ; effets de montage)

- [ ] **Step 1 : Ajouter les imports**

En tête de `src/context/GameContext.tsx`, ajouter :

```ts
import {
  ENERGIE_MAX,
  ENERGIE_PAR_PUB,
  cleJour,
  compteursPubs,
  settleEnergie,
} from "@/lib/energie";
import {
  poserAncre,
  tempsConfianceCourant,
  type AncreTemps,
} from "@/lib/temps/horloge";
import { getTimeSource } from "@/lib/temps/timeSource";
```

S'assurer que `useRef` est importé depuis `react` (ajouter à l'import React existant s'il manque).

- [ ] **Step 2 : Étendre l'interface `GameActionsValue`**

Dans `interface GameActionsValue { ... }`, après `marquerCourrierLu: (id: string) => void;`, ajouter :

```ts
  /** Temps de confiance courant (epoch ms) ou null si pas encore synchronisé. */
  tempsConfiance: () => number | null;
  /** Retire `n` énergie (settle d'abord ; jamais < 0). */
  consommerEnergie: (n: number) => void;
  /** Crédite +ENERGIE_PAR_PUB et incrémente le compteur de pubs du jour. No-op au plafond. */
  crediterEnergiePub: () => void;
  /** Settle l'énergie contre le temps de confiance et persiste. No-op si pas de temps de confiance. */
  rafraichirEnergie: () => void;
```

- [ ] **Step 3 : Initialiser les champs dans `nouvellePartie`**

Dans l'objet `initial: GameState` de `nouvellePartie`, après `missions: [],`, ajouter :

```ts
      energie: ENERGIE_MAX,
      energieDerniereMaj: Date.now(),
      pubsRecharge: { jourCle: cleJour(Date.now()), compte: 0 },
```

- [ ] **Step 4 : Ajouter l'ancre de temps + les actions**

Dans le composant `GameProvider`, à côté des autres `useCallback`/`useRef` (par ex. juste avant `payerFraisBrocante`), ajouter :

```ts
  const ancreRef = useRef<AncreTemps | null>(null);

  const tempsConfiance = useCallback((): number | null => {
    if (!ancreRef.current) return null;
    return tempsConfianceCourant(ancreRef.current, performance.now());
  }, []);

  const rafraichirEnergie = useCallback(() => {
    const now = tempsConfiance();
    if (now === null) return; // cold start offline : énergie figée
    setState((prev) => {
      if (!prev) return prev;
      const s = settleEnergie(prev, now);
      if (
        s.energie === prev.energie &&
        s.energieDerniereMaj === prev.energieDerniereMaj
      ) {
        return prev;
      }
      return { ...prev, ...s };
    });
  }, [tempsConfiance]);

  const consommerEnergie = useCallback(
    (n: number) => {
      setState((prev) => {
        if (!prev) return prev;
        const now = tempsConfiance();
        const base = now === null ? prev : { ...prev, ...settleEnergie(prev, now) };
        return { ...base, energie: Math.max(0, base.energie - n) };
      });
    },
    [tempsConfiance],
  );

  const crediterEnergiePub = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const t = tempsConfiance();
      const now = t ?? Date.now();
      const settled = t !== null ? settleEnergie(prev, now) : {
        energie: prev.energie,
        energieDerniereMaj: prev.energieDerniereMaj,
      };
      const apresSettle = { ...prev, ...settled };
      if (compteursPubs(apresSettle, now).restant <= 0) return apresSettle;
      const jourCle = cleJour(now);
      const compteActuel =
        prev.pubsRecharge.jourCle === jourCle ? prev.pubsRecharge.compte : 0;
      return {
        ...apresSettle,
        energie: Math.min(ENERGIE_MAX, settled.energie + ENERGIE_PAR_PUB),
        pubsRecharge: { jourCle, compte: compteActuel + 1 },
      };
    });
  }, [tempsConfiance]);
```

- [ ] **Step 5 : Synchroniser le temps de confiance au montage**

Dans `GameProvider`, ajouter un `useEffect` (après les effets d'hydratation existants) :

```ts
  // Synchronisation du temps de confiance : pose l'ancre puis settle l'énergie.
  useEffect(() => {
    if (!isHydrated) return;
    let actif = true;
    const sync = async () => {
      const t = await getTimeSource().maintenant();
      if (!actif || t === null) return;
      ancreRef.current = poserAncre(t, performance.now());
      rafraichirEnergie();
    };
    sync();
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const syncTimer = window.setInterval(sync, 10 * 60 * 1000); // re-sync /10 min
    const tickTimer = window.setInterval(() => rafraichirEnergie(), 60 * 1000); // settle /60 s
    return () => {
      actif = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(syncTimer);
      window.clearInterval(tickTimer);
    };
  }, [isHydrated, rafraichirEnergie]);
```

- [ ] **Step 6 : Exposer les actions dans `actionsValue`**

Dans le `useMemo<GameActionsValue>(() => ({ ... }), [ ... ])`, ajouter les 4 entrées dans l'objet **et** dans le tableau de dépendances :

Objet :
```ts
      tempsConfiance,
      consommerEnergie,
      crediterEnergiePub,
      rafraichirEnergie,
```

Dépendances (ajouter à la fin du tableau) :
```ts
      tempsConfiance,
      consommerEnergie,
      crediterEnergiePub,
      rafraichirEnergie,
```

- [ ] **Step 7 : Vérifier la compilation et la suite de tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS (aucune erreur de type ; tous les tests verts).

- [ ] **Step 8 : Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(energie): actions GameContext + sync temps de confiance"
```

---

## Task 7 : UI header — « Énergie » + `Zap` + bouton `+` et panneau de recharge

**Files:**
- Create: `src/components/mobile/EnergieRecharge.tsx`
- Modify: `src/components/mobile/MobileHeader.tsx`

- [ ] **Step 1 : Créer le panneau `EnergieRecharge.tsx`**

Créer `src/components/mobile/EnergieRecharge.tsx` :

```tsx
"use client";

import { Zap, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useGame, useGameActions } from "@/context/GameContext";
import {
  ENERGIE_MAX,
  PUBS_MAX_PAR_JOUR,
  compteursPubs,
  energieCourante,
  secondesAvantProchaine,
} from "@/lib/energie";
import { getAdProvider } from "@/lib/ads/adProvider";

function formatMMSS(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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
  maxWidth: 320,
  background: "var(--forest-800)",
  border: "3px solid var(--brass-500)",
  borderRadius: 14,
  padding: "18px 16px",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  position: "relative",
};

export function EnergieRecharge({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const { tempsConfiance, crediterEnergiePub } = useGameActions();
  const [enCours, setEnCours] = useState(false);
  const [, force] = useState(0);

  // Tick local 1 s pour le minuteur (sans réécrire le state global).
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!state) return null;
  const now = tempsConfiance() ?? Date.now();
  const energie = energieCourante(state, now);
  const restantSec = secondesAvantProchaine(state, now);
  const { restant } = compteursPubs(state, now);
  const pubIndisponible = enCours || restant <= 0;

  const regarderPub = async () => {
    if (pubIndisponible) return;
    setEnCours(true);
    try {
      const { rewarded } = await getAdProvider().showRewardedAd();
      if (rewarded) crediterEnergiePub();
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

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Zap size={22} strokeWidth={2.5} />
          <strong style={{ fontSize: 22 }}>
            {energie}
            <span style={{ color: "var(--brass-700)" }}>/{ENERGIE_MAX}</span>
          </strong>
        </div>

        <p style={{ fontSize: 13, color: "var(--brass-200)", margin: "0 0 14px" }}>
          {restantSec === null
            ? "Énergie au maximum."
            : `Prochaine ⚡ dans ${formatMMSS(restantSec)}`}
        </p>

        <button
          onClick={regarderPub}
          disabled={pubIndisponible}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            border: "2px solid var(--brass-500)",
            background: pubIndisponible ? "var(--forest-700)" : "var(--brass-500)",
            color: pubIndisponible ? "var(--brass-700)" : "var(--forest-900)",
            fontWeight: 700,
            cursor: pubIndisponible ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Zap size={16} />
          {enCours
            ? "Pub en cours…"
            : restant <= 0
              ? `Limite du jour atteinte (${PUBS_MAX_PAR_JOUR}/${PUBS_MAX_PAR_JOUR})`
              : "Regarder une pub — +1 ⚡"}
        </button>

        {restant > 0 && !enCours && (
          <p style={{ fontSize: 11, color: "var(--brass-700)", margin: "8px 0 0", textAlign: "center" }}>
            {restant} pub{restant > 1 ? "s" : ""} restante{restant > 1 ? "s" : ""} aujourd'hui
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Brancher l'énergie dans `MobileHeader.tsx`**

Remplacer le contenu de `src/components/mobile/MobileHeader.tsx` par :

```tsx
"use client";

import Link from "next/link";
import { Zap, Plus } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useGame, useGameActions } from "@/context/GameContext";
import { ENERGIE_MAX, energieCourante } from "@/lib/energie";
import { EnergieRecharge } from "./EnergieRecharge";

interface MobileHeaderProps {
  budget: number;
}

const wrapStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 30,
  paddingTop: "var(--safe-top)",
  background: "var(--forest-800)",
  borderBottom: "3px solid var(--brass-500)",
};

const innerStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto auto",
  alignItems: "center",
  gap: 12,
  padding: "8px 14px",
  height: "var(--mobile-header-h)",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(8px, 2.2vw, 10px)",
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  lineHeight: 1,
};

const valueStyle: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "clamp(13px, 3.8vw, 16px)",
  color: "var(--brass-300)",
  marginTop: 2,
};

export function MobileHeader({ budget }: MobileHeaderProps) {
  const { state } = useGame();
  const { tempsConfiance } = useGameActions();
  const [rechargeOuverte, setRechargeOuverte] = useState(false);

  const now = tempsConfiance() ?? Date.now();
  const energie = state ? energieCourante(state, now) : ENERGIE_MAX;
  const peutRecharger = energie < ENERGIE_MAX;

  return (
    <header style={wrapStyle}>
      <div style={innerStyle}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-broc-title)",
            fontWeight: 400,
            fontSize: "clamp(26px, 7.8vw, 36px)",
            letterSpacing: "0.04em",
            color: "var(--brass-300)",
            textDecoration: "none",
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "center",
            height: "100%",
          }}
        >
          Broc
        </Link>
        <span />
        <div style={{ textAlign: "center", ...labelStyle }}>
          Énergie
          <strong
            style={{
              ...valueStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {peutRecharger && (
              <button
                onClick={() => setRechargeOuverte(true)}
                aria-label="Recharger l'énergie"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  border: "1.5px solid var(--brass-500)",
                  background: "transparent",
                  color: "var(--brass-300)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            )}
            <Zap size={15} strokeWidth={2.5} aria-hidden />
            {energie}
            <span style={{ color: "var(--brass-700)" }}>/{ENERGIE_MAX}</span>
          </strong>
        </div>
        <div style={{ textAlign: "right", ...labelStyle }}>
          Caisse
          <strong style={valueStyle}>{budget.toLocaleString("fr-FR")} €</strong>
        </div>
      </div>

      {rechargeOuverte && <EnergieRecharge onClose={() => setRechargeOuverte(false)} />}
    </header>
  );
}
```

> Le compteur n'a plus de tick 1 s propre (re-render via les settles /60 s et l'ouverture du panneau suffisent à l'affichage du nombre ; le minuteur fin vit dans `EnergieRecharge`). Aucune page n'a besoin de changer : la prop `tickets` n'était jamais passée et est supprimée.

- [ ] **Step 3 : Vérifier compilation + build**

Run: `npx tsc --noEmit`
Expected: PASS — aucune erreur (notamment aucune page ne passe encore `tickets`).

- [ ] **Step 4 : Commit**

```bash
git add src/components/mobile/MobileHeader.tsx src/components/mobile/EnergieRecharge.tsx
git commit -m "feat(energie): header Energie + bouton recharge + panneau pub"
```

---

## Task 8 : Icône d'entrée `Ticket` → `Zap`

**Files:**
- Modify: `src/components/mobile/brocante-pano/BrocanteDetailFloating.tsx` (import ligne 3 ; aria ligne 269 ; icône ligne 274 ; commentaires ligne 101-102)

- [ ] **Step 1 : Remplacer l'import**

Ligne 3, remplacer :

```tsx
import { Ticket } from "lucide-react";
```

par :

```tsx
import { Zap } from "lucide-react";
```

> Si la ligne 3 importe d'autres icônes dans la même accolade, remplacer seulement `Ticket` par `Zap` dans la liste.

- [ ] **Step 2 : Mettre à jour l'aria-label et l'icône**

Ligne ~269, remplacer :

```tsx
          aria-label={`Entrée : ${fraisEntree(brocante)} euros et 1 ticket`}
```

par :

```tsx
          aria-label={`Entrée : ${fraisEntree(brocante)} euros et 1 énergie`}
```

Ligne ~274, remplacer :

```tsx
          <Ticket size={14} strokeWidth={2} />
```

par :

```tsx
          <Zap size={14} strokeWidth={2} />
```

- [ ] **Step 3 : Mettre à jour les commentaires (lignes ~101-102)**

Remplacer toute mention « ticket » dans les commentaires du bloc frais par « énergie » (ex. « puis l'icône énergie. » et « Style "ticket de gala" » → « Style "billet de gala" »).

- [ ] **Step 4 : Vérifier compilation**

Run: `npx tsc --noEmit`
Expected: PASS — plus aucune référence à `Ticket`.

- [ ] **Step 5 : Commit**

```bash
git add src/components/mobile/brocante-pano/BrocanteDetailFloating.tsx
git commit -m "feat(energie): icone d'entree Ticket -> Zap (energie)"
```

---

## Task 9 : Consommation à l'entrée (chiner + vente)

**Files:**
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx` (~ligne 28 destructuring actions ; ~ligne 94-99 garde d'entrée)
- Modify: `src/app/vitrine/[brocanteId]/ClientPage.tsx` (~ligne 28 destructuring actions ; ~ligne 115-119 `handleOuvrir`)

- [ ] **Step 1 : Chinage — récupérer les actions énergie**

Dans `src/app/chiner/[brocanteId]/ClientPage.tsx`, dans le destructuring de `useGame()`/`useGameActions()` qui contient déjà `payerFraisBrocante`, ajouter `tempsConfiance` et `consommerEnergie`. Ajouter aussi l'import :

```tsx
import { energieCourante } from "@/lib/energie";
```

- [ ] **Step 2 : Chinage — garde + consommation**

Dans le `useEffect` d'entrée, juste après le bloc budget existant :

```tsx
      const frais = fraisEntree(brocante);
      if (state.budget < frais) {
        return router.replace(`/chiner?raison=budget&id=${brocante.id}`);
      }
```

insérer la garde énergie **avant** `entreePayeeRef.current = true;` :

```tsx
      const maintenant = tempsConfiance() ?? Date.now();
      if (energieCourante(state, maintenant) < 1) {
        return router.replace(`/chiner?raison=energie&id=${brocante.id}`);
      }
```

puis, juste après `payerFraisBrocante(brocante.id, brocante.nom, frais);`, ajouter :

```tsx
      consommerEnergie(1);
```

- [ ] **Step 3 : Vente — récupérer les actions énergie**

Dans `src/app/vitrine/[brocanteId]/ClientPage.tsx`, ajouter `tempsConfiance` et `consommerEnergie` au destructuring des actions, et l'import :

```tsx
import { energieCourante } from "@/lib/energie";
```

- [ ] **Step 4 : Vente — garde + consommation dans `handleOuvrir`**

Remplacer `handleOuvrir` (~ligne 115-119) :

```tsx
  const handleOuvrir = () => {
    const frais = fraisEntree(brocante);
    if (state.budget < frais) return;
    payerFraisBrocante(brocante.id, brocante.nom, frais);
    router.push(`/vitrine/${brocante.id}/journee`);
  };
```

par :

```tsx
  const handleOuvrir = () => {
    const frais = fraisEntree(brocante);
    if (state.budget < frais) return;
    const maintenant = tempsConfiance() ?? Date.now();
    if (energieCourante(state, maintenant) < 1) return; // plus d'énergie
    payerFraisBrocante(brocante.id, brocante.nom, frais);
    consommerEnergie(1);
    router.push(`/vitrine/${brocante.id}/journee`);
  };
```

> Pour désactiver visuellement le bouton « Ouvrir l'étal » quand l'énergie manque, on peut étendre la condition `disabled`/`canValider` existante (~ligne 158) avec `&& energieCourante(state, tempsConfiance() ?? Date.now()) >= 1`. Optionnel — la garde dans `handleOuvrir` suffit à bloquer l'action.

- [ ] **Step 5 : Vérifier compilation + suite complète**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS — types OK, tous les tests verts.

- [ ] **Step 6 : Build de production (sanity)**

Run: `npm run build`
Expected: build Next.js réussi sans erreur.

- [ ] **Step 7 : Commit**

```bash
git add "src/app/chiner/[brocanteId]/ClientPage.tsx" "src/app/vitrine/[brocanteId]/ClientPage.tsx"
git commit -m "feat(energie): consomme 1 energie a l'entree chinage/vente"
```

---

## Vérification finale (manuelle)

- [ ] Lancer l'app (`npm run dev` ou via Tauri), créer/charger une partie.
- [ ] Header : « Énergie 5/5 » avec icône éclair ; « Caisse » inchangée.
- [ ] Entrer dans une brocante (chiner) → énergie passe à 4/5, un « + » apparaît à gauche du compteur.
- [ ] Tap sur « + » → panneau : jauge, minuteur « Prochaine ⚡ dans mm:ss » qui décompte, bouton « Regarder une pub — +1 ⚡ ».
- [ ] Cliquer le bouton pub → après ~0,8 s, énergie +1, compteur de pubs décrémenté.
- [ ] Vider l'énergie à 0 → entrée brocante bloquée (retour liste), ouverture étal bloquée.
- [ ] Avancer l'horloge système de +3 h → l'énergie **ne** se recharge **pas** davantage (temps de confiance).
- [ ] Reculer l'horloge système → pas de perte ni de gain anormal.

---

## Notes d'exécution

- **Anti-triche** : tant qu'une sync réseau n'a pas eu lieu (`tempsConfiance() === null`), les gardes d'entrée et l'affichage retombent sur `Date.now()` (best effort) mais `rafraichirEnergie` reste no-op (énergie figée) — cohérent avec la spec (cold start offline = pas de recharge tant que non vérifié).
- **`worldtimeapi.org`** est un placeholder ; en cas d'indisponibilité récurrente, remplacer l'URL dans `HttpTimeSource` ou brancher `SupabaseTimeSource` (même interface) quand le backend existera.
- Les commits sont volontairement fréquents (1 par task) pour faciliter le review et un éventuel rollback.
