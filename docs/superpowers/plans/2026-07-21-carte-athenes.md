# Carte d'Athènes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La 5ᵉ carte postale de l'épilogue devient la « Carte d'Athènes » (le grand-père s'y installe), avec timbre ATHINA, traductions EN/ES et nouvelle illustration.

**Architecture:** Changement de contenu pur : l'id `carte_postale_5` et toute la mécanique (tick, composant, CourrierSheet) restent intacts. On remplace les champs de la carte 5 dans `src/data/cartesPostales.ts`, les traductions EN/ES, on adapte deux tests, puis on régénère l'illustration via le script Gemini existant.

**Tech Stack:** vitest (+ jsdom pour le test composant), i18n contenu par overlay id → {titre, corps}, script `scripts/generate-cartes-postales.mjs` (Gemini + sharp).

## Global Constraints

- Spec : `docs/superpowers/specs/2026-07-21-carte-athenes-design.md` — le texte FR de la carte y est **verbatim**, ne pas le reformuler.
- L'id `carte_postale_5` ne change PAS (stocké dans les saves, idempotence de `tick.ts`).
- `cachet: "ATHINA"`, `couleurTimbre: "#3d6e8f"`, `illustration: "/cartes-postales/athenes.webp"`.
- Le composant `CartePostaleView` n'est PAS modifié (le rendu « sans cachet → sans timbre » existe et reste).
- Aucune migration de save.
- Lint : `npm run lint` cassé → `npx eslint src`.
- Commits en français, Conventional Commits, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Données carte 5, traductions EN/ES, tests

**Files:**
- Modify: `src/data/cartesPostales.ts:68-77` (bloc `carte_postale_5`)
- Modify: `src/data/cartesPostales.test.ts:19-28` (test cachet)
- Modify: `src/components/mobile/qg/sheets/CartePostaleView.test.tsx:6-14,42-47` (fixture sans timbre)
- Modify: `src/lib/i18n/contenu/en/courrier.ts:170-177` et `src/lib/i18n/contenu/es/courrier.ts:170-177` (entrée `carte_postale_5`)

**Interfaces:**
- Consumes: `CartePostale` (type exporté par `src/data/cartesPostales.ts`), `creerCartePostale` de `@/lib/courrier`.
- Produces: `CARTES_POSTALES[4]` = carte d'Athènes complète (titre `"Carte d'Athènes"`, cachet `"ATHINA"`, couleurTimbre `"#3d6e8f"`, illustration `"/cartes-postales/athenes.webp"`) — la Task 2 génère le fichier image correspondant.

- [ ] **Step 1: Adapter les tests (échec attendu)**

Dans `src/data/cartesPostales.test.ts`, remplacer le test « cartes 1-4 : cachet + couleur de timbre ; carte 5 : ni l'un ni l'autre » (lignes 19-28) par :

```ts
  it("les 5 cartes ont cachet + couleur de timbre (ATHINA pour la 5ᵉ)", () => {
    for (const c of CARTES_POSTALES) {
      expect(c.cachet, c.id).toBeTruthy();
      expect(c.couleurTimbre, c.id).toMatch(/^#/);
    }
    const carte5 = CARTES_POSTALES[4];
    expect(carte5.id).toBe("carte_postale_5");
    expect(carte5.titre).toBe("Carte d'Athènes");
    expect(carte5.cachet).toBe("ATHINA");
  });
```

Dans `src/components/mobile/qg/sheets/CartePostaleView.test.tsx` :

1. Étendre l'import du type (ligne 6) :

```tsx
import { CARTES_POSTALES, type CartePostale } from "@/data/cartesPostales";
```

2. Remplacer les fixtures (lignes 11-14) par :

```tsx
const carte1 = CARTES_POSTALES[0]; // Venise, avec timbre
const courrier1 = creerCartePostale(1, 20);
// Carte fabriquée sans cachet : plus aucune donnée réelle n'est « sans
// timbre » depuis la carte d'Athènes, mais le composant doit continuer à
// savoir rendre un verso nu.
const carteSansTimbre: CartePostale = {
  id: "carte_postale_5",
  titre: "Carte d'Athènes",
  corps: ["Texte de test.", "— Grand-père"],
  illustration: "/cartes-postales/athenes.webp",
};
const courrier5 = creerCartePostale(5, 60);
```

3. Remplacer le test « carte 5 : aucun timbre au verso » (lignes 42-47) par :

```tsx
  it("carte sans cachet : aucun timbre au verso", async () => {
    const user = userEvent.setup();
    render(<CartePostaleView courrier={courrier5} carte={carteSansTimbre} />);
    await user.click(screen.getByTestId("carte-postale"));
    expect(screen.queryByTestId("timbre")).toBeNull();
  });
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/data/cartesPostales.test.ts src/components/mobile/qg/sheets/CartePostaleView.test.tsx`
Expected: FAIL — le test données attend `cachet: "ATHINA"` sur la carte 5 (actuellement absente) ; le test composant passe déjà (fixture locale), c'est normal.

- [ ] **Step 3: Remplacer la carte 5 dans les données**

Dans `src/data/cartesPostales.ts`, remplacer le bloc lignes 68-77 par (texte FR verbatim du spec) :

```ts
  {
    id: "carte_postale_5",
    titre: "Carte d'Athènes",
    illustration: "/cartes-postales/athenes.webp",
    cachet: "ATHINA",
    couleurTimbre: "#3d6e8f",
    corps: [
      "Depuis la terrasse où je t'écris, on voit l'Acropole et le linge du voisin, à égalité. J'ai visité la moitié du monde en courant après les bijoux d'une reine — et c'est ici, devant un café trop sucré, que j'ai cessé de courir.",
      "Je reste. Il y a une échoppe à louer au pied de la colline, juste la place pour un établi et deux chaises. On avait déjà tout, tu sais — moi, il me manquait juste un endroit où le savoir.",
      "Viens me voir quand la boutique te laissera respirer. — Grand-père",
    ],
  },
```

- [ ] **Step 4: Remplacer les traductions EN/ES**

Dans `src/lib/i18n/contenu/en/courrier.ts`, remplacer l'entrée `carte_postale_5` (lignes 170-177) par :

```ts
  carte_postale_5: {
    titre: "Postcard from Athens",
    corps: [
      "From the terrace where I'm writing you, you can see the Acropolis and the neighbor's laundry, on equal footing. I've crossed half the world chasing a queen's jewels — and it's here, in front of an over-sweet coffee, that I stopped running.",
      "I'm staying. There's a little shop for rent at the foot of the hill, just enough room for a workbench and two chairs. We already had everything, you know — all I was missing was a place to know it.",
      "Come see me when the shop lets you breathe. — Grandpa",
    ],
  },
```

Dans `src/lib/i18n/contenu/es/courrier.ts`, remplacer l'entrée `carte_postale_5` (lignes 170-177) par :

```ts
  carte_postale_5: {
    titre: "Postal de Atenas",
    corps: [
      "Desde la terraza donde te escribo se ven la Acrópolis y la ropa tendida del vecino, a partes iguales. He recorrido medio mundo persiguiendo las joyas de una reina — y es aquí, delante de un café demasiado dulce, donde dejé de correr.",
      "Me quedo. Hay una tiendecita en alquiler al pie de la colina, con el sitio justo para un banco de trabajo y dos sillas. Ya lo teníamos todo, ¿sabes? — a mí solo me faltaba un lugar donde saberlo.",
      "Ven a verme cuando la tienda te deje respirar. — Abuelo",
    ],
  },
```

- [ ] **Step 5: Vérifier que tout passe (données + composant + parité i18n)**

Run: `npx vitest run src/data/cartesPostales.test.ts src/components/mobile/qg/sheets/ src/lib/i18n/contenu/courrier.test.ts src/lib/quetes/tick.test.ts`
Expected: PASS partout (la parité i18n vérifie mêmes clés/nombre de paragraphes que le FR ; tick inchangé).

- [ ] **Step 6: Commit**

```bash
git add src/data/cartesPostales.ts src/data/cartesPostales.test.ts \
        src/components/mobile/qg/sheets/CartePostaleView.test.tsx \
        src/lib/i18n/contenu/en/courrier.ts src/lib/i18n/contenu/es/courrier.ts
git commit -m "feat(epilogue): la carte d'Athènes remplace la carte sans timbre (installation du grand-père)"
```

---

### Task 2: Illustration d'Athènes + vérification globale

**Files:**
- Modify: `scripts/generate-cartes-postales.mjs` (entrée `sans-timbre` → `athenes`)
- Modify: `docs/art/prompts-cartes-postales.md` (section 5 + cible)
- Create: `public/cartes-postales/athenes.webp` (généré)
- Delete: `public/cartes-postales/sans-timbre.webp`

**Interfaces:**
- Consumes: `CARTES_POSTALES[4].illustration === "/cartes-postales/athenes.webp"` (Task 1) ; script `npm run gen:cartes-postales -- athenes` (filtre par id, skip des présents).
- Produces: asset final 1200×800 webp ; aucune interface code.

- [ ] **Step 1: Remplacer l'entrée du script**

Dans `scripts/generate-cartes-postales.mjs`, remplacer l'objet `{ id: "sans-timbre", ... }` du tableau `CARTES` par :

```js
  {
    id: "athenes",
    description:
      "Athens in golden morning light, a shaded café terrace in the Plaka " +
      "district. In the distance the Acropolis on its rocky hill — and, " +
      "strung between the nearest houses, the neighbor's laundry sharing the " +
      "sky with it, on equal footing. The elderly traveler sits at a small " +
      "marble café table, seen from behind, a tiny Greek coffee cup before " +
      "him. At the foot of the hill nearby, a modest little shop with wooden " +
      "shutters ajar, a workbench glimpsed inside. Accent colors: Aegean " +
      "blue (#3d6e8f), warm marble whites, one discreet bougainvillea. " +
      "Mood: settled, serene — the end of a journey, not a stop.",
  },
```

- [ ] **Step 2: Mettre à jour le doc des prompts**

Dans `docs/art/prompts-cartes-postales.md` : dans l'intro, remplacer `sans-timbre` par `athenes` dans la liste des cibles ; remplacer la section `## 5. sans-timbre.webp — Carte sans timbre` (titre + bloc SCENE) par :

```markdown
## 5. athenes.webp — Carte d'Athènes

\`\`\`
SCENE: Athens in golden morning light, a shaded café terrace in the Plaka
district. In the distance the Acropolis on its rocky hill — and, strung
between the nearest houses, the neighbor's laundry sharing the sky with it,
on equal footing. The elderly traveler sits at a small marble café table,
seen from behind, a tiny Greek coffee cup before him. At the foot of the
hill nearby, a modest little shop with wooden shutters ajar, a workbench
glimpsed inside. Accent colors: Aegean blue (#3d6e8f), warm marble whites,
one discreet bougainvillea. Mood: settled, serene — the end of a journey,
not a stop.
\`\`\`
```

(retirer les backslashes d'échappement — bloc de code normal). Dans les
« Critères de validation », la consigne « aucun lettrage » couvre aussi
l'alphabet grec (pas d'enseigne lisible).

- [ ] **Step 3: Générer l'illustration et supprimer l'ancienne**

Run:
```bash
npm run gen:cartes-postales -- athenes
rm public/cartes-postales/sans-timbre.webp
```
Expected: `✅ athenes.webp` (~150-350 kB), les 4 autres non touchées ; `sans-timbre.webp` supprimé.

- [ ] **Step 4: Contrôle visuel (contrôleur)**

Convertir en PNG dans le scratchpad et regarder l'image : style aquarelle conforme, Acropole + linge dans le cadre, grand-père de dos, AUCUN texte lisible (ni latin ni grec). Régénérer avec `--force` si un critère échoue.

- [ ] **Step 5: Vérification globale**

Run: `npx vitest run` puis `npx eslint src`
Expected: suite entière verte (1146 tests dont 2 skips), eslint sans erreur.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-cartes-postales.mjs docs/art/prompts-cartes-postales.md \
        public/cartes-postales/athenes.webp
git rm public/cartes-postales/sans-timbre.webp
git commit -m "feat(epilogue): illustration de la carte d'Athènes (remplace sans-timbre)"
```
