# Machine à énergie du savant fou — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la carte texte de recharge d'énergie par une machine à électricité de savant fou : illustration générée, galvanomètre SVG (aiguille = énergie), levier-bouton pub avec tremblement + étincelles.

**Architecture:** Un asset webp généré une fois (pipeline Gemini existant), un composant `EnergieRecharge.tsx` refondu où l'illustration remplit la carte et les contrôles sont positionnés par-dessus en % (constantes de module calibrées sur l'image). Logique métier (`energie.ts`, `adProvider`) intouchée.

**Tech Stack:** Next.js (App Router), React 19, styles inline `CSSProperties`, SVG inline, vitest + @testing-library/react (jsdom), @google/genai + sharp (script Node one-shot).

**Spec:** `docs/superpowers/specs/2026-07-16-machine-energie-design.md`

## Global Constraints

- ⚠️ **Worktree obligatoire** : le checkout principal est occupé par la session SP1 (`feat/sp1-tutoriel-grand-pere`). Travailler dans un worktree créé depuis `main` : `git worktree add .worktrees/machine-energie -b feat/machine-energie main` puis `ln -s "$(pwd)/node_modules" .worktrees/machine-energie/node_modules` et `cp .env .worktrees/machine-energie/.env` (gitignoré, contient `GEMINI_API_KEY`).
- Lint : `npx eslint src` (**`npm run lint` est cassé** — Next 16) et `npm run lint:hooks`.
- Tests : `npx vitest run <fichier>` par tâche, suite complète en fin de plan.
- **Aucun texte peint dans l'image générée** (i18n : FR/EN/ES partagent l'asset).
- Aucune nouvelle chaîne i18n : réutiliser `d.chrome.{energieAuMaximum,prochaineEnergieDans,regarderPub,pubEnCours,pubEpuisee}` et `d.commun.fermer`.
- Styles inline `CSSProperties` en constantes de module, commentaires en français.
- `EnergieRecharge` garde son API `{ onClose: () => void }` et sa logique (quota bloqué AVANT la pub, tick local 1 s).

---

### Task 1: Générer l'asset `public/qg/machine-energie.webp`

**Files:**
- Create: `scripts/generate-machine-energie.mjs`
- Create (généré): `public/qg/machine-energie.webp`

**Interfaces:**
- Produces: image portrait 3:4 (1024×1365 webp q85) — machine vue de face, **grand cadran rond VIDE** (fond crème uni) en haut au centre, **gros levier laiton** à droite à mi-hauteur, zéro texte. Les zones mesurées (cadran cx/cy/r, levier left/top/width/height, en % de l'image) sont consommées par la Task 2.

- [ ] **Step 1: Écrire le script**

Créer `scripts/generate-machine-energie.mjs` (copie du squelette de `generate-competences.mjs` : même `loadDotEnv`, même client, mêmes constantes `MODEL = "gemini-3-pro-image-preview"` et `EDGE_CROP_RATIO = 0.035`) :

```js
#!/usr/bin/env node
/**
 * Génère l'illustration de la machine à énergie du savant fou (modale recharge).
 * Usage : node scripts/generate-machine-energie.mjs [--force]
 * Pipeline : Gemini pro 3:4 2K → WebP 1024×1365 q85 dans public/qg/.
 */
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.join(PROJECT_ROOT, "public", "qg", "machine-energie.webp");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

const MODEL = "gemini-3-pro-image-preview";
const EDGE_CROP_RATIO = 0.035;
const OUT_W = 1024;
const OUT_H = 1365;

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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch { /* pas de .env */ }
}
await loadDotEnv();

const STYLE_BRIEF = [
  "Vintage Art Déco illustration in a museum catalog style.",
  "Elegant ink line-art with subtle sepia and forest green color wash.",
  "Warm brass, dark wood and cream tones. Subtle paper grain texture.",
  "Soft warm directional light from the upper-left.",
  "No text overlays, no captions, no watermark.",
].join(" ");

const SCENE =
  "A fantastical mad scientist's electricity machine from the 1920s, seen strictly " +
  "front-on, filling the frame: a tall dark walnut cabinet with riveted brass " +
  "fittings, twin Tesla coils on top crackling with small electric arcs, coiled " +
  "copper wires, glass vacuum tubes glowing faintly amber. AT THE TOP CENTER of " +
  "the cabinet: ONE large round gauge with a COMPLETELY PLAIN EMPTY cream face — " +
  "no needle, no numbers, no tick marks, no markings of any kind, just a blank " +
  "cream disc in a brass bezel. ON THE RIGHT SIDE at mid-height: one BIG brass " +
  "lever with a turned wooden handle, in neutral upright position. The bottom " +
  "half of the cabinet is calm and dark (panels, dials-free), leaving visual " +
  "room. Moody workshop atmosphere behind, kept dark and simple.";

const FRAMING =
  "FULL-BLEED portrait 3:4 composition: the machine fills the ENTIRE frame edge " +
  "to edge. NO empty paper margins, NO border, NO frame. ABSOLUTELY NO TEXT: no " +
  "letters, no words, no numbers, no dials with digits, no signage, no watermark.";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("❌ GEMINI_API_KEY absente. Voir .env.example");
  process.exit(1);
}

const force = process.argv.includes("--force");
try {
  if (!force) {
    await fs.access(OUT_PATH);
    console.log("⏭️  machine-energie.webp déjà présent (--force pour regénérer)");
    process.exit(0);
  }
} catch { /* absent → générer */ }

const ai = new GoogleGenAI({ apiKey });
const prompt = `${STYLE_BRIEF}\n\nScene: ${SCENE}\n\n${FRAMING}`;
console.log(`🎨  machine-energie — génération (${MODEL}, 3:4, 2K)…`);
const response = await ai.models.generateContent({
  model: MODEL,
  contents: prompt,
  config: { imageConfig: { aspectRatio: "3:4", imageSize: "2K" } },
});
const parts = response.candidates?.[0]?.content?.parts ?? [];
const img = parts.find((p) => p.inlineData?.data);
if (!img) {
  console.error("❌  pas d'image dans la réponse");
  process.exit(1);
}
const raw = Buffer.from(img.inlineData.data, "base64");
const meta = await sharp(raw).metadata();
const cropX = Math.round(meta.width * EDGE_CROP_RATIO);
const cropY = Math.round(meta.height * EDGE_CROP_RATIO);
const buf = await sharp(raw)
  .extract({ left: cropX, top: cropY, width: meta.width - 2 * cropX, height: meta.height - 2 * cropY })
  .resize(OUT_W, OUT_H)
  .webp({ quality: 85 })
  .toBuffer();
await fs.writeFile(OUT_PATH, buf);
console.log(`✅  machine-energie.webp (${Math.round(buf.length / 1024)} kB)`);
```

- [ ] **Step 2: Générer et inspecter**

Run: `node scripts/generate-machine-energie.mjs --force`
Expected: `✅ machine-energie.webp (…kB)`.

Ouvrir l'image (Read). Critères d'acceptation : cadran VIDE lisible en haut au centre (assez grand : rayon ≳ 15 % de la largeur), levier identifiable à droite, aucun texte/chiffre, style cohérent avec le jeu. Si un critère échoue : ajuster `SCENE` (renforcer la contrainte fautive) et regénérer (max 3 essais ; garder la meilleure). Un léger décalage du cadran/levier n'est PAS un échec — il se rattrape par les constantes de zone.

- [ ] **Step 3: Mesurer les zones**

Sur l'image retenue, estimer visuellement et noter (en % de la largeur/hauteur de l'image) :
- `ZONE_CADRAN` : centre cx/cy et rayon r du cadran vide ;
- `ZONE_LEVIER` : boîte left/top/width/height couvrant le levier (élargie pour le doigt : min ~44 px rendus).

Ces valeurs remplacent les valeurs par défaut de la Task 2 (marquées `// à calibrer`).

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-machine-energie.mjs public/qg/machine-energie.webp
git commit -m "feat(energie): illustration machine à énergie du savant fou (asset généré)"
```

---

### Task 2: Refonte `EnergieRecharge` — galvanomètre, levier, étincelles

**Files:**
- Modify: `src/components/mobile/EnergieRecharge.tsx` (refonte du rendu, logique conservée)
- Modify: `src/components/mobile/EnergieRecharge.test.tsx` (tests ajoutés, les 2 existants inchangés)
- Modify: `src/app/globals.css` (keyframes `broc-shake` et `broc-spark`, à côté de `broc-slide-up` ~ligne 1092)

**Interfaces:**
- Consumes: `public/qg/machine-energie.webp` + zones mesurées (Task 1) ; `ENERGIE_MAX`, `energieCourante`, `secondesAvantProchaine`, `pubsEnergieRestantes` (`@/lib/energie`) ; `getAdProvider` ; chaînes `d.chrome.*` existantes.
- Produces: `export function angleAiguille(energie: number, max: number): number` (course -60° → +60°, clampée) exportée depuis `EnergieRecharge.tsx` ; composant `EnergieRecharge({ onClose })` inchangé côté API.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `src/components/mobile/EnergieRecharge.test.tsx` (conserver les 2 tests quota existants tels quels) :

```tsx
import { angleAiguille } from "./EnergieRecharge";

describe("angleAiguille", () => {
  it("course -60° (0 ⚡) → +60° (max), linéaire et clampée", () => {
    expect(angleAiguille(0, 5)).toBe(-60);
    expect(angleAiguille(5, 5)).toBe(60);
    expect(angleAiguille(2.5, 5)).toBe(0);
    expect(angleAiguille(7, 5)).toBe(60); // clamp haut
    expect(angleAiguille(-1, 5)).toBe(-60); // clamp bas
    expect(angleAiguille(3, 0)).toBe(-60); // max invalide → repos
  });
});

describe("EnergieRecharge — galvanomètre", () => {
  it("l'aiguille est rendue, tournée selon l'énergie courante", () => {
    mockState = {
      energie: 2,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    const aiguille = screen.getByTestId("aiguille-energie");
    expect(aiguille.getAttribute("transform")).toBe(
      `rotate(${angleAiguille(2, 5)})`,
    );
  });

  it("énergie pleine : affiche « au maximum » (pas de minuteur)", () => {
    mockState = {
      energie: 5,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    expect(screen.getByText(/au maximum/i)).toBeTruthy();
    expect(screen.queryByText(/dans \d{2}:\d{2}/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/EnergieRecharge.test.tsx`
Expected: FAIL — `angleAiguille` n'est pas exporté ; `aiguille-energie` introuvable.

- [ ] **Step 3: Keyframes globales**

Dans `src/app/globals.css`, sous `broc-slide-up` (~ligne 1092) :

```css
/* Machine à énergie : tremblement pendant la pub, étincelle à la récompense. */
@keyframes broc-shake {
  0%, 100% { transform: translate(0, 0); }
  20% { transform: translate(-2px, 1px); }
  40% { transform: translate(2px, -1px); }
  60% { transform: translate(-2px, -1px); }
  80% { transform: translate(2px, 1px); }
}
@keyframes broc-spark {
  from { opacity: 1; transform: translate(0, 0) scale(1); }
  to { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0.4); }
}
```

- [ ] **Step 4: Refondre le composant**

Réécrire `src/components/mobile/EnergieRecharge.tsx` (logique conservée : tick 1 s, quota bloqué avant pub, `crediterEnergiePub` à la récompense) :

```tsx
"use client";

import { X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useGame, useGameActions } from "@/context/GameContext";
import {
  ENERGIE_MAX,
  energieCourante,
  pubsEnergieRestantes,
  secondesAvantProchaine,
} from "@/lib/energie";
import { getAdProvider } from "@/lib/ads/adProvider";
import { useLangue } from "@/lib/i18n/LangueContext";

/** Course de l'aiguille du galvanomètre : -60° (0 ⚡) → +60° (max), clampée. */
export function angleAiguille(energie: number, max: number): number {
  const ratio = max > 0 ? Math.min(Math.max(energie / max, 0), 1) : 0;
  return -60 + ratio * 120;
}

function formatMMSS(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const MACHINE_IMG = "/qg/machine-energie.webp";

/** Zones posées sur l'illustration, en % de la carte — à calibrer (Task 1 step 3). */
const ZONE_CADRAN = { cx: 50, cy: 22, r: 17 };
const ZONE_COMPTEUR_TOP = 40; // « n/5 » + minuteur, sous le cadran
const ZONE_LEVIER = { left: 10, top: 62, width: 80, height: 13 };

/** Décalages des étincelles (précalculés : pas de Math.random au rendu). */
const ETINCELLES: ReadonlyArray<{ dx: number; dy: number; delai: number }> = [
  { dx: -46, dy: -38, delai: 0 },
  { dx: 42, dy: -52, delai: 60 },
  { dx: -28, dy: -64, delai: 120 },
  { dx: 56, dy: -20, delai: 40 },
  { dx: -60, dy: -10, delai: 100 },
  { dx: 30, dy: -70, delai: 160 },
];

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const carteStyle = (tremble: boolean): CSSProperties => ({
  position: "relative",
  width: "100%",
  maxWidth: 340,
  aspectRatio: "3 / 4",
  borderRadius: 14,
  overflow: "hidden",
  border: "3px solid var(--brass-500)",
  boxShadow: "0 18px 48px rgba(0,0,0,0.55)",
  animation: tremble ? "broc-shake 240ms linear infinite" : undefined,
});

const cadranStyle: CSSProperties = {
  position: "absolute",
  left: `${ZONE_CADRAN.cx - ZONE_CADRAN.r}%`,
  top: `calc(${ZONE_CADRAN.cy}% - ${ZONE_CADRAN.r}% * 3 / 4)`,
  width: `${ZONE_CADRAN.r * 2}%`,
  aspectRatio: "1 / 1",
  pointerEvents: "none",
};

const compteurStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: `${ZONE_COMPTEUR_TOP}%`,
  textAlign: "center",
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  textShadow: "0 1px 4px rgba(0,0,0,0.8)",
  pointerEvents: "none",
};

const levierBtnStyle = (indisponible: boolean): CSSProperties => ({
  position: "absolute",
  left: `${ZONE_LEVIER.left}%`,
  top: `${ZONE_LEVIER.top}%`,
  width: `${ZONE_LEVIER.width}%`,
  height: `${ZONE_LEVIER.height}%`,
  borderRadius: 10,
  border: "2px solid var(--brass-500)",
  background: indisponible ? "rgba(20,35,26,0.82)" : "rgba(214,178,94,0.92)",
  color: indisponible ? "var(--brass-700)" : "var(--forest-900)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "clamp(11px, 3.4vw, 14px)",
  letterSpacing: "0.04em",
  cursor: indisponible ? "not-allowed" : "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
});

export function EnergieRecharge({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const { tempsConfiance, crediterEnergiePub } = useGameActions();
  const [enCours, setEnCours] = useState(false);
  const [etincelles, setEtincelles] = useState(false);
  const [, force] = useState(0);
  const { d, tr } = useLangue();

  // Tick local 1 s pour le minuteur (sans réécrire le state global).
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Coupe la gerbe d'étincelles après l'animation.
  useEffect(() => {
    if (!etincelles) return;
    const id = window.setTimeout(() => setEtincelles(false), 900);
    return () => window.clearTimeout(id);
  }, [etincelles]);

  if (!state) return null;
  const now = tempsConfiance() ?? Date.now();
  const energieMax = ENERGIE_MAX;
  const energie = energieCourante(state, now, energieMax);
  const restantSec = secondesAvantProchaine(state, now, energieMax);
  const pubsRestantes = pubsEnergieRestantes(state.pubsEnergie, now);
  // Quota épuisé : on bloque AVANT de lancer la pub (jamais de pub gâchée).
  const pubIndisponible = enCours || pubsRestantes <= 0;

  const regarderPub = async () => {
    if (pubIndisponible) return;
    setEnCours(true);
    try {
      const { rewarded } = await getAdProvider().showRewardedAd();
      if (rewarded) {
        crediterEnergiePub();
        setEtincelles(true);
      }
    } finally {
      setEnCours(false);
    }
  };

  const angle = angleAiguille(energie, energieMax);
  const graduations = Array.from({ length: energieMax + 1 }, (_, i) =>
    angleAiguille(i, energieMax),
  );

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={carteStyle(enCours)} onClick={(e) => e.stopPropagation()}>
        {/* La machine du savant fou — l'illustration EST la carte. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MACHINE_IMG}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />

        <button
          onClick={onClose}
          aria-label={d.commun.fermer}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 2,
            background: "rgba(15,30,22,0.55)",
            border: "1px solid var(--brass-700)",
            borderRadius: 999,
            width: 32,
            height: 32,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--brass-300)",
            cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>

        {/* Galvanomètre posé sur le cadran vide de l'illustration. */}
        <div style={cadranStyle}>
          <svg viewBox="-50 -50 100 100" style={{ width: "100%", height: "100%" }}>
            {/* Graduations 0→max le long de l'arc de course. */}
            {graduations.map((a, i) => (
              <g key={i} transform={`rotate(${a})`}>
                <line
                  x1={0}
                  y1={-40}
                  x2={0}
                  y2={i === 0 || i === graduations.length - 1 ? -31 : -34}
                  stroke="var(--forest-800)"
                  strokeWidth={i === graduations.length - 1 ? 3 : 2}
                  strokeLinecap="round"
                />
              </g>
            ))}
            {/* Aiguille — transition ressort quand l'énergie monte. */}
            <g
              data-testid="aiguille-energie"
              transform={`rotate(${angle})`}
              style={{ transition: "transform 600ms cubic-bezier(0.2, 1.6, 0.4, 1)" }}
            >
              <line x1={0} y1={8} x2={0} y2={-36} stroke="var(--vermillion-600)" strokeWidth={3} strokeLinecap="round" />
            </g>
            <circle r={5} fill="var(--brass-500)" stroke="var(--forest-800)" strokeWidth={1.5} />
          </svg>
        </div>

        {/* Compteur n/max + minuteur, sous le cadran. */}
        <div style={compteurStyle}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            <Zap size={18} strokeWidth={2.5} style={{ verticalAlign: "-2px" }} /> {energie}
            <span style={{ opacity: 0.6 }}>/{energieMax}</span>
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {restantSec === null
              ? d.chrome.energieAuMaximum
              : tr(d.chrome.prochaineEnergieDans, { temps: formatMMSS(restantSec) })}
          </div>
        </div>

        {/* Le levier : zone bouton posée sur le levier peint. */}
        <button onClick={regarderPub} disabled={pubIndisponible} style={levierBtnStyle(pubIndisponible)}>
          <Zap size={15} />
          {enCours
            ? d.chrome.pubEnCours
            : pubsRestantes <= 0
              ? d.chrome.pubEpuisee
              : d.chrome.regarderPub}
        </button>

        {/* Gerbe d'étincelles à la récompense (au niveau du cadran). */}
        {etincelles &&
          ETINCELLES.map((e, i) => (
            <span
              key={i}
              aria-hidden
              style={
                {
                  position: "absolute",
                  left: `${ZONE_CADRAN.cx}%`,
                  top: `${ZONE_CADRAN.cy}%`,
                  fontSize: 18,
                  pointerEvents: "none",
                  animation: `broc-spark 700ms ease-out ${e.delai}ms both`,
                  "--dx": `${e.dx}px`,
                  "--dy": `${e.dy}px`,
                } as CSSProperties
              }
            >
              ⚡
            </span>
          ))}
      </div>
    </div>
  );
}
```

Notes d'implémentation :
- Les 2 tests quota existants doivent passer sans modification (mêmes libellés, même `disabled`).
- `ZONE_*` : remplacer par les valeurs mesurées en Task 1 step 3.
- `cadranStyle.top` : le `calc(... * 3 / 4)` convertit le rayon (% de largeur) en % de hauteur — dans `top`, un % s'évalue contre la hauteur, et sur une carte 3:4 la hauteur vaut largeur × 4/3, donc x % de largeur = x × 3/4 % de hauteur.

- [ ] **Step 5: Vérifier le succès**

Run: `npx vitest run src/components/mobile/EnergieRecharge.test.tsx && npx tsc --noEmit && npx eslint src/components/mobile/EnergieRecharge.tsx && npm run lint:hooks`
Expected: PASS (2 tests quota + 3 nouveaux), TS/eslint propres.

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/EnergieRecharge.tsx src/components/mobile/EnergieRecharge.test.tsx src/app/globals.css
git commit -m "feat(energie): la modale recharge devient la machine du savant fou (galvanomètre + levier pub)"
```

---

### Task 3: Vérification finale

**Files:** aucun nouveau (ajustement éventuel des constantes `ZONE_*`).

- [ ] **Step 1: Suite complète + lint + types**

Run: `npx vitest run && npx eslint src && npm run lint:hooks && npx tsc --noEmit`
Expected: tout vert.

- [ ] **Step 2: Vérification end-to-end (Playwright, vrai navigateur, `next dev` du worktree sur un port libre)**

Depuis une partie : ouvrir la modale via le bouton ⊕ énergie du header (`MobileHeader`). Vérifier :
1. La machine remplit la carte, cadran + aiguille alignés sur l'illustration (capture ; ajuster `ZONE_*` si décalé, re-capturer).
2. Aiguille cohérente avec l'énergie courante ; « n/5 » et minuteur lisibles.
3. Tirer le levier : tremblement pendant la pub (stub ~800 ms), puis +1 ⚡, aiguille qui bondit, étincelles.
4. Quota épuisé (patcher `pubsEnergie` dans la save à `PUBS_ENERGIE_MAX_PAR_JOUR`) : levier grisé « Plus de pub aujourd'hui ».
5. ✕ et clic sur le fond ferment la modale.

- [ ] **Step 3: Commit d'ajustement éventuel + état de la branche**

```bash
git status
```
