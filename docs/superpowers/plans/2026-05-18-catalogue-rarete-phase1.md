# Phase 1 — Catalogue + Rareté Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pose les fondations « Catalogue + Rareté » du spec progression : chaque template porte un `templateId` stable et une `rarete`, le tirage en chinage est pondéré par rareté, un catalogue type Pokédex (vu / possédé) est suivi dans le state et affichable sur une page `/catalogue`.

**Architecture:** On enrichit les types côté `Objet` et `ObjetTemplate`, on étend `GameState` avec un `catalogue: Record<CategorieObjet, CatalogueEntree[]>` indexé sur le `templateId` du template. Les actions du context (`marquerVu`, `marquerPossede`) sont appelées depuis les pages chinage/vente. La page `/catalogue` rend chaque entrée en 3 états visuels (silhouette/grisé/couleur).

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind v4, `lucide-react` (icônes catégorie déjà installées), persistance `localStorage` (déjà en place).

**Vérification :** pas de framework de test dans le projet. Chaque tâche se vérifie par `npx tsc --noEmit` (type-check) + lancement manuel du dev server + `curl` sur la route impactée.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/types/game.ts` | Modifier | Ajouter `Rarete`, `templateId` à `Objet`, `CatalogueEntree`, champ `catalogue` dans `GameState`. |
| `src/data/objetTemplates.ts` | Modifier | Ajouter `templateId` + `rarete` à chaque template, slug stable. |
| `src/data/legendaires.ts` | Créer | Liste séparée de templates Légendaires (1 par catégorie pour cette phase). |
| `src/lib/catalogue.ts` | Créer | Helpers : `initCatalogue`, `marquerVu`, `marquerPossede`, `progressionCategorie`, `progressionGlobale`. |
| `src/lib/chine.ts` | Modifier | Pondération du tirage par rareté ; transmet `templateId` à l'objet généré. |
| `src/context/GameContext.tsx` | Modifier | Initialisation du catalogue, migration pour anciennes sauvegardes, actions `marquerVuTemplate` / `marquerPossedeTemplate`. |
| `src/app/chiner/[brocanteId]/page.tsx` | Modifier | Marquer vu à l'apparition d'items, marquer possédé à l'achat. |
| `src/app/vitrine/journee/page.tsx` | Modifier | Marquer vu sur le panier du client. |
| `src/components/ui/RareteBadge.tsx` | Créer | Petit badge visuel (Commun/Rare/Légendaire) en cohérence Art Déco. |
| `src/components/CatalogueGrid.tsx` | Créer | Composant grille par catégorie avec 3 états visuels. |
| `src/app/catalogue/page.tsx` | Créer | Page Pokédex avec tabs catégorie. |
| `src/app/qg/page.tsx` | Modifier | Nouveau compteur « Catalogue : X / N » + bouton vers `/catalogue`. |
| `src/components/InventoryGrid.tsx` | Modifier | Afficher la `RareteBadge` sur la carte d'inventaire. |

---

## Task 1 : Types — Rareté et catalogue

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1 : Ajouter le type Rarete et étendre Objet**

Édite `src/types/game.ts` pour ajouter le type `Rarete`, le champ `templateId` sur `Objet`, et le type `CatalogueEntree`. Trouver la définition existante de `Objet` (autour de la ligne avec `export interface Objet`) et y ajouter `templateId` et `rarete`. Ajouter aussi en bas du fichier (ou près des types existants liés) :

```ts
export type Rarete = "commun" | "rare" | "legendaire";

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

Dans `interface Objet`, ajouter :

```ts
  templateId: string;
  rarete: Rarete;
```

Dans `interface GameState`, ajouter :

```ts
  catalogue: Record<CategorieObjet, CatalogueEntree[]>;
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -40`
Expected: nombreuses erreurs dans les fichiers consommateurs (`objetTemplates.ts`, `chine.ts`, `starterInventory.ts`, `GameContext.tsx`). C'est attendu — les tâches suivantes les corrigent.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/types/game.ts
git commit -m "feat(types): add Rarete and CatalogueEntree, templateId+rarete on Objet"
```

---

## Task 2 : Templates — templateId stable et rareté

**Files:**
- Modify: `src/data/objetTemplates.ts`

- [ ] **Step 1 : Étendre ObjetTemplate et ajouter `templateId` + `rarete` à tous les templates**

Réécris entièrement `src/data/objetTemplates.ts` :

```ts
import type { CategorieObjet, Rarete } from "@/types/game";

export interface ObjetTemplate {
  templateId: string;
  nom: string;
  categorie: CategorieObjet;
  rarete: Rarete;
  /** Valeur de référence si "Très bon" */
  prixRefBase: number;
  /** Si vrai, ne peut être possédé qu'une fois par partie. */
  unique?: boolean;
}

export const OBJET_TEMPLATES: ObjetTemplate[] = [
  // Musique
  { templateId: "mus.vinyle_pink_floyd_wall", nom: "Vinyle Pink Floyd 'The Wall'", categorie: "Musique", rarete: "commun", prixRefBase: 45 },
  { templateId: "mus.vinyle_telephone_dure_limite", nom: "Vinyle Téléphone 'Dure Limite'", categorie: "Musique", rarete: "commun", prixRefBase: 20 },
  { templateId: "mus.33tours_jazz_inconnu", nom: "33 tours de jazz inconnu", categorie: "Musique", rarete: "commun", prixRefBase: 8 },
  { templateId: "mus.cd_nirvana_in_utero", nom: "Coffret CD Nirvana 'In Utero'", categorie: "Musique", rarete: "commun", prixRefBase: 18 },
  { templateId: "mus.harmonica_hohner", nom: "Harmonica chromatique Hohner", categorie: "Musique", rarete: "commun", prixRefBase: 35 },
  { templateId: "mus.guitare_classique_ancienne", nom: "Vieille guitare classique", categorie: "Musique", rarete: "rare", prixRefBase: 120 },

  // Jeux & Loisirs
  { templateId: "jx.cartouche_mario", nom: "Cartouche Super Mario Bros", categorie: "Jeux & Loisirs", rarete: "commun", prixRefBase: 80 },
  { templateId: "jx.manette_megadrive", nom: "Manette Megadrive", categorie: "Jeux & Loisirs", rarete: "commun", prixRefBase: 35 },
  { templateId: "jx.gameboy_color_violette", nom: "Game Boy Color violette", categorie: "Jeux & Loisirs", rarete: "commun", prixRefBase: 90 },
  { templateId: "jx.ps1_crash_bandicoot", nom: "Jeu PS1 'Crash Bandicoot'", categorie: "Jeux & Loisirs", rarete: "commun", prixRefBase: 40 },
  { templateId: "jx.risk_1992", nom: "Boîte 'Risk' édition 1992", categorie: "Jeux & Loisirs", rarete: "commun", prixRefBase: 25 },
  { templateId: "jx.cartes_pokemon_1ere_edition", nom: "Lot cartes Pokémon 1ère édition", categorie: "Jeux & Loisirs", rarete: "rare", prixRefBase: 220 },
  { templateId: "jx.figurine_star_wars_kenner_78", nom: "Figurine Star Wars Kenner 1978", categorie: "Jeux & Loisirs", rarete: "rare", prixRefBase: 110 },

  // Livres & Papeterie
  { templateId: "lv.monte_cristo", nom: "Roman 'Le Comte de Monte-Cristo'", categorie: "Livres & Papeterie", rarete: "commun", prixRefBase: 10 },
  { templateId: "lv.tintin_lune", nom: "BD Tintin 'On a marché sur la Lune'", categorie: "Livres & Papeterie", rarete: "commun", prixRefBase: 22 },
  { templateId: "lv.paris_match_70s", nom: "Lot de magazines Paris-Match 70s", categorie: "Livres & Papeterie", rarete: "commun", prixRefBase: 14 },
  { templateId: "lv.cartes_postales_anciennes", nom: "Cartes postales anciennes (boîte)", categorie: "Livres & Papeterie", rarete: "commun", prixRefBase: 9 },

  // Mode
  { templateId: "mo.veste_jean_delavee", nom: "Veste en jean délavée", categorie: "Mode", rarete: "commun", prixRefBase: 15 },
  { templateId: "mo.blouson_cuir_vintage", nom: "Blouson cuir vintage", categorie: "Mode", rarete: "commun", prixRefBase: 60 },
  { templateId: "mo.sac_lancel", nom: "Sac à main en cuir Lancel", categorie: "Mode", rarete: "rare", prixRefBase: 110 },
  { templateId: "mo.broche_emaillee_artdeco", nom: "Broche émaillée Art Déco", categorie: "Mode", rarete: "rare", prixRefBase: 60 },
  { templateId: "mo.chapeau_feutre_50s", nom: "Chapeau de feutre années 50", categorie: "Mode", rarete: "commun", prixRefBase: 22 },

  // Maison
  { templateId: "ma.figurine_porcelaine", nom: "Petite figurine en porcelaine", categorie: "Maison", rarete: "commun", prixRefBase: 12 },
  { templateId: "ma.boite_musique_ancienne", nom: "Boîte à musique ancienne", categorie: "Maison", rarete: "rare", prixRefBase: 55 },
  { templateId: "ma.statuette_africaine_bois", nom: "Statuette africaine en bois", categorie: "Maison", rarete: "commun", prixRefBase: 25 },
  { templateId: "ma.service_the_faience", nom: "Service à thé en faïence", categorie: "Maison", rarete: "commun", prixRefBase: 30 },
  { templateId: "ma.verres_a_pied_lot6", nom: "Lot de 6 verres à pied", categorie: "Maison", rarete: "commun", prixRefBase: 18 },
  { templateId: "ma.lampe_bureau_artdeco", nom: "Lampe de bureau Art Déco", categorie: "Maison", rarete: "rare", prixRefBase: 130 },
  { templateId: "ma.miroir_dore_fronton", nom: "Miroir doré à fronton", categorie: "Maison", rarete: "rare", prixRefBase: 140 },
  { templateId: "ma.tabouret_bois_patine", nom: "Tabouret en bois patiné", categorie: "Maison", rarete: "commun", prixRefBase: 28 },

  // Bricolage
  { templateId: "br.marteau_menuisier", nom: "Marteau de menuisier", categorie: "Bricolage", rarete: "commun", prixRefBase: 8 },
  { templateId: "br.boite_outils_complete", nom: "Boîte à outils complète", categorie: "Bricolage", rarete: "commun", prixRefBase: 45 },
  { templateId: "br.etabli_pliant_ancien", nom: "Établi pliant ancien", categorie: "Bricolage", rarete: "commun", prixRefBase: 55 },
  { templateId: "br.pince_etirer_cuivre", nom: "Pince à étirer en cuivre", categorie: "Bricolage", rarete: "commun", prixRefBase: 12 },
];
```

Note : on a converti l'ancien `Lot cartes Pokémon 1ère édition` (prix 220) et `Lampe Art Déco` en `rare`, et la `Vieille guitare classique` passe de `commun` à `rare` avec prix relevé. C'est volontaire pour répartir les rares.

- [ ] **Step 2 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -30`
Expected: erreurs sur `chine.ts` (qui construit un `Objet` sans `templateId`/`rarete`) et `starterInventory.ts`. Les tâches suivantes les corrigent.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/data/objetTemplates.ts
git commit -m "feat(data): add templateId + rarete to every object template"
```

---

## Task 3 : Templates légendaires (1 par catégorie)

**Files:**
- Create: `src/data/legendaires.ts`

- [ ] **Step 1 : Créer le fichier des légendaires**

Crée `src/data/legendaires.ts` :

```ts
import type { ObjetTemplate } from "@/data/objetTemplates";

/**
 * Templates légendaires inspirés du réel. 1 par catégorie pour la Phase 1.
 * Ces objets ont une probabilité de tirage très faible (~2 %).
 */
export const LEGENDAIRES: ObjetTemplate[] = [
  { templateId: "leg.mus.stradivarius", nom: "Violon Stradivarius (1715)", categorie: "Musique", rarete: "legendaire", prixRefBase: 4500 },
  { templateId: "leg.jx.cartouche_stadium_events", nom: "Cartouche NES 'Stadium Events'", categorie: "Jeux & Loisirs", rarete: "legendaire", prixRefBase: 3800 },
  { templateId: "leg.lv.miserables_originale", nom: "Édition originale 'Les Misérables' (1862)", categorie: "Livres & Papeterie", rarete: "legendaire", prixRefBase: 2200 },
  { templateId: "leg.mo.robe_chanel_1925", nom: "Robe Chanel n°5 originale (1925)", categorie: "Mode", rarete: "legendaire", prixRefBase: 3000 },
  { templateId: "leg.ma.oeuf_faberge", nom: "Œuf de Fabergé (réplique impériale)", categorie: "Maison", rarete: "legendaire", prixRefBase: 5500 },
  { templateId: "leg.br.scie_japonaise_edo", nom: "Scie japonaise période Edo", categorie: "Bricolage", rarete: "legendaire", prixRefBase: 800 },
];
```

- [ ] **Step 2 : Ré-exporter les légendaires depuis le module templates**

Édite `src/data/objetTemplates.ts` pour ajouter en fin de fichier :

```ts
import { LEGENDAIRES } from "@/data/legendaires";

/** Pool complet utilisé par le tirage (communs + rares + légendaires). */
export const POOL_COMPLET: ObjetTemplate[] = [...OBJET_TEMPLATES, ...LEGENDAIRES];
```

- [ ] **Step 3 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -20`
Expected: pas d'erreurs nouvelles, les anciennes erreurs subsistent.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/data/legendaires.ts src/data/objetTemplates.ts
git commit -m "feat(data): add 6 legendary templates (Stradivarius, Fabergé, etc.)"
```

---

## Task 4 : Tirage pondéré par rareté

**Files:**
- Modify: `src/lib/chine.ts`

- [ ] **Step 1 : Mettre à jour `genererSession` et `instancier` pour utiliser le pool complet et la pondération**

Trouve dans `src/lib/chine.ts` la fonction `instancier` et `genererSession`. Remplace les imports et logique :

```ts
import type { CategorieObjet, EtatObjet, ObjetEnVente, Rarete, Tendance } from "@/types/game";
import {
  OBJET_TEMPLATES,
  LEGENDAIRES,
  POOL_COMPLET,
  type ObjetTemplate,
} from "@/data/objetTemplates";
```

Note : `LEGENDAIRES` est ré-exporté depuis `objetTemplates.ts` via le ré-export ajouté à Task 3.

Si `LEGENDAIRES` n'est pas exporté directement par `objetTemplates.ts`, importe-le séparément :

```ts
import { OBJET_TEMPLATES, POOL_COMPLET, type ObjetTemplate } from "@/data/objetTemplates";
import { LEGENDAIRES } from "@/data/legendaires";
```

Garde l'import de `modificateurTendance` existant.

Remplace `instancier` pour propager `templateId` et `rarete` :

```ts
function instancier(
  template: ObjetTemplate,
  tendances: readonly Tendance[],
): ObjetEnVente {
  const etat = pickRandom(ETATS);
  const prixReferenceReel = Math.max(
    1,
    Math.round(template.prixRefBase * FACTEUR_ETAT[etat]),
  );
  const facteurVendeur = 0.6 + Math.random() * 0.8;
  const modTend = modificateurTendance(template.categorie, tendances);
  const prixVendeur = Math.max(
    1,
    Math.round(prixReferenceReel * facteurVendeur * modTend),
  );
  const tolerance = TOLERANCE_MIN + Math.random() * (TOLERANCE_MAX - TOLERANCE_MIN);
  const prixMinAccept = Math.max(1, Math.round(prixVendeur * tolerance));

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
  };
}
```

Ajoute une fonction de tirage pondéré juste au-dessus de `genererSession` :

```ts
const POIDS_RARETE: Record<Rarete, number> = {
  commun: 88,
  rare: 10,
  legendaire: 2,
};

function tirerTemplatePondere(pool: readonly ObjetTemplate[]): ObjetTemplate {
  // Somme des poids
  const total = pool.reduce((s, t) => s + POIDS_RARETE[t.rarete], 0);
  let r = Math.random() * total;
  for (const t of pool) {
    r -= POIDS_RARETE[t.rarete];
    if (r <= 0) return t;
  }
  return pool[pool.length - 1];
}
```

Remplace `genererSession` pour utiliser le pool complet avec pondération :

```ts
export function genererSession(
  taille: number,
  tendances: readonly Tendance[] = [],
): ObjetEnVente[] {
  // Pour la Phase 1, on tire `taille` objets indépendamment du pool complet,
  // pondérés par rareté. Les doublons sont possibles dans une même session
  // pour les communs uniquement.
  const items: ObjetEnVente[] = [];
  const dejaTires = new Set<string>();
  let attempts = 0;
  while (items.length < taille && attempts < taille * 5) {
    attempts += 1;
    const t = tirerTemplatePondere(POOL_COMPLET);
    if (t.rarete !== "commun" && dejaTires.has(t.templateId)) continue;
    dejaTires.add(t.templateId);
    items.push(instancier(t, tendances));
  }
  return items;
}
```

- [ ] **Step 2 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -30`
Expected: erreurs résiduelles uniquement sur `starterInventory.ts` et `GameContext.tsx` (à corriger plus tard).

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/lib/chine.ts
git commit -m "feat(chine): rarity-weighted draw, propagate templateId+rarete on Objet"
```

---

## Task 5 : Starter inventory aligné sur les templates

**Files:**
- Modify: `src/data/starterInventory.ts`

- [ ] **Step 1 : Réécrire starterInventory pour respecter le nouveau shape `Objet`**

Remplace le contenu de `src/data/starterInventory.ts` par :

```ts
import type { Objet } from "@/types/game";

export function createStarterInventory(): Objet[] {
  return [
    {
      id: crypto.randomUUID(),
      templateId: "starter.fer_a_repasser",
      nom: "Vieux fer à repasser",
      categorie: "Maison",
      prixReferenceReel: 8,
      etat: "Mauvais",
      rarete: "commun",
    },
    {
      id: crypto.randomUUID(),
      templateId: "starter.assiette_decorative",
      nom: "Assiette décorative",
      categorie: "Maison",
      prixReferenceReel: 5,
      etat: "Bon",
      rarete: "commun",
    },
    {
      id: crypto.randomUUID(),
      templateId: "starter.lampe_chevet_ebrechee",
      nom: "Lampe de chevet ébréchée",
      categorie: "Maison",
      prixReferenceReel: 6,
      etat: "Mauvais",
      rarete: "commun",
    },
  ];
}
```

Note : les `templateId` `starter.*` sont volontairement distincts des templates du pool — ces objets de départ ne figurent pas dans le catalogue (ils ne représentent rien à collectionner).

- [ ] **Step 2 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -30`
Expected: erreurs résiduelles uniquement sur `GameContext.tsx` (nouvelle exigence `catalogue` dans GameState).

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/data/starterInventory.ts
git commit -m "feat(data): align starter inventory with new Objet shape"
```

---

## Task 6 : Lib catalogue (helpers purs)

**Files:**
- Create: `src/lib/catalogue.ts`

- [ ] **Step 1 : Créer le module avec ses helpers**

Crée `src/lib/catalogue.ts` :

```ts
import type {
  CategorieObjet,
  CatalogueEntree,
  GameState,
} from "@/types/game";
import { CATEGORIES } from "@/data/categories";
import { POOL_COMPLET } from "@/data/objetTemplates";

/**
 * Construit un catalogue initial (toutes entrées non vues, possede=0) à partir
 * du pool complet de templates. Une catégorie = un tableau d'entrées triées
 * par rareté puis par nom.
 */
export function initCatalogue(): Record<CategorieObjet, CatalogueEntree[]> {
  const ordre = { commun: 0, rare: 1, legendaire: 2 } as const;
  const cat: Record<CategorieObjet, CatalogueEntree[]> = {} as Record<
    CategorieObjet,
    CatalogueEntree[]
  >;
  for (const c of CATEGORIES) cat[c] = [];
  for (const t of POOL_COMPLET) {
    cat[t.categorie].push({
      templateId: t.templateId,
      nom: t.nom,
      categorie: t.categorie,
      rarete: t.rarete,
      vu: false,
      possede: 0,
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

/** Marque une entrée comme vue. Retourne un nouveau catalogue (immutable). */
export function marquerVuTemplate(
  catalogue: Record<CategorieObjet, CatalogueEntree[]>,
  templateId: string,
): Record<CategorieObjet, CatalogueEntree[]> {
  const next = { ...catalogue };
  for (const cat of Object.keys(next) as CategorieObjet[]) {
    const entrees = next[cat];
    const idx = entrees.findIndex((e) => e.templateId === templateId);
    if (idx >= 0 && !entrees[idx].vu) {
      next[cat] = [
        ...entrees.slice(0, idx),
        { ...entrees[idx], vu: true },
        ...entrees.slice(idx + 1),
      ];
      return next;
    }
  }
  return catalogue;
}

/** Incrémente le compteur de possessions (et marque vu). */
export function marquerPossedeTemplate(
  catalogue: Record<CategorieObjet, CatalogueEntree[]>,
  templateId: string,
): Record<CategorieObjet, CatalogueEntree[]> {
  const next = { ...catalogue };
  for (const cat of Object.keys(next) as CategorieObjet[]) {
    const entrees = next[cat];
    const idx = entrees.findIndex((e) => e.templateId === templateId);
    if (idx >= 0) {
      const e = entrees[idx];
      next[cat] = [
        ...entrees.slice(0, idx),
        { ...e, vu: true, possede: e.possede + 1 },
        ...entrees.slice(idx + 1),
      ];
      return next;
    }
  }
  return catalogue;
}

export interface ProgressionCategorie {
  categorie: CategorieObjet;
  total: number;
  vues: number;
  possedees: number;
}

export function progressionCategorie(
  catalogue: Record<CategorieObjet, CatalogueEntree[]>,
  cat: CategorieObjet,
): ProgressionCategorie {
  const entrees = catalogue[cat] ?? [];
  return {
    categorie: cat,
    total: entrees.length,
    vues: entrees.filter((e) => e.vu).length,
    possedees: entrees.filter((e) => e.possede > 0).length,
  };
}

export function progressionGlobale(
  catalogue: Record<CategorieObjet, CatalogueEntree[]>,
): { total: number; vues: number; possedees: number } {
  let total = 0;
  let vues = 0;
  let possedees = 0;
  for (const c of CATEGORIES) {
    const p = progressionCategorie(catalogue, c);
    total += p.total;
    vues += p.vues;
    possedees += p.possedees;
  }
  return { total, vues, possedees };
}

/** True si toutes les entrées du catalogue sont possédées au moins une fois. */
export function catalogueComplete(
  catalogue: Record<CategorieObjet, CatalogueEntree[]>,
): boolean {
  const p = progressionGlobale(catalogue);
  return p.possedees === p.total;
}
```

Note : `CATEGORIES` est exporté par `src/data/categories.ts` (déjà existant).

- [ ] **Step 2 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: pas de nouvelle erreur dans `catalogue.ts`.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/lib/catalogue.ts
git commit -m "feat(lib): catalogue helpers (init/marquer/progression)"
```

---

## Task 7 : GameContext — init + migration + actions

**Files:**
- Modify: `src/context/GameContext.tsx`

- [ ] **Step 1 : Imports**

Ajoute en haut de `src/context/GameContext.tsx`, à côté des autres imports `@/lib/*` et `@/data/*` :

```ts
import {
  initCatalogue,
  marquerPossedeTemplate as marquerPossedeFn,
  marquerVuTemplate as marquerVuFn,
} from "@/lib/catalogue";
```

- [ ] **Step 2 : Étendre l'interface `GameContextValue`**

Dans la déclaration de `GameContextValue`, ajoute deux actions (à côté de `enregistrerSession` par exemple) :

```ts
  marquerVuTemplate: (templateId: string) => void;
  marquerPossedeTemplate: (templateId: string) => void;
```

- [ ] **Step 3 : Initialiser le catalogue dans `nouvellePartie`**

Trouve la fonction `nouvellePartie` et ajoute le champ `catalogue` à l'objet initial passé à `setState` :

```ts
      catalogue: initCatalogue(),
```

(à insérer après `competencesDebloquees: []`).

- [ ] **Step 4 : Initialiser `catalogue` dans `migrerSauvegarde`**

Dans `migrerSauvegarde` (la fonction de migration), ajoute le champ `catalogue` dans l'objet retourné. Si `loaded.catalogue` est absent ou vide, génère un catalogue neuf et rejoue toutes les possessions actuelles dessus :

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
    for (const v of vitrine) {
      catalogue = marquerPossedeFn(catalogue, v.objet.templateId);
    }
  }
```

Puis ajoute `catalogue,` dans l'objet retourné (juste après `competencesDebloquees`).

- [ ] **Step 5 : Implémenter les actions context**

Ajoute, à côté des autres actions (par exemple après `enregistrerSession`) :

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

Et expose-les dans le `value` de `<GameContext.Provider>` en ajoutant `marquerVuTemplate` et `marquerPossedeTemplate` aux propriétés.

- [ ] **Step 6 : Migrer les objets dont le templateId est manquant**

Dans `migrerSauvegarde`, avant la section catalogue, ajoute un mapping fallback pour les vieilles sauvegardes où les `Objet` n'avaient pas de `templateId`/`rarete`. Modifie la construction de `inventaire` et `vitrine` ainsi :

```ts
  const inventaire = (loaded.inventaireJoueur ?? []).map((o) => ({
    ...o,
    categorie: migrerCategorie(o.categorie),
    etat: migrerEtat(o.etat),
    templateId: o.templateId ?? `legacy.${(o.nom ?? "objet").toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    rarete: o.rarete ?? "commun",
  }));

  const vitrine = (loaded.vitrine ?? []).map((v) => ({
    ...v,
    objet: {
      ...v.objet,
      categorie: migrerCategorie(v.objet.categorie),
      etat: migrerEtat(v.objet.etat),
      templateId:
        v.objet.templateId ??
        `legacy.${(v.objet.nom ?? "objet").toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      rarete: v.objet.rarete ?? "commun",
    },
  }));
```

- [ ] **Step 7 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -30`
Expected: pas d'erreur dans GameContext, ni dans aucun autre fichier.

- [ ] **Step 8 : Vérifier que les routes répondent toujours**

Run: `for r in /qg /chiner /vitrine /atelier /competences /historique; do curl -s -o /dev/null -w "$r %{http_code}\n" "http://localhost:3000$r"; done`
Expected: toutes les routes en 200.

- [ ] **Step 9 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/context/GameContext.tsx
git commit -m "feat(context): catalogue state, migration, marquerVu/Possede actions"
```

---

## Task 8 : Hook chinage — marquer vu + possédé

**Files:**
- Modify: `src/app/chiner/[brocanteId]/page.tsx`

- [ ] **Step 1 : Importer les actions context**

Dans la déstructuration `useGame()` au début de `SessionChinePage`, ajoute les deux nouvelles actions :

```ts
  const {
    state,
    isHydrated,
    ajouterObjet,
    ajusterBudget,
    avancerJour,
    enregistrerSession,
    gagnerXP,
    marquerVuTemplate,
    marquerPossedeTemplate,
  } = useGame();
```

- [ ] **Step 2 : Marquer vu à l'apparition de la session**

Dans le `useEffect` qui appelle `setItems(genererSession(...))` (au tout début), ajoute après le `setItems(...)` un appel à `marquerVuTemplate` pour chaque objet généré. Modifie le bloc ainsi :

```ts
    if (items === null) {
      if (!estDebloquee(brocante, state)) return router.replace("/chiner");
      const session = genererSession(brocante.taillePool, state.tendances);
      setItems(session);
      for (const it of session) {
        marquerVuTemplate(it.objet.templateId);
      }
    }
```

- [ ] **Step 3 : Marquer possédé à l'achat**

Trouve la fonction `handleAcheter` et ajoute un appel à `marquerPossedeTemplate` juste après `ajouterObjet(...)` :

```ts
    ajusterBudget(-it.prixVendeur);
    ajouterObjet({ ...it.objet, prixAchat: it.prixVendeur });
    marquerPossedeTemplate(it.objet.templateId);
    gagnerXPLocal(catTreeId(it.objet.categorie), XP_ACHAT_OBJET);
```

- [ ] **Step 4 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: 0 erreur.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/chiner/vide-grenier-quartier`
Expected: 200.

- [ ] **Step 5 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/chiner/\[brocanteId\]/page.tsx
git commit -m "feat(chiner): mark vu on session draw, possede on purchase"
```

---

## Task 9 : Hook vente — marquer vu sur panier client

**Files:**
- Modify: `src/app/vitrine/journee/page.tsx`

- [ ] **Step 1 : Importer l'action**

Dans la déstructuration `useGame()` au début de `VitrineJourneePage`, ajoute `marquerVuTemplate` :

```ts
  const {
    state,
    isHydrated,
    vendreDeVitrine,
    viderVitrine,
    avancerJour,
    enregistrerSession,
    gagnerXP,
    marquerVuTemplate,
  } = useGame();
```

- [ ] **Step 2 : Marquer vu chaque fois qu'un client se présente avec un panier**

Trouve dans le tick loop (le `setProchainClient` qui appelle `genererClientEvent`) l'endroit où l'événement client est créé. Modifie la branche où `ev` est défini :

```ts
          if (ev) {
            for (const p of ev.panier) {
              marquerVuTemplate(p.objet.templateId);
            }
            if (ev.fancy) setFancyClientApparu(true);
            setClientActuel(ev);
            setRevelationFaite(false);
            setContreOffre(Math.round((ev.prixDemande + ev.offreInitiale) / 2));
          }
```

- [ ] **Step 3 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: 0 erreur.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/vitrine/journee`
Expected: 200.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/vitrine/journee/page.tsx
git commit -m "feat(vente): mark vu on each client's basket items"
```

---

## Task 10 : Composant RareteBadge

**Files:**
- Create: `src/components/ui/RareteBadge.tsx`

- [ ] **Step 1 : Créer le composant**

Crée `src/components/ui/RareteBadge.tsx` :

```ts
import type { Rarete } from "@/types/game";

const STYLES: Record<Rarete, { label: string; bg: string; fg: string; bd: string }> = {
  commun: {
    label: "· Commun",
    bg: "var(--paper-300)",
    fg: "var(--ink-500)",
    bd: "var(--paper-500)",
  },
  rare: {
    label: "◆ Rare",
    bg: "var(--brass-300)",
    fg: "var(--forest-800)",
    bd: "var(--brass-700)",
  },
  legendaire: {
    label: "★★★ Légendaire",
    bg: "var(--vermillion-600)",
    fg: "var(--brass-100)",
    bd: "var(--brass-500)",
  },
};

export function RareteBadge({ rarete, size = "sm" }: { rarete: Rarete; size?: "sm" | "md" }) {
  const s = STYLES[rarete];
  const fontSize = size === "md" ? 11 : 9.5;
  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontSize,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontWeight: 600,
        padding: "3px 8px",
        border: `1px solid ${s.bd}`,
        background: s.bg,
        color: s.fg,
        display: "inline-block",
      }}
    >
      {s.label}
    </span>
  );
}
```

- [ ] **Step 2 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/components/ui/RareteBadge.tsx
git commit -m "feat(ui): RareteBadge component (commun/rare/legendaire)"
```

---

## Task 11 : Composant CatalogueGrid

**Files:**
- Create: `src/components/CatalogueGrid.tsx`

- [ ] **Step 1 : Créer la grille avec les 3 états visuels**

Crée `src/components/CatalogueGrid.tsx` :

```ts
import type { CatalogueEntree } from "@/types/game";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { RareteBadge } from "@/components/ui/RareteBadge";

export function CatalogueGrid({ entrees }: { entrees: CatalogueEntree[] }) {
  if (entrees.length === 0) {
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
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 12,
      }}
    >
      {entrees.map((e) => (
        <EntreeCard key={e.templateId} entree={e} />
      ))}
    </div>
  );
}

function EntreeCard({ entree }: { entree: CatalogueEntree }) {
  const decouvert = entree.vu;
  const possede = entree.possede > 0;
  const filtre = !decouvert
    ? "brightness(0) opacity(0.45)"
    : !possede
      ? "grayscale(1) opacity(0.6)"
      : "none";

  return (
    <article
      style={{
        position: "relative",
        background: "var(--paper-300)",
        border: `1px solid ${possede ? "var(--brass-500)" : "var(--paper-500)"}`,
        padding: 12,
        opacity: !decouvert ? 0.75 : 1,
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
        <CategorieIcon categorie={entree.categorie} size={42} strokeWidth={1.25} />
      </div>

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: possede ? "var(--forest-800)" : "var(--ink-500)",
          lineHeight: 1.2,
          minHeight: 30,
        }}
      >
        {decouvert ? entree.nom : "???"}
      </div>

      <div
        style={{
          marginTop: 8,
          paddingTop: 7,
          borderTop: "1px dotted var(--paper-500)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {decouvert ? <RareteBadge rarete={entree.rarete} /> : <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.16em", color: "var(--ink-300)" }}>· ? ·</span>}
        {possede && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "var(--brass-700)",
            }}
            title={`Possédé ${entree.possede} fois`}
          >
            ×{entree.possede}
          </span>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 2 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/components/CatalogueGrid.tsx
git commit -m "feat(ui): CatalogueGrid (Pokedex silhouette/grise/colored cards)"
```

---

## Task 12 : Page `/catalogue`

**Files:**
- Create: `src/app/catalogue/page.tsx`

- [ ] **Step 1 : Créer la page avec tabs catégorie**

Crée `src/app/catalogue/page.tsx` :

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CatalogueGrid } from "@/components/CatalogueGrid";
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
} from "@/lib/catalogue";
import type { CategorieObjet } from "@/types/game";

export default function CataloguePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();
  const [catSelectionnee, setCatSelectionnee] = useState<CategorieObjet>(
    CATEGORIES[0],
  );

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  if (!isHydrated || !state) {
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
        — ouverture du catalogue…
      </main>
    );
  }

  const global = progressionGlobale(state.catalogue);
  const courante = progressionCategorie(state.catalogue, catSelectionnee);
  const entrees = state.catalogue[catSelectionnee] ?? [];

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
            <div className="eyebrow">— catalogue des trésors —</div>
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
              Catalogue
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
              Chaque pièce croisée chez un vendeur ou un client apparaît grisée.
              Posséder l'objet (au moins une fois) la révèle en couleur.
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
              Progression : <span style={{ color: "var(--forest-800)" }}>{global.possedees} / {global.total}</span>
            </div>
            <Link href="/qg">
              <Button variant="ghost" size="sm">
                ← Retour au QG
              </Button>
            </Link>
          </div>
        </header>

        <DecoDivider />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          {CATEGORIES.map((c) => {
            const p = progressionCategorie(state.catalogue, c);
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
                    {p.possedees} / {p.total}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Panel
          eyebrow={`— ${catSelectionnee} —`}
          title={`Trésors · ${courante.possedees} / ${courante.total}`}
        >
          <CatalogueGrid entrees={entrees} />
        </Panel>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: 0 erreur.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/catalogue`
Expected: 200.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/catalogue/page.tsx
git commit -m "feat(catalogue): add /catalogue page with category tabs and Pokedex grid"
```

---

## Task 13 : QG — compteur + lien vers le catalogue

**Files:**
- Modify: `src/app/qg/page.tsx`

- [ ] **Step 1 : Importer la lib catalogue**

Ajoute en haut de `src/app/qg/page.tsx` (avec les autres imports `@/lib/*`) :

```ts
import { progressionGlobale } from "@/lib/catalogue";
```

- [ ] **Step 2 : Ajouter un compteur dans le panneau Compétences (juste en dessous)**

Trouve dans `src/app/qg/page.tsx` le panneau « Grimoire du chineur » (cherche `eyebrow="— grimoire du chineur —"`). Juste APRÈS la fermeture de son `</Panel>` (et après la fermeture du IIFE existant), insère ce nouveau panneau :

```tsx
          {(() => {
            const cat = progressionGlobale(state.catalogue);
            return (
              <Panel
                eyebrow="— catalogue des trésors —"
                title={`Catalogue · ${cat.possedees} / ${cat.total}`}
              >
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
                  {cat.possedees === 0
                    ? "Vous n'avez encore rien collectionné."
                    : cat.possedees === cat.total
                      ? "Toutes les pièces sont entre vos mains."
                      : `${cat.vues} pièce${cat.vues > 1 ? "s" : ""} aperçue${cat.vues > 1 ? "s" : ""}, ${cat.possedees} acquise${cat.possedees > 1 ? "s" : ""}.`}
                </p>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => router.push("/catalogue")}
                  >
                    Ouvrir le catalogue
                  </Button>
                </div>
              </Panel>
            );
          })()}
```

- [ ] **Step 3 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: 0 erreur.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/qg`
Expected: 200.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/qg/page.tsx
git commit -m "feat(qg): catalogue progression panel + link to /catalogue"
```

---

## Task 14 : InventoryGrid — badge de rareté sur la carte

**Files:**
- Modify: `src/components/InventoryGrid.tsx`

- [ ] **Step 1 : Importer RareteBadge**

Ajoute en haut de `src/components/InventoryGrid.tsx` :

```ts
import { RareteBadge } from "@/components/ui/RareteBadge";
```

- [ ] **Step 2 : Afficher la rareté en haut de la carte ObjetCard**

Dans le composant `ObjetCard`, juste après l'ouverture du `<article>` et le `<span aria-hidden>` (avant le bloc `<div style={{ aspectRatio: "4 / 3", … }}>`), insère :

```tsx
      {objet.rarete !== "commun" && (
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            zIndex: 1,
          }}
        >
          <RareteBadge rarete={objet.rarete} />
        </div>
      )}
```

Note : ne montre le badge que pour les Rares et Légendaires (pas pour les Communs, ça serait du bruit visuel).

- [ ] **Step 3 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: 0 erreur.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/qg`
Expected: 200.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/components/InventoryGrid.tsx
git commit -m "feat(inventory): show RareteBadge on Rare/Legendaire cards"
```

---

## Vérification finale (manuelle)

1. **Nouvelle partie** : QG → vois le panneau « Catalogue · 0 / 41 » (le 41 dépend du nombre de templates dans le pool complet). Bouton *Ouvrir le catalogue* → page `/catalogue` avec 6 tabs catégorie. Toutes silhouettes (`???`).

2. **Chinage** : Partir Chiner → entrer dans une brocante. Les objets affichés sont automatiquement marqués `vu`. Retour `/catalogue` → ces entrées sont grisées (nom visible, icône en grayscale).

3. **Achat** : Acquérir un objet → catalogue passe à coloré + compteur `×1`. Acheter un 2e exemplaire (si commun) → `×2`.

4. **Vente** : journée vente, un client apparaît avec un panier → ces objets sont marqués `vu` dans le catalogue.

5. **Migration** : une sauvegarde antérieure (sans `catalogue`) charge le QG sans crash, catalogue initialisé et possessions courantes injectées.

---

## Self-Review (notes intégrées)

- **Spec coverage** : Phase 1 du spec couvre `templateId` + `rarete` (Tasks 1-4), `catalogue` state + Pokédex (5-12), hooks chinage/vente (8-9), QG counter (13). ✓
- **Placeholders** : aucun `TBD` ou `…`. Chaque step montre du code complet.
- **Type consistency** : `templateId: string` partout, `Rarete = "commun" | "rare" | "legendaire"` cohérent, signatures `marquerVuTemplate(templateId: string)` / `marquerPossedeTemplate(templateId: string)` identiques entre lib, context et appels.
- **Scope** : Phase 1 seulement. La refonte brocantes (pool exclusif par brocante, étoiles, déblocages quotas) est Phase 2.
- **Caveat** : le tirage Phase 1 est sur `POOL_COMPLET` global, donc les légendaires apparaissent ~2 % du temps dès la 1ʳᵉ brocante. C'est volontaire pour pouvoir tester le système rapidement. Phase 2 restructurera les pools par brocante (commun générique + exclusifs propres).
