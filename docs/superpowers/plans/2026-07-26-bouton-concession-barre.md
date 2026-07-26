# Bouton de concession dans la barre d'actions — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la pancarte murale de concession par un troisième bouton au centre de la barre d'actions, montrant le véhicule du joueur de profil avec une clé à molette par-dessus.

**Architecture:** Trois nouvelles images de profil générées par Gemini (référencées sur les vues arrière existantes pour rester le même véhicule), exposées via `coffreAssets`. Un composant présentationnel `BoutonConcession` s'insère entre les deux boutons existants de la barre. `PanneauGarage`, le slot `panneau` de `CoffreCanvas` et la clé i18n `concession` disparaissent. La fiche, l'achat et la relève ne sont pas touchés.

**Tech Stack:** Next 16 (export statique), React 19, TypeScript, Vitest + @testing-library/react (jsdom), lucide-react, `@google/genai` + sharp pour la génération d'assets.

**Spec :** `docs/superpowers/specs/2026-07-26-bouton-concession-barre-design.md`

## Global Constraints

- **Aucune chaîne localisée en sauvegarde.** Seul `niveauCamion` (un nombre) est persisté.
- **Quatre locales obligatoires** : toute clé de `src/lib/i18n/ui/fr.ts` doit exister à l'identique dans `en.ts`, `es.ts`, `el.ts`. `tsc` garantit la présence via `DeepStrings<typeof fr>` ; `src/lib/i18n/ui/ui.test.ts` garantit la parité des jetons `{x}`.
- **`npm run lint` est cassé sous Next 16.** Utiliser `npx eslint src` (alias `npm run lint:hooks`). Une dépendance de hook manquante s'ajoute, elle ne se désactive pas.
- **Styles en objets `CSSProperties` inline** avec les variables du thème (`--brass-500`, `--forest-800`, `--paper-100`, `--font-display`…). Pas de CSS module, pas de Tailwind.
- **Commentaires et identifiants en français.**
- **Prix et capacités inchangés** : 200 € / 500 €, 9 / 16 / 25 places.
- **Pas de scroll ni de virtualisation basés sur `window`** — le body est verrouillé en WebView.
- **Le lint interdit `<img>` brut** : poser `// eslint-disable-next-line @next/next/no-img-element` juste au-dessus, comme le fait déjà `CoffreChargement.tsx`.
- **Ne pas alourdir `public/`** : `out/` est à 155 Mo après une passe de réduction. Les assets générés sont écrits directement en webp, aucun PNG intermédiaire ne reste dans `public/`.
- **Règle d'accessibilité du chantier** : pas d'`aria-label` sur un contrôle dont le contenu textuel le nomme déjà. **`BoutonConcession` est l'exception explicite** : il n'a aucun texte, donc son `aria-label` est obligatoire.

## Structure des fichiers

| Fichier | Rôle | Action |
|---|---|---|
| `src/lib/i18n/ui/{fr,en,es,el}.ts` | `retourMagasin`, `ameliorerVehicule` ; retrait de `concession` | Modifier (T1 puis T4) |
| `scripts/camions-profil-prompts.json` | Les 3 prompts de profil | Créer (T2) |
| `scripts/generate-camions-profil.mjs` | Génération Gemini → webp | Créer (T2) |
| `package.json` | Script `gen:camions` | Modifier (T2) |
| `public/coffre/{rogers,break,utilitaire}-profil.webp` | Les 3 assets | Générer (T2) |
| `src/lib/coffreAssets.ts` | Champ `profil` | Modifier (T2) |
| `src/components/vente/BoutonConcession.tsx` | Le bouton | Créer (T3) |
| `src/components/vente/BoutonConcession.test.tsx` | Tests | Créer (T3) |
| `src/components/vente/CoffreChargement.tsx` | Barre à trois boutons | Modifier (T4) |
| `src/components/vente/CoffreChargement.test.tsx` | Tests adaptés | Modifier (T4) |
| `src/components/vente/CoffreCanvas.tsx` | Retrait du slot `panneau` | Modifier (T4) |
| `src/components/vente/PanneauGarage.tsx` + `.test.tsx` | — | Supprimer (T4) |

---

### Task 1 : les deux libellés du bouton

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts`, `el.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `d.vente.retourMagasin`, `d.vente.ameliorerVehicule`.

**Note :** on **ajoute** seulement ici. Le retrait de `concession` attend la Task 4, parce que `PanneauGarage` la consomme encore et que `tsc` doit rester vert entre les tâches.

- [ ] **Step 1 : ajouter les clés en français**

Dans `src/lib/i18n/ui/fr.ts`, insérer juste après la ligne `concession: "Concession",` :

```ts
    retourMagasin: "Retour au magasin",
    ameliorerVehicule: "Améliorer le véhicule",
```

- [ ] **Step 2 : vérifier que TypeScript réclame les trois autres locales**

Run: `npx tsc --noEmit`
Expected: FAIL — trois erreurs, une par locale, `Property 'retourMagasin' is missing in type ... but required in type 'DeepStrings<...>'` sur `en.ts`, `es.ts`, `el.ts`.

- [ ] **Step 3 : ajouter les trois traductions**

Dans `src/lib/i18n/ui/en.ts`, après `concession: "Dealership",` :

```ts
    retourMagasin: "Back to the shop",
    ameliorerVehicule: "Upgrade the vehicle",
```

Dans `src/lib/i18n/ui/es.ts`, après `concession: "Concesionario",` :

```ts
    retourMagasin: "Volver a la tienda",
    ameliorerVehicule: "Mejorar el vehículo",
```

Dans `src/lib/i18n/ui/el.ts`, après `concession: "Αντιπροσωπεία",` :

```ts
    retourMagasin: "Επιστροφή στο μαγαζί",
    ameliorerVehicule: "Αναβάθμιση του οχήματος",
```

- [ ] **Step 4 : vérifier**

Run: `npx tsc --noEmit && npx vitest run src/lib/i18n/ui/ui.test.ts`
Expected: tsc silencieux, tests i18n PASS. Ces deux libellés ne portent aucun jeton `{x}` : le test de parité doit passer sans rien signaler.

- [ ] **Step 5 : commit**

```bash
git add src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts src/lib/i18n/ui/el.ts
git commit -m "i18n(garage): libellés du bouton de concession en 4 langues"
```

---

### Task 2 : les trois profils de véhicule

**Files:**
- Create: `scripts/camions-profil-prompts.json`
- Create: `scripts/generate-camions-profil.mjs`
- Modify: `package.json` (section `scripts`)
- Modify: `src/lib/coffreAssets.ts`
- Generate: `public/coffre/rogers-profil.webp`, `break-profil.webp`, `utilitaire-profil.webp`

**Interfaces:**
- Consumes: `public/coffre/{visuelId}-ferme.webp` (existants) comme images de référence.
- Produces: `CoffreAssets.profil: string` et les trois entrées correspondantes dans `COFFRE_ASSETS`.

**Contexte pour l'implémenteur :**

Le dépôt a un pipeline de génération rodé (`scripts/generate-qg-images.mjs` + `scripts/qg-prompts.json`). **Lis ce script avant d'écrire le tien** : tu en reprends le chargement de `.env`, la sélection de modèle `--model=pro|flash`, le `--force`, le filtrage par ids en arguments, et le mécanisme d'image de référence. Trois différences importantes :

1. **Le brief de style de `generate-qg-images.mjs` ne convient pas.** Il décrit le QG (« Art Déco museum catalog, cream parchment »). Les véhicules sont dans un autre style : illustration vectorielle propre, traits fins et sombres, aplats légèrement ombrés, palette sourde, sujet détouré. Ton script porte son propre brief.
2. **Les références sont des `.webp`, pas des `.png`.** Le `loadReferenceImage` de `generate-qg-images.mjs` lit `{refId}.png` ; le tien doit lire `public/coffre/{refId}.webp` et envoyer `mimeType: "image/webp"`.
3. **Écriture directe en webp**, pas de PNG intermédiaire. `generate-webp.mjs` ne couvre pas `public/coffre/`, et laisser des PNG dans `public/` alourdirait le bundle. Utilise `sharp(buf).webp({ quality: 82 }).toFile(...)` — la même qualité que `generate-webp.mjs`.

La clé API est déjà dans `.env` (`GEMINI_API_KEY`).

- [ ] **Step 1 : écrire les prompts**

Créer `scripts/camions-profil-prompts.json` :

```json
[
  {
    "id": "rogers-profil",
    "reference": "rogers-ferme",
    "description": "The SAME vehicle as in the reference image, seen in STRICT SIDE PROFILE (exact 90-degree side view, facing right). A small vintage French estate car, pale grey-blue bodywork, cream bumpers, thin chrome trim. Both wheels fully visible and resting on an invisible ground line. The whole vehicle fits inside the frame with a small even margin on all sides. Keep the reference's exact body colour, trim colour, wheel design, era and line weight — this must read as the same car turned sideways, not a similar one."
  },
  {
    "id": "break-profil",
    "reference": "break-ferme",
    "description": "The SAME vehicle as in the reference image, seen in STRICT SIDE PROFILE (exact 90-degree side view, facing right). A vintage estate wagon, longer than a small city car, with a long side window line and a squared rear. Both wheels fully visible and resting on an invisible ground line. The whole vehicle fits inside the frame with a small even margin on all sides. Keep the reference's exact body colour, trim colour, wheel design, era and line weight — this must read as the same car turned sideways, not a similar one."
  },
  {
    "id": "utilitaire-profil",
    "reference": "utilitaire-ferme",
    "description": "The SAME vehicle as in the reference image, seen in STRICT SIDE PROFILE (exact 90-degree side view, facing right). A vintage panel van with a tall boxy cargo body and a short bonnet. Both wheels fully visible and resting on an invisible ground line. The whole vehicle fits inside the frame with a small even margin on all sides. Keep the reference's exact body colour, trim colour, wheel design, era and line weight — this must read as the same van turned sideways, not a similar one."
  }
]
```

- [ ] **Step 2 : écrire le script de génération**

Créer `scripts/generate-camions-profil.mjs` :

```js
#!/usr/bin/env node
/**
 * Génère les profils de véhicules (boutons de concession) via Gemini Image API.
 *
 * Usage :
 *   npm run gen:camions                       # les 3
 *   npm run gen:camions -- --force            # regénère même les présents
 *   npm run gen:camions -- rogers-profil      # un seul
 *   npm run gen:camions -- --model=pro        # Nano Banana Pro
 *
 * Écrit directement `public/coffre/{id}.webp` : `generate-webp.mjs` ne couvre
 * pas ce dossier, et un PNG résiduel dans `public/` partirait dans le bundle.
 *
 * Chaque entrée porte `reference: "<id>"` — le script charge
 * `public/coffre/<id>.webp` (la vue arrière déjà en place) et l'envoie comme
 * image de référence, pour que le profil soit LE MÊME véhicule sous un autre
 * angle et non une voiture cousine.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "coffre");
const CONFIG_PATH = path.join(__dirname, "camions-profil-prompts.json");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");
const WEBP_QUALITY = 82;

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

// Style des assets de véhicules déjà en place (rogers/break/utilitaire) —
// volontairement différent du brief Art Déco du QG.
const STYLE_BRIEF = [
  "Clean vector-style illustration of a single vehicle, in the style of a game asset sheet.",
  "Thin dark ink outlines, flat colour fills with soft cel shading, muted and slightly desaturated palette.",
  "Fully transparent background, crisp clean edges around the subject for compositing.",
  "No ground shadow, no scenery, no background elements, no text, no captions, no watermark.",
].join(" ");

const REFERENCE_INTRO =
  "Reference image (first image, attached): the SAME vehicle, seen from the rear. Match its exact body colour, trim colour, wheel design, era, proportions, line weight and rendering style. Output the same vehicle seen in strict side profile, isolated on a transparent background — do NOT redraw the rear view.";

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
// Une voiture de profil est un format allongé : 3:2 évite de la tasser.
const aspectRatio = flagValue("aspect", "3:2");
const imageSize = flagValue("resolution", "2K");
const onlyIds = args.filter((a) => !a.startsWith("--"));

/** Charge une référence webp depuis `public/coffre/`. */
async function loadReferenceImage(refId) {
  const refPath = path.join(OUTPUT_DIR, `${refId}.webp`);
  try {
    const buf = await fs.readFile(refPath);
    return { mimeType: "image/webp", data: buf.toString("base64") };
  } catch (err) {
    throw new Error(
      `référence "${refId}.webp" introuvable dans ${OUTPUT_DIR}. Cause: ${err.message ?? err}`,
    );
  }
}

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const todo = onlyIds.length
    ? config.filter((c) => onlyIds.includes(c.id))
    : config;

  if (todo.length === 0) {
    console.error("Aucun profil à générer (filtres trop restrictifs ?).");
    process.exit(1);
  }
  console.log(`📋  ${todo.length} profil(s) à traiter\n`);

  const ai = new GoogleGenAI({ apiKey });
  let ok = 0, skipped = 0, failed = 0;

  for (const item of todo) {
    const filename = `${item.id}.webp`;
    const outPath = path.join(OUTPUT_DIR, filename);

    if (!force) {
      try {
        await fs.access(outPath);
        console.log(`⏭️  ${filename} déjà présent (--force pour regénérer)`);
        skipped++;
        continue;
      } catch {
        // pas encore généré
      }
    }

    const promptText = `${STYLE_BRIEF}\n\nSubject: ${item.description}`;

    let contents;
    try {
      const parts = [
        { text: REFERENCE_INTRO },
        { inlineData: await loadReferenceImage(item.reference) },
        { text: promptText },
      ];
      contents = [{ role: "user", parts }];
      console.log(
        `🎨  ${item.id} — génération en cours (${model}, ${aspectRatio}, ref: ${item.reference})…`,
      );
    } catch (err) {
      console.error(`❌  ${item.id} : ${err.message ?? err}`);
      failed++;
      continue;
    }

    if (verbose) console.log(`  prompt → ${promptText}`);

    const requestConfig =
      modelKey === "pro"
        ? { model, contents, config: { imageConfig: { aspectRatio, imageSize } } }
        : { model, contents };

    try {
      const response = await ai.models.generateContent(requestConfig);
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      let saved = false;
      for (const part of parts) {
        if (part.inlineData?.data) {
          const buf = Buffer.from(part.inlineData.data, "base64");
          await sharp(buf).webp({ quality: WEBP_QUALITY }).toFile(outPath);
          const { size } = await fs.stat(outPath);
          console.log(`✅  ${filename} (${Math.round(size / 1024)} kB)`);
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

  console.log(`\n— ${ok} générés, ${skipped} déjà présents, ${failed} échecs —`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
```

- [ ] **Step 3 : déclarer le script npm**

Dans `package.json`, ajouter à la section `scripts`, juste après la ligne `"gen:clients": ...` :

```json
    "gen:camions": "node scripts/generate-camions-profil.mjs",
```

- [ ] **Step 4 : générer les trois profils**

Run: `npm run gen:camions -- --model=pro`
Expected: `— 3 générés, 0 déjà présents, 0 échecs —`, et trois fichiers présents.

Vérifier : `ls -la public/coffre/*-profil.webp` doit lister trois fichiers non vides.

Si un asset échoue, relancer seulement celui-là : `npm run gen:camions -- --force rogers-profil`.

**Ce que tu dois regarder avant de continuer** (ouvre les trois images) : chaque véhicule est-il bien de profil strict, entier dans le cadre, sur fond transparent, et reconnaissable comme le même véhicule que sa référence ? Si un rendu est mauvais, relance-le avec `--force` avant de committer. Si après deux essais un asset reste inutilisable, **committe quand même les autres et signale-le** dans ton rapport — c'est un problème de génération, pas de code, et le propriétaire du projet a dit qu'il testerait le rendu.

- [ ] **Step 5 : exposer le champ `profil`**

Dans `src/lib/coffreAssets.ts`, ajouter au commentaire de tête, après la ligne
`* Convention dossier : \`public/coffre/{visuelId}-{etat}.webp\` où \`etat\` est`
`* \`ouvert\`, \`ferme\` ou \`mask\`.`
→ remplacer cette énumération par `` `ouvert`, `ferme`, `mask` ou `profil`. ``

Ajouter à l'interface `CoffreAssets`, après le champ `maskExpanded` :

```ts
  /** Véhicule vu de profil, détouré — sert au bouton de concession. */
  profil: string;
```

Ajouter à chacune des trois entrées de `COFFRE_ASSETS` :

```ts
    profil: "/coffre/rogers-profil.webp",
```
```ts
    profil: "/coffre/break-profil.webp",
```
```ts
    profil: "/coffre/utilitaire-profil.webp",
```

- [ ] **Step 6 : vérifier**

Run: `npx tsc --noEmit && npx eslint src && npx vitest run`
Expected: tout propre, suite verte. `CoffreAssets` étant élargi et les trois entrées complétées, aucun consommateur existant ne casse.

- [ ] **Step 7 : commit**

```bash
git add scripts/camions-profil-prompts.json scripts/generate-camions-profil.mjs package.json src/lib/coffreAssets.ts public/coffre/rogers-profil.webp public/coffre/break-profil.webp public/coffre/utilitaire-profil.webp
git commit -m "feat(garage): profils de véhicules générés pour le bouton de concession"
```

---

### Task 3 : le bouton de concession

**Files:**
- Create: `src/components/vente/BoutonConcession.tsx`
- Test: `src/components/vente/BoutonConcession.test.tsx`

**Interfaces:**
- Consumes: `d.vente.ameliorerVehicule` (Task 1) ; `getCoffreAssets(visuelId).profil` (Task 2) ; `CamionConfig` de `@/data/camion` ; `Wrench` de `lucide-react`.
- Produces:

```ts
export interface BoutonConcessionProps {
  actuel: CamionConfig;
  peutPayer: boolean;
  inerte: boolean;
  onOuvrir: () => void;
}
export function BoutonConcession(p: BoutonConcessionProps): JSX.Element;
```

**Notes pour l'implémenteur :**
- Les composants se rendent en français hors provider — `LangueContext` a une valeur par défaut FR (`src/lib/i18n/LangueContext.tsx:29`). Les tests n'ont besoin d'aucun wrapper.
- Ce bouton **doit** porter un `aria-label`. C'est l'exception à la règle du chantier : il n'a aucun texte, donc sans label un lecteur d'écran annonce « bouton » et rien d'autre.
- `Wrench` existe bien dans `lucide-react` (vérifié).
- Il montre le véhicule **actuel**, pas le palier suivant. La clé à molette dit « améliore ta voiture ».

- [ ] **Step 1 : écrire les tests qui échouent**

Créer `src/components/vente/BoutonConcession.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BoutonConcession } from "./BoutonConcession";
import { CAMIONS } from "@/data/camion";

afterEach(cleanup);

const ROGERS = CAMIONS[0];
const BREAK = CAMIONS[1];

describe("BoutonConcession", () => {
  it("montre le profil du véhicule ACTUEL, pas du suivant", () => {
    const { container } = render(
      <BoutonConcession
        actuel={ROGERS}
        peutPayer
        inerte={false}
        onOuvrir={() => {}}
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/coffre/rogers-profil.webp");
    expect(img?.getAttribute("src")).not.toContain(BREAK.visuelId);
  });

  it("porte un nom accessible non vide", () => {
    render(
      <BoutonConcession
        actuel={ROGERS}
        peutPayer
        inerte={false}
        onOuvrir={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Améliorer le véhicule" }),
    ).toBeTruthy();
  });

  it("grisé sans budget, mais toujours tapable", () => {
    const onOuvrir = vi.fn();
    render(
      <BoutonConcession
        actuel={ROGERS}
        peutPayer={false}
        inerte={false}
        onOuvrir={onOuvrir}
      />,
    );
    const bouton = screen.getByRole("button");
    expect(bouton.hasAttribute("disabled")).toBe(false);
    expect(Number(bouton.style.opacity)).toBeLessThan(1);
    fireEvent.click(bouton);
    expect(onOuvrir).toHaveBeenCalledTimes(1);
  });

  it("inerte : désactivé et non déclenchable", () => {
    const onOuvrir = vi.fn();
    render(
      <BoutonConcession
        actuel={ROGERS}
        peutPayer
        inerte
        onOuvrir={onOuvrir}
      />,
    );
    const bouton = screen.getByRole("button");
    expect(bouton.hasAttribute("disabled")).toBe(true);
    fireEvent.click(bouton);
    expect(onOuvrir).not.toHaveBeenCalled();
  });

  it("pleine opacité quand le budget suffit et qu'il est actif", () => {
    render(
      <BoutonConcession
        actuel={ROGERS}
        peutPayer
        inerte={false}
        onOuvrir={() => {}}
      />,
    );
    expect(Number(screen.getByRole("button").style.opacity)).toBe(1);
  });
});
```

- [ ] **Step 2 : lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/components/vente/BoutonConcession.test.tsx`
Expected: FAIL avec `Failed to resolve import "./BoutonConcession"`.

- [ ] **Step 3 : écrire le composant**

Créer `src/components/vente/BoutonConcession.tsx` :

```tsx
"use client";

import type { CSSProperties } from "react";
import { Wrench } from "lucide-react";
import type { CamionConfig } from "@/data/camion";
import { getCoffreAssets } from "@/lib/coffreAssets";
import { useLangue } from "@/lib/i18n/LangueContext";

export interface BoutonConcessionProps {
  /** Véhicule possédé — c'est lui qu'on montre, pas le palier suivant. */
  actuel: CamionConfig;
  /**
   * Le budget couvre-t-il le prochain palier ? Grise SANS désactiver :
   * consulter ce qu'on ne peut pas encore s'offrir entretient l'envie,
   * là où un bouton mort n'expliquerait rien.
   */
  peutPayer: boolean;
  /** Séquence de départ en cours : estompé et inopérant. */
  inerte: boolean;
  onOuvrir: () => void;
}

const boutonStyle = (peutPayer: boolean, inerte: boolean): CSSProperties => ({
  position: "relative",
  // Carré : la largeur suit la hauteur de la barre, pour que le véhicule
  // garde ses proportions quelle que soit la largeur de l'écran.
  width: "calc(var(--mobile-tabbar-h) - 8px)",
  height: "calc(100% - 8px)",
  flex: "0 0 auto",
  padding: 4,
  border: "1px solid var(--brass-500)",
  background: "transparent",
  cursor: inerte ? "not-allowed" : "pointer",
  opacity: inerte ? 0.4 : peutPayer ? 1 : 0.55,
  filter: peutPayer ? undefined : "grayscale(0.7)",
});

const vehiculeStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  pointerEvents: "none",
};

const cleStyle: CSSProperties = {
  position: "absolute",
  right: 1,
  bottom: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  borderRadius: "50%",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  pointerEvents: "none",
};

/**
 * Bouton central de la barre d'actions du chargement : le véhicule possédé
 * vu de profil, une clé à molette par-dessus. Purement présentationnel — il
 * ne connaît ni le GameState, ni le budget brut, ni l'achat.
 */
export function BoutonConcession(p: BoutonConcessionProps) {
  const { d } = useLangue();
  const visuel = getCoffreAssets(p.actuel.visuelId)?.profil ?? null;

  return (
    <button
      type="button"
      disabled={p.inerte}
      onClick={p.onOuvrir}
      // Exception assumée à la règle « pas d'aria-label quand le contenu
      // nomme le bouton » : ici il n'y a aucun texte, seulement une image
      // et une icône. Sans label, VoiceOver annonce « bouton » et rien d'autre.
      aria-label={d.vente.ameliorerVehicule}
      style={boutonStyle(p.peutPayer, p.inerte)}
    >
      {visuel && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={visuel} alt="" draggable={false} style={vehiculeStyle} />
      )}
      <span style={cleStyle} aria-hidden>
        <Wrench size={11} strokeWidth={2.4} />
      </span>
    </button>
  );
}
```

- [ ] **Step 4 : lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/components/vente/BoutonConcession.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5 : commit**

```bash
git add src/components/vente/BoutonConcession.tsx src/components/vente/BoutonConcession.test.tsx
git commit -m "feat(garage): bouton de concession, véhicule de profil et clé à molette"
```

---

### Task 4 : la barre à trois boutons, et le retrait de la pancarte

**Files:**
- Modify: `src/components/vente/CoffreChargement.tsx`
- Modify: `src/components/vente/CoffreChargement.test.tsx`
- Modify: `src/components/vente/CoffreCanvas.tsx`
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (retrait de `concession`)
- Delete: `src/components/vente/PanneauGarage.tsx`, `src/components/vente/PanneauGarage.test.tsx`

**Interfaces:**
- Consumes: `BoutonConcession` (Task 3), `d.vente.retourMagasin` (Task 1).
- Produces: rien de nouveau — c'est la tâche de bascule.

**Contexte pour l'implémenteur :** cette tâche est un échange atomique. La pancarte, son slot et sa clé i18n partent ; le bouton central arrive. Les trois doivent bouger ensemble, sinon `tsc` casse entre deux états.

**Ce qui NE change PAS et que tu ne dois pas toucher :** `ConcessionSheet` et son rendu, le garde dérivé `open={sheetOuverte && !closing}`, le garde `closing || releveRafRef.current !== null` en tête de `handleValider`, tout `releveVehicule.ts`, `lancerReleve`/`arreterReleve`, le bandeau de relève et son `pointerEvents`. Ces morceaux ont été durement gagnés en revue — si tu te retrouves à les modifier, arrête-toi et signale-le.

- [ ] **Step 1 : remplacer les requêtes par texte**

Dans `src/components/vente/CoffreChargement.test.tsx`, les tests interrogent la pancarte par son texte `"Concession"`. Le bouton n'a plus de texte : ils visent désormais son nom accessible.

Remplacer **toutes** les occurrences de `screen.getByText("Concession")` par :

```tsx
screen.getByRole("button", { name: "Améliorer le véhicule" })
```

et toutes les occurrences de `screen.queryByText("Concession")` par :

```tsx
screen.queryByRole("button", { name: "Améliorer le véhicule" })
```

Dans le premier test (`"affiche le panneau du palier suivant au niveau 1"`), supprimer aussi l'assertion `expect(screen.getByText("Break")).toBeTruthy();` : le bouton montre le véhicule **actuel** et n'affiche aucun nom. Sa couverture est reprise par le test « montre le profil du véhicule ACTUEL » de la Task 3. Renommer ce test en `"affiche le bouton de concession au niveau 1"`.

- [ ] **Step 2 : réécrire le test qui a changé de sens**

Un test ne change pas seulement de requête, il change d'affirmation. Le test actuel s'appelle :

```tsx
  it("tap sur Valider (voiture qui part) : la pancarte ET la fiche disparaissent", () => {
```

Il affirme `expect(screen.queryByText("Concession")).toBeNull();`. C'était vrai pour la pancarte murale, dont le garde incluait `closing`. **Ce n'est plus vrai pour le bouton**, qui reste monté et devient seulement inerte — décision de la spec, pour ne pas faire sauter la mise en page pendant que la voiture s'en va.

Remplacer ce test **entier** par celui-ci. Il conserve la fabrique d'objet et le ciblage de « Valider » d'origine, et l'`act` final qui purge les minuteurs :

```tsx
  it("tap sur Valider : la fiche disparaît, le bouton reste mais devient inerte", () => {
    // Un objet centré, sans chevauchement (trunkMask reste null en jsdom →
    // computeOverlapsPixel retombe sur les bornes [0,1]), pour que
    // peutValider soit vrai et que « Valider » soit tapable.
    const coffre = [
      {
        ...createMockObjetEnVitrine({
          objet: { templateId: "mus.33tours_jazz_1", categorie: "Musique" },
        }),
        posX: 0.5,
        posY: 0.5,
      },
    ];
    try {
      vi.useFakeTimers();
      poser({ coffre });

      const avant = screen.getByRole("button", {
        name: "Améliorer le véhicule",
      });
      expect(avant.hasAttribute("disabled")).toBe(false);

      // Ouvre la fiche de concession.
      fireEvent.click(avant);
      expect(screen.getByRole("dialog")).toBeTruthy();

      // Fiche ouverte : « Valider » reste tapable (barre d'actions au-dessus
      // du scrim/corps de la sheet) et déclenche le départ de la voiture.
      fireEvent.click(screen.getByRole("button", { name: "Valider le chargement" }));

      // La fiche disparaît (open dérivé de sheetOuverte && !closing).
      expect(screen.queryByRole("dialog")).toBeNull();

      // Le bouton, lui, RESTE monté : le faire disparaître ferait sauter la
      // mise en page pendant le départ. Il devient seulement inerte.
      const apres = screen.getByRole("button", {
        name: "Améliorer le véhicule",
      });
      expect(apres.hasAttribute("disabled")).toBe(true);

      // Laisse l'animation de départ (sons + tween + rAF) aller à son terme
      // pour ne laisser aucun minuteur en suspens à la fin du test.
      act(() => {
        vi.advanceTimersByTime(6000);
      });
    } finally {
      vi.useRealTimers();
    }
  });
```

Les tests « aucun panneau au niveau max » et « aucun panneau pendant le tutoriel » restent valables une fois leurs requêtes remplacées à l'étape 1 : ces deux gardes-là ne changent pas.

- [ ] **Step 3 : lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/components/vente/CoffreChargement.test.tsx`
Expected: FAIL — les requêtes par nom accessible ne trouvent rien, la pancarte n'ayant pas d'`aria-label`.

- [ ] **Step 4 : recomposer la barre**

Dans `src/components/vente/CoffreChargement.tsx` :

**4a.** Remplacer l'import `import { PanneauGarage } from "./PanneauGarage";` par :

```tsx
import { BoutonConcession } from "./BoutonConcession";
```

**4b.** Remplacer le bloc de calcul `panneauVisible` (le commentaire de trois lignes et la constante) par :

```tsx
  // Le bouton se retire quand il n'y a plus de palier et pendant le tutoriel
  // — la main de guidage désigne déjà le carrousel puis Valider, un second
  // appel du regard brouillerait la leçon. Il reste en place pendant `closing`
  // en revanche : faire disparaître un enfant de la barre au moment où le
  // joueur tape « Valider » ferait sauter la mise en page.
  const concessionVisible = prochainCamion !== null && p.tuto !== true;
```

**4c.** Supprimer entièrement la prop `panneau={…}` passée à `<CoffreCanvas>` (le bloc `panneau={ panneauVisible ? (<PanneauGarage … />) : null }`).

**4d.** Dans la barre d'actions fixe du bas, remplacer le libellé du bouton de gauche `{d.commun.annuler}` par :

```tsx
          {d.vente.retourMagasin}
```

**4e.** Insérer le bouton central **entre** les deux boutons existants :

```tsx
        {concessionVisible && (
          <BoutonConcession
            actuel={camion}
            peutPayer={p.budget >= prixProchain}
            inerte={closing}
            onOuvrir={() => setSheetOuverte(true)}
          />
        )}
```

**4f.** Sur le bouton « Valider », remplacer `flex: 2` par `flex: 1` — trois libellés à loger, et le grec est 40 à 90 % plus long que le français dans ce dépôt.

- [ ] **Step 5 : retirer le slot de `CoffreCanvas`**

Dans `src/components/vente/CoffreCanvas.tsx`, supprimer :
- le champ `panneau?: ReactNode;` et son commentaire dans l'interface `Props` ;
- `panneau,` de la déstructuration des paramètres ;
- la ligne `{panneau}` dans le JSX ;
- `type ReactNode` de l'import `react` s'il n'est plus utilisé ailleurs dans le fichier (vérifie avant de le retirer).

- [ ] **Step 6 : supprimer la pancarte**

```bash
git rm src/components/vente/PanneauGarage.tsx src/components/vente/PanneauGarage.test.tsx
```

- [ ] **Step 7 : retirer la clé i18n devenue orpheline**

Supprimer la ligne `concession: …` de chacun des quatre fichiers :
- `src/lib/i18n/ui/fr.ts` : `concession: "Concession",`
- `src/lib/i18n/ui/en.ts` : `concession: "Dealership",`
- `src/lib/i18n/ui/es.ts` : `concession: "Concesionario",`
- `src/lib/i18n/ui/el.ts` : `concession: "Αντιπροσωπεία",`

**Ne touche pas** à `d.commun.annuler` : le libellé du bouton change sur cet écran, mais la clé sert à six autres endroits (`atelier/page.tsx`, `ErrorScreen.tsx`, `ConfirmModal.tsx`, `ConfirmReplaceModal.tsx`).

- [ ] **Step 8 : lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/components/vente/CoffreChargement.test.tsx`
Expected: PASS, tous les tests du fichier.

- [ ] **Step 9 : vérifier l'ensemble**

Run: `npx vitest run && npx eslint src && npx tsc --noEmit`
Expected: suite complète verte, eslint et tsc silencieux.

Vérifier aussi qu'aucune référence résiduelle ne traîne :

Run: `grep -rn "PanneauGarage\|panneauVisible\|vente.concession" src/ ; echo "— fin —"`
Expected: aucune ligne avant `— fin —`.

- [ ] **Step 10 : commit**

```bash
git add -A src/components/vente src/lib/i18n/ui
git commit -m "feat(garage): la concession passe dans la barre d'actions

La pancarte murale ne rendait pas. Elle devient un bouton carré au centre
de la barre, montrant le véhicule possédé de profil avec une clé à molette.
Le slot panneau de CoffreCanvas et la clé i18n concession partent avec elle."
```

---

## Recette device

Non automatisable — à faire après la Task 4, sur simulateur iOS (`scripts/ios-sim.sh`) puis sur appareil.

- [ ] Le carré central ne comprime pas les deux libellés sur petit écran (iPhone SE), en français comme en grec (« Επιστροφή στο μαγαζί » et « Αναβάθμιση του οχήματος » sont longs).
- [ ] **Les trois profils sont-ils lisibles à la taille réelle du bouton** (~48-60 px de côté) ? Une voiture de profil réduite peut devenir illisible. Si c'est le cas, le repli est de recadrer sur l'avant du véhicule plutôt que de montrer la silhouette entière — ça se règle dans `camions-profil-prompts.json` sans toucher au code.
- [ ] La clé à molette reste lisible sur les trois carrosseries.
- [ ] Le bouton change bien de véhicule après un achat, à la fin de la relève.
- [ ] Rien ne saute dans la mise en page quand le bouton passe en inerte au départ de la voiture.
- [ ] VoiceOver : le bouton s'annonce avec son libellé, dans les quatre langues.
- [ ] Les points de recette du chantier précédent restent valables (taps pendant la relève, coffre plein à travers un changement de palier, reprise après mise en arrière-plan).
