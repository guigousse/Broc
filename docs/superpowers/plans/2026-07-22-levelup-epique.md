# Level up épique — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Détacher le « Niveau X » de la carte de level-up, le faire claquer avec un zoom 3x→1x + son mp3, puis faire apparaître la carte de déblocages en fondu décalé (~1 s).

**Architecture:** `LevelUpOverlay.tsx` passe d'une carte unique à une colonne (bloc titre détaché sur le scrim sombre + carte allégée). Les animations sont des classes CSS dans `globals.css` (pattern existant `broc-*`). `audioManager.playLevelUp()` abandonne l'arpège synthé pour jouer `/sounds/level-up.mp3` sur le modèle de `playCash()`.

**Tech Stack:** Next.js / React, styles inline + `globals.css`, Web Audio (audioManager maison), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-22-levelup-epique-design.md`

## Global Constraints

- ⚠ Pas de `calc()` dans les transforms de `@keyframes` : Lightning CSS (Turbopack) jette silencieusement toute la règle.
- `npm run lint` est cassé (Next 16) → utiliser `npx eslint src`.
- Le bloc global `prefers-reduced-motion` réduit `animation-duration` mais PAS `animation-delay` → il faut une règle ciblée `animation: none` pour les classes level-up.
- Les exports `COULEUR_FAMILLE` et `chipFamille` de `LevelUpOverlay.tsx` sont consommés par `ParcoursSheet` : ne pas les toucher.
- Le test overlay fait `screen.getByText("Niveau 1 !")` (match exact) → les ornements `✦` doivent être dans des `<span>` séparés, jamais dans le même nœud texte que le titre.

---

### Task 1: Son de level-up mp3

**Files:**
- Create: `public/sounds/level-up.mp3` (copie de `/Users/guillaume/Desktop/pointeur.mp3`)
- Modify: `src/lib/audio/audioManager.ts:297-320` (méthode `playLevelUp`)
- Modify: `src/components/mobile/LevelUpOverlay.tsx:128` (appel devient `void …`)
- Test: `src/lib/audio/audioManager.test.ts:426-438`

**Interfaces:**
- Consumes: `this.loadBuffer(url)`, `this.ensureCtx()`, `this.prefs.effets` (existants dans audioManager, mêmes usages que `playCash`).
- Produces: `playLevelUp(): Promise<void>` (était `void`) — les appelants ne l'attendent pas (`void audioManager.playLevelUp()`).

- [ ] **Step 1: Copier le mp3 dans les assets**

```bash
cp /Users/guillaume/Desktop/pointeur.mp3 "/Users/guillaume/dev/Projet Broc V2/public/sounds/level-up.mp3"
```

- [ ] **Step 2: Réécrire les deux tests `playLevelUp` (failing tests)**

Dans `src/lib/audio/audioManager.test.ts`, remplacer le bloc lignes 426-438 :

```ts
  it("playLevelUp joue une fanfare de 4 notes montantes", async () => {
    const { audioManager } = await freshManager();
    audioManager.playLevelUp();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(4);
  });

  it("playLevelUp est muet quand la préférence effets est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("effets", false);
    audioManager.playLevelUp();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });
```

par :

```ts
  it("playLevelUp charge /sounds/level-up.mp3 et lance la source", async () => {
    const { audioManager } = await freshManager();
    await audioManager.playLevelUp();
    expect(fetchMock).toHaveBeenCalledWith("/sounds/level-up.mp3");
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(1);
    expect(ctx.bufferSources[0].start).toHaveBeenCalled();
  });

  it("playLevelUp est muet quand la préférence effets est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("effets", false);
    await audioManager.playLevelUp();
    expect(fetchMock).not.toHaveBeenCalled();
  });
```

- [ ] **Step 3: Vérifier que le nouveau test échoue**

Run: `npx vitest run src/lib/audio/audioManager.test.ts`
Expected: FAIL — « playLevelUp charge /sounds/level-up.mp3… » échoue (aucun fetch, `bufferSources` vide) ; le test « muet » passe déjà.

- [ ] **Step 4: Implémenter `playLevelUp` sur le modèle de `playCash`**

Dans `src/lib/audio/audioManager.ts`, remplacer intégralement la méthode lignes 297-320 (doc comprise) par :

```ts
  /** Fanfare de level-up : /sounds/level-up.mp3 (~1,7 s). */
  async playLevelUp(): Promise<void> {
    if (!this.prefs.effets) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/level-up.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
  }
```

Dans `src/components/mobile/LevelUpOverlay.tsx` ligne 128, marquer la promesse ignorée :

```ts
    if (niveauACelebrer !== null && !enSession) void audioManager.playLevelUp();
```

- [ ] **Step 5: Vérifier que les tests passent**

Run: `npx vitest run src/lib/audio/audioManager.test.ts src/components/mobile/LevelUpOverlay.test.tsx`
Expected: PASS (les deux fichiers ; le mock overlay de `playLevelUp` est agnostique du type de retour).

- [ ] **Step 6: Commit**

```bash
git add public/sounds/level-up.mp3 src/lib/audio/audioManager.ts src/lib/audio/audioManager.test.ts src/components/mobile/LevelUpOverlay.tsx
git commit -m "feat(audio): vrai son de level-up mp3 (remplace l'arpège synthé)"
```

---

### Task 2: Titre détaché avec zoom + carte en fondu décalé

**Files:**
- Modify: `src/app/globals.css` (après `broc-float-panneau-in`, ~ligne 997)
- Modify: `src/components/mobile/LevelUpOverlay.tsx` (styles + JSX du rendu)
- Test: `src/components/mobile/LevelUpOverlay.test.tsx`

**Interfaces:**
- Consumes: classes CSS `broc-levelup-titre` / `broc-levelup-carte` (définies dans ce task), styles et données existants du composant.
- Produces: rien de nouveau pour les autres modules — `COULEUR_FAMILLE` et `chipFamille` restent exportés à l'identique.

- [ ] **Step 1: Ajouter le test de structure (failing test)**

À la fin du `describe` de `src/components/mobile/LevelUpOverlay.test.tsx` :

```tsx
  it("titre détaché de la carte : bloc .broc-levelup-titre sans bouton, carte .broc-levelup-carte avec bouton", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    const blocTitre = screen.getByText("Niveau 1 !").closest(".broc-levelup-titre");
    expect(blocTitre).toBeTruthy();
    expect(blocTitre!.querySelector("button")).toBeNull();
    const bouton = screen.getByRole("button", { name: "Continuer" });
    expect(bouton.closest(".broc-levelup-carte")).toBeTruthy();
  });
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `npx vitest run src/components/mobile/LevelUpOverlay.test.tsx`
Expected: FAIL — `blocTitre` est `null` (classe inexistante).

- [ ] **Step 3: Ajouter keyframes et classes dans `globals.css`**

Insérer après `@keyframes broc-float-panneau-in` (~ligne 997), avant le bloc « Boîte mystère » :

```css
/* Level up : le titre claque (zoom 3x→1x avec overshoot), la carte de
   déblocages suit en fondu décalé (~1 s, invisible avant grâce à backwards). */
@keyframes broc-levelup-slam {
  0% { transform: scale(3); opacity: 0; }
  70% { transform: scale(0.95); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes broc-levelup-carte-in {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
.broc-levelup-titre {
  animation: broc-levelup-slam 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.broc-levelup-carte {
  animation: broc-levelup-carte-in 450ms ease-out 1s backwards;
}
/* Le bloc reduced-motion global écrase les durées mais pas animation-delay :
   sans ceci la carte resterait invisible ~1 s. */
@media (prefers-reduced-motion: reduce) {
  .broc-levelup-titre,
  .broc-levelup-carte {
    animation: none !important;
  }
}
```

- [ ] **Step 4: Restructurer le rendu de `LevelUpOverlay.tsx`**

Remplacer les constantes de style `eyebrow` (lignes 50-57) et `titre` (lignes 59-64) par :

```tsx
const colonne: CSSProperties = {
  width: "100%",
  maxWidth: 320,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 18,
};

const blocTitre: CSSProperties = {
  textAlign: "center",
};

const eyebrowSombre: CSSProperties = {
  fontFamily: "var(--font-mono)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 11,
  color: "var(--brass-500)",
  marginBottom: 8,
};

const titreGeant: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "clamp(40px, 14vw, 60px)",
  lineHeight: 1.05,
  color: "var(--brass-300)",
  textShadow: "0 0 28px rgba(224, 178, 92, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
};

const ornement: CSSProperties = {
  fontSize: "0.4em",
  color: "var(--brass-500)",
  textShadow: "none",
};
```

Et remplacer le JSX retourné (lignes 144-178) par :

```tsx
  return (
    <div
      style={scrim}
      role="dialog"
      aria-modal="true"
      aria-label={tr(d.sheets.niveauAtteintAriaLabel, { n: niveauACelebrer })}
    >
      <div style={colonne}>
        <div className="broc-levelup-titre" style={blocTitre}>
          <div style={eyebrowSombre}>{d.sheets.eyebrowNiveauBrocanteur}</div>
          <div style={titreGeant}>
            <span style={ornement} aria-hidden="true">
              ✦
            </span>
            <span>{tr(d.sheets.niveauNCelebration, { n: niveauACelebrer })}</span>
            <span style={ornement} aria-hidden="true">
              ✦
            </span>
          </div>
        </div>
        <div className="broc-levelup-carte" style={carte}>
          {!plafondCompetencesAtteint && (
            <div style={sousTitre}>{d.sheets.plusUnPointCompetence}</div>
          )}
          {deblocages.map((dep) => (
            <div key={dep.titre} style={ligneDeblocage}>
              <span style={chipFamille(dep.famille)}>
                {libelleFamille(dep.famille, d)}
              </span>
              <span>{titreDeblocage(dep, locale)}</span>
            </div>
          ))}
          {prochain && (
            <div style={lignProchain}>
              {tr(d.sheets.prochainNiv, { n: prochain.niveau })}{" "}
              {titreDeblocage(prochain, locale)}
            </div>
          )}
          <button type="button" style={btnContinuer} onClick={marquerNiveauVu}>
            {d.menu.continuer}
          </button>
        </div>
      </div>
    </div>
  );
```

Le titre `✦` étant dans des spans séparés `aria-hidden`, `getByText("Niveau 1 !")` (match exact) continue de fonctionner et les lecteurs d'écran ne lisent pas les ornements.

- [ ] **Step 5: Vérifier tests et lint**

Run: `npx vitest run src/components/mobile/LevelUpOverlay.test.tsx && npx eslint src/components/mobile/LevelUpOverlay.tsx src/app/globals.css --no-warn-ignored`
Expected: 7 tests existants + le nouveau = PASS ; eslint sans erreur (si eslint refuse le .css, lancer seulement sur le .tsx).

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/components/mobile/LevelUpOverlay.tsx src/components/mobile/LevelUpOverlay.test.tsx
git commit -m "feat(levelup): titre détaché qui claque en zoom, carte en fondu décalé"
```

---

## Vérification finale (hors tasks)

- `npx vitest run src/` doit rester vert (suite complète).
- Vérif visuelle en dev (`scripts/ios-sim.sh` ou navigateur) : séquence son + slam + carte à 1 s, et comportement `prefers-reduced-motion`. À faire par Guillaume sur device — noter dans la mémoire projet.
