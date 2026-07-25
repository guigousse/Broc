# Bilan de chinage — cérémonie de fin de session : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer l'écran de fin de session de chinage en une cérémonie jouée dans la session : les objets achetés s'envolent un à un vers le stockage, puis le décompte d'expérience part rejoindre la barre de niveau, qui ne progresse qu'à ce moment-là.

**Architecture:** Un calque `BilanSession` remplace le deck d'objets à l'intérieur de la page de session (les deux headers et le fond de brocante flouté restent en place). Le minutage de la cérémonie est extrait en fonction pure testable ; les vols réutilisent `flyToTab()` déjà en place. La barre XP du header est gelée sur un instantané pendant toute la session via un petit store de module, et dégelée à l'atterrissage de la pastille — l'XP réelle, elle, continue d'être créditée immédiatement.

**Tech Stack:** Next.js 16 (App Router, `"use client"`), React 19, TypeScript, Vitest + Testing Library (`// @vitest-environment jsdom`), CSS-in-JS inline + keyframes dans `src/app/globals.css`.

**Spec de référence :** `docs/superpowers/specs/2026-07-26-bilan-chinage-ceremonie-design.md`

## Global Constraints

- **Aucune chaîne localisée en sauvegarde.** Toute chaîne visible passe par les dictionnaires `src/lib/i18n/ui/{fr,en,es,el}.ts`. `fr.ts` est LA source : sa forme définit `DictionnaireUI`, les 3 autres sont typées dessus (une clé oubliée = erreur de compilation).
- **Aucune migration de sauvegarde.** Le type `SessionHistorique` et son champ `xpBrocanteur?: number` ne changent pas.
- **Pas de `Math.random` ni de `Date.now()` dans le rendu** (hydratation SSR).
- **Portée : chinage uniquement.** `SessionSummary` reste en place et inchangé pour la vente et pour le replay de session du registre (`RegistreOverlay`).
- **`npm run lint` est cassé** (Next 16) — utiliser `npx eslint src` ou `npm run lint:hooks`.
- Tests : `npx vitest run <chemin>` pour un fichier, `npm run test:run` pour la suite complète.
- Messages de commit en français, préfixe conventionnel (`feat:`, `refactor:`, `test:`, `chore:`).

---

## Structure des fichiers

**Créés**
| Fichier | Responsabilité |
|---|---|
| `src/lib/bilan/ceremonie.ts` | Minutage pur de la cérémonie : constantes + `phasesCeremonie()`. Aucun DOM, aucun React. |
| `src/lib/bilan/ceremonie.test.ts` | Tests du minutage. |
| `src/lib/xpAffichageGele.ts` | Store de module du gel d'affichage de la barre XP + hook `useXpAffiche`. |
| `src/lib/xpAffichageGele.test.tsx` | Tests du gel via un composant sonde. |
| `src/components/mobile/BarreBasSession.tsx` | Châssis de la barre du bas de session (extrait de `ItemSwipeDeck`). |
| `src/components/mobile/BarreBasSession.test.tsx` | Test de rendu du châssis. |
| `src/components/mobile/bilan/CadreBilan.tsx` | Cadre art déco (présentation pure). |
| `src/components/mobile/bilan/CadreBilan.test.tsx` | Test de rendu du cadre. |
| `src/components/mobile/bilan/BilanSession.tsx` | Le calque bilan : liste, bloc XP, pilotage de la cérémonie, vols. |
| `src/components/mobile/bilan/BilanSession.test.tsx` | Tests de la cérémonie (minuteurs simulés, vols espionnés). |

**Modifiés**
| Fichier | Changement |
|---|---|
| `src/components/mobile/MobileHeader.tsx` | Affiche l'instantané gelé au lieu de `state.brocanteur`. |
| `src/components/mobile/MobileHeader.test.tsx` | + un cas « barre gelée ». |
| `src/components/mobile/chine/ItemSwipeDeck.tsx` | Utilise `BarreBasSession` au lieu de sa barre en dur. |
| `src/app/chiner/[brocanteId]/ClientPage.tsx` | XP découpée en 3 compteurs, gel/dégel, `BilanSession` à la place de `SessionSummary`, sortie déplacée en fin de cérémonie. |
| `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` | Plus de floats XP, barre gelée pendant la session. |
| `src/app/globals.css` | + keyframes `broc-bilan-ligne-out` et `broc-bilan-pop` ; − keyframe `broc-xp-float`. |
| `src/lib/i18n/ui/{fr,en,es,el}.ts` | + section `bilan` ; − clé `chrome.xpGagne`. |

**Supprimés**
- `src/components/mobile/XpFloats.tsx`
- `src/components/mobile/XpFloats.test.tsx`

---

### Task 1 : minutage de la cérémonie

**Files:**
- Create: `src/lib/bilan/ceremonie.ts`
- Test: `src/lib/bilan/ceremonie.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `EtapeCeremonie`, `EtapeDatee`, `phasesCeremonie(nbItems: number, nbLignesXp: number): EtapeDatee[]`, et les constantes `DECALAGE_ITEM_MS`, `VOL_MS`, `EFFACEMENT_LIGNE_MS`, `CASCADE_XP_MS`, `POP_PASTILLE_MS`, `RESPIRATION_MS`, `PAUSE_FINALE_MS`, `SORTIE_APRES_PASSAGE_MS`.

- [ ] **Step 1 : écrire le test qui échoue**

Créer `src/lib/bilan/ceremonie.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  CASCADE_XP_MS,
  DECALAGE_ITEM_MS,
  PAUSE_FINALE_MS,
  POP_PASTILLE_MS,
  RESPIRATION_MS,
  VOL_MS,
  phasesCeremonie,
} from "./ceremonie";

describe("phasesCeremonie", () => {
  it("2 items et 2 lignes XP : envols décalés, atterrissages 620 ms plus tard", () => {
    const etapes = phasesCeremonie(2, 2);
    expect(etapes).toContainEqual({ at: 0, etape: { type: "envolItem", index: 0 } });
    expect(etapes).toContainEqual({
      at: DECALAGE_ITEM_MS,
      etape: { type: "envolItem", index: 1 },
    });
    expect(etapes).toContainEqual({
      at: VOL_MS,
      etape: { type: "atterrissageItem", index: 0 },
    });
    expect(etapes).toContainEqual({
      at: DECALAGE_ITEM_MS + VOL_MS,
      etape: { type: "atterrissageItem", index: 1 },
    });
  });

  it("le bloc XP démarre à l'atterrissage du dernier item", () => {
    const finItems = DECALAGE_ITEM_MS + VOL_MS; // 2 items
    const etapes = phasesCeremonie(2, 2);
    expect(etapes).toContainEqual({ at: finItems, etape: { type: "ligneXp", index: 0 } });
    expect(etapes).toContainEqual({
      at: finItems + CASCADE_XP_MS,
      etape: { type: "ligneXp", index: 1 },
    });
    expect(etapes).toContainEqual({
      at: finItems + 2 * CASCADE_XP_MS,
      etape: { type: "pastille" },
    });
    expect(etapes).toContainEqual({
      at: finItems + 2 * CASCADE_XP_MS + POP_PASTILLE_MS + RESPIRATION_MS,
      etape: { type: "volPastille" },
    });
  });

  it("le dégel suit l'atterrissage de la pastille, la sortie 700 ms après", () => {
    const etapes = phasesCeremonie(1, 1);
    const vol = etapes.find((e) => e.etape.type === "volPastille");
    const degel = etapes.find((e) => e.etape.type === "degel");
    const sortie = etapes.find((e) => e.etape.type === "sortie");
    expect(degel?.at).toBe((vol?.at ?? 0) + VOL_MS);
    expect(sortie?.at).toBe((degel?.at ?? 0) + PAUSE_FINALE_MS);
  });

  it("session sans achat : le bloc XP démarre à 0", () => {
    const etapes = phasesCeremonie(0, 3);
    expect(etapes.some((e) => e.etape.type === "envolItem")).toBe(false);
    expect(etapes[0]).toEqual({ at: 0, etape: { type: "ligneXp", index: 0 } });
  });

  it("sans achat ni XP : dégel immédiat puis sortie, aucune pastille", () => {
    const etapes = phasesCeremonie(0, 0);
    expect(etapes.some((e) => e.etape.type === "pastille")).toBe(false);
    expect(etapes.some((e) => e.etape.type === "volPastille")).toBe(false);
    expect(etapes).toEqual([
      { at: 0, etape: { type: "degel" } },
      { at: PAUSE_FINALE_MS, etape: { type: "sortie" } },
    ]);
  });

  it("les étapes sont triées par date croissante", () => {
    const dates = phasesCeremonie(4, 3).map((e) => e.at);
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });
});
```

- [ ] **Step 2 : lancer le test et vérifier qu'il échoue**

Run : `npx vitest run src/lib/bilan/ceremonie.test.ts`
Expected : FAIL — « Failed to resolve import "./ceremonie" ».

- [ ] **Step 3 : écrire l'implémentation**

Créer `src/lib/bilan/ceremonie.ts` :

```ts
/**
 * Minutage de la cérémonie de bilan de fin de session (chinage, et vente
 * plus tard). Purement arithmétique : aucun DOM, aucun React — pour que
 * l'enchaînement se teste sans monter de composant.
 *
 * Le mouvement réduit ne passe PAS par ici : `BilanSession` court-circuite
 * en posant directement l'état final.
 */

/** Écart entre deux envols d'items consécutifs. */
export const DECALAGE_ITEM_MS = 220;
/** Durée d'un vol (item ou pastille) — doit rester alignée sur le défaut de `flyToTab`. */
export const VOL_MS = 620;
/** Effacement d'une ligne d'item derrière son sticker (fondu + effondrement). */
export const EFFACEMENT_LIGNE_MS = 260;
/** Écart entre deux lignes du décompte XP. */
export const CASCADE_XP_MS = 180;
/** Apparition de la pastille de total XP. */
export const POP_PASTILLE_MS = 300;
/** Respiration entre la pastille composée et son envol. */
export const RESPIRATION_MS = 350;
/** Pause après la mise à jour de la barre, avant de quitter la session. */
export const PAUSE_FINALE_MS = 700;
/** Délai avant sortie quand le joueur passe la cérémonie d'un tap. */
export const SORTIE_APRES_PASSAGE_MS = 400;

export type EtapeCeremonie =
  /** Le sticker de l'item `index` part vers le stockage, sa ligne s'efface. */
  | { type: "envolItem"; index: number }
  /** Le sticker de l'item `index` atterrit : compteur de stockage +1. */
  | { type: "atterrissageItem"; index: number }
  /** La ligne `index` du décompte XP apparaît. */
  | { type: "ligneXp"; index: number }
  /** La pastille de total XP apparaît. */
  | { type: "pastille" }
  /** La pastille part vers la barre de niveau du header. */
  | { type: "volPastille" }
  /** La pastille a atterri : la barre de niveau reprend sa vraie valeur. */
  | { type: "degel" }
  /** Fin de cérémonie : enregistrement de la session et retour au QG. */
  | { type: "sortie" };

export interface EtapeDatee {
  /** Date de l'étape en ms, depuis le lancement de la cérémonie. */
  at: number;
  etape: EtapeCeremonie;
}

/**
 * Construit la frise de la cérémonie. `nbLignesXp` ne compte que les lignes
 * réellement affichées (montants non nuls) : à 0, il n'y a ni décompte ni
 * pastille, on dégèle et on sort.
 */
export function phasesCeremonie(nbItems: number, nbLignesXp: number): EtapeDatee[] {
  const etapes: EtapeDatee[] = [];

  for (let i = 0; i < nbItems; i++) {
    const depart = i * DECALAGE_ITEM_MS;
    etapes.push({ at: depart, etape: { type: "envolItem", index: i } });
    etapes.push({ at: depart + VOL_MS, etape: { type: "atterrissageItem", index: i } });
  }

  // Le décompte démarre quand le dernier sticker s'est posé.
  const finItems = nbItems > 0 ? (nbItems - 1) * DECALAGE_ITEM_MS + VOL_MS : 0;

  let degel: number;
  if (nbLignesXp > 0) {
    for (let j = 0; j < nbLignesXp; j++) {
      etapes.push({ at: finItems + j * CASCADE_XP_MS, etape: { type: "ligneXp", index: j } });
    }
    const pastille = finItems + nbLignesXp * CASCADE_XP_MS;
    etapes.push({ at: pastille, etape: { type: "pastille" } });
    const volPastille = pastille + POP_PASTILLE_MS + RESPIRATION_MS;
    etapes.push({ at: volPastille, etape: { type: "volPastille" } });
    degel = volPastille + VOL_MS;
  } else {
    degel = finItems;
  }

  etapes.push({ at: degel, etape: { type: "degel" } });
  etapes.push({ at: degel + PAUSE_FINALE_MS, etape: { type: "sortie" } });

  return etapes.sort((a, b) => a.at - b.at);
}
```

- [ ] **Step 4 : lancer le test et vérifier qu'il passe**

Run : `npx vitest run src/lib/bilan/ceremonie.test.ts`
Expected : PASS — 6 tests.

- [ ] **Step 5 : commit**

```bash
git add src/lib/bilan/ceremonie.ts src/lib/bilan/ceremonie.test.ts
git commit -m "feat(bilan): minutage pur de la cérémonie de fin de session"
```

---

### Task 2 : gel d'affichage de la barre XP

**Files:**
- Create: `src/lib/xpAffichageGele.ts`
- Test: `src/lib/xpAffichageGele.test.tsx`
- Modify: `src/components/mobile/MobileHeader.tsx`
- Test: `src/components/mobile/MobileHeader.test.tsx`

**Interfaces:**
- Consumes: `BrocanteurState` (`src/types/game.ts` : `{ xp: number; niveau: number; pointsDisponibles: number }`), `emptyBrocanteur()` et `progressionNiveauBrocanteur()` (`src/lib/xp.ts`).
- Produces: `gelerXpAffichage(instantane: BrocanteurState): void`, `degelerXpAffichage(): void`, `useXpAffiche(reel: BrocanteurState): BrocanteurState`.

- [ ] **Step 1 : écrire le test qui échoue**

Créer `src/lib/xpAffichageGele.test.tsx` :

```tsx
// @vitest-environment jsdom
/**
 * Le gel d'affichage est un store de module : pensez à dégeler entre chaque
 * test, sinon l'état fuit d'un cas à l'autre.
 */
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { degelerXpAffichage, gelerXpAffichage, useXpAffiche } from "./xpAffichageGele";
import type { BrocanteurState } from "@/types/game";

afterEach(() => {
  degelerXpAffichage();
  cleanup();
});

function brocanteur(niveau: number, xp: number): BrocanteurState {
  return { niveau, xp, pointsDisponibles: 0 };
}

function Sonde({ reel }: { reel: BrocanteurState }) {
  const affiche = useXpAffiche(reel);
  return <span data-testid="valeur">{`N${affiche.niveau}-${affiche.xp}`}</span>;
}

describe("xpAffichageGele", () => {
  it("sans gel : la valeur réelle est affichée", () => {
    render(<Sonde reel={brocanteur(3, 120)} />);
    expect(screen.getByTestId("valeur").textContent).toBe("N3-120");
  });

  it("gelé : l'instantané est affiché même si le réel change", () => {
    const { rerender } = render(<Sonde reel={brocanteur(3, 120)} />);
    act(() => gelerXpAffichage(brocanteur(3, 120)));
    rerender(<Sonde reel={brocanteur(4, 260)} />);
    expect(screen.getByTestId("valeur").textContent).toBe("N3-120");
  });

  it("dégelé : la valeur réelle revient sans remonter le composant", () => {
    const { rerender } = render(<Sonde reel={brocanteur(3, 120)} />);
    act(() => gelerXpAffichage(brocanteur(3, 120)));
    rerender(<Sonde reel={brocanteur(4, 260)} />);
    act(() => degelerXpAffichage());
    expect(screen.getByTestId("valeur").textContent).toBe("N4-260");
  });

  it("dégeler sans gel actif ne casse rien", () => {
    render(<Sonde reel={brocanteur(1, 5)} />);
    act(() => degelerXpAffichage());
    expect(screen.getByTestId("valeur").textContent).toBe("N1-5");
  });
});
```

- [ ] **Step 2 : lancer le test et vérifier qu'il échoue**

Run : `npx vitest run src/lib/xpAffichageGele.test.tsx`
Expected : FAIL — « Failed to resolve import "./xpAffichageGele" ».

- [ ] **Step 3 : écrire le store**

Créer `src/lib/xpAffichageGele.ts` :

```ts
"use client";

import { useSyncExternalStore } from "react";
import type { BrocanteurState } from "@/types/game";

/**
 * Gel d'affichage de la barre XP du header pendant une session.
 *
 * L'XP réelle continue d'être créditée immédiatement dans le GameContext
 * (rien n'est perdu si l'app est tuée en pleine session) ; seul l'affichage
 * du header est figé sur un instantané, pour que la barre ne progresse qu'au
 * moment de la cérémonie de bilan.
 *
 * Store de module plutôt que contexte : c'est une préoccupation purement
 * d'affichage, ça évite d'élargir le GameContext et d'ajouter un provider.
 */
let instantane: BrocanteurState | null = null;
const abonnes = new Set<() => void>();

function notifier(): void {
  for (const cb of abonnes) cb();
}

function souscrire(cb: () => void): () => void {
  abonnes.add(cb);
  return () => {
    abonnes.delete(cb);
  };
}

function lire(): BrocanteurState | null {
  return instantane;
}

/** Côté serveur, rien n'est jamais gelé (le gel naît d'une action joueur). */
function lireServeur(): BrocanteurState | null {
  return null;
}

/** Fige l'affichage de la barre XP sur cet instantané. Idempotent. */
export function gelerXpAffichage(valeur: BrocanteurState): void {
  instantane = valeur;
  notifier();
}

/** Rend la barre XP à sa valeur réelle. Sans effet si rien n'est gelé. */
export function degelerXpAffichage(): void {
  if (instantane === null) return;
  instantane = null;
  notifier();
}

/** Renvoie l'instantané tant que le gel dure, la valeur réelle sinon. */
export function useXpAffiche(reel: BrocanteurState): BrocanteurState {
  const gele = useSyncExternalStore(souscrire, lire, lireServeur);
  return gele ?? reel;
}
```

- [ ] **Step 4 : lancer le test et vérifier qu'il passe**

Run : `npx vitest run src/lib/xpAffichageGele.test.tsx`
Expected : PASS — 4 tests.

- [ ] **Step 5 : brancher le header sur le gel**

Dans `src/components/mobile/MobileHeader.tsx` :

Ajouter aux imports (à côté de l'import existant de `@/lib/xp`) :

```ts
import { emptyBrocanteur, progressionNiveauBrocanteur } from "@/lib/xp";
import { useXpAffiche } from "@/lib/xpAffichageGele";
```

(la ligne `import { progressionNiveauBrocanteur } from "@/lib/xp";` est remplacée par la première ligne ci-dessus)

Juste sous les constantes de style, ajouter :

```ts
/** Repli quand aucune partie n'est chargée : le hook doit être appelé
 *  inconditionnellement, il lui faut donc toujours une valeur. */
const BROCANTEUR_REPLI = emptyBrocanteur();
```

Dans le corps du composant, après `const { d, tr, locale } = useLangue();` :

```ts
  // Pendant une session, la barre est figée sur un instantané : elle ne
  // progresse qu'à la cérémonie de bilan (envol de la pastille XP).
  const brocanteurAffiche = useXpAffiche(state?.brocanteur ?? BROCANTEUR_REPLI);
```

Puis remplacer les trois lectures d'affichage. `xpLabel` :

```ts
  const xpLabel = state
    ? tr(d.chrome.niveauBrocanteur, { n: brocanteurAffiche.niveau })
    : undefined;
```

et `xpContenu` :

```tsx
  const xpContenu = state ? (
    <>
      <span style={xpNiveauStyle}>N{brocanteurAffiche.niveau}</span>
      <span style={xpTrackStyle}>
        <span
          style={{
            ...xpFillStyle,
            width: `${Math.round(progressionNiveauBrocanteur(brocanteurAffiche) * 100)}%`,
          }}
        />
      </span>
    </>
  ) : null;
```

`xpNavigationBloquee` garde `state.brocanteur.niveau` (règle de navigation, pas d'affichage) — **ne pas y toucher.**

- [ ] **Step 6 : ajouter le cas « barre gelée » au test du header**

Dans `src/components/mobile/MobileHeader.test.tsx`, ajouter l'import :

```ts
import { degelerXpAffichage, gelerXpAffichage } from "@/lib/xpAffichageGele";
```

Étendre le fabricant d'état existant pour qu'il porte une XP (`etat()` renvoie déjà `brocanteur: { niveau, xp: 0 }` — ajouter `pointsDisponibles: 0` pour coller au type), remplacer `afterEach(cleanup)` par :

```ts
afterEach(() => {
  degelerXpAffichage();
  cleanup();
});
```

et ajouter, dans un nouveau `describe` :

```tsx
describe("MobileHeader — gel de la barre XP", () => {
  it("gelé : le niveau affiché est celui de l'instantané, pas celui de l'état", () => {
    mockState = etat(5);
    mockPathname = "/chiner/xxx";
    gelerXpAffichage({ niveau: 3, xp: 120, pointsDisponibles: 0 });
    render(<MobileHeader budget={0} />);
    expect(screen.getByLabelText("Niveau de Brocanteur 3")).toBeTruthy();
  });

  it("dégelé : le niveau réel est de nouveau affiché", () => {
    mockState = etat(5);
    mockPathname = "/chiner/xxx";
    gelerXpAffichage({ niveau: 3, xp: 120, pointsDisponibles: 0 });
    const { rerender } = render(<MobileHeader budget={0} />);
    act(() => degelerXpAffichage());
    rerender(<MobileHeader budget={0} />);
    expect(screen.getByLabelText("Niveau de Brocanteur 5")).toBeTruthy();
  });
});
```

Ajouter `act` à l'import de `@testing-library/react` en tête de fichier.

- [ ] **Step 7 : lancer les tests du header**

Run : `npx vitest run src/components/mobile/MobileHeader.test.tsx src/lib/xpAffichageGele.test.tsx`
Expected : PASS — tous les cas, anciens et nouveaux.

- [ ] **Step 8 : commit**

```bash
git add src/lib/xpAffichageGele.ts src/lib/xpAffichageGele.test.tsx src/components/mobile/MobileHeader.tsx src/components/mobile/MobileHeader.test.tsx
git commit -m "feat(header): gel d'affichage de la barre XP pendant les sessions"
```

---

### Task 3 : extraction de la barre du bas de session

**Files:**
- Create: `src/components/mobile/BarreBasSession.tsx`
- Test: `src/components/mobile/BarreBasSession.test.tsx`
- Modify: `src/components/mobile/chine/ItemSwipeDeck.tsx:243-278`

**Interfaces:**
- Consumes: rien.
- Produces: `BarreBasSession({ gauche, droite }: { gauche: ReactNode; droite: ReactNode })`.

Aucun test n'existe aujourd'hui pour `ItemSwipeDeck` — il n'y a donc rien à ajuster de ce côté.

- [ ] **Step 1 : écrire le test qui échoue**

Créer `src/components/mobile/BarreBasSession.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BarreBasSession } from "./BarreBasSession";

afterEach(cleanup);

describe("BarreBasSession", () => {
  it("rend le contenu gauche et le contenu droit", () => {
    render(
      <BarreBasSession
        gauche={<button type="button">Sortir</button>}
        droite={<span>8/12</span>}
      />,
    );
    expect(screen.getByRole("button", { name: "Sortir" })).toBeTruthy();
    expect(screen.getByText("8/12")).toBeTruthy();
  });

  it("réserve la zone sûre du bas (padding safe-bottom)", () => {
    const { container } = render(<BarreBasSession gauche={<i />} droite={<i />} />);
    const barre = container.firstElementChild as HTMLElement;
    expect(barre.style.padding).toContain("var(--safe-bottom)");
  });
});
```

- [ ] **Step 2 : lancer le test et vérifier qu'il échoue**

Run : `npx vitest run src/components/mobile/BarreBasSession.test.tsx`
Expected : FAIL — « Failed to resolve import "./BarreBasSession" ».

- [ ] **Step 3 : créer le composant**

Créer `src/components/mobile/BarreBasSession.tsx` :

```tsx
import type { CSSProperties, ReactNode } from "react";

const barre: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "var(--forest-800)",
  borderTop: "3px solid var(--brass-500)",
  padding: "8px 16px calc(8px + var(--safe-bottom))",
};

/**
 * Châssis de la barre du bas des écrans de session (chinage, vente, bilan) :
 * fond forêt, liseré laiton, zone sûre du bas. Un seul objet visuel partagé —
 * le deck d'objets y met « Sortir » + les atouts, le bilan y met « Retour au
 * QG » + la jauge de stockage.
 */
export function BarreBasSession({
  gauche,
  droite,
}: {
  gauche: ReactNode;
  droite: ReactNode;
}) {
  return (
    <div style={barre}>
      {gauche}
      {droite}
    </div>
  );
}
```

- [ ] **Step 4 : lancer le test et vérifier qu'il passe**

Run : `npx vitest run src/components/mobile/BarreBasSession.test.tsx`
Expected : PASS — 2 tests.

- [ ] **Step 5 : brancher `ItemSwipeDeck` dessus**

Dans `src/components/mobile/chine/ItemSwipeDeck.tsx`, ajouter l'import :

```ts
import { BarreBasSession } from "@/components/mobile/BarreBasSession";
```

Remplacer le bloc final (le `<div>` de la barre du bas, lignes 243-278, celui qui commence par `style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--forest-800)"` ) par :

```tsx
      <BarreBasSession
        gauche={
          <button
            type="button"
            aria-label={d.chine.quitterBrocanteAriaLabel}
            onClick={onQuitter}
            className={pulseSortir ? "tuto-pulse tuto-main tuto-main-droite" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--brass-300)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(10px, 2.6vw, 12px)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: 0,
            }}
          >
            <DoorOpen size={26} strokeWidth={2} />
            {d.chine.sortir}
          </button>
        }
        droite={renderDock?.(currentItem)}
      />
```

- [ ] **Step 6 : vérifier qu'aucune régression n'est introduite**

Run : `npm run test:run`
Expected : PASS — même nombre de tests verts qu'avant la tâche (aucun test ne couvrait ce bloc).

Run : `npx eslint src/components/mobile/BarreBasSession.tsx src/components/mobile/chine/ItemSwipeDeck.tsx`
Expected : aucune sortie.

- [ ] **Step 7 : commit**

```bash
git add src/components/mobile/BarreBasSession.tsx src/components/mobile/BarreBasSession.test.tsx src/components/mobile/chine/ItemSwipeDeck.tsx
git commit -m "refactor(session): extrait BarreBasSession du deck de chinage"
```

---

### Task 4 : chaînes du bilan dans les 4 langues

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts`, `src/lib/i18n/ui/en.ts`, `src/lib/i18n/ui/es.ts`, `src/lib/i18n/ui/el.ts`

**Interfaces:**
- Consumes: rien.
- Produces: section `d.bilan` avec les clés `titreChinage`, `pochesVides`, `unObjetTotal`, `nObjetsTotal`, `xpAchats`, `xpDecouvertes`, `xpNegociations`, `xpTotal`, `xpEyebrow`, `retourQg`, `retourQgAria`, `stockageAria`.

`fr.ts` est LA source : la section y est ajoutée en premier, les 3 autres fichiers sont ensuite contraints par le type.

- [ ] **Step 1 : ajouter la section `bilan` au français**

Dans `src/lib/i18n/ui/fr.ts`, insérer une nouvelle section juste **après** la section `vente` (repérer sa dernière clé, puis l'accolade fermante `},`) :

```ts
  bilan: {
    titreChinage: "Bilan de chinage",
    pochesVides: "Les poches vides.",
    unObjetTotal: "1 objet · −{total} €",
    nObjetsTotal: "{n} objets · −{total} €",
    xpEyebrow: "— expérience —",
    xpAchats: "Achats",
    xpDecouvertes: "Découvertes",
    xpNegociations: "Négociations",
    xpTotal: "+{n} XP",
    retourQg: "Retour au QG",
    retourQgAria: "Retour au QG",
    stockageAria: "Stockage : {occupe} sur {capacite}",
  },
```

- [ ] **Step 2 : décliner en anglais**

Dans `src/lib/i18n/ui/en.ts`, à la position équivalente :

```ts
  bilan: {
    titreChinage: "Picking summary",
    pochesVides: "Empty-handed.",
    unObjetTotal: "1 item · −€{total}",
    nObjetsTotal: "{n} items · −€{total}",
    xpEyebrow: "— experience —",
    xpAchats: "Purchases",
    xpDecouvertes: "Discoveries",
    xpNegociations: "Haggling",
    xpTotal: "+{n} XP",
    retourQg: "Back to HQ",
    retourQgAria: "Back to HQ",
    stockageAria: "Storage: {occupe} of {capacite}",
  },
```

- [ ] **Step 3 : décliner en espagnol**

Dans `src/lib/i18n/ui/es.ts` :

```ts
  bilan: {
    titreChinage: "Balance de la rebusca",
    pochesVides: "Con las manos vacías.",
    unObjetTotal: "1 objeto · −{total} €",
    nObjetsTotal: "{n} objetos · −{total} €",
    xpEyebrow: "— experiencia —",
    xpAchats: "Compras",
    xpDecouvertes: "Descubrimientos",
    xpNegociations: "Regateos",
    xpTotal: "+{n} XP",
    retourQg: "Volver al cuartel",
    retourQgAria: "Volver al cuartel",
    stockageAria: "Almacén: {occupe} de {capacite}",
  },
```

- [ ] **Step 4 : décliner en grec**

Dans `src/lib/i18n/ui/el.ts` :

```ts
  bilan: {
    titreChinage: "Απολογισμός ψαξίματος",
    pochesVides: "Με άδεια χέρια.",
    unObjetTotal: "1 αντικείμενο · −{total} €",
    nObjetsTotal: "{n} αντικείμενα · −{total} €",
    xpEyebrow: "— εμπειρία —",
    xpAchats: "Αγορές",
    xpDecouvertes: "Ανακαλύψεις",
    xpNegociations: "Παζάρια",
    xpTotal: "+{n} XP",
    retourQg: "Επιστροφή στο αρχηγείο",
    retourQgAria: "Επιστροφή στο αρχηγείο",
    stockageAria: "Αποθήκη: {occupe} από {capacite}",
  },
```

- [ ] **Step 5 : vérifier que les 4 dictionnaires compilent**

Run : `npx tsc --noEmit`
Expected : aucune erreur (une clé oubliée dans en/es/el ferait échouer cette commande).

Run : `npx vitest run src/lib/i18n`
Expected : PASS.

- [ ] **Step 6 : commit**

```bash
git add src/lib/i18n/ui
git commit -m "feat(i18n): chaînes du bilan de chinage (fr/en/es/el)"
```

---

### Task 5 : cadre art déco

**Files:**
- Create: `src/components/mobile/bilan/CadreBilan.tsx`
- Test: `src/components/mobile/bilan/CadreBilan.test.tsx`

**Interfaces:**
- Consumes: `BrassCorners` (`@/components/ui/BrassCorners`), `DecoDivider` (`@/components/ui/DecoDivider`).
- Produces: `CadreBilan({ titre, sousTitre, mention }: { titre: string; sousTitre: string; mention: string })`.

`titre` = « Bilan de chinage », `sousTitre` = nom localisé de la brocante, `mention` = « 3 objets · −125 € » ou « Les poches vides. ».

- [ ] **Step 1 : écrire le test qui échoue**

Créer `src/components/mobile/bilan/CadreBilan.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CadreBilan } from "./CadreBilan";

afterEach(cleanup);

describe("CadreBilan", () => {
  it("affiche le titre, le nom de la brocante et la mention", () => {
    render(
      <CadreBilan
        titre="Bilan de chinage"
        sousTitre="Brocante de Sarlat"
        mention="3 objets · −125 €"
      />,
    );
    expect(screen.getByText("Bilan de chinage")).toBeTruthy();
    expect(screen.getByText("Brocante de Sarlat")).toBeTruthy();
    expect(screen.getByText("3 objets · −125 €")).toBeTruthy();
  });

  it("le titre est un en-tête accessible", () => {
    render(<CadreBilan titre="Bilan de chinage" sousTitre="Sarlat" mention="Les poches vides." />);
    expect(screen.getByRole("heading", { name: "Bilan de chinage" })).toBeTruthy();
  });
});
```

- [ ] **Step 2 : lancer le test et vérifier qu'il échoue**

Run : `npx vitest run src/components/mobile/bilan/CadreBilan.test.tsx`
Expected : FAIL — « Failed to resolve import "./CadreBilan" ».

- [ ] **Step 3 : écrire le composant**

Créer `src/components/mobile/bilan/CadreBilan.tsx` :

```tsx
import type { CSSProperties } from "react";
import { BrassCorners } from "@/components/ui/BrassCorners";
import { DecoDivider } from "@/components/ui/DecoDivider";

const cadre: CSSProperties = {
  position: "relative",
  // Papier translucide : la brocante floutée reste devinée derrière.
  background: "rgba(247,244,238,0.90)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "inset 0 0 0 4px rgba(247,244,238,0.9), inset 0 0 0 5px var(--brass-500), 0 6px 18px rgba(15,30,22,0.35)",
  padding: "18px 22px 16px",
  textAlign: "center",
};

/** Éventail de chevrons art déco, en haut à gauche et en haut à droite. */
const eventail: CSSProperties = {
  position: "absolute",
  top: 10,
  display: "flex",
  gap: 2,
  alignItems: "flex-end",
  pointerEvents: "none",
};

const chevron = (h: number): CSSProperties => ({
  width: 3,
  height: h,
  background: "var(--brass-500)",
  opacity: 0.75,
});

const titreStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "clamp(15px, 4.4vw, 19px)",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
};

const sousTitreStyle: CSSProperties = {
  margin: "8px 0 0",
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 15,
  color: "var(--ink-700)",
};

const mentionStyle: CSSProperties = {
  margin: "6px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.08em",
  color: "var(--ink-500)",
};

/**
 * Cadre art déco du bilan de session : éventails de chevrons dans les angles
 * hauts, double filet laiton, losange central. Il reste fixe pendant toute la
 * cérémonie — c'est l'ancrage visuel pendant que la liste se vide.
 */
export function CadreBilan({
  titre,
  sousTitre,
  mention,
}: {
  titre: string;
  sousTitre: string;
  mention: string;
}) {
  return (
    <section style={cadre}>
      <BrassCorners inset={6} size={20} />
      <span style={{ ...eventail, left: 30 }} aria-hidden>
        <span style={chevron(6)} />
        <span style={chevron(10)} />
        <span style={chevron(14)} />
      </span>
      <span style={{ ...eventail, right: 30 }} aria-hidden>
        <span style={chevron(14)} />
        <span style={chevron(10)} />
        <span style={chevron(6)} />
      </span>

      <h2 style={titreStyle}>{titre}</h2>
      <div style={{ margin: "10px 0 0" }}>
        <DecoDivider />
      </div>
      <p style={sousTitreStyle}>{sousTitre}</p>
      <p style={mentionStyle}>{mention}</p>
    </section>
  );
}
```

- [ ] **Step 4 : lancer le test et vérifier qu'il passe**

Run : `npx vitest run src/components/mobile/bilan/CadreBilan.test.tsx`
Expected : PASS — 2 tests.

- [ ] **Step 5 : commit**

```bash
git add src/components/mobile/bilan/CadreBilan.tsx src/components/mobile/bilan/CadreBilan.test.tsx
git commit -m "feat(bilan): cadre art déco du bilan de session"
```

---

### Task 6 : le calque de bilan et sa cérémonie

**Files:**
- Create: `src/components/mobile/bilan/BilanSession.tsx`
- Test: `src/components/mobile/bilan/BilanSession.test.tsx`
- Modify: `src/app/globals.css` (ajout de 2 keyframes)

**Interfaces:**
- Consumes: `phasesCeremonie`, `SORTIE_APRES_PASSAGE_MS`, `EFFACEMENT_LIGNE_MS`, `POP_PASTILLE_MS` (Task 1) ; `degelerXpAffichage` (Task 2) ; `BarreBasSession` (Task 3) ; `d.bilan.*` (Task 4) ; `CadreBilan` (Task 5) ; `flyToTab` (`@/lib/flyAnimation`), `prefersReducedMotion` (`@/lib/transitionIris`), `audioManager` (`@/lib/audio/audioManager`), `getTemplate` (`@/data/objetTemplates`), `getItemThumbUrl` (`@/lib/itemImages`), `getRarityColors` (`@/lib/rarityColors`), `ItemSticker` (`@/components/ui/ItemSticker`), `nomObjet` (`@/lib/i18n/contenu`), `useLangue` (`@/lib/i18n/LangueContext`).
- Produces: `BilanSession(props: BilanSessionProps)` et le type `BilanItem`, `LigneXp`, `BilanSessionProps` (signatures exactes au Step 3).

- [ ] **Step 1 : ajouter les keyframes**

Dans `src/app/globals.css`, à la suite des keyframes existantes (juste avant `/* Pulsation douce de l'état "prêt à récupérer" sur un slot atelier. */`), ajouter :

```css
/* Ligne d'item du bilan : s'efface derrière son sticker envolé, puis
   s'effondre pour que les suivantes remontent. La durée doit rester
   alignée sur EFFACEMENT_LIGNE_MS (lib/bilan/ceremonie.ts). */
@keyframes broc-bilan-ligne-out {
  0% { opacity: 1; transform: translateX(0); }
  40% { opacity: 0; transform: translateX(10px); }
  100% {
    opacity: 0;
    transform: translateX(10px);
    height: 0;
    padding-top: 0;
    padding-bottom: 0;
    border-bottom-width: 0;
  }
}

/* Apparition d'une ligne du décompte XP et de la pastille de total. */
@keyframes broc-bilan-pop {
  0% { opacity: 0; transform: scale(0.88); }
  60% { opacity: 1; transform: scale(1.04); }
  100% { opacity: 1; transform: scale(1); }
}
```

- [ ] **Step 2 : écrire les tests qui échouent**

Créer `src/components/mobile/bilan/BilanSession.test.tsx` :

```tsx
// @vitest-environment jsdom
/**
 * Cérémonie du bilan : les items s'envolent un à un vers le stockage, puis le
 * décompte XP se compose et la pastille part vers la barre de niveau. Les vols
 * (`flyToTab`) sont espionnés — on teste l'enchaînement, pas l'animation CSS.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BilanSession } from "./BilanSession";
import {
  CASCADE_XP_MS,
  DECALAGE_ITEM_MS,
  PAUSE_FINALE_MS,
  POP_PASTILLE_MS,
  RESPIRATION_MS,
  SORTIE_APRES_PASSAGE_MS,
  VOL_MS,
} from "@/lib/bilan/ceremonie";

const vols: { cible: string }[] = [];
vi.mock("@/lib/flyAnimation", () => ({
  flyToTab: (opts: { targetSelector: string }) => {
    vols.push({ cible: opts.targetSelector });
  },
}));

const degel = vi.fn();
vi.mock("@/lib/xpAffichageGele", () => ({
  degelerXpAffichage: () => degel(),
}));

let motionReduite = false;
vi.mock("@/lib/transitionIris", () => ({
  prefersReducedMotion: () => motionReduite,
}));

const playPickup = vi.fn();
vi.mock("@/lib/audio/audioManager", () => ({
  audioManager: { playPickup: () => playPickup(), playRarete: () => {} },
}));

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({
    locale: "fr",
    d: {
      bilan: {
        titreChinage: "Bilan de chinage",
        pochesVides: "Les poches vides.",
        unObjetTotal: "1 objet · −{total} €",
        nObjetsTotal: "{n} objets · −{total} €",
        xpEyebrow: "— expérience —",
        xpAchats: "Achats",
        xpDecouvertes: "Découvertes",
        xpNegociations: "Négociations",
        xpTotal: "+{n} XP",
        retourQg: "Retour au QG",
        retourQgAria: "Retour au QG",
        stockageAria: "Stockage : {occupe} sur {capacite}",
      },
    },
    tr: (modele: string, vars: Record<string, string | number>) =>
      Object.entries(vars).reduce(
        (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
        modele,
      ),
  }),
}));

// Les templateId sont volontairement absents du catalogue : `nomObjet` retombe
// alors sur le `nom` fourni, ce qui rend les assertions lisibles.
const ITEMS = [
  { templateId: "chaise-thonet", nom: "Chaise Thonet", categorie: "Maison" as const, prix: 45 },
  { templateId: "poste-tsf", nom: "Poste TSF", categorie: "Musique" as const, prix: 80 },
];

const XP = [
  { cle: "achats" as const, montant: 24 },
  { cle: "negociations" as const, montant: 9 },
];

function monter(patch: Partial<Parameters<typeof BilanSession>[0]> = {}) {
  const onTermine = vi.fn();
  render(
    <BilanSession
      titre="Brocante de Sarlat"
      items={ITEMS}
      xpLignes={XP}
      cibleVolItems='[data-fly-target="stockage-bilan"]'
      stockageDepart={{ occupe: 8, capacite: 12 }}
      onTermine={onTermine}
      {...patch}
    />,
  );
  return { onTermine };
}

beforeEach(() => {
  vi.useFakeTimers();
  vols.length = 0;
  degel.mockClear();
  playPickup.mockClear();
  motionReduite = false;
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("BilanSession — état initial", () => {
  it("affiche le cadre, les items et le total dépensé", () => {
    monter();
    expect(screen.getByText("Bilan de chinage")).toBeTruthy();
    expect(screen.getByText("Brocante de Sarlat")).toBeTruthy();
    expect(screen.getByText("2 objets · −125 €")).toBeTruthy();
    expect(screen.getByText("Chaise Thonet")).toBeTruthy();
    expect(screen.getByText("Poste TSF")).toBeTruthy();
  });

  it("affiche la jauge de stockage à sa valeur d'entrée de session", () => {
    monter();
    expect(screen.getByText("8/12")).toBeTruthy();
  });

  it("sans achat : la mention des poches vides remplace la liste", () => {
    monter({ items: [] });
    expect(screen.getByText("Les poches vides.")).toBeTruthy();
  });

  it("le décompte XP n'est pas visible avant la cérémonie", () => {
    monter();
    expect(screen.queryByText("Achats")).toBeNull();
  });
});

describe("BilanSession — cérémonie", () => {
  it("les items s'envolent un à un vers le stockage", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    act(() => void vi.advanceTimersByTime(0));
    expect(vols).toHaveLength(1);
    act(() => void vi.advanceTimersByTime(DECALAGE_ITEM_MS));
    expect(vols).toHaveLength(2);
    expect(vols[0].cible).toBe('[data-fly-target="stockage-bilan"]');
  });

  it("la jauge de stockage s'incrémente à chaque atterrissage", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    act(() => void vi.advanceTimersByTime(VOL_MS));
    expect(screen.getByText("9/12")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(DECALAGE_ITEM_MS));
    expect(screen.getByText("10/12")).toBeTruthy();
  });

  it("le décompte XP se compose après le dernier atterrissage, puis la pastille s'envole", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    const finItems = DECALAGE_ITEM_MS + VOL_MS;
    act(() => void vi.advanceTimersByTime(finItems));
    expect(screen.getByText("Achats")).toBeTruthy();
    expect(screen.queryByText("Négociations")).toBeNull();
    act(() => void vi.advanceTimersByTime(CASCADE_XP_MS));
    expect(screen.getByText("Négociations")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(CASCADE_XP_MS));
    expect(screen.getByText("+33 XP")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(POP_PASTILLE_MS + RESPIRATION_MS));
    expect(vols).toHaveLength(3);
    expect(vols[2].cible).toBe('[data-fly-target="xp-header"]');
  });

  it("la barre est dégelée à l'atterrissage de la pastille, la sortie suit", () => {
    const { onTermine } = monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    const jusquAuDegel =
      DECALAGE_ITEM_MS + VOL_MS + 2 * CASCADE_XP_MS + POP_PASTILLE_MS + RESPIRATION_MS + VOL_MS;
    act(() => void vi.advanceTimersByTime(jusquAuDegel));
    expect(degel).toHaveBeenCalledTimes(1);
    expect(onTermine).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(PAUSE_FINALE_MS));
    expect(onTermine).toHaveBeenCalledTimes(1);
  });

  it("le bouton ne peut pas relancer la cérémonie", () => {
    monter();
    const bouton = screen.getByRole("button", { name: "Retour au QG" });
    fireEvent.click(bouton);
    act(() => void vi.advanceTimersByTime(0));
    fireEvent.click(bouton);
    act(() => void vi.advanceTimersByTime(0));
    expect(vols).toHaveLength(1);
  });
});

describe("BilanSession — passer la cérémonie", () => {
  it("un tap pose l'état final, dégèle et sort après 400 ms", () => {
    const { onTermine } = monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    act(() => void vi.advanceTimersByTime(0));
    fireEvent.click(screen.getByTestId("bilan-passer"));
    expect(screen.getByText("+33 XP")).toBeTruthy();
    expect(screen.getByText("10/12")).toBeTruthy();
    expect(degel).toHaveBeenCalled();
    expect(onTermine).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(SORTIE_APRES_PASSAGE_MS));
    expect(onTermine).toHaveBeenCalledTimes(1);
  });

  it("aucun nouveau vol n'est lancé après le passage", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    act(() => void vi.advanceTimersByTime(0));
    const avant = vols.length;
    fireEvent.click(screen.getByTestId("bilan-passer"));
    act(() => void vi.advanceTimersByTime(5000));
    expect(vols).toHaveLength(avant);
  });
});

describe("BilanSession — mouvement réduit", () => {
  it("premier tap : état final sans vol ni sortie automatique", () => {
    motionReduite = true;
    const { onTermine } = monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    expect(vols).toHaveLength(0);
    expect(playPickup).toHaveBeenCalledTimes(1);
    expect(screen.getByText("+33 XP")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(5000));
    expect(onTermine).not.toHaveBeenCalled();
  });

  it("second tap : sortie", () => {
    motionReduite = true;
    const { onTermine } = monter();
    const bouton = screen.getByRole("button", { name: "Retour au QG" });
    fireEvent.click(bouton);
    fireEvent.click(bouton);
    expect(onTermine).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3 : lancer les tests et vérifier qu'ils échouent**

Run : `npx vitest run src/components/mobile/bilan/BilanSession.test.tsx`
Expected : FAIL — « Failed to resolve import "./BilanSession" ».

- [ ] **Step 4 : écrire le composant**

Créer `src/components/mobile/bilan/BilanSession.tsx` :

```tsx
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DoorOpen, Package } from "lucide-react";
import { BarreBasSession } from "@/components/mobile/BarreBasSession";
import { CadreBilan } from "@/components/mobile/bilan/CadreBilan";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { getTemplate } from "@/data/objetTemplates";
import { audioManager } from "@/lib/audio/audioManager";
import {
  EFFACEMENT_LIGNE_MS,
  POP_PASTILLE_MS,
  SORTIE_APRES_PASSAGE_MS,
  phasesCeremonie,
  type EtapeCeremonie,
} from "@/lib/bilan/ceremonie";
import { flyToTab } from "@/lib/flyAnimation";
import { nomObjet } from "@/lib/i18n/contenu";
import { useLangue } from "@/lib/i18n/LangueContext";
import { getItemThumbUrl } from "@/lib/itemImages";
import { getRarityColors } from "@/lib/rarityColors";
import { prefersReducedMotion } from "@/lib/transitionIris";
import { degelerXpAffichage } from "@/lib/xpAffichageGele";
import type { CategorieObjet } from "@/types/game";

export interface BilanItem {
  templateId: string;
  nom: string;
  categorie: CategorieObjet;
  /** Prix payé (chinage) — affiché en négatif. */
  prix: number;
}

export type SourceXp = "achats" | "decouvertes" | "negociations";

export interface LigneXp {
  cle: SourceXp;
  montant: number;
}

export interface BilanSessionProps {
  /** Nom localisé de la brocante. */
  titre: string;
  items: BilanItem[];
  /** Lignes du décompte ; les montants nuls sont ignorés. */
  xpLignes: ReadonlyArray<LigneXp>;
  /** Sélecteur CSS de la cible du vol des items. */
  cibleVolItems: string;
  /** Occupation du stockage à l'entrée de session (le compteur monte pendant la cérémonie). */
  stockageDepart: { occupe: number; capacite: number };
  /** Fin de cérémonie : au parent d'enregistrer la session et de quitter. */
  onTermine: () => void;
}

const CIBLE_XP = '[data-fly-target="xp-header"]';

/**
 * Bilan de fin de session, joué DANS la session : les deux headers et le fond
 * de brocante flouté restent en place, les objets achetés s'envolent un à un
 * vers le stockage, puis le décompte d'expérience part rejoindre la barre de
 * niveau — qui ne progresse qu'à cet instant (cf. `xpAffichageGele`).
 */
export function BilanSession({
  titre,
  items,
  xpLignes,
  cibleVolItems,
  stockageDepart,
  onTermine,
}: BilanSessionProps) {
  const { d, tr, locale } = useLangue();

  const lignes = xpLignes.filter((l) => l.montant > 0);
  const totalPrix = items.reduce((s, it) => s + it.prix, 0);
  const totalXp = lignes.reduce((s, l) => s + l.montant, 0);

  const [lance, setLance] = useState(false);
  const [itemsPartis, setItemsPartis] = useState(0);
  const [itemsAtterris, setItemsAtterris] = useState(0);
  const [lignesVisibles, setLignesVisibles] = useState(0);
  const [pastilleVisible, setPastilleVisible] = useState(false);
  /** Mouvement réduit : l'état final est posé, le tap suivant sort. */
  const [pretASortir, setPretASortir] = useState(false);

  const refsItems = useRef<Map<number, HTMLLIElement | null>>(new Map());
  const refPastille = useRef<HTMLSpanElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Garde : `onTermine` ne doit partir qu'une fois. */
  const termineRef = useRef(false);

  const purgerTimeouts = () => {
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];
  };

  useEffect(() => purgerTimeouts, []);

  const terminer = () => {
    if (termineRef.current) return;
    termineRef.current = true;
    onTermine();
  };

  const volerItem = (index: number) => {
    const el = refsItems.current.get(index);
    const item = items[index];
    if (!el || !item) return;
    const template = getTemplate(item.templateId);
    const rarity = getRarityColors(template?.rarete ?? "commun", template?.unique === true);
    flyToTab({
      fromRect: el.getBoundingClientRect(),
      imageUrl: getItemThumbUrl(item.templateId),
      fallbackBg: rarity.thumbBg,
      borderColor: rarity.outer,
      targetSelector: cibleVolItems,
    });
  };

  const volerPastille = () => {
    const el = refPastille.current;
    if (!el) return;
    flyToTab({
      fromRect: el.getBoundingClientRect(),
      imageUrl: null,
      fallbackBg: "var(--brass-500)",
      borderColor: "var(--brass-700)",
      targetSelector: CIBLE_XP,
      // Son distinct de l'ajout au stockage : on ne range rien, on gagne un rang.
      playSound: false,
    });
    audioManager.playRarete();
  };

  const appliquer = (etape: EtapeCeremonie) => {
    switch (etape.type) {
      case "envolItem":
        volerItem(etape.index);
        setItemsPartis(etape.index + 1);
        break;
      case "atterrissageItem":
        setItemsAtterris(etape.index + 1);
        break;
      case "ligneXp":
        setLignesVisibles(etape.index + 1);
        break;
      case "pastille":
        setPastilleVisible(true);
        break;
      case "volPastille":
        volerPastille();
        break;
      case "degel":
        degelerXpAffichage();
        break;
      case "sortie":
        terminer();
        break;
    }
  };

  /** Pose l'état final d'un coup (passage de cérémonie, mouvement réduit). */
  const poserEtatFinal = () => {
    purgerTimeouts();
    setItemsPartis(items.length);
    setItemsAtterris(items.length);
    setLignesVisibles(lignes.length);
    setPastilleVisible(lignes.length > 0);
    degelerXpAffichage();
  };

  const lancer = () => {
    if (lance) return;
    setLance(true);
    if (prefersReducedMotion()) {
      poserEtatFinal();
      if (items.length > 0) audioManager.playPickup();
      setPretASortir(true);
      return;
    }
    for (const { at, etape } of phasesCeremonie(items.length, lignes.length)) {
      timeoutsRef.current.push(setTimeout(() => appliquer(etape), at));
    }
  };

  const passer = () => {
    poserEtatFinal();
    timeoutsRef.current.push(setTimeout(terminer, SORTIE_APRES_PASSAGE_MS));
  };

  const boutonRetour = () => {
    if (!lance) return lancer();
    if (pretASortir) return terminer();
  };

  const mention =
    items.length === 0
      ? d.bilan.pochesVides
      : items.length === 1
        ? tr(d.bilan.unObjetTotal, { total: totalPrix })
        : tr(d.bilan.nObjetsTotal, { n: items.length, total: totalPrix });

  const libelleLigne: Record<SourceXp, string> = {
    achats: d.bilan.xpAchats,
    decouvertes: d.bilan.xpDecouvertes,
    negociations: d.bilan.xpNegociations,
  };

  const occupe = Math.min(
    stockageDepart.occupe + itemsAtterris,
    stockageDepart.capacite,
  );

  return (
    <div style={colonne}>
      {/* Capteur de tap « passer » : couvre tout le calque, barre du bas
          comprise (« un tap n'importe où »), et n'existe que pendant la
          cérémonie animée — le bouton Retour au QG est de toute façon
          désactivé à ce moment-là. */}
      {lance && !pretASortir && (
        <button
          type="button"
          data-testid="bilan-passer"
          aria-hidden
          tabIndex={-1}
          onClick={passer}
          style={capteurPassage}
        />
      )}

      <div style={zoneDefilante}>
        <CadreBilan titre={d.bilan.titreChinage} sousTitre={titre} mention={mention} />

        {items.length > 0 && (
          <ul style={liste}>
            {items.map((it, i) => (
              <li
                key={`${it.templateId}-${i}`}
                ref={(el) => {
                  refsItems.current.set(i, el);
                }}
                style={{
                  ...ligneItem,
                  animation:
                    i < itemsPartis
                      ? `broc-bilan-ligne-out ${EFFACEMENT_LIGNE_MS}ms ease-in forwards`
                      : undefined,
                }}
              >
                <ItemSticker templateId={it.templateId} categorie={it.categorie} thumb />
                <span style={nomItem}>{nomObjet(it, locale)}</span>
                <span style={prixItem}>−{it.prix} €</span>
              </li>
            ))}
          </ul>
        )}

        {lignesVisibles > 0 && (
          <div style={blocXp}>
            <div style={eyebrowXp}>{d.bilan.xpEyebrow}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {lignes.slice(0, lignesVisibles).map((l) => (
                <li
                  key={l.cle}
                  style={{ ...ligneXp, animation: `broc-bilan-pop ${POP_PASTILLE_MS}ms ease-out` }}
                >
                  <span>{libelleLigne[l.cle]}</span>
                  <span style={montantXp}>+{l.montant}</span>
                </li>
              ))}
            </ul>
            {pastilleVisible && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                <span
                  ref={refPastille}
                  style={{ ...pastille, animation: `broc-bilan-pop ${POP_PASTILLE_MS}ms ease-out` }}
                >
                  {tr(d.bilan.xpTotal, { n: totalXp })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <BarreBasSession
        gauche={
          <button
            type="button"
            aria-label={d.bilan.retourQgAria}
            onClick={boutonRetour}
            disabled={lance && !pretASortir}
            style={{ ...boutonQg, opacity: lance && !pretASortir ? 0.45 : 1 }}
          >
            <DoorOpen size={26} strokeWidth={2} />
            {d.bilan.retourQg}
          </button>
        }
        droite={
          <span
            data-fly-target="stockage-bilan"
            aria-label={tr(d.bilan.stockageAria, {
              occupe,
              capacite: stockageDepart.capacite,
            })}
            style={jauge}
          >
            <Package size={22} strokeWidth={2} aria-hidden />
            {occupe}/{stockageDepart.capacite}
          </span>
        }
      />
    </div>
  );
}

const colonne: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  height: "100%",
};

/** Capteur plein calque du tap « passer », au-dessus du contenu et de la barre. */
const capteurPassage: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

const zoneDefilante: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  padding: "18px 16px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const liste: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const ligneItem: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 12,
  padding: "10px 4px",
  borderBottom: "1px dotted rgba(247,244,238,0.35)",
  overflow: "hidden",
};

const nomItem: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--paper-100)",
  textShadow: "0 1px 3px rgba(0,0,0,0.65)",
};

const prixItem: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 16,
  color: "var(--vermillion-600)",
  textShadow: "0 1px 3px rgba(0,0,0,0.5)",
};

const blocXp: CSSProperties = {
  background: "rgba(15,30,22,0.55)",
  border: "1px solid var(--brass-700)",
  padding: "14px 18px 16px",
};

const eyebrowXp: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  textAlign: "center",
  marginBottom: 10,
};

const ligneXp: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "5px 0",
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--paper-100)",
};

const montantXp: CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--brass-300)",
};

const pastille: CSSProperties = {
  display: "inline-block",
  padding: "6px 16px",
  background: "var(--brass-500)",
  border: "1.5px solid var(--brass-700)",
  color: "var(--forest-800)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: "0.1em",
};

const boutonQg: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(10px, 2.6vw, 12px)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  padding: 0,
};

const jauge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
};
```

- [ ] **Step 5 : lancer les tests et vérifier qu'ils passent**

Run : `npx vitest run src/components/mobile/bilan/BilanSession.test.tsx`
Expected : PASS — 12 tests.

Si le test « le bouton ne peut pas relancer la cérémonie » échoue, vérifier que `disabled` est bien posé sur le bouton dès `lance === true`.

- [ ] **Step 6 : vérifier le typage et le lint**

Run : `npx tsc --noEmit && npx eslint src/components/mobile/bilan`
Expected : aucune sortie.

- [ ] **Step 7 : commit**

```bash
git add src/components/mobile/bilan/BilanSession.tsx src/components/mobile/bilan/BilanSession.test.tsx src/app/globals.css
git commit -m "feat(bilan): calque de bilan et cérémonie d'envol des items"
```

---

### Task 7 : câblage dans la session de chinage

**Files:**
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx`

**Interfaces:**
- Consumes: `BilanSession` + `LigneXp` (Task 6), `gelerXpAffichage` / `degelerXpAffichage` (Task 2), `totalEnStock` / `getCapaciteStockage` (`@/lib/stockage`).
- Produces: rien pour les tâches suivantes.

- [ ] **Step 1 : remplacer les imports**

Dans `src/app/chiner/[brocanteId]/ClientPage.tsx` :

Supprimer :
```ts
import { SessionSummary } from "@/components/SessionSummary";
import { useXpFloats, XpFloatsVue } from "@/components/mobile/XpFloats";
```

Ajouter :
```ts
import { BilanSession, type LigneXp } from "@/components/mobile/bilan/BilanSession";
import { degelerXpAffichage, gelerXpAffichage } from "@/lib/xpAffichageGele";
```

Compléter l'import existant de `@/lib/stockage` :
```ts
import { getCapaciteStockage, placeRestante, stockageEstPlein, totalEnStock } from "@/lib/stockage";
```

- [ ] **Step 2 : découper l'accumulateur XP en trois compteurs**

Remplacer :

```ts
  /** XP de Brocanteur gagnée localement durant la session. */
  const [xpBrocanteurSession, setXpBrocanteurSession] = useState(0);
```

par :

```ts
  /** XP de Brocanteur gagnée durant la session, ventilée par source pour le
   *  décompte du bilan. Le total part dans l'historique de session. */
  const [xpSession, setXpSession] = useState({
    achats: 0,
    decouvertes: 0,
    negociations: 0,
  });
  /** Occupation du stockage à l'entrée : le bilan fait monter le compteur. */
  const stockageDepartRef = useRef({ occupe: 0, capacite: 0 });
```

Remplacer le bloc :

```ts
  const { floats, pousserXp } = useXpFloats();

  const gagnerXPLocal = (montant: number) => {
    gagnerXPBrocanteur(montant);
    setXpBrocanteurSession((prev) => prev + montant);
    pousserXp(montant);
  };
```

par :

```ts
  /** Compte l'XP pour le décompte du bilan, sans la créditer (cas des +10 de
   *  découverte, déjà crédités atomiquement par le GameContext). */
  const compterXp = (cle: keyof typeof xpSession, montant: number) => {
    setXpSession((prev) => ({ ...prev, [cle]: prev[cle] + montant }));
  };

  /** Crédite l'XP immédiatement ET la compte pour le bilan. L'affichage de la
   *  barre est gelé : elle ne bougera qu'à la cérémonie. */
  const gagnerXPLocal = (cle: keyof typeof xpSession, montant: number) => {
    gagnerXPBrocanteur(montant);
    compterXp(cle, montant);
  };
```

- [ ] **Step 3 : geler la barre à l'entrée, dégeler à la sortie**

Dans l'effet d'entrée de session, juste après `entreePayeeRef.current = true;` :

```ts
      gelerXpAffichage(state.brocanteur);
      stockageDepartRef.current = {
        occupe: totalEnStock(state),
        capacite: getCapaciteStockage(state),
      };
```

Puis, juste après cet effet, ajouter un effet de montage dédié :

```ts
  // Filet : quel que soit le chemin de sortie (retour arrière, navigation
  // directe, remontée après kill), la barre XP ne reste jamais gelée.
  useEffect(() => () => degelerXpAffichage(), []);
```

- [ ] **Step 4 : adapter les trois points de gain**

Dans `handleAchatAuPrix`, remplacer :

```ts
    if (estDecouverte) {
      setXpBrocanteurSession((prev) => prev + XP_DECOUVERTE_COLLECTION);
      pousserXp(XP_DECOUVERTE_COLLECTION);
    }
    gagnerXPLocal(
      XP_ACHAT_BROCANTEUR *
        multiplicateurXPRarete(
          it.objet.rarete,
          !!getTemplate(it.objet.templateId)?.unique,
        ),
    );
```

par :

```ts
    if (estDecouverte) {
      compterXp("decouvertes", XP_DECOUVERTE_COLLECTION);
    }
    gagnerXPLocal(
      "achats",
      XP_ACHAT_BROCANTEUR *
        multiplicateurXPRarete(
          it.objet.rarete,
          !!getTemplate(it.objet.templateId)?.unique,
        ),
    );
```

Dans le `onConclu` du `ChineNegoDrawer`, remplacer `gagnerXPBrocanteur(XP_NEGO_BROCANTEUR)` — écrit `gagnerXPLocal(XP_NEGO_BROCANTEUR)` — par :

```ts
                  gagnerXPLocal("negociations", XP_NEGO_BROCANTEUR);
```

- [ ] **Step 5 : remplacer le bloc de résumé par le calque de bilan**

Supprimer entièrement le bloc :

```tsx
  if (resumeOuvert) {
    return (
      <SessionSummary … />
    );
  }
```

Adapter `handleRetourQg` pour qu'il ne soit plus qu'une sortie (il est désormais appelé en fin de cérémonie) :

```ts
  /** Fin de cérémonie de bilan : enregistre la session, avance le jour, sort. */
  const handleRetourQg = () => {
    if (sessionEnregistreeRef.current) {
      router.push("/bureau");
      return;
    }
    sessionEnregistreeRef.current = true;
    if (brocante && state) {
      enregistrerSession({
        id: crypto.randomUUID(),
        type: "chinage",
        jour: state.jourActuel,
        timestamp: Date.now(),
        brocanteId: brocante.id,
        brocanteNom: brocante.nom,
        achats,
        xpGagne: {},
        xpBrocanteur: xpSession.achats + xpSession.decouvertes + xpSession.negociations,
      });
    }
    avancerJour();
    router.push("/bureau");
  };
```

Dans le JSX, remplacer le contenu de la zone du deck :

```tsx
        <div style={{ flex: 1, minHeight: 0, position: "relative", zIndex: 1 }}>
          <ItemSwipeDeck … />
        </div>
```

par :

```tsx
        <div style={{ flex: 1, minHeight: 0, position: "relative", zIndex: 1 }}>
          {resumeOuvert ? (
            <BilanSession
              titre={nomBrocante(brocante, locale)}
              items={achats.map((a) => ({
                templateId: a.templateId,
                nom: a.nom,
                categorie: a.categorie,
                prix: a.prixPaye,
              }))}
              xpLignes={lignesXpBilan}
              cibleVolItems='[data-fly-target="stockage-bilan"]'
              stockageDepart={stockageDepartRef.current}
              onTermine={handleRetourQg}
            />
          ) : (
            <ItemSwipeDeck … />
          )}
        </div>
```

(garder le contenu de `<ItemSwipeDeck …>` tel quel, il ne change pas)

Enfin, supprimer la ligne `<XpFloatsVue floats={floats} />` et ajouter, au-dessus du `return` principal, la construction des lignes :

```ts
  const lignesXpBilan: LigneXp[] = [
    { cle: "achats", montant: xpSession.achats },
    { cle: "decouvertes", montant: xpSession.decouvertes },
    { cle: "negociations", montant: xpSession.negociations },
  ];
```

- [ ] **Step 6 : vérifier typage, lint et suite de tests**

Run : `npx tsc --noEmit`
Expected : aucune erreur.

Run : `npx eslint src/app/chiner`
Expected : aucune sortie (en particulier aucune violation des règles de hooks).

Run : `npm run test:run`
Expected : PASS.

- [ ] **Step 7 : vérification manuelle en navigateur**

Run : `npm run dev`, puis dans le navigateur : nouvelle partie ou partie existante → aller chiner → acheter 2 ou 3 objets → « Sortir » → « Retour au QG ».

Attendu :
1. Le bilan s'affiche **dans** la session : headers haut et bas visibles, brocante floutée derrière.
2. Pendant la session, aucun « +N XP » ne s'affiche et la barre du header ne bouge pas.
3. Au tap, les objets s'envolent un à un vers l'icône Stockage, avec le son d'ajout et la pulsation ; le compteur monte.
4. Le décompte XP se compose, la pastille part vers la barre, **puis** la barre progresse.
5. Retour au QG ; si un niveau a été franchi, le certificat s'y déclenche.

- [ ] **Step 8 : commit**

```bash
git add src/app/chiner/[brocanteId]/ClientPage.tsx
git commit -m "feat(chinage): cérémonie de bilan à la place de l'écran de résumé"
```

---

### Task 8 : retrait des floats XP et gel côté vente

**Files:**
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx`
- Modify: `src/app/globals.css` (retrait de la keyframe `broc-xp-float`)
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (retrait de `chrome.xpGagne`)
- Delete: `src/components/mobile/XpFloats.tsx`, `src/components/mobile/XpFloats.test.tsx`

**Interfaces:**
- Consumes: `gelerXpAffichage` / `degelerXpAffichage` (Task 2).
- Produces: rien.

La vente n'a pas encore sa cérémonie : sa barre reste gelée pendant la session et rattrape simplement au retour au QG.

- [ ] **Step 1 : nettoyer la page de vente**

Dans `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` :

Supprimer l'import :
```ts
import { useXpFloats, XpFloatsVue } from "@/components/mobile/XpFloats";
```

Ajouter :
```ts
import { degelerXpAffichage, gelerXpAffichage } from "@/lib/xpAffichageGele";
```

Remplacer :

```ts
  const { floats, pousserXp } = useXpFloats();

  const gagnerXPLocal = (montant: number) => {
    gagnerXPBrocanteur(montant);
    setXpBrocanteurSession((prev) => prev + montant);
    pousserXp(montant);
  };
```

par :

```ts
  const gagnerXPLocal = (montant: number) => {
    gagnerXPBrocanteur(montant);
    setXpBrocanteurSession((prev) => prev + montant);
  };
```

Supprimer la ligne `<XpFloatsVue floats={floats} />` du JSX.

Ajouter, à côté des autres effets de montage du composant :

```ts
  /** Garde : la barre est gelée une seule fois, sur l'état d'entrée de session. */
  const barreGeleeRef = useRef(false);

  // La barre XP ne progresse pas pendant la vente : elle rattrape au retour
  // au QG (la vente n'a pas encore sa cérémonie de bilan).
  useEffect(() => {
    if (!state || barreGeleeRef.current) return;
    barreGeleeRef.current = true;
    gelerXpAffichage(state.brocanteur);
  }, [state]);

  useEffect(() => () => degelerXpAffichage(), []);
```

- [ ] **Step 2 : supprimer le composant et son test**

```bash
git rm src/components/mobile/XpFloats.tsx src/components/mobile/XpFloats.test.tsx
```

- [ ] **Step 3 : retirer la keyframe**

Dans `src/app/globals.css`, supprimer le bloc complet (commentaire inclus) :

```css
/* Float « +XP » en session (chinage, vente) : monte puis s'efface. */
@keyframes broc-xp-float {
  0% { opacity: 0; transform: translateY(6px); }
  15% { opacity: 1; transform: translateY(0); }
  70% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-14px); }
}
```

- [ ] **Step 4 : retirer la clé i18n devenue inutile**

Supprimer la ligne `xpGagne: …` de la section `chrome` dans les 4 fichiers :
`src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts`, `el.ts`.

- [ ] **Step 5 : vérifier qu'il ne reste aucune référence**

Run : `grep -rn "XpFloats\|xpGagne\|broc-xp-float" src`
Expected : aucune sortie.

- [ ] **Step 6 : typage, lint, suite complète**

Run : `npx tsc --noEmit && npx eslint src && npm run test:run`
Expected : aucune erreur, tous les tests verts.

- [ ] **Step 7 : commit**

```bash
git add -A
git commit -m "refactor(xp): supprime les notifications d'XP en session"
```

---

## Vérification finale

- [ ] **Suite complète et lint**

Run : `npm run test:run && npx tsc --noEmit && npx eslint src`
Expected : tous les tests verts, aucune erreur de type, aucune violation de lint.

- [ ] **Recette device (à faire par Guillaume)**

Sur simulateur iOS via `scripts/ios-sim.sh` puis sur device :
1. Bilan de chinage avec 5+ objets — la liste défile, le cadre ne bouge pas, la barre du bas reste au-dessus de la zone sûre.
2. Session sans achat — mention « les poches vides », pas de vol d'item, décompte XP éventuel puis sortie.
3. Passage de la cérémonie d'un tap.
4. Réglages iOS → Accessibilité → Réduire les animations : premier tap = état final, second tap = sortie.
5. Session amenant un passage de niveau — la barre bouge à la pastille, le certificat se déclenche au QG.
