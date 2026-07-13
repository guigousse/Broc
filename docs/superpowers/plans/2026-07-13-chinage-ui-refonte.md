# Refonte UI/UX du mode chinage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centraliser les atouts du chinage (Flair, Fouille, Tchatche) en cercles « jeu vidéo » dans le header bas, réorganiser la carte objet (infos au-dessus, navigation ◀ 1/6 ▶ en dessous), ajouter un badge collection ✓, et corriger le débordement des boutons Négocier/Acheter.

**Architecture:** Un nouveau composant présentational `ChineSkillDock` reçoit une liste de `DockSkill` construite par `ClientPage` (qui détient l'état de jeu, les quotas et les handlers) via une prop `renderDock(currentItem)` d'`ItemSwipeDeck`. L'action Tchatche remonte dans `ClientPage` (fonction pure `relancerNegociation` + `setItem`), et `ChineNegoDrawer` se resynchronise sur les changements externes de `item.negociation`.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, styles inline `CSSProperties`, vitest + @testing-library/react (jsdom), lucide-react.

**Spec:** `docs/superpowers/specs/2026-07-13-chinage-ui-refonte-design.md`

## Global Constraints

- Lint : `npx eslint src` (**`npm run lint` est cassé** — Next 16) et `npm run lint:hooks`.
- Tests : `npx vitest run <fichier>` par tâche, suite complète en fin de plan.
- i18n : toute nouvelle chaîne UI est ajoutée dans les TROIS dictionnaires (`src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts`) avec les mêmes placeholders `{x}`. Jamais de chaîne localisée dans la save.
- Niveaux des atouts (source : `src/lib/actives.ts` `NIVEAU_ACTIVES`) : flair 5, fouille 15, tchatche 25.
- Les webp `public/competences/atout.{flair,fouille,tchatche}.webp` n'existent pas encore (génération dans une session dédiée) : le dock DOIT retomber sur les emoji 🔍 🧹 💬 via `onError`.
- Styles inline `CSSProperties` en constantes de module, commentaires en français, comme le reste du dossier.

---

### Task 1: Chaînes i18n FR/EN/ES

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts` (section `chine`, après la clé `humeur:` ~ligne 271)
- Modify: `src/lib/i18n/ui/en.ts` (section `chine`, après `humeur:` ~ligne 268)
- Modify: `src/lib/i18n/ui/es.ts` (section `chine`, après `humeur:` ~ligne 268)

**Interfaces:**
- Produces: `d.chine.atoutAria`, `d.chine.atoutActifAria`, `d.chine.atoutVerrouilleAria`, `d.chine.atoutVerrouilleToast`, `d.chine.dejaPossedeAria` (consommées par les tâches 3, 4 et 6). Le type `DictionnaireUI` est dérivé de `fr` : oublier une clé dans `en`/`es` casse la compilation.

- [ ] **Step 1: Ajouter les clés FR**

Dans `src/lib/i18n/ui/fr.ts`, section `chine`, juste après `humeur: "Humeur",` :

```ts
    atoutAria: "{nom} — {restants} usage(s) restant(s)",
    atoutActifAria: "{nom} — déjà actif",
    atoutVerrouilleAria: "{nom} — verrouillé, se débloque au niveau {niveau}",
    atoutVerrouilleToast: "{nom} — se débloque au niveau {niveau}",
    dejaPossedeAria: "Déjà possédé dans la collection",
```

- [ ] **Step 2: Ajouter les clés EN**

Dans `src/lib/i18n/ui/en.ts`, section `chine`, juste après `humeur: "Mood",` :

```ts
    atoutAria: "{nom} — {restants} use(s) left",
    atoutActifAria: "{nom} — already active",
    atoutVerrouilleAria: "{nom} — locked, unlocks at level {niveau}",
    atoutVerrouilleToast: "{nom} — unlocks at level {niveau}",
    dejaPossedeAria: "Already owned in the collection",
```

- [ ] **Step 3: Ajouter les clés ES**

Dans `src/lib/i18n/ui/es.ts`, section `chine`, juste après `humeur: "Humor",` :

```ts
    atoutAria: "{nom} — {restants} uso(s) restante(s)",
    atoutActifAria: "{nom} — ya activo",
    atoutVerrouilleAria: "{nom} — bloqueado, se desbloquea en el nivel {niveau}",
    atoutVerrouilleToast: "{nom} — se desbloquea en el nivel {niveau}",
    dejaPossedeAria: "Ya poseído en la colección",
```

- [ ] **Step 4: Vérifier la parité des dictionnaires**

Run: `npx vitest run src/lib/i18n/ui/ui.test.ts`
Expected: PASS (le test de parité des clés/placeholders passe avec les 3 locales).

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts
git commit -m "feat(i18n): chaînes du dock d'atouts et du badge collection (FR/EN/ES)"
```

---

### Task 2: Helper `templateDejaPossede`

**Files:**
- Modify: `src/lib/collection.ts`
- Test: `src/lib/collection.test.ts`

**Interfaces:**
- Produces: `templateDejaPossede(collection: Record<CategorieObjet, CollectionSlot[]>, templateId: string): boolean` — vrai si le template a déjà été possédé au moins une fois. Consommé par la tâche 4 (`ClientPage`).

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à la fin de `src/lib/collection.test.ts` (réutiliser les imports existants du fichier ; ajouter `templateDejaPossede` à l'import depuis `./collection`) :

```ts
describe("templateDejaPossede", () => {
  it("faux sur une collection initiale, vrai une fois le slot marqué dejaPossede", () => {
    const collection = initCollection();
    const premierSlot = Object.values(collection).flat()[0];
    expect(templateDejaPossede(collection, premierSlot.templateId)).toBe(false);

    const marquee = Object.fromEntries(
      Object.entries(collection).map(([cat, slots]) => [
        cat,
        slots.map((s) =>
          s.templateId === premierSlot.templateId
            ? { ...s, dejaPossede: true }
            : s,
        ),
      ]),
    ) as typeof collection;
    expect(templateDejaPossede(marquee, premierSlot.templateId)).toBe(true);
  });

  it("faux pour un templateId inconnu", () => {
    expect(templateDejaPossede(initCollection(), "template-inexistant")).toBe(false);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/collection.test.ts`
Expected: FAIL — `templateDejaPossede is not a function` (export inexistant).

- [ ] **Step 3: Implémenter le helper**

Ajouter à la fin de `src/lib/collection.ts` :

```ts
/**
 * Vrai si le template a déjà été possédé au moins une fois (achat,
 * restauration…), même revendu depuis. Pilote le badge collection ✓ du chinage.
 */
export function templateDejaPossede(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
): boolean {
  return Object.values(collection).some((slots) =>
    slots.some((s) => s.templateId === templateId && s.dejaPossede),
  );
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/lib/collection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/collection.ts src/lib/collection.test.ts
git commit -m "feat(collection): helper templateDejaPossede pour le badge du chinage"
```

---

### Task 3: Composant `ChineSkillDock`

**Files:**
- Create: `src/components/mobile/chine/ChineSkillDock.tsx`
- Test: `src/components/mobile/chine/ChineSkillDock.test.tsx`

**Interfaces:**
- Produces:

```ts
export type DockSkill = {
  id: string;
  nom: string;
  /** Illustration webp ; fallback emoji si le fichier manque (onError). */
  imageSrc: string;
  emojiFallback: string;
  verrouille: boolean;
  niveauRequis: number;
  /** Usages restants aujourd'hui (ignoré si verrouillé). */
  restants: number;
  /** Déjà activé pour la session (Le Flair) : surbrillance, plus cliquable. */
  actif?: boolean;
  /** Le contexte n'autorise pas l'usage (ex : Tchatche hors négo fâchée). */
  desactive?: boolean;
  ariaLabel: string;
  /** Appelé au tap — y compris verrouillé (le parent affiche le toast de niveau). */
  onActivate: () => void;
};
export function ChineSkillDock({ skills }: { skills: DockSkill[] }): JSX.Element;
```

Consommé par la tâche 6 (`ItemSwipeDeck`/`ClientPage`).

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/components/mobile/chine/ChineSkillDock.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChineSkillDock, type DockSkill } from "./ChineSkillDock";

afterEach(cleanup);

function makeSkill(patch: Partial<DockSkill> = {}): DockSkill {
  return {
    id: "flair",
    nom: "Le Flair",
    imageSrc: "/competences/atout.flair.webp",
    emojiFallback: "🔍",
    verrouille: false,
    niveauRequis: 5,
    restants: 2,
    ariaLabel: "Le Flair — 2 usage(s) restant(s)",
    onActivate: () => {},
    ...patch,
  };
}

describe("ChineSkillDock", () => {
  it("affiche un cercle par atout avec la pastille d'usages restants", () => {
    render(
      <ChineSkillDock
        skills={[
          makeSkill(),
          makeSkill({ id: "fouille", nom: "La Fouille", restants: 1, ariaLabel: "La Fouille — 1 usage(s) restant(s)" }),
        ]}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("verrouillé : pastille de niveau requis et clic transmis (toast côté parent)", () => {
    const onActivate = vi.fn();
    render(
      <ChineSkillDock
        skills={[makeSkill({ id: "tchatche", verrouille: true, niveauRequis: 25, onActivate, ariaLabel: "La Tchatche — verrouillé, se débloque au niveau 25" })]}
      />,
    );
    expect(screen.getByText("N25")).toBeTruthy();
    fireEvent.click(screen.getByRole("button"));
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it("épuisé (0 usage restant) : le bouton est désactivé", () => {
    const onActivate = vi.fn();
    render(<ChineSkillDock skills={[makeSkill({ restants: 0, onActivate })]} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("désactivé par le contexte (Tchatche hors négo fâchée) : pas d'activation", () => {
    const onActivate = vi.fn();
    render(<ChineSkillDock skills={[makeSkill({ id: "tchatche", desactive: true, onActivate })]} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("actif (Flair déjà joué) : plus cliquable", () => {
    const onActivate = vi.fn();
    render(<ChineSkillDock skills={[makeSkill({ actif: true, onActivate })]} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onActivate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/chine/ChineSkillDock.test.tsx`
Expected: FAIL — module `./ChineSkillDock` introuvable.

- [ ] **Step 3: Implémenter le composant**

Créer `src/components/mobile/chine/ChineSkillDock.tsx` :

```tsx
"use client";

import { useState, type CSSProperties } from "react";
import { Lock } from "lucide-react";

/** Un atout du dock du header bas du mode chinage. */
export type DockSkill = {
  id: string;
  nom: string;
  /** Illustration webp ; fallback emoji si le fichier manque (onError). */
  imageSrc: string;
  emojiFallback: string;
  verrouille: boolean;
  niveauRequis: number;
  /** Usages restants aujourd'hui (ignoré si verrouillé). */
  restants: number;
  /** Déjà activé pour la session (Le Flair) : surbrillance, plus cliquable. */
  actif?: boolean;
  /** Le contexte n'autorise pas l'usage (ex : Tchatche hors négo fâchée). */
  desactive?: boolean;
  ariaLabel: string;
  /** Appelé au tap — y compris verrouillé (le parent affiche le toast de niveau). */
  onActivate: () => void;
};

/**
 * Dock de compétences « jeu vidéo » du header bas : un cercle par atout,
 * grisé + cadenas si pas encore débloqué, pastille d'usages restants sinon.
 * Un cercle verrouillé reste cliquable : le parent affiche le niveau requis.
 */
export function ChineSkillDock({ skills }: { skills: DockSkill[] }) {
  return (
    <div style={dockRow}>
      {skills.map((s) => (
        <SkillCircle key={s.id} skill={s} />
      ))}
    </div>
  );
}

function SkillCircle({ skill }: { skill: DockSkill }) {
  const [imgKo, setImgKo] = useState(false);
  const epuise = !skill.verrouille && skill.restants <= 0;
  const inerte = epuise || skill.desactive || skill.actif;
  return (
    <button
      type="button"
      aria-label={skill.ariaLabel}
      onClick={skill.onActivate}
      disabled={!skill.verrouille && inerte}
      style={circleBtn(skill.verrouille, !skill.verrouille && inerte, !!skill.actif)}
    >
      {imgKo ? (
        <span style={{ fontSize: 22, filter: skill.verrouille ? "grayscale(1)" : "none" }}>
          {skill.emojiFallback}
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={skill.imageSrc}
          alt=""
          onError={() => setImgKo(true)}
          style={circleImg(skill.verrouille)}
        />
      )}
      {skill.verrouille && (
        <span style={lockOverlay}>
          <Lock size={16} strokeWidth={2.5} />
        </span>
      )}
      <span style={pastille}>
        {skill.verrouille ? `N${skill.niveauRequis}` : skill.restants}
      </span>
    </button>
  );
}

const dockRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const circleBtn = (
  verrouille: boolean,
  inerte: boolean,
  actif: boolean,
): CSSProperties => ({
  position: "relative",
  width: 52,
  height: 52,
  borderRadius: "50%",
  border: `2px solid ${actif ? "var(--brass-300)" : "var(--brass-500)"}`,
  background: "var(--forest-800)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  cursor: verrouille || !inerte ? "pointer" : "default",
  opacity: inerte && !actif ? 0.4 : 1,
  boxShadow: actif
    ? "0 0 10px 2px rgba(214,178,94,0.55)"
    : "0 1px 3px rgba(0,0,0,0.35)",
  overflow: "visible",
});

const circleImg = (verrouille: boolean): CSSProperties => ({
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
  filter: verrouille ? "grayscale(1) brightness(0.55)" : "none",
});

/** Cadenas centré par-dessus l'illustration grisée. */
const lockOverlay: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--paper-100)",
  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))",
};

/** Pastille bas-droite : usages restants, ou « N{niveau} » si verrouillé. */
const pastille: CSSProperties = {
  position: "absolute",
  right: -4,
  bottom: -4,
  minWidth: 18,
  height: 18,
  padding: "0 4px",
  borderRadius: 999,
  background: "var(--brass-500)",
  border: "1.5px solid var(--forest-800)",
  color: "var(--forest-800)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/components/mobile/chine/ChineSkillDock.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/chine/ChineSkillDock.tsx src/components/mobile/chine/ChineSkillDock.test.tsx
git commit -m "feat(chinage): dock de compétences en cercles (verrouillage, quotas, fallback emoji)"
```

---

### Task 4: `ChineSlide` — infos au-dessus de l'image + badge collection

**Files:**
- Modify: `src/components/mobile/chine/ChineSlide.tsx`
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx` (construction des slides + refactor `estDecouverte`)
- Test: `src/components/mobile/chine/ChineSlide.test.tsx` (nouveau)

**Interfaces:**
- Consumes: `templateDejaPossede` (tâche 2), `d.chine.dejaPossedeAria` (tâche 1).
- Produces: le variant `{ kind: "item" }` de `ChineSlide` gagne un champ **requis** `dejaPossede: boolean`. Consommé par la tâche 6 (les slides sont déjà construites ici avec le champ).

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/components/mobile/chine/ChineSlide.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChineSlideVue, type ChineSlide } from "./ChineSlide";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";
import type { NegoPersona, ObjetEnVente } from "@/types/game";

afterEach(cleanup);

const persona: NegoPersona = {
  archetype: "grincheux",
  margePct: 0.1,
  elanPct: 0.25,
  patience: 3,
  tolerancePct: 0.3,
  sangFroid: 0.25,
};

function makeItem(): ObjetEnVente {
  return {
    id: "item-1",
    objet: createMockObjet(),
    prixVendeur: 100,
    prixAffiche: true,
    prixMinAccept: 60,
    negociationsTentees: 0,
    statut: "disponible",
    persona,
    negociation: null,
  };
}

function makeSlide(dejaPossede: boolean): ChineSlide {
  return {
    kind: "item",
    item: makeItem(),
    estRareOuPlus: false,
    coteConnue: false,
    dejaPossede,
  };
}

describe("ChineSlideVue — badge collection", () => {
  it("affiche le badge ✓ quand le template a déjà été possédé", () => {
    render(<ChineSlideVue slide={makeSlide(true)} />);
    expect(
      screen.getByLabelText("Déjà possédé dans la collection"),
    ).toBeTruthy();
  });

  it("pas de badge pour une découverte jamais possédée", () => {
    render(<ChineSlideVue slide={makeSlide(false)} />);
    expect(
      screen.queryByLabelText("Déjà possédé dans la collection"),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/chine/ChineSlide.test.tsx`
Expected: FAIL — TypeScript refuse `dejaPossede` (champ inconnu du type `ChineSlide`) et/ou `getByLabelText` ne trouve rien.

- [ ] **Step 3: Modifier `ChineSlide.tsx`**

3a. Ajouter les imports lucide en haut du fichier :

```tsx
import { Album, Check } from "lucide-react";
```

3b. Ajouter `dejaPossede` au type (variant `kind: "item"`) :

```ts
export type ChineSlide =
  | {
      kind: "item";
      item: ObjetEnVente;
      estRareOuPlus: boolean;
      /** Connaisseur 3 débloqué pour cette catégorie : la cote (valeur de référence) est révélée. */
      coteConnue: boolean;
      /** Le template a déjà été possédé au moins une fois : badge collection ✓. */
      dejaPossede: boolean;
    }
  | { kind: "mystere" };
```

3c. Réorganiser le rendu du variant item : titre + infos AU-DESSUS de l'image, badge après les étoiles. Remplacer le bloc `return` du cas item (le JSX entre `<ScaleToFit>` et `</ScaleToFit>`) par :

```tsx
      <ScaleToFit>
        <div style={stickerBox}>
          <div style={titre}>{nomObjet(objet, locale)}</div>

          <div style={infoRow}>
            <div style={infoCol}>
              <div style={etatLigne}>
                <StarRow
                  filled={etoileCount(objet.etat)}
                  color={rarity.outer}
                  size={20}
                  gap={3}
                  dropShadow
                  emptyFill="rgba(255,243,213,0.35)"
                  display="flex"
                  aria-label={tr(d.chine.etatAriaLabel, {
                    etat: libelleEtat(objet.etat, d),
                  })}
                />
                {slide.dejaPossede && (
                  <span role="img" aria-label={d.chine.dejaPossedeAria} style={badgeCollection}>
                    <Album size={13} strokeWidth={2.2} />
                    <span style={badgeCheck}>
                      <Check size={8} strokeWidth={4} />
                    </span>
                  </span>
                )}
              </div>
              <div style={categorieLigne}>
                <CategorieIcon categorie={objet.categorie} size={15} color="var(--paper-100)" />
                <span>{libelleCategorie(objet.categorie, d)}</span>
              </div>
            </div>
            <div style={prixCol}>
              <div style={prixLigne}>{prixVendeur} €</div>
              {slide.coteConnue && (
                <div style={coteLigne}>
                  {tr(d.chine.coteLabel, { valeur: objet.prixReferenceReel })}
                </div>
              )}
            </div>
          </div>

          {/* Sticker die-cut, comme la collection. */}
          <div style={stickerImg}>
            <ItemSticker
              templateId={objet.templateId}
              categorie={objet.categorie}
              fill
              tilt={false}
              variant={acquis ? "grise" : "normal"}
              thumb
              eager
              outlinePx={3}
            />
          </div>
        </div>
      </ScaleToFit>
```

3d. Ajouter les styles en fin de fichier :

```ts
/** Étoiles d'état + badge collection sur la même ligne. */
const etatLigne: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

/** Badge collection : logo Album + ✓ en médaillon, l'objet est déjà possédé. */
const badgeCollection: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: "50%",
  border: "1.5px solid var(--brass-300)",
  background: "rgba(15,30,22,0.55)",
  color: "var(--paper-100)",
};

/** Coche verte en médaillon bas-droite du badge. */
const badgeCheck: CSSProperties = {
  position: "absolute",
  right: -4,
  bottom: -4,
  width: 13,
  height: 13,
  borderRadius: "50%",
  background: "var(--brass-300)",
  color: "var(--forest-800)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
```

Le slide mystère (`kind: "mystere"`) reste inchangé.

- [ ] **Step 4: Mettre à jour la construction des slides dans `ClientPage.tsx`**

4a. Ajouter l'import :

```ts
import { templateDejaPossede } from "@/lib/collection";
```

4b. Dans le `useMemo` des `slides` (~ligne 164), ajouter le champ :

```ts
      liste.push({
        kind: "item",
        item: it,
        estRareOuPlus: estRareOuPlus(it),
        coteConnue: flairActif || (state ? aConnaisseurChinage(state, it.objet.categorie) : false),
        dejaPossede: state ? templateDejaPossede(state.collection, it.objet.templateId) : false,
      });
```

4c. Refactorer `estDecouverte` dans `handleAchatAuPrix` (~ligne 242) pour utiliser le helper :

```ts
    const estDecouverte = !templateDejaPossede(state.collection, it.objet.templateId);
```

- [ ] **Step 5: Vérifier le succès**

Run: `npx vitest run src/components/mobile/chine/ChineSlide.test.tsx && npx tsc --noEmit`
Expected: PASS, et aucune erreur TypeScript.

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/chine/ChineSlide.tsx src/components/mobile/chine/ChineSlide.test.tsx "src/app/chiner/[brocanteId]/ClientPage.tsx"
git commit -m "feat(chinage): infos au-dessus de l'image + badge collection déjà-possédé"
```

---

### Task 5: `ChineNegoDrawer` — retrait Tchatche, resync externe, fix boutons

**Files:**
- Modify: `src/components/mobile/chine/ChineNegoDrawer.tsx`
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx` (retrait de la prop `tchatche` au call-site, ~lignes 425-432)
- Test: `src/components/mobile/chine/ChineNegoDrawer.test.tsx` (réécriture)

**Interfaces:**
- Consumes: rien de nouveau.
- Produces: `ChineNegoDrawer` SANS prop `tchatche` ; le drawer resynchronise son état local quand `item.negociation` change de l'extérieur (référence différente de `localNego`). La tâche 6 s'appuie dessus pour la relance Tchatche depuis le dock.

- [ ] **Step 1: Réécrire le fichier de test**

Remplacer intégralement le contenu de `src/components/mobile/chine/ChineNegoDrawer.test.tsx` par :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChineNegoDrawer } from "./ChineNegoDrawer";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";
import { relancerNegociation } from "@/lib/negociation";
import type { NegociationState, NegoPersona, ObjetEnVente } from "@/types/game";

afterEach(cleanup);

const persona: NegoPersona = {
  archetype: "grincheux",
  margePct: 0.1,
  elanPct: 0.25,
  patience: 3,
  tolerancePct: 0.3,
  sangFroid: 0.25,
};

function makeNego(patch: Partial<NegociationState> = {}): NegociationState {
  return {
    mode: "achat",
    tour: 3,
    humeur: 0.8,
    prixAdverseCourant: 80,
    cibleSecrete: 60,
    derniereOffreJoueur: 50,
    statut: "fache",
    message: { cle: "fache", variante: 0 },
    ...patch,
  };
}

function makeItem(negociation: NegociationState | null): ObjetEnVente {
  return {
    id: "item-1",
    objet: createMockObjet(),
    prixVendeur: 100,
    prixAffiche: true,
    prixMinAccept: 60,
    negociationsTentees: 3,
    statut: "disponible",
    persona,
    negociation,
  };
}

function renderDrawer(item: ObjetEnVente) {
  const onUpdateNego = vi.fn();
  const vue = render(
    <ChineNegoDrawer
      item={item}
      budget={1000}
      plein={false}
      expanded={true}
      onExpand={() => {}}
      onCollapse={() => {}}
      onUpdateNego={onUpdateNego}
      onConclu={() => {}}
      onAcheterDirect={() => {}}
    />,
  );
  return { onUpdateNego, vue };
}

describe("ChineNegoDrawer — Tchatche déplacée dans le dock", () => {
  it("n'affiche plus de bouton Tchatche sur une négo fâchée", () => {
    renderDrawer(makeItem(makeNego({ statut: "fache" })));
    expect(screen.queryByText(/Tchatche/)).toBeNull();
  });

  it("n'affiche plus de bouton Tchatche sur un refus poli", () => {
    renderDrawer(makeItem(makeNego({ statut: "refus_poli" })));
    expect(screen.queryByText(/Tchatche/)).toBeNull();
  });
});

describe("ChineNegoDrawer — resynchronisation externe", () => {
  it("reflète une relance venue de l'extérieur (dock) : la négo redevient jouable", () => {
    const fache = makeNego({ statut: "fache" });
    const item = makeItem(fache);
    const { vue } = renderDrawer(item);
    // Fâché : pas de bouton Proposer.
    expect(screen.queryByText(/Proposer/)).toBeNull();

    // Le dock relance : nouvel objet negociation (référence différente).
    const relance = relancerNegociation(fache);
    vue.rerender(
      <ChineNegoDrawer
        item={{ ...item, negociation: relance }}
        budget={1000}
        plein={false}
        expanded={true}
        onExpand={() => {}}
        onCollapse={() => {}}
        onUpdateNego={() => {}}
        onConclu={() => {}}
        onAcheterDirect={() => {}}
      />,
    );
    expect(screen.getByText(/Proposer/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/chine/ChineNegoDrawer.test.tsx`
Expected: FAIL — les boutons 💬 « La Tchatche » sont encore rendus, et la relance externe n'est pas reflétée (pas de « Proposer » après rerender).

- [ ] **Step 3: Modifier `ChineNegoDrawer.tsx`**

3a. Retirer la prop `tchatche` (destructuring ligne 33 et type lignes 46-47), le handler `handleRelancer` (lignes 81-93) et l'import `libelleActive` (ligne 11) qui devient inutile.

3b. Ajouter la resynchronisation après le `useState` de `localNego` (importer `useEffect` en plus de `useState`) :

```tsx
  // Resynchronise quand la négo change de l'EXTÉRIEUR (relance Tchatche depuis
  // le dock). Garde anti-boucle : onUpdateNego republie l'objet localNego
  // lui-même (même référence), donc seule une écriture externe déclenche.
  useEffect(() => {
    if (item.negociation && item.negociation !== localNego) {
      setLocalNego(item.negociation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.negociation]);
```

3c. Simplifier `negoBtnRow` — remplacer tout le bloc conditionnel (lignes 147-206) par :

```tsx
            {localNego.statut === "refus_poli" ? (
              <button
                type="button"
                style={{ ...btnPrimary, gridColumn: "1 / -1" }}
                onClick={() => onConclu(localNego.prixAdverseCourant)}
              >
                {tr(d.chine.acheterPrixAffiche, { prix: localNego.prixAdverseCourant })}
              </button>
            ) : enCours ? (
              <>
                <button type="button" style={btnSecondary} onClick={onCollapse}>
                  {d.chine.laisserTomber}
                </button>
                <button type="button" style={btnPrimary} onClick={handleProposer}>
                  {offreJoueur >= localNego.prixAdverseCourant
                    ? tr(d.chine.accepterPrix, { prix: offreJoueur })
                    : tr(d.chine.proposerPrix, { prix: offreJoueur })}
                </button>
              </>
            ) : (
              // Couvre "fache" ET "conclu" (drawer refermé puis rouvert après
              // un achat raté sur budget). La relance fâché/refus vit dans le
              // dock de compétences (La Tchatche).
              <button
                type="button"
                style={{ ...btnSecondary, gridColumn: "1 / -1" }}
                onClick={onCollapse}
              >
                {d.commun.fermer}
              </button>
            )}
```

3d. Fix du débordement des boutons dans `btnBase` (ligne 321) : supprimer `whiteSpace: "nowrap"` et passer la police en fluide :

```ts
const btnBase: CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "12px 8px",
  borderRadius: 11,
  border: "2px solid var(--brass-600)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "clamp(12px, 3.4vw, 15px)",
  textAlign: "center",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 2px rgba(40,25,5,0.18)",
  cursor: "pointer",
};
```

3e. Donner plus de place au bouton « Acheter XX € » dans le mode replié (`peekBtnRow`, lignes 113-125) — son libellé est structurellement plus long que « Négocier » :

```tsx
            <div style={peekBtnRow}>
              <button type="button" style={btn(false)} onClick={onExpand}>
                {d.chine.negocier}
              </button>
              <button
                type="button"
                style={{ ...btn(acheterDisabled), flex: 1.3 }}
                disabled={acheterDisabled}
                onClick={onAcheterDirect}
              >
                {tr(d.chine.acheterPrix, { prix: prixVendeur })}
              </button>
            </div>
```

- [ ] **Step 4: Retirer la prop au call-site (`ClientPage.tsx`)**

Supprimer le bloc `tchatche={...}` (~lignes 425-432) du `<ChineNegoDrawer …>` dans `renderNegoDrawer`. Ne PAS retirer les imports `usagesRestants`/`utiliserActive`/`activeDebloquee` (encore utilisés par le Flair et la Fouille, et par la tâche 6).

- [ ] **Step 5: Vérifier le succès**

Run: `npx vitest run src/components/mobile/chine/ChineNegoDrawer.test.tsx && npx tsc --noEmit`
Expected: PASS (3 tests), aucune erreur TypeScript.

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/chine/ChineNegoDrawer.tsx src/components/mobile/chine/ChineNegoDrawer.test.tsx "src/app/chiner/[brocanteId]/ClientPage.tsx"
git commit -m "refactor(chinage): Tchatche retirée du tiroir de négo (resync externe) + fix débordement boutons"
```

---

### Task 6: `ItemSwipeDeck` + `ClientPage` — dock câblé, navigation sous l'image

**Files:**
- Modify: `src/components/mobile/chine/ItemSwipeDeck.tsx`
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx`

**Interfaces:**
- Consumes: `ChineSkillDock`/`DockSkill` (tâche 3), `relancerNegociation` (`@/lib/negociation`), `NIVEAU_ACTIVES` (`@/lib/actives`), chaînes i18n (tâche 1).
- Produces: `ItemSwipeDeck` perd `fouilleDebloquee`/`fouilleRestants`/`onFouille` et gagne `renderDock?: (currentItem: ObjetEnVente | null) => ReactNode`. La barre bas devient : Sortir (gauche) + dock (droite). La navigation ◀ 1/6 ▶ passe sous la zone de swipe.

- [ ] **Step 1: Modifier `ItemSwipeDeck.tsx`**

1a. Signature : supprimer les props `fouilleDebloquee`, `fouilleRestants`, `onFouille` (déclaration + type) ; ajouter :

```ts
  /** Dock de compétences rendu à droite du bouton Sortir (reçoit la carte courante). */
  renderDock?: (currentItem: ObjetEnVente | null) => ReactNode;
```

1b. Imports : retirer `libelleActive` (`@/lib/i18n/libelles`) ; `tr` de `useLangue` devient inutile → `const { d } = useLangue();`.

1c. Insérer la barre de navigation SOUS la zone de swipe — juste après le `</div>` qui ferme la zone `onPointerDown/...` (ancienne ligne 181), avant le bloc mystère :

```tsx
      {/* Navigation ◀ 1/6 ▶ sous l'image, position stable entre les slides. */}
      <div style={navRow}>
        <button
          type="button"
          aria-label={d.chine.precedent}
          onClick={() => go(-1)}
          disabled={clampedIdx === 0}
          style={navBtn(clampedIdx === 0)}
        >
          <ChevronLeft size={26} />
        </button>
        <span style={navCompteur}>
          {clampedIdx + 1} / {slides.length}
        </span>
        <button
          type="button"
          aria-label={d.sheets.suivant}
          onClick={() => go(1)}
          disabled={clampedIdx === slides.length - 1}
          style={navBtn(clampedIdx === slides.length - 1)}
        >
          <ChevronRight size={26} />
        </button>
      </div>
```

1d. Remplacer TOUT le contenu de la barre du bas (l'ancien `<div>` lignes 217-302 : bouton Sortir + fouille + chevrons + compteur) par :

```tsx
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--forest-800)",
          borderTop: "3px solid var(--brass-500)",
          padding: "8px 16px calc(8px + var(--safe-bottom))",
        }}
      >
        <button
          type="button"
          aria-label={d.chine.quitterBrocanteAriaLabel}
          onClick={onQuitter}
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

        {renderDock?.(currentItem)}
      </div>
```

1e. Ajouter les styles de navigation en fin de fichier :

```ts
/** Barre ◀ 1/6 ▶ sous l'image (au-dessus du tiroir vendeur). */
const navRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  padding: "2px 0 6px",
};

const navBtn = (disabled: boolean): CSSProperties => ({
  background: "transparent",
  border: "none",
  cursor: disabled ? "default" : "pointer",
  color: "var(--brass-300)",
  opacity: disabled ? 0.3 : 1,
  padding: 0,
  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
});

const navCompteur: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--paper-100)",
  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
  minWidth: 48,
  textAlign: "center",
};
```

(Ajouter l'import `CSSProperties` au type-import React existant du fichier.)

- [ ] **Step 2: Câbler le dock dans `ClientPage.tsx`**

2a. Imports — ajouter :

```ts
import { ChineSkillDock, type DockSkill } from "@/components/mobile/chine/ChineSkillDock";
import { relancerNegociation } from "@/lib/negociation";
import { activeDebloquee, usagesRestants, NIVEAU_ACTIVES, type ActiveId } from "@/lib/actives";
```

(`activeDebloquee`/`usagesRestants` sont déjà importés — compléter la ligne existante.)

2b. Supprimer TOUT le bloc de la barre Flair en haut (l'ancien `{activeDebloquee(state, "flair") && (<div …>…</div>)}` — ~lignes 329-369). `jouerFlair` reste.

2c. Ajouter `jouerTchatche` après `jouerFouille` :

```ts
  /** La Tchatche (N25) : rouvre la négo fâchée/refusée de la carte courante. */
  const jouerTchatche = (it: ObjetEnVente) => {
    if (!it.negociation) return;
    // Calcule AVANT de consommer : relancerNegociation renvoie l'état inchangé
    // (identité) hors "fache"/"refus_poli" — ne pas brûler le quota pour rien.
    const next = relancerNegociation(it.negociation);
    if (next === it.negociation) return;
    if (!utiliserActive("tchatche")) return;
    setItem(it.id, { negociation: next });
  };
```

2d. Ajouter le constructeur du dock (avant le `return` final) :

```tsx
  /** Les 3 atouts du chinage, dans l'ordre de déblocage (cercles du header bas). */
  const dockSkills = (currentItem: ObjetEnVente | null): DockSkill[] => {
    const niveau = state.brocanteur.niveau;
    const commun = (id: Exclude<ActiveId, "diplomate">, emoji: string) => {
      const verrouille = !activeDebloquee(state, id);
      const nom = libelleActive(id, d);
      const restants = usagesRestants(state.activesUtilisees, id, state.jourActuel, niveau);
      return {
        id,
        nom,
        imageSrc: `/competences/atout.${id}.webp`,
        emojiFallback: emoji,
        verrouille,
        niveauRequis: NIVEAU_ACTIVES[id],
        restants,
        ariaLabel: verrouille
          ? tr(d.chine.atoutVerrouilleAria, { nom, niveau: NIVEAU_ACTIVES[id] })
          : tr(d.chine.atoutAria, { nom, restants }),
        onActivate: () => {
          if (verrouille) {
            toast(tr(d.chine.atoutVerrouilleToast, { nom, niveau: NIVEAU_ACTIVES[id] }), { type: "info" });
          }
        },
      };
    };

    const flair = commun("flair", "🔍");
    const fouille = commun("fouille", "🧹");
    const tchatche = commun("tchatche", "💬");
    const negoStatut = currentItem?.negociation?.statut;
    return [
      {
        ...flair,
        actif: flairActif,
        ariaLabel: flairActif ? tr(d.chine.atoutActifAria, { nom: flair.nom }) : flair.ariaLabel,
        onActivate: flair.verrouille ? flair.onActivate : jouerFlair,
      },
      {
        ...fouille,
        desactive:
          !currentItem ||
          currentItem.statut === "achete" ||
          currentItem.negociation?.statut === "en_cours",
        onActivate: fouille.verrouille
          ? fouille.onActivate
          : () => currentItem && jouerFouille(currentItem),
      },
      {
        ...tchatche,
        desactive: negoStatut !== "fache" && negoStatut !== "refus_poli",
        onActivate: tchatche.verrouille
          ? tchatche.onActivate
          : () => currentItem && jouerTchatche(currentItem),
      },
    ];
  };
```

2e. Sur le `<ItemSwipeDeck …>` : supprimer `fouilleDebloquee={…}`, `fouilleRestants={…}`, `onFouille={jouerFouille}` et ajouter :

```tsx
            renderDock={(currentItem) => <ChineSkillDock skills={dockSkills(currentItem)} />}
```

2f. Nettoyage des imports devenus inutiles dans `ClientPage.tsx` : `libelleActive` RESTE (utilisé par le dock) ; vérifier qu'aucun autre import n'est orphelin (`npx tsc --noEmit` + eslint le signalent).

- [ ] **Step 3: Vérifier compilation, tests et lint**

Run: `npx tsc --noEmit && npx vitest run src/components/mobile/chine && npx eslint "src/app/chiner/[brocanteId]/ClientPage.tsx" src/components/mobile/chine`
Expected: aucune erreur TS, tests chine PASS, eslint sans erreur.

- [ ] **Step 4: Vérification visuelle rapide**

Run: `npm run dev` puis ouvrir une session de chinage (navigateur mobile viewport).
Vérifier : dock à droite du Sortir (3 cercles, cadenas si niveau insuffisant, emoji en fallback), ◀ 1/6 ▶ sous l'image, titre/infos au-dessus de l'image, badge ✓ sur un objet déjà possédé, plus de barre Flair en haut, boutons Négocier/Acheter sans débordement.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/chine/ItemSwipeDeck.tsx "src/app/chiner/[brocanteId]/ClientPage.tsx"
git commit -m "feat(chinage): dock d'atouts dans le header bas, navigation ◀ 1/6 ▶ sous l'image"
```

---

### Task 7: Vérification finale

**Files:** aucun nouveau.

- [ ] **Step 1: Suite de tests complète**

Run: `npx vitest run`
Expected: PASS — aucun test cassé ailleurs (migrations, chine.test, etc.).

- [ ] **Step 2: Lint complet**

Run: `npx eslint src && npm run lint:hooks`
Expected: 0 erreur (règle Rules-of-Hooks incluse).

- [ ] **Step 3: Build**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 4: Vérification end-to-end (skill verify)**

Utiliser la skill `verify` du projet : dérouler une session de chinage complète (entrée brocante → swipe → négo fâchée → relance Tchatche depuis le dock → achat → badge ✓ visible sur un doublon → sortie), en FR puis EN (débordement boutons).

- [ ] **Step 5: Commit final éventuel + push**

```bash
git status  # rien d'oublié
git push
```

Rappel hors périmètre : la génération des 3 webp `atout.*.webp` se fait dans une session d'assets dédiée ; le fallback emoji couvre l'intervalle.
