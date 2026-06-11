# Négociation interactive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Remplacer la négociation actuelle (input + bouton) par une barre à deux curseurs interactive, partagée entre achat (chinage) et vente (vitrine), avec personas vendeur, contre-offres, jauge d'humeur et persistance d'état côté achat.

**Architecture :** Une fonction pure `proposerOffre()` dans `src/lib/negociation.ts` orchestre les deux modes. Côté achat : 6 archétypes vendeur tirés par item (`src/lib/personas.ts`), persistés sur `ObjetEnVente.negociation`. Côté vente : les 15 archétypes clients existants gagnent 5 nouveaux axes calculés depuis `durete`/`appetit`. Une seule `<NegociationSheet>` ambidextre, paramétrée par `mode: "achat" | "vente"`, utilise `<NegoBar>` + `<HumeurGauge>`.

**Tech Stack :** Next.js 16 (React 19), TypeScript strict, WebAudio API via `audioManager`, CSS-in-JS inline. Pas de framework de tests : vérification par `npx tsc --noEmit` après chaque task + `npm run dev` pour le QA visuel final.

**Spec :** `docs/superpowers/specs/2026-05-30-negociation-interactive-design.md`

**Branche :** travailler sur `feat/negociation-interactive` (à créer depuis `main` avant la Task 1).

---

### Task 1 : Types & contrats

**Files :**
- Modify : `src/types/game.ts`

- [ ] **Step 1 : Ajouter les nouveaux types après la définition de `ObjetEnVente`**

Dans `src/types/game.ts`, après l'interface `ObjetEnVente` (vers ligne 269), ajouter :

```ts
/** Identifiant d'archétype vendeur (chinage). */
export type VendeurArchetypeId =
  | "naif"
  | "grincheux"
  | "bonhomme"
  | "malin"
  | "mamie"
  | "antiquaire";

/** Sens de la négociation. */
export type NegoMode = "achat" | "vente";

/** Persona générique commun aux deux modes. */
export interface NegoPersona {
  /** Identifiant de l'archétype source (vendeur ou client). */
  archetype: string;
  /** Marge totale lâchable, 0–1. */
  margePct: number;
  /** Fraction du gap concédée par tour, 0–1. */
  elanPct: number;
  /** Nombre de tours max avant refus poli. */
  patience: number;
  /** Seuil de tolérance, 0–1. */
  tolerancePct: number;
  /** Résistance à l'alea de colère, 0–1. */
  sangFroid: number;
}

/** Statut courant d'une négociation. */
export type NegoStatut = "en_cours" | "refus_poli" | "fache" | "conclu";

/** État persistant d'une négociation en cours. */
export interface NegociationState {
  mode: NegoMode;
  tour: number;
  humeur: number;
  prixAdverseCourant: number;
  /** Cible secrète de l'adverse : prixMinAccept (achat) ou prixMax (vente). */
  cibleSecrete: number;
  derniereOffreJoueur: number | null;
  statut: NegoStatut;
  message: string;
}
```

- [ ] **Step 2 : Étendre `ObjetEnVente` avec `persona` et `negociation`**

Dans la même file, modifier l'interface `ObjetEnVente` (vers ligne 259) en ajoutant deux champs juste après `negociationsTentees` :

```ts
  /** Persona vendeur tiré à l'instanciation (mode achat). */
  persona: NegoPersona;
  /** État de la négo en cours sur cet item. null avant première ouverture, valeur conservée entre fermetures. */
  negociation: NegociationState | null;
```

- [ ] **Step 3 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : erreurs **attendues** dans `chine.ts`, `vitrine.ts`, `clients.ts` parce qu'on n'a pas encore peuplé `persona`. C'est normal — on les corrige dans les tasks suivantes. **Ne pas commiter encore.**

- [ ] **Step 4 : Étendre `ClientPersonnage` (mode vente) avec les 5 axes**

Dans `src/data/clients.ts`, modifier l'interface `ClientPersonnage` (vers ligne 28) en ajoutant ces champs avant la fermeture de l'interface :

```ts
  // === Axes de négociation (mode vente) — calculés depuis durete & appetit ===
  margePct: number;
  elanPct: number;
  patience: number;
  tolerancePct: number;
  sangFroid: number;
```

- [ ] **Step 5 : Commit (types only, code casse temporairement)**

```bash
git add src/types/game.ts src/data/clients.ts
git commit -m "feat(nego): types NegoPersona, NegoMode, NegociationState + extension ObjetEnVente & ClientPersonnage"
```

---

### Task 2 : Personas vendeur (lib/personas.ts)

**Files :**
- Create : `src/lib/personas.ts`

- [ ] **Step 1 : Créer `src/lib/personas.ts` avec la table d'archétypes**

```ts
import type { Brocante } from "@/types/game";
import type { NegoPersona, VendeurArchetypeId } from "@/types/game";

/** Médianes des 5 axes par archétype vendeur. */
const PERSONAS_VENDEUR_BASE: Record<
  VendeurArchetypeId,
  Omit<NegoPersona, "archetype">
> = {
  naif:       { margePct: 0.95, elanPct: 0.90, patience: 4, tolerancePct: 0.95, sangFroid: 0.90 },
  bonhomme:   { margePct: 0.40, elanPct: 0.55, patience: 5, tolerancePct: 0.70, sangFroid: 0.85 },
  mamie:      { margePct: 0.45, elanPct: 0.85, patience: 2, tolerancePct: 0.55, sangFroid: 0.50 },
  malin:      { margePct: 0.25, elanPct: 0.20, patience: 5, tolerancePct: 0.50, sangFroid: 0.80 },
  grincheux:  { margePct: 0.10, elanPct: 0.25, patience: 3, tolerancePct: 0.30, sangFroid: 0.25 },
  antiquaire: { margePct: 0.12, elanPct: 0.45, patience: 4, tolerancePct: 0.35, sangFroid: 0.95 },
};

/** Nom lisible affiché en sheet (titre + sous-titre). */
export const NOM_ARCHETYPE: Record<VendeurArchetypeId, string> = {
  naif: "Le Naïf",
  bonhomme: "Le Bonhomme",
  mamie: "Mamie pressée",
  malin: "Le Malin",
  grincheux: "Le Grincheux",
  antiquaire: "L'Antiquaire",
};

/**
 * Pondérations de tirage par tier de brocante. Les biais d'ambiance sont
 * appliqués par-dessus dans `tirerPersonaVendeur()`.
 */
const POIDS_PAR_TIER: Record<1 | 2 | 3 | 4, Record<VendeurArchetypeId, number>> = {
  1: { naif: 4,  bonhomme: 28, mamie: 22, malin: 8,  grincheux: 26, antiquaire: 0 },
  2: { naif: 1,  bonhomme: 20, mamie: 12, malin: 30, grincheux: 17, antiquaire: 20 },
  3: { naif: 0,  bonhomme: 8,  mamie: 4,  malin: 30, grincheux: 13, antiquaire: 45 },
  4: { naif: 0,  bonhomme: 4,  mamie: 2,  malin: 24, grincheux: 10, antiquaire: 60 },
};

/** Biais additif d'ambiance — pousse certains archétypes au sein d'un tier. */
const BIAIS_AMBIANCE: Partial<Record<string, Partial<Record<VendeurArchetypeId, number>>>> = {
  Familial: { bonhomme: 10, mamie: 8 },
  Sélect: { antiquaire: 20 },
  Précieux: { antiquaire: 25 },
  Mondain: { antiquaire: 15, malin: 5 },
  Geek: { malin: 12 },
  Vinyle: { malin: 12 },
  Sciure: { grincheux: 6 },
  Dense: { grincheux: 8 },
  Studieux: { antiquaire: 6 },
};

function jitter(v: number, amplitude = 0.1): number {
  const factor = 1 + (Math.random() * 2 - 1) * amplitude;
  return v * factor;
}

function pickPondere<T extends string>(weights: Record<T, number>): T {
  const total = (Object.values(weights) as number[]).reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (const k of Object.keys(weights) as T[]) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return Object.keys(weights)[0] as T;
}

/** Tire un persona vendeur pour un item d'une brocante donnée. */
export function tirerPersonaVendeur(brocante: Brocante | undefined): NegoPersona {
  const tier = brocante?.tier ?? 1;
  const base = { ...POIDS_PAR_TIER[tier] };
  const biais = brocante ? BIAIS_AMBIANCE[brocante.ambiance] : undefined;
  if (biais) {
    for (const [arch, bonus] of Object.entries(biais) as [VendeurArchetypeId, number][]) {
      base[arch] = (base[arch] ?? 0) + bonus;
    }
  }
  const archetype = pickPondere(base);
  const ref = PERSONAS_VENDEUR_BASE[archetype];
  return {
    archetype,
    margePct: Math.min(1, Math.max(0, jitter(ref.margePct))),
    elanPct: Math.min(1, Math.max(0, jitter(ref.elanPct))),
    patience: Math.max(2, Math.round(ref.patience + (Math.random() * 2 - 1))),
    tolerancePct: Math.min(1, Math.max(0, jitter(ref.tolerancePct))),
    sangFroid: Math.min(1, Math.max(0, jitter(ref.sangFroid))),
  };
}

/** Calcule la cible secrète (prixMinAccept en achat) depuis le persona et le prix initial. */
export function calculerPrixMinAcceptDepuisPersona(
  persona: NegoPersona,
  prixVendeur: number,
): number {
  return Math.max(1, Math.round(prixVendeur * (1 - persona.margePct)));
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : `personas.ts` compile. Les erreurs résiduelles dans `chine.ts` et `clients.ts` persistent (corrigées dans les tasks suivantes).

- [ ] **Step 3 : Commit**

```bash
git add src/lib/personas.ts
git commit -m "feat(nego): table des 6 archétypes vendeur + tirage pondéré par tier/ambiance"
```

---

### Task 3 : Mécanique pure (lib/negociation.ts)

**Files :**
- Create : `src/lib/negociation.ts`

- [ ] **Step 1 : Créer la fonction pure `proposerOffre`**

```ts
import type {
  NegoMode,
  NegoPersona,
  NegociationState,
} from "@/types/game";

const MESSAGES_CONTRE_OFFRE_VENDEUR = [
  "« Bon, allez, je vous fais un petit geste… »",
  "« Hmm. Disons {prix} €. »",
  "« {prix} € et on en parle plus. »",
  "« Je peux descendre à {prix} €, c'est mon mieux. »",
];

const MESSAGES_CONTRE_OFFRE_CLIENT = [
  "« Je peux monter un peu : {prix} €. »",
  "« {prix} €, et c'est ma proposition honnête. »",
  "« Bon, allez, {prix} € si vous me l'enveloppez. »",
];

const MESSAGES_REFUS_POLI_VENDEUR = [
  "« Bon, je vais ranger. Mais c'est dommage. »",
  "« Tant pis, à une prochaine fois. »",
];

const MESSAGES_REFUS_POLI_CLIENT = [
  "« Tant pis, je vais voir ailleurs. »",
  "« Je passerai mon tour, merci. »",
];

const MESSAGES_FACHE = [
  "« Vous vous moquez de moi ! »",
  "« Vous abusez de ma patience. »",
];

const MESSAGES_ACCORD = [
  "Marché conclu à {prix} €.",
  "Vendu à {prix} €.",
];

function pickMessage(list: readonly string[], prix?: number): string {
  const msg = list[Math.floor(Math.random() * list.length)];
  return prix !== undefined ? msg.replace("{prix}", String(prix)) : msg;
}

/**
 * Crée l'état initial d'une négociation.
 *
 * @param mode "achat" → l'adverse part haut, descend vers cibleSecrete (prixMinAccept).
 *             "vente" → l'adverse part bas (offreInitiale), monte vers cibleSecrete (prixMax).
 * @param prixDepartAdverse position initiale du curseur adverse.
 * @param cibleSecrete prix limite que l'adverse refuse de franchir.
 */
export function ouvrirNegociation(
  mode: NegoMode,
  prixDepartAdverse: number,
  cibleSecrete: number,
): NegociationState {
  return {
    mode,
    tour: 0,
    humeur: 0,
    prixAdverseCourant: prixDepartAdverse,
    cibleSecrete,
    derniereOffreJoueur: null,
    statut: "en_cours",
    message:
      mode === "achat"
        ? "Faites glisser votre curseur pour proposer un prix."
        : "Le client vous a fait une offre. À vous de répondre.",
  };
}

/**
 * Calcule la nouvelle position du curseur adverse après une contre-offre.
 * Achat : descend depuis prixAdverseCourant vers cibleSecrete (prixMin).
 * Vente : monte depuis prixAdverseCourant vers cibleSecrete (prixMax).
 */
function adversePushVers(
  mode: NegoMode,
  prixCourant: number,
  cible: number,
  elanPct: number,
): number {
  if (mode === "achat") {
    // descente : cible < prixCourant
    return Math.round(
      Math.max(cible, prixCourant - (prixCourant - cible) * elanPct),
    );
  }
  // vente : montée : cible > prixCourant
  return Math.round(
    Math.min(cible, prixCourant + (cible - prixCourant) * elanPct),
  );
}

/** Vrai si l'offre du joueur rejoint le prix adverse (condition d'accord). */
function offreRejoint(mode: NegoMode, offre: number, prixAdverse: number): boolean {
  return mode === "achat" ? offre >= prixAdverse : offre <= prixAdverse;
}

/**
 * Vrai si l'offre est insultante (déclenche colère).
 * Achat : offre < prixAdverseCourant × (1 − tolerance). On veut que l'offre soit
 *         "raisonnablement proche" du prix vendeur ; sous le seuil, c'est lowball.
 * Vente : offre > prixAdverseCourant × (1 + tolerance). Trop cher par rapport à
 *         ce que le client est prêt à monter.
 */
function offreInsultante(
  mode: NegoMode,
  offre: number,
  prixAdverseCourant: number,
  tolerancePct: number,
): boolean {
  if (mode === "achat") {
    return offre < prixAdverseCourant * (1 - tolerancePct);
  }
  return offre > prixAdverseCourant * (1 + tolerancePct);
}

/**
 * Fonction pure : prend l'état + persona + offre joueur, renvoie le nouvel état.
 * Aucun side-effect.
 */
export function proposerOffre(
  nego: NegociationState,
  persona: NegoPersona,
  offre: number,
): NegociationState {
  if (nego.statut !== "en_cours") return nego;
  const tour = nego.tour + 1;
  const pressionTour = tour / persona.patience;
  const humeurBase = Math.min(1, pressionTour);

  // 1. Accord
  if (offreRejoint(nego.mode, offre, nego.prixAdverseCourant)) {
    return {
      ...nego,
      tour,
      humeur: humeurBase,
      derniereOffreJoueur: offre,
      statut: "conclu",
      message: pickMessage(MESSAGES_ACCORD, offre),
    };
  }

  // 2. Colère franche (offre insultante)
  if (offreInsultante(nego.mode, offre, nego.prixAdverseCourant, persona.tolerancePct)) {
    return {
      ...nego,
      tour,
      humeur: 1,
      derniereOffreJoueur: offre,
      statut: "fache",
      message: pickMessage(MESSAGES_FACHE),
    };
  }

  // 3. Colère prématurée aléatoire (modulée par sangFroid + pression)
  const chanceColere = Math.max(0, (1 - persona.sangFroid) * pressionTour * 0.5);
  if (Math.random() < chanceColere) {
    return {
      ...nego,
      tour,
      humeur: 1,
      derniereOffreJoueur: offre,
      statut: "fache",
      message: pickMessage(MESSAGES_FACHE),
    };
  }

  // 4. Refus poli (patience dépassée)
  if (tour >= persona.patience) {
    const refusMsgs =
      nego.mode === "achat" ? MESSAGES_REFUS_POLI_VENDEUR : MESSAGES_REFUS_POLI_CLIENT;
    return {
      ...nego,
      tour,
      humeur: Math.max(humeurBase, 0.8),
      derniereOffreJoueur: offre,
      statut: "refus_poli",
      message: pickMessage(refusMsgs),
    };
  }

  // 5. Contre-offre
  const nouveauPrix = adversePushVers(
    nego.mode,
    nego.prixAdverseCourant,
    nego.cibleSecrete,
    persona.elanPct,
  );
  const contreMsgs =
    nego.mode === "achat" ? MESSAGES_CONTRE_OFFRE_VENDEUR : MESSAGES_CONTRE_OFFRE_CLIENT;
  return {
    ...nego,
    tour,
    humeur: humeurBase,
    prixAdverseCourant: nouveauPrix,
    derniereOffreJoueur: offre,
    statut: "en_cours",
    message: pickMessage(contreMsgs, nouveauPrix),
  };
}
```

- [ ] **Step 2 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : `negociation.ts` compile. Erreurs `chine.ts`/`clients.ts`/`vitrine.ts` toujours présentes — corrigées plus tard.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/negociation.ts
git commit -m "feat(nego): fonction pure proposerOffre + ouvrirNegociation (achat & vente)"
```

---

### Task 4 : Audio playTick

**Files :**
- Modify : `src/lib/audio/audioManager.ts`

- [ ] **Step 1 : Ajouter `playTick()` juste après `playClick()`**

Dans `src/lib/audio/audioManager.ts`, après la fermeture de `playClick()` (ligne 100), insérer :

```ts
  /**
   * Tic discret de drag, plus aigu et plus court que playClick.
   * Pensé pour être joué en rafale pendant un drag, throttlé côté appelant.
   */
  playTick(): void {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.03);
  }
```

- [ ] **Step 2 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : aucune erreur nouvelle.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/audio/audioManager.ts
git commit -m "feat(audio): playTick — variante aiguë et brève de playClick pour le drag"
```

---

### Task 5 : Hook `useTickSound`

**Files :**
- Create : `src/lib/audio/useTickSound.ts`

- [ ] **Step 1 : Créer le hook avec throttle 30 ms**

```ts
import { useRef, useCallback } from "react";
import { audioManager } from "@/lib/audio/audioManager";

const TICK_INTERVAL_MS = 30;

/**
 * Renvoie une fonction `tick()` qui joue audioManager.playTick() au plus
 * une fois toutes les `TICK_INTERVAL_MS` ms. Sert au tic de drag.
 */
export function useTickSound(): () => void {
  const lastRef = useRef(0);
  return useCallback(() => {
    const now = performance.now();
    if (now - lastRef.current < TICK_INTERVAL_MS) return;
    lastRef.current = now;
    audioManager.playTick();
  }, []);
}
```

- [ ] **Step 2 : Vérifier que `audioManager` est exporté correctement**

Run : `grep -n "export const audioManager\|export default audioManager\|export { audioManager" src/lib/audio/audioManager.ts`

Si aucune ligne ne ressort, le hook ne pourra pas l'importer. Dans ce cas, ouvre `audioManager.ts` et vérifie le pattern d'export en fin de fichier (probablement `export const audioManager = new AudioManager();`). Adapte l'import dans `useTickSound.ts` en conséquence.

- [ ] **Step 3 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : aucune erreur nouvelle dans `useTickSound.ts`.

- [ ] **Step 4 : Commit**

```bash
git add src/lib/audio/useTickSound.ts
git commit -m "feat(audio): hook useTickSound — throttle 30 ms pour le tic de drag"
```

---

### Task 6 : Composant `<NegoBar>`

**Files :**
- Create : `src/components/mobile/NegoBar.tsx`

- [ ] **Step 1 : Créer le composant barre + curseurs draggable**

```tsx
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTickSound } from "@/lib/audio/useTickSound";
import type { NegoMode } from "@/types/game";

interface NegoBarProps {
  mode: NegoMode;
  /** Borne haute de l'échelle (prix vendeur initial en achat / prix demandé initial en vente). */
  echelleMax: number;
  /** Prix courant côté adverse (vendeur ou client). */
  prixAdverse: number;
  /** Prix courant côté joueur (offre en cours). */
  prixJoueur: number;
  /** Bornes min/max autorisées pour le drag joueur. */
  minJoueur: number;
  maxJoueur: number;
  /** Callback à chaque changement de valeur (incréments de 1 €). */
  onChangeJoueur: (prix: number) => void;
  /** Désactive le drag (négo terminée). */
  readOnly?: boolean;
}

const COLOR_JOUEUR = "#2b5a8c";
const COLOR_ADVERSE = "var(--brass-700, #8c6a2b)";

export function NegoBar({
  mode: _mode,
  echelleMax,
  prixAdverse,
  prixJoueur,
  minJoueur,
  maxJoueur,
  onChangeJoueur,
  readOnly = false,
}: NegoBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const tick = useTickSound();
  const lastValRef = useRef(prixJoueur);

  const pctJoueur = (prixJoueur / echelleMax) * 100;
  const pctAdverse = (prixAdverse / echelleMax) * 100;

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const raw = Math.round(ratio * echelleMax);
      const clamped = Math.min(maxJoueur, Math.max(minJoueur, raw));
      if (clamped !== lastValRef.current) {
        lastValRef.current = clamped;
        tick();
        onChangeJoueur(clamped);
      }
    };
    const onPointerMove = (e: PointerEvent) => handleMove(e.clientX);
    const onPointerUp = () => setDragging(false);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [dragging, echelleMax, minJoueur, maxJoueur, onChangeJoueur, tick]);

  const startDrag = (e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setDragging(true);
  };

  return (
    <div style={wrapStyle}>
      <div ref={trackRef} style={trackStyle}>
        <div
          style={{
            ...cursorStyle,
            left: `${pctAdverse}%`,
            background: COLOR_ADVERSE,
            color: "white",
            transition: "left 300ms ease-out",
          }}
        >
          {prixAdverse}€
          <span style={labelStyle}>Lui</span>
        </div>
        <div
          onPointerDown={startDrag}
          style={{
            ...cursorStyle,
            left: `${pctJoueur}%`,
            background: COLOR_JOUEUR,
            color: "white",
            cursor: readOnly ? "default" : "grab",
            touchAction: "none",
            zIndex: 2,
          }}
        >
          {prixJoueur}€
          <span style={labelStyle}>Vous</span>
        </div>
      </div>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  position: "relative",
  padding: "0 24px",
  margin: "14px 0 4px",
};

const trackStyle: CSSProperties = {
  position: "relative",
  height: 60,
  borderRadius: 2,
  background:
    "linear-gradient(to bottom, transparent 28px, rgba(0,0,0,0.12) 28px, rgba(0,0,0,0.12) 32px, transparent 32px)",
};

const cursorStyle: CSSProperties = {
  position: "absolute",
  top: 12,
  width: 36,
  height: 36,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  fontWeight: 700,
  transform: "translateX(-50%)",
  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  userSelect: "none",
};

const labelStyle: CSSProperties = {
  position: "absolute",
  top: 40,
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-500)",
  opacity: 0.7,
};
```

- [ ] **Step 2 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : `NegoBar.tsx` compile.

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/NegoBar.tsx
git commit -m "feat(nego): composant NegoBar — barre + curseurs draggable + tic à chaque pas de 1€"
```

---

### Task 7 : Composant `<HumeurGauge>`

**Files :**
- Create : `src/components/mobile/HumeurGauge.tsx`

- [ ] **Step 1 : Créer la jauge dégradée**

```tsx
"use client";

import type { CSSProperties } from "react";

interface HumeurGaugeProps {
  /** Humeur courante, 0–1. */
  humeur: number;
}

function emojiForHumeur(humeur: number): string {
  if (humeur < 0.25) return "😊";
  if (humeur < 0.5) return "🙂";
  if (humeur < 0.75) return "😐";
  return "😠";
}

export function HumeurGauge({ humeur }: HumeurGaugeProps) {
  const clamped = Math.min(1, Math.max(0, humeur));
  return (
    <div style={wrapStyle}>
      <span style={labelStyle}>Humeur</span>
      <div style={trackStyle}>
        <div style={fillStyle} />
        <div style={{ ...pointerStyle, left: `${clamped * 100}%` }} />
      </div>
      <span style={emojiStyle}>{emojiForHumeur(clamped)}</span>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 11,
  marginTop: 22,
  paddingTop: 16,
  borderTop: "1px dashed rgba(0,0,0,0.15)",
};

const labelStyle: CSSProperties = {
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-500)",
  opacity: 0.7,
};

const trackStyle: CSSProperties = {
  flex: 1,
  height: 6,
  background: "rgba(0,0,0,0.08)",
  borderRadius: 3,
  position: "relative",
};

const fillStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: 3,
  background: "linear-gradient(to right, #3a7c43 0%, #d99000 60%, #c44 100%)",
};

const pointerStyle: CSSProperties = {
  position: "absolute",
  top: -3,
  width: 2,
  height: 12,
  background: "#222",
  transition: "left 200ms ease-out",
};
```

- [ ] **Step 2 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : `HumeurGauge.tsx` compile.

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/HumeurGauge.tsx
git commit -m "feat(nego): composant HumeurGauge — jauge dégradée + emoji selon zone"
```

---

### Task 8 : Refonte `NegociationSheet` (ambidextre)

**Files :**
- Modify : `src/components/mobile/NegociationSheet.tsx` (réécriture intégrale)

- [ ] **Step 1 : Remplacer intégralement le contenu de `NegociationSheet.tsx`**

```tsx
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { NegoBar } from "@/components/mobile/NegoBar";
import { HumeurGauge } from "@/components/mobile/HumeurGauge";
import { proposerOffre, ouvrirNegociation } from "@/lib/negociation";
import { audioManager } from "@/lib/audio/audioManager";
import type { NegoMode, NegoPersona, NegociationState } from "@/types/game";

interface NegociationSheetProps {
  open: boolean;
  onClose: () => void;
  mode: NegoMode;
  /** Persona adverse (vendeur en achat, client en vente). */
  persona: NegoPersona;
  /** Échelle haute de la barre : prix vendeur initial (achat) ou prix demandé étal (vente). */
  echelleMax: number;
  /** Cible secrète : prixMinAccept (achat) ou prixMax (vente). Sert à initialiser si nego absent. */
  cibleSecrete: number;
  /** Prix de départ du curseur adverse — utilisé seulement pour initialiser. */
  prixDepartAdverse: number;
  /** État négo persistant ; null = première ouverture, on initialise. */
  nego: NegociationState | null;
  onUpdateNego: (nego: NegociationState) => void;
  onConclu: (prixFinal: number) => void;
}

export function NegociationSheet({
  open,
  onClose,
  mode,
  persona,
  echelleMax,
  cibleSecrete,
  prixDepartAdverse,
  nego,
  onUpdateNego,
  onConclu,
}: NegociationSheetProps) {
  // État interne initialisé depuis le prop nego (ou créé si null)
  const [localNego, setLocalNego] = useState<NegociationState>(
    nego ?? ouvrirNegociation(mode, prixDepartAdverse, cibleSecrete),
  );

  // Sync de l'extérieur quand on rouvre la sheet
  useEffect(() => {
    if (open) {
      setLocalNego(
        nego ?? ouvrirNegociation(mode, prixDepartAdverse, cibleSecrete),
      );
    }
  }, [open, nego, mode, prixDepartAdverse, cibleSecrete]);

  // Position de départ du curseur joueur :
  // achat → 25 % de l'échelle (proposition basse neutre)
  // vente → 75 % de l'échelle (au-dessus de l'offre client, on défend son prix)
  const offreInitialeJoueur =
    mode === "achat"
      ? Math.max(1, Math.round(echelleMax * 0.25))
      : Math.max(1, Math.round(echelleMax * 0.75));

  const [offreJoueur, setOffreJoueur] = useState<number>(offreInitialeJoueur);
  useEffect(() => {
    if (open) setOffreJoueur(offreInitialeJoueur);
  }, [open, offreInitialeJoueur]);

  const enCours = localNego.statut === "en_cours";

  // Bornes du curseur joueur selon mode
  const minJoueur =
    mode === "achat" ? 1 : Math.max(1, localNego.prixAdverseCourant + 1);
  const maxJoueur =
    mode === "achat"
      ? Math.max(1, localNego.prixAdverseCourant - 1)
      : echelleMax;

  const handleProposer = () => {
    const next = proposerOffre(localNego, persona, offreJoueur);
    setLocalNego(next);
    onUpdateNego(next);

    if (next.statut === "conclu") {
      audioManager.playCash();
      // Laisser un court délai pour que l'animation se voit avant fermeture
      setTimeout(() => {
        onConclu(offreJoueur);
      }, 600);
    }
  };

  const handleAbandonner = () => {
    onClose();
  };

  const handleAcheterApresRefus = () => {
    // Mode achat seulement : acheter au prix vendeur courant
    onConclu(localNego.prixAdverseCourant);
  };

  const title = "Négociation";

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <p style={subtitleStyle}>{localNego.message}</p>
      <NegoBar
        mode={mode}
        echelleMax={echelleMax}
        prixAdverse={localNego.prixAdverseCourant}
        prixJoueur={offreJoueur}
        minJoueur={minJoueur}
        maxJoueur={maxJoueur}
        onChangeJoueur={setOffreJoueur}
        readOnly={!enCours}
      />
      <HumeurGauge humeur={localNego.humeur} />
      <div style={btnRowStyle}>
        {localNego.statut === "refus_poli" && mode === "achat" ? (
          <button type="button" style={btnPrimary} onClick={handleAcheterApresRefus}>
            Acheter au prix affiché — {localNego.prixAdverseCourant} €
          </button>
        ) : enCours ? (
          <>
            <button type="button" style={btnSecondary} onClick={handleAbandonner}>
              Laisser tomber
            </button>
            <button type="button" style={btnPrimary} onClick={handleProposer}>
              {offreRejoint(mode, offreJoueur, localNego.prixAdverseCourant)
                ? `Accepter ${offreJoueur} €`
                : `Proposer ${offreJoueur} €`}
            </button>
          </>
        ) : (
          <button type="button" style={btnSecondary} onClick={onClose}>
            Fermer
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

function offreRejoint(mode: NegoMode, offre: number, prixAdverse: number): boolean {
  return mode === "achat" ? offre >= prixAdverse : offre <= prixAdverse;
}

const subtitleStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 13,
  color: "var(--ink-500)",
  margin: "0 0 12px",
  textAlign: "center",
  minHeight: 32,
};

const btnRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1.4fr",
  gap: 8,
  marginTop: 18,
};

const btnPrimary: CSSProperties = {
  padding: "12px 8px",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  cursor: "pointer",
  gridColumn: "2 / 3",
};

const btnSecondary: CSSProperties = {
  ...btnPrimary,
  background: "var(--paper-100)",
  color: "var(--forest-800)",
  gridColumn: "1 / 2",
};
```

- [ ] **Step 2 : Vérifier que `audioManager.playCash()` existe**

Run : `grep -n "playCash" src/lib/audio/audioManager.ts`
Expected : au moins une ligne avec `playCash(): void {`. Si absent, remplacer `audioManager.playCash()` par `audioManager.playClick()` dans la sheet.

- [ ] **Step 3 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : `NegociationSheet.tsx` compile. Erreurs résiduelles attendues côté chiner/vitrine ClientPages (ils utilisent l'ancienne signature).

- [ ] **Step 4 : Commit**

```bash
git add src/components/mobile/NegociationSheet.tsx
git commit -m "feat(nego): refonte NegociationSheet — ambidextre (achat/vente), nouvelle UI barre+humeur"
```

---

### Task 9 : Refactor `src/lib/chine.ts`

**Files :**
- Modify : `src/lib/chine.ts`

- [ ] **Step 1 : Importer le nouveau personas**

En tête de `src/lib/chine.ts`, dans le bloc d'imports, ajouter :

```ts
import { tirerPersonaVendeur, calculerPrixMinAcceptDepuisPersona } from "@/lib/personas";
```

- [ ] **Step 2 : Adapter `instancier()` pour poser le persona**

Dans `instancier()` (lignes 59–99), remplacer le calcul de `prixMinAccept` (lignes 78–80) et la `return` block par :

```ts
  const persona = tirerPersonaVendeur(brocante);
  const prixMinAccept = calculerPrixMinAcceptDepuisPersona(persona, prixVendeur);

  return {
    id: crypto.randomUUID(),
    objet: {
      id: crypto.randomUUID(),
      templateId: template.templateId,
      nom: template.nom,
      categorie: template.categorie,
      etat,
      prixReferenceReel,
      rarete: template.rarete,
    },
    prixVendeur,
    prixAffiche: Math.random() > 0.4,
    prixMinAccept,
    negociationsTentees: 0,
    statut: "disponible",
    persona,
    negociation: null,
  };
```

Et supprimer les lignes `const { min: tolMin, max: tolMax } = TOLERANCE_PAR_TIER[tier];` et la ligne suivante `const tolerance = ...` qui ne servent plus.

- [ ] **Step 3 : Supprimer la mécanique obsolète**

Supprimer intégralement :
- L'export `ResultatNegociation` (lignes ~205–210).
- Les constantes `DURCISSEMENT_PAR_TENTATIVE`, `COLERE_MONTEE_PAR_TENTATIVE`, `CHANCE_FACHE_PAR_TENTATIVE`, `MESSAGES_REFUS_POLI`.
- La fonction `reagirNegociation()` (lignes ~233–295).

Vérifier qu'aucune des constantes supprimées n'est plus référencée dans le fichier.

- [ ] **Step 4 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : `chine.ts` compile maintenant proprement. Erreurs résiduelles uniquement dans `ClientPage.tsx` (chinage) qui importe encore `reagirNegociation`.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/chine.ts
git commit -m "refactor(chine): tirerPersonaVendeur dans instancier + suppression de reagirNegociation"
```

---

### Task 10 : Brancher la page Chiner

**Files :**
- Modify : `src/app/chiner/[brocanteId]/ClientPage.tsx`

- [ ] **Step 1 : Mettre à jour les imports**

Remplacer la ligne :
```ts
import { genererSession, reagirNegociation } from "@/lib/chine";
```
par :
```ts
import { genererSession } from "@/lib/chine";
import { ouvrirNegociation } from "@/lib/negociation";
```

- [ ] **Step 2 : Remplacer le handler `onProposer` actuel**

Identifier le handler de l'ancienne `NegociationSheet` (vers ligne 335–355). Il appelle `reagirNegociation()` et patche l'item. Le remplacer par un usage de la nouvelle sheet.

Trouver le bloc :
```tsx
<NegociationSheet
  open={negoOuverte === it.id}
  onClose={() => setNegoOuverte(null)}
  prixAffiche={it.prixVendeur}
  offreInitiale={...}
  onProposer={(offre) => {
    const res = reagirNegociation(...);
    // ... gestion res.accepte / res.fache
  }}
/>
```

Le remplacer par :

```tsx
<NegociationSheet
  open={negoOuverte === it.id}
  onClose={() => setNegoOuverte(null)}
  mode="achat"
  persona={it.persona}
  echelleMax={it.prixVendeur}
  cibleSecrete={it.prixMinAccept}
  prixDepartAdverse={it.negociation?.prixAdverseCourant ?? it.prixVendeur}
  nego={it.negociation}
  onUpdateNego={(nego) => setItem(it.id, { negociation: nego })}
  onConclu={(prixFinal) => {
    setItem(it.id, {
      statut: "achete",
      negociation: { ...it.negociation!, statut: "conclu", prixAdverseCourant: prixFinal },
    });
    // Déclencher l'achat existant (déduction cash, ajout inventaire, etc.)
    // Réutilise la même logique que l'achat direct au prix affiché.
    handleAchat(it.id, prixFinal);
    setNegoOuverte(null);
  }}
/>
```

Adapter le nom `handleAchat` à la fonction d'achat existante dans le fichier (chercher `setItem(id, { statut: "achete" })` pour trouver le bon callsite).

- [ ] **Step 3 : Adapter la fiche d'item pour refus poli**

Localiser la condition d'affichage du bouton « Négocier » (vers ligne 440). Ajouter une branche : si `item.negociation?.statut === "refus_poli"`, afficher à la place un bouton « Acheter — {prix vendeur courant} € » qui appelle directement le handler d'achat avec `item.negociation.prixAdverseCourant`. Désactiver le bouton « Négocier » dans ce cas.

Si l'issue de la négo est `"fache"` côté `onConclu`/`onUpdateNego`, mettre `statut: "refuse"` sur l'item via `setItem(it.id, { statut: "refuse", negociation: next })`. La page filtre déjà les items au statut `"refuse"` (chercher `it.statut === "disponible"` pour confirmer le comportement actuel) — l'objet disparaît donc naturellement.

- [ ] **Step 4 : Lancer le dev et tester manuellement**

Run : `npm run dev`
Ouvrir une brocante, tenter une négo :
- Glisser le curseur → on entend le tic, le prix change par pas de 1 €.
- Cliquer « Proposer » → contre-offre animée OU accord OU fâcherie selon offre/persona.
- Fermer la sheet en plein milieu, rouvrir → l'état est préservé (tour, humeur, curseur).
- Pousser jusqu'à refus poli → bouton « Acheter au prix affiché » apparaît.
- Tenter une offre insultante (< 30 % du prix) → fâcherie, item retiré.

- [ ] **Step 5 : Type-check final**

Run : `npx tsc --noEmit`
Expected : aucune erreur dans `src/app/chiner/` et `src/lib/chine.ts`.

- [ ] **Step 6 : Commit**

```bash
git add src/app/chiner/[brocanteId]/ClientPage.tsx
git commit -m "feat(chiner): brancher la nouvelle NegociationSheet + gestion refus poli/fâché"
```

---

### Task 11 : Étendre `ClientPersonnage` avec les 5 axes

**Files :**
- Modify : `src/data/clients.ts`

- [ ] **Step 1 : Ajouter la fonction de calcul des axes**

Dans `src/data/clients.ts`, juste avant la fonction `makePersonnages()` (vers ligne 249), insérer :

```ts
/**
 * Calcule les 5 axes de négociation depuis durete (0–1) et appetitMoyen (0–1).
 * Mapping figé par le spec 2026-05-30-negociation-interactive-design.
 */
function calculerAxesNego(durete: number, appetitMoyen: number): {
  margePct: number;
  elanPct: number;
  patience: number;
  tolerancePct: number;
  sangFroid: number;
} {
  return {
    margePct: 0.20 + (1 - durete) * 0.25,
    elanPct: Math.max(0.05, 1 - durete * 0.7),
    patience: 3 + Math.round((1 - durete) * 3),
    tolerancePct: 0.20 + durete * 0.30,
    sangFroid: Math.min(1, 0.5 + appetitMoyen * 0.3),
  };
}
```

- [ ] **Step 2 : Peupler les axes dans `makePersonnages()`**

Dans `makePersonnages()`, remplacer la `return sources.map(...)` actuelle (lignes 253–268) par :

```ts
  return sources.map((src, i) => {
    const appetitMoyen = (arch.appetitMin + arch.appetitMax) / 2;
    const axes = calculerAxesNego(arch.durete, appetitMoyen);
    return {
      id: `${arch.id}.${i}`,
      archetypeId: arch.id,
      archetypeNom: arch.nom,
      nom: src.nom,
      ambiance: src.ambiance ?? arch.ambianceDefault,
      appetitMin: arch.appetitMin,
      appetitMax: arch.appetitMax,
      durete: arch.durete,
      chanceMulti: arch.chanceMulti,
      categoriesPreferees: arch.categoriesPreferees,
      categoriesEvitees: arch.categoriesEvitees ?? [],
      bonusPreference: arch.bonusPreference ?? 0.3,
      malusEvitement: arch.malusEvitement ?? 0.2,
      tierMin: arch.tierMin,
      ...axes,
    };
  });
```

- [ ] **Step 3 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : `clients.ts` compile. Erreurs résiduelles dans `vitrine.ts` (utilise toujours `reagirContreOffre`) et `app/vitrine/.../ClientPage.tsx`.

- [ ] **Step 4 : Commit**

```bash
git add src/data/clients.ts
git commit -m "feat(clients): peupler les 5 axes nego depuis durete + appetit moyen"
```

---

### Task 12 : Refactor `src/lib/vitrine.ts` (suppression de `reagirContreOffre`)

**Files :**
- Modify : `src/lib/vitrine.ts`

- [ ] **Step 1 : Ajouter un wrapper Diplomate**

En haut de `vitrine.ts`, importer la mécanique pure :

```ts
import { proposerOffre } from "@/lib/negociation";
import type { NegoPersona, NegociationState } from "@/types/game";
import type { ClientPersonnage } from "@/data/clients";
```

(Adapter les imports si déjà partiellement présents — ne pas dupliquer.)

- [ ] **Step 2 : Exposer un `personaDepuisClient`**

Toujours dans `vitrine.ts`, ajouter :

```ts
/** Construit un NegoPersona à partir d'un ClientPersonnage (mode vente). */
export function personaDepuisClient(client: ClientPersonnage): NegoPersona {
  return {
    archetype: client.archetypeId,
    margePct: client.margePct,
    elanPct: client.elanPct,
    patience: client.patience,
    tolerancePct: client.tolerancePct,
    sangFroid: client.sangFroid,
  };
}
```

- [ ] **Step 3 : Remplacer `reagirContreOffre`**

Supprimer intégralement l'export `ResultatContreOffre` et la fonction `reagirContreOffre()` (lignes ~245–296).

Ajouter à la place une fonction de réponse vente qui encapsule la mécanique Diplomate :

```ts
/**
 * Pas à pas vente. Encapsule la fonction pure proposerOffre + la révélation
 * du prixMax si la compétence Diplomate est active et pas encore consommée.
 */
export function proposerOffreVente(
  nego: NegociationState,
  client: ClientPersonnage,
  contreOffre: number,
  modifiers: VitrineModifiers = DEFAULT_MODIFIERS,
  options: { revelationDejaFaite?: boolean } = {},
): NegociationState {
  const persona = personaDepuisClient(client);
  const next = proposerOffre(nego, persona, contreOffre);

  // Diplomate : si on tombe fâché et que la révélation n'a pas eu lieu, on
  // transforme la fâcherie en refus poli, on révèle le prixMax dans le
  // message, et on autorise un dernier tour (en remettant statut → en_cours
  // mais avec patience épuisée + 1 dernière offre possible).
  if (
    next.statut === "fache" &&
    modifiers.diplomate &&
    !options.revelationDejaFaite
  ) {
    return {
      ...next,
      statut: "en_cours",
      humeur: 0.95,
      message: `« Mon plafond, c'est ${nego.cibleSecrete} €. Une dernière fois, je vous écoute. »`,
    };
  }

  return next;
}
```

- [ ] **Step 4 : Vérifier qu'aucun ancien appel à `reagirContreOffre` ne subsiste dans le lib**

Run : `grep -rn "reagirContreOffre" src/lib`
Expected : aucune occurrence dans `src/lib`. Si une ligne ressort, c'est un import oublié à nettoyer.

- [ ] **Step 5 : Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : `vitrine.ts` compile. Erreurs résiduelles attendues uniquement dans `src/app/vitrine/.../ClientPage.tsx` (utilise toujours `reagirContreOffre`).

- [ ] **Step 6 : Commit**

```bash
git add src/lib/vitrine.ts
git commit -m "refactor(vitrine): remplacer reagirContreOffre par proposerOffreVente (avec wrapper Diplomate)"
```

---

### Task 13 : Brancher la page Vitrine sur la nouvelle sheet

**Files :**
- Modify : `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx`

- [ ] **Step 1 : Mettre à jour les imports**

Remplacer la ligne (vers 19) :
```ts
  reagirContreOffre,
```
dans le `import { ... } from "@/lib/vitrine"` par :
```ts
  proposerOffreVente,
  personaDepuisClient,
```

Ajouter :
```ts
import { ouvrirNegociation } from "@/lib/negociation";
import { NegociationSheet } from "@/components/mobile/NegociationSheet";
import type { NegociationState } from "@/types/game";
```

(Si `NegociationSheet` était déjà importée pour la page chinage seulement, l'importer ici aussi.)

- [ ] **Step 2 : Ajouter un state `negoVente` pour l'événement client en cours**

Dans le composant page (autour de `const [contreOffre, setContreOffre] = useState<number>(0);`, vers ligne 127), ajouter :

```ts
const [negoVente, setNegoVente] = useState<NegociationState | null>(null);
const [revelationDejaFaite, setRevelationDejaFaite] = useState(false);
```

À chaque arrivée d'un client en mode `"negociation"` (chercher l'endroit où `clientActuel` est défini ou changé), initialiser :

```ts
setNegoVente(
  ouvrirNegociation("vente", ev.offreInitiale, ev.prixMax),
);
setRevelationDejaFaite(false);
```

- [ ] **Step 3 : Remplacer le handler `handleContreOffre`**

Localiser la fonction `handleContreOffre(ev: ClientEvent)` (vers ligne 426). La remplacer par un handler qui utilise la nouvelle mécanique :

```tsx
const handleProposerVente = (ev: ClientEvent, offre: number) => {
  if (!negoVente) return;
  const next = proposerOffreVente(negoVente, ev.persona, offre, modifiers, {
    revelationDejaFaite,
  });
  setNegoVente(next);

  // Détection de la révélation Diplomate (en_cours après ce qui aurait été fache)
  if (
    next.statut === "en_cours" &&
    next.humeur >= 0.95 &&
    !revelationDejaFaite
  ) {
    setRevelationDejaFaite(true);
  }

  if (next.statut === "conclu") {
    // Réutiliser la logique existante d'encaissement.
    // S'inspirer du handler "achat-direct" existant dans le même fichier.
    encaisserVente(ev, offre);
  } else if (next.statut === "fache" || next.statut === "refus_poli") {
    // Le client part (avec ou sans drame). Réutiliser la logique existante
    // de fin de visite client.
    terminerVisiteClient(ev);
  }
};
```

(Renommer `encaisserVente` et `terminerVisiteClient` selon les noms réels présents dans le fichier — chercher l'ancien `handleContreOffre` pour identifier ces appels.)

- [ ] **Step 4 : Remplacer le bloc UI de contre-offre**

Trouver le bloc qui rend l'input numérique de contre-offre (autour de la ligne 1118 — `value={contreOffre}` `onContreOffreChange`). Le remplacer par un usage de la nouvelle sheet :

```tsx
{clientActuel && negoVente && clientActuel.mode === "negociation" && (
  <NegociationSheet
    open={true}
    onClose={() => terminerVisiteClient(clientActuel)}
    mode="vente"
    persona={personaDepuisClient(clientActuel.persona)}
    echelleMax={clientActuel.prixDemande}
    cibleSecrete={clientActuel.prixMax}
    prixDepartAdverse={negoVente.prixAdverseCourant}
    nego={negoVente}
    onUpdateNego={setNegoVente}
    onConclu={(prixFinal) => {
      encaisserVente(clientActuel, prixFinal);
    }}
  />
)}
```

(Si la page utilise un layout qui rend la sheet ailleurs, adapter en restant fidèle à l'idée : la sheet remplace tout l'ancien input + boutons de contre-offre.)

Supprimer aussi les props `contreOffre`, `onContreOffreChange`, `onContreOffrir` du sous-composant (vers lignes 813–832) et les blocs JSX correspondants devenus morts.

- [ ] **Step 5 : Test manuel vente**

Run : `npm run dev`
Ouvrir une vitrine, attendre l'arrivée d'un client en mode négociation :
- La nouvelle sheet s'ouvre avec curseur joueur à droite (prix demandé), curseur client à gauche (offre initiale).
- Glisser le curseur joueur **vers la gauche** (vers le client) → tic à chaque pas de 1 €.
- Cliquer « Proposer » → contre-offre client animée (curseur monte) ou accord.
- Pousser trop haut → fâcherie OU si Diplomate actif : révélation du prixMax + dernier tour.
- Conclure → encaissement OK, le client repart.

- [ ] **Step 6 : Type-check final**

Run : `npx tsc --noEmit`
Expected : zéro erreur sur tout le projet.

- [ ] **Step 7 : Commit**

```bash
git add src/app/vitrine/[brocanteId]/journee/ClientPage.tsx
git commit -m "feat(vitrine): brancher la nouvelle NegociationSheet en mode vente + Diplomate via wrapper"
```

---

### Task 14 : QA final + build de validation

**Files :** aucune modification — vérification globale.

- [ ] **Step 1 : Build production**

Run : `npm run build`
Expected : build réussi, zéro erreur TypeScript, zéro warning ESLint nouveau.

- [ ] **Step 2 : Lint**

Run : `npm run lint`
Expected : pas d'erreur introduite par cette feature.

- [ ] **Step 3 : QA fonctionnel complet (`npm run dev`)**

Parcours achat :
- [ ] Entrer dans une brocante de tier 1 → vérifier que la diversité des archétypes est visible (plusieurs tons de négo).
- [ ] Drag du curseur → tic audible à chaque pas, throttle correct (pas de saturation).
- [ ] Première proposition basse mais raisonnable → contre-offre animée du vendeur.
- [ ] Plusieurs tours, vérifier que l'humeur monte visuellement, l'emoji change.
- [ ] Fermer la sheet, rouvrir → état préservé (tour, humeur, curseur vendeur).
- [ ] Pousser trop bas → fâcherie, item disparaît.
- [ ] Sur un autre item, atteindre la patience max → refus poli, bouton « Acheter au prix affiché » fonctionne.
- [ ] Conclure une négo réussie → son cash, achat OK, sheet se ferme.

Parcours vente :
- [ ] Lancer une journée, attendre un client en mode `"negociation"`.
- [ ] Sheet s'ouvre, curseur joueur à droite, curseur client à gauche.
- [ ] Drag du curseur joueur vers la gauche → tic, prix par pas de 1 €.
- [ ] Proposer → client monte son offre OU accepte OU se fâche.
- [ ] Activer la compétence Diplomate (si débloquée) puis faire un essai trop haut → vérifier la révélation `prixMax` + un dernier tour bonus.

- [ ] **Step 4 : Commit final (si retouches QA)**

Si des bugs ont été corrigés en QA, faire un commit récapitulatif :

```bash
git add -A
git commit -m "fix(nego): retouches QA — [détailler les corrections effectives]"
```

Si rien à corriger, sauter ce step.

- [ ] **Step 5 : Récap final**

À ce stade, le périmètre du spec est livré : achat et vente partagent la même UI, la même mécanique pure, les 6 archétypes vendeur sont tirés par item, les 15 archétypes clients ont leurs 5 axes, la persistance d'état fonctionne côté achat, et la compétence Diplomate continue de fonctionner. Les flags `revelerHumeur` / `revelerArchetype` / `revelerPrixMin` ne sont pas câblés — c'est volontaire (hors-scope), à brancher dans un spec compétence ultérieur.
