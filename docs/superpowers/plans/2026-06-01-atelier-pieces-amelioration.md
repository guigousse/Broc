# Atelier — Pièces d'amélioration & démantèlement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal :** Introduire une économie de pièces d'amélioration (1 type par catégorie) consommées par la restauration et produites par le démantèlement d'objets en stock. Uniformiser la durée de restauration à 7 jours.

**Architecture :** Nouveau champ `GameState.piecesAmelioration: Record<CategorieObjet, number>`. Helpers de calcul dans `src/lib/atelier.ts` (`coutAmelioration`, `rendementDemantelement`, `peutDemanteler`). Action `demantelerObjet` dans `GameContext`. UI page Atelier : bandeau de 7 engrenages haut de page + coût affiché sur "Restaurations possibles" + nouvelle section "Démantèlement" avec confirmation `BottomSheet`. Pas de framework de tests dans le projet — vérification via `npx tsc --noEmit`, `npm run build` et test manuel.

**Tech Stack :** Next.js 16, React 19, TypeScript, localStorage (via `localGameRepository`).

**Spec :** `docs/superpowers/specs/2026-06-01-atelier-pieces-amelioration-design.md`

---

### Task 1 : Types, constantes & emojis catégorie

**Files :**
- Modify : `src/types/game.ts`
- Modify : `src/data/categories.ts`

- [ ] **Step 1 : Ajouter `piecesAmelioration` à `GameState`**

Dans `src/types/game.ts`, dans l'interface `GameState`, juste après `niveauStockage: 1 | 2 | 3 | 4;`, ajouter :

```ts
  /** Stock de pièces d'amélioration par catégorie (≥ 0, illimité). */
  piecesAmelioration: Record<CategorieObjet, number>;
```

- [ ] **Step 2 : Ajouter le mapping emoji catégorie**

Dans `src/data/categories.ts`, ajouter à la fin du fichier :

```ts
export const CATEGORIE_EMOJI: Record<CategorieObjet, string> = {
  Musique: "🎵",
  "Jeux & Loisirs": "🎲",
  "Livres & Papeterie": "📚",
  Mode: "👗",
  Maison: "🏠",
  "Objets d'art": "🎨",
  Bricolage: "🔧",
};

/** Crée un dictionnaire de pièces vide (0 pour chaque catégorie). */
export function emptyPiecesAmelioration(): Record<CategorieObjet, number> {
  return {
    Musique: 0,
    "Jeux & Loisirs": 0,
    "Livres & Papeterie": 0,
    Mode: 0,
    Maison: 0,
    "Objets d'art": 0,
    Bricolage: 0,
  };
}
```

- [ ] **Step 3 : Vérifier le typecheck**

Run : `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -40`

Attendu : erreurs dans `GameContext.tsx` (`nouvellePartie` ne fournit pas `piecesAmelioration`) + dans `migrerSauvegarde`. C'est normal, sera corrigé en Task 2.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/types/game.ts src/data/categories.ts
git commit -m "$(cat <<'EOF'
types(atelier): piecesAmelioration par catégorie + emoji map

Préparation de l'économie de pièces d'amélioration (1 type par catégorie).
Champ GameState.piecesAmelioration: Record<CategorieObjet, number>.
Helper emptyPiecesAmelioration() pour les inits/migrations.
CATEGORIE_EMOJI exposé pour l'UI des engrenages.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2 : Helpers atelier (coût / rendement / dém.)

**Files :**
- Modify : `src/lib/atelier.ts`
- Modify : `src/lib/competences.ts`

- [ ] **Step 1 : Modifier `dureeRestauration` (durée fixe 7 jours)**

Dans `src/lib/competences.ts`, remplacer **intégralement** la fonction `dureeRestauration` (lignes 102-116 actuellement) par :

```ts
/**
 * Durée fixe de restauration : 7 jours pour toute transition d'état.
 * Conservée comme fonction (et non constante) pour ne pas casser les call-sites
 * existants et garder une porte d'entrée future si on remodule la durée.
 */
export function dureeRestauration(
  _state: GameState,
  _cat: CategorieObjet,
  _etatCible: EtatObjet,
): number {
  return 7;
}
```

Note : la signature reste identique pour ne pas casser les appels existants (`AtelierPage` notamment).

- [ ] **Step 2 : Ajouter helpers dans `src/lib/atelier.ts`**

Dans `src/lib/atelier.ts`, **ajouter en haut du fichier** (avec les autres imports) :

```ts
import { recalculerPrixReference } from "@/lib/etat";
```

Puis, **à la fin du fichier**, ajouter les helpers :

```ts
/**
 * Coût en pièces de la catégorie pour faire passer `o` de son état actuel
 * à `cible`. Min 1 pièce. Formule : ceil(gain_prixRef / 5).
 */
export function coutAmelioration(o: Objet, cible: EtatObjet): number {
  const prixApres = recalculerPrixReference(o.prixReferenceReel, o.etat, cible);
  const gain = Math.max(0, prixApres - o.prixReferenceReel);
  return Math.max(1, Math.ceil(gain / 5));
}

/**
 * Pièces rendues par le démantèlement d'un objet, basées sur son prix de
 * référence courant (donc état-dépendant). Min 1 pièce. Formule : floor(prix / 5).
 */
export function rendementDemantelement(o: Objet): number {
  return Math.max(1, Math.floor(o.prixReferenceReel / 5));
}

/** Calcule si un objet peut être démantelé (en stock, hors restauration, hors vitrine). */
export function peutDemanteler(state: GameState, o: Objet): AtelierStatus {
  if (o.enRestauration)
    return { disponible: false, raison: "Objet en restauration." };
  // Un objet en vitrine n'est PAS dans inventaireJoueur (cf. mettreEnVitrine
  // qui le déplace), donc tester sa présence dans l'inventaire suffit.
  const enStock = state.inventaireJoueur.some((x) => x.id === o.id);
  if (!enStock) return { disponible: false, raison: "Objet introuvable en stock." };
  return { disponible: true };
}
```

- [ ] **Step 3 : Mettre à jour `atelierStatusPourObjet` pour ajouter le check des pièces**

Toujours dans `src/lib/atelier.ts`, remplacer la fonction `atelierStatusPourObjet` (lignes 65-79) par :

```ts
/** Calcule si un objet précis peut être envoyé à l'atelier. */
export function atelierStatusPourObjet(
  state: GameState,
  o: Objet,
): AtelierStatus {
  if (o.enRestauration) return { disponible: false, raison: "Déjà en cours." };
  if (o.etat === "Pristin état")
    return { disponible: false, raison: "Déjà en parfait état." };
  if (!atelierAuneSlotLibre(state))
    return { disponible: false, raison: "Atelier plein." };
  const cible = prochaineEtatCible(o.etat);
  if (!cible) return { disponible: false, raison: "Non restaurable." };
  if (!peutRestaurerTransition(state, o.categorie, o.etat))
    return { disponible: false, raison: "Compétence Réparer manquante." };
  const cout = coutAmelioration(o, cible);
  const dispo = state.piecesAmelioration[o.categorie] ?? 0;
  if (dispo < cout)
    return {
      disponible: false,
      raison: `Manque ${cout - dispo} pièce${cout - dispo > 1 ? "s" : ""} ${o.categorie}.`,
    };
  return { disponible: true };
}
```

- [ ] **Step 4 : Vérifier le typecheck**

Run : `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -40`

Attendu : encore des erreurs côté `GameContext` (init + migration), normal.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/atelier.ts src/lib/competences.ts
git commit -m "$(cat <<'EOF'
feat(atelier): helpers coût/rendement pièces + durée 7j fixe

coutAmelioration(o, cible) = max(1, ceil((prixApres - prixActuel) / 5)).
rendementDemantelement(o) = max(1, floor(prixRefReel / 5)).
peutDemanteler(state, o) vérifie présence en stock libre.
atelierStatusPourObjet exige désormais le solde de pièces de la catégorie.
dureeRestauration retourne 7 quelle que soit la transition.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3 : GameContext — init, migration, débit pièces, démantèlement

**Files :**
- Modify : `src/context/GameContext.tsx`

- [ ] **Step 1 : Importer le helper d'init pièces**

Dans `src/context/GameContext.tsx`, ligne 40, remplacer :

```ts
import { CATEGORIES, migrerCategorie } from "@/data/categories";
```

par :

```ts
import { CATEGORIES, migrerCategorie, emptyPiecesAmelioration } from "@/data/categories";
```

- [ ] **Step 2 : Initialiser `piecesAmelioration` dans `nouvellePartie`**

Dans `nouvellePartie` (autour de la ligne 356), juste après `niveauStockage: 1,`, ajouter :

```ts
      piecesAmelioration: emptyPiecesAmelioration(),
```

- [ ] **Step 3 : Migration des saves dans `migrerSauvegarde`**

À la fin de la fonction `migrerSauvegarde`, dans le retour (autour de la ligne 276), ajouter un champ avant la fermeture de l'objet retourné :

```ts
    piecesAmelioration: (() => {
      const loadedPieces = (loaded as Partial<GameState>).piecesAmelioration;
      const base = emptyPiecesAmelioration();
      if (loadedPieces && typeof loadedPieces === "object") {
        for (const cat of CATEGORIES) {
          const v = (loadedPieces as Record<string, unknown>)[cat];
          if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
            base[cat] = Math.floor(v);
          }
        }
      }
      return base;
    })(),
```

Placement : juste avant la fermeture `};` du `return { ...loaded, ... }` (donc après `niveauStockage: (() => { ... })(),`).

- [ ] **Step 4 : Mettre à jour `restaurerObjet` pour débiter les pièces**

Remplacer **intégralement** la fonction `restaurerObjet` (lignes 809-850) par :

```ts
  const restaurerObjet = useCallback(
    (
      objetId: string,
      etatCible: EtatObjet,
      options: { dureeJours?: number } = {},
    ): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: "Pas de partie." };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet)
        return { ok: false, raison: "Objet introuvable dans l'inventaire." };
      if (objet.enRestauration)
        return { ok: false, raison: "Cet objet est déjà en restauration." };
      const nbEnCours = current.inventaireJoueur.filter((o) => o.enRestauration).length;
      const capacite = ATELIER_SLOTS[current.niveauAtelier];
      if (nbEnCours >= capacite)
        return {
          ok: false,
          raison: `Atelier plein (${nbEnCours}/${capacite} slot${capacite > 1 ? "s" : ""}).`,
        };
      if (!peutRestaurerCategorie(current, objet.categorie))
        return {
          ok: false,
          raison: `Vous n'avez pas la compétence Réparer — ${objet.categorie}.`,
        };

      // Coût en pièces de la catégorie de l'objet.
      const prixApres = recalculerPrixReference(
        objet.prixReferenceReel,
        objet.etat,
        etatCible,
      );
      const gain = Math.max(0, prixApres - objet.prixReferenceReel);
      const cout = Math.max(1, Math.ceil(gain / 5));
      const dispo = current.piecesAmelioration[objet.categorie] ?? 0;
      if (dispo < cout)
        return {
          ok: false,
          raison: `Manque ${cout - dispo} pièce${cout - dispo > 1 ? "s" : ""} ${objet.categorie}.`,
        };

      const duree = Math.max(1, options.dureeJours ?? 7);
      const jourFin = current.jourActuel + duree;

      setState((prev) => {
        if (!prev) return prev;
        const inv = prev.inventaireJoueur.map((o) =>
          o.id === objetId
            ? { ...o, enRestauration: { etatCible, jourFin } }
            : o,
        );
        const piecesAmelioration = {
          ...prev.piecesAmelioration,
          [objet.categorie]:
            (prev.piecesAmelioration[objet.categorie] ?? 0) - cout,
        };
        return { ...prev, inventaireJoueur: inv, piecesAmelioration };
      });
      return { ok: true };
    },
    [],
  );
```

- [ ] **Step 5 : Ajouter l'action `demantelerObjet`**

Juste après `restaurerObjet`, ajouter la nouvelle action :

```ts
  const demantelerObjet = useCallback(
    (objetId: string): { ok: boolean; raison?: string; pieces?: number } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: "Pas de partie." };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet)
        return { ok: false, raison: "Objet introuvable dans l'inventaire." };
      if (objet.enRestauration)
        return { ok: false, raison: "Objet en restauration." };

      const pieces = Math.max(1, Math.floor(objet.prixReferenceReel / 5));

      setState((prev) => {
        if (!prev) return prev;
        const inv = prev.inventaireJoueur.filter((o) => o.id !== objetId);
        const piecesAmelioration = {
          ...prev.piecesAmelioration,
          [objet.categorie]:
            (prev.piecesAmelioration[objet.categorie] ?? 0) + pieces,
        };
        return { ...prev, inventaireJoueur: inv, piecesAmelioration };
      });
      return { ok: true, pieces };
    },
    [],
  );
```

- [ ] **Step 6 : Exposer `demantelerObjet` dans `GameContextValue`**

Dans l'interface `GameContextValue` (autour de la ligne 94), juste après la signature de `restaurerObjet`, ajouter :

```ts
  demantelerObjet: (objetId: string) => {
    ok: boolean;
    raison?: string;
    pieces?: number;
  };
```

- [ ] **Step 7 : Ajouter `demantelerObjet` au `value` du provider**

Dans l'objet `value` retourné par `useMemo` (autour de la ligne 1035), juste après `restaurerObjet,`, ajouter `demantelerObjet,`. Faire de même dans le tableau de dépendances du `useMemo` (autour de la ligne 1068).

- [ ] **Step 8 : Typecheck + build**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
npx tsc --noEmit
```

Attendu : 0 erreur. Si erreur sur `recalculerPrixReference`, vérifier qu'il est bien importé en haut du fichier (il l'est déjà ligne 41).

- [ ] **Step 9 : Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "$(cat <<'EOF'
feat(atelier): débit pièces sur restauration + action démanteler

restaurerObjet vérifie et débite les pièces de la catégorie avant de poser
enRestauration. demantelerObjet retire l'objet du stock libre et crédite
floor(prixRefReel/5) pièces (min 1) dans la catégorie.
Migration de save : injection {Musique:0,...,Bricolage:0} si absent.
nouvellePartie initialise piecesAmelioration vide.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4 : UI — Composant `PiecesInventoryBar`

**Files :**
- Create : `src/components/atelier/PiecesInventoryBar.tsx`

- [ ] **Step 1 : Créer le composant**

Créer `src/components/atelier/PiecesInventoryBar.tsx` avec :

```tsx
"use client";

import type { CategorieObjet } from "@/types/game";
import { CATEGORIES, CATEGORIE_EMOJI } from "@/data/categories";

interface PiecesInventoryBarProps {
  pieces: Record<CategorieObjet, number>;
}

/**
 * Bandeau horizontal des 7 catégories sous forme d'engrenages stylisés.
 * Chaque case = emoji de la catégorie + nombre de pièces dispo en dessous.
 * Largeur fixe par case, scroll horizontal si le viewport est trop étroit.
 */
export function PiecesInventoryBar({ pieces }: PiecesInventoryBarProps) {
  return (
    <div
      role="list"
      aria-label="Inventaire de pièces d'amélioration"
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        padding: "6px 2px 8px",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {CATEGORIES.map((cat) => (
        <div
          key={cat}
          role="listitem"
          title={`${cat} : ${pieces[cat] ?? 0} pièces`}
          style={{
            flex: "0 0 auto",
            width: 46,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1.5px solid var(--brass-500)",
              background: "var(--paper-100)",
              display: "grid",
              placeItems: "center",
              fontSize: 18,
              lineHeight: 1,
              boxShadow:
                "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
            }}
          >
            {CATEGORIE_EMOJI[cat]}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--ink-700)",
              letterSpacing: "0.04em",
            }}
          >
            {pieces[cat] ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2 : Typecheck**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/atelier/PiecesInventoryBar.tsx
git commit -m "$(cat <<'EOF'
ui(atelier): composant PiecesInventoryBar (bandeau 7 engrenages)

Rangée scrollable horizontalement, chaque case = cercle laiton avec emoji
de la catégorie + compteur monospace en dessous. Largeur 46px par case,
tient sur 360px de viewport avec une légère marge de scroll.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5 : UI — Intégration sur la page Atelier (bandeau + coûts)

**Files :**
- Modify : `src/app/atelier/page.tsx`

- [ ] **Step 1 : Importer les nouveaux helpers et composant**

Dans `src/app/atelier/page.tsx`, modifier le bloc d'imports en haut. Remplacer :

```ts
import {
  dureeRestauration,
  peutRestaurerBonVersTresBon,
  peutRestaurerMauvaisVersBon,
  peutRestaurerTresBonVersPristin,
} from "@/lib/competences";
import { recalculerPrixReference } from "@/lib/etat";
import { ATELIER_SLOTS, getProchaineUpgrade } from "@/data/atelier";
import type { EtatObjet, Objet } from "@/types/game";
```

par :

```ts
import {
  dureeRestauration,
  peutRestaurerBonVersTresBon,
  peutRestaurerMauvaisVersBon,
  peutRestaurerTresBonVersPristin,
} from "@/lib/competences";
import { recalculerPrixReference } from "@/lib/etat";
import { ATELIER_SLOTS, getProchaineUpgrade } from "@/data/atelier";
import { coutAmelioration } from "@/lib/atelier";
import { PiecesInventoryBar } from "@/components/atelier/PiecesInventoryBar";
import type { EtatObjet, Objet } from "@/types/game";
```

- [ ] **Step 2 : Insérer le bandeau de pièces en haut du contenu**

Toujours dans `src/app/atelier/page.tsx`, juste après `<MobileLayout ...>` (après la fermeture du prop `stickyTop`), et **avant** le bloc `<div style={{ border: "1px solid var(--brass-500)", ... marginBottom: 10 ... }}>` qui affiche `Atelier LVL X`, insérer :

```tsx
      <PiecesInventoryBar pieces={state.piecesAmelioration} />
```

- [ ] **Step 3 : Afficher le coût et désactiver le bouton si pièces insuffisantes**

Dans la section "Restaurations possibles", dans la `.map((o, i) => { ... })` (autour de la ligne 345), remplacer le bloc complet de la ligne par :

```tsx
          {restaurables.map((o, i) => {
            const cible: EtatObjet =
              o.etat === "Mauvais"
                ? "Bon"
                : o.etat === "Bon"
                  ? "Très bon"
                  : "Pristin état";
            const duree = dureeRestauration(state, o.categorie, cible);
            const prixApres = recalculerPrixReference(
              o.prixReferenceReel,
              o.etat,
              cible,
            );
            const cout = coutAmelioration(o, cible);
            const dispo = state.piecesAmelioration[o.categorie] ?? 0;
            const manquePieces = dispo < cout;
            const disabled = pleine || manquePieces;
            return (
              <div
                key={o.id}
                style={{
                  padding: "10px 0",
                  borderBottom:
                    i === restaurables.length - 1
                      ? "none"
                      : "1px dotted var(--paper-500)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      fontWeight: 700,
                    }}
                  >
                    {o.nom}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--ink-500)",
                      marginTop: 2,
                    }}
                  >
                    {o.etat} → {cible} · {duree} j.
                    {" · "}réf. {o.prixReferenceReel} →{" "}
                    <span style={{ color: "var(--brass-700)" }}>
                      {prixApres} €
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: manquePieces ? "var(--rouge-700, #8b1a1a)" : "var(--brass-700)",
                      marginTop: 2,
                      letterSpacing: "0.04em",
                    }}
                  >
                    coût : {cout} ⚙ {o.categorie}
                    {manquePieces ? ` · manque ${cout - dispo}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleRestaurer(o, cible)}
                  style={{
                    padding: "6px 10px",
                    fontFamily: "var(--font-display)",
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    border: "1px solid var(--brass-500)",
                    background: disabled ? "var(--paper-200)" : "var(--forest-800)",
                    color: disabled ? "var(--ink-500)" : "var(--brass-300)",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  Lancer
                </button>
              </div>
            );
          })}
```

- [ ] **Step 4 : Typecheck + build**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
npx tsc --noEmit && npm run build 2>&1 | tail -20
```

Attendu : 0 erreur, build OK.

- [ ] **Step 5 : Commit**

```bash
git add src/app/atelier/page.tsx
git commit -m "$(cat <<'EOF'
ui(atelier): bandeau pièces en tête + coût affiché sur restauration

PiecesInventoryBar inséré au-dessus du bloc Atelier LVL.
Chaque ligne "Restaurations possibles" affiche désormais :
- la durée fixe (7j)
- le prix après restauration
- le coût en pièces de la catégorie (rouge si solde insuffisant)
Bouton Lancer désactivé si pièces insuffisantes OU atelier plein.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6 : UI — Section « Démantèlement »

**Files :**
- Modify : `src/app/atelier/page.tsx`

- [ ] **Step 1 : Importer le `BottomSheet` et les helpers**

Dans le bloc d'imports de `src/app/atelier/page.tsx`, ajouter une nouvelle ligne :

```ts
import { BottomSheet } from "@/components/mobile/BottomSheet";
```

Et modifier la ligne `import { coutAmelioration } from "@/lib/atelier";` (ajoutée en Task 5) en :

```ts
import { coutAmelioration, rendementDemantelement } from "@/lib/atelier";
```

Et compléter l'import existant de `useGame` pour récupérer `demantelerObjet` (modifier la déstructuration dans `AtelierPage`, autour de la ligne 38) :

```ts
const { state, isHydrated, restaurerObjet, ameliorerAtelier, demantelerObjet } = useGame();
```

- [ ] **Step 2 : Ajouter l'état local pour la confirmation**

Dans le composant `AtelierPage`, à côté du `useState<string | null>(null)` pour `flash`, ajouter :

```ts
const [demantelerCible, setDemantelerCible] = useState<Objet | null>(null);
```

- [ ] **Step 3 : Calculer la liste des objets démantelables**

Juste après le `useMemo` de `restaurables` (vers la ligne 67), ajouter :

```ts
const demantelables = useMemo(() => {
  if (!state) return [];
  return state.inventaireJoueur.filter((o) => !o.enRestauration);
}, [state]);
```

- [ ] **Step 4 : Ajouter le handler**

Sous le `handleRestaurer` (autour de la ligne 89), ajouter :

```ts
const handleConfirmDemanteler = () => {
  if (!demantelerCible) return;
  const res = demantelerObjet(demantelerCible.id);
  if (res.ok) {
    setFlash(`${demantelerCible.nom} démantelé · +${res.pieces} ⚙ ${demantelerCible.categorie}.`);
  } else {
    setFlash(`Impossible : ${res.raison ?? "condition non remplie"}`);
  }
  setDemantelerCible(null);
  setTimeout(() => setFlash(null), 2500);
};
```

- [ ] **Step 5 : Ajouter la section UI Démantèlement (après "Restaurations possibles")**

Juste avant la fermeture `</MobileLayout>` (donc après la `</div>` qui ferme le `cardWrap` des restaurables), insérer :

```tsx
      <h2 style={sectTitle}>— Démantèlement —</h2>
      {demantelables.length === 0 ? (
        <div style={cardWrap}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--ink-500)",
              textAlign: "center",
              padding: "12px 0",
            }}
          >
            Aucun objet à démanteler en stock.
          </p>
        </div>
      ) : (
        <div style={cardWrap}>
          {demantelables.map((o, i) => {
            const yieldPieces = rendementDemantelement(o);
            return (
              <div
                key={o.id}
                style={{
                  padding: "10px 0",
                  borderBottom:
                    i === demantelables.length - 1
                      ? "none"
                      : "1px dotted var(--paper-500)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      fontWeight: 700,
                    }}
                  >
                    {o.nom}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--ink-500)",
                      marginTop: 2,
                    }}
                  >
                    {o.etat} · réf. {o.prixReferenceReel} €
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--brass-700)",
                      marginTop: 2,
                      letterSpacing: "0.04em",
                    }}
                  >
                    rendement : {yieldPieces} ⚙ {o.categorie}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDemantelerCible(o)}
                  style={{
                    padding: "6px 10px",
                    fontFamily: "var(--font-display)",
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    border: "1px solid var(--brass-500)",
                    background: "var(--paper-100)",
                    color: "var(--forest-800)",
                    cursor: "pointer",
                  }}
                >
                  Démanteler
                </button>
              </div>
            );
          })}
        </div>
      )}

      <BottomSheet
        open={demantelerCible !== null}
        onClose={() => setDemantelerCible(null)}
        title="Démantèlement"
      >
        {demantelerCible && (
          <div style={{ padding: "8px 16px 16px" }}>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                color: "var(--ink-700)",
                marginBottom: 10,
              }}
            >
              Démanteler <strong>{demantelerCible.nom}</strong> rend{" "}
              <strong>{rendementDemantelement(demantelerCible)} ⚙ {demantelerCible.categorie}</strong>.
              L'objet sera détruit définitivement.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setDemantelerCible(null)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontFamily: "var(--font-display)",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  border: "1px solid var(--brass-500)",
                  background: "var(--paper-200)",
                  color: "var(--ink-700)",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDemanteler}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontFamily: "var(--font-display)",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  border: "1px solid var(--brass-500)",
                  background: "var(--forest-800)",
                  color: "var(--brass-300)",
                  cursor: "pointer",
                }}
              >
                Démanteler
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
```

- [ ] **Step 6 : Typecheck + build**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
npx tsc --noEmit && npm run build 2>&1 | tail -20
```

Attendu : 0 erreur, build OK.

- [ ] **Step 7 : Commit**

```bash
git add src/app/atelier/page.tsx
git commit -m "$(cat <<'EOF'
ui(atelier): section démantèlement avec confirmation BottomSheet

Liste les objets en stock libre (hors restauration), affiche rendement
en pièces de la catégorie, ouvre une BottomSheet de confirmation avant
destruction. Flash de succès indique le gain en pièces.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7 : Vérification manuelle & ajustements

**Files :** aucun (test).

- [ ] **Step 1 : Lancer le serveur de dev**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
npm run dev
```

Ouvrir http://localhost:3000 dans le navigateur (DevTools en mode mobile 360×640).

- [ ] **Step 2 : Scénarios manuels à valider**

Pour chaque scénario, noter ✓ / ✗ et commenter si nécessaire.

1. **Migration save existante** : charger une partie en cours. Aller sur `/atelier`. Vérifier que le bandeau d'engrenages s'affiche avec **0 pour les 7 catégories**. Pas de crash.
2. **Démantèlement basique** : démanteler un objet en stock. Vérifier :
   - Modal de confirmation s'ouvre
   - Annuler ne change rien
   - Confirmer : objet disparaît, pièces ajoutées dans la bonne catégorie (vérifier le bandeau)
   - Flash de succès apparaît ~2.5s
3. **Plancher démantèlement** : démanteler un objet à prix réf < 5€ → doit rendre exactement 1 pièce.
4. **Plancher restauration** : tenter de restaurer un objet à très faible gain → coût affiché ≥ 1.
5. **Solde insuffisant** : avec 0 pièce d'une catégorie, ouvrir une restauration possible de cette catégorie → bouton **Lancer** désactivé, ligne rouge "manque N", message clair.
6. **Solde suffisant** : démanteler 2-3 objets pour accumuler, puis lancer la restauration d'un autre objet de la même catégorie → pièces décrémentées, durée affichée 7 jours, objet apparaît en "Travaux en cours".
7. **Pas de re-débit au retour** : avancer N jours jusqu'à la fin du chantier. L'objet revient avec son nouvel état. Vérifier que les pièces ne sont **pas** débitées une seconde fois.
8. **Démantèlement bloqué** : un objet en restauration n'apparaît pas dans la section "Démantèlement". Idem pour les objets en vitrine (ils ne sont pas dans `inventaireJoueur`).
9. **Bandeau scroll** : sur viewport 360px, le bandeau de 7 engrenages tient ou scrolle horizontalement sans casser le layout.
10. **Nouvelle partie** : `Reset` puis `Nouvelle partie` → bandeau à 0 partout, démantèlement de l'inventaire de départ fonctionne et alimente les pièces.

- [ ] **Step 3 : Ajustements éventuels**

Si un scénario échoue, corriger en boucle (commits séparés par fix). Ne pas grouper plusieurs fix dans un seul commit.

- [ ] **Step 4 : Commit final (si ajustements)**

```bash
git status
# Si rien à committer : skip cette étape.
# Sinon : commits ciblés par fix.
```

- [ ] **Step 5 : Récapitulatif `git log`**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git log --oneline -10
```

Attendu : 6 à 8 commits (selon ajustements) pour cette feature, tous sur la branche courante. Prêt pour PR vers `main`.

---

## Hors-scope (rappel)

- Comptoir d'échange entre catégories.
- Pièces à rareté variable.
- Compétences "Frugalité / Récupération / Affûtage".
- Bonus de rendement explicite selon l'état démantelé.
- Démantèlement depuis la page Stockage.
- SVG d'engrenages dédiés (v1 = bordure circulaire + emoji).
- Refonte des compétences Atelier.
