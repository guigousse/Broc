# Machine ∞ — célébration d'achat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** À l'achat « Énergie infinie », la fiche machine se transfigure : flashs d'éclair synchronisés avec le son du tonnerre + son de recharge, swap de l'image vers une machine bleutée au cadran ∞ pendant le flash, image permanente ensuite.

**Architecture:** Un nouveau one-shot `playEclair()` dans l'audioManager (motif éviction `depart-voiture`), une séquence de célébration locale à `EnergieRecharge` (deux états + deux `setTimeout` sur constantes nommées, flashs portés par une seule `@keyframes` dans globals.css — synchro son/flash par départ dans le même tick), et une image générée hors-agent (contrôleur, Gemini image-to-image).

**Tech Stack:** Web Audio (audioManager existant), React/Next, vitest + @testing-library/react (fake timers), sharp + Gemini pour l'asset.

**Spec:** `docs/superpowers/specs/2026-08-04-machine-infinie-celebration-design.md`

## Global Constraints

- Branche : `feat/iap-energie-infinie` (worktree `.claude/worktrees/iap-energie-infinie`). Travailler UNIQUEMENT là ; vérifier `git branch --show-current` avant tout.
- Tests : **toujours** `npx vitest run --maxWorkers=4 <fichiers>` (sans le drapeau : ~41 faux échecs sur ce Mac Intel).
- L'événement épique n'existe QUE dans le parcours d'achat d'`EnergieRecharge`. Restauration (réglages) et boot restent discrets — ne pas toucher `ReglagesModal`, `IapBootstrap`, `GameContext`.
- En mode ∞ : ni aiguille, ni pastille compteur, ni cartel pub, ni levier, ni bouton d'achat — l'image ∞ porte le cadran. (Décision 2 du spec.)
- Chemins d'images : `/qg/machine-energie.webp` (existant), `/qg/machine-energie-infinie.webp` (nouveau, Task 3).
- Son : `/sounds/eclair.mp3`, joué au plus une fois par vie d'app → éviction du tampon après lecture (motif `depart-voiture`, `audioManager.ts:660-666`).
- SAVE_VERSION intact, aucune donnée nouvelle en save.

---

### Task 1: `playEclair()` + asset son

**Files:**
- Create: `public/sounds/eclair.mp3` (copie de `/Users/guillaume/Desktop/patricksilvey-weather-lightning-2-464187.mp3`)
- Modify: `src/lib/audio/audioManager.ts` (nouvelle méthode près de `playRecharge`, ligne ~502)
- Test: `src/lib/audio/audioManager.test.ts` (étendre, harnais existant)

**Interfaces:**
- Consumes: `loadBuffer`, `buffers`, `ensureCtx`, `prefs.effets` (privés existants du singleton).
- Produces: `audioManager.playEclair(): Promise<void>` — consommé par la Task 2.

- [ ] **Step 1: Copier l'asset**

```bash
cp "/Users/guillaume/Desktop/patricksilvey-weather-lightning-2-464187.mp3" public/sounds/eclair.mp3
```

- [ ] **Step 2: Écrire le test (rouge)**

Ouvrir `src/lib/audio/audioManager.test.ts`, repérer comment les méthodes `play*` y sont testées (contexte audio factice / spys sur `loadBuffer`), et ajouter dans le même harnais :

```ts
describe("playEclair — coup de tonnerre de l'achat énergie infinie", () => {
  it("charge /sounds/eclair.mp3, le joue, puis évince le tampon (one-shot rare)", async () => {
    // …même setup que les autres tests play* du fichier…
    await audioManager.playEclair();
    // le tampon ne doit PAS rester en cache après lecture
    expect((audioManager as never as { buffers: Map<string, unknown> })
      .buffers.has("/sounds/eclair.mp3")).toBe(false);
  });
});
```

(Adapter l'accès aux internes à ce que fait déjà le fichier de test — s'il expose un helper ou espionne `loadBuffer`, faire pareil ; l'assertion d'éviction est le cœur du test.)

- [ ] **Step 3: Vérifier l'échec**

Run : `npx vitest run --maxWorkers=4 src/lib/audio/audioManager.test.ts`
Expected : FAIL (`playEclair` n'existe pas).

- [ ] **Step 4: Implémenter**

Dans `audioManager.ts`, à côté de `playRecharge` :

```ts
  /** Coup de tonnerre de l'achat « Énergie infinie » — one-shot unique par vie
   *  d'app : le tampon est évincé sitôt la lecture lancée (motif depart-voiture,
   *  audit H3) ; la source en cours de lecture garde sa propre référence. */
  async playEclair(): Promise<void> {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/eclair.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
    this.buffers.delete("/sounds/eclair.mp3");
  }
```

- [ ] **Step 5: Vérifier le vert**

Run : `npx vitest run --maxWorkers=4 src/lib/audio/audioManager.test.ts`
Expected : PASS (nouveau + anciens).

- [ ] **Step 6: Commit**

```bash
git add public/sounds/eclair.mp3 src/lib/audio/audioManager.ts src/lib/audio/audioManager.test.ts
git commit -m "feat(iap): son d'éclair one-shot avec éviction du tampon"
```

---

### Task 2: Séquence de célébration dans EnergieRecharge

**Files:**
- Modify: `src/components/mobile/EnergieRecharge.tsx`
- Modify: `src/app/globals.css` (une `@keyframes broc-flash-eclair`)
- Test: `src/components/mobile/EnergieRecharge.test.tsx` (étendre + AMENDER 2 tests existants)

**Interfaces:**
- Consumes: `audioManager.playEclair()` (Task 1), `audioManager.playRecharge()` (existant), `definirEnergieInfinie` / `useEnergieInfinie` (existants), `MACHINE_IMG` (existant, ligne ~33).
- Produces: constantes exportées pour les tests — `export const MACHINE_IMG_INFINIE = "/qg/machine-energie-infinie.webp";`, `export const CELEBRATION = { swapMs: 90, dureeMs: 1500 } as const;`. Aucun changement d'API externe.

- [ ] **Step 1: Amender les 2 tests existants qui vont casser (en rouge d'abord)**

Dans `EnergieRecharge.test.tsx`, les tests « l'achat pose le drapeau et bascule la machine en ∞ » et « acheteur : ni bouton d'achat, ni cartel pub, compteur en ∞ » affirment `screen.getByText("∞")` : la pastille compteur disparaît (décision 2 — l'image porte le ∞). Remplacer ces assertions par l'image :

```tsx
import { CELEBRATION, MACHINE_IMG_INFINIE } from "./EnergieRecharge";

// test « achat » (adapter au harnais existant, fake timers) :
it("l'achat joue éclair+recharge et swap l'image pendant le flash", async () => {
  vi.useFakeTimers();
  const spyEclair = vi.spyOn(audioManager, "playEclair").mockResolvedValue();
  const spyRecharge = vi.spyOn(audioManager, "playRecharge").mockResolvedValue();
  // …render + click sur le bouton d'achat comme dans le test existant…
  // (résoudre l'achat du provider mocké)
  expect(spyEclair).toHaveBeenCalledTimes(1);
  expect(spyRecharge).toHaveBeenCalledTimes(1);
  // avant le pic du flash : image d'origine encore affichée
  expect(document.querySelector(`img[src="${MACHINE_IMG_INFINIE}"]`)).toBeNull();
  await act(() => vi.advanceTimersByTimeAsync(CELEBRATION.swapMs));
  expect(document.querySelector(`img[src="${MACHINE_IMG_INFINIE}"]`)).not.toBeNull();
  await act(() => vi.advanceTimersByTimeAsync(CELEBRATION.dureeMs));
  vi.useRealTimers();
});

it("acheteur qui rouvre : machine ∞ directe, sans flash ni son ni pastille", () => {
  definirEnergieInfinie(true);
  const spyEclair = vi.spyOn(audioManager, "playEclair").mockResolvedValue();
  // …render…
  expect(document.querySelector(`img[src="${MACHINE_IMG_INFINIE}"]`)).not.toBeNull();
  expect(screen.queryByText("∞")).toBeNull(); // plus de pastille compteur
  expect(spyEclair).not.toHaveBeenCalled();
});
```

NB : si l'image machine est un `background-image` et non un `<img>`, adapter la sonde (par ex. `data-machine="infinie"` sur le conteneur) — poser alors cet attribut dans l'implémentation.

- [ ] **Step 2: Vérifier l'échec**

Run : `npx vitest run --maxWorkers=4 src/components/mobile/EnergieRecharge.test.tsx`
Expected : les tests amendés/nouveaux FAIL (constantes inexistantes), le reste PASS.

- [ ] **Step 3: Implémenter**

Dans `EnergieRecharge.tsx` :

1. Constantes (près de `MACHINE_IMG`) :

```ts
export const MACHINE_IMG_INFINIE = "/qg/machine-energie-infinie.webp";
/** Timings de la célébration d'achat — le flash n°1 pique à swapMs. */
export const CELEBRATION = { swapMs: 90, dureeMs: 1500 } as const;
```

2. États : `const [celebration, setCelebration] = useState(false);` et `const [imageInfinie, setImageInfinie] = useState(false);` + refs de timers nettoyées à l'unmount.

3. Dans le handler d'achat, branche `"achete"` (remplace `setEtincelles(true)` + `playRecharge` actuels) :

```ts
      if (statut === "achete") {
        definirEnergieInfinie(true);
        setCelebration(true);
        setEtincelles(true);
        // Synchro son/flash : tout part dans le même tick.
        void audioManager.playEclair();
        void audioManager.playRecharge();
        timerSwap.current = setTimeout(() => setImageInfinie(true), CELEBRATION.swapMs);
        timerFin.current = setTimeout(() => setCelebration(false), CELEBRATION.dureeMs);
        toast(d.chrome.achatReussi, { type: "succes" });
      }
```

4. Affichage de l'image machine : `const machineSrc = infinie && (imageInfinie || !celebration) ? MACHINE_IMG_INFINIE : MACHINE_IMG;` (acheteur qui rouvre : `infinie` vrai, `celebration` faux → ∞ direct).

5. En mode `infinie` : ne plus rendre l'aiguille (`angleAiguille`/SVG) ni la pastille compteur (le bloc `compteurStyle` entier) — l'image porte le cadran. Le cartel pub, le levier et le bouton d'achat sont déjà masqués.

6. Voile de flash, à l'intérieur de la carte (au-dessus de l'image), rendu pendant `celebration` :

```tsx
        {celebration && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 5,
              background:
                "radial-gradient(circle at 50% 30%, rgba(210,240,255,1), rgba(120,190,255,0.9))",
              opacity: 0,
              animation: `broc-flash-eclair ${CELEBRATION.dureeMs}ms linear both`,
            }}
          />
        )}
```

7. `globals.css` — la timeline des trois flashs (pic à 6 % ≈ 90 ms de 1500 ms, échos à ~23 % et ~47 %) :

```css
@keyframes broc-flash-eclair {
  0% { opacity: 0; }
  6% { opacity: 0.95; }
  12% { opacity: 0.15; }
  23% { opacity: 0.5; }
  32% { opacity: 0.05; }
  47% { opacity: 0.3; }
  60% { opacity: 0; }
  100% { opacity: 0; }
}
```

- [ ] **Step 4: Vérifier le vert**

Run : `npx vitest run --maxWorkers=4 src/components/mobile/EnergieRecharge.test.tsx`
Expected : PASS (amendés + nouveaux + anciens).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/EnergieRecharge.tsx src/components/mobile/EnergieRecharge.test.tsx src/app/globals.css
git commit -m "feat(iap): célébration d'achat — flashs d'éclair synchronisés et machine ∞"
```

---

### Task 3: Image `machine-energie-infinie.webp` — EXÉCUTÉE PAR LE CONTRÔLEUR

Génération visuelle itérative (Gemini image-to-image depuis `public/qg/machine-energie.webp`, jugement à l'œil sur chaque itération) : ne PAS dispatcher de sous-agent.

- [ ] **Step 1:** Script scratchpad sur le motif de `scripts/generate-atouts.mjs` (`GoogleGenAI` + clé du `.env` du dépôt principal), image-to-image avec le prompt de direction du spec (machine éveillée, cuivres bleu électrique/cyan, arcs entre les bobines, grand cadran central rétroéclairé, ∞ lumineux peint). Pièges [[gemini-image-prompt-pieges]] : pas de négations, pas de géométrie contradictoire.
- [ ] **Step 2:** Itérer jusqu'à une image convaincante ; recadrer/redimensionner en 1024×1365 (sharp), exporter webp (qualité alignée sur `machine-energie.webp`).
- [ ] **Step 3:** Écrire `public/qg/machine-energie-infinie.webp`, commit :

```bash
git add public/qg/machine-energie-infinie.webp
git commit -m "feat(iap): illustration machine ∞ (cadran infini, teintes électriques)"
```

---

### Task 4: Filet final + vérification visuelle

**Files:** aucun nouveau (corrections éventuelles uniquement).

- [ ] **Step 1:** Suite complète : `npx vitest run --maxWorkers=4` → 100 % PASS.
- [ ] **Step 2:** `npm run lint && npm run build` → zéro erreur.
- [ ] **Step 3 (contrôleur):** Vérification visuelle par capture Playwright (motif de la session : `next dev` sur port libre — ⚠ un `serve out` peut squatter :3000, lire la ligne « Local: » du log — save de démo via `scriptAmorce`, drapeau `broc.energieInfinie` posé en localStorage pour l'état ∞). Contrôler : machine ∞ affichée sans aiguille ni pastille, et **juger si la ligne « Énergie infinie » sous le cadran doit rester ou disparaître** (décision 2 du spec, tranchée ici).
- [ ] **Step 4:** Push : `git push`.
