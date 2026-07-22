# Level up « Certificat de brocanteur » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le rendu de l'écran de level up par un certificat ancien unique avec cascade d'apparition et cachet de cire qui s'écrase.

**Architecture:** `LevelUpOverlay.tsx` est réécrit autour d'un conteneur unique `.broc-levelup-certificat` (papier + double filet doré + ornements de coins partagés) ; les délais d'animation sont calculés en JS (inline `animationDelay`), les keyframes vivent dans `globals.css`. Le cachet est un webp généré par le pipeline Gemini existant (magenta → chroma-key → webp).

**Tech Stack:** Next.js/React (styles inline CSSProperties + globals.css), vitest + testing-library, @google/genai + sharp (script asset).

## Global Constraints

- Jamais de chaîne localisée dans les saves (règle d'or i18n du projet).
- 4 langues obligatoires : FR/EN/ES/EL (`DictionnaireUI = DeepStrings<typeof fr>` force la parité).
- `npm run lint` cassé (Next 16) → utiliser `npx eslint <fichiers>`.
- `prefers-reduced-motion: reduce` doit tout afficher sans animation (pattern du bloc existant `globals.css:1017`).
- Commits fréquents, messages français convention `type(scope): …`.

---

### Task 1: Asset cachet de cire (script Gemini + webp)

**Files:**
- Create: `scripts/generate-cachet-cire.mjs`
- Create (généré): `public/ui/cachet-cire.webp`

**Interfaces:**
- Produces: `public/ui/cachet-cire.webp` — image transparente ~1024px (affichée 88px), consommée par Task 3 via `<img src="/ui/cachet-cire.webp">`.

- [ ] **Step 1: Écrire le script** — copie adaptée de `scripts/generate-boite-mystere.mjs` (mêmes helpers `loadDotEnv`, `generate`, `chromaKeyMagenta`, `toWebp`) :

```js
#!/usr/bin/env node
/**
 * Génère le cachet de cire du certificat de level up via Gemini Image API
 * (gemini-3-pro-image-preview), pipeline magenta → chroma-key → webp.
 *
 * Sortie : public/ui/cachet-cire.webp
 * Usage : node scripts/generate-cachet-cire.mjs [--force]
 */
```

Prompt (text-to-image, une seule image) :

```js
const PROMPT = [
  "Vintage museum-catalog illustration of a single round WAX SEAL stamp, viewed from directly above.",
  "Deep crimson-red sealing wax with organic irregular drippy edges, glossy highlights, engraved in the center with an ornate Art-Deco monogram letter « B » surrounded by a thin decorative ring.",
  "Warm muted palette consistent with sepia/cream/brass aesthetics. No neon colors.",
  "Placed on a SOLID FLAT PURE MAGENTA background (#FF00FF), absolutely uniform — NO shadow, NO gradient, NO texture, no text besides the monogram, no watermark.",
  "Subject perfectly centered, occupying ~80% of the frame. Strict square 1:1 aspect ratio.",
].join(" ");
```

Corps du `main()` : générer → `public/ui/cachet-cire.png` → `chromaKeyMagenta` → `toWebp` → supprimer le png intermédiaire (`fs.unlink`).

- [ ] **Step 2: Générer l'asset**

Run: `node scripts/generate-cachet-cire.mjs`
Expected: `→ cachet-cire.webp (XX kB)` et le fichier existe dans `public/ui/`.

- [ ] **Step 3: Inspecter visuellement** — ouvrir/Read le webp, vérifier : cire rouge, monogramme « B », détourage propre sans résidus magenta. Montrer à Guillaume pour validation ; regénérer avec `--force` si besoin.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-cachet-cire.mjs public/ui/cachet-cire.webp
git commit -m "feat(levelup): asset cachet de cire (pipeline Gemini magenta→webp)"
```

---

### Task 2: Clé i18n `eyebrowCertificat` (4 langues)

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts` (~ligne 212, bloc `sheets`, à côté de `niveauNCelebration`)
- Modify: `src/lib/i18n/ui/en.ts`, `es.ts`, `el.ts` (même bloc)

**Interfaces:**
- Produces: `d.sheets.eyebrowCertificat: string` — consommée par Task 3.

- [ ] **Step 1: Ajouter la clé dans les 4 dictionnaires**, juste avant `niveauNCelebration` :

```ts
// fr.ts
eyebrowCertificat: "— Certificat de brocanteur —",
// en.ts
eyebrowCertificat: "— Picker's certificate —",
// es.ts
eyebrowCertificat: "— Certificado de rebuscador —",
// el.ts
eyebrowCertificat: "— Πιστοποιητικό παλιατζή —",
```

- [ ] **Step 2: Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: aucune erreur (la parité des 4 dicts est vérifiée par `DeepStrings<typeof fr>`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts src/lib/i18n/ui/el.ts
git commit -m "feat(i18n): eyebrow « Certificat de brocanteur » (FR/EN/ES/EL)"
```

---

### Task 3: Refonte `LevelUpOverlay` en certificat unique

**Files:**
- Create: `src/components/mobile/CornerOrnament.tsx` (extraction du motif de `BrocanteDetailFloating.tsx:163-202`)
- Modify: `src/components/mobile/brocante-pano/BrocanteDetailFloating.tsx` (importe le composant partagé, supprime sa copie locale)
- Modify: `src/components/mobile/LevelUpOverlay.tsx` (réécriture du rendu)
- Test: `src/components/mobile/LevelUpOverlay.test.tsx`

**Interfaces:**
- Consumes: `d.sheets.eyebrowCertificat` (Task 2), `/ui/cachet-cire.webp` (Task 1).
- Produces: classes `.broc-levelup-certificat`, `.broc-levelup-ligne`, `.broc-levelup-cachet` (stylées en Task 4) ; `CornerOrnament({ position: "tl"|"tr"|"bl"|"br", inset?: number })`.

- [ ] **Step 1: Extraire `CornerOrnament`** — nouveau fichier reprenant à l'identique le SVG « stairstep » (props `position`, plus `inset = 6` pour ajuster la marge) :

```tsx
import type { CSSProperties } from "react";

/** Ornement de coin Art déco « stairstep » (partagé : carte brocante, certificat level up). */
export function CornerOrnament({
  position,
  inset = 6,
}: {
  position: "tl" | "tr" | "bl" | "br";
  inset?: number;
}) {
  const rotation = { tl: 0, tr: 90, br: 180, bl: 270 }[position];
  const placement: CSSProperties = {
    position: "absolute",
    width: 18,
    height: 18,
    pointerEvents: "none",
    color: "var(--brass-500)",
    ...(position === "tl" || position === "tr" ? { top: inset } : { bottom: inset }),
    ...(position === "tl" || position === "bl" ? { left: inset } : { right: inset }),
    transform: `rotate(${rotation}deg)`,
  };
  return (
    <svg viewBox="0 0 18 18" style={placement} aria-hidden>
      <path
        d="M2 16 L2 12 L6 12 L6 8 L10 8 L10 4 L16 4"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="2" cy="16" r="1.3" fill="currentColor" />
    </svg>
  );
}
```

Dans `BrocanteDetailFloating.tsx` : supprimer `cornerOrnamentBase` + la fonction locale, ajouter `import { CornerOrnament } from "@/components/mobile/CornerOrnament";`.

- [ ] **Step 2: Mettre à jour les tests (rouge d'abord)** — dans `LevelUpOverlay.test.tsx`, remplacer le test « titre détaché » et ajouter le cachet :

```tsx
it("certificat unique : titre ET bouton dans .broc-levelup-certificat, cachet présent", () => {
  mockState = etat(0, 1);
  mockPathname = "/bureau";
  render(<LevelUpOverlay />);
  const certificat = screen.getByText("Niveau 1").closest(".broc-levelup-certificat");
  expect(certificat).toBeTruthy();
  expect(certificat!.querySelector("button")).toBeTruthy();
  expect(screen.getByTestId("levelup-cachet").getAttribute("alt")).toBe("");
});

it("eyebrow « Certificat de brocanteur » affiché", () => {
  mockState = etat(0, 1);
  mockPathname = "/bureau";
  render(<LevelUpOverlay />);
  expect(screen.getByText("— Certificat de brocanteur —")).toBeTruthy();
});
```

Supprimer l'ancien test `"titre détaché de la carte : …"`.

- [ ] **Step 3: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/LevelUpOverlay.test.tsx`
Expected: FAIL sur `.broc-levelup-certificat` introuvable.

- [ ] **Step 4: Réécrire le rendu de `LevelUpOverlay.tsx`** — supprimer `Plaque`, `plaqueStyle`, `plaqueRivetStyle`, `carte`, `colonne`, `blocTitre` ; garder intacts imports logique, `extraireEmoji`, gating session/plafond. Nouveau corps :

```tsx
const certificat: CSSProperties = {
  position: "relative",
  background:
    "radial-gradient(circle at 50% 18%, #fbf6ea 0%, var(--paper-100) 60%, #efe6d2 100%)",
  borderRadius: 6,
  border: "1px solid var(--brass-700)",
  boxShadow:
    "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px var(--brass-500), 0 12px 30px rgba(20,12,0,0.55)",
  padding: "26px 22px 24px",
  maxWidth: 340,
  width: "100%",
  boxSizing: "border-box",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
};

const eyebrowCertificat: CSSProperties = {
  fontFamily: "var(--font-mono)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 10.5,
  color: "var(--brass-700)",
};

const titreGeant: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "clamp(34px, 11vw, 48px)",
  lineHeight: 1.05,
  color: "var(--brass-600)",
  textShadow: "0 1px 0 rgba(255,255,255,0.6), 0 0 18px rgba(224,178,92,0.35)",
  whiteSpace: "nowrap",
};

const ligneWrap: CSSProperties = { width: "100%" };

const sousTitre: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ink-700)",
};

const ligneDeblocage: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ink-700)",
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

const lignProchain: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-500)",
};

const filetRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "78%",
  margin: "2px auto 10px",
};
const filetGauche: CSSProperties = {
  flex: 1,
  height: 1,
  background: "linear-gradient(90deg, transparent, var(--brass-500))",
};
const filetDroit: CSSProperties = {
  flex: 1,
  height: 1,
  background: "linear-gradient(90deg, var(--brass-500), transparent)",
};
const filetLosange: CSSProperties = { color: "var(--brass-500)", fontSize: 8, lineHeight: 1 };

const cachetImg: CSSProperties = {
  position: "absolute",
  right: -14,
  bottom: -18,
  width: 88,
  height: 88,
  transform: "rotate(-12deg)",
  filter: "drop-shadow(0 4px 8px rgba(20,12,0,0.4))",
  pointerEvents: "none",
};

const btnContinuer: CSSProperties = { /* inchangé */ };

function FiletOr() {
  return (
    <div style={filetRow} aria-hidden="true">
      <span style={filetGauche} />
      <span style={filetLosange}>◆</span>
      <span style={filetDroit} />
    </div>
  );
}
```

JSX (le scrim/role dialog existants ne changent pas) — les mentions sont accumulées dans un tableau pour calculer les délais :

```tsx
const lignes: { key: string; contenu: ReactNode }[] = [];
if (!plafondCompetencesAtteint) {
  lignes.push({
    key: "point",
    contenu: <div style={sousTitre}>{d.sheets.plusUnPointCompetence}</div>,
  });
}
for (const dep of deblocages) {
  const titreLocal = titreDeblocage(dep, locale);
  if (dep.famille === "active") {
    const { emoji, texte } = extraireEmoji(titreLocal);
    lignes.push({
      key: dep.titre,
      contenu: (
        <div data-testid="levelup-atout">
          {emoji && (
            <span style={atoutEmoji} aria-hidden="true">{emoji}</span>
          )}
          <div style={atoutTitre}>{texte}</div>
          <p style={atoutDescription}>{descriptionDeblocage(dep, locale)}</p>
        </div>
      ),
    });
  } else {
    lignes.push({ key: dep.titre, contenu: <div style={ligneDeblocage}>{titreLocal}</div> });
  }
}
if (prochain) {
  lignes.push({
    key: "prochain",
    contenu: (
      <div style={lignProchain}>
        {tr(d.sheets.prochainNiv, { n: prochain.niveau })} {titreDeblocage(prochain, locale)}
      </div>
    ),
  });
}

const delaiBase = 0.45;
const delaiCachet = delaiBase + lignes.length * 0.12 + 0.15;
const delaiBouton = delaiCachet + 0.45;

return (
  <div style={scrim} role="dialog" aria-modal="true"
       aria-label={tr(d.sheets.niveauAtteintAriaLabel, { n: niveauACelebrer })}>
    <div
      className="broc-levelup-certificat"
      style={{ ...certificat, ["--shake-delay" as string]: `${delaiCachet + 0.22}s` }}
    >
      <CornerOrnament position="tl" />
      <CornerOrnament position="tr" />
      <CornerOrnament position="bl" />
      <CornerOrnament position="br" />
      <div style={eyebrowCertificat}>{d.sheets.eyebrowCertificat}</div>
      <div style={titreGeant}>
        {tr(d.sheets.niveauNCelebration, { n: niveauACelebrer })}
      </div>
      {lignes.map((l, i) => (
        <div
          key={l.key}
          className="broc-levelup-ligne"
          style={{ ...ligneWrap, animationDelay: `${delaiBase + i * 0.12}s` }}
        >
          <FiletOr />
          {l.contenu}
        </div>
      ))}
      <button
        type="button"
        className="broc-levelup-ligne"
        style={{ ...btnContinuer, animationDelay: `${delaiBouton}s` }}
        onClick={marquerNiveauVu}
      >
        {d.menu.continuer}
      </button>
      <img
        src="/ui/cachet-cire.webp"
        alt=""
        data-testid="levelup-cachet"
        className="broc-levelup-cachet"
        style={{ ...cachetImg, animationDelay: `${delaiCachet}s` }}
      />
    </div>
  </div>
);
```

Notes : le titre n'est plus animé en slam séparé (le certificat entier entre en scène) ; les ornements ✦ latéraux du titre disparaissent (l'eyebrow + filets ornent déjà). Supprimer la classe `.broc-levelup-titre`/`.broc-levelup-carte` du JSX.

- [ ] **Step 5: Vérifier le vert**

Run: `npx vitest run src/components/mobile/LevelUpOverlay.test.tsx src/components/mobile/brocante-pano/BrocanteDetailFloating.test.tsx && npx tsc --noEmit`
Expected: PASS partout (BrocanteDetailFloating inchangé fonctionnellement).

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/CornerOrnament.tsx src/components/mobile/brocante-pano/BrocanteDetailFloating.tsx src/components/mobile/LevelUpOverlay.tsx src/components/mobile/LevelUpOverlay.test.tsx
git commit -m "feat(levelup): certificat de brocanteur unique (ornements partagés, cascade, cachet)"
```

---

### Task 4: Animations CSS (cascade, slam du cachet, shake, reduced-motion)

**Files:**
- Modify: `src/app/globals.css:998-1022` (remplace le bloc level up existant)

**Interfaces:**
- Consumes: classes et `--shake-delay` posées en Task 3.

- [ ] **Step 1: Remplacer le bloc level up de `globals.css`** (les anciennes règles `broc-levelup-slam`/`broc-levelup-carte-in`/`.broc-levelup-titre`/`.broc-levelup-carte` sautent) :

```css
/* Level up « certificat » : le document entre (fade + montée), les mentions
   apparaissent en cascade (delay inline par ligne), puis le cachet de cire
   s'écrase (scale 2.6→1) et fait trembler le certificat (--shake-delay). */
@keyframes broc-levelup-certificat-in {
  from { opacity: 0; transform: translateY(18px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes broc-levelup-certificat-shake {
  0%, 100% { translate: 0 0; }
  25% { translate: 2px 1px; }
  50% { translate: -2px -1px; }
  75% { translate: 1px 2px; }
}
@keyframes broc-levelup-ligne-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes broc-levelup-cachet-slam {
  0% { opacity: 0; transform: rotate(-30deg) scale(2.6); }
  60% { opacity: 1; transform: rotate(-10deg) scale(0.92); }
  100% { opacity: 1; transform: rotate(-12deg) scale(1); }
}
.broc-levelup-certificat {
  animation:
    broc-levelup-certificat-in 400ms ease-out both,
    broc-levelup-certificat-shake 220ms linear var(--shake-delay, 1.2s) 1;
}
.broc-levelup-ligne {
  animation: broc-levelup-ligne-in 350ms ease-out both;
  /* animation-delay inline (cascade calculée en JS) */
}
.broc-levelup-cachet {
  animation: broc-levelup-cachet-slam 340ms cubic-bezier(0.3, 1.4, 0.5, 1) both;
  /* animation-delay inline (après la cascade) */
}
/* Le bloc reduced-motion global écrase les durées mais pas animation-delay :
   sans ceci lignes et cachet resteraient invisibles pendant leur delay. */
@media (prefers-reduced-motion: reduce) {
  .broc-levelup-certificat,
  .broc-levelup-ligne,
  .broc-levelup-cachet {
    animation: none !important;
  }
}
```

Attention : `broc-levelup-cachet-slam` anime `transform`, le `transform: rotate(-12deg)` inline de `cachetImg` sert d'état final quand l'animation est coupée (reduced-motion) — cohérent car la frame 100% vaut la même chose. Le shake utilise `translate` (propriété distincte) pour ne pas entrer en conflit avec le `transform` de l'entrée.

- [ ] **Step 2: Vérification complète**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src/components/mobile/LevelUpOverlay.tsx src/components/mobile/CornerOrnament.tsx src/components/mobile/brocante-pano/BrocanteDetailFloating.tsx`
Expected: suite complète verte, 0 erreur.

- [ ] **Step 3: Vérification visuelle** — dev server (déjà lancé sur :3000), déclencher un level up (ou forcer `niveauVu` < niveau en save) et vérifier : cascade, slam du cachet, shake, bouton en dernier. Capture pour Guillaume.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(levelup): animations certificat (cascade, slam du cachet, shake, reduced-motion)"
```
