# SP2 — Mécanique de la trame scénaristique : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer la mécanique complète de la trame principale : objectifs de mission génériques (`ObjectifMission`, 6 variantes avec progression), condition de déblocage `chapitrePrincipal`, retrait des gates de niveau des brocantes, lettres d'invitation des Organisateurs, et délivrance des chapitres en dialogue via la pastille du grand-père.

**Architecture:** L'arc de données passe à un squelette de 12 chapitres (`trame_ch1..12`, objectifs mécaniques exacts de la spec, textes provisoires à réécrire en SP3). Les chapitres ne sont plus injectés par le tick : un sélecteur `chapitrePret` allume la pastille `GrandPereBadge`, le dialogue accepté crée le courrier + la mission (avec `timestampAcceptation`). La complétion des objectifs non-objet est calculée en pur depuis l'historique/l'état ; la livraison reste dans le carnet. Migration v13 : mapping anciens chapitres/niveau → chapitres `trame_*` livrés (jamais re-verrouiller un tier).

**Tech Stack:** TypeScript strict, Next.js (App Router), vitest + @testing-library/react. Aucune dépendance nouvelle.

## Global Constraints

- **Règle d'or i18n : jamais de chaîne localisée en save.** Les payloads FR sont la source ; les ids (`trame_chN`, ids d'expéditeur, clés de dictionnaire) sont stables. Overlays EN/ES des CONTENUS (corps de chapitres, dialogues) = SP3 ; les chaînes UI (carnet, conditions) sont trilingues dès SP2 (`src/lib/i18n/ui/{fr,en,es}.ts`).
- **Champs de save ADDITIFS et optionnels** partout où possible (`objectifs?`, `timestampAcceptation?`, `restaurations?`) — la migration v13 n'a à s'occuper QUE du mapping de l'arc.
- **Textes provisoires** : chaque texte narratif écrit en SP2 (corps, dialogues, invitations) porte le commentaire `// SP3 : texte provisoire` — SP3 les réécrit. Ton doux/nostalgique, pas de sarcasme.
- **Valeurs provisoires à équilibrer en SP3** : ch5 `niveau: 8` ; récompenses (60/80/100/120 — 150/170/190/220 — 260/150/500/500).
- États objets exacts : `"Mauvais" | "Bon" | "Très bon" | "Pristin état"` (« Comme neuf » de la spec = `"Pristin état"`).
- Vérification par tâche : `npx vitest run <fichiers> --reporter=dot`, `npx tsc --noEmit`, `npx eslint <fichiers touchés>` (⚠ `npm run lint` cassé, utiliser `npx eslint`).
- Commits fréquents, messages en français, suffixe `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Types `ObjectifMission` + progression pure

**Files:**
- Modify: `src/types/game.ts` (bloc MissionCible ~l.140, MissionResolution ~l.194, GameState ~l.330)
- Create: `src/lib/quetes/objectifs.ts`
- Test: `src/lib/quetes/objectifs.test.ts`

**Interfaces:**
- Consumes: `ETATS_ORDRE` (`@/lib/etat`), `valeurTotale` (`@/lib/collection`), `progressionMission` (`@/lib/missions`), types `GameState`, `SessionVente`.
- Produces (utilisés par Tasks 3, 7, 10) :
  - `type ObjectifMission` (union 6 variantes, exportée de `@/types/game`)
  - `interface RestaurationAccomplie { timestamp: number; etatFinal: EtatObjet }` (types/game)
  - `GameState.restaurations?: RestaurationAccomplie[]` ; `MissionResolution.timestampAcceptation?: number` ; `CourrierPayloadMission.objectifs?: ObjectifMission[]`
  - `objectifsDeMission(payload: CourrierPayloadMission): ObjectifMission[]`
  - `interface ProgressionObjectif { actuel: number; cible: number; atteint: boolean }`
  - `progressionObjectif(obj: ObjectifMission, state: GameState, reso: MissionResolution, jourRecu: number): ProgressionObjectif`

- [ ] **Step 1: Ajouter les types dans `src/types/game.ts`**

Sous `MissionCible` :

```ts
/** Objectif de mission générique (SP2 trame). La variante "objet" reflète les
 *  `cibles` historiques ; les autres se mesurent depuis l'état/l'historique. */
export type ObjectifMission =
  | { type: "objet"; templateId: string; etatMin?: EtatObjet }
  | { type: "ventesCumulees"; montant: number }
  | { type: "profitVente"; montant: number }
  | { type: "restauration"; etatMin: EtatObjet }
  | { type: "valeurCollection"; montant: number }
  | { type: "niveau"; niveau: number };

/** Restauration terminée (trace pour les objectifs "restauration"). */
export interface RestaurationAccomplie {
  timestamp: number;
  etatFinal: EtatObjet;
}
```

Dans `CourrierPayloadMission`, après `cibles` :

```ts
  /**
   * ADDITIF (SP2) : objectifs génériques. Convention : les entrées `type:"objet"`
   * DOIVENT refléter `cibles` (même ordre) — la livraison d'objets continue de
   * passer par `cibles`. Absent ⇒ mission historique, objectifs dérivés des cibles.
   */
  objectifs?: ObjectifMission[];
```

Dans `MissionResolution` :

```ts
  /** ADDITIF (SP2) : instant d'acceptation — borne basse des objectifs cumulatifs. */
  timestampAcceptation?: number;
```

Dans `GameState` (près de `missions`) :

```ts
  /** ADDITIF (SP2) : restaurations terminées (bornées aux 100 dernières). */
  restaurations?: RestaurationAccomplie[];
```

- [ ] **Step 2: Écrire les tests qui échouent** (`src/lib/quetes/objectifs.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import {
  objectifsDeMission,
  progressionObjectif,
} from "./objectifs";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import type { CourrierPayloadMission, MissionResolution, SessionVente } from "@/types/game";

const payloadBase: CourrierPayloadMission = {
  type: "mission", categorie: "principale", expediteurId: "grand-pere",
  titre: "t", corps: [], cibles: [], recompense: { argent: 10 },
};
const reso: MissionResolution = { courrierId: "x", statut: "active", timestampAcceptation: 1000 };

function venteSession(timestamp: number, ventes: Array<{ prixVente: number; prixAchat: number | null }>): SessionVente {
  return {
    id: `s${timestamp}`, type: "vente", jour: 3, timestamp, niveauCamion: 1,
    loyer: 0, invendus: 0, xpGagne: {} as SessionVente["xpGagne"],
    ventes: ventes.map((v, i) => ({
      objetId: `o${i}`, templateId: "ma.x", nom: "X", categorie: "Maison",
      etat: "Bon", prixReferenceReel: 10, ...v,
    })),
  } as SessionVente;
}

describe("objectifsDeMission", () => {
  it("dérive des cibles quand objectifs absent", () => {
    const p = { ...payloadBase, cibles: [{ templateId: "ma.a", etatMin: "Bon" as const }] };
    expect(objectifsDeMission(p)).toEqual([{ type: "objet", templateId: "ma.a", etatMin: "Bon" }]);
  });
  it("retourne objectifs quand présent", () => {
    const p = { ...payloadBase, objectifs: [{ type: "ventesCumulees" as const, montant: 300 }] };
    expect(objectifsDeMission(p)).toEqual([{ type: "ventesCumulees", montant: 300 }]);
  });
});

describe("progressionObjectif", () => {
  it("ventesCumulees : somme les ventes strictement après l'acceptation", () => {
    const state = createMockGameState({
      historique: [
        venteSession(500, [{ prixVente: 100, prixAchat: 10 }]),  // avant acceptation
        venteSession(2000, [{ prixVente: 120, prixAchat: 10 }, { prixVente: 60, prixAchat: null }]),
      ],
    });
    const p = progressionObjectif({ type: "ventesCumulees", montant: 300 }, state, reso, 1);
    expect(p).toEqual({ actuel: 180, cible: 300, atteint: false });
  });
  it("profitVente : meilleur profit d'une seule vente après acceptation (prixAchat null ignoré)", () => {
    const state = createMockGameState({
      historique: [venteSession(2000, [
        { prixVente: 150, prixAchat: 40 },   // profit 110
        { prixVente: 500, prixAchat: null }, // ignoré
      ])],
    });
    const p = progressionObjectif({ type: "profitVente", montant: 100 }, state, reso, 1);
    expect(p).toEqual({ actuel: 110, cible: 100, atteint: true });
  });
  it("restauration : atteint si une restauration post-acceptation atteint l'état min", () => {
    const state = createMockGameState({
      restaurations: [
        { timestamp: 500, etatFinal: "Pristin état" },  // avant
        { timestamp: 2000, etatFinal: "Très bon" },
      ],
    });
    expect(progressionObjectif({ type: "restauration", etatMin: "Très bon" }, state, reso, 1).atteint).toBe(true);
    expect(progressionObjectif({ type: "restauration", etatMin: "Pristin état" }, state, reso, 1).atteint).toBe(false);
  });
  it("valeurCollection et niveau : lus en direct sur l'état", () => {
    const state = createMockGameState({});
    state.brocanteur.niveau = 7;
    const n = progressionObjectif({ type: "niveau", niveau: 8 }, state, reso, 1);
    expect(n).toEqual({ actuel: 7, cible: 8, atteint: false });
    const v = progressionObjectif({ type: "valeurCollection", montant: 5000 }, state, reso, 1);
    expect(v.cible).toBe(5000);
    expect(v.atteint).toBe(v.actuel >= 5000);
  });
  it("objet : possession dans l'inventaire (0/1)", () => {
    const state = createMockGameState({});
    const avant = progressionObjectif({ type: "objet", templateId: "ma.zz" }, state, reso, 1);
    expect(avant).toEqual({ actuel: 0, cible: 1, atteint: false });
  });
  it("fallback sans timestampAcceptation : borne par jourRecu (sessions jour >= jourRecu)", () => {
    const state = createMockGameState({
      historique: [venteSession(2000, [{ prixVente: 120, prixAchat: 10 }])], // jour 3
    });
    const sansTs: MissionResolution = { courrierId: "x", statut: "active" };
    expect(progressionObjectif({ type: "ventesCumulees", montant: 300 }, state, sansTs, 4).actuel).toBe(0);
    expect(progressionObjectif({ type: "ventesCumulees", montant: 300 }, state, sansTs, 3).actuel).toBe(120);
  });
});
```

Note : vérifier le chemin réel de la fixture (`grep -rn "createMockGameState" src/lib/__test-fixtures__/`) et adapter l'import + les champs obligatoires de `SessionVente` au besoin.

- [ ] **Step 3: Vérifier l'échec** — `npx vitest run src/lib/quetes/objectifs.test.ts` → FAIL (module inexistant).

- [ ] **Step 4: Implémenter `src/lib/quetes/objectifs.ts`**

```ts
import { ETATS_ORDRE } from "@/lib/etat";
import { valeurTotale } from "@/lib/collection";
import { progressionMission } from "@/lib/missions";
import type {
  CourrierPayloadMission,
  GameState,
  MissionResolution,
  ObjectifMission,
  SessionVente,
} from "@/types/game";

export interface ProgressionObjectif {
  actuel: number;
  cible: number;
  atteint: boolean;
}

/** Objectifs effectifs d'une mission (compat : dérivés des cibles si absent). */
export function objectifsDeMission(p: CourrierPayloadMission): ObjectifMission[] {
  if (p.objectifs) return p.objectifs;
  return p.cibles.map((c) => ({ type: "objet", templateId: c.templateId, ...(c.etatMin ? { etatMin: c.etatMin } : {}) }));
}

/** Sessions de vente comptées pour un objectif cumulatif : strictement après
 *  l'acceptation si on a le timestamp, sinon à partir du jour de réception. */
function sessionsComptees(
  state: Pick<GameState, "historique">,
  reso: Pick<MissionResolution, "timestampAcceptation">,
  jourRecu: number,
): SessionVente[] {
  return state.historique.filter((s): s is SessionVente => {
    if (s.type !== "vente") return false;
    return reso.timestampAcceptation !== undefined
      ? s.timestamp > reso.timestampAcceptation
      : s.jour >= jourRecu;
  });
}

export function progressionObjectif(
  obj: ObjectifMission,
  state: GameState,
  reso: MissionResolution,
  jourRecu: number,
): ProgressionObjectif {
  switch (obj.type) {
    case "objet": {
      const prog = progressionMission(
        { cibles: [{ templateId: obj.templateId, ...(obj.etatMin ? { etatMin: obj.etatMin } : {}) }] } as CourrierPayloadMission,
        state.inventaireJoueur,
      );
      return { actuel: prog.remplies, cible: 1, atteint: prog.livrable };
    }
    case "ventesCumulees": {
      const total = sessionsComptees(state, reso, jourRecu)
        .flatMap((s) => s.ventes)
        .reduce((acc, v) => acc + v.prixVente, 0);
      return { actuel: total, cible: obj.montant, atteint: total >= obj.montant };
    }
    case "profitVente": {
      const meilleur = sessionsComptees(state, reso, jourRecu)
        .flatMap((s) => s.ventes)
        .reduce((acc, v) => (v.prixAchat === null ? acc : Math.max(acc, v.prixVente - v.prixAchat)), 0);
      return { actuel: meilleur, cible: obj.montant, atteint: meilleur >= obj.montant };
    }
    case "restauration": {
      const minIdx = ETATS_ORDRE.indexOf(obj.etatMin);
      const apres = reso.timestampAcceptation ?? 0;
      const ok = (state.restaurations ?? []).some(
        (r) => r.timestamp > apres && ETATS_ORDRE.indexOf(r.etatFinal) >= minIdx,
      );
      return { actuel: ok ? 1 : 0, cible: 1, atteint: ok };
    }
    case "valeurCollection": {
      const actuel = Math.floor(valeurTotale(state.collection));
      return { actuel, cible: obj.montant, atteint: actuel >= obj.montant };
    }
    case "niveau": {
      const actuel = state.brocanteur?.niveau ?? 0;
      return { actuel, cible: obj.niveau, atteint: actuel >= obj.niveau };
    }
  }
}
```

- [ ] **Step 5: Vérifier** — `npx vitest run src/lib/quetes/objectifs.test.ts` → PASS ; `npx tsc --noEmit` propre.

- [ ] **Step 6: Commit** — `feat(quetes): ObjectifMission (6 variantes) + progression pure`

---

### Task 2: Trace des restaurations accomplies

**Files:**
- Modify: `src/lib/atelier.ts` (fonction `appliquerRecuperation`, ~l.161)
- Test: `src/lib/atelier.test.ts` (ajouter des cas)

**Interfaces:**
- Produces: `appliquerRecuperation` renseigne `state.restaurations` (append `{timestamp, etatFinal}`, borné aux 100 dernières). Consommé par `progressionObjectif` (Task 1).

- [ ] **Step 1: Test qui échoue** (dans `src/lib/atelier.test.ts`, à côté des tests existants d'`appliquerRecuperation` — lire le fichier pour réutiliser ses fixtures)

```ts
it("appliquerRecuperation trace la restauration (timestamp + état final)", () => {
  // Réutiliser la fixture existante du fichier : un state avec un objet dont
  // enRestauration.finMs est passé, puis :
  const next = appliquerRecuperation(state, objetId, now);
  expect(next?.restaurations).toHaveLength(1);
  expect(next?.restaurations?.[0]).toEqual({ timestamp: now, etatFinal: next!.inventaireJoueur.find(o => o.id === objetId)!.etat });
});

it("appliquerRecuperation borne la trace à 100 entrées", () => {
  const charge = { ...state, restaurations: Array.from({ length: 100 }, (_, i) => ({ timestamp: i, etatFinal: "Bon" as const })) };
  const next = appliquerRecuperation(charge, objetId, now);
  expect(next?.restaurations).toHaveLength(100);
  expect(next?.restaurations?.[99]?.timestamp).toBe(now);
});
```

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run src/lib/atelier.test.ts` → FAIL.

- [ ] **Step 3: Implémenter** — dans `appliquerRecuperation`, au moment où l'objet sort de restauration avec son état final (`etatFinal` = l'état de l'objet retourné) :

```ts
const restaurations = [
  ...(state.restaurations ?? []),
  { timestamp: now, etatFinal },
].slice(-100);
// ...inclure `restaurations` dans le state retourné
```

- [ ] **Step 4: Vérifier** — tests atelier PASS, `npx tsc --noEmit` propre.
- [ ] **Step 5: Commit** — `feat(atelier): trace des restaurations accomplies (objectif "restauration")`

---

### Task 3: Livrabilité agrégée + gating de `livrerMission`

**Files:**
- Modify: `src/lib/quetes/objectifs.ts` (ajouter `missionLivrable`)
- Modify: `src/context/GameContext.tsx` (`livrerMission`, ~l.1482)
- Test: `src/lib/quetes/objectifs.test.ts`

**Interfaces:**
- Produces: `missionLivrable(payload: CourrierPayloadMission, reso: MissionResolution, state: GameState, jourRecu: number): boolean` — vrai si TOUTES les cibles objets sont possédées ET tous les objectifs non-objet atteints. Mission sans cibles ni objectifs ⇒ livrable (chapitres narratifs).
- Consumes: `progressionObjectif`, `estMissionLivrable` (`@/lib/missions`).

- [ ] **Step 1: Tests qui échouent**

```ts
describe("missionLivrable", () => {
  it("narrative (aucun objectif) : livrable immédiatement", () => {
    expect(missionLivrable(payloadBase, reso, createMockGameState({}), 1)).toBe(true);
  });
  it("mixte : exige cibles possédées ET objectifs non-objet atteints", () => {
    const p = { ...payloadBase, objectifs: [{ type: "ventesCumulees" as const, montant: 300 }] };
    const state = createMockGameState({ historique: [venteSession(2000, [{ prixVente: 350, prixAchat: 10 }])] });
    expect(missionLivrable(p, reso, state, 1)).toBe(true);
    expect(missionLivrable(p, reso, createMockGameState({}), 1)).toBe(false);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** puis **implémenter** dans `objectifs.ts` :

```ts
import { estMissionLivrable } from "@/lib/missions";

/** Livrabilité complète : cibles objets (machinerie historique) + objectifs non-objet. */
export function missionLivrable(
  payload: CourrierPayloadMission,
  reso: MissionResolution,
  state: GameState,
  jourRecu: number,
): boolean {
  if (!estMissionLivrable(payload, state.inventaireJoueur)) return false;
  return objectifsDeMission(payload)
    .filter((o) => o.type !== "objet")
    .every((o) => progressionObjectif(o, state, reso, jourRecu).atteint);
}
```

(`estMissionLivrable` avec `cibles: []` retourne déjà `true` — vérifié dans `progressionMission` : 0 cible ⇒ `livrable: remplies === 0`.)

- [ ] **Step 3: Gater `livrerMission`** — dans `GameContext.livrerMission`, AVANT le calcul `aRetirer`, ajouter :

```ts
if (!missionLivrable(courrier.payload, reso, current, courrier.jourRecu)) {
  return { ok: false, raison: raisonLocalisee("objetsRequisManquants") };
}
```

(import `missionLivrable` depuis `@/lib/quetes/objectifs`). Le calcul `aRetirer` existant reste (consommation des seules cibles objets ; `cibles: []` ⇒ `[]`).

- [ ] **Step 4: Vérifier** — `npx vitest run src/lib/quetes src/lib/missions.test.ts` PASS + `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `feat(quetes): livrabilité agrégée (cibles + objectifs) gatant livrerMission`

---

### Task 4: Nouvel arc de données — squelette 12 chapitres

**Files:**
- Rewrite: `src/data/quetesPrincipales.ts`
- Test: `src/data/quetesPrincipales.test.ts` (créer ou réécrire s'il existe)

**Interfaces:**
- Produces (consommés par Tasks 5, 7, 8, 11) :
  - `interface ChapitrePrincipal { id: string; ordre: number; acte: 1 | 2 | 3; condition: ConditionDeblocage; dialogue: DialogueLigne[]; invitationTier?: 2 | 3 | 4; payload: { titre; corps; cibles; objectifs; recompense; conserverCibles? } }`
  - `QUETES_PRINCIPALES: ChapitrePrincipal[]` (12 entrées, ids `trame_ch1`…`trame_ch12`)
  - `chapitreParOrdre(ordre: number): ChapitrePrincipal | undefined`
  - `chapitreParId(id: string): ChapitrePrincipal | undefined`
- Consumes: `DialogueLigne` (`@/data/dialogues`), types.

- [ ] **Step 1: Tests qui échouent** (`src/data/quetesPrincipales.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { QUETES_PRINCIPALES, chapitreParOrdre } from "./quetesPrincipales";
import { BROCANTES } from "./brocantes";
import { getTemplate } from "./objetTemplates";

describe("trame principale (squelette SP2)", () => {
  it("12 chapitres, ordres 1..12 uniques, ids trame_chN", () => {
    expect(QUETES_PRINCIPALES).toHaveLength(12);
    const ordres = QUETES_PRINCIPALES.map((c) => c.ordre).sort((a, b) => a - b);
    expect(ordres).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    for (const c of QUETES_PRINCIPALES) expect(c.id).toBe(`trame_ch${c.ordre}`);
  });
  it("les cibles reflètent exactement les objectifs de type objet", () => {
    for (const c of QUETES_PRINCIPALES) {
      const objets = c.payload.objectifs.filter((o) => o.type === "objet");
      expect(c.payload.cibles).toEqual(
        objets.map((o) => ({ templateId: o.templateId, ...(o.etatMin ? { etatMin: o.etatMin } : {}) })),
      );
    }
  });
  it("chaque chapitre a un dialogue non vide et un templateId cible valide", () => {
    for (const c of QUETES_PRINCIPALES) {
      expect(c.dialogue.length).toBeGreaterThan(0);
      for (const cible of c.payload.cibles) expect(getTemplate(cible.templateId)).toBeDefined();
    }
  });
  it("invitations : ch4→tier2, ch8→tier3, ch10→tier4, uniques", () => {
    expect(chapitreParOrdre(4)?.invitationTier).toBe(2);
    expect(chapitreParOrdre(8)?.invitationTier).toBe(3);
    expect(chapitreParOrdre(10)?.invitationTier).toBe(4);
    expect(QUETES_PRINCIPALES.filter((c) => c.invitationTier).map((c) => c.ordre)).toEqual([4, 8, 10]);
  });
  it("chapitres narratifs (10, 12) : aucun objectif ; ch11 conserve ses cibles", () => {
    expect(chapitreParOrdre(10)?.payload.objectifs).toEqual([]);
    expect(chapitreParOrdre(12)?.payload.objectifs).toEqual([]);
    expect(chapitreParOrdre(11)?.payload.conserverCibles).toBe(true);
  });
  it("les objets-cibles de l'acte I existent dans les pools atteignables du tier 1", () => {
    // Garantie de trouvabilité (spec) : lampe (ch1) et pichet (ch4) doivent être
    // obtenables tier 1 : ni exclusifs à une brocante d'un tier supérieur, ni uniques.
    const exclusifsSup = new Set(BROCANTES.filter((b) => b.tier > 1).flatMap((b) => b.poolExclusif));
    for (const t of ["ma.lampe_petrole_ancienne", "ma.pichet_faience_emaillee"]) {
      expect(exclusifsSup.has(t)).toBe(false);
      expect(getTemplate(t)?.unique).toBeFalsy();
    }
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — FAIL (arc actuel : 5 chapitres `principale_ch*`).

- [ ] **Step 3: Réécrire `src/data/quetesPrincipales.ts`**

Structure (extrait complet des 4 premiers chapitres — les 8 autres suivent le même patron avec les valeurs du tableau ci-dessous) :

```ts
import type { ConditionDeblocage, EtatObjet, MissionCible, ObjectifMission } from "@/types/game";
import type { DialogueLigne } from "@/data/dialogues";

export interface ChapitrePrincipal {
  id: string;
  ordre: number;
  acte: 1 | 2 | 3;
  /** Condition d'apparition EN PLUS de « chapitre précédent livré ». */
  condition: ConditionDeblocage;
  /** Dialogue de délivrance (grand-père, pastille QG). SP3 : textes définitifs. */
  dialogue: DialogueLigne[];
  /** Si présent : la livraison de ce chapitre injecte la lettre d'invitation du tier. */
  invitationTier?: 2 | 3 | 4;
  payload: {
    titre: string;
    corps: string[];
    cibles: MissionCible[];
    objectifs: ObjectifMission[];
    recompense: { argent: number };
    conserverCibles?: boolean;
  };
}

/**
 * Trame principale (SP2) : le grand-père, vivant, confie 12 chapitres en
 * 3 actes. Fil rouge : les bijoux de la reine. Textes provisoires (SP3).
 * Ids STABLES `trame_chN` (i18n + saves) — préfixe distinct de l'ancien arc
 * `principale_*` pour éviter toute collision en migration.
 */
export const QUETES_PRINCIPALES: ChapitrePrincipal[] = [
  {
    id: "trame_ch1",
    ordre: 1,
    acte: 1,
    condition: { type: "depart" },
    // SP3 : texte provisoire
    dialogue: [
      { humeur: "songeur", texte: "Ma vieille lampe d'atelier… quarante ans qu'elle a éclairé mes trouvailles. Elle me manque." },
      { humeur: "souriant", texte: "Retrouve-m'en une — état correct, hein. Tu la verras sûrement dans un vide-grenier." },
    ],
    payload: {
      titre: "La lampe de mon atelier",
      corps: ["Retrouver une lampe à pétrole en bon état pour le grand-père."], // SP3 : texte provisoire
      cibles: [{ templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }],
      objectifs: [{ type: "objet", templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }],
      recompense: { argent: 60 },
    },
  },
  {
    id: "trame_ch2",
    ordre: 2,
    acte: 1,
    condition: { type: "depart" },
    // SP3 : texte provisoire
    dialogue: [
      { humeur: "emu", texte: "Ma toute première vente, je l'ai ratée. Le client est parti en riant." },
      { humeur: "souriant", texte: "Toi, tu feras mieux. Montre-moi : 300 € de ventes, et on en reparle." },
    ],
    payload: {
      titre: "Vendre, c'est vivre",
      corps: ["Cumuler 300 € de ventes depuis l'acceptation."], // SP3 : texte provisoire
      cibles: [],
      objectifs: [{ type: "ventesCumulees", montant: 300 }],
      recompense: { argent: 80 },
    },
  },
  {
    id: "trame_ch3",
    ordre: 3,
    acte: 1,
    condition: { type: "depart" },
    // SP3 : texte provisoire
    dialogue: [
      { humeur: "songeur", texte: "Mes mains tremblent trop pour l'établi, maintenant. Prends mes outils." },
      { humeur: "souriant", texte: "Restaure-moi un objet — qu'il ressorte Très bon. Tu verras, ça rend fier." },
    ],
    payload: {
      titre: "Les mains d'or",
      corps: ["Restaurer un objet jusqu'à l'état Très bon."], // SP3 : texte provisoire
      cibles: [],
      objectifs: [{ type: "restauration", etatMin: "Très bon" }],
      recompense: { argent: 100 },
    },
  },
  {
    id: "trame_ch4",
    ordre: 4,
    acte: 1,
    condition: { type: "depart" },
    invitationTier: 2,
    // SP3 : texte provisoire
    dialogue: [
      { humeur: "emu", texte: "Ta grand-mère avait un pichet en faïence, bleu, ébréché au bec. Je l'ai vendu un jour de dèche… je le regrette encore." },
      { humeur: "songeur", texte: "Elle disait qu'un jour je lui offrirais les bijoux d'une reine. Retrouve-moi d'abord ce pichet, tu veux ?" },
    ],
    payload: {
      titre: "Le pichet de ta grand-mère",
      corps: ["Retrouver un pichet en faïence émaillée."], // SP3 : texte provisoire
      cibles: [{ templateId: "ma.pichet_faience_emaillee" }],
      objectifs: [{ type: "objet", templateId: "ma.pichet_faience_emaillee" }],
      recompense: { argent: 120 },
    },
  },
  // … ch5 à ch12 sur le même patron, valeurs ci-dessous.
];

export function chapitreParOrdre(ordre: number): ChapitrePrincipal | undefined {
  return QUETES_PRINCIPALES.find((c) => c.ordre === ordre);
}

export function chapitreParId(id: string): ChapitrePrincipal | undefined {
  return QUETES_PRINCIPALES.find((c) => c.id === id);
}
```

Chapitres 5–12 (tous `condition: { type: "depart" }`, textes provisoires `// SP3` à rédiger dans le même ton) :

| ordre | acte | titre | objectifs | recompense | divers |
|---|---|---|---|---|---|
| 5 | 2 | Un nom qui circule | `[{ type: "niveau", niveau: 8 }]` (provisoire SP3) | 150 | |
| 6 | 2 | Le flair | `[{ type: "profitVente", montant: 100 }]` | 170 | |
| 7 | 2 | Pièce de maître | `[{ type: "restauration", etatMin: "Pristin état" }]` | 190 | |
| 8 | 2 | Le beau monde | `[{ type: "objet", templateId: "art.gravure_jouy_paris", etatMin: "Très bon" }]` + cibles miroir | 220 | `invitationTier: 3` |
| 9 | 3 | Une vitrine digne de ce nom | `[{ type: "valeurCollection", montant: 5000 }]` | 260 | |
| 10 | 3 | L'invitation | `[]` (narratif) | 150 | `invitationTier: 4` |
| 11 | 3 | Les bijoux de la reine | `[{ type: "objet", templateId: "uniq.mo.bijou_marie_antoinette" }]` + cibles miroir | 500 | `conserverCibles: true` |
| 12 | 3 | La remise des clés | `[]` (narratif) | 500 | |

- [ ] **Step 4: Vérifier** — `npx vitest run src/data/quetesPrincipales.test.ts` PASS. ⚠ `src/lib/quetes/principales.ts` et ses tests vont casser (`payload.jourLimiteOffset` absent, ids changés) : si `tsc` casse ici, adapter uniquement les usages triviaux (retirer `jourLimiteOffset` du spread dans `enCourrier`) — la refonte complète de `principales.ts` arrive en Task 7 ; marquer ses tests cassés `describe.skip` avec le commentaire `// SP2 Task 7 : refonte délivrance` si nécessaire pour garder la suite verte.
- [ ] **Step 5: Commit** — `feat(trame): squelette 12 chapitres trame_ch1..12 (textes provisoires SP3)`

---

### Task 5: Condition de déblocage `chapitrePrincipal`

**Files:**
- Modify: `src/types/game.ts` (union `ConditionDeblocage`, ~l.459)
- Modify: `src/lib/deblocage.ts` (`evaluerCondition`, `descriptionCondition`, `descriptionConditionCourte`)
- Modify: `src/lib/i18n/ui/fr.ts`, `src/lib/i18n/ui/en.ts`, `src/lib/i18n/ui/es.ts` (blocs `deblocage.long` / `deblocage.court`)
- Test: `src/lib/deblocage.test.ts`

**Interfaces:**
- Produces: variante `{ type: "chapitrePrincipal"; ordre: number }` ; `evaluerCondition`/`descriptionConditionCourte` acceptent un state incluant `missions` (étendre les `Pick<GameState, …>` avec `"missions"`).
- Consumes: `chapitreParOrdre` (Task 4).

- [ ] **Step 1: Tests qui échouent** (dans `src/lib/deblocage.test.ts`)

```ts
it("chapitrePrincipal : vrai si la mission du chapitre trame_chN est livrée", () => {
  const state = createMockGameState({
    missions: [{ courrierId: "trame_ch4", statut: "livree", jourResolution: 3 }],
  });
  expect(evaluerCondition({ type: "chapitrePrincipal", ordre: 4 }, state)).toBe(true);
  expect(evaluerCondition({ type: "chapitrePrincipal", ordre: 8 }, state)).toBe(false);
});
```

- [ ] **Step 2: Implémenter**
  - types/game.ts : ajouter `| { type: "chapitrePrincipal"; ordre: number }` à `ConditionDeblocage`.
  - deblocage.ts : étendre les 3 `Pick<GameState, …>` avec `"missions"` et ajouter :

```ts
import { chapitreParOrdre } from "@/data/quetesPrincipales";

// dans evaluerCondition :
case "chapitrePrincipal": {
  const ch = chapitreParOrdre(c.ordre);
  return !!ch && state.missions.some((m) => m.courrierId === ch.id && m.statut === "livree");
}

// dans descriptionCondition :
case "chapitrePrincipal":
  return tr(L.chapitrePrincipal, { ordre: c.ordre });

// dans descriptionConditionCourte (actuel = dernier chapitre trame livré) :
case "chapitrePrincipal": {
  const livres = state.missions.filter(
    (m) => m.statut === "livree" && m.courrierId.startsWith("trame_ch"),
  ).length;
  return tr(C.chapitrePrincipal, { actuel: livres, ordre: c.ordre });
}
```

  - Dictionnaires UI (mêmes clés dans les 3 langues) :
    - fr `long.chapitrePrincipal: "Chapitre {ordre} de l'histoire terminé"`, `court.chapitrePrincipal: "Histoire : {actuel}/{ordre}"`
    - en `"Story chapter {ordre} completed"`, `"Story: {actuel}/{ordre}"`
    - es `"Capítulo {ordre} de la historia terminado"`, `"Historia: {actuel}/{ordre}"`
  - Réparer les appels existants qui passent un state partiel sans `missions` (grep `evaluerCondition(` et `descriptionConditionCourte(` — BrocantePanorama et principales passent des states complets ; les tests unitaires devront ajouter `missions: []`).

- [ ] **Step 3: Vérifier** — `npx vitest run src/lib/deblocage.test.ts` PASS + `npx tsc --noEmit`.
- [ ] **Step 4: Commit** — `feat(deblocage): condition chapitrePrincipal (histoire → tiers)`

---

### Task 6: Brocantes — l'histoire remplace le niveau

**Files:**
- Modify: `src/data/brocantes.ts`
- Test: `src/data/brocantes.test.ts` (créer ou compléter)

**Interfaces:**
- Consumes: variante `chapitrePrincipal` (Task 5).
- Produces: plus AUCUNE condition `{ type: "niveau" }` dans les brocantes ; constantes `NIVEAU_BROCANTES_T2/T3/T4` conservées UNIQUEMENT pour la migration v13 (Task 11) — déplacer leur export avec le commentaire `/** Legacy : seuils v12, utilisés par la migration de saves uniquement. */`.

- [ ] **Step 1: Tests qui échouent**

```ts
import { BROCANTES } from "./brocantes";
import type { ConditionDeblocage } from "@/types/game";

function atomes(c: ConditionDeblocage): ConditionDeblocage[] {
  return c.type === "ET" ? c.conditions.flatMap(atomes) : [c];
}

describe("gates des brocantes (SP2)", () => {
  it("aucune brocante n'est gatée par le niveau", () => {
    for (const b of BROCANTES) {
      expect(atomes(b.conditionDeblocage).some((a) => a.type === "niveau")).toBe(false);
    }
  });
  it("chaque brocante de tier N>1 exige le chapitre d'invitation du tier", () => {
    const ordreParTier = { 2: 4, 3: 8, 4: 10 } as const;
    for (const b of BROCANTES.filter((b) => b.tier > 1)) {
      const chap = atomes(b.conditionDeblocage).find((a) => a.type === "chapitrePrincipal");
      expect(chap, b.id).toBeDefined();
      expect((chap as { ordre: number }).ordre).toBe(ordreParTier[b.tier as 2 | 3 | 4]);
    }
  });
});
```

- [ ] **Step 2: Implémenter** — dans chaque `conditionDeblocage` contenant `{ type: "niveau", niveau: NIVEAU_BROCANTES_T2 }` remplacer par `{ type: "chapitrePrincipal", ordre: 4 }` (T3 → `ordre: 8`, T4 → `ordre: 10`). Les autres conditions économiques (valeurCollection, brocantesDebloquees…) restent inchangées.
- [ ] **Step 3: Vérifier** — `npx vitest run src/data src/lib/deblocage.test.ts` PASS + tsc. Les tests existants qui référencent les gates de niveau des brocantes doivent être adaptés (grep `NIVEAU_BROCANTES` dans les tests).
- [ ] **Step 4: Commit** — `feat(brocantes): tiers débloqués par les chapitres, plus par le niveau`

---

### Task 7: Délivrance en dialogue — `chapitrePret` / `accepterChapitre`

**Files:**
- Rewrite: `src/lib/quetes/principales.ts`
- Modify: `src/lib/quetes/tick.ts`, `src/lib/tutoriel.ts` (retrait de l'injection auto)
- Test: `src/lib/quetes/principales.test.ts` (réécrire), `src/lib/tutoriel.test.ts` (adapter)

**Interfaces:**
- Produces (consommés par Tasks 8, 9) :
  - `chapitrePret(state: GameState): ChapitrePrincipal | null` — prochain chapitre non injecté dont le précédent est livré et la condition remplie ; `null` pendant le tutoriel.
  - `accepterChapitre(state: GameState, chapitreId: string, timestamp: number): GameState` — pur : crée le courrier (lu:true) + la mission active (`timestampAcceptation`) ; si `objectifs` vide (narratif) : livre immédiatement (statut livree, ledger `mission_recompense`, XP `XP_QUETE_PRINCIPALE` + `POINTS_BONUS_CHAPITRE`) et injecte l'éventuelle lettre d'invitation (branchée en Task 8 via `creerLettreInvitation`).
- Consumes: `QUETES_PRINCIPALES`, `chapitreParId` (Task 4), `evaluerCondition` (Task 5), `creerCourrierMission` (`@/lib/courrier`), `appendLedger` (`@/lib/grandLivre`), `appliquerGainXPBrocanteur`, `XP_QUETE_PRINCIPALE`, `POINTS_BONUS_CHAPITRE` (`@/lib/xp`), `calculerBrocantesDebloqueesParTier` (`@/lib/deblocage`).

- [ ] **Step 1: Tests qui échouent** (`src/lib/quetes/principales.test.ts`, réécrit)

```ts
describe("chapitrePret", () => {
  it("null pendant le tutoriel", () => {
    const state = createMockGameState({ tutorielEtape: "accueil" });
    expect(chapitrePret(state)).toBeNull();
  });
  it("propose trame_ch1 au départ, puis rien tant que ch1 n'est pas livré", () => {
    const state = createMockGameState({ tutorielEtape: "termine" });
    expect(chapitrePret(state)?.id).toBe("trame_ch1");
    const avecCh1 = accepterChapitre(state, "trame_ch1", 1000);
    expect(chapitrePret(avecCh1)).toBeNull(); // ch1 actif non livré
  });
  it("propose le chapitre suivant quand le précédent est livré", () => {
    const state = createMockGameState({
      tutorielEtape: "termine",
      courriers: [/* courrier trame_ch1 minimal, cf. fixture */],
      missions: [{ courrierId: "trame_ch1", statut: "livree", jourResolution: 2 }],
    });
    expect(chapitrePret(state)?.id).toBe("trame_ch2");
  });
});

describe("accepterChapitre", () => {
  it("crée courrier lu + mission active avec timestampAcceptation", () => {
    const state = createMockGameState({ tutorielEtape: "termine" });
    const next = accepterChapitre(state, "trame_ch1", 1234);
    const courrier = next.courriers.find((c) => c.id === "trame_ch1");
    expect(courrier?.lu).toBe(true);
    expect(next.missions.find((m) => m.courrierId === "trame_ch1")).toMatchObject({
      statut: "active", timestampAcceptation: 1234,
    });
  });
  it("idempotent : ré-accepter un chapitre présent ne change rien", () => {
    const state = accepterChapitre(createMockGameState({ tutorielEtape: "termine" }), "trame_ch1", 1);
    expect(accepterChapitre(state, "trame_ch1", 2)).toBe(state);
  });
  it("chapitre narratif : livré immédiatement, récompense créditée", () => {
    // amener le state jusqu'à ch10 : missions trame_ch1..ch9 livrées (fixture en boucle)
    const state = createMockGameState({ tutorielEtape: "termine", missions: ch1a9Livres, courriers: courriersCh1a9 });
    const next = accepterChapitre(state, "trame_ch10", 99);
    expect(next.missions.find((m) => m.courrierId === "trame_ch10")?.statut).toBe("livree");
    expect(next.budget).toBe(state.budget + 150);
  });
});
```

- [ ] **Step 2: Implémenter `principales.ts`** (remplace `debloquerQuetesPrincipales`/`enCourrier`)

```ts
import { creerCourrierMission } from "@/lib/courrier";
import { appendLedger } from "@/lib/grandLivre";
import { appliquerGainXPBrocanteur, POINTS_BONUS_CHAPITRE, XP_QUETE_PRINCIPALE } from "@/lib/xp";
import { calculerBrocantesDebloqueesParTier, evaluerCondition } from "@/lib/deblocage";
import { QUETES_PRINCIPALES, chapitreParId, type ChapitrePrincipal } from "@/data/quetesPrincipales";
import type { Courrier, GameState } from "@/types/game";

/** Prochain chapitre délivrable par le grand-père (pastille « ! »), ou null. */
export function chapitrePret(state: GameState): ChapitrePrincipal | null {
  if (state.tutorielEtape !== "termine") return null;
  const presents = new Set(state.courriers.map((c) => c.id));
  const livres = new Set(
    state.missions.filter((m) => m.statut === "livree").map((m) => m.courrierId),
  );
  const parTier = calculerBrocantesDebloqueesParTier(state);
  for (const ch of [...QUETES_PRINCIPALES].sort((a, b) => a.ordre - b.ordre)) {
    if (presents.has(ch.id)) continue;
    const precedent = QUETES_PRINCIPALES.find((c) => c.ordre === ch.ordre - 1);
    if (precedent && !livres.has(precedent.id)) return null;
    return evaluerCondition(ch.condition, state, parTier) ? ch : null;
  }
  return null;
}

function courrierDeChapitre(ch: ChapitrePrincipal, jour: number): Courrier {
  return {
    ...creerCourrierMission({
      id: ch.id,
      jour,
      expediteurId: "grand-pere",
      titre: ch.payload.titre,
      corps: ch.payload.corps,
      categorie: "principale",
      cibles: ch.payload.cibles,
      recompense: ch.payload.recompense,
      ...(ch.payload.conserverCibles ? { conserverCibles: true } : {}),
    }),
    lu: true,
  };
}

/**
 * Accepte un chapitre (fin du dialogue avec le grand-père) : courrier (lu) +
 * mission active. Chapitre narratif (objectifs vides) : livré immédiatement
 * (récompense, XP, points bonus, lettre d'invitation éventuelle).
 * Pur et idempotent.
 */
export function accepterChapitre(
  state: GameState,
  chapitreId: string,
  timestamp: number,
): GameState {
  const ch = chapitreParId(chapitreId);
  if (!ch || state.courriers.some((c) => c.id === ch.id)) return state;
  const courrier: Courrier = {
    ...courrierDeChapitre(ch, state.jourActuel),
    payload: {
      ...(courrierDeChapitre(ch, state.jourActuel).payload as object),
      objectifs: ch.payload.objectifs,
    } as Courrier["payload"],
  };
  const narratif = ch.payload.objectifs.length === 0;
  let next: GameState = {
    ...state,
    courriers: [...state.courriers, courrier],
    missions: [
      ...state.missions,
      {
        courrierId: ch.id,
        statut: narratif ? ("livree" as const) : ("active" as const),
        timestampAcceptation: timestamp,
        ...(narratif ? { jourResolution: state.jourActuel } : {}),
      },
    ],
  };
  if (narratif) {
    next = appendLedger(next, {
      jour: next.jourActuel,
      kind: "mission_recompense",
      designation: `Mission · ${ch.payload.titre}`,
      recette: ch.payload.recompense.argent,
      depense: 0,
      courrierId: ch.id,
      params: { courrierId: ch.id, templateIds: [] },
    });
    const avecXP = appliquerGainXPBrocanteur(next.brocanteur, XP_QUETE_PRINCIPALE);
    next = {
      ...next,
      brocanteur: { ...avecXP, pointsDisponibles: avecXP.pointsDisponibles + POINTS_BONUS_CHAPITRE },
    };
    // Lettre d'invitation branchée en Task 8 (creerLettreInvitation).
  }
  return next;
}
```

Nettoyage simplifier `courrierDeChapitre` pour ne le construire qu'une fois (le double appel ci-dessus est illustratif — factoriser en variable). Vérifier la forme exacte de `appendLedger` (elle retourne le state complété) et le type de retour de `creerCourrierMission` avant d'écrire le spread du payload : si `creerCourrierMission` accepte déjà un champ additionnel, préférer lui passer `objectifs` directement en l'ajoutant à ses `args` (choix d'implémentation ; le contrat = le courrier créé porte `payload.objectifs`).

- [ ] **Step 3: Retirer l'injection auto** —
  - `src/lib/quetes/tick.ts` : `tickQuetes` ne débloque plus les principales (le corps devient un passthrough `{ courriers: state.courriers, missions: state.missions }` avec jsdoc « chapitres délivrés en dialogue depuis SP2 ») — garder la fonction (appelée par GameContext au passage de jour ; elle reste le point d'accroche des ticks futurs).
  - `src/lib/tutoriel.ts` (`appliquerFinTutoriel`) : le `tickQuetes` final devient inutile mais inoffensif — le retirer et retourner `base` directement, en gardant la lettre de Maman. Adapter `tutoriel.test.ts` (le test qui vérifiait l'injection du chapitre 1 à la fin du tutoriel devient : `chapitrePret(finTuto)?.id === "trame_ch1"`).
- [ ] **Step 4: Vérifier** — `npx vitest run src/lib/quetes src/lib/tutoriel.test.ts` PASS + tsc ; réactiver les éventuels `describe.skip` posés en Task 4.
- [ ] **Step 5: Commit** — `feat(trame): délivrance des chapitres en dialogue (chapitrePret/accepterChapitre), fin de l'injection au tick`

---

### Task 8: Lettres d'invitation des Organisateurs

**Files:**
- Modify: `src/data/expediteursCourrier.ts` (ajouter `organisateurs` ; corriger `grand-pere.personnalite` : « Antiquaire disparu » → « Antiquaire retraité »)
- Modify: `src/lib/i18n/contenu/en/personnages.ts`, `src/lib/i18n/contenu/es/personnages.ts` (overlays du nouvel expéditeur + personnalité corrigée)
- Create: `src/data/invitationsOrganisateurs.ts`
- Modify: `src/lib/courrier.ts` (ajouter `creerLettreInvitation`)
- Modify: `src/lib/quetes/principales.ts` (`accepterChapitre` narratif → injecte l'invitation), `src/context/GameContext.tsx` (`livrerMission` → injecte l'invitation si le chapitre livré a `invitationTier`)
- Test: `src/lib/courrier.test.ts`, `src/lib/quetes/principales.test.ts`

**Interfaces:**
- Produces: `creerLettreInvitation(tier: 2 | 3 | 4, jour: number): Courrier` (id stable `invitation_tier{N}`, type lettre, expediteur `organisateurs`, `lu: false`).
- Consumes: `chapitreParId` (Task 4). Modèle : `creerLettreMamanDebut` (`src/lib/courrier.ts:14`) pour la forme du payload lettre.

- [ ] **Step 1: Tests qui échouent**

```ts
// courrier.test.ts
it("creerLettreInvitation : lettre non lue des organisateurs, id stable", () => {
  const c = creerLettreInvitation(2, 5);
  expect(c.id).toBe("invitation_tier2");
  expect(c.lu).toBe(false);
  expect(c.jourRecu).toBe(5);
  // adapter au shape réel du payload lettre (cf. creerLettreMamanDebut)
});

// principales.test.ts
it("livraison narrative de trame_ch10 : injecte l'invitation tier 4", () => {
  const state = createMockGameState({ tutorielEtape: "termine", missions: ch1a9Livres, courriers: courriersCh1a9 });
  const next = accepterChapitre(state, "trame_ch10", 99);
  expect(next.courriers.some((c) => c.id === "invitation_tier4")).toBe(true);
});
```

- [ ] **Step 2: Implémenter**
  - `expediteursCourrier.ts` :

```ts
  organisateurs: {
    id: "organisateurs",
    nom: "Les Organisateurs",
    personnalite: "Comité des brocantes",
    relation: "Organisateurs",
    signature: "Au plaisir de vous y croiser,\nLes Organisateurs",
  },
```

  (pas d'avatar : `CommandeRow`/`CourrierSheet` retombent sur l'initiale — vérifier que le champ est bien optionnel, sinon pointer vers un webp existant neutre.) Overlays EN/ES dans `personnages.ts` (mêmes clés que les autres expéditeurs du fichier).
  - `src/data/invitationsOrganisateurs.ts` :

```ts
/** Lettres d'invitation de fin d'acte. Purement narratives (le déblocage réel
 *  est la condition chapitrePrincipal). SP3 : textes provisoires. */
export const INVITATIONS_ORGANISATEURS: Record<2 | 3 | 4, { titre: string; corps: string[] }> = {
  2: {
    titre: "Invitation — les marchés de la ville", // SP3 : texte provisoire
    corps: [
      "Votre étal fait parler de lui.",
      "Les marchés ★★ de la ville vous ouvrent leurs portes. Présentez cette lettre à l'entrée.",
    ],
  },
  3: {
    titre: "Invitation — les salons", // SP3 : texte provisoire
    corps: ["Votre réputation vous précède.", "Les salons ★★★ seront honorés de votre visite."],
  },
  4: {
    titre: "Invitation — le Grand Salon des Antiquaires", // SP3 : texte provisoire
    corps: ["Le Grand Salon des Antiquaires vous convie à sa prochaine édition.", "Peu y entrent. Encore moins y reviennent."],
  },
};
```

  - `courrier.ts` : `creerLettreInvitation(tier, jour)` sur le modèle de `creerLettreMamanDebut` (id `invitation_tier${tier}`, expediteur `organisateurs`, titre/corps depuis `INVITATIONS_ORGANISATEURS[tier]`, sans récompense, `lu: false`). Idempotence assurée par les appelants (ne pas ré-injecter si `courriers.some(c => c.id === …)`).
  - `principales.ts` (`accepterChapitre`, branche narrative) et `GameContext.livrerMission` (après `missionsMaj`, si `chapitreParId(courrierId)?.invitationTier` et lettre absente) : append de la lettre.
- [ ] **Step 3: Vérifier** — `npx vitest run src/lib/courrier.test.ts src/lib/quetes` PASS + tsc.
- [ ] **Step 4: Commit** — `feat(trame): lettres d'invitation des Organisateurs à la fin des actes`

---

### Task 9: GameContext + pastille QG + dialogue de chapitre

**Files:**
- Modify: `src/context/GameContext.tsx` (action `accepterChapitrePrincipal`)
- Modify: `src/app/(qg)/layout.tsx` (pastille pilotée par `chapitrePret`, dialogue de chapitre)
- Test: `src/context/GameContext.test.tsx` (ou suite équivalente existante — repérer avec `grep -rn "livrerMission" src/context/*.test*`)

**Interfaces:**
- Produces: `accepterChapitrePrincipal(chapitreId: string): void` exposée par le contexte (même bloc que `livrerMission`).
- Consumes: `chapitrePret`, `accepterChapitre` (Task 7), `GrandPereBadge` (existant, prop `visible`/`onTap`), `DialogueOverlay` (existant), `tempsConfiance()` (pattern existant du contexte).

- [ ] **Step 1: Test qui échoue** (suivre le patron des tests d'actions existants du contexte)

```ts
it("accepterChapitrePrincipal crée la mission active du chapitre", () => {
  // state initial : tutorielEtape "termine" ; appeler accepterChapitrePrincipal("trame_ch1")
  // attendre missions => contient { courrierId: "trame_ch1", statut: "active" }
});
```

- [ ] **Step 2: Implémenter l'action** (GameContext, à côté de `livrerMission`)

```ts
const accepterChapitrePrincipal = useCallback(
  (chapitreId: string): void => {
    const now = tempsConfiance() ?? Date.now();
    setState((prev) => (prev ? accepterChapitre(prev, chapitreId, now) : prev));
  },
  [tempsConfiance],
);
```

(+ export dans le value/memo du contexte et dans le type des actions.)

- [ ] **Step 3: Câbler la pastille** dans `src/app/(qg)/layout.tsx` :

```tsx
const chPret = state ? chapitrePret(state) : null;
const [dialogueChapitreId, setDialogueChapitreId] = useState<string | null>(null);

{/* remplace le placeholder visible={false} */}
<GrandPereBadge
  visible={!!chPret && !dialogueQg}
  onTap={() => {
    if (!chPret) return;
    playClick();
    setDialogueChapitreId(chPret.id);
    setDialogueQg({ id: `dlg_${chPret.id}`, lignes: chPret.dialogue });
  }}
/>
```

et dans `DialogueOverlay.onFini`, AVANT les branches tutoriel :

```tsx
if (dialogueChapitreId) {
  accepterChapitrePrincipal(dialogueChapitreId);
  setDialogueChapitreId(null);
}
```

(imports : `chapitrePret` depuis `@/lib/quetes/principales` ; `accepterChapitrePrincipal` depuis `useGameActions()` — vérifier le hook réellement utilisé dans ce layout.)

- [ ] **Step 4: Vérifier** — suite contexte + `npx tsc --noEmit` + `npx eslint` sur les fichiers touchés.
- [ ] **Step 5: Commit** — `feat(qg): pastille grand-père → dialogue de chapitre → acceptation de mission`

---

### Task 10: Carnet — progression des objectifs

**Files:**
- Modify: `src/components/mobile/qg/overlays/CommandeRow.tsx`
- Modify: `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts` (bloc `carnet`)
- Test: `src/components/mobile/qg/overlays/CommandeRow.test.tsx`

**Interfaces:**
- Consumes: `objectifsDeMission`, `progressionObjectif`, `missionLivrable` (Tasks 1/3) ; `state.missions` (la row reçoit déjà `state`).
- Produces: rendu carnet — le badge « Prêt » et le bouton Livrer utilisent `missionLivrable` ; chaque objectif non-objet affiche une ligne de progression.

- [ ] **Step 1: Test qui échoue**

```tsx
it("affiche la progression d'un objectif ventesCumulees et gate le bouton Livrer", () => {
  // courrier mission avec objectifs: [{ type: "ventesCumulees", montant: 300 }],
  // state sans ventes → attend le texte "0/300" à l'écran et PAS le badge "Prêt".
});
```

- [ ] **Step 2: Implémenter** — dans `CommandeRow` :
  - récupérer `const reso = state.missions.find((m) => m.courrierId === courrier.id)`;
  - `const livrable = reso ? missionLivrable(p, reso, state, courrier.jourRecu) : false;` remplace `prog.livrable` pour le badge « Prêt » et l'activation d'`onLivrer` (les cibles objets gardent leur rendu existant) ;
  - sous le rendu des cibles (bloc `ouvert`), pour chaque objectif non-objet :

```tsx
{objectifsDeMission(p).filter((o) => o.type !== "objet").map((o, i) => {
  const prog = progressionObjectif(o, state, reso ?? { courrierId: courrier.id, statut: "active" }, courrier.jourRecu);
  return (
    <div key={i} style={ligneObjectif}>
      <span>{libelleObjectif(o, d, tr)}</span>
      <span style={{ fontWeight: 700, color: prog.atteint ? "#2c5e3f" : "#7a6a44" }}>
        {prog.actuel}/{prog.cible}{o.type !== "niveau" && o.type !== "restauration" ? " €" : ""}
      </span>
    </div>
  );
})}
```

  avec un helper local `libelleObjectif` mappé sur les clés UI :
  - fr : `carnet.objectifs: { ventesCumulees: "Ventes cumulées", profitVente: "Meilleur profit sur une vente", restauration: "Restaurer un objet ({etat} min.)", valeurCollection: "Valeur de la collection", niveau: "Niveau de brocanteur" }`
  - en : `{ ventesCumulees: "Total sales", profitVente: "Best profit on one sale", restauration: "Restore an item ({etat} min.)", valeurCollection: "Collection value", niveau: "Broker level" }`
  - es : `{ ventesCumulees: "Ventas acumuladas", profitVente: "Mejor beneficio en una venta", restauracion — garder la clé `restauration` : "Restaurar un objeto ({etat} mín.)", valeurCollection: "Valor de la colección", niveau: "Nivel de chamarilero" }`
  - `{etat}` : passer `libelleEtat(o.etatMin, d)` (déjà importé dans la row).
- [ ] **Step 3: Vérifier** — `npx vitest run src/components/mobile/qg/overlays` PASS + tsc + eslint.
- [ ] **Step 4: Commit** — `feat(carnet): progression des objectifs de chapitre (x/y) + livrabilité agrégée`

---

### Task 11: Migration v13 — ne jamais re-verrouiller un tier

**Files:**
- Modify: `src/lib/migrations.ts` (SAVE_VERSION 13 + étape de migration)
- Test: `src/lib/migrations.test.ts`

**Interfaces:**
- Consumes: `QUETES_PRINCIPALES`, `chapitreParOrdre` (Task 4), `NIVEAU_BROCANTES_T2/T3/T4` (legacy, Task 6), `accepterChapitre` N'EST PAS utilisé (les chapitres migrés sont injectés livrés SANS récompense rétroactive — pas de ledger).
- Produces: saves ≤ v12 migrées : pour chaque tier déjà atteint sous les anciennes règles, les chapitres `trame_ch1..K` sont présents (courrier `lu: true`) et `livree` (`jourResolution = jourActuel`). Anciennes missions/courriers `principale_*` conservés tels quels (archive ; une ancienne mission active reste livrable, sans effet sur la trame).

- [ ] **Step 1: Tests qui échouent** (`src/lib/migrations.test.ts`, suivre le patron des tests v12)

```ts
it("v12→v13 : niveau ≥ T3 ⇒ trame_ch1..8 livrés (tier 3 reste ouvert)", () => {
  const save = saveV12({ brocanteur: { ...br, niveau: 12 } }); // ≥ NIVEAU_BROCANTES_T3 (10)
  const migre = migrate(save);
  for (let n = 1; n <= 8; n++) {
    expect(migre.missions.find((m) => m.courrierId === `trame_ch${n}`)?.statut).toBe("livree");
    expect(migre.courriers.some((c) => c.id === `trame_ch${n}`)).toBe(true);
  }
  expect(migre.missions.some((m) => m.courrierId === "trame_ch9")).toBe(false);
});

it("v12→v13 : ancien principale_ch5 livré ⇒ trame_ch1..11 livrés", () => {
  const save = saveV12({
    missions: [{ courrierId: "principale_ch5", statut: "livree", jourResolution: 9 }],
  });
  const migre = migrate(save);
  expect(migre.missions.find((m) => m.courrierId === "trame_ch11")?.statut).toBe("livree");
});

it("v12→v13 : partie fraîche (niveau 1, rien de livré) ⇒ aucun chapitre trame injecté", () => {
  const migre = migrate(saveV12({}));
  expect(migre.missions.some((m) => m.courrierId.startsWith("trame_ch"))).toBe(false);
});
```

- [ ] **Step 2: Implémenter** — `SAVE_VERSION = 13` ; étape v13 :

```ts
// v13 : trame 12 chapitres. Mapping "jamais re-verrouiller" :
//  - niveau (anciens seuils) : ≥T2 ⇒ ch4, ≥T3 ⇒ ch8, ≥T4 ⇒ ch10
//  - anciens chapitres livrés : ch2⇒4, ch3⇒8, ch4⇒10, ch5⇒11 (ch1⇒1)
const anciens: Record<string, number> = {
  principale_ch1: 1, principale_ch2: 4, principale_ch3: 8,
  principale_ch4: 10, principale_ch5: 11,
};
let maxOrdre = 0;
const niveau = save.brocanteur?.niveau ?? 0;
if (niveau >= NIVEAU_BROCANTES_T2) maxOrdre = 4;
if (niveau >= NIVEAU_BROCANTES_T3) maxOrdre = 8;
if (niveau >= NIVEAU_BROCANTES_T4) maxOrdre = 10;
for (const m of save.missions ?? []) {
  if (m.statut === "livree" && anciens[m.courrierId]) {
    maxOrdre = Math.max(maxOrdre, anciens[m.courrierId]);
  }
}
// injecter trame_ch1..maxOrdre : courrier lu + mission livree, sans récompense.
```

(construction du courrier via le même helper que `accepterChapitre` — exporter `courrierDeChapitre` depuis `principales.ts` ou dupliquer localement la construction minimale ; `jourRecu = save.jourActuel`, `jourResolution = save.jourActuel`.) Idempotent : ne pas injecter un `trame_chN` déjà présent.

- [ ] **Step 3: Vérifier** — `npx vitest run src/lib/migrations.test.ts` PASS + tsc.
- [ ] **Step 4: Commit** — `feat(migrations): v13 — mapping ancien arc/niveau vers la trame (tiers préservés)`

---

### Task 12: Passe finale de branche

**Files:** aucun nouveau — vérification et filets.

- [ ] **Step 1:** `npx tsc --noEmit` ; `npx eslint src` ; `npx vitest run` — tout vert, AUCUN `describe.skip` restant des tasks intermédiaires.
- [ ] **Step 2:** Vérification manuelle en dev (`npm run dev`, nouvelle partie) :
  - finir/passer le tutoriel → pastille « ! » au QG → dialogue ch1 → mission au carnet avec cible lampe ;
  - carnet : chapitre 2 (après livraison ch1) affiche « Ventes cumulées 0/300 € » ;
  - brocantes tier 2 verrouillées avec la condition « Histoire : 0/4 » à l'écran de choix.
- [ ] **Step 3:** Revue finale de branche (skill `superpowers:requesting-code-review` / `/code-review`) puis commit de clôture éventuel.
- [ ] **Step 4:** Mettre à jour la mémoire projet (trame-scenaristique.md : SP2 fait, reste SP3).

---

## Self-review (fait à l'écriture)

- **Couverture spec** : §d ObjectifMission 6 variantes → Task 1 ; progression carnet → Task 10 ; §e condition `chapitrePrincipal` → Task 5 ; retrait gates niveau → Task 6 ; lettres d'invitation Organisateurs → Task 8 ; délivrance en dialogue + badge → Tasks 7/9 ; §f migration « jamais re-verrouiller » → Task 11 ; trouvabilité tier (spec §trame) → test Task 4. **Écart assumé** (à valider par Guillaume) : le squelette 12 chapitres + la migration arrivent dès SP2 (la spec les rangeait en SP3) — indispensable pour que les gates par chapitres 4/8/10 soient jouables ; SP3 reste l'écriture (textes définitifs, épilogue cartes postales, i18n contenu EN/ES).
- **Types cohérents** : `ObjectifMission`/`ProgressionObjectif`/`missionLivrable(payload, reso, state, jourRecu)` identiques entre Tasks 1/3/10 ; `chapitrePret`/`accepterChapitre(state, id, timestamp)` identiques entre 7/9 ; ids `trame_chN` partout ; `invitation_tier{N}` entre 8/11.
- **Placeholders** : les textes narratifs sont volontairement provisoires et MARQUÉS `// SP3 : texte provisoire` (exigence de la spec, pas un trou du plan) ; les fixtures de test à adapter pointent la commande grep pour les localiser.
