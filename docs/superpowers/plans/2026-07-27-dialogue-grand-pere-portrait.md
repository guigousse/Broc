# Dialogues du grand-père : bulle pleine largeur + portrait détouré — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dans `DialogueOverlay`, remplacer le médaillon circulaire de 84 px du grand-père par son illustration détourée en grand, posée sur un bandeau-nom en laiton, la bulle de dialogue prenant toute la largeur de l'écran moins une marge périphérique de 12 px.

**Architecture:** La rangée `flex` actuelle (portrait à gauche, carte à droite) devient une **colonne** : portrait détouré calé à gauche, puis carte pleine largeur composée d'un bandeau-nom laiton et d'un corps parchemin. Le style du bandeau, aujourd'hui `const` locale de `ChineNegoDrawer`, est d'abord extrait dans une brique partagée pour que les deux écrans ne divergent pas.

**Tech Stack:** Next.js 16 / React 19, styles en objets `CSSProperties` inline (convention du projet — aucun CSS module ni Tailwind ici), Vitest + Testing Library + jsdom.

**Spec :** `docs/superpowers/specs/2026-07-27-dialogue-grand-pere-portrait-design.md`

## Global Constraints

- **Branche :** partir de `main` (vérifié : `fix/pre-appstore` y est fusionnée en `d03f4b9`, et les deux fichiers touchés y sont identiques à `feat/pipeline-reels`). Ne pas travailler sur `feat/pipeline-reels`, qui porte des modifications en cours sans rapport.
- **Aucun changement d'API :** les props de `DialogueOverlay` (`sequence`, `nom`, `portraits`, `onFini`) ne bougent pas. Les trois appelants — `src/app/(qg)/layout.tsx:915`, `src/app/chiner/[brocanteId]/ClientPage.tsx:584`, `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx:1210` — ne sont pas modifiés.
- **Aucun changement de rendu côté chinage.** La tâche 1 est une extraction pure : `ChineNegoDrawer` doit produire exactement le même bandeau qu'avant.
- **Aucune donnée sauvegardée touchée** : pas de migration, pas de nouvelle clé de save.
- **Filet complet avant de conclure :** `npm run test:run` puis `npx eslint src`. **Ne pas utiliser `npm run lint`**, cassé sous Next 16 (voir mémoire projet).
- **Styles inline uniquement**, en `const ... : CSSProperties` en bas de fichier, comme le reste de `src/components/mobile/`.

## File Structure

| Fichier | Rôle |
|---|---|
| `src/components/ui/namePlate.ts` (créé) | Fonction `namePlateStyle(radius)` — le bandeau-nom laiton, partagé. Le répertoire `src/components/ui/` rassemble déjà les briques visuelles communes (`BrassCorners`, `Panel`, `DecoDivider`…). |
| `src/components/ui/namePlate.test.ts` (créé) | Vérifie que le rayon est paramétrable et que les marqueurs visuels du bandeau sont présents. |
| `src/components/mobile/chine/ChineNegoDrawer.tsx` (modifié) | Consomme `namePlateStyle("12px 12px 0 0")` au lieu de sa `const namePlate` locale. |
| `src/components/mobile/dialogue/DialogueOverlay.tsx` (modifié) | La refonte : colonne, portrait détouré, carte pleine largeur avec bandeau. |
| `src/components/mobile/dialogue/DialogueOverlay.test.tsx` (modifié) | Deux tests de non-régression ajoutés autour du comportement que la refonte met à nu. |

---

## Note sur la discipline de test de ce plan

Ce chantier est un **refactor visuel**, pas un ajout de comportement. Les deux tests ajoutés en tâche 2 **passent déjà avant** la refonte : le portrait suit l'humeur (`portraits[ligne.humeur]`) et le nom est rendu (`nomStyle`) dans le code actuel. Il serait malhonnête de les présenter comme des tests TDD « rouge d'abord ».

La discipline correcte pour un refactor est l'inverse et elle est **imposée par les étapes ci-dessous** : on écrit les tests, on les fait **passer sur le code actuel** — c'est la preuve qu'ils capturent bien le comportement existant — puis on refactorise, puis on vérifie qu'ils passent toujours. Un test qui échouerait à l'étape « avant » serait un test faux, à corriger avant de toucher au composant.

La mise en page elle-même (position `flex`, `clamp`, `overflow`) n'est pas assertable utilement en jsdom : elle relève de la recette device, tâche 3.

---

### Task 1 : Extraire le bandeau-nom en brique partagée

**Files:**
- Create: `src/components/ui/namePlate.ts`
- Create: `src/components/ui/namePlate.test.ts`
- Modify: `src/components/mobile/chine/ChineNegoDrawer.tsx` (import en tête ; `const namePlate` lignes 285-301)

**Interfaces:**
- Consumes: rien (première tâche).
- Produces: `namePlateStyle(radius: string): CSSProperties` exporté depuis `@/components/ui/namePlate`. La tâche 2 l'appelle avec `"0"`.

- [ ] **Step 1: Écrire le test du module partagé**

Créer `src/components/ui/namePlate.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { namePlateStyle } from "./namePlate";

describe("namePlateStyle", () => {
  it("applique le rayon demandé", () => {
    expect(namePlateStyle("12px 12px 0 0").borderRadius).toBe("12px 12px 0 0");
    expect(namePlateStyle("0").borderRadius).toBe("0");
  });

  it("porte le dégradé laiton et les capitales espacées", () => {
    const style = namePlateStyle("0");
    expect(style.background).toContain("var(--brass-500)");
    expect(style.borderBottom).toBe("2px solid var(--brass-700)");
    expect(style.textTransform).toBe("uppercase");
    expect(style.letterSpacing).toBe("0.18em");
    expect(style.fontFamily).toBe("var(--font-display)");
  });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/components/ui/namePlate.test.ts`
Expected: FAIL — `Failed to resolve import "./namePlate"` (le module n'existe pas encore).

- [ ] **Step 3: Créer le module**

Créer `src/components/ui/namePlate.ts`. Les valeurs sont copiées **à l'identique** de `ChineNegoDrawer.tsx:285-301` — seul `borderRadius` devient paramétrable :

```ts
import type { CSSProperties } from "react";

/**
 * Bandeau nom en laiton, coins hauts arrondis — l'identité visuelle commune
 * aux personnages qui parlent : vendeur du tiroir de chinage, grand-père des
 * dialogues de trame.
 *
 * `radius` : valeur CSS de `border-radius`. Le tiroir de chinage passe
 * "12px 12px 0 0" ; le dialogue passe "0" car sa carte, en `overflow: hidden`,
 * rogne déjà le bandeau à son propre rayon.
 */
export function namePlateStyle(radius: string): CSSProperties {
  return {
    padding: "9px 16px",
    background:
      "linear-gradient(180deg, var(--brass-300) 0%, var(--brass-500) 50%, var(--brass-300) 100%)",
    borderBottom: "2px solid var(--brass-700)",
    boxShadow:
      "inset 0 0 0 2px rgba(255,243,213,0.5), inset 0 -3px 0 0 rgba(0,0,0,0.06)",
    borderRadius: radius,
    textAlign: "center",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "var(--forest-800)",
    textShadow: "0 1px 0 rgba(255,243,213,0.6)",
  };
}
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx vitest run src/components/ui/namePlate.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Migrer ChineNegoDrawer**

Dans `src/components/mobile/chine/ChineNegoDrawer.tsx`, ajouter l'import après celui de `HumeurGauge` (ligne 5) :

```ts
import { namePlateStyle } from "@/components/ui/namePlate";
```

Puis **supprimer entièrement** le bloc `const namePlate: CSSProperties = { ... };` (lignes 285-301, précédé de son commentaire `/** Bandeau nom pleine largeur, coins hauts arrondis (ancienne fiche). */`) et le remplacer par :

```ts
/** Bandeau nom pleine largeur, coins hauts arrondis (ancienne fiche). */
const namePlate = namePlateStyle("12px 12px 0 0");
```

Le site d'usage en JSX (`<div style={namePlate}>`, ligne 143) **ne change pas**.

- [ ] **Step 6: Vérifier qu'aucune régression n'est introduite côté chinage**

Run: `npx vitest run src/components/mobile/chine/ src/components/ui/namePlate.test.ts`
Expected: PASS — l'ensemble des tests de `ChineNegoDrawer.test.tsx` et `ChineSlide.test.tsx` reste vert.

Puis : `npx eslint src/components/ui/namePlate.ts src/components/mobile/chine/ChineNegoDrawer.tsx`
Expected: aucune sortie.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/namePlate.ts src/components/ui/namePlate.test.ts src/components/mobile/chine/ChineNegoDrawer.tsx
git commit -m "refactor(ui): extraire le bandeau nom laiton en brique partagée"
```

---

### Task 2 : Refondre DialogueOverlay

**Files:**
- Modify: `src/components/mobile/dialogue/DialogueOverlay.tsx` (styles lignes 35-86, JSX lignes 116-126)
- Modify: `src/components/mobile/dialogue/DialogueOverlay.test.tsx` (insertion de deux tests)

**Interfaces:**
- Consumes: `namePlateStyle(radius: string): CSSProperties` depuis `@/components/ui/namePlate` (tâche 1).
- Produces: rien de nouveau — l'export `DialogueOverlay` et ses props sont inchangés.

- [ ] **Step 1: Écrire les deux tests de non-régression**

Dans `src/components/mobile/dialogue/DialogueOverlay.test.tsx`, insérer ces deux tests **juste après** le test « affiche la première ligne, avance au tap, appelle onFini après la dernière » et **avant** le test « le bouton d'avancement porte l'accname localisé ».

Cet ordre est important : le test d'accname positionne `localStorage` sur `en` puis appelle `localStorage.clear()`. En insérant avant, les nouveaux tests tournent en français par défaut et `/continuer/i` fonctionne, comme dans le test qui les précède.

**Piège à traiter d'abord.** `vitest.config.ts` n'active pas `globals`, donc `afterEach` n'existe pas en global et **l'auto-cleanup de Testing Library ne s'enregistre jamais** — c'est la raison du `cleanup()` manuel en fin du 3ᵉ test existant. Sans correction, le DOM du test précédent subsiste : les nouveaux tests interrogent `document.body` (le composant se rend par portail) et trouveraient l'overlay résiduel, faisant échouer `getByRole("button", …)` sur « found multiple elements ».

Corriger à la source plutôt que test par test. Élargir l'import de vitest en tête de fichier :

```tsx
import { afterEach, describe, expect, it, vi } from "vitest";
```

et ajouter cette ligne comme **première instruction** dans `describe("DialogueOverlay", …)`, avant le premier `it` :

```tsx
  afterEach(cleanup);
```

`cleanup` est déjà importé depuis `@testing-library/react` en tête du fichier. Le `cleanup()` manuel du 3ᵉ test devient redondant mais reste inoffensif : le laisser, pour garder le diff resserré.

Ensuite seulement, insérer les deux tests. `seq` vaut `SEQUENCES_TUTORIEL.tuto_achat_fait` : ligne 1 en humeur `rieur`, ligne 2 en humeur `souriant`. La requête porte sur `document.body` et non sur le `container` rendu, puisque le composant passe par `createPortal(…, document.body)`.

```tsx
  it("le portrait suit l'humeur de la ligne courante", async () => {
    const user = userEvent.setup();
    render(
      <DialogueOverlay sequence={seq} nom="Grand-père" portraits={GRAND_PERE_PORTRAITS} onFini={vi.fn()} />,
    );
    const srcPortrait = () =>
      document.body.querySelector("img")?.getAttribute("src");

    expect(seq.lignes[0].humeur).toBe("rieur");
    expect(srcPortrait()).toBe(GRAND_PERE_PORTRAITS.rieur);

    await user.click(screen.getByRole("button", { name: /continuer/i }));

    expect(seq.lignes[1].humeur).toBe("souriant");
    expect(srcPortrait()).toBe(GRAND_PERE_PORTRAITS.souriant);
  });

  it("affiche le nom du PNJ dans la carte", () => {
    render(
      <DialogueOverlay sequence={seq} nom="Grand-père" portraits={GRAND_PERE_PORTRAITS} onFini={vi.fn()} />,
    );
    expect(screen.getByText("Grand-père")).toBeTruthy();
  });
```

- [ ] **Step 2: Lancer les tests SUR LE CODE ACTUEL et vérifier qu'ils PASSENT**

Run: `npx vitest run src/components/mobile/dialogue/DialogueOverlay.test.tsx`
Expected: PASS — les 5 tests.

C'est l'étape clé de ce refactor : elle prouve que les deux nouveaux tests décrivent bien le comportement **existant**, et qu'ils constituent donc un filet valide pour la refonte qui suit. **Si l'un d'eux échoue ici, corriger le test avant de toucher au composant** — ne pas le « réparer » après coup en modifiant le composant, ce qui masquerait une régression.

- [ ] **Step 3: Commit du filet**

```bash
git add src/components/mobile/dialogue/DialogueOverlay.test.tsx
git commit -m "test(dialogue): filet sur le portrait par humeur et le nom du PNJ

Ajoute afterEach(cleanup) : vitest ne tourne pas en mode globals, donc
l'auto-cleanup de Testing Library ne s'enregistrait pas et le DOM d'un
test fuyait dans le suivant — visible dès qu'on interroge document.body,
où le composant se rend par portail."
```

- [ ] **Step 4: Refondre les styles**

Dans `src/components/mobile/dialogue/DialogueOverlay.tsx`, ajouter l'import après celui de `dialogues` (ligne 5) :

```ts
import { namePlateStyle } from "@/components/ui/namePlate";
```

Le `const scrim` (lignes 20-33) **ne change pas**.

Remplacer tout le bloc allant du commentaire `/* Retour device 2026-07-17 : …` jusqu'à la fin de `const suiteStyle` (lignes 35-86) par :

```ts
/* Retour device 2026-07-17 : le portrait est un cercle SÉPARÉ de la bulle.
   Révisé 2026-07-27 : le médaillon rognait le détourage de l'illustration et
   volait ~94 px à la bulle. Le portrait devient une image détourée en grand,
   posée sur le bandeau nom — même langage que le vendeur du tiroir de chinage
   (ChineNegoDrawer) — et la bulle prend toute la largeur, marge 12px. */
const colonne: CSSProperties = {
  margin: "0 12px calc(16px + var(--safe-bottom, 0px))",
  display: "flex",
  flexDirection: "column",
};

/* Seul réglage à bouger si le personnage doit grandir ou rétrécir sur device.
   Les portraits du grand-père sont carrés (420×420) : à 190px de haut, il
   occupe 190px de large. */
const portraitStyle: CSSProperties = {
  alignSelf: "flex-start",
  marginLeft: 8,
  height: "clamp(140px, 20vh, 190px)",
  width: "auto",
  objectFit: "contain",
  display: "block",
  filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))",
};

/* overflow:hidden — le bandeau est à coins droits et se fait rogner par la
   carte : un seul rayon à maintenir. */
const carte: CSSProperties = {
  borderRadius: 14,
  overflow: "hidden",
  background: "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  border: "1px solid #b89c5e",
  boxShadow: "inset 0 0 28px rgba(120,90,40,0.18), 0 6px 16px rgba(0,0,0,0.35)",
};

const bandeau = namePlateStyle("0");

const corps: CSSProperties = {
  padding: "14px 16px 12px",
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
```

Ce bloc supprime `rangee` et `nomStyle`, qui n'ont plus d'usage.

- [ ] **Step 5: Refondre le JSX**

Toujours dans `DialogueOverlay.tsx`, remplacer le bloc `<div style={rangee}>…</div>` (lignes 116-126) par :

```tsx
      <div style={colonne}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portraits[ligne.humeur]} alt="" draggable={false} style={portraitStyle} />
        <div style={carte}>
          <div style={bandeau}>{nom}</div>
          <div style={corps}>
            <div style={texteStyle}>{texte}</div>
            <div style={suiteStyle} aria-hidden>
              {derniere ? "✦" : "▼"}
            </div>
          </div>
        </div>
      </div>
```

Le `<span>` masqué qui porte `{d.menu.continuer}` (lignes 127-138) **ne change pas**, ni le `createPortal` vers `document.body`, ni le `<button style={scrim} onClick={avancer}>` qui l'enveloppe.

- [ ] **Step 6: Vérifier que le filet tient toujours**

Run: `npx vitest run src/components/mobile/dialogue/DialogueOverlay.test.tsx`
Expected: PASS — les 5 tests, dont les 2 de l'étape 1.

Si le test du nom échoue avec « found multiple elements », c'est que `nomStyle` n'a pas été supprimé et que le nom est rendu deux fois : revenir à l'étape 4.

- [ ] **Step 7: Filet complet du dépôt**

Run: `npm run test:run`
Expected: PASS — aucune suite en échec.

Run: `npx eslint src`
Expected: aucune sortie.

- [ ] **Step 8: Commit**

```bash
git add src/components/mobile/dialogue/DialogueOverlay.tsx
git commit -m "feat(dialogue): bulle pleine largeur et portrait détouré du grand-père"
```

---

### Task 3 : Recette device

**Files:** aucun (vérification visuelle). Toute correction issue de cette tâche est un commit à part.

**Interfaces:**
- Consumes: le composant livré en tâche 2.
- Produces: rien.

Cette tâche **n'est pas exécutable par un agent** : elle demande le simulateur iOS ou l'appareil de Guillaume. La livrer, c'est présenter la liste ci-dessous à Guillaume, pas la cocher soi-même.

- [ ] **Step 1: Lancer le simulateur**

Run: `scripts/ios-sim.sh` (workflow projet — `tauri build` est cassé sur Mac Intel ; team de signature `9D78779LKL`).

- [ ] **Step 2: Point n°1 — le liseré de détourage**

Déclencher le dialogue d'accueil du tutoriel et regarder les **bords du personnage** sur le scrim sombre. Le médaillon circulaire les masquait jusqu'ici : un halo blanc résiduel dans l'alpha deviendrait visible maintenant.

Les quatre fichiers portent bien `hasAlpha: yes` (vérifié via `sips`), mais un alpha présent peut être propre **ou** border un liseré clair. Vérifier les **quatre humeurs** : `souriant`, `emu`, `songeur`, `rieur`.

Si un liseré apparaît : le correctif est une **repasse des quatre `.webp`**, pas du CSS. Ne pas tenter de le masquer avec une ombre ou un `filter`.

- [ ] **Step 3: Point n°2 — la hauteur sur écran court**

Ouvrir `tuto_accueil` et avancer jusqu'à la **ligne 2** (« Cinquante ans que je tiens cette boutique… »), la plus longue du tutoriel. La colonne est ancrée en bas : portrait + bulle de quatre lignes + `safe-bottom` remontent haut. Vérifier que le portrait n'est pas coupé en haut de l'écran.

Réglage si besoin : la borne haute du `clamp` dans `portraitStyle` (190 px).

- [ ] **Step 4: Point n°3 — les trois écrans appelants**

Le même overlay sert trois contextes de fond différents. Les parcourir tous les trois :

1. **QG** — `src/app/(qg)/layout.tsx` : dialogue d'accueil du tutoriel, et un dialogue de chapitre principal.
2. **Chinage** — `src/app/chiner/[brocanteId]/ClientPage.tsx` : `tuto_chine_entree`, par-dessus le carrousel d'objets.
3. **Vitrine** — `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` : `tuto_vente_entree`, par-dessus l'étal.

- [ ] **Step 5: Point n°4 — le bandeau en quatre langues**

Le bandeau est en capitales avec `letter-spacing: .18em`. Vérifier que le nom du grand-père tient sur une ligne en **FR / EN / ES / EL** — le grec est 40-90 % plus long que le français (contrainte projet connue).

- [ ] **Step 6: Point n°5 — non-régression du chinage**

Ouvrir un tiroir de négociation en chinage et confirmer à l'œil que le bandeau-nom du vendeur est **identique à avant** l'extraction de la tâche 1.

---

## Intégration

Une fois la recette device passée : suivre le flux d'intégration du projet — livrer jusqu'à la branche que Guillaume fait tourner, via une PR GitHub, et pas seulement jusqu'à la base historique.

Le commit de spec `334b8a7` est atterri sur `feat/pipeline-reels` ; le reprendre (`git cherry-pick 334b8a7`) sur la branche de travail créée depuis `main`.
