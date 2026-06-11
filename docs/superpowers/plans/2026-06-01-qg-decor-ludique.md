# QG — Refonte ludique (panorama + courrier) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer la page QG en un panorama horizontal swipable (cabinet de brocanteur avec porte centrale, bureau gauche, coin repos droite), introduire un système de courrier remplaçant le bandeau huissier, et mettre en place une pipeline Gemini pour générer les assets.

**Architecture :** Scène multi-calques (extérieur + fond + objets PNG transparents) dans un conteneur scroll-snap horizontal. État `state.courriers: Courrier[]` ajouté, `state.dernierHuissier` supprimé via migration au chargement. Pipeline d'assets calquée sur `scripts/generate-brocante-images.mjs`.

**Tech Stack :** Next.js 16 (App Router) + React 19 + TypeScript, `@google/genai` pour la génération d'images, `BottomSheet` (composant maison) pour les overlays, CSS scroll-snap natif pour le swipe.

**Approche de test :** ce projet ne dispose pas d'infrastructure de test. Pour ce plan :
- Logique pure (migration courrier, helpers) : tests écrits en TypeScript et exécutés via Node `--test` avec `tsx` (Task 1 installe `tsx`).
- Composants React / pipeline / visuel : vérification par `npm run build` (type-check + lint) + vérification manuelle dans `npm run dev` sur un viewport mobile portrait (DevTools iPhone 15 par exemple).

**Branche de travail :** ce plan doit être exécuté sur une branche dédiée. Avant de commencer la Task 1, créer la branche :

```bash
git checkout main
git pull --ff-only
git checkout -b feat/qg-decor-ludique
```

---

## Phase A — Préparation

### Task 1 : Installer `tsx` pour les tests Node natifs

**Files :**
- Modify : `package.json`

- [ ] **Step 1 : Installer la dev dependency**

```bash
npm install --save-dev tsx
```

- [ ] **Step 2 : Vérifier l'install**

```bash
npx tsx --version
```

Attendu : un numéro de version (>= 4.x).

- [ ] **Step 3 : Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add tsx for running TS test files with node --test"
```

---

## Phase B — Modèle de données : courrier

Cette phase est indépendante de la pipeline visuelle ; tout peut se faire avant le moindre asset.

### Task 2 : Définir les types `Courrier`

**Files :**
- Modify : `src/types/game.ts`

- [ ] **Step 1 : Ajouter les types après `HuissierEvent`**

Localiser la fin du bloc `HuissierEvent` (autour de la ligne 92) et insérer juste après :

```ts
/* === Courrier (système de lettres au QG) ============================== */

export type CourrierType = "huissier";

export interface CourrierPayloadHuissier {
  type: "huissier";
  detteAvantSaisie: number;
  saisies: SaisieHuissier[];
  budgetApres: number;
}

export type CourrierPayload = CourrierPayloadHuissier; // discriminated union, extensible

export interface Courrier {
  id: string;
  type: CourrierType;
  jourRecu: number;
  lu: boolean;
  payload: CourrierPayload;
}
```

- [ ] **Step 2 : Vérifier le type-check**

```bash
npm run build
```

Attendu : build réussit (les types ne sont pas encore utilisés ailleurs).

- [ ] **Step 3 : Commit**

```bash
git add src/types/game.ts
git commit -m "feat(types): add Courrier model for QG mailbox system"
```

### Task 3 : Créer le helper de migration + son test

**Files :**
- Create : `src/lib/courrier.ts`
- Create : `src/lib/courrier.test.ts`

- [ ] **Step 1 : Écrire le test d'abord (TDD)**

Créer `src/lib/courrier.test.ts` :

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { GameState, HuissierEvent } from "@/types/game";
import { migrerCourriers, creerCourrierHuissier } from "@/lib/courrier";

const baseHuissier: HuissierEvent = {
  jour: 12,
  detteAvantSaisie: -85,
  saisies: [
    { type: "inventaire", nom: "Vase ancien", valeur: 60, montantRecupere: 30 },
  ],
  budgetApres: -55,
};

test("creerCourrierHuissier produit un courrier non lu avec id déterministe", () => {
  const c = creerCourrierHuissier(baseHuissier);
  assert.equal(c.type, "huissier");
  assert.equal(c.lu, false);
  assert.equal(c.jourRecu, 12);
  assert.equal(c.id, "huissier-12");
  assert.equal(c.payload.type, "huissier");
  assert.equal(c.payload.detteAvantSaisie, -85);
});

test("migrerCourriers conserve courriers existants si présents", () => {
  const existing: GameState["courriers"] = [
    {
      id: "huissier-5",
      type: "huissier",
      jourRecu: 5,
      lu: true,
      payload: { type: "huissier", detteAvantSaisie: -10, saisies: [], budgetApres: 0 },
    },
  ];
  const result = migrerCourriers(existing, null);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "huissier-5");
});

test("migrerCourriers convertit dernierHuissier non null", () => {
  const result = migrerCourriers(undefined, baseHuissier);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "huissier-12");
  assert.equal(result[0].lu, false);
});

test("migrerCourriers retourne tableau vide si rien", () => {
  const result = migrerCourriers(undefined, null);
  assert.deepEqual(result, []);
});

test("migrerCourriers ne duplique pas si dernierHuissier déjà migré", () => {
  const existing: GameState["courriers"] = [
    {
      id: "huissier-12",
      type: "huissier",
      jourRecu: 12,
      lu: false,
      payload: { type: "huissier", detteAvantSaisie: -85, saisies: [], budgetApres: -55 },
    },
  ];
  const result = migrerCourriers(existing, baseHuissier);
  assert.equal(result.length, 1);
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

```bash
npx tsx --test src/lib/courrier.test.ts
```

Attendu : erreur `Cannot find module '@/lib/courrier'`.

- [ ] **Step 3 : Implémenter `src/lib/courrier.ts`**

```ts
import type { Courrier, HuissierEvent } from "@/types/game";

export function creerCourrierHuissier(ev: HuissierEvent): Courrier {
  return {
    id: `huissier-${ev.jour}`,
    type: "huissier",
    jourRecu: ev.jour,
    lu: false,
    payload: {
      type: "huissier",
      detteAvantSaisie: ev.detteAvantSaisie,
      saisies: ev.saisies,
      budgetApres: ev.budgetApres,
    },
  };
}

export function migrerCourriers(
  existants: Courrier[] | undefined,
  dernierHuissier: HuissierEvent | null | undefined,
): Courrier[] {
  const base = Array.isArray(existants) ? [...existants] : [];
  if (!dernierHuissier) return base;
  const candidate = creerCourrierHuissier(dernierHuissier);
  if (base.some((c) => c.id === candidate.id)) return base;
  return [...base, candidate];
}
```

- [ ] **Step 4 : Relancer le test**

```bash
npx tsx --test src/lib/courrier.test.ts
```

Attendu : `# pass 5`.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/courrier.ts src/lib/courrier.test.ts
git commit -m "feat(lib): courrier helpers + migration from dernierHuissier"
```

### Task 4 : Ajouter `courriers` au `GameState`

**Files :**
- Modify : `src/types/game.ts`

- [ ] **Step 1 : Ajouter le champ dans `GameState`**

Dans l'interface `GameState` (autour de la ligne 122), juste après la ligne `dernierHuissier?: HuissierEvent | null;`, insérer :

```ts
  /** Lettres reçues (huissier en V1, extensible). */
  courriers: Courrier[];
```

- [ ] **Step 2 : Type-check**

```bash
npm run build
```

Attendu : build échoue avec erreurs sur les endroits qui créent un `GameState` sans `courriers`. C'est le signal qu'il faut passer à la Task 5.

- [ ] **Step 3 : Pas de commit ici (laisse les erreurs visibles pour la Task 5).**

### Task 5 : Initialiser et migrer `courriers` dans `GameContext`

**Files :**
- Modify : `src/context/GameContext.tsx`

- [ ] **Step 1 : Importer `migrerCourriers`**

En haut du fichier, ajouter avec les autres imports :

```ts
import { migrerCourriers } from "@/lib/courrier";
```

- [ ] **Step 2 : Migrer dans `migrerSauvegarde`**

Localiser le `return` final de `migrerSauvegarde` (autour de la ligne 270-345). Juste avant la fermeture `};` du return, ajouter :

```ts
    courriers: migrerCourriers(loaded.courriers, loaded.dernierHuissier),
```

- [ ] **Step 3 : Initialiser dans `nouvellePartie`**

Dans `nouvellePartie` (autour de la ligne 375), ajouter dans l'objet passé à `setState` :

```ts
      courriers: [],
```

À placer juste après la ligne `dernierHuissier: null,`.

- [ ] **Step 4 : Type-check**

```bash
npm run build
```

Attendu : build passe (les erreurs de la Task 4 disparaissent).

- [ ] **Step 5 : Commit**

```bash
git add src/types/game.ts src/context/GameContext.tsx
git commit -m "feat(game): add courriers array to GameState with migration"
```

### Task 6 : Pousser les événements huissier dans `courriers`

**Files :**
- Modify : `src/context/GameContext.tsx`

- [ ] **Step 1 : Importer `creerCourrierHuissier`**

Compléter l'import existant :

```ts
import { creerCourrierHuissier, migrerCourriers } from "@/lib/courrier";
```

- [ ] **Step 2 : Pousser dans `courriers` dans `avancerJour`**

Dans `avancerJour`, juste après le bloc qui assigne `dernierHuissier = { ... }` (autour de la ligne 537-543), capturer le courrier ainsi créé. Modifier le bloc pour qu'il devienne :

```ts
        if (saisies.length > 0) {
          dernierHuissier = {
            jour: nouveauJour,
            detteAvantSaisie: detteInitiale,
            saisies,
            budgetApres: nouveauBudget,
          };
        }
```

Et ajouter, juste après ce bloc `if`, avant le `return` qui clôt `setState` :

```ts
      const nouveauxCourriers = dernierHuissier && dernierHuissier.jour === nouveauJour
        ? [...prev.courriers, creerCourrierHuissier(dernierHuissier)]
        : prev.courriers;
```

- [ ] **Step 3 : Inclure `courriers` dans le `return`**

Dans le `return { ...prev, ... }` de `avancerJour` (autour de la ligne 546), ajouter dans l'objet :

```ts
        courriers: nouveauxCourriers,
```

- [ ] **Step 4 : Type-check**

```bash
npm run build
```

Attendu : build passe.

- [ ] **Step 5 : Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(game): push huissier events to courriers on day advance"
```

### Task 7 : Ajouter l'action `marquerCourrierLu`

**Files :**
- Modify : `src/context/GameContext.tsx`

- [ ] **Step 1 : Déclarer la signature dans `GameContextValue`**

Repérer `marquerHuissierVu: () => void;` (vers la ligne 121) et insérer juste après :

```ts
  /** Marque un courrier comme lu (utilisé par le QG). */
  marquerCourrierLu: (id: string) => void;
```

- [ ] **Step 2 : Implémenter le callback**

Juste sous la définition de `marquerHuissierVu` (autour de la ligne 1053), ajouter :

```ts
  const marquerCourrierLu = useCallback((id: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = prev.courriers.map((c) =>
        c.id === id ? { ...c, lu: true } : c,
      );
      return { ...prev, courriers: next };
    });
  }, []);
```

- [ ] **Step 3 : Exposer dans la valeur du contexte**

Trouver le bloc de valeur du contexte (autour de la ligne 1110-1148, où sont listés tous les `useCallback`). Ajouter `marquerCourrierLu,` dans la `value` du contexte ET dans le tableau de dépendances `useMemo`.

- [ ] **Step 4 : Type-check**

```bash
npm run build
```

- [ ] **Step 5 : Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(game): add marquerCourrierLu action"
```

---

## Phase C — Pipeline d'assets Gemini

Cette phase peut démarrer en parallèle de la Phase B. Les composants UI (Phase D) utiliseront des placeholders gris en attendant que les visuels soient livrés.

### Task 8 : Script et fichier de prompts pour le QG

**Files :**
- Create : `scripts/qg-prompts.json`
- Create : `scripts/generate-qg-images.mjs`
- Modify : `package.json` (ajouter `gen:qg`)

- [ ] **Step 1 : Créer `scripts/qg-prompts.json`**

```json
[
  {
    "id": "fond-cabinet",
    "description": "Wide panoramic interior of a cozy antique dealer's cabinet, eye-level perspective. Three contiguous zones from left to right (no visible separators): LEFT — writing-desk corner with a tall built-in bookshelf filled with old leather-bound books on the back wall, a tall window with wooden frame above the desk (warm sunlight streaming in, window glass MUST be fully transparent alpha channel), and an empty mahogany writing desk in the foreground; CENTER — entrance wall with a heavy wooden front door fitted with a polished brass letterbox slot, vintage damask wallpaper; RIGHT — reading nook with a stone fireplace (small warm fire burning), a tall window with wooden frame (transparent alpha channel on glass), Persian rug on parquet floor, a small side table, empty floor space where an armchair will be placed later. Soft warm light from upper-left. Cohesive lighting throughout. No people, no text, no captions. PNG with transparent alpha channel on the window glass areas only — everything else opaque.",
    "transparent": true
  },
  {
    "id": "exterieur-jour",
    "description": "Soft impressionistic view of Parisian street rooftops at midday, used as a distant background seen through windows. Aspect aligned to fond-cabinet so left and right window apertures both reveal pleasing views (treetops on left, roof slopes on right). Warm daylight, soft pastel sky.",
    "transparent": false
  },
  {
    "id": "porte",
    "description": "Heavy wooden front door closed, with a polished brass letterbox slot at mid-height. Eye-level perspective. Warm soft light from upper-left. Isolated subject on transparent background.",
    "transparent": true
  },
  {
    "id": "fauteuil",
    "description": "Vintage tufted Chesterfield armchair in deep emerald-green velvet, three-quarter front view, lit from upper-left to match a cozy reading nook. Designed to sit naturally on a Persian rug. Isolated subject on transparent background.",
    "transparent": true
  },
  {
    "id": "journal",
    "description": "Rolled-up vintage newspaper, lying flat on a wooden desk, slight perspective from above. Tied with a string. Isolated subject on transparent background.",
    "transparent": true
  },
  {
    "id": "carnet",
    "description": "Small leather-bound notebook, closed, brown cover with gilded edges, lying flat on a wooden desk, slight perspective from above. Isolated subject on transparent background.",
    "transparent": true
  },
  {
    "id": "gramophone",
    "description": "Vintage gramophone with brass horn on a small wooden side table, eye-level perspective, lit from upper-left. Isolated subject on transparent background.",
    "transparent": true
  },
  {
    "id": "lettre",
    "description": "Single closed white envelope as if dropped on the floor, slight perspective from above, soft shadow underneath. Isolated subject on transparent background.",
    "transparent": true
  }
]
```

- [ ] **Step 2 : Créer `scripts/generate-qg-images.mjs`**

Calqué sur `scripts/generate-brocante-images.mjs`, voici le contenu intégral :

```js
#!/usr/bin/env node
/**
 * Génère les illustrations du QG (panorama + objets) via Gemini Image API.
 *
 * Usage :
 *   npm run gen:qg                                  # tout
 *   npm run gen:qg -- --force                       # regénère même les présents
 *   npm run gen:qg -- fond-cabinet porte            # une ou plusieurs précises
 *   npm run gen:qg -- --model=pro                   # Nano Banana Pro
 *   npm run gen:qg -- --aspect=16:9 fond-cabinet    # forcer un aspect en Pro
 *
 * Les PNG sont écrits dans public/qg/{id}.png.
 */

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "qg");
const CONFIG_PATH = path.join(__dirname, "qg-prompts.json");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

const MODEL_IDS = {
  pro: "gemini-3-pro-image-preview",
  flash: "gemini-2.5-flash-image",
};

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

const STYLE_BRIEF_BASE = [
  "Vintage Art Déco illustration in a museum catalog style.",
  "Elegant ink line-art with subtle sepia and forest green color wash.",
  "Cream parchment background with subtle paper grain texture.",
  "Soft warm directional light from the upper-left, consistent across all assets so pieces composite naturally on top of each other.",
  "No text overlays, no captions, no watermark.",
].join(" ");

const STYLE_BRIEF_TRANSPARENT =
  "PNG with transparent background where instructed. Crisp clean edges around the subject for clean compositing.";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY absente. Voir .env.example");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const verbose = args.includes("--verbose");

function flagValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const modelKey = flagValue("model", "flash");
const model = MODEL_IDS[modelKey];
if (!model) {
  console.error(`❌ --model="${modelKey}" inconnu. Valeurs : pro | flash`);
  process.exit(1);
}
const defaultAspect = flagValue("aspect", "5:2");
const imageSize = flagValue("resolution", "2K");
const onlyIds = args.filter((a) => !a.startsWith("--"));

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const todo = onlyIds.length
    ? config.filter((c) => onlyIds.includes(c.id))
    : config;

  if (todo.length === 0) {
    console.error("Aucun asset QG à générer (filtres trop restrictifs ?).");
    process.exit(1);
  }
  console.log(`📋  ${todo.length} asset(s) QG à traiter\n`);

  const ai = new GoogleGenAI({ apiKey });
  let ok = 0, skipped = 0, failed = 0;

  for (const item of todo) {
    const filename = `${item.id}.png`;
    const outPath = path.join(OUTPUT_DIR, filename);

    if (!force) {
      try {
        await fs.access(outPath);
        console.log(`⏭️  ${filename} déjà présent (--force pour regénérer)`);
        skipped++;
        continue;
      } catch {
        // file doesn't exist
      }
    }

    const briefParts = [STYLE_BRIEF_BASE];
    if (item.transparent) briefParts.push(STYLE_BRIEF_TRANSPARENT);
    const prompt = `${briefParts.join(" ")}\n\nSubject: ${item.description}`;
    const aspectRatio = item.id === "fond-cabinet" || item.id === "exterieur-jour"
      ? defaultAspect
      : "1:1";
    if (verbose) console.log(`  prompt → ${prompt}`);
    console.log(`🎨  ${item.id} — génération en cours (${model}, ${aspectRatio})…`);

    const requestConfig =
      modelKey === "pro"
        ? {
            model,
            contents: prompt,
            config: { imageConfig: { aspectRatio, imageSize } },
          }
        : { model, contents: prompt };

    try {
      const response = await ai.models.generateContent(requestConfig);
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      let saved = false;
      for (const part of parts) {
        if (part.inlineData?.data) {
          const buf = Buffer.from(part.inlineData.data, "base64");
          await fs.writeFile(outPath, buf);
          console.log(`✅  ${filename} (${Math.round(buf.length / 1024)} kB)`);
          saved = true;
          ok++;
          break;
        } else if (part.text && verbose) {
          console.log(`💬  modèle : ${part.text.slice(0, 240)}`);
        }
      }
      if (!saved) {
        console.error(`❌  ${item.id} : pas d'image dans la réponse`);
        failed++;
      }
    } catch (err) {
      console.error(`❌  ${item.id} : ${err.message ?? err}`);
      failed++;
    }
  }

  console.log(
    `\n— ${ok} générés, ${skipped} déjà présents, ${failed} échecs —`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
```

- [ ] **Step 3 : Ajouter le script npm**

Dans `package.json`, dans la section `"scripts"`, ajouter (après `gen:brocantes`) :

```json
    "gen:qg": "node scripts/generate-qg-images.mjs",
```

- [ ] **Step 4 : Vérifier que le script tourne**

```bash
npm run gen:qg -- --help 2>&1 | head -5
```

Si la clé Gemini est bien dans `.env`, le script devrait commencer à tourner sur tous les assets. Sinon, l'arrêter avec Ctrl+C ; l'objectif ici est juste de vérifier que le script charge sans crasher.

- [ ] **Step 5 : Commit**

```bash
git add scripts/qg-prompts.json scripts/generate-qg-images.mjs package.json
git commit -m "feat(scripts): Gemini pipeline for QG decor assets (panorama + objets)"
```

### Task 9 : Génération initiale du fond et des objets

Cette task ne produit aucun code, mais des assets. Elle peut prendre plusieurs essais.

**Files :**
- Add : `public/qg/*.png`

- [ ] **Step 1 : Première passe en Flash (rapide, pour itérer)**

```bash
npm run gen:qg
```

- [ ] **Step 2 : Inspecter visuellement chaque PNG dans `public/qg/`**

Ouvrir chaque image. Vérifier :
- `fond-cabinet.png` : les 3 zones sont là, les fenêtres ont effectivement des carreaux transparents.
- Les objets (porte, fauteuil, journal, carnet, gramophone, lettre) ont un fond transparent et sont isolés.
- La lumière vient bien du haut-gauche partout.

- [ ] **Step 3 : Si un asset est insatisfaisant, ajuster son `description` dans `scripts/qg-prompts.json` et régénérer cet asset seul**

Exemple :

```bash
npm run gen:qg -- --force fond-cabinet
```

Itérer jusqu'à obtenir un rendu acceptable. En dernier recours, passer en Pro :

```bash
npm run gen:qg -- --model=pro --force fond-cabinet
```

- [ ] **Step 4 : Une fois validé, commit des assets**

```bash
git add public/qg/ scripts/qg-prompts.json
git commit -m "feat(assets): initial Gemini-generated QG visuals"
```

---

## Phase D — Composants UI (panorama + scène + objets)

À partir d'ici on construit l'UI. Les coordonnées exactes des objets dans `QG_LAYOUT` seront figées **après** la livraison des assets de la Phase C, donc cette phase peut commencer avec des placeholders gris si nécessaire.

### Task 10 : Constantes de layout

**Files :**
- Create : `src/components/mobile/qg/layout.ts`

- [ ] **Step 1 : Créer le fichier**

```ts
/**
 * Coordonnées des objets dans le panorama du QG.
 *
 * Le panorama fait `panoramaWidth` vw de large. Chaque objet est positionné
 * en `left` (vw, depuis la gauche du panorama) et `bottom` (vh, depuis le bas
 * de la zone du panorama). `width` est en vw, la hauteur s'ajuste.
 *
 * Ces valeurs sont à ajuster après la livraison des assets Gemini.
 */
export const QG_LAYOUT = {
  panoramaWidth: 300, // vw
  zones: {
    bureau: 0, // scroll-left à 0vw = vue gauche
    porte: 100, // vue par défaut
    repos: 200,
  },
  objets: {
    journal: { left: 14, bottom: 32, width: 12 },
    carnet: { left: 26, bottom: 32, width: 12 },
    porte: { left: 136, bottom: 14, width: 28 },
    courrier: { left: 134, bottom: 6, width: 14 },
    fauteuil: { left: 226, bottom: 12, width: 32 },
    gramophone: { left: 258, bottom: 22, width: 16 },
  },
} as const;

export type QgObjetKey = keyof typeof QG_LAYOUT.objets;
```

- [ ] **Step 2 : Type-check**

```bash
npm run build
```

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/qg/layout.ts
git commit -m "feat(qg): layout constants for panorama objects"
```

### Task 11 : Composant `QgScene` (calques fond + objets, sans interaction)

**Files :**
- Create : `src/components/mobile/qg/QgScene.tsx`

- [ ] **Step 1 : Créer le squelette**

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";
import { QG_LAYOUT, type QgObjetKey } from "./layout";

interface QgSceneProps {
  /** Objets interactifs déjà rendus (par les composants `Qg*`). */
  children: ReactNode;
}

const wrapStyle: CSSProperties = {
  position: "relative",
  width: `${QG_LAYOUT.panoramaWidth}vw`,
  height: "100%",
  flexShrink: 0,
};

const layerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  userSelect: "none",
};

export function QgScene({ children }: QgSceneProps) {
  return (
    <div style={wrapStyle} aria-label="Décor du QG">
      <img
        src="/qg/exterieur-jour.png"
        alt=""
        style={{ ...layerStyle, zIndex: 0, objectFit: "cover" }}
        draggable={false}
      />
      <img
        src="/qg/fond-cabinet.png"
        alt=""
        style={{ ...layerStyle, zIndex: 1, objectFit: "cover" }}
        draggable={false}
      />
      <div style={{ ...layerStyle, zIndex: 2, pointerEvents: "none" }}>
        {children}
      </div>
    </div>
  );
}

/** Helper pour positionner un objet à ses coordonnées. */
export function qgObjetStyle(key: QgObjetKey): CSSProperties {
  const { left, bottom, width } = QG_LAYOUT.objets[key];
  return {
    position: "absolute",
    left: `${left}vw`,
    bottom: `${bottom}%`,
    width: `${width}vw`,
    height: "auto",
    pointerEvents: "auto",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    padding: 0,
  };
}
```

- [ ] **Step 2 : Type-check**

```bash
npm run build
```

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/qg/QgScene.tsx
git commit -m "feat(qg): QgScene layered renderer (exterior + fond + objects)"
```

### Task 12 : Composant `QgPanorama` (scroll-snap + pagination)

**Files :**
- Create : `src/components/mobile/qg/QgPanorama.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { QG_LAYOUT } from "./layout";

interface QgPanoramaProps {
  initialZone?: "bureau" | "porte" | "repos";
  children: ReactNode;
}

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflowX: "auto",
  overflowY: "hidden",
  scrollSnapType: "x mandatory",
  scrollBehavior: "auto",
  WebkitOverflowScrolling: "touch",
  display: "flex",
  flexDirection: "row",
};

const snapAnchorStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  width: "100vw",
  height: "100%",
  scrollSnapAlign: "center",
  pointerEvents: "none",
};

const dotsWrap: CSSProperties = {
  position: "absolute",
  bottom: 8,
  left: 0,
  right: 0,
  display: "flex",
  gap: 6,
  justifyContent: "center",
  zIndex: 10,
  pointerEvents: "none",
};

const dotBase: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.4)",
};

const dotActive: CSSProperties = {
  ...dotBase,
  background: "var(--brass-500)",
};

const ZONES = ["bureau", "porte", "repos"] as const;

export function QgPanorama({ initialZone = "porte", children }: QgPanoramaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(ZONES.indexOf(initialZone));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vw = el.clientWidth;
    el.scrollLeft = ZONES.indexOf(initialZone) * vw;
    el.style.scrollBehavior = "smooth";
  }, [initialZone]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vw = el.clientWidth;
        const idx = Math.round(el.scrollLeft / vw);
        setActiveIdx(Math.max(0, Math.min(ZONES.length - 1, idx)));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} style={containerStyle} aria-label="Panorama du QG">
      {children}
      {ZONES.map((_, i) => (
        <div key={i} style={{ ...snapAnchorStyle, left: `${i * 100}vw` }} aria-hidden />
      ))}
      <div style={dotsWrap} aria-hidden>
        {ZONES.map((_, i) => (
          <div key={i} style={i === activeIdx ? dotActive : dotBase} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Type-check**

```bash
npm run build
```

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/qg/QgPanorama.tsx
git commit -m "feat(qg): QgPanorama with horizontal scroll-snap + pagination dots"
```

### Task 13 : `PorteSheet` + `QgPorte`

**Files :**
- Create : `src/components/mobile/qg/sheets/PorteSheet.tsx`
- Create : `src/components/mobile/qg/QgPorte.tsx`

- [ ] **Step 1 : Créer `PorteSheet.tsx`**

```tsx
"use client";

import type { CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";

interface PorteSheetProps {
  open: boolean;
  onClose: () => void;
  vitrineActive: boolean;
  onChiner: () => void;
  onVitrine: () => void;
}

const bigButton: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "16px 12px",
  marginTop: 10,
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow:
    "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)",
};

const altButton: CSSProperties = {
  ...bigButton,
  background: "var(--paper-100)",
  color: "var(--forest-800)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

export function PorteSheet({ open, onClose, vitrineActive, onChiner, onVitrine }: PorteSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="— Sortir —">
      <button type="button" style={bigButton} onClick={onChiner}>
        Sortir chiner
      </button>
      <button type="button" style={altButton} onClick={onVitrine}>
        {vitrineActive ? "Tenir l'étal" : "Exposer une vitrine"}
      </button>
    </BottomSheet>
  );
}
```

- [ ] **Step 2 : Créer `QgPorte.tsx`**

```tsx
"use client";

import { qgObjetStyle } from "./QgScene";

interface QgPorteProps {
  onTap: () => void;
}

export function QgPorte({ onTap }: QgPorteProps) {
  return (
    <button type="button" onClick={onTap} aria-label="Porte d'entrée" style={qgObjetStyle("porte")}>
      <img src="/qg/porte.png" alt="" draggable={false} style={{ width: "100%", height: "auto", display: "block" }} />
    </button>
  );
}
```

- [ ] **Step 3 : Type-check**

```bash
npm run build
```

- [ ] **Step 4 : Commit**

```bash
git add src/components/mobile/qg/sheets/PorteSheet.tsx src/components/mobile/qg/QgPorte.tsx
git commit -m "feat(qg): QgPorte + PorteSheet (Chiner / Étal)"
```

### Task 14 : `PasserConfirmSheet` + `QgFauteuil`

**Files :**
- Create : `src/components/mobile/qg/sheets/PasserConfirmSheet.tsx`
- Create : `src/components/mobile/qg/QgFauteuil.tsx`

- [ ] **Step 1 : Créer `PasserConfirmSheet.tsx`**

```tsx
"use client";

import type { CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";

interface PasserConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const text: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 14,
  color: "var(--ink-700)",
  textAlign: "center",
  padding: "8px 4px 16px",
};

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const btnConfirm: CSSProperties = {
  padding: "14px 8px",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const btnCancel: CSSProperties = {
  ...btnConfirm,
  background: "var(--paper-200)",
  color: "var(--ink-700)",
};

export function PasserConfirmSheet({ open, onClose, onConfirm }: PasserConfirmSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="— Passer la journée —">
      <p style={text}>S'asseoir dans le fauteuil et laisser passer la journée ?</p>
      <div style={row}>
        <button type="button" style={btnCancel} onClick={onClose}>Annuler</button>
        <button type="button" style={btnConfirm} onClick={onConfirm}>Confirmer</button>
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 2 : Créer `QgFauteuil.tsx`**

```tsx
"use client";

import { qgObjetStyle } from "./QgScene";

interface QgFauteuilProps {
  onTap: () => void;
}

export function QgFauteuil({ onTap }: QgFauteuilProps) {
  return (
    <button type="button" onClick={onTap} aria-label="Fauteuil — passer la journée" style={qgObjetStyle("fauteuil")}>
      <img src="/qg/fauteuil.png" alt="" draggable={false} style={{ width: "100%", height: "auto", display: "block" }} />
    </button>
  );
}
```

- [ ] **Step 3 : Type-check**

```bash
npm run build
```

- [ ] **Step 4 : Commit**

```bash
git add src/components/mobile/qg/sheets/PasserConfirmSheet.tsx src/components/mobile/qg/QgFauteuil.tsx
git commit -m "feat(qg): QgFauteuil + PasserConfirmSheet"
```

### Task 15 : `QgJournal` (délègue à `GazetteSheet` existante)

**Files :**
- Create : `src/components/mobile/qg/QgJournal.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
"use client";

import { qgObjetStyle } from "./QgScene";

interface QgJournalProps {
  onTap: () => void;
}

export function QgJournal({ onTap }: QgJournalProps) {
  return (
    <button type="button" onClick={onTap} aria-label="Journal — la Gazette" style={qgObjetStyle("journal")}>
      <img src="/qg/journal.png" alt="" draggable={false} style={{ width: "100%", height: "auto", display: "block" }} />
    </button>
  );
}
```

- [ ] **Step 2 : Type-check + commit**

```bash
npm run build
git add src/components/mobile/qg/QgJournal.tsx
git commit -m "feat(qg): QgJournal (opens GazetteSheet)"
```

### Task 16 : `CarnetSheet` + `QgCarnet`

**Files :**
- Create : `src/components/mobile/qg/sheets/CarnetSheet.tsx`
- Create : `src/components/mobile/qg/QgCarnet.tsx`

- [ ] **Step 1 : Créer `CarnetSheet.tsx`**

```tsx
"use client";

import { BottomSheet } from "@/components/mobile/BottomSheet";
import { QgHistorique } from "@/components/mobile/QgHistorique";
import type { GameState } from "@/types/game";

interface CarnetSheetProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
}

export function CarnetSheet({ open, onClose, state }: CarnetSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="— Carnet de sessions —">
      <QgHistorique state={state} />
    </BottomSheet>
  );
}
```

- [ ] **Step 2 : Créer `QgCarnet.tsx`**

```tsx
"use client";

import { qgObjetStyle } from "./QgScene";

interface QgCarnetProps {
  onTap: () => void;
}

export function QgCarnet({ onTap }: QgCarnetProps) {
  return (
    <button type="button" onClick={onTap} aria-label="Carnet — dernières sessions" style={qgObjetStyle("carnet")}>
      <img src="/qg/carnet.png" alt="" draggable={false} style={{ width: "100%", height: "auto", display: "block" }} />
    </button>
  );
}
```

- [ ] **Step 3 : Type-check + commit**

```bash
npm run build
git add src/components/mobile/qg/sheets/CarnetSheet.tsx src/components/mobile/qg/QgCarnet.tsx
git commit -m "feat(qg): QgCarnet + CarnetSheet (wraps QgHistorique)"
```

### Task 17 : `QgGramophone` (décoratif)

**Files :**
- Create : `src/components/mobile/qg/QgGramophone.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
"use client";

import type { CSSProperties } from "react";
import { QG_LAYOUT } from "./layout";

const wrap: CSSProperties = {
  position: "absolute",
  left: `${QG_LAYOUT.objets.gramophone.left}vw`,
  bottom: `${QG_LAYOUT.objets.gramophone.bottom}%`,
  width: `${QG_LAYOUT.objets.gramophone.width}vw`,
  pointerEvents: "none",
  opacity: 0.95,
};

export function QgGramophone() {
  return (
    <div style={wrap} aria-hidden>
      <img src="/qg/gramophone.png" alt="" draggable={false} style={{ width: "100%", height: "auto", display: "block" }} />
    </div>
  );
}
```

- [ ] **Step 2 : Type-check + commit**

```bash
npm run build
git add src/components/mobile/qg/QgGramophone.tsx
git commit -m "feat(qg): QgGramophone decorative element"
```

### Task 18 : `CourrierSheet` + `QgCourrier`

**Files :**
- Create : `src/components/mobile/qg/sheets/CourrierSheet.tsx`
- Create : `src/components/mobile/qg/QgCourrier.tsx`

- [ ] **Step 1 : Créer `CourrierSheet.tsx`**

```tsx
"use client";

import type { CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import type { Courrier } from "@/types/game";

interface CourrierSheetProps {
  open: boolean;
  onClose: () => void;
  courriers: Courrier[];
  onMarquerLu: (id: string) => void;
}

const card: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: 12,
  marginBottom: 10,
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

const tag: CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  background: "var(--vermillion-600)",
  color: "var(--paper-100)",
  fontFamily: "var(--font-display)",
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const closeBtn: CSSProperties = {
  marginTop: 8,
  padding: "6px 12px",
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-700)",
  fontFamily: "var(--font-display)",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
};

function renderHuissier(c: Courrier) {
  if (c.payload.type !== "huissier") return null;
  const p = c.payload;
  const total = p.saisies.reduce((s, x) => s + x.montantRecupere, 0);
  return (
    <>
      <span style={tag}>Lettre de l'huissier</span>
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 13, lineHeight: 1.4 }}>
        Dette de {Math.abs(p.detteAvantSaisie)} € après loyer.{" "}
        {p.saisies.length} bien{p.saisies.length > 1 ? "s" : ""} saisi
        {p.saisies.length > 1 ? "s" : ""} pour {total} €.
      </p>
      {p.saisies.length > 0 && (
        <ul style={{ margin: "6px 0 0 16px", padding: 0, fontFamily: "var(--font-mono)", fontSize: 10 }}>
          {p.saisies.map((s, i) => (
            <li key={i}>
              {s.nom} ({s.type === "inventaire" ? "stock" : "collection"}) — {s.montantRecupere} € (valeur {s.valeur} €)
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function CourrierSheet({ open, onClose, courriers, onMarquerLu }: CourrierSheetProps) {
  const nonLus = courriers.filter((c) => !c.lu).sort((a, b) => b.jourRecu - a.jourRecu);
  return (
    <BottomSheet open={open} onClose={onClose} title="— Courrier du jour —">
      {nonLus.length === 0 ? (
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink-500)", textAlign: "center", padding: "20px 0" }}>
          Aucune nouvelle lettre.
        </p>
      ) : (
        nonLus.map((c) => (
          <div key={c.id} style={card}>
            {c.type === "huissier" ? renderHuissier(c) : null}
            <button type="button" style={closeBtn} onClick={() => onMarquerLu(c.id)}>
              Compris ✕
            </button>
          </div>
        ))
      )}
    </BottomSheet>
  );
}
```

- [ ] **Step 2 : Créer `QgCourrier.tsx`**

```tsx
"use client";

import type { CSSProperties } from "react";
import { QG_LAYOUT } from "./layout";

interface QgCourrierProps {
  nbNonLus: number;
  onTap: () => void;
}

const wrap = (nb: number): CSSProperties => ({
  position: "absolute",
  left: `${QG_LAYOUT.objets.courrier.left}vw`,
  bottom: `${QG_LAYOUT.objets.courrier.bottom}%`,
  width: `${QG_LAYOUT.objets.courrier.width}vw`,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: nb > 0 ? "pointer" : "default",
  pointerEvents: nb > 0 ? "auto" : "none",
  opacity: nb > 0 ? 1 : 0,
  transition: "opacity 200ms ease",
});

const letterBase: CSSProperties = {
  position: "absolute",
  bottom: 0,
  width: "100%",
  height: "auto",
  display: "block",
};

export function QgCourrier({ nbNonLus, onTap }: QgCourrierProps) {
  if (nbNonLus <= 0) return null;
  const n = Math.min(nbNonLus, 3);
  return (
    <button type="button" onClick={onTap} aria-label={`${nbNonLus} lettre${nbNonLus > 1 ? "s" : ""} non lue${nbNonLus > 1 ? "s" : ""}`} style={wrap(nbNonLus)}>
      {Array.from({ length: n }).map((_, i) => (
        <img
          key={i}
          src="/qg/lettre.png"
          alt=""
          draggable={false}
          style={{
            ...letterBase,
            transform: `translateX(${(i - 1) * 18}%) rotate(${(i - 1) * 6}deg)`,
            zIndex: i,
          }}
        />
      ))}
    </button>
  );
}
```

- [ ] **Step 3 : Type-check + commit**

```bash
npm run build
git add src/components/mobile/qg/sheets/CourrierSheet.tsx src/components/mobile/qg/QgCourrier.tsx
git commit -m "feat(qg): QgCourrier (pile de lettres) + CourrierSheet"
```

---

## Phase E — Wiring de la page QG

### Task 19 : Réécrire `src/app/qg/page.tsx`

**Files :**
- Modify : `src/app/qg/page.tsx`

- [ ] **Step 1 : Remplacer le contenu intégral du fichier**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { WeekTimeline } from "@/components/WeekTimeline";
import { GazetteSheet } from "@/components/mobile/GazetteSheet";
import { QgPanorama } from "@/components/mobile/qg/QgPanorama";
import { QgScene } from "@/components/mobile/qg/QgScene";
import { QgPorte } from "@/components/mobile/qg/QgPorte";
import { QgFauteuil } from "@/components/mobile/qg/QgFauteuil";
import { QgJournal } from "@/components/mobile/qg/QgJournal";
import { QgCarnet } from "@/components/mobile/qg/QgCarnet";
import { QgGramophone } from "@/components/mobile/qg/QgGramophone";
import { QgCourrier } from "@/components/mobile/qg/QgCourrier";
import { PorteSheet } from "@/components/mobile/qg/sheets/PorteSheet";
import { PasserConfirmSheet } from "@/components/mobile/qg/sheets/PasserConfirmSheet";
import { CarnetSheet } from "@/components/mobile/qg/sheets/CarnetSheet";
import { CourrierSheet } from "@/components/mobile/qg/sheets/CourrierSheet";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { CATEGORIES } from "@/data/categories";
import { meteoDuJour } from "@/lib/meteo";
import {
  aConnaisseurTendance,
  aGenBulletinMeteo,
  aGenCarnetMondain,
  aGenInfluence,
} from "@/lib/competences";
import type { CategorieObjet } from "@/types/game";

export default function QgPage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    acheterGazette,
    rerollMeteo,
    rerollCelebrite,
    marquerCourrierLu,
    avancerJour,
  } = useGame();
  const { playClick } = useSettings();

  const [gazetteOuverte, setGazetteOuverte] = useState(false);
  const [porteOuverte, setPorteOuverte] = useState(false);
  const [confirmPasser, setConfirmPasser] = useState(false);
  const [carnetOuvert, setCarnetOuvert] = useState(false);
  const [courrierOuvert, setCourrierOuvert] = useState(false);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const categoriesConnuesTendance = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurTendance(state, c)) s.add(c);
    return s;
  }, [state]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — ouverture du QG…
      </main>
    );
  }

  const meteo = meteoDuJour(state);
  const nbCourriersNonLus = state.courriers.filter((c) => !c.lu).length;

  return (
    <>
      <MobileLayout
        header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
        stickyTop={
          <StickyTop>
            <WeekTimeline
              jourActuel={state.jourActuel}
              meteoSemaine={aGenBulletinMeteo(state) ? state.meteoSemaine : undefined}
            />
          </StickyTop>
        }
      >
        <div style={{ position: "relative", width: "auto", height: "calc(100dvh - var(--mobile-header-h) - 60px - var(--mobile-tabbar-h) - var(--safe-bottom))", margin: "-12px -12px 0", overflow: "hidden" }}>
          {/* 60px = hauteur approximative de StickyTop (WeekTimeline). À ajuster en Task 23 si besoin. */}
          <QgPanorama initialZone="porte">
            <QgScene>
              <QgJournal onTap={() => { playClick(); setGazetteOuverte(true); }} />
              <QgCarnet onTap={() => { playClick(); setCarnetOuvert(true); }} />
              <QgPorte onTap={() => { playClick(); setPorteOuverte(true); }} />
              <QgCourrier nbNonLus={nbCourriersNonLus} onTap={() => { playClick(); setCourrierOuvert(true); }} />
              <QgFauteuil onTap={() => { playClick(); setConfirmPasser(true); }} />
              <QgGramophone />
            </QgScene>
          </QgPanorama>
        </div>
      </MobileLayout>

      <PorteSheet
        open={porteOuverte}
        onClose={() => setPorteOuverte(false)}
        vitrineActive={!!state.vitrine}
        onChiner={() => { setPorteOuverte(false); router.push("/chiner"); }}
        onVitrine={() => {
          setPorteOuverte(false);
          router.push(state.vitrine ? `/vitrine/${state.vitrine.brocanteId}` : "/vitrine");
        }}
      />

      <PasserConfirmSheet
        open={confirmPasser}
        onClose={() => setConfirmPasser(false)}
        onConfirm={() => { setConfirmPasser(false); avancerJour(1); }}
      />

      <CarnetSheet open={carnetOuvert} onClose={() => setCarnetOuvert(false)} state={state} />

      <CourrierSheet
        open={courrierOuvert}
        onClose={() => setCourrierOuvert(false)}
        courriers={state.courriers}
        onMarquerLu={(id) => marquerCourrierLu(id)}
      />

      <GazetteSheet
        open={gazetteOuverte}
        onClose={() => setGazetteOuverte(false)}
        jourActuel={state.jourActuel}
        prochainRafraichissement={state.prochainRafraichissementTendances}
        tendances={state.tendances}
        categoriesConnues={categoriesConnuesTendance}
        meteo={meteo}
        revelerMeteo={aGenBulletinMeteo(state)}
        celebrite={state.celebriteActuelle}
        revelerCelebrite={aGenCarnetMondain(state)}
        peutInfluencer={aGenInfluence(state)}
        influenceUtilisee={state.influenceUtilisee}
        onRerollMeteo={() => rerollMeteo()}
        onRerollCelebrite={() => rerollCelebrite()}
      />
    </>
  );
}
```

- [ ] **Step 2 : Vérifier que `GazetteSheet` accepte un état "non achetée" (signature)**

Lire `src/components/mobile/GazetteSheet.tsx` pour voir si elle gère l'achat via une prop `onAcheter` ou si l'achat doit rester ailleurs. Si elle ne gère pas l'achat, ajouter `onAcheter`/`peutAcheter`/`prixGazette` aux props passées par le QG :

```tsx
import { PRIX_GAZETTE } from "@/lib/tendances";
// ...
<GazetteSheet
  ...
  achetee={state.gazetteAchetee}
  onAcheter={() => acheterGazette()}
  budget={state.budget}
  prixGazette={PRIX_GAZETTE}
/>
```

Sinon, ajuster `GazetteSheet` lors de la Task 20 (cleanup) si nécessaire.

- [ ] **Step 3 : Type-check**

```bash
npm run build
```

Corriger toute erreur (props manquantes, imports).

- [ ] **Step 4 : Commit**

```bash
git add src/app/qg/page.tsx
git commit -m "feat(qg): rewrite page as panoramic scene + sheets"
```

### Task 20 : Adapter `GazetteSheet` pour héberger l'achat (si nécessaire)

**Files :**
- Modify : `src/components/mobile/GazetteSheet.tsx`

- [ ] **Step 1 : Lire le composant existant**

```bash
cat src/components/mobile/GazetteSheet.tsx
```

- [ ] **Step 2 : Si le composant ne supporte pas l'état "non achetée"**

Ajouter les props `achetee: boolean`, `budget: number`, `prixGazette: number`, `onAcheter: () => void`. À l'intérieur, si `!achetee`, afficher un état « scellé » avec un bouton « Acheter (X €) » qui appelle `onAcheter` ; le bouton est désactivé si `budget < prixGazette`. Le contenu actuel (tendances/météo/célébrité) reste visible mais flouté ou masqué pour les sections non débloquées.

Exemple minimal d'écran scellé à ajouter en haut de la sheet :

```tsx
{!achetee && (
  <div style={{ padding: 16, textAlign: "center" }}>
    <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14 }}>
      La Gazette est encore scellée.
    </p>
    <button
      type="button"
      disabled={budget < prixGazette}
      onClick={onAcheter}
      style={{
        marginTop: 10,
        padding: "10px 16px",
        background: budget < prixGazette ? "var(--paper-500)" : "var(--forest-800)",
        color: "var(--brass-300)",
        border: "1px solid var(--brass-500)",
        fontFamily: "var(--font-display)",
        fontSize: 12,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        cursor: budget < prixGazette ? "not-allowed" : "pointer",
      }}
    >
      Acheter ({prixGazette} €)
    </button>
  </div>
)}
```

- [ ] **Step 3 : Type-check + commit**

```bash
npm run build
git add src/components/mobile/GazetteSheet.tsx src/app/qg/page.tsx
git commit -m "feat(gazette): host purchase flow inside GazetteSheet"
```

(Skipper cette task si le composant supporte déjà l'achat.)

### Task 21 : Supprimer le code obsolète

**Files :**
- Delete : `src/components/mobile/QgEtatDesLieux.tsx`
- Delete : `src/components/mobile/GazetteTeaser.tsx`
- Modify : `src/context/GameContext.tsx` (retirer `marquerHuissierVu` + `dernierHuissier`)
- Modify : `src/types/game.ts` (retirer `dernierHuissier`)

- [ ] **Step 1 : Vérifier qu'aucun autre fichier ne consomme `QgEtatDesLieux` ou `GazetteTeaser`**

```bash
```

Utiliser la tool Grep avec pattern `QgEtatDesLieux|GazetteTeaser` (la nouvelle page QG ne les importe plus, ce sont les seuls usages connus).

- [ ] **Step 2 : Supprimer les deux composants obsolètes**

```bash
rm src/components/mobile/QgEtatDesLieux.tsx src/components/mobile/GazetteTeaser.tsx
```

- [ ] **Step 3 : Supprimer `marquerHuissierVu` de `GameContext.tsx`**

- Retirer la déclaration `marquerHuissierVu: () => void;` de `GameContextValue`.
- Retirer le `useCallback` `marquerHuissierVu` (autour des lignes 1053-1055).
- Retirer `marquerHuissierVu` de la `value` du contexte et de ses deps.

- [ ] **Step 4 : Retirer `dernierHuissier` de `GameState`**

- Supprimer la ligne `dernierHuissier?: HuissierEvent | null;` dans `src/types/game.ts`.
- Dans `src/context/GameContext.tsx` :
  - Retirer `dernierHuissier: loaded.dernierHuissier ?? null,` dans `migrerSauvegarde` (la migration vers `courriers` est déjà faite).
  - Retirer `dernierHuissier: null,` dans `nouvellePartie`.
  - Dans `avancerJour`, conserver la variable locale `dernierHuissier: HuissierEvent | null = null;` (elle est utilisée pour construire le courrier) mais ne plus la propager dans le `return` (retirer `dernierHuissier,` de l'objet retourné).

- [ ] **Step 5 : Type-check**

```bash
npm run build
```

Corriger toute erreur résiduelle (notamment dans `migrerSauvegarde` où `migrerCourriers` doit toujours pouvoir lire `loaded.dernierHuissier` — comme c'est un champ de l'ancienne sauvegarde, le typer comme `(loaded as Partial<GameState> & { dernierHuissier?: HuissierEvent | null }).dernierHuissier` si TypeScript n'est plus content).

- [ ] **Step 6 : Commit**

```bash
git add -u src/
git commit -m "refactor(qg): remove dernierHuissier and obsolete components"
```

---

## Phase F — Validation et finition

### Task 22 : Vérification du build complet

**Files :** (aucun)

- [ ] **Step 1 : Build + lint**

```bash
npm run build && npm run lint
```

Attendu : 0 erreur, 0 warning bloquant.

- [ ] **Step 2 : Tests unitaires**

```bash
npx tsx --test src/lib/courrier.test.ts
```

Attendu : `# pass 5`.

### Task 23 : Vérification visuelle dans `npm run dev`

**Files :** (aucun)

- [ ] **Step 1 : Lancer le serveur**

```bash
npm run dev
```

- [ ] **Step 2 : Ouvrir Chrome DevTools en mode iPhone 15 portrait, naviguer vers `/qg`**

Vérifier :
- La vue par défaut centre la **porte**.
- Le swipe vers la gauche révèle le **bureau** (journal, carnet, bibliothèque, fenêtre).
- Le swipe vers la droite révèle le **coin repos** (fauteuil, cheminée, gramophone).
- Les **points de pagination** en bas changent au scroll.
- Tap **porte** → `PorteSheet` avec 2 boutons.
- Tap **journal** → `GazetteSheet` (achat ou lecture selon état).
- Tap **carnet** → `CarnetSheet` avec l'historique.
- Tap **fauteuil** → `PasserConfirmSheet`, *Confirmer* avance d'1 jour.
- Forcer un huissier (jouer jusqu'à avoir une dette) → une **lettre** apparaît devant la porte → tap ouvre `CourrierSheet`, lecture marque la lettre lue → la lettre disparaît.

- [ ] **Step 3 : Tester la migration d'une ancienne sauvegarde**

Avant cette branche : sauvegarder l'ancienne version localStorage avec `dernierHuissier` non null (ou bien éditer manuellement le localStorage du navigateur pour ajouter un `dernierHuissier`). Recharger sur la nouvelle version : vérifier que la lettre apparaît bien au sol et que `dernierHuissier` n'existe plus dans le localStorage après le save automatique.

- [ ] **Step 4 : Ajuster `QG_LAYOUT` si les positions des objets ne sont pas justes sur les visuels Gemini**

Modifier `src/components/mobile/qg/layout.ts` et hot-reload jusqu'à ce que chaque objet soit visuellement à sa place. Une fois satisfait :

```bash
git add src/components/mobile/qg/layout.ts
git commit -m "fix(qg): finalize object coordinates against generated assets"
```

### Task 24 : Finalisation de la branche

**Files :** (aucun)

- [ ] **Step 1 : Récapituler les commits**

```bash
git log --oneline main..HEAD
```

- [ ] **Step 2 : Lancer la skill `superpowers:finishing-a-development-branch`**

Cette skill présentera les options (merge / PR / cleanup) en fonction des préférences utilisateur.

---

## Résumé de la décomposition

| Phase | Tasks | Sortie |
| ----- | ----- | ------ |
| A. Prep | 1 | `tsx` installé |
| B. Courrier modèle | 2–7 | Types + state + actions migration |
| C. Pipeline assets | 8–9 | Script Gemini + premiers PNG |
| D. Composants UI | 10–18 | Panorama, scène, 5 objets + 4 sheets |
| E. Wiring QG | 19–21 | Page QG réécrite + cleanup |
| F. Validation | 22–24 | Build + manuel + finition branche |

Phase B est indépendante de la Phase C : les deux peuvent être dispatchées en parallèle (avec `superpowers:dispatching-parallel-agents`) si l'exécuteur le souhaite. Les Phases D et E dépendent à la fois de B (types `Courrier`) et idéalement de C (assets disponibles pour caler `QG_LAYOUT`), mais peuvent démarrer avec placeholders.
