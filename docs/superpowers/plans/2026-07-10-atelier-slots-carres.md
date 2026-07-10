# Atelier slots en carrés — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Les emplacements de restauration deviennent 3 carrés permanents (verrouillé/vide/occupé/prêt) entre la bande et le panneau de la fenêtre flottante Atelier ; `niveauAtelier` passe à 0..3 (0 par défaut en nouvelle partie), la section « Travaux en cours » et les onglets disparaissent, le panneau bas ne garde que le démantèlement.

**Architecture:** Trois couches : (1) modèle de jeu — `data/atelier.ts` reprofilé 0..3 + migration ; (2) châssis — `FloatingRoomOverlay` gagne un bloc `milieu` optionnel ; (3) UI — nouveau composant présentational `AtelierSlots` + refonte de la page `(qg)/atelier` (3 nouveaux tiroirs : achat de slot, choix d'objet, détail en cours). Spec : `docs/superpowers/specs/2026-07-10-atelier-slots-carres-design.md`.

**Tech Stack:** Next.js App Router (Next 16), React, TypeScript, vitest + Testing Library.

## Global Constraints

- Lint = `npx eslint src` (`npm run lint` cassé Next 16) ; hooks = `npm run lint:hooks` ; tests `npx vitest run <fichier>` / `npm run test:run` ; types `npx tsc --noEmit` (si tsc bute sur `.next` périmé : `rm -rf .next`).
- Prix des slots (validés) : 0→1 : **100 €**, 1→2 : **200 €**, 2→3 : **500 €**. `getCapaciteAtelier(n) = n`.
- Migration : sauvegarde avec `niveauAtelier` ∈ {0,2,3} conservé ; 1 ou absent/invalide → 1 (slot gratuit historique). Nouvelle partie → **0**.
- ⚠ AUCUN `calc()` mêlant % et px dans une `@keyframes` (Lightning CSS jette la règle — bug corrigé, test-filet en place). Réutiliser `broc-fade-in` existante pour le bloc `milieu`.
- Règle d'or i18n : aucune chaîne FR en dur dans le JSX ; toute nouvelle clé dans les 3 dictionnaires `src/lib/i18n/ui/{fr,en,es}.ts` ; purge des clés orphelines après grep.
- Z-index : châssis 35, BottomSheet 40/41 — les tiroirs restent HORS de `FloatingRoomOverlay` (ancêtre avec transform pendant l'animation d'entrée → piégerait un `position: fixed`).
- Messages de commit : `feat|fix|refactor|chore(scope): …` en français.

---

### Task 1: Modèle de jeu 0..3 + migration

**Files:**
- Modify: `src/data/atelier.ts` (réécriture complète)
- Modify: `src/types/game.ts:299` (`niveauAtelier: 1 | 2 | 3` → `0 | 1 | 2 | 3`)
- Modify: `src/context/GameContext.tsx:553` (`niveauAtelier: 1` → `niveauAtelier: 0` dans `nouvellePartie`)
- Modify: `src/lib/migrations.ts:546-550` (accepter 0/2/3)
- Test: `src/data/atelier.test.ts` (create), `src/lib/migrations.test.ts` (compléter)

**Interfaces:**
- Produces: `ATELIER_SLOTS: Record<0|1|2|3, number>`, `AtelierUpgrade { niveauActuel: 0|1|2; niveauCible: 1|2|3; cout: number }`, `getProchaineUpgrade(niveau: 0|1|2|3): AtelierUpgrade | null`, `getCapaciteAtelier(niveau: 0|1|2|3): number`. Consommés par GameContext (déjà appelant), la page atelier et `AtelierSlots` (Task 3).

- [ ] **Step 1: Écrire les tests (échouent)**

Créer `src/data/atelier.test.ts` :

```typescript
import { describe, expect, it } from "vitest";
import {
  ATELIER_SLOTS,
  ATELIER_UPGRADES,
  getProchaineUpgrade,
  getCapaciteAtelier,
} from "./atelier";

describe("modèle atelier 0..3", () => {
  it("capacité = niveau (0 slot de base, max 3)", () => {
    expect(ATELIER_SLOTS).toEqual({ 0: 0, 1: 1, 2: 2, 3: 3 });
    expect(getCapaciteAtelier(0)).toBe(0);
    expect(getCapaciteAtelier(3)).toBe(3);
  });

  it("upgrades : 0→1 100 €, 1→2 200 €, 2→3 500 €", () => {
    expect(ATELIER_UPGRADES).toEqual([
      { niveauActuel: 0, niveauCible: 1, cout: 100 },
      { niveauActuel: 1, niveauCible: 2, cout: 200 },
      { niveauActuel: 2, niveauCible: 3, cout: 500 },
    ]);
    expect(getProchaineUpgrade(0)?.cout).toBe(100);
    expect(getProchaineUpgrade(2)?.cout).toBe(500);
    expect(getProchaineUpgrade(3)).toBeNull();
  });
});
```

Dans `src/lib/migrations.test.ts`, à côté des tests niveauAtelier existants (~ligne 57), ajouter :

```typescript
  it("conserve niveauAtelier=0 (nouvelle économie des slots)", () => {
    const state = createMockGameState({ niveauAtelier: 0 });
    expect(migrerSauvegarde(state).niveauAtelier).toBe(0);
  });
```

(Les tests existants « remplit niveauAtelier=1 par défaut » et « garde 2 » restent valides et doivent continuer de passer.)

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/data/atelier.test.ts src/lib/migrations.test.ts`
Expected: FAIL (ATELIER_SLOTS n'a pas la clé 0 ; migration força 0 → 1).

- [ ] **Step 3: Réécrire src/data/atelier.ts**

```typescript
/** Nombre de slots de restauration par niveau d'atelier (= niveau). Une
 *  nouvelle partie démarre à 0 : chaque slot s'achète (cf. ATELIER_UPGRADES). */
export const ATELIER_SLOTS: Record<0 | 1 | 2 | 3, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
};

export interface AtelierUpgrade {
  niveauActuel: 0 | 1 | 2;
  niveauCible: 1 | 2 | 3;
  cout: number;
}

export const ATELIER_UPGRADES: readonly AtelierUpgrade[] = [
  { niveauActuel: 0, niveauCible: 1, cout: 100 },
  { niveauActuel: 1, niveauCible: 2, cout: 200 },
  { niveauActuel: 2, niveauCible: 3, cout: 500 },
] as const;

export function getProchaineUpgrade(
  niveau: 0 | 1 | 2 | 3,
): AtelierUpgrade | null {
  return ATELIER_UPGRADES.find((u) => u.niveauActuel === niveau) ?? null;
}

export function getCapaciteAtelier(niveau: 0 | 1 | 2 | 3): number {
  return ATELIER_SLOTS[niveau];
}
```

- [ ] **Step 4: Type + nouvelle partie + migration**

`src/types/game.ts:299` :

```typescript
  niveauAtelier: 0 | 1 | 2 | 3;
```

`src/context/GameContext.tsx:553` (dans l'état initial de `nouvellePartie`) :

```typescript
      niveauAtelier: 0,
```

`src/lib/migrations.ts:546-550` :

```typescript
    niveauAtelier: (() => {
      // 0 = nouvelle économie (slots achetés) ; 2/3 = acquis conservés.
      // 1, absent ou invalide → 1 (slot gratuit des sauvegardes historiques).
      const v = (loaded as Partial<GameState>).niveauAtelier;
      return v === 0 || v === 2 || v === 3 ? v : 1;
    })(),
```

- [ ] **Step 5: Tests + suite complète**

Run: `npx vitest run src/data/atelier.test.ts src/lib/migrations.test.ts && npx tsc --noEmit && npm run test:run 2>&1 | tail -3`
Expected: PASS partout. Si `tsc` râle sur `ATELIER_SLOTS[state.niveauAtelier]` ailleurs (page atelier, GameContext:1126), c'est que les types 0..3 se propagent bien — ces sites compilent sans changement car l'index accepte désormais 0..3. Si un test de GameContext suppose 1 slot en nouvelle partie (grep `niveauAtelier` dans `src/context/*.test.tsx` et `src/lib/__test-fixtures__/gameState.ts`), adapter la fixture pour rester explicite (`niveauAtelier: 1` dans le mock est OK — les tests de restauration ont besoin d'un slot).

- [ ] **Step 6: Commit**

```bash
git add src/data/atelier.ts src/data/atelier.test.ts src/types/game.ts src/context/GameContext.tsx src/lib/migrations.ts src/lib/migrations.test.ts src/lib/__test-fixtures__/gameState.ts
git commit -m "feat(atelier): modèle de slots 0..3 (0 de base, 100/200/500 €)"
```

---

### Task 2: Châssis — bloc milieu optionnel

**Files:**
- Modify: `src/components/mobile/floating-room/FloatingRoomOverlay.tsx`
- Test: `src/components/mobile/floating-room/FloatingRoomOverlay.test.tsx`

**Interfaces:**
- Produces: `FloatingRoomOverlay({ bande, milieu?, children })` — `milieu` rendu entre la bande et le panneau, bloc carte non scrollable, entrée en fondu. Sans la prop, rendu strictement identique (le stockage n'est pas impacté).

- [ ] **Step 1: Test (échoue)**

Ajouter au describe existant :

```tsx
  it("rend le bloc milieu entre bande et panneau quand fourni", () => {
    const { container } = render(
      <FloatingRoomOverlay bande={<div>B</div>} milieu={<div>MILIEU</div>}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    expect(screen.getByText("MILIEU")).toBeTruthy();
    const wrap = container.querySelector('[data-floating-room="1"]') as HTMLElement;
    // Ordre des blocs : bande, milieu, panneau.
    const texts = Array.from(wrap.children).map((c) => c.textContent);
    expect(texts).toEqual(["B", "MILIEU", "P"]);
  });

  it("ne rend rien de plus sans milieu", () => {
    const { container } = render(
      <FloatingRoomOverlay bande={<div>B</div>}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    const wrap = container.querySelector('[data-floating-room="1"]') as HTMLElement;
    expect(wrap.children.length).toBe(2);
  });
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/floating-room/FloatingRoomOverlay.test.tsx`
Expected: FAIL (prop inconnue / 2 blocs seulement).

- [ ] **Step 3: Implémenter**

Dans `FloatingRoomOverlay.tsx`, ajouter après `bandeStyle` :

```tsx
const milieuStyle: CSSProperties = {
  ...carte,
  flexShrink: 0,
  padding: "10px",
  // Fondu simple : le milieu apparaît entre les deux blocs qui glissent.
  animation: "broc-fade-in 320ms ease-out",
};
```

et adapter l'interface + le rendu :

```tsx
interface FloatingRoomOverlayProps {
  /** Carte haute (titre, actions, filtres). Glisse depuis le haut. */
  bande: ReactNode;
  /** Bloc carte optionnel entre bande et panneau (ex. slots d'atelier). */
  milieu?: ReactNode;
  /** Panneau bas (contenu scrollable). Monte depuis le bas. */
  children: ReactNode;
}

export function FloatingRoomOverlay({
  bande,
  milieu,
  children,
}: FloatingRoomOverlayProps) {
  return (
    <div style={wrap} data-floating-room="1">
      <div style={bandeStyle}>{bande}</div>
      {milieu !== undefined && <div style={milieuStyle}>{milieu}</div>}
      <div style={panneauStyle}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/components/mobile/floating-room/FloatingRoomOverlay.test.tsx && npx tsc --noEmit`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/floating-room/
git commit -m "feat(ui): FloatingRoomOverlay — bloc milieu optionnel (slots atelier)"
```

---

### Task 3: AtelierSlots + refonte de la page atelier

Tâche pivot, UN commit. Le composant est présentational ; toute la logique (achats, tiroirs, restauration) reste dans la page.

**Files:**
- Create: `src/components/atelier/AtelierSlots.tsx`
- Modify: `src/lib/restauration.ts` (déplacer `formatDuree` depuis la page)
- Modify: `src/app/(qg)/atelier/page.tsx` (refonte)
- Modify: `src/lib/i18n/ui/{fr,en,es}.ts` (nouvelles clés + purge)
- Test: `src/components/atelier/AtelierSlots.test.tsx`

**Interfaces:**
- Consumes: modèle Task 1 (`getProchaineUpgrade`, `ATELIER_SLOTS`), châssis Task 2 (`milieu`), existants : `estPret`, `restantMs` (`@/lib/restauration`), `ItemSticker`, `useLangue`.
- Produces:

```tsx
interface AtelierSlotsProps {
  /** Slots débloqués (= state.niveauAtelier). */
  slotsDebloques: 0 | 1 | 2 | 3;
  /** Objets en restauration, mappés sur les carrés de gauche à droite. */
  enCours: Objet[];
  /** Temps de confiance (epoch ms) — tick fourni par la page. */
  now: number;
  /** Prochain slot achetable (null si les 3 sont débloqués). */
  prochaineUpgrade: { cout: number } | null;
  onAcheterSlot: () => void;
  onSlotVide: () => void;
  onEnCours: (objet: Objet) => void;
  onRecuperer: (objet: Objet) => void;
}
export function AtelierSlots(props: AtelierSlotsProps): JSX.Element;
```

- [ ] **Step 1: Déplacer formatDuree dans lib/restauration.ts**

Couper `formatDuree` de `src/app/(qg)/atelier/page.tsx` (~ligne 55, avec son JSDoc) et l'ajouter, exporté, à `src/lib/restauration.ts` :

```typescript
/** Formate une durée (ms) en « 1 h », « 1 h 30 » ou « 45 min » (granularité minute). */
export function formatDuree(ms: number): string {
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    return min === 0 ? `${h} h` : `${h} h ${String(min).padStart(2, "0")}`;
  }
  return `${totalMin} min`;
}
```

⚠ Recopier le CORPS RÉEL depuis la page (le bloc ci-dessus est la forme attendue — si la page diffère, la page fait foi). Dans la page : `import { …, formatDuree } from "@/lib/restauration";`.

- [ ] **Step 2: Test AtelierSlots (échoue)**

Créer `src/components/atelier/AtelierSlots.test.tsx` (mêmes conventions jsdom que `FloatingRoomOverlay.test.tsx` ; `LangueProvider` requis — calquer le wrapper d'un test existant qui utilise `useLangue`, p.ex. `TabBar.test.tsx`) :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { AtelierSlots } from "./AtelierSlots";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";

afterEach(cleanup);

function renderSlots(p: Partial<Parameters<typeof AtelierSlots>[0]> = {}) {
  const props = {
    slotsDebloques: 0 as const,
    enCours: [],
    now: 1_000_000,
    prochaineUpgrade: { cout: 100 },
    onAcheterSlot: vi.fn(),
    onSlotVide: vi.fn(),
    onEnCours: vi.fn(),
    onRecuperer: vi.fn(),
    ...p,
  };
  render(
    <LangueProvider>
      <AtelierSlots {...props} />
    </LangueProvider>,
  );
  return props;
}

describe("AtelierSlots", () => {
  it("rend toujours 3 carrés ; tous verrouillés à 0 slot", () => {
    const p = renderSlots();
    const carres = screen.getAllByRole("button");
    expect(carres.length).toBe(3);
    fireEvent.click(carres[0]);
    expect(p.onAcheterSlot).toHaveBeenCalledTimes(1);
  });

  it("slot vide débloqué → onSlotVide ; verrouillé au-delà", () => {
    const p = renderSlots({ slotsDebloques: 1 });
    const carres = screen.getAllByRole("button");
    fireEvent.click(carres[0]);
    expect(p.onSlotVide).toHaveBeenCalledTimes(1);
    fireEvent.click(carres[1]);
    expect(p.onAcheterSlot).toHaveBeenCalledTimes(1);
  });

  it("affiche le prix sur le premier carré verrouillé seulement", () => {
    renderSlots({ slotsDebloques: 1, prochaineUpgrade: { cout: 200 } });
    expect(screen.getAllByText(/200/).length).toBe(1);
  });
});
```

(Si `createMockObjet` n'existe pas dans les fixtures, utiliser la fabrique d'objet des fixtures existantes — grep `__test-fixtures__` — ou omettre le cas « occupé » du test unitaire : les états occupé/prêt seront vérifiés visuellement, le mapping est trivial.)

- [ ] **Step 3: Vérifier l'échec**

Run: `npx vitest run src/components/atelier/AtelierSlots.test.tsx`
Expected: FAIL (module inexistant).

- [ ] **Step 4: Créer AtelierSlots.tsx**

```tsx
"use client";

import type { CSSProperties } from "react";
import { Lock, Plus } from "lucide-react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { estPret, restantMs, formatDuree } from "@/lib/restauration";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";
import type { Objet } from "@/types/game";

/**
 * Rangée des 3 emplacements de restauration, affichée entre la bande et le
 * panneau de la fenêtre flottante Atelier. Composant présentational : les
 * achats/tiroirs vivent dans la page.
 * États d'un carré : verrouillé (cadenas + prix sur le prochain achetable),
 * vide (+), occupé (sticker + temps restant), prêt (sticker + badge).
 */

interface AtelierSlotsProps {
  slotsDebloques: 0 | 1 | 2 | 3;
  enCours: Objet[];
  now: number;
  prochaineUpgrade: { cout: number } | null;
  onAcheterSlot: () => void;
  onSlotVide: () => void;
  onEnCours: (objet: Objet) => void;
  onRecuperer: (objet: Objet) => void;
}

const rangee: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 14,
};

const carreBase: CSSProperties = {
  width: 76,
  height: 76,
  display: "grid",
  placeItems: "center",
  position: "relative",
  border: "1px dashed var(--brass-500)",
  background: "var(--paper-200)",
  padding: 0,
  cursor: "pointer",
};

const carreVerrouille: CSSProperties = {
  ...carreBase,
  opacity: 0.6,
  background: "var(--paper-500)",
};

const prixStyle: CSSProperties = {
  position: "absolute",
  bottom: 4,
  left: 0,
  right: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.08em",
  color: "var(--forest-800)",
  textAlign: "center",
};

const tempsStyle: CSSProperties = {
  position: "absolute",
  bottom: 2,
  left: 0,
  right: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.06em",
  color: "var(--ink-700)",
  textAlign: "center",
  background: "rgba(241,227,191,0.85)",
  padding: "1px 0",
};

const badgePret: CSSProperties = {
  ...tempsStyle,
  color: "var(--paper-100)",
  background: "var(--forest-700)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
};

export function AtelierSlots({
  slotsDebloques,
  enCours,
  now,
  prochaineUpgrade,
  onAcheterSlot,
  onSlotVide,
  onEnCours,
  onRecuperer,
}: AtelierSlotsProps) {
  const { d, tr } = useLangue();

  return (
    <div style={rangee}>
      {[0, 1, 2].map((idx) => {
        // Verrouillé : au-delà des slots débloqués.
        if (idx >= slotsDebloques) {
          const premierVerrouille = idx === slotsDebloques;
          return (
            <button
              key={idx}
              type="button"
              style={carreVerrouille}
              onClick={onAcheterSlot}
              aria-label={
                premierVerrouille && prochaineUpgrade
                  ? tr(d.inventaire.slotVerrouilleAcheterAria, {
                      cout: prochaineUpgrade.cout,
                    })
                  : d.inventaire.slotVerrouilleAria
              }
            >
              <Lock size={22} strokeWidth={1.6} color="var(--ink-500)" />
              {premierVerrouille && prochaineUpgrade && (
                <span style={prixStyle}>{prochaineUpgrade.cout} €</span>
              )}
            </button>
          );
        }
        const objet = enCours[idx];
        // Vide : débloqué sans restauration mappée.
        if (!objet) {
          return (
            <button
              key={idx}
              type="button"
              style={carreBase}
              onClick={onSlotVide}
              aria-label={d.inventaire.slotVideAria}
            >
              <Plus size={26} strokeWidth={1.6} color="var(--brass-700)" />
            </button>
          );
        }
        const pret = objet.enRestauration
          ? estPret(objet.enRestauration, now)
          : false;
        return (
          <button
            key={idx}
            type="button"
            style={{ ...carreBase, borderStyle: "solid" }}
            onClick={() => (pret ? onRecuperer(objet) : onEnCours(objet))}
            aria-label={tr(
              pret
                ? d.inventaire.slotPretAria
                : d.inventaire.slotEnCoursAria,
              { nom: nomObjet(objet, "fr") },
            )}
          >
            <ItemSticker
              templateId={objet.templateId}
              categorie={objet.categorie}
              fill
              tilt={false}
              variant="normal"
              thumb
              eager
            />
            {pret ? (
              <span style={badgePret}>{d.inventaire.pret}</span>
            ) : (
              objet.enRestauration && (
                <span style={tempsStyle}>
                  {formatDuree(restantMs(objet.enRestauration, now))}
                </span>
              )
            )}
          </button>
        );
      })}
    </div>
  );
}
```

⚠ `nomObjet(objet, "fr")` ci-dessus est un PIÈGE VOLONTAIREMENT SIGNALÉ : utiliser la vraie locale — `const { d, tr, locale } = useLangue();` puis `nomObjet(objet, locale)`.

- [ ] **Step 5: Clés i18n**

Dans `src/lib/i18n/ui/fr.ts` (section `inventaire`, à côté d'`etabliCompteur`), puis en/es équivalents :

```typescript
    slotVerrouilleAria: "Emplacement verrouillé",
    slotVerrouilleAcheterAria: "Débloquer un emplacement pour {cout} euros",
    slotVideAria: "Emplacement libre — choisir un objet à restaurer",
    slotEnCoursAria: "{nom} en restauration — voir le détail",
    slotPretAria: "{nom} restauré — récupérer",
    acheterSlotTitre: "— Débloquer un emplacement —",
    acheterSlotCorps: "Débloquer le {n}ᵉ emplacement de restauration pour {cout} € ?",
    acheterSlotCta: "Débloquer",
    choisirObjetTitre: "— Choisir un objet à restaurer —",
    enCoursDetailTitre: "— Restauration en cours —",
```

en : "Locked slot" / "Unlock a slot for {cout} euros" / "Free slot — pick an item to restore" / "{nom} being restored — see details" / "{nom} restored — collect" / "— Unlock a slot —" / "Unlock the {n}. restoration slot for {cout}€?" (adapter l'ordinal : "Unlock restoration slot {n} for {cout}€?") / "Unlock" / "— Pick an item to restore —" / "— Restoration in progress —".
es : "Hueco bloqueado" / "Desbloquear un hueco por {cout} euros" / "Hueco libre — elegir un objeto a restaurar" / "{nom} en restauración — ver detalle" / "{nom} restaurado — recoger" / "— Desbloquear un hueco —" / "¿Desbloquear el hueco {n} de restauración por {cout} €?" / "Desbloquear" / "— Elegir un objeto a restaurar —" / "— Restauración en curso —".
(Pour le français, simplifier l'ordinal si besoin : "Débloquer l'emplacement {n} pour {cout} € ?" — cohérence 3 langues.)

- [ ] **Step 6: Vérifier le test composant**

Run: `npx vitest run src/components/atelier/AtelierSlots.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Refonte de la page (qg)/atelier/page.tsx**

Modifications exactes (le reste — restaurerCible + handleConfirmRestaurer, demantelerCible + handleConfirmDemanteler, accelererViaPub, forceTick, flash — est conservé tel quel) :

1. **États** : supprimer `const [onglet, setOnglet] = useState<…>` ; ajouter :

```tsx
  const [achatSlotOuvert, setAchatSlotOuvert] = useState(false);
  const [choisirOuvert, setChoisirOuvert] = useState(false);
  const [enCoursDetail, setEnCoursDetail] = useState<Objet | null>(null);
```

2. **Bande** : dans le `PageHeaderBar`, supprimer tout le bloc `right={(() => { … UpgradeButton … })()}` (et l'import `UpgradeButton` + `getProchaineUpgrade` sert encore, cf. milieu). Le `left` (compteur `etabliCompteur` n/max) reste.

3. **Milieu** : passer au châssis :

```tsx
    <FloatingRoomOverlay
      bande={…inchangé…}
      milieu={
        <AtelierSlots
          slotsDebloques={state.niveauAtelier}
          enCours={enCours}
          now={tempsConfiance() ?? Date.now()}
          prochaineUpgrade={getProchaineUpgrade(state.niveauAtelier)}
          onAcheterSlot={() => setAchatSlotOuvert(true)}
          onSlotVide={() => setChoisirOuvert(true)}
          onEnCours={(o) => setEnCoursDetail(o)}
          onRecuperer={(o) => recupererObjetRestaure(o.id)}
        />
      }
    >
```

(import `AtelierSlots` ; `tempsConfiance` est déjà consommé par la page pour le countdown — réutiliser la même source que l'ancien `now` de Travaux en cours.)

4. **Panneau** : supprimer (a) le `<h2 data-fly-target="travaux">` et ses deux rendus conditionnels `enCours.length === 0 ? … : …` (toute la section Travaux en cours) ; (b) le switch d'onglets (les deux `<button onClick={() => setOnglet(…)}>` et leur conteneur) ; (c) la branche `onglet === "restaurations" ? … : …` — ne garder que le contenu démantèlement (listes `demantelables`), précédé d'un titre de section :

```tsx
      <h2 style={sectTitle}>{d.inventaire.ongletDemantelement}</h2>
```

⚠ conserver le `data-fly-target="piece-…"` utilisé par l'animation du démantèlement s'il vit dans la `PiecesInventoryBar` (ne rien toucher).

5. **Nouveaux tiroirs** (à côté des BottomSheet existants, HORS châssis) :

```tsx
      {/* Achat de slot. */}
      <BottomSheet
        open={achatSlotOuvert}
        onClose={() => setAchatSlotOuvert(false)}
        title={d.inventaire.acheterSlotTitre}
      >
        {(() => {
          const up = getProchaineUpgrade(state.niveauAtelier);
          if (!up) return null;
          const peut = state.budget >= up.cout;
          return (
            <div style={{ padding: "8px 16px 16px" }}>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 13,
                  color: "var(--ink-700)",
                  marginBottom: 12,
                }}
              >
                {tr(d.inventaire.acheterSlotCorps, {
                  n: up.niveauCible,
                  cout: up.cout,
                })}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setAchatSlotOuvert(false)}
                  style={btnSheet("ghost")}
                >
                  {d.commun.annuler}
                </button>
                <button
                  type="button"
                  disabled={!peut}
                  onClick={() => {
                    const res = ameliorerAtelier();
                    setAchatSlotOuvert(false);
                    if (!res.ok) {
                      setFlash(res.raison ?? d.inventaire.impossible);
                      setTimeout(() => setFlash(null), 2500);
                    }
                  }}
                  style={btnSheet("primary", !peut)}
                >
                  {d.inventaire.acheterSlotCta} — {up.cout} €
                </button>
              </div>
            </div>
          );
        })()}
      </BottomSheet>

      {/* Choix d'un objet à restaurer (slot vide). */}
      <BottomSheet
        open={choisirOuvert}
        onClose={() => setChoisirOuvert(false)}
        title={d.inventaire.choisirObjetTitre}
      >
        <div style={{ padding: "0 4px 12px" }}>
          {restaurables.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                textAlign: "center",
                padding: "16px 12px",
              }}
            >
              {d.inventaire.aucunePieceARestaurer}
            </p>
          ) : (
            restaurables.map((o, i) => {
              /* REPRENDRE ICI le corps EXACT du map de l'ancienne liste
                 restaurables (cible, durée, coût, AtelierItemRow avec
                 metaLigne/action) avec UNE différence : le onClick de
                 l'action fait
                   setChoisirOuvert(false);
                   setRestaurerCible({ objet: o, etatCible: cible, cout,
                     thumbRect: … });
                 comme l'ancien bouton (le tiroir de confirmation existant
                 prend le relais). */
              return null; /* ← à remplacer par le vrai rendu */
            })
          )}
        </div>
      </BottomSheet>

      {/* Détail d'une restauration en cours. */}
      <BottomSheet
        open={enCoursDetail !== null}
        onClose={() => setEnCoursDetail(null)}
        title={d.inventaire.enCoursDetailTitre}
      >
        {enCoursDetail && enCoursDetail.enRestauration && (
          <div style={{ padding: "8px 16px 16px", textAlign: "center" }}>
            <div style={{ width: 96, height: 96, margin: "0 auto 8px" }}>
              <ItemSticker
                templateId={enCoursDetail.templateId}
                categorie={enCoursDetail.categorie}
                fill
                tilt={false}
                variant="normal"
                eager
              />
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 13,
                textTransform: "uppercase",
                color: "var(--forest-800)",
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              {nomObjet(enCoursDetail, locale)}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-700)",
                marginBottom: 12,
              }}
            >
              {formatDuree(
                restantMs(
                  enCoursDetail.enRestauration,
                  tempsConfiance() ?? Date.now(),
                ),
              )}
            </div>
            {peutTerminerImmediat(
              enCoursDetail.enRestauration,
              tempsConfiance() ?? Date.now(),
            ) && (
              /* REPRENDRE le bouton pub EXACT de l'ancienne section Travaux
                 en cours (libellé + disabled pubEnCours + accelererViaPub),
                 en ajoutant setEnCoursDetail(null) après le lancement. */
              null /* ← à remplacer */
            )}
          </div>
        )}
      </BottomSheet>
```

`btnSheet` : si la page n'a pas déjà un helper de boutons de tiroir, reprendre les styles des boutons du tiroir démantèlement existant (mêmes variantes ghost/primary) et factoriser localement.

6. **Récupération / fermeture auto** : quand une restauration mappée sur `enCoursDetail` se termine pendant que le tiroir est ouvert, le countdown affiche 0 — acceptable (fermer/rouvrir montre « prêt » sur le carré). Ne rien sur-ingénierer.

7. **Nettoyage** : imports devenus inutiles (`UpgradeButton`, éventuellement `ArrowRight`… laisser eslint guider) ; `pleine` (const dérivée) supprimée si plus consommée ; grep `ongletRestaurations|travauxEnCours|aucunChantier|etabliPlein` → purger les clés i18n orphelines des 3 dictionnaires. ⚠ RESTENT : `ongletDemantelement` (titre de section + tiroir), `pret` (badge du carré), `aucunePieceARestaurer` (état vide du tiroir de choix — clé existante réutilisée, ne PAS créer de doublon).

- [ ] **Step 8: Gates complets**

```bash
npx tsc --noEmit && npx eslint src && npm run lint:hooks && npm run test:run
```

Expected: tout passe.

- [ ] **Step 9: Build + probe**

```bash
npx next build 2>&1 | tail -5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/atelier
```

Expected: build OK, 200 (si 500 : le dev server a perdu son `.next` — le relancer).

- [ ] **Step 10: Commit**

```bash
git add -A src/
git commit -m "feat(atelier): slots en carrés entre bande et panneau

- 3 carrés permanents : verrouillé (cadenas + prix, tap → achat),
  vide (+ → choix d'objet), occupé (sticker + restant, tap → détail
  + pub), prêt (badge, tap → récupération)
- section Travaux en cours et onglets supprimés ; panneau = démantèlement
- tiroirs : achat de slot, choix d'objet (→ confirmation existante),
  détail en cours"
```

---

### Task 4: Vérification finale

- [ ] **Step 1: Suite + navigateur**

`npm run test:run` puis vérifier sur http://localhost:3000/atelier : 3 carrés visibles ; nouvelle partie → 3 cadenas + « 100 € » sur le premier ; achat OK/refus budget ; slot vide → tiroir choix → confirmation → sticker + countdown sur le carré ; pub si éligible ; récupération au tap quand prêt ; démantèlement intact ; sauvegarde existante conserve ses slots.

- [ ] **Step 2: Rapport**

Signaler à Guillaume ce qui reste à vérifier sur device (pub réelle AdMob = stub, haptique, perfs).
