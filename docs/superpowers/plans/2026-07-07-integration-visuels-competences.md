# Intégration des visuels de compétences — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Les 24 visuels webp remplacent les chiffres 1/2/3 dans les tuiles de l'arbre des compétences et s'affichent en grand (avec cadre Art déco) dans la sheet de détail.

**Architecture:** Un helper pur `visuelCompetence(comp)` dans `src/data/competences.ts` projette les 96 `CompetenceDef` sur les 24 assets (`general.*` pour l'arbre général, `theme.*` partagés pour les 7 arbres de catégorie). L'UI (`PalierTile` et `PalierDetail` dans `src/app/bibliotheque/page.tsx`) consomme ce helper avec des `<img>` simples (pas `next/image` — assets statiques `public/`, même approche que `ItemSticker`).

**Tech Stack:** Next.js (app router, client component), vitest, inline styles (convention du fichier).

**Spec:** `docs/superpowers/specs/2026-07-07-integration-visuels-competences-design.md`

## Global Constraints

- État verrouillé = image grisée : `filter: grayscale(1)` + opacité réduite (tuiles ET sheet).
- Cadre Art déco en overlay **dans la sheet seulement**, jamais sur les tuiles.
- Aucun changement de logique (achat, états, `TreePicker`, `ParcoursSheet`).
- Styles inline uniquement (convention de `src/app/bibliotheque/page.tsx`).
- Commits en français, format `feat(competences): …`.

---

### Task 1: Helper `visuelCompetence` (mapping compétence → asset)

**Files:**
- Modify: `src/data/competences.ts` (après `getTreeMeta`, fin de fichier)
- Test: `src/data/competencesVisuels.test.ts`

**Interfaces:**
- Consumes: `COMPETENCES`, `TREE_GENERAL`, `catTreeId` (existants dans `src/data/competences.ts`) ; `CompetenceDef` (champs `treeId`, `brancheId`, `palierNumero`).
- Produces: `export function visuelCompetence(comp: CompetenceDef): string` — retourne un chemin absolu public, ex. `/competences/general.vision.2.webp`. Les Tasks 2 et 3 l'importent depuis `@/data/competences`.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `src/data/competencesVisuels.test.ts` :

```ts
describe("visuelCompetence", () => {
  it("arbre général → general.*, arbre de catégorie → theme.* (partagé)", () => {
    const compGeneral = COMPETENCES.find(
      (c) =>
        c.treeId === TREE_GENERAL &&
        c.brancheId === "vision" &&
        c.palierNumero === 2,
    );
    expect(compGeneral).toBeDefined();
    expect(visuelCompetence(compGeneral!)).toBe(
      "/competences/general.vision.2.webp",
    );

    const compTheme = COMPETENCES.find(
      (c) =>
        c.treeId === catTreeId(CATEGORIES[0]) &&
        c.brancheId === "reparer" &&
        c.palierNumero === 3,
    );
    expect(compTheme).toBeDefined();
    expect(visuelCompetence(compTheme!)).toBe(
      "/competences/theme.reparer.3.webp",
    );
  });

  it("chacune des 96 compétences pointe vers un fichier webp existant", () => {
    const manquants = COMPETENCES.filter(
      (c) =>
        !fs.existsSync(path.join(process.cwd(), "public", visuelCompetence(c))),
    ).map((c) => c.id);
    expect(manquants).toEqual([]);
  });
});
```

Et compléter les imports en tête de fichier :

```ts
import {
  COMPETENCES,
  TREE_GENERAL,
  catTreeId,
  visuelCompetence,
} from "@/data/competences";
import { CATEGORIES } from "@/data/categories";
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `npx vitest run src/data/competencesVisuels.test.ts`
Expected: FAIL — `visuelCompetence` n'est pas exporté (erreur d'import/compilation).

- [ ] **Step 3: Implémenter le helper**

À la fin de `src/data/competences.ts` :

```ts
/**
 * Chemin public du visuel d'une compétence.
 * Les 7 arbres de catégorie partagent les 12 visuels `theme.*` ;
 * l'arbre général a les siens (`general.*`). 24 assets pour 96 compétences.
 */
export function visuelCompetence(comp: CompetenceDef): string {
  const prefixe = comp.treeId === TREE_GENERAL ? "general" : "theme";
  return `/competences/${prefixe}.${comp.brancheId}.${comp.palierNumero}.webp`;
}
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npx vitest run src/data/competencesVisuels.test.ts`
Expected: PASS (les 4 tests du fichier, dont les 2 nouveaux).

- [ ] **Step 5: Commit**

```bash
git add src/data/competences.ts src/data/competencesVisuels.test.ts
git commit -m "feat(competences): helper visuelCompetence — mapping des 96 compétences sur les 24 visuels"
```

---

### Task 2: Visuels dans les tuiles de l'arbre (`PalierTile`)

**Files:**
- Modify: `src/app/bibliotheque/page.tsx:321-409` (fonction `PalierTile`)

**Interfaces:**
- Consumes: `visuelCompetence(comp)` de la Task 1 (import à ajouter depuis `@/data/competences`).
- Produces: rien de nouveau pour les autres tasks (composant privé du fichier).

- [ ] **Step 1: Ajouter l'import**

Dans le bloc d'import existant depuis `@/data/competences` (lignes 15-23), ajouter `visuelCompetence` :

```ts
import {
  COMPETENCES,
  TREE_GENERAL,
  catTreeId,
  competencesParTree,
  getTreeDef,
  getTreeMeta,
  competencesParBranche,
  visuelCompetence,
} from "@/data/competences";
```

- [ ] **Step 2: Remplacer le corps de `PalierTile`**

Remplacer intégralement la fonction `PalierTile` (lignes 321-409) par :

```tsx
function PalierTile({
  comp,
  etat,
  onTap,
}: {
  comp: CompetenceDef;
  etat: "debloquee" | "disponible" | "verrouillee";
  onTap: () => void;
}) {
  const isDebloquee = etat === "debloquee";
  const isVerrouillee = etat === "verrouillee";

  const baseStyle = {
    position: "relative" as const,
    aspectRatio: "1/1",
    border: "1px solid var(--brass-500)",
    cursor: "pointer",
    padding: 0,
    overflow: "hidden" as const,
    background: "var(--paper-300)",
  };

  const styleByState = isVerrouillee
    ? {
        ...baseStyle,
        borderStyle: "dashed" as const,
        borderColor: "var(--paper-500)",
      }
    : baseStyle;

  return (
    <button
      type="button"
      onClick={onTap}
      style={styleByState}
      title={comp.nom}
    >
      <img
        src={visuelCompetence(comp)}
        alt=""
        loading="lazy"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: isVerrouillee ? "grayscale(1)" : undefined,
          opacity: isVerrouillee ? 0.55 : 1,
        }}
      />
      {isDebloquee && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            boxShadow:
              "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)",
          }}
        />
      )}
      {isDebloquee && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 3,
            right: 3,
            width: 16,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--forest-800)",
            color: "var(--brass-300)",
            fontFamily: "var(--font-display)",
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          ✓
        </span>
      )}
      {comp.niveauBrocanteurRequis > 0 && (
        <span
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "2px 0",
            textAlign: "center",
            background: "color-mix(in srgb, var(--paper-100) 82%, transparent)",
            color: isVerrouillee ? "var(--ink-500)" : "var(--forest-800)",
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          N{comp.niveauBrocanteurRequis}
        </span>
      )}
    </button>
  );
}
```

Notes d'implémentation :
- Le chiffre `comp.palierNumero` disparaît — c'est l'objet de la feature.
- Le liseré laiton « débloquée » passe dans un `span` overlay : un `boxShadow` inset sur le bouton serait peint **sous** l'image enfant.
- `alt=""` : le bouton porte déjà `title={comp.nom}`, l'image est décorative.

- [ ] **Step 3: Vérifier lint + suite de tests**

Run: `npm run lint && npx vitest run`
Expected: lint OK, tous les tests passent (aucun test existant ne cible le chiffre des tuiles).

- [ ] **Step 4: Commit**

```bash
git add src/app/bibliotheque/page.tsx
git commit -m "feat(competences): visuels plein cadre dans les tuiles de l'arbre (grisés si verrouillés)"
```

---

### Task 3: Visuel en grand dans la sheet de détail (`PalierDetail`) + cadre overlay

**Files:**
- Create: `public/competences/frame.svg` (copie de `scripts/competences-frame.svg`)
- Modify: `src/app/bibliotheque/page.tsx:411+` (fonction `PalierDetail`)
- Test: `src/data/competencesVisuels.test.ts`

**Interfaces:**
- Consumes: `visuelCompetence(comp)` de la Task 1 (import déjà ajouté en Task 2).
- Produces: `public/competences/frame.svg`, référencé en dur par `PalierDetail`.

- [ ] **Step 1: Écrire le test qui échoue (existence du cadre)**

Ajouter dans le `describe("assets public/competences")` de `src/data/competencesVisuels.test.ts` :

```ts
it("le cadre overlay frame.svg existe", () => {
  expect(
    fs.existsSync(
      path.join(process.cwd(), "public", "competences", "frame.svg"),
    ),
  ).toBe(true);
});
```

- [ ] **Step 2: Vérifier qu'il échoue**

Run: `npx vitest run src/data/competencesVisuels.test.ts`
Expected: FAIL — `frame.svg` absent de `public/competences/`.

- [ ] **Step 3: Copier le cadre**

```bash
cp scripts/competences-frame.svg public/competences/frame.svg
```

(Copie, pas déplacement : `scripts/` reste la source de vérité du pipeline de génération.)

- [ ] **Step 4: Vérifier que le test passe**

Run: `npx vitest run src/data/competencesVisuels.test.ts`
Expected: PASS.

- [ ] **Step 5: Ajouter l'image encadrée dans `PalierDetail`**

Dans le JSX de `PalierDetail`, insérer le bloc image **entre** l'eyebrow de branche (`{branche && (...)}`) et le paragraphe de description (`<p ...>{comp.description}</p>`) :

```tsx
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1/1",
          background: "var(--paper-300)",
        }}
      >
        <img
          src={visuelCompetence(comp)}
          alt={comp.nom}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: isVerrouillee ? "grayscale(1)" : undefined,
            opacity: isVerrouillee ? 0.6 : 1,
          }}
        />
        <img
          src="/competences/frame.svg"
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      </div>
```

`isVerrouillee` existe déjà dans `PalierDetail` (ligne 429). Aucun autre changement dans la fonction.

- [ ] **Step 6: Vérifier lint + suite complète**

Run: `npm run lint && npx vitest run`
Expected: tout passe.

- [ ] **Step 7: Commit**

```bash
git add public/competences/frame.svg src/app/bibliotheque/page.tsx src/data/competencesVisuels.test.ts
git commit -m "feat(competences): visuel en grand + cadre art déco dans la sheet de détail"
```

---

### Task 4: Vérification visuelle de bout en bout

**Files:** aucun (vérification).

**Interfaces:**
- Consumes: l'app complète (Tasks 1-3).
- Produces: confirmation visuelle avant de clore le chantier.

- [ ] **Step 1: Lancer l'app et vérifier l'écran Compétences**

Run: `npm run dev` puis ouvrir `http://localhost:3000/bibliotheque` (partie en cours requise — passer par l'accueil sinon).

Vérifier :
- les tuiles de l'arbre Général montrent les lithos (plus de chiffres 1/2/3) ;
- basculer sur un arbre de catégorie via le `TreePicker` : visuels `theme.*` affichés ;
- une compétence verrouillée est grisée (et son N12 lisible en bas de tuile) ;
- une compétence débloquée garde son ✓ et son liseré laiton ;
- taper une tuile : la sheet montre l'image en grand avec le cadre Art déco ;
- la sheet d'une compétence verrouillée est grisée aussi.

- [ ] **Step 2: Marquer le chantier terminé**

Mettre à jour la mémoire projet (visuels-competences : intégration UI faite).
