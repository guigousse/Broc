# Slots de restauration visibles dans le panorama Atelier — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher au-dessus de l'établi dans le panorama Atelier des slots représentant la capacité de restauration courante, avec image de l'objet + sablier pendant la restauration, et récupération explicite au clic quand l'objet est prêt.

**Architecture:** Nouveau composant `WorkshopSlots` rendu dans `AtelierScene` ; coordonnées de la rangée ajoutées à `ATELIER_LAYOUT.slotsRangee` ; nouvelle action `recupererObjetRestaure(objetId)` dans `GameContext` qui mute l'état + efface `enRestauration` ; suppression de la mutation automatique au passage du jour (l'objet reste `enRestauration` jusqu'au clic explicite). Helper pur `appliquerRecuperation(state, objetId)` extrait dans `lib/atelier.ts` pour testabilité.

**Tech Stack:** Next.js + React (client components), TypeScript, vitest, CSS modules globaux (`globals.css`).

**Spec:** `docs/superpowers/specs/2026-06-15-atelier-slots-panorama-design.md`

---

## File Structure

**Create**
- `src/components/mobile/atelier-pano/WorkshopSlots.tsx` — composant slots, lit `state` via `useGameStateOnly`, déclenche actions via `useGameActions`.

**Modify**
- `src/components/mobile/atelier-pano/layout.ts` — ajoute `ATELIER_LAYOUT.slotsRangee` (rangée centrée au-dessus établi).
- `src/components/mobile/atelier-pano/AtelierScene.tsx` — accueille `WorkshopSlots` en couche au-dessus du décor.
- `src/lib/atelier.ts` — ajoute helper pur `appliquerRecuperation(state, objetId): GameState | null`.
- `src/lib/atelier.test.ts` — tests pour `appliquerRecuperation`.
- `src/context/GameContext.tsx` — supprime mutation auto dans `avancerJour`, ajoute action `recupererObjetRestaure`.
- `src/app/globals.css` — keyframes `broc-slot-ready-pulse`.
- `src/app/atelier/gerer/page.tsx` — remplace "Prêt ✓" passif par bouton "Récupérer".

---

## Task 1: Helper pur `appliquerRecuperation` + tests

**Files:**
- Modify: `src/lib/atelier.ts`
- Test: `src/lib/atelier.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter en bas de `src/lib/atelier.test.ts` :

```typescript
import { appliquerRecuperation } from "./atelier";

describe("appliquerRecuperation", () => {
  it("retourne null si l'objet n'existe pas", () => {
    const s = createMockGameState({ inventaireJoueur: [] });
    expect(appliquerRecuperation(s, "inconnu")).toBeNull();
  });

  it("retourne null si l'objet n'est pas en restauration", () => {
    const o = createMockObjet({ id: "o1", etat: "Bon" });
    const s = createMockGameState({ inventaireJoueur: [o] });
    expect(appliquerRecuperation(s, "o1")).toBeNull();
  });

  it("retourne null si la restauration n'est pas encore terminée", () => {
    const o = createMockObjet({
      id: "o1",
      etat: "Bon",
      enRestauration: { etatCible: "Très bon", jourFin: 10 },
    });
    const s = createMockGameState({ inventaireJoueur: [o], jourActuel: 5 });
    expect(appliquerRecuperation(s, "o1")).toBeNull();
  });

  it("mute l'état et efface enRestauration quand prêt", () => {
    const o = createMockObjet({
      id: "o1",
      etat: "Bon",
      prixReferenceReel: 100,
      enRestauration: { etatCible: "Très bon", jourFin: 5 },
    });
    const s = createMockGameState({ inventaireJoueur: [o], jourActuel: 5 });
    const next = appliquerRecuperation(s, "o1");
    expect(next).not.toBeNull();
    const updated = next!.inventaireJoueur.find((x) => x.id === "o1")!;
    expect(updated.etat).toBe("Très bon");
    expect(updated.enRestauration).toBeUndefined();
    expect(updated.prixReferenceReel).toBeGreaterThan(100);
  });

  it("ne touche pas aux autres objets de l'inventaire", () => {
    const o1 = createMockObjet({
      id: "o1",
      etat: "Bon",
      enRestauration: { etatCible: "Très bon", jourFin: 1 },
    });
    const o2 = createMockObjet({ id: "o2", etat: "Mauvais" });
    const s = createMockGameState({
      inventaireJoueur: [o1, o2],
      jourActuel: 5,
    });
    const next = appliquerRecuperation(s, "o1")!;
    expect(next.inventaireJoueur.find((x) => x.id === "o2")).toEqual(o2);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/lib/atelier.test.ts
```

Attendu : ÉCHEC avec `appliquerRecuperation is not a function` (ou ReferenceError à l'import).

- [ ] **Step 3: Implémenter le helper**

Ajouter à la fin de `src/lib/atelier.ts` :

```typescript
/**
 * Applique la fin de restauration d'un objet : mute son état vers `etatCible`,
 * recalcule son prix de référence, et efface `enRestauration`. Retourne null si
 * l'objet n'existe pas, n'est pas en restauration, ou si la restauration n'est
 * pas encore terminée (`jourActuel < jourFin`).
 *
 * Helper pur — appelé par GameContext.recupererObjetRestaure.
 */
export function appliquerRecuperation(
  state: GameState,
  objetId: string,
): GameState | null {
  const objet = state.inventaireJoueur.find((o) => o.id === objetId);
  if (!objet || !objet.enRestauration) return null;
  if (state.jourActuel < objet.enRestauration.jourFin) return null;
  const cible = objet.enRestauration.etatCible;
  const inv = state.inventaireJoueur.map((o) =>
    o.id === objetId
      ? {
          ...o,
          etat: cible,
          prixReferenceReel: recalculerPrixReference(
            o.prixReferenceReel,
            o.etat,
            cible,
          ),
          enRestauration: undefined,
        }
      : o,
  );
  return { ...state, inventaireJoueur: inv };
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run src/lib/atelier.test.ts
```

Attendu : SUCCÈS, tous les tests verts.

- [ ] **Step 5: Commit**

```bash
git add src/lib/atelier.ts src/lib/atelier.test.ts
git commit -m "feat(atelier): helper pur appliquerRecuperation pour fin de restauration"
```

---

## Task 2: Supprimer la mutation auto dans `avancerJour` et exposer `recupererObjetRestaure`

**Files:**
- Modify: `src/context/GameContext.tsx:247-262, 80-132, 880-970`

- [ ] **Step 1: Supprimer la mutation auto dans le passage du jour**

Dans `src/context/GameContext.tsx`, remplacer le bloc actuel (lignes 247–262 environ) :

```typescript
      const inv = prev.inventaireJoueur.map((o) => {
        if (o.enRestauration && nouveauJour >= o.enRestauration.jourFin) {
          const cible = o.enRestauration.etatCible;
          return {
            ...o,
            etat: cible,
            prixReferenceReel: recalculerPrixReference(
              o.prixReferenceReel,
              o.etat,
              cible,
            ),
            enRestauration: undefined,
          };
        }
        return o;
      });
```

par :

```typescript
      // La restauration ne se termine plus automatiquement au passage du jour :
      // l'objet reste `enRestauration` jusqu'au clic explicite "Récupérer"
      // (slot panorama ou page /atelier/gerer). cf. lib/atelier.appliquerRecuperation.
      const inv = prev.inventaireJoueur;
```

- [ ] **Step 2: Ajouter l'import du helper**

Dans `src/context/GameContext.tsx`, remplacer la ligne :

```typescript
import { coutAmelioration, rendementDemantelement } from "@/lib/atelier";
```

par :

```typescript
import {
  appliquerRecuperation,
  coutAmelioration,
  rendementDemantelement,
} from "@/lib/atelier";
```

- [ ] **Step 3: Déclarer la signature dans `GameActionsValue`**

Dans `src/context/GameContext.tsx`, dans l'interface `GameActionsValue`, ajouter après `demantelerObjet: …` :

```typescript
  /** Récupère un objet dont la restauration est terminée : applique la mutation d'état + libère le slot. */
  recupererObjetRestaure: (objetId: string) => { ok: boolean; raison?: string };
```

- [ ] **Step 4: Implémenter le useCallback `recupererObjetRestaure`**

Dans `src/context/GameContext.tsx`, ajouter juste après le useCallback `demantelerObjet` (vers la ligne 710) :

```typescript
  const recupererObjetRestaure = useCallback(
    (objetId: string): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: "Pas de partie." };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet) return { ok: false, raison: "Objet introuvable." };
      if (!objet.enRestauration)
        return { ok: false, raison: "Objet pas en restauration." };
      if (current.jourActuel < objet.enRestauration.jourFin)
        return { ok: false, raison: "Restauration pas terminée." };

      setState((prev) => {
        if (!prev) return prev;
        const next = appliquerRecuperation(prev, objetId);
        return next ?? prev;
      });
      return { ok: true };
    },
    [],
  );
```

- [ ] **Step 5: Brancher l'action dans le `actionsValue` mémoïsé**

Dans le `useMemo<GameActionsValue>` (vers ligne 898), ajouter `recupererObjetRestaure` dans l'objet et dans le tableau de deps, juste après `demantelerObjet,` (deux occurrences) :

```typescript
      restaurerObjet,
      demantelerObjet,
      recupererObjetRestaure,
```

et idem dans le tableau de deps.

- [ ] **Step 6: Lancer les tests pour s'assurer que rien n'est cassé**

```bash
npx vitest run
```

Attendu : SUCCÈS sur l'ensemble. (Note : un test pourrait dépendre de l'auto-completion ; si c'est le cas, le mettre à jour pour appeler `appliquerRecuperation` ou pour vérifier qu'`enRestauration` persiste après `avancerJour`.)

- [ ] **Step 7: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(atelier): récupération explicite — supprime la mutation auto au passage du jour"
```

---

## Task 3: Coordonnées des slots dans `ATELIER_LAYOUT`

**Files:**
- Modify: `src/components/mobile/atelier-pano/layout.ts`

- [ ] **Step 1: Ajouter la rangée de slots au layout**

Dans `src/components/mobile/atelier-pano/layout.ts`, ajouter dans l'objet `ATELIER_LAYOUT` (avant la clôture `} as const;`) :

```typescript
  /**
   * Rangée de slots de restauration affichée au-dessus de l'établi, sur le
   * rebord intérieur de la fenêtre vitrail. Coordonnées en vw (left), %
   * (bottom) et vw (width / slotSize / gap). Le composant WorkshopSlots
   * centre N slots (N = niveauAtelier) dans cette rangée.
   */
  slotsRangee: {
    centerLeft: 140, // vw — centre horizontal sur l'établi (left=110, width=60 → centre 140)
    bottom: 48,      // %  — sur le rebord de fenêtre, au-dessus de l'établi (bottom=16, devant le vitrail)
    slotSize: 9,     // vw — taille d'un slot (largeur = hauteur)
    gap: 1.5,        // vw — espace entre slots
  },
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit
```

Attendu : pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/mobile/atelier-pano/layout.ts
git commit -m "feat(atelier-pano): coordonnées de la rangée de slots au-dessus de l'établi"
```

---

## Task 4: Keyframes CSS pour l'état "prêt"

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Ajouter le keyframes**

Dans `src/app/globals.css`, ajouter à proximité des autres `@keyframes broc-*` (vers la ligne 388) :

```css
/* Pulsation douce de l'état "prêt à récupérer" sur un slot atelier. */
@keyframes broc-slot-ready-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(85, 117, 79, 0.45);
    border-color: var(--forest-700);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(85, 117, 79, 0);
    border-color: var(--forest-700);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "style(atelier): keyframes broc-slot-ready-pulse"
```

---

## Task 5: Composant `WorkshopSlots`

**Files:**
- Create: `src/components/mobile/atelier-pano/WorkshopSlots.tsx`

- [ ] **Step 1: Créer le composant**

Créer le fichier `src/components/mobile/atelier-pano/WorkshopSlots.tsx` avec ce contenu :

```typescript
"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { ItemImage } from "@/components/ui/ItemImage";
import { useGameActions, useGameStateOnly } from "@/context/GameContext";
import { getCapaciteAtelier } from "@/data/atelier";
import type { Objet } from "@/types/game";
import { ATELIER_LAYOUT } from "./layout";

/**
 * Slots de restauration affichés au-dessus de l'établi dans le panorama.
 *
 * Trois états par slot :
 *   - vide     : cadre laiton translucide + libellé "libre".
 *   - en cours : PNG de l'objet + voile sombre + badge sablier "Xj".
 *                Tap → /atelier/gerer.
 *   - prêt     : PNG sans voile + bordure verte pulsante + pill "Récupérer".
 *                Tap → recupererObjetRestaure → l'objet réintègre le stock.
 *
 * Nombre de slots = getCapaciteAtelier(niveauAtelier) (1/2/3).
 */
export function WorkshopSlots() {
  const router = useRouter();
  const { state } = useGameStateOnly();
  const { recupererObjetRestaure } = useGameActions();

  if (!state) return null;

  const capacite = getCapaciteAtelier(state.niveauAtelier);
  const enCours: Objet[] = state.inventaireJoueur.filter((o) => o.enRestauration);
  // Slots affichés = liste fixe de longueur `capacite`, remplie en ordre par
  // les objets en cours. Les slots restants sont vides.
  const occupants: (Objet | null)[] = Array.from({ length: capacite }, (_, i) =>
    enCours[i] ?? null,
  );

  const { centerLeft, bottom, slotSize, gap } = ATELIER_LAYOUT.slotsRangee;
  const totalWidth = capacite * slotSize + (capacite - 1) * gap;
  const startLeft = centerLeft - totalWidth / 2;

  return (
    <>
      {occupants.map((objet, i) => {
        const left = startLeft + i * (slotSize + gap);
        const style: CSSProperties = {
          position: "absolute",
          left: `${left}vw`,
          bottom: `${bottom}%`,
          width: `${slotSize}vw`,
          height: `${slotSize}vw`,
          pointerEvents: "auto",
        };
        return (
          <div key={`slot-${i}`} style={style}>
            {objet ? (
              <OccupiedSlot
                objet={objet}
                jourActuel={state.jourActuel}
                onTapEnCours={() => router.push("/atelier/gerer")}
                onRecuperer={() => recupererObjetRestaure(objet.id)}
              />
            ) : (
              <EmptySlot />
            )}
          </div>
        );
      })}
    </>
  );
}

function EmptySlot() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        border: "1.5px solid rgba(197, 160, 89, 0.5)",
        background: "rgba(255, 250, 240, 0.35)",
        borderRadius: 4,
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 8,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "rgba(76, 60, 40, 0.45)",
      }}
      aria-label="Slot atelier libre"
    >
      libre
    </div>
  );
}

interface OccupiedSlotProps {
  objet: Objet;
  jourActuel: number;
  onTapEnCours: () => void;
  onRecuperer: () => void;
}

function OccupiedSlot({
  objet,
  jourActuel,
  onTapEnCours,
  onRecuperer,
}: OccupiedSlotProps) {
  const fin = objet.enRestauration!.jourFin;
  const ready = jourActuel >= fin;
  const restant = Math.max(1, fin - jourActuel);

  const wrapper: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    border: ready ? "2px solid var(--forest-700)" : "1.5px solid var(--brass-700)",
    background: "rgba(255, 250, 240, 0.6)",
    borderRadius: 4,
    padding: 0,
    margin: 0,
    overflow: "hidden",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    animation: ready
      ? "broc-slot-ready-pulse 1.6s ease-in-out infinite"
      : undefined,
  };

  return (
    <button
      type="button"
      onClick={ready ? onRecuperer : onTapEnCours}
      aria-label={
        ready
          ? `Récupérer ${objet.nom}`
          : `${objet.nom} en restauration, ${restant} jour${restant > 1 ? "s" : ""} restant${restant > 1 ? "s" : ""}`
      }
      style={wrapper}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: ready ? 1 : 0.85,
        }}
      >
        <ItemImage
          templateId={objet.templateId}
          categorie={objet.categorie}
          fit="contain"
          fallbackIconSize={24}
          padded
        />
      </div>
      {!ready && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(76, 60, 40, 0.28)",
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 3,
          bottom: 3,
          padding: "1px 4px",
          background: ready ? "var(--forest-700)" : "rgba(0,0,0,0.55)",
          color: "var(--paper-100)",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.05em",
          borderRadius: 3,
          lineHeight: 1.2,
        }}
      >
        {ready ? "✓" : `⏳ ${restant}j`}
      </div>
      {ready && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            bottom: 4,
            transform: "translateX(-50%)",
            padding: "2px 6px",
            background: "var(--forest-800)",
            color: "var(--paper-100)",
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            borderRadius: 3,
            border: "1px solid var(--brass-500)",
            whiteSpace: "nowrap",
            lineHeight: 1.2,
          }}
        >
          Récupérer
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit
```

Attendu : pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/mobile/atelier-pano/WorkshopSlots.tsx
git commit -m "feat(atelier-pano): composant WorkshopSlots (slots de restauration)"
```

---

## Task 6: Intégrer `WorkshopSlots` dans `AtelierScene`

**Files:**
- Modify: `src/components/mobile/atelier-pano/AtelierScene.tsx`

- [ ] **Step 1: Importer et rendre `WorkshopSlots`**

Dans `src/components/mobile/atelier-pano/AtelierScene.tsx`, modifier le composant pour intégrer `WorkshopSlots` au-dessus des hotspots enfants.

Remplacer :

```typescript
import type { CSSProperties, ReactNode } from "react";
import { ATELIER_LAYOUT, type AtelierObjetKey } from "./layout";
```

par :

```typescript
import type { CSSProperties, ReactNode } from "react";
import { ATELIER_LAYOUT, type AtelierObjetKey } from "./layout";
import { WorkshopSlots } from "./WorkshopSlots";
```

Puis remplacer le bloc :

```typescript
export function AtelierScene({ children }: AtelierSceneProps) {
  return (
    <div style={wrapStyle} aria-label="Décor atelier" data-atelier-scene="1">
      <img
        src="/atelier/fond-atelier.png"
        alt=""
        style={layerStyle(1)}
        draggable={false}
      />
      <div style={objectsLayer}>{children}</div>
    </div>
  );
}
```

par :

```typescript
const slotsLayer: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 3,
  pointerEvents: "none",
};

export function AtelierScene({ children }: AtelierSceneProps) {
  return (
    <div style={wrapStyle} aria-label="Décor atelier" data-atelier-scene="1">
      <img
        src="/atelier/fond-atelier.png"
        alt=""
        style={layerStyle(1)}
        draggable={false}
      />
      <div style={objectsLayer}>{children}</div>
      <div style={slotsLayer}>
        <WorkshopSlots />
      </div>
    </div>
  );
}
```

Note : `slotsLayer` est `pointerEvents: "none"` ; chaque slot remet `pointerEvents: "auto"` sur lui-même (déjà fait dans `WorkshopSlots`).

- [ ] **Step 2: Vérifier la compilation**

```bash
npx tsc --noEmit
```

Attendu : pas d'erreur.

- [ ] **Step 3: Lancer le dev server et tester manuellement**

```bash
npm run dev
```

Ouvrir `http://localhost:3000/atelier` sur la zone établi. Vérifier :
- 1 slot affiché si niveauAtelier=1 (par défaut) avec le libellé "libre".
- En envoyant un objet en restauration via `/atelier/gerer`, le slot affiche l'image + sablier.
- Après quelques `avancerJour`, le slot passe en mode "Prêt" (pulsation verte + pill).
- Tap sur slot en cours → ouvre `/atelier/gerer`.
- Tap sur slot prêt → l'objet revient au stock (état muté), slot redevient libre.

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/atelier-pano/AtelierScene.tsx
git commit -m "feat(atelier-pano): intègre WorkshopSlots dans AtelierScene"
```

---

## Task 7: Bouton "Récupérer" dans `/atelier/gerer`

**Files:**
- Modify: `src/app/atelier/gerer/page.tsx:340-397`

- [ ] **Step 1: Récupérer l'action dans le composant**

Dans `src/app/atelier/gerer/page.tsx`, identifier le hook qui consomme les actions du context (`useGame()` ou `useGameActions()`). Vérifier que `recupererObjetRestaure` est bien accessible. Sinon, ajouter à la destructuration existante.

```bash
grep -n "useGame\|useGameActions\|recupererObjetRestaure" src/app/atelier/gerer/page.tsx
```

Si l'action n'est pas encore destructurée, ajouter `recupererObjetRestaure` à la liste après le hook existant.

- [ ] **Step 2: Remplacer la cellule "Prêt ✓" passive par un bouton**

Dans `src/app/atelier/gerer/page.tsx`, dans le bloc `action={…}` du `AtelierItemRow` (vers ligne 379), remplacer :

```typescript
                action={
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: ready ? "var(--forest-700)" : "var(--brass-700)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ready ? "Prêt ✓" : `${restant} j. rest.`}
                  </span>
                }
```

par :

```typescript
                action={
                  ready ? (
                    <button
                      type="button"
                      onClick={() => recupererObjetRestaure(o.id)}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--paper-100)",
                        background: "var(--forest-700)",
                        border: "1px solid var(--forest-800)",
                        padding: "4px 8px",
                        borderRadius: 3,
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                      aria-label={`Récupérer ${o.nom}`}
                    >
                      Récupérer ✓
                    </button>
                  ) : (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--brass-700)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {`${restant} j. rest.`}
                    </span>
                  )
                }
```

- [ ] **Step 3: Vérifier la compilation**

```bash
npx tsc --noEmit
```

Attendu : pas d'erreur.

- [ ] **Step 4: Tester manuellement**

Sur `/atelier/gerer`, vérifier que :
- Un objet "prêt" affiche le bouton "Récupérer ✓" en vert.
- Le clic mute l'état et l'objet quitte la section "Travaux en cours".
- Un objet "en cours" affiche toujours `X j. rest.` en monospace laiton.

- [ ] **Step 5: Commit**

```bash
git add src/app/atelier/gerer/page.tsx
git commit -m "feat(atelier-gerer): bouton Récupérer remplace l'indicateur prêt passif"
```

---

## Task 8: Vérification finale

- [ ] **Step 1: Suite de tests complète**

```bash
npx vitest run
```

Attendu : tous verts.

- [ ] **Step 2: Type-check global**

```bash
npx tsc --noEmit
```

Attendu : pas d'erreur.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Attendu : pas d'erreur (warnings ignorés s'ils sont préexistants).

- [ ] **Step 4: Recette manuelle complète**

1. Lancer `npm run dev`, ouvrir `/atelier`.
2. Vérifier 1 slot "libre" centré au-dessus de l'établi (niveau 1).
3. Aller dans `/atelier/gerer`, envoyer un objet en restauration.
4. Revenir sur `/atelier` : le slot montre l'objet voilé + sablier `⏳ Xj`.
5. Avancer le jeu jusqu'à `jourActuel >= jourFin`.
6. Vérifier sur `/atelier` : pulsation verte + ✓ + pill "Récupérer".
7. Tap sur le slot : l'objet réintègre le stock (vérifier état muté sur `/stockage/gerer`), slot redevient "libre".
8. Tester aussi la voie `/atelier/gerer` "Récupérer ✓" : même résultat.
9. Si possible, forcer `niveauAtelier=2` puis `3` via état de dev pour vérifier le rendu 2/3 slots.

- [ ] **Step 5: Aucun commit final**

Pas de commit si la recette est OK — chaque tâche a déjà été commitée.
