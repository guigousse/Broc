# SP1 — Système de dialogue, grand-père au QG, tutoriel guidé

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le grand-père accueille le joueur, le guide en dialogues à travers sa première boucle complète (chiner → acheter → rentrer → étaler → vendre), puis lui remet le carnet, le chapitre 1 et la lettre de Maman — et reste ensuite tapable au QG pour des phrases d'ambiance.

**Architecture:** Un composant `DialogueOverlay` générique (portal plein écran, portrait + texte, tap pour avancer) alimenté par des séquences FR dans `src/data/dialogues.ts` avec overlays i18n EN/ES. Un état `tutorielEtape` persisté dans la save pilote une machine à étapes linéaire ; chaque écran (QG, chinage, vente) déclenche ses dialogues et fait avancer l'étape. Le guidage est « ferme » : TabBar masquée, objets QG hors parcours inertes, liste de brocantes réduite au Vide-grenier du quartier, cibles en surbrillance pulsée.

**Tech Stack:** Next.js (App Router) + React 19, TypeScript, Vitest + Testing Library, CSS inline + globals.css. Pas de nouvelle dépendance.

**Spec :** `docs/superpowers/specs/2026-07-16-trame-scenaristique-design.md` (§ Architecture a, b, c).

## Global Constraints

- Le FR est la langue source : contenu FR dans `src/data/`, overlays EN/ES dans `src/lib/i18n/contenu/{en,es}/`, résolus à l'affichage.
- **Jamais de chaîne localisée en save** : on ne persiste que des ids (`tutorielEtape`, ids de séquences).
- `npm run lint` est cassé (Next 16) : utiliser `npx eslint src` (seule règle active : `react-hooks/rules-of-hooks`).
- Tests : `npm run test:run` (tout) ou `npx vitest run <fichier>` (ciblé). Fixture : `createMockGameState` dans `src/lib/__test-fixtures__/gameState.ts`.
- Toute nouvelle section du dictionnaire UI doit être ajoutée aux **trois** fichiers `src/lib/i18n/ui/{fr,en,es}.ts` (typé par la forme du FR — oubli = erreur de compil).
- Nouveau champ persisté ⇒ backfill dans `appliquerMigrations` + incrément `SAVE_VERSION` (11 → 12) dans `src/lib/migrations.ts`.
- Z-index : `DialogueOverlay` = 120 (au-dessus des sheets 40-70, du header bas 50, de l'IntroPorte 80) ; bannière tutoriel = 90.
- Le nom affiché du grand-père vient de `nomExpediteur("grand-pere", locale)` (expéditeur existant) — pas de prénom en dur (décision SP3).

---

### Task 1: État `tutorielEtape` + bibliothèque `src/lib/tutoriel.ts`

**Files:**
- Modify: `src/types/game.ts` (interface `GameState`, ~l.264)
- Modify: `src/lib/__test-fixtures__/gameState.ts` (`createMockGameState`)
- Create: `src/lib/tutoriel.ts`
- Test: `src/lib/tutoriel.test.ts`

**Interfaces:**
- Consumes: `GameState`, `injecterLettreMamanSiAbsente` (`src/lib/courrier.ts`), `tickQuetes` (`src/lib/quetes/tick.ts`).
- Produces: type `TutorielEtape` (dans `types/game.ts`), constantes `ETAPES_TUTORIEL: readonly TutorielEtape[]`, fonctions `tutorielActif(state): boolean`, `etapeSuivante(e): TutorielEtape`, `appliquerFinTutoriel(state: GameState): GameState`. Les tâches 2, 6-11 en dépendent.

- [ ] **Step 1: Ajouter le type et le champ dans `src/types/game.ts`**

Près des autres types de progression (au-dessus de `interface GameState`) :

```ts
/**
 * Étapes du tutoriel guidé (SP1 trame scénaristique). Linéaire :
 * accueil → aller-chiner → premier-achat → rentrer → preparer-etal
 * → premiere-vente → conclusion → termine.
 * "termine" = tutoriel fini ou sauté (état des saves antérieures à v12).
 */
export type TutorielEtape =
  | "accueil"
  | "aller-chiner"
  | "premier-achat"
  | "rentrer"
  | "preparer-etal"
  | "premiere-vente"
  | "conclusion"
  | "termine";
```

Et dans `interface GameState` (à côté de `declencheursDeclenches`) :

```ts
  /** Étape courante du tutoriel guidé ("termine" hors tutoriel). */
  tutorielEtape: TutorielEtape;
```

- [ ] **Step 2: Mettre à jour la fixture**

Dans `src/lib/__test-fixtures__/gameState.ts`, ajouter au state de base de `createMockGameState` :

```ts
  tutorielEtape: "termine",
```

- [ ] **Step 3: Écrire les tests qui échouent** (`src/lib/tutoriel.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import {
  ETAPES_TUTORIEL,
  appliquerFinTutoriel,
  etapeSuivante,
  tutorielActif,
} from "./tutoriel";
import { ID_LETTRE_MAMAN_DEBUT } from "./courrier";
import { createMockGameState } from "./__test-fixtures__/gameState";

describe("tutoriel", () => {
  it("tutorielActif est vrai pour toute étape sauf 'termine'", () => {
    expect(tutorielActif({ tutorielEtape: "accueil" })).toBe(true);
    expect(tutorielActif({ tutorielEtape: "premiere-vente" })).toBe(true);
    expect(tutorielActif({ tutorielEtape: "termine" })).toBe(false);
  });

  it("etapeSuivante suit l'ordre linéaire et borne sur 'termine'", () => {
    expect(etapeSuivante("accueil")).toBe("aller-chiner");
    expect(etapeSuivante("conclusion")).toBe("termine");
    expect(etapeSuivante("termine")).toBe("termine");
  });

  it("ETAPES_TUTORIEL commence à 'accueil' et finit à 'termine'", () => {
    expect(ETAPES_TUTORIEL[0]).toBe("accueil");
    expect(ETAPES_TUTORIEL[ETAPES_TUTORIEL.length - 1]).toBe("termine");
  });

  it("appliquerFinTutoriel injecte la lettre de Maman, amorce le ch.1 et passe à 'termine'", () => {
    const state = createMockGameState({
      tutorielEtape: "conclusion",
      courriers: [],
      declencheursDeclenches: [],
      missions: [],
    });
    const fin = appliquerFinTutoriel(state);
    expect(fin.tutorielEtape).toBe("termine");
    expect(fin.courriers.some((c) => c.id === ID_LETTRE_MAMAN_DEBUT)).toBe(true);
    expect(fin.declencheursDeclenches).toContain(ID_LETTRE_MAMAN_DEBUT);
    // Chapitre 1 de l'arc principal amorcé (condition "depart")
    expect(fin.courriers.some((c) => c.id === "principale_ch1")).toBe(true);
    expect(fin.missions.some((m) => m.courrierId === "principale_ch1")).toBe(true);
  });

  it("appliquerFinTutoriel est idempotent sur un state déjà terminé", () => {
    const state = createMockGameState({ tutorielEtape: "termine" });
    expect(appliquerFinTutoriel(state)).toBe(state);
  });
});
```

- [ ] **Step 4: Vérifier l'échec** — Run: `npx vitest run src/lib/tutoriel.test.ts` — Expected: FAIL (`Cannot find module './tutoriel'`).

- [ ] **Step 5: Implémenter `src/lib/tutoriel.ts`**

```ts
import type { GameState, TutorielEtape } from "@/types/game";
import { injecterLettreMamanSiAbsente } from "@/lib/courrier";
import { tickQuetes } from "@/lib/quetes/tick";

/** Ordre linéaire des étapes du tutoriel guidé. */
export const ETAPES_TUTORIEL: readonly TutorielEtape[] = [
  "accueil",
  "aller-chiner",
  "premier-achat",
  "rentrer",
  "preparer-etal",
  "premiere-vente",
  "conclusion",
  "termine",
];

export function tutorielActif(
  state: Pick<GameState, "tutorielEtape">,
): boolean {
  return state.tutorielEtape !== "termine";
}

export function etapeSuivante(etape: TutorielEtape): TutorielEtape {
  const i = ETAPES_TUTORIEL.indexOf(etape);
  return ETAPES_TUTORIEL[Math.min(i + 1, ETAPES_TUTORIEL.length - 1)];
}

/**
 * Clôt le tutoriel (fin normale OU bouton « Passer ») : injecte la lettre de
 * Maman (différée depuis la création de partie), amorce l'arc principal
 * (chapitre 1, condition "depart") et passe l'étape à "termine".
 * Pur et idempotent.
 */
export function appliquerFinTutoriel(state: GameState): GameState {
  if (state.tutorielEtape === "termine") return state;
  const inj = injecterLettreMamanSiAbsente(
    state.courriers,
    state.declencheursDeclenches,
    state.jourActuel,
  );
  const base: GameState = {
    ...state,
    tutorielEtape: "termine",
    courriers: inj.courriers,
    declencheursDeclenches: [
      ...state.declencheursDeclenches,
      ...inj.declencheursAjoutes,
    ],
  };
  const tick = tickQuetes(base, base.jourActuel);
  return { ...base, courriers: tick.courriers, missions: tick.missions };
}
```

- [ ] **Step 6: Vérifier le vert** — Run: `npx vitest run src/lib/tutoriel.test.ts` — Expected: PASS (5 tests). Puis `npm run test:run` complet (la fixture a changé — tout doit rester vert).

- [ ] **Step 7: Commit**

```bash
git add src/types/game.ts src/lib/tutoriel.ts src/lib/tutoriel.test.ts src/lib/__test-fixtures__/gameState.ts
git commit -m "feat(tutoriel): état tutorielEtape + machine à étapes (lib pure)"
```

---

### Task 2: Migration de save v12 (backfill + lettre de Maman et arc différés)

**Files:**
- Modify: `src/lib/migrations.ts` (`SAVE_VERSION` l.92, injection Maman l.406-415, amorce de l'arc plus bas, objet retourné)
- Test: `src/lib/migrations.test.ts`

**Interfaces:**
- Consumes: `TutorielEtape`, `ETAPES_TUTORIEL` (Task 1).
- Produces: saves migrées portant toujours un `tutorielEtape` valide ; pendant un tutoriel en cours, ni lettre de Maman ni chapitre 1 ne sont injectés par la migration.

- [ ] **Step 1: Écrire les tests qui échouent** (ajouter à `src/lib/migrations.test.ts`)

```ts
describe("migration tutoriel (v12)", () => {
  it("backfill à 'termine' pour une save sans champ (et injecte Maman comme avant)", () => {
    const loaded = {
      ...createMockGameState({ courriers: [], declencheursDeclenches: [] }),
      tutorielEtape: undefined,
    } as unknown as GameState;
    const migre = migrerSauvegarde(loaded);
    expect(migre.tutorielEtape).toBe("termine");
    expect(migre.courriers.some((c) => c.id === ID_LETTRE_MAMAN_DEBUT)).toBe(true);
  });

  it("préserve une étape en cours et n'injecte NI Maman NI le chapitre 1", () => {
    const loaded = createMockGameState({
      tutorielEtape: "premier-achat",
      courriers: [],
      declencheursDeclenches: [],
      missions: [],
    });
    const migre = migrerSauvegarde(loaded);
    expect(migre.tutorielEtape).toBe("premier-achat");
    expect(migre.courriers.some((c) => c.id === ID_LETTRE_MAMAN_DEBUT)).toBe(false);
    expect(migre.courriers.some((c) => c.id === "principale_ch1")).toBe(false);
  });

  it("normalise une étape inconnue à 'termine'", () => {
    const loaded = {
      ...createMockGameState(),
      tutorielEtape: "etape-fantome",
    } as unknown as GameState;
    expect(migrerSauvegarde(loaded).tutorielEtape).toBe("termine");
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — Run: `npx vitest run src/lib/migrations.test.ts` — Expected: FAIL (champ absent de l'objet migré / lettre injectée à tort).

- [ ] **Step 3: Implémenter dans `src/lib/migrations.ts`**

a) `export const SAVE_VERSION = 12;` (était 11).

b) Import en tête : `import { ETAPES_TUTORIEL } from "@/lib/tutoriel";` et ajouter `TutorielEtape` à l'import de types.

c) Dans `appliquerMigrations`, **avant** le bloc d'injection Maman (l.406), résoudre l'étape :

```ts
  // Tutoriel (v12) : les saves antérieures ont déjà joué — "termine".
  // Une valeur inconnue (save corrompue/future) est aussi normalisée.
  const tutorielEtape: TutorielEtape = (() => {
    const v = (loaded as Partial<GameState>).tutorielEtape;
    return typeof v === "string" &&
      (ETAPES_TUTORIEL as readonly string[]).includes(v)
      ? (v as TutorielEtape)
      : "termine";
  })();
  const tutorielFini = tutorielEtape === "termine";
```

d) Garder l'injection Maman derrière ce drapeau (remplacer l'appel l.407-411) :

```ts
  const apresMaman = tutorielFini
    ? injecterLettreMamanSiAbsente(courriersMigrés, declencheursLoaded, jourCourant)
    : { courriers: courriersMigrés, declencheursAjoutes: [] as string[] };
```

e) Plus bas, l'amorce de l'arc principal (l'appel à `debloquerQuetesPrincipales` — chercher `debloquerQuetesPrincipales(` dans le fichier) : l'entourer du même drapeau, en renvoyant `[]` (aucun courrier amorcé) quand `!tutorielFini`.

f) Ajouter `tutorielEtape,` à l'objet retourné par `appliquerMigrations`, et vérifier que `assurerFiletSecuriteMinimal` produit aussi un `tutorielEtape: "termine"` (l'ajouter si ce filet construit l'objet champ par champ).

- [ ] **Step 4: Vérifier le vert** — Run: `npx vitest run src/lib/migrations.test.ts` puis `npm run test:run` — Expected: PASS partout.

- [ ] **Step 5: Commit**

```bash
git add src/lib/migrations.ts src/lib/migrations.test.ts
git commit -m "feat(save): v12 — tutorielEtape backfillé, lettre Maman et arc différés pendant le tutoriel"
```

---

### Task 3: Données de dialogue FR (`src/data/dialogues.ts`)

**Files:**
- Create: `src/data/dialogues.ts`
- Test: `src/data/dialogues.test.ts`

**Interfaces:**
- Produces: types `HumeurPnj`, `DialogueLigne`, `DialogueSequence` ; constantes `SEQUENCES_TUTORIEL: Record<string, DialogueSequence>` (clés : `tuto_accueil`, `tuto_chine_entree`, `tuto_achat_fait`, `tuto_retour`, `tuto_vente_entree`, `tuto_vente_faite`, `tuto_conclusion`), `AMBIANCE_GRAND_PERE: DialogueSequence[]`, `GRAND_PERE_PORTRAITS: Record<HumeurPnj, string>`, `TOUTES_SEQUENCES: DialogueSequence[]`. Consommé par les tâches 4, 5, 8-11.

- [ ] **Step 1: Écrire le test d'invariants** (`src/data/dialogues.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import {
  AMBIANCE_GRAND_PERE,
  GRAND_PERE_PORTRAITS,
  SEQUENCES_TUTORIEL,
  TOUTES_SEQUENCES,
} from "./dialogues";

describe("dialogues (données FR)", () => {
  it("les ids de séquences sont uniques", () => {
    const ids = TOUTES_SEQUENCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque séquence a au moins une ligne, sans texte vide", () => {
    for (const s of TOUTES_SEQUENCES) {
      expect(s.lignes.length).toBeGreaterThan(0);
      for (const l of s.lignes) expect(l.texte.trim().length).toBeGreaterThan(0);
    }
  });

  it("chaque humeur utilisée a un portrait", () => {
    for (const s of TOUTES_SEQUENCES) {
      for (const l of s.lignes) {
        expect(GRAND_PERE_PORTRAITS[l.humeur]).toMatch(/^\/personas\//);
      }
    }
  });

  it("les 7 séquences du tutoriel existent et l'id interne correspond à la clé", () => {
    const attendues = [
      "tuto_accueil", "tuto_chine_entree", "tuto_achat_fait", "tuto_retour",
      "tuto_vente_entree", "tuto_vente_faite", "tuto_conclusion",
    ];
    for (const id of attendues) {
      expect(SEQUENCES_TUTORIEL[id]?.id).toBe(id);
    }
    expect(AMBIANCE_GRAND_PERE.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — Run: `npx vitest run src/data/dialogues.test.ts` — Expected: FAIL (module absent).

- [ ] **Step 3: Implémenter `src/data/dialogues.ts`** (textes FR définitifs, ton doux/nostalgique — cf. spec §Décisions 6)

```ts
/**
 * Séquences de dialogue du grand-père (SP1 trame scénaristique).
 * FR = langue source ; overlays EN/ES dans src/lib/i18n/contenu/{en,es}/dialogues.ts.
 * Les ids sont stables (jamais en save, mais clés d'overlay i18n).
 */

export type HumeurPnj = "souriant" | "emu" | "songeur" | "rieur";

export interface DialogueLigne {
  texte: string;
  humeur: HumeurPnj;
}

export interface DialogueSequence {
  id: string;
  lignes: DialogueLigne[];
}

/** Portraits par humeur (assets provisoires en Task 12, définitifs à générer). */
export const GRAND_PERE_PORTRAITS: Record<HumeurPnj, string> = {
  souriant: "/personas/grand-pere/souriant.webp",
  emu: "/personas/grand-pere/emu.webp",
  songeur: "/personas/grand-pere/songeur.webp",
  rieur: "/personas/grand-pere/rieur.webp",
};

export const SEQUENCES_TUTORIEL: Record<string, DialogueSequence> = {
  tuto_accueil: {
    id: "tuto_accueil",
    lignes: [
      { humeur: "souriant", texte: "Te voilà enfin ! Entre, entre… Attention à la pile de journaux, elle est là depuis 1987." },
      { humeur: "emu", texte: "Cinquante ans que je tiens cette boutique. Chaque objet ici a une histoire… et mes genoux aussi, hélas." },
      { humeur: "songeur", texte: "Il est temps que je passe la main. Et c'est toi que j'ai choisi. Ne fais pas cette tête — tu vas adorer." },
      { humeur: "souriant", texte: "On commence par le commencement : la brocante. La porte est par là, suis-moi." },
    ],
  },
  tuto_chine_entree: {
    id: "tuto_chine_entree",
    lignes: [
      { humeur: "souriant", texte: "Ah, l'odeur des vieilleries au petit matin… Regarde les étals : glisse d'un objet à l'autre, prends ton temps." },
      { humeur: "songeur", texte: "Quand un objet te parle, négocie — ou achète-le au prix affiché si le cœur t'en dit. Vas-y, choisis-en un." },
    ],
  },
  tuto_achat_fait: {
    id: "tuto_achat_fait",
    lignes: [
      { humeur: "rieur", texte: "Bien joué ! Ta grand-mère aurait marchandé deux sous de moins, mais c'est un début." },
      { humeur: "souriant", texte: "Allez, on rentre. Passe par la sortie, ton trésor sous le bras." },
    ],
  },
  tuto_retour: {
    id: "tuto_retour",
    lignes: [
      { humeur: "souriant", texte: "Chiner, c'est le plaisir. Vendre, c'est le métier. Repasse la porte — et cette fois, on étale." },
    ],
  },
  tuto_vente_entree: {
    id: "tuto_vente_entree",
    lignes: [
      { humeur: "songeur", texte: "Les clients vont venir. Écoute-les, laisse-les parler… et ne lâche jamais ton prix trop vite." },
    ],
  },
  tuto_vente_faite: {
    id: "tuto_vente_faite",
    lignes: [
      { humeur: "rieur", texte: "Et voilà ta première vente ! Le tiroir-caisse qui chante, ça ne s'oublie jamais." },
      { humeur: "souriant", texte: "Referme l'étal quand tu veux, et rentrons. J'ai quelque chose pour toi à la maison." },
    ],
  },
  tuto_conclusion: {
    id: "tuto_conclusion",
    lignes: [
      { humeur: "emu", texte: "Tu as l'œil, et la main… il ne te manque que les années. La boutique est entre de bonnes mains." },
      { humeur: "souriant", texte: "Tiens : mon carnet de commandes. Les gens y notent ce qu'ils cherchent — regarde-le souvent." },
      { humeur: "songeur", texte: "Et le facteur est passé : une lettre de ta mère, je crois. Allez, au travail… je reste dans mon fauteuil, si tu as besoin de moi." },
    ],
  },
};

/** Petites phrases quand on tape le grand-père hors tutoriel (rotation par jour). */
export const AMBIANCE_GRAND_PERE: DialogueSequence[] = [
  {
    id: "amb_gp_fauteuil",
    lignes: [{ humeur: "souriant", texte: "Ce fauteuil et moi, on a le même âge. Lui, il grince moins." }],
  },
  {
    id: "amb_gp_objets",
    lignes: [{ humeur: "songeur", texte: "Chaque objet attend quelqu'un. Notre métier, c'est de les présenter." }],
  },
  {
    id: "amb_gp_grandmere",
    lignes: [{ humeur: "rieur", texte: "De mon temps, on négociait dès le petit-déjeuner. Ta grand-mère gagnait toujours." }],
  },
  {
    id: "amb_gp_fier",
    lignes: [{ humeur: "emu", texte: "Je suis fier de toi, tu sais. Je ne le dirai qu'une fois, alors profites-en." }],
  },
];

export const TOUTES_SEQUENCES: DialogueSequence[] = [
  ...Object.values(SEQUENCES_TUTORIEL),
  ...AMBIANCE_GRAND_PERE,
];
```

- [ ] **Step 4: Vérifier le vert** — Run: `npx vitest run src/data/dialogues.test.ts` — Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/dialogues.ts src/data/dialogues.test.ts
git commit -m "feat(dialogue): séquences FR du grand-père (tutoriel + ambiance)"
```

---

### Task 4: Overlays i18n EN/ES des dialogues + résolution

**Files:**
- Create: `src/lib/i18n/contenu/en/dialogues.ts`
- Create: `src/lib/i18n/contenu/es/dialogues.ts`
- Modify: `src/lib/i18n/contenu/index.ts`
- Test: `src/lib/i18n/contenu/dialogues.test.ts`

**Interfaces:**
- Consumes: `DialogueSequence`, `TOUTES_SEQUENCES` (Task 3), `Locale`, helpers `manquants`/`orphelins` (`contenu/index.ts`).
- Produces: `lignesDialogue(seq: DialogueSequence, locale: Locale): string[]` exporté de `src/lib/i18n/contenu/index.ts` — même schéma de repli FR que `titreCourrier`. Consommé par Task 5.

- [ ] **Step 1: Écrire le test de complétude** (`src/lib/i18n/contenu/dialogues.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { TOUTES_SEQUENCES } from "@/data/dialogues";
import { lignesDialogue, manquants, orphelins } from "./index";
import { DIALOGUES_EN } from "./en/dialogues";
import { DIALOGUES_ES } from "./es/dialogues";

const IDS = TOUTES_SEQUENCES.map((s) => s.id);

describe.each([
  ["EN", DIALOGUES_EN],
  ["ES", DIALOGUES_ES],
] as const)("overlay dialogues %s", (_nom, overlay) => {
  it("couvre toutes les séquences, sans orphelin", () => {
    expect(manquants(IDS, overlay)).toEqual([]);
    expect(orphelins(IDS, overlay)).toEqual([]);
  });

  it("a le même nombre de lignes que le FR", () => {
    for (const s of TOUTES_SEQUENCES) {
      expect(overlay[s.id]).toHaveLength(s.lignes.length);
    }
  });
});

describe("lignesDialogue", () => {
  const seq = TOUTES_SEQUENCES[0];
  it("FR = textes du payload", () => {
    expect(lignesDialogue(seq, "fr")).toEqual(seq.lignes.map((l) => l.texte));
  });
  it("EN = overlay", () => {
    expect(lignesDialogue(seq, "en")).toEqual(DIALOGUES_EN[seq.id]);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — Run: `npx vitest run src/lib/i18n/contenu/dialogues.test.ts` — Expected: FAIL (modules absents).

- [ ] **Step 3: Créer `src/lib/i18n/contenu/en/dialogues.ts`**

```ts
/** Overlay EN des dialogues (clé = id de séquence, valeur = lignes, même nombre que le FR). */
export const DIALOGUES_EN: Record<string, string[]> = {
  tuto_accueil: [
    "There you are at last! Come in, come in… Mind the pile of newspapers — it's been there since 1987.",
    "Fifty years I've kept this shop. Every object here has a story… and so do my knees, alas.",
    "It's time I passed it on. And I chose you. Don't make that face — you're going to love it.",
    "Let's start at the beginning: the flea market. The door's right there — follow me.",
  ],
  tuto_chine_entree: [
    "Ah, the smell of old things in the early morning… Look at the stalls: swipe from one item to the next, take your time.",
    "When an object speaks to you, haggle — or buy it at the asking price if your heart says so. Go on, pick one.",
  ],
  tuto_achat_fait: [
    "Well done! Your grandmother would have haggled two pennies more, but it's a start.",
    "Come on, let's head home. Out through the exit, treasure under your arm.",
  ],
  tuto_retour: [
    "Hunting is the pleasure. Selling is the trade. Go through the door again — and this time, we set up a stall.",
  ],
  tuto_vente_entree: [
    "The customers will come. Listen to them, let them talk… and never drop your price too fast.",
  ],
  tuto_vente_faite: [
    "And there's your first sale! The song of the till — you never forget it.",
    "Close the stall whenever you like, and let's go home. I have something for you at the house.",
  ],
  tuto_conclusion: [
    "You have the eye, and the hands… all you're missing is the years. The shop is in good hands.",
    "Here: my order book. People write down what they're looking for — check it often.",
    "And the postman came by: a letter from your mother, I believe. Off to work now… I'll be in my armchair if you need me.",
  ],
  amb_gp_fauteuil: ["This armchair and I are the same age. It creaks less."],
  amb_gp_objets: ["Every object is waiting for someone. Our trade is introducing them."],
  amb_gp_grandmere: ["In my day, we haggled at breakfast. Your grandmother always won."],
  amb_gp_fier: ["I'm proud of you, you know. I'll only say it once, so make the most of it."],
};
```

- [ ] **Step 4: Créer `src/lib/i18n/contenu/es/dialogues.ts`**

```ts
/** Overlay ES de los diálogos (clave = id de secuencia, mismo número de líneas que el FR). */
export const DIALOGUES_ES: Record<string, string[]> = {
  tuto_accueil: [
    "¡Por fin llegas! Pasa, pasa… Cuidado con la pila de periódicos, lleva ahí desde 1987.",
    "Cincuenta años llevo con esta tienda. Cada objeto aquí tiene una historia… y mis rodillas también, por desgracia.",
    "Es hora de pasar el relevo. Y te he elegido a ti. No pongas esa cara — te va a encantar.",
    "Empecemos por el principio: el mercadillo. La puerta está ahí — sígueme.",
  ],
  tuto_chine_entree: [
    "Ah, el olor de las cosas viejas por la mañana… Mira los puestos: desliza de un objeto a otro, tómate tu tiempo.",
    "Cuando un objeto te hable, regatea — o cómpralo al precio marcado si el corazón te lo pide. Venga, elige uno.",
  ],
  tuto_achat_fait: [
    "¡Bien hecho! Tu abuela habría regateado dos céntimos más, pero es un comienzo.",
    "Venga, volvamos. Sal por la salida, con tu tesoro bajo el brazo.",
  ],
  tuto_retour: [
    "Rebuscar es el placer. Vender es el oficio. Vuelve a cruzar la puerta — y esta vez, montamos el puesto.",
  ],
  tuto_vente_entree: [
    "Los clientes vendrán. Escúchalos, déjalos hablar… y nunca bajes tu precio demasiado rápido.",
  ],
  tuto_vente_faite: [
    "¡Y ahí está tu primera venta! El canto de la caja registradora — nunca se olvida.",
    "Cierra el puesto cuando quieras, y volvamos. Tengo algo para ti en casa.",
  ],
  tuto_conclusion: [
    "Tienes el ojo, y la mano… solo te faltan los años. La tienda queda en buenas manos.",
    "Toma: mi cuaderno de encargos. La gente apunta lo que busca — míralo a menudo.",
    "Y ha pasado el cartero: una carta de tu madre, creo. A trabajar… estaré en mi sillón si me necesitas.",
  ],
  amb_gp_fauteuil: ["Este sillón y yo tenemos la misma edad. Él cruje menos."],
  amb_gp_objets: ["Cada objeto espera a alguien. Nuestro oficio es presentarlos."],
  amb_gp_grandmere: ["En mis tiempos se regateaba en el desayuno. Tu abuela siempre ganaba."],
  amb_gp_fier: ["Estoy orgulloso de ti, ¿sabes? Solo lo diré una vez, así que aprovéchalo."],
};
```

- [ ] **Step 5: Câbler dans `src/lib/i18n/contenu/index.ts`**

```ts
import type { DialogueSequence } from "@/data/dialogues";
import { DIALOGUES_EN } from "./en/dialogues";
import { DIALOGUES_ES } from "./es/dialogues";

const DIALOGUES_OVERLAY: Record<"en" | "es", Record<string, string[]>> = {
  en: DIALOGUES_EN,
  es: DIALOGUES_ES,
};

/** Lignes d'une séquence de dialogue dans la locale demandée (repli FR). */
export function lignesDialogue(
  seq: DialogueSequence,
  locale: Locale,
): string[] {
  if (locale !== "fr") {
    const trad = DIALOGUES_OVERLAY[locale][seq.id];
    if (trad && trad.length === seq.lignes.length) return trad;
  }
  return seq.lignes.map((l) => l.texte);
}
```

- [ ] **Step 6: Vérifier le vert** — Run: `npx vitest run src/lib/i18n/contenu/dialogues.test.ts` — Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/i18n/contenu/en/dialogues.ts src/lib/i18n/contenu/es/dialogues.ts src/lib/i18n/contenu/index.ts src/lib/i18n/contenu/dialogues.test.ts
git commit -m "feat(i18n): overlays EN/ES des dialogues + lignesDialogue()"
```

---

### Task 5: Composant `DialogueOverlay`

**Files:**
- Create: `src/components/mobile/dialogue/DialogueOverlay.tsx`
- Test: `src/components/mobile/dialogue/DialogueOverlay.test.tsx`

**Interfaces:**
- Consumes: `DialogueSequence`, `HumeurPnj` (Task 3), `lignesDialogue` (Task 4), `useLangue`.
- Produces: `DialogueOverlay({ sequence, nom, portraits, onFini })` — `sequence: DialogueSequence | null` (null = fermé), `nom: string` (déjà localisé par l'appelant), `portraits: Record<HumeurPnj, string>`, `onFini: () => void` appelé après la dernière ligne. Consommé par les tâches 8-11.

- [ ] **Step 1: Écrire le test** (`src/components/mobile/dialogue/DialogueOverlay.test.tsx`)

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DialogueOverlay } from "./DialogueOverlay";
import { GRAND_PERE_PORTRAITS, SEQUENCES_TUTORIEL } from "@/data/dialogues";

const seq = SEQUENCES_TUTORIEL.tuto_achat_fait; // 2 lignes

describe("DialogueOverlay", () => {
  it("ne rend rien quand sequence est null", () => {
    const { container } = render(
      <DialogueOverlay sequence={null} nom="Grand-père" portraits={GRAND_PERE_PORTRAITS} onFini={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("affiche la première ligne, avance au tap, appelle onFini après la dernière", async () => {
    const user = userEvent.setup();
    const onFini = vi.fn();
    render(
      <DialogueOverlay sequence={seq} nom="Grand-père" portraits={GRAND_PERE_PORTRAITS} onFini={onFini} />,
    );
    expect(screen.getByText(seq.lignes[0].texte)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    expect(screen.getByText(seq.lignes[1].texte)).toBeTruthy();
    expect(onFini).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    expect(onFini).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — Run: `npx vitest run src/components/mobile/dialogue/DialogueOverlay.test.tsx` — Expected: FAIL (module absent).

- [ ] **Step 3: Implémenter `src/components/mobile/dialogue/DialogueOverlay.tsx`**

Portal vers `document.body` (pattern `PersonaInfoOverlay.tsx` l.47-49 : échappe aux ancêtres `transform`). Style papier crème repris de `CourrierSheet` (gradient `#f6ecd2 → #e7d6a8`, bordure `#b89c5e`). Toute la surface est un unique bouton (`aria-label` = « Continuer ») : un tap avance ; l'index se remet à 0 quand `sequence.id` change.

```tsx
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { DialogueSequence, HumeurPnj } from "@/data/dialogues";
import { lignesDialogue } from "@/lib/i18n/contenu";
import { useLangue } from "@/lib/i18n/LangueContext";

interface DialogueOverlayProps {
  /** Séquence à jouer, ou null (rien n'est rendu). */
  sequence: DialogueSequence | null;
  /** Nom affiché du PNJ (déjà localisé par l'appelant). */
  nom: string;
  /** Portrait par humeur. */
  portraits: Record<HumeurPnj, string>;
  /** Appelé après le tap sur la dernière ligne. */
  onFini: () => void;
}

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 120,
  background: "rgba(15, 30, 22, 0.45)",
  border: "none",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  cursor: "pointer",
  width: "100%",
  textAlign: "inherit",
};

const carte: CSSProperties = {
  margin: "0 12px calc(16px + var(--safe-bottom, 0px))",
  padding: "14px 16px 12px",
  borderRadius: 4,
  background: "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  border: "1px solid #b89c5e",
  boxShadow: "inset 0 0 28px rgba(120,90,40,0.18), 0 6px 16px rgba(0,0,0,0.35)",
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
};

const portraitStyle: CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  border: "2px solid #b89c5e",
  objectFit: "cover",
  flexShrink: 0,
  background: "#e7d6a8",
};

const nomStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.10em",
  color: "var(--ink-700)",
  marginBottom: 4,
};

const texteStyle: CSSProperties = {
  fontFamily: "var(--font-handwriting)",
  fontSize: 18,
  lineHeight: 1.35,
  color: "#3a2f1e",
};

const suiteStyle: CSSProperties = {
  fontSize: 12,
  color: "#7a6337",
  textAlign: "right",
  marginTop: 6,
};

export function DialogueOverlay({
  sequence,
  nom,
  portraits,
  onFini,
}: DialogueOverlayProps) {
  const { locale } = useLangue();
  const [index, setIndex] = useState(0);

  // Nouvelle séquence → repartir de la première ligne.
  useEffect(() => {
    setIndex(0);
  }, [sequence?.id]);

  if (!sequence || typeof document === "undefined") return null;

  const lignes = lignesDialogue(sequence, locale);
  const ligne = sequence.lignes[Math.min(index, sequence.lignes.length - 1)];
  const texte = lignes[Math.min(index, lignes.length - 1)];
  const derniere = index >= lignes.length - 1;

  const avancer = () => {
    if (derniere) onFini();
    else setIndex((i) => i + 1);
  };

  return createPortal(
    <button type="button" style={scrim} onClick={avancer} aria-label="Continuer">
      <div style={carte}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portraits[ligne.humeur]} alt="" draggable={false} style={portraitStyle} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={nomStyle}>{nom}</div>
          <div style={texteStyle}>{texte}</div>
          <div style={suiteStyle} aria-hidden>
            {derniere ? "✦" : "▼"}
          </div>
        </div>
      </div>
    </button>,
    document.body,
  );
}
```

- [ ] **Step 4: Vérifier le vert** — Run: `npx vitest run src/components/mobile/dialogue/DialogueOverlay.test.tsx` — Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/dialogue/
git commit -m "feat(dialogue): DialogueOverlay générique (portal, portrait, tap pour avancer)"
```

---

### Task 6: GameContext — nouvelle partie en tutoriel + actions

**Files:**
- Modify: `src/context/GameContext.tsx` (init l.535-572, exports d'actions)

**Interfaces:**
- Consumes: `appliquerFinTutoriel`, `etapeSuivante` (Task 1) ; `TutorielEtape`.
- Produces: sur le contexte d'actions (`useGameActions`) : `avancerTutoriel(vers: TutorielEtape): void` et `terminerTutoriel(): void`. Les tâches 7-11 en dépendent. L'init d'une nouvelle partie produit : `courriers: []`, `declencheursDeclenches: []`, `tutorielEtape: "accueil"`, pas de tick de quêtes.

- [ ] **Step 1: Modifier l'init de nouvelle partie**

Dans la fonction d'init (autour des lignes 535-572) :
- Ligne 552 : `courriers: [creerLettreMamanDebut(INITIAL_JOUR)],` → `courriers: [],`
- Ligne 559 : `declencheursDeclenches: [ID_LETTRE_MAMAN_DEBUT],` → `declencheursDeclenches: [],`
- Ajouter dans l'objet initial : `tutorielEtape: "accueil",`
- Lignes 569-572 : supprimer l'amorce (`tickQuetes`) — remplacer par :

```ts
    setState(initial);
    router.push("/bureau");
```

(L'import de `creerLettreMamanDebut` reste utilisé ailleurs ? Vérifier : s'il ne l'est plus dans ce fichier, retirer l'import ; `ID_LETTRE_MAMAN_DEBUT` idem.)

- [ ] **Step 2: Ajouter les deux actions**

Près de `detacherPartie` (l.806), avec les autres `useCallback` :

```ts
  /** Fait avancer le tutoriel vers une étape donnée (idempotent si déjà atteinte/dépassée). */
  const avancerTutoriel = useCallback((vers: TutorielEtape) => {
    setState((prev) => {
      if (!prev || prev.tutorielEtape === "termine") return prev;
      const iCourante = ETAPES_TUTORIEL.indexOf(prev.tutorielEtape);
      const iCible = ETAPES_TUTORIEL.indexOf(vers);
      if (iCible <= iCourante) return prev;
      return { ...prev, tutorielEtape: vers };
    });
  }, []);

  /** Clôt le tutoriel (fin normale ou « Passer ») : lettre de Maman + chapitre 1. */
  const terminerTutoriel = useCallback(() => {
    setState((prev) => (prev ? appliquerFinTutoriel(prev) : prev));
  }, []);
```

Imports : `import { appliquerFinTutoriel, ETAPES_TUTORIEL } from "@/lib/tutoriel";` et `TutorielEtape` dans l'import de types. Exposer `avancerTutoriel` et `terminerTutoriel` dans la valeur du contexte d'actions (même endroit que `detacherPartie` — suivre le pattern existant du fichier : ajout au `useMemo`/objet d'actions et à son type).

- [ ] **Step 3: Vérifier compilation + suite** — Run: `npx tsc --noEmit && npm run test:run` — Expected: PASS. (S'il existe un test qui vérifie la lettre de Maman à la création de partie, l'adapter : à la création elle n'existe plus, elle arrive via `appliquerFinTutoriel`.)

- [ ] **Step 4: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(tutoriel): nouvelle partie démarre en tutoriel ; actions avancer/terminerTutoriel"
```

---

### Task 7: Chrome du tutoriel — bannière, bouton Passer, pulse CSS, TabBar masquée, dict UI

**Files:**
- Create: `src/components/mobile/tutoriel/TutorielBanniere.tsx`
- Modify: `src/app/globals.css` (classe `.tuto-pulse`)
- Modify: `src/lib/i18n/ui/fr.ts`, `src/lib/i18n/ui/en.ts`, `src/lib/i18n/ui/es.ts` (section `tutoriel`)
- Modify: `src/components/mobile/TabBar.tsx` (masquage pendant le tutoriel)
- Modify: `src/app/layout.tsx` (montage global de la bannière)

**Interfaces:**
- Consumes: `tutorielActif` (Task 1), `terminerTutoriel` (Task 6), `useGameStateOnly`/`useGameActions`, `useLangue`.
- Produces: `<TutorielBanniere />` (aucune prop — lit le contexte), classe CSS globale `tuto-pulse` (appliquée par les tâches 9-11), section `d.tutoriel` du dictionnaire UI.

- [ ] **Step 1: CSS — ajouter à `src/app/globals.css`**

```css
/* Tutoriel : halo pulsé sur l'élément que le joueur doit toucher. */
@keyframes tuto-pulse-kf {
  0%, 100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.85); }
  50% { box-shadow: 0 0 0 10px rgba(212, 175, 55, 0); }
}
.tuto-pulse {
  animation: tuto-pulse-kf 1.6s ease-in-out infinite;
  border-radius: 12px;
}
@media (prefers-reduced-motion: reduce) {
  .tuto-pulse {
    animation: none;
    box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.85);
  }
}
```

- [ ] **Step 2: Dictionnaire UI — section `tutoriel` dans les trois langues**

`src/lib/i18n/ui/fr.ts` (nouvelle clé top-level, à côté de `qg`) :

```ts
  tutoriel: {
    passer: "Passer le tutoriel",
    confirmerPasser: "Sûr ? Touche encore",
    instructions: {
      "accueil": "Écoute ton grand-père…",
      "aller-chiner": "Passe la porte, choisis « Chiner », puis le Vide-grenier du quartier.",
      "premier-achat": "Choisis un objet et achète-le — négocie si tu l'oses !",
      "rentrer": "Sors de la brocante et rentre à la boutique.",
      "preparer-etal": "Repasse la porte et choisis « Étaler » pour préparer ta vitrine.",
      "premiere-vente": "Vends un objet à un client, puis referme l'étal.",
      "conclusion": "Écoute ton grand-père…",
    },
  },
```

`en.ts` :

```ts
  tutoriel: {
    passer: "Skip tutorial",
    confirmerPasser: "Sure? Tap again",
    instructions: {
      "accueil": "Listen to your grandfather…",
      "aller-chiner": "Go through the door, pick “Hunt”, then the Neighborhood Yard Sale.",
      "premier-achat": "Pick an item and buy it — haggle if you dare!",
      "rentrer": "Leave the flea market and head back to the shop.",
      "preparer-etal": "Go through the door again and pick “Set up” to prepare your stall.",
      "premiere-vente": "Sell an item to a customer, then close the stall.",
      "conclusion": "Listen to your grandfather…",
    },
  },
```

`es.ts` :

```ts
  tutoriel: {
    passer: "Saltar tutorial",
    confirmerPasser: "¿Seguro? Toca otra vez",
    instructions: {
      "accueil": "Escucha a tu abuelo…",
      "aller-chiner": "Cruza la puerta, elige «Rebuscar» y luego el Mercadillo del barrio.",
      "premier-achat": "Elige un objeto y cómpralo — ¡regatea si te atreves!",
      "rentrer": "Sal del mercadillo y vuelve a la tienda.",
      "preparer-etal": "Vuelve a cruzar la puerta y elige «Montar puesto» para preparar tu vitrina.",
      "premiere-vente": "Véndele un objeto a un cliente y cierra el puesto.",
      "conclusion": "Escucha a tu abuelo…",
    },
  },
```

Nota : les libellés « Chiner »/« Étaler » cités doivent correspondre à `d.qg.chiner`/`d.qg.etaler` de chaque langue — vérifier ces valeurs dans `en.ts`/`es.ts` et harmoniser les guillemets si besoin.

- [ ] **Step 3: `TutorielBanniere.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useGameActions, useGameStateOnly } from "@/context/GameContext";
import { useLangue } from "@/lib/i18n/LangueContext";
import { tutorielActif } from "@/lib/tutoriel";

const wrap: CSSProperties = {
  position: "fixed",
  top: "calc(var(--safe-top, 0px) + 8px)",
  left: 12,
  right: 12,
  zIndex: 90,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  borderRadius: 10,
  background: "rgba(26, 51, 38, 0.92)",
  border: "1px solid var(--brass-500, #b89c5e)",
  color: "#f6ecd2",
  pointerEvents: "auto",
};

const texteStyle: CSSProperties = {
  flex: 1,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.3,
};

const passerStyle: CSSProperties = {
  flexShrink: 0,
  background: "transparent",
  border: "1px solid rgba(246, 236, 210, 0.5)",
  borderRadius: 8,
  color: "#f6ecd2",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "6px 10px",
  cursor: "pointer",
};

export function TutorielBanniere() {
  const state = useGameStateOnly();
  const { terminerTutoriel } = useGameActions();
  const { d } = useLangue();
  const [confirme, setConfirme] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (!state || !tutorielActif(state)) return null;
  const etape = state.tutorielEtape as Exclude<
    typeof state.tutorielEtape,
    "termine"
  >;

  const onPasser = () => {
    if (confirme) {
      terminerTutoriel();
      return;
    }
    setConfirme(true);
    timerRef.current = setTimeout(() => setConfirme(false), 3000);
  };

  return (
    <div style={wrap} role="status">
      <span style={texteStyle}>{d.tutoriel.instructions[etape]}</span>
      <button type="button" style={passerStyle} onClick={onPasser}>
        {confirme ? d.tutoriel.confirmerPasser : d.tutoriel.passer}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Monter la bannière dans `src/app/layout.tsx`**

```tsx
import { TutorielBanniere } from "@/components/mobile/tutoriel/TutorielBanniere";
```

et dans le JSX, à côté de `<LevelUpOverlay />` :

```tsx
                <TutorielBanniere />
```

- [ ] **Step 5: Masquer la TabBar pendant le tutoriel**

Dans `src/components/mobile/TabBar.tsx`, dans le composant `TabBar` (après récupération du state via `useGameStateOnly`), ajouter avant le rendu :

```ts
  // Tutoriel guidé : navigation libre coupée — la bannière et les dialogues guident.
  if (state && tutorielActif(state)) return null;
```

avec `import { tutorielActif } from "@/lib/tutoriel";`. Adapter `TabBar.test.tsx` si le mock de state ne porte pas `tutorielEtape` (la fixture Task 1 le fournit déjà à "termine").

- [ ] **Step 6: Vérifier** — Run: `npx tsc --noEmit && npm run test:run && npx eslint src` — Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/mobile/tutoriel/ src/app/globals.css src/lib/i18n/ui/ src/components/mobile/TabBar.tsx src/app/layout.tsx
git commit -m "feat(tutoriel): bannière d'instructions + Passer, pulse CSS, TabBar masquée"
```

---

### Task 8: Le grand-père au QG (`QgGrandPere` + ambiance)

**Files:**
- Create: `src/components/mobile/qg/QgGrandPere.tsx`
- Modify: `src/components/mobile/qg/layout.ts` (`QG_LAYOUT.objets`)
- Modify: `src/app/(qg)/layout.tsx` (montage zone 0, dialogue d'ambiance)

**Interfaces:**
- Consumes: `useQgObjet`/`useQgObjetStyle` (pattern `QgCarnet`), `DialogueOverlay` (Task 5), `AMBIANCE_GRAND_PERE`, `GRAND_PERE_PORTRAITS` (Task 3), `nomExpediteur` (`contenu/index.ts`), `tutorielActif` (Task 1).
- Produces: `QgGrandPere({ aDialogue, onTap })` — `aDialogue: boolean` affiche une bulle « ! » (inutilisée en SP1, prévue pour la remise des chapitres en SP2), `onTap: () => void`.

- [ ] **Step 1: Ajouter les coordonnées dans `src/components/mobile/qg/layout.ts`**

Dans `QG_LAYOUT.objets` (zone 0 = bureau ; valeurs de départ, à affiner au simulateur via le mode édition dev) :

```ts
  grandPere: { left: 8.0, bottom: 10.0, width: 24.0 },
```

Si le type `QgObjetKey` est une union explicite, y ajouter `"grandPere"`.

- [ ] **Step 2: Créer `src/components/mobile/qg/QgGrandPere.tsx`** (même patron que `QgCarnet`)

```tsx
"use client";

import { type CSSProperties } from "react";
import { useQgObjetStyle } from "@/components/mobile/qg/QgScene";
import { useLangue } from "@/lib/i18n/LangueContext";

interface QgGrandPereProps {
  /** Vrai quand un dialogue important attend (bulle « ! ») — SP2 : chapitres. */
  aDialogue: boolean;
  onTap: () => void;
}

const bulle: CSSProperties = {
  position: "absolute",
  top: -6,
  right: -2,
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "#f6ecd2",
  border: "2px solid #b89c5e",
  color: "#7a2e1d",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 14,
  display: "grid",
  placeItems: "center",
};

export function QgGrandPere({ aDialogue, onTap }: QgGrandPereProps) {
  const style = useQgObjetStyle("grandPere");
  const { d } = useLangue();
  return (
    <button type="button" style={style} onClick={onTap} aria-label={d.qg.grandPere}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/qg/grand-pere-fauteuil.webp"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
      {aDialogue && (
        <span style={bulle} aria-hidden>
          !
        </span>
      )}
    </button>
  );
}
```

Ajouter la clé au dictionnaire UI (les trois fichiers, section `qg`) : FR `grandPere: "Parler à Grand-père"`, EN `grandPere: "Talk to Grandpa"`, ES `grandPere: "Hablar con el abuelo"`.

- [ ] **Step 3: Câbler dans `src/app/(qg)/layout.tsx`** (`QgLayoutInner`)

État + séquence d'ambiance (rotation par jour) :

```ts
  const [dialogueQg, setDialogueQg] = useState<DialogueSequence | null>(null);
```

Montage en zone 0 (à côté de `QgCarnet`, ~l.396) :

```tsx
    <QgGrandPere
      aDialogue={false}
      onTap={() => {
        if (tutorielActif(state)) return;
        playClick();
        setDialogueQg(
          AMBIANCE_GRAND_PERE[state.jourActuel % AMBIANCE_GRAND_PERE.length],
        );
      }}
    />
```

Rendu de l'overlay (avec les autres sheets, fin du JSX) :

```tsx
    <DialogueOverlay
      sequence={dialogueQg}
      nom={nomExpediteur("grand-pere", locale)}
      portraits={GRAND_PERE_PORTRAITS}
      onFini={() => setDialogueQg(null)}
    />
```

Imports : `QgGrandPere`, `DialogueOverlay`, `AMBIANCE_GRAND_PERE`, `GRAND_PERE_PORTRAITS`, `nomExpediteur`, `tutorielActif`, type `DialogueSequence` ; `locale` vient du `useLangue()` déjà présent (sinon l'ajouter).

- [ ] **Step 4: Vérifier** — Run: `npx tsc --noEmit && npx eslint src` — Expected: PASS. Vérif visuelle différée à Task 12.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/qg/QgGrandPere.tsx src/components/mobile/qg/layout.ts "src/app/(qg)/layout.tsx" src/lib/i18n/ui/
git commit -m "feat(qg): grand-père tapable au bureau (dialogue d'ambiance, rotation par jour)"
```

---

### Task 9: Câblage tutoriel au QG (accueil, retour, conclusion, gating porte)

**Files:**
- Modify: `src/app/(qg)/layout.tsx`
- Modify: `src/components/mobile/qg/sheets/PorteSheet.tsx`

**Interfaces:**
- Consumes: `SEQUENCES_TUTORIEL` (Task 3), `DialogueOverlay` + état `dialogueQg` (Task 8), `avancerTutoriel`/`terminerTutoriel` (Task 6), `tutorielActif`.
- Produces: `PorteSheet` accepte `tutoChiner?: boolean` et `tutoEtaler?: boolean` (pulse + désactivation croisée).

- [ ] **Step 1: Auto-dialogues au bureau** — dans `QgLayoutInner`, ajouter :

```ts
  const etape = state.tutorielEtape;

  // Dialogues automatiques du tutoriel au bureau. Un seul déclenchement par
  // étape : l'étape n'avance qu'à la fin du dialogue (onFini), et l'effet ne
  // rouvre pas si un dialogue est déjà affiché.
  useEffect(() => {
    if (dialogueQg) return;
    if (etape === "accueil") setDialogueQg(SEQUENCES_TUTORIEL.tuto_accueil);
    else if (etape === "rentrer") setDialogueQg(SEQUENCES_TUTORIEL.tuto_retour);
    else if (etape === "conclusion") setDialogueQg(SEQUENCES_TUTORIEL.tuto_conclusion);
  }, [etape, dialogueQg]);
```

et remplacer le `onFini` du `DialogueOverlay` (Task 8 Step 3) par :

```tsx
      onFini={() => {
        setDialogueQg(null);
        if (etape === "accueil") avancerTutoriel("aller-chiner");
        else if (etape === "rentrer") avancerTutoriel("preparer-etal");
        else if (etape === "conclusion") terminerTutoriel();
      }}
```

(`avancerTutoriel`/`terminerTutoriel` viennent de `useGameActions()` déjà consommé dans ce fichier.)

⚠ Règle des hooks : ces hooks doivent être appelés inconditionnellement (avant tout `return` conditionnel de `QgLayoutInner`) — `npx eslint src` (rules-of-hooks) le vérifie.

- [ ] **Step 2: Gating des objets QG pendant le tutoriel**

Dans `QgLayoutInner`, définir `const tutoActif = tutorielActif(state);` et garder **tous** les `onTap`/`onOpen` des objets `Qg*` de la scène (carnet, carnet de commandes, calendrier, gramophone, chat, etc. — tous sauf `QgPorte` et `QgGrandPere`) par un early-return :

```ts
  onTap={() => {
    if (tutoActif) return;
    playClick();
    setCarnetOuvert(true);
  }}
```

Pour `QgPorte` : autorisé seulement aux étapes `aller-chiner` et `preparer-etal` — sinon early-return identique. Ajouter la surbrillance : envelopper `QgPorte` (ou passer une prop `pulse` si le composant rend un unique `<button>` racine, en y appliquant `className={pulse ? "tuto-pulse" : undefined}`) quand `etape === "aller-chiner" || etape === "preparer-etal"`.

- [ ] **Step 3: `PorteSheet` — props tuto**

```ts
interface PorteSheetProps {
  open: boolean;
  onClose: () => void;
  vitrineActive: boolean;
  onChiner: () => void;
  onVitrine: () => void;
  chinerDesactive?: boolean;
  /** Tutoriel : force le choix Chiner (pulse) et désactive Étaler. */
  tutoChiner?: boolean;
  /** Tutoriel : force le choix Étaler (pulse) et désactive Chiner. */
  tutoEtaler?: boolean;
}
```

Dans le rendu : bouton Chiner → `disabled={chinerDesactive || tutoEtaler}` et `className={tutoChiner ? "tuto-pulse" : undefined}` ; bouton Étaler → `disabled={tutoChiner}` et `className={tutoEtaler ? "tuto-pulse" : undefined}`. (Si `FloatingActionButton` n'accepte pas `className`, envelopper chaque bouton d'un `<span className="tuto-pulse" style={{ display: "inline-block", borderRadius: 12 }}>`.)

Au call-site (`layout.tsx`) : `tutoChiner={etape === "aller-chiner"}` `tutoEtaler={etape === "preparer-etal"}`.

- [ ] **Step 4: Vérifier** — Run: `npx tsc --noEmit && npm run test:run && npx eslint src` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(qg)/layout.tsx" src/components/mobile/qg/sheets/PorteSheet.tsx
git commit -m "feat(tutoriel): dialogues auto au bureau + verrouillage QG/porte"
```

---

### Task 10: Câblage tutoriel — chinage

**Files:**
- Modify: `src/app/chiner/page.tsx` (liste réduite pendant le tutoriel)
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx` (dialogues + étapes + pulse Sortir)

**Interfaces:**
- Consumes: `SEQUENCES_TUTORIEL`, `GRAND_PERE_PORTRAITS`, `DialogueOverlay`, `avancerTutoriel`, `tutorielActif`, `nomExpediteur`.
- Produces: pendant le tutoriel, seule `vide-grenier-quartier` est proposée ; l'étape passe `aller-chiner → premier-achat → rentrer`.

- [ ] **Step 1: Liste réduite** — dans `ChinerListePage` (`src/app/chiner/page.tsx`), là où `BrocantePanorama` reçoit `brocantes={BROCANTES}` :

```ts
  const tutoActif = state ? tutorielActif(state) : false;
  const brocantesVisibles = tutoActif
    ? BROCANTES.filter((b) => b.id === "vide-grenier-quartier")
    : BROCANTES;
```

et passer `brocantes={brocantesVisibles}`. (Même pattern réutilisé en Task 11 pour `/vitrine`.)

- [ ] **Step 2: Dialogues de session** — dans `SessionChinePage` (`src/app/chiner/[brocanteId]/ClientPage.tsx`) :

```ts
  const [dialogueTuto, setDialogueTuto] = useState<DialogueSequence | null>(null);
  const etape = state?.tutorielEtape;

  // Entrée de session pendant le tutoriel : le grand-père présente la chine.
  useEffect(() => {
    if (etape === "aller-chiner") {
      setDialogueTuto(SEQUENCES_TUTORIEL.tuto_chine_entree);
    }
  }, [etape]);
```

Rendu (fin du JSX) :

```tsx
    <DialogueOverlay
      sequence={dialogueTuto}
      nom={nomExpediteur("grand-pere", locale)}
      portraits={GRAND_PERE_PORTRAITS}
      onFini={() => {
        setDialogueTuto(null);
        if (etape === "aller-chiner") avancerTutoriel("premier-achat");
        else if (etape === "premier-achat") avancerTutoriel("rentrer");
      }}
    />
```

- [ ] **Step 3: Après le premier achat** — dans `handleAchatAuPrix` (chemin de succès, après la mise à jour du state) :

```ts
    if (etape === "premier-achat") {
      setDialogueTuto(SEQUENCES_TUTORIEL.tuto_achat_fait);
    }
```

(Le `onFini` du Step 2 fait alors avancer vers `"rentrer"`. L'achat conclu par négociation passe aussi par ce chemin — vérifier que `onConclu` aboutit à `handleAchatAuPrix` ; sinon dupliquer la garde au point de succès de la négo.)

- [ ] **Step 4: Pulse sur Sortir** — le bouton Sortir du header bas (`ItemSwipeDeck`, bouton `DoorOpen` → `onQuitter`) : quand `etape === "rentrer"`, appliquer `className="tuto-pulse"`. Si le bouton est rendu dans `ItemSwipeDeck.tsx`, ajouter une prop optionnelle `pulseSortir?: boolean` passée depuis la page (`pulseSortir={etape === "rentrer"}`) et l'appliquer au bouton.

- [ ] **Step 5: Vérifier** — Run: `npx tsc --noEmit && npm run test:run && npx eslint src` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/chiner/ src/components/mobile/chine/ItemSwipeDeck.tsx
git commit -m "feat(tutoriel): chinage guidé (liste réduite, dialogues, premier achat, pulse Sortir)"
```

---

### Task 11: Câblage tutoriel — vente

**Files:**
- Modify: `src/app/vitrine/page.tsx` (liste réduite, même pattern que Task 10 Step 1)
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (dialogues + étapes + pulse Sortir)

**Interfaces:**
- Consumes: identiques à Task 10.
- Produces: l'étape passe `preparer-etal → premiere-vente → conclusion` ; au retour au bureau, Task 9 joue `tuto_conclusion` puis `terminerTutoriel()`.

- [ ] **Step 1: Liste réduite** — dans `VitrineListePage` (`src/app/vitrine/page.tsx`), appliquer le même filtre `vide-grenier-quartier` que Task 10 Step 1 (entrée gratuite : le tutoriel ne coûte que l'énergie).

- [ ] **Step 2: Dialogues de journée** — dans `VitrineJourneePage` (`src/app/vitrine/[brocanteId]/journee/ClientPage.tsx`) :

```ts
  const [dialogueTuto, setDialogueTuto] = useState<DialogueSequence | null>(null);
  const etape = state?.tutorielEtape;

  useEffect(() => {
    if (etape === "preparer-etal") {
      setDialogueTuto(SEQUENCES_TUTORIEL.tuto_vente_entree);
    }
  }, [etape]);
```

Rendu (fin du JSX, au-dessus du header bas `zIndex: 50` — l'overlay est à 120) :

```tsx
    <DialogueOverlay
      sequence={dialogueTuto}
      nom={nomExpediteur("grand-pere", locale)}
      portraits={GRAND_PERE_PORTRAITS}
      onFini={() => {
        setDialogueTuto(null);
        if (etape === "preparer-etal") avancerTutoriel("premiere-vente");
        else if (etape === "premiere-vente") avancerTutoriel("conclusion");
      }}
    />
```

⚠ Le timer de journée ne s'écoule pas quand un client est présent, mais il tourne pendant le dialogue d'entrée — acceptable (dialogue court). Ne pas complexifier.

- [ ] **Step 3: Après la première vente** — aux deux points de succès (`handleAccepterAchatDirect` et `encaisserVente`), après l'encaissement :

```ts
    if (etape === "premiere-vente") {
      setDialogueTuto(SEQUENCES_TUTORIEL.tuto_vente_faite);
    }
```

- [ ] **Step 4: Pulse sur Sortir** — le bouton Sortir du header bas partagé (l.990-1028) : `className={etape === "conclusion" ? "tuto-pulse" : undefined}` (après la première vente, l'étape est déjà `conclusion` — le joueur peut continuer à vendre, le pulse l'invite juste à rentrer).

- [ ] **Step 5: Vérifier** — Run: `npx tsc --noEmit && npm run test:run && npx eslint src` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/vitrine/
git commit -m "feat(tutoriel): vente guidée (première vente, dialogues, pulse Sortir)"
```

---

### Task 12: Assets provisoires + parcours complet au simulateur

**Files:**
- Create: `public/personas/grand-pere/{souriant,emu,songeur,rieur}.webp` (provisoires)
- Create: `public/qg/grand-pere-fauteuil.webp` (provisoire)

- [ ] **Step 1: Assets provisoires** — copier l'avatar existant en attendant les visuels définitifs :

```bash
mkdir -p public/personas/grand-pere
for h in souriant emu songeur rieur; do
  cp public/personas/commanditaires/grand-pere.webp "public/personas/grand-pere/$h.webp"
done
cp public/personas/commanditaires/grand-pere.webp public/qg/grand-pere-fauteuil.webp
```

- [ ] **Step 2: Suite complète + lint** — Run: `npm run test:run && npx tsc --noEmit && npx eslint src` — Expected: PASS.

- [ ] **Step 3: Parcours manuel au simulateur** (`scripts/ios-sim.sh`, cf. workflow habituel) — checklist :

1. Nouvelle partie → intro porte → arrivée bureau → dialogue d'accueil (4 lignes, portraits) → bannière visible, TabBar absente.
2. Objets QG inertes sauf la porte (pulse) ; PorteSheet : Étaler grisé, Chiner pulse.
3. `/chiner` : seule « Vide-grenier du quartier » listée → session : dialogue d'entrée → achat (direct ET via négo sur une 2ᵉ partie) → dialogue « bien joué » → pulse Sortir.
4. Retour bureau : dialogue retour → porte → Étaler (Chiner grisé) → prep → journée : dialogue d'entrée → première vente → dialogue → Sortir pulse → retour bureau → dialogue de conclusion.
5. Après conclusion : TabBar revenue, lettre de Maman dans le courrier (150 €), chapitre 1 dans le carnet, grand-père tapable (phrase d'ambiance, portrait).
6. Bouton « Passer le tutoriel » (double-tap) à l'étape accueil : mêmes effets qu'en 5.
7. Save existante (slot ancien) : aucun tutoriel, rien ne change.
8. Passage EN puis ES dans les réglages : dialogues et bannière traduits.

- [ ] **Step 4: Commit final**

```bash
git add public/personas/grand-pere/ public/qg/grand-pere-fauteuil.webp
git commit -m "chore(assets): visuels provisoires du grand-père (portraits + fauteuil QG)"
```

**Reste à la charge de Guillaume (hors plan, comme pour les vendeurs nommés) :** générer les visuels définitifs — sprite « grand-père dans son fauteuil » pour la scène bureau + 4 portraits d'expressions (souriant, ému, songeur, rieur) — puis les convertir (`npm run gen:webp`) et remplacer les fichiers provisoires ; ajuster les coordonnées `grandPere` de `QG_LAYOUT` au mode édition dev.

---

## Self-Review (fait à la rédaction)

- **Couverture spec §a/b/c** : dialogue (Tasks 3-5), grand-père au QG (Task 8), tutoriel guidé + verrouillage + Passer + lettre de Maman différée (Tasks 1-2, 6-7, 9-11), migration de save (Task 2), i18n (Tasks 4, 7), assets (Task 12). Le badge « ! » est posé (prop `aDialogue`) mais inerte — consommé en SP2 (remise des chapitres en dialogue), conforme au découpage.
- **Cohérence de types** : `TutorielEtape` défini une fois (types/game.ts), `ETAPES_TUTORIEL`/`tutorielActif`/`appliquerFinTutoriel` (lib/tutoriel.ts) consommés partout ; `DialogueOverlay` prend `sequence/nom/portraits/onFini` dans toutes les tâches.
- **Point d'attention exécution** : les ancres de lignes (GameContext l.535-572, journee l.990-1028…) datent du 2026-07-16 — se fier aux symboles cités si les lignes ont bougé.
