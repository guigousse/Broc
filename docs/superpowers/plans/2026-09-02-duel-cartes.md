# Duel de cartes — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner aux 50 cartes du classeur des caractéristiques de duel (coût, attaque, PV, texte), prouver l'équilibre du set par simulation, et afficher ces caractéristiques dans la fiche de carte et un livret de règles.

**Architecture:** Données pures dans `src/data/duel/` (types, roue, 50 cartes), moteur pur et déterministe dans `src/lib/duel/` (état immuable, actions fermées, un seul interpréteur d'effets, IA à deux profils, campagne de mesures), script `scripts/duel-campagne.ts` qui alimente `docs/superpowers/duel/rapport-equilibrage.md`, puis deux composants React (`LigneDuel` dans la fiche, `LivretReglesSheet` depuis le classeur) avec libellés générés en 4 langues.

**Tech Stack:** TypeScript, Next/React (composants existants `FicheObjet`, `AlbumShell`), vitest + Testing Library, `tsx` pour le script.

**Spec:** `docs/superpowers/specs/2026-09-02-duel-cartes-design.md`

## Global Constraints

- Branche de travail : `feat/classeur-album` (la spec y est déjà commitée). **Ne jamais changer de branche** : une autre session de Guillaume travaille dans le même répertoire.
- **Jamais de `git stash`, `git add -A` ni `git add .`** : n'ajouter que les fichiers de la tâche, nommés un par un. Le répertoire contient des modifications non commitées d'une autre session (`FichePiece.tsx`, `OuverturePaquetOverlay*.tsx`, `scripts/*.mjs`, `public/bazar/albums/`) : ne pas les toucher, ne pas les commiter.
- Tests : `npx vitest run --maxWorkers=4 <chemin>` (sans `--maxWorkers=4`, ~41 faux échecs par famine de workers sur ce Mac Intel).
- Lint : `npx eslint src` (le script `npm run lint` est cassé).
- Aucune modification de la save ni de `SAVE_VERSION`. Le catalogue `src/data/cartes.ts` ne change pas.
- Domaines : coût 1..5, attaque 0..6, PV 1..8 (stats imprimées ; en partie, les gains peuvent dépasser). Prompt ⇒ attaque ≤ 3. Solide ⇒ PV ≤ 5.
- Budget : 2C + 1 points (attaque + PV) moins le prix du texte ; légendaires +1. Prix : Barrage 1, Prompt 1, Solide 2, Ruse 1, Cri pioche 2, Cri dégât 1, Cri soin 1, Fragile −2, effet rare 1..3, effet légendaire ≤ 4.
- Courbe de coût : 8 / 12 / 13 / 10 / 7 pour les coûts 1..5. Légendaires en coût 4 ou 5. Chaque catégorie couvre les coûts 1 à 4.
- Deck : 20 cartes, singleton, ≤ 2 légendaires.
- Règles fixées par la spec §3 (vitrine 20, plafond d'énergie 5, main 7, étal 4, riposte simultanée, roue +1, fatigue 1-2-3…). **La boucle d'équilibrage ne retouche jamais les règles**, seulement prix d'effets et stats.
- Textes joueur : jamais de phrase par carte écrite à la main ; tout passe par `libelleTexteDuel`. Chaque clé ajoutée au dictionnaire FR doit exister en EN/ES/EL (le type `DictionnaireUI` est dérivé du FR, `tsc` refuse sinon ; `ui.test.ts` vérifie la parité des `{jetons}`).
- Commits : message en français, préfixe `feat(duel):` / `test(duel):` / `docs(duel):`, terminé par les deux lignes d'attribution de la session.

## Décisions de plan (non dérivables de la spec)

- **Cibles « au choix »** : seules les actions qui exigent un choix (`degats` sur `objetAdverse`, `retourEnMain`, `volMotCle`) sont autorisées avec le déclencheur `pose` ; le choix est alors un paramètre explicite de `poser`. Les autres déclencheurs n'emploient que des actions sans choix. Une action à choix sans cible valide (étal adverse vide) **s'éteint** sans effet, la pose reste légale. `energie` n'est autorisée qu'avec `pose` ou `debutTour`.
- **Ruse** : l'objet est « sous Ruse » tant que `tour − poseAuTour ≤ 1`, c'est-à-dire pendant le tour de sa pose et le tour adverse qui suit (la lecture littérale « le tour où il est posé » ne protégerait de rien, l'adversaire n'attaquant pas pendant ce tour). Sous Ruse, l'objet n'est ciblable ni par une attaque ni par une action à choix, et il ne compte pas comme Barrage.
- **Déclencheur `attaque`** : résolu avant les dégâts. **`blesse`** : seulement si le dégât après Solide est ≥ 1. **`casse`** : au retrait de l'objet, pour son propriétaire. **`debutTour`** : après l'énergie et la pioche, avant la phase de pose.
- **Ordre de résolution d'une casse multiple** : objets du joueur actif d'abord, de gauche à droite, puis ceux de l'adversaire.
- **Compteur de tours** : `tour` compte les tours de joueur (1 = premier tour du premier joueur). Une **manche** = deux tours. Les cibles de durée de la spec (8 à 14, max 25) s'appliquent aux **manches**. Garde-fou : une partie qui dépasse 60 manches est arrêtée et comptée « épuisée ».
- **Taux de victoire d'une catégorie** = moyenne des taux de victoire de ses cartes.
- **État** : les fonctions publiques clonent l'état à l'entrée (`cloner`) puis les opérations internes mutent le clone. L'appelant ne voit jamais son état changer.
- **Ordre d'exécution** : la première version des 50 cartes est produite dès la tâche 2 (avant le moteur), pour que les tests du moteur jouent avec de vraies cartes. La spec §9 la plaçait après le moteur ; le contenu est identique.

---

### Task 1: Types de duel et roue des catégories

**Files:**
- Create: `src/data/duel/types.ts`
- Create: `src/data/duel/roue.ts`
- Test: `src/data/duel/roue.test.ts`

**Interfaces:**
- Produces: `MotCle`, `MotCleActif`, `Declencheur`, `Action`, `Effet`, `TexteDuel`, `StatsDuel`, `Cout` (types) ; `ROUE: CategorieObjet[]`, `proieDe(cat): CategorieObjet`, `domine(a, b): boolean`.

- [ ] **Step 1: Écrire le test de la roue**

```ts
// src/data/duel/roue.test.ts
import { describe, expect, it } from "vitest";
import { ROUE, domine, proieDe } from "@/data/duel/roue";

describe("roue des catégories", () => {
  it("a 7 crans, chaque catégorie une fois", () => {
    expect(ROUE).toHaveLength(7);
    expect(new Set(ROUE).size).toBe(7);
  });

  it("Bricolage casse Maison, Objets d'art humilie Bricolage (la roue se referme)", () => {
    expect(proieDe("Bricolage")).toBe("Maison");
    expect(proieDe("Objets d'art")).toBe("Bricolage");
    expect(domine("Bricolage", "Maison")).toBe(true);
    expect(domine("Maison", "Bricolage")).toBe(false);
    expect(domine("Maison", "Maison")).toBe(false);
  });

  it("suit l'ordre de la spec", () => {
    expect(ROUE).toEqual([
      "Bricolage", "Maison", "Mode", "Musique", "Livres & Papeterie", "Jeux & Loisirs", "Objets d'art",
    ]);
  });
});
```

- [ ] **Step 2: Lancer le test, il échoue**

Run: `npx vitest run --maxWorkers=4 src/data/duel/roue.test.ts`
Expected: FAIL, module `@/data/duel/roue` introuvable.

- [ ] **Step 3: Écrire les types et la roue**

```ts
// src/data/duel/types.ts
import type { CategorieObjet } from "@/types/game";

export type Cout = 1 | 2 | 3 | 4 | 5;

/** Mots-clés des communes (liste fermée, spec §4.2). */
export type MotCle =
  | { type: "barrage" }
  | { type: "prompt" }
  | { type: "solide" }
  | { type: "fragile" }
  | { type: "ruse" }
  | { type: "cri"; variante: "pioche" | "degat" | "soin" };

/** Les mots-clés qui restent sur l'objet une fois posé (Cri est instantané). */
export type MotCleActif = "barrage" | "prompt" | "solide" | "fragile" | "ruse";

export type Declencheur = "pose" | "casse" | "debutTour" | "attaque" | "blesse";

export type Action =
  | { type: "degats"; cible: "objetAdverse" | "tousObjetsAdverses" | "vitrineAdverse"; valeur: number }
  | { type: "soinVitrine"; valeur: number }
  | { type: "pioche"; valeur: number }
  | { type: "energie"; valeur: number }
  | {
      type: "gain";
      stat: "attaque" | "pv";
      cible: "soi" | "allies" | "alliesCategorie";
      categorie?: CategorieObjet;
      valeur: number;
    }
  | { type: "retourEnMain" }
  | { type: "volMotCle" };

export interface Effet {
  type: "effet";
  declencheur: Declencheur;
  /** 1 action pour une rare, 1 ou 2 pour une légendaire. */
  actions: Action[];
}

export type TexteDuel = MotCle | Effet;

export interface StatsDuel {
  cout: Cout;
  attaque: number;
  pv: number;
  texte?: TexteDuel;
}

/** Les actions qui exigent un choix de cible (autorisées avec `pose` seulement). */
export function actionAChoix(a: Action): boolean {
  return (a.type === "degats" && a.cible === "objetAdverse") || a.type === "retourEnMain" || a.type === "volMotCle";
}
```

```ts
// src/data/duel/roue.ts
import type { CategorieObjet } from "@/types/game";

/** A → B : A domine B. Le dernier domine le premier (spec §3.4). */
export const ROUE: CategorieObjet[] = [
  "Bricolage", "Maison", "Mode", "Musique", "Livres & Papeterie", "Jeux & Loisirs", "Objets d'art",
];

export function proieDe(cat: CategorieObjet): CategorieObjet {
  const i = ROUE.indexOf(cat);
  return ROUE[(i + 1) % ROUE.length];
}

export function domine(a: CategorieObjet, b: CategorieObjet): boolean {
  return proieDe(a) === b;
}
```

- [ ] **Step 4: Lancer le test, il passe**

Run: `npx vitest run --maxWorkers=4 src/data/duel/roue.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/duel/types.ts src/data/duel/roue.ts src/data/duel/roue.test.ts
git commit -m "feat(duel): types de duel et roue des 7 catégories"
```

---

### Task 2: Les 50 cartes, première version au budget, et le test de garde

**Files:**
- Create: `src/data/duel/cartesDuel.ts`
- Create: `src/data/duel/budget.ts`
- Test: `src/data/duel/cartesDuel.test.ts`

**Interfaces:**
- Consumes: `StatsDuel`, `Cout`, `actionAChoix` (Task 1) ; `CARTES` de `@/data/cartes` (ids `carte.<slug>`, `rarete`, `serie`).
- Produces: `CARTES_DUEL: Record<string, StatsDuel>` ; `statsDuel(id): StatsDuel` (lance si inconnu) ; `prixTexte(texte): number` ; `budgetDe(cout, rarete): number`.

- [ ] **Step 1: Écrire le test de garde**

```ts
// src/data/duel/cartesDuel.test.ts
import { describe, expect, it } from "vitest";
import { CARTES } from "@/data/cartes";
import { CARTES_DUEL, statsDuel } from "@/data/duel/cartesDuel";
import { budgetDe, prixTexte } from "@/data/duel/budget";
import { actionAChoix } from "@/data/duel/types";

const MOTS_CLES = ["barrage", "prompt", "solide", "fragile", "ruse", "cri"];

describe("cartesDuel — garde du set", () => {
  it("les 50 cartes du classeur ont des stats, et rien d'autre", () => {
    expect(Object.keys(CARTES_DUEL).sort()).toEqual(CARTES.map((c) => c.id).sort());
  });

  it("respecte les domaines imprimés", () => {
    for (const c of CARTES) {
      const s = statsDuel(c.id);
      expect(s.cout, c.id).toBeGreaterThanOrEqual(1);
      expect(s.cout, c.id).toBeLessThanOrEqual(5);
      expect(s.attaque, c.id).toBeGreaterThanOrEqual(0);
      expect(s.attaque, c.id).toBeLessThanOrEqual(6);
      expect(s.pv, c.id).toBeGreaterThanOrEqual(1);
      expect(s.pv, c.id).toBeLessThanOrEqual(8);
      expect(Number.isInteger(s.attaque) && Number.isInteger(s.pv), c.id).toBe(true);
    }
  });

  it("une commune porte au plus un mot-clé ; une rare ou légendaire porte un effet", () => {
    for (const c of CARTES) {
      const t = statsDuel(c.id).texte;
      if (c.rarete === "commun") {
        if (t) expect(MOTS_CLES, c.id).toContain(t.type);
      } else {
        expect(t?.type, c.id).toBe("effet");
      }
    }
  });

  it("Prompt ⇒ attaque ≤ 3, Solide ⇒ PV ≤ 5", () => {
    for (const c of CARTES) {
      const s = statsDuel(c.id);
      if (s.texte?.type === "prompt") expect(s.attaque, c.id).toBeLessThanOrEqual(3);
      if (s.texte?.type === "solide") expect(s.pv, c.id).toBeLessThanOrEqual(5);
    }
  });

  it("un effet a 1 action (rare) ou 1 à 2 (légendaire) ; les actions à choix et l'énergie sont réservées aux bons déclencheurs", () => {
    for (const c of CARTES) {
      const t = statsDuel(c.id).texte;
      if (t?.type !== "effet") continue;
      expect(t.actions.length, c.id).toBeGreaterThanOrEqual(1);
      expect(t.actions.length, c.id).toBeLessThanOrEqual(c.rarete === "legendaire" ? 2 : 1);
      for (const a of t.actions) {
        if (actionAChoix(a)) expect(t.declencheur, c.id).toBe("pose");
        if (a.type === "energie") expect(["pose", "debutTour"], c.id).toContain(t.declencheur);
        if (a.type === "gain" && a.cible === "alliesCategorie") expect(a.categorie, c.id).toBeDefined();
      }
    }
  });

  it("courbe de coût 8/12/13/10/7 ; légendaires en 4 ou 5", () => {
    const parCout = [0, 0, 0, 0, 0, 0];
    for (const c of CARTES) {
      const s = statsDuel(c.id);
      parCout[s.cout]++;
      if (c.rarete === "legendaire") expect([4, 5], c.id).toContain(s.cout);
    }
    expect(parCout.slice(1)).toEqual([8, 12, 13, 10, 7]);
  });

  it("chaque catégorie couvre les coûts 1 à 4", () => {
    const couverts = new Map<string, Set<number>>();
    for (const c of CARTES) {
      const set = couverts.get(c.serie) ?? new Set<number>();
      set.add(statsDuel(c.id).cout);
      couverts.set(c.serie, set);
    }
    for (const [serie, set] of couverts) {
      for (const cout of [1, 2, 3, 4]) expect(set.has(cout), `${serie} coût ${cout}`).toBe(true);
    }
  });

  it("chaque carte dépense exactement son budget (2C+1, +1 légendaire, moins le prix du texte)", () => {
    for (const c of CARTES) {
      const s = statsDuel(c.id);
      const attendu = budgetDe(s.cout, c.rarete) - prixTexte(s.texte);
      expect(s.attaque + s.pv, `${c.id} budget`).toBe(attendu);
    }
  });

  it("statsDuel lance sur un id inconnu", () => {
    expect(() => statsDuel("carte.inexistante")).toThrow();
  });
});
```

- [ ] **Step 2: Lancer le test, il échoue**

Run: `npx vitest run --maxWorkers=4 src/data/duel/cartesDuel.test.ts`
Expected: FAIL, modules introuvables.

- [ ] **Step 3: Écrire le budget**

Le prix d'un effet est porté par la donnée (`prix`) pour que la boucle d'équilibrage le retouche sans changer la formule.

```ts
// src/data/duel/budget.ts
import type { Rarete } from "@/types/game";
import type { TexteDuel } from "@/data/duel/types";

export function budgetDe(cout: number, rarete: Rarete): number {
  return 2 * cout + 1 + (rarete === "legendaire" ? 1 : 0);
}

const PRIX_MOT_CLE: Record<string, number> = {
  barrage: 1, prompt: 1, solide: 2, ruse: 1, fragile: -2,
  "cri.pioche": 2, "cri.degat": 1, "cri.soin": 1,
};

/** Prix retiré du budget de stats. Un effet porte son prix dans la donnée. */
export function prixTexte(texte: TexteDuel | undefined): number {
  if (!texte) return 0;
  if (texte.type === "effet") return texte.prix;
  if (texte.type === "cri") return PRIX_MOT_CLE[`cri.${texte.variante}`];
  return PRIX_MOT_CLE[texte.type];
}
```

Ajouter le champ `prix` à `Effet` dans `src/data/duel/types.ts` :

```ts
export interface Effet {
  type: "effet";
  declencheur: Declencheur;
  actions: Action[];
  /** Prix retiré du budget de stats (1..3 rare, ≤ 4 légendaire). Retouché par la campagne. */
  prix: number;
}
```

- [ ] **Step 4: Écrire les 50 cartes**

Ids = `carte.` + slug de `source` sans son préfixe (`leg.mus.x` → `x`, `br.x` → `x`), tels que produits par `CARTES` dans `src/data/cartes.ts`. Le tableau ci-dessous est la **version 1**, entièrement au budget ; la campagne (Task 9) la fera évoluer.

```ts
// src/data/duel/cartesDuel.ts
import type { Effet, StatsDuel } from "@/data/duel/types";

const E = (declencheur: Effet["declencheur"], prix: number, ...actions: Effet["actions"]): Effet => ({
  type: "effet", declencheur, actions, prix,
});

/** Version 1 (2026-09-02), au budget de la spec §5. Historique dans docs/superpowers/duel/rapport-equilibrage.md. */
export const CARTES_DUEL: Record<string, StatsDuel> = {
  // ── Musique (8) : pioche, gains d'attaque alliés ──
  "carte.vinyle_des_loups_des_steppes_bark_to_be_free": { cout: 2, attaque: 1, pv: 2, texte: { type: "cri", variante: "pioche" } },
  "carte.vinyle_grand_max_des_combines": { cout: 1, attaque: 1, pv: 2 },
  "carte.33tours_jazz_1": { cout: 3, attaque: 2, pv: 3, texte: { type: "cri", variante: "pioche" } },
  "carte.harmonica_chromatique_de_bluesman": { cout: 2, attaque: 2, pv: 2, texte: { type: "prompt" } },
  "carte.vinyle_stevranos_vive_la_fet_a": { cout: 4, attaque: 4, pv: 5 },
  "carte.guitare_classique_ancienne": { cout: 3, attaque: 2, pv: 3, texte: E("attaque", 2, { type: "pioche", valeur: 1 }) },
  "carte.test_pressing_des_trolling_sons": { cout: 2, attaque: 1, pv: 2, texte: E("pose", 2, { type: "gain", stat: "attaque", cible: "allies", valeur: 1 }) },
  "carte.violon_de_maitre_cremonais_1715": { cout: 5, attaque: 4, pv: 5, texte: E("debutTour", 3, { type: "gain", stat: "attaque", cible: "alliesCategorie", categorie: "Musique", valeur: 1 }) },

  // ── Jeux & Loisirs (7) : Prompt, Fragile, bon marché ──
  "carte.cartouche_le_plombier_sauteur_8_bit": { cout: 1, attaque: 1, pv: 1, texte: { type: "prompt" } },
  "carte.manette_megadrive": { cout: 1, attaque: 3, pv: 2, texte: { type: "fragile" } },
  "carte.playbox_pocket": { cout: 2, attaque: 2, pv: 2, texte: { type: "prompt" } },
  "carte.risk_1992": { cout: 3, attaque: 5, pv: 4, texte: { type: "fragile" } },
  "carte.figurine_de_guerre_galactique_1978": { cout: 4, attaque: 3, pv: 4, texte: E("pose", 2, { type: "degats", cible: "objetAdverse", valeur: 2 }) },
  "carte.flipper_a_plateau_annees_60": { cout: 5, attaque: 3, pv: 6, texte: E("blesse", 2, { type: "degats", cible: "vitrineAdverse", valeur: 2 }) },
  "carte.cartouche_stadium_events": { cout: 4, attaque: 2, pv: 4, texte: E("pose", 4, { type: "degats", cible: "tousObjetsAdverses", valeur: 1 }, { type: "pioche", valeur: 1 }) },

  // ── Livres & Papeterie (7) : dégâts directs, pioche, contrôle ──
  "carte.monte_cristo": { cout: 3, attaque: 3, pv: 4 },
  "carte.les_aventures_de_titou_cap_sur_la_lune": { cout: 1, attaque: 1, pv: 1, texte: { type: "cri", variante: "degat" } },
  "carte.paris_match_70s": { cout: 2, attaque: 1, pv: 2, texte: { type: "cri", variante: "pioche" } },
  "carte.miserables_pleiade": { cout: 4, attaque: 3, pv: 4, texte: { type: "solide" } },
  "carte.conte_de_l_aviateur_et_de_l_enfant_roi_edition": { cout: 2, attaque: 2, pv: 2, texte: E("casse", 1, { type: "pioche", valeur: 1 }) },
  "carte.le_petit_moustachu_edition_originale_1961": { cout: 3, attaque: 2, pv: 3, texte: E("pose", 2, { type: "degats", cible: "objetAdverse", valeur: 2 }) },
  "carte.gutenberg_feuillet": { cout: 4, attaque: 3, pv: 4, texte: E("pose", 3, { type: "pioche", valeur: 2 }) },

  // ── Mode (7) : Ruse, retour en main, tempo ──
  "carte.veste_jean_delavee": { cout: 2, attaque: 2, pv: 2, texte: { type: "ruse" } },
  "carte.blouson_cuir_vintage": { cout: 3, attaque: 3, pv: 3, texte: { type: "ruse" } },
  "carte.chapeau_feutre_50s": { cout: 1, attaque: 2, pv: 1 },
  "carte.robe_50s_pinup": { cout: 4, attaque: 4, pv: 4, texte: { type: "cri", variante: "soin" } },
  "carte.broche_emaillee_artdeco": { cout: 2, attaque: 1, pv: 1, texte: E("pose", 3, { type: "retourEnMain" }) },
  "carte.sac_a_main_talaria": { cout: 3, attaque: 2, pv: 4, texte: E("attaque", 1, { type: "gain", stat: "attaque", cible: "soi", valeur: 1 }) },
  "carte.la_petite_robe_noire_chaine_1925": { cout: 5, attaque: 4, pv: 4, texte: E("pose", 4, { type: "retourEnMain" }, { type: "gain", stat: "attaque", cible: "allies", valeur: 1 }) },

  // ── Maison (7) : PV hauts, Barrage, soin ──
  "carte.figurine_porcelaine": { cout: 1, attaque: 1, pv: 1, texte: { type: "barrage" } },
  "carte.service_the_faience": { cout: 2, attaque: 1, pv: 3, texte: { type: "cri", variante: "soin" } },
  "carte.tabouret_bois_patine": { cout: 3, attaque: 2, pv: 4, texte: { type: "barrage" } },
  "carte.vase_en_cristal_baraka": { cout: 4, attaque: 3, pv: 5, texte: { type: "barrage" } },
  "carte.boite_musique_ancienne": { cout: 2, attaque: 1, pv: 2, texte: E("debutTour", 2, { type: "soinVitrine", valeur: 1 }) },
  "carte.lampe_bureau_artdeco": { cout: 3, attaque: 2, pv: 3, texte: E("pose", 2, { type: "gain", stat: "pv", cible: "allies", valeur: 1 }) },
  "carte.uf_joaillier_imperial_en_email_replique": { cout: 5, attaque: 3, pv: 5, texte: E("pose", 4, { type: "soinVitrine", valeur: 4 }, { type: "gain", stat: "pv", cible: "allies", valeur: 2 }) },

  // ── Objets d'art (6) : Solide, valeur brute ──
  "carte.aquarelle_paysage_anonyme": { cout: 1, attaque: 1, pv: 2 },
  "carte.terre_cuite_buste": { cout: 2, attaque: 1, pv: 2, texte: { type: "solide" } },
  "carte.masque_tribal_decoratif": { cout: 3, attaque: 3, pv: 4 },
  "carte.bronze_animalier": { cout: 4, attaque: 3, pv: 4, texte: { type: "solide" } },
  "carte.vase_galle_signe": { cout: 3, attaque: 2, pv: 4, texte: E("blesse", 1, { type: "soinVitrine", valeur: 2 }) },
  "carte.dessin_surrealiste_aux_montres_molles_signe": { cout: 5, attaque: 3, pv: 5, texte: E("pose", 3, { type: "degats", cible: "tousObjetsAdverses", valeur: 2 }) },

  // ── Bricolage (8) : attaque haute, Prompt ──
  "carte.marteau_menuisier": { cout: 1, attaque: 2, pv: 1 },
  "carte.boite_outils_complete": { cout: 3, attaque: 3, pv: 4 },
  "carte.etabli_pliant_ancien": { cout: 3, attaque: 3, pv: 3, texte: { type: "prompt" } },
  "carte.pince_etirer_cuivre": { cout: 2, attaque: 3, pv: 1, texte: { type: "prompt" } },
  "carte.scie_egoine_de_charpentier": { cout: 4, attaque: 5, pv: 4 },
  "carte.boite_d_outils_de_manufacture_signee": { cout: 5, attaque: 4, pv: 4, texte: E("casse", 3, { type: "degats", cible: "tousObjetsAdverses", valeur: 2 }) },
  "carte.rabot_d_ebeniste_a_semelle_modele_605": { cout: 4, attaque: 4, pv: 3, texte: E("attaque", 2, { type: "degats", cible: "vitrineAdverse", valeur: 1 }) },
  "carte.coffret_ebeniste_xixe": { cout: 5, attaque: 5, pv: 4, texte: E("debutTour", 2, { type: "gain", stat: "attaque", cible: "soi", valeur: 1 }) },
};

export function statsDuel(id: string): StatsDuel {
  const s = CARTES_DUEL[id];
  if (!s) throw new Error(`Carte de duel inconnue : ${id}`);
  return s;
}
```

- [ ] **Step 5: Lancer le test, il passe**

Run: `npx vitest run --maxWorkers=4 src/data/duel/`
Expected: PASS. Si un id ne correspond pas à `CARTES`, le premier test liste l'écart : corriger l'id dans `cartesDuel.ts` (jamais dans `cartes.ts`). Si le test de budget échoue sur une carte, corriger attaque/PV (pas le prix).

- [ ] **Step 6: Commit**

```bash
git add src/data/duel/types.ts src/data/duel/budget.ts src/data/duel/cartesDuel.ts src/data/duel/cartesDuel.test.ts
git commit -m "feat(duel): les 50 cartes, version 1 au budget, et le test de garde du set"
```

---

### Task 3: État de partie, RNG à graine, pioche, énergie, tours

**Files:**
- Create: `src/lib/duel/rng.ts`
- Create: `src/lib/duel/etat.ts`
- Create: `src/lib/duel/operations.ts`
- Create: `src/lib/duel/partie.ts` (première version : `nouvellePartie`, `finirTour` sans Fragile ni effets)
- Test: `src/lib/duel/rng.test.ts`, `src/lib/duel/partie.test.ts`

**Interfaces:**
- Consumes: `statsDuel` (Task 2).
- Produces: `creerRng(graine): () => number`, `melanger(xs, rng)` ; types `ObjetEnJeu`, `Joueur`, `EtatPartie`, `Fin`, `Cible`, `Resultat` ; constantes `VITRINE_INITIALE=20`, `PLAFOND_MAX=5`, `MAIN_MAX=7`, `ETAL_MAX=4`, `MAIN_INITIALE=4`, `MANCHES_MAX=60` ; `cloner(e)`, `adverse(j)`, `joueurActif(e)`, `trouverObjet(e, uid)`, `piocher(e, j, n)`, `verifierFin(e)`, `manche(e)` ; `nouvellePartie(deckA, deckB, rng): EtatPartie`, `finirTour(e): Resultat`.

- [ ] **Step 1: Tests du RNG**

```ts
// src/lib/duel/rng.test.ts
import { describe, expect, it } from "vitest";
import { creerRng, melanger } from "@/lib/duel/rng";

describe("rng à graine", () => {
  it("même graine, même suite ; graines différentes, suites différentes", () => {
    const a = creerRng(42), b = creerRng(42), c = creerRng(43);
    const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
    for (const x of sa) expect(x >= 0 && x < 1).toBe(true);
  });

  it("melanger rend une permutation sans toucher l'original", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    const m = melanger(xs, creerRng(7));
    expect(xs).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...m].sort((p, q) => p - q)).toEqual(xs);
    expect(m).not.toEqual(xs);
  });
});
```

- [ ] **Step 2: Tests de l'état et des tours**

```ts
// src/lib/duel/partie.test.ts
import { describe, expect, it } from "vitest";
import { CARTES } from "@/data/cartes";
import { creerRng } from "@/lib/duel/rng";
import { finirTour, nouvellePartie } from "@/lib/duel/partie";
import { MAIN_MAX, VITRINE_INITIALE } from "@/lib/duel/etat";

/** 20 premières / 20 suivantes du catalogue : deux decks singleton valides pour les tests. */
export const DECK_A = CARTES.slice(0, 20).map((c) => c.id);
export const DECK_B = CARTES.slice(20, 40).map((c) => c.id);

describe("nouvellePartie", () => {
  it("vitrines à 20, premier joueur 4 cartes + 1 piochée, second 5 cartes, énergie 1/1 au tour 1", () => {
    const e = nouvellePartie(DECK_A, DECK_B, creerRng(1));
    expect(e.joueurs[0].vitrine).toBe(VITRINE_INITIALE);
    expect(e.joueurs[1].vitrine).toBe(VITRINE_INITIALE);
    expect(e.actif).toBe(0);
    expect(e.tour).toBe(1);
    expect(e.joueurs[0].main).toHaveLength(5); // 4 + la pioche du tour 1
    expect(e.joueurs[1].main).toHaveLength(5); // compensation du second joueur
    expect(e.joueurs[0].deck).toHaveLength(15);
    expect(e.joueurs[1].deck).toHaveLength(15);
    expect(e.joueurs[0].plafond).toBe(1);
    expect(e.joueurs[0].energie).toBe(1);
    expect(e.joueurs[1].plafond).toBe(0);
    expect(e.fini).toBeNull();
  });

  it("est déterministe : même graine, mêmes mains", () => {
    const a = nouvellePartie(DECK_A, DECK_B, creerRng(9));
    const b = nouvellePartie(DECK_A, DECK_B, creerRng(9));
    expect(a).toEqual(b);
  });
});

describe("finirTour", () => {
  it("passe la main, monte le plafond jusqu'à 5 et recharge l'énergie", () => {
    let e = nouvellePartie(DECK_A, DECK_B, creerRng(1));
    e = finirTour(e).etat;
    expect(e.actif).toBe(1);
    expect(e.tour).toBe(2);
    expect(e.joueurs[1].plafond).toBe(1);
    expect(e.joueurs[1].main).toHaveLength(6);
    for (let i = 0; i < 10; i++) e = finirTour(e).etat;
    expect(e.joueurs[0].plafond).toBe(5);
    expect(e.joueurs[0].energie).toBe(5);
  });

  it("ne rend pas un état muté : l'ancien état reste intact", () => {
    const e = nouvellePartie(DECK_A, DECK_B, creerRng(1));
    const copie = JSON.parse(JSON.stringify(e));
    finirTour(e);
    expect(e).toEqual(copie);
  });

  it("main pleine : la carte piochée part à la casse", () => {
    let e = nouvellePartie(DECK_A, DECK_B, creerRng(1));
    // Le joueur 0 ne joue rien : sa main gonfle d'une carte par tour.
    for (let i = 0; i < 8; i++) e = finirTour(e).etat;
    expect(e.joueurs[0].main).toHaveLength(MAIN_MAX);
    expect(e.joueurs[0].casse.length).toBeGreaterThan(0);
  });

  it("deck vide : fatigue 1, 2, 3… sur la vitrine", () => {
    let e = nouvellePartie(DECK_A, DECK_B, creerRng(1));
    e = { ...e, joueurs: [{ ...e.joueurs[0], deck: [], main: [] }, e.joueurs[1]] };
    e = finirTour(e).etat; // tour 2 (joueur 1)
    e = finirTour(e).etat; // tour 3 : joueur 0 échoue à piocher
    expect(e.joueurs[0].vitrine).toBe(19);
    e = finirTour(e).etat;
    e = finirTour(e).etat;
    expect(e.joueurs[0].vitrine).toBe(17);
    expect(e.joueurs[0].echecsPioche).toBe(2);
  });

  it("une vitrine à 0 termine la partie ; finirTour refuse ensuite", () => {
    let e = nouvellePartie(DECK_A, DECK_B, creerRng(1));
    e = { ...e, joueurs: [{ ...e.joueurs[0], deck: [], main: [], vitrine: 1 }, e.joueurs[1]] };
    e = finirTour(e).etat;
    e = finirTour(e).etat; // fatigue 1 → 0
    expect(e.fini).toEqual({ vainqueur: 1 });
    expect(finirTour(e).ok).toBe(false);
  });
});
```

- [ ] **Step 3: Lancer, ça échoue**

Run: `npx vitest run --maxWorkers=4 src/lib/duel/`
Expected: FAIL, modules introuvables.

- [ ] **Step 4: Écrire rng.ts, etat.ts, operations.ts, partie.ts**

```ts
// src/lib/duel/rng.ts
/** mulberry32 : petit, déterministe, suffisant pour mélanger des decks. */
export function creerRng(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates sur une copie. */
export function melanger<T>(xs: readonly T[], rng: () => number): T[] {
  const m = [...xs];
  for (let i = m.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [m[i], m[j]] = [m[j], m[i]];
  }
  return m;
}
```

```ts
// src/lib/duel/etat.ts
import type { MotCleActif } from "@/data/duel/types";

export const VITRINE_INITIALE = 20;
export const PLAFOND_MAX = 5;
export const MAIN_MAX = 7;
export const ETAL_MAX = 4;
export const MAIN_INITIALE = 4;
/** Garde-fou de boucle : au-delà, la partie est « épuisée ». */
export const MANCHES_MAX = 60;

export interface ObjetEnJeu {
  uid: number;
  id: string;
  attaque: number;
  pv: number;
  motsCles: MotCleActif[];
  poseAuTour: number;
  aAttaque: boolean;
}

export interface Joueur {
  vitrine: number;
  plafond: number;
  energie: number;
  main: string[];
  deck: string[];
  etal: ObjetEnJeu[];
  casse: string[];
  echecsPioche: number;
}

export type Fin = { vainqueur: 0 | 1 | null };

export interface EtatPartie {
  joueurs: [Joueur, Joueur];
  actif: 0 | 1;
  /** Tour de joueur, 1 = premier tour du premier joueur. */
  tour: number;
  prochainUid: number;
  fini: Fin | null;
  journal: string[];
}

export type Cible = { type: "vitrine" } | { type: "objet"; uid: number };
export type Resultat = { ok: true; etat: EtatPartie } | { ok: false; raison: string; etat: EtatPartie };

export function cloner(e: EtatPartie): EtatPartie {
  const j = (x: Joueur): Joueur => ({
    ...x, main: [...x.main], deck: [...x.deck], casse: [...x.casse],
    etal: x.etal.map((o) => ({ ...o, motsCles: [...o.motsCles] })),
  });
  return { ...e, joueurs: [j(e.joueurs[0]), j(e.joueurs[1])], fini: e.fini ? { ...e.fini } : null, journal: [...e.journal] };
}

export function adverse(j: 0 | 1): 0 | 1 {
  return j === 0 ? 1 : 0;
}

export function manche(e: EtatPartie): number {
  return Math.ceil(e.tour / 2);
}

export function trouverObjet(e: EtatPartie, uid: number): { joueur: 0 | 1; objet: ObjetEnJeu } | null {
  for (const j of [0, 1] as const) {
    const o = e.joueurs[j].etal.find((x) => x.uid === uid);
    if (o) return { joueur: j, objet: o };
  }
  return null;
}

/** Sous Ruse : pendant son tour de pose et le tour adverse qui suit. */
export function sousRuse(e: EtatPartie, o: ObjetEnJeu): boolean {
  return o.motsCles.includes("ruse") && e.tour - o.poseAuTour <= 1;
}
```

```ts
// src/lib/duel/operations.ts
import { MAIN_MAX, type EtatPartie } from "@/lib/duel/etat";

/** Mute `e` (déjà cloné par l'appelant public). */
export function piocher(e: EtatPartie, j: 0 | 1, n: number): void {
  const joueur = e.joueurs[j];
  for (let i = 0; i < n; i++) {
    const id = joueur.deck.shift();
    if (id === undefined) {
      joueur.echecsPioche += 1;
      joueur.vitrine -= joueur.echecsPioche;
      e.journal.push(`J${j} fatigue ${joueur.echecsPioche}`);
    } else if (joueur.main.length >= MAIN_MAX) {
      joueur.casse.push(id);
      e.journal.push(`J${j} brûle ${id}`);
    } else {
      joueur.main.push(id);
    }
  }
}

export function verifierFin(e: EtatPartie): void {
  if (e.fini) return;
  const [a, b] = e.joueurs;
  if (a.vitrine <= 0 && b.vitrine <= 0) e.fini = { vainqueur: null };
  else if (a.vitrine <= 0) e.fini = { vainqueur: 1 };
  else if (b.vitrine <= 0) e.fini = { vainqueur: 0 };
}
```

```ts
// src/lib/duel/partie.ts
import { melanger } from "@/lib/duel/rng";
import {
  MAIN_INITIALE, PLAFOND_MAX, VITRINE_INITIALE, cloner,
  type EtatPartie, type Joueur, type Resultat,
} from "@/lib/duel/etat";
import { piocher, verifierFin } from "@/lib/duel/operations";

function joueurInitial(deck: string[]): Joueur {
  return { vitrine: VITRINE_INITIALE, plafond: 0, energie: 0, main: [], deck, etal: [], casse: [], echecsPioche: 0 };
}

/** Mute `e` : énergie, pioche, remise à zéro des attaques (effets debutTour en Task 5). */
function commencerTour(e: EtatPartie): void {
  e.tour += 1;
  const j = e.joueurs[e.actif];
  j.plafond = Math.min(PLAFOND_MAX, j.plafond + 1);
  j.energie = j.plafond;
  for (const o of j.etal) o.aAttaque = false;
  piocher(e, e.actif, 1);
  verifierFin(e);
}

export function nouvellePartie(deckA: readonly string[], deckB: readonly string[], rng: () => number): EtatPartie {
  const e: EtatPartie = {
    joueurs: [joueurInitial(melanger(deckA, rng)), joueurInitial(melanger(deckB, rng))],
    actif: 0, tour: 0, prochainUid: 1, fini: null, journal: [],
  };
  piocher(e, 0, MAIN_INITIALE);
  piocher(e, 1, MAIN_INITIALE + 1); // compensation du second joueur (spec §3.1)
  commencerTour(e);
  return e;
}

export function finirTour(etat: EtatPartie): Resultat {
  if (etat.fini) return { ok: false, raison: "partieFinie", etat };
  const e = cloner(etat);
  // Fragile et effets de fin de tour : Task 4.
  verifierFin(e);
  if (!e.fini) {
    e.actif = e.actif === 0 ? 1 : 0;
    commencerTour(e);
  }
  return { ok: true, etat: e };
}
```

- [ ] **Step 5: Lancer, ça passe**

Run: `npx vitest run --maxWorkers=4 src/lib/duel/`
Expected: PASS (2 + 7 tests). Le test « main pleine » compte 5 + 8 pioches = 13 > 7 : au moins 6 cartes brûlées.

- [ ] **Step 6: Commit**

```bash
git add src/lib/duel/rng.ts src/lib/duel/rng.test.ts src/lib/duel/etat.ts src/lib/duel/operations.ts src/lib/duel/partie.ts src/lib/duel/partie.test.ts
git commit -m "feat(duel): état de partie, rng à graine, pioche, énergie et tours"
```

---

### Task 4: Poser et attaquer — mots-clés Barrage, Prompt, Solide, Fragile, Ruse, roue, riposte, casse

**Files:**
- Modify: `src/lib/duel/partie.ts`
- Modify: `src/lib/duel/operations.ts` (ajout `infligerDegats`, `retirerCasses`)
- Test: `src/lib/duel/partie.test.ts` (ajout), `src/lib/duel/attaque.test.ts`

**Interfaces:**
- Consumes: Task 3 ; `statsDuel`, `domine`, `CARTES`.
- Produces: `poser(e, id, cible?): Resultat`, `attaquer(e, uid, cible): Resultat`, `finirTour` complet (Fragile), `infligerDegats(e, uid, n, source): number` (dégât réellement subi après Solide), `retirerCasses(e): { joueur, id }[]`, `ciblesLegales(e, uid): Cible[]`, `peutAttaquer(e, o): boolean`.

Les tests posent des objets à la main via un helper `avecEtal` (pas par `poser`, pour ne pas dépendre des mains tirées) :

- [ ] **Step 1: Helper de test et tests d'attaque**

```ts
// src/lib/duel/__test__/helpers.ts  (créer le dossier)
import type { EtatPartie, ObjetEnJeu } from "@/lib/duel/etat";
import { cloner } from "@/lib/duel/etat";
import { statsDuel } from "@/data/duel/cartesDuel";
import type { MotCleActif } from "@/data/duel/types";

/** Pose directement `id` sur l'étal du joueur `j`, posé à un tour passé (peut attaquer). */
export function avecObjet(e: EtatPartie, j: 0 | 1, id: string, poseAuTour = 0): { etat: EtatPartie; uid: number } {
  const etat = cloner(e);
  const s = statsDuel(id);
  const motsCles: MotCleActif[] = s.texte && s.texte.type !== "cri" && s.texte.type !== "effet" ? [s.texte.type] : [];
  const o: ObjetEnJeu = { uid: etat.prochainUid++, id, attaque: s.attaque, pv: s.pv, motsCles, poseAuTour, aAttaque: false };
  etat.joueurs[j].etal.push(o);
  return { etat, uid: o.uid };
}

export function avecMain(e: EtatPartie, j: 0 | 1, ids: string[], energie?: number): EtatPartie {
  const etat = cloner(e);
  etat.joueurs[j].main = [...ids];
  if (energie !== undefined) { etat.joueurs[j].energie = energie; etat.joueurs[j].plafond = Math.max(etat.joueurs[j].plafond, energie); }
  return etat;
}
```

```ts
// src/lib/duel/attaque.test.ts
import { describe, expect, it } from "vitest";
import { creerRng } from "@/lib/duel/rng";
import { attaquer, finirTour, nouvellePartie, poser } from "@/lib/duel/partie";
import { trouverObjet } from "@/lib/duel/etat";
import { avecMain, avecObjet } from "@/lib/duel/__test__/helpers";
import { DECK_A, DECK_B } from "@/lib/duel/partie.test";

const base = () => nouvellePartie(DECK_A, DECK_B, creerRng(1));
const MARTEAU = "carte.marteau_menuisier"; // Bricolage 2/1
const TABOURET = "carte.tabouret_bois_patine"; // Maison 2/4 Barrage
const AQUARELLE = "carte.aquarelle_paysage_anonyme"; // Objets d'art 1/2
const PINCE = "carte.pince_etirer_cuivre"; // Bricolage 3/1 Prompt
const TERRE_CUITE = "carte.terre_cuite_buste"; // Objets d'art 1/2 Solide
const MANETTE = "carte.manette_megadrive"; // Jeux 3/2 Fragile
const VESTE = "carte.veste_jean_delavee"; // Mode 2/2 Ruse
const SCIE = "carte.scie_egoine_de_charpentier"; // Bricolage 5/4

describe("attaquer", () => {
  it("frappe la vitrine de sa valeur d'attaque, une seule fois par tour", () => {
    const { etat, uid } = avecObjet(base(), 0, MARTEAU);
    const r = attaquer(etat, uid, { type: "vitrine" });
    expect(r.ok).toBe(true);
    expect(r.etat.joueurs[1].vitrine).toBe(18);
    expect(attaquer(r.etat, uid, { type: "vitrine" }).ok).toBe(false);
  });

  it("contre un objet : riposte simultanée, +1 si l'attaquant domine la catégorie de la cible (et en riposte)", () => {
    let s = avecObjet(base(), 0, MARTEAU); // Bricolage 2/1
    const marteau = s.uid;
    s = avecObjet(s.etat, 1, TABOURET); // Maison 2/4 : Bricolage domine Maison
    const r = attaquer(s.etat, marteau, { type: "objet", uid: s.uid });
    expect(r.ok).toBe(true);
    expect(trouverObjet(r.etat, s.uid)?.objet.pv).toBe(4 - 3); // 2 + 1 de roue
    expect(trouverObjet(r.etat, marteau)).toBeNull(); // 1 PV − 2 de riposte → casse
    expect(r.etat.joueurs[0].casse).toContain(MARTEAU);
  });

  it("la riposte porte aussi le bonus de roue quand c'est le défenseur qui domine", () => {
    let s = avecObjet(base(), 0, AQUARELLE); // Objets d'art 1/2 domine Bricolage
    const aquarelle = s.uid;
    s = avecObjet(s.etat, 1, SCIE); // Bricolage 5/4
    const r = attaquer(s.etat, aquarelle, { type: "objet", uid: s.uid });
    expect(trouverObjet(r.etat, s.uid)?.objet.pv).toBe(4 - 2); // 1 + 1 de roue
  });

  it("pas de bonus contre la vitrine", () => {
    const { etat, uid } = avecObjet(base(), 0, MARTEAU);
    expect(attaquer(etat, uid, { type: "vitrine" }).etat.joueurs[1].vitrine).toBe(18);
  });

  it("Barrage : la cible doit être un Barrage tant qu'il y en a un", () => {
    let s = avecObjet(base(), 0, MARTEAU);
    const marteau = s.uid;
    s = avecObjet(s.etat, 1, TABOURET);
    const tabouret = s.uid;
    s = avecObjet(s.etat, 1, AQUARELLE);
    expect(attaquer(s.etat, marteau, { type: "vitrine" }).ok).toBe(false);
    expect(attaquer(s.etat, marteau, { type: "objet", uid: s.uid }).ok).toBe(false);
    expect(attaquer(s.etat, marteau, { type: "objet", uid: tabouret }).ok).toBe(true);
  });

  it("un objet posé ce tour ne peut pas attaquer, sauf Prompt", () => {
    const e = base();
    let s = avecObjet(e, 0, MARTEAU, e.tour);
    expect(attaquer(s.etat, s.uid, { type: "vitrine" }).ok).toBe(false);
    s = avecObjet(e, 0, PINCE, e.tour);
    expect(attaquer(s.etat, s.uid, { type: "vitrine" }).ok).toBe(true);
  });

  it("Solide réduit chaque dégât de 1", () => {
    let s = avecObjet(base(), 0, MARTEAU); // 2 d'attaque
    const marteau = s.uid;
    s = avecObjet(s.etat, 1, TERRE_CUITE); // 1/2 Solide, Objets d'art (pas dominé par Bricolage)
    const r = attaquer(s.etat, marteau, { type: "objet", uid: s.uid });
    expect(trouverObjet(r.etat, s.uid)?.objet.pv).toBe(1);
  });

  it("Ruse : inciblable pendant son tour de pose et le tour adverse suivant, et ne compte pas comme Barrage", () => {
    let e = base();
    let s = avecObjet(e, 0, MARTEAU);
    const marteau = s.uid;
    e = finirTour(s.etat).etat; // tour 2, joueur 1
    s = avecObjet(e, 1, VESTE, e.tour);
    const veste = s.uid;
    e = finirTour(s.etat).etat; // tour 3, joueur 0
    expect(attaquer(e, marteau, { type: "objet", uid: veste }).ok).toBe(false);
    expect(attaquer(e, marteau, { type: "vitrine" }).ok).toBe(true);
    e = finirTour(e).etat; e = finirTour(e).etat; // tour 5
    expect(attaquer(e, marteau, { type: "objet", uid: veste }).ok).toBe(true);
  });

  it("un objet d'attaque 0 ne peut pas attaquer", () => {
    const s = avecObjet(base(), 0, MARTEAU);
    const etat = { ...s.etat, joueurs: [{ ...s.etat.joueurs[0], etal: s.etat.joueurs[0].etal.map((o) => ({ ...o, attaque: 0 })) }, s.etat.joueurs[1]] as typeof s.etat.joueurs };
    expect(attaquer(etat, s.uid, { type: "vitrine" }).ok).toBe(false);
  });

  it("vitrine à 0 : partie gagnée par l'attaquant", () => {
    const s = avecObjet(base(), 0, SCIE);
    const etat = { ...s.etat, joueurs: [s.etat.joueurs[0], { ...s.etat.joueurs[1], vitrine: 5 }] as typeof s.etat.joueurs };
    expect(attaquer(etat, s.uid, { type: "vitrine" }).etat.fini).toEqual({ vainqueur: 0 });
  });
});

describe("Fragile", () => {
  it("perd 1 PV en fin de tour de son propriétaire, et casse à 0", () => {
    let e = avecObjet(base(), 0, MANETTE).etat; // 3/2 Fragile
    e = finirTour(e).etat;
    expect(e.joueurs[0].etal[0].pv).toBe(1);
    e = finirTour(e).etat; // tour de J1 : rien
    expect(e.joueurs[0].etal[0].pv).toBe(1);
    e = finirTour(e).etat;
    expect(e.joueurs[0].etal).toHaveLength(0);
    expect(e.joueurs[0].casse).toContain(MANETTE);
  });
});

describe("poser", () => {
  it("paie le coût, refuse sans énergie, sans la carte, ou étal plein", () => {
    let e = avecMain(base(), 0, [MARTEAU, SCIE], 3);
    let r = poser(e, MARTEAU);
    expect(r.ok).toBe(true);
    expect(r.etat.joueurs[0].energie).toBe(2);
    expect(r.etat.joueurs[0].main).toEqual([SCIE]);
    expect(r.etat.joueurs[0].etal[0]).toMatchObject({ id: MARTEAU, attaque: 2, pv: 1, poseAuTour: e.tour, aAttaque: false });
    expect(poser(r.etat, SCIE).ok).toBe(false); // coût 4 > 2
    expect(poser(r.etat, MARTEAU).ok).toBe(false); // plus en main
    e = avecMain(base(), 0, [MARTEAU], 5);
    for (const id of [AQUARELLE, AQUARELLE, AQUARELLE, AQUARELLE]) e = avecObjet(e, 0, id).etat;
    expect(poser(e, MARTEAU).ok).toBe(false); // étal plein
  });

  it("un mot-clé persistant est porté par l'objet posé", () => {
    const e = avecMain(base(), 0, [TABOURET], 3);
    expect(poser(e, TABOURET).etat.joueurs[0].etal[0].motsCles).toEqual(["barrage"]);
  });
});
```

Exporter `DECK_A`/`DECK_B` depuis `partie.test.ts` est déjà fait en Task 3 (`export const`).

- [ ] **Step 2: Lancer, ça échoue**

Run: `npx vitest run --maxWorkers=4 src/lib/duel/attaque.test.ts`
Expected: FAIL, `poser`/`attaquer` non exportés.

- [ ] **Step 3: Implémenter**

Ajouter à `operations.ts` :

```ts
import { domine } from "@/data/duel/roue";
import { getPiece } from "@/data/pieces";
import type { CategorieObjet } from "@/types/game";
import { trouverObjet, type ObjetEnJeu } from "@/lib/duel/etat";

export function categorieDe(id: string): CategorieObjet {
  return getPiece(id)!.serie as CategorieObjet;
}

/** Applique `n` dégâts à l'objet `uid` (Solide déduit). Rend le dégât réellement subi. Mute `e`. */
export function infligerDegats(e: EtatPartie, uid: number, n: number): number {
  const t = trouverObjet(e, uid);
  if (!t) return 0;
  const reel = Math.max(0, n - (t.objet.motsCles.includes("solide") ? 1 : 0));
  t.objet.pv -= reel;
  return reel;
}

/** Bonus de roue : +1 si `attaquant` domine `cible`. */
export function degatsDAttaque(attaquant: ObjetEnJeu, cible: ObjetEnJeu): number {
  return attaquant.attaque + (domine(categorieDe(attaquant.id), categorieDe(cible.id)) ? 1 : 0);
}

/** Retire les objets à 0 PV (actif d'abord, gauche à droite) et rend la liste des cassés. Mute `e`. */
export function retirerCasses(e: EtatPartie): { joueur: 0 | 1; objet: ObjetEnJeu }[] {
  const casses: { joueur: 0 | 1; objet: ObjetEnJeu }[] = [];
  for (const j of [e.actif, e.actif === 0 ? 1 : 0] as const) {
    const joueur = e.joueurs[j];
    const vivants: ObjetEnJeu[] = [];
    for (const o of joueur.etal) {
      if (o.pv <= 0) { casses.push({ joueur: j, objet: o }); joueur.casse.push(o.id); e.journal.push(`J${j} casse ${o.id}`); }
      else vivants.push(o);
    }
    joueur.etal = vivants;
  }
  return casses;
}
```

Dans `partie.ts`, ajouter :

```ts
import { statsDuel } from "@/data/duel/cartesDuel";
import type { MotCleActif } from "@/data/duel/types";
import { ETAL_MAX, adverse, sousRuse, trouverObjet, type Cible, type ObjetEnJeu } from "@/lib/duel/etat";
import { degatsDAttaque, infligerDegats, retirerCasses } from "@/lib/duel/operations";

export function peutAttaquer(e: EtatPartie, o: ObjetEnJeu): boolean {
  if (o.aAttaque || o.attaque <= 0) return false;
  if (o.poseAuTour === e.tour && !o.motsCles.includes("prompt")) return false;
  return true;
}

/** Les cibles qu'un objet du joueur actif peut viser (Barrage et Ruse compris). */
export function ciblesLegales(e: EtatPartie, uid: number): Cible[] {
  const t = trouverObjet(e, uid);
  if (!t || t.joueur !== e.actif || !peutAttaquer(e, t.objet)) return [];
  const etalAdverse = e.joueurs[adverse(e.actif)].etal.filter((o) => !sousRuse(e, o));
  const barrages = etalAdverse.filter((o) => o.motsCles.includes("barrage"));
  if (barrages.length > 0) return barrages.map((o) => ({ type: "objet", uid: o.uid }));
  return [{ type: "vitrine" }, ...etalAdverse.map((o) => ({ type: "objet" as const, uid: o.uid }))];
}

export function attaquer(etat: EtatPartie, uid: number, cible: Cible): Resultat {
  if (etat.fini) return { ok: false, raison: "partieFinie", etat };
  const legale = ciblesLegales(etat, uid).some((c) => c.type === cible.type && (c.type === "vitrine" || c.uid === (cible as { uid: number }).uid));
  if (!legale) return { ok: false, raison: "cibleIllegale", etat };
  const e = cloner(etat);
  const attaquant = trouverObjet(e, uid)!.objet;
  attaquant.aAttaque = true;
  // Déclencheur « attaque » : Task 5.
  if (cible.type === "vitrine") {
    e.joueurs[adverse(e.actif)].vitrine -= attaquant.attaque;
    e.journal.push(`J${e.actif} ${attaquant.id} → vitrine ${attaquant.attaque}`);
  } else {
    const defenseur = trouverObjet(e, cible.uid)!.objet;
    const dA = degatsDAttaque(attaquant, defenseur);
    const dD = degatsDAttaque(defenseur, attaquant);
    infligerDegats(e, defenseur.uid, dA);
    infligerDegats(e, attaquant.uid, dD);
    e.journal.push(`J${e.actif} ${attaquant.id} ⇄ ${defenseur.id} (${dA}/${dD})`);
    retirerCasses(e);
  }
  verifierFin(e);
  return { ok: true, etat: e };
}

export function poser(etat: EtatPartie, id: string, cible?: Cible): Resultat {
  if (etat.fini) return { ok: false, raison: "partieFinie", etat };
  const j = etat.joueurs[etat.actif];
  const i = j.main.indexOf(id);
  if (i < 0) return { ok: false, raison: "pasEnMain", etat };
  const s = statsDuel(id);
  if (s.cout > j.energie) return { ok: false, raison: "energie", etat };
  if (j.etal.length >= ETAL_MAX) return { ok: false, raison: "etalPlein", etat };
  const e = cloner(etat);
  const joueur = e.joueurs[e.actif];
  joueur.main.splice(i, 1);
  joueur.energie -= s.cout;
  const motsCles: MotCleActif[] = s.texte && s.texte.type !== "cri" && s.texte.type !== "effet" ? [s.texte.type] : [];
  const objet: ObjetEnJeu = { uid: e.prochainUid++, id, attaque: s.attaque, pv: s.pv, motsCles, poseAuTour: e.tour, aAttaque: false };
  joueur.etal.push(objet);
  e.journal.push(`J${e.actif} pose ${id}`);
  void cible; // Cri et effets « pose » : Task 5.
  verifierFin(e);
  return { ok: true, etat: e };
}
```

Compléter `finirTour` (Fragile) :

```ts
export function finirTour(etat: EtatPartie): Resultat {
  if (etat.fini) return { ok: false, raison: "partieFinie", etat };
  const e = cloner(etat);
  for (const o of e.joueurs[e.actif].etal) if (o.motsCles.includes("fragile")) o.pv -= 1;
  retirerCasses(e);
  verifierFin(e);
  if (!e.fini) {
    e.actif = adverse(e.actif);
    commencerTour(e);
  }
  return { ok: true, etat: e };
}
```

- [ ] **Step 4: Lancer, ça passe**

Run: `npx vitest run --maxWorkers=4 src/lib/duel/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/duel/partie.ts src/lib/duel/operations.ts src/lib/duel/attaque.test.ts src/lib/duel/__test__/helpers.ts
git commit -m "feat(duel): poser et attaquer — mots-clés, roue, riposte, casse"
```

---

### Task 5: L'interpréteur d'effets (Cri et effets uniques, 5 déclencheurs)

**Files:**
- Create: `src/lib/duel/effets.ts`
- Modify: `src/lib/duel/partie.ts` (brancher `declencher` dans `poser`, `attaquer`, `commencerTour`, et après `infligerDegats`/`retirerCasses`)
- Test: `src/lib/duel/effets.test.ts`

**Interfaces:**
- Consumes: Tasks 2 à 4.
- Produces: `declencher(e, proprietaire, uid, declencheur, cible?): void` (mute), `appliquerAction(e, proprietaire, uid, action, cible?): void`, `nettoyerCasse(e): void` (retire les cassés et déclenche leurs effets `casse`, en boucle jusqu'à stabilité), `blesserObjet(e, uid, n): void` (infligerDegats + déclencheur `blesse`), `cibleRequise(id): boolean` (la carte a une action à choix à la pose), `ciblesDeChoix(e, joueur): number[]` (uids adverses ciblables par une action).

- [ ] **Step 1: Tests**

```ts
// src/lib/duel/effets.test.ts
import { describe, expect, it } from "vitest";
import { creerRng } from "@/lib/duel/rng";
import { attaquer, finirTour, nouvellePartie, poser } from "@/lib/duel/partie";
import { trouverObjet } from "@/lib/duel/etat";
import { cibleRequise } from "@/lib/duel/effets";
import { avecMain, avecObjet } from "@/lib/duel/__test__/helpers";
import { DECK_A, DECK_B } from "@/lib/duel/partie.test";

const base = () => nouvellePartie(DECK_A, DECK_B, creerRng(1));
const LOUPS = "carte.vinyle_des_loups_des_steppes_bark_to_be_free"; // Cri pioche
const TITOU = "carte.les_aventures_de_titou_cap_sur_la_lune"; // Cri 1 dégât
const SERVICE = "carte.service_the_faience"; // Cri +2 PV
const AQUARELLE = "carte.aquarelle_paysage_anonyme"; // 1/2
const MARTEAU = "carte.marteau_menuisier"; // 2/1
const TEST_PRESSING = "carte.test_pressing_des_trolling_sons"; // pose : alliés +1 att
const VIOLON = "carte.violon_de_maitre_cremonais_1715"; // debutTour : Musique +1 att
const GUITARE = "carte.guitare_classique_ancienne"; // attaque : pioche 1
const CONTE = "carte.conte_de_l_aviateur_et_de_l_enfant_roi_edition"; // casse : pioche 1
const FLIPPER = "carte.flipper_a_plateau_annees_60"; // blesse : 2 à la vitrine adverse
const BROCHE = "carte.broche_emaillee_artdeco"; // pose : retour en main
const STADIUM = "carte.cartouche_stadium_events"; // pose : 1 à tous + pioche 1
const DESSIN = "carte.dessin_surrealiste_aux_montres_molles_signe"; // pose : 2 à tous
const MOUSTACHU = "carte.le_petit_moustachu_edition_originale_1961"; // pose : 2 à un objet
const TERRE_CUITE = "carte.terre_cuite_buste"; // 1/2 Solide
const BOITE_MANUF = "carte.boite_d_outils_de_manufacture_signee"; // casse : 2 à tous
const SCIE = "carte.scie_egoine_de_charpentier"; // 5/4

describe("Cri", () => {
  it("pioche : +1 carte en main à la pose", () => {
    const e = avecMain(base(), 0, [LOUPS], 5);
    const r = poser(e, LOUPS);
    expect(r.etat.joueurs[0].main).toHaveLength(1);
    expect(r.etat.joueurs[0].deck).toHaveLength(e.joueurs[0].deck.length - 1);
  });

  it("1 dégât à l'objet adverse choisi (sans bonus de roue) ; s'éteint sans cible", () => {
    let s = avecObjet(avecMain(base(), 0, [TITOU], 5), 1, AQUARELLE);
    const r = poser(s.etat, TITOU, { type: "objet", uid: s.uid });
    expect(trouverObjet(r.etat, s.uid)?.objet.pv).toBe(1);
    expect(poser(avecMain(base(), 0, [TITOU], 5), TITOU).ok).toBe(true);
  });

  it("+2 PV à la vitrine, plafonnée à 20", () => {
    let e = avecMain(base(), 0, [SERVICE], 5);
    e = { ...e, joueurs: [{ ...e.joueurs[0], vitrine: 19 }, e.joueurs[1]] };
    expect(poser(e, SERVICE).etat.joueurs[0].vitrine).toBe(20);
  });

  it("une action à choix exige une cible quand il y en a une de possible", () => {
    const s = avecObjet(avecMain(base(), 0, [TITOU], 5), 1, AQUARELLE);
    expect(cibleRequise(TITOU)).toBe(true);
    expect(poser(s.etat, TITOU).ok).toBe(false);
  });
});

describe("effets uniques", () => {
  it("pose → gain alliés : tous les objets du propriétaire, lui compris", () => {
    const s = avecObjet(avecMain(base(), 0, [TEST_PRESSING], 5), 0, MARTEAU);
    const r = poser(s.etat, TEST_PRESSING);
    expect(r.etat.joueurs[0].etal.map((o) => o.attaque)).toEqual([3, 2]);
  });

  it("debutTour → gain alliés d'une catégorie, à chaque début de tour du propriétaire", () => {
    let s = avecObjet(base(), 0, VIOLON);
    s = avecObjet(s.etat, 0, MARTEAU);
    let e = finirTour(s.etat).etat; // J1
    e = finirTour(e).etat; // J0 : debutTour
    expect(e.joueurs[0].etal.map((o) => o.attaque)).toEqual([5, 2]); // violon 4→5, marteau (Bricolage) inchangé
  });

  it("attaque → pioche, résolu avant les dégâts", () => {
    const s = avecObjet(base(), 0, GUITARE);
    const r = attaquer(s.etat, s.uid, { type: "vitrine" });
    expect(r.etat.joueurs[0].main).toHaveLength(s.etat.joueurs[0].main.length + 1);
  });

  it("casse → pioche pour le propriétaire du cassé", () => {
    let s = avecObjet(base(), 0, SCIE);
    const scie = s.uid;
    s = avecObjet(s.etat, 1, CONTE);
    const mainAvant = s.etat.joueurs[1].main.length;
    const r = attaquer(s.etat, scie, { type: "objet", uid: s.uid });
    expect(trouverObjet(r.etat, s.uid)).toBeNull();
    expect(r.etat.joueurs[1].main).toHaveLength(mainAvant + 1);
  });

  it("blesse → 2 à la vitrine adverse ; pas déclenché si Solide annule tout", () => {
    let s = avecObjet(base(), 0, MARTEAU);
    const marteau = s.uid;
    s = avecObjet(s.etat, 1, FLIPPER);
    const r = attaquer(s.etat, marteau, { type: "objet", uid: s.uid });
    expect(r.etat.joueurs[0].vitrine).toBe(18);
  });

  it("pose → retour en main : l'objet adverse choisi revient dans la main de son propriétaire", () => {
    const s = avecObjet(avecMain(base(), 0, [BROCHE], 5), 1, SCIE);
    const r = poser(s.etat, BROCHE, { type: "objet", uid: s.uid });
    expect(r.etat.joueurs[1].etal).toHaveLength(0);
    expect(r.etat.joueurs[1].main).toContain(SCIE);
  });

  it("légendaire à deux actions : 1 dégât à tous les objets adverses puis pioche", () => {
    let s = avecObjet(avecMain(base(), 0, [STADIUM], 5), 1, AQUARELLE);
    s = avecObjet(s.etat, 1, MARTEAU);
    const r = poser(s.etat, STADIUM);
    expect(r.etat.joueurs[1].etal).toHaveLength(1); // le marteau (1 PV) casse
    expect(r.etat.joueurs[0].main).toHaveLength(1);
  });

  it("dégâts d'effet : Solide s'applique, pas la roue", () => {
    const s = avecObjet(avecMain(base(), 0, [DESSIN], 5), 1, TERRE_CUITE);
    const r = poser(s.etat, DESSIN);
    expect(trouverObjet(r.etat, s.uid)?.objet.pv).toBe(1); // 2 − 1 Solide
  });

  it("chaîne de casses : un objet cassé par un effet de casse déclenche à son tour", () => {
    let s = avecObjet(avecMain(base(), 0, [MOUSTACHU], 5), 1, BOITE_MANUF); // 4/4, casse → 2 à tous
    const boite = s.uid;
    s = { etat: { ...s.etat, joueurs: [s.etat.joueurs[0], { ...s.etat.joueurs[1], etal: s.etat.joueurs[1].etal.map((o) => ({ ...o, pv: 2 })) }] }, uid: boite };
    s = avecObjet(s.etat, 0, CONTE); // 2/2, casse → pioche
    const mainAvant = s.etat.joueurs[0].main.length - 1; // moins le moustachu posé
    const r = poser(s.etat, MOUSTACHU, { type: "objet", uid: boite });
    expect(r.etat.joueurs[1].etal).toHaveLength(0);
    expect(r.etat.joueurs[0].etal.map((o) => o.id)).toEqual([MOUSTACHU]); // le conte (2 PV) a pris 2
    expect(r.etat.joueurs[0].main).toHaveLength(mainAvant + 1);
  });
});
```

- [ ] **Step 2: Lancer, ça échoue**

Run: `npx vitest run --maxWorkers=4 src/lib/duel/effets.test.ts`
Expected: FAIL (`effets` introuvable, puis assertions).

- [ ] **Step 3: Écrire l'interpréteur**

```ts
// src/lib/duel/effets.ts
import { statsDuel } from "@/data/duel/cartesDuel";
import { actionAChoix, type Action, type Declencheur, type MotCleActif } from "@/data/duel/types";
import { MAIN_MAX, VITRINE_INITIALE, adverse, sousRuse, trouverObjet, type Cible, type EtatPartie } from "@/lib/duel/etat";
import { categorieDe, infligerDegats, piocher, retirerCasses } from "@/lib/duel/operations";

function actionsDe(id: string, declencheur: Declencheur): Action[] {
  const t = statsDuel(id).texte;
  if (!t) return [];
  if (t.type === "cri") {
    if (declencheur !== "pose") return [];
    if (t.variante === "pioche") return [{ type: "pioche", valeur: 1 }];
    if (t.variante === "degat") return [{ type: "degats", cible: "objetAdverse", valeur: 1 }];
    return [{ type: "soinVitrine", valeur: 2 }];
  }
  if (t.type === "effet") return t.declencheur === declencheur ? t.actions : [];
  return [];
}

export function cibleRequise(id: string): boolean {
  return actionsDe(id, "pose").some(actionAChoix);
}

/** Uids adverses qu'une action à choix du joueur `j` peut viser (hors Ruse). */
export function ciblesDeChoix(e: EtatPartie, j: 0 | 1): number[] {
  return e.joueurs[adverse(j)].etal.filter((o) => !sousRuse(e, o)).map((o) => o.uid);
}

/** Dégâts hors attaque : Solide s'applique, pas la roue ; déclenche `blesse`. Mute `e`. */
export function blesserObjet(e: EtatPartie, uid: number, n: number): void {
  const t = trouverObjet(e, uid);
  if (!t) return;
  const reel = infligerDegats(e, uid, n);
  if (reel > 0) declencher(e, t.joueur, uid, "blesse");
}

export function appliquerAction(e: EtatPartie, j: 0 | 1, uid: number, a: Action, cible?: Cible): void {
  const moi = e.joueurs[j];
  const lui = e.joueurs[adverse(j)];
  const cibleUid = cible?.type === "objet" && ciblesDeChoix(e, j).includes(cible.uid) ? cible.uid : null;
  switch (a.type) {
    case "degats":
      if (a.cible === "vitrineAdverse") lui.vitrine -= a.valeur;
      else if (a.cible === "tousObjetsAdverses") for (const o of [...lui.etal]) blesserObjet(e, o.uid, a.valeur);
      else if (cibleUid !== null) blesserObjet(e, cibleUid, a.valeur);
      break;
    case "soinVitrine":
      moi.vitrine = Math.min(VITRINE_INITIALE, moi.vitrine + a.valeur);
      break;
    case "pioche":
      piocher(e, j, a.valeur);
      break;
    case "energie":
      moi.energie += a.valeur;
      break;
    case "gain": {
      const cibles = a.cible === "soi"
        ? moi.etal.filter((o) => o.uid === uid)
        : a.cible === "allies" ? moi.etal : moi.etal.filter((o) => categorieDe(o.id) === a.categorie);
      for (const o of cibles) { if (a.stat === "attaque") o.attaque += a.valeur; else o.pv += a.valeur; }
      break;
    }
    case "retourEnMain":
      if (cibleUid !== null) {
        const o = lui.etal.find((x) => x.uid === cibleUid)!;
        lui.etal = lui.etal.filter((x) => x.uid !== cibleUid);
        if (lui.main.length >= MAIN_MAX) lui.casse.push(o.id); else lui.main.push(o.id);
      }
      break;
    case "volMotCle":
      if (cibleUid !== null) {
        const o = lui.etal.find((x) => x.uid === cibleUid)!;
        const vole: MotCleActif | undefined = o.motsCles.shift();
        const soi = moi.etal.find((x) => x.uid === uid);
        if (vole && soi && !soi.motsCles.includes(vole)) soi.motsCles.push(vole);
      }
      break;
  }
}

/** Déclenche les actions de l'objet `uid` (propriétaire `j`) pour `declencheur`, puis nettoie les casses. Mute `e`. */
export function declencher(e: EtatPartie, j: 0 | 1, uid: number, declencheur: Declencheur, cible?: Cible): void {
  const t = trouverObjet(e, uid);
  const id = t?.objet.id ?? e.joueurs[j].casse[e.joueurs[j].casse.length - 1];
  if (!id) return;
  for (const a of actionsDe(id, declencheur)) appliquerAction(e, j, uid, a, cible);
  nettoyerCasse(e);
}

/** Retire les objets à 0 PV et déclenche leurs effets `casse`, jusqu'à stabilité. Mute `e`. */
export function nettoyerCasse(e: EtatPartie): void {
  for (let garde = 0; garde < 20; garde++) {
    const casses = retirerCasses(e);
    if (casses.length === 0) return;
    for (const c of casses) for (const a of actionsDe(c.objet.id, "casse")) appliquerAction(e, c.joueur, c.objet.uid, a);
  }
}
```

Brancher dans `partie.ts` :

- `poser` : après le `push` de l'objet, si `cibleRequise(id)` et `ciblesDeChoix(e, e.actif).length > 0` et pas de `cible` valide → `{ ok: false, raison: "cibleRequise" }` (vérifier **avant** de cloner). Puis `declencher(e, e.actif, objet.uid, "pose", cible)`.
- `attaquer` : après `aAttaque = true`, `declencher(e, e.actif, uid, "attaque")` ; relire l'attaquant (`trouverObjet`) car ses stats ont pu changer ; remplacer les deux `infligerDegats` par `blesserObjet` puis `nettoyerCasse(e)` à la place de `retirerCasses(e)`.
- `commencerTour` : après `piocher`, `for (const o of [...j.etal]) declencher(e, e.actif, o.uid, "debutTour")`.
- `finirTour` : remplacer `retirerCasses(e)` par `nettoyerCasse(e)`.

- [ ] **Step 4: Lancer tout le dossier, ça passe**

Run: `npx vitest run --maxWorkers=4 src/lib/duel/ src/data/duel/`
Expected: PASS. Le test « pose → gain alliés » attend `[3, 2]` : le marteau posé avant (3) puis le test pressing (1+1 = 2).

- [ ] **Step 5: Commit**

```bash
git add src/lib/duel/effets.ts src/lib/duel/effets.test.ts src/lib/duel/partie.ts src/lib/duel/operations.ts
git commit -m "feat(duel): interpréteur des Cris et des effets uniques, cinq déclencheurs"
```

---

### Task 6: Validation de deck et générateurs de decks de campagne

**Files:**
- Create: `src/lib/duel/deck.ts`
- Create: `src/lib/duel/generateursDecks.ts`
- Test: `src/lib/duel/deck.test.ts`

**Interfaces:**
- Consumes: `CARTES`, `statsDuel`, `creerRng`, `melanger`, `ROUE`.
- Produces: `validerDeck(ids): string[]` (liste de raisons, vide si valide : `taille`, `doublon`, `inconnue`, `legendaires`) ; `deckAleatoire(rng)`, `deckBicolore(rng, a, b)`, `deckCourbe(rng, "agressif" | "controle")` → `string[]` valides ; `TAILLE_DECK = 20`, `LEGENDAIRES_MAX = 2`.

- [ ] **Step 1: Tests**

```ts
// src/lib/duel/deck.test.ts
import { describe, expect, it } from "vitest";
import { CARTES } from "@/data/cartes";
import { getPiece } from "@/data/pieces";
import { statsDuel } from "@/data/duel/cartesDuel";
import { creerRng } from "@/lib/duel/rng";
import { validerDeck } from "@/lib/duel/deck";
import { deckAleatoire, deckBicolore, deckCourbe } from "@/lib/duel/generateursDecks";

const LEG = CARTES.filter((c) => c.rarete === "legendaire").map((c) => c.id);
const COM = CARTES.filter((c) => c.rarete === "commun").map((c) => c.id);

describe("validerDeck", () => {
  it("accepte 20 cartes distinctes avec ≤ 2 légendaires", () => {
    expect(validerDeck([...LEG.slice(0, 2), ...COM.slice(0, 18)])).toEqual([]);
  });
  it("refuse taille, doublon, inconnue, 3 légendaires", () => {
    expect(validerDeck(COM.slice(0, 19))).toContain("taille");
    expect(validerDeck([COM[0], ...COM.slice(0, 19)])).toContain("doublon");
    expect(validerDeck(["carte.nimporte", ...COM.slice(0, 19)])).toContain("inconnue");
    expect(validerDeck([...LEG.slice(0, 3), ...COM.slice(0, 17)])).toContain("legendaires");
  });
});

describe("générateurs", () => {
  it("tous rendent des decks valides, déterministes par graine", () => {
    for (const gen of [
      (r: () => number) => deckAleatoire(r),
      (r: () => number) => deckBicolore(r, "Bricolage", "Maison"),
      (r: () => number) => deckCourbe(r, "agressif"),
      (r: () => number) => deckCourbe(r, "controle"),
    ]) {
      const d1 = gen(creerRng(5)), d2 = gen(creerRng(5));
      expect(validerDeck(d1)).toEqual([]);
      expect(d1).toEqual(d2);
    }
  });
  it("bicolore : au moins 14 cartes des deux catégories", () => {
    const d = deckBicolore(creerRng(3), "Musique", "Mode");
    expect(d.filter((id) => ["Musique", "Mode"].includes(getPiece(id)!.serie)).length).toBeGreaterThanOrEqual(14);
  });
  it("courbe : agressif ⇒ coûts ≤ 3, contrôle ⇒ coûts ≥ 3", () => {
    expect(deckCourbe(creerRng(1), "agressif").every((id) => statsDuel(id).cout <= 3)).toBe(true);
    expect(deckCourbe(creerRng(1), "controle").every((id) => statsDuel(id).cout >= 3)).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer, ça échoue** — `npx vitest run --maxWorkers=4 src/lib/duel/deck.test.ts`

- [ ] **Step 3: Implémenter**

```ts
// src/lib/duel/deck.ts
import { getPiece } from "@/data/pieces";
import { CARTES_DUEL } from "@/data/duel/cartesDuel";

export const TAILLE_DECK = 20;
export const LEGENDAIRES_MAX = 2;

export function validerDeck(ids: readonly string[]): string[] {
  const raisons: string[] = [];
  if (ids.length !== TAILLE_DECK) raisons.push("taille");
  if (new Set(ids).size !== ids.length) raisons.push("doublon");
  if (ids.some((id) => !CARTES_DUEL[id])) raisons.push("inconnue");
  if (ids.filter((id) => getPiece(id)?.rarete === "legendaire").length > LEGENDAIRES_MAX) raisons.push("legendaires");
  return raisons;
}
```

```ts
// src/lib/duel/generateursDecks.ts
import { CARTES } from "@/data/cartes";
import { statsDuel } from "@/data/duel/cartesDuel";
import { melanger } from "@/lib/duel/rng";
import { LEGENDAIRES_MAX, TAILLE_DECK } from "@/lib/duel/deck";
import type { CategorieObjet } from "@/types/game";

/** Prend dans `prioritaires` puis `reste` (mélangés), en respectant la limite de légendaires. */
function composer(rng: () => number, prioritaires: string[], reste: string[]): string[] {
  const deck: string[] = [];
  let leg = 0;
  for (const id of [...melanger(prioritaires, rng), ...melanger(reste, rng)]) {
    if (deck.length >= TAILLE_DECK) break;
    const estLeg = CARTES.find((c) => c.id === id)!.rarete === "legendaire";
    if (estLeg && leg >= LEGENDAIRES_MAX) continue;
    if (estLeg) leg++;
    deck.push(id);
  }
  return deck;
}

const TOUTES = CARTES.map((c) => c.id);

export function deckAleatoire(rng: () => number): string[] {
  return composer(rng, [], TOUTES);
}

export function deckBicolore(rng: () => number, a: CategorieObjet, b: CategorieObjet): string[] {
  const dedans = CARTES.filter((c) => c.serie === a || c.serie === b).map((c) => c.id);
  return composer(rng, dedans, TOUTES.filter((id) => !dedans.includes(id)));
}

export function deckCourbe(rng: () => number, profil: "agressif" | "controle"): string[] {
  const pool = TOUTES.filter((id) => (profil === "agressif" ? statsDuel(id).cout <= 3 : statsDuel(id).cout >= 3));
  return composer(rng, pool, []);
}
```

- [ ] **Step 4: Lancer, ça passe** — `npx vitest run --maxWorkers=4 src/lib/duel/deck.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/duel/deck.ts src/lib/duel/generateursDecks.ts src/lib/duel/deck.test.ts
git commit -m "feat(duel): validation de deck et générateurs aléatoire, bicolore, par courbe"
```

---

### Task 7: Les deux joueurs artificiels et une partie complète

**Files:**
- Create: `src/lib/duel/ia.ts`
- Create: `src/lib/duel/simulation.ts`
- Test: `src/lib/duel/ia.test.ts`, `src/lib/duel/simulation.test.ts`

**Interfaces:**
- Consumes: Tasks 3 à 6.
- Produces: `type Profil = "agressif" | "prudent"` ; `jouerTour(e, profil): EtatPartie` (pose, attaque, puis `finirTour`) ; `choisirCibleDeChoix(e, id): Cible | undefined` ; `jouerPartie({ deckA, deckB, profilA, profilB, graine }): ResultatPartie` avec `{ vainqueur: 0 | 1 | null, manches, epuisee: boolean, pioches: Record<id, number>, poses: Record<id, number> }`.

- [ ] **Step 1: Tests**

```ts
// src/lib/duel/ia.test.ts
import { describe, expect, it } from "vitest";
import { creerRng } from "@/lib/duel/rng";
import { nouvellePartie } from "@/lib/duel/partie";
import { jouerTour } from "@/lib/duel/ia";
import { avecMain, avecObjet } from "@/lib/duel/__test__/helpers";
import { DECK_A, DECK_B } from "@/lib/duel/partie.test";

const base = () => nouvellePartie(DECK_A, DECK_B, creerRng(1));
const MARTEAU = "carte.marteau_menuisier"; // 2/1, coût 1
const SCIE = "carte.scie_egoine_de_charpentier"; // 5/4, coût 4
const AQUARELLE = "carte.aquarelle_paysage_anonyme"; // 1/2
const TABOURET = "carte.tabouret_bois_patine"; // 2/4 Barrage

describe("IA", () => {
  it("pose la carte la plus chère qu'elle peut payer, puis finit son tour", () => {
    const e = avecMain(base(), 0, [MARTEAU, SCIE], 4);
    const r = jouerTour(e, "agressif");
    expect(r.actif).toBe(1);
    expect(r.joueurs[0].etal.map((o) => o.id)).toEqual([SCIE]);
  });

  it("agressif : frappe la vitrine plutôt que d'échanger, sauf coup fatal ou échange gagnant", () => {
    let s = avecObjet(base(), 0, SCIE);
    s = avecObjet(s.etat, 1, AQUARELLE);
    const r = jouerTour(avecMain(s.etat, 0, [], 0), "agressif");
    // la scie (5/4) tue l'aquarelle (1/2) en survivant : échange gagnant pris
    expect(r.joueurs[1].etal).toHaveLength(0);
  });

  it("agressif : avec un coup fatal disponible, va à la vitrine", () => {
    let s = avecObjet(base(), 0, SCIE);
    s = avecObjet(s.etat, 1, AQUARELLE);
    const e = { ...s.etat, joueurs: [s.etat.joueurs[0], { ...s.etat.joueurs[1], vitrine: 5 }] as typeof s.etat.joueurs };
    const r = jouerTour(avecMain(e, 0, [], 0), "agressif");
    expect(r.fini).toEqual({ vainqueur: 0 });
  });

  it("prudent : n'attaque pas la vitrine sans étal dominant, mais prend un échange de valeur", () => {
    let s = avecObjet(base(), 0, MARTEAU); // 2/1 coût 1
    s = avecObjet(s.etat, 1, TABOURET); // 2/4 coût 3 : Barrage, l'échange est forcé de toute façon
    const r = jouerTour(avecMain(s.etat, 0, [], 0), "prudent");
    expect(r.joueurs[1].vitrine).toBe(20);
  });

  it("respecte le Barrage", () => {
    let s = avecObjet(base(), 0, SCIE);
    s = avecObjet(s.etat, 1, TABOURET);
    const r = jouerTour(avecMain(s.etat, 0, [], 0), "agressif");
    expect(r.joueurs[1].vitrine).toBe(20);
    expect(r.joueurs[1].etal).toHaveLength(0);
  });
});
```

```ts
// src/lib/duel/simulation.test.ts
import { describe, expect, it } from "vitest";
import { creerRng } from "@/lib/duel/rng";
import { deckAleatoire } from "@/lib/duel/generateursDecks";
import { jouerPartie } from "@/lib/duel/simulation";
import { MANCHES_MAX } from "@/lib/duel/etat";

describe("jouerPartie", () => {
  it("est déterministe par graine", () => {
    const rng = creerRng(11);
    const a = deckAleatoire(rng), b = deckAleatoire(rng);
    const r1 = jouerPartie({ deckA: a, deckB: b, profilA: "agressif", profilB: "prudent", graine: 3 });
    const r2 = jouerPartie({ deckA: a, deckB: b, profilA: "agressif", profilB: "prudent", graine: 3 });
    expect(r1).toEqual(r2);
    expect(r1.manches).toBeLessThanOrEqual(MANCHES_MAX);
  });

  it("robustesse : 200 parties aléatoires sans exception ni boucle", () => {
    const rng = creerRng(2026);
    let finies = 0;
    for (let i = 0; i < 200; i++) {
      const r = jouerPartie({
        deckA: deckAleatoire(rng), deckB: deckAleatoire(rng),
        profilA: i % 2 ? "agressif" : "prudent", profilB: i % 3 ? "prudent" : "agressif", graine: i,
      });
      expect(r.manches).toBeLessThanOrEqual(MANCHES_MAX);
      if (!r.epuisee) finies++;
      const totalPoses = Object.values(r.poses).reduce((s, n) => s + n, 0);
      expect(totalPoses).toBeGreaterThan(0);
    }
    expect(finies).toBeGreaterThan(190);
  });
});
```

- [ ] **Step 2: Lancer, ça échoue** — `npx vitest run --maxWorkers=4 src/lib/duel/ia.test.ts src/lib/duel/simulation.test.ts`

- [ ] **Step 3: Implémenter l'IA**

```ts
// src/lib/duel/ia.ts
import { statsDuel } from "@/data/duel/cartesDuel";
import { actionAChoix } from "@/data/duel/types";
import { ETAL_MAX, adverse, sousRuse, type Cible, type EtatPartie, type ObjetEnJeu } from "@/lib/duel/etat";
import { cibleRequise, ciblesDeChoix } from "@/lib/duel/effets";
import { degatsDAttaque } from "@/lib/duel/operations";
import { attaquer, ciblesLegales, finirTour, peutAttaquer, poser } from "@/lib/duel/partie";

export type Profil = "agressif" | "prudent";

function valeur(o: ObjetEnJeu): number {
  return statsDuel(o.id).cout;
}

/** Cible d'une action à choix à la pose : l'objet adverse que l'action tue, sinon le plus cher. */
export function choisirCibleDeChoix(e: EtatPartie, id: string): Cible | undefined {
  if (!cibleRequise(id)) return undefined;
  const uids = ciblesDeChoix(e, e.actif);
  if (uids.length === 0) return undefined;
  const adv = e.joueurs[adverse(e.actif)].etal.filter((o) => uids.includes(o.uid));
  const t = statsDuel(id).texte;
  const action = t?.type === "effet" ? t.actions.find(actionAChoix) : t?.type === "cri" ? { type: "degats", valeur: 1 } : undefined;
  if (action && action.type === "degats") {
    const tuables = adv.filter((o) => o.pv - (o.motsCles.includes("solide") ? 1 : 0) <= action.valeur);
    const pool = tuables.length ? tuables : adv;
    return { type: "objet", uid: pool.sort((a, b) => valeur(b) - valeur(a))[0].uid };
  }
  if (action && action.type === "volMotCle") {
    const avec = adv.filter((o) => o.motsCles.length > 0);
    if (avec.length === 0) return { type: "objet", uid: adv[0].uid };
    return { type: "objet", uid: avec[0].uid };
  }
  return { type: "objet", uid: [...adv].sort((a, b) => valeur(b) - valeur(a))[0].uid };
}

function phasePose(e: EtatPartie): EtatPartie {
  for (;;) {
    const j = e.joueurs[e.actif];
    if (j.etal.length >= ETAL_MAX) return e;
    const jouables = j.main
      .filter((id) => statsDuel(id).cout <= j.energie)
      .sort((a, b) => {
        const sa = statsDuel(a), sb = statsDuel(b);
        return sb.cout - sa.cout || sb.attaque + sb.pv - (sa.attaque + sa.pv);
      });
    if (jouables.length === 0) return e;
    const r = poser(e, jouables[0], choisirCibleDeChoix(e, jouables[0]));
    if (!r.ok) return e;
    e = r.etat;
  }
}

/** L'objet `o` tue `cible` en survivant ? */
function echangeGagnant(o: ObjetEnJeu, cible: ObjetEnJeu): boolean {
  const dA = degatsDAttaque(o, cible) - (cible.motsCles.includes("solide") ? 1 : 0);
  const dD = degatsDAttaque(cible, o) - (o.motsCles.includes("solide") ? 1 : 0);
  return dA >= cible.pv && dD < o.pv;
}

function tue(o: ObjetEnJeu, cible: ObjetEnJeu): boolean {
  return degatsDAttaque(o, cible) - (cible.motsCles.includes("solide") ? 1 : 0) >= cible.pv;
}

function phaseAttaque(e: EtatPartie, profil: Profil): EtatPartie {
  for (;;) {
    if (e.fini) return e;
    const moi = e.joueurs[e.actif];
    const lui = e.joueurs[adverse(e.actif)];
    const prets = moi.etal.filter((o) => peutAttaquer(e, o)).sort((a, b) => b.attaque - a.attaque);
    if (prets.length === 0) return e;
    const o = prets[0];
    const cibles = ciblesLegales(e, o.uid);
    if (cibles.length === 0) { e = { ...e, joueurs: marquerAttaque(e, o.uid) }; continue; }
    const vitrineOk = cibles.some((c) => c.type === "vitrine");
    const objets = cibles.filter((c): c is { type: "objet"; uid: number } => c.type === "objet")
      .map((c) => lui.etal.find((x) => x.uid === c.uid)!);
    const attaqueTotale = prets.reduce((s, x) => s + x.attaque, 0);
    let cible: Cible | undefined;
    if (vitrineOk && attaqueTotale >= lui.vitrine) cible = { type: "vitrine" };
    else if (profil === "agressif") {
      const gagnant = objets.filter((c) => echangeGagnant(o, c)).sort((a, b) => valeur(b) - valeur(a))[0];
      cible = gagnant ? { type: "objet", uid: gagnant.uid } : vitrineOk ? { type: "vitrine" } : { type: "objet", uid: objets.sort((a, b) => a.pv - b.pv)[0].uid };
    } else {
      const deValeur = objets.filter((c) => tue(o, c) && valeur(c) >= valeur(o)).sort((a, b) => valeur(b) - valeur(a))[0];
      const gagnant = objets.filter((c) => echangeGagnant(o, c)).sort((a, b) => valeur(b) - valeur(a))[0];
      const dominant = moi.etal.reduce((s, x) => s + x.attaque, 0) > lui.etal.reduce((s, x) => s + x.attaque, 0);
      if (deValeur) cible = { type: "objet", uid: deValeur.uid };
      else if (gagnant) cible = { type: "objet", uid: gagnant.uid };
      else if (vitrineOk && dominant) cible = { type: "vitrine" };
      else if (vitrineOk) cible = { type: "vitrine" };
      else cible = { type: "objet", uid: objets.sort((a, b) => a.pv - b.pv)[0].uid };
    }
    const r = attaquer(e, o.uid, cible);
    if (!r.ok) { e = { ...e, joueurs: marquerAttaque(e, o.uid) }; continue; }
    e = r.etat;
  }
}

/** Sortie de secours : un objet sans coup légal est marqué comme ayant attaqué (jamais de boucle). */
function marquerAttaque(e: EtatPartie, uid: number): EtatPartie["joueurs"] {
  const j = e.joueurs[e.actif];
  const etal = j.etal.map((o) => (o.uid === uid ? { ...o, aAttaque: true } : o));
  return e.actif === 0 ? [{ ...j, etal }, e.joueurs[1]] : [e.joueurs[0], { ...j, etal }];
}

export function jouerTour(etat: EtatPartie, profil: Profil): EtatPartie {
  if (etat.fini) return etat;
  let e = phasePose(etat);
  e = phaseAttaque(e, profil);
  if (e.fini) return e;
  const r = finirTour(e);
  return r.ok ? r.etat : e;
}
```

Note : dans `phaseAttaque`, `sousRuse` n'est pas utilisé directement (déjà filtré par `ciblesLegales`) ; retirer l'import si eslint le signale.

```ts
// src/lib/duel/simulation.ts
import { MANCHES_MAX, manche, type EtatPartie } from "@/lib/duel/etat";
import { jouerTour, type Profil } from "@/lib/duel/ia";
import { nouvellePartie } from "@/lib/duel/partie";
import { creerRng } from "@/lib/duel/rng";

export interface ParametresPartie {
  deckA: readonly string[];
  deckB: readonly string[];
  profilA: Profil;
  profilB: Profil;
  graine: number;
}

export interface ResultatPartie {
  vainqueur: 0 | 1 | null;
  manches: number;
  epuisee: boolean;
  /** Fois où chaque carte est entrée dans une main (pioche initiale comprise). */
  pioches: Record<string, number>;
  poses: Record<string, number>;
}

function compter(rec: Record<string, number>, id: string): void {
  rec[id] = (rec[id] ?? 0) + 1;
}

export function jouerPartie(p: ParametresPartie): ResultatPartie {
  let e: EtatPartie = nouvellePartie(p.deckA, p.deckB, creerRng(p.graine));
  const pioches: Record<string, number> = {};
  const poses: Record<string, number> = {};
  const vues = [new Set<string>(), new Set<string>()];
  const noter = (etat: EtatPartie) => {
    for (const j of [0, 1] as const) for (const id of etat.joueurs[j].main) if (!vues[j].has(id)) { vues[j].add(id); compter(pioches, id); }
  };
  noter(e);
  let epuisee = false;
  let journalLu = 0;
  while (!e.fini) {
    if (manche(e) > MANCHES_MAX) { epuisee = true; break; }
    e = jouerTour(e, e.actif === 0 ? p.profilA : p.profilB);
    // Les poses se comptent au journal : un objet posé puis cassé dans le même tour n'est plus sur l'étal.
    for (const ligne of e.journal.slice(journalLu)) { const m = /^J\d pose (.+)$/.exec(ligne); if (m) compter(poses, m[1]); }
    journalLu = e.journal.length;
    noter(e);
  }
  return { vainqueur: epuisee ? null : e.fini!.vainqueur, manches: Math.min(manche(e), MANCHES_MAX), epuisee, pioches, poses };
}
```

- [ ] **Step 4: Lancer, ça passe** — `npx vitest run --maxWorkers=4 src/lib/duel/`

Si « robustesse » échoue sur `finies > 190` : c'est un signal d'équilibrage (parties trop longues), pas un bug de plan ; noter le chiffre, abaisser provisoirement le seuil à 150 et consigner dans le rapport (Task 8).

- [ ] **Step 5: Commit**

```bash
git add src/lib/duel/ia.ts src/lib/duel/ia.test.ts src/lib/duel/simulation.ts src/lib/duel/simulation.test.ts
git commit -m "feat(duel): joueurs artificiels agressif et prudent, partie complète déterministe"
```

---

### Task 8: La campagne de mesures, son script et le rapport

**Files:**
- Create: `src/lib/duel/campagne.ts`
- Create: `scripts/duel-campagne.ts`
- Create: `docs/superpowers/duel/rapport-equilibrage.md`
- Modify: `package.json` (script `duel:campagne`)
- Test: `src/lib/duel/campagne.test.ts`

**Interfaces:**
- Consumes: Task 6, 7.
- Produces: `campagne({ graine, nParties }): Mesures` avec `Mesures = { parties, cartes: Record<id, { parties, victoires, pioches, poses }>, categories: Record<cat, number>, premierJoueur: number, manchesMoyenne, manchesMax, nuls, epuisees, agressifVsControle: number }` ; `horsCible(m): string[]` (lignes lisibles) ; `CIBLES` (constantes de la spec §6.4) ; `formaterRapport(m, graine): string` (markdown).

- [ ] **Step 1: Test**

```ts
// src/lib/duel/campagne.test.ts
import { describe, expect, it } from "vitest";
import { CARTES } from "@/data/cartes";
import { campagne, formaterRapport, horsCible } from "@/lib/duel/campagne";

describe("campagne", () => {
  it("mesure 120 parties : toutes les cartes vues, taux bornés, rapport formaté", () => {
    const m = campagne({ graine: 1, nParties: 120 });
    expect(m.parties).toBe(120);
    expect(Object.keys(m.cartes)).toHaveLength(CARTES.length);
    for (const c of Object.values(m.cartes)) expect(c.victoires).toBeLessThanOrEqual(c.parties);
    expect(m.premierJoueur).toBeGreaterThanOrEqual(0);
    expect(m.premierJoueur).toBeLessThanOrEqual(1);
    expect(Object.keys(m.categories)).toHaveLength(7);
    const texte = formaterRapport(m, 1);
    expect(texte).toContain("| Carte |");
    expect(Array.isArray(horsCible(m))).toBe(true);
  });

  it("est déterministe", () => {
    expect(campagne({ graine: 4, nParties: 30 })).toEqual(campagne({ graine: 4, nParties: 30 }));
  });
});
```

- [ ] **Step 2: Lancer, ça échoue** — `npx vitest run --maxWorkers=4 src/lib/duel/campagne.test.ts`

- [ ] **Step 3: Implémenter**

```ts
// src/lib/duel/campagne.ts
import { CARTES } from "@/data/cartes";
import { ROUE } from "@/data/duel/roue";
import { creerRng } from "@/lib/duel/rng";
import { deckAleatoire, deckBicolore, deckCourbe } from "@/lib/duel/generateursDecks";
import { jouerPartie } from "@/lib/duel/simulation";
import type { Profil } from "@/lib/duel/ia";
import type { CategorieObjet } from "@/types/game";

export interface MesureCarte { parties: number; victoires: number; pioches: number; poses: number }
export interface Mesures {
  parties: number;
  cartes: Record<string, MesureCarte>;
  /** Moyenne des taux de victoire des cartes de la catégorie. */
  categories: Record<CategorieObjet, number>;
  premierJoueur: number;
  manchesMoyenne: number;
  manchesMax: number;
  nuls: number;
  epuisees: number;
  /** Taux de victoire du deck agressif contre le deck contrôle. */
  agressifVsControle: number;
}

export const CIBLES = {
  carteMin: 0.45, carteMax: 0.55, poseMin: 0.6, categorieMin: 0.45, categorieMax: 0.55,
  premierJoueurMax: 0.55, manchesMin: 8, manchesMax: 14, mancheDure: 25, nulsMax: 0.02, courbeMin: 0.45, courbeMax: 0.55,
} as const;

const PROFILS: Profil[] = ["agressif", "prudent"];

/** Répartition : 50 % aléatoires, 25 % bicolores, 25 % par courbe. */
export function campagne({ graine, nParties }: { graine: number; nParties: number }): Mesures {
  const rng = creerRng(graine);
  const cartes: Record<string, MesureCarte> = Object.fromEntries(CARTES.map((c) => [c.id, { parties: 0, victoires: 0, pioches: 0, poses: 0 }]));
  let premier = 0, decidees = 0, manches = 0, manchesMax = 0, nuls = 0, epuisees = 0, aggroV = 0, aggroN = 0;
  for (let i = 0; i < nParties; i++) {
    const famille = i % 4 < 2 ? "aleatoire" : i % 4 === 2 ? "bicolore" : "courbe";
    let deckA: string[], deckB: string[];
    if (famille === "aleatoire") { deckA = deckAleatoire(rng); deckB = deckAleatoire(rng); }
    else if (famille === "bicolore") {
      const a = Math.floor(rng() * 7), b = (a + 1 + Math.floor(rng() * 6)) % 7;
      deckA = deckBicolore(rng, ROUE[a], ROUE[b]);
      const c = Math.floor(rng() * 7), d = (c + 1 + Math.floor(rng() * 6)) % 7;
      deckB = deckBicolore(rng, ROUE[c], ROUE[d]);
    } else {
      const aggroEnA = rng() < 0.5;
      deckA = deckCourbe(rng, aggroEnA ? "agressif" : "controle");
      deckB = deckCourbe(rng, aggroEnA ? "controle" : "agressif");
    }
    const profilA = PROFILS[Math.floor(rng() * 2)], profilB = PROFILS[Math.floor(rng() * 2)];
    const r = jouerPartie({ deckA, deckB, profilA, profilB, graine: graine * 100003 + i });
    manches += r.manches; manchesMax = Math.max(manchesMax, r.manches);
    if (r.epuisee) epuisees++;
    else if (r.vainqueur === null) nuls++;
    else { decidees++; if (r.vainqueur === 0) premier++; }
    for (const [j, deck] of [deckA, deckB].entries()) {
      for (const id of deck) {
        const m = cartes[id];
        if (r.vainqueur !== null) { m.parties++; if (r.vainqueur === j) m.victoires++; }
      }
    }
    for (const [id, n] of Object.entries(r.pioches)) cartes[id].pioches += n;
    for (const [id, n] of Object.entries(r.poses)) cartes[id].poses += n;
    if (famille === "courbe" && r.vainqueur !== null) {
      aggroN++;
      if ((r.vainqueur === 0) === deckAEstAggro(deckA)) aggroV++;
    }
  }
  const taux = (id: string) => (cartes[id].parties ? cartes[id].victoires / cartes[id].parties : 0.5);
  const categories = Object.fromEntries(ROUE.map((cat) => {
    const ids = CARTES.filter((c) => c.serie === cat).map((c) => c.id);
    return [cat, ids.reduce((s, id) => s + taux(id), 0) / ids.length];
  })) as Record<CategorieObjet, number>;
  return {
    parties: nParties, cartes, categories,
    premierJoueur: decidees ? premier / decidees : 0.5,
    manchesMoyenne: manches / nParties, manchesMax,
    nuls: nuls / nParties, epuisees: epuisees / nParties,
    agressifVsControle: aggroN ? aggroV / aggroN : 0.5,
  };
}

const CARTES_COUT: Record<string, number> = Object.fromEntries(CARTES.map((c) => [c.id, statsDuel(c.id).cout]));

function deckAEstAggro(deck: string[]): boolean {
  return deck.every((id) => CARTES_COUT[id] <= 3);
}
```

(ajouter `import { statsDuel } from "@/data/duel/cartesDuel";` en tête du fichier.)

Puis `horsCible` et `formaterRapport` :

```ts
export function horsCible(m: Mesures): string[] {
  const l: string[] = [];
  for (const c of CARTES) {
    const x = m.cartes[c.id];
    const t = x.parties ? x.victoires / x.parties : 0.5;
    const pose = x.pioches ? x.poses / x.pioches : 0;
    if (t < CIBLES.carteMin || t > CIBLES.carteMax) l.push(`carte ${c.id} : victoire ${(t * 100).toFixed(1)} %`);
    if (pose < CIBLES.poseMin) l.push(`carte ${c.id} : pose ${(pose * 100).toFixed(0)} %`);
  }
  for (const [cat, t] of Object.entries(m.categories)) if (t < CIBLES.categorieMin || t > CIBLES.categorieMax) l.push(`catégorie ${cat} : ${(t * 100).toFixed(1)} %`);
  if (m.premierJoueur >= CIBLES.premierJoueurMax || m.premierJoueur <= 1 - CIBLES.premierJoueurMax) l.push(`premier joueur : ${(m.premierJoueur * 100).toFixed(1)} %`);
  if (m.manchesMoyenne < CIBLES.manchesMin || m.manchesMoyenne > CIBLES.manchesMax) l.push(`manches moyennes : ${m.manchesMoyenne.toFixed(1)}`);
  if (m.manchesMax > CIBLES.mancheDure) l.push(`partie la plus longue : ${m.manchesMax} manches`);
  if (m.nuls + m.epuisees > CIBLES.nulsMax) l.push(`nuls + épuisées : ${((m.nuls + m.epuisees) * 100).toFixed(1)} %`);
  if (m.agressifVsControle < CIBLES.courbeMin || m.agressifVsControle > CIBLES.courbeMax) l.push(`agressif contre contrôle : ${(m.agressifVsControle * 100).toFixed(1)} %`);
  return l;
}

export function formaterRapport(m: Mesures, graine: number): string {
  const pc = (x: number) => `${(x * 100).toFixed(1)} %`;
  const lignes = [
    `Graine ${graine} · ${m.parties} parties`, "",
    "| Mesure | Valeur |", "|---|---|",
    `| Premier joueur | ${pc(m.premierJoueur)} |`,
    `| Manches (moyenne / max) | ${m.manchesMoyenne.toFixed(1)} / ${m.manchesMax} |`,
    `| Nuls / épuisées | ${pc(m.nuls)} / ${pc(m.epuisees)} |`,
    `| Agressif contre contrôle | ${pc(m.agressifVsControle)} |`, "",
    "| Catégorie | Victoires |", "|---|---|",
    ...Object.entries(m.categories).map(([c, t]) => `| ${c} | ${pc(t)} |`), "",
    "| Carte | Coût | Victoires | Pose |", "|---|---|---|---|",
    ...CARTES.map((c) => {
      const x = m.cartes[c.id];
      return `| ${c.id.replace("carte.", "")} | ${CARTES_COUT[c.id]} | ${pc(x.parties ? x.victoires / x.parties : 0.5)} | ${pc(x.pioches ? x.poses / x.pioches : 0)} |`;
    }), "",
    "Hors cible :", ...(horsCible(m).length ? horsCible(m).map((l) => `- ${l}`) : ["- aucune"]),
  ];
  return lignes.join("\n");
}
```

Script :

```ts
// scripts/duel-campagne.ts
// npx tsx scripts/duel-campagne.ts --graine 1 --parties 20000
import { campagne, formaterRapport, horsCible } from "@/lib/duel/campagne";

const arg = (nom: string, defaut: number) => {
  const i = process.argv.indexOf(`--${nom}`);
  return i >= 0 ? Number(process.argv[i + 1]) : defaut;
};
const graine = arg("graine", 1);
const parties = arg("parties", 20000);
const debut = Date.now();
const m = campagne({ graine, nParties: parties });
console.log(formaterRapport(m, graine));
console.log(`\n${((Date.now() - debut) / 1000).toFixed(1)} s · ${horsCible(m).length} mesure(s) hors cible`);
```

`package.json` : ajouter `"duel:campagne": "tsx scripts/duel-campagne.ts"` dans `scripts`. Vérifier que `tsx` résout l'alias `@/` (il lit `tsconfig.json` `paths`) : `npx tsx scripts/duel-campagne.ts --parties 200` doit imprimer un tableau. Si l'alias n'est pas résolu, lancer avec `npx tsx --tsconfig tsconfig.json`.

Rapport initial :

```markdown
# Duel de cartes — rapport d'équilibrage

Cibles (spec §6.4) : carte 45–55 % de victoires et ≥ 60 % de pose ; catégorie 45–55 % ; premier joueur < 55 % ; 8–14 manches en moyenne, aucune > 25 ; nuls + épuisées < 2 % ; agressif contre contrôle 45–55 %.

Commande : `npm run duel:campagne -- --graine <n> --parties 20000`

## Campagne 0 — version 1 des cartes (à venir)
```

- [ ] **Step 4: Lancer test et script** — `npx vitest run --maxWorkers=4 src/lib/duel/campagne.test.ts` puis `npm run duel:campagne -- --graine 1 --parties 2000` (doit tenir en moins de 30 s ; sinon, profiler `cloner` et l'appel `statsDuel` en boucle avant de continuer).

- [ ] **Step 5: Commit**

```bash
git add src/lib/duel/campagne.ts src/lib/duel/campagne.test.ts scripts/duel-campagne.ts package.json docs/superpowers/duel/rapport-equilibrage.md
git commit -m "feat(duel): campagne de mesures, script et rapport d'équilibrage"
```

---

### Task 9: La boucle d'équilibrage jusqu'aux cibles

**Files:**
- Modify: `src/data/duel/cartesDuel.ts` (stats et prix)
- Modify: `docs/superpowers/duel/rapport-equilibrage.md`
- Modify (si nécessaire, une seule fois) : `src/lib/duel/partie.ts` pour la compensation du second joueur (spec §3.1)
- Test: `src/data/duel/cartesDuel.test.ts` reste vert à chaque retouche.

Cette tâche est une **procédure**, répétée jusqu'à la condition d'arrêt. Chaque itération est un commit.

- [ ] **Step 1: Campagne 0** — `npm run duel:campagne -- --graine 1 --parties 20000 > /tmp/c0.md` (utiliser le scratchpad si disponible). Coller la sortie dans le rapport sous « Campagne 0 — version 1 des cartes », et lister les mesures hors cible.

- [ ] **Step 2: Décider les retouches, par ordre de priorité, 6 cartes au plus par itération**

Règles de décision (appliquer la première qui s'applique, une seule retouche par carte et par itération) :

1. **Premier joueur ≥ 55 %** : basculer la compensation (spec §3.1) : dans `nouvellePartie`, remplacer la 5ᵉ carte du second joueur par `joueurs[1].energie += 1` **au premier tour seulement** (ajouter un champ `bonusEnergie: number` à `Joueur`, consommé dans `commencerTour` : `j.energie = j.plafond + j.bonusEnergie; j.bonusEnergie = 0`). Mettre à jour le test « second joueur 5 cartes » en conséquence. Une seule bascule autorisée ; si les deux compensations échouent, garder la meilleure et le noter.
2. **Manches moyennes > 14** : les cartes sont trop défensives. Retirer 1 PV aux 3 Barrage/Solide les mieux classés en victoires, en rendant le point en attaque (le budget reste exact).
3. **Manches moyennes < 8** : inverse, sur les 3 cartes d'attaque les mieux classées.
4. **Carte > 55 %** : si elle a un effet, `prix + 1` et retirer 1 point de stat (attaque d'abord si attaque ≥ 3, sinon PV) ; sinon, déplacer 1 point d'attaque vers les PV ; si l'attaque est déjà ≤ 1, monter le coût de 1 (et ajouter 2 points de stats pour rester au budget) **seulement si la courbe de coût le permet** en échangeant avec une carte de coût voisin sous-performante.
5. **Carte < 45 %** : symétrique (prix − 1 avec +1 point de stat, ou PV → attaque).
6. **Pose < 60 %** : la carte est trop chère pour ce qu'elle fait ; échanger 1 PV contre 1 point d'attaque, ou, si elle a un effet, `prix − 1` avec +1 PV.
7. **Catégorie hors cible** : ne rien faire de plus si ses cartes ont déjà été retouchées ; sinon, retoucher ses deux cartes les plus extrêmes par les règles 4/5.
8. **Nuls + épuisées ≥ 2 %** : vérifier au journal d'une partie épuisée (reproduire avec `jouerPartie` et la graine `graine * 100003 + i`) si une IA se bloque (deux étals sans coup légal) ; si c'est un défaut d'IA, le corriger dans `ia.ts` avec un test ; si c'est structurel, appliquer la règle 2.

Jamais : changer une règle du §3, ajouter un mot-clé, dépasser les domaines, sortir de la courbe 8/12/13/10/7, faire tomber le test de garde.

- [ ] **Step 3: Appliquer, vérifier, mesurer**

```bash
npx vitest run --maxWorkers=4 src/data/duel/ src/lib/duel/
npm run duel:campagne -- --graine <numéro d'itération + 1> --parties 20000
```

Consigner dans le rapport : `## Campagne N — graine G`, le tableau des mesures globales, la liste hors cible, et un tableau « Retouches » (carte, avant → après, règle appliquée).

- [ ] **Step 4: Commit de l'itération**

```bash
git add src/data/duel/cartesDuel.ts docs/superpowers/duel/rapport-equilibrage.md
git commit -m "feat(duel): équilibrage — campagne N, <k> retouches"
```

(ajouter `src/lib/duel/partie.ts src/lib/duel/etat.ts src/lib/duel/partie.test.ts` au commit si la règle 1 a été appliquée.)

- [ ] **Step 5: Condition d'arrêt**

Le set est équilibré quand `horsCible` est **vide sur trois campagnes consécutives à graines différentes** (par exemple 101, 202, 303) **sans retouche entre elles**. Consigner les trois dans le rapport sous « Validation finale », avec la version des cartes (numéro d'itération). Si après 12 itérations une mesure résiste, s'arrêter, consigner ce qui résiste et pourquoi, et le remonter : c'est une décision de Guillaume (assouplir la cible ou revoir une règle), pas du plan.

---

### Task 10: Libellés en 4 langues et générateur de texte de carte

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts`, `el.ts` (bloc `duel`)
- Create: `src/lib/duel/libelles.ts`
- Test: `src/lib/duel/libelles.test.ts`

**Interfaces:**
- Consumes: `TexteDuel`, `CARTES_DUEL`, `DictionnaireUI`, `tr`, `libelleCategorie`.
- Produces: `libelleTexteDuel(texte: TexteDuel | undefined, d: DictionnaireUI): string` ; `libelleMotCle(type, d)` ; bloc `d.duel` avec les clés listées ci-dessous.

- [ ] **Step 1: Test**

```ts
// src/lib/duel/libelles.test.ts
import { describe, expect, it } from "vitest";
import { CARTES } from "@/data/cartes";
import { CARTES_DUEL } from "@/data/duel/cartesDuel";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import { el } from "@/lib/i18n/ui/el";
import { libelleTexteDuel } from "@/lib/duel/libelles";

describe("libelleTexteDuel", () => {
  it("compose les 50 textes dans les 4 langues sans jeton {x} restant ni vide pour une carte à texte", () => {
    for (const d of [DICTIONNAIRES.fr, DICTIONNAIRES.en, DICTIONNAIRES.es, el]) {
      for (const c of CARTES) {
        const t = CARTES_DUEL[c.id].texte;
        const s = libelleTexteDuel(t, d);
        expect(s).not.toMatch(/\{\w+\}/);
        if (t) expect(s.length, c.id).toBeGreaterThan(0);
        else expect(s).toBe("");
      }
    }
  });

  it("exemples FR", () => {
    const d = DICTIONNAIRES.fr;
    expect(libelleTexteDuel({ type: "barrage" }, d)).toBe("Barrage");
    expect(libelleTexteDuel({ type: "cri", variante: "pioche" }, d)).toBe("Cri : piochez 1 carte");
    expect(libelleTexteDuel(CARTES_DUEL["carte.gutenberg_feuillet"].texte, d)).toBe("À la pose, piochez 2 cartes.");
    expect(libelleTexteDuel(CARTES_DUEL["carte.violon_de_maitre_cremonais_1715"].texte, d)).toBe(
      "En début de votre tour, vos objets Musique gagnent +1 d'attaque.",
    );
    expect(libelleTexteDuel(CARTES_DUEL["carte.cartouche_stadium_events"].texte, d)).toBe(
      "À la pose, 1 dégât à tous les objets adverses et piochez 1 carte.",
    );
  });
});
```

- [ ] **Step 2: Lancer, ça échoue** — `npx vitest run --maxWorkers=4 src/lib/duel/libelles.test.ts`

- [ ] **Step 3: Ajouter le bloc `duel` aux 4 dictionnaires**

FR (`fr.ts`, après le bloc `albums`) :

```ts
  duel: {
    cout: "Coût",
    attaque: "Attaque",
    pv: "PV",
    casse: "Casse : {categorie}",
    regles: "Règles",
    // mots-clés
    mc_barrage: "Barrage",
    mc_prompt: "Prompt",
    mc_solide: "Solide",
    mc_fragile: "Fragile",
    mc_ruse: "Ruse",
    mc_cri: "Cri : {action}",
    mc_barrage_regle: "Tant qu'il est en jeu, les attaques adverses doivent le viser.",
    mc_prompt_regle: "Peut attaquer le tour où il est posé.",
    mc_solide_regle: "Chaque dégât reçu est réduit de 1.",
    mc_fragile_regle: "Perd 1 PV en fin de tour de son propriétaire.",
    mc_ruse_regle: "Ne peut pas être ciblé avant le prochain tour de son propriétaire.",
    mc_cri_regle: "Effet à la pose.",
    // déclencheurs
    dc_pose: "À la pose",
    dc_casse: "À la casse",
    dc_debutTour: "En début de votre tour",
    dc_attaque: "Quand il attaque",
    dc_blesse: "Quand il subit des dégâts",
    // actions
    ac_degats_objetAdverse: "{n} dégât(s) à un objet adverse",
    ac_degats_tousObjetsAdverses: "{n} dégât(s) à tous les objets adverses",
    ac_degats_vitrineAdverse: "{n} dégât(s) à la vitrine adverse",
    ac_soinVitrine: "rendez {n} PV à votre vitrine",
    ac_pioche_un: "piochez 1 carte",
    ac_pioche: "piochez {n} cartes",
    ac_energie: "+{n} énergie ce tour",
    ac_gain_soi_attaque: "gagne +{n} d'attaque",
    ac_gain_soi_pv: "gagne +{n} PV",
    ac_gain_allies_attaque: "vos objets gagnent +{n} d'attaque",
    ac_gain_allies_pv: "vos objets gagnent +{n} PV",
    ac_gain_categorie_attaque: "vos objets {categorie} gagnent +{n} d'attaque",
    ac_gain_categorie_pv: "vos objets {categorie} gagnent +{n} PV",
    ac_retourEnMain: "renvoyez un objet adverse dans la main de son propriétaire",
    ac_volMotCle: "volez le mot-clé d'un objet adverse",
    et: " et ",
    // livret
    livretTitre: "Règles du duel",
    livretMiseEnPlace: "Deux joueurs, 20 points de vitrine chacun. Un deck de 20 cartes, une seule copie de chaque, 2 légendaires au plus. On pioche 4 cartes ; le second joueur en pioche 5.",
    livretTour: "À votre tour : le plafond d'énergie monte de 1 (jusqu'à 5) et se recharge ; vous piochez 1 carte (deck vide : 1, puis 2, puis 3 dégâts… ; main limitée à 7) ; vous posez des objets en payant leur coût, 4 au plus sur l'étal ; chaque objet posé avant ce tour peut attaquer une fois.",
    livretAttaque: "Une attaque vise la vitrine adverse ou un objet adverse. S'il y a un Barrage en face, il faut le viser. Contre un objet, les deux se blessent de leur attaque en même temps. Un objet à 0 PV part à la casse. Les dégâts restent marqués.",
    livretRoue: "Chaque catégorie en casse une autre : un objet inflige 1 dégât de plus à un objet de la catégorie qu'il domine, même en riposte. Rien contre la vitrine.",
    livretVictoire: "La vitrine adverse tombe à 0 : gagné. Les deux à zéro en même temps : match nul.",
    livretMotsCles: "Mots-clés",
  },
```

EN :

```ts
  duel: {
    cout: "Cost", attaque: "Attack", pv: "HP", casse: "Breaks: {categorie}", regles: "Rules",
    mc_barrage: "Barrier", mc_prompt: "Quick", mc_solide: "Sturdy", mc_fragile: "Fragile", mc_ruse: "Sly", mc_cri: "Cry: {action}",
    mc_barrage_regle: "While in play, enemy attacks must target it.",
    mc_prompt_regle: "Can attack the turn it is played.",
    mc_solide_regle: "Every damage taken is reduced by 1.",
    mc_fragile_regle: "Loses 1 HP at the end of its owner's turn.",
    mc_ruse_regle: "Cannot be targeted before its owner's next turn.",
    mc_cri_regle: "Effect when played.",
    dc_pose: "When played", dc_casse: "When broken", dc_debutTour: "At the start of your turn", dc_attaque: "When it attacks", dc_blesse: "When it takes damage",
    ac_degats_objetAdverse: "{n} damage to an enemy object",
    ac_degats_tousObjetsAdverses: "{n} damage to all enemy objects",
    ac_degats_vitrineAdverse: "{n} damage to the enemy shopfront",
    ac_soinVitrine: "restore {n} HP to your shopfront",
    ac_pioche_un: "draw 1 card", ac_pioche: "draw {n} cards", ac_energie: "+{n} energy this turn",
    ac_gain_soi_attaque: "gains +{n} attack", ac_gain_soi_pv: "gains +{n} HP",
    ac_gain_allies_attaque: "your objects gain +{n} attack", ac_gain_allies_pv: "your objects gain +{n} HP",
    ac_gain_categorie_attaque: "your {categorie} objects gain +{n} attack", ac_gain_categorie_pv: "your {categorie} objects gain +{n} HP",
    ac_retourEnMain: "return an enemy object to its owner's hand", ac_volMotCle: "steal an enemy object's keyword",
    et: " and ",
    livretTitre: "Duel rules",
    livretMiseEnPlace: "Two players, 20 shopfront points each. A 20-card deck, one copy of each card, at most 2 legendaries. Draw 4 cards; the second player draws 5.",
    livretTour: "On your turn: your energy cap rises by 1 (up to 5) and refills; you draw 1 card (empty deck: 1, then 2, then 3 damage…; hand limited to 7); you play objects by paying their cost, at most 4 on your stall; every object played before this turn may attack once.",
    livretAttaque: "An attack targets the enemy shopfront or an enemy object. If there is a Barrier opposite, it must be targeted. Against an object, both deal their attack to each other at once. An object at 0 HP is broken. Damage stays.",
    livretRoue: "Each category breaks another: an object deals 1 extra damage to an object of the category it dominates, even when striking back. Nothing against the shopfront.",
    livretVictoire: "Enemy shopfront at 0: you win. Both at zero at once: draw.",
    livretMotsCles: "Keywords",
  },
```

ES et EL : même structure, traduites (ES : « Coste / Ataque / PV / Rompe: {categorie} / Reglas », mots-clés « Barrera / Rápido / Sólido / Frágil / Astuto / Grito: {action} », déclencheurs « Al jugarla / Al romperse / Al inicio de tu turno / Cuando ataca / Cuando recibe daño », actions avec `{n}`/`{categorie}`, ` y ` ; EL : « Κόστος / Επίθεση / ΠΖ / Σπάει: {categorie} / Κανόνες », « Φράγμα / Γρήγορο / Ανθεκτικό / Εύθραυστο / Πονηρό / Κραυγή: {action} », « Όταν παίζεται / Όταν σπάει / Στην αρχή του γύρου σας / Όταν επιτίθεται / Όταν δέχεται ζημιά », ` και `). Le test de parité `ui.test.ts` refuse tout jeton manquant : chaque clé avec `{n}` ou `{categorie}` ou `{action}` en FR doit porter le même jeton dans les 3 autres langues. Les textes de livret ES/EL sont des traductions complètes des 5 paragraphes FR, pas des résumés.

- [ ] **Step 4: Le générateur**

```ts
// src/lib/duel/libelles.ts
import type { Action, MotCle, TexteDuel } from "@/data/duel/types";
import type { DictionnaireUI } from "@/lib/i18n/ui";
import { tr } from "@/lib/i18n/ui";
import { libelleCategorie } from "@/lib/i18n/libelles";

function libelleAction(a: Action, d: DictionnaireUI): string {
  const D = d.duel;
  switch (a.type) {
    case "degats": return tr(D[`ac_degats_${a.cible}`], { n: a.valeur });
    case "soinVitrine": return tr(D.ac_soinVitrine, { n: a.valeur });
    case "pioche": return a.valeur === 1 ? D.ac_pioche_un : tr(D.ac_pioche, { n: a.valeur });
    case "energie": return tr(D.ac_energie, { n: a.valeur });
    case "gain": {
      const cible = a.cible === "alliesCategorie" ? "categorie" : a.cible;
      return tr(D[`ac_gain_${cible}_${a.stat}`], { n: a.valeur, categorie: a.categorie ? libelleCategorie(a.categorie, d) : "" });
    }
    case "retourEnMain": return D.ac_retourEnMain;
    case "volMotCle": return D.ac_volMotCle;
  }
}

export function libelleMotCle(type: MotCle["type"], d: DictionnaireUI): string {
  return d.duel[`mc_${type}`];
}

/** Le texte imprimé d'une carte : "" sans texte, un mot-clé nu, "Cri : action", ou "Déclencheur, action et action." */
export function libelleTexteDuel(texte: TexteDuel | undefined, d: DictionnaireUI): string {
  if (!texte) return "";
  const D = d.duel;
  if (texte.type === "cri") {
    const action: Action = texte.variante === "pioche" ? { type: "pioche", valeur: 1 }
      : texte.variante === "degat" ? { type: "degats", cible: "objetAdverse", valeur: 1 } : { type: "soinVitrine", valeur: 2 };
    return tr(D.mc_cri, { action: libelleAction(action, d) });
  }
  if (texte.type !== "effet") return libelleMotCle(texte.type, d);
  return `${D[`dc_${texte.declencheur}`]}, ${texte.actions.map((a) => libelleAction(a, d)).join(D.et)}.`;
}
```

Si TypeScript refuse l'indexation dynamique `D[\`ac_degats_${a.cible}\`]`, typer `const D = d.duel as Record<string, string>` en tête de `libelleAction`.

- [ ] **Step 5: Lancer libellés + parité i18n** — `npx vitest run --maxWorkers=4 src/lib/duel/libelles.test.ts src/lib/i18n/ui/ui.test.ts` puis `npx tsc --noEmit -p tsconfig.json` (les 4 dictionnaires doivent avoir les mêmes clés).

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts src/lib/i18n/ui/el.ts src/lib/duel/libelles.ts src/lib/duel/libelles.test.ts
git commit -m "feat(duel): libellés de duel en 4 langues et générateur de texte de carte"
```

---

### Task 11: La ligne de duel dans la fiche de carte

**Files:**
- Create: `src/components/albums/LigneDuel.tsx`
- Modify: `src/components/albums/FichePiece.tsx` (insérer `<LigneDuel id={id} />` sous `ligneSerie` quand `piece.album === "classeur"`)
- Test: `src/components/albums/LigneDuel.test.tsx`

`FichePiece.tsx` porte des modifications non commitées d'une autre session (reformatage prettier). **Ne pas les annuler.** Faire l'insertion sur le fichier tel qu'il est, et commiter `FichePiece.tsx` entier : le reformatage voyage avec (l'autre session est prévenue par Guillaume).

**Interfaces:**
- Consumes: `statsDuel`, `libelleTexteDuel`, `proieDe`, `libelleCategorie`, `useLangue`, `getPiece`.
- Produces: `LigneDuel({ id }: { id: string })`.

- [ ] **Step 1: Test**

```tsx
// src/components/albums/LigneDuel.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LigneDuel } from "@/components/albums/LigneDuel";
import { LangueProvider } from "@/lib/i18n/LangueContext";

const rendre = (id: string) => render(<LangueProvider locale="fr"><LigneDuel id={id} /></LangueProvider>);

describe("LigneDuel", () => {
  it("affiche coût, attaque, PV, le texte et la proie", () => {
    rendre("carte.tabouret_bois_patine"); // 3, 2/4, Barrage, Maison → Mode
    expect(screen.getByLabelText("Coût")).toHaveTextContent("3");
    expect(screen.getByLabelText("Attaque")).toHaveTextContent("2");
    expect(screen.getByLabelText("PV")).toHaveTextContent("4");
    expect(screen.getByText("Barrage")).toBeInTheDocument();
    expect(screen.getByText("Casse : Mode")).toBeInTheDocument();
  });

  it("carte vanille : pas de ligne de texte", () => {
    rendre("carte.marteau_menuisier");
    expect(screen.queryByTestId("duel-texte")).toBeNull();
  });
});
```

Vérifier la signature réelle de `LangueProvider` dans `src/lib/i18n/LangueContext.tsx` (prop `locale` ou `initiale`) et l'utiliser telle quelle ; d'autres tests de `src/components/albums/*.test.tsx` montrent le montage à copier.

- [ ] **Step 2: Lancer, ça échoue** — `npx vitest run --maxWorkers=4 src/components/albums/LigneDuel.test.tsx`

- [ ] **Step 3: Le composant**

```tsx
// src/components/albums/LigneDuel.tsx
"use client";

import type { CSSProperties } from "react";
import { Heart, Sword, Zap } from "lucide-react";
import { statsDuel } from "@/data/duel/cartesDuel";
import { proieDe } from "@/data/duel/roue";
import { getPiece } from "@/data/pieces";
import { libelleTexteDuel } from "@/lib/duel/libelles";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";
import type { CategorieObjet } from "@/types/game";

const ligne: CSSProperties = { marginTop: 10, display: "flex", justifyContent: "center", gap: 18, fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--paper-100)" };
const stat: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4 };
const cout: CSSProperties = { ...stat, color: "var(--brass-300)", fontWeight: 700 };
const texte: CSSProperties = { marginTop: 8, textAlign: "center", fontSize: 13, lineHeight: 1.35, color: "var(--paper-100)", fontStyle: "italic" };
const proie: CSSProperties = { marginTop: 6, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", color: "var(--brass-300)" };

export function LigneDuel({ id }: { id: string }) {
  const { d, tr } = useLangue();
  const piece = getPiece(id);
  if (!piece || piece.album !== "classeur") return null;
  const s = statsDuel(id);
  const t = libelleTexteDuel(s.texte, d);
  return (
    <div data-testid="ligne-duel">
      <div style={ligne}>
        <span style={cout} aria-label={d.duel.cout}><Zap size={14} strokeWidth={2} />{s.cout}</span>
        <span style={stat} aria-label={d.duel.attaque}><Sword size={14} strokeWidth={1.5} />{s.attaque}</span>
        <span style={stat} aria-label={d.duel.pv}><Heart size={14} strokeWidth={1.5} />{s.pv}</span>
      </div>
      {t && <div style={texte} data-testid="duel-texte">{t}</div>}
      <div style={proie}>{tr(d.duel.casse, { categorie: libelleCategorie(proieDe(piece.serie as CategorieObjet), d) })}</div>
    </div>
  );
}
```

Dans `FichePiece.tsx`, après le `<div style={ligneSerie}>…</div>` :

```tsx
        {piece.album === "classeur" && <LigneDuel id={id} />}
```

avec l'import `import { LigneDuel } from "@/components/albums/LigneDuel";`.

- [ ] **Step 4: Lancer fiche + albums** — `npx vitest run --maxWorkers=4 src/components/albums/` puis `npx eslint src/components/albums src/lib/duel src/data/duel`.

- [ ] **Step 5: Commit**

```bash
git add src/components/albums/LigneDuel.tsx src/components/albums/LigneDuel.test.tsx src/components/albums/FichePiece.tsx
git commit -m "feat(duel): la fiche d'une carte montre coût, attaque, PV, texte et proie"
```

---

### Task 12: Le livret de règles depuis le classeur

**Files:**
- Create: `src/components/albums/LivretReglesSheet.tsx`
- Create: `src/components/albums/RoueCategories.tsx`
- Modify: `src/components/albums/AlbumShell.tsx` (prop `avantRecycler?: ReactNode` sur `LigneBasAlbum`, rendue dans `recyclerCoin` avant `RecyclerBouton`)
- Modify: `src/components/albums/ClasseurOverlay.tsx` (état `livretOuvert`, bouton, feuille)
- Test: `src/components/albums/LivretReglesSheet.test.tsx`, ajout dans `ClasseurOverlay.test.tsx`

**Interfaces:**
- Consumes: `d.duel.*` (Task 10), `ROUE`, `libelleCategorie`, `libelleMotCle`, `ficheBackdrop`.
- Produces: `LivretReglesSheet({ onClose })`, `RoueCategories({ taille?: number })` (SVG inline : 7 catégories en cercle, flèches A → B), prop `avantRecycler` de `LigneBasAlbum`.

- [ ] **Step 1: Tests**

```tsx
// src/components/albums/LivretReglesSheet.test.tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LivretReglesSheet } from "@/components/albums/LivretReglesSheet";
import { LangueProvider } from "@/lib/i18n/LangueContext";

describe("LivretReglesSheet", () => {
  it("titre, 5 paragraphes, roue à 7 catégories, 6 mots-clés, fermeture", () => {
    const onClose = vi.fn();
    render(<LangueProvider locale="fr"><LivretReglesSheet onClose={onClose} /></LangueProvider>);
    expect(screen.getByRole("heading", { name: "Règles du duel" })).toBeInTheDocument();
    expect(screen.getAllByTestId("livret-paragraphe")).toHaveLength(5);
    expect(screen.getByTestId("roue-categories").querySelectorAll("text")).toHaveLength(7);
    expect(screen.getAllByTestId("livret-mot-cle")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

Dans `ClasseurOverlay.test.tsx`, ajouter un cas (reprendre le montage des tests existants du fichier) :

```tsx
  it("le bouton Règles ouvre le livret", () => {
    // …montage identique aux autres tests du fichier…
    fireEvent.click(screen.getByRole("button", { name: "Règles" }));
    expect(screen.getByRole("heading", { name: "Règles du duel" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Lancer, ça échoue** — `npx vitest run --maxWorkers=4 src/components/albums/LivretReglesSheet.test.tsx src/components/albums/ClasseurOverlay.test.tsx`

- [ ] **Step 3: Implémenter**

```tsx
// src/components/albums/RoueCategories.tsx
"use client";

import { ROUE } from "@/data/duel/roue";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";

/** Les 7 catégories en cercle, une flèche de chacune vers sa proie. */
export function RoueCategories({ taille = 260 }: { taille?: number }) {
  const { d } = useLangue();
  const c = taille / 2, r = taille * 0.36;
  const pos = (i: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / ROUE.length;
    return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
  };
  return (
    <svg data-testid="roue-categories" viewBox={`0 0 ${taille} ${taille}`} width="100%" style={{ maxWidth: taille, display: "block", margin: "12px auto" }} role="img" aria-label={d.duel.livretRoue}>
      <defs>
        <marker id="fleche" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#c9a86a" />
        </marker>
      </defs>
      {ROUE.map((_, i) => {
        const a = pos(i), b = pos((i + 1) % ROUE.length);
        const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy), k = 22 / l;
        return <line key={i} x1={a.x + dx * k} y1={a.y + dy * k} x2={b.x - dx * k} y2={b.y - dy * k} stroke="#c9a86a" strokeWidth={1.5} markerEnd="url(#fleche)" />;
      })}
      {ROUE.map((cat, i) => {
        const p = pos(i);
        return (
          <text key={cat} x={p.x} y={p.y + 4} textAnchor="middle" fontSize={11} fill="#f4ecd8" fontFamily="var(--font-mono)">
            {libelleCategorie(cat, d)}
          </text>
        );
      })}
    </svg>
  );
}
```

```tsx
// src/components/albums/LivretReglesSheet.tsx
"use client";

import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { RoueCategories } from "@/components/albums/RoueCategories";
import { ficheBackdrop } from "@/components/ui/FicheObjet";
import { libelleMotCle } from "@/lib/duel/libelles";
import { useLangue } from "@/lib/i18n/LangueContext";

const MOTS_CLES = ["barrage", "prompt", "solide", "fragile", "ruse", "cri"] as const;

const backdrop: CSSProperties = { ...ficheBackdrop, zIndex: 106, alignItems: "stretch" };
const feuille: CSSProperties = {
  width: "min(100%, 520px)", maxHeight: "100%", overflowY: "auto", margin: "0 auto", alignSelf: "center",
  background: "var(--paper-100)", color: "var(--ink-900, #1f1a12)", borderRadius: 10, padding: "18px 18px 24px", boxSizing: "border-box",
  fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.45, position: "relative",
};
const titre: CSSProperties = { margin: "0 32px 12px 0", fontSize: 20, fontFamily: "var(--font-display)" };
const croix: CSSProperties = { position: "absolute", top: 10, right: 10, width: "var(--tap-min)", height: "var(--tap-min)", border: "none", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center" };
const para: CSSProperties = { margin: "0 0 10px" };
const sousTitre: CSSProperties = { margin: "14px 0 6px", fontSize: 15 };
const motCle: CSSProperties = { margin: "0 0 6px" };

export function LivretReglesSheet({ onClose }: { onClose: () => void }) {
  const { d } = useLangue();
  const D = d.duel;
  return (
    <div style={backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={feuille} role="dialog" aria-labelledby="livret-titre">
        <h2 id="livret-titre" style={titre}>{D.livretTitre}</h2>
        <button type="button" style={croix} onClick={onClose} aria-label={d.commun.fermer}><X size={18} strokeWidth={1.5} /></button>
        {[D.livretMiseEnPlace, D.livretTour, D.livretAttaque, D.livretRoue, D.livretVictoire].map((p, i) => (
          <p key={i} style={para} data-testid="livret-paragraphe">{p}</p>
        ))}
        <RoueCategories />
        <h3 style={sousTitre}>{D.livretMotsCles}</h3>
        {MOTS_CLES.map((mc) => (
          <p key={mc} style={motCle} data-testid="livret-mot-cle">
            <strong>{mc === "cri" ? D.mc_cri.replace(" : {action}", "").replace(": {action}", "") : libelleMotCle(mc, d)}</strong> — {D[`mc_${mc}_regle`]}
          </p>
        ))}
      </div>
    </div>
  );
}
```

`AlbumShell.tsx` : ajouter `avantRecycler?: ReactNode` à `LigneBasAlbumProps` et le rendre :

```tsx
      <div style={recyclerCoin}>
        {avantRecycler}
        <RecyclerBouton icone titre={titre} doublons={doublons} onRecycler={onRecycler} />
      </div>
```

(passer `recyclerCoin` en `display: "inline-flex", alignItems: "center", gap: 2`). Si TypeScript refuse `D[\`mc_${mc}_regle\`]`, écrire `const R = d.duel as unknown as Record<string, string>` et lire `R[...]`.

`ClasseurOverlay.tsx` : `const [livretOuvert, setLivretOuvert] = useState(false);`, import `BookOpen` de `lucide-react` et `LivretReglesSheet` ; sur `LigneBasAlbum` :

```tsx
          avantRecycler={
            <button type="button" style={reglesBtn} onClick={() => setLivretOuvert(true)} aria-label={d.duel.regles}>
              <BookOpen size={18} strokeWidth={1.5} />
            </button>
          }
```

avec `const reglesBtn: CSSProperties = { minWidth: "var(--tap-min)", minHeight: "var(--tap-min)", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: "var(--brass-300)", cursor: "pointer" };` et, à côté de `{fiche && …}` : `{livretOuvert && <LivretReglesSheet onClose={() => setLivretOuvert(false)} />}`.

- [ ] **Step 4: Lancer les tests des albums, le lint, et la suite entière**

```bash
npx vitest run --maxWorkers=4 src/components/albums/ src/lib/duel/ src/data/duel/ src/lib/i18n/
npx eslint src
npx vitest run --maxWorkers=4
```

Expected: tout vert (la suite complète dépasse 3 300 tests).

- [ ] **Step 5: Recette visuelle rapide** — `next dev` sur le port 3100 avec `public/dev-save-albums.html` (slot 3, voir la mémoire du classeur) : ouvrir le classeur, taper une carte possédée (la ligne de duel apparaît sous la série), taper l'icône livre (le livret défile, la roue est lisible en 390 px de large). Corriger les tailles si un texte déborde.

- [ ] **Step 6: Commit**

```bash
git add src/components/albums/LivretReglesSheet.tsx src/components/albums/LivretReglesSheet.test.tsx src/components/albums/RoueCategories.tsx src/components/albums/AlbumShell.tsx src/components/albums/ClasseurOverlay.tsx src/components/albums/ClasseurOverlay.test.tsx
git commit -m "feat(duel): livret de règles du duel depuis le classeur, roue dessinée"
```

---

## Après le plan

- Mettre à jour la mémoire projet `classeur-album.md` (ou un fichier `duel-cartes.md`) : version finale des cartes, numéro de la dernière campagne, mesures qui ont résisté.
- L'art des 50 cartes (chantier suivant) lit `CARTES_DUEL` et `libelleTexteDuel` pour imprimer les chiffres sur le gabarit.
