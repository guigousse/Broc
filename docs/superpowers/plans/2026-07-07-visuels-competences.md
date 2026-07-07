# Visuels de compétences (24 réclames litho) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produire les 24 visuels carrés de compétences (style lithographie douce, cadre Art déco identique composité) dans `public/competences/`, avec leur pipeline de génération versionnée.

**Architecture:** Un fichier de prompts dédié (`scripts/competences-prompts.json`, 24 entrées) est consommé par un script de génération (`scripts/generate-competences.mjs`) calqué sur `scripts/generate-qg-images.mjs` : appel Gemini pro en 1:1/2K avec le brief maison, puis composite d'un cadre SVG déterministe unique (`scripts/competences-frame.svg`) via sharp, et export WebP 1024×1024 dans `public/competences/`. Un test vitest verrouille le contrat de nommage et la présence des 24 assets.

**Tech Stack:** Node ESM, `@google/genai` (modèle `gemini-3-pro-image-preview`), `sharp` (rasterisation SVG + composite + WebP), vitest.

**Spec:** `docs/superpowers/specs/2026-07-07-visuels-competences-design.md`

## Global Constraints

- Images **sans aucun texte** (ni lettres, ni chiffres, ni enseignes) et **sans cadre généré** — le cadre est composité en post-traitement, identique au pixel près sur les 24.
- Format carré 1:1 ; génération 2K ; livrable final **WebP 1024×1024, qualité 85**, dans `public/competences/`.
- Nommage exact des ids/fichiers : `general.{branche}.{palier}` et `theme.{branche}.{palier}` avec branches générales `negociation|charisme|presentation|vision` et thématiques `reparer|connaisseur|passion|oeil_aiguise`, paliers `1|2|3` → 24 ids.
- Style : brief maison verbatim (litho douce) — voir `STYLE_BRIEF` dans la Task 3, copié de `STYLE_BRIEF_BASE` de `scripts/generate-qg-images.mjs`.
- Les 12 visuels `theme.*` sont partagés entre les 7 catégories : uniquement des objets « brocante » génériques (pendule, vase, cruche, théière, tableau, gramophone…), jamais un objet marqueur d'une seule catégorie en sujet principal.
- Personnage récurrent identique sur les 24 : le brocanteur moustachu en costume trois-pièces tweed, manches retroussées (constante `CHARACTER` de la Task 2).
- La clé `GEMINI_API_KEY` vient du `.env` racine (jamais commitée). Chaque génération pro coûte de l'argent : ne jamais regénérer sans `--force` explicite.

---

### Task 1: Cadre Art déco déterministe

**Files:**
- Create: `scripts/competences-frame.svg`
- Test: vérification visuelle via un composite d'essai en scratchpad (pas de test unitaire pour un asset graphique)

**Interfaces:**
- Produces: `scripts/competences-frame.svg` — SVG 2048×2048, fond transparent, filets + losanges d'angle ; consommé tel quel par `generate-competences.mjs` (Task 3) qui le rasterise à 2048×2048 et le composite au-dessus de chaque image.

- [ ] **Step 1: Créer le SVG du cadre**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048">
  <!-- Cadre Art déco unique des visuels de compétences.
       Double filet brun encre + filet or, losanges aux quatre angles.
       Fond transparent : composité au-dessus des scènes générées. -->
  <g fill="none" stroke-linejoin="miter">
    <rect x="84"  y="84"  width="1880" height="1880" stroke="#4a3a28" stroke-width="8"/>
    <rect x="102" y="102" width="1844" height="1844" stroke="#a07f3c" stroke-width="2"/>
    <rect x="118" y="118" width="1812" height="1812" stroke="#4a3a28" stroke-width="3"/>
    <!-- Losanges d'angle, centrés sur (101,101) etc. — ornement par-dessus les filets -->
    <path d="M 101 63  L 139 101  L 101 139  L 63 101  Z"  stroke="#4a3a28" stroke-width="5"/>
    <path d="M 1947 63 L 1985 101 L 1947 139 L 1909 101 Z" stroke="#4a3a28" stroke-width="5"/>
    <path d="M 101 1909  L 139 1947  L 101 1985  L 63 1947  Z"  stroke="#4a3a28" stroke-width="5"/>
    <path d="M 1947 1909 L 1985 1947 L 1947 1985 L 1909 1947 Z" stroke="#4a3a28" stroke-width="5"/>
    <!-- Petits losanges au milieu de chaque bord -->
    <path d="M 1024 76  L 1049 101  L 1024 126  L 999 101  Z"  stroke="#4a3a28" stroke-width="4"/>
    <path d="M 1024 1922 L 1049 1947 L 1024 1972 L 999 1947 Z" stroke="#4a3a28" stroke-width="4"/>
    <path d="M 76 1024  L 101 999  L 126 1024  L 101 1049  Z"  stroke="#4a3a28" stroke-width="4"/>
    <path d="M 1922 1024 L 1947 999 L 1972 1024 L 1947 1049 Z" stroke="#4a3a28" stroke-width="4"/>
  </g>
</svg>
```

- [ ] **Step 2: Composite d'essai sur fond parchemin uni**

Run (depuis la racine du projet) :
```bash
node -e "
const sharp = require('sharp');
(async () => {
  const frame = await sharp('scripts/competences-frame.svg', { density: 96 })
    .resize(2048, 2048).png().toBuffer();
  await sharp({ create: { width: 2048, height: 2048, channels: 3, background: '#f0e7d3' } })
    .composite([{ input: frame }])
    .resize(1024, 1024).webp({ quality: 85 })
    .toFile(process.env.TMPDIR + '/frame-test.webp');
  console.log('ok');
})();
"
```
Expected: `ok`, puis ouvrir/`Read` le fichier produit : double filet brun + filet or + losanges nets aux 4 angles et aux 4 milieux de bord, fond parchemin visible partout ailleurs, aucun artefact de crénelage grossier.

- [ ] **Step 3: Commit**

```bash
git add scripts/competences-frame.svg
git commit -m "feat(competences): cadre Art déco unique des visuels de compétences (SVG déterministe)"
```

---

### Task 2: Prompts des 24 scènes

**Files:**
- Create: `scripts/competences-prompts.json`
- Test: `src/data/competencesVisuels.test.ts`

**Interfaces:**
- Produces: `scripts/competences-prompts.json` — tableau de 24 objets `{ id, description }` (ids = contrainte globale de nommage). Consommé par `generate-competences.mjs` (Task 3) et par le test.
- Produces: la constante de test `IDS_ATTENDUS` (24 ids) reprise en Task 4 pour le test d'existence des assets.

- [ ] **Step 1: Écrire le test de structure (échec attendu : fichier absent)**

```ts
// src/data/competencesVisuels.test.ts
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const BRANCHES_GENERAL = ["negociation", "charisme", "presentation", "vision"];
const BRANCHES_THEME = ["reparer", "connaisseur", "passion", "oeil_aiguise"];
const PALIERS = [1, 2, 3];

export const IDS_ATTENDUS = [
  ...BRANCHES_GENERAL.flatMap((b) => PALIERS.map((p) => `general.${b}.${p}`)),
  ...BRANCHES_THEME.flatMap((b) => PALIERS.map((p) => `theme.${b}.${p}`)),
];

describe("competences-prompts.json", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "scripts", "competences-prompts.json"),
    "utf8",
  );
  const entries: Array<{ id: string; description: string }> = JSON.parse(raw);

  it("contient exactement les 24 ids attendus", () => {
    expect(entries.map((e) => e.id).sort()).toEqual([...IDS_ATTENDUS].sort());
  });

  it("chaque description est substantielle et sans consigne de cadre", () => {
    for (const e of entries) {
      expect(e.description.length, e.id).toBeGreaterThan(80);
      // le cadre est composité en post-traitement : aucune entrée ne doit en demander un
      expect(e.description.toLowerCase(), e.id).not.toContain("border frame");
    }
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/data/competencesVisuels.test.ts`
Expected: FAIL (`ENOENT … scripts/competences-prompts.json`)

- [ ] **Step 3: Écrire `scripts/competences-prompts.json`**

Les descriptions sont en anglais (comme le reste des pipelines). Le préambule
personnage/format est ajouté par le script (Task 3) — ici uniquement la scène.

```json
[
  {
    "id": "general.negociation.1",
    "description": "The dealer stands behind his flea-market stall mid-pitch, one hand raised in an eloquent oratorical gesture, the other resting on a small gilded mantel clock; facing him at the right edge, seen mostly from behind, a hesitant customer in a green coat holds his lapel. Modest stall with a few framed prints and earthenware jugs."
  },
  {
    "id": "general.negociation.2",
    "description": "The dealer leans over his stall in full verbal flight, both hands sketching an irresistible argument in the air, a confident smile under his moustache; the customer facing him is half-won already, eyebrows raised, one hand hovering over his coat pocket. Slightly richer stall display, warm late-afternoon light."
  },
  {
    "id": "general.negociation.3",
    "description": "Deal sealed with panache: the dealer and an elegant customer shake hands warmly above the stall, the customer beaming and lifting his hat with his free hand; on the counter between them sit a gilded mantel clock and a small neat stack of coins. Soft warm light radiates discreetly behind the two men like a quiet sunburst."
  },
  {
    "id": "general.charisme.1",
    "description": "The dealer proudly puts the finishing touch to an impeccably arranged stall, straightening a framed print between a polished vase and a tidy row of teacups, while a first passer-by with an umbrella slows down, intrigued. Quiet fresh morning atmosphere, everything neat and inviting."
  },
  {
    "id": "general.charisme.2",
    "description": "The dealer welcomes with open arms a small delighted group gathered in front of his stall — a lady with a parasol, an old gentleman leaning on a cane, a young man in a flat cap; the display behind him is generous, layered and inviting."
  },
  {
    "id": "general.charisme.3",
    "description": "A little crowd presses around the now-famous stall decked with a modest bunting garland; at its center the dealer holds court like a cheerful showman, and a wealthy client in a top hat and fur-collared coat steps forward from the crowd, cane in hand. Festive, bustling market energy."
  },
  {
    "id": "general.presentation.1",
    "description": "Close two-figure scene: the dealer, chin resting thoughtfully on his hand, studies with a kindly attentive gaze the expressive face of a customer who is absorbed in examining a small object; the customer's mood seems almost readable in the air between them. Focus on the two faces, the stall barely suggested."
  },
  {
    "id": "general.presentation.2",
    "description": "The dealer discreetly appraises, glancing over small round spectacles, the coin purse a lady customer half-opens while she examines a painted teapot; his look is measuring, subtle and amused. The purse catches the single warmest highlight of the scene."
  },
  {
    "id": "general.presentation.3",
    "description": "The dealer raises a monocle toward a customer standing before the stall and seems to read him entirely: the customer is rendered in lighter, almost transparent linework, while the coin purse tucked at his chest is drawn precisely and warmly, as if seen straight through the coat."
  },
  {
    "id": "general.vision.1",
    "description": "Early morning: the dealer sits at a small round café table reading a large opened newspaper whose print is merely suggested and illegible, a steaming coffee beside him; above the paper float delicate ink drawings of a bright sun and a rain cloud, like a weather forecast materializing in the air."
  },
  {
    "id": "general.vision.2",
    "description": "The dealer, half-hidden at a street corner, jots a note in a tiny pocket notebook while across the street an elegant celebrity in a long coat and feathered hat steps out of a 1920s motorcar under an awning; a few small ink stars of fascination hover around distant onlookers."
  },
  {
    "id": "general.vision.3",
    "description": "The dealer, sleeves rolled, rearranges the forecast itself like a card player: in one hand a card bearing a bright sun drawing, in the other a card bearing a rain cloud, deciding which to lay down on the open newspaper spread on the table. Confident, almost magician-like pose."
  },
  {
    "id": "theme.reparer.1",
    "description": "At a simple workbench, the dealer in a canvas apron carefully re-glues the loose leg of a small wooden chair, brow furrowed in concentration, a glue pot and two clamps beside him; behind, a bare workshop wall with just three hanging tools."
  },
  {
    "id": "theme.reparer.2",
    "description": "At a better-equipped workbench, the dealer polishes the brass case of a mantel clock with a soft cloth, an oil can and a neat row of fine screwdrivers laid out beside him; one side of the clock already gleams. Warm focused lamplight on the work."
  },
  {
    "id": "theme.reparer.3",
    "description": "The master restorer puts the final touch to a gilded vase under an articulated workshop lamp, a standing magnifier at hand; behind him a full wall of finely ordered tools, and on a shelf a row of freshly restored objects shining like new. Quiet virtuoso atmosphere."
  },
  {
    "id": "theme.connaisseur.1",
    "description": "The dealer examines the pages of a trade gazette with a large magnifying glass, following an undulating trend curve drawn among illegible suggested print; a pencil rests behind his ear, a cup of coffee nearby. Studious morning light on the paper."
  },
  {
    "id": "theme.connaisseur.2",
    "description": "At his stall, the dealer appraises a porcelain vase held up at eye level, while an open reference book on the counter shows small sketched plates of similar vases (no readable text); his expression is that of a man who knows exactly what he is looking at."
  },
  {
    "id": "theme.connaisseur.3",
    "description": "Crouched at a flea-market crate overflowing with bric-à-brac, the dealer holds a jeweler's loupe to his eye: among the jumble of odds and ends, one small teapot is drawn with a faint warm golden glow that only he seems to notice."
  },
  {
    "id": "theme.passion.1",
    "description": "The dealer holds a delicate painted teacup in both hands and contemplates it with a soft, almost tender smile; around the cup, two or three tiny hatched ink rays suggest a discreet warmth. Simple, intimate framing."
  },
  {
    "id": "theme.passion.2",
    "description": "The dealer presents, like a treasure carried on a small velvet cushion, a gleaming mantel clock, eyes shining, chest slightly puffed with pride; the warm light of the scene gathers entirely on the beloved object."
  },
  {
    "id": "theme.passion.3",
    "description": "Surrounded by his favorite pieces — a framed painting hugged against his chest, a gramophone, a vase and a stack of old books crowding affectionately around him — the dealer beams, completely smitten; fine radiating linework halos the whole joyful group."
  },
  {
    "id": "theme.oeil_aiguise.1",
    "description": "Tight close scene: the dealer and a customer lean face to face over a single earthenware jug placed exactly between them on the counter; the dealer's index finger delicately underlines the jug's handle mid-argument. The object is the unmistakable visual center."
  },
  {
    "id": "theme.oeil_aiguise.2",
    "description": "Same tight duel over the same single object: the dealer now lifts the earthenware jug toward the light with a flourish to reveal its glaze, one eyebrow raised, while the customer scratches his head, half-convinced; the jug catches the brightest highlight of the scene."
  },
  {
    "id": "theme.oeil_aiguise.3",
    "description": "The verbal joust concludes: the customer, conquered, drops a few coins into the dealer's open palm right above the earthenware jug, both men smiling; the object sits centered between them like a small trophy on the counter."
  }
]
```

- [ ] **Step 4: Vérifier que le test passe**

Run: `npx vitest run src/data/competencesVisuels.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/competences-prompts.json src/data/competencesVisuels.test.ts
git commit -m "feat(competences): prompts des 24 visuels de compétences + test de nommage"
```

---

### Task 3: Script de génération + composite du cadre

**Files:**
- Create: `scripts/generate-competences.mjs`
- Modify: `package.json` (bloc `scripts` : ajouter `"gen:competences": "node scripts/generate-competences.mjs"` après `"gen:qg"`)

**Interfaces:**
- Consumes: `scripts/competences-prompts.json` (Task 2), `scripts/competences-frame.svg` (Task 1), `.env` (`GEMINI_API_KEY`).
- Produces: `public/competences/{id}.webp` (1024×1024, q85, cadre incrusté). CLI : `npm run gen:competences [-- id...] [--force]`.

- [ ] **Step 1: Écrire le script**

```js
#!/usr/bin/env node
/**
 * Génère les 24 visuels de compétences (réclames litho années 20).
 *
 * Usage :
 *   npm run gen:competences                          # tout (skip ceux déjà présents)
 *   npm run gen:competences -- general.negociation.1 # une ou plusieurs précises
 *   npm run gen:competences -- --force               # regénère même les présents
 *
 * Pipeline : Gemini pro 1:1 2K → composite du cadre SVG unique
 * (scripts/competences-frame.svg) → WebP 1024×1024 q85 dans public/competences/.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "competences");
const CONFIG_PATH = path.join(__dirname, "competences-prompts.json");
const FRAME_PATH = path.join(__dirname, "competences-frame.svg");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

const MODEL = "gemini-3-pro-image-preview";
const GEN_SIZE = 2048;
const OUT_SIZE = 1024;

async function loadDotEnv() {
  try {
    const content = await fs.readFile(ENV_PATH, "utf8");
    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // pas de .env
  }
}
await loadDotEnv();

// Brief maison — copie de STYLE_BRIEF_BASE (generate-qg-images.mjs), litho douce.
const STYLE_BRIEF = [
  "Vintage Art Déco illustration in a museum catalog style.",
  "Elegant ink line-art with subtle sepia and forest green color wash.",
  "Cream parchment background with subtle paper grain texture.",
  "Soft warm directional light from the upper-left.",
  "No text overlays, no captions, no watermark.",
].join(" ");

// Personnage récurrent : identique sur les 24 visuels.
const CHARACTER =
  "Recurring protagonist (must look identical across the whole series): a warm, " +
  "charismatic French antique dealer in his mid-thirties — neat moustache, " +
  "side-parted chestnut hair, three-piece brown tweed suit, white shirt with " +
  "rolled-up sleeves. Setting: 1920s France, flea-market world.";

// Contraintes de cadrage : la scène est générée SANS cadre (composité ensuite).
const FRAMING =
  "Square 1:1 composition, one single scene, main subject centered with generous " +
  "parchment breathing room toward the edges. NO border, NO frame, NO decorative " +
  "edge of any kind (a frame is composited later). ABSOLUTELY NO TEXT: no letters, " +
  "no words, no numbers, no signage, no watermark.";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY absente. Voir .env.example");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIds = args.filter((a) => !a.startsWith("--"));

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const todo = onlyIds.length
    ? config.filter((c) => onlyIds.includes(c.id))
    : config;

  if (todo.length === 0) {
    console.error("Aucun visuel à générer (filtres trop restrictifs ?).");
    process.exit(1);
  }

  // Cadre rasterisé une seule fois, réutilisé pour tous les composites.
  const frame = await sharp(FRAME_PATH, { density: 96 })
    .resize(GEN_SIZE, GEN_SIZE)
    .png()
    .toBuffer();

  console.log(`📋  ${todo.length} visuel(s) de compétence à traiter\n`);
  const ai = new GoogleGenAI({ apiKey });
  let ok = 0, skipped = 0, failed = 0;

  for (const item of todo) {
    const outPath = path.join(OUTPUT_DIR, `${item.id}.webp`);
    if (!force) {
      try {
        await fs.access(outPath);
        console.log(`⏭️  ${item.id}.webp déjà présent (--force pour regénérer)`);
        skipped++;
        continue;
      } catch {
        // absent → à générer
      }
    }

    const prompt = `${STYLE_BRIEF}\n\n${CHARACTER}\n\nScene: ${item.description}\n\n${FRAMING}`;
    console.log(`🎨  ${item.id} — génération (${MODEL}, 1:1, 2K)…`);
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { imageConfig: { aspectRatio: "1:1", imageSize: "2K" } },
      });
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const img = parts.find((p) => p.inlineData?.data);
      if (!img) {
        console.error(`❌  ${item.id} : pas d'image dans la réponse`);
        failed++;
        continue;
      }
      const raw = Buffer.from(img.inlineData.data, "base64");
      // ATTENTION sharp : resize s'applique toujours AVANT composite dans une
      // même chaîne (l'ordre des appels ne compte pas) → deux passes distinctes,
      // sinon « Image to composite must have same dimensions or smaller ».
      const composed = await sharp(raw)
        .resize(GEN_SIZE, GEN_SIZE)
        .composite([{ input: frame }])
        .png()
        .toBuffer();
      const buf = await sharp(composed)
        .resize(OUT_SIZE, OUT_SIZE)
        .webp({ quality: 85 })
        .toBuffer();
      await fs.writeFile(outPath, buf);
      console.log(`✅  ${item.id}.webp (${Math.round(buf.length / 1024)} kB)`);
      ok++;
    } catch (err) {
      console.error(`❌  ${item.id} : ${err.message ?? err}`);
      failed++;
    }
  }

  console.log(`\n— ${ok} générés, ${skipped} déjà présents, ${failed} échecs —`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
```

- [ ] **Step 2: Ajouter le script npm**

Dans `package.json`, après la ligne `"gen:qg": "node scripts/generate-qg-images.mjs",` ajouter :

```json
    "gen:competences": "node scripts/generate-competences.mjs",
```

- [ ] **Step 3: Smoke test sur 2 visuels**

Run: `npm run gen:competences -- general.negociation.1 theme.reparer.1`
Expected: 2 lignes `✅ … kB`, exit 0.

Puis vérifier les dimensions :
```bash
node -e "
const sharp = require('sharp');
(async () => {
  for (const id of ['general.negociation.1', 'theme.reparer.1']) {
    const m = await sharp('public/competences/' + id + '.webp').metadata();
    console.log(id, m.width + 'x' + m.height, m.format);
  }
})();
"
```
Expected: `1024x1024 webp` pour les deux.

- [ ] **Step 4: Vérification visuelle des 2 smoke**

`Read` les deux WebP : style litho douce conforme (encre + sépia/vert forêt sur parchemin), cadre identique net sur les deux, personnage conforme (moustache, trois-pièces tweed), **aucun texte**, aucun second cadre généré par le modèle. Si le modèle a dessiné un cadre malgré la consigne, renforcer `FRAMING` (par ex. « the artwork must bleed to the very edge ») et regénérer avec `--force` avant de continuer.

- [ ] **Step 5: Commit (script + 2 premiers assets)**

```bash
git add scripts/generate-competences.mjs package.json public/competences/
git commit -m "feat(competences): pipeline de génération des visuels (Gemini + cadre composité)"
```

---

### Task 4: Génération des 22 restants + test d'existence + planche contact

**Files:**
- Create: `public/competences/*.webp` (22 restants)
- Modify: `src/data/competencesVisuels.test.ts` (ajout du describe « assets »)

**Interfaces:**
- Consumes: `IDS_ATTENDUS` (défini dans le même fichier de test, Task 2) ; le script et le cadre des Tasks 1–3.
- Produces: les 24 assets finaux `public/competences/{id}.webp`, versionnés.

- [ ] **Step 1: Ajouter le test d'existence des assets (échec attendu : 22 manquants)**

Ajouter à la fin de `src/data/competencesVisuels.test.ts` :

```ts
describe("assets public/competences", () => {
  it("les 24 visuels existent en webp", () => {
    const manquants = IDS_ATTENDUS.filter(
      (id) =>
        !fs.existsSync(
          path.join(process.cwd(), "public", "competences", `${id}.webp`),
        ),
    );
    expect(manquants).toEqual([]);
  });
});
```

Run: `npx vitest run src/data/competencesVisuels.test.ts`
Expected: FAIL — la liste `manquants` contient 22 ids.

- [ ] **Step 2: Générer le reste de la série**

Run: `npm run gen:competences`
Expected: 22 `✅`, 2 `⏭️ déjà présent`, exit 0. (~5-10 min ; en cas d'échec ponctuel d'un id, relancer la même commande : les présents sont sautés.)

- [ ] **Step 3: Test d'existence au vert**

Run: `npx vitest run src/data/competencesVisuels.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Planche contact pour revue**

```bash
node -e "
const sharp = require('sharp');
const fs = require('fs');
(async () => {
  const ids = fs.readdirSync('public/competences').filter(f => f.endsWith('.webp')).sort();
  const CELL = 256, COLS = 6, ROWS = Math.ceil(ids.length / COLS);
  const tiles = [];
  for (let i = 0; i < ids.length; i++) {
    tiles.push({
      input: await sharp('public/competences/' + ids[i]).resize(CELL, CELL).toBuffer(),
      left: (i % COLS) * CELL,
      top: Math.floor(i / COLS) * CELL,
    });
  }
  await sharp({ create: { width: COLS * CELL, height: ROWS * CELL, channels: 3, background: '#ffffff' } })
    .composite(tiles).webp({ quality: 80 })
    .toFile(process.env.TMPDIR + '/competences-contact.webp');
  console.log('planche:', process.env.TMPDIR + '/competences-contact.webp', ids.length + ' visuels');
})();
"
```
Expected: `planche: … 24 visuels`. `Read` la planche : cohérence de série (même personnage, même palette, cadre strictement identique), progression lisible palier 1 → 3 dans chaque branche. Noter les visuels ratés (personnage différent, texte apparu, cadre généré en double) et les regénérer un par un : `npm run gen:competences -- <id> --force`.

- [ ] **Step 5: Vérifier le poids total**

Run: `du -sh public/competences && ls public/competences | wc -l`
Expected: 24 fichiers, ordre de grandeur ≤ 5 Mo au total (≈ 100-200 kB par WebP q85).

- [ ] **Step 6: Commit**

```bash
git add public/competences/ src/data/competencesVisuels.test.ts
git commit -m "feat(competences): les 24 visuels de compétences (litho années 20, cadre unique)"
```

---

### Task 5: Nettoyage et vérification finale

**Files:**
- Delete: `scripts/tmp-style-test.mjs` (script jetable du test de style, non versionné)

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: branche `feat/visuels-competences` propre, suite de tests verte.

- [ ] **Step 1: Supprimer le jetable**

```bash
rm -f scripts/tmp-style-test.mjs
```

- [ ] **Step 2: Suite de tests complète**

Run: `npm run test:run`
Expected: PASS sur toute la suite (aucune régression ; les tests existants de `src/data/competences.test.ts` ne sont pas affectés).

- [ ] **Step 3: État git propre**

Run: `git status --short`
Expected: rien en dehors d'éventuels fichiers de session préexistants (`panorama-*.png` à la racine, non liés à ce chantier). Aucun fichier de ce chantier non commité.

---

## Hors périmètre (rappel spec)

L'intégration UI (`src/app/bibliotheque/page.tsx` : vignettes de paliers, sheet de détail, états verrouillé/débloqué) fera l'objet d'un plan séparé une fois les 24 visuels validés par Guillaume.
