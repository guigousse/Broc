# Grec (el) + sélecteur de langue en menu déroulant — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter le grec comme 4ᵉ langue jouable (parité complète EN/ES) et remplacer les boutons de langue des réglages par un `<select>` natif stylé.

**Architecture:** Le français est canonique ; chaque langue est un overlay (dictionnaire UI + 10 domaines de contenu) résolu à l'affichage avec repli FR. On crée d'abord les fichiers grecs (autonomes, testables domaine par domaine), puis on « bascule » le type `Locale` et tous les branchements en un seul commit compilable, enfin on refait le sélecteur.

**Tech Stack:** Next.js (export statique), React, TypeScript strict, vitest (+jsdom, @testing-library/react), CSS inline `CSSProperties`.

## Global Constraints

- **Règle d'or i18n : jamais de chaîne localisée écrite en sauvegarde** — uniquement des lookups par id stable à l'affichage.
- Le français de `src/data/` et `src/lib/` est la source canonique ; EN sert de référence croisée.
- Typographie grecque : guillemets « » (mêmes chevrons qu'en français), registre chaleureux de brocante, noms propres français fictifs conservés tels quels (comme en EN : « Madame de Saint-Marceaux » reste inchangé).
- Respecter les renommages « droits d'auteur » : traduire les noms d'objets depuis le FR actuel du repo, ne jamais réintroduire de marque réelle.
- `npm run lint` est cassé (Next 16) → utiliser `npx eslint src`.
- Chaque commit compile : `npx tsc --noEmit` vert avant chaque commit.
- Les fichiers grecs reproduisent EXACTEMENT les exports, clés et `satisfies` de leurs homologues `en/` (seules les valeurs changent).

---

### Task 1: Contenu grec — objets + brocantes

**Files:**
- Create: `src/lib/i18n/contenu/el/objets.ts`
- Create: `src/lib/i18n/contenu/el/brocantes.ts`
- Modify: `src/lib/i18n/contenu/objets.test.ts`
- Modify: `src/lib/i18n/contenu/brocantes.test.ts`

**Interfaces:**
- Consumes: `ALL_TEMPLATES` (`@/data/objetTemplates`, noms FR canoniques), `en/objets.ts` et `en/brocantes.ts` (mêmes clés/exports, valeurs EN en référence).
- Produces: `OBJETS_EL: Record<string, string>` (clé = `templateId`), `BROCANTES_EL: Record<string, { nom: string; description: string }>` (clé = id de brocante) — noms identiques aux exports EN avec suffixe `_EL`, consommés par la Task 6.

- [ ] **Step 1: Écrire `el/objets.ts`** — copier la structure de `en/objets.ts` (mêmes clés, même `satisfies` s'il y en a un, même commentaire d'en-tête adapté « Overlay EL »), traduire chaque nom d'objet en grec depuis le nom FR du template (`src/data/objetTemplates.ts`). Registre : noms d'objets de brocante naturels en grec, ex. `"Φωνόγραφος με χωνί"` pour « Phonographe à pavillon ». Export : `export const OBJETS_EL = { ... }`.

- [ ] **Step 2: Écrire `el/brocantes.ts`** — même structure que `en/brocantes.ts` (`export const BROCANTES_EL`), nom + description traduits du FR.

- [ ] **Step 3: Brancher les tests de parité** — dans `objets.test.ts`, ajouter l'import et la ligne EL au `describe.each` :

```ts
import { OBJETS_EL } from "@/lib/i18n/contenu/el/objets";
// ...
describe.each([
  ["EN", OBJETS_EN],
  ["ES", OBJETS_ES],
  ["EL", OBJETS_EL],
] as const)("overlay objets %s", (_, overlay) => {
```

Faire l'équivalent dans `brocantes.test.ts` (même motif `describe.each`, import `BROCANTES_EL`).

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/lib/i18n/contenu/objets.test.ts src/lib/i18n/contenu/brocantes.test.ts && npx tsc --noEmit`
Expected: PASS — complétude (aucun `manquants`), aucune entrée orpheline, aucun nom vide.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/contenu/el/ src/lib/i18n/contenu/objets.test.ts src/lib/i18n/contenu/brocantes.test.ts
git commit -m "feat(i18n): overlay grec objets + brocantes"
```

---

### Task 2: Contenu grec — personnages + dialogues

**Files:**
- Create: `src/lib/i18n/contenu/el/personnages.ts`
- Create: `src/lib/i18n/contenu/el/dialogues.ts`
- Modify: `src/lib/i18n/contenu/personnages.test.ts`
- Modify: `src/lib/i18n/contenu/dialogues.test.ts`

**Interfaces:**
- Consumes: `en/personnages.ts` (type `OverlayPersonnages` exporté là-bas : `personnages`, `archetypesClient`, `archetypesVendeur`, `vendeurs`, `expediteurs`, `vendeurInconnu`), `en/dialogues.ts` (Record<idSéquence, string[]>), sources FR : `src/lib/personas.ts`, `src/data/expediteursCourrier.ts`, `src/data/dialogues.ts`.
- Produces: `PERSONNAGES_EL: OverlayPersonnages` (typé `OverlayPersonnages` importé de `../en/personnages`), `DIALOGUES_EL: Record<string, string[]>`.

- [ ] **Step 1: Écrire `el/personnages.ts`** — structure identique à `en/personnages.ts`, typée avec le même `OverlayPersonnages`. Noms propres français conservés, surnoms/ambiances/personnalités/signatures traduits. `vendeurInconnu: "Ένας πωλητής"`.

- [ ] **Step 2: Écrire `el/dialogues.ts`** — mêmes ids de séquence que `en/dialogues.ts`, **même nombre de lignes par séquence que le FR** (contrainte dure : `lignesDialogue` ignore une séquence dont la longueur diverge — reproduire ligne à ligne).

- [ ] **Step 3: Brancher les tests** — ajouter la ligne `["EL", …]` aux `describe.each` de `personnages.test.ts` et `dialogues.test.ts` (mêmes imports/motifs que Task 1 Step 3).

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/lib/i18n/contenu/personnages.test.ts src/lib/i18n/contenu/dialogues.test.ts && npx tsc --noEmit`
Expected: PASS (complétude, longueurs de séquences identiques au FR).

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/contenu/el/personnages.ts src/lib/i18n/contenu/el/dialogues.ts src/lib/i18n/contenu/personnages.test.ts src/lib/i18n/contenu/dialogues.test.ts
git commit -m "feat(i18n): overlay grec personnages + dialogues"
```

---

### Task 3: Contenu grec — courrier + gabarits de quêtes + négociation

**Files:**
- Create: `src/lib/i18n/contenu/el/courrier.ts`
- Create: `src/lib/i18n/contenu/el/quetesGabarits.ts`
- Create: `src/lib/i18n/contenu/el/nego.ts`
- Modify: `src/lib/i18n/contenu/courrier.test.ts`
- Modify: `src/lib/i18n/contenu/quetesGabarits.test.ts`
- Modify: `src/lib/i18n/contenu/nego.test.ts`

**Interfaces:**
- Consumes: `en/courrier.ts` (Record<idCourrier, {titre, corps: string[]}>), `en/quetesGabarits.ts` (Record<`clé#index`, {titre, corps}> avec placeholders `{objets}`/`{etat}`), `en/nego.ts` (Record<CleMessageNego, string[]> avec placeholders `{x}` de `tr()`), sources FR : `src/lib/quetes/textes.ts`, `POOLS_NEGO_FR` (`src/lib/negociation`).
- Produces: `COURRIER_EL`, `QUETES_GABARITS_EL`, `NEGO_EL` — mêmes formes que leurs homologues EN.

- [ ] **Step 1: Écrire `el/courrier.ts`** — mêmes ids, même nombre de paragraphes dans `corps` que le FR, ton épistolaire traduit.

- [ ] **Step 2: Écrire `el/quetesGabarits.ts`** — mêmes clés `clé#index` que EN ; **conserver les placeholders `{objets}` et `{etat}` tels quels** dans les textes grecs.

- [ ] **Step 3: Écrire `el/nego.ts`** — mêmes clés `CleMessageNego` que EN ; les pools peuvent avoir un nombre de variantes différent du FR (le modulo l'absorbe) mais viser le même nombre que EN ; **conserver tous les placeholders `{…}`**.

- [ ] **Step 4: Brancher les tests** — ligne `["EL", …]` dans les `describe.each` des trois fichiers de test (les tests vérifient notamment la parité des placeholders).

- [ ] **Step 5: Vérifier**

Run: `npx vitest run src/lib/i18n/contenu/courrier.test.ts src/lib/i18n/contenu/quetesGabarits.test.ts src/lib/i18n/contenu/nego.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n/contenu/el/courrier.ts src/lib/i18n/contenu/el/quetesGabarits.ts src/lib/i18n/contenu/el/nego.ts src/lib/i18n/contenu/courrier.test.ts src/lib/i18n/contenu/quetesGabarits.test.ts src/lib/i18n/contenu/nego.test.ts
git commit -m "feat(i18n): overlay grec courrier + gabarits quêtes + négo"
```

---

### Task 4: Contenu grec — compétences + déblocages + divers

**Files:**
- Create: `src/lib/i18n/contenu/el/competences.ts`
- Create: `src/lib/i18n/contenu/el/deblocages.ts`
- Create: `src/lib/i18n/contenu/el/divers.ts`
- Modify: `src/lib/i18n/contenu/competences.test.ts`
- Modify: `src/lib/i18n/contenu/deblocages.test.ts`
- Modify: `src/lib/i18n/contenu/divers.test.ts`

**Interfaces:**
- Consumes: `en/competences.ts` (type `OverlayCompetences` de `contenu/index.ts` : `arbres`/`branches`/`paliers`), `en/deblocages.ts` (deux exports : `DEBLOCAGES_EN` et `DEBLOCAGES_DESC_EN`, clé = titre FR canonique), `en/divers.ts` (`camions`/`stockage`/`celebrites`).
- Produces: `COMPETENCES_EL: OverlayCompetences`, `DEBLOCAGES_EL` + `DEBLOCAGES_DESC_EL`, `DIVERS_EL` (même `satisfies` que `DIVERS_EN`).

- [ ] **Step 1: Écrire les trois fichiers** — structures identiques aux homologues EN. Attention `deblocages`/`celebrites` : les **clés sont les chaînes FR canoniques** (elles ne se traduisent pas), seules les valeurs passent en grec. Branches de compétences : clés composées `treeId/brancheId`, `description` absente là où le FR n'en a pas.

- [ ] **Step 2: Brancher les tests** — ligne `["EL", …]` dans les `describe.each` des trois fichiers de test.

- [ ] **Step 3: Vérifier**

Run: `npx vitest run src/lib/i18n/contenu/competences.test.ts src/lib/i18n/contenu/deblocages.test.ts src/lib/i18n/contenu/divers.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/contenu/el/competences.ts src/lib/i18n/contenu/el/deblocages.ts src/lib/i18n/contenu/el/divers.ts src/lib/i18n/contenu/competences.test.ts src/lib/i18n/contenu/deblocages.test.ts src/lib/i18n/contenu/divers.test.ts
git commit -m "feat(i18n): overlay grec compétences + déblocages + divers"
```

---

### Task 5: Dictionnaire UI grec

**Files:**
- Create: `src/lib/i18n/ui/el.ts`
- Modify: `src/lib/i18n/ui/ui.test.ts`

**Interfaces:**
- Consumes: `ui/fr.ts` (source canonique, ~680 lignes), type `DictionnaireUI` (`./index`).
- Produces: `export const el: DictionnaireUI = { ... }` — même motif que `en.ts` (`import type { DictionnaireUI } from "./index";`).

- [ ] **Step 1: Écrire `ui/el.ts`** — traduire TOUTES les clés de `fr.ts` (le typage `DictionnaireUI` refuse toute clé manquante). **Conserver chaque placeholder `{x}` à l'identique** (le test de parité des jetons échoue sinon). Exemples de registre : `menu.nouvellePartie: "Νέα παρτίδα"`, `commun.fermer: "Κλείσιμο"`, `menu.reglages: "Ρυθμίσεις"`.

- [ ] **Step 2: Étendre `ui.test.ts`** — sans toucher à `DICTIONNAIRES` (branché en Task 6) :

```ts
import { el } from "@/lib/i18n/ui/el";
// dans le test « les trois locales existent et divergent réellement » :
expect(el.menu.nouvellePartie).toBe("Νέα παρτίδα");
// dans le test de parité des placeholders :
compare(DICTIONNAIRES.fr, el, "el", "");
```

- [ ] **Step 3: Vérifier**

Run: `npx vitest run src/lib/i18n/ui/ui.test.ts && npx tsc --noEmit`
Expected: PASS — parité des jetons `{x}` incluse pour `el`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/ui/el.ts src/lib/i18n/ui/ui.test.ts
git commit -m "feat(i18n): dictionnaire UI grec"
```

---

### Task 6: Bascule — `Locale` = fr/en/es/el + `LocaleTraduite` + branchements

**Files:**
- Modify: `src/lib/i18n/locales.ts`
- Modify: `src/lib/i18n/locales.test.ts`
- Modify: `src/lib/i18n/ui/index.ts`
- Modify: `src/lib/i18n/contenu/index.ts`

**Interfaces:**
- Consumes: tous les exports `_EL` des Tasks 1-5.
- Produces: `type Locale = "fr" | "en" | "es" | "el"`, `export type LocaleTraduite = Exclude<Locale, "fr">`, `DICTIONNAIRES.el`, tous les overlays de `contenu/index.ts` complétés — consommés par la Task 7 et tout le jeu.

- [ ] **Step 1: Tests d'abord — étendre `locales.test.ts`** :

```ts
it("expose exactement fr/en/es/el", () => {
  expect([...LOCALES]).toEqual(["fr", "en", "es", "el"]);
});
// dans « sans préférence : langue du navigateur … » :
vi.stubGlobal("navigator", { language: "el-GR" });
expect(detecterLocale()).toBe("el");
// nouveau cas de persistance :
it("persisterLocale('el') relu par detecterLocale", () => {
  vi.stubGlobal("navigator", { language: "fr-FR" });
  persisterLocale("el");
  expect(detecterLocale()).toBe("el");
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/i18n/locales.test.ts`
Expected: FAIL (« expose exactement » et détection `el-GR`).

- [ ] **Step 3: `locales.ts`** :

```ts
export type Locale = "fr" | "en" | "es" | "el";
/** Langues overlay (tout sauf le FR canonique) — à étendre = 1 seule ligne ici. */
export type LocaleTraduite = Exclude<Locale, "fr">;
export const LOCALES: readonly Locale[] = ["fr", "en", "es", "el"];
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  el: "Ελληνικά",
};
function estLocale(v: unknown): v is Locale {
  return v === "fr" || v === "en" || v === "es" || v === "el";
}
// detecterLocale : ajouter avant le return "en" final
if (nav.startsWith("el")) return "el";
```

- [ ] **Step 4: `ui/index.ts`** — `import { el } from "./el";` puis `DICTIONNAIRES: Record<Locale, DictionnaireUI> = { fr, en, es, el }`.

- [ ] **Step 5: `contenu/index.ts`** — trois changements systématiques :
  1. `import type { Locale, LocaleTraduite } from "@/lib/i18n/locales";` puis remplacer **toutes** les occurrences du type `"en" | "es"` (≈15 : records d'overlay, `MISE_EN_FORME_GABARIT`, paramètres `locale` de `resoudreGabaritCore`/`resoudreGabarit` et des lambdas) par `LocaleTraduite`.
  2. Importer chaque export `_EL` et ajouter l'entrée `el:` dans : `OBJETS`, `BROCANTES_OVERLAY`, `COMPETENCES_OVERLAY`, `DEBLOCAGES_OVERLAY`, `DEBLOCAGES_DESC_OVERLAY`, `PERSONNAGES_OVERLAY`, `DIVERS_OVERLAY`, `DIALOGUES_OVERLAY`, `COURRIER_OVERLAY`, `QUETES_GABARITS_OVERLAY`, `POOLS_NEGO` (le compilateur signale chaque record incomplet — c'est le but de `LocaleTraduite`).
  3. `MISE_EN_FORME_GABARIT.el` (guillemets grecs = chevrons, état traduit) :

```ts
el: {
  objets: (cibles, locale) =>
    cibles.map((c) => `« ${nomTemplate(c.templateId, locale)} »`).join(", "),
  etat: (etatMin, locale) =>
    etatMin ? ` (ελάχ. κατάσταση: ${libelleEtat(etatMin, DICTIONNAIRES[locale])})` : "",
},
```

- [ ] **Step 6: Suite complète**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tout vert — les tests transverses (libelles, libelleLedger, LangueContext, basculeObjets…) itèrent sur `LOCALES`/`DICTIONNAIRES` et couvrent `el` d'office ; corriger toute énumération en dur qui casserait.

- [ ] **Step 7: Lint + commit**

```bash
npx eslint src
git add -A src/lib/i18n
git commit -m "feat(i18n): le grec devient jouable — Locale el + LocaleTraduite"
```

---

### Task 7: Sélecteur de langue en `<select>` natif stylé

**Files:**
- Modify: `src/components/mobile/ReglagesModal.tsx` (section langue ~l. 266-283 + styles)
- Create: `src/components/mobile/ReglagesModal.test.tsx`

**Interfaces:**
- Consumes: `LOCALES`, `LOCALE_LABELS`, `type Locale` (`@/lib/i18n/locales`), `useLangue()` (`locale`, `setLocale`, `d`), `useSettings().playClick`.
- Produces: rien de nouveau pour les autres tâches (UI feuille).

- [ ] **Step 1: Test d'abord — `ReglagesModal.test.tsx`** :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import { ReglagesModal } from "./ReglagesModal";

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    audioPrefs: { volume: 1, musique: true, effets: true, ambiance: true },
    setAudioPref: vi.fn(),
    setVolume: vi.fn(),
    playClick: vi.fn(),
    tailleFonte: "normal",
    setTailleFonte: vi.fn(),
  }),
}));
vi.mock("@/lib/notifications", () => ({
  demanderPermission: vi.fn(),
  notificationsDisponibles: () => false,
  permissionAccordee: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/notifications/prefs", () => ({
  notifsActives: () => false,
  setNotifsActives: vi.fn(),
}));

describe("ReglagesModal — sélecteur de langue", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("propose les 4 langues dans un menu déroulant (autonymes)", () => {
    render(
      <LangueProvider>
        <ReglagesModal open onClose={() => {}} />
      </LangueProvider>,
    );
    const select = screen.getByRole("combobox", { name: "Langue" });
    const options = [...select.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toEqual(["Français", "English", "Español", "Ελληνικά"]);
  });

  it("changer la valeur bascule la langue de l'UI", () => {
    render(
      <LangueProvider>
        <ReglagesModal open onClose={() => {}} />
      </LangueProvider>,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Langue" }), {
      target: { value: "el" },
    });
    expect(screen.getByRole("combobox", { name: "Ρυθμίσεις γλώσσας" })).toBeTruthy();
  });
});
```

Note : `"Langue"` / l'aria-label grec = valeur de `d.reglages.langue` — vérifier la chaîne réelle dans `ui/fr.ts` et `ui/el.ts` et ajuster le test à ces valeurs exactes.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/ReglagesModal.test.tsx`
Expected: FAIL — `getByRole("combobox")` ne trouve rien (boutons actuels).

- [ ] **Step 3: Implémenter** — dans `ReglagesModal.tsx`, remplacer le bloc `{LOCALES.map((l) => (<button …` (l. 268-282) par :

```tsx
<div style={selectWrap}>
  <select
    value={locale}
    onChange={(e) => {
      playClick();
      setLocale(e.target.value as Locale);
    }}
    aria-label={d.reglages.langue}
    style={selectLangue}
  >
    {LOCALES.map((l) => (
      <option key={l} value={l}>
        {LOCALE_LABELS[l]}
      </option>
    ))}
  </select>
  <span aria-hidden style={chevron}>▾</span>
</div>
```

Ajouter `type Locale` à l'import de `@/lib/i18n/locales`, et les styles à côté de `segBtn` :

```tsx
const selectWrap: CSSProperties = { position: "relative" };

const selectLangue: CSSProperties = {
  width: "100%",
  padding: "10px 36px 10px 12px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  borderRadius: 6,
  background: "var(--paper-100)",
  color: "var(--ink-700)",
  appearance: "none",
  WebkitAppearance: "none",
  cursor: "pointer",
};

const chevron: CSSProperties = {
  position: "absolute",
  right: 12,
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
  color: "var(--ink-700)",
  fontSize: 10,
};
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/components/mobile/ReglagesModal.test.tsx && npx tsc --noEmit && npx eslint src/components/mobile/ReglagesModal.tsx`
Expected: PASS.

- [ ] **Step 5: Suite complète puis commit**

```bash
npx vitest run
git add src/components/mobile/ReglagesModal.tsx src/components/mobile/ReglagesModal.test.tsx
git commit -m "feat(reglages): sélecteur de langue en menu déroulant natif"
```
