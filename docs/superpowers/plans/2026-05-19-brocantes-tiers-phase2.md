# Phase 2 — Brocantes Tiers + Pool Exclusif Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactoriser les brocantes en un système à 3 tiers (⭐, ⭐⭐, ⭐⭐⭐) avec spécialisation par catégorie, pools d'exclusifs par brocante (les légendaires migrent dans ces pools), et conditions de déblocage étendues (quotas catégoriels + dépendances inter-brocantes).

**Architecture:** On étend les types `Brocante` (tier, etoiles, specialisation?, poolExclusif) et `ConditionDeblocage` (ventesCategorie, brocantesDebloquees, ET). Le tirage chinage devient « pool commun générique + petite chance de tirer depuis `brocante.poolExclusif` ». Les légendaires sortent du pool générique et migrent dans les poolExclusif des brocantes 3⭐. La page `/chiner` regroupe visuellement les brocantes par tier et résout les conditions par tier croissant.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind v4, `lucide-react` (déjà installé).

**Vérification:** pas de framework de test. Chaque tâche se vérifie par `npx tsc --noEmit` + `curl` sur les routes impactées (dev server au port 3000).

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/types/game.ts` | Modifier | Étendre `ConditionDeblocage` (+ 3 variantes : ventesCategorie, brocantesDebloquees, ET). Étendre `Brocante` (+ tier, etoiles, specialisation?, poolExclusif). |
| `src/lib/deblocage.ts` | Modifier | Adapter `descriptionCondition` et `estDebloquee` aux nouveaux types. Compter les ventes catégorielles depuis l'historique. |
| `src/data/objetTemplates.ts` | Modifier | Renommer / repenser `POOL_COMPLET` : créer `POOL_COMMUN_GENERIQUE` qui n'inclut PAS les légendaires. Les légendaires ne sont accessibles QUE via les poolExclusif des brocantes. |
| `src/data/brocantes.ts` | Réécrire | 15 brocantes définies (5 par tier × 3 tiers), avec composition 2 générales + 3 spécialisées par tier. Les 6 légendaires sont placés dans les poolExclusif des brocantes 3⭐. |
| `src/lib/chine.ts` | Modifier | `genererSession(taille, tendances, brocante)` — tirage hybride pool générique + chance d'exclusif depuis la brocante. |
| `src/app/chiner/[brocanteId]/page.tsx` | Modifier | Passer la `brocante` à `genererSession`. |
| `src/components/BrocanteCard.tsx` | Modifier | Afficher les étoiles + l'icône de spécialisation. |
| `src/app/chiner/page.tsx` | Modifier | Calculer les brocantes débloquées par tier (pour résoudre les conditions inter-brocantes), grouper visuellement par tier. |

---

## Task 1 : Types — Brocante étendu

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1 : Étendre `ConditionDeblocage` et `Brocante`**

Édite `src/types/game.ts`. Trouve la définition existante de `ConditionDeblocage` et `Brocante` et remplace par :

```ts
export type ConditionDeblocage =
  | { type: "depart" }
  | { type: "jour"; jour: number }
  | { type: "budget"; montant: number }
  | { type: "ventesCategorie"; categorie: CategorieObjet; nombre: number }
  | { type: "brocantesDebloquees"; tier: 1 | 2 | 3; nombre: number }
  | { type: "ET"; conditions: ConditionDeblocage[] };

export type BrocanteTier = 1 | 2 | 3;

export interface Brocante {
  id: string;
  nom: string;
  description: string;
  ambiance: string;
  taillePool: number;
  tier: BrocanteTier;
  /** Nombre d'étoiles (équivalent au tier — gardé séparé pour lisibilité UI). */
  etoiles: 1 | 2 | 3;
  /** Si présent, la brocante est spécialisée dans cette catégorie. */
  specialisation?: CategorieObjet;
  /** Pool d'objets exclusifs à cette brocante (rares et légendaires propres). */
  poolExclusif: string[]; // liste de templateId
  conditionDeblocage: ConditionDeblocage;
}
```

Note : `poolExclusif` est une liste de `templateId` (pas de templates inlinés) pour éviter les références circulaires et garder les brocantes légères. Les templates sont résolus à la volée.

- [ ] **Step 2 : Vérifier la compilation**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -40`
Expected: erreurs dans `brocantes.ts` (champs `tier`/`etoiles`/`poolExclusif` manquants) et `deblocage.ts` (switch non exhaustif sur ConditionDeblocage). C'est attendu — corrigé dans les tâches suivantes.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/types/game.ts
git commit -m "feat(types): Brocante tiers/specialisation/poolExclusif + conditions etendues"
```

---

## Task 2 : Lib deblocage — nouveaux types de condition

**Files:**
- Modify: `src/lib/deblocage.ts`

- [ ] **Step 1 : Réécrire `descriptionCondition` et `estDebloquee`**

Remplace intégralement le contenu de `src/lib/deblocage.ts` par :

```ts
import type {
  Brocante,
  CategorieObjet,
  ConditionDeblocage,
  GameState,
} from "@/types/game";

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

/**
 * Évalue si une brocante est débloquée.
 * - Pour les conditions `brocantesDebloquees`, on a besoin de connaître les brocantes
 *   déjà débloquées d'un tier inférieur (set d'IDs).
 * - Les brocantes sont évaluées par tier croissant : tier 1 d'abord, puis tier 2, etc.
 */
export function estDebloquee(
  brocante: Brocante,
  state: Pick<GameState, "jourActuel" | "budget" | "historique">,
  brocantesDebloqueesParTier?: Map<1 | 2 | 3, Set<string>>,
): boolean {
  return evaluerCondition(
    brocante.conditionDeblocage,
    state,
    brocantesDebloqueesParTier,
  );
}

function evaluerCondition(
  c: ConditionDeblocage,
  state: Pick<GameState, "jourActuel" | "budget" | "historique">,
  brocantesDebloqueesParTier?: Map<1 | 2 | 3, Set<string>>,
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
    case "ET":
      return c.conditions.every((cc) =>
        evaluerCondition(cc, state, brocantesDebloqueesParTier),
      );
  }
}
```

- [ ] **Step 2 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -30`
Expected: erreurs résiduelles uniquement dans `brocantes.ts` (champs manquants — tâches suivantes).

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/lib/deblocage.ts
git commit -m "feat(deblocage): support ventesCategorie + brocantesDebloquees + ET conditions"
```

---

## Task 3 : Pool commun générique (légendaires hors pool global)

**Files:**
- Modify: `src/data/objetTemplates.ts`

- [ ] **Step 1 : Renommer le pool en `POOL_COMMUN_GENERIQUE` et exclure les légendaires**

Édite `src/data/objetTemplates.ts`. À la fin du fichier, remplace la section :

```ts
import { LEGENDAIRES } from "@/data/legendaires";

/** Pool complet utilisé par le tirage (communs + rares + légendaires). */
export const POOL_COMPLET: ObjetTemplate[] = [...OBJET_TEMPLATES, ...LEGENDAIRES];
```

par :

```ts
/**
 * Pool générique utilisé par le tirage chinage : tous les communs et rares,
 * tirables dans n'importe quelle brocante.
 * Les LÉGENDAIRES n'y sont PAS — ils n'apparaissent que via les `poolExclusif`
 * des brocantes 3⭐.
 */
export const POOL_COMMUN_GENERIQUE: ObjetTemplate[] = OBJET_TEMPLATES;
```

- [ ] **Step 2 : Helper pour résoudre un templateId vers un template (commun OU légendaire)**

Ajoute à la fin du même fichier :

```ts
import { LEGENDAIRES } from "@/data/legendaires";

const ALL_TEMPLATES: ObjetTemplate[] = [...OBJET_TEMPLATES, ...LEGENDAIRES];

/** Résout un templateId vers son template (incluant les légendaires). */
export function getTemplate(templateId: string): ObjetTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.templateId === templateId);
}
```

- [ ] **Step 3 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -30`
Expected: erreur dans `chine.ts` car `POOL_COMPLET` n'existe plus. Corrigé en Task 5.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/data/objetTemplates.ts
git commit -m "feat(data): split POOL_COMMUN_GENERIQUE (legendaires excluded) + getTemplate helper"
```

---

## Task 4 : Catalogue des 15 brocantes

**Files:**
- Modify: `src/data/brocantes.ts`

- [ ] **Step 1 : Réécrire avec les 15 brocantes (5 par tier)**

Remplace intégralement le contenu de `src/data/brocantes.ts` par :

```ts
import type { Brocante } from "@/types/game";

export const BROCANTES: Brocante[] = [
  // ============================================================
  // TIER 1 — 5 brocantes (2 générales + 3 spécialisées)
  // ============================================================
  {
    id: "vide-grenier-quartier",
    nom: "Vide-grenier du quartier",
    description:
      "Quelques tables dépliées sur la place. Petits prix, peu de pépites, mais on doit bien commencer quelque part.",
    ambiance: "Familial",
    tier: 1,
    etoiles: 1,
    taillePool: 6,
    poolExclusif: [],
    conditionDeblocage: { type: "depart" },
  },
  {
    id: "marche-aux-puces-dimanche",
    nom: "Marché aux puces du dimanche",
    description:
      "Le grand rendez-vous des chineurs. Plus de monde, plus de choix, des vendeurs plus malins.",
    ambiance: "Dense",
    tier: 1,
    etoiles: 1,
    taillePool: 8,
    poolExclusif: [],
    conditionDeblocage: { type: "jour", jour: 5 },
  },
  {
    id: "bouquinerie-plein-air",
    nom: "Bouquinerie de plein air",
    description:
      "Des cartons de livres alignés sur des tréteaux. Les amateurs s'y attardent des heures.",
    ambiance: "Studieux",
    tier: 1,
    etoiles: 1,
    specialisation: "Livres & Papeterie",
    taillePool: 7,
    poolExclusif: [],
    conditionDeblocage: { type: "budget", montant: 200 },
  },
  {
    id: "vide-dressing-centre",
    nom: "Vide-dressing du centre",
    description:
      "Penderies déballées sur des portants. Vintage seventies, sacs cabossés, broches oubliées.",
    ambiance: "Coloré",
    tier: 1,
    etoiles: 1,
    specialisation: "Mode",
    taillePool: 7,
    poolExclusif: [],
    conditionDeblocage: { type: "budget", montant: 250 },
  },
  {
    id: "brocante-club-jeux",
    nom: "Brocante du club de jeux",
    description:
      "Cartouches NES dans des bacs, boîtes de plateaux empilées. Les nostalgiques s'y croisent.",
    ambiance: "Geek",
    tier: 1,
    etoiles: 1,
    specialisation: "Jeux & Loisirs",
    taillePool: 7,
    poolExclusif: [],
    conditionDeblocage: { type: "budget", montant: 300 },
  },

  // ============================================================
  // TIER 2 — 5 brocantes (2 générales + 3 spécialisées)
  // ============================================================
  {
    id: "deballage-collectionneurs",
    nom: "Déballage des collectionneurs",
    description:
      "Réservé aux portefeuilles bien garnis. Les pièces rares y circulent, mais à quel prix ?",
    ambiance: "Sélect",
    tier: 2,
    etoiles: 2,
    taillePool: 9,
    poolExclusif: [],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 1000 },
        { type: "brocantesDebloquees", tier: 1, nombre: 3 },
      ],
    },
  },
  {
    id: "marche-saint-ouen",
    nom: "Marché Saint-Ouen",
    description:
      "Le mythique marché aux puces. Antiquaires patentés, prix qui piquent, pépites possibles.",
    ambiance: "Historique",
    tier: 2,
    etoiles: 2,
    taillePool: 10,
    poolExclusif: [],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 1500 },
        { type: "ventesCategorie", categorie: "Maison", nombre: 5 },
      ],
    },
  },
  {
    id: "disquaire-independant",
    nom: "Disquaire indépendant",
    description:
      "Une cave sombre, des bacs à perte de vue, un patron qui connaît chaque pochette.",
    ambiance: "Vinyle",
    tier: 2,
    etoiles: 2,
    specialisation: "Musique",
    taillePool: 8,
    poolExclusif: [],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 1200 },
        { type: "ventesCategorie", categorie: "Musique", nombre: 3 },
      ],
    },
  },
  {
    id: "atelier-bricoleur",
    nom: "Atelier du bricoleur",
    description:
      "Vieux outils en pagaille, scies japonaises et tournevis d'avant-guerre.",
    ambiance: "Sciure",
    tier: 2,
    etoiles: 2,
    specialisation: "Bricolage",
    taillePool: 8,
    poolExclusif: [],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 1000 },
        { type: "ventesCategorie", categorie: "Bricolage", nombre: 3 },
      ],
    },
  },
  {
    id: "marche-antiquaires-bibelots",
    nom: "Marché des antiquaires (bibelots)",
    description:
      "Vitrines fermées à clé, vendeurs qui sortent les pièces avec des gants.",
    ambiance: "Précieux",
    tier: 2,
    etoiles: 2,
    specialisation: "Maison",
    taillePool: 9,
    poolExclusif: [],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 1400 },
        { type: "ventesCategorie", categorie: "Maison", nombre: 5 },
      ],
    },
  },

  // ============================================================
  // TIER 3 — 5 brocantes (2 générales + 3 spécialisées)
  // Les LÉGENDAIRES vivent ici (poolExclusif).
  // ============================================================
  {
    id: "foire-chatou",
    nom: "Foire de Chatou",
    description:
      "Deux fois par an, l'Île des Impressionnistes accueille la fine fleur du métier.",
    ambiance: "Mondain",
    tier: 3,
    etoiles: 3,
    taillePool: 10,
    // Légendaires des catégories non couvertes par les spé 3⭐ : Jeux + Livres
    poolExclusif: [
      "leg.jx.cartouche_stadium_events",
      "leg.lv.miserables_originale",
    ],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 3000 },
        { type: "brocantesDebloquees", tier: 2, nombre: 5 },
      ],
    },
  },
  {
    id: "salon-grands-collectionneurs",
    nom: "Salon des grands collectionneurs",
    description:
      "Cercle fermé, sur invitation. Les pièces les plus rares y trouvent leur écrin.",
    ambiance: "Confidentiel",
    tier: 3,
    etoiles: 3,
    taillePool: 9,
    // Légendaire Bricolage (le 6e, non couvert par spé 3⭐)
    poolExclusif: ["leg.br.scie_japonaise_edo"],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 4500 },
        { type: "brocantesDebloquees", tier: 2, nombre: 5 },
      ],
    },
  },
  {
    id: "drouot-mode-couture",
    nom: "Drouot — Mode et Couture",
    description:
      "Ventes thématiques où passent les grandes pièces : robes signées, sacs iconiques.",
    ambiance: "Couture",
    tier: 3,
    etoiles: 3,
    specialisation: "Mode",
    taillePool: 8,
    poolExclusif: ["leg.mo.robe_chanel_1925"],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 3500 },
        { type: "ventesCategorie", categorie: "Mode", nombre: 10 },
      ],
    },
  },
  {
    id: "salon-violon-ancien",
    nom: "Salon du violon ancien",
    description:
      "Luthiers, conservateurs, virtuoses. Le silence y vaut de l'or, les instruments aussi.",
    ambiance: "Lutherie",
    tier: 3,
    etoiles: 3,
    specialisation: "Musique",
    taillePool: 7,
    poolExclusif: ["leg.mus.stradivarius"],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 4000 },
        { type: "ventesCategorie", categorie: "Musique", nombre: 10 },
      ],
    },
  },
  {
    id: "galerie-arts-decoratifs",
    nom: "Galerie des arts décoratifs",
    description:
      "Faïence, cristal, dorures. Les pièces sont signées, les prix font tousser.",
    ambiance: "Galerie",
    tier: 3,
    etoiles: 3,
    specialisation: "Maison",
    taillePool: 8,
    poolExclusif: ["leg.ma.oeuf_faberge"],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 5000 },
        { type: "ventesCategorie", categorie: "Maison", nombre: 15 },
      ],
    },
  },
];

export function getBrocanteById(id: string): Brocante | undefined {
  return BROCANTES.find((b) => b.id === id);
}

export function brocantesParTier(tier: 1 | 2 | 3): Brocante[] {
  return BROCANTES.filter((b) => b.tier === tier);
}
```

- [ ] **Step 2 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -30`
Expected: l'erreur résiduelle est dans `chine.ts` (import `POOL_COMPLET` cassé). Corrigé en Task 5.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/data/brocantes.ts
git commit -m "feat(brocantes): define 15 brocantes (5x tier 1/2/3) with poolExclusif for legendaires"
```

---

## Task 5 : Tirage par brocante (pool générique + chance d'exclusif)

**Files:**
- Modify: `src/lib/chine.ts`

- [ ] **Step 1 : Mettre à jour `genererSession` pour prendre une brocante**

Édite `src/lib/chine.ts`. Trouve l'import existant :

```ts
import {
  POOL_COMPLET,
  type ObjetTemplate,
} from "@/data/objetTemplates";
```

Remplace par :

```ts
import {
  POOL_COMMUN_GENERIQUE,
  getTemplate,
  type ObjetTemplate,
} from "@/data/objetTemplates";
import type { Brocante } from "@/types/game";
```

(Si l'import `Brocante` est déjà présent via `@/types/game`, ajoute-le simplement à la liste des imports existants.)

- [ ] **Step 2 : Ajouter une constante de chance d'exclusif et refondre `genererSession`**

Trouve la fonction `genererSession` et la définition `POIDS_RARETE`. Remplace `genererSession` par :

```ts
/** Probabilité par item de tenter un tirage dans le poolExclusif de la brocante. */
const CHANCE_EXCLUSIF = 0.18;

export function genererSession(
  taille: number,
  tendances: readonly Tendance[] = [],
  brocante?: Brocante,
): ObjetEnVente[] {
  const items: ObjetEnVente[] = [];
  const dejaTires = new Set<string>();
  let attempts = 0;
  const maxAttempts = taille * 6;

  // Résout les templates exclusifs de la brocante (en évinçant les ids inconnus)
  const exclusifs: ObjetTemplate[] = (brocante?.poolExclusif ?? [])
    .map((id) => getTemplate(id))
    .filter((t): t is ObjetTemplate => t !== undefined);

  while (items.length < taille && attempts < maxAttempts) {
    attempts += 1;
    const tenterExclusif =
      exclusifs.length > 0 && Math.random() < CHANCE_EXCLUSIF;
    const pool = tenterExclusif ? exclusifs : POOL_COMMUN_GENERIQUE;
    const t = tirerTemplatePondere(pool);
    // Pas de doublon pour rares et légendaires
    if (t.rarete !== "commun" && dejaTires.has(t.templateId)) continue;
    dejaTires.add(t.templateId);
    items.push(instancier(t, tendances));
  }
  return items;
}
```

- [ ] **Step 3 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -20`
Expected: pas d'erreur dans `chine.ts`. Les erreurs restantes (s'il y en a) sont dans `app/chiner/[brocanteId]/page.tsx` qui appelle encore l'ancienne signature à 2 args — corrigé en Task 6.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/lib/chine.ts
git commit -m "feat(chine): hybrid draw — POOL_COMMUN_GENERIQUE + brocante poolExclusif"
```

---

## Task 6 : Page chiner session — passer la brocante au tirage

**Files:**
- Modify: `src/app/chiner/[brocanteId]/page.tsx`

- [ ] **Step 1 : Passer `brocante` à `genererSession`**

Édite `src/app/chiner/[brocanteId]/page.tsx`. Trouve la ligne :

```ts
      const session = genererSession(brocante.taillePool, state.tendances);
```

Remplace par :

```ts
      const session = genererSession(brocante.taillePool, state.tendances, brocante);
```

- [ ] **Step 2 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: 0 erreur.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/chiner/vide-grenier-quartier`
Expected: 200.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/chiner/\[brocanteId\]/page.tsx
git commit -m "feat(chiner): pass brocante to genererSession for exclusif pool draw"
```

---

## Task 7 : BrocanteCard — étoiles et icône de spécialisation

**Files:**
- Modify: `src/components/BrocanteCard.tsx`

- [ ] **Step 1 : Importer `CategorieIcon` et `Star`**

Édite `src/components/BrocanteCard.tsx`. Ajoute en haut, après les imports existants :

```ts
import { Star } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
```

- [ ] **Step 2 : Ajouter un composant pour les étoiles**

Juste avant la définition de `BrocanteCard`, ajoute :

```ts
function Etoiles({ nombre }: { nombre: number }) {
  return (
    <span
      style={{ display: "inline-flex", gap: 2, alignItems: "center" }}
      aria-label={`${nombre} étoile${nombre > 1 ? "s" : ""}`}
    >
      {Array.from({ length: nombre }).map((_, i) => (
        <Star
          key={i}
          size={12}
          fill="var(--brass-500)"
          color="var(--brass-700)"
          strokeWidth={1}
        />
      ))}
    </span>
  );
}
```

- [ ] **Step 3 : Afficher les étoiles + la spécialisation dans le header**

Dans `BrocanteCard`, trouve le bloc :

```tsx
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {brocante.nom}
        </h3>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
            whiteSpace: "nowrap",
          }}
        >
          {brocante.ambiance}
        </span>
      </header>
```

Remplace-le par :

```tsx
      <header
        style={{
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
            gap: 8,
          }}
        >
          <Etoiles nombre={brocante.etoiles} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              whiteSpace: "nowrap",
            }}
          >
            {brocante.ambiance}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {brocante.specialisation && (
            <CategorieIcon
              categorie={brocante.specialisation}
              size={16}
              color="var(--brass-700)"
            />
          )}
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              lineHeight: 1.2,
              margin: 0,
              flex: 1,
            }}
          >
            {brocante.nom}
          </h3>
        </div>
      </header>
```

- [ ] **Step 4 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: 0 erreur.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/chiner`
Expected: 200.

- [ ] **Step 5 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/components/BrocanteCard.tsx
git commit -m "feat(brocante-card): show stars and specialisation icon"
```

---

## Task 8 : Page /chiner — groupement par tier et résolution des conditions

**Files:**
- Modify: `src/app/chiner/page.tsx`

- [ ] **Step 1 : Importer les helpers**

Édite `src/app/chiner/page.tsx`. Vérifie/ajoute les imports nécessaires :

```ts
import { BROCANTES, brocantesParTier } from "@/data/brocantes";
import { estDebloquee } from "@/lib/deblocage";
```

(Remplace l'import existant `BROCANTES` si nécessaire — assure-toi que `brocantesParTier` est bien ajouté.)

- [ ] **Step 2 : Calculer les brocantes débloquées par tier**

Dans le composant `ChinerListePage`, trouve le `return` qui rend la grille. Juste avant le `return`, ajoute le calcul :

```ts
  // Résolution des conditions par tier croissant : tier 1 d'abord, puis 2, puis 3
  const debloqueesParTier = new Map<1 | 2 | 3, Set<string>>([
    [1, new Set<string>()],
    [2, new Set<string>()],
    [3, new Set<string>()],
  ]);
  for (const tier of [1, 2, 3] as const) {
    for (const b of brocantesParTier(tier)) {
      if (estDebloquee(b, state, debloqueesParTier)) {
        debloqueesParTier.get(tier)!.add(b.id);
      }
    }
  }
```

- [ ] **Step 3 : Remplacer la grille unique par 3 sections par tier**

Trouve le bloc existant qui rend la grille :

```tsx
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {BROCANTES.map((b) => (
            <BrocanteCard
              key={b.id}
              brocante={b}
              debloquee={estDebloquee(b, state)}
            />
          ))}
        </div>
```

Remplace-le par :

```tsx
        {([1, 2, 3] as const).map((tier) => {
          const brocantesTier = brocantesParTier(tier);
          return (
            <section
              key={tier}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <h2
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                  margin: 0,
                  paddingBottom: 6,
                  borderBottom: "1px solid var(--brass-700)",
                }}
              >
                <span style={{ color: "var(--brass-500)" }}>
                  {"★".repeat(tier)}
                </span>
                <span>
                  {tier === 1
                    ? "Brocantes de quartier"
                    : tier === 2
                      ? "Marchés réputés"
                      : "Salons et galeries"}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    color: "var(--brass-700)",
                  }}
                >
                  {debloqueesParTier.get(tier)!.size} / {brocantesTier.length} débloquées
                </span>
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 18,
                }}
              >
                {brocantesTier.map((b) => (
                  <BrocanteCard
                    key={b.id}
                    brocante={b}
                    debloquee={debloqueesParTier.get(tier)!.has(b.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
```

Remplace aussi le parent du `DecoDivider` + grille pour augmenter le `gap` à 28 si nécessaire (pas requis si déjà espacé). Vérifie que le wrapper parent permet bien d'afficher 3 sections empilées.

- [ ] **Step 4 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: 0 erreur.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/chiner`
Expected: 200.

- [ ] **Step 5 : Vérifier les autres routes**

Run:
```
for r in /qg /chiner /chiner/vide-grenier-quartier /vitrine /vitrine/journee /atelier /competences /historique /catalogue; do
  curl -s -o /dev/null -w "$r %{http_code}\n" "http://localhost:3000$r"
done
```
Expected: tous 200.

- [ ] **Step 6 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/chiner/page.tsx
git commit -m "feat(chiner-list): group brocantes by tier, resolve extended unlock conditions"
```

---

## Vérification finale (manuelle)

1. **`/chiner`** affiche 3 sections (1⭐ / 2⭐ / 3⭐) avec un badge `N / 5 débloquées` à droite. La 1ʳᵉ brocante 1⭐ « Vide-grenier du quartier » est ouverte d'entrée. Les autres sont grisées avec leur condition décrite (jour, budget, ventes catégorielles, brocantes débloquées).

2. **BrocanteCard** affiche : étoiles laiton en haut à gauche, icône de catégorie + nom (les 9 spé montrent leur icône Lucide ; les 6 générales n'en montrent pas).

3. **Tirage chinage** : en entrant dans « Vide-grenier du quartier » (poolExclusif vide), tu vois uniquement des objets du pool commun (rares possibles, mais pas de légendaires). En entrant dans « Galerie des arts décoratifs » (3⭐ Maison), tu as ~18 % de chance par item de tirer un œuf de Fabergé.

4. **Pas de fuite des légendaires** : les Stradivarius/Fabergé/etc. ne peuvent plus apparaître dans une brocante 1⭐ ou 2⭐. Test : visite plusieurs brocantes de tier inférieur — aucune légendaire ne doit apparaître.

5. **Conditions de déblocage** : crée plusieurs sessions et ventes pour vérifier que les conditions `ventesCategorie` et `brocantesDebloquees` se déclenchent correctement (jouer ~10 jours en focalisant sur la Maison devrait débloquer Marché Saint-Ouen).

---

## Self-Review (notes intégrées)

- **Spec coverage** :
  - Section 2 « Les 16 brocantes » → Tasks 1, 4 (15 brocantes ; le boss arrive en Phase 4).
  - Section 2 « Spécialisations » → Task 4 (9 spé couvrent les 6 cat, Musique/Maison ont 2 spé sur 2 tiers).
  - Section 2 « Conditions de déblocage » → Tasks 1, 2, 4 (variants ventesCategorie / brocantesDebloquees / ET).
  - Section 2 « Vendeurs : tolérance progressive » → **non couvert ici**, à inclure dans une itération ultérieure de Phase 2 (à noter dans le caveat).
  - Section 3 « Pool par brocante » → Tasks 3, 5 (POOL_COMMUN_GENERIQUE + poolExclusif).
  - Section 3 « Légendaires hors pool général » → Tasks 3, 4 (légendaires uniquement dans poolExclusif des 3⭐).
- **Placeholders** : aucun TBD/TODO. Tout le code est complet.
- **Type consistency** : `BrocanteTier = 1 | 2 | 3`, `etoiles: 1 | 2 | 3`, `poolExclusif: string[]` cohérent partout. `tier` et `etoiles` sont volontairement séparés (tier pour la logique, etoiles pour l'affichage — toujours égaux pour la Phase 2).
- **Scope** : focused sur les brocantes + tirage. Pas de refactor vitrine (Phase 3) ni de boss (Phase 4).

## Caveats (à traiter dans une itération ultérieure)

- La **tolérance progressive des vendeurs** par tier (3⭐ négocient plus dur, prévu dans le spec) n'est pas câblée ici. Le `tolerance` actuel (0.7-0.9) reste le même partout. Sera ajouté en Phase 2.1 ou Phase 3.
- Les **rares** ne sont pas encore attachés à des brocantes spécifiques — ils restent dans le pool commun et peuvent tomber partout. Le spec n'exige pas qu'ils soient exclusifs, mais une affinité (« plus probable dans la brocante thématique ») pourrait être ajoutée.
- Les brocantes **2⭐ et 3⭐ générales** ont une `poolExclusif` qui contient juste les légendaires "orphelins" (Stadium Events, Misérables, Scie Edo). Elles pourraient mériter quelques rares exclusifs propres pour les distinguer des spé.
