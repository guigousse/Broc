# Phase 6 — Collection (refonte Catalogue) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer le « Catalogue » (Pokédex auto-rempli par possessions) en « Collection » manuelle : le joueur DONNE des objets de son inventaire à des slots, chaque donation vaut le `prixReferenceReel` (donc état-pondéré) de l'objet, et les **valeurs cumulées (totale + par catégorie) deviennent les nouvelles conditions de déblocage des brocantes**.

**Architecture:** On renomme `catalogue → collection` dans le state et la lib, on ajoute un champ `donation: {etat, valeur} | null` à chaque slot, deux nouveaux variants de `ConditionDeblocage` (`valeurCollection`, `valeurCollectionCategorie`), deux actions context (`donnerACollection(objetId)`, `retirerDeCollection(templateId)`), une page `/collection` avec UI de donation (silhouette / à donner / donné), et on réécrit les 16 conditions de déblocage des brocantes pour qu'elles tirent sur la valeur de la collection.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind v4, lucide-react.

**Vérification:** pas de framework de test. `npx tsc --noEmit` + dev server au port 3000 + curl sur les routes impactées.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/types/game.ts` | Modify | `CollectionSlot` remplace `CatalogueEntree`, `GameState.collection` remplace `.catalogue`, 2 nouveaux variants `ConditionDeblocage`. |
| `src/lib/collection.ts` | Create | Nouvelle lib : init, marquerVu, marquerDejaPossede, donnerObjet, retirerDonation, valeurTotale, valeurParCategorie, progression*, collectionComplete. |
| `src/lib/catalogue.ts` | Delete | Remplacée par `collection.ts`. |
| `src/context/GameContext.tsx` | Modify | Migration `catalogue → collection`. Actions renommées (`marquerPossedeTemplate → marquerDejaPossedeTemplate`) et 2 nouvelles actions (`donnerACollection`, `retirerDeCollection`). |
| `src/lib/deblocage.ts` | Modify | `evaluerCondition` supporte `valeurCollection` et `valeurCollectionCategorie`. |
| `src/data/brocantes.ts` | Modify | Réécrire les 16 `conditionDeblocage` avec les nouvelles conditions. |
| `src/app/chiner/[brocanteId]/page.tsx` | Modify | Renommer l'appel `marquerPossedeTemplate` → `marquerDejaPossedeTemplate`. |
| `src/app/vitrine/[brocanteId]/journee/page.tsx` | Modify | (idem, si applicable) |
| `src/components/CatalogueGrid.tsx` | Delete | Remplacée par `CollectionGrid.tsx`. |
| `src/components/CollectionGrid.tsx` | Create | Grille de slots avec 3 états visuels + bouton donner / retirer + picker modal. |
| `src/app/catalogue/page.tsx` | Delete | Supprimée. |
| `src/app/collection/page.tsx` | Create | Page /collection avec header valeur totale + tabs cat avec valeur, utilise `CollectionGrid`. |
| `src/app/qg/page.tsx` | Modify | Panneau renommé « Collection », compteur `N / total · valeur X €`, bouton et route vers `/collection`. |
| `src/app/trophees/page.tsx` | Modify | Importer depuis `@/lib/collection`, adapter labels/sémantique (la "complétion" = tous les slots ont une donation). |

---

## Task 1 : Types — `CollectionSlot`, GameState.collection, nouveaux variants ConditionDeblocage

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1 : Remplacer `CatalogueEntree` par `CollectionSlot`**

Édite `src/types/game.ts`. Trouve le bloc :

```ts
export interface CatalogueEntree {
  templateId: string;
  /** Nom complet de l'objet (snapshot pour l'affichage). */
  nom: string;
  categorie: CategorieObjet;
  rarete: Rarete;
  /** Vrai si croisé chez un vendeur ou un client (sans nécessairement l'acquérir). */
  vu: boolean;
  /** Nombre de fois possédé (0 = jamais). */
  possede: number;
  unique?: boolean;
}
```

Remplace par :

```ts
export interface CollectionSlot {
  templateId: string;
  /** Nom complet de l'objet (snapshot pour l'affichage). */
  nom: string;
  categorie: CategorieObjet;
  rarete: Rarete;
  /** Vrai si croisé chez un vendeur ou un client. */
  vu: boolean;
  /** Vrai si possédé au moins une fois (achat, restauration). */
  dejaPossede: boolean;
  /** Donation présente dans le slot (état + valeur préservés). null = slot vide. */
  donation: { etat: EtatObjet; valeur: number } | null;
  unique?: boolean;
}
```

- [ ] **Step 2 : Remplacer le champ `catalogue` par `collection` dans `GameState`**

Trouve dans `GameState` :

```ts
  catalogue: Record<CategorieObjet, CatalogueEntree[]>;
```

Remplace par :

```ts
  collection: Record<CategorieObjet, CollectionSlot[]>;
```

- [ ] **Step 3 : Ajouter 2 variants à `ConditionDeblocage`**

Trouve `export type ConditionDeblocage = …` et ajoute les 2 variants à la fin de l'union (avant le variant `ET`). Le bloc complet devient :

```ts
export type ConditionDeblocage =
  | { type: "depart" }
  | { type: "jour"; jour: number }
  | { type: "budget"; montant: number }
  | { type: "ventesCategorie"; categorie: CategorieObjet; nombre: number }
  | { type: "brocantesDebloquees"; tier: 1 | 2 | 3; nombre: number }
  | { type: "valeurCollection"; montant: number }
  | { type: "valeurCollectionCategorie"; categorie: CategorieObjet; montant: number }
  | { type: "ET"; conditions: ConditionDeblocage[] };
```

- [ ] **Step 4 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -40`
Expected: nombreuses erreurs dans `lib/catalogue.ts`, `GameContext.tsx`, `lib/deblocage.ts`, `app/catalogue/page.tsx`, `app/qg/page.tsx`, `app/trophees/page.tsx` (références à `CatalogueEntree`/`state.catalogue`). C'est attendu — corrigé par les tâches suivantes.

- [ ] **Step 5 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/types/game.ts
git commit -m "feat(types): CollectionSlot replaces CatalogueEntree, valeurCollection condition variants"
```

---

## Task 2 : Nouvelle lib `src/lib/collection.ts`

**Files:**
- Create: `src/lib/collection.ts`

- [ ] **Step 1 : Créer le module avec les helpers**

Crée `src/lib/collection.ts` :

```ts
import type {
  CategorieObjet,
  CollectionSlot,
  EtatObjet,
} from "@/types/game";
import { CATEGORIES } from "@/data/categories";
import { OBJET_TEMPLATES, LEGENDAIRES } from "@/data/objetTemplates";
import { UNIQUES } from "@/data/uniques";

/**
 * Construit une collection initiale (slots vides : vu=false, dejaPossede=false, donation=null)
 * à partir du pool complet (templates communs + rares + légendaires + uniques).
 * Triée par rareté puis par nom dans chaque catégorie.
 */
export function initCollection(): Record<CategorieObjet, CollectionSlot[]> {
  const POOL_COMPLET = [...OBJET_TEMPLATES, ...LEGENDAIRES, ...UNIQUES];
  const ordre = { commun: 0, rare: 1, legendaire: 2 } as const;
  const cat: Record<CategorieObjet, CollectionSlot[]> = {} as Record<
    CategorieObjet,
    CollectionSlot[]
  >;
  for (const c of CATEGORIES) cat[c] = [];
  for (const t of POOL_COMPLET) {
    cat[t.categorie].push({
      templateId: t.templateId,
      nom: t.nom,
      categorie: t.categorie,
      rarete: t.rarete,
      vu: false,
      dejaPossede: false,
      donation: null,
      unique: t.unique,
    });
  }
  for (const c of CATEGORIES) {
    cat[c].sort((a, b) => {
      const da = ordre[a.rarete] - ordre[b.rarete];
      if (da !== 0) return da;
      return a.nom.localeCompare(b.nom, "fr");
    });
  }
  return cat;
}

function modifierSlot(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
  patch: (s: CollectionSlot) => CollectionSlot,
): Record<CategorieObjet, CollectionSlot[]> {
  const next = { ...collection };
  for (const cat of Object.keys(next) as CategorieObjet[]) {
    const slots = next[cat];
    const idx = slots.findIndex((e) => e.templateId === templateId);
    if (idx >= 0) {
      const updated = patch(slots[idx]);
      if (updated === slots[idx]) return collection;
      next[cat] = [...slots.slice(0, idx), updated, ...slots.slice(idx + 1)];
      return next;
    }
  }
  return collection;
}

/** Marque un slot comme vu (croisé). */
export function marquerVu(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
): Record<CategorieObjet, CollectionSlot[]> {
  return modifierSlot(collection, templateId, (s) =>
    s.vu ? s : { ...s, vu: true },
  );
}

/** Marque un slot comme déjà possédé (et vu). */
export function marquerDejaPossede(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
): Record<CategorieObjet, CollectionSlot[]> {
  return modifierSlot(collection, templateId, (s) =>
    s.dejaPossede && s.vu ? s : { ...s, vu: true, dejaPossede: true },
  );
}

export interface ResultatDonation {
  collection: Record<CategorieObjet, CollectionSlot[]>;
  /** Si le slot était déjà rempli, l'ancienne donation déplacée (à recréer dans l'inventaire par le caller). */
  ancienne: { etat: EtatObjet; valeur: number } | null;
}

/**
 * Pose une donation dans le slot du `templateId`. Si le slot était déjà rempli,
 * l'ancienne donation est retournée pour que le caller puisse la remettre en inventaire.
 */
export function donnerObjet(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
  etat: EtatObjet,
  valeur: number,
): ResultatDonation {
  let ancienne: { etat: EtatObjet; valeur: number } | null = null;
  const next = modifierSlot(collection, templateId, (s) => {
    ancienne = s.donation;
    return {
      ...s,
      vu: true,
      dejaPossede: true,
      donation: { etat, valeur },
    };
  });
  return { collection: next, ancienne };
}

/**
 * Retire la donation du slot. Retourne aussi l'ancienne donation pour
 * que le caller puisse recréer l'objet dans l'inventaire.
 */
export function retirerDonation(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
): ResultatDonation {
  let ancienne: { etat: EtatObjet; valeur: number } | null = null;
  const next = modifierSlot(collection, templateId, (s) => {
    if (!s.donation) return s;
    ancienne = s.donation;
    return { ...s, donation: null };
  });
  return { collection: next, ancienne };
}

/** Somme des valeurs des donations sur toute la collection. */
export function valeurTotale(
  collection: Record<CategorieObjet, CollectionSlot[]>,
): number {
  let total = 0;
  for (const c of CATEGORIES) {
    for (const s of collection[c] ?? []) {
      if (s.donation) total += s.donation.valeur;
    }
  }
  return total;
}

/** Somme des valeurs pour une catégorie donnée. */
export function valeurParCategorie(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  cat: CategorieObjet,
): number {
  let total = 0;
  for (const s of collection[cat] ?? []) {
    if (s.donation) total += s.donation.valeur;
  }
  return total;
}

export interface ProgressionCategorie {
  categorie: CategorieObjet;
  total: number;
  vues: number;
  donnees: number;
  valeur: number;
}

export function progressionCategorie(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  cat: CategorieObjet,
): ProgressionCategorie {
  const slots = collection[cat] ?? [];
  return {
    categorie: cat,
    total: slots.length,
    vues: slots.filter((s) => s.vu).length,
    donnees: slots.filter((s) => s.donation !== null).length,
    valeur: valeurParCategorie(collection, cat),
  };
}

export function progressionGlobale(
  collection: Record<CategorieObjet, CollectionSlot[]>,
): { total: number; vues: number; donnees: number; valeur: number } {
  let total = 0;
  let vues = 0;
  let donnees = 0;
  let valeur = 0;
  for (const c of CATEGORIES) {
    const p = progressionCategorie(collection, c);
    total += p.total;
    vues += p.vues;
    donnees += p.donnees;
    valeur += p.valeur;
  }
  return { total, vues, donnees, valeur };
}

/** Vrai si tous les slots de la collection ont une donation. */
export function collectionComplete(
  collection: Record<CategorieObjet, CollectionSlot[]>,
): boolean {
  const p = progressionGlobale(collection);
  return p.donnees === p.total && p.total > 0;
}
```

- [ ] **Step 2 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -30`
Expected: pas de nouvelle erreur dans `collection.ts`. Les erreurs existantes (dans `catalogue.ts`, context, pages) persistent.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/lib/collection.ts
git commit -m "feat(lib): collection module — donation-based slots + value helpers"
```

---

## Task 3 : Lib deblocage — supporter `valeurCollection` et `valeurCollectionCategorie`

**Files:**
- Modify: `src/lib/deblocage.ts`

- [ ] **Step 1 : Étendre `descriptionCondition` et `evaluerCondition`**

Édite `src/lib/deblocage.ts`. Remplace intégralement par :

```ts
import type {
  Brocante,
  CategorieObjet,
  ConditionDeblocage,
  GameState,
} from "@/types/game";
import { valeurTotale, valeurParCategorie } from "@/lib/collection";

export function descriptionCondition(c: ConditionDeblocage): string {
  switch (c.type) {
    case "depart":
      return "Disponible dès le départ";
    case "jour":
      return `Débloqué au jour ${c.jour}`;
    case "budget":
      return `Débloqué à partir de ${c.montant} € de budget`;
    case "ventesCategorie":
      return `Débloqué après ${c.nombre} vente${c.nombre > 1 ? "s" : ""} de ${c.categorie}`;
    case "brocantesDebloquees":
      return `Débloqué après ${c.nombre} brocante${c.nombre > 1 ? "s" : ""} ${"⭐".repeat(c.tier)} débloquée${c.nombre > 1 ? "s" : ""}`;
    case "valeurCollection":
      return `Débloqué quand votre collection atteint ${c.montant} €`;
    case "valeurCollectionCategorie":
      return `Débloqué quand votre collection « ${c.categorie} » atteint ${c.montant} €`;
    case "ET":
      return c.conditions.map(descriptionCondition).join(" + ");
  }
}

/** Compte les ventes d'une catégorie donnée à travers l'historique. */
function compterVentesCategorie(
  historique: GameState["historique"],
  cat: CategorieObjet,
): number {
  let n = 0;
  for (const s of historique) {
    if (s.type !== "vente") continue;
    for (const v of s.ventes) {
      if (v.categorie === cat) n += 1;
    }
  }
  return n;
}

export function estDebloquee(
  brocante: Brocante,
  state: Pick<GameState, "jourActuel" | "budget" | "historique" | "collection">,
  brocantesDebloqueesParTier?: Map<1 | 2 | 3 | 4, Set<string>>,
): boolean {
  return evaluerCondition(
    brocante.conditionDeblocage,
    state,
    brocantesDebloqueesParTier,
  );
}

function evaluerCondition(
  c: ConditionDeblocage,
  state: Pick<GameState, "jourActuel" | "budget" | "historique" | "collection">,
  brocantesDebloqueesParTier?: Map<1 | 2 | 3 | 4, Set<string>>,
): boolean {
  switch (c.type) {
    case "depart":
      return true;
    case "jour":
      return state.jourActuel >= c.jour;
    case "budget":
      return state.budget >= c.montant;
    case "ventesCategorie":
      return compterVentesCategorie(state.historique, c.categorie) >= c.nombre;
    case "brocantesDebloquees": {
      const set = brocantesDebloqueesParTier?.get(c.tier);
      return (set?.size ?? 0) >= c.nombre;
    }
    case "valeurCollection":
      return valeurTotale(state.collection) >= c.montant;
    case "valeurCollectionCategorie":
      return valeurParCategorie(state.collection, c.categorie) >= c.montant;
    case "ET":
      return c.conditions.every((cc) =>
        evaluerCondition(cc, state, brocantesDebloqueesParTier),
      );
  }
}
```

- [ ] **Step 2 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -20`
Expected: les erreurs sur `deblocage.ts` disparaissent. Erreurs restantes dans `catalogue.ts`, `GameContext.tsx`, pages.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/lib/deblocage.ts
git commit -m "feat(deblocage): support valeurCollection and valeurCollectionCategorie conditions"
```

---

## Task 4 : Context — migration + actions collection

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1 : Mettre à jour les imports**

Édite `src/context/GameContext.tsx`. Trouve le bloc :

```ts
import {
  initCatalogue,
  marquerPossedeTemplate as marquerPossedeFn,
  marquerVuTemplate as marquerVuFn,
} from "@/lib/catalogue";
```

Remplace par :

```ts
import {
  initCollection,
  marquerDejaPossede as marquerDejaPossedeFn,
  marquerVu as marquerVuFn,
  donnerObjet as donnerObjetFn,
  retirerDonation as retirerDonationFn,
} from "@/lib/collection";
import { getTemplate } from "@/data/objetTemplates";
import { recalculerPrixReference } from "@/lib/etat";
```

(Si `recalculerPrixReference` est déjà importé depuis `@/lib/etat`, ne pas le dupliquer — vérifier les imports existants en haut de fichier.)

- [ ] **Step 2 : Mettre à jour `GameContextValue` (interface)**

Trouve les 2 lignes :

```ts
  marquerVuTemplate: (templateId: string) => void;
  marquerPossedeTemplate: (templateId: string) => void;
```

Remplace par :

```ts
  marquerVuTemplate: (templateId: string) => void;
  marquerDejaPossedeTemplate: (templateId: string) => void;
  donnerACollection: (objetId: string) => { ok: boolean; raison?: string };
  retirerDeCollection: (templateId: string) => { ok: boolean; raison?: string };
```

- [ ] **Step 3 : Adapter la migration `catalogue → collection`**

Trouve le bloc de `migrerSauvegarde` :

```ts
  // Catalogue : initialise + reconstitue les possessions à partir de l'inventaire migré
  let catalogue =
    loaded.catalogue && Object.keys(loaded.catalogue).length > 0
      ? loaded.catalogue
      : initCatalogue();
  if (!loaded.catalogue) {
    for (const o of inventaire) {
      catalogue = marquerPossedeFn(catalogue, o.templateId);
    }
    if (vitrineActuelle) {
      for (const v of vitrineActuelle.objets) {
        catalogue = marquerPossedeFn(catalogue, v.objet.templateId);
      }
    }
  }
```

Remplace intégralement par :

```ts
  // Collection : init vide, puis migration depuis l'ancien `catalogue` (si présent)
  // ou marquage dejaPossede depuis l'inventaire courant.
  let collection = initCollection();
  const ancienCatalogue = (loaded as unknown as { catalogue?: Record<string, Array<{ templateId: string; vu?: boolean; possede?: number }>> }).catalogue;
  if (ancienCatalogue) {
    // Préserve vu et convertit possede>0 → dejaPossede=true.
    for (const cat of Object.keys(ancienCatalogue)) {
      const entrees = ancienCatalogue[cat] ?? [];
      for (const e of entrees) {
        if (e.vu) collection = marquerVuFn(collection, e.templateId);
        if ((e.possede ?? 0) > 0)
          collection = marquerDejaPossedeFn(collection, e.templateId);
      }
    }
  } else {
    // Pas d'ancien catalogue : reconstitue dejaPossede depuis inventaire + vitrine.
    for (const o of inventaire) {
      collection = marquerDejaPossedeFn(collection, o.templateId);
    }
    if (vitrineActuelle) {
      for (const v of vitrineActuelle.objets) {
        collection = marquerDejaPossedeFn(collection, v.objet.templateId);
      }
    }
  }
```

Trouve ensuite, dans le `return` de `migrerSauvegarde`, la ligne :

```ts
    catalogue,
```

Remplace par :

```ts
    collection,
```

- [ ] **Step 4 : Adapter `nouvellePartie`**

Trouve dans `nouvellePartie` la ligne :

```ts
      catalogue: initCatalogue(),
```

Remplace par :

```ts
      collection: initCollection(),
```

- [ ] **Step 5 : Réécrire les actions catalogue → collection**

Trouve le bloc :

```ts
  const marquerVuTemplate = useCallback((templateId: string) => {
    setState((prev) =>
      prev
        ? { ...prev, catalogue: marquerVuFn(prev.catalogue, templateId) }
        : prev,
    );
  }, []);

  const marquerPossedeTemplate = useCallback((templateId: string) => {
    setState((prev) =>
      prev
        ? { ...prev, catalogue: marquerPossedeFn(prev.catalogue, templateId) }
        : prev,
    );
  }, []);
```

Remplace intégralement par :

```ts
  const marquerVuTemplate = useCallback((templateId: string) => {
    setState((prev) =>
      prev
        ? { ...prev, collection: marquerVuFn(prev.collection, templateId) }
        : prev,
    );
  }, []);

  const marquerDejaPossedeTemplate = useCallback((templateId: string) => {
    setState((prev) =>
      prev
        ? { ...prev, collection: marquerDejaPossedeFn(prev.collection, templateId) }
        : prev,
    );
  }, []);

  const donnerACollection = useCallback(
    (objetId: string): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: "Pas de partie." };
      const objet = current.inventaireJoueur.find((o) => o.id === objetId);
      if (!objet)
        return { ok: false, raison: "Objet introuvable dans l'inventaire." };
      if (objet.enRestauration)
        return { ok: false, raison: "Objet en cours de restauration." };

      setState((prev) => {
        if (!prev) return prev;
        const objetCourant = prev.inventaireJoueur.find((o) => o.id === objetId);
        if (!objetCourant) return prev;
        const { collection: nouvelleCollection, ancienne } = donnerObjetFn(
          prev.collection,
          objetCourant.templateId,
          objetCourant.etat,
          objetCourant.prixReferenceReel,
        );
        const nouvelInventaire = prev.inventaireJoueur.filter(
          (o) => o.id !== objetId,
        );
        // Si une donation était déjà présente, recréer l'objet dans l'inventaire.
        if (ancienne) {
          const tpl = getTemplate(objetCourant.templateId);
          if (tpl) {
            nouvelInventaire.push({
              id: crypto.randomUUID(),
              templateId: objetCourant.templateId,
              nom: tpl.nom,
              categorie: tpl.categorie,
              etat: ancienne.etat,
              prixReferenceReel: ancienne.valeur,
              rarete: tpl.rarete,
            });
          }
        }
        return {
          ...prev,
          inventaireJoueur: nouvelInventaire,
          collection: nouvelleCollection,
        };
      });
      return { ok: true };
    },
    [],
  );

  const retirerDeCollection = useCallback(
    (templateId: string): { ok: boolean; raison?: string } => {
      const current = stateRef.current;
      if (!current) return { ok: false, raison: "Pas de partie." };
      const tpl = getTemplate(templateId);
      if (!tpl) return { ok: false, raison: "Template inconnu." };

      setState((prev) => {
        if (!prev) return prev;
        const { collection: nouvelleCollection, ancienne } = retirerDonationFn(
          prev.collection,
          templateId,
        );
        if (!ancienne) return prev;
        return {
          ...prev,
          collection: nouvelleCollection,
          inventaireJoueur: [
            ...prev.inventaireJoueur,
            {
              id: crypto.randomUUID(),
              templateId,
              nom: tpl.nom,
              categorie: tpl.categorie,
              etat: ancienne.etat,
              prixReferenceReel: ancienne.valeur,
              rarete: tpl.rarete,
            },
          ],
        };
      });
      return { ok: true };
    },
    [],
  );
```

- [ ] **Step 6 : Exposer les nouvelles actions dans le `value`**

Trouve dans le `useMemo(() => ({ … }), [...])` les lignes :

```ts
      marquerVuTemplate,
      marquerPossedeTemplate,
```

Remplace les 2 par :

```ts
      marquerVuTemplate,
      marquerDejaPossedeTemplate,
      donnerACollection,
      retirerDeCollection,
```

Et idem dans le tableau de dépendances du useMemo (chercher `marquerVuTemplate, marquerPossedeTemplate` plus bas, remplacer par les 4 noms).

- [ ] **Step 7 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -30`
Expected: erreurs résiduelles uniquement dans `app/catalogue/page.tsx`, `app/qg/page.tsx`, `app/trophees/page.tsx`, `app/chiner/[brocanteId]/page.tsx` (appels obsolètes). Corrigés dans les tâches suivantes.

- [ ] **Step 8 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/context/GameContext.tsx
git commit -m "feat(context): migrate catalogue→collection, donnerACollection + retirerDeCollection actions"
```

---

## Task 5 : Réécrire les conditions de déblocage des 16 brocantes

**Files:**
- Modify: `src/data/brocantes.ts`

- [ ] **Step 1 : Réécrire les `conditionDeblocage` pour les 16 brocantes**

Édite `src/data/brocantes.ts`. Remplace les `conditionDeblocage` de chaque brocante par les valeurs suivantes (n'altérer que le champ `conditionDeblocage`, tout le reste de la brocante inchangé) :

**Tier 1 (5)** :
- `vide-grenier-quartier` : `{ type: "depart" }` (inchangé)
- `marche-aux-puces-dimanche` : `{ type: "valeurCollection", montant: 30 }`
- `bouquinerie-plein-air` : `{ type: "valeurCollectionCategorie", categorie: "Livres & Papeterie", montant: 20 }`
- `vide-dressing-centre` : `{ type: "valeurCollectionCategorie", categorie: "Mode", montant: 30 }`
- `brocante-club-jeux` : `{ type: "valeurCollectionCategorie", categorie: "Jeux & Loisirs", montant: 40 }`

**Tier 2 (5)** :
- `deballage-collectionneurs` :
  ```ts
  { type: "ET", conditions: [
    { type: "valeurCollection", montant: 250 },
    { type: "brocantesDebloquees", tier: 1, nombre: 3 },
  ]}
  ```
- `marche-saint-ouen` :
  ```ts
  { type: "ET", conditions: [
    { type: "valeurCollection", montant: 350 },
    { type: "valeurCollectionCategorie", categorie: "Maison", montant: 100 },
  ]}
  ```
- `disquaire-independant` :
  ```ts
  { type: "ET", conditions: [
    { type: "valeurCollection", montant: 300 },
    { type: "valeurCollectionCategorie", categorie: "Musique", montant: 100 },
  ]}
  ```
- `atelier-bricoleur` :
  ```ts
  { type: "ET", conditions: [
    { type: "valeurCollection", montant: 280 },
    { type: "valeurCollectionCategorie", categorie: "Bricolage", montant: 80 },
  ]}
  ```
- `marche-antiquaires-bibelots` :
  ```ts
  { type: "ET", conditions: [
    { type: "valeurCollection", montant: 350 },
    { type: "valeurCollectionCategorie", categorie: "Maison", montant: 130 },
  ]}
  ```

**Tier 3 (5)** :
- `foire-chatou` :
  ```ts
  { type: "ET", conditions: [
    { type: "valeurCollection", montant: 1000 },
    { type: "brocantesDebloquees", tier: 2, nombre: 5 },
  ]}
  ```
- `salon-grands-collectionneurs` :
  ```ts
  { type: "ET", conditions: [
    { type: "valeurCollection", montant: 1500 },
    { type: "brocantesDebloquees", tier: 2, nombre: 5 },
  ]}
  ```
- `drouot-mode-couture` :
  ```ts
  { type: "ET", conditions: [
    { type: "valeurCollection", montant: 1200 },
    { type: "valeurCollectionCategorie", categorie: "Mode", montant: 400 },
  ]}
  ```
- `salon-violon-ancien` :
  ```ts
  { type: "ET", conditions: [
    { type: "valeurCollection", montant: 1400 },
    { type: "valeurCollectionCategorie", categorie: "Musique", montant: 500 },
  ]}
  ```
- `galerie-arts-decoratifs` :
  ```ts
  { type: "ET", conditions: [
    { type: "valeurCollection", montant: 1600 },
    { type: "valeurCollectionCategorie", categorie: "Maison", montant: 600 },
  ]}
  ```

**Boss 4⭐** :
- `salon-antiquaires-drouot` :
  ```ts
  { type: "ET", conditions: [
    { type: "valeurCollection", montant: 5000 },
    { type: "brocantesDebloquees", tier: 3, nombre: 5 },
  ]}
  ```

- [ ] **Step 2 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: pas de nouvelle erreur dans `brocantes.ts`. Erreurs résiduelles dans les pages.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/data/brocantes.ts
git commit -m "balance(brocantes): unlock conditions based on collection value"
```

---

## Task 6 : Hooks chiner / vente — renommer `marquerPossedeTemplate`

**Files:**
- Modify: `src/app/chiner/[brocanteId]/page.tsx`
- Modify: `src/app/vitrine/[brocanteId]/journee/page.tsx` (si applicable)

- [ ] **Step 1 : Renommer dans la page chinage**

Édite `src/app/chiner/[brocanteId]/page.tsx`. Trouve dans la déstructuration `useGame()` :

```ts
    marquerVuTemplate,
    marquerPossedeTemplate,
```

Remplace par :

```ts
    marquerVuTemplate,
    marquerDejaPossedeTemplate,
```

Puis trouve l'appel `marquerPossedeTemplate(...)` (dans la fonction `handleAcheter`). Remplace par `marquerDejaPossedeTemplate(...)` (mêmes arguments).

- [ ] **Step 2 : Vérifier vitrine/journee**

Vérifie que `src/app/vitrine/[brocanteId]/journee/page.tsx` n'appelle pas `marquerPossedeTemplate`. Si c'est le cas, applique le même remplacement.

Run: `grep -n "marquerPossedeTemplate" "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc/src/app/vitrine/[brocanteId]/journee/page.tsx"`
Expected: pas de match (cette page n'appelle que `marquerVuTemplate` historiquement). Si match, renommer.

- [ ] **Step 3 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -20`
Expected: erreurs résiduelles uniquement dans les pages /catalogue, /qg, /trophees.

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/chiner/vide-grenier-quartier`
Expected: 200.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/chiner/\[brocanteId\]/page.tsx
git commit -m "feat(chiner): rename marquerPossedeTemplate to marquerDejaPossedeTemplate"
```

---

## Task 7 : Composant `CollectionGrid` (avec donation picker)

**Files:**
- Create: `src/components/CollectionGrid.tsx`

- [ ] **Step 1 : Créer le composant**

Crée `src/components/CollectionGrid.tsx` :

```tsx
"use client";

import { useState } from "react";
import type { CollectionSlot, Objet } from "@/types/game";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { RareteBadge } from "@/components/ui/RareteBadge";
import { EtatBadge } from "@/components/ui/EtatBadge";
import { Button } from "@/components/ui/Button";

export interface CollectionGridProps {
  slots: CollectionSlot[];
  /** Objets de l'inventaire (utilisé pour proposer une donation). */
  inventaire: Objet[];
  /** Action : donner cet objet à la collection. */
  onDonner: (objetId: string) => void;
  /** Action : retirer la donation actuelle du slot. */
  onRetirer: (templateId: string) => void;
}

export function CollectionGrid({
  slots,
  inventaire,
  onDonner,
  onRetirer,
}: CollectionGridProps) {
  const [pickerForTemplate, setPickerForTemplate] = useState<string | null>(
    null,
  );

  if (slots.length === 0) {
    return (
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          color: "var(--ink-500)",
          textAlign: "center",
          padding: "24px 0",
          margin: 0,
        }}
      >
        Aucune pièce répertoriée dans cette catégorie.
      </p>
    );
  }

  const candidatsPourPicker = pickerForTemplate
    ? inventaire.filter(
        (o) => o.templateId === pickerForTemplate && !o.enRestauration,
      )
    : [];

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {slots.map((s) => (
          <SlotCard
            key={s.templateId}
            slot={s}
            inventaireMatch={inventaire.filter(
              (o) => o.templateId === s.templateId && !o.enRestauration,
            )}
            onOuvrirPicker={() => setPickerForTemplate(s.templateId)}
            onRetirer={() => onRetirer(s.templateId)}
          />
        ))}
      </div>
      {pickerForTemplate && (
        <DonationPicker
          templateId={pickerForTemplate}
          candidats={candidatsPourPicker}
          onSelect={(objetId) => {
            onDonner(objetId);
            setPickerForTemplate(null);
          }}
          onClose={() => setPickerForTemplate(null)}
        />
      )}
    </>
  );
}

function SlotCard({
  slot,
  inventaireMatch,
  onOuvrirPicker,
  onRetirer,
}: {
  slot: CollectionSlot;
  inventaireMatch: Objet[];
  onOuvrirPicker: () => void;
  onRetirer: () => void;
}) {
  const decouvert = slot.vu;
  const possedeUnJour = slot.dejaPossede;
  const donne = slot.donation !== null;
  const peutDonner = inventaireMatch.length > 0;

  const filtre = donne
    ? "none"
    : possedeUnJour
      ? "grayscale(1) opacity(0.7)"
      : decouvert
        ? "grayscale(1) opacity(0.55)"
        : "brightness(0) opacity(0.45)";

  return (
    <article
      style={{
        position: "relative",
        background: donne ? "var(--paper-200)" : "var(--paper-300)",
        border: `1px solid ${donne ? "var(--brass-500)" : "var(--paper-500)"}`,
        padding: 12,
        opacity: !decouvert && !possedeUnJour ? 0.75 : 1,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 3,
          border: "1px solid rgba(138,106,38,0.3)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          aspectRatio: "4 / 3",
          background:
            "linear-gradient(135deg, var(--paper-500) 0%, var(--brass-700) 100%)",
          border: "1px solid var(--brass-700)",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--brass-100)",
          filter: filtre,
        }}
      >
        <CategorieIcon categorie={slot.categorie} size={42} strokeWidth={1.25} />
      </div>

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: donne ? "var(--forest-800)" : "var(--ink-500)",
          lineHeight: 1.2,
          minHeight: 30,
        }}
      >
        {decouvert || possedeUnJour ? slot.nom : "???"}
      </div>

      <div
        style={{
          marginTop: 8,
          paddingTop: 7,
          borderTop: "1px dotted var(--paper-500)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {decouvert || possedeUnJour ? (
            <RareteBadge rarete={slot.rarete} />
          ) : (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.16em",
                color: "var(--ink-300)",
              }}
            >
              · ? ·
            </span>
          )}
          {donne && slot.donation && (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--forest-700)",
              }}
              title={`Valeur de la donation (état ${slot.donation.etat})`}
            >
              {slot.donation.valeur}
              <span style={{ fontSize: 10, color: "var(--brass-700)" }}>€</span>
            </span>
          )}
        </div>

        {donne && slot.donation && (
          <div
            style={{ display: "flex", justifyContent: "space-between", gap: 6 }}
          >
            <EtatBadge etat={slot.donation.etat} />
            <Button size="sm" variant="ghost" onClick={onRetirer}>
              Retirer
            </Button>
          </div>
        )}

        {!donne && (decouvert || possedeUnJour) && (
          <Button
            size="sm"
            variant={peutDonner ? "primary" : "secondary"}
            disabled={!peutDonner}
            onClick={onOuvrirPicker}
            title={
              peutDonner
                ? "Donner un objet de votre inventaire à la collection"
                : "Aucun objet correspondant dans votre inventaire"
            }
          >
            {peutDonner ? `Donner (${inventaireMatch.length})` : "Aucun en stock"}
          </Button>
        )}

        {!donne && !decouvert && !possedeUnJour && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-300)",
              fontStyle: "italic",
            }}
          >
            à découvrir
          </span>
        )}
      </div>
    </article>
  );
}

function DonationPicker({
  templateId,
  candidats,
  onSelect,
  onClose,
}: {
  templateId: string;
  candidats: Objet[];
  onSelect: (objetId: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,30,22,0.65)",
        display: "grid",
        placeItems: "center",
        padding: 20,
        zIndex: 60,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 500,
          width: "100%",
          background: "var(--paper-100)",
          border: "1px solid var(--brass-500)",
          padding: 20,
          boxShadow:
            "inset 0 0 0 4px var(--paper-100), inset 0 0 0 5px var(--brass-500), 0 24px 60px rgba(15,30,22,0.5)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          — choisir l'exemplaire à donner —
        </div>
        {candidats.length === 0 ? (
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--ink-500)",
              textAlign: "center",
              padding: "16px 0",
              margin: 0,
            }}
          >
            Aucun exemplaire en stock pour ce slot ({templateId}).
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "8px 0",
              maxHeight: 360,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {candidats.map((o) => (
              <li
                key={o.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: 10,
                  background: "var(--paper-300)",
                  border: "1px solid var(--brass-700)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                    }}
                  >
                    {o.nom}
                  </span>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <EtatBadge etat={o.etat} />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--brass-700)",
                      }}
                    >
                      valeur {o.prixReferenceReel} €
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="primary" onClick={() => onSelect(o.id)}>
                  Donner
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ textAlign: "right", marginTop: 10 }}>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -20`
Expected: pas de nouvelle erreur dans `CollectionGrid.tsx`.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/components/CollectionGrid.tsx
git commit -m "feat(ui): CollectionGrid + donation picker modal"
```

---

## Task 8 : Page `/collection` (et suppression `/catalogue`)

**Files:**
- Create: `src/app/collection/page.tsx`
- Delete: `src/app/catalogue/page.tsx`
- Delete: `src/components/CatalogueGrid.tsx`
- Delete: `src/lib/catalogue.ts`

- [ ] **Step 1 : Créer la page `/collection`**

Crée `src/app/collection/page.tsx` :

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CollectionGrid } from "@/components/CollectionGrid";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { Panel } from "@/components/ui/Panel";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import {
  progressionCategorie,
  progressionGlobale,
} from "@/lib/collection";
import type { CategorieObjet } from "@/types/game";

export default function CollectionPage() {
  const router = useRouter();
  const { state, isHydrated, donnerACollection, retirerDeCollection } = useGame();
  const [catSelectionnee, setCatSelectionnee] = useState<CategorieObjet>(
    CATEGORIES[0],
  );
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const global = useMemo(
    () => (state ? progressionGlobale(state.collection) : null),
    [state],
  );
  const courante = useMemo(
    () => (state ? progressionCategorie(state.collection, catSelectionnee) : null),
    [state, catSelectionnee],
  );

  if (!isHydrated || !state || !global || !courante) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — ouverture de la collection…
      </main>
    );
  }

  const slots = state.collection[catSelectionnee] ?? [];

  const handleDonner = (objetId: string) => {
    const res = donnerACollection(objetId);
    setFlash(res.ok ? "Donation enregistrée." : res.raison ?? "Erreur.");
  };
  const handleRetirer = (templateId: string) => {
    const res = retirerDeCollection(templateId);
    setFlash(res.ok ? "Objet retiré et remis en inventaire." : res.raison ?? "Erreur.");
  };

  return (
    <div
      className="bg-paper-grain"
      style={{ minHeight: "100dvh", padding: "20px 28px 32px" }}
    >
      <StatusBar jour={state.jourActuel} budget={state.budget} />

      <div
        style={{
          maxWidth: 1280,
          margin: "32px auto 0",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
          }}
        >
          <div>
            <div className="eyebrow">— collection personnelle —</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--forest-800)",
                margin: "4px 0 8px",
                lineHeight: 1.1,
              }}
            >
              Collection
            </h1>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                fontSize: 16,
                margin: 0,
                maxWidth: 540,
              }}
            >
              Donnez des objets de votre inventaire pour garnir vos slots. La valeur
              totale (état pondéré) débloque les brocantes prestigieuses.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
              }}
            >
              Valeur totale :{" "}
              <span style={{ color: "var(--forest-800)" }}>
                {global.valeur.toLocaleString("fr-FR")} €
              </span>
              {" · "}
              {global.donnees} / {global.total} slot
              {global.total > 1 ? "s" : ""}
            </div>
            <Link href="/qg">
              <Button variant="ghost" size="sm">
                ← Retour au QG
              </Button>
            </Link>
          </div>
        </header>

        <DecoDivider />

        {flash && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--paper-100)",
              border: "1px solid var(--brass-500)",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--ink-700)",
              textAlign: "center",
            }}
          >
            {flash}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
            gap: 10,
          }}
        >
          {CATEGORIES.map((c) => {
            const p = progressionCategorie(state.collection, c);
            const selected = c === catSelectionnee;
            return (
              <button
                key={c}
                onClick={() => setCatSelectionnee(c)}
                style={{
                  padding: "10px 12px",
                  background: selected ? "var(--forest-800)" : "var(--paper-100)",
                  border: `1px solid ${selected ? "var(--brass-500)" : "var(--brass-700)"}`,
                  boxShadow: selected
                    ? "inset 0 0 0 3px var(--forest-800), inset 0 0 0 4px var(--brass-500)"
                    : "0 2px 0 var(--paper-400)",
                  color: selected ? "var(--paper-200)" : "var(--ink-700)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CategorieIcon
                  categorie={c}
                  size={16}
                  color={selected ? "var(--brass-300)" : "var(--brass-700)"}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: selected ? "var(--brass-300)" : "var(--forest-800)",
                      lineHeight: 1.1,
                    }}
                  >
                    {c}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      letterSpacing: "0.12em",
                      color: selected ? "var(--brass-300)" : "var(--brass-700)",
                    }}
                  >
                    {p.donnees} / {p.total} · {p.valeur} €
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Panel
          eyebrow={`— ${catSelectionnee} —`}
          title={`${courante.donnees} / ${courante.total} · ${courante.valeur.toLocaleString("fr-FR")} €`}
        >
          <CollectionGrid
            slots={slots}
            inventaire={state.inventaireJoueur}
            onDonner={handleDonner}
            onRetirer={handleRetirer}
          />
        </Panel>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Supprimer l'ancienne page `/catalogue`, le composant `CatalogueGrid` et la lib `catalogue.ts`**

Run :
```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
rm src/app/catalogue/page.tsx
rmdir src/app/catalogue
rm src/components/CatalogueGrid.tsx
rm src/lib/catalogue.ts
```

- [ ] **Step 3 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -20`
Expected: erreurs résiduelles uniquement dans `app/qg/page.tsx` (encore `progressionGlobale` depuis `@/lib/catalogue`) et `app/trophees/page.tsx` (idem) — corrigées en Task 9.

Run: `curl -s -o /dev/null -w "/collection %{http_code}\n" http://localhost:3000/collection`
Expected: 200.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add -A src/app/collection src/app/catalogue src/components/CatalogueGrid.tsx src/lib/catalogue.ts
git commit -m "feat(collection): /collection page + remove obsolete /catalogue, CatalogueGrid, catalogue.ts"
```

---

## Task 9 : QG + Trophées — pointer sur `@/lib/collection` et terminologie

**Files:**
- Modify: `src/app/qg/page.tsx`
- Modify: `src/app/trophees/page.tsx`

- [ ] **Step 1 : Adapter le QG**

Édite `src/app/qg/page.tsx`.

**1a** — Remplace l'import :
```ts
import { progressionGlobale } from "@/lib/catalogue";
```
par :
```ts
import { progressionGlobale } from "@/lib/collection";
```

**1b** — Trouve l'IIFE qui calcule `cat` (le total catalogue), il devient :

```tsx
          {(() => {
            const col = progressionGlobale(state.collection);
            return (
              <Panel
                eyebrow="— collection personnelle —"
                title={`Collection · ${col.donnees} / ${col.total}`}
              >
```

**1c** — Dans le `<p>` à l'intérieur de ce panneau, remplace les références à `cat.possedees` / `cat.total` / `cat.vues` par `col.donnees` / `col.total` / `col.vues`. Le texte devient :

```tsx
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    color: "var(--ink-500)",
                    fontSize: 14,
                    margin: "0 0 12px",
                    textAlign: "center",
                  }}
                >
                  {col.donnees === 0
                    ? "Aucun objet dans votre collection. Donnez vos premières pièces depuis l'inventaire."
                    : col.donnees === col.total
                      ? "Collection complète — bravo !"
                      : `${col.donnees} pièce${col.donnees > 1 ? "s" : ""} donnée${col.donnees > 1 ? "s" : ""}, valeur ${col.valeur.toLocaleString("fr-FR")} €.`}
                </p>
```

**1d** — Le compteur ajouté en Phase 5 (`Brocantes : N / 16 débloquées`) reste tel quel.

**1e** — Le bouton « Ouvrir le catalogue » devient « Ouvrir la collection » et pointe vers `/collection` :

```tsx
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => router.push("/collection")}
                  >
                    Ouvrir la collection
                  </Button>
```

- [ ] **Step 2 : Adapter la page Trophées**

Édite `src/app/trophees/page.tsx`.

**2a** — Remplace l'import :
```ts
import {
  catalogueComplete,
  progressionCategorie,
  progressionGlobale,
} from "@/lib/catalogue";
```
par :
```ts
import {
  collectionComplete,
  progressionCategorie,
  progressionGlobale,
} from "@/lib/collection";
```

**2b** — Remplace toutes les références à `state.catalogue` par `state.collection`. Run :
```bash
grep -n "state.catalogue" "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc/src/app/trophees/page.tsx"
```
Pour chaque occurrence, remplace `state.catalogue` par `state.collection`.

**2c** — Remplace `catalogueComplete(...)` par `collectionComplete(...)`. Run :
```bash
grep -n "catalogueComplete" "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc/src/app/trophees/page.tsx"
```
Remplace les occurrences.

**2d** — Trouve les références à `p.possedees` (ProgressionCategorie utilise désormais `donnees` au lieu de `possedees`). Run :
```bash
grep -n "possedees" "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc/src/app/trophees/page.tsx"
```
Pour chaque occurrence, remplace `possedees` par `donnees`.

**2e** — La détection des « légendaires possédés » (rendu dans le panneau Vitrine personnelle) actuellement utilise `e.possede > 0` ou similaire. Adapte-la pour utiliser `e.donation !== null` :

Run :
```bash
grep -n "possede > 0\|e.possede" "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc/src/app/trophees/page.tsx"
```
Pour chaque match, remplace par `e.donation !== null` (le slot est considéré « possédé » seulement quand il y a une donation active dans la collection).

- [ ] **Step 3 : Type-check + curl complet**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: 0 erreur.

Run :
```bash
for r in /qg /chiner /vitrine /trophees /collection /atelier /competences /historique; do
  curl -s -o /dev/null -w "$r %{http_code}\n" "http://localhost:3000$r"
done
```
Expected : tous 200.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/qg/page.tsx src/app/trophees/page.tsx
git commit -m "feat(ui): qg + trophees use @/lib/collection, link to /collection, terminology"
```

---

## Vérification finale (manuelle)

1. **Nouvelle partie** : QG affiche désormais panneau « Collection · 0 / 41 ». Pas de bouton vers /catalogue (route morte). Bouton « Ouvrir la collection » mène à `/collection`.
2. **`/collection`** : header affiche `Valeur totale : 0 € · 0 / 41 slots`. Tabs par catégorie avec valeur de la cat en mono laiton. Tous les slots sont en silhouette `???` au départ.
3. **Donation** : chiner un objet → de retour au QG, ouvrir `/collection`. Le slot correspondant est grisé avec son nom + bouton « Donner (1) ». Cliquer ouvre un picker modal qui liste l'exemplaire. Donner → slot passe en couleur avec EtatBadge + valeur. L'objet a quitté l'inventaire (vérifier au QG).
4. **Retirer** : sur un slot rempli, bouton « Retirer » → l'objet revient en inventaire (id frais), slot redevient grisé.
5. **Déblocage brocante** : la brocante `marche-aux-puces-dimanche` (1⭐ générale 2) requiert maintenant 30 € de valeur de collection. Donner une pièce vinyle Pink Floyd (prixRefBase 45 × état) suffit potentiellement à débloquer.
6. **Migration save** : une sauvegarde Phase 5 charge sans crash. Les `vu` sont préservés, `possede > 0` → `dejaPossede=true`. Les donations sont vides (le joueur doit explicitement donner).
7. **Trophée ultime** : déclenché à 100 % de slots donnés (et non plus juste "possédés une fois").

---

## Self-Review (notes intégrées)

- **Spec coverage** :
  - Renommage catalogue → collection : Tasks 1, 2, 4, 8, 9. ✓
  - Donation manuelle + valeur : Tasks 2, 4, 7. ✓
  - Conditions de déblocage refondues : Tasks 1, 3, 5. ✓
  - UI : Tasks 7, 8, 9. ✓
  - Hooks chinage/vente renommés : Task 6. ✓
- **Placeholders** : aucun TBD. Tout le code est complet.
- **Type consistency** : `CollectionSlot` partout, `donation: {etat, valeur} | null`, signatures `donnerObjet(collection, templateId, etat, valeur)` → `ResultatDonation { collection, ancienne }`, exposed via context `donnerACollection(objetId) → { ok, raison? }`.
- **Migration robustesse** : l'IIFE de migration utilise `as unknown as ...` pour lire l'ancien `loaded.catalogue` car le type GameState ne le contient plus. C'est explicite, isolé à la migration.
- **Caveat — valeur d'une donation après donation** : la `donation.valeur` est gelée à l'instant de la donation (pas recalculée). Si plus tard les facteurs d'état changent ou la balance évolue, les vieilles donations gardent leur valeur historique. C'est intentionnel (cohérent avec un "musée" qui acte les apports passés).
- **Caveat — restauration des donations** : un objet donné ne peut plus être restauré (il n'est plus en inventaire). Le joueur peut le retirer pour le restaurer, puis le redonner. Acceptable.
- **Caveat — bouton « ouvrir le catalogue » ailleurs** : si d'autres pages référencent l'ancienne route `/catalogue`, elles enverront un 404. Vérifier avec :
  ```bash
  grep -rn "/catalogue" "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc/src" | grep -v "node_modules"
  ```
  À cette étape du projet, seule QG référence `/catalogue` → adressé en Task 9.
