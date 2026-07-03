# Niveau de Brocanteur — Plan 1/4 : le cœur (XP, courbe, sources, migration)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter le niveau global « Brocanteur » (XP, courbe quadratique, compteurs d'affinité par catégorie) alimenté par toutes les activités, avec migration de sauvegarde v8 — sans toucher à l'UI ni retirer l'ancien système d'arbres (double écriture temporaire, retirée au plan 2).

**Architecture:** Le state gagne deux champs (`brocanteur`, `affinites`). La courbe vit dans `src/lib/xp.ts` (fonctions pures, TDD). Le crédit d'XP passe par un nouveau `gagnerXPBrocanteur` du GameContext, appelé par les sites existants (achat/vente/négo) EN PLUS de l'ancien `gagnerXP` (les 8 arbres continuent de fonctionner à l'identique jusqu'au plan 2), et par 4 nouvelles sources (restauration, missions, découverte collection, juste prix).

**Tech Stack:** React Context maison (`src/context/GameContext.tsx`), TypeScript strict, vitest pour les tests, persistance localStorage via `src/lib/migrations.ts`.

**Référence design :** rapport « Refonte du système de niveau » (artifact), sections 06-07. Courbe : ΔXP(N) = 60·N + 40, cumulé = 30·N² + 70·N.

## Global Constraints

- Toute valeur d'équilibrage est une **constante nommée exportée** (jamais de littéral en plein code) — elles seront retunées après simulation.
- Nommage **français** comme le reste du codebase (`gagnerXPBrocanteur`, pas `gainPlayerXp`).
- `SAVE_VERSION` passe de 7 à **8** ; la migration est **pure et idempotente** ; une save v8 rechargée ne change pas.
- **Aucune régression** sur les arbres : `gagnerXP`, `competenceTrees`, `competencesDebloquees` gardent leur comportement actuel (le plan 2 s'en charge).
- Tests : `npx vitest run <fichier>` par tâche ; à la fin de chaque tâche `npx tsc --noEmit` doit passer.
- Commits fréquents, un par tâche, préfixe `feat(niveau):` ou `test(niveau):`.

---

### Task 1: Courbe du Brocanteur dans `src/lib/xp.ts`

**Files:**
- Modify: `src/lib/xp.ts` (31 lignes actuellement — on AJOUTE, on ne touche pas aux fonctions d'arbres existantes)
- Test: `src/lib/xp.test.ts` (ajouter un bloc describe à la suite)

**Interfaces:**
- Consumes: rien (fonctions pures).
- Produces: `interface BrocanteurState { xp: number; niveau: number; pointsDisponibles: number }`, `xpRequisPourNiveauBrocanteur(niveau: number): number`, `appliquerGainXPBrocanteur(b: BrocanteurState, gain: number): BrocanteurState`, `progressionNiveauBrocanteur(b: BrocanteurState): number`, constantes `XP_ACHAT_BROCANTEUR = 10`, `XP_VENTE_BROCANTEUR = 20`, `XP_NEGO_BROCANTEUR = 5`, `XP_JUSTE_PRIX = 10`, `XP_RESTAURATION_ETAPE = 15`, `XP_QUETE_QUOTIDIENNE = 25`, `XP_QUETE_HEBDO = 75`, `XP_QUETE_PRINCIPALE = 100`, `XP_DECOUVERTE_COLLECTION = 10`, `POINTS_PAR_NIVEAU = 1`, `POINTS_BONUS_CHAPITRE = 2`.

- [ ] **Step 1: Écrire les tests qui échouent** — ajouter à la fin de `src/lib/xp.test.ts` :

```ts
import {
  appliquerGainXPBrocanteur,
  progressionNiveauBrocanteur,
  xpRequisPourNiveauBrocanteur,
} from "./xp";

const freshBrocanteur = () => ({ xp: 0, niveau: 0, pointsDisponibles: 0 });

describe("xpRequisPourNiveauBrocanteur — courbe quadratique 30N²+70N", () => {
  it("seuils cumulés du rapport de design", () => {
    expect(xpRequisPourNiveauBrocanteur(0)).toBe(0);
    expect(xpRequisPourNiveauBrocanteur(1)).toBe(100);
    expect(xpRequisPourNiveauBrocanteur(2)).toBe(260);
    expect(xpRequisPourNiveauBrocanteur(3)).toBe(480);
    expect(xpRequisPourNiveauBrocanteur(5)).toBe(1100);
    expect(xpRequisPourNiveauBrocanteur(10)).toBe(3700);
    expect(xpRequisPourNiveauBrocanteur(20)).toBe(13400);
    expect(xpRequisPourNiveauBrocanteur(30)).toBe(29100);
  });

  it("l'incrément entre niveaux vaut 60N+40", () => {
    for (const n of [1, 2, 5, 10, 25]) {
      expect(
        xpRequisPourNiveauBrocanteur(n) - xpRequisPourNiveauBrocanteur(n - 1),
      ).toBe(60 * n + 40);
    }
  });

  it("niveaux négatifs traités comme 0", () => {
    expect(xpRequisPourNiveauBrocanteur(-3)).toBe(0);
  });
});

describe("appliquerGainXPBrocanteur", () => {
  it("gain sous le seuil : pas de level-up", () => {
    const res = appliquerGainXPBrocanteur(freshBrocanteur(), 99);
    expect(res).toEqual({ xp: 99, niveau: 0, pointsDisponibles: 0 });
  });

  it("level-up simple : +1 niveau, +1 point", () => {
    const res = appliquerGainXPBrocanteur(freshBrocanteur(), 100);
    expect(res).toEqual({ xp: 100, niveau: 1, pointsDisponibles: 1 });
  });

  it("multi-level-up en un seul gain (480 XP → niveau 3, 3 points)", () => {
    const res = appliquerGainXPBrocanteur(freshBrocanteur(), 480);
    expect(res.niveau).toBe(3);
    expect(res.pointsDisponibles).toBe(3);
  });

  it("conserve les points déjà présents", () => {
    const res = appliquerGainXPBrocanteur(
      { xp: 100, niveau: 1, pointsDisponibles: 5 },
      160,
    );
    expect(res).toEqual({ xp: 260, niveau: 2, pointsDisponibles: 6 });
  });

  it("gain nul ou négatif : état inchangé", () => {
    const b = { xp: 300, niveau: 2, pointsDisponibles: 1 };
    expect(appliquerGainXPBrocanteur(b, 0)).toEqual(b);
    expect(appliquerGainXPBrocanteur(b, -10)).toEqual(b);
  });
});

describe("progressionNiveauBrocanteur", () => {
  it("0 juste après un level-up, 0.5 à mi-chemin", () => {
    expect(progressionNiveauBrocanteur({ xp: 100, niveau: 1, pointsDisponibles: 0 })).toBe(0);
    // niveau 1 → 2 : seuils 100 → 260, span 160 ; 100+80=180 → 0.5
    expect(progressionNiveauBrocanteur({ xp: 180, niveau: 1, pointsDisponibles: 0 })).toBe(0.5);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/xp.test.ts`
Expected: FAIL — `xpRequisPourNiveauBrocanteur is not a function` (ou import inexistant).

- [ ] **Step 3: Implémenter** — ajouter à la fin de `src/lib/xp.ts` :

```ts
/* === Niveau de Brocanteur (global) ==================================== */

export interface BrocanteurState {
  xp: number;
  niveau: number;
  pointsDisponibles: number;
}

/** ΔXP(N) = PENTE·N + PALIER_1 − PENTE  (N=1 → 100, N=2 → 160, …). */
export const XP_BROCANTEUR_PALIER_1 = 100;
export const XP_BROCANTEUR_PENTE = 60;

/** Seuil CUMULÉ pour atteindre `niveau` : Σ ΔXP = 30·N² + 70·N. */
export function xpRequisPourNiveauBrocanteur(niveau: number): number {
  const n = Math.max(0, niveau);
  const a = XP_BROCANTEUR_PENTE / 2; // 30
  const b = XP_BROCANTEUR_PALIER_1 - XP_BROCANTEUR_PENTE / 2; // 70
  return a * n * n + b * n;
}

/** Points de compétence gagnés par niveau de Brocanteur. */
export const POINTS_PAR_NIVEAU = 1;
/** Points bonus à la livraison d'un chapitre de mission principale (D4). */
export const POINTS_BONUS_CHAPITRE = 2;

export function appliquerGainXPBrocanteur(
  b: BrocanteurState,
  gain: number,
): BrocanteurState {
  if (gain <= 0) return b;
  const nouveauXP = b.xp + gain;
  let niveau = b.niveau;
  let pointsDisponibles = b.pointsDisponibles;
  while (nouveauXP >= xpRequisPourNiveauBrocanteur(niveau + 1)) {
    niveau += 1;
    pointsDisponibles += POINTS_PAR_NIVEAU;
  }
  return { xp: nouveauXP, niveau, pointsDisponibles };
}

/** Progression vers le prochain niveau de Brocanteur (0..1). */
export function progressionNiveauBrocanteur(b: BrocanteurState): number {
  const seuilCourant = xpRequisPourNiveauBrocanteur(b.niveau);
  const seuilProchain = xpRequisPourNiveauBrocanteur(b.niveau + 1);
  const span = seuilProchain - seuilCourant;
  if (span <= 0) return 0;
  return Math.min(1, (b.xp - seuilCourant) / span);
}

/* === Gains d'XP Brocanteur par action (rapport §07) ==================== */
export const XP_ACHAT_BROCANTEUR = 10;
export const XP_VENTE_BROCANTEUR = 20;
export const XP_NEGO_BROCANTEUR = 5;
/** Vente conclue au premier prix (achat direct du client). */
export const XP_JUSTE_PRIX = 10;
/** Une étape de restauration récupérée à l'atelier. */
export const XP_RESTAURATION_ETAPE = 15;
export const XP_QUETE_QUOTIDIENNE = 25;
export const XP_QUETE_HEBDO = 75;
export const XP_QUETE_PRINCIPALE = 100;
/** Premier exemplaire d'un template ajouté à la collection. */
export const XP_DECOUVERTE_COLLECTION = 10;
```

- [ ] **Step 4: Vérifier le vert**

Run: `npx vitest run src/lib/xp.test.ts`
Expected: PASS (tous les tests, anciens inclus).

- [ ] **Step 5: Commit**

```bash
git add src/lib/xp.ts src/lib/xp.test.ts
git commit -m "feat(niveau): courbe quadratique et constantes d'XP du Niveau de Brocanteur"
```

---

### Task 2: Champs `brocanteur` et `affinites` dans le state + init

**Files:**
- Modify: `src/types/game.ts` (interface `GameState`, après `competencesDebloquees` ligne ~228)
- Modify: `src/context/GameContext.tsx` (`nouvellePartie`, ligne ~459)
- Test: `src/lib/xp.test.ts` (bloc `emptyAffinites`)

**Interfaces:**
- Consumes: `BrocanteurState` (Task 1), `CATEGORIES` de `@/data/categories`.
- Produces: `GameState.brocanteur: BrocanteurState`, `GameState.affinites: Record<CategorieObjet, number>`, `emptyBrocanteur(): BrocanteurState` et `emptyAffinites(): Record<CategorieObjet, number>` exportés depuis `src/lib/xp.ts`.

- [ ] **Step 1: Test qui échoue** — ajouter à `src/lib/xp.test.ts` :

```ts
import { emptyAffinites, emptyBrocanteur } from "./xp";
import { CATEGORIES } from "@/data/categories";

describe("états initiaux Brocanteur", () => {
  it("emptyBrocanteur : tout à zéro", () => {
    expect(emptyBrocanteur()).toEqual({ xp: 0, niveau: 0, pointsDisponibles: 0 });
  });
  it("emptyAffinites : une entrée à 0 par catégorie", () => {
    const a = emptyAffinites();
    for (const c of CATEGORIES) expect(a[c]).toBe(0);
    expect(Object.keys(a)).toHaveLength(CATEGORIES.length);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run src/lib/xp.test.ts` → FAIL (imports inexistants).

- [ ] **Step 3: Implémenter.**

Dans `src/lib/xp.ts` (en haut, ajouter l'import ; en bas, les deux fabriques) :

```ts
import { CATEGORIES } from "@/data/categories";
import type { CategorieObjet, CompetenceTreeState } from "@/types/game";

export function emptyBrocanteur(): BrocanteurState {
  return { xp: 0, niveau: 0, pointsDisponibles: 0 };
}

export function emptyAffinites(): Record<CategorieObjet, number> {
  const out = {} as Record<CategorieObjet, number>;
  for (const c of CATEGORIES) out[c] = 0;
  return out;
}
```

Dans `src/types/game.ts` : déclarer l'interface à côté de `CompetenceTreeState` (ligne ~282) — et **déplacer** la déclaration `BrocanteurState` écrite en Task 1 dans `lib/xp.ts` vers ici (dans `lib/xp.ts`, la remplacer par un import de type + ré-export : `import type { BrocanteurState } from "@/types/game"; export type { BrocanteurState };` — `lib/xp.ts` importe déjà ses types depuis `types/game.ts`, aucun cycle) :

```ts
export interface BrocanteurState {
  xp: number;
  niveau: number;
  pointsDisponibles: number;
}
```

Puis dans l'interface `GameState`, juste après `competencesDebloquees: CompetenceId[];` (ligne 228) :

```ts
  /** Niveau global du joueur (Niveau de Brocanteur) : XP, niveau, points de compétence. */
  brocanteur: BrocanteurState;
  /** Nombre de transactions (achats + ventes) par catégorie — gate d'affinité des paliers 2-3. */
  affinites: Record<CategorieObjet, number>;
```

Dans `src/context/GameContext.tsx`, `nouvellePartie` (bloc `const initial: GameState = {`, ligne ~459), ajouter après `competencesDebloquees: [],` :

```ts
      brocanteur: emptyBrocanteur(),
      affinites: emptyAffinites(),
```

et compléter l'import existant de `@/lib/xp` en haut du fichier (`appliquerGainXP` y est déjà importé) :

```ts
import {
  appliquerGainXP,
  appliquerGainXPBrocanteur,
  emptyAffinites,
  emptyBrocanteur,
} from "@/lib/xp";
```

- [ ] **Step 4: Vérifier** — `npx vitest run src/lib/xp.test.ts` → PASS, puis `npx tsc --noEmit`.
Expected: tsc échoue en cascade partout où `GameState` est construit sans les nouveaux champs — c'est attendu ; corriger CHAQUE site signalé en ajoutant les deux champs (fixtures de tests comprises : chercher les fabriques d'état de test avec `grep -rln "competenceTrees" src --include="*.test.*"` et compléter). Ne PAS rendre les champs optionnels pour esquiver : la migration (Task 6) garantit leur présence.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(niveau): champs brocanteur et affinites dans GameState + init nouvelle partie"
```

---

### Task 3: `gagnerXPBrocanteur` dans le GameContext

**Files:**
- Modify: `src/context/GameContext.tsx` (à côté de `gagnerXP`, ligne ~1147 ; interface du contexte ~ligne 170 ; objet `value` où `gagnerXP` est exposé)

**Interfaces:**
- Consumes: `appliquerGainXPBrocanteur` (Task 1), champs Task 2.
- Produces: `gagnerXPBrocanteur(montant: number, categorie?: CategorieObjet): void` exposé par le contexte — crédite l'XP globale ET incrémente `affinites[categorie]` de 1 si une catégorie est fournie.

- [ ] **Step 1: Implémenter** (pas de test unitaire direct — le contexte n'est pas testé unitairement dans ce repo ; la logique pure est déjà couverte par Task 1). Ajouter après le `gagnerXP` existant :

```ts
  const gagnerXPBrocanteur = useCallback(
    (montant: number, categorie?: CategorieObjet) => {
      if (montant <= 0) return;
      setState((prev) => {
        if (!prev) return prev;
        const affinites = categorie
          ? { ...prev.affinites, [categorie]: (prev.affinites[categorie] ?? 0) + 1 }
          : prev.affinites;
        return {
          ...prev,
          brocanteur: appliquerGainXPBrocanteur(prev.brocanteur, montant),
          affinites,
        };
      });
    },
    [],
  );
```

Déclarer dans l'interface du contexte (à côté de `gagnerXP: (treeId, montant) => void`) :

```ts
  gagnerXPBrocanteur: (montant: number, categorie?: CategorieObjet) => void;
```

et l'ajouter aux DEUX objets `value`/`useMemo` où `gagnerXP` apparaît déjà (même pattern que `livrerMission`, présent lignes ~1456 et ~1502).

- [ ] **Step 2: Vérifier** — `npx tsc --noEmit` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/context/GameContext.tsx
git commit -m "feat(niveau): action gagnerXPBrocanteur (XP globale + compteur d'affinité)"
```

---

### Task 4: Double écriture sur les 4 sites existants (achat, vente, négo ×2)

**Files:**
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx` (helper `gagnerXPLocal` ligne ~87)
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (helper `gagnerXPLocal` ligne ~150)
- Modify: `src/types/game.ts` (`SessionChinage`/`SessionVente` : champ optionnel)

**Interfaces:**
- Consumes: `gagnerXPBrocanteur` (Task 3).
- Produces: chaque session archivée porte `xpBrocanteur?: number` (total gagné pendant la session — consommé par l'UI au plan 4). Champ **optionnel** : aucune migration nécessaire.

- [ ] **Step 1: Types** — dans `src/types/game.ts`, ajouter à `SessionChinage` ET `SessionVente`, sous `xpGagne` :

```ts
  /** XP de Brocanteur gagnée pendant la session (absent sur les vieilles saves). */
  xpBrocanteur?: number;
```

- [ ] **Step 2: Chinage** — dans `src/app/chiner/[brocanteId]/ClientPage.tsx` :

Remplacer le helper (ligne ~87) :

```ts
  const [xpBrocanteurSession, setXpBrocanteurSession] = useState(0);

  const gagnerXPLocal = (
    treeId: string,
    montant: number,
    categorie?: CategorieObjet,
  ) => {
    gagnerXP(treeId, montant);
    gagnerXPBrocanteur(montant, categorie);
    setXpBrocanteurSession((prev) => prev + montant);
    setXpSession((prev) => ({
      ...prev,
      [treeId]: (prev[treeId] ?? 0) + montant,
    }));
  };
```

Récupérer `gagnerXPBrocanteur` dans le destructuring du `useGame()` existant (là où `gagnerXP` est déjà pris). Mettre à jour les 2 appels :
- achat (ligne ~206) : `gagnerXPLocal(catTreeId(it.objet.categorie), XP_ACHAT_OBJET, it.objet.categorie);`
- négo réussie (ligne ~324) : `gagnerXPLocal(TREE_GENERAL, XP_NEGOCIATION_REUSSIE_GENERAL);` (inchangé — pas de catégorie : la négo ne compte pas dans l'affinité).

Là où la session est archivée (l'objet `SessionChinage` construit avec `xpGagne: xpSession`), ajouter `xpBrocanteur: xpBrocanteurSession,`.

- [ ] **Step 3: Vente** — même transformation dans `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` :
- helper identique (ligne ~150) ;
- vente (ligne ~446, boucle du panier) : `gagnerXPLocal(catTreeId(p.objet.categorie), XP_VENTE_OBJET, p.objet.categorie);`
- négos réussies (lignes ~471 et ~497) : inchangées (pas de catégorie) ;
- archive `SessionVente` : ajouter `xpBrocanteur: xpBrocanteurSession,`.

- [ ] **Step 4: Vérifier** — `npx tsc --noEmit` → PASS. Puis smoke test manuel rapide : `npm run dev`, acheter un objet en chinage, vérifier dans les React DevTools (ou en loggant `state.brocanteur`) que `xp` monte de 10 et `affinites` s'incrémente.

- [ ] **Step 5: Commit**

```bash
git add src/types/game.ts "src/app/chiner/[brocanteId]/ClientPage.tsx" "src/app/vitrine/[brocanteId]/journee/ClientPage.tsx"
git commit -m "feat(niveau): double écriture XP Brocanteur sur achat/vente/négociation + snapshot session"
```

---

### Task 5: Nouvelles sources d'XP (restauration, missions, collection, juste prix)

**Files:**
- Modify: `src/context/GameContext.tsx` (`recupererObjetRestaure` ~1100, `terminerRestaurationImmediate` ~1125, `livrerMission` ~1321, `marquerDejaPossedeTemplate` ~1170)
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (`handleAccepterAchatDirect`)

**Interfaces:**
- Consumes: constantes de Task 1, `gagnerXPBrocanteur` (Task 3), `appliquerGainXPBrocanteur`, `POINTS_BONUS_CHAPITRE`.
- Produces: rien de nouveau pour les autres tâches (effets de jeu).

- [ ] **Step 1: Restauration** — dans `recupererObjetRestaure`, après le `setState` réussi (juste avant `return { ok: true };`), ajouter :

```ts
      gagnerXPBrocanteur(XP_RESTAURATION_ETAPE, objet.categorie);
```

Idem dans `terminerRestaurationImmediate` (fin par pub récompensée = restauration terminée aussi), même ligne avant son `return { ok: true };`.
⚠ `gagnerXPBrocanteur` doit alors être déclaré AVANT ces deux callbacks dans le fichier (déplacer sa déclaration au-dessus si nécessaire) et ajouté à leurs tableaux de dépendances : `[tempsConfiance, gagnerXPBrocanteur]`.

- [ ] **Step 2: Missions** — dans `livrerMission`, la catégorie est disponible via `courrier.payload.categorie`. Après le `setState` (avant `return { ok: true };`) :

```ts
      const categorieMission = courrier.payload.categorie;
      const xpMission =
        categorieMission === "principale"
          ? XP_QUETE_PRINCIPALE
          : categorieMission === "hebdomadaire"
            ? XP_QUETE_HEBDO
            : XP_QUETE_QUOTIDIENNE;
      gagnerXPBrocanteur(xpMission);
      if (categorieMission === "principale") {
        // Bonus de points de compétence par chapitre livré (décision D4).
        setState((prev) =>
          prev
            ? {
                ...prev,
                brocanteur: {
                  ...prev.brocanteur,
                  pointsDisponibles:
                    prev.brocanteur.pointsDisponibles + POINTS_BONUS_CHAPITRE,
                },
              }
            : prev,
        );
      }
```

Ajouter `gagnerXPBrocanteur` aux dépendances du `useCallback`.

- [ ] **Step 3: Découverte collection** — dans `marquerDejaPossedeTemplate` (juste après `marquerVuTemplate`, ~ligne 1170), créditer uniquement à la PREMIÈRE possession :

```ts
  const marquerDejaPossedeTemplate = useCallback((templateId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const dejaConnu = Object.values(prev.collection).some((slots) =>
        slots.some((s) => s.templateId === templateId && s.dejaPossede),
      );
      const next = {
        ...prev,
        collection: marquerDejaPossedeFn(prev.collection, templateId),
      };
      if (dejaConnu) return next;
      return { ...next, brocanteur: appliquerGainXPBrocanteur(next.brocanteur, XP_DECOUVERTE_COLLECTION) };
    });
  }, []);
```

(Adapter au corps exact actuel de la fonction : la seule modification est le calcul `dejaConnu` + le crédit conditionnel dans le MÊME `setState` — pas d'appel séparé à `gagnerXPBrocanteur`, pour rester atomique.)

- [ ] **Step 4: Juste prix** — dans `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx`, `handleAccepterAchatDirect` (le client paie le prix affiché sans négocier — c'est la définition du prix bien fixé). Après le `enregistrerVentes(...)` de ce handler :

```ts
    gagnerXPBrocanteurLocal(XP_JUSTE_PRIX);
```

avec le petit helper local (à côté de `gagnerXPLocal`) :

```ts
  const gagnerXPBrocanteurLocal = (montant: number) => {
    gagnerXPBrocanteur(montant);
    setXpBrocanteurSession((prev) => prev + montant);
  };
```

- [ ] **Step 5: Vérifier** — `npx tsc --noEmit` → PASS. Smoke test : livrer une quête quotidienne en dev et vérifier `state.brocanteur.xp` += 25.

- [ ] **Step 6: Commit**

```bash
git add src/context/GameContext.tsx "src/app/vitrine/[brocanteId]/journee/ClientPage.tsx"
git commit -m "feat(niveau): XP Brocanteur sur restauration, missions, découverte collection et juste prix"
```

---

### Task 6: Migration de sauvegarde v8

**Files:**
- Modify: `src/lib/migrations.ts` (SAVE_VERSION ligne 86, backfill dans `appliquerMigrations` ligne ~509)
- Test: `src/lib/migrations.test.ts`

**Interfaces:**
- Consumes: `emptyBrocanteur`, `emptyAffinites`, `appliquerGainXPBrocanteur` (Tasks 1-2).
- Produces: toute save migrée possède `brocanteur` (XP = Σ XP des 8 arbres, niveau dérivé de la nouvelle courbe, `pointsDisponibles: 0` — l'économie de points reste sur les arbres jusqu'au plan 2) et `affinites` (recalculées depuis l'historique : 1 par achat + 1 par vente, par catégorie).

- [ ] **Step 1: Tests qui échouent** — ajouter à `src/lib/migrations.test.ts` (réutiliser la fabrique de save legacy du fichier ; sinon construire un `GameState` partiel minimal comme les tests existants le font) :

```ts
describe("migration v8 — Niveau de Brocanteur", () => {
  it("backfille brocanteur depuis la somme des XP d'arbres", () => {
    const save = fabriqueSaveV7(); // adapter au helper existant du fichier
    save.competenceTrees = {
      ...save.competenceTrees,
      general: { xp: 150, niveau: 1, pointsDisponibles: 0 },
      "cat.Musique": { xp: 350, niveau: 3, pointsDisponibles: 1 },
    };
    const migre = migrerSauvegarde(save);
    // 150 + 350 = 500 XP → courbe 30N²+70N : niveau 3 (seuil 480), pas 4 (760)
    expect(migre.brocanteur).toEqual({ xp: 500, niveau: 3, pointsDisponibles: 0 });
    expect(migre.version).toBe(8);
  });

  it("recalcule les affinités depuis l'historique", () => {
    const save = fabriqueSaveV7();
    save.historique = [
      {
        id: "s1", type: "chinage", jour: 1, timestamp: 1, brocanteId: "b",
        brocanteNom: "B", xpGagne: {},
        achats: [
          { templateId: "t1", nom: "Vinyle", categorie: "Musique", etat: "Bon", prixReferenceReel: 10, prixPaye: 5 },
          { templateId: "t2", nom: "Robe", categorie: "Mode", etat: "Bon", prixReferenceReel: 10, prixPaye: 5 },
        ],
      },
      {
        id: "s2", type: "vente", jour: 2, timestamp: 2, niveauCamion: 1, loyer: 0,
        invendus: 0, xpGagne: {},
        ventes: [
          { templateId: "t1", nom: "Vinyle", categorie: "Musique", etat: "Bon", prixReferenceReel: 10, prixVente: 20, prixAchat: 5 },
        ],
      },
    ];
    const migre = migrerSauvegarde(save);
    expect(migre.affinites["Musique"]).toBe(2); // 1 achat + 1 vente
    expect(migre.affinites["Mode"]).toBe(1);
    expect(migre.affinites["Maison"]).toBe(0);
  });

  it("idempotente : une save v8 rechargée ne change pas brocanteur/affinites", () => {
    const migre1 = migrerSauvegarde(fabriqueSaveV7());
    const migre2 = migrerSauvegarde(migre1);
    expect(migre2.brocanteur).toEqual(migre1.brocanteur);
    expect(migre2.affinites).toEqual(migre1.affinites);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run src/lib/migrations.test.ts` → FAIL.

- [ ] **Step 3: Implémenter** — dans `src/lib/migrations.ts` :

1. `export const SAVE_VERSION = 8;`
2. Imports : `import { appliquerGainXPBrocanteur, emptyAffinites, emptyBrocanteur } from "@/lib/xp";`
3. Dans l'objet retourné par `appliquerMigrations` (après le bloc `energieDerniereMaj`), ajouter :

```ts
    brocanteur: (() => {
      const b = (loaded as Partial<GameState>).brocanteur;
      if (
        b &&
        typeof b.xp === "number" &&
        typeof b.niveau === "number" &&
        typeof b.pointsDisponibles === "number"
      ) {
        return b; // save déjà v8 : on ne recalcule pas (idempotence).
      }
      const totalXP = Object.values(loaded.competenceTrees ?? {}).reduce(
        (acc, t) => acc + (typeof t?.xp === "number" ? t.xp : 0),
        0,
      );
      // Niveau dérivé de la nouvelle courbe ; points à 0 (l'économie de
      // points reste portée par les arbres jusqu'à la migration du plan 2).
      const converti = appliquerGainXPBrocanteur(emptyBrocanteur(), totalXP);
      return { ...converti, pointsDisponibles: 0 };
    })(),
    affinites: (() => {
      const a = (loaded as Partial<GameState>).affinites;
      if (a && typeof a === "object") {
        const base = emptyAffinites();
        for (const cat of CATEGORIES) {
          const v = (a as Record<string, unknown>)[cat];
          if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
            base[cat] = Math.floor(v);
          }
        }
        return base;
      }
      // Backfill depuis l'historique migré : 1 par achat + 1 par vente.
      const base = emptyAffinites();
      for (const s of historique) {
        if (s.type === "chinage") {
          for (const ach of s.achats) base[ach.categorie] += 1;
        } else {
          for (const v of s.ventes) base[v.categorie] += 1;
        }
      }
      return base;
    })(),
```

⚠ Le recalcul d'affinités utilise la variable locale `historique` (déjà migrée, catégories normalisées) définie plus haut dans la fonction — PAS `loaded.historique`.

- [ ] **Step 4: Vérifier** — `npx vitest run src/lib/migrations.test.ts` → PASS ; `npx vitest run` (suite complète) → PASS ; `npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/migrations.ts src/lib/migrations.test.ts
git commit -m "feat(niveau): migration v8 — backfill brocanteur (Σ XP arbres) et affinités (historique)"
```

---

### Task 7: Vérification de bout en bout

**Files:** aucun nouveau — validation.

- [ ] **Step 1: Suite complète** — `npx vitest run` → 0 échec.
- [ ] **Step 2: Types** — `npx tsc --noEmit` → 0 erreur.
- [ ] **Step 3: Lint** — `npx next lint` (ou `npm run lint` si le script existe) → 0 erreur nouvelle.
- [ ] **Step 4: Parcours manuel** (`npm run dev`) :
  1. Nouvelle partie → `state.brocanteur = {xp:0, niveau:0, pointsDisponibles:0}` (React DevTools).
  2. Session de chinage, 2 achats → xp = 20, affinité des catégories achetées +1 chacune, arbres de catégorie crédités comme avant (+10 chacun, non-régression).
  3. Recharger une VRAIE save v7 (copie de prod/testeur si dispo) → `brocanteur.xp` = somme des barres visibles dans `/bibliotheque`, aucun reset d'arbres.
  4. Livrer la quête quotidienne du jour → +25 XP.
- [ ] **Step 5: Commit final si retouches, sinon rien.**

---

## Suites (plans séparés, à écrire après validation de celui-ci)

- **Plan 2 — Migration des arbres + correctifs** : suppression des XP/niveaux d'arbres (les points viennent du Brocanteur, refund intégral), nouveau gating des paliers (points + affinité 20/50 + N12 pour paliers 3), et les 6 correctifs de rebranchement (§03 du rapport).
- **Plan 3 — Déblocages + actives** : type de condition `niveau`, double gate des brocantes T2/T3/T4, table `DEBLOCAGES_PAR_NIVEAU`, infra `lib/actives.ts` + les 6 actives.
- **Plan 4 — UI** : barre d'XP persistante, écran de level-up (+ son), previews, refonte de l'écran Compétences, onboarding progressif.
