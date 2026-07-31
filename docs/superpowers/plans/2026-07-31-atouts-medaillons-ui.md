# Médaillons d'atouts dans le parcours et le level-up — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher les médaillons de laiton des atouts (webp livrés) à la place des emojis dans la fenêtre de level-up et dans le parcours (timeline + fiche), avec badge « +1 » sur les paliers de 2ᵉ/3ᵉ usage.

**Architecture:** Deux champs optionnels ajoutés à la table `DEBLOCAGES_PAR_NIVEAU` (`activeId`, `usageSupplementaire`), un composant présentationnel partagé `MedaillonAtout` (image ronde sertie laiton, grisé optionnel, badge +1, fallback emoji `onError`), branché dans `LevelUpOverlay` (44 px, jamais grisé) et `ParcoursSheet` (32 px timeline avec grisé « à venir », 96 px fiche). Le helper `extraireEmoji` migre vers `src/lib/emoji.ts`.

**Tech Stack:** React/Next (client components, styles inline `CSSProperties` maison), vitest + @testing-library/react (jsdom).

## Global Constraints

- Spec : `docs/superpowers/specs/2026-07-31-atouts-medaillons-ui-design.md` (commitée `06bf1cd`).
- Branche de travail : `feat/atouts-medaillons` (déjà courante — les webp et la spec y sont ; NE PAS créer de nouvelle branche).
- Chemin d'image : `/competences/atout.${activeId}.webp` — ids `flair`, `lotGarni`, `fouille`, `boniment`, `tchatche`, `criee` (casse exacte).
- Filtre grisé (uniquement parcours « à venir ») : `grayscale(1) brightness(0.55)` — identique au dock verrouillé.
- Le level-up n'affiche JAMAIS de médaillon grisé.
- Aucune nouvelle chaîne i18n, aucun changement de save. Les titres localisés gardent leur emoji en donnée ; il n'est plus affiché que comme fallback `onError` et dans les lignes texte sans médaillon (« À venir » du level-up, bibliothèque — inchangées).
- Tests : `npx vitest run <fichiers> --maxWorkers=4` — le drapeau `--maxWorkers=4` est OBLIGATOIRE sur cette machine (sans lui, ~41 faux échecs par famine de workers).
- Commits : fin de message `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Donnée — `activeId` et `usageSupplementaire` dans la table des déblocages

**Files:**
- Modify: `src/data/deblocagesNiveau.ts`
- Test: `src/data/deblocagesNiveau.test.ts`

**Interfaces:**
- Consumes: `NIVEAU_ACTIVES`, `NIVEAU_USAGE_2`, `NIVEAU_USAGE_3` (déjà importés), type `ActiveId` de `@/lib/actives`.
- Produces: `DeblocageNiveau` avec `activeId?: ActiveId` (présent sur les 18 entrées `famille: "active"`) et `usageSupplementaire?: boolean` (`true` sur les 12 entrées 2ᵉ/3ᵉ usage, absent ailleurs). Les Tasks 3 et 4 lisent `dep.activeId` et `dep.usageSupplementaire`.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à la fin du `describe("table des déblocages par niveau")` de `src/data/deblocagesNiveau.test.ts` :

```ts
  it("chaque ligne famille active porte son activeId (source du médaillon)", () => {
    const actives = DEBLOCAGES_PAR_NIVEAU.filter((d) => d.famille === "active");
    expect(actives).toHaveLength(18);
    for (const d of actives) expect(d.activeId).toBeTruthy();
    // 6 atouts × 3 occurrences (déblocage, 2ᵉ, 3ᵉ usage).
    const parId = new Map<string, number>();
    for (const d of actives) parId.set(d.activeId!, (parId.get(d.activeId!) ?? 0) + 1);
    expect([...parId.values()]).toEqual([3, 3, 3, 3, 3, 3]);
  });

  it("usageSupplementaire marque exactement les paliers 2ᵉ/3ᵉ usage", () => {
    const bonus = DEBLOCAGES_PAR_NIVEAU.filter((d) => d.usageSupplementaire);
    expect(bonus).toHaveLength(12);
    const niveauxBonus = bonus.map((d) => d.niveau).sort((a, b) => a - b);
    const attendus = [
      ...Object.values(NIVEAU_USAGE_2),
      ...Object.values(NIVEAU_USAGE_3),
    ].sort((a, b) => a - b);
    expect(niveauxBonus).toEqual(attendus);
    // Les déblocages initiaux (N5-30) n'ont pas le drapeau.
    for (const d of DEBLOCAGES_PAR_NIVEAU.filter((x) => x.famille === "active" && !x.usageSupplementaire)) {
      expect(Object.values(NIVEAU_USAGE_2)).not.toContain(d.niveau);
    }
    // Et aucune ligne hors famille active ne le porte.
    for (const d of DEBLOCAGES_PAR_NIVEAU.filter((x) => x.famille !== "active")) {
      expect(d.usageSupplementaire).toBeUndefined();
    }
  });
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/data/deblocagesNiveau.test.ts --maxWorkers=4`
Expected: FAIL — `expect(d.activeId).toBeTruthy()` (champ inexistant).

- [ ] **Step 3: Implémenter**

Dans `src/data/deblocagesNiveau.ts` :

1. Ajouter l'import de type (compléter la ligne d'import existante de `@/lib/actives`) :

```ts
import { NIVEAU_ACTIVES, NIVEAU_USAGE_2, NIVEAU_USAGE_3, type ActiveId } from "@/lib/actives";
```

2. Compléter l'interface :

```ts
export interface DeblocageNiveau {
  niveau: number;
  titre: string;
  description: string;
  famille: FamilleDeblocage;
  /** true si le gate est réellement appliqué par le code (sinon ligne informative pour l'UI du plan 4). */
  effectif: boolean;
  /** Id d'atout (famille active) : source du médaillon côté UI. */
  activeId?: ActiveId;
  /** Palier « +1 usage/jour » (2ᵉ/3ᵉ) : badge +1 sur le médaillon. */
  usageSupplementaire?: boolean;
}
```

3. Dans `ENTREES`, compléter les trois spreads d'atouts :

```ts
  ...ATOUTS.map((a) => ({
    niveau: NIVEAU_ACTIVES[a.id], titre: a.titre, famille: "active" as const, effectif: true,
    activeId: a.id, description: a.desc,
  })),
  ...ATOUTS.map((a) => ({
    niveau: NIVEAU_USAGE_2[a.id], titre: `${a.titre} — 2ᵉ usage par jour`, famille: "active" as const, effectif: true,
    activeId: a.id, usageSupplementaire: true, description: DESC_USAGE_2,
  })),
  ...ATOUTS.map((a) => ({
    niveau: NIVEAU_USAGE_3[a.id], titre: `${a.titre} — 3ᵉ usage par jour`, famille: "active" as const, effectif: true,
    activeId: a.id, usageSupplementaire: true, description: DESC_USAGE_3,
  })),
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/data/deblocagesNiveau.test.ts --maxWorkers=4`
Expected: PASS (tous les tests du fichier, anciens compris).

- [ ] **Step 5: Commit**

```bash
git add src/data/deblocagesNiveau.ts src/data/deblocagesNiveau.test.ts
git commit -m "feat(atouts): activeId et usageSupplementaire dans la table des deblocages"
```

---

### Task 2: `src/lib/emoji.ts` + composant partagé `MedaillonAtout`

**Files:**
- Create: `src/lib/emoji.ts`
- Create: `src/lib/emoji.test.ts`
- Create: `src/components/mobile/MedaillonAtout.tsx`
- Test: `src/components/mobile/MedaillonAtout.test.tsx`

**Interfaces:**
- Consumes: type `ActiveId` de `@/lib/actives`.
- Produces:
  - `extraireEmoji(titre: string): { emoji: string | null; texte: string }` — copie exacte du helper actuellement local à `LevelUpOverlay.tsx:26` (qui sera basculé dessus en Task 3 ; ne PAS toucher LevelUpOverlay dans cette tâche).
  - `MedaillonAtout({ activeId, taille, grise?, bonusUsage?, emojiFallback }: MedaillonAtoutProps)` — rend un `<span aria-hidden>` rond serti laiton contenant l'`<img>` du médaillon (fallback emoji via `onError`), badge « +1 » si `bonusUsage`.

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/emoji.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { extraireEmoji } from "./emoji";

describe("extraireEmoji", () => {
  it("sépare le premier emoji et nettoie le titre", () => {
    expect(extraireEmoji("Atout 🔍 Le Flair")).toEqual({ emoji: "🔍", texte: "Atout Le Flair" });
  });
  it("titre sans emoji : texte intact, emoji null", () => {
    expect(extraireEmoji("Paliers 2 des compétences")).toEqual({ emoji: null, texte: "Paliers 2 des compétences" });
  });
});
```

`src/components/mobile/MedaillonAtout.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MedaillonAtout } from "./MedaillonAtout";

afterEach(cleanup);

describe("MedaillonAtout", () => {
  it("rend l'image du médaillon de l'atout", () => {
    const { container } = render(
      <MedaillonAtout activeId="flair" taille={32} emojiFallback="🔍" />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/competences/atout.flair.webp");
    expect(screen.queryByText("+1")).toBeNull();
  });

  it("bonusUsage : badge +1 superposé", () => {
    render(<MedaillonAtout activeId="criee" taille={32} bonusUsage emojiFallback="📣" />);
    expect(screen.getByText("+1")).toBeTruthy();
  });

  it("grise : filtre du dock verrouillé sur l'image", () => {
    const { container } = render(
      <MedaillonAtout activeId="fouille" taille={32} grise emojiFallback="🧹" />,
    );
    expect(container.querySelector("img")!.style.filter).toBe("grayscale(1) brightness(0.55)");
  });

  it("webp manquant : bascule sur l'emoji de secours", () => {
    const { container } = render(
      <MedaillonAtout activeId="tchatche" taille={32} emojiFallback="💬" />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("💬")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/emoji.test.ts src/components/mobile/MedaillonAtout.test.tsx --maxWorkers=4`
Expected: FAIL — modules inexistants.

- [ ] **Step 3: Implémenter**

`src/lib/emoji.ts` :

```ts
/** Sépare le premier emoji d'un titre localisé (« Atout 🔍 Le Flair »). */
export function extraireEmoji(titre: string): { emoji: string | null; texte: string } {
  const m = titre.match(/\p{Extended_Pictographic}/u);
  if (!m) return { emoji: null, texte: titre };
  return {
    emoji: m[0],
    texte: titre.replace(m[0], "").replace(/\s{2,}/g, " ").trim(),
  };
}
```

`src/components/mobile/MedaillonAtout.tsx` :

```tsx
"use client";

import { useState, type CSSProperties } from "react";
import type { ActiveId } from "@/lib/actives";

export interface MedaillonAtoutProps {
  activeId: ActiveId;
  /** Diamètre en px (32 timeline du parcours, 44 level-up, 96 fiche). */
  taille: number;
  /** Filtre du dock verrouillé — réservé au parcours « à venir ». */
  grise?: boolean;
  /** Palier 2ᵉ/3ᵉ usage : badge « +1 » au coin bas-droit. */
  bonusUsage?: boolean;
  /** Affiché si le webp manque (onError), même mécanique que SkillDock. */
  emojiFallback: string;
}

/**
 * Médaillon de laiton d'un atout, hors dock : sertissure identique aux
 * cercles du SkillDock. Décoratif (aria-hidden) — le titre adjacent porte
 * toujours l'information.
 */
export function MedaillonAtout({
  activeId,
  taille,
  grise,
  bonusUsage,
  emojiFallback,
}: MedaillonAtoutProps) {
  const [imgKo, setImgKo] = useState(false);
  const filtre = grise ? "grayscale(1) brightness(0.55)" : "none";
  return (
    <span style={cadre(taille)} aria-hidden="true">
      {imgKo ? (
        <span style={{ fontSize: Math.round(taille * 0.55), filter: filtre }}>
          {emojiFallback}
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`/competences/atout.${activeId}.webp`}
          alt=""
          onError={() => setImgKo(true)}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            objectFit: "cover",
            filter: filtre,
          }}
        />
      )}
      {bonusUsage && <span style={badge(taille)}>+1</span>}
    </span>
  );
}

const cadre = (taille: number): CSSProperties => ({
  position: "relative",
  width: taille,
  height: taille,
  borderRadius: "50%",
  border: "2px solid var(--brass-500)",
  background: "var(--forest-800)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxSizing: "border-box",
});

/** Pastille « +1 » : même recette que la pastille d'usages du dock. */
const badge = (taille: number): CSSProperties => {
  const h = Math.max(14, Math.round(taille * 0.32));
  return {
    position: "absolute",
    right: -Math.round(h * 0.2),
    bottom: -Math.round(h * 0.2),
    minWidth: h,
    height: h,
    padding: "0 3px",
    borderRadius: 999,
    background: "var(--brass-500)",
    border: "1.5px solid var(--forest-800)",
    color: "var(--forest-800)",
    fontFamily: "var(--font-mono)",
    fontSize: Math.max(9, Math.round(h * 0.55)),
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  };
};
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/lib/emoji.test.ts src/components/mobile/MedaillonAtout.test.tsx --maxWorkers=4`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/emoji.ts src/lib/emoji.test.ts src/components/mobile/MedaillonAtout.tsx src/components/mobile/MedaillonAtout.test.tsx
git commit -m "feat(atouts): composant MedaillonAtout partage et helper extraireEmoji"
```

---

### Task 3: Fenêtre de level-up — médaillon à la place de l'emoji

**Files:**
- Modify: `src/components/mobile/LevelUpOverlay.tsx`
- Test: `src/components/mobile/LevelUpOverlay.test.tsx`

**Interfaces:**
- Consumes: `MedaillonAtout` (Task 2), `extraireEmoji` de `@/lib/emoji` (Task 2), `dep.activeId` / `dep.usageSupplementaire` (Task 1).
- Produces: rien de nouveau pour les autres tâches.

- [ ] **Step 1: Adapter le test existant (il doit échouer d'abord)**

Dans `src/components/mobile/LevelUpOverlay.test.tsx`, remplacer le test `"atout débloqué (N5, Le Flair) : bloc grand format avec emoji géant et description"` par :

```tsx
  it("atout débloqué (N5, Le Flair) : bloc grand format avec médaillon et description", () => {
    mockState = etat(4, 5);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    // Titre sans l'emoji inline (remplacé par le médaillon).
    expect(screen.getByText("Atout Le Flair")).toBeTruthy();
    expect(screen.getByText(/révèle la cote de l'objet affiché/)).toBeTruthy();
    const bloc = screen.getByText("Atout Le Flair").closest("[data-testid='levelup-atout']");
    expect(bloc).toBeTruthy();
    const img = bloc!.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/competences/atout.flair.webp");
    // Jamais grisé dans la célébration.
    expect(img!.style.filter).toBe("none");
    expect(bloc!.textContent).not.toContain("🔍");
    // Déblocage initial : pas de badge +1.
    expect(bloc!.textContent).not.toContain("+1 ");
  });

  it("palier 2ᵉ usage (N35, Le Flair) : médaillon avec badge +1", () => {
    mockState = etat(34, 35);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    const bloc = screen.getByTestId("levelup-atout");
    expect(bloc.querySelector("img")?.getAttribute("src")).toBe("/competences/atout.flair.webp");
    expect(bloc.textContent).toContain("+1");
  });
```

(Si l'assertion `not.toContain("+1 ")` s'avère fragile face au texte de description, cibler le badge par son texte exact : `expect(within(bloc as HTMLElement).queryByText("+1")).toBeNull()` avec `within` importé de `@testing-library/react` — retenir cette forme directement si plus simple.)

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/LevelUpOverlay.test.tsx --maxWorkers=4`
Expected: FAIL — pas d'`img` dans le bloc atout (et 🔍 encore présent).

- [ ] **Step 3: Implémenter**

Dans `src/components/mobile/LevelUpOverlay.tsx` :

1. Supprimer la fonction locale `extraireEmoji` (lignes 25-33) et importer à la place :

```ts
import { extraireEmoji } from "@/lib/emoji";
import { MedaillonAtout } from "@/components/mobile/MedaillonAtout";
```

2. Dans `atoutEnTete`, remplacer `alignItems: "baseline"` par `alignItems: "center"` (le médaillon de 44 px se centre sur la ligne de titre ; `baseline` l'alignait pour un emoji texte).

3. Supprimer le style `atoutEmoji` (devenu inutile).

4. Dans la branche `famille === "active"` (construction de `recompenses`), remplacer le rendu de l'en-tête :

```tsx
    if (dep.famille === "active") {
      const { emoji, texte } = extraireEmoji(titreLocal);
      recompenses.push({
        key: dep.titre,
        contenu: (
          <Puce>
            <div data-testid="levelup-atout">
              <div style={atoutEnTete}>
                {dep.activeId && (
                  <MedaillonAtout
                    activeId={dep.activeId}
                    taille={44}
                    bonusUsage={dep.usageSupplementaire}
                    emojiFallback={emoji ?? "✨"}
                  />
                )}
                <span style={atoutTitre}>{texte}</span>
              </div>
              <p style={atoutDescription}>{descriptionDeblocage(dep, locale)}</p>
            </div>
          </Puce>
        ),
      });
    }
```

(La ligne « À venir » — `prochain` — reste inchangée : titre avec emoji.)

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/components/mobile/LevelUpOverlay.test.tsx --maxWorkers=4`
Expected: PASS (tout le fichier).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/LevelUpOverlay.tsx src/components/mobile/LevelUpOverlay.test.tsx
git commit -m "feat(atouts): medaillon a la place de l'emoji dans la fenetre de level-up"
```

---

### Task 4: Parcours — médaillons dans la timeline et la fiche

**Files:**
- Modify: `src/components/mobile/ParcoursSheet.tsx`
- Test: `src/components/mobile/ParcoursSheet.test.tsx`

**Interfaces:**
- Consumes: `MedaillonAtout`, `extraireEmoji`, `dep.activeId` / `dep.usageSupplementaire`.
- Produces: rien de nouveau pour les autres tâches.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter dans `src/components/mobile/ParcoursSheet.test.tsx` (describe `ParcoursSheet`) :

```tsx
  it("ligne d'atout : médaillon affiché, emoji retiré du titre", () => {
    render(<ParcoursSheet open onClose={vi.fn()} niveau={8} />);
    const rowN5 = screen.getByTestId("parcours-row-5"); // Le Flair, atteint
    expect(rowN5.querySelector("img")?.getAttribute("src")).toBe("/competences/atout.flair.webp");
    expect(rowN5.querySelector("img")!.style.filter).toBe("none");
    expect(rowN5.textContent).not.toContain("🔍");

    const rowN15 = screen.getByTestId("parcours-row-15"); // La Fouille, à venir
    expect(rowN15.querySelector("img")?.getAttribute("src")).toBe("/competences/atout.fouille.webp");
    expect(rowN15.querySelector("img")!.style.filter).toBe("grayscale(1) brightness(0.55)");
  });

  it("ligne 2ᵉ usage (N35) : même médaillon avec badge +1", () => {
    render(<ParcoursSheet open onClose={vi.fn()} niveau={8} />);
    const rowN35 = screen.getByTestId("parcours-row-35"); // Flair — 2ᵉ usage
    expect(rowN35.querySelector("img")?.getAttribute("src")).toBe("/competences/atout.flair.webp");
    expect(rowN35.textContent).toContain("+1");
  });

  it("ligne non-atout (N3) : pas de médaillon", () => {
    render(<ParcoursSheet open onClose={vi.fn()} niveau={8} />);
    expect(screen.getByTestId("parcours-row-3").querySelector("img")).toBeNull();
  });
```

Et dans le describe `ParcoursSheet — fiche de déblocage` :

```tsx
  it("fiche d'un atout à venir : grand médaillon grisé, titre sans emoji", async () => {
    const user = userEvent.setup();
    render(<ParcoursSheet open onClose={vi.fn()} niveau={6} />);
    await user.click(screen.getByTestId("parcours-row-15")); // La Fouille, à venir
    const fiche = screen.getByRole("dialog", { name: /Atout La Fouille/ });
    const img = fiche.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/competences/atout.fouille.webp");
    expect(img!.style.filter).toBe("grayscale(1) brightness(0.55)");
    expect(fiche.textContent).not.toContain("🧹");
  });
```

Note : le `stage` du panneau est aussi un `role="dialog"` — le `getByRole` ci-dessus cible la fiche par son `aria-label` (titre débarrassé de l'emoji, voir Step 3.4). Si le sélecteur matche deux dialogs, utiliser `screen.getAllByRole("dialog")` et prendre le dernier.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/ParcoursSheet.test.tsx --maxWorkers=4`
Expected: FAIL — aucune `img` dans les lignes.

- [ ] **Step 3: Implémenter**

Dans `src/components/mobile/ParcoursSheet.tsx` :

1. Imports :

```ts
import { MedaillonAtout } from "@/components/mobile/MedaillonAtout";
import { extraireEmoji } from "@/lib/emoji";
```

2. Timeline — dans le `deps.map((dep) => …)`, calculer le titre affiché et rendre le médaillon devant :

```tsx
                    {deps.map((dep) => {
                      const brut = titreDeblocage(dep, locale);
                      const { emoji, texte } = extraireEmoji(brut);
                      const affiche = dep.activeId ? texte : brut;
                      return (
                        <button
                          key={`${dep.niveau}-${dep.titre}`}
                          type="button"
                          data-testid={`parcours-row-${dep.niveau}`}
                          data-etat={etat}
                          style={{
                            ...titreLigne(etat),
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            textAlign: "left",
                            cursor: "pointer",
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                          onClick={() => setFiche({ dep, etat })}
                        >
                          {dep.activeId && (
                            <MedaillonAtout
                              activeId={dep.activeId}
                              taille={32}
                              grise={etat === "a-venir"}
                              bonusUsage={dep.usageSupplementaire}
                              emojiFallback={emoji ?? "✨"}
                            />
                          )}
                          <span>{affiche}</span>
                        </button>
                      );
                    })}
```

(L'état `atteint` reste en couleur — l'opacité 0.55 de `contenuCol` l'estompe déjà ; `prochain` en couleur aussi.)

3. Fiche — au-dessus du `<h3>`, et titres sans emoji pour les atouts :

```tsx
      {fiche && (() => {
        const brut = titreDeblocage(fiche.dep, locale);
        const { emoji, texte } = extraireEmoji(brut);
        const titreFiche = fiche.dep.activeId ? texte : brut;
        return (
          <>
            <div style={ficheScrim} onClick={() => setFiche(null)} aria-hidden />
            <div role="dialog" aria-modal="true" aria-label={titreFiche} style={ficheCarte}>
              <button
                type="button"
                style={closeIconBtn}
                onClick={() => setFiche(null)}
                aria-label={d.sheets.fermerFiche}
              >
                ✕
              </button>
              {fiche.dep.activeId && (
                <div style={{ display: "flex", justifyContent: "center", margin: "2px 0 10px" }}>
                  <MedaillonAtout
                    activeId={fiche.dep.activeId}
                    taille={96}
                    grise={fiche.etat === "a-venir"}
                    bonusUsage={fiche.dep.usageSupplementaire}
                    emojiFallback={emoji ?? "✨"}
                  />
                </div>
              )}
              <h3 style={ficheTitre}>{titreFiche}</h3>
              <div style={ficheMeta}>
                {tr(d.sheets.nivAbrege, { n: fiche.dep.niveau })} ·{" "}
                <span>{fiche.etat === "atteint" ? d.sheets.ficheDebloque : d.sheets.ficheAVenir}</span>
              </div>
              <p style={ficheDescription}>{descriptionDeblocage(fiche.dep, locale)}</p>
            </div>
          </>
        );
      })()}
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/components/mobile/ParcoursSheet.test.tsx --maxWorkers=4`
Expected: PASS (tout le fichier).

- [ ] **Step 5: Filet global**

Run: `npx vitest run --maxWorkers=4`
Expected: suite entière verte (~1750 tests). En cas d'échec d'un test tiers qui référençait l'emoji des atouts, l'adapter dans l'esprit de la spec (médaillon affiché, emoji réservé au fallback).

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/ParcoursSheet.tsx src/components/mobile/ParcoursSheet.test.tsx
git commit -m "feat(atouts): medaillons dans la timeline et la fiche du parcours"
```

---

## Self-review (fait à l'écriture du plan)

- Couverture spec : §1 donnée → Task 1 ; §2 composant + helper partagé → Task 2 ; §3 level-up 44 px jamais grisé + badge → Task 3 ; §4 timeline 32 px grisé à-venir + fiche 96 px → Task 4 ; critères (plus d'emoji affiché, 3 occurrences même médaillon, suite verte) → tests des Tasks 1-4 + filet global Task 4 Step 5 ; hors périmètre (bibliothèque, ligne « À venir », dock) → aucune tâche n'y touche.
- Placeholders : aucun — code complet fourni pour chaque step.
- Cohérence des types : `activeId?: ActiveId` (Task 1) consommé tel quel par `MedaillonAtoutProps.activeId: ActiveId` derrière un garde `dep.activeId &&` (Tasks 3-4) ; `usageSupplementaire?: boolean` → prop `bonusUsage?: boolean` ; `extraireEmoji` signature identique à l'actuelle de LevelUpOverlay.
