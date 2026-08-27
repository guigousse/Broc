# Générateur TikTok « roulette d'objets » — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une mini-app web statique (`tiktok-gen/`) utilisable dans Safari iOS qui anime une roulette d'objets BROC devant un fond de brocante, flashe la promo pile quand la cible est calée dans sa silhouette, et enregistre/partage un mp4 1080×1920 avec son.

**Architecture:** Pas de framework, modules ES natifs servis tels quels. La logique temporelle (positions, tics, flash, boucle) est un module pur testé avec vitest ; le rendu est un `<canvas>` dessiné à `t` déterministe ; le son est planifié en WebAudio ; l'enregistrement combine `canvas.captureStream()` + `MediaStreamDestination` dans `MediaRecorder`. Un `build.mjs` (Node, sans dépendance) copie les assets du jeu vers `tiktok-gen/dist/` (ignoré par git) — déployé sur un projet Vercel séparé.

**Tech Stack:** HTML/CSS/JS ES2022, Canvas 2D, WebAudio, MediaRecorder, Web Share API ; Node 20 pour le build ; vitest (`--maxWorkers=4` obligatoire sur ce Mac).

**Spec:** `docs/superpowers/specs/2026-08-27-tiktok-gen-roulette-design.md`

## Global Constraints

- Sortie vidéo : **1080×1920**, 30 fps de référence pour les calculs de flash.
- Flash promo **uniquement** à l'instant de centrage de la cible ; largeur par défaut **4 images** ; la cible calée reste visible.
- Boucle parfaite : `durée = nbPassages × (nbObjets / vitesse)`.
- Vitesse en **objets par seconde** (1,5 → 4, défaut 2,5) ; espacement en px (défaut 520) ; passages 2-4 (défaut 3).
- Polices : titre « BROC » en **Verve Shadow** (`public/fonts/VerveShadow.ttf`), autres textes en **Cinzel** (`public/fonts/google/g05.woff2`, latin, poids variable).
- Palette : laiton `#C5A059` (brass-500), `#F1E3BF` (brass-100), fond sombre `#14181C` (midnight-900).
- Textes de l'overlay : « BROC », « Le jeu de brocante », « Disponible gratuitement sur ».
- Code, commentaires, commits en **français** ; conventions de commit du dépôt (`feat(tiktok-gen): …`).
- Tests : `npx vitest run --maxWorkers=4 tiktok-gen` ; jamais de « test creux » (chaque test doit échouer avant l'implémentation).
- Aucune dépendance npm nouvelle.

---

## Structure des fichiers

```
tiktok-gen/
  README.md            — usage, déploiement Vercel, test sur iPhone
  vercel.json          — outputDirectory dist, buildCommand node build.mjs
  build.mjs            — copie assets + génère catalogue.json → dist/
  build.test.mjs       — tests du parseur CSV / génération catalogue
  index.html           — page unique (aperçu + panneaux)
  styles.css
  src/roulette.js      — LOGIQUE PURE (positions, instants, flash, durée)
  src/roulette.test.mjs
  src/catalogue.js     — chargement de assets/catalogue.json, filtres
  src/catalogue.test.mjs
  src/images.js        — cache d'images + silhouette (masque alpha)
  src/rendu.js         — dessine une frame (fond, bande, silhouette, consigne, overlay)
  src/son.js           — tics + ding WebAudio
  src/enregistreur.js  — captureStream + MediaRecorder + partage
  src/reglages.js      — valeurs par défaut, validation, localStorage
  src/reglages.test.mjs
  src/ui.js            — câblage DOM
  assets/badges/app-store.svg, google-play.svg   — badges (placeholder à remplacer)
  dist/                — GÉNÉRÉ, ignoré
```

`dist/` contient `index.html`, `styles.css`, `src/`, `assets/{items,thumbs,fonds,fonts,badges}`, `assets/catalogue.json`.

---

### Task 1 : Squelette, build d'assets et catalogue

**Files:**
- Create: `tiktok-gen/build.mjs`, `tiktok-gen/build.test.mjs`, `tiktok-gen/vercel.json`, `tiktok-gen/README.md`, `tiktok-gen/index.html` (minimal), `tiktok-gen/styles.css` (vide)
- Modify: `vitest.config.ts` (include), `.gitignore`, `package.json` (scripts)

**Interfaces:**
- Produces: `assets/catalogue.json` = `[{ id: "art.aquarelle_marine_xixe", nom: "Aquarelle marine XIXe", categorie: "Objets d'art", rarete: "commun" }, …]` ; images en `assets/items/<id>.webp`, `assets/thumbs/<id>.webp`, fonds en `assets/fonds/<nom>.webp`, fontes `assets/fonts/VerveShadow.ttf` et `assets/fonts/cinzel.woff2`.
- Produces (build.mjs, exporté pour test) : `analyserCatalogueCsv(texte: string): Array<{id,nom,categorie,rarete}>` et `filtrerAvecImages(entrees, idsDisponibles: Set<string>): { gardes, manquants }`.

- [ ] **Étape 1 : ajouter le pattern vitest et le gitignore**

Dans `vitest.config.ts`, ajouter `"tiktok-gen/**/*.test.mjs"` au tableau `include`. Dans `.gitignore`, ajouter :

```
# Générateur TikTok : assets copiés au build
tiktok-gen/dist/
```

Dans `package.json` (scripts) :

```json
"tiktok:build": "node tiktok-gen/build.mjs",
"tiktok:serve": "node tiktok-gen/build.mjs && python3 -m http.server 3200 --directory tiktok-gen/dist"
```

- [ ] **Étape 2 : écrire le test du parseur CSV (échoue)**

`tiktok-gen/build.test.mjs` :

```js
import { describe, expect, it } from "vitest";
import { analyserCatalogueCsv, filtrerAvecImages } from "./build.mjs";

const CSV = `﻿templateId;nom;categorie;rarete;unique;tierMin;prix_Mauvais
br.marteau_menuisier;Marteau de menuisier;Bricolage;commun;;1;2
art.aquarelle_marine_xixe;"Aquarelle ""marine"" XIXe";Objets d'art;rare;;3;20
`;

describe("analyserCatalogueCsv", () => {
  it("lit id, nom, catégorie, rareté en ignorant le BOM et les guillemets", () => {
    expect(analyserCatalogueCsv(CSV)).toEqual([
      { id: "br.marteau_menuisier", nom: "Marteau de menuisier", categorie: "Bricolage", rarete: "commun" },
      { id: "art.aquarelle_marine_xixe", nom: 'Aquarelle "marine" XIXe', categorie: "Objets d'art", rarete: "rare" },
    ]);
  });
});

describe("filtrerAvecImages", () => {
  it("écarte les objets sans webp et les liste", () => {
    const entrees = analyserCatalogueCsv(CSV);
    const { gardes, manquants } = filtrerAvecImages(entrees, new Set(["br.marteau_menuisier"]));
    expect(gardes.map((e) => e.id)).toEqual(["br.marteau_menuisier"]);
    expect(manquants).toEqual(["art.aquarelle_marine_xixe"]);
  });
});
```

- [ ] **Étape 3 : lancer, vérifier l'échec**

`npx vitest run --maxWorkers=4 tiktok-gen` → FAIL (module introuvable).

- [ ] **Étape 4 : écrire `build.mjs`**

```js
#!/usr/bin/env node
/**
 * Build du générateur TikTok : copie la page et les assets du jeu dans dist/.
 * Sans dépendance. Exporte les fonctions pures pour les tests ; ne s'exécute
 * que lancé directement.
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, "..");
const DIST = path.join(ICI, "dist");

/** Découpe un CSV « ; » avec guillemets doublés ; retire le BOM. */
export function analyserCsv(texte) {
  const source = texte.replace(/^﻿/, "");
  const lignes = [];
  let cellules = [];
  let cellule = "";
  let entreGuillemets = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (entreGuillemets) {
      if (c === '"') {
        if (source[i + 1] === '"') { cellule += '"'; i++; } else entreGuillemets = false;
      } else cellule += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === ";") { cellules.push(cellule); cellule = ""; }
    else if (c === "\n") { cellules.push(cellule); lignes.push(cellules); cellules = []; cellule = ""; }
    else if (c !== "\r") cellule += c;
  }
  if (cellule !== "" || cellules.length) { cellules.push(cellule); lignes.push(cellules); }
  return lignes;
}

export function analyserCatalogueCsv(texte) {
  const [entete, ...lignes] = analyserCsv(texte);
  const col = (nom) => entete.indexOf(nom);
  const iId = col("templateId"), iNom = col("nom"), iCat = col("categorie"), iRar = col("rarete");
  return lignes
    .filter((l) => l[iId])
    .map((l) => ({ id: l[iId], nom: l[iNom], categorie: l[iCat], rarete: l[iRar] }));
}

export function filtrerAvecImages(entrees, idsDisponibles) {
  const gardes = [], manquants = [];
  for (const e of entrees) (idsDisponibles.has(e.id) ? gardes : manquants).push(e);
  return { gardes, manquants: manquants.map((e) => e.id) };
}

async function copierDossier(src, dest, filtre = () => true) {
  await fsp.mkdir(dest, { recursive: true });
  for (const nom of await fsp.readdir(src)) {
    const s = path.join(src, nom);
    if ((await fsp.stat(s)).isDirectory() || !filtre(nom)) continue;
    await fsp.copyFile(s, path.join(dest, nom));
  }
}

async function construire() {
  await fsp.rm(DIST, { recursive: true, force: true });
  await fsp.mkdir(path.join(DIST, "assets"), { recursive: true });
  for (const f of ["index.html", "styles.css"]) await fsp.copyFile(path.join(ICI, f), path.join(DIST, f));
  await copierDossier(path.join(ICI, "src"), path.join(DIST, "src"), (n) => !n.endsWith(".test.mjs"));
  await copierDossier(path.join(ICI, "assets", "badges"), path.join(DIST, "assets", "badges"));
  const webp = (n) => n.endsWith(".webp");
  await copierDossier(path.join(RACINE, "public", "items"), path.join(DIST, "assets", "items"), webp);
  await copierDossier(path.join(RACINE, "public", "items", "thumbs"), path.join(DIST, "assets", "thumbs"), webp);
  await copierDossier(path.join(RACINE, "public", "brocantes"), path.join(DIST, "assets", "fonds"), webp);
  await fsp.mkdir(path.join(DIST, "assets", "fonts"), { recursive: true });
  await fsp.copyFile(path.join(RACINE, "public/fonts/VerveShadow.ttf"), path.join(DIST, "assets/fonts/VerveShadow.ttf"));
  await fsp.copyFile(path.join(RACINE, "public/fonts/google/g05.woff2"), path.join(DIST, "assets/fonts/cinzel.woff2"));

  const csv = await fsp.readFile(path.join(RACINE, "docs", "items-catalogue.csv"), "utf8");
  const ids = new Set((await fsp.readdir(path.join(DIST, "assets", "items"))).map((n) => n.replace(/\.webp$/, "")));
  const { gardes, manquants } = filtrerAvecImages(analyserCatalogueCsv(csv), ids);
  await fsp.writeFile(path.join(DIST, "assets", "catalogue.json"), JSON.stringify(gardes));
  const fonds = (await fsp.readdir(path.join(DIST, "assets", "fonds"))).map((n) => n.replace(/\.webp$/, ""));
  await fsp.writeFile(path.join(DIST, "assets", "fonds.json"), JSON.stringify(fonds));
  console.log(`✓ ${gardes.length} objets, ${fonds.length} fonds → ${path.relative(RACINE, DIST)}`);
  if (manquants.length) console.warn(`⚠ sans image : ${manquants.join(", ")}`);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  construire().catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Étape 5 : squelette de page, config Vercel, README**

`tiktok-gen/index.html` :

```html
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>BROC · Générateur TikTok</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<main id="app">
  <section id="apercu"><canvas id="scene" width="1080" height="1920"></canvas></section>
</main>
<script type="module" src="src/ui.js"></script>
</body>
</html>
```

`tiktok-gen/vercel.json` :

```json
{
  "framework": null,
  "installCommand": "",
  "buildCommand": "node build.mjs",
  "outputDirectory": "dist",
  "cleanUrls": true
}
```

`tiktok-gen/README.md` : usage (`npm run tiktok:serve` → http://localhost:3200), déploiement (projet Vercel séparé, **Root Directory = `tiktok-gen`**, cocher **« Include source files outside of the Root Directory »**, activer **Deployment Protection**), note : `navigator.share` exige HTTPS → tester le partage sur l'URL Vercel, pas en local.

- [ ] **Étape 6 : vérifier**

`npx vitest run --maxWorkers=4 tiktok-gen` → PASS. `npm run tiktok:build` → « ✓ 39x objets, 18 fonds » et `ls tiktok-gen/dist/assets` montre `catalogue.json fonds fonds.json fonts items thumbs badges` (badges vide pour l'instant : créer `tiktok-gen/assets/badges/.gitkeep`).

- [ ] **Étape 7 : commit**

```bash
git add vitest.config.ts .gitignore package.json tiktok-gen
git commit -m "feat(tiktok-gen): squelette et build des assets"
```

---

### Task 2 : Logique pure de la roulette

**Files:**
- Create: `tiktok-gen/src/roulette.js`, `tiktok-gen/src/roulette.test.mjs`

**Interfaces:**
- Produces :
  ```js
  export const LARGEUR = 1080, HAUTEUR = 1920, CENTRE_X = 540, CENTRE_Y = 960;
  export const FPS = 30;
  export function calculerRoulette({ nbObjets, indexCible, vitesse, espacement, nbPassages, largeurFlash = 4 })
    // → { periodeTour, duree, vitessePx, longueurBande, instantsCentrage: number[], instantsTics: Array<{ t, index, estCible }>, fenetrePauseMs, demiFlash }
  export function positionsA(t, r, cfg)     // → Array<{ index, x }>  (x = centre de l'objet, ordre par index)
  export function estFlash(t, r)            // → boolean
  export function tempsBoucle(t, r)         // → t mod duree
  ```
  Convention : objet `i` centré à `t = ((i − indexCible + nbObjets/2) mod nbObjets) / vitesse + k·periodeTour`. La cible est donc centrée à `(k + ½)·periodeTour`.

- [ ] **Étape 1 : tests (échouent)**

```js
import { describe, expect, it } from "vitest";
import { calculerRoulette, positionsA, estFlash, tempsBoucle, CENTRE_X, FPS } from "./roulette.js";

const CFG = { nbObjets: 8, indexCible: 2, vitesse: 2, espacement: 500, nbPassages: 3, largeurFlash: 4 };

describe("calculerRoulette", () => {
  it("période, durée et vitesse en px", () => {
    const r = calculerRoulette(CFG);
    expect(r.periodeTour).toBe(4);
    expect(r.duree).toBe(12);
    expect(r.vitessePx).toBe(1000);
    expect(r.longueurBande).toBe(4000);
  });
  it("la cible est centrée une fois par tour, au milieu du tour", () => {
    expect(calculerRoulette(CFG).instantsCentrage).toEqual([2, 6, 10]);
  });
  it("un tic par objet, la cible marquée", () => {
    const r = calculerRoulette(CFG);
    expect(r.instantsTics).toHaveLength(24);
    expect(r.instantsTics[0]).toEqual({ t: 0, index: 6, estCible: false });
    expect(r.instantsTics.filter((x) => x.estCible).map((x) => x.t)).toEqual([2, 6, 10]);
    expect(r.instantsTics.map((x) => x.t)).toEqual([...r.instantsTics.map((x) => x.t)].sort((a, b) => a - b));
  });
  it("fenêtre de pause et demi-flash", () => {
    const r = calculerRoulette(CFG);
    expect(r.demiFlash).toBeCloseTo(2 / FPS);
    expect(r.fenetrePauseMs).toBeCloseTo((4 / FPS) * 1000);
  });
});

describe("positionsA", () => {
  it("la cible est à CENTRE_X à l'instant de centrage", () => {
    const r = calculerRoulette(CFG);
    const x = positionsA(2, r, CFG).find((p) => p.index === 2).x;
    expect(x).toBeCloseTo(CENTRE_X);
  });
  it("les objets sont espacés d'un espacement et dans la bande", () => {
    const r = calculerRoulette(CFG);
    const xs = positionsA(0.3, r, CFG).map((p) => p.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeCloseTo(500);
    for (const x of xs) { expect(x).toBeGreaterThanOrEqual(CENTRE_X - 2000); expect(x).toBeLessThan(CENTRE_X + 2000); }
  });
  it("ça avance vers la droite", () => {
    const r = calculerRoulette(CFG);
    const a = positionsA(0.1, r, CFG).find((p) => p.index === 6).x;
    const b = positionsA(0.2, r, CFG).find((p) => p.index === 6).x;
    expect(b - a).toBeCloseTo(100);
  });
  it("la boucle est parfaite", () => {
    const r = calculerRoulette(CFG);
    expect(positionsA(r.duree, r, CFG)).toEqual(positionsA(0, r, CFG).map((p) => ({ ...p, x: expect.closeTo(p.x, 6) })));
  });
});

describe("estFlash / tempsBoucle", () => {
  it("flash seulement autour des centrages", () => {
    const r = calculerRoulette(CFG);
    expect(estFlash(2, r)).toBe(true);
    expect(estFlash(2 + 1.9 / FPS, r)).toBe(true);
    expect(estFlash(2 + 2.1 / FPS, r)).toBe(false);
    expect(estFlash(0, r)).toBe(false);
    expect(estFlash(6.02, r)).toBe(true);
  });
  it("tempsBoucle replie sur la durée", () => {
    const r = calculerRoulette(CFG);
    expect(tempsBoucle(13, r)).toBeCloseTo(1);
  });
});
```

- [ ] **Étape 2 : vérifier l'échec** — `npx vitest run --maxWorkers=4 tiktok-gen/src/roulette` → FAIL.

- [ ] **Étape 3 : implémenter `roulette.js`**

```js
/** Logique pure de la roulette : aucune dépendance au DOM. Temps en secondes. */
export const LARGEUR = 1080, HAUTEUR = 1920, CENTRE_X = 540, CENTRE_Y = 960;
export const FPS = 30;

export function calculerRoulette({ nbObjets, indexCible, vitesse, espacement, nbPassages, largeurFlash = 4 }) {
  const periodeTour = nbObjets / vitesse;
  const duree = nbPassages * periodeTour;
  const vitessePx = vitesse * espacement;
  const longueurBande = nbObjets * espacement;
  const decalage = nbObjets / 2;
  const instantsCentrage = Array.from({ length: nbPassages }, (_, k) => (k + 0.5) * periodeTour);
  const instantsTics = [];
  for (let k = 0; k < nbPassages; k++) {
    for (let i = 0; i < nbObjets; i++) {
      const rang = ((i - indexCible + decalage) % nbObjets + nbObjets) % nbObjets;
      instantsTics.push({ t: rang / vitesse + k * periodeTour, index: i, estCible: i === indexCible });
    }
  }
  instantsTics.sort((a, b) => a.t - b.t);
  const demiFlash = largeurFlash / 2 / FPS;
  return {
    periodeTour, duree, vitessePx, longueurBande, instantsCentrage, instantsTics,
    demiFlash, fenetrePauseMs: (largeurFlash / FPS) * 1000,
  };
}

export function positionsA(t, r, { nbObjets, indexCible, espacement }) {
  const L = r.longueurBande;
  const out = [];
  for (let i = 0; i < nbObjets; i++) {
    // x relatif au centre, replié dans [−L/2, L/2)
    let rel = (i - indexCible + nbObjets / 2) * espacement - r.vitessePx * t;
    rel = ((rel % L) + L) % L;            // [0, L)
    rel = -rel;                            // centré à rel = 0 ⇒ passe par le centre
    rel = ((rel + L / 2) % L + L) % L - L / 2;
    out.push({ index: i, x: CENTRE_X + rel });
  }
  return out;
}

export function estFlash(t, r) {
  const tb = tempsBoucle(t, r);
  return r.instantsCentrage.some((c) => Math.abs(tb - c) <= r.demiFlash);
}

export function tempsBoucle(t, r) {
  return ((t % r.duree) + r.duree) % r.duree;
}
```

Note : dans `positionsA`, l'objet `i` est au centre quand `(i − indexCible + nbObjets/2)·espacement − vitessePx·t ≡ 0 (mod L)`, ce qui correspond bien à la convention des tics. Si le test « avance vers la droite » échoue avec un signe inversé, corriger le signe de `rel` — la direction attendue est **gauche → droite**.

- [ ] **Étape 4 : vérifier** — PASS.

- [ ] **Étape 5 : commit** — `git commit -m "feat(tiktok-gen): logique pure de la roulette"`.

---

### Task 3 : Catalogue et réglages (modules purs)

**Files:**
- Create: `tiktok-gen/src/catalogue.js`, `src/catalogue.test.mjs`, `src/reglages.js`, `src/reglages.test.mjs`

**Interfaces:**
- `catalogue.js` : `filtrerCatalogue(entrees, { categorie = "", recherche = "" })`, `tirerAleatoire(entrees, n, alea = Math.random)` (n objets distincts), `CATEGORIES` (7, ordre du jeu), `chargerCatalogue(fetchFn = fetch)` → `Promise<entrees>`.
- `reglages.js` :
  ```js
  export const REGLAGES_DEFAUT = { fond: "foire-chatou", fondPerso: null, objets: [], cible: null, vitesse: 2.5, espacement: 520, nbPassages: 3, largeurFlash: 4, consigne: "Mets pause sur …", son: true };
  export function normaliserReglages(brut)      // clamp : vitesse [1.5,4], espacement [400,700], passages [2,4], flash [2,8], objets tableau d'ids, cible ∈ objets sinon null
  export function chargerReglages(storage)      // JSON localStorage "broc-tiktok-gen" → normalisé
  export function sauverReglages(storage, r)
  export function consigneParDefaut(nomCible)   // "Mets pause sur la lampe !" → `Mets pause sur ${nom} !`
  ```

- [ ] **Étape 1 : tests (échouent)**

```js
// catalogue.test.mjs
import { describe, expect, it } from "vitest";
import { filtrerCatalogue, tirerAleatoire, CATEGORIES } from "./catalogue.js";
const E = [
  { id: "a", nom: "Lampe Art déco", categorie: "Maison" },
  { id: "b", nom: "Vinyle", categorie: "Musique" },
  { id: "c", nom: "Lampe de bureau", categorie: "Maison" },
];
describe("filtrerCatalogue", () => {
  it("par catégorie", () => expect(filtrerCatalogue(E, { categorie: "Musique" }).map((e) => e.id)).toEqual(["b"]));
  it("par recherche sans accents ni casse", () => expect(filtrerCatalogue(E, { recherche: "LAMPE ART" }).map((e) => e.id)).toEqual(["a"]));
  it("sans filtre, tout", () => expect(filtrerCatalogue(E, {})).toHaveLength(3));
});
describe("tirerAleatoire", () => {
  it("n objets distincts, déterministe avec un aléa fixé", () => {
    const ids = tirerAleatoire(E, 2, () => 0.99).map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });
  it("plafonné à la taille du catalogue", () => expect(tirerAleatoire(E, 10, Math.random)).toHaveLength(3));
});
it("7 catégories dans l'ordre du jeu", () => expect(CATEGORIES[0]).toBe("Musique") && expect(CATEGORIES).toHaveLength(7));
```

```js
// reglages.test.mjs
import { describe, expect, it } from "vitest";
import { REGLAGES_DEFAUT, normaliserReglages, chargerReglages, sauverReglages, consigneParDefaut } from "./reglages.js";
const memoire = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
describe("normaliserReglages", () => {
  it("borne les valeurs", () => {
    const r = normaliserReglages({ vitesse: 9, espacement: 10, nbPassages: 0, largeurFlash: 100 });
    expect(r.vitesse).toBe(4); expect(r.espacement).toBe(400); expect(r.nbPassages).toBe(2); expect(r.largeurFlash).toBe(8);
  });
  it("la cible doit faire partie des objets", () => {
    expect(normaliserReglages({ objets: ["a"], cible: "z" }).cible).toBeNull();
    expect(normaliserReglages({ objets: ["a"], cible: "a" }).cible).toBe("a");
  });
  it("complète avec les défauts", () => expect(normaliserReglages({}).consigne).toBe(REGLAGES_DEFAUT.consigne));
});
describe("localStorage", () => {
  it("aller-retour", () => {
    const s = memoire();
    sauverReglages(s, { ...REGLAGES_DEFAUT, vitesse: 3 });
    expect(chargerReglages(s).vitesse).toBe(3);
  });
  it("stockage vide ou corrompu → défauts", () => {
    const s = memoire(); s.setItem("broc-tiktok-gen", "{oops");
    expect(chargerReglages(s)).toEqual(REGLAGES_DEFAUT);
    expect(chargerReglages(memoire())).toEqual(REGLAGES_DEFAUT);
  });
});
it("consigneParDefaut", () => expect(consigneParDefaut("la lampe")).toBe("Mets pause sur la lampe !"));
```

- [ ] **Étape 2 : échec vérifié.**

- [ ] **Étape 3 : implémenter**

```js
// catalogue.js
export const CATEGORIES = ["Musique", "Jeux & Loisirs", "Livres & Papeterie", "Mode", "Maison", "Objets d'art", "Bricolage"];
const plat = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function filtrerCatalogue(entrees, { categorie = "", recherche = "" } = {}) {
  const q = plat(recherche.trim());
  return entrees.filter((e) => (!categorie || e.categorie === categorie) && (!q || plat(e.nom).includes(q)));
}
export function tirerAleatoire(entrees, n, alea = Math.random) {
  const reste = [...entrees], out = [];
  while (out.length < n && reste.length) out.push(reste.splice(Math.floor(alea() * reste.length), 1)[0]);
  return out;
}
export async function chargerCatalogue(fetchFn = fetch) {
  const rep = await fetchFn("assets/catalogue.json");
  if (!rep.ok) throw new Error(`catalogue.json : ${rep.status}`);
  return rep.json();
}
```

```js
// reglages.js
export const CLE_STOCKAGE = "broc-tiktok-gen";
export const REGLAGES_DEFAUT = Object.freeze({
  fond: "foire-chatou", fondPerso: null, objets: [], cible: null,
  vitesse: 2.5, espacement: 520, nbPassages: 3, largeurFlash: 4,
  consigne: "Mets pause sur …", son: true,
});
const borne = (v, min, max, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
export function normaliserReglages(brut = {}) {
  const objets = Array.isArray(brut.objets) ? brut.objets.filter((x) => typeof x === "string") : [];
  return {
    fond: typeof brut.fond === "string" ? brut.fond : REGLAGES_DEFAUT.fond,
    fondPerso: typeof brut.fondPerso === "string" ? brut.fondPerso : null,
    objets,
    cible: objets.includes(brut.cible) ? brut.cible : null,
    vitesse: borne(brut.vitesse, 1.5, 4, REGLAGES_DEFAUT.vitesse),
    espacement: borne(brut.espacement, 400, 700, REGLAGES_DEFAUT.espacement),
    nbPassages: Math.round(borne(brut.nbPassages, 2, 4, REGLAGES_DEFAUT.nbPassages)),
    largeurFlash: Math.round(borne(brut.largeurFlash, 2, 8, REGLAGES_DEFAUT.largeurFlash)),
    consigne: typeof brut.consigne === "string" ? brut.consigne : REGLAGES_DEFAUT.consigne,
    son: brut.son === undefined ? REGLAGES_DEFAUT.son : Boolean(brut.son),
  };
}
export function chargerReglages(storage) {
  try { return normaliserReglages(JSON.parse(storage.getItem(CLE_STOCKAGE) ?? "{}")); }
  catch { return { ...REGLAGES_DEFAUT }; }
}
export function sauverReglages(storage, r) { storage.setItem(CLE_STOCKAGE, JSON.stringify(r)); }
export const consigneParDefaut = (nomCible) => `Mets pause sur ${nomCible} !`;
```

Note : `chargerReglages` sur stockage vide doit renvoyer un objet **égal** à `REGLAGES_DEFAUT` (`toEqual`) — `normaliserReglages({})` le fait déjà ; le `fondPerso` (data-URL d'une photo importée) n'est **pas** persisté s'il dépasse 2 Mo (le tronquer à `null` dans `sauverReglages`).

- [ ] **Étape 4 : PASS, puis commit** — `git commit -m "feat(tiktok-gen): catalogue, filtres et réglages persistés"`.

---

### Task 4 : Images, silhouette et rendu d'une frame

**Files:**
- Create: `tiktok-gen/src/images.js`, `tiktok-gen/src/rendu.js`
- Modify: `tiktok-gen/index.html`, `tiktok-gen/styles.css`, créer `tiktok-gen/src/ui.js` (version minimale pour voir l'aperçu)

**Interfaces:**
- `images.js` :
  ```js
  export function chargerImage(url) → Promise<HTMLImageElement>          // decode(), rejette avec l'url dans le message
  export function creerSilhouette(img, echelle = 1.15) → HTMLCanvasElement // masque alpha rempli #000 à 85 %, taille img×echelle
  export class CacheImages { async objet(id) ; async fond(nomOuDataUrl) ; async silhouette(id) }  // urls : assets/items/<id>.webp, assets/fonds/<nom>.webp
  ```
- `rendu.js` :
  ```js
  export const HAUTEUR_OBJET = 420;
  export function dessinerFrame(ctx, t, scene)   // scene = { r, cfg, fond: Image, objets: Image[] (ordre cfg.objets), silhouette: Canvas, consigne, badges: {appStore, googlePlay}, flashActif: boolean }
  ```
  `dessinerFrame` dessine : fond en cover + vignette radiale sombre (alpha 0 au centre → 0.45 aux bords), bandeau de consigne en haut (Cinzel 64 px, brass-100, ombre), silhouette centrée sur (CENTRE_X, CENTRE_Y), objets à `positionsA(t)` hauteur `HAUTEUR_OBJET` (ratio conservé), puis si `flashActif` l'overlay (Task 5). Ne dessine que les objets dont `|x − CENTRE_X| < LARGEUR/2 + espacement`.

- [ ] **Étape 1 : `images.js`**

```js
export function chargerImage(url) {
  return new Promise((resoudre, rejeter) => {
    const img = new Image();
    img.onload = () => resoudre(img);
    img.onerror = () => rejeter(new Error(`image introuvable : ${url}`));
    img.src = url;
  });
}
export function creerSilhouette(img, echelle = 1.15) {
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * echelle);
  c.height = Math.round(img.naturalHeight * echelle);
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}
export class CacheImages {
  #cache = new Map();
  #memo(cle, fabrique) { if (!this.#cache.has(cle)) this.#cache.set(cle, fabrique()); return this.#cache.get(cle); }
  objet(id) { return this.#memo(`objet:${id}`, () => chargerImage(`assets/items/${id}.webp`)); }
  fond(nom) { return this.#memo(`fond:${nom}`, () => chargerImage(nom.startsWith("data:") ? nom : `assets/fonds/${nom}.webp`)); }
  silhouette(id) { return this.#memo(`silh:${id}`, async () => creerSilhouette(await this.objet(id))); }
}
```

- [ ] **Étape 2 : `rendu.js`** (partie scène ; l'overlay est ajouté en Task 5)

```js
import { CENTRE_X, CENTRE_Y, LARGEUR, HAUTEUR, positionsA } from "./roulette.js";
export const HAUTEUR_OBJET = 420;
export const COULEURS = { laiton: "#C5A059", laitonClair: "#F1E3BF", nuit: "#14181C" };

function dessinerCover(ctx, img) {
  const k = Math.max(LARGEUR / img.naturalWidth, HAUTEUR / img.naturalHeight);
  const w = img.naturalWidth * k, h = img.naturalHeight * k;
  ctx.drawImage(img, (LARGEUR - w) / 2, (HAUTEUR - h) / 2, w, h);
  const g = ctx.createRadialGradient(CENTRE_X, CENTRE_Y, 300, CENTRE_X, CENTRE_Y, 1100);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
}
function dessinerConsigne(ctx, texte) {
  if (!texte) return;
  ctx.save();
  ctx.fillStyle = "rgba(20,24,28,0.55)"; ctx.fillRect(0, 300, LARGEUR, 150);
  ctx.font = "600 64px Cinzel"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 12;
  ctx.fillStyle = COULEURS.laitonClair; ctx.fillText(texte, CENTRE_X, 375, LARGEUR - 80);
  ctx.restore();
}
function dessinerCentre(ctx, img, x, hauteur) {
  const w = img.width * (hauteur / img.height);
  ctx.drawImage(img, x - w / 2, CENTRE_Y - hauteur / 2, w, hauteur);
}
export function dessinerFrame(ctx, t, scene) {
  const { r, cfg, fond, objets, silhouette, consigne, flashActif } = scene;
  dessinerCover(ctx, fond);
  dessinerConsigne(ctx, consigne);
  if (silhouette) {
    ctx.save(); ctx.shadowColor = COULEURS.laiton; ctx.shadowBlur = 18;
    dessinerCentre(ctx, silhouette, CENTRE_X, HAUTEUR_OBJET * 1.15); ctx.restore();
  }
  for (const { index, x } of positionsA(t, r, cfg)) {
    if (Math.abs(x - CENTRE_X) > LARGEUR / 2 + cfg.espacement) continue;
    const img = objets[index]; if (img) dessinerCentre(ctx, img, x, HAUTEUR_OBJET);
  }
  if (flashActif) scene.dessinerOverlay?.(ctx, scene);
}
```

- [ ] **Étape 3 : `ui.js` minimal + CSS pour voir l'aperçu**

`ui.js` (provisoire, remplacé en Task 7) : charge le catalogue, prend les 8 premiers objets, cible = le 3ᵉ, fond `foire-chatou`, construit `cfg = { nbObjets: 8, indexCible: 2, vitesse: 2.5, espacement: 520, nbPassages: 3, largeurFlash: 4 }`, `r = calculerRoulette(cfg)`, charge images/silhouette via `CacheImages`, puis boucle `requestAnimationFrame` : `t = tempsBoucle((now − t0)/1000, r)`, `dessinerFrame(ctx, t, { …, flashActif: estFlash(t, r) })`. Charger les fontes avant : `await Promise.all([new FontFace("Cinzel","url(assets/fonts/cinzel.woff2)").load(), new FontFace("Verve Shadow","url(assets/fonts/VerveShadow.ttf)").load()]).then(fs => fs.forEach(f => document.fonts.add(f)))`.

`styles.css` : `body{margin:0;background:#14181C;color:#F1E3BF;font-family:system-ui}` ; `#apercu{display:flex;justify-content:center}` ; `#scene{width:min(100vw,45vh);height:auto;aspect-ratio:9/16}`.

- [ ] **Étape 4 : vérification manuelle** — `npm run tiktok:serve`, ouvrir http://localhost:3200 : fond, consigne, silhouette laiton au centre, 8 objets qui défilent de gauche à droite, la cible (3ᵉ) se cale exactement dans la silhouette, la boucle ne saute pas. Prendre une capture Playwright ou un œil humain ; corriger le signe de direction si besoin.

- [ ] **Étape 5 : commit** — `git commit -m "feat(tiktok-gen): rendu de la scène et aperçu"`.

---

### Task 5 : Overlay promo et badges

**Files:**
- Create: `tiktok-gen/assets/badges/app-store.svg`, `google-play.svg`, `tiktok-gen/src/overlay.js`
- Modify: `tiktok-gen/src/rendu.js` (brancher `dessinerOverlay`), `README.md` (remplacer les badges)

**Interfaces:**
- `overlay.js` : `export function dessinerOverlay(ctx, { badges })` — voile `rgba(20,24,28,0.45)` plein cadre **sauf** un disque clair de rayon 330 px au centre (pour laisser la cible calée visible, via `ctx.clip` inversé ou dégradé radial), « BROC » Verve Shadow 260 px laiton à y=620, « Le jeu de brocante » Cinzel 600 72 px laiton clair à y=790, « Disponible gratuitement sur » Cinzel 56 px à y=1560, badges 400×118 côte à côte centrés à y=1680.
- Badges : SVG **placeholder** dessinés à la main (rectangle noir arrondi, bord gris, texte blanc « Télécharger dans l'App Store » / « Disponible sur Google Play », police system) — le README indique de les **remplacer par les badges officiels** (Apple : developer.apple.com/app-store/marketing/guidelines, Google : play.google.com/intl/fr/badges) en gardant les mêmes noms de fichier.

- [ ] **Étape 1 : badges placeholder** (SVG 400×118, `viewBox="0 0 400 118"`, `rx=16`, fond `#000`, stroke `#A6A6A6` 2 px, textes `font-family="system-ui"` 30 px `#fff`, `text-anchor="middle"`).

- [ ] **Étape 2 : `overlay.js`**

```js
import { CENTRE_X, CENTRE_Y, LARGEUR, HAUTEUR } from "./roulette.js";
import { COULEURS } from "./rendu.js";
export function dessinerOverlay(ctx, { badges }) {
  ctx.save();
  const g = ctx.createRadialGradient(CENTRE_X, CENTRE_Y, 300, CENTRE_X, CENTRE_Y, 420);
  g.addColorStop(0, "rgba(20,24,28,0)"); g.addColorStop(1, "rgba(20,24,28,0.6)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 24;
  ctx.font = "260px 'Verve Shadow'"; ctx.fillStyle = COULEURS.laiton; ctx.fillText("BROC", CENTRE_X, 620);
  ctx.font = "600 72px Cinzel"; ctx.fillStyle = COULEURS.laitonClair; ctx.fillText("Le jeu de brocante", CENTRE_X, 790);
  ctx.font = "500 56px Cinzel"; ctx.fillText("Disponible gratuitement sur", CENTRE_X, 1560);
  const w = 400, h = 118, ecart = 40;
  if (badges?.appStore) ctx.drawImage(badges.appStore, CENTRE_X - w - ecart / 2, 1680 - h / 2, w, h);
  if (badges?.googlePlay) ctx.drawImage(badges.googlePlay, CENTRE_X + ecart / 2, 1680 - h / 2, w, h);
  ctx.restore();
}
```

Dans `rendu.js`, importer et appeler `dessinerOverlay(ctx, scene)` quand `flashActif` (retirer le crochet `scene.dessinerOverlay?.`). Attention à l'import circulaire `COULEURS` : déplacer `COULEURS` dans `roulette.js`… non — créer `src/theme.js` exportant `COULEURS`, importé par les deux.

- [ ] **Étape 3 : vérification manuelle** — dans `ui.js` provisoire, forcer `flashActif: true` un instant : l'overlay se lit, la cible reste visible au centre, « BROC » est bien en Verve Shadow (comparer au menu du jeu). Puis rétablir `estFlash`. Vérifier qu'en lecture normale le flash se voit à peine (≈130 ms) pile au calage.

- [ ] **Étape 4 : commit** — `git commit -m "feat(tiktok-gen): overlay promo au calage de la cible"`.

---

### Task 6 : Son de roulette

**Files:**
- Create: `tiktok-gen/src/son.js`

**Interfaces:**
```js
export class SonRoulette {
  constructor()                      // AudioContext paresseux (créé au premier geste utilisateur)
  get destination()                  // MediaStreamAudioDestinationNode (pour l'enregistreur)
  async demarrer()                   // resume()
  planifierTour(r, tDebutCtx)        // planifie tous les tics de r.instantsTics à tDebutCtx + t
  planifierBoucleInfinie(r, tDebutCtx) // planifie le tour courant et le suivant à chaque tour écoulé (setInterval périodeTour)
  arreter()                          // annule les timers, coupe le gain
  set active(bool)                   // mute (gain 0) sans changer la planification
}
```
Tic : oscillateur `square` 1800 Hz, enveloppe 0 → 0.35 en 2 ms → 0 en 35 ms, via un filtre passe-bande Q=6 à 2200 Hz (claquement sec de picot). Ding sur `estCible` : deux sinus 1320 Hz + 1980 Hz, décroissance 450 ms, gain 0.25. Sortie vers `ctx.destination` **et** vers `destination` (MediaStreamDestination) via un même `GainNode` maître.

- [ ] **Étape 1 : implémenter `son.js`** avec exactement l'interface ci-dessus (planification par `oscillator.start(t)` / `stop(t + durée)`, sans `setTimeout` par tic ; `planifierBoucleInfinie` utilise un seul `setInterval(periodeTour × 1000)` qui replanifie le tour suivant).

- [ ] **Étape 2 : brancher dans `ui.js` provisoire** — un bouton « ▶︎ Son » (les contextes audio iOS exigent un geste) appelle `demarrer()` puis `planifierBoucleInfinie(r, ctx.currentTime + 0.05)` en synchronisant `t0` de l'animation sur le même instant : `t0 = performance.now() + 50` — l'animation et le son partent du même zéro.

- [ ] **Étape 3 : vérification manuelle** — un tic par objet qui franchit le centre, ding sur la cible, en phase à l'œil. `son.active = false` coupe le son.

- [ ] **Étape 4 : commit** — `git commit -m "feat(tiktok-gen): tics de roulette et ding synthétisés"`.

---

### Task 7 : Interface complète et persistance

**Files:**
- Modify: `tiktok-gen/index.html`, `styles.css`, réécrire `src/ui.js` ; Create: `src/apercu.js` (boucle d'animation)

**Interfaces:**
- `apercu.js` :
  ```js
  export class Apercu {
    constructor(canvas, cache, son)
    async charger(reglages, catalogue)   // → construit scene (fond, objets, silhouette, badges, consigne) et cfg/r ; renvoie { cfg, r } ; lance les chargements manquants
    jouer()  / arreter()                 // rAF + son.planifierBoucleInfinie
    dessinerA(t)                         // une frame à t (utilisé par l'enregistreur)
    get r() ; get scene()
  }
  ```
- Convention : `cfg` dérive des réglages : `nbObjets = objets.length`, `indexCible = objets.indexOf(cible)`, `vitesse`, `espacement`, `nbPassages`, `largeurFlash`. Si `objets.length < 2` ou `cible == null` → aperçu affiche un message « Choisis au moins 2 objets et une cible ».

- [ ] **Étape 1 : HTML des panneaux** (sous l'aperçu, dans l'ordre)

```html
<section class="panneau" id="p-fond">
  <h2>Fond</h2>
  <div class="grille" id="grille-fonds"></div>
  <label class="bouton">Importer une photo <input type="file" accept="image/*" id="fond-perso" hidden></label>
</section>
<section class="panneau" id="p-objets">
  <h2>Objets <span id="compte-objets"></span></h2>
  <div class="ligne"><select id="filtre-categorie"><option value="">Toutes</option></select><input id="recherche" type="search" placeholder="Rechercher"></div>
  <div class="ligne"><button id="aleatoire">Aléatoire ×8</button><button id="vider">Vider</button></div>
  <div class="grille" id="grille-objets"></div>
  <h3>Sélection (appuie pour choisir la cible)</h3>
  <div class="grille" id="grille-selection"></div>
</section>
<section class="panneau" id="p-reglages">
  <h2>Réglages</h2>
  <label>Vitesse <output id="v-vitesse"></output><input type="range" id="vitesse" min="1.5" max="4" step="0.1"></label>
  <label>Espacement <output id="v-espacement"></output><input type="range" id="espacement" min="400" max="700" step="10"></label>
  <label>Passages <output id="v-passages"></output><input type="range" id="nbPassages" min="2" max="4" step="1"></label>
  <label>Largeur du flash (images) <output id="v-flash"></output><input type="range" id="largeurFlash" min="2" max="8" step="1"></label>
  <label>Consigne <input type="text" id="consigne" maxlength="40"></label>
  <label><input type="checkbox" id="son"> Son</label>
  <p class="info">Durée <b id="info-duree"></b> · fenêtre de pause <b id="info-fenetre"></b></p>
</section>
<section class="panneau" id="p-export">
  <button class="principal" id="enregistrer">Enregistrer</button>
  <progress id="progression" max="1" value="0" hidden></progress>
  <button class="principal" id="partager" hidden>Partager</button>
  <p id="message" role="status"></p>
</section>
```

- [ ] **Étape 2 : `ui.js`** — au chargement : fontes, `catalogue = await chargerCatalogue()`, `fonds = await (await fetch("assets/fonds.json")).json()`, `reglages = chargerReglages(localStorage)`. Remplir les grilles (vignettes `assets/thumbs/<id>.webp`, fonds `assets/fonds/<nom>.webp` en `<img loading="lazy">`), appliquer les réglages aux champs. Chaque changement → `normaliserReglages` → `sauverReglages` → `apercu.charger(reglages, catalogue)` → mise à jour des infos (`duree.toFixed(1)` s, `fenetrePauseMs|0` ms). « Aléatoire ×8 » : `tirerAleatoire(filtré, 8)`, garde la cible si elle est encore dedans sinon prend le 1ᵉʳ. Tap sur une vignette de la sélection → devient la cible (classe `.cible`) et la consigne, si elle vaut encore la valeur par défaut « Mets pause sur … », devient `consigneParDefaut(nom)` — le nom est mis en minuscule initiale sans article (« aquarelle marine XIXe »). Import photo : `FileReader.readAsDataURL` → `reglages.fondPerso`, `fond = "perso"`. Premier geste utilisateur → `son.demarrer()` puis `apercu.jouer()`.

- [ ] **Étape 3 : CSS** — panneaux en colonne, grilles `grid-template-columns: repeat(auto-fill, minmax(72px, 1fr))`, vignette sélectionnée avec liseré laiton, cible avec liseré épais + « ◎ », boutons ≥ 44 px, `padding-bottom: env(safe-area-inset-bottom)`.

- [ ] **Étape 4 : vérification manuelle (desktop + iPhone via l'URL Vercel si déjà déployé, sinon Safari en mode responsive)** — choisir un fond, 8 objets aléatoires, changer la cible : la silhouette change ; vitesse à 4 : l'info « fenêtre de pause » se recalcule ; recharger la page : tout est restauré.

- [ ] **Étape 5 : commit** — `git commit -m "feat(tiktok-gen): interface de composition et réglages persistés"`.

---

### Task 8 : Enregistrement mp4 et partage

**Files:**
- Create: `tiktok-gen/src/enregistreur.js` ; Modify: `src/ui.js` (bouton Enregistrer/Partager), `README.md`

**Interfaces:**
```js
export function capacitesEnregistrement()   // → { ok: boolean, mime: "video/mp4"|"video/webm"|null, raison?: string }
export async function enregistrer({ canvas, apercu, son, onProgression })  // → { blob, nomFichier, fpsMoyen }
export async function partager(blob, nomFichier)  // navigator.share si canShare({files}) sinon télécharge via <a download>
```
Déroulé de `enregistrer` : `apercu.arreter()` ; `flux = canvas.captureStream(30)` ; ajouter `son.destination.stream.getAudioTracks()[0]` au flux ; `rec = new MediaRecorder(flux, { mimeType, videoBitsPerSecond: 12_000_000 })` ; `rec.start(250)` ; `t0 = performance.now() + 100`, `son.planifierTour(r, son.contexteCourant + 0.1)` ; boucle rAF : `t = (now − t0)/1000` ; si `t < 0` dessiner `0` ; sinon `apercu.dessinerA(t)`, compter les frames, `onProgression(t / r.duree)` ; à `t ≥ r.duree` dessiner la frame `duree` puis `rec.stop()` ; résoudre avec `new Blob(morceaux, { type: mimeType })`, `nomFichier = broc-roulette-${cible}.${mime === "video/mp4" ? "mp4" : "webm"}`, `fpsMoyen = frames / duree`. Ensuite `apercu.jouer()`.

Choix du mime : le premier supporté de `["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"]` ; si aucun, `ok:false, raison:"Ce navigateur ne sait pas enregistrer la vidéo — utilise l'enregistrement d'écran iOS."`.

- [ ] **Étape 1 : implémenter `enregistreur.js`** exactement comme ci-dessus.

- [ ] **Étape 2 : brancher dans `ui.js`** — « Enregistrer » : si `!capacites.ok` → message et sortie ; sinon désactiver les panneaux, afficher `<progress>`, lancer, puis afficher « Partager » ; si `fpsMoyen < 25` → message « Enregistrement saccadé (xx fps) : réenregistre en fermant les autres apps ». « Partager » → `partager()`. Si `navigator.share` absent → le blob est téléchargé.

- [ ] **Étape 3 : vérification desktop** — Chrome/Safari macOS : le fichier produit fait `duree` s, se lit, contient le son, boucle sans saut (l'ouvrir dans QuickTime, activer la lecture en boucle), le flash apparaît au calage. `ffprobe` : `ffprobe -v error -show_entries stream=codec_name,r_frame_rate -of csv fichier` → `h264`/`aac` sur Safari.

- [ ] **Étape 4 : commit** — `git commit -m "feat(tiktok-gen): enregistrement mp4 et partage"`.

---

### Task 9 : Déploiement Vercel et recette iPhone

**Files:**
- Modify: `tiktok-gen/README.md` (procédure), aucune modification de `vercel.json` racine (vitrine intouchée).

- [ ] **Étape 1 : créer le projet Vercel** (à la main par Guillaume, guidé par le README) : Import du repo → Root Directory `tiktok-gen` → cocher « Include source files outside of the Root Directory » → Framework « Other » → déployer. Settings → Deployment Protection → « Vercel Authentication » (ou mot de passe). Vérifier que `https://<projet>.vercel.app/assets/catalogue.json` répond.

- [ ] **Étape 2 : recette iPhone** (liste dans le README) :
  1. Ajouter à l'écran d'accueil ; l'app s'ouvre plein écran.
  2. Composer : fond, 8 objets, cible ; l'aperçu tourne à 60 fps, son au premier tap.
  3. Enregistrer : progression 0→100 % en `duree` s, pas de message « saccadé ».
  4. Partager → Enregistrer la vidéo : dans Photos, mp4 de `duree` s **avec son**, boucle propre, pause au calage = overlay visible.
  5. Partager → TikTok : la vidéo est acceptée telle quelle.
  6. Réglages conservés après fermeture de l'app.
  7. Importer une photo de la pellicule comme fond.

- [ ] **Étape 3 : consigner les écarts** trouvés en recette comme tâches correctives, puis commit final `docs(tiktok-gen): procédure de déploiement et recette`.

---

## Auto-revue

- **Couverture spec** : forme/hébergement (T1, T9), rendu canvas déterministe (T2, T4), export/partage (T8), plusieurs passages + boucle parfaite (T2), flash uniquement au centrage + cible visible (T2, T5), consigne (T4, T7), son mixé (T6, T8), vitesse en objets/s + fenêtre affichée (T2, T7), import photo (T7), erreurs (T8 : mime absent, fps bas, share absent ; T1 : images manquantes), tests unitaires (T1-T3), recette manuelle (T9). Badges officiels : placeholder + consigne de remplacement (T5).
- **Cohérence des noms** : `calculerRoulette/positionsA/estFlash/tempsBoucle` (T2) utilisés en T4/T7/T8 ; `CacheImages.objet/fond/silhouette` (T4) en T7 ; `SonRoulette.destination/planifierTour/planifierBoucleInfinie` (T6) en T7/T8 ; `Apercu.charger/jouer/arreter/dessinerA/r` (T7) en T8 ; `COULEURS` déplacé dans `theme.js` (T5) — mettre à jour l'import de `rendu.js` au même moment.
