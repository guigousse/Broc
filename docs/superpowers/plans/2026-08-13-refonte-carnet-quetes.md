# Refonte du carnet de quêtes — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le registre à onglets par un carnet en fenêtre flottante — trois sections rétractables, photos scotchées, pavé récompense qui devient bouton Livrer — et enchaîner automatiquement les chapitres du grand-père après la cérémonie de livraison.

**Architecture :** On construit les briques de bas en haut (préférence de repli, photo scotchée, pavé, cérémonie extraite), puis les deux formes de carte, puis le châssis qui les assemble et remplace l'ancien registre. L'enchaînement du grand-père vient en dernier : il réutilise `chapitreEnAttente`, le mécanisme de file d'attente déjà en place, qui porte **déjà** le battement de 500 ms demandé.

**Tech Stack :** TypeScript, React 19 / Next 16, Vitest + Testing Library (jsdom), `lucide-react`, i18n maison par dictionnaires (FR/EN/ES/EL).

## Global Constraints

- **`vitest` exige `--maxWorkers=4` sur ce Mac.** Sans le drapeau, ~40 faux échecs apparaissent par famine de workers. Toutes les commandes de test de ce plan le portent.
- **Aucun changement de `SAVE_VERSION`, aucune migration.** Le repli des sections vit dans `localStorage` ; la file d'attente du grand-père est de l'état React.
- **Quatre langues, sans exception :** FR, EN, ES, EL. Chaque tâche ajoute les clés dont elle a besoin **dans les quatre dictionnaires** (`src/lib/i18n/ui/{fr,en,es,el}.ts`).
- **Code, commentaires, tests et messages de commit en français.**
- **Palette : uniquement les jetons existants** — `--paper-100/200/300`, `--brass-500`, `--ink-*`, `--patina-500`. **Aucun `#6e1f1f`** ni autre couleur codée en dur dans les fichiers neufs.
- **Jamais de chaîne localisée en sauvegarde.**
- `npm run lint` est cassé (Next 16) → `npx eslint src`.

## Deux contrats invisibles à ne jamais rompre

La cérémonie d'envol des jetons (`lancerLivraison`, aujourd'hui dans `OngletCommandes.tsx`) manipule le DOM par sélecteurs. Si les attributs disparaissent, l'animation ne casse pas bruyamment — **elle s'exécute dans le vide**, et aucun test de rendu ne s'en aperçoit.

| Attribut | Qui le lit | Ce qui casse sans lui |
|---|---|---|
| `data-jeton="argent" \| "xp" \| "energie"` | `racine.querySelectorAll('[data-jeton="…"]')` | le jeton n'est pas masqué et aucun clone ne s'envole |
| `data-commande-id="<courrierId>"` | `document.querySelector('[data-commande-id="…"]')` | la carte livrée ne se fond pas et reste à l'écran |

Les deux doivent être portés par les composants neufs, et **testés**.

---

## Structure des fichiers

**Créés** — tous sous `src/components/mobile/qg/carnet/` :

| Fichier | Responsabilité |
|---|---|
| `useCarnetSections.ts` | lire/écrire l'état de repli dans `localStorage` |
| `PhotoScotchee.tsx` | une photo d'objet scotchée, ou l'icône Lucide à sa place |
| `PaveRecompense.tsx` | pavé récompense ↔ bouton Livrer (porte `data-jeton`) |
| `useCeremonieLivraison.ts` | orchestration des minuteurs d'envol des jetons |
| `SectionRetractable.tsx` | en-tête collante, chevron, compteur, repli |
| `LigneQuete.tsx` | ligne périodique : vignettes, barre, dépliage |
| `CarteHistoire.tsx` | carte de chapitre : polaroïd, objectif actuel, fil des étapes |
| `CarnetOverlay.tsx` | châssis : voile, fenêtre, en-tête, défilement, sections |
| `objectifs.ts` | libellé d'un objectif + prédicat `objectifEnEuros` (déménagés) |

**Écart assumé par rapport à la spec §5 :** la spec listait sept fichiers ; ce plan en crée neuf. `useCeremonieLivraison.ts` isole ~70 lignes d'orchestration de minuteurs qui, réinjectées dans un composant, en feraient exactement le genre de fichier fourre-tout que cette refonte cherche à défaire. `objectifs.ts` accueille la logique déménagée de `CommandeRow` pour qu'elle ne soit pas dupliquée entre la carte et la ligne.

**Modifiés :** `src/app/(qg)/layout.tsx`, les quatre dictionnaires `src/lib/i18n/ui/*.ts`.

**Supprimés en fin de parcours (tâche 8) :** `RegistreOverlay.tsx`, `OngletCommandes.tsx`, `CommandeRow.tsx`, `OngletComptes.tsx` et leurs tests.

---

### Task 1 : La mémoire du repli

**Files:**
- Create: `src/components/mobile/qg/carnet/useCarnetSections.ts`
- Test: `src/components/mobile/qg/carnet/useCarnetSections.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `type CleSection = "histoire" | "quotidiennes" | "hebdomadaires"` ; `function useCarnetSections(): { estRepliee: (c: CleSection) => boolean; basculer: (c: CleSection) => void }`.

**Contexte.** Le projet range ses préférences d'affichage dans `localStorage` avec un préfixe `broc.` (voir `broc.qg-edit.enabled` dans `src/app/(qg)/layout.tsx`). On suit cette convention. La clé est `broc.carnet.sections`, la valeur un JSON `{ "histoire": true }` où une clé présente à `true` signifie **repliée** (absent = déplié, donc l'état par défaut est « tout déplié » sans rien écrire).

**Le point qui compte :** `localStorage` peut être absent (SSR), plein, ou contenir du JSON corrompu. Aucun de ces cas ne doit empêcher le carnet de s'ouvrir. C'est la seule chose que ce hook a le droit de rater, et il doit la rater silencieusement.

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `src/components/mobile/qg/carnet/useCarnetSections.test.ts` :

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCarnetSections, CLE_STOCKAGE_CARNET } from "./useCarnetSections";

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

describe("useCarnetSections", () => {
  it("toutes les sections sont dépliées au premier usage", () => {
    const { result } = renderHook(() => useCarnetSections());
    expect(result.current.estRepliee("histoire")).toBe(false);
    expect(result.current.estRepliee("quotidiennes")).toBe(false);
    expect(result.current.estRepliee("hebdomadaires")).toBe(false);
  });

  it("basculer replie, rebasculer déplie", () => {
    const { result } = renderHook(() => useCarnetSections());
    act(() => result.current.basculer("histoire"));
    expect(result.current.estRepliee("histoire")).toBe(true);
    act(() => result.current.basculer("histoire"));
    expect(result.current.estRepliee("histoire")).toBe(false);
  });

  it("le repli survit à un remontage", () => {
    const premier = renderHook(() => useCarnetSections());
    act(() => premier.result.current.basculer("quotidiennes"));
    premier.unmount();
    const second = renderHook(() => useCarnetSections());
    expect(second.result.current.estRepliee("quotidiennes")).toBe(true);
    expect(second.result.current.estRepliee("histoire")).toBe(false);
  });

  it("un JSON corrompu est ignoré, tout est déplié", () => {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, "{ceci n'est pas du json");
    const { result } = renderHook(() => useCarnetSections());
    expect(result.current.estRepliee("histoire")).toBe(false);
  });

  it("une valeur du mauvais type est ignorée", () => {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, '"une chaîne"');
    const { result } = renderHook(() => useCarnetSections());
    expect(result.current.estRepliee("histoire")).toBe(false);
  });

  it("une écriture qui échoue ne casse pas le basculement en mémoire", () => {
    const vraiSetItem = window.localStorage.setItem;
    window.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
    try {
      const { result } = renderHook(() => useCarnetSections());
      act(() => result.current.basculer("histoire"));
      expect(result.current.estRepliee("histoire")).toBe(true); // l'UI suit quand même
    } finally {
      window.localStorage.setItem = vraiSetItem;
    }
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/useCarnetSections.test.ts
```

Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 3 : Écrire le hook**

Créer `src/components/mobile/qg/carnet/useCarnetSections.ts` :

```ts
"use client";

import { useCallback, useState } from "react";

/** Clé de préférence d'affichage — même convention que `broc.qg-edit.enabled`. */
export const CLE_STOCKAGE_CARNET = "broc.carnet.sections";

export type CleSection = "histoire" | "quotidiennes" | "hebdomadaires";

type EtatReplis = Partial<Record<CleSection, boolean>>;

/**
 * Lecture défensive : `localStorage` peut être absent (SSR), inaccessible, ou
 * contenir n'importe quoi (main humaine, version antérieure). Aucun de ces cas
 * ne doit empêcher le carnet de s'ouvrir — on retombe sur « tout déplié ».
 */
function lire(): EtatReplis {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE_CARNET);
    if (!brut) return {};
    const parse: unknown = JSON.parse(brut);
    if (typeof parse !== "object" || parse === null || Array.isArray(parse)) return {};
    return parse as EtatReplis;
  } catch {
    return {};
  }
}

/** Écriture au mieux : un quota plein ne doit pas casser l'interaction. */
function ecrire(etat: EtatReplis): void {
  try {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, JSON.stringify(etat));
  } catch {
    /* préférence d'affichage : perdre l'écriture est sans conséquence */
  }
}

/**
 * Repli des sections du carnet. Une clé absente vaut « dépliée » : l'état par
 * défaut n'écrit donc rien, et une sauvegarde neuve ouvre le carnet en entier.
 */
export function useCarnetSections() {
  const [replis, setReplis] = useState<EtatReplis>(() => lire());

  const estRepliee = useCallback((c: CleSection) => replis[c] === true, [replis]);

  const basculer = useCallback((c: CleSection) => {
    setReplis((prev) => {
      const next = { ...prev, [c]: !prev[c] };
      ecrire(next);
      return next;
    });
  }, []);

  return { estRepliee, basculer };
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/useCarnetSections.test.ts
```

Attendu : SUCCÈS (6 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/components/mobile/qg/carnet/
git commit -m "feat(carnet): mémoire du repli des sections dans localStorage"
```

---

### Task 2 : La photo scotchée

**Files:**
- Create: `src/components/mobile/qg/carnet/PhotoScotchee.tsx`
- Test: `src/components/mobile/qg/carnet/PhotoScotchee.test.tsx`

**Interfaces:**
- Consumes: rien des tâches précédentes.
- Produces: `function PhotoScotchee(props: { templateId?: string; categorie?: CategorieObjet; icone?: LucideIcon; taille: number; inclinaison?: number; accompli?: boolean; alt?: string }): JSX.Element`.

**Contexte.** C'est la brique visuelle qui porte l'idée « vrai carnet ». Deux modes exclusifs, et c'est la règle posée par le propriétaire du projet :

- **`templateId` fourni** → la photo de l'objet, via le composant existant `ItemImage` (`src/components/ui/ItemImage.tsx`, props `templateId`, `categorie`, `alt`, `fallbackIconSize`).
- **`icone` fournie** (un composant `lucide-react`) → l'icône, sur le même papier, avec le même ruban adhésif.

Fournir les deux ou aucun est une erreur d'appel : dans ce cas, **la photo l'emporte** si `templateId` est présent, sinon l'icône, sinon un cadre vide — jamais une exception, le carnet ne doit pas se briser sur une donnée bancale.

**Rendu attendu :** un cadre papier (`--paper-100`) avec une ombre portée douce, légèrement pivoté (`inclinaison` en degrés, défaut ±2 selon l'index d'appel), et une bande de ruban adhésif translucide en haut, débordant du cadre. Quand `accompli` est vrai, une pastille ✓ en `--patina-500` en coin.

**Sur les blocs de style laissés vides dans ce plan :** c'est délibéré, pas un oubli. Les valeurs exactes de padding, d'ombre et de rotation se règlent à l'œil devant l'écran, et les figer ici produirait un carnet conforme au plan et laid. Ce qui est imposé et non négociable : **les tokens de couleur** (aucune valeur hexadécimale en dur), **les attributs `data-*`** que les tests lisent, et la structure des éléments. Le reste est à toi.

- [ ] **Step 1 : Écrire les tests qui échouent**

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Gem } from "lucide-react";
import { PhotoScotchee } from "./PhotoScotchee";

afterEach(cleanup);

describe("PhotoScotchee", () => {
  it("avec un templateId, rend la photo de l'objet", () => {
    render(<PhotoScotchee templateId="ma.lampe_petrole_ancienne" categorie="Maison" taille={64} alt="lampe" />);
    expect(screen.getByAltText("lampe")).toBeTruthy();
    expect(document.querySelector("[data-photo-scotchee='objet']")).toBeTruthy();
    expect(document.querySelector("[data-photo-scotchee='icone']")).toBeNull();
  });

  it("sans templateId mais avec une icône, rend l'icône", () => {
    render(<PhotoScotchee icone={Gem} taille={64} />);
    expect(document.querySelector("[data-photo-scotchee='icone']")).toBeTruthy();
    expect(document.querySelector("[data-photo-scotchee='objet']")).toBeNull();
  });

  it("les deux fournis : la photo l'emporte, sans lever d'erreur", () => {
    render(<PhotoScotchee templateId="ma.lampe_petrole_ancienne" categorie="Maison" icone={Gem} taille={64} alt="lampe" />);
    expect(document.querySelector("[data-photo-scotchee='objet']")).toBeTruthy();
    expect(document.querySelector("[data-photo-scotchee='icone']")).toBeNull();
  });

  it("ni l'un ni l'autre : rend un cadre vide sans lever d'erreur", () => {
    expect(() => render(<PhotoScotchee taille={64} />)).not.toThrow();
    expect(document.querySelector("[data-photo-scotchee='vide']")).toBeTruthy();
  });

  it("accompli affiche la pastille ✓", () => {
    render(<PhotoScotchee icone={Gem} taille={64} accompli />);
    expect(screen.getByText("✓")).toBeTruthy();
  });

  it("aucune couleur bordeaux codée en dur", () => {
    const { container } = render(<PhotoScotchee icone={Gem} taille={64} />);
    expect(container.innerHTML.toLowerCase()).not.toContain("#6e1f1f");
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/PhotoScotchee.test.tsx
```

Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 3 : Écrire le composant**

Structure imposée (le style fin est à toi, les attributs `data-photo-scotchee` ne le sont pas — un test les lit) :

```tsx
"use client";

import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { ItemImage } from "@/components/ui/ItemImage";
import type { CategorieObjet } from "@/types/game";

interface Props {
  /** Objet demandé. Prioritaire sur `icone` si les deux sont fournis. */
  templateId?: string;
  categorie?: CategorieObjet;
  /** Icône Lucide pour une quête sans objet nommé. */
  icone?: LucideIcon;
  /** Côté du cadre, en px. */
  taille: number;
  /** Rotation en degrés — c'est elle qui donne l'air « posé à la main ». */
  inclinaison?: number;
  /** Pastille ✓ en coin. */
  accompli?: boolean;
  alt?: string;
}

export function PhotoScotchee({ templateId, categorie, icone: Icone, taille, inclinaison = -2, accompli = false, alt = "" }: Props) {
  const mode = templateId ? "objet" : Icone ? "icone" : "vide";
  // … cadre papier (--paper-100), ombre douce, transform: rotate(inclinaison deg),
  //   ruban adhésif en haut (bande translucide débordante),
  //   pastille ✓ en --patina-500 quand `accompli`.
  return (
    <span data-photo-scotchee={mode} style={/* … */ {} as CSSProperties}>
      {/* ruban */}
      {mode === "objet" && (
        <ItemImage templateId={templateId!} categorie={categorie ?? "Maison"} alt={alt} fallbackIconSize={Math.round(taille * 0.5)} />
      )}
      {mode === "icone" && <Icone size={Math.round(taille * 0.5)} aria-hidden />}
      {accompli && <span aria-hidden>✓</span>}
    </span>
  );
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/PhotoScotchee.test.tsx
```

Attendu : SUCCÈS (6 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/components/mobile/qg/carnet/PhotoScotchee.tsx src/components/mobile/qg/carnet/PhotoScotchee.test.tsx
git commit -m "feat(carnet): photo scotchée, ou icône à sa place"
```

---

### Task 3 : Le pavé récompense ↔ livrer

**Files:**
- Create: `src/components/mobile/qg/carnet/PaveRecompense.tsx`
- Test: `src/components/mobile/qg/carnet/PaveRecompense.test.tsx`
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts`

**Interfaces:**
- Consumes: rien des tâches précédentes.
- Produces: `function PaveRecompense(props: { recompense: RecompenseEffective; livrable: boolean; verrouille?: boolean; onLivrer: () => void }): JSX.Element`.

**Contexte, et c'est la tâche la plus risquée du plan.** Ce pavé est l'ancre de la cérémonie d'envol des jetons. `RecompenseJetons` (`src/components/mobile/qg/RecompenseJetons.tsx`) fait ce travail aujourd'hui, mais il peint ses jetons en `#6e1f1f` codé en dur : **on ne le réutilise pas**, on écrit le pavé neuf dans la palette à jetons. En revanche, on hérite de son contrat DOM.

**Le contrat à honorer** : chaque jeton de gain non nul porte `data-jeton="argent"`, `"xp"` ou `"energie"`. La cérémonie fait `racine.querySelectorAll('[data-jeton="…"]')` pour masquer le jeton et faire partir son clone. Sans cet attribut, l'animation s'exécute dans le vide — silencieusement.

`RecompenseEffective` vient de `src/lib/recompenses.ts` : `{ argent: number; xp: number; energie: number }`. Un gain à `0` **ne doit pas** produire de jeton (la cérémonie n'émet d'étape que pour les gains non nuls ; un jeton orphelin resterait masqué à vie).

**Trois états visuels :**

| État | Rendu |
|---|---|
| `livrable === false` | les jetons, en teinte sourde, sous le libellé « Récompense » |
| `livrable === true`, `verrouille !== true` | pavé doré, cliquable, libellé « Livrer », les jetons restent visibles |
| `livrable === true`, `verrouille === true` | même pavé mais grisé et `disabled` — cérémonie d'une autre quête en cours |

- [ ] **Step 1 : Ajouter les clés dans les quatre dictionnaires**

Dans `src/lib/i18n/ui/fr.ts`, à l'intérieur de l'objet `carnet` :

```ts
    paveRecompense: "Récompense",
    paveLivrer: "Livrer",
```

Les mêmes clés, au même endroit, dans les trois autres :

```ts
// en.ts
    paveRecompense: "Reward",
    paveLivrer: "Deliver",
// es.ts
    paveRecompense: "Recompensa",
    paveLivrer: "Entregar",
// el.ts
    paveRecompense: "Ανταμοιβή",
    paveLivrer: "Παράδοση",
```

> Si `d.carnet.pret` / `d.carnet.livrer` existent déjà avec ces sens, les réutiliser plutôt que d'ajouter des doublons — vérifier avant d'écrire, et le dire dans le rapport.

- [ ] **Step 2 : Écrire les tests qui échouent**

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PaveRecompense } from "./PaveRecompense";

afterEach(cleanup);

const REC = { argent: 60, xp: 12, energie: 0 };

describe("PaveRecompense", () => {
  it("porte data-jeton pour chaque gain non nul, et pour eux seuls", () => {
    render(<PaveRecompense recompense={REC} livrable={false} onLivrer={() => {}} />);
    expect(document.querySelector('[data-jeton="argent"]')).toBeTruthy();
    expect(document.querySelector('[data-jeton="xp"]')).toBeTruthy();
    // énergie vaut 0 : pas de jeton, sinon la cérémonie masquerait un jeton
    // qu'aucune étape ne fera réapparaître.
    expect(document.querySelector('[data-jeton="energie"]')).toBeNull();
  });

  it("pas livrable : aucun bouton, le libellé annonce la récompense", () => {
    render(<PaveRecompense recompense={REC} livrable={false} onLivrer={() => {}} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("livrable : bouton actif qui appelle onLivrer", async () => {
    const onLivrer = vi.fn();
    render(<PaveRecompense recompense={REC} livrable onLivrer={onLivrer} />);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(onLivrer).toHaveBeenCalledTimes(1);
  });

  it("verrouillé : bouton présent mais désactivé, onLivrer jamais appelé", () => {
    const onLivrer = vi.fn();
    render(<PaveRecompense recompense={REC} livrable verrouille onLivrer={onLivrer} />);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    btn.click();
    expect(onLivrer).not.toHaveBeenCalled();
  });

  it("les jetons restent présents à l'état livrable (la cérémonie part d'eux)", () => {
    render(<PaveRecompense recompense={REC} livrable onLivrer={() => {}} />);
    expect(document.querySelector('[data-jeton="argent"]')).toBeTruthy();
  });

  it("aucune couleur bordeaux codée en dur", () => {
    const { container } = render(<PaveRecompense recompense={REC} livrable onLivrer={() => {}} />);
    expect(container.innerHTML.toLowerCase()).not.toContain("#6e1f1f");
  });
});
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/PaveRecompense.test.tsx
```

Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 4 : Écrire le composant**

```tsx
"use client";

import type { CSSProperties } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { RecompenseEffective } from "@/lib/recompenses";

interface Props {
  recompense: RecompenseEffective;
  livrable: boolean;
  /** Cérémonie d'une AUTRE quête en cours : bouton grisé, tap refusé. */
  verrouille?: boolean;
  onLivrer: () => void;
}

/**
 * Pavé de droite d'une quête. Tant qu'elle n'est pas remplie il montre la
 * récompense ; dès qu'elle l'est, LE MÊME pavé s'allume et devient le bouton
 * Livrer. La cérémonie d'envol part donc de l'endroit exact où les jetons
 * étaient dessinés.
 *
 * ⚠ Chaque jeton porte `data-jeton` : c'est par cet attribut que la cérémonie
 * les retrouve pour les masquer et lancer leur clone. Un gain nul ne produit
 * PAS de jeton — la cérémonie n'émet d'étape que pour les gains non nuls, et un
 * jeton masqué sans étape de retour resterait invisible pour toute la partie.
 */
export function PaveRecompense({ recompense, livrable, verrouille = false, onLivrer }: Props) {
  const { d } = useLangue();
  const gains: { cle: "argent" | "xp" | "energie"; valeur: number }[] = [
    { cle: "argent", valeur: recompense.argent },
    { cle: "xp", valeur: recompense.xp },
    { cle: "energie", valeur: recompense.energie },
  ].filter((g) => g.valeur > 0) as { cle: "argent" | "xp" | "energie"; valeur: number }[];

  const jetons = gains.map((g) => (
    <span key={g.cle} data-jeton={g.cle} style={/* teinte par jeton, tokens */ {} as CSSProperties}>
      {/* … valeur + unité … */}
    </span>
  ));

  if (!livrable) {
    return (
      <div style={/* pavé sourd */ {} as CSSProperties}>
        <span>{d.carnet.paveRecompense}</span>
        {jetons}
      </div>
    );
  }
  return (
    <button type="button" onClick={onLivrer} disabled={verrouille} style={/* pavé doré */ {} as CSSProperties}>
      <span>{d.carnet.paveLivrer}</span>
      {jetons}
    </button>
  );
}
```

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/PaveRecompense.test.tsx
npx vitest run --maxWorkers=4 src/lib/i18n
```

Attendu : SUCCÈS des deux (le second vérifie la parité des dictionnaires).

- [ ] **Step 6 : Commit**

```bash
git add src/components/mobile/qg/carnet/PaveRecompense.tsx src/components/mobile/qg/carnet/PaveRecompense.test.tsx src/lib/i18n/ui
git commit -m "feat(carnet): pavé récompense qui devient bouton Livrer"
```

---

### Task 4 : La cérémonie extraite

**Files:**
- Create: `src/components/mobile/qg/carnet/useCeremonieLivraison.ts`
- Test: `src/components/mobile/qg/carnet/useCeremonieLivraison.test.ts`
- Read (ne pas modifier) : `src/components/mobile/qg/overlays/OngletCommandes.tsx:242-314`

**Interfaces:**
- Consumes: rien.
- Produces: `function useCeremonieLivraison(args: { state: GameState; onLivrerMission: (courrierId: string) => { ok: boolean; raison?: string }; tempsConfiance?: () => number | null; onChapitreLivre?: (courrierId: string) => void }): { ceremonieId: string | null; lancer: (courrierId: string) => void }`.

**Contexte.** La cérémonie vit aujourd'hui dans `lancerLivraison`, au milieu de `OngletCommandes`. Son code est correct et durement acquis — **on le déménage, on ne le réécrit pas.** Lire le fichier source d'abord et transposer, en gardant les commentaires qui expliquent les pièges.

Ce qu'elle fait, dans l'ordre : capture des valeurs d'avant → livraison réelle (le state est crédité immédiatement, rien n'est perdu si l'app meurt) → gel de l'affichage des compteurs concernés → frise de vols via `phasesLivraison`, chaque atterrissage dégelant son compteur → fondu de retrait de la carte.

**Quatre pièges déjà payés, à conserver mot pour mot :**

1. **On ne gèle que les compteurs dont un jeton va voler.** `phasesLivraison` n'émet d'atterrissage — donc de dégel — que pour les gains non nuls. Geler sans dégel prévu fige le compteur pour toute la partie.
2. **Le démontage coupe les minuteurs et dégèle tout.** Fermer le carnet en pleine cérémonie ne doit pas laisser un compteur figé.
3. **Filet final :** la dernière étape dégèle les trois compteurs quoi qu'il arrive (les dégels sont idempotents).
4. **`ceremonieId` interdit le chevauchement** : `lancer` refuse si une cérémonie est déjà en cours.

**Ce que cette tâche ajoute :** le paramètre `onChapitreLivre`, appelé **à la toute fin** de la cérémonie (après le fondu), et **seulement si la mission livrée était de catégorie `principale`**. C'est le point d'accroche de l'enchaînement du grand-père (tâche 9). Il n'est pas encore branché ici.

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCeremonieLivraison } from "./useCeremonieLivraison";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import type { Courrier, GameState } from "@/types/game";

function courrier(id: string, categorie: "principale" | "quotidienne"): Courrier {
  return {
    id, type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie, expediteurId: "grand-pere",
      titre: "T", corps: ["c"], cibles: [], recompense: { argent: 60 },
      objectifs: [{ type: "ventesCumulees", montant: 10 }],
    },
  };
}

function etat(c: Courrier): GameState {
  return createMockGameState({ courriers: [c], missions: [{ courrierId: c.id, statut: "active" }] });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useCeremonieLivraison", () => {
  it("une livraison refusée ne démarre aucune cérémonie", () => {
    const c = courrier("m1", "quotidienne");
    const { result } = renderHook(() =>
      useCeremonieLivraison({ state: etat(c), onLivrerMission: () => ({ ok: false, raison: "x" }) }),
    );
    act(() => result.current.lancer("m1"));
    expect(result.current.ceremonieId).toBeNull();
  });

  it("une livraison acceptée arme la cérémonie puis la referme", () => {
    const c = courrier("m1", "quotidienne");
    const { result } = renderHook(() =>
      useCeremonieLivraison({ state: etat(c), onLivrerMission: () => ({ ok: true }) }),
    );
    act(() => result.current.lancer("m1"));
    expect(result.current.ceremonieId).toBe("m1");
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.ceremonieId).toBeNull();
  });

  it("une seconde livraison est refusée pendant la première", () => {
    const c = courrier("m1", "quotidienne");
    const onLivrerMission = vi.fn(() => ({ ok: true }));
    const { result } = renderHook(() => useCeremonieLivraison({ state: etat(c), onLivrerMission }));
    act(() => result.current.lancer("m1"));
    act(() => result.current.lancer("m1"));
    expect(onLivrerMission).toHaveBeenCalledTimes(1);
  });

  it("onChapitreLivre est appelé pour une principale, à la toute fin", () => {
    const c = courrier("m1", "principale");
    const onChapitreLivre = vi.fn();
    const { result } = renderHook(() =>
      useCeremonieLivraison({ state: etat(c), onLivrerMission: () => ({ ok: true }), onChapitreLivre }),
    );
    act(() => result.current.lancer("m1"));
    expect(onChapitreLivre).not.toHaveBeenCalled(); // pas pendant
    act(() => vi.advanceTimersByTime(10_000));
    expect(onChapitreLivre).toHaveBeenCalledWith("m1");
  });

  it("onChapitreLivre n'est PAS appelé pour une quotidienne", () => {
    const c = courrier("m1", "quotidienne");
    const onChapitreLivre = vi.fn();
    const { result } = renderHook(() =>
      useCeremonieLivraison({ state: etat(c), onLivrerMission: () => ({ ok: true }), onChapitreLivre }),
    );
    act(() => result.current.lancer("m1"));
    act(() => vi.advanceTimersByTime(10_000));
    expect(onChapitreLivre).not.toHaveBeenCalled();
  });

  it("le démontage en pleine cérémonie dégèle les compteurs", () => {
    const c = courrier("m1", "principale");
    const vue = renderHook(() =>
      useCeremonieLivraison({ state: etat(c), onLivrerMission: () => ({ ok: true }) }),
    );
    act(() => vue.result.current.lancer("m1"));
    vue.unmount();
    // ⚠ Assertion à écrire selon ce que `src/lib/affichageGele.ts` expose —
    // voir la note ci-dessous. Ne PAS livrer ce test avec le seul `unmount()`.
  });
});
```

> **Le dernier test est incomplet exprès, et c'est à toi de le finir.** Ouvrir
> `src/lib/affichageGele.ts` et regarder ce que le module expose. S'il existe un
> lecteur d'état (ou une valeur observable), asserter que les trois compteurs
> sont dégelés après le démontage — c'est le piège n°2 ci-dessus, et il mérite
> une vraie garde. S'il n'expose aucun moyen de l'observer, **ajouter un
> lecteur** (une fonction `estGele()` sans effet de bord) plutôt que de livrer un
> test qui ne vérifie rien : un compteur figé pour toute la partie est
> exactement le genre de bug qu'on ne voit qu'en production. Dire dans le
> rapport ce que tu as trouvé et ce que tu as choisi.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/useCeremonieLivraison.test.ts
```

Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 3 : Déménager la cérémonie**

Lire `src/components/mobile/qg/overlays/OngletCommandes.tsx` lignes 242 à 314 (la fonction `lancerLivraison`) ainsi que les imports qu'elle utilise (`phasesLivraison`, `CIBLES_VOL`, `flyToTab`, `recompenseEffective`, `energieCourante`, les six fonctions de `affichageGele`), et transposer dans le hook **sans changer la logique**. Conserver les commentaires explicatifs.

Ajouts propres à cette tâche :

- l'état `ceremonieId` et le `timersRef` remontent dans le hook ;
- la constante `FONDU_SORTIE_MS = 300` déménage avec ;
- à l'étape finale, après `setCeremonieId(null)`, appeler `onChapitreLivre?.(courrierId)` **si** `byId.get(courrierId)?.payload.categorie === "principale"`.

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/useCeremonieLivraison.test.ts
```

Attendu : SUCCÈS (6 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/components/mobile/qg/carnet/useCeremonieLivraison.ts src/components/mobile/qg/carnet/useCeremonieLivraison.test.ts
git commit -m "feat(carnet): extraire la cérémonie de livraison dans son hook"
```

---

### Task 5 : La section rétractable

**Files:**
- Create: `src/components/mobile/qg/carnet/SectionRetractable.tsx`
- Test: `src/components/mobile/qg/carnet/SectionRetractable.test.tsx`
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts`

**Interfaces:**
- Consumes: `CleSection` (tâche 1).
- Produits: `function SectionRetractable(props: { cle: CleSection; icone: LucideIcon; titre: string; sousTitre?: string; compteur?: { total: number; faits: number; pretes: number }; repliee: boolean; onBasculer: () => void; children: ReactNode }): JSX.Element`.

**Contexte.** L'en-tête est **collante** pendant le défilement (`position: sticky; top: 0`) — le conteneur défilant est le corps du carnet, pas la fenêtre : cela fonctionne tant que le parent n'a pas d'`overflow: hidden` sur l'axe vertical. Le corps du body est verrouillé sur cette app ; **ne jamais fonder un défilement sur `window`.**

**Le compteur d'en-tête repliée est la règle qui rend le repli sans danger** : `QUÊTES DU JOUR (2/3) · 1 prête`. Il n'apparaît que lorsque la section est repliée — dépliée, l'information est déjà sous les yeux. La mention « prête » est masquée quand `pretes === 0`.

- [ ] **Step 1 : Ajouter les clés dans les quatre dictionnaires**

Dans `carnet`, pour `fr.ts` :

```ts
    sectionCompteur: "({faits}/{total})",
    sectionPretes_un: " · {n} prête",
    sectionPretes_n: " · {n} prêtes",
```

```ts
// en.ts
    sectionCompteur: "({faits}/{total})",
    sectionPretes_un: " · {n} ready",
    sectionPretes_n: " · {n} ready",
// es.ts
    sectionCompteur: "({faits}/{total})",
    sectionPretes_un: " · {n} lista",
    sectionPretes_n: " · {n} listas",
// el.ts
    sectionCompteur: "({faits}/{total})",
    sectionPretes_un: " · {n} έτοιμη",
    sectionPretes_n: " · {n} έτοιμες",
```

- [ ] **Step 2 : Écrire les tests qui échouent**

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CalendarDays } from "lucide-react";
import { SectionRetractable } from "./SectionRetractable";

afterEach(cleanup);

const base = {
  cle: "quotidiennes" as const,
  icone: CalendarDays,
  titre: "QUÊTES DU JOUR",
  onBasculer: () => {},
};

describe("SectionRetractable", () => {
  it("dépliée : le contenu est rendu, aria-expanded vrai", () => {
    render(<SectionRetractable {...base} repliee={false}><p>contenu</p></SectionRetractable>);
    expect(screen.getByText("contenu")).toBeTruthy();
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("true");
  });

  it("repliée : le contenu n'est pas rendu, aria-expanded faux", () => {
    render(<SectionRetractable {...base} repliee><p>contenu</p></SectionRetractable>);
    expect(screen.queryByText("contenu")).toBeNull();
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("false");
  });

  it("taper l'en-tête appelle onBasculer", () => {
    const onBasculer = vi.fn();
    render(<SectionRetractable {...base} onBasculer={onBasculer} repliee={false}><p>c</p></SectionRetractable>);
    screen.getByRole("button").click();
    expect(onBasculer).toHaveBeenCalledTimes(1);
  });

  it("repliée avec des quêtes prêtes : le compteur les annonce", () => {
    render(
      <SectionRetractable {...base} repliee compteur={{ total: 3, faits: 2, pretes: 1 }}>
        <p>c</p>
      </SectionRetractable>,
    );
    const entete = screen.getByRole("button").textContent ?? "";
    expect(entete).toContain("2");
    expect(entete).toContain("3");
    expect(entete).toContain("1");
  });

  it("repliée sans quête prête : aucune mention « prête »", () => {
    render(
      <SectionRetractable {...base} repliee compteur={{ total: 3, faits: 0, pretes: 0 }}>
        <p>c</p>
      </SectionRetractable>,
    );
    expect(screen.getByRole("button").textContent ?? "").not.toMatch(/prête|ready|lista|έτοιμη/i);
  });

  it("dépliée : pas de compteur, l'information est déjà visible", () => {
    render(
      <SectionRetractable {...base} repliee={false} compteur={{ total: 3, faits: 2, pretes: 1 }}>
        <p>c</p>
      </SectionRetractable>,
    );
    expect(screen.getByRole("button").textContent ?? "").not.toContain("2/3");
  });

  it("l'en-tête est collante", () => {
    render(<SectionRetractable {...base} repliee={false}><p>c</p></SectionRetractable>);
    const entete = screen.getByRole("button");
    expect(getComputedStyle(entete).position).toBe("sticky");
  });
});
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/SectionRetractable.test.tsx
```

Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 4 : Écrire le composant**

L'en-tête est un `<button>` avec `position: "sticky"`, `top: 0`, un fond opaque (`--paper-200`, sinon le contenu défile visiblement dessous), `aria-expanded`, l'icône, le titre en petites capitales espacées, le compteur (repliée seulement), le sous-titre optionnel (le compte à rebours), et un chevron `▾`/`▸` à droite. Le contenu n'est **pas rendu** quand `repliee` — le démonter, pas le masquer, pour que les minuteurs des lignes ne tournent pas dans le vide.

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/SectionRetractable.test.tsx
npx vitest run --maxWorkers=4 src/lib/i18n
```

Attendu : SUCCÈS des deux.

- [ ] **Step 6 : Commit**

```bash
git add src/components/mobile/qg/carnet/SectionRetractable.tsx src/components/mobile/qg/carnet/SectionRetractable.test.tsx src/lib/i18n/ui
git commit -m "feat(carnet): section rétractable à en-tête collante"
```

---

### Task 6 : Les libellés d'objectifs déménagés

**Files:**
- Create: `src/components/mobile/qg/carnet/objectifs.ts`
- Test: `src/components/mobile/qg/carnet/objectifs.test.ts`
- Read (ne pas modifier) : `src/components/mobile/qg/overlays/CommandeRow.tsx`

**Interfaces:**
- Consumes: rien.
- Produces: `function libelleObjectif(o: ObjectifMission, d: DictionnaireUI, tr: (g: string, p?: Record<string, string | number>) => string): string` ; `function objectifEnEuros(type: ObjectifMission["type"]): boolean`.

**Contexte, et c'est une tâche de transcription, pas de conception.** Ces deux fonctions vivent dans `CommandeRow.tsx`, qui va disparaître. Elles viennent d'être corrigées : `objectifEnEuros` a coûté une régression parce qu'il oubliait `valeurCollection`, un montant en euros utilisé par deux missions de la trame. **On les déplace à l'identique, commentaire d'énumération compris.** Ne pas « améliorer » la liste.

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
import { describe, expect, it } from "vitest";
import { libelleObjectif, objectifEnEuros } from "./objectifs";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import type { ObjectifMission } from "@/types/game";

const d = DICTIONNAIRES.fr;
const tr = (g: string, p?: Record<string, string | number>) =>
  Object.entries(p ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), g);

describe("objectifEnEuros", () => {
  it("les quatre types monétaires sont vrais", () => {
    for (const t of ["ventesCumulees", "profitVente", "valeurCollection", "beneficeCumule"] as const) {
      expect(objectifEnEuros(t)).toBe(true);
    }
  });
  it("les types qui comptent autre chose sont faux", () => {
    for (const t of ["objet", "objetsRares", "ventesCategorie", "niveau", "restauration"] as const) {
      expect(objectifEnEuros(t)).toBe(false);
    }
  });
});

describe("libelleObjectif", () => {
  it("interpole la catégorie traduite", () => {
    const o: ObjectifMission = { type: "ventesCategorie", categorie: "Mode", nombre: 5 };
    const s = libelleObjectif(o, d, tr);
    expect(s).toContain("Mode");
    expect(s).not.toMatch(/\{[a-z]+\}/);
  });
  it("aucun type ne rend une accolade non remplacée", () => {
    const tous: ObjectifMission[] = [
      { type: "objet", templateId: "ma.x" },
      { type: "ventesCumulees", montant: 300 },
      { type: "profitVente", montant: 60 },
      { type: "restauration", etatMin: "Bon" },
      { type: "valeurCollection", montant: 1500 },
      { type: "niveau", niveau: 12 },
      { type: "objetsRares", nombre: 2 },
      { type: "beneficeCumule", montant: 850 },
      { type: "ventesCategorie", categorie: "Musique", nombre: 4 },
    ];
    for (const o of tous) expect(libelleObjectif(o, d, tr)).not.toMatch(/\{[a-z]+\}/);
  });
});
```

> Vérifier le nom réel de l'export des dictionnaires dans `src/lib/i18n/ui/index.ts` avant d'écrire l'import — c'est peut-être `DICTIONNAIRES`, peut-être autre chose. Adapter, et le dire dans le rapport.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/objectifs.test.ts
```

Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 3 : Déménager les deux fonctions**

Copier `libelleObjectif` et `objectifEnEuros` depuis `CommandeRow.tsx` **sans modification de logique**, avec leurs commentaires. Ajouter en tête du fichier une phrase disant d'où elles viennent et pourquoi elles sont séparées (partagées par la carte d'histoire et la ligne de quête).

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/objectifs.test.ts
```

Attendu : SUCCÈS.

- [ ] **Step 5 : Commit**

```bash
git add src/components/mobile/qg/carnet/objectifs.ts src/components/mobile/qg/carnet/objectifs.test.ts
git commit -m "feat(carnet): déménager les libellés d'objectifs dans leur module"
```

---

### Task 7 : La ligne de quête périodique

**Files:**
- Create: `src/components/mobile/qg/carnet/LigneQuete.tsx`
- Test: `src/components/mobile/qg/carnet/LigneQuete.test.tsx`

**Interfaces:**
- Consumes: `PhotoScotchee` (t2), `PaveRecompense` (t3), `libelleObjectif`/`objectifEnEuros` (t6), `ICONE_FORME` et `FormeQuete` de `@/lib/quetes/formes` (chantier ①).
- Produces: `function LigneQuete(props: { courrier: Courrier; state: GameState; ouvert: boolean; onToggle: () => void; onLivrer: () => void; enCeremonie?: boolean; livrerVerrouille?: boolean }): JSX.Element`.

**Contexte.** C'est le remplaçant de `CommandeRow` pour les quêtes périodiques. Lire `CommandeRow.tsx` d'abord : la logique de progression (`progressionMission`, `objectifsDeMission`, `progressionObjectif`, `missionLivrable`, `recompenseEffective`) est correcte et se transpose **telle quelle**. Y compris le garde-fou `accompli = enCeremonie`, qui force l'affichage « accompli » pendant la cérémonie — sans lui, le state étant déjà post-livraison, la barre retomberait à zéro pile au moment du payoff.

**Contrat DOM :** la racine de la ligne porte `data-commande-id={courrier.id}` — c'est par là que la cérémonie retrouve la carte pour la fondre.

**Le visuel de gauche suit la règle du projet :**

- la quête a des `cibles` → une `PhotoScotchee` par cible, jusqu'à quatre, puis « +n » ;
- sinon → une `PhotoScotchee` portant l'icône Lucide de la forme. La forme se déduit du premier objectif : `objetsRares` → `Gem`, `beneficeCumule`/`ventesCumulees` → `TrendingUp`, `profitVente` → `Coins`, `ventesCategorie` → `Package`. Utiliser `ICONE_FORME` de `@/lib/quetes/formes` comme source de vérité plutôt que de recopier la table.

**Dépliage :** un tap sur la ligne appelle `onToggle`. Quand `ouvert`, la lettre entière (`corpsCourrier`) et le détail des objectifs s'affichent sous la ligne. Le pavé n'est **pas** dans la zone tapable de la ligne : deux cibles distinctes.

- [ ] **Step 1 : Écrire les tests qui échouent**

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LigneQuete } from "./LigneQuete";
import { createMockGameState, createMockObjet } from "@/lib/__test-fixtures__/gameState";
import type { Courrier, ObjectifMission } from "@/types/game";

afterEach(cleanup);

function courrierObjet(): Courrier {
  return {
    id: "q1", type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "quotidienne", expediteurId: "mode",
      titre: "Pièce vintage", corps: ["Bonjour,", "Je cherche une lampe."],
      cibles: [{ templateId: "ma.lampe_petrole_ancienne" }],
      recompense: { argent: 60 },
    },
  };
}

function courrierChiffre(objectif: ObjectifMission): Courrier {
  return {
    id: "q2", type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "hebdomadaire", expediteurId: "mode",
      titre: "Le nerf de la guerre", corps: ["Salut,", "Un pari."],
      cibles: [], objectifs: [objectif], recompense: { argent: 210 },
    },
  };
}

const props = { ouvert: false, onToggle: () => {}, onLivrer: () => {} };

describe("LigneQuete", () => {
  it("porte data-commande-id (ancre de la cérémonie)", () => {
    const c = courrierObjet();
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c] })} />);
    expect(document.querySelector('[data-commande-id="q1"]')).toBeTruthy();
  });

  it("quête à objets : des photos, pas d'icône", () => {
    const c = courrierObjet();
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c] })} />);
    expect(document.querySelector("[data-photo-scotchee='objet']")).toBeTruthy();
    expect(document.querySelector("[data-photo-scotchee='icone']")).toBeNull();
  });

  it("quête chiffrée : une icône, pas de photo", () => {
    const c = courrierChiffre({ type: "beneficeCumule", montant: 850 });
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c] })} />);
    expect(document.querySelector("[data-photo-scotchee='icone']")).toBeTruthy();
    expect(document.querySelector("[data-photo-scotchee='objet']")).toBeNull();
  });

  it("un objectif qui compte des objets n'a pas de suffixe €", () => {
    const c = courrierChiffre({ type: "ventesCategorie", categorie: "Mode", nombre: 5 });
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c], missions: [{ courrierId: "q2", statut: "active" }] })} />);
    const compteur = screen.getByTestId("progression-compteur").textContent ?? "";
    expect(compteur).toContain("5");
    expect(compteur).not.toContain("€");
  });

  it("un objectif en argent garde son suffixe €", () => {
    const c = courrierChiffre({ type: "beneficeCumule", montant: 850 });
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c], missions: [{ courrierId: "q2", statut: "active" }] })} />);
    expect(screen.getByTestId("progression-compteur").textContent ?? "").toContain("€");
  });

  it("taper la ligne déplie, taper le pavé livre — deux cibles distinctes", () => {
    const onToggle = vi.fn();
    const onLivrer = vi.fn();
    const c = courrierObjet();
    const state = createMockGameState({
      courriers: [c],
      missions: [{ courrierId: "q1", statut: "active" }],
      inventaireJoueur: [createMockObjet({ templateId: "ma.lampe_petrole_ancienne", categorie: "Maison" })],
    });
    render(<LigneQuete {...props} courrier={c} state={state} onToggle={onToggle} onLivrer={onLivrer} />);
    screen.getByRole("button", { name: /Livrer/i }).click();
    expect(onLivrer).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("dépliée : la lettre entière apparaît", () => {
    const c = courrierObjet();
    render(<LigneQuete {...props} ouvert courrier={c} state={createMockGameState({ courriers: [c] })} />);
    expect(screen.getByText(/Je cherche une lampe/)).toBeTruthy();
  });

  it("aucune accolade non remplacée", () => {
    const c = courrierChiffre({ type: "ventesCategorie", categorie: "Musique", nombre: 4 });
    const { container } = render(<LigneQuete {...props} ouvert courrier={c} state={createMockGameState({ courriers: [c] })} />);
    expect(container.textContent ?? "").not.toMatch(/\{[a-z]+\}/);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/LigneQuete.test.tsx
```

Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 3 : Écrire le composant**

Transposer la logique de progression de `CommandeRow.tsx` (lignes ~134-182) sans la réécrire, en important `libelleObjectif`/`objectifEnEuros` depuis `./objectifs`. Structure : racine `data-commande-id`, colonne gauche (photos ou icône), colonne centrale (titre en capitales, demande, barre + `data-testid="progression-compteur"`), pavé à droite, bloc dépliable en dessous.

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/LigneQuete.test.tsx
```

Attendu : SUCCÈS (8 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/components/mobile/qg/carnet/LigneQuete.tsx src/components/mobile/qg/carnet/LigneQuete.test.tsx
git commit -m "feat(carnet): ligne de quête périodique"
```

---

### Task 8 : La carte d'histoire

**Files:**
- Create: `src/components/mobile/qg/carnet/CarteHistoire.tsx`
- Test: `src/components/mobile/qg/carnet/CarteHistoire.test.tsx`
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts`

**Interfaces:**
- Consumes: `PhotoScotchee` (t2), `PaveRecompense` (t3), `objectifs.ts` (t6).
- Produces: `function CarteHistoire(props: { courrier: Courrier; state: GameState; onLivrer: () => void; enCeremonie?: boolean; livrerVerrouille?: boolean }): JSX.Element`.

**Le fil des chapitres.** Reconstituer depuis `state.missions` (statut `"livree"`) croisé avec `state.courriers` : les courriers de chapitres **persistent** (seuls les périodiques sont purgés), donc `titreCourrier(courrier, locale)` donne le titre localisé. Prendre **jusqu'à** les deux derniers livrés, triés par `jourResolution`, puis le chapitre en cours (◉), puis une ligne « ??? ». Au tout premier chapitre il n'y a rien au-dessus du ◉ : c'est normal, pas un état dégradé.

Le polaroïd porte la première cible ; les cibles suivantes sont des `PhotoScotchee` plus petites, **trois au maximum en plus du polaroïd**, puis « +n ». Sans cible, le polaroïd porte l'icône de la forme.

- [ ] **Step 1 : Ajouter les clés dans les quatre dictionnaires**

Dans `carnet` :

```ts
// fr.ts
    histoireSurtitre: "Quête principale",
    histoireObjectifActuel: "Objectif actuel",
    histoireInconnu: "???",
// en.ts
    histoireSurtitre: "Main quest",
    histoireObjectifActuel: "Current objective",
    histoireInconnu: "???",
// es.ts
    histoireSurtitre: "Misión principal",
    histoireObjectifActuel: "Objetivo actual",
    histoireInconnu: "???",
// el.ts
    histoireSurtitre: "Κύρια αποστολή",
    histoireObjectifActuel: "Τρέχων στόχος",
    histoireInconnu: "???",
```

- [ ] **Step 2 : Écrire les tests qui échouent**

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CarteHistoire } from "./CarteHistoire";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import type { Courrier } from "@/types/game";

afterEach(cleanup);

function chapitre(id: string, titre: string, avecCible = true): Courrier {
  return {
    id, type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "principale", expediteurId: "grand-pere",
      titre, corps: ["Retrouver une lampe."],
      cibles: avecCible ? [{ templateId: "ma.lampe_petrole_ancienne" }] : [],
      ...(avecCible ? {} : { objectifs: [{ type: "ventesCumulees" as const, montant: 300 }] }),
      recompense: { argent: 60 },
    },
  };
}

describe("CarteHistoire", () => {
  it("porte data-commande-id (ancre de la cérémonie)", () => {
    const c = chapitre("trame_ch3", "La lampe de mon atelier");
    render(<CarteHistoire courrier={c} state={createMockGameState({ courriers: [c] })} onLivrer={() => {}} />);
    expect(document.querySelector('[data-commande-id="trame_ch3"]')).toBeTruthy();
  });

  it("le fil montre les deux derniers livrés, le courant, puis ???", () => {
    const encours = chapitre("trame_ch3", "La lampe de mon atelier");
    const livre1 = chapitre("trame_ch1", "Vendre, c'est vivre");
    const livre2 = chapitre("trame_ch2", "Le miroir de l'entrée");
    const state = createMockGameState({
      courriers: [livre1, livre2, encours],
      missions: [
        { courrierId: "trame_ch1", statut: "livree", jourResolution: 5 },
        { courrierId: "trame_ch2", statut: "livree", jourResolution: 9 },
        { courrierId: "trame_ch3", statut: "active" },
      ],
    });
    render(<CarteHistoire courrier={encours} state={state} onLivrer={() => {}} />);
    expect(screen.getByText("Vendre, c'est vivre")).toBeTruthy();
    expect(screen.getByText("Le miroir de l'entrée")).toBeTruthy();
    expect(screen.getAllByText("La lampe de mon atelier").length).toBeGreaterThan(0);
    expect(screen.getByText("???")).toBeTruthy();
  });

  it("au premier chapitre, le fil commence par le courant sans ligne vide", () => {
    const c = chapitre("trame_ch1", "La lampe de mon atelier");
    const state = createMockGameState({ courriers: [c], missions: [{ courrierId: "trame_ch1", statut: "active" }] });
    const { container } = render(<CarteHistoire courrier={c} state={state} onLivrer={() => {}} />);
    expect(container.querySelectorAll("[data-etape-fil]").length).toBe(2); // le courant + ???
  });

  it("chapitre sans objet : le polaroïd porte une icône", () => {
    const c = chapitre("trame_ch2", "Vendre, c'est vivre", false);
    render(<CarteHistoire courrier={c} state={createMockGameState({ courriers: [c] })} onLivrer={() => {}} />);
    expect(document.querySelector("[data-photo-scotchee='icone']")).toBeTruthy();
  });

  it("chapitre avec objet : le polaroïd porte la photo", () => {
    const c = chapitre("trame_ch3", "La lampe de mon atelier");
    render(<CarteHistoire courrier={c} state={createMockGameState({ courriers: [c] })} onLivrer={() => {}} />);
    expect(document.querySelector("[data-photo-scotchee='objet']")).toBeTruthy();
  });

  it("aucune accolade non remplacée", () => {
    const c = chapitre("trame_ch3", "La lampe de mon atelier");
    const { container } = render(<CarteHistoire courrier={c} state={createMockGameState({ courriers: [c] })} onLivrer={() => {}} />);
    expect(container.textContent ?? "").not.toMatch(/\{[a-z]+\}/);
  });
});
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/CarteHistoire.test.tsx
```

Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 4 : Écrire le composant**

Chaque ligne du fil porte `data-etape-fil` (un test les compte). Structure : racine `data-commande-id`, en-tête (polaroïd + surtitre + titre + première phrase), bloc « Objectif actuel » (barre + `data-testid="progression-compteur"`) et pavé à droite, puis le fil.

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/CarteHistoire.test.tsx
npx vitest run --maxWorkers=4 src/lib/i18n
```

Attendu : SUCCÈS des deux.

- [ ] **Step 6 : Commit**

```bash
git add src/components/mobile/qg/carnet/CarteHistoire.tsx src/components/mobile/qg/carnet/CarteHistoire.test.tsx src/lib/i18n/ui
git commit -m "feat(carnet): carte d'histoire à polaroïd et fil des chapitres"
```

---

### Task 9 : Le châssis, le branchement et la démolition

**Files:**
- Create: `src/components/mobile/qg/carnet/CarnetOverlay.tsx`
- Test: `src/components/mobile/qg/carnet/CarnetOverlay.test.tsx`
- Modify: `src/app/(qg)/layout.tsx`
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts`
- Delete: `src/components/mobile/qg/overlays/{RegistreOverlay,OngletCommandes,OngletComptes,CommandeRow}.tsx` et leurs tests

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: `function CarnetOverlay(props: { open: boolean; onClose: () => void; state: GameState; onLivrerMission: (courrierId: string) => { ok: boolean; raison?: string }; tempsConfiance?: () => number | null; missionInitialeId?: string | null; onChapitreLivre?: (courrierId: string) => void }): JSX.Element | null`.

**Contexte.** Le châssis assemble tout et remplace `RegistreOverlay`. Il reprend de l'ancien : le voile, la fenêtre calée entre header et TabBar, le verrouillage du défilement du body, la fermeture par Échap. Il abandonne : les onglets, l'onglet Comptes, le replay `SessionSummary`, la section Terminées.

**Le tri et le découpage en sections** viennent de `OngletCommandes.tsx` (`trierActives`, les trois `useMemo` par catégorie) : transposer sans réécrire.

**L'ouverture ciblée — le point qu'on perd si on n'y pense pas.** `missionInitialeId` doit : déplier la quête visée, **déplier sa section même si le joueur l'avait mémorisée repliée**, et défiler jusqu'à elle. C'est le seul cas où la préférence est outrepassée.

**Les sections vides parlent :**

- niveau < `NIVEAU_QUETES_PERIODIQUES` (3, importé de `@/lib/quetes/settlePeriodiques`) → les deux sections périodiques rendent une ligne verrouillée ;
- aucune quête principale et plus aucun chapitre à venir → HISTOIRE rend sa ligne de clôture.

- [ ] **Step 1 : Ajouter les clés dans les quatre dictionnaires**

```ts
// fr.ts
    carnetTitre: "Carnet de quêtes",
    sectionHistoire: "Histoire",
    sectionVerrouilleeNiveau: "À partir du niveau {n}",
    histoireTerminee: "Le grand-père t'a tout raconté.",
// en.ts
    carnetTitre: "Quest journal",
    sectionHistoire: "Story",
    sectionVerrouilleeNiveau: "From level {n}",
    histoireTerminee: "Grandfather has told you everything.",
// es.ts
    carnetTitre: "Cuaderno de misiones",
    sectionHistoire: "Historia",
    sectionVerrouilleeNiveau: "A partir del nivel {n}",
    histoireTerminee: "El abuelo ya te lo ha contado todo.",
// el.ts
    carnetTitre: "Τετράδιο αποστολών",
    sectionHistoire: "Ιστορία",
    sectionVerrouilleeNiveau: "Από το επίπεδο {n}",
    histoireTerminee: "Ο παππούς σου τα έχει πει όλα.",
```

> `d.carnet.sectionQuotidiennes` et `d.carnet.sectionHebdomadaires` existent déjà — les réutiliser.

- [ ] **Step 2 : Écrire les tests qui échouent**

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CarnetOverlay } from "./CarnetOverlay";
import { CLE_STOCKAGE_CARNET } from "./useCarnetSections";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import type { Courrier, GameState } from "@/types/game";

afterEach(() => { cleanup(); window.localStorage.clear(); });

function quete(id: string, categorie: "principale" | "quotidienne" | "hebdomadaire", titre: string): Courrier {
  return {
    id, type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie, expediteurId: "mode", titre, corps: ["c"],
      cibles: [{ templateId: "ma.lampe_petrole_ancienne" }], recompense: { argent: 60 },
    },
  };
}

function etat(courriers: Courrier[], niveau = 5): GameState {
  const s = createMockGameState({
    courriers,
    missions: courriers.map((c) => ({ courrierId: c.id, statut: "active" as const })),
  });
  return { ...s, brocanteur: { ...s.brocanteur, niveau } };
}

const base = { open: true, onClose: () => {}, onLivrerMission: () => ({ ok: true }) };

describe("CarnetOverlay", () => {
  it("fermé : ne rend rien", () => {
    const { container } = render(<CarnetOverlay {...base} open={false} state={etat([])} />);
    expect(container.firstChild).toBeNull();
  });

  it("les trois sections sont dépliées à la première ouverture", () => {
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} />);
    expect(screen.getByText("La bonne pioche")).toBeTruthy();
  });

  it("sous le niveau 3, les sections périodiques annoncent le verrou", () => {
    render(<CarnetOverlay {...base} state={etat([], 2)} />);
    expect(screen.getAllByText(/niveau 3|level 3/i).length).toBeGreaterThan(0);
  });

  it("aucun chapitre : HISTOIRE annonce la fin de la trame", () => {
    render(<CarnetOverlay {...base} state={etat([], 5)} />);
    expect(screen.getByText(/tout raconté/i)).toBeTruthy();
  });

  it("une section mémorisée repliée s'ouvre repliée", () => {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, JSON.stringify({ quotidiennes: true }));
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} />);
    expect(screen.queryByText("La bonne pioche")).toBeNull();
  });

  it("l'ouverture ciblée déplie la section MÊME si elle était mémorisée repliée", () => {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, JSON.stringify({ quotidiennes: true }));
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} missionInitialeId="q1" />);
    expect(screen.getByText("La bonne pioche")).toBeTruthy();
  });

  it("ni onglets, ni section Terminées", () => {
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} />);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByText(/terminées|completed/i)).toBeNull();
  });
});
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/CarnetOverlay.test.tsx
```

Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 4 : Écrire le châssis**

Assembler : voile + fenêtre + en-tête (marque-page, titre, croix de fermeture) + corps défilant contenant les trois `SectionRetractable`. HISTOIRE rend une `CarteHistoire` ou sa ligne de clôture ; les deux autres rendent des `LigneQuete` ou leur ligne de verrou. La cérémonie vient de `useCeremonieLivraison`, dont le `ceremonieId` alimente `enCeremonie` et `livrerVerrouille`.

- [ ] **Step 5 : Brancher dans le layout et supprimer l'ancien**

Dans `src/app/(qg)/layout.tsx` : remplacer l'import et l'usage de `RegistreOverlay` par `CarnetOverlay`. L'état `registreOuvert` devient un booléen (`carnetOuvert`) — il n'a plus d'onglet à porter. Les deux points d'ouverture (lignes ~580 et ~981) passent à `true`. `chapitreDuCarnetDu` reçoit désormais un booléen : adapter sa signature dans `src/lib/tutoriel.ts` **et son test**, sans changer sa logique.

Puis supprimer :

```bash
git rm src/components/mobile/qg/overlays/RegistreOverlay.tsx \
       src/components/mobile/qg/overlays/RegistreOverlay.test.tsx \
       src/components/mobile/qg/overlays/OngletCommandes.tsx \
       src/components/mobile/qg/overlays/OngletCommandes.test.tsx \
       src/components/mobile/qg/overlays/OngletComptes.tsx \
       src/components/mobile/qg/overlays/CommandeRow.tsx \
       src/components/mobile/qg/overlays/CommandeRow.test.tsx
```

`SessionSummary` reste : il sert au bilan de fin de session. Seul son mode replay part.

- [ ] **Step 6 : Lancer la suite complète**

```bash
npx vitest run --maxWorkers=4
npx tsc --noEmit
npx eslint src
```

Attendu : SUCCÈS partout. Toute référence résiduelle aux fichiers supprimés est une erreur de compilation — les traiter ici.

- [ ] **Step 7 : Commit**

```bash
git add -A
git commit -m "feat(carnet): nouveau châssis, branchement, et retrait de l'ancien registre"
```

---

### Task 10 : L'enchaînement du grand-père

**Files:**
- Modify: `src/app/(qg)/layout.tsx`
- Create: `src/lib/quetes/enchainement.ts`
- Test: `src/lib/quetes/enchainement.test.ts`

**Interfaces:**
- Consumes: `onChapitreLivre` de `CarnetOverlay` (t9), lui-même alimenté par `useCeremonieLivraison` (t4).
- Produces: rien.

**Contexte.** La machinerie existe déjà et **porte déjà le battement de 500 ms** : l'effet sur `chapitreEnAttente` (`layout.tsx` ~486-493) attend 500 ms puis pousse la séquence dans `dialogueQg`. On ne la duplique pas.

Ce qu'il reste à faire : à la fin de la cérémonie d'un chapitre, armer `dialogueChapitreId` + `chapitreEnAttente` avec le chapitre suivant, et fermer le carnet.

**Le piège de la fraîcheur.** `onChapitreLivre` est appelé depuis un `setTimeout` créé au moment du tap sur « Livrer ». À cet instant, `chPret` valait `null` (le chapitre courant était encore actif). Une closure capturant `chPret` lirait donc une valeur périmée. **Passer par une ref** mise à jour à chaque rendu, et lire `chPretRef.current` au moment de l'appel.

**Extraire le 500 ms en constante nommée** — `DELAI_AVANT_DIALOGUE_MS` — pour qu'il soit ajustable à l'oreille sur l'appareil, comme la spec le demande.

- [ ] **Step 1 : Écrire le test qui échoue**

Rendre le layout entier est impraticable ; on teste la **règle**, sur une fonction extraite.

Extraire d'abord, dans `src/lib/quetes/enchainement.ts` :

```ts
import type { ChapitrePrincipal } from "@/data/quetesPrincipales";
import type { DialogueSequence } from "@/components/mobile/DialogueOverlay";

/** Battement entre la fin de la cérémonie et la scène du grand-père. */
export const DELAI_AVANT_DIALOGUE_MS = 500;

/**
 * Séquence à armer quand un chapitre vient d'être livré. `null` si aucun
 * chapitre n'est dû — après le chapitre 16, la trame est close et le carnet ne
 * doit pas se refermer tout seul.
 */
export function sequenceEnchainement(chapitre: ChapitrePrincipal | null): DialogueSequence | null {
  if (!chapitre) return null;
  return { id: `dlg_${chapitre.id}`, lignes: chapitre.dialogue };
}
```

et le tester :

```tsx
import { describe, expect, it } from "vitest";
import { sequenceEnchainement, DELAI_AVANT_DIALOGUE_MS } from "@/lib/quetes/enchainement";
import { QUETES_PRINCIPALES } from "@/data/quetesPrincipales";

describe("enchaînement des chapitres", () => {
  it("un chapitre dû produit sa séquence de dialogue", () => {
    const ch = QUETES_PRINCIPALES[0];
    const seq = sequenceEnchainement(ch);
    expect(seq?.id).toBe(`dlg_${ch.id}`);
    expect(seq?.lignes).toEqual(ch.dialogue);
    expect((seq?.lignes ?? []).length).toBeGreaterThan(0);
  });

  it("aucun chapitre dû : rien à armer (trame close)", () => {
    expect(sequenceEnchainement(null)).toBeNull();
  });

  it("le battement est une constante nommée, ajustable", () => {
    expect(DELAI_AVANT_DIALOGUE_MS).toBe(500);
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes/enchainement.test.ts
```

Attendu : ÉCHEC — `@/lib/quetes/enchainement` n'existe pas.

- [ ] **Step 3 : Écrire le module et brancher le layout**

Créer le module ci-dessus. Puis dans `layout.tsx` :

```tsx
  // `onChapitreLivre` est appelé depuis un minuteur créé au tap sur « Livrer » :
  // à cet instant `chPret` valait null. Une closure le capturerait périmé — d'où
  // la ref, lue au moment de l'appel.
  const chPretRef = useRef(chPret);
  chPretRef.current = chPret;

  const enchainerChapitre = useCallback(() => {
    const suivant = chPretRef.current;
    const seq = sequenceEnchainement(suivant);
    if (!seq || !suivant) return; // trame close : le carnet reste ouvert
    setCarnetOuvert(false);
    setDialogueChapitreId(suivant.id);
    setChapitreEnAttente(seq);
  }, []);
```

passé en `onChapitreLivre={enchainerChapitre}` au `CarnetOverlay`, et remplacer le `500` en dur de l'effet existant par `DELAI_AVANT_DIALOGUE_MS`.

**Ne pas toucher** au `GrandPereBadge` : la pastille reste le chemin de repli si l'app meurt entre la cérémonie et la scène.

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes/enchainement.test.ts
npx vitest run --maxWorkers=4
npx tsc --noEmit
npx eslint src
```

Attendu : SUCCÈS partout.

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(carnet): le grand-père enchaîne après la cérémonie de livraison"
```

---

## Recette manuelle

Les tests couvrent la logique ; trois choses ne se voient qu'à l'œil.

1. **Le carnet, dans les quatre langues.** `npm run dev`, partie de niveau ≥ 3 : les trois sections, les photos scotchées de travers, aucune accolade à l'écran, aucun bordeaux résiduel.
2. **La cérémonie part bien du pavé.** Livrer une quête et regarder les jetons quitter le pavé pour rejoindre les compteurs du header. Si l'un ne bouge pas, c'est un `data-jeton` manquant.
3. **L'enchaînement.** Livrer un chapitre : les jetons volent, la carte se fond, une demi-seconde passe, le carnet se referme, le grand-père parle, et le chapitre suivant est là en rouvrant.

> ⚠️ `localhost` obligatoire pour les captures Playwright — `127.0.0.1` est bloqué et l'app reste figée sur « Ouverture du local… ».
