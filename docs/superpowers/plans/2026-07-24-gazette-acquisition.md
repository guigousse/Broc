# Refonte acquisition Gazette — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La gazette n'existe qu'après le déblocage d'une première compétence liée ; tuto du grand-père avec première édition offerte (journal au sol devant la porte), puis achat hebdomadaire le lundi via modale, lecture via le journal posé sur le coin du bureau. Le porte-revues disparaît.

**Architecture:** État minimal dérivé (approche A du spec `docs/superpowers/specs/2026-07-24-gazette-acquisition-design.md`) : le déblocage se dérive des compétences (`aAccesGazette`), deux champs additifs en save (`tutoGazette`, `gazetteRefusee`, migration v16), règles de visibilité pures dans `src/lib/gazette.ts`, réutilisation du `DialogueOverlay` existant pour le tuto.

**Tech Stack:** Next.js (App Router), React, TypeScript, vitest (+ @testing-library/react, jsdom), i18n maison FR/EN/ES/EL (FR = source, overlays par locale).

## Global Constraints

- **Jamais de chaîne localisée en save** — les saves ne stockent que des ids/valeurs stables.
- **Champs de save additifs uniquement** (optionnels, défaut au chargement) ; `SAVE_VERSION` passe de 15 à 16.
- FR = langue source des dialogues (`src/data/dialogues.ts`) ; overlays EN/ES/EL dans `src/lib/i18n/contenu/{en,es,el}/dialogues.ts`, **même nombre de lignes** que le FR (test de parité existant).
- Lint : `npm run lint` est cassé (Next 16) → utiliser `npx eslint src`.
- Tests : `npx vitest run <fichier>` (jamais `vitest` en mode watch dans un agent).
- Chemin projet avec espace : toujours quoter `"/Users/guillaume/dev/Projet Broc V2"`.
- Prix de la gazette : `PRIX_GAZETTE = 10` (`src/lib/tendances.ts:7`) — ne pas dupliquer la constante.
- Lundi = `indexJourSemaineReel(jour) === 0` (`src/lib/calendrier.ts:33`).

---

### Task 1: `aAccesGazette` — dérivation du déblocage

**Files:**
- Modify: `src/lib/competences.ts` (après `aConnaisseurChinage`, ~ligne 105)
- Test: `src/lib/competences.aAccesGazette.test.ts` (nouveau)

**Interfaces:**
- Consumes: `TREE_GENERAL` (déjà importé dans competences.ts depuis `@/data/competences`).
- Produces: `aAccesGazette(state: Pick<GameState, "competencesDebloquees">): boolean` — utilisé par les Tasks 3 et 8.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/lib/competences.aAccesGazette.test.ts
import { describe, expect, it } from "vitest";
import { aAccesGazette } from "./competences";

describe("aAccesGazette", () => {
  it("faux sans aucune compétence", () => {
    expect(aAccesGazette({ competencesDebloquees: [] })).toBe(false);
  });

  it("faux avec des compétences sans lien avec la gazette", () => {
    expect(
      aAccesGazette({
        competencesDebloquees: [
          "cat.Musique.reparer.1",
          "general.negociation.1",
          "general.presentation.2",
        ],
      }),
    ).toBe(false);
  });

  it("vrai avec un Veilleur (Connaisseur palier 1, n'importe quelle catégorie)", () => {
    expect(
      aAccesGazette({ competencesDebloquees: ["cat.Musique.connaisseur.1"] }),
    ).toBe(true);
    expect(
      aAccesGazette({ competencesDebloquees: ["cat.Mode.connaisseur.1"] }),
    ).toBe(true);
  });

  it("vrai avec n'importe quel palier de Vision du marché", () => {
    expect(aAccesGazette({ competencesDebloquees: ["general.vision.1"] })).toBe(true);
    expect(aAccesGazette({ competencesDebloquees: ["general.vision.3"] })).toBe(true);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `cd "/Users/guillaume/dev/Projet Broc V2" && npx vitest run src/lib/competences.aAccesGazette.test.ts`
Expected: FAIL — `aAccesGazette` n'est pas exporté.

- [ ] **Step 3: Implémenter**

Dans `src/lib/competences.ts`, après `aConnaisseurChinage` (~ligne 105) :

```ts
/**
 * Vrai dès qu'au moins une compétence liée à la Gazette est débloquée :
 * un « Veilleur » (Connaisseur palier 1, id `cat.<Cat>.connaisseur.1`)
 * ou un palier de « Vision du marché » (`general.vision.*`).
 * Pilote toute la visibilité de la gazette (journal au sol / bureau).
 */
export function aAccesGazette(
  state: Pick<GameState, "competencesDebloquees">,
): boolean {
  return state.competencesDebloquees.some(
    (id) =>
      id.endsWith(".connaisseur.1") ||
      id.startsWith(`${TREE_GENERAL}.vision.`),
  );
}
```

- [ ] **Step 4: Vérifier le pass**

Run: `npx vitest run src/lib/competences.aAccesGazette.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/competences.ts src/lib/competences.aAccesGazette.test.ts
git commit -m "feat(gazette): aAccesGazette — déblocage dérivé des compétences"
```

---

### Task 2: Champs de save additifs + migration v16

**Files:**
- Modify: `src/types/game.ts` (après `miniTutoCarnet?`, ~ligne 379)
- Modify: `src/lib/migrations.ts` (`SAVE_VERSION` ligne 107 ; objet retourné ~ligne 666)
- Modify: `src/context/GameContext.tsx` (état initial `nouvellePartie`, ~ligne 614)
- Test: `src/lib/migrations.test.ts` (ajout d'un describe)

**Interfaces:**
- Produces: `GameState.tutoGazette?: "aFaire" | "faite"` et `GameState.gazetteRefusee?: boolean` — consommés par Tasks 3, 4, 8. Absent ⇒ `"aFaire"` / `false`.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à la fin de `src/lib/migrations.test.ts` :

```ts
describe("migrerSauvegarde — v16 champs gazette", () => {
  it("pose tutoGazette='aFaire' et gazetteRefusee=false sur une save antérieure", () => {
    const fresh = createMockGameState();
    delete (fresh as Partial<GameState>).tutoGazette;
    delete (fresh as Partial<GameState>).gazetteRefusee;
    const migrated = migrerSauvegarde(fresh);
    expect(migrated.tutoGazette).toBe("aFaire");
    expect(migrated.gazetteRefusee).toBe(false);
    expect(migrated.version).toBe(SAVE_VERSION);
  });

  it("préserve tutoGazette='faite' et gazetteRefusee=true déjà en save", () => {
    const fresh = createMockGameState({
      tutoGazette: "faite",
      gazetteRefusee: true,
    });
    const migrated = migrerSauvegarde(fresh);
    expect(migrated.tutoGazette).toBe("faite");
    expect(migrated.gazetteRefusee).toBe(true);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/migrations.test.ts`
Expected: FAIL — TypeScript refuse `tutoGazette` sur `GameState` (champ inexistant), ou assertions en échec.

- [ ] **Step 3: Implémenter**

`src/types/game.ts`, après le bloc `miniTutoCarnet?` (~ligne 379) :

```ts
  /**
   * ADDITIF (v16) : mini-tuto de la Gazette. "aFaire" ou absent = pas encore
   * fait — le journal offert apparaît au sol dès qu'une compétence gazette
   * est débloquée (cf. aAccesGazette) ; "faite" = tuto terminé, cycle
   * hebdomadaire d'achat actif.
   */
  tutoGazette?: "aFaire" | "faite";
  /**
   * ADDITIF (v16) : édition de la semaine refusée (lundi). Reset à false au
   * refresh hebdo de la Gazette. Absent = false.
   */
  gazetteRefusee?: boolean;
```

`src/lib/migrations.ts` ligne 107 :

```ts
export const SAVE_VERSION = 16;
```

Dans l'objet retourné par `migrerSauvegarde` (juste après `gazetteAchetee: loaded.gazetteAchetee ?? false,` ~ligne 666) :

```ts
    // v16 — circuit d'acquisition de la gazette (tuto + achat du lundi).
    tutoGazette: (loaded as Partial<GameState>).tutoGazette ?? "aFaire",
    gazetteRefusee: (loaded as Partial<GameState>).gazetteRefusee ?? false,
```

`src/context/GameContext.tsx`, état initial de `nouvellePartie` (juste après `gazetteAchetee: false,` ~ligne 614) :

```ts
      tutoGazette: "aFaire",
      gazetteRefusee: false,
```

- [ ] **Step 4: Vérifier le pass**

Run: `npx vitest run src/lib/migrations.test.ts`
Expected: PASS (tous les tests du fichier, anciens inclus).

- [ ] **Step 5: Commit**

```bash
git add src/types/game.ts src/lib/migrations.ts src/context/GameContext.tsx src/lib/migrations.test.ts
git commit -m "feat(gazette): champs additifs tutoGazette/gazetteRefusee + migration v16"
```

---

### Task 3: `journalSolMode` — règles de visibilité pures

**Files:**
- Create: `src/lib/gazette.ts`
- Test: `src/lib/gazette.test.ts`

**Interfaces:**
- Consumes: `aAccesGazette` (Task 1), `indexJourSemaineReel` (`@/lib/calendrier`), champs Task 2.
- Produces: `journalSolMode(state): "tuto" | "achat" | null` — consommé par Task 8. `INITIAL_JOUR` n'est pas nécessaire : les tests passent des jours calculés.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/lib/gazette.test.ts
import { describe, expect, it } from "vitest";
import { journalSolMode } from "./gazette";
import { indexJourSemaineReel } from "./calendrier";

/** Premier jour de jeu ≥ 1 qui tombe un lundi / mardi. */
function jour(idxSemaine: number): number {
  for (let j = 1; j < 15; j++) {
    if (indexJourSemaineReel(j) === idxSemaine) return j;
  }
  throw new Error("introuvable");
}
const LUNDI = jour(0);
const MARDI = jour(1);

const base = {
  competencesDebloquees: ["cat.Musique.connaisseur.1"],
  tutoGazette: "faite" as const,
  gazetteAchetee: false,
  gazetteRefusee: false,
  jourActuel: LUNDI,
};

describe("journalSolMode", () => {
  it("null tant qu'aucune compétence gazette n'est débloquée", () => {
    expect(journalSolMode({ ...base, competencesDebloquees: [] })).toBe(null);
    expect(
      journalSolMode({
        ...base,
        competencesDebloquees: [],
        tutoGazette: "aFaire",
      }),
    ).toBe(null);
  });

  it("mode tuto dès le déblocage, quel que soit le jour, tant que le tuto n'est pas fait", () => {
    expect(journalSolMode({ ...base, tutoGazette: "aFaire", jourActuel: MARDI })).toBe("tuto");
    expect(journalSolMode({ ...base, tutoGazette: undefined, jourActuel: MARDI })).toBe("tuto");
  });

  it("mode tuto prioritaire même un lundi", () => {
    expect(journalSolMode({ ...base, tutoGazette: "aFaire" })).toBe("tuto");
  });

  it("mode achat le lundi, tuto fait, ni achetée ni refusée", () => {
    expect(journalSolMode(base)).toBe("achat");
  });

  it("null le lundi si édition déjà achetée", () => {
    expect(journalSolMode({ ...base, gazetteAchetee: true })).toBe(null);
  });

  it("null le lundi si édition refusée", () => {
    expect(journalSolMode({ ...base, gazetteRefusee: true })).toBe(null);
  });

  it("null le mardi (édition manquée, disparition automatique)", () => {
    expect(journalSolMode({ ...base, jourActuel: MARDI })).toBe(null);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/gazette.test.ts`
Expected: FAIL — module `./gazette` introuvable.

- [ ] **Step 3: Implémenter**

```ts
// src/lib/gazette.ts
import { indexJourSemaineReel } from "@/lib/calendrier";
import { aAccesGazette } from "@/lib/competences";
import type { GameState } from "@/types/game";

export type JournalSolMode = "tuto" | "achat" | null;

type EtatGazette = Pick<
  GameState,
  | "competencesDebloquees"
  | "tutoGazette"
  | "gazetteAchetee"
  | "gazetteRefusee"
  | "jourActuel"
>;

/**
 * Mode du journal enroulé au sol devant la porte (spec 2026-07-24) :
 * - "tuto" : première compétence gazette débloquée, tuto pas encore fait —
 *   journal offert, visible tous les jours jusqu'au tap.
 * - "achat" : tuto fait, lundi, édition ni achetée ni refusée — le mardi la
 *   condition tombe d'elle-même (édition manquée).
 * - null : rien à afficher.
 */
export function journalSolMode(state: EtatGazette): JournalSolMode {
  if (!aAccesGazette(state)) return null;
  if ((state.tutoGazette ?? "aFaire") === "aFaire") return "tuto";
  const lundi = indexJourSemaineReel(state.jourActuel) === 0;
  if (lundi && !state.gazetteAchetee && !(state.gazetteRefusee ?? false)) {
    return "achat";
  }
  return null;
}
```

- [ ] **Step 4: Vérifier le pass**

Run: `npx vitest run src/lib/gazette.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/gazette.ts src/lib/gazette.test.ts
git commit -m "feat(gazette): journalSolMode — règles de visibilité tuto/lundi"
```

---

### Task 4: Actions GameContext + reset hebdo

**Files:**
- Modify: `src/context/GameContext.tsx`
- Test: `src/context/GameContext.gazette.test.tsx` (nouveau)

**Interfaces:**
- Produces (dans le type du contexte, ~ligne 244 près de `acheterGazette`) :
  - `ouvrirGazetteOfferte: () => void` — marque `gazetteAchetee = true` SANS débit ni ligne au grand livre.
  - `terminerTutoGazette: () => void` — `tutoGazette = "faite"`.
  - `refuserGazette: () => void` — `gazetteRefusee = true`.
- Reset hebdo : `gazetteRefusee` remis à `false` au refresh (même endroit que `gazetteAchetee`, GameContext ~ligne 722).
- `acheterGazette` existant inchangé (réutilisé par la modale du lundi).

- [ ] **Step 1: Écrire le test qui échoue**

```tsx
// src/context/GameContext.gazette.test.tsx
// @vitest-environment jsdom
/**
 * Actions du circuit gazette (spec 2026-07-24) : gazette offerte sans débit
 * ni grand livre, fin de tuto, refus du lundi, et reset hebdo de
 * gazetteRefusee au refresh de la Gazette.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

async function setupNouvellePartie() {
  const { result } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(() => expect(result.current.state).not.toBeNull());
  return result;
}

describe("GameContext — circuit gazette", () => {
  it("nouvelle partie : tutoGazette='aFaire', gazetteRefusee=false", async () => {
    const result = await setupNouvellePartie();
    expect(result.current.state!.tutoGazette).toBe("aFaire");
    expect(result.current.state!.gazetteRefusee).toBe(false);
  });

  it("ouvrirGazetteOfferte : achetée SANS débit ni ligne au grand livre", async () => {
    const result = await setupNouvellePartie();
    const budgetAvant = result.current.state!.budget;
    const nbLignesAvant = result.current.state!.grandLivre.length;
    act(() => {
      result.current.ouvrirGazetteOfferte();
    });
    expect(result.current.state!.gazetteAchetee).toBe(true);
    expect(result.current.state!.budget).toBe(budgetAvant);
    expect(result.current.state!.grandLivre.length).toBe(nbLignesAvant);
  });

  it("terminerTutoGazette : tutoGazette passe à 'faite'", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.terminerTutoGazette();
    });
    expect(result.current.state!.tutoGazette).toBe("faite");
  });

  it("refuserGazette : gazetteRefusee=true, puis reset au refresh hebdo", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.refuserGazette();
    });
    expect(result.current.state!.gazetteRefusee).toBe(true);
    // Avance jusqu'au-delà du prochain refresh (aligné lundi, ≤ 8 jours).
    act(() => {
      result.current.avancerJour(8);
    });
    expect(result.current.state!.gazetteRefusee).toBe(false);
    // Le refresh remet aussi l'édition « non achetée » (comportement existant).
    expect(result.current.state!.gazetteAchetee).toBe(false);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/context/GameContext.gazette.test.tsx`
Expected: FAIL — `ouvrirGazetteOfferte` n'existe pas sur le contexte.

- [ ] **Step 3: Implémenter**

Dans `src/context/GameContext.tsx` :

1. Type du contexte (~ligne 244, à côté de `acheterGazette`) :

```ts
  /** Gazette offerte par le grand-père (tuto) : marque l'édition achetée sans débit. */
  ouvrirGazetteOfferte: () => void;
  /** Fin du mini-tuto gazette (fermeture de la sheet guidée). */
  terminerTutoGazette: () => void;
  /** Refus explicite de l'édition du lundi. */
  refuserGazette: () => void;
```

2. Reset hebdo (~ligne 722, dans le state `base` de `avancerJour`, juste après `gazetteAchetee`) :

```ts
        gazetteAchetee: refresh ? false : prev.gazetteAchetee,
        gazetteRefusee: refresh ? false : (prev.gazetteRefusee ?? false),
```

3. Callbacks (près de `acheterGazette`, ~ligne 1776) :

```ts
  const ouvrirGazetteOfferte = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.gazetteAchetee) return prev;
      return { ...prev, gazetteAchetee: true };
    });
  }, []);

  const terminerTutoGazette = useCallback(() => {
    setState((prev) =>
      prev && prev.tutoGazette !== "faite"
        ? { ...prev, tutoGazette: "faite" }
        : prev,
    );
  }, []);

  const refuserGazette = useCallback(() => {
    setState((prev) =>
      prev && !prev.gazetteRefusee ? { ...prev, gazetteRefusee: true } : prev,
    );
  }, []);
```

4. Les exposer dans le `useMemo` de la valeur du contexte (deux listes, ~lignes 1868 et 1924, à côté de `acheterGazette`) :

```ts
      ouvrirGazetteOfferte,
      terminerTutoGazette,
      refuserGazette,
```

- [ ] **Step 4: Vérifier le pass**

Run: `npx vitest run src/context/GameContext.gazette.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/context/GameContext.tsx src/context/GameContext.gazette.test.tsx
git commit -m "feat(gazette): actions offerte/tuto/refus + reset hebdo gazetteRefusee"
```

---

### Task 5: Dialogue du tuto (FR + overlays EN/ES/EL)

**Files:**
- Modify: `src/data/dialogues.ts`
- Modify: `src/lib/i18n/contenu/en/dialogues.ts`, `src/lib/i18n/contenu/es/dialogues.ts`, `src/lib/i18n/contenu/el/dialogues.ts`
- Test: filet existant `src/lib/i18n/contenu/dialogues.test.ts` (parité des lignes — ne pas modifier, il doit passer).

**Interfaces:**
- Produces: `SEQUENCES_GAZETTE.gazette_tuto: DialogueSequence` (id `"gazette_tuto"`, 6 lignes) — consommé par Task 8. Enregistré dans `TOUTES_SEQUENCES`.

- [ ] **Step 1: Ajouter la séquence FR**

Dans `src/data/dialogues.ts`, après `SEQUENCES_ANNIVERSAIRE` :

```ts
/** Mini-tuto de la Gazette : première édition offerte par le grand-père. */
export const SEQUENCES_GAZETTE: Record<string, DialogueSequence> = {
  gazette_tuto: {
    id: "gazette_tuto",
    lignes: [
      { humeur: "souriant", texte: "Ah, tu l'as trouvée ! La Gazette des Chineurs — cinquante ans que je la lis chaque lundi. Celle-ci, c'est moi qui te l'offre." },
      { humeur: "songeur", texte: "Regarde la rubrique des tendances : elle te dit quelles catégories ont la cote cette semaine. Plus tu deviens connaisseur, plus elle t'en révèle." },
      { humeur: "souriant", texte: "Le bulletin météo, lui, annonce le temps sur les brocantes — et l'affluence qui va avec. Il se lira avec la compétence « Bulletin météo »." },
      { humeur: "songeur", texte: "Le carnet mondain murmure quelle célébrité visitera quelle brocante… Des affaires en or — pour qui a la compétence « Carnet mondain »." },
      { humeur: "rieur", texte: "Et avec de l'« Influence », tu pourras même faire réécrire un article qui ne te plaît pas. Ah, la presse…" },
      { humeur: "souriant", texte: "Dès lundi prochain, le kiosque la déposera devant la porte. Quelques pièces bien investies, crois-moi. Je pose celle-ci sur le coin du bureau." },
    ],
  },
};
```

Et enregistrer dans `TOUTES_SEQUENCES` :

```ts
export const TOUTES_SEQUENCES: DialogueSequence[] = [
  ...Object.values(SEQUENCES_TUTORIEL),
  ...Object.values(SEQUENCES_ANNIVERSAIRE),
  ...Object.values(SEQUENCES_GAZETTE),
];
```

- [ ] **Step 2: Vérifier l'échec du filet de parité**

Run: `npx vitest run src/lib/i18n/contenu/dialogues.test.ts`
Expected: FAIL — la clé `gazette_tuto` manque dans les overlays EN/ES/EL.

- [ ] **Step 3: Ajouter les overlays (6 lignes chacun, même ordre)**

`src/lib/i18n/contenu/en/dialogues.ts` — ajouter dans `DIALOGUES_EN` :

```ts
  gazette_tuto: [
    "Ah, you found it! The Bargain Hunters' Gazette — fifty years I've read it every Monday. This one's on me.",
    "Look at the trends column: it tells you which categories are hot this week. The more of a connoisseur you become, the more it reveals.",
    "The weather bulletin announces the weather at the flea markets — and the crowds that come with it. You'll read it with the “Weather bulletin” skill.",
    "The society column whispers which celebrity will visit which market… Golden deals — for those with the “Society column” skill.",
    "And with some “Influence”, you can even have an article you don't like rewritten. Ah, the press…",
    "From next Monday, the kiosk will drop it at your door. A few coins well spent, believe me. I'll leave this one on the corner of the desk.",
  ],
```

`src/lib/i18n/contenu/es/dialogues.ts` — ajouter dans le record ES (même nom de constante que les clés existantes du fichier) :

```ts
  gazette_tuto: [
    "¡Ah, la has encontrado! La Gaceta de los Chamarileros — cincuenta años leyéndola cada lunes. Esta te la regalo yo.",
    "Mira la sección de tendencias: te dice qué categorías están de moda esta semana. Cuanto más entendido seas, más te revela.",
    "El boletín del tiempo anuncia el clima en los mercadillos — y la afluencia que trae consigo. Lo leerás con la habilidad «Boletín del tiempo».",
    "La crónica de sociedad susurra qué celebridad visitará qué mercadillo… Negocios de oro — para quien tiene «Crónica de sociedad».",
    "Y con algo de «Influencia», hasta podrás hacer reescribir un artículo que no te guste. Ay, la prensa…",
    "Desde el próximo lunes, el quiosco la dejará ante tu puerta. Unas monedas bien invertidas, créeme. Esta la dejo en la esquina del escritorio.",
  ],
```

`src/lib/i18n/contenu/el/dialogues.ts` — ajouter dans le record EL :

```ts
  gazette_tuto: [
    "Α, τη βρήκες! Η Γκαζέτα των Παλαιοπωλών — πενήντα χρόνια τη διαβάζω κάθε Δευτέρα. Αυτή είναι δώρο μου.",
    "Κοίτα τη στήλη με τις τάσεις: σου λέει ποιες κατηγορίες έχουν πέραση αυτή την εβδομάδα. Όσο πιο γνώστης γίνεσαι, τόσα περισσότερα σου αποκαλύπτει.",
    "Το δελτίο καιρού προαναγγέλλει τον καιρό στα παζάρια — και την κοσμοσυρροή που φέρνει. Θα το διαβάζεις με τη δεξιότητα «Δελτίο καιρού».",
    "Η κοσμική στήλη ψιθυρίζει ποια διασημότητα θα επισκεφθεί ποιο παζάρι… Χρυσές δουλειές — για όποιον έχει την «Κοσμική στήλη».",
    "Και με λίγη «Επιρροή», θα μπορείς ακόμη και να βάλεις να ξαναγράψουν ένα άρθρο που δεν σου αρέσει. Αχ, ο Τύπος…",
    "Από την ερχόμενη Δευτέρα, το περίπτερο θα την αφήνει μπροστά στην πόρτα σου. Λίγα νομίσματα καλά επενδυμένα, πίστεψέ με. Αυτήν την αφήνω στη γωνία του γραφείου.",
  ],
```

**Attention** : avant d'insérer, vérifier dans chaque fichier les intitulés déjà traduits des compétences (« Bulletin météo », « Carnet mondain », « Influence ») via `grep -n "vision" src/lib/i18n/contenu/{en,es,el}/competences.ts` et aligner les noms cités dans les dialogues sur ces traductions existantes.

- [ ] **Step 4: Vérifier le pass**

Run: `npx vitest run src/lib/i18n/contenu/dialogues.test.ts src/data/dialogues.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/dialogues.ts src/lib/i18n/contenu/en/dialogues.ts src/lib/i18n/contenu/es/dialogues.ts src/lib/i18n/contenu/el/dialogues.ts
git commit -m "feat(gazette): dialogue du tuto gazette_tuto (FR + EN/ES/EL)"
```

---

### Task 6: Composants — journaux + modale d'achat + i18n UI

**Files:**
- Create: `src/components/mobile/qg/QgJournalSol.tsx`
- Create: `src/components/mobile/qg/QgJournalBureau.tsx`
- Create: `src/components/mobile/qg/GazetteAchatModale.tsx`
- Modify: `src/components/mobile/qg/layout.ts` (2 entrées de coordonnées)
- Modify: `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts`, `el.ts` (clés `qg.*`)

**Interfaces:**
- Consumes: `useQgObjetStyle` (`./QgScene`), `useLangue`, asset `/qg/journal.webp` (existant).
- Produces (consommés par Task 8) :
  - `QgJournalSol({ mode: "tuto" | "achat", onTap: () => void })`
  - `QgJournalBureau({ onTap: () => void })`
  - `GazetteAchatModale({ open, prix, budget, onAcheter, onRefuser, onClose }: { open: boolean; prix: number; budget: number; onAcheter: () => void; onRefuser: () => void; onClose: () => void })`
  - Clés layout `journalSol`, `journalBureau` ; l'entrée `porteRevues` RESTE (le composant non monté doit compiler).

- [ ] **Step 1: Coordonnées layout**

Dans `src/components/mobile/qg/layout.ts`, à côté de `porteRevues` (~ligne 29), ajouter :

```ts
    journalSol: { left: 138.0, bottom: 10.0, width: 14.0 },
    journalBureau: { left: 16.4, bottom: 8.2, width: 21.9 },
```

(`journalBureau` = coordonnées de l'ancien `QgJournal`, cf. `git show df0bf00^:src/components/mobile/qg/layout.ts`. `journalSol` = au pied de la porte, gabarit ajustable ensuite via le mode édition QG.)

- [ ] **Step 2: Clés i18n**

`src/lib/i18n/ui/fr.ts`, dans le bloc `qg:` (après `porteRevuesAcheter`, ~ligne 143) :

```ts
    journalSolOffert: "Journal offert par Grand-père",
    journalSolAcheter: "La Gazette du lundi — acheter ou refuser",
    journalBureauLire: "Journal — lire la Gazette",
    gazetteModaleTitre: "La Gazette des Chineurs",
    gazetteModaleTexte: "L'édition de la semaine vient de paraître.",
    gazetteModaleRefuser: "Refuser",
    gazetteModaleBudget: "Pas assez de pièces",
```

Mêmes clés dans `en.ts` :

```ts
    journalSolOffert: "Newspaper — a gift from Grandpa",
    journalSolAcheter: "Monday's Gazette — buy or decline",
    journalBureauLire: "Newspaper — read the Gazette",
    gazetteModaleTitre: "The Bargain Hunters' Gazette",
    gazetteModaleTexte: "This week's edition is hot off the press.",
    gazetteModaleRefuser: "Decline",
    gazetteModaleBudget: "Not enough coins",
```

`es.ts` :

```ts
    journalSolOffert: "Periódico — regalo del abuelo",
    journalSolAcheter: "La Gaceta del lunes — comprar o rechazar",
    journalBureauLire: "Periódico — leer la Gaceta",
    gazetteModaleTitre: "La Gaceta de los Chamarileros",
    gazetteModaleTexte: "La edición de la semana acaba de salir.",
    gazetteModaleRefuser: "Rechazar",
    gazetteModaleBudget: "No hay monedas suficientes",
```

`el.ts` :

```ts
    journalSolOffert: "Εφημερίδα — δώρο του παππού",
    journalSolAcheter: "Η Γκαζέτα της Δευτέρας — αγορά ή άρνηση",
    journalBureauLire: "Εφημερίδα — διαβάστε τη Γκαζέτα",
    gazetteModaleTitre: "Η Γκαζέτα των Παλαιοπωλών",
    gazetteModaleTexte: "Η έκδοση της εβδομάδας μόλις κυκλοφόρησε.",
    gazetteModaleRefuser: "Άρνηση",
    gazetteModaleBudget: "Δεν έχεις αρκετά νομίσματα",
```

**Attention** : vérifier le nom déjà traduit de la Gazette dans chaque langue (`grep -in "gazette\|gaceta\|γκαζ" src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts src/lib/i18n/ui/el.ts`) et aligner `gazetteModaleTitre` dessus. Le bouton Acheter de la modale réutilise la clé existante `d.sheets.acheterGazette` (avec `{prix}`) — ne pas créer de doublon.

- [ ] **Step 3: `QgJournalSol`**

```tsx
// src/components/mobile/qg/QgJournalSol.tsx
"use client";

import { useLangue } from "@/lib/i18n/LangueContext";
import { useQgObjetStyle } from "./QgScene";

/**
 * Journal enroulé au sol devant la porte.
 * - mode "tuto" : première édition offerte par le grand-père (tap → sheet guidée).
 * - mode "achat" : édition du lundi (tap → modale acheter/refuser).
 */
export function QgJournalSol({
  mode,
  onTap,
}: {
  mode: "tuto" | "achat";
  onTap: () => void;
}) {
  const style = useQgObjetStyle("journalSol");
  const { d } = useLangue();
  const label = mode === "tuto" ? d.qg.journalSolOffert : d.qg.journalSolAcheter;
  return (
    <button type="button" onClick={onTap} aria-label={label} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/qg/journal.webp"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </button>
  );
}
```

- [ ] **Step 4: `QgJournalBureau`**

```tsx
// src/components/mobile/qg/QgJournalBureau.tsx
"use client";

import { useLangue } from "@/lib/i18n/LangueContext";
import { useQgObjetStyle } from "./QgScene";

/**
 * Journal posé sur le coin du bureau — visible seulement quand l'édition de
 * la semaine est achetée (ou offerte). Tap → relire la Gazette.
 * (Restauration de l'ancien QgJournal retiré par df0bf00.)
 */
export function QgJournalBureau({ onTap }: { onTap: () => void }) {
  const style = useQgObjetStyle("journalBureau");
  const { d } = useLangue();
  return (
    <button type="button" onClick={onTap} aria-label={d.qg.journalBureauLire} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/qg/journal.webp"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </button>
  );
}
```

- [ ] **Step 5: `GazetteAchatModale`**

```tsx
// src/components/mobile/qg/GazetteAchatModale.tsx
"use client";

import { type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLangue } from "@/lib/i18n/LangueContext";

interface GazetteAchatModaleProps {
  open: boolean;
  prix: number;
  budget: number;
  onAcheter: () => void;
  onRefuser: () => void;
  /** Tap sur le fond : referme sans refuser (le journal reste au sol). */
  onClose: () => void;
}

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 120,
  background: "rgba(15, 30, 22, 0.45)",
  display: "grid",
  placeItems: "center",
  padding: 24,
};

const carte: CSSProperties = {
  width: "100%",
  maxWidth: 320,
  padding: "18px 18px 14px",
  borderRadius: 14,
  background: "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  border: "1px solid #b89c5e",
  boxShadow: "inset 0 0 28px rgba(120,90,40,0.18), 0 6px 16px rgba(0,0,0,0.35)",
  textAlign: "center",
};

const titre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 18,
  color: "#3a2f1e",
  margin: "0 0 6px",
};

const texte: CSSProperties = {
  fontFamily: "var(--font-handwriting)",
  fontSize: 17,
  lineHeight: 1.35,
  color: "#3a2f1e",
  margin: "0 0 14px",
};

const rangeeBoutons: CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "center",
};

const bouton: CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #b89c5e",
  fontFamily: "var(--font-display)",
  fontSize: 14,
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

export function GazetteAchatModale({
  open,
  prix,
  budget,
  onAcheter,
  onRefuser,
  onClose,
}: GazetteAchatModaleProps) {
  const { d, tr } = useLangue();
  if (!open || typeof document === "undefined") return null;
  const insuffisant = budget < prix;
  return createPortal(
    <div style={scrim} onClick={onClose} role="dialog" aria-modal="true">
      <div style={carte} onClick={(e) => e.stopPropagation()}>
        <h2 style={titre}>{d.qg.gazetteModaleTitre}</h2>
        <p style={texte}>{d.qg.gazetteModaleTexte}</p>
        <div style={rangeeBoutons}>
          <button
            type="button"
            style={{
              ...bouton,
              background: insuffisant ? "#cbbc95" : "#2c5e3f",
              color: insuffisant ? "#8a7a55" : "#f4e9cd",
              cursor: insuffisant ? "not-allowed" : "pointer",
            }}
            disabled={insuffisant}
            onClick={onAcheter}
          >
            {tr(d.sheets.acheterGazette, { prix })}
          </button>
          <button
            type="button"
            style={{ ...bouton, background: "#e7d6a8", color: "#6e1f1f" }}
            onClick={onRefuser}
          >
            {d.qg.gazetteModaleRefuser}
          </button>
        </div>
        {insuffisant && (
          <p style={{ ...texte, margin: "10px 0 0", color: "#7a2e1d" }}>
            {d.qg.gazetteModaleBudget}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
```

Note : vérifier la signature de `tr` (`grep -n "tr(" src/components/mobile/GazetteSheet.tsx | head -3`) — si les params sont des strings, passer `{ prix: String(prix) }`.

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint src/components/mobile/qg/QgJournalSol.tsx src/components/mobile/qg/QgJournalBureau.tsx src/components/mobile/qg/GazetteAchatModale.tsx`
Expected: aucune erreur. (Le type des dictionnaires dérive de `fr.ts` — les 4 fichiers doivent avoir les mêmes clés, sinon tsc échoue.)

- [ ] **Step 7: Commit**

```bash
git add src/components/mobile/qg/QgJournalSol.tsx src/components/mobile/qg/QgJournalBureau.tsx src/components/mobile/qg/GazetteAchatModale.tsx src/components/mobile/qg/layout.ts src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts src/lib/i18n/ui/el.ts
git commit -m "feat(gazette): composants journal sol/bureau + modale d'achat + i18n"
```

---

### Task 7: GazetteSheet — retrait du mode « à acheter »

**Files:**
- Modify: `src/components/mobile/GazetteSheet.tsx`
- Modify: `src/app/(qg)/layout.tsx` (l'unique appelant, ~ligne 739)

**Interfaces:**
- Produces: `GazetteSheetProps` SANS `achetee`, `onAcheter`, `budget`, `prixGazette`. Le contenu n'est plus jamais flouté. La prop `influenceDisponible` reste : conserver telle quelle son expression côté appelant (`aGenInfluence(state) && !state.influenceUtilisee && state.gazetteAchetee`) — le facteur `state.gazetteAchetee` y est inoffensif. Ne toucher qu'aux 4 props supprimées.

- [ ] **Step 1: Simplifier la sheet**

Dans `src/components/mobile/GazetteSheet.tsx` :

1. Retirer de `GazetteSheetProps` (~lignes 51-54) : `achetee: boolean;`, `onAcheter: () => void;`, `budget: number;`, `prixGazette: number;`.
2. Retirer ces 4 clés de la déstructuration (~lignes 332-335).
3. Supprimer `lockedBlur` (~lignes 364-367) et retirer `...lockedBlur` du style du contenu (~ligne 399).
4. Supprimer tout le bloc `{!achetee && ( ... )}` (~lignes 595-630, bouton d'achat + gestion budget insuffisant).

- [ ] **Step 2: Adapter l'appelant**

Dans `src/app/(qg)/layout.tsx` (~lignes 739-763), retirer les props `achetee={state.gazetteAchetee}`, `onAcheter={() => acheterGazette()}`, `budget={state.budget}`, `prixGazette={PRIX_GAZETTE}` de `<GazetteSheet …>`. Garder l'import `PRIX_GAZETTE` (réutilisé Task 8 par la modale) ; si tsc signale un import inutilisé à ce stade, le laisser — Task 8 le consomme.

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest run src/components/mobile`
Expected: aucune erreur tsc, tests verts (aucun test existant ne référence GazetteSheet).

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/GazetteSheet.tsx "src/app/(qg)/layout.tsx"
git commit -m "refactor(gazette): GazetteSheet en lecture seule (mode achat retiré)"
```

---

### Task 8: Câblage panorama — journaux, modale, flux tuto

**Files:**
- Modify: `src/app/(qg)/layout.tsx`

**Interfaces:**
- Consumes: `journalSolMode` (Task 3), actions Task 4, `SEQUENCES_GAZETTE` (Task 5), composants Task 6, `PRIX_GAZETTE`, `playNewspaper` (déjà importé), `setDialogueQg`/`dialogueQg` (état existant), `acheterGazette` (existant).

- [ ] **Step 1: Imports et état**

Dans `src/app/(qg)/layout.tsx` :

1. Imports : remplacer l'import de `QgPorteRevues` par :

```ts
import { QgJournalSol } from "@/components/mobile/qg/QgJournalSol";
import { QgJournalBureau } from "@/components/mobile/qg/QgJournalBureau";
import { GazetteAchatModale } from "@/components/mobile/qg/GazetteAchatModale";
import { journalSolMode } from "@/lib/gazette";
```

et ajouter `SEQUENCES_GAZETTE` à l'import existant de `@/data/dialogues` (~ligne 68). Récupérer `ouvrirGazetteOfferte`, `terminerTutoGazette`, `refuserGazette` dans la déstructuration de `useGame()` (~ligne 104, à côté d'`acheterGazette`).

2. État local (près de `const [gazetteOuverte, setGazetteOuverte] = useState(false);`, ~ligne 139) :

```ts
  const [gazetteModaleOuverte, setGazetteModaleOuverte] = useState(false);
  const [tutoGazetteEnCours, setTutoGazetteEnCours] = useState(false);
```

3. Dérivation (après `const tutoActif = tutorielActif(state);`, ~ligne 431) :

```ts
  const modeJournalSol = journalSolMode(state);
```

- [ ] **Step 2: Rendu des objets du panorama**

1. Supprimer le bloc `<QgPorteRevues …/>` (~lignes 529-536).
2. Zone 1 (bloc `showQgZone(1)`, après `<QgPorte …/>`) :

```tsx
                {modeJournalSol && (
                  <QgJournalSol
                    mode={modeJournalSol}
                    onTap={() => {
                      if (tutoActif) return;
                      playNewspaper();
                      if (modeJournalSol === "tuto") {
                        ouvrirGazetteOfferte();
                        setTutoGazetteEnCours(true);
                        setGazetteOuverte(true);
                        setDialogueQg(SEQUENCES_GAZETTE.gazette_tuto);
                      } else {
                        setGazetteModaleOuverte(true);
                      }
                    }}
                  />
                )}
```

3. Zone 0 (bloc `showQgZone(0)`, après `<QgCarnet …/>`) :

```tsx
                {state.gazetteAchetee && (
                  <QgJournalBureau
                    onTap={() => {
                      if (tutoActif) return;
                      playNewspaper();
                      setGazetteOuverte(true);
                    }}
                  />
                )}
```

- [ ] **Step 3: Fermeture guidée de la sheet + modale**

1. `onClose` de `<GazetteSheet …>` (~ligne 741) devient :

```tsx
        onClose={() => {
          // Tuto en cours : le DialogueOverlay (z-index 120) couvre déjà la
          // sheet ; ce garde bloque aussi la fermeture par Escape.
          if (dialogueQg) return;
          if (tutoGazetteEnCours) {
            setTutoGazetteEnCours(false);
            terminerTutoGazette();
          }
          setGazetteOuverte(false);
        }}
```

2. Monter la modale (à côté des autres sheets, après `<GazetteSheet …/>`) :

```tsx
      <GazetteAchatModale
        open={gazetteModaleOuverte}
        prix={PRIX_GAZETTE}
        budget={state.budget}
        onAcheter={() => {
          const res = acheterGazette();
          setGazetteModaleOuverte(false);
          if (res.ok) {
            playNewspaper();
            setGazetteOuverte(true);
          }
        }}
        onRefuser={() => {
          refuserGazette();
          setGazetteModaleOuverte(false);
        }}
        onClose={() => setGazetteModaleOuverte(false)}
      />
```

3. `onFini` du `DialogueOverlay` (~ligne 817) : aucune branche à ajouter — `setDialogueQg(null)` suffit pour `gazette_tuto` (ni chapitre, ni étape de tutoriel) ; `terminerTutoGazette` est déclenché par la fermeture de la sheet. Vérifier que les branches existantes ne matchent pas (`dialogueChapitreId` null, `etape === "termine"`).

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "src/app/(qg)/layout.tsx" && npx vitest run src`
Expected: tsc et eslint sans erreur ; suite complète verte.

- [ ] **Step 5: Vérification visuelle (dev)**

Run: `npm run dev` puis ouvrir `http://localhost:3000/bureau`. Avec une save de dev, débloquer `cat.Musique.connaisseur.1` (arbre de compétences) → retour panorama : journal au sol devant la porte → tap : sheet + 6 bulles du grand-père → fermeture : journal sur le coin du bureau. Ajuster `journalSol` dans `layout.ts` si le placement jure (mode édition QG disponible).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(qg)/layout.tsx" src/components/mobile/qg/layout.ts
git commit -m "feat(gazette): câblage panorama — journal sol/bureau, modale lundi, tuto"
```

---

### Task 9: Vérifications finales

**Files:**
- Aucun nouveau fichier — passe de vérification.

- [ ] **Step 1: Suite complète + lint + types**

Run:
```bash
cd "/Users/guillaume/dev/Projet Broc V2"
npx vitest run
npx tsc --noEmit -p tsconfig.json
npx eslint src
```
Expected: tout vert. Corriger inline le cas échéant.

- [ ] **Step 2: Couverture du spec**

Relire `docs/superpowers/specs/2026-07-24-gazette-acquisition-design.md` et vérifier point par point : déclencheur (Task 1), absence avant déblocage + porte-revues retiré (Tasks 3, 8), refus/ignoré lundi (Tasks 3, 4, 8), bureau seulement si achetée (Task 8), modale (Tasks 6, 8), teaser toutes sections (Task 5), offerte sans débit ni grand livre (Task 4), migration v16 (Task 2), i18n 4 langues (Tasks 5, 6).

- [ ] **Step 3: Commit final (si corrections)**

```bash
git add -A && git commit -m "chore(gazette): corrections passe finale"
```
