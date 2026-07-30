# Médaillons d'atouts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Générer les 6 illustrations d'atouts du dock (médaillons de laiton frappés) aux chemins `public/competences/atout.<id>.webp` déjà attendus par `SkillDock`.

**Architecture:** Un script de génération dédié (`scripts/generate-atouts.mjs`) sur le patron exact de `generate-competences.mjs` : config JSON des 6 motifs, brief de style commun « laiton frappé plein cadre », génération Gemini 1:1, post-traitement sharp (rognage 3,5 % des bords → 512×512 WebP q85). Aucun changement de code UI. Validation par planche de contrôle à 64 px (scratchpad).

**Tech Stack:** Node ESM, `@google/genai` (modèle `gemini-3-pro-image-preview`), `sharp`. Clé `GEMINI_API_KEY` lue depuis `.env` à la racine.

## Global Constraints

- Spec de référence : `docs/superpowers/specs/2026-07-31-atouts-medaillons-design.md` (commitée en Task 1).
- Branche de travail : `feat/atouts-medaillons` créée depuis `origin/main` — PAS depuis `feat/carnet-barre-progression` (commits carnet non mergés).
- Sortie : `public/competences/atout.<id>.webp`, exactement 512×512, WebP q85, cible < ~40 kB par fichier.
- Les 6 ids (fermés) : `atout.flair`, `atout.lotGarni`, `atout.fouille`, `atout.boniment`, `atout.tchatche`, `atout.criee` — casse exacte (`lotGarni` en camelCase), ce sont les chemins construits par `ClientPage.tsx` (`/competences/atout.${id}.webp`).
- Image plein cadre laiton bord à bord : AUCUN anneau/listel dessiné, motif dans les ~65 % centraux (rognage circulaire `objectFit: cover` côté UI).
- Une seule touche de couleur « émail » naturaliste par médaille, pas de personnage entier, pas de texte.
- Pièges Gemini (mémoire projet) : ne pas empiler les négations dans les prompts (elles fabriquent le défaut) ; pas de géométrie contradictoire ; les liserés parasites se corrigent au rognage sharp, pas au prompt.
- Scripts jetables et images de contrôle : dans le scratchpad de session, jamais dans le dépôt.
- Pas de tests vitest à écrire (génération d'assets) : la « suite de tests » de ce plan = vérifications sharp (dimensions/poids) + revue visuelle de la planche.

---

### Task 1: Branche dédiée + commit de la spec

**Files:**
- Create (commit) : `docs/superpowers/specs/2026-07-31-atouts-medaillons-design.md` (existe déjà, non suivi)
- Create (commit) : `docs/superpowers/plans/2026-07-31-atouts-medaillons.md` (ce fichier, non suivi)

**Interfaces:**
- Consumes: rien.
- Produces: la branche `feat/atouts-medaillons` sur laquelle toutes les tâches suivantes commitent.

- [ ] **Step 1: Créer la branche depuis origin/main**

Si un worktree isolé est requis, le créer via la skill `superpowers:using-git-worktrees` avec base `origin/main`. Sinon (checkout direct — la branche carnet est clean) :

```bash
cd "/Users/guillaume/dev/Projet Broc V2"
git fetch origin main
git switch -c feat/atouts-medaillons origin/main
```

Attention : la spec et le plan sont des fichiers NON SUIVIS — ils survivent au `git switch` dans le même checkout, mais si un worktree séparé est utilisé, les y copier depuis le checkout principal.

- [ ] **Step 2: Vérifier que la branche est bien basée sur origin/main**

Run: `git log --oneline -1` → doit afficher `b7f35e0` (ou plus récent si main a avancé), PAS un commit `carnet`.

- [ ] **Step 3: Commit de la spec et du plan**

```bash
git add docs/superpowers/specs/2026-07-31-atouts-medaillons-design.md docs/superpowers/plans/2026-07-31-atouts-medaillons.md
git commit -m "docs(atouts): spec et plan des medaillons d'atouts du dock"
```

---

### Task 2: Config des 6 prompts (`atouts-prompts.json`)

**Files:**
- Create: `scripts/atouts-prompts.json`

**Interfaces:**
- Consumes: rien.
- Produces: un tableau JSON `[{ id, description }]` — `id` au format `atout.<activeId>` (nom de fichier sans extension), `description` = le motif seul en anglais (le brief de style commun vit dans le script, Task 3).

- [ ] **Step 1: Écrire le fichier**

Contenu exact (les descriptions décrivent UNIQUEMENT le motif et sa touche d'émail ; positif, sans négations — les interdits communs vivent dans le script) :

```json
[
  {
    "id": "atout.flair",
    "description": "Motif: an elegant Art Deco magnifying glass tilted at 45 degrees, its slender handle ending in a geometric stepped finial; just beneath the lens, a small faceted starburst sparkle struck in raised relief. Enamel accent: the glass of the lens only, a pale translucent blue enamel inlay with a soft highlight."
  },
  {
    "id": "atout.lotGarni",
    "description": "Motif: a round wicker basket brimming with flea-market finds struck in raised relief — the neck of a bottle, the corner of a small picture frame, a round trinket. Enamel accent: a soft piece of cloth draped over the basket rim, a muted green enamel inlay."
  },
  {
    "id": "atout.fouille",
    "description": "Motif: a wooden crate with its lid ajar, bric-a-brac emerging from the opening — a candlestick, a stack of books — with two or three tiny puffs of dust struck in low relief above. Enamel accent: the neck of one glass bottle sticking out of the crate, a deep bottle-green enamel inlay."
  },
  {
    "id": "atout.boniment",
    "description": "Motif: a showman's top hat resting at a jaunty angle on a crossed walking cane, with three small four-pointed Art Deco sparkles around it. Enamel accent: the hat's ribbon band, a burgundy enamel inlay."
  },
  {
    "id": "atout.tchatche",
    "description": "Motif: a pair of small stylized Art Deco lips from which flows a long undulating speech ribbon, a smooth banner waving in two gentle S-curves across the medal. Enamel accent: the thin trim line along the ribbon's edge, a burgundy enamel inlay."
  },
  {
    "id": "atout.criee",
    "description": "Motif: a town crier's speaking-trumpet megaphone tilted upward at 30 degrees, its bell wide open, with a geometric Art Deco fan of straight sound rays bursting from it. Enamel accent: the cylindrical wooden handle grip, a warm red-brown enamel inlay; the horn itself stays bare brass."
  }
]
```

- [ ] **Step 2: Valider que le JSON parse et couvre les 6 ids**

Run:
```bash
node -e "const c=require('./scripts/atouts-prompts.json');const ids=c.map(x=>x.id).sort().join(',');console.log(c.length, ids)"
```
Expected: `6 atout.boniment,atout.criee,atout.flair,atout.fouille,atout.lotGarni,atout.tchatche`

- [ ] **Step 3: Commit**

```bash
git add scripts/atouts-prompts.json
git commit -m "feat(atouts): config des 6 motifs de medaillons"
```

---

### Task 3: Script `generate-atouts.mjs` + validation sur Le Flair

**Files:**
- Create: `scripts/generate-atouts.mjs`
- Modify: `package.json` (ligne ~18, bloc des scripts `gen:*`)

**Interfaces:**
- Consumes: `scripts/atouts-prompts.json` (Task 2), `GEMINI_API_KEY` dans `.env`.
- Produces: la commande `npm run gen:atouts` (options : ids précis en argument, `--force`) qui écrit `public/competences/atout.<id>.webp` 512×512 q85. Task 4 s'en sert telle quelle.

- [ ] **Step 1: Écrire le script**

Patron de `generate-competences.mjs`, avec brief médaille et sortie 512. Contenu complet :

```js
#!/usr/bin/env node
/**
 * Génère les 6 médaillons d'atouts du dock (laiton frappé, touche d'émail).
 *
 * Usage :
 *   npm run gen:atouts                    # tout (skip ceux déjà présents)
 *   npm run gen:atouts -- atout.flair     # une ou plusieurs médailles précises
 *   npm run gen:atouts -- --force         # regénère même les présents
 *
 * Pipeline : Gemini pro 1:1 2K → rognage 3,5 %/bord → WebP 512×512 q85
 * dans public/competences/ (chemins attendus par SkillDock via ClientPage).
 * Spec : docs/superpowers/specs/2026-07-31-atouts-medaillons-design.md
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "competences");
const CONFIG_PATH = path.join(__dirname, "atouts-prompts.json");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

const MODEL = "gemini-3-pro-image-preview";
const OUT_SIZE = 512;
// Le modèle dessine parfois un fin liseré malgré la consigne full-bleed :
// rognage déterministe de ~3,5 % par bord avant le resize.
const EDGE_CROP_RATIO = 0.035;

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

// Matière commune aux 6 médailles : laiton frappé plein cadre, une touche d'émail.
const STYLE_BRIEF = [
  "Struck brass medal artwork in bas-relief, Art Deco style, 1920s France.",
  "The polished brass surface fills the ENTIRE square edge to edge, as if the",
  "camera were closer than the medal's rim — warm golden brass, soft raking",
  "light from the upper-left, crisp specular highlights on the raised relief,",
  "gentle darker patina pooled in the recesses, very subtle circular brushed",
  "texture in the flat field.",
  "The motif is struck in raised relief, centered, and fits inside the central",
  "65% of the square so a circular crop keeps it whole; the rest is flat field.",
  "Exactly one small enamel color inlay on the single detail named in the",
  "motif; every other element stays monochrome brass.",
  "Plain flat brass field only: no rim, no border, no text, no full human figure.",
].join(" ");

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
    console.error("Aucune médaille à générer (filtres trop restrictifs ?).");
    process.exit(1);
  }

  console.log(`📋  ${todo.length} médaillon(s) d'atout à traiter\n`);
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

    const prompt = `${STYLE_BRIEF}\n\n${item.description}`;
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
      const meta = await sharp(raw).metadata();
      const cropX = Math.round(meta.width * EDGE_CROP_RATIO);
      const cropY = Math.round(meta.height * EDGE_CROP_RATIO);
      const buf = await sharp(raw)
        .extract({
          left: cropX,
          top: cropY,
          width: meta.width - 2 * cropX,
          height: meta.height - 2 * cropY,
        })
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

Dans `package.json`, après la ligne `"gen:competences": …` :

```json
    "gen:atouts": "node scripts/generate-atouts.mjs",
```

- [ ] **Step 3: Vérifier le refus propre sans filtre valide**

Run: `npm run gen:atouts -- atout.inexistant`
Expected: sortie `Aucune médaille à générer (filtres trop restrictifs ?).` et code retour 1 (prouve le chargement de la config sans appeler l'API).

- [ ] **Step 4: Générer la première médaille (Le Flair) et l'inspecter**

Run: `npm run gen:atouts -- atout.flair`
Expected: `✅  atout.flair.webp (< 40 kB)`.

Puis contrôle : conversion PNG dans le scratchpad et revue visuelle (outil Read) :

```bash
node -e "const sharp=require('sharp');sharp('public/competences/atout.flair.webp').png().toFile(process.env.SCRATCH+'/atout.flair.png').then(()=>console.log('ok'))"
```

(remplacer `process.env.SCRATCH` par le chemin réel du scratchpad de session). Vérifier : laiton bord à bord SANS anneau ni marge, loupe entière dans les ~65 % centraux, une seule touche d'émail (lentille bleutée), aucun texte, aucun personnage.

- [ ] **Step 5: Itérer si nécessaire**

Si le rendu ne respecte pas le brief (anneau dessiné, motif décentré/coupé, plusieurs couleurs, texte) : ajuster `STYLE_BRIEF` ou la description dans `atouts-prompts.json` — en reformulant en POSITIF (dire ce qu'il faut, pas empiler des « no ») — puis `npm run gen:atouts -- atout.flair --force`. Répéter jusqu'à validation. Si l'anneau persiste alors que tout le reste est bon : augmenter `EDGE_CROP_RATIO` (0.035 → jusqu'à ~0.08) plutôt que durcir le prompt.

- [ ] **Step 6: Vérifier les dimensions du fichier livré**

Run:
```bash
node -e "require('sharp')('public/competences/atout.flair.webp').metadata().then(m=>console.log(m.width,m.height,m.format))"
```
Expected: `512 512 webp`

- [ ] **Step 7: Commit du script (et des ajustements de prompts éventuels)**

```bash
git add scripts/generate-atouts.mjs package.json scripts/atouts-prompts.json
git commit -m "feat(atouts): script de generation des medaillons (gen:atouts)"
```

(Ne pas commiter `atout.flair.webp` ici — les 6 webp partent ensemble en Task 4.)

---

### Task 4: Générer les 6 médailles + planche de contrôle à 64 px

**Files:**
- Create: `public/competences/atout.flair.webp`, `atout.lotGarni.webp`, `atout.fouille.webp`, `atout.boniment.webp`, `atout.tchatche.webp`, `atout.criee.webp`
- Create (scratchpad, non commité) : `<scratchpad>/planche-atouts.mjs`, `<scratchpad>/planche-atouts.png`

**Interfaces:**
- Consumes: `npm run gen:atouts` (Task 3).
- Produces: les 6 assets finaux du dépôt ; rien d'autre n'en dépend (le code UI les référence déjà).

- [ ] **Step 1: Générer les 5 médailles restantes**

Run: `npm run gen:atouts`
Expected: 5 `✅` + 1 `⏭️` (flair déjà présent), aucun échec.

- [ ] **Step 2: Écrire le script de planche dans le scratchpad**

`<scratchpad>/planche-atouts.mjs` (lancer avec `node`, depuis la racine du projet pour résoudre `sharp`) :

```js
// Planche de contrôle : les 6 médaillons à 64 px, rang normal + rang « verrouillé »
// (approximation du filtre UI grayscale(1) brightness(0.55)).
import sharp from "sharp";
import path from "node:path";

const ROOT = "/Users/guillaume/dev/Projet Broc V2";
const OUT = path.join(process.argv[2] ?? ".", "planche-atouts.png");
const IDS = ["flair", "lotGarni", "fouille", "boniment", "tchatche", "criee"];
const CELL = 64, PAD = 12;

const circle = Buffer.from(
  `<svg width="${CELL}" height="${CELL}"><circle cx="${CELL / 2}" cy="${CELL / 2}" r="${CELL / 2}" fill="#fff"/></svg>`,
);

async function vignette(id, locked) {
  let img = sharp(path.join(ROOT, "public", "competences", `atout.${id}.webp`))
    .resize(CELL, CELL);
  if (locked) img = img.grayscale().modulate({ brightness: 0.55 });
  const buf = await img.png().toBuffer();
  // Rognage circulaire comme l'UI (borderRadius: 50%).
  return sharp(buf)
    .composite([{ input: circle, blend: "dest-in" }])
    .png()
    .toBuffer();
}

const W = IDS.length * (CELL + PAD) + PAD;
const H = 2 * (CELL + PAD) + PAD;
const composites = [];
for (let i = 0; i < IDS.length; i++) {
  for (const [row, locked] of [[0, false], [1, true]]) {
    composites.push({
      input: await vignette(IDS[i], locked),
      left: PAD + i * (CELL + PAD),
      top: PAD + row * (CELL + PAD),
    });
  }
}
await sharp({
  create: { width: W, height: H, channels: 4, background: "#1d3a2f" },
})
  .composite(composites)
  .png()
  .toFile(OUT);
console.log("planche →", OUT);
```

- [ ] **Step 3: Générer et relire la planche**

Run: `node <scratchpad>/planche-atouts.mjs <scratchpad>`
Puis ouvrir `<scratchpad>/planche-atouts.png` avec l'outil Read et juger, médaille par médaille :
- motif identifiable à 64 px (rang du haut) ;
- touche d'émail visible mais ponctuelle ;
- motif entier dans le cercle (rien de coupé au bord) ;
- rang « verrouillé » : la silhouette du motif reste lisible en gris.

Contrôler aussi chaque master de près (conversions PNG 512 dans le scratchpad, comme en Task 3 Step 4) : pas d'anneau, pas de texte, pas de personnage entier, cohérence de matière entre les 6.

- [ ] **Step 4: Regénérer les médailles ratées**

Pour chaque médaille refusée : ajuster sa description dans `atouts-prompts.json` (reformulation positive) puis `npm run gen:atouts -- atout.<id> --force`, et refaire la planche (Steps 3). Boucler jusqu'à ce que les 6 passent la revue.

- [ ] **Step 5: Vérification finale automatique (dimensions + poids)**

Run:
```bash
node -e "
const sharp=require('sharp');const fs=require('fs');
const ids=['flair','lotGarni','fouille','boniment','tchatche','criee'];
Promise.all(ids.map(async id=>{
  const p='public/competences/atout.'+id+'.webp';
  const m=await sharp(p).metadata();const kb=Math.round(fs.statSync(p).size/1024);
  console.log(id, m.width+'x'+m.height, m.format, kb+' kB', (m.width===512&&m.height===512&&kb<60)?'OK':'KO');
})).then(rs=>process.exit(0))"
```
Expected: 6 lignes `OK` (512x512, webp, poids raisonnable — la cible est < ~40 kB, tolérance 60).

- [ ] **Step 6: Commit des 6 assets**

```bash
git add public/competences/atout.*.webp scripts/atouts-prompts.json
git commit -m "feat(atouts): 6 medaillons de laiton du dock (flair, lot garni, fouille, boniment, tchatche, criee)"
```

- [ ] **Step 7: Contrôle en app (optionnel mais recommandé)**

Suivre la recette mémoire « Captures UI contre next dev » : `npm run dev` (un seul à la fois), Playwright sur `http://localhost:3000` (JAMAIS 127.0.0.1), save avec atouts débloqués, capture du dock en chinage et en vente. Sinon, laisser ce point à la recette device de Guillaume.

---

## Self-review (fait à l'écriture du plan)

- Couverture spec : direction artistique → STYLE_BRIEF (Task 3) ; 6 motifs → JSON (Task 2, étoffe verte pour lotGarni conformément à la spec) ; pipeline 512/q85/rognage → script (Task 3) ; planche de contrôle normal+verrouillé → Task 4 ; critères de réussite → Task 4 Steps 3 et 5 ; hors périmètre (aucun code UI, pas de diplomate) → respecté ; branche depuis origin/main → Task 1.
- Placeholders : aucun — tous les contenus (JSON, script, planche, commandes) sont complets.
- Cohérence des noms : ids `atout.<activeId>` identiques dans le JSON (Task 2), le filtre CLI (Task 3), la planche et la vérification (Task 4) ; `gen:atouts` partout.
