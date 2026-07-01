# Refonte chinage en carrousel swipe + design sonore — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la grille du mode chinage par un carrousel un-objet-à-la-fois (objet en haut, vendeur + action en bas, swipe gauche/droite), avec des sons joués à la première apparition de chaque carte (apparition + rareté + mystère).

**Architecture:** Une couche son pure et testée (`sonsRevelation` + 3 méthodes synthétisées dans `audioManager`). Deux composants présentationnels neufs sous `src/components/mobile/chine/` : `ChineSlide` (rend une carte : moitié haute objet/vendeur, moitié basse action) et `ItemSwipeDeck` (navigation swipe/flèches, repère de position, déclenchement des sons à la première révélation). `ClientPage` garde TOUTE la logique de jeu (entrée, énergie, achat, négo, session) et remplace seulement son rendu (grille → deck) ; la négociation réutilise `NegociationSheet` (dont le prop `header` est déjà optionnel — on l'omet).

**Tech Stack:** Next.js 15 (App Router, `output: "export"`), TypeScript, React 19, Vitest, Web Audio API. Images statiques → `<img>` natives.

## Global Constraints

- Spec : `docs/superpowers/specs/2026-07-01-chinage-swipe-refonte-design.md`.
- **Carrousel libre** : swipe gauche = suivant, swipe droite = précédent ; bornes strictes (pas de boucle). Flèches ‹ › cliquables en plus + repère « i / n ».
- Layout : header inchangé · moitié haute = objet en grand · moitié basse = vendeur + bouton **Négocier/Acheter**.
- Négociation : réutilise `NegociationSheet` **sans** son prop `header` (l'objet est déjà affiché au-dessus). Aucune logique de jeu modifiée (achat/négo passent par `handleAcheter`/`handleAchatAuPrix` existants).
- **Sons à la première apparition** de chaque carte : `apparition` (toutes), + `rarete` superposé si `rarete !== "commun"` OU template `unique`, + `mystere` superposé sur la carte vendeur. Revenir sur une carte déjà vue ne rejoue rien.
- Sons **synthétisés temporaires** (façon `playClick`), gated par `prefs.clic`. Swap vers fichiers `.mp3` plus tard = hors scope.
- Vendeur mystère = 1ʳᵉ carte du carrousel si présent ; sa moitié basse propose « Regarder une pub » (ouvre `BoiteMystereOverlay`, inchangé).
- Jamais de pub/achat gâché : bouton Acheter (et conclusion de négo) **désactivés si `stockageEstPlein`**.
- `prefers-reduced-motion` : glissement instantané ; sons toujours joués.
- Test runner : `npx vitest run <chemin>`. Type-check : `npx tsc --noEmit`. Build : `npm run build`.

---

### Task 1: Couche son — `sonsRevelation` (pur) + 3 méthodes `audioManager`

**Files:**
- Create: `src/lib/chine/revelationSons.ts`
- Test: `src/lib/chine/revelationSons.test.ts`
- Modify: `src/lib/audio/audioManager.ts` (3 méthodes)
- Modify: `src/lib/audio/audioManager.test.ts` (tests des 3 méthodes)

**Interfaces:**
- Produces :
  - `type SonRevelation = "apparition" | "rarete" | "mystere"`
  - `sonsRevelation(slide: { kind: "item" | "mystere"; estRareOuPlus?: boolean }): SonRevelation[]`
  - `audioManager.playApparition(): void`, `audioManager.playRarete(): void`, `audioManager.playMystere(): void`

- [ ] **Step 1: Écrire le test pur (échoue)**

Créer `src/lib/chine/revelationSons.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { sonsRevelation } from "./revelationSons";

describe("sonsRevelation", () => {
  it("item commun → apparition seule", () => {
    expect(sonsRevelation({ kind: "item", estRareOuPlus: false })).toEqual([
      "apparition",
    ]);
  });
  it("item rare/lég./unique → apparition + rareté", () => {
    expect(sonsRevelation({ kind: "item", estRareOuPlus: true })).toEqual([
      "apparition",
      "rarete",
    ]);
  });
  it("vendeur mystère → apparition + mystère (jamais rareté)", () => {
    expect(sonsRevelation({ kind: "mystere" })).toEqual([
      "apparition",
      "mystere",
    ]);
  });
});
```

- [ ] **Step 2: Lancer le test (RED)**

Run: `npx vitest run src/lib/chine/revelationSons.test.ts`
Expected: FAIL — `Failed to resolve import "./revelationSons"`.

- [ ] **Step 3: Implémenter `revelationSons.ts`**

```ts
/** Sons jouables à la révélation d'une carte de chinage. */
export type SonRevelation = "apparition" | "rarete" | "mystere";

/**
 * Décide, de façon pure, quels sons jouer à la PREMIÈRE apparition d'une carte.
 * Toutes les cartes jouent l'apparition ; les objets rares/légendaires/uniques
 * y ajoutent la rareté ; la carte vendeur mystère y ajoute le mystère.
 */
export function sonsRevelation(slide: {
  kind: "item" | "mystere";
  estRareOuPlus?: boolean;
}): SonRevelation[] {
  const sons: SonRevelation[] = ["apparition"];
  if (slide.kind === "mystere") sons.push("mystere");
  else if (slide.estRareOuPlus) sons.push("rarete");
  return sons;
}
```

- [ ] **Step 4: Lancer le test (GREEN)**

Run: `npx vitest run src/lib/chine/revelationSons.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Ajouter les 3 méthodes synthétisées à `audioManager`**

Dans `src/lib/audio/audioManager.ts`, juste après la méthode `playPickup()` (elle se termine vers la ligne ~217, avant `playCash`), insérer :

```ts
  /** Apparition d'une carte de chinage : léger glissando montant, court et doux. */
  playApparition(): void {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.09);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /** Rareté (rare/lég./unique) : petit arpège cristallin ascendant, superposable. */
  playRarete(): void {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const master = this.master;
    const now = ctx.currentTime;
    const notes = [1046.5, 1318.5, 1568.0]; // C6 E6 G6
    const stepMs = 70;
    notes.forEach((freq, i) => {
      const t0 = now + (i * stepMs) / 1000;
      const dur = 0.26;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.14, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    });
  }

  /** Vendeur mystère : deux notes feutrées à intervalle intrigant, longue traîne. */
  playMystere(): void {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const master = this.master;
    const now = ctx.currentTime;
    const notes = [369.99, 523.25]; // F#4 -> C5
    const stepMs = 160;
    notes.forEach((freq, i) => {
      const t0 = now + (i * stepMs) / 1000;
      const dur = 0.6;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.12, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    });
  }
```

- [ ] **Step 6: Ajouter les tests audioManager**

Dans `src/lib/audio/audioManager.test.ts`, dans le `describe("audioManager — effets et préférences", …)` (après le test `playClick / playTick muets…`, vers la ligne ~339), insérer :

```ts
  it("playApparition crée un oscillateur avec enveloppe quand clic est actif", async () => {
    const { audioManager } = await freshManager();
    audioManager.playApparition();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(1);
    expect(ctx.oscillators[0].start).toHaveBeenCalled();
    expect(ctx.oscillators[0].stop).toHaveBeenCalled();
  });

  it("playRarete joue un arpège de 3 notes quand clic est actif", async () => {
    const { audioManager } = await freshManager();
    audioManager.playRarete();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(3);
  });

  it("playMystere joue 2 notes quand clic est actif", async () => {
    const { audioManager } = await freshManager();
    audioManager.playMystere();
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(2);
  });

  it("les sons de chinage sont muets quand la préférence clic est désactivée", async () => {
    const { audioManager } = await freshManager();
    audioManager.setPref("clic", false);
    audioManager.playApparition();
    audioManager.playRarete();
    audioManager.playMystere();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });
```

- [ ] **Step 7: Lancer les tests audio + pur (GREEN)**

Run: `npx vitest run src/lib/audio/audioManager.test.ts src/lib/chine/revelationSons.test.ts`
Expected: PASS (nouveaux tests verts, aucun ancien cassé).

- [ ] **Step 8: Type-check + suite complète**

Run: `npx tsc --noEmit` → aucune erreur.
Run: `npx vitest run` → tout vert.

- [ ] **Step 9: Commit**

```bash
git add src/lib/chine/revelationSons.ts src/lib/chine/revelationSons.test.ts src/lib/audio/audioManager.ts src/lib/audio/audioManager.test.ts
git commit -m "feat(chinage): couche son (sonsRevelation + apparition/rareté/mystère)"
```

---

### Task 2: Composant `ChineSlide` (rendu d'une carte)

**Files:**
- Create: `src/components/mobile/chine/ChineSlide.tsx`

**Interfaces:**
- Consumes : `ItemCard` (`@/components/ui/ItemCard`), `getVendeurIllustration` (`@/lib/personaIllustrations`), `VENDEUR_MYSTERE_ILLUSTRATION` (`@/lib/boiteMystere`), types `ObjetEnVente` (`@/types/game`).
- Produces :
  - `type ChineSlide = { kind: "item"; item: ObjetEnVente; estRareOuPlus: boolean } | { kind: "mystere" }`
  - composant `ChineSlideVue` (export nommé), props :
    `{ slide: ChineSlide; budget: number; plein: boolean; boiteReclamee: boolean; onAcheter: (item: ObjetEnVente) => void; onNegocier: (item: ObjetEnVente) => void; onOuvrirBoite: () => void }`

- [ ] **Step 1: Créer le composant**

Créer `src/components/mobile/chine/ChineSlide.tsx` :

```tsx
"use client";

import type { CSSProperties } from "react";
import { ItemCard } from "@/components/ui/ItemCard";
import { getVendeurIllustration } from "@/lib/personaIllustrations";
import { VENDEUR_MYSTERE_ILLUSTRATION } from "@/lib/boiteMystere";
import type { ObjetEnVente } from "@/types/game";

/** Une carte du carrousel de chinage : un objet à négocier, ou le vendeur mystère. */
export type ChineSlide =
  | { kind: "item"; item: ObjetEnVente; estRareOuPlus: boolean }
  | { kind: "mystere" };

const moitieHaute: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const moitieBasse: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: 16,
  borderTop: "2px solid var(--brass-500)",
  background: "var(--forest-800)",
};

const btnBase: CSSProperties = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "2px solid var(--brass-500)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  cursor: "pointer",
};

function btn(disabled: boolean): CSSProperties {
  return {
    ...btnBase,
    background: disabled ? "var(--forest-700)" : "var(--brass-500)",
    color: disabled ? "var(--brass-700)" : "var(--forest-900)",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export function ChineSlideVue({
  slide,
  budget,
  plein,
  boiteReclamee,
  onAcheter,
  onNegocier,
  onOuvrirBoite,
}: {
  slide: ChineSlide;
  budget: number;
  plein: boolean;
  boiteReclamee: boolean;
  onAcheter: (item: ObjetEnVente) => void;
  onNegocier: (item: ObjetEnVente) => void;
  onOuvrirBoite: () => void;
}) {
  if (slide.kind === "mystere") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={moitieHaute}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={VENDEUR_MYSTERE_ILLUSTRATION}
            alt="Vendeur mystère"
            style={{ maxHeight: "100%", maxWidth: "100%", borderRadius: 12 }}
          />
        </div>
        <div style={moitieBasse}>
          <strong style={{ color: "var(--brass-300)", fontFamily: "var(--font-display)" }}>
            Vendeur mystère
          </strong>
          {boiteReclamee ? (
            <span style={{ color: "var(--brass-200)", fontSize: 13 }}>
              Boîte déjà ouverte.
            </span>
          ) : (
            <button type="button" style={btn(false)} onClick={onOuvrirBoite}>
              Regarder une pub pour ouvrir
            </button>
          )}
        </div>
      </div>
    );
  }

  const { item } = slide;
  const { objet, prixVendeur, statut } = item;
  const acquis = statut === "achete";
  const tropCher = budget < prixVendeur;
  const acheterDisabled = acquis || tropCher || plein;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={moitieHaute}>
        <div style={{ width: "100%", maxWidth: 240 }}>
          <ItemCard
            templateId={objet.templateId}
            categorie={objet.categorie}
            etat={objet.etat}
            rarete={objet.rarete}
            nom={objet.nom}
            dimmed={acquis}
          />
          <div
            style={{
              textAlign: "center",
              marginTop: 8,
              fontFamily: "var(--font-display)",
              color: "var(--ink-700)",
              fontSize: 15,
            }}
          >
            {prixVendeur} €
          </div>
        </div>
      </div>
      <div style={moitieBasse}>
        {getVendeurIllustration(item.persona.archetype) && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={getVendeurIllustration(item.persona.archetype)}
            alt="Vendeur"
            style={{ height: 96, width: "auto", borderRadius: 8 }}
          />
        )}
        {acquis ? (
          <span style={{ color: "var(--brass-200)", fontSize: 14 }}>— Acquis —</span>
        ) : plein ? (
          <span style={{ color: "var(--vermillion-600)", fontSize: 13, fontFamily: "var(--font-display)" }}>
            Stockage plein
          </span>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" style={btn(false)} onClick={() => onNegocier(item)}>
              Négocier
            </button>
            <button
              type="button"
              style={btn(acheterDisabled)}
              disabled={acheterDisabled}
              onClick={() => onAcheter(item)}
            >
              Acheter {prixVendeur} €
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: aucune erreur. (Si une couleur CSS var n'existe pas, ce n'est pas une erreur TS ; garder `var(--vermillion-600)` si `--vermillion-400` n'est pas défini — vérifier dans `globals.css` et aligner sur une variable existante utilisée ailleurs pour « Stockage plein », p. ex. `var(--vermillion-600)`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/mobile/chine/ChineSlide.tsx
git commit -m "feat(chinage): composant ChineSlide (objet en haut, vendeur+action en bas)"
```

---

### Task 3: Composant `ItemSwipeDeck` (navigation + sons) + keyframes

**Files:**
- Create: `src/components/mobile/chine/ItemSwipeDeck.tsx`
- Modify: `src/app/globals.css` (keyframes du glissement + reduced-motion)

**Interfaces:**
- Consumes : `ChineSlideVue`, `ChineSlide` (Task 2) ; `sonsRevelation` (Task 1) ; `audioManager` (`@/lib/audio/audioManager`) ; type `ObjetEnVente`.
- Produces : composant `ItemSwipeDeck` (export nommé), props :
  `{ slides: ChineSlide[]; budget: number; plein: boolean; boiteReclamee: boolean; onAcheter: (item: ObjetEnVente) => void; onNegocier: (item: ObjetEnVente) => void; onOuvrirBoite: () => void }`

- [ ] **Step 1: Ajouter les keyframes à `globals.css`**

À la fin de `src/app/globals.css`, ajouter :

```css
@keyframes chine-slide-in-left {
  from { transform: translateX(24px); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
@keyframes chine-slide-in-right {
  from { transform: translateX(-24px); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .chine-slide { animation: none !important; }
}
```

- [ ] **Step 2: Créer le composant**

Créer `src/components/mobile/chine/ItemSwipeDeck.tsx` :

```tsx
"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChineSlideVue, type ChineSlide } from "./ChineSlide";
import { sonsRevelation } from "@/lib/chine/revelationSons";
import { audioManager } from "@/lib/audio/audioManager";
import type { ObjetEnVente } from "@/types/game";

const SWIPE_SEUIL_PX = 40;

export function ItemSwipeDeck({
  slides,
  budget,
  plein,
  boiteReclamee,
  onAcheter,
  onNegocier,
  onOuvrirBoite,
}: {
  slides: ChineSlide[];
  budget: number;
  plein: boolean;
  boiteReclamee: boolean;
  onAcheter: (item: ObjetEnVente) => void;
  onNegocier: (item: ObjetEnVente) => void;
  onOuvrirBoite: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"left" | "right">("left");
  const seenRef = useRef<Set<number>>(new Set());
  const startXRef = useRef<number | null>(null);

  // Sons à la PREMIÈRE apparition d'une carte (index jamais vu).
  useEffect(() => {
    if (slides.length === 0) return;
    if (index < 0 || index >= slides.length) return;
    if (seenRef.current.has(index)) return;
    seenRef.current.add(index);
    for (const son of sonsRevelation(slides[index])) {
      if (son === "apparition") audioManager.playApparition();
      else if (son === "rarete") audioManager.playRarete();
      else audioManager.playMystere();
    }
  }, [index, slides]);

  const go = (delta: number) => {
    setIndex((i) => {
      const next = Math.min(slides.length - 1, Math.max(0, i + delta));
      if (next !== i) setDir(delta > 0 ? "left" : "right");
      return next;
    });
  };

  const onPointerDown = (e: PointerEvent) => {
    startXRef.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    startXRef.current = null;
    if (Math.abs(dx) > SWIPE_SEUIL_PX) go(dx < 0 ? 1 : -1);
  };

  if (slides.length === 0) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--ink-500)" }}>
        — rien à chiner ici —
      </div>
    );
  }

  const clamped = Math.min(index, slides.length - 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{ flex: 1, minHeight: 0, position: "relative", touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div
          key={clamped}
          className="chine-slide"
          style={{
            height: "100%",
            animationName:
              dir === "left" ? "chine-slide-in-left" : "chine-slide-in-right",
            animationDuration: "200ms",
            animationTimingFunction: "ease-out",
          }}
        >
          <ChineSlideVue
            slide={slides[clamped]}
            budget={budget}
            plein={plein}
            boiteReclamee={boiteReclamee}
            onAcheter={onAcheter}
            onNegocier={onNegocier}
            onOuvrirBoite={onOuvrirBoite}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px calc(8px + var(--safe-bottom))",
        }}
      >
        <button
          type="button"
          aria-label="Précédent"
          onClick={() => go(-1)}
          disabled={clamped === 0}
          style={{ background: "transparent", border: "none", cursor: clamped === 0 ? "default" : "pointer", color: "var(--ink-700)", opacity: clamped === 0 ? 0.3 : 1 }}
        >
          <ChevronLeft size={28} />
        </button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-500)" }}>
          {clamped + 1} / {slides.length}
        </span>
        <button
          type="button"
          aria-label="Suivant"
          onClick={() => go(1)}
          disabled={clamped === slides.length - 1}
          style={{ background: "transparent", border: "none", cursor: clamped === slides.length - 1 ? "default" : "pointer", color: "var(--ink-700)", opacity: clamped === slides.length - 1 ? 0.3 : 1 }}
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/chine/ItemSwipeDeck.tsx src/app/globals.css
git commit -m "feat(chinage): ItemSwipeDeck (carrousel swipe + flèches + sons à la révélation)"
```

---

### Task 4: Intégration dans `ClientPage` (remplace la grille)

**Files:**
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx`

**Interfaces:**
- Consumes : `ItemSwipeDeck` + `ChineSlide` (Task 2/3) ; `getTemplate` (`@/data/objetTemplates`) ; existants : `NegociationSheet`, `BoiteMystereOverlay`, `handleAcheter`, `handleAchatAuPrix`, `stockageEstPlein`.
- Produces : mode chinage jouable en carrousel.

- [ ] **Step 1: Ajouter/adapter les imports**

En tête de `src/app/chiner/[brocanteId]/ClientPage.tsx` :
- Ajouter : `import { ItemSwipeDeck } from "@/components/mobile/chine/ItemSwipeDeck";`
- Ajouter : `import type { ChineSlide } from "@/components/mobile/chine/ChineSlide";`
- Ajouter `useMemo` à l'import React existant si absent (`import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";` — `useMemo` est déjà importé).
- Ajouter `getTemplate` à l'import `@/data/objetTemplates` : `import { getTemplate } from "@/data/objetTemplates";` (nouvel import si absent).

- [ ] **Step 2: Ajouter l'état `boiteReclamee`**

Après `const [boiteOuverte, setBoiteOuverte] = useState(false);` (état existant du vendeur mystère), ajouter :

```ts
  /** Vrai une fois la boîte mystère réclamée dans cette session (masque le bouton pub). */
  const [boiteReclamee, setBoiteReclamee] = useState(false);
```

- [ ] **Step 3: Construire la liste des slides**

Après la définition de `plein` (`const plein = stockageEstPlein(state);`, ~ligne 165), ajouter :

```ts
  const estRareOuPlus = (it: ObjetEnVente): boolean =>
    it.objet.rarete !== "commun" ||
    getTemplate(it.objet.templateId)?.unique === true;

  const slides: ChineSlide[] = useMemo(() => {
    const liste: ChineSlide[] = [];
    if (vendeurPresent) liste.push({ kind: "mystere" });
    for (const it of (items ?? []).filter((x) => x.statut !== "refuse")) {
      liste.push({ kind: "item", item: it, estRareOuPlus: estRareOuPlus(it) });
    }
    return liste;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendeurPresent, items]);

  /** Item dont la négociation est ouverte (pour la feuille unique). */
  const itemEnNego = (items ?? []).find((x) => x.id === negoOuverte) ?? null;
```

- [ ] **Step 4: Remplacer le rendu de la grille par le deck**

Dans le `return`, remplacer TOUT le bloc `<main> … </main>` **et** le bloc `{plein && (…"Stockage plein"…)}`, le `<ActionFab …/>` et la boucle `{(items ?? []).map((it) => <NegociationSheet …/>)}` par le rendu suivant. C'est-à-dire : de la ligne `<main` (~263) jusqu'à la fin du `.map` des `NegociationSheet` (~361), remplacer par :

```tsx
      <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {flash && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--brass-100)",
              border: "1px solid var(--brass-700)",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--ink-700)",
            }}
          >
            « {flash} »
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0 }}>
          <ItemSwipeDeck
            slides={slides}
            budget={state.budget}
            plein={plein}
            boiteReclamee={boiteReclamee}
            onAcheter={(item) => handleAcheter(item.id)}
            onNegocier={(item) => setNegoOuverte(item.id)}
            onOuvrirBoite={() => setBoiteOuverte(true)}
          />
        </div>
      </main>

      {itemEnNego && (
        <NegociationSheet
          open={negoOuverte === itemEnNego.id}
          onClose={() => setNegoOuverte(null)}
          mode="achat"
          persona={itemEnNego.persona}
          echelleMax={itemEnNego.prixVendeur}
          cibleSecrete={itemEnNego.prixMinAccept}
          prixDepartAdverse={itemEnNego.negociation?.prixAdverseCourant ?? itemEnNego.prixVendeur}
          nego={itemEnNego.negociation}
          nomAffiche="Un vendeur"
          illustrationSrc={getVendeurIllustration(itemEnNego.persona.archetype)}
          illustrationFacheSrc={getVendeurIllustrationFache(itemEnNego.persona.archetype)}
          personaInfo={{
            archetypeNom: undefined,
            revelePersona: false,
            releveBourse: false,
            oeilAiguise: false,
          }}
          onUpdateNego={(nego) => setItem(itemEnNego.id, { negociation: nego })}
          onConclu={(prixFinal) => {
            handleAchatAuPrix(itemEnNego, prixFinal);
            gagnerXPLocal(TREE_GENERAL, XP_NEGOCIATION_REUSSIE_GENERAL);
            setNegoOuverte(null);
          }}
        />
      )}
```

Note : `NegociationSheet` est appelé **sans** prop `header` (l'objet est déjà dans le deck au-dessus). Le prop `header` est déjà optionnel côté composant (rendu conditionnel), aucun changement requis là-bas.

- [ ] **Step 5: Câbler `onClaimed` de la boîte + le repère d'en-tête**

Le composant `BoiteMystereOverlay` est déjà monté (feature boîte mystère). Mettre à jour son `onClaimed` pour aussi marquer la boîte réclamée :

```tsx
      {boiteOuverte && (
        <BoiteMystereOverlay
          brocante={brocante}
          onClose={() => setBoiteOuverte(false)}
          onClaimed={() => {
            setBoiteOuverte(false);
            setBoiteReclamee(true);
          }}
        />
      )}
```

(Auparavant `onClaimed` faisait `setVendeurPresent(false)` — on garde la carte vendeur dans le carrousel mais on masque le bouton via `boiteReclamee`, donc remplacer par `setBoiteReclamee(true)`.)

- [ ] **Step 6: Supprimer le code mort**

Supprimer la fonction composant `ObjetCardMobile` (elle n'est plus utilisée après le remplacement de la grille) ainsi que ses imports devenus inutiles (`ItemCard` si plus référencé ailleurs dans ce fichier, `NegoItemRow` — l'item n'est plus passé à la feuille). Vérifier avec le type-check qu'aucun symbole importé n'est orphelin (TypeScript ne bronche pas sur les imports inutilisés, mais retirer `NegoItemRow` et `ActionFab` s'ils ne sont plus référencés pour garder le fichier propre).

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 8: Build (export statique)**

Run: `npm run build`
Expected: build réussi (les warnings `metadataBase` pré-existants sont acceptables).

- [ ] **Step 9: Suite complète**

Run: `npx vitest run`
Expected: tout vert (aucune régression).

- [ ] **Step 10: Vérification manuelle**

`npm run dev`, entrer dans une brocante. Attendu :
- Un seul objet affiché à la fois : objet en haut, vendeur + Négocier/Acheter en bas.
- Swipe gauche/droite (ou flèches ‹ ›) navigue ; repère « i / n » correct ; bornes respectées.
- Son d'apparition à la 1ʳᵉ arrivée sur chaque carte ; son de rareté en plus sur un rare/lég. ; son mystère sur la carte vendeur (qui est 1ʳᵉ si présente). Revenir en arrière ne rejoue pas.
- « Négocier » ouvre la feuille (sans l'objet dedans, il est au-dessus) ; conclure achète. « Acheter » achète au prix affiché.
- « Acheter » désactivé si budget insuffisant ou stockage plein ; carte achetée = « Acquis ».
- Vendeur mystère : « Regarder une pub » → révélation → « Boîte déjà ouverte ».
- « Rentrer · fin de journée » (bouton retour du header) → résumé → QG.
- (Sons synthétisés temporaires — à remplacer par les `.mp3` plus tard.)

- [ ] **Step 11: Commit**

```bash
git add "src/app/chiner/[brocanteId]/ClientPage.tsx"
git commit -m "feat(chinage): mode carrousel swipe (remplace la grille) + sons + négo relocalisée"
```

---

## Self-Review

**1. Spec coverage**
- Carrousel un-objet-à-la-fois, swipe + flèches + repère → Task 3 (`ItemSwipeDeck`). ✓
- Layout objet haut / vendeur+action bas → Task 2 (`ChineSlide`). ✓
- Négo réutilise `NegociationSheet` sans `header` → Task 4 (feuille unique, pas de `header`). ✓
- Sons à la première apparition (apparition + rareté superposée + mystère superposé) → Task 1 (`sonsRevelation` + méthodes) + Task 3 (déclenchement, `seenRef`). ✓
- Vendeur mystère = 1ʳᵉ carte, bouton pub → Task 4 (slides) + Task 2 (rendu mystere). ✓
- Jamais d'achat gâché (Acheter désactivé si plein) → Task 2 (`acheterDisabled`). ✓
- `prefers-reduced-motion` → Task 3 (media query globals.css). ✓
- Sortie « Rentrer · fin de journée » conservée → header `onBack={handleRentrer}` inchangé (Task 4 ne le touche pas). ✓
- Sons gated `prefs.clic` → Task 1. ✓

**2. Placeholder scan** : aucun TODO/TBD ; code réel à chaque étape. ✓

**3. Type consistency** : `ChineSlide` (union) défini Task 2, consommé Tasks 3/4 à l'identique ; `sonsRevelation` signature stable Task 1→3 ; `ItemSwipeDeck` props identiques Task 3 (déf.) et Task 4 (usage) ; callbacks `(item: ObjetEnVente) => void` cohérents. ✓

**Notes de scope**
- `preload` audio non requis (sons synthétisés) — sera pertinent au swap vers fichiers `.mp3`.
- Le geste swipe est **par seuil** (pas de suivi du doigt en continu) : plus simple et robuste ; le drag-follow est un polish futur hors scope.
- La couleur « Stockage plein » doit pointer une variable CSS existante (vérifier `globals.css`) ; utiliser celle déjà employée pour le bandeau « Stockage plein » actuel.
