# Borne d'arcade du Bazar — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Au tap sur la borne du coin arcade du Bazar, ouvrir un plein écran qui présente les onze jeux vidéo du catalogue, un à la fois, avec sa fausse capture pixel art en grand, son titre ou `???`, et des flèches pour circuler.

**Architecture:** Une façade illustrée à trou alpha est posée par-dessus une interface HTML positionnée en pourcentages du caisson — c'est l'ordre d'empilement qui fait que les joysticks dessinés masquent l'écran sans qu'aucun masque ne soit fabriqué. La borne ne fait que *lire* la collection : aucun champ de sauvegarde, aucune migration.

**Tech Stack:** Next.js 16 (App Router, "use client"), React 19, TypeScript, vitest + @testing-library/react (jsdom), sharp pour la fabrication d'images, `@google/genai` pour la génération.

**Spec:** `docs/superpowers/specs/2026-08-22-borne-arcade-design.md`

## Global Constraints

- **Tests :** `npx vitest run --maxWorkers=4 <chemin>`. **Le drapeau `--maxWorkers=4` est obligatoire** sur ce Mac : sans lui, ~41 tests échouent faussement par famine de workers.
- **Lint / types :** `npx tsc --noEmit` et `npx eslint src` doivent rester muets. (`npm run lint` est cassé depuis Next 16 — passer par `npx eslint src`.)
- **i18n :** quatre langues, FR/EN/ES/EL. Le type `DeepStrings` fait échouer `tsc` si une clé manque dans une langue — ajouter une clé à `fr.ts` oblige donc à la porter dans `en.ts`, `es.ts`, `el.ts`. **Jamais de chaîne localisée dans une sauvegarde.**
- **Aucune police pixel importée** : le grec n'est couvert par aucune. Le look CRT vient du rendu (phosphore vert, lignes de balayage, capitales, interlettrage) sur la pile monospace du système.
- **Aucun champ de sauvegarde neuf, aucune migration, `SAVE_VERSION` inchangé.**
- **Pas de scroll ni de mesure basés sur `window`** dans les composants de jeu (le `body` est verrouillé en WebView iOS) — mesurer un conteneur, jamais la fenêtre.
- **Commits en français**, préfixe conventionnel (`feat(bazar):`, `test(bazar):`, `chore(bazar):`), avec la ligne `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- **Branche :** `feat/borne-arcade-bazar` (déjà créée, déjà porteuse du décor).

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `scripts/generate-borne-arcade.mjs` | *Créé.* Génère la façade et la détoure (fond vert + écran magenta), mesure le trou et imprime les quatre pourcentages. |
| `public/bazar/borne-facade.webp` | *Créé.* La façade détourée, trou alpha à l'emplacement du CRT. |
| `public/bazar/arcade/<templateId>.webp` | *Créés (×11).* Les fausses captures pixel art. |
| `scripts/generate-captures-arcade.mjs` | *Créé.* Génère les onze captures en un seul brief. |
| `src/lib/collection.ts` | *Modifié.* Ajout de `templateDonne`. |
| `src/lib/bazar/arcade.ts` | *Créé.* `JEUX_ARCADE` (constante ordonnée) et `jeuxArcade(collection)`. |
| `src/components/bazar/borneArcadeLayout.ts` | *Créé.* Ratio du caisson, les quatre pourcentages du trou, et `dimensionnerBorne` (fonction pure). |
| `src/components/bazar/BorneArcadeEcran.tsx` | *Créé.* La coquille : dialogue plein écran, géométrie, empilement, sorties. |
| `src/components/bazar/EcranArcade.tsx` | *Créé.* Le contenu du CRT : capture ou neige, titre ou `???`, barre de pilotage. |
| `src/components/bazar/BorneArcade.tsx` | *Modifié.* Le décor devient un bouton qui ouvre l'écran. |
| `src/components/bazar/BazarScene.tsx` | *Modifié.* Porte l'état d'ouverture et rend l'écran hors du panorama. |
| `src/app/bazar/page.tsx` | *Modifié.* Dérive les onze états depuis la collection et les passe à la scène. |
| `src/lib/i18n/ui/{fr,en,es,el}.ts` | *Modifiés.* Six clés neuves sous `bazar`. |

---

### Task 1 : La façade — génération, détourage, mesure

**Files:**
- Create: `scripts/generate-borne-arcade.mjs`
- Create: `public/bazar/borne-facade.webp`
- Modify: `package.json` (script npm `gen:borne`)

**Interfaces:**
- Consumes: rien.
- Produces: `public/bazar/borne-facade.webp`, et **quatre pourcentages imprimés sur la sortie standard** que la Task 3 recopiera dans une constante.

> **Le tirage retenu existe déjà** : `~/Desktop/borne-large-2.png` (2400 × 1792, fond vert, écran magenta), choisi par l'auteur le 2026-08-22. **Ne pas le régénérer** — une nouvelle génération donnerait un autre dessin. Le script sert à la reproductibilité et au détourage ; on l'invoque ici en mode `--from`.

- [ ] **Step 1 : Écrire le script**

Créer `scripts/generate-borne-arcade.mjs` :

```js
#!/usr/bin/env node
/**
 * Fabrique la façade de la borne d'arcade du Bazar.
 *
 * Deux modes :
 *   node scripts/generate-borne-arcade.mjs --from <fichier.png>   # détoure un tirage existant
 *   node scripts/generate-borne-arcade.mjs --generer [n]          # produit n nouveaux tirages
 *
 * DEUX PIÈGES PAYÉS COMPTANT, encodés ici :
 *
 * 1. On ne demande JAMAIS « fond transparent » à Gemini : il PEINT un damier
 *    et rend une image parfaitement opaque. On demande un aplat vert franc,
 *    qu'on découpe nous-mêmes. (Constaté le 2026-08-22, et déjà sur les
 *    profils de camions.)
 * 2. Le fond vert se découpe par DIFFUSION depuis les bords, jamais par
 *    sélection de couleur : le pupitre porte des boutons verts qu'une
 *    sélection globale percerait aussi. Le magenta de l'écran, lui, peut
 *    partir par sélection — il n'apparaît nulle part ailleurs.
 */
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = path.join(ROOT, "public", "bazar", "borne-facade.webp");
const REFERENCE = path.join(ROOT, "public", "bazar", "borne-arcade.webp");

const args = process.argv.slice(2);
const from = args.includes("--from") ? args[args.indexOf("--from") + 1] : null;
const generer = args.includes("--generer");

const PROMPT_INTRO =
  "Reference image (attached): an arcade cabinet drawn in the exact style to keep. " +
  "Preserve its identity down to the details — the same wooden body, the same warm brown and " +
  "terracotta palette, the same thick hand-inked cartoon outlines, the same soft cel shading, " +
  "the same amber ARCADE marquee with its swirling background, the same red ball-top joysticks " +
  "and the same clusters of round colored buttons. Redraw this same cabinet as described below.";

const PROMPT_SUJET = [
  "Front elevation of the same arcade cabinet, strictly frontal and straight-on, camera at screen",
  "height, both side panels hidden behind the front face, every horizontal edge perfectly horizontal",
  "and every vertical edge perfectly vertical.",
  "",
  "THE ONE CHANGE: the monitor is BIG. It is a wide 4:3 screen, wider than tall, and it fills almost",
  "the whole front of the cabinet: the bezel around it is a NARROW strip, a thin dark frame just a few",
  "centimetres wide on each side, so the glass reaches nearly to the left and right edges of the cabinet.",
  "The screen is the dominant feature of the image.",
  "",
  "Top to bottom: a slim illuminated marquee header with ARCADE in chunky amber letters; immediately",
  "below it the big 4:3 screen inside its thin bezel; below that the control panel with two ball-top",
  "joysticks and two clusters of round colored buttons. The image is cropped just below the control panel.",
  "",
  "The screen area is filled edge to edge with ONE single flat uniform saturated magenta (RGB 255, 0, 255),",
  "a smooth evenly lit block of pure color, exactly like a chroma-key screen on a film set.",
  "",
  "The area around the cabinet is filled with ONE single flat uniform saturated pure green (RGB 0, 255, 0),",
  "a smooth even backdrop, exactly like a chroma-key green screen. The cabinet keeps a crisp clean silhouette.",
].join(" ");

async function chargerEnv() {
  try {
    const contenu = await fs.readFile(path.join(ROOT, ".env"), "utf8");
    for (const ligne of contenu.split("\n")) {
      const l = ligne.trim();
      if (!l || l.startsWith("#")) continue;
      const eq = l.indexOf("=");
      if (eq < 0) continue;
      const k = l.slice(0, eq).trim();
      let v = l.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* pas de .env */
  }
}

async function tirages(n) {
  await chargerEnv();
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const ref = await fs.readFile(REFERENCE);
  const contents = [
    {
      role: "user",
      parts: [
        { text: PROMPT_INTRO },
        { inlineData: { mimeType: "image/webp", data: ref.toString("base64") } },
        { text: `Subject: ${PROMPT_SUJET}` },
      ],
    },
  ];
  for (let i = 1; i <= n; i++) {
    const res = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents,
      config: { imageConfig: { aspectRatio: "4:3", imageSize: "2K" } },
    });
    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p) => p.inlineData?.data);
    if (!img) {
      console.log(`❌ tirage ${i} : pas d'image`);
      continue;
    }
    const out = path.join(ROOT, `borne-tirage-${i}.png`);
    await fs.writeFile(out, Buffer.from(img.inlineData.data, "base64"));
    console.log(`✅ ${out}`);
  }
  console.log("Choisir un tirage, puis relancer avec --from <fichier>.");
}

async function detourer(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const idx = (x, y) => (y * W + x) * 4;

  // 1. le fond vert, par diffusion depuis les bords (les boutons verts du
  //    pupitre ne sont reliés à aucun bord, ils survivent).
  const estVert = (x, y) => {
    const i = idx(x, y);
    return (
      data[i + 1] > 150 &&
      data[i] < 140 &&
      data[i + 2] < 140 &&
      data[i + 1] - Math.max(data[i], data[i + 2]) > 60
    );
  };
  const vu = new Uint8Array(W * H);
  const pile = [];
  for (let x = 0; x < W; x++) pile.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) pile.push([0, y], [W - 1, y]);
  while (pile.length) {
    const [x, y] = pile.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const p = y * W + x;
    if (vu[p] || !estVert(x, y)) continue;
    vu[p] = 1;
    data[idx(x, y) + 3] = 0;
    pile.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  // 2. le magenta de l'écran, par sélection.
  let sx0 = W;
  let sy0 = H;
  let sx1 = -1;
  let sy1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (data[i] > 190 && data[i + 2] > 190 && data[i + 1] < 90) {
        data[i + 3] = 0;
        if (x < sx0) sx0 = x;
        if (x > sx1) sx1 = x;
        if (y < sy0) sy0 = y;
        if (y > sy1) sy1 = y;
      }
    }
  }

  // 3. rogner aux bornes du caisson.
  let ax0 = W;
  let ay0 = H;
  let ax1 = -1;
  let ay1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[idx(x, y) + 3] > 128) {
        if (x < ax0) ax0 = x;
        if (x > ax1) ax1 = x;
        if (y < ay0) ay0 = y;
        if (y > ay1) ay1 = y;
      }
    }
  }
  const cw = ax1 - ax0 + 1;
  const ch = ay1 - ay0 + 1;

  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: ax0, top: ay0, width: cw, height: ch })
    .resize({ width: 1000 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(SORTIE);

  const pct = (v, base, off) => +((100 * (v - off)) / base).toFixed(2);
  console.log(`✅ ${SORTIE}`);
  console.log(`   caisson  ${cw} × ${ch}  ratio ${(cw / ch).toFixed(3)}`);
  console.log("   ── à recopier dans borneArcadeLayout.ts ──");
  console.log(`   ratio : ${(cw / ch).toFixed(3)}`);
  console.log(
    `   trou  : left ${pct(sx0, cw, ax0)}  right ${(100 - pct(sx1 + 1, cw, ax0)).toFixed(2)}` +
      `  top ${pct(sy0, ch, ay0)}  bottom ${(100 - pct(sy1 + 1, ch, ay0)).toFixed(2)}`,
  );
}

if (generer) {
  const n = Number(args[args.indexOf("--generer") + 1]) || 3;
  await tirages(n);
} else if (from) {
  await detourer(from);
} else {
  console.error("Usage : --from <fichier.png>  |  --generer [n]");
  process.exit(1);
}
```

- [ ] **Step 2 : Déclarer le script npm**

Dans `package.json`, à la suite des autres `gen:*` :

```json
"gen:borne": "node scripts/generate-borne-arcade.mjs",
```

- [ ] **Step 3 : Produire l'asset depuis le tirage retenu**

```bash
npm run gen:borne -- --from ~/Desktop/borne-large-2.png
```

Attendu sur la sortie : `caisson 1681 × 1791 ratio 0.939`, et une ligne
`trou : left 14.16 right 14.22 top 24.57 bottom 25.96`.
**Noter ces cinq nombres** — la Task 3 les recopie.

Si le fichier `~/Desktop/borne-large-2.png` a disparu, le régénérer avec
`npm run gen:borne -- --generer 3`, choisir un tirage à l'œil (écran 4:3 à
cadre mince, caisson bien de face), et refaire ce Step. Les nombres seront
alors différents, et ce sont ceux-là qu'il faudra reporter.

- [ ] **Step 4 : Vérifier que le trou est un vrai trou**

```bash
node -e "
const sharp=require('sharp');
sharp('public/bazar/borne-facade.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true}).then(({data,info})=>{
  const W=info.width,H=info.height;
  const centre=data[((Math.floor(H*0.5)*W)+Math.floor(W*0.5))*4+3];
  const coin=data[3];
  console.log('alpha au centre de l écran :',centre,'(attendu 0)');
  console.log('alpha au coin de l image  :',coin,'(attendu 0)');
});
"
```

Attendu : deux zéros. Un centre à 255 veut dire que le magenta n'a pas été
découpé — vérifier que le tirage a bien un écran magenta et non peint.

- [ ] **Step 5 : Commit**

```bash
git add scripts/generate-borne-arcade.mjs package.json public/bazar/borne-facade.webp
git commit -m "$(cat <<'EOF'
feat(bazar): la façade de la borne d'arcade, détourée à deux trous

Le fond vert part par diffusion depuis les bords et non par sélection de
couleur : le pupitre porte des boutons verts qu'une sélection globale
percerait aussi. Le magenta de l'écran, lui, part par sélection — il
n'apparaît nulle part ailleurs.

Le script ne demande jamais « fond transparent » à Gemini : il peint un
damier et rend une image opaque. On demande des aplats francs, on découpe.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2 : Le socle — les onze jeux et leur état

**Files:**
- Modify: `src/lib/collection.ts` (à la suite de `templateVu`, ~ligne 270)
- Create: `src/lib/bazar/arcade.ts`
- Test: `src/lib/collection.test.ts` (existant, y ajouter), `src/lib/bazar/arcade.test.ts`

**Interfaces:**
- Consumes: `CollectionSlot`, `CategorieObjet` (`@/types/game`), `getTemplate` (`@/data/objetTemplates`).
- Produces :
  - `templateDonne(collection: Record<CategorieObjet, CollectionSlot[]>, templateId: string): boolean`
  - `JEUX_ARCADE: readonly string[]` (11 entrées, ordonnées)
  - `jeuxArcade(collection): { templateId: string; trouve: boolean }[]`

- [ ] **Step 1 : Écrire le test de `templateDonne`**

Ajouter à `src/lib/collection.test.ts` :

```ts
describe("templateDonne", () => {
  it("est faux tant que le slot n'a pas de donation, même déjà possédé", () => {
    const c = initCollection();
    const cat = getTemplate("jx.cartouche_bluebot_8_bit")!.categorie;
    const slot = c[cat].find((s) => s.templateId === "jx.cartouche_bluebot_8_bit")!;
    slot.dejaPossede = true;
    slot.vu = true;
    expect(templateDonne(c, "jx.cartouche_bluebot_8_bit")).toBe(false);
  });

  it("est vrai dès qu'une donation occupe le slot", () => {
    const c = initCollection();
    const cat = getTemplate("jx.cartouche_bluebot_8_bit")!.categorie;
    const slot = c[cat].find((s) => s.templateId === "jx.cartouche_bluebot_8_bit")!;
    slot.donation = { etat: "Bon", valeur: 42 };
    expect(templateDonne(c, "jx.cartouche_bluebot_8_bit")).toBe(true);
  });

  it("est faux pour un templateId qui n'existe nulle part", () => {
    expect(templateDonne(initCollection(), "xx.inexistant")).toBe(false);
  });
});
```

Ajouter `templateDonne` et `getTemplate` aux imports en tête du fichier de test.

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run : `npx vitest run --maxWorkers=4 src/lib/collection.test.ts`
Attendu : ÉCHEC, `templateDonne is not a function`.

- [ ] **Step 3 : Implémenter `templateDonne`**

À la suite de `templateVu` dans `src/lib/collection.ts` :

```ts
/**
 * Vrai si le template occupe un slot de la collection par une DONATION —
 * la collection au sens strict du jeu, pas « déjà possédé ».
 *
 * La nuance est le sujet même de la borne d'arcade : elle récompense le geste
 * de donner, pas celui de passer. Un jeu acheté puis revendu y redevient
 * inconnu, et c'est voulu.
 */
export function templateDonne(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
): boolean {
  return Object.values(collection).some((slots) =>
    slots.some((s) => s.templateId === templateId && s.donation !== null),
  );
}
```

- [ ] **Step 4 : Lancer le test, vérifier qu'il passe**

Run : `npx vitest run --maxWorkers=4 src/lib/collection.test.ts`
Attendu : SUCCÈS.

- [ ] **Step 5 : Écrire le test de `JEUX_ARCADE`**

Créer `src/lib/bazar/arcade.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { JEUX_ARCADE, jeuxArcade } from "./arcade";
import { getTemplate } from "@/data/objetTemplates";
import { initCollection } from "@/lib/collection";

describe("JEUX_ARCADE", () => {
  it("porte les onze jeux, sans doublon", () => {
    expect(JEUX_ARCADE).toHaveLength(11);
    expect(new Set(JEUX_ARCADE).size).toBe(11);
  });

  // LE test qui compte. La constante est une liste écrite à la main : rien
  // n'empêche un renommage du catalogue de la laisser pointer dans le vide,
  // et le joueur verrait alors un « ??? » qui ne peut jamais tomber.
  it("chaque identifiant existe encore dans le catalogue", () => {
    for (const id of JEUX_ARCADE) {
      expect({ id, connu: getTemplate(id) !== undefined }).toEqual({ id, connu: true });
    }
  });

  it("ne contient que des objets de la catégorie Jeux & Loisirs", () => {
    for (const id of JEUX_ARCADE) {
      expect({ id, cat: getTemplate(id)!.categorie }).toEqual({ id, cat: "Jeux & Loisirs" });
    }
  });
});

describe("jeuxArcade", () => {
  it("rend les onze jeux dans l'ordre de la constante, tous inconnus sur une collection neuve", () => {
    const jeux = jeuxArcade(initCollection());
    expect(jeux.map((j) => j.templateId)).toEqual([...JEUX_ARCADE]);
    expect(jeux.every((j) => !j.trouve)).toBe(true);
  });

  it("marque trouvé le seul jeu dont le slot porte une donation", () => {
    const c = initCollection();
    const cible = JEUX_ARCADE[3];
    const cat = getTemplate(cible)!.categorie;
    c[cat].find((s) => s.templateId === cible)!.donation = { etat: "Bon", valeur: 10 };
    const jeux = jeuxArcade(c);
    expect(jeux.filter((j) => j.trouve).map((j) => j.templateId)).toEqual([cible]);
  });
});
```

- [ ] **Step 6 : Lancer le test, vérifier qu'il échoue**

Run : `npx vitest run --maxWorkers=4 src/lib/bazar/arcade.test.ts`
Attendu : ÉCHEC, module `./arcade` introuvable.

- [ ] **Step 7 : Implémenter `arcade.ts`**

Créer `src/lib/bazar/arcade.ts` :

```ts
import type { CategorieObjet, CollectionSlot } from "@/types/game";
import { templateDonne } from "@/lib/collection";

/**
 * Les onze jeux vidéo du catalogue, dans l'ordre où la borne les présente.
 *
 * UNE CONSTANTE ÉCRITE À LA MAIN, ET PAS UN FILTRE. Un filtre du genre
 * « tous les `jx.*` dont le nom contient bit » se réécrirait tout seul le jour
 * où le catalogue bouge : ajouter un jeu renumérote la série, le n° 3 du
 * joueur devient le n° 4, et « 03 / 11 » cesse de vouloir dire quelque chose.
 * Le prix à payer est un test de cohérence (`arcade.test.ts`), qui vérifie que
 * chaque identifiant existe encore.
 *
 * L'ordre suit les générations de console, 8-bit d'abord. Le parcours de
 * gauche à droite raconte ainsi une petite chronologie, et les trois 8-bit —
 * les moins chers, donc les premiers trouvés — ouvrent la série : elle se
 * remplit par le début, ce qui se voit.
 *
 * ⚠ Un jeu qu'on AJOUTE va en FIN de liste, jamais au milieu : renuméroter
 * ce que les joueurs connaissent déjà n'apporte rien à personne.
 */
export const JEUX_ARCADE = [
  "jx.cartouche_bluebot_8_bit",
  "jx.cartouche_la_legende_de_solda_8_bit",
  "jx.cartouche_le_plombier_sauteur_8_bit",
  "jx.cartouche_turbo_herisson_16_bit",
  "jx.cartouche_street_castagne_ii_16_bit",
  "jx.cartouche_gachette_du_temps_rpg_16_bit",
  "jx.jeu_le_manoir_du_mal_32_bit",
  "jx.jeu_foxy_crush_32_bit",
  "jx.jeu_engrenage_de_metal_infiltration_32_bit",
  "jx.jeu_solda_flute_temporelle_aventure_3d_64_bit",
  "jx.jeu_d_aventure_japonais_128_bit",
] as const;

export interface JeuArcade {
  templateId: string;
  /** Vrai si l'exemplaire est DANS la collection (donation posée). */
  trouve: boolean;
}

/**
 * L'état des onze jeux, dans l'ordre d'affichage. Fonction pure : la scène la
 * reçoit déjà calculée, elle ne touche jamais à la collection elle-même.
 */
export function jeuxArcade(
  collection: Record<CategorieObjet, CollectionSlot[]>,
): JeuArcade[] {
  return JEUX_ARCADE.map((templateId) => ({
    templateId,
    trouve: templateDonne(collection, templateId),
  }));
}
```

- [ ] **Step 8 : Lancer les tests, vérifier qu'ils passent**

Run : `npx vitest run --maxWorkers=4 src/lib/bazar/arcade.test.ts src/lib/collection.test.ts`
Attendu : SUCCÈS.

- [ ] **Step 9 : Commit**

```bash
git add src/lib/collection.ts src/lib/collection.test.ts src/lib/bazar/arcade.ts src/lib/bazar/arcade.test.ts
git commit -m "$(cat <<'EOF'
feat(bazar): les onze jeux de la borne, et leur état de collection

JEUX_ARCADE est une constante écrite à la main et non un filtre sur le
catalogue : un filtre se réécrirait tout seul le jour où un jeu s'ajoute,
la série se renuméroterait, et « 03 / 11 » cesserait de vouloir dire
quelque chose. Un test garde le risque inverse — chaque identifiant doit
encore exister dans le catalogue.

templateDonne lit la donation et non dejaPossede : la borne récompense le
geste de donner, pas celui de passer. Un jeu revendu y redevient inconnu.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3 : La géométrie — les quatre nombres et la mise à l'échelle

**Files:**
- Create: `src/components/bazar/borneArcadeLayout.ts`
- Test: `src/components/bazar/borneArcadeLayout.test.ts`

**Interfaces:**
- Consumes: les cinq nombres imprimés par la Task 1.
- Produces :
  - `BORNE_FACADE: { ratio: number; trou: { left; right; top; bottom } }`
  - `PART_LARGEUR_TROU: number`
  - `dimensionnerBorne(dispo: { w: number; h: number }): { w: number; h: number }`

- [ ] **Step 1 : Écrire le test**

Créer `src/components/bazar/borneArcadeLayout.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { BORNE_FACADE, PART_LARGEUR_TROU, dimensionnerBorne } from "./borneArcadeLayout";

describe("BORNE_FACADE", () => {
  it("décrit un trou qui tient dans le caisson", () => {
    const { left, right, top, bottom } = BORNE_FACADE.trou;
    expect(left + right).toBeLessThan(100);
    expect(top + bottom).toBeLessThan(100);
    for (const v of [left, right, top, bottom]) expect(v).toBeGreaterThan(0);
  });

  it("laisse un trou de proportions 4:3 environ", () => {
    const { left, right, top, bottom } = BORNE_FACADE.trou;
    const l = (100 - left - right) / 100;
    const h = (100 - top - bottom) / 100;
    // largeur et hauteur du trou en px, sur un caisson de hauteur 1
    const ratio = (l * BORNE_FACADE.ratio) / h;
    expect(ratio).toBeGreaterThan(1.2);
    expect(ratio).toBeLessThan(1.5);
  });
});

describe("dimensionnerBorne", () => {
  // Sur un téléphone c'est la LARGEUR qui commande : le caisson déborde des
  // deux côtés, ce que l'auteur a explicitement autorisé — seul l'écran doit
  // être vu en entier.
  it("sur un téléphone, cale le trou sur la largeur et laisse le bois déborder", () => {
    const { w, h } = dimensionnerBorne({ w: 393, h: 760 });
    expect(w).toBeGreaterThan(393); // le caisson déborde
    expect(h).toBeLessThanOrEqual(760); // mais il tient en hauteur
    const largeurTrou = (w * (100 - BORNE_FACADE.trou.left - BORNE_FACADE.trou.right)) / 100;
    expect(largeurTrou).toBeCloseTo(393 * PART_LARGEUR_TROU, 0);
  });

  // Sur un écran large et court, c'est la hauteur qui commande, sinon le
  // marquee et le pupitre sortiraient du cadre et on ne reconnaîtrait plus
  // une borne.
  it("sur un écran large et court, cale le caisson sur la hauteur", () => {
    const { w, h } = dimensionnerBorne({ w: 1200, h: 500 });
    expect(h).toBeCloseTo(500, 0);
    expect(w).toBeCloseTo(500 * BORNE_FACADE.ratio, 0);
  });

  it("garde toujours le ratio du caisson", () => {
    for (const dispo of [{ w: 320, h: 600 }, { w: 393, h: 760 }, { w: 1024, h: 700 }]) {
      const { w, h } = dimensionnerBorne(dispo);
      expect(w / h).toBeCloseTo(BORNE_FACADE.ratio, 3);
    }
  });

  it("ne rend jamais de dimension nulle ou négative sur une place absurde", () => {
    const { w, h } = dimensionnerBorne({ w: 0, h: 0 });
    expect(w).toBe(0);
    expect(h).toBe(0);
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run : `npx vitest run --maxWorkers=4 src/components/bazar/borneArcadeLayout.test.ts`
Attendu : ÉCHEC, module introuvable.

- [ ] **Step 3 : Implémenter**

Créer `src/components/bazar/borneArcadeLayout.ts` :

```ts
/**
 * Géométrie de la façade de la borne d'arcade.
 *
 * Ces nombres sont MESURÉS sur `public/bazar/borne-facade.webp`, pas calés à
 * l'œil. Pour les re-mesurer après une régénération de l'asset :
 *
 *     npm run gen:borne -- --from <tirage.png>
 *
 * le script imprime le ratio et les quatre pourcentages à recopier ici. C'est
 * tout ce qu'une nouvelle façade demande — aucun code à retoucher.
 */
export const BORNE_FACADE = {
  /** largeur / hauteur du caisson détouré (1681 × 1791). */
  ratio: 0.939,
  /**
   * Le trou du CRT, en pourcentages du caisson. `right` et `bottom` sont des
   * RETRAITS depuis le bord opposé, pour se poser tels quels en CSS.
   */
  trou: { left: 14.16, right: 14.22, top: 24.57, bottom: 25.96 },
} as const;

/**
 * Part de la largeur disponible que le TROU doit occuper.
 *
 * On cale le trou, pas le caisson : l'auteur a explicitement autorisé le bois
 * à sortir du cadre du moment que l'écran est vu en entier. Sans ça, un
 * caisson entier tenu dans un téléphone ne laisserait qu'un écran de
 * 268 × 196 — trop petit pour porter une capture en grand, qui est tout
 * l'objet de cet écran.
 *
 * 92 % et pas 100 % : il faut un filet de bois de chaque côté, sinon le trou
 * touche les bords et la borne cesse de se lire comme un meuble.
 */
export const PART_LARGEUR_TROU = 0.92;

/**
 * Dimensions du caisson pour une place donnée.
 *
 * Deux règles, la seconde bornant la première :
 *   1. le trou occupe `PART_LARGEUR_TROU` de la largeur disponible ;
 *   2. mais le caisson ENTIER doit tenir en hauteur — c'est ce qui garantit
 *      que le marquee et le pupitre restent visibles, et donc qu'on reconnaît
 *      une borne. Sur un téléphone c'est (1) qui gagne, sur un écran large et
 *      court c'est (2).
 */
export function dimensionnerBorne(dispo: { w: number; h: number }): {
  w: number;
  h: number;
} {
  if (dispo.w <= 0 || dispo.h <= 0) return { w: 0, h: 0 };
  const partTrou = (100 - BORNE_FACADE.trou.left - BORNE_FACADE.trou.right) / 100;
  const parLargeur = (dispo.w * PART_LARGEUR_TROU) / partTrou;
  const parHauteur = dispo.h * BORNE_FACADE.ratio;
  const w = Math.min(parLargeur, parHauteur);
  return { w, h: w / BORNE_FACADE.ratio };
}
```

- [ ] **Step 4 : Lancer le test, vérifier qu'il passe**

Run : `npx vitest run --maxWorkers=4 src/components/bazar/borneArcadeLayout.test.ts`
Attendu : SUCCÈS (5 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/components/bazar/borneArcadeLayout.ts src/components/bazar/borneArcadeLayout.test.ts
git commit -m "$(cat <<'EOF'
feat(bazar): la géométrie de la façade, mesurée et non calée à l'œil

Quatre pourcentages relevés sur l'asset, plus la règle de mise à l'échelle :
on cale le TROU et pas le caisson, le bois a le droit de sortir du cadre du
moment que l'écran est vu en entier. Une seconde règle borne la première —
le caisson entier doit tenir en hauteur, sinon le marquee et le pupitre
sortent et on ne reconnaît plus une borne.

La fonction est pure et testée seule : jsdom n'a pas de layout, aucun test
de composant ne pourrait vérifier ces nombres.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4 : Les libellés, dans les quatre langues

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts`, `el.ts` (bloc `bazar`)
- Test: `src/lib/i18n/ui/ui.test.ts` (existant — il passe seul, rien à écrire)

**Interfaces:**
- Produces: `d.bazar.borneOuvrir`, `borneTitre`, `borneFermer`, `bornePasDeSignal`, `borneJeuPrecedent`, `borneJeuSuivant`.

> `tsc` refuse de compiler si une clé manque dans une des quatre langues (type `DeepStrings`) : c'est le filet, il n'y a pas de test à écrire pour ça.

- [ ] **Step 1 : Ajouter les clés au dictionnaire français**

Dans `src/lib/i18n/ui/fr.ts`, à la fin du bloc `bazar:` :

```ts
    borneOuvrir: "Voir la borne d'arcade",
    borneTitre: "Borne d'arcade",
    borneFermer: "Fermer la borne",
    bornePasDeSignal: "PAS DE SIGNAL",
    borneJeuPrecedent: "Jeu précédent",
    borneJeuSuivant: "Jeu suivant",
```

- [ ] **Step 2 : Vérifier que `tsc` réclame les trois autres langues**

Run : `npx tsc --noEmit`
Attendu : ÉCHEC, trois erreurs de propriétés manquantes sur `en`, `es`, `el`.

- [ ] **Step 3 : Porter les clés dans les trois autres langues**

`en.ts` :

```ts
    borneOuvrir: "View the arcade cabinet",
    borneTitre: "Arcade cabinet",
    borneFermer: "Close the cabinet",
    bornePasDeSignal: "NO SIGNAL",
    borneJeuPrecedent: "Previous game",
    borneJeuSuivant: "Next game",
```

`es.ts` :

```ts
    borneOuvrir: "Ver la máquina recreativa",
    borneTitre: "Máquina recreativa",
    borneFermer: "Cerrar la máquina",
    bornePasDeSignal: "SIN SEÑAL",
    borneJeuPrecedent: "Juego anterior",
    borneJeuSuivant: "Juego siguiente",
```

`el.ts` :

```ts
    borneOuvrir: "Δείτε το μηχάνημα arcade",
    borneTitre: "Μηχάνημα arcade",
    borneFermer: "Κλείσιμο",
    bornePasDeSignal: "ΧΩΡΙΣ ΣΗΜΑ",
    borneJeuPrecedent: "Προηγούμενο παιχνίδι",
    borneJeuSuivant: "Επόμενο παιχνίδι",
```

> ⚠ Le grec de ce dépôt n'est pas certifié par un locuteur — c'est un point
> ouvert connu du projet. Ces six chaînes rejoignent la liste à faire relire ;
> ne pas les présenter comme validées.

- [ ] **Step 4 : Vérifier**

Run : `npx tsc --noEmit && npx vitest run --maxWorkers=4 src/lib/i18n/ui/ui.test.ts`
Attendu : `tsc` muet, tests au vert.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts src/lib/i18n/ui/el.ts
git commit -m "$(cat <<'EOF'
feat(i18n): les six libellés de la borne d'arcade, en quatre langues

« ??? » n'en fait pas partie : c'est un symbole, pas une chaîne à traduire,
il reste identique partout.

Le grec reste à faire relire par un locuteur, comme le reste du dictionnaire.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5 : L'écran du CRT — un jeu à la fois

**Files:**
- Create: `src/components/bazar/EcranArcade.tsx`
- Test: `src/components/bazar/EcranArcade.test.tsx`

**Interfaces:**
- Consumes: `JeuArcade` (Task 2), `useLangue`, `getTemplate`, `nomObjet` (`@/lib/i18n/contenu`).
- Produces: `<EcranArcade jeux={JeuArcade[]} />` — composant autonome, sans géométrie : il remplit son conteneur.

> Le motif est celui du carrousel de chinage (`ItemSwipeDeck.tsx`) : bornes
> strictes sans boucle, flèche désactivée au bout, compteur « i / n », swipe au
> pointeur avec un seuil de 40 px. On en reprend le vocabulaire, pas le code —
> ce deck-là traîne des cross-fades, des sons et un mode tutoriel dont la borne
> n'a que faire.

- [ ] **Step 1 : Écrire le test**

Créer `src/components/bazar/EcranArcade.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { EcranArcade } from "./EcranArcade";
import type { JeuArcade } from "@/lib/bazar/arcade";
import { JEUX_ARCADE } from "@/lib/bazar/arcade";

afterEach(cleanup);

/** Les onze jeux, ceux d'indices `trouves` étant dans la collection. */
function jeux(...trouves: number[]): JeuArcade[] {
  return JEUX_ARCADE.map((templateId, i) => ({ templateId, trouve: trouves.includes(i) }));
}

describe("EcranArcade", () => {
  it("s'ouvre sur le premier jeu et affiche le compteur", () => {
    render(<EcranArcade jeux={jeux(0)} />);
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("01 / 11");
  });

  it("un jeu trouvé montre son nom et sa capture", () => {
    render(<EcranArcade jeux={jeux(0)} />);
    const img = screen.getByTestId("arcade-capture") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(`/bazar/arcade/${JEUX_ARCADE[0]}.webp`);
    expect(screen.getByTestId("arcade-titre").textContent).not.toBe("???");
  });

  it("un jeu inconnu montre ??? et pas de signal", () => {
    render(<EcranArcade jeux={jeux()} />);
    expect(screen.getByTestId("arcade-titre").textContent).toBe("???");
    expect(screen.getByText("PAS DE SIGNAL")).toBeTruthy();
  });

  // Une image posée dans le DOM puis masquée en CSS reste visible dans
  // l'onglet réseau : le contenu à découvrir fuiterait pour qui regarde.
  it("la capture d'un jeu inconnu n'est pas dans le DOM du tout", () => {
    render(<EcranArcade jeux={jeux()} />);
    expect(screen.queryByTestId("arcade-capture")).toBe(null);
  });

  it("la flèche suivante avance d'un jeu", () => {
    render(<EcranArcade jeux={jeux()} />);
    fireEvent.click(screen.getByRole("button", { name: "Jeu suivant" }));
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("02 / 11");
  });

  // Bornes strictes, pas de boucle : c'est la règle du carrousel de chinage,
  // et le joueur la connaît déjà.
  it("la flèche précédente est éteinte sur le premier jeu", () => {
    render(<EcranArcade jeux={jeux()} />);
    const prec = screen.getByRole("button", { name: "Jeu précédent" }) as HTMLButtonElement;
    expect(prec.disabled).toBe(true);
  });

  it("la flèche suivante est éteinte sur le dernier jeu", () => {
    render(<EcranArcade jeux={jeux()} />);
    const suiv = screen.getByRole("button", { name: "Jeu suivant" }) as HTMLButtonElement;
    for (let i = 0; i < 10; i++) fireEvent.click(suiv);
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("11 / 11");
    expect(suiv.disabled).toBe(true);
  });

  it("le swipe vers la gauche avance, celui vers la droite recule", () => {
    render(<EcranArcade jeux={jeux()} />);
    const zone = screen.getByTestId("arcade-zone");
    fireEvent.pointerDown(zone, { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(zone, { clientX: 100, pointerId: 1 });
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("02 / 11");
    fireEvent.pointerDown(zone, { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(zone, { clientX: 200, pointerId: 1 });
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("01 / 11");
  });

  it("un geste plus court que le seuil ne change pas de jeu", () => {
    render(<EcranArcade jeux={jeux()} />);
    const zone = screen.getByTestId("arcade-zone");
    fireEvent.pointerDown(zone, { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(zone, { clientX: 175, pointerId: 1 });
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("01 / 11");
  });

  // Sans ça, un joueur non-voyant swipe dans le vide : rien ne lui dit que
  // l'écran a changé.
  it("annonce le jeu courant dans une région vivante", () => {
    render(<EcranArcade jeux={jeux()} />);
    expect(screen.getByTestId("arcade-titre").getAttribute("aria-live")).toBe("polite");
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run : `npx vitest run --maxWorkers=4 src/components/bazar/EcranArcade.test.tsx`
Attendu : ÉCHEC, module introuvable.

- [ ] **Step 3 : Implémenter**

Créer `src/components/bazar/EcranArcade.tsx` :

```tsx
"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";
import { getTemplate } from "@/data/objetTemplates";
import type { JeuArcade } from "@/lib/bazar/arcade";

/** Seuil de swipe, en px. Le même qu'au chinage : le geste doit se ressembler. */
const SWIPE_SEUIL_PX = 40;

const crt: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "#04140b",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  // Le look CRT vient d'ICI et non d'une police : aucune police pixel ne
  // couvre le grec, et les titres des jeux sont traduits en quatre langues.
  fontFamily: "ui-monospace, Menlo, monospace",
  color: "#b7ffd6",
};

const balayage: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background:
    "repeating-linear-gradient(0deg, rgba(0,0,0,0.30) 0 1px, transparent 1px 3px)",
};

const zoneJeu: CSSProperties = {
  flex: 1,
  position: "relative",
  overflow: "hidden",
  touchAction: "pan-y",
};

const neige: CSSProperties = {
  position: "absolute",
  inset: 0,
  opacity: 0.5,
  background:
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 2px)," +
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.13) 0 1px, transparent 1px 3px)," +
    "repeating-linear-gradient(23deg, rgba(255,255,255,0.07) 0 2px, transparent 2px 5px)",
  animation: "broc-arcade-neige 220ms steps(2) infinite",
};

const barre: CSSProperties = {
  flex: "none",
  padding: "5px 4px 7px",
  background: "rgba(0,0,0,0.45)",
  borderTop: "1px solid rgba(125,252,174,0.25)",
  textAlign: "center",
};

const pilote: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 6px",
  marginTop: 2,
};

function flecheStyle(eteinte: boolean): CSSProperties {
  return {
    background: "transparent",
    border: "none",
    padding: "2px 4px",
    cursor: eteinte ? "default" : "pointer",
    color: eteinte ? "#1f5c39" : "#8dffbe",
    filter: eteinte ? "none" : "drop-shadow(0 0 8px rgba(125,252,174,0.55))",
    lineHeight: 0,
  };
}

interface EcranArcadeProps {
  jeux: JeuArcade[];
}

/**
 * Le contenu du CRT : un jeu à la fois.
 *
 * Sans géométrie propre — il remplit son conteneur, et c'est
 * `BorneArcadeEcran` qui décide où ce conteneur se trouve dans la façade.
 * Cette séparation est ce qui permet de tester le carrousel sous jsdom, qui
 * n'a pas de layout du tout.
 */
export function EcranArcade({ jeux }: EcranArcadeProps) {
  const { d, locale } = useLangue();
  const [index, setIndex] = useState(0);
  const departXRef = useRef<number | null>(null);

  const idx = Math.min(index, Math.max(0, jeux.length - 1));
  const jeu = jeux[idx];
  const template = jeu ? getTemplate(jeu.templateId) : undefined;
  const auDebut = idx === 0;
  const aLaFin = idx === jeux.length - 1;

  const aller = (delta: number) => {
    setIndex((i) => Math.min(jeux.length - 1, Math.max(0, i + delta)));
  };

  const onPointerDown = (e: PointerEvent) => {
    departXRef.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (departXRef.current === null) return;
    const dx = e.clientX - departXRef.current;
    departXRef.current = null;
    if (Math.abs(dx) > SWIPE_SEUIL_PX) aller(dx < 0 ? 1 : -1);
  };
  const onPointerCancel = () => {
    departXRef.current = null;
  };

  const titre =
    jeu?.trouve && template
      ? nomObjet({ templateId: template.templateId, nom: template.nom }, locale).toUpperCase()
      : "???";

  return (
    <div style={crt}>
      <div
        style={zoneJeu}
        data-testid="arcade-zone"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {jeu?.trouve ? (
          // `alt=""` : le titre juste en dessous porte déjà l'information, et
          // il est dans une région vivante. Deux annonces pour une seule
          // image feraient bégayer le lecteur d'écran.
          <img
            data-testid="arcade-capture"
            src={`/bazar/arcade/${jeu.templateId}.webp`}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              // Une capture pixel art doit rester en gros pixels carrés :
              // le lissage par défaut la transformerait en bouillie.
              imageRendering: "pixelated",
            }}
          />
        ) : (
          <>
            {/* La capture n'est PAS rendue puis masquée : elle n'est pas
                demandée du tout. Une image posée dans le DOM se voit dans
                l'onglet réseau, et le contenu à découvrir fuiterait. */}
            <div style={neige} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#7dfcae",
                fontSize: 12,
                letterSpacing: "0.22em",
              }}
            >
              {d.bazar.bornePasDeSignal}
            </div>
          </>
        )}
      </div>

      <div style={barre}>
        <div
          data-testid="arcade-titre"
          aria-live="polite"
          style={{
            fontSize: 13,
            letterSpacing: jeu?.trouve ? "0.09em" : "0.3em",
            color: jeu?.trouve ? "#b7ffd6" : "#3f9d68",
          }}
        >
          {titre}
        </div>
        <div style={pilote}>
          <button
            type="button"
            aria-label={d.bazar.borneJeuPrecedent}
            onClick={() => aller(-1)}
            disabled={auDebut}
            style={flecheStyle(auDebut)}
          >
            <ChevronLeft size={34} />
          </button>
          <span
            data-testid="arcade-compteur"
            style={{ color: "#3f9d68", fontSize: 10, letterSpacing: "0.18em" }}
          >
            {String(idx + 1).padStart(2, "0")} / {String(jeux.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            aria-label={d.bazar.borneJeuSuivant}
            onClick={() => aller(1)}
            disabled={aLaFin}
            style={flecheStyle(aLaFin)}
          >
            <ChevronRight size={34} />
          </button>
        </div>
      </div>

      <div style={balayage} />
    </div>
  );
}
```

- [ ] **Step 4 : Ajouter l'animation de neige**

Dans `src/app/globals.css`, à la suite des autres `@keyframes broc-*` :

```css
/* Le grésillement de l'écran d'un jeu pas encore trouvé. Deux pas seulement :
   une neige qui glisse en continu ondule, une neige qui saute grésille. */
@keyframes broc-arcade-neige {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-2px, 1px, 0); }
}
```

- [ ] **Step 5 : Lancer les tests, vérifier qu'ils passent**

Run : `npx vitest run --maxWorkers=4 src/components/bazar/EcranArcade.test.tsx`
Attendu : SUCCÈS (11 tests).

- [ ] **Step 6 : Commit**

```bash
git add src/components/bazar/EcranArcade.tsx src/components/bazar/EcranArcade.test.tsx src/app/globals.css
git commit -m "$(cat <<'EOF'
feat(bazar): l'écran de la borne, un jeu à la fois

Le vocabulaire est celui du carrousel de chinage, que le joueur connaît
déjà : bornes strictes sans boucle, flèche éteinte au bout, compteur i / n,
swipe au seuil de 40 px. Les flèches sont au niveau du compteur et non sur
l'image, pour que la capture reste entièrement dégagée.

La capture d'un jeu inconnu n'est pas rendue puis masquée : elle n'est pas
demandée du tout. Une image posée dans le DOM se voit dans l'onglet réseau,
et le contenu à découvrir fuiterait.

Le look CRT vient du rendu et jamais d'une police pixel : aucune ne couvre
le grec, et les titres des jeux sont traduits en quatre langues.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6 : La coquille — le plein écran, la façade, les sorties

**Files:**
- Create: `src/components/bazar/BorneArcadeEcran.tsx`
- Test: `src/components/bazar/BorneArcadeEcran.test.tsx`

**Interfaces:**
- Consumes: `BORNE_FACADE`, `dimensionnerBorne` (Task 3), `EcranArcade` (Task 5), `JeuArcade` (Task 2).
- Produces: `<BorneArcadeEcran open={boolean} jeux={JeuArcade[]} onClose={() => void} />`

- [ ] **Step 1 : Écrire le test**

Créer `src/components/bazar/BorneArcadeEcran.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { BorneArcadeEcran } from "./BorneArcadeEcran";
import { JEUX_ARCADE } from "@/lib/bazar/arcade";

afterEach(cleanup);

const JEUX = JEUX_ARCADE.map((templateId) => ({ templateId, trouve: false }));

function monter(open = true) {
  const onClose = vi.fn();
  render(<BorneArcadeEcran open={open} jeux={JEUX} onClose={onClose} />);
  return { onClose };
}

describe("BorneArcadeEcran", () => {
  it("ne rend rien quand il est fermé", () => {
    monter(false);
    expect(screen.queryByRole("dialog")).toBe(null);
  });

  it("est un dialogue modal nommé", () => {
    monter();
    const dlg = screen.getByRole("dialog");
    expect(dlg.getAttribute("aria-modal")).toBe("true");
    expect(dlg.getAttribute("aria-label")).toBe("Borne d'arcade");
  });

  it("se ferme au tap sur le fond, et pas au tap sur la borne", () => {
    const { onClose } = monter();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("borne-facade"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("se ferme à la touche Échap", () => {
    const { onClose } = monter();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Une sortie visible est exigée : le fond et Échap ne se devinent pas.
  it("porte un bouton de fermeture visible et nommé", () => {
    const { onClose } = monter();
    fireEvent.click(screen.getByRole("button", { name: "Fermer la borne" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // LE point d'architecture : l'interface est DESSOUS, la façade DESSUS.
  // C'est ce qui fait que les joysticks dessinés masquent l'écran sans
  // qu'aucun masque n'ait à être fabriqué.
  it("pose l'écran AVANT la façade dans l'ordre du DOM", () => {
    monter();
    const cadre = screen.getByTestId("borne-facade");
    const enfants = Array.from(cadre.children);
    const iEcran = enfants.findIndex((e) => e.getAttribute("data-testid") === "borne-fenetre");
    const iImage = enfants.findIndex((e) => e.tagName === "IMG");
    expect(iEcran).toBeGreaterThanOrEqual(0);
    expect(iImage).toBeGreaterThan(iEcran);
  });

  // Sans ça, la façade avale les taps destinés aux flèches qui sont dessous.
  it("la façade laisse passer les doigts", () => {
    monter();
    const img = screen.getByTestId("borne-facade").querySelector("img") as HTMLImageElement;
    expect(img.style.pointerEvents).toBe("none");
    expect(img.getAttribute("alt")).toBe("");
  });

  it("place la fenêtre aux pourcentages mesurés du caisson", () => {
    monter();
    const f = screen.getByTestId("borne-fenetre");
    expect(f.style.left).toBe("14.16%");
    expect(f.style.right).toBe("14.22%");
    expect(f.style.top).toBe("24.57%");
    expect(f.style.bottom).toBe("25.96%");
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run : `npx vitest run --maxWorkers=4 src/components/bazar/BorneArcadeEcran.test.tsx`
Attendu : ÉCHEC, module introuvable.

- [ ] **Step 3 : Implémenter**

Créer `src/components/bazar/BorneArcadeEcran.tsx` :

```tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { JeuArcade } from "@/lib/bazar/arcade";
import { BORNE_FACADE, dimensionnerBorne } from "./borneArcadeLayout";
import { EcranArcade } from "./EcranArcade";

const voile: CSSProperties = {
  position: "fixed",
  inset: 0,
  // Au-dessus de la fiche d'article (105), qui ne peut pas être ouverte en
  // même temps mais dont le z-index sert de repère à tout cet écran.
  zIndex: 110,
  background: "rgba(15,31,24,0.88)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};

const boutonFermer: CSSProperties = {
  position: "absolute",
  top: "calc(var(--safe-top) + 10px)",
  right: 12,
  zIndex: 2,
  width: 40,
  height: 40,
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  border: "1px solid var(--brass-500)",
  background: "rgba(15,31,24,0.75)",
  color: "var(--parchment-100, #e8d5a3)",
  cursor: "pointer",
  padding: 0,
};

interface BorneArcadeEcranProps {
  open: boolean;
  jeux: JeuArcade[];
  onClose: () => void;
}

/**
 * Le plein écran de la borne d'arcade.
 *
 * Trois choses, et rien d'autre : il mesure la place, il pose la façade à
 * l'échelle, et il glisse `EcranArcade` dans le trou du CRT.
 *
 * ORDRE D'EMPILEMENT — c'est la pièce porteuse. L'écran est rendu AVANT
 * l'image, donc dessous. Tout ce que l'illustration peint devant la vitre —
 * les boules des joysticks aujourd'hui, un reflet ou une fêlure demain —
 * masque l'interface sans qu'aucun masque n'ait à être dessiné. Le trou EST
 * le masque. L'image porte `pointer-events: none`, sans quoi elle avalerait
 * les taps destinés aux flèches qui sont dessous.
 */
export function BorneArcadeEcran({ open, jeux, onClose }: BorneArcadeEcranProps) {
  const { d } = useLangue();
  const voileRef = useRef<HTMLDivElement | null>(null);
  const [place, setPlace] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Fermeture au clavier — même idiome que la fiche d'article et les sheets
  // du QG : le voile se tape au doigt, mais rien ne l'atteint au clavier.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // On mesure le CONTENEUR et jamais `window` : en WebView iOS le body est
  // verrouillé et les dimensions de la fenêtre mentent sur la place réelle.
  useLayoutEffect(() => {
    if (!open) return;
    const el = voileRef.current;
    if (!el) return;
    const mesurer = () => {
      const r = el.getBoundingClientRect();
      setPlace({ w: r.width, h: r.height });
    };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  if (!open) return null;

  const { w, h } = dimensionnerBorne(place);

  return (
    <div
      ref={voileRef}
      role="dialog"
      aria-modal="true"
      aria-label={d.bazar.borneTitre}
      style={voile}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button type="button" aria-label={d.bazar.borneFermer} onClick={onClose} style={boutonFermer}>
        <X size={20} />
      </button>

      <div
        data-testid="borne-facade"
        style={{ position: "relative", width: w, height: h, flex: "none" }}
      >
        {/* DESSOUS — voir le commentaire d'en-tête. */}
        <div
          data-testid="borne-fenetre"
          style={{
            position: "absolute",
            left: `${BORNE_FACADE.trou.left}%`,
            right: `${BORNE_FACADE.trou.right}%`,
            top: `${BORNE_FACADE.trou.top}%`,
            bottom: `${BORNE_FACADE.trou.bottom}%`,
          }}
        >
          <EcranArcade jeux={jeux} />
        </div>

        {/* DESSUS, et transparent aux doigts. */}
        <img
          src="/bazar/borne-facade.webp"
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : Lancer les tests, vérifier qu'ils passent**

Run : `npx vitest run --maxWorkers=4 src/components/bazar/BorneArcadeEcran.test.tsx`
Attendu : SUCCÈS (8 tests).

> Si `ResizeObserver is not defined` : jsdom ne le fournit pas. Ajouter au
> `beforeAll` du fichier de test :
> ```ts
> globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as never;
> ```

- [ ] **Step 5 : Commit**

```bash
git add src/components/bazar/BorneArcadeEcran.tsx src/components/bazar/BorneArcadeEcran.test.tsx
git commit -m "$(cat <<'EOF'
feat(bazar): la coquille plein écran de la borne d'arcade

L'écran est rendu AVANT l'image, donc dessous : tout ce que l'illustration
peint devant la vitre — les boules des joysticks aujourd'hui, un reflet
demain — masque l'interface sans qu'aucun masque n'ait à être dessiné. Le
trou EST le masque. L'image porte pointer-events:none, sans quoi elle
avalerait les taps destinés aux flèches qui sont dessous.

La place est mesurée sur le CONTENEUR et jamais sur window : en WebView iOS
le body est verrouillé et les dimensions de la fenêtre mentent.

Trois sorties, dont une visible : la croix, le fond, Échap.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7 : L'entrée — la borne du décor devient un bouton

**Files:**
- Modify: `src/components/bazar/BorneArcade.tsx`
- Modify: `src/components/bazar/BazarScene.tsx`
- Modify: `src/app/bazar/page.tsx`
- Test: `src/components/bazar/BazarScene.test.tsx` (existant, y ajouter)

**Interfaces:**
- Consumes: `jeuxArcade` (Task 2), `BorneArcadeEcran` (Task 6).
- Produces: `<BorneArcade onOuvrir={() => void} />` ; `BazarScene` gagne une prop `jeuxArcade: JeuArcade[]`.

- [ ] **Step 1 : Écrire le test**

Ajouter à `src/components/bazar/BazarScene.test.tsx`, dans le `describe` existant :

```tsx
  it("la borne d'arcade est un bouton nommé, et non plus une image muette", () => {
    monter();
    expect(screen.getByRole("button", { name: "Voir la borne d'arcade" })).toBeTruthy();
  });

  it("le tap sur la borne ouvre son plein écran", () => {
    monter();
    expect(screen.queryByRole("dialog")).toBe(null);
    fireEvent.click(screen.getByRole("button", { name: "Voir la borne d'arcade" }));
    expect(screen.getByRole("dialog").getAttribute("aria-label")).toBe("Borne d'arcade");
  });

  // Même règle que la fiche d'article : un dialogue ne vit pas DANS le
  // panorama, qui défile sous lui.
  it("le plein écran de la borne est rendu hors du panorama", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "Voir la borne d'arcade" }));
    const dialogue = screen.getByRole("dialog");
    const panorama = screen.getByRole("button", { name: /Sortir/ }).closest("div");
    expect(panorama?.contains(dialogue)).toBe(false);
  });
```

Le helper `monter` du fichier doit passer la nouvelle prop — le modifier :

```tsx
function monter(
  etal: EtalBazar = ETAL,
  jetons = 25,
  resultat: { ok: boolean; raison?: string } = { ok: true },
) {
  const onAcheter = vi.fn().mockReturnValue(resultat);
  const onSortir = vi.fn();
  const jeux = JEUX_ARCADE.map((templateId) => ({ templateId, trouve: false }));
  render(
    <BazarScene
      etal={etal}
      jetons={jetons}
      jeuxArcade={jeux}
      onAcheter={onAcheter}
      onSortir={onSortir}
    />,
  );
  return { onAcheter, onSortir };
}
```

Ajouter `import { JEUX_ARCADE } from "@/lib/bazar/arcade";` en tête du fichier
de test, et remplacer le test existant « la borne est du décor : ni bouton, ni
nom accessible » — il affirme exactement l'inverse de ce qu'on livre — par :

```tsx
  it("la borne garde son image muette : c'est le bouton qui porte le nom", () => {
    monter();
    const img = screen.getByTestId("borne-arcade").querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/bazar/borne-arcade.webp");
    expect(img.getAttribute("alt")).toBe("");
  });
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run : `npx vitest run --maxWorkers=4 src/components/bazar/BazarScene.test.tsx`
Attendu : ÉCHEC — pas de bouton nommé « Voir la borne d'arcade ».

- [ ] **Step 3 : Rendre la borne cliquable**

Dans `src/components/bazar/BorneArcade.tsx`, remplacer le `<div>` racine par un
`<button>` et ajouter la prop. Le composant devient :

```tsx
interface BorneArcadeProps {
  onOuvrir: () => void;
}

export function BorneArcade({ onOuvrir }: BorneArcadeProps) {
  const { d } = useLangue();
  const coord = useQgObjet("borne");
  const style: CSSProperties = {
    position: "absolute",
    left: `${qgPct(coord.left)}%`,
    bottom: `${coord.bottom}%`,
    width: `${qgPct(coord.width)}%`,
    height: "auto",
    // Le calque d'objets du panorama est en `pointer-events: none` : sans ce
    // rétablissement, le bouton ne recevrait aucun tap.
    pointerEvents: "auto",
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
  };
  return (
    <button
      type="button"
      aria-label={d.bazar.borneOuvrir}
      onClick={onOuvrir}
      style={style}
      data-testid="borne-arcade"
    >
      <img src="/bazar/borne-arcade.webp" alt="" draggable={false} style={imgStyle} />
    </button>
  );
}
```

Ajouter `import { useLangue } from "@/lib/i18n/LangueContext";` en tête, et
mettre à jour le commentaire de tête du composant : la borne n'est plus muette,
elle ouvre sa collection ; c'est l'image qui reste `alt=""`.

- [ ] **Step 4 : Porter l'état d'ouverture dans la scène**

Dans `src/components/bazar/BazarScene.tsx` :

1. importer `useState` (déjà importé), `BorneArcadeEcran`, et le type `JeuArcade` ;
2. ajouter `jeuxArcade: JeuArcade[];` à `BazarSceneProps`, avec le commentaire :

```tsx
  /**
   * L'état des onze jeux, déjà calculé. La scène reste une vue pure : elle ne
   * touche jamais à la collection, `src/app/bazar/page.tsx` la lui dérive.
   */
  jeuxArcade: JeuArcade[];
```

3. ajouter l'état `const [borneOuverte, setBorneOuverte] = useState(false);` ;
4. passer `onOuvrir` : `<BorneArcade onOuvrir={() => setBorneOuverte(true)} />` ;
5. rendre l'écran **hors** de `UnifiedPanorama`, à côté de `ArticleDetailBazar`
   (le dialogue ne vit pas dans le panorama, qui défile sous lui) :

```tsx
      <BorneArcadeEcran
        open={borneOuverte}
        jeux={jeuxArcade}
        onClose={() => setBorneOuverte(false)}
      />
```

- [ ] **Step 5 : Brancher la page**

Dans `src/app/bazar/page.tsx` :

```tsx
import { jeuxArcade } from "@/lib/bazar/arcade";
```

puis, au rendu de la scène :

```tsx
        <BazarScene
          etal={state.bazar}
          jetons={state.jetons}
          jeuxArcade={jeuxArcade(state.collection)}
          onAcheter={handleAcheter}
          onSortir={() => router.push("/bureau")}
        />
```

(reprendre les props existantes telles quelles ; seule `jeuxArcade` s'ajoute).

- [ ] **Step 6 : Lancer les tests, vérifier qu'ils passent**

Run : `npx vitest run --maxWorkers=4 src/components/bazar/ src/app/bazar/`
Attendu : SUCCÈS.

- [ ] **Step 7 : Vérifier types et lint**

Run : `npx tsc --noEmit && npx eslint src`
Attendu : muets.

- [ ] **Step 8 : Commit**

```bash
git add src/components/bazar/BorneArcade.tsx src/components/bazar/BazarScene.tsx src/components/bazar/BazarScene.test.tsx src/app/bazar/page.tsx
git commit -m "$(cat <<'EOF'
feat(bazar): la borne du décor ouvre sa collection de jeux

Elle était une image muette depuis ce matin, avec pour commentaire que le
chantier ⑤ lui donnerait son jeu : c'est fait. Elle devient un bouton nommé,
son image reste alt="" — le nom est porté par le bouton, pas par le dessin.

pointer-events:auto est indispensable : le calque d'objets du panorama est
en pointer-events:none, et sans rétablissement le bouton ne reçoit aucun tap.

Le plein écran est rendu HORS du panorama, comme la fiche d'article : un
dialogue ne vit pas dans une scène qui défile sous lui.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8 : Les onze captures pixel art

**Files:**
- Create: `scripts/generate-captures-arcade.mjs`
- Create: `public/bazar/arcade/<templateId>.webp` (×11)
- Modify: `package.json` (script npm `gen:captures-arcade`)
- Test: `src/lib/bazar/arcade.test.ts` (y ajouter le test de présence)

**Interfaces:**
- Consumes: `JEUX_ARCADE` (Task 2).
- Produces: onze fichiers `public/bazar/arcade/<templateId>.webp`.

- [ ] **Step 1 : Écrire le test de présence**

Ajouter à `src/lib/bazar/arcade.test.ts` :

```ts
import { existsSync } from "node:fs";
import path from "node:path";

describe("les captures", () => {
  // L'oubli d'un fichier ne se voit qu'au onzième swipe, et seulement si on
  // regarde. Un test le dit tout de suite.
  it("chaque jeu a sa capture dans public/bazar/arcade", () => {
    for (const id of JEUX_ARCADE) {
      const p = path.join(process.cwd(), "public", "bazar", "arcade", `${id}.webp`);
      expect({ id, present: existsSync(p) }).toEqual({ id, present: true });
    }
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run : `npx vitest run --maxWorkers=4 src/lib/bazar/arcade.test.ts`
Attendu : ÉCHEC, onze fichiers absents.

- [ ] **Step 3 : Écrire le script de génération**

Créer `scripts/generate-captures-arcade.mjs` :

```js
#!/usr/bin/env node
/**
 * Les onze fausses captures d'écran de la borne d'arcade.
 *
 * UN SEUL BRIEF COMMUN, et c'est le point : ces onze images doivent avoir
 * l'air de tourner sur la même machine. Le brief impose la palette, la taille
 * des pixels et le cadrage ; seule la SCÈNE change d'un jeu à l'autre.
 *
 * Usage :
 *   npm run gen:captures-arcade                 # les manquantes
 *   npm run gen:captures-arcade -- --force      # toutes
 *   npm run gen:captures-arcade -- <templateId> # une seule
 */
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEST = path.join(ROOT, "public", "bazar", "arcade");

/** Le style, identique pour les onze. */
const BRIEF = [
  "A fake screenshot of a fictional 16-bit arcade video game, as seen on a CRT monitor.",
  "Bold saturated 16-bit palette, chunky square pixels, thick readable sprites, strong contrast.",
  "The scene reads instantly at a glance: a clear foreground character or object, a simple",
  "background, a ground line. Flat pixel-art shading, no photographic texture, no gradients,",
  "no modern lighting. A thin HUD strip of pixel digits along the top edge.",
  "The image is full-bleed: the game fills the whole frame edge to edge.",
].join(" ");

/** La scène propre à chaque jeu. Le titre du catalogue en dicte le sujet. */
const SCENES = {
  "jx.cartouche_bluebot_8_bit":
    "A small round blue robot with antenna and glowing eyes running along a metal factory walkway, pipes and conveyor belts behind it.",
  "jx.cartouche_la_legende_de_solda_8_bit":
    "A tiny green-clad hero with a sword and round shield standing at the entrance of a stone dungeon, torches on the walls, a treasure chest ahead.",
  "jx.cartouche_le_plombier_sauteur_8_bit":
    "A stocky moustachioed workman in blue overalls and a red cap jumping between floating brick blocks over a bright blue sky, a coin spinning above him.",
  "jx.cartouche_turbo_herisson_16_bit":
    "A fast blue spiky creature curled into a ball speeding through a green loop-the-loop track, palm trees and checkered ground rushing past.",
  "jx.cartouche_street_castagne_ii_16_bit":
    "Two pixel fighters facing off in a street arena, one throwing a punch, health bars along the top, a crowd of onlookers in the background.",
  "jx.cartouche_gachette_du_temps_rpg_16_bit":
    "A turn-based role-playing battle screen: three heroes on the right facing a large horned monster on the left, a command menu box at the bottom.",
  "jx.jeu_le_manoir_du_mal_32_bit":
    "A dark haunted mansion corridor with cracked portraits and a candelabra, a lone silhouetted figure with a flashlight beam, a full moon through a window.",
  "jx.jeu_foxy_crush_32_bit":
    "A colourful puzzle grid of shiny gems and fruit, a cartoon fox mascot cheering in the corner, sparkles where three gems align.",
  "jx.jeu_engrenage_de_metal_infiltration_32_bit":
    "A top-down stealth screen: a soldier crouching behind a crate inside a military base, a guard's vision cone sweeping the floor, radar box in the corner.",
  "jx.jeu_solda_flute_temporelle_aventure_3d_64_bit":
    "An early-3D-looking pixel rendition of a green-clad hero on a wide grassy field at sunset, a distant castle, a floating fairy of light beside him.",
  "jx.jeu_d_aventure_japonais_128_bit":
    "A spiky-haired hero with an oversized sword standing before a neon-lit futuristic city street at night, rain, a dialogue box at the bottom.",
};

async function chargerEnv() {
  const contenu = await fs.readFile(path.join(ROOT, ".env"), "utf8");
  for (const ligne of contenu.split("\n")) {
    const l = ligne.trim();
    if (!l || l.startsWith("#")) continue;
    const eq = l.indexOf("=");
    if (eq < 0) continue;
    const k = l.slice(0, eq).trim();
    let v = l.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

await chargerEnv();
await fs.mkdir(DEST, { recursive: true });

const args = process.argv.slice(2);
const force = args.includes("--force");
const seuls = args.filter((a) => !a.startsWith("--"));
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let ok = 0;
let saute = 0;
for (const [id, scene] of Object.entries(SCENES)) {
  if (seuls.length && !seuls.includes(id)) continue;
  const sortie = path.join(DEST, `${id}.webp`);
  if (!force) {
    try {
      await fs.access(sortie);
      saute++;
      continue;
    } catch {
      /* absent, on génère */
    }
  }
  process.stdout.write(`🎮  ${id}… `);
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: `${BRIEF}\n\nThe game: ${scene}`,
      config: { imageConfig: { aspectRatio: "4:3", imageSize: "1K" } },
    });
    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p) => p.inlineData?.data);
    if (!img) {
      console.log("❌ pas d'image");
      continue;
    }
    // 640 de large : la zone d'affichage fait ~362 px CSS, soit ~1090 px sur
    // un écran @3×… mais une capture pixel art se DÉGRADE à être trop fine.
    // 640 donne des pixels bien carrés une fois agrandis, ce qui est
    // exactement l'effet cherché.
    await sharp(Buffer.from(img.inlineData.data, "base64"))
      .resize({ width: 640 })
      .webp({ quality: 88 })
      .toFile(sortie);
    console.log("✅");
    ok++;
  } catch (err) {
    console.log(`❌ ${err.message ?? err}`);
  }
}
console.log(`${ok} générée(s), ${saute} déjà présente(s).`);
```

- [ ] **Step 4 : Déclarer le script npm**

Dans `package.json` :

```json
"gen:captures-arcade": "node scripts/generate-captures-arcade.mjs",
```

- [ ] **Step 5 : Générer les onze captures**

```bash
npm run gen:captures-arcade
```

Attendu : `11 générée(s), 0 déjà présente(s).`

**Puis les REGARDER, une par une.** Le test ne vérifie que la présence, pas la
qualité. Ce qui disqualifie une capture : du texte illisible en gros, un rendu
photographique au lieu de pixels carrés, une palette qui jure avec les dix
autres. Régénérer les fautives une par une :

```bash
npm run gen:captures-arcade -- --force jx.cartouche_bluebot_8_bit
```

- [ ] **Step 6 : Lancer le test, vérifier qu'il passe**

Run : `npx vitest run --maxWorkers=4 src/lib/bazar/arcade.test.ts`
Attendu : SUCCÈS.

- [ ] **Step 7 : Commit**

```bash
git add scripts/generate-captures-arcade.mjs package.json public/bazar/arcade src/lib/bazar/arcade.test.ts
git commit -m "$(cat <<'EOF'
feat(bazar): les onze fausses captures de la borne, en 16-bit

Un seul brief commun pour les onze : elles doivent avoir l'air de tourner
sur la même machine. Le brief impose la palette, la taille des pixels et le
cadrage ; seule la scène change d'un jeu à l'autre, dictée par son titre.

640 px de large et pas davantage : une capture pixel art se dégrade à être
trop fine, et des pixels bien carrés une fois agrandis sont exactement
l'effet cherché.

Un test vérifie qu'il existe un fichier par jeu — l'oubli ne se verrait
qu'au onzième swipe.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9 : Vérification d'ensemble

**Files:** aucun (vérification).

- [ ] **Step 1 : La suite complète**

Run : `npx vitest run --maxWorkers=4`
Attendu : tout au vert. Le compte de référence avant ce chantier était de
**2479 tests passants** ; il doit avoir augmenté d'une trentaine.

- [ ] **Step 2 : Types et lint**

Run : `npx tsc --noEmit && npx eslint src`
Attendu : muets.

- [ ] **Step 3 : Le voir tourner**

```bash
npx next dev -p 3100
```

Puis, dans le navigateur :
1. `http://localhost:3100/dev-save-bazar.html` → « Installer les 3 parties » ;
2. `http://localhost:3100/` → LOAD → **Étal garni** → START GAME ;
3. aller au Bazar, glisser vers la gauche jusqu'au coin arcade ;
4. taper la borne.

À vérifier à l'œil, dans cet ordre :
- l'écran s'ouvre, la borne est en grand, le bois déborde des deux côtés ;
- **les boules des joysticks passent devant le bas de l'écran** — c'est le
  test visuel de l'ordre d'empilement ;
- les flèches répondent au doigt (si elles ne répondent pas, l'image a perdu
  son `pointer-events: none`) ;
- le swipe fonctionne dans les deux sens et bute aux extrémités ;
- un jeu inconnu montre la neige et `???` ;
- la croix, le fond et Échap ferment tous les trois.

- [ ] **Step 4 : La recette qui reste à l'auteur**

Écrire dans le message de fin, à l'attention de Guillaume, ce qui ne peut pas
être vérifié ici :
- **la recette sur appareil** passe obligatoirement par TestFlight (ce Mac ne
  peut pas installer sur son iPhone) ;
- **les onze captures** demandent son œil : le test ne dit que leur présence ;
- **le grec** des six libellés neufs n'est pas certifié ;
- **le focus n'est pas piégé** dans le dialogue — aucun dialogue de ce jeu ne
  le fait, c'est une limite uniforme de l'application et non un oubli de ce
  chantier.

---

## Notes pour l'exécutant

**Les deux pièges déjà payés sur ce chantier**, à ne pas re-découvrir :

1. **Ne jamais demander « fond transparent » à Gemini.** Il peint un damier et
   rend une image parfaitement opaque. On demande des aplats de couleur franche
   et on découpe soi-même.
2. **Découper un fond par diffusion depuis les bords, pas par sélection de
   couleur**, dès que le sujet contient la même couleur : le pupitre de la
   borne porte des boutons verts qu'une sélection globale perce aussi.

**Le test creux, à surveiller.** Ce dépôt en a déjà attrapé plusieurs. Deux
formes ici : une assertion sur un style en ligne que le composant ne pose plus
(jsdom n'a pas de layout, `getBoundingClientRect` rend des zéros — tout test de
dimension réelle est illusoire, c'est pourquoi `dimensionnerBorne` est testée
seule), et un `expect(x).toBeTruthy()` sur un élément qui existerait de toute
façon. Préférer partout la forme `expect({ cle, valeur }).toEqual({ cle, attendu })`,
qui nomme le cas fautif dans le message d'échec.

**L'ordre des tâches.** 1 et 2 sont indépendantes. 3 a besoin des nombres
imprimés par 1. 5 a besoin de 2 et 4. 6 a besoin de 3 et 5. 7 a besoin de 6.
8 est indépendante de 3–7 et peut être faite en parallèle, mais son résultat ne
se voit qu'une fois 7 livrée.
