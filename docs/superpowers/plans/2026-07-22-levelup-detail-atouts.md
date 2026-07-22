# Level up détail atouts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre les atouts débloqués en grand format (emoji géant + titre + description) dans la carte de level up, et supprimer les pills de famille ainsi que tout le code i18n qui les portait.

**Architecture:** `LevelUpOverlay.tsx` rend les entrées `famille === "active"` comme un bloc encadré (emoji extrait du titre localisé par regex pictographique) et les autres familles en ligne titre-seulement. Les exports morts (`COULEUR_FAMILLE`, `chipFamille`, `libelleFamille`, `LIBELLE_FAMILLE`, blocs `familles` des 4 dictionnaires) sont supprimés.

**Tech Stack:** React/Next.js, styles inline, i18n maison (`titreDeblocage`/`descriptionDeblocage`), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-22-levelup-detail-atouts-design.md`

## Global Constraints

- `npm run lint` cassé (Next 16) → `npx eslint src/...`.
- Règle d'or i18n : les valeurs de save/logique ne changent jamais — on ne touche qu'à l'affichage.
- Atouts : déblocage N5→30, 2ᵉ usage N35→60, 3ᵉ usage N65→90 ; N5 = Le Flair 🔍. Les titres localisés (en/es/el) conservent l'emoji.
- ParcoursSheet : AUCUN changement (il n'affiche déjà plus de pill).
- `DictionnaireUI` est dérivé de `fr.ts` : retirer `familles` de fr impose de le retirer des 4 dictionnaires (fr/en/es/el) dans le même commit.

---

### Task 1: Grand format atout + suppression des pills dans LevelUpOverlay

**Files:**
- Modify: `src/components/mobile/LevelUpOverlay.tsx`
- Test: `src/components/mobile/LevelUpOverlay.test.tsx`

**Interfaces:**
- Consumes: `DeblocageNiveau.famille`, `titreDeblocage(dep, locale)`, `descriptionDeblocage(dep, locale)` (existants).
- Produces: plus AUCUN export de style famille — `COULEUR_FAMILLE` et `chipFamille` disparaissent (Task 2 supprime leurs sources i18n). Le composant exporte uniquement `LevelUpOverlay`.

- [ ] **Step 1: Écrire les tests (failing)**

Dans `src/components/mobile/LevelUpOverlay.test.tsx`, remplacer le test « niveau en attente : titre… » (qui vérifie la ligne N1) n'est PAS nécessaire — il reste vert. Ajouter à la fin du `describe` :

```tsx
  it("atout débloqué (N5, Le Flair) : bloc grand format avec emoji géant et description", () => {
    mockState = etat(4, 5);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    // Titre sans l'emoji inline (l'emoji est extrait dans son propre bloc).
    expect(screen.getByText("Atout Le Flair")).toBeTruthy();
    expect(screen.getByText(/révèle la cote de tous les objets/)).toBeTruthy();
    const bloc = screen.getByText("Atout Le Flair").closest("[data-testid='levelup-atout']");
    expect(bloc).toBeTruthy();
    expect(bloc!.textContent).toContain("🔍");
  });

  it("niveau sans atout (N1) : ligne simple, pas de bloc atout ni pill de famille", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.getByText(/Ouverture de l'écran Compétences/)).toBeTruthy();
    expect(screen.queryByTestId("levelup-atout")).toBeNull();
    // La pill de famille a disparu.
    expect(screen.queryByText("Jalon")).toBeNull();
  });
```

Note : pas de mock `LangueContext` à ajouter — les 8 tests existants rendent déjà `<LevelUpOverlay />` nu, le contexte langue a un défaut fr fonctionnel hors provider.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/LevelUpOverlay.test.tsx`
Expected: FAIL — « Atout Le Flair » introuvable (le titre actuel contient l'emoji : « Atout 🔍 Le Flair ») et `levelup-atout` inexistant ; « Jalon » (pill) encore présent fait échouer le second test.

- [ ] **Step 3: Implémenter le grand format et retirer les pills**

Dans `src/components/mobile/LevelUpOverlay.tsx` :

3a. Supprimer les imports devenus inutiles et les exports de pills — retirer :

```tsx
import { useLangue } from "@/lib/i18n/LangueContext";   // ← conservé (déjà utilisé ailleurs)
import { libelleFamille } from "@/lib/i18n/libelles";    // ← SUPPRIMER
```

et supprimer intégralement le bloc `COULEUR_FAMILLE` (lignes ~21-28) et la fonction `chipFamille` (lignes ~84-96, doc comprise), ainsi que l'import `type FamilleDeblocage` s'il ne sert plus qu'à eux.

3b. Ajouter les styles du bloc atout (après `ligneDeblocage`) :

```tsx
const blocAtout: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-300)",
  padding: "12px 10px",
  marginBottom: 10,
  textAlign: "center",
};

const atoutEmoji: CSSProperties = {
  fontSize: 40,
  lineHeight: 1.1,
  display: "block",
  marginBottom: 6,
};

const atoutTitre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 17,
  color: "var(--ink-900)",
  marginBottom: 6,
  lineHeight: 1.25,
};

const atoutDescription: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 13,
  lineHeight: 1.45,
  color: "var(--forest-800)",
  margin: 0,
};
```

3c. Ajouter l'extraction d'emoji (helper module, au-dessus du composant) :

```tsx
/** Sépare le premier emoji d'un titre d'atout localisé (« Atout 🔍 Le Flair »). */
function extraireEmoji(titre: string): { emoji: string | null; texte: string } {
  const m = titre.match(/\p{Extended_Pictographic}/u);
  if (!m) return { emoji: null, texte: titre };
  return {
    emoji: m[0],
    texte: titre.replace(m[0], "").replace(/\s{2,}/g, " ").trim(),
  };
}
```

3d. Dans le JSX de la carte, remplacer le bloc `{deblocages.map((dep) => (…))}` par :

```tsx
          {deblocages.map((dep) => {
            const titreLocal = titreDeblocage(dep, locale);
            if (dep.famille === "active") {
              const { emoji, texte } = extraireEmoji(titreLocal);
              return (
                <div key={dep.titre} style={blocAtout} data-testid="levelup-atout">
                  {emoji && (
                    <span style={atoutEmoji} aria-hidden="true">
                      {emoji}
                    </span>
                  )}
                  <div style={atoutTitre}>{texte}</div>
                  <p style={atoutDescription}>{descriptionDeblocage(dep, locale)}</p>
                </div>
              );
            }
            return (
              <div key={dep.titre} style={ligneDeblocage}>
                {titreLocal}
              </div>
            );
          })}
```

et compléter l'import contenu :

```tsx
import { titreDeblocage, descriptionDeblocage } from "@/lib/i18n/contenu";
```

3e. `ligneDeblocage` n'a plus de chip : simplifier le style (retirer `display/alignItems/gap` devenus inutiles) :

```tsx
const ligneDeblocage: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ink-700)",
  textAlign: "left",
  marginBottom: 6,
};
```

- [ ] **Step 4: Vérifier tests et lint**

Run: `npx vitest run src/components/mobile/LevelUpOverlay.test.tsx && npx eslint src/components/mobile/LevelUpOverlay.tsx`
Expected: 10 tests PASS (8 existants + 2 nouveaux) ; eslint sans erreur (plus d'import inutilisé).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/LevelUpOverlay.tsx src/components/mobile/LevelUpOverlay.test.tsx
git commit -m "feat(levelup): atouts en grand format (emoji + description), pills de famille supprimées"
```

---

### Task 2: Purge du code i18n des familles (mort après Task 1)

**Files:**
- Modify: `src/lib/i18n/libelles.ts:65-80` (supprimer `libelleFamille`)
- Modify: `src/lib/i18n/libelles.test.ts` (supprimer le test `libelleFamille` + import)
- Modify: `src/lib/i18n/ui/fr.ts:93-99`, `src/lib/i18n/ui/en.ts:90-96`, `src/lib/i18n/ui/es.ts:90-96`, `src/lib/i18n/ui/el.ts:90-96` (supprimer les blocs `familles`)
- Modify: `src/data/deblocagesNiveau.ts:10-17` (supprimer `LIBELLE_FAMILLE`, aucun consommateur)

**Interfaces:**
- Consumes: rien.
- Produces: rien — suppression pure. `FamilleDeblocage` (le type) RESTE exporté par `deblocagesNiveau.ts` (utilisé par `DeblocageNiveau`).

- [ ] **Step 1: Supprimer `libelleFamille` et son test**

Dans `src/lib/i18n/libelles.ts`, supprimer la fonction et son commentaire :

```tsx
/** Libellé localisé d'une famille de déblocage (union fermée de 5). */
export function libelleFamille(f: FamilleDeblocage, d: DictionnaireUI): string {
  switch (f) {
    case "jalon":
      return d.familles.jalon;
    case "contenu":
      return d.familles.contenu;
    case "economie":
      return d.familles.economie;
    case "confort":
      return d.familles.confort;
    case "active":
      return d.familles.active;
  }
}
```

et l'import ligne 8 s'il ne sert plus dans le fichier :

```tsx
import type { FamilleDeblocage } from "@/data/deblocagesNiveau";
```

Dans `src/lib/i18n/libelles.test.ts`, supprimer `libelleFamille` de l'import, l'import `DEBLOCAGES_PAR_NIVEAU` s'il ne sert que là, et le bloc :

```tsx
test("libelleFamille couvre les 5 familles dans les 3 langues", () => {
  const familles = [...new Set(DEBLOCAGES_PAR_NIVEAU.map((d) => d.famille))];
  for (const locale of ["fr", "en", "es"] as const) {
    for (const f of familles) {
      expect(libelleFamille(f, DICTIONNAIRES[locale]).trim()).not.toBe("");
    }
  }
  expect(libelleFamille("active", DICTIONNAIRES.en)).toBe("Active skill");
  expect(libelleFamille("jalon", DICTIONNAIRES.es)).toBe("Hito");
});
```

- [ ] **Step 2: Supprimer les blocs `familles` des 4 dictionnaires**

Dans `src/lib/i18n/ui/fr.ts` (et l'équivalent traduit dans en/es/el), supprimer :

```ts
  familles: {
    jalon: "Jalon",
    contenu: "Contenu",
    economie: "Économie",
    confort: "Confort",
    active: "Active",
  },
```

- [ ] **Step 3: Supprimer `LIBELLE_FAMILLE`**

Dans `src/data/deblocagesNiveau.ts`, supprimer :

```ts
/** Libellé humain de chaque famille de déblocage (donnée pure, UI-agnostique). */
export const LIBELLE_FAMILLE: Record<FamilleDeblocage, string> = {
  jalon: "Jalon",
  contenu: "Contenu",
  economie: "Économie",
  confort: "Confort",
  active: "Active",
};
```

- [ ] **Step 4: Vérifier compilation, tests, lint**

Run: `npx tsc --noEmit && npx vitest run src/lib/i18n src/components/mobile/LevelUpOverlay.test.tsx && npx eslint src/lib/i18n src/data/deblocagesNiveau.ts`
Expected: tsc silencieux (aucune référence restante à `familles`/`libelleFamille`/`LIBELLE_FAMILLE`), tests PASS, eslint sans erreur.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/libelles.ts src/lib/i18n/libelles.test.ts src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts src/lib/i18n/ui/el.ts src/data/deblocagesNiveau.ts
git commit -m "chore(i18n): purge des libellés de famille (pills supprimées du level up)"
```

---

## Vérification finale (hors tasks)

- `npx vitest run src` : suite complète verte.
- Vérif visuelle device (Guillaume) : bloc atout au N5, lignes simples au N1/N3, rendu 4 langues.
