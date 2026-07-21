# Compétences 1 pt, plafond à vie, parcours & fiches — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chaque palier de compétence coûte 1 pt, les points cessent d'être octroyés une fois le coût total de l'arbre (96) gagné à vie, les pastilles du parcours grossissent pour contenir « Niv. 100 », et chaque ligne du parcours ouvre une fiche description/effet.

**Architecture:** Le coût passe à 1 dans `PALIER_DEFAULTS` (les 96 paliers utilisent les défauts) ; `COUT_TOTAL_COMPETENCES` est dérivé des données et sert de plafond dans `xp.ts` (`pointsOctroyables`) appliqué aux octrois par niveau ET aux bonus de chapitre ; migration v15 rembourse l'ancien barème (coût = numéro du palier) puis écrête ; `DeblocageNiveau` gagne une `description` (FR + overlays EN/ES par titre FR, pattern `titreDeblocage`) affichée dans une petite fiche modale de `ParcoursSheet`.

**Tech Stack:** vitest (+ jsdom pour ParcoursSheet), i18n maison (overlays par clé FR), migrations monolithiques rejouées gatées par `dejaVN`.

## Global Constraints

- Spec : `docs/superpowers/specs/2026-07-21-competences-1pt-parcours-design.md`.
- `PALIER_DEFAULTS` → coûts **1/1/1** ; `niveauBrocanteurRequis` (0/N10/N30) INCHANGÉS.
- `COUT_TOTAL_COMPETENCES` = Σ coûts, **dérivé des données** (= 96 après refonte), jamais codé en dur.
- Plafond : `pointsDisponibles + points dépensés` ne dépasse jamais `COUT_TOTAL_COMPETENCES` ; XP et niveaux continuent jusqu'à 100 (courbe intacte).
- Migration v15 : remboursement `(numéro du palier − 1)` par compétence débloquée, puis écrêtage ; idempotente (gate `dejaV15`).
- §6 du spec (simulateur) : vérifié en exploration — `niveauSim` ne modélise ni coûts ni dépenses de points → **rien à faire**.
- Lint : `npm run lint` cassé → `npx eslint src`.
- Commits en français, Conventional Commits, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Coût unique 1 pt + `COUT_TOTAL_COMPETENCES` + helper de dépense

**Files:**
- Modify: `src/data/competences.ts:27-31` (PALIER_DEFAULTS) + fin de fichier (exports)
- Modify: `src/data/competences.test.ts` (assertions de coûts à adapter + nouveaux tests)

**Interfaces:**
- Consumes: `ALL_TREES`, `getCompetence(id)` (déjà exportés par `src/data/competences.ts`).
- Produces (Tasks 2-3) : `export const COUT_TOTAL_COMPETENCES: number` ; `export function pointsDepensesCompetences(ids: readonly string[]): number`.

- [ ] **Step 1: Écrire les tests (échec attendu)**

Dans `src/data/competences.test.ts`, ajouter :

```ts
describe("refonte des coûts (1 pt par palier)", () => {
  it("chaque palier coûte exactement 1 point", () => {
    for (const tree of ALL_TREES)
      for (const b of tree.branches)
        for (const p of b.paliers) expect(p.coutPoints, `${tree.id}.${b.id}.${p.numero}`).toBe(1);
  });
  it("COUT_TOTAL_COMPETENCES = nombre total de paliers (96)", () => {
    let n = 0;
    for (const tree of ALL_TREES) for (const b of tree.branches) n += b.paliers.length;
    expect(COUT_TOTAL_COMPETENCES).toBe(n);
    expect(COUT_TOTAL_COMPETENCES).toBe(96);
  });
  it("pointsDepensesCompetences somme les coûts des ids connus, ignore les inconnus", () => {
    expect(pointsDepensesCompetences(["general.negociation.1", "general.negociation.2"])).toBe(2);
    expect(pointsDepensesCompetences(["id.inconnu.9"])).toBe(0);
    expect(pointsDepensesCompetences([])).toBe(0);
  });
});
```

(compléter les imports du fichier : `ALL_TREES`, `COUT_TOTAL_COMPETENCES`, `pointsDepensesCompetences`)

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/data/competences.test.ts`
Expected: FAIL (exports absents ; coûts 2/3 sur les paliers 2/3).

- [ ] **Step 3: Implémenter**

Dans `src/data/competences.ts`, remplacer les défauts (lignes 27-31) :

```ts
/** Coût (1 pt partout — refonte 2026-07-21) et niveau de Brocanteur requis par palier. */
const PALIER_DEFAULTS = [
  { coutPoints: 1, niveauBrocanteurRequis: 0 },
  { coutPoints: 1, niveauBrocanteurRequis: NIVEAU_BROCANTEUR_PALIER_2 },
  { coutPoints: 1, niveauBrocanteurRequis: NIVEAU_BROCANTEUR_PALIER_3 },
] as const;
```

Et ajouter en fin de fichier :

```ts
/** Coût total de l'arbre entier — plafond des points gagnables « à vie ». */
export const COUT_TOTAL_COMPETENCES = ALL_TREES.reduce(
  (acc, t) =>
    acc +
    t.branches.reduce(
      (a, b) => a + b.paliers.reduce((s, p) => s + p.coutPoints, 0),
      0,
    ),
  0,
);

/** Somme des coûts des compétences débloquées (= points dépensés). */
export function pointsDepensesCompetences(ids: readonly string[]): number {
  return ids.reduce((acc, id) => acc + (getCompetence(id)?.coutPoints ?? 0), 0);
}
```

- [ ] **Step 4: Vérifier + adapter les tests existants**

Run: `npx vitest run src/data/competences.test.ts src/lib/competences.test.ts 2>/dev/null ; npx vitest run src/data src/lib/competences.test.ts`
Si d'anciens tests assertent un coût 2 ou 3 (chercher `coutPoints` dans les fichiers de test), les adapter à 1 — le changement est voulu par le spec.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/competences.ts src/data/competences.test.ts
git commit -m "feat(competences): chaque palier coûte 1 point + COUT_TOTAL_COMPETENCES dérivé"
```

---

### Task 2: Plafond de points « à vie » (niveaux + bonus de chapitre)

**Files:**
- Modify: `src/lib/xp.ts:44-65` (constantes + `appliquerGainXPBrocanteur`)
- Modify: `src/context/GameContext.tsx:1318,1341,1377,1424,1642,1649` (call sites)
- Modify: `src/lib/quetes/principales.ts:116,121`
- Modify: `src/lib/i18n/ui/fr.ts:215` (`sheets.chaqueNiveauPoint`) + `en.ts`/`es.ts` (même clé)
- Test: `src/lib/xp.test.ts` (ou le fichier de tests xp existant)

**Interfaces:**
- Consumes: `COUT_TOTAL_COMPETENCES`, `pointsDepensesCompetences` (Task 1).
- Produces: `appliquerGainXPBrocanteur(b, gain, pointsDepenses = 0)` (3ᵉ paramètre optionnel) ; `export function pointsOctroyables(b: BrocanteurState, pointsDepenses: number, demande: number): number`.

- [ ] **Step 1: Écrire les tests (échec attendu)**

Dans le fichier de tests de `src/lib/xp.ts` (créer `src/lib/xp.test.ts` s'il n'existe pas ; sinon compléter l'existant) :

```ts
import {
  appliquerGainXPBrocanteur,
  pointsOctroyables,
  xpRequisPourNiveauBrocanteur,
  POINTS_BONUS_CHAPITRE,
} from "./xp";
import { COUT_TOTAL_COMPETENCES } from "@/data/competences";

describe("plafond de points à vie (COUT_TOTAL_COMPETENCES)", () => {
  it("écrête l'octroi par niveau : octroi partiel puis nul", () => {
    // À 1 pt du plafond (disponibles 1 + dépensés 94 = 95), franchir 2 niveaux
    // n'octroie qu'1 point.
    const b = { xp: xpRequisPourNiveauBrocanteur(50), niveau: 50, pointsDisponibles: 1 };
    const gain = xpRequisPourNiveauBrocanteur(52) - b.xp;
    const apres = appliquerGainXPBrocanteur(b, gain, COUT_TOTAL_COMPETENCES - 2);
    expect(apres.niveau).toBe(52);
    expect(apres.pointsDisponibles).toBe(2);
  });

  it("XP et niveaux continuent après le plafond, points constants", () => {
    const b = { xp: xpRequisPourNiveauBrocanteur(60), niveau: 60, pointsDisponibles: 0 };
    const gain = xpRequisPourNiveauBrocanteur(62) - b.xp;
    const apres = appliquerGainXPBrocanteur(b, gain, COUT_TOTAL_COMPETENCES);
    expect(apres.niveau).toBe(62);
    expect(apres.pointsDisponibles).toBe(0);
    expect(apres.xp).toBe(b.xp + gain);
  });

  it("sans 3ᵉ argument, comportement historique (plafond loin)", () => {
    const b = { xp: 0, niveau: 0, pointsDisponibles: 0 };
    const apres = appliquerGainXPBrocanteur(b, xpRequisPourNiveauBrocanteur(3));
    expect(apres.pointsDisponibles).toBe(3);
  });

  it("pointsOctroyables clampe le bonus de chapitre", () => {
    const b = { xp: 0, niveau: 0, pointsDisponibles: 0 };
    expect(pointsOctroyables(b, COUT_TOTAL_COMPETENCES - 1, POINTS_BONUS_CHAPITRE)).toBe(1);
    expect(pointsOctroyables(b, COUT_TOTAL_COMPETENCES, POINTS_BONUS_CHAPITRE)).toBe(0);
    expect(pointsOctroyables(b, 0, POINTS_BONUS_CHAPITRE)).toBe(POINTS_BONUS_CHAPITRE);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/xp.test.ts`
Expected: FAIL (`pointsOctroyables` absent ; écrêtage non appliqué).

- [ ] **Step 3: Implémenter dans `xp.ts`**

Ajouter l'import en tête : `import { COUT_TOTAL_COMPETENCES } from "@/data/competences";`
Après `POINTS_BONUS_CHAPITRE` (ligne 47), ajouter :

```ts
/**
 * Points encore octroyables avant le plafond « à vie » : la somme
 * disponibles + dépensés ne dépasse jamais le coût total de l'arbre —
 * une fois tout payable, on ne gagne plus rien (le niveau, lui, continue).
 */
export function pointsOctroyables(
  b: BrocanteurState,
  pointsDepenses: number,
  demande: number,
): number {
  const gagnesAVie = b.pointsDisponibles + pointsDepenses;
  return Math.max(0, Math.min(demande, COUT_TOTAL_COMPETENCES - gagnesAVie));
}
```

Et remplacer `appliquerGainXPBrocanteur` :

```ts
export function appliquerGainXPBrocanteur(
  b: BrocanteurState,
  gain: number,
  /** Points déjà dépensés (Σ coûts des compétences débloquées) — sert au plafond à vie. */
  pointsDepenses = 0,
): BrocanteurState {
  if (gain <= 0) return b;
  const nouveauXP = b.xp + gain;
  let niveau = b.niveau;
  let pointsDisponibles = b.pointsDisponibles;
  while (
    niveau < NIVEAU_BROCANTEUR_MAX &&
    nouveauXP >= xpRequisPourNiveauBrocanteur(niveau + 1)
  ) {
    niveau += 1;
    pointsDisponibles += pointsOctroyables(
      { xp: nouveauXP, niveau, pointsDisponibles },
      pointsDepenses,
      POINTS_PAR_NIVEAU,
    );
  }
  return { xp: nouveauXP, niveau, pointsDisponibles };
}
```

- [ ] **Step 4: Brancher les call sites**

Dans `src/context/GameContext.tsx`, importer `pointsDepensesCompetences` depuis `@/data/competences` et `pointsOctroyables` depuis `@/lib/xp`, puis :

- ligne 1318 : `appliquerGainXPBrocanteur(prev.brocanteur, montant, pointsDepensesCompetences(prev.competencesDebloquees))`
- lignes 1341 et 1377 : idem avec l'état local en scope (`prev.competencesDebloquees`)
- ligne 1424 : `appliquerGainXPBrocanteur(next.brocanteur, XP_DECOUVERTE_COLLECTION, pointsDepensesCompetences(prev.competencesDebloquees))`
- ligne 1642 : `appliquerGainXPBrocanteur(credited.brocanteur, xpMission, pointsDepensesCompetences(credited.competencesDebloquees))`
- ligne 1649-1650 (bonus de chapitre) :

```ts
              pointsDisponibles:
                avecXP.pointsDisponibles +
                pointsOctroyables(
                  avecXP,
                  pointsDepensesCompetences(credited.competencesDebloquees),
                  POINTS_BONUS_CHAPITRE,
                ),
```

Dans `src/lib/quetes/principales.ts` (imports idem) :

- ligne 116 : `appliquerGainXPBrocanteur(next.brocanteur, XP_QUETE_PRINCIPALE, pointsDepensesCompetences(next.competencesDebloquees))`
- ligne 121 :

```ts
      pointsDisponibles:
        avecXP.pointsDisponibles +
        pointsOctroyables(
          avecXP,
          pointsDepensesCompetences(next.competencesDebloquees),
          POINTS_BONUS_CHAPITRE,
        ),
```

NE PAS toucher `src/lib/migrations.ts:486` ni `src/lib/simulation/niveauSim.ts:584` (défaut 0 : le premier est recalculé plus loin par la migration — et écrêté en v15 (Task 3) ; le second ne modélise pas les points).

- [ ] **Step 5: Note de bas de page du parcours (i18n)**

`src/lib/i18n/ui/fr.ts:215` :

```ts
    chaqueNiveauPoint: "Chaque niveau : +1 point de compétence, tant qu'il reste des compétences à débloquer",
```

`en.ts` (même clé, même section) :

```ts
    chaqueNiveauPoint: "Each level: +1 skill point, as long as skills remain to unlock",
```

`es.ts` :

```ts
    chaqueNiveauPoint: "Cada nivel: +1 punto de habilidad, mientras queden habilidades por desbloquear",
```

- [ ] **Step 6: Vérifier**

Run: `npx vitest run src/lib/xp.test.ts src/lib/quetes/ src/lib/i18n/ui/ui.test.ts && npx eslint src/lib/xp.ts src/context/GameContext.tsx src/lib/quetes/principales.ts`
Expected: PASS / eslint propre. Si des tests existants de quêtes assertent des points post-chapitre, vérifier qu'ils restent sous le plafond (ils le sont : états de test peu avancés) — sinon adapter en citant le spec.

- [ ] **Step 7: Commit**

```bash
git add src/lib/xp.ts src/lib/xp.test.ts src/context/GameContext.tsx src/lib/quetes/principales.ts \
        src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts
git commit -m "feat(xp): plafond de points à vie = coût total de l'arbre (niveaux + chapitres)"
```

---

### Task 3: Migration v15 — remboursement + écrêtage

**Files:**
- Modify: `src/lib/migrations.ts:101` (SAVE_VERSION), + nouveau helper + application
- Test: `src/lib/migrations.test.ts`

**Interfaces:**
- Consumes: `COUT_TOTAL_COMPETENCES`, `pointsDepensesCompetences`, `getCompetence` (`@/data/competences`).
- Produces: rien (interne migrations).

- [ ] **Step 1: Écrire les tests (échec attendu)**

Dans `src/lib/migrations.test.ts`, ajouter (suivre les fixtures existantes du fichier pour construire une save chargée ; l'essentiel est `version`, `competencesDebloquees`, `brocanteur`) :

```ts
describe("v15 — refonte des coûts de compétences (1 pt)", () => {
  it("rembourse l'écart de l'ancien barème (P1 +0, P2 +1, P3 +2)", () => {
    const save = saveV14({
      brocanteur: { xp: 5000, niveau: 20, pointsDisponibles: 5 },
      competencesDebloquees: [
        "general.negociation.1", // ancien coût 1 → +0
        "general.negociation.2", // ancien coût 2 → +1
        "general.negociation.3", // ancien coût 3 → +2
      ],
    });
    const out = appliquerMigrations(save);
    expect(out.brocanteur.pointsDisponibles).toBe(8); // 5 + 3
  });

  it("écrête pour que disponibles + dépensés ≤ COUT_TOTAL_COMPETENCES", () => {
    const save = saveV14({
      brocanteur: { xp: 5000, niveau: 20, pointsDisponibles: COUT_TOTAL_COMPETENCES - 1 },
      competencesDebloquees: ["general.negociation.1", "general.negociation.2"],
    });
    const out = appliquerMigrations(save);
    // dépensés (nouveau barème) = 2 → disponibles plafonnés à 94
    expect(out.brocanteur.pointsDisponibles).toBe(COUT_TOTAL_COMPETENCES - 2);
  });

  it("idempotente : une save déjà v15 n'est pas re-remboursée", () => {
    const save = saveV15({
      brocanteur: { xp: 5000, niveau: 20, pointsDisponibles: 5 },
      competencesDebloquees: ["general.negociation.2"],
    });
    const out = appliquerMigrations(save);
    expect(out.brocanteur.pointsDisponibles).toBe(5);
  });
});
```

`saveV14`/`saveV15` : construire sur le modèle des helpers de fixtures déjà présents dans le fichier (save minimale valide avec `version: 14`/`15`) — réutiliser l'existant plutôt que d'en créer de nouveaux si un builder générique est disponible.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/migrations.test.ts`
Expected: FAIL (pas de remboursement, disponibles inchangés).

- [ ] **Step 3: Implémenter**

Dans `src/lib/migrations.ts` :

1. `export const SAVE_VERSION = 15;` (ligne 101).
2. Près des autres helpers de migration, ajouter :

```ts
/**
 * v15 — refonte des coûts : chaque palier coûte 1 pt (ancien barème : coût
 * = numéro du palier). Rembourse l'écart payé, puis écrête pour que les
 * points « à vie » (disponibles + dépensés) ≤ COUT_TOTAL_COMPETENCES.
 */
function appliquerRefonteCoutsV15(
  brocanteur: BrocanteurState,
  competencesDebloquees: readonly string[],
  dejaV15: boolean,
): BrocanteurState {
  if (dejaV15) return brocanteur;
  const remboursement = competencesDebloquees.reduce((acc, id) => {
    const c = getCompetence(id);
    return acc + (c ? c.palierNumero - 1 : 0);
  }, 0);
  const plafondDisponibles = Math.max(
    0,
    COUT_TOTAL_COMPETENCES - pointsDepensesCompetences(competencesDebloquees),
  );
  return {
    ...brocanteur,
    pointsDisponibles: Math.min(
      brocanteur.pointsDisponibles + remboursement,
      plafondDisponibles,
    ),
  };
}
```

3. Dans la passe `appliquerMigrations`, calculer `const dejaV15 = typeof loaded.version === "number" && loaded.version >= 15;` (à côté des autres `dejaVN`), puis appliquer le helper au brocanteur FINAL de l'état retourné (après tout le traitement existant du brocanteur, y compris le recalcul legacy <v9 des lignes ~719-725) :

```ts
  brocanteur: appliquerRefonteCoutsV15(brocanteurFinal, competencesDebloqueesFinales, dejaV15),
```

(adapter aux noms locaux réels du point d'assemblage ; l'important est d'opérer sur les valeurs finales, pas les intermédiaires).
Imports à compléter : `getCompetence`, `COUT_TOTAL_COMPETENCES`, `pointsDepensesCompetences` depuis `@/data/competences` (certains y sont peut-être déjà).

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/lib/migrations.test.ts`
Expected: PASS — y compris les tests de migration existants (le gate `dejaV15` ne doit rien changer aux fixtures anciennes qui n'ont pas de compétences débloquées ; si une fixture legacy a des compétences ET teste `pointsDisponibles`, adapter la valeur attendue en citant le remboursement).

- [ ] **Step 5: Commit**

```bash
git add src/lib/migrations.ts src/lib/migrations.test.ts
git commit -m "feat(migrations): v15 — remboursement de l'ancien barème de compétences + écrêtage"
```

---

### Task 4: Descriptions des déblocages (données + i18n EN/ES)

**Files:**
- Modify: `src/data/deblocagesNiveau.ts` (champ `description` + textes FR)
- Modify: `src/lib/i18n/contenu/en/deblocages.ts`, `src/lib/i18n/contenu/es/deblocages.ts` (records descriptions)
- Modify: `src/lib/i18n/contenu/index.ts:192` (à côté de `titreDeblocage`)
- Create: `src/lib/i18n/contenu/deblocages.test.ts`

**Interfaces:**
- Consumes: `DEBLOCAGES_PAR_NIVEAU`, structure `DEBLOCAGES_EN/ES` (Record<titreFR, string>).
- Produces (Task 5) : `DeblocageNiveau.description: string` ; `export function descriptionDeblocage(dep: { titre: string; description: string }, locale: Locale): string` dans `@/lib/i18n/contenu`.

- [ ] **Step 1: Écrire le test de parité (échec attendu)**

Créer `src/lib/i18n/contenu/deblocages.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { DEBLOCAGES_PAR_NIVEAU } from "@/data/deblocagesNiveau";
import { DEBLOCAGES_EN, DEBLOCAGES_DESC_EN } from "./en/deblocages";
import { DEBLOCAGES_ES, DEBLOCAGES_DESC_ES } from "./es/deblocages";
import { descriptionDeblocage } from "./index";

describe("déblocages — descriptions et parité i18n", () => {
  it("chaque déblocage a une description FR non vide", () => {
    for (const dep of DEBLOCAGES_PAR_NIVEAU) {
      expect(dep.description, dep.titre).toBeTruthy();
    }
  });
  it("chaque titre FR a sa description EN et ES", () => {
    for (const dep of DEBLOCAGES_PAR_NIVEAU) {
      expect(DEBLOCAGES_DESC_EN[dep.titre], `EN: ${dep.titre}`).toBeTruthy();
      expect(DEBLOCAGES_DESC_ES[dep.titre], `ES: ${dep.titre}`).toBeTruthy();
      expect(DEBLOCAGES_EN[dep.titre], `EN titre: ${dep.titre}`).toBeTruthy();
      expect(DEBLOCAGES_ES[dep.titre], `ES titre: ${dep.titre}`).toBeTruthy();
    }
  });
  it("descriptionDeblocage résout l'overlay et retombe sur le FR", () => {
    const dep = DEBLOCAGES_PAR_NIVEAU[0];
    expect(descriptionDeblocage(dep, "fr")).toBe(dep.description);
    expect(descriptionDeblocage(dep, "en")).toBe(DEBLOCAGES_DESC_EN[dep.titre]);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/i18n/contenu/deblocages.test.ts`
Expected: FAIL (champ/exports absents).

- [ ] **Step 3: Données FR**

Dans `src/data/deblocagesNiveau.ts` :

1. `DeblocageNiveau` gagne `description: string;` (après `titre`).
2. `ATOUTS` gagne un champ `desc` par entrée (effets vérifiés dans le code — chine/vitrine/negociation) :

```ts
const ATOUTS: ReadonlyArray<{ id: keyof typeof NIVEAU_ACTIVES; titre: string; desc: string }> = [
  { id: "flair", titre: "Atout 🔍 Le Flair",
    desc: "En chine : révèle la cote de tous les objets de l'étal pour le reste de la visite. Un usage par jour." },
  { id: "lotGarni", titre: "Atout 🧺 Le Lot garni",
    desc: "En pleine négociation à l'étal : ajoute un second objet au panier du client, le prix du lot est renégocié d'un bloc. Un usage par jour." },
  { id: "fouille", titre: "Atout 🧹 La Fouille",
    desc: "En chine : le vendeur remplace l'objet visé par un nouveau tirage. Un usage par jour." },
  { id: "boniment", titre: "Atout 🎩 Le Boniment",
    desc: "En vente : force la conclusion — si votre prix reste raisonnable le client l'accepte aussitôt, sinon il révèle son budget exact sans se fâcher. Un usage par jour." },
  { id: "tchatche", titre: "Atout 💬 La Tchatche",
    desc: "En chine : rouvre une négociation qui vient d'échouer, le vendeur retrouve son calme. Un usage par jour." },
  { id: "criee", titre: "Atout 📣 La Criée",
    desc: "À l'étal : ameute le passage — trois clients se présentent coup sur coup. Un usage par jour." },
];
```

3. Constantes génériques + `ENTREES` mis à jour :

```ts
const DESC_USAGE_2 = "L'atout peut désormais être utilisé deux fois par jour.";
const DESC_USAGE_3 = "L'atout peut désormais être utilisé trois fois par jour.";

const ENTREES: readonly DeblocageNiveau[] = [
  { niveau: 1, titre: "Ouverture de l'écran Compétences (+1 point)", famille: "jalon", effectif: true,
    description: "La bibliothèque ouvre l'écran Compétences : dépensez vos points (1 par palier) pour renforcer votre métier." },
  { niveau: NIVEAU_QUETES_PERIODIQUES, titre: "Quêtes quotidiennes et hebdomadaires", famille: "contenu", effectif: true,
    description: "Le courrier apporte des commandes : une quotidienne, et une hebdomadaire plus ambitieuse, récompensées en argent." },
  { niveau: NIVEAU_BROCANTEUR_PALIER_2, titre: "Paliers 2 des compétences", famille: "jalon", effectif: true,
    description: "Les paliers 2 de toutes les branches de compétences deviennent achetables." },
  { niveau: NIVEAU_BROCANTEUR_PALIER_3, titre: "Paliers 3 des compétences", famille: "jalon", effectif: true,
    description: "Les paliers 3 — le sommet de chaque branche — deviennent achetables." },
  ...ATOUTS.map((a) => ({
    niveau: NIVEAU_ACTIVES[a.id], titre: a.titre, famille: "active" as const, effectif: true,
    description: a.desc,
  })),
  ...ATOUTS.map((a) => ({
    niveau: NIVEAU_USAGE_2[a.id], titre: `${a.titre} — 2ᵉ usage par jour`, famille: "active" as const, effectif: true,
    description: DESC_USAGE_2,
  })),
  ...ATOUTS.map((a) => ({
    niveau: NIVEAU_USAGE_3[a.id], titre: `${a.titre} — 3ᵉ usage par jour`, famille: "active" as const, effectif: true,
    description: DESC_USAGE_3,
  })),
];
```

(les titres FR restent STRICTEMENT identiques — ce sont les clés des overlays)

- [ ] **Step 4: Overlays EN/ES**

Dans `src/lib/i18n/contenu/en/deblocages.ts`, ajouter (en conservant `DEBLOCAGES_EN` intact) un record `DEBLOCAGES_DESC_EN: Record<string, string>` — clés = titres FR canoniques, une entrée par déblocage :

```ts
export const DEBLOCAGES_DESC_EN: Record<string, string> = {
  "Ouverture de l'écran Compétences (+1 point)":
    "The library opens the Skills screen: spend your points (1 per tier) to sharpen your trade.",
  "Quêtes quotidiennes et hebdomadaires":
    "The mail brings commissions: a daily one, plus a more ambitious weekly one, rewarded in cash.",
  "Paliers 2 des compétences": "Tier 2 of every skill branch becomes purchasable.",
  "Paliers 3 des compétences": "Tier 3 — the top of every branch — becomes purchasable.",
  "Atout 🔍 Le Flair":
    "While hunting: reveals the true value of every item on the stall for the rest of the visit. One use per day.",
  "Atout 🧺 Le Lot garni":
    "Mid-negotiation at your stand: adds a second item to the customer's bundle, the lot's price is renegotiated as one. One use per day.",
  "Atout 🧹 La Fouille":
    "While hunting: the seller replaces the targeted item with a fresh find. One use per day.",
  "Atout 🎩 Le Boniment":
    "When selling: forces the close — if your price is fair the customer takes it on the spot, otherwise they reveal their exact budget without getting upset. One use per day.",
  "Atout 💬 La Tchatche":
    "While hunting: reopens a negotiation that just failed, the seller calms down. One use per day.",
  "Atout 📣 La Criée":
    "At your stand: draws the crowd — three customers show up back to back. One use per day.",
};
const DESC_USAGE_2_EN = "The asset can now be used twice a day.";
const DESC_USAGE_3_EN = "The asset can now be used three times a day.";
for (const t of ["Atout 🔍 Le Flair", "Atout 🧺 Le Lot garni", "Atout 🧹 La Fouille", "Atout 🎩 Le Boniment", "Atout 💬 La Tchatche", "Atout 📣 La Criée"]) {
  DEBLOCAGES_DESC_EN[`${t} — 2ᵉ usage par jour`] = DESC_USAGE_2_EN;
  DEBLOCAGES_DESC_EN[`${t} — 3ᵉ usage par jour`] = DESC_USAGE_3_EN;
}
```

Idem `es/deblocages.ts` avec `DEBLOCAGES_DESC_ES` :

```ts
export const DEBLOCAGES_DESC_ES: Record<string, string> = {
  "Ouverture de l'écran Compétences (+1 point)":
    "La biblioteca abre la pantalla de Habilidades: gasta tus puntos (1 por nivel) para afinar el oficio.",
  "Quêtes quotidiennes et hebdomadaires":
    "El correo trae encargos: uno diario y otro semanal más ambicioso, recompensados con dinero.",
  "Paliers 2 des compétences": "El nivel 2 de todas las ramas de habilidades pasa a estar disponible.",
  "Paliers 3 des compétences": "El nivel 3 — la cima de cada rama — pasa a estar disponible.",
  "Atout 🔍 Le Flair":
    "En la rebusca: revela el valor real de todos los objetos del puesto durante el resto de la visita. Un uso al día.",
  "Atout 🧺 Le Lot garni":
    "En plena negociación en tu puesto: añade un segundo objeto al lote del cliente, el precio se renegocia en bloque. Un uso al día.",
  "Atout 🧹 La Fouille":
    "En la rebusca: el vendedor sustituye el objeto elegido por una nueva pieza. Un uso al día.",
  "Atout 🎩 Le Boniment":
    "Al vender: fuerza el cierre — si tu precio es razonable el cliente lo acepta al momento; si no, revela su presupuesto exacto sin enfadarse. Un uso al día.",
  "Atout 💬 La Tchatche":
    "En la rebusca: reabre una negociación recién fracasada, el vendedor se calma. Un uso al día.",
  "Atout 📣 La Criée":
    "En el puesto: atrae a la multitud — tres clientes llegan seguidos. Un uso al día.",
};
const DESC_USAGE_2_ES = "El comodín puede usarse ahora dos veces al día.";
const DESC_USAGE_3_ES = "El comodín puede usarse ahora tres veces al día.";
for (const t of ["Atout 🔍 Le Flair", "Atout 🧺 Le Lot garni", "Atout 🧹 La Fouille", "Atout 🎩 Le Boniment", "Atout 💬 La Tchatche", "Atout 📣 La Criée"]) {
  DEBLOCAGES_DESC_ES[`${t} — 2ᵉ usage par jour`] = DESC_USAGE_2_ES;
  DEBLOCAGES_DESC_ES[`${t} — 3ᵉ usage par jour`] = DESC_USAGE_3_ES;
}
```

⚠ Si `DEBLOCAGES_ES` traduit « Atout » par un autre mot (ex. « Comodín »), reprendre CE mot dans les deux chaînes d'usage ES ci-dessus pour rester cohérent — vérifier dans le fichier.

- [ ] **Step 5: `descriptionDeblocage` dans `contenu/index.ts`**

À côté de `titreDeblocage` (ligne 192), même pattern :

```ts
const DEBLOCAGES_DESC_OVERLAY = { en: DEBLOCAGES_DESC_EN, es: DEBLOCAGES_DESC_ES } as const;

export function descriptionDeblocage(
  dep: { titre: string; description: string },
  locale: Locale,
): string {
  if (locale !== "fr") {
    const trad = DEBLOCAGES_DESC_OVERLAY[locale][dep.titre];
    if (trad) return trad;
  }
  return dep.description;
}
```

(compléter les imports du fichier : `DEBLOCAGES_DESC_EN`, `DEBLOCAGES_DESC_ES`)

- [ ] **Step 6: Vérifier**

Run: `npx vitest run src/lib/i18n/contenu/deblocages.test.ts src/data && npx eslint src/data/deblocagesNiveau.ts src/lib/i18n/contenu`
Expected: PASS / propre.

- [ ] **Step 7: Commit**

```bash
git add src/data/deblocagesNiveau.ts src/lib/i18n/contenu/en/deblocages.ts \
        src/lib/i18n/contenu/es/deblocages.ts src/lib/i18n/contenu/index.ts \
        src/lib/i18n/contenu/deblocages.test.ts
git commit -m "feat(deblocages): descriptions d'effet FR + overlays EN/ES + descriptionDeblocage"
```

---

### Task 5: ParcoursSheet — pastilles plus grosses + fiche au tap + vérif globale

**Files:**
- Modify: `src/components/mobile/ParcoursSheet.tsx`
- Modify: `src/components/mobile/ParcoursSheet.test.tsx`
- Modify: `src/lib/i18n/ui/fr.ts` + `en.ts` + `es.ts` (2 clés `sheets`)

**Interfaces:**
- Consumes: `descriptionDeblocage` + `titreDeblocage` (`@/lib/i18n/contenu`), `DeblocageNiveau` (`@/data/deblocagesNiveau`), clé existante `sheets.nivAbrege`.
- Produces: rien (UI feuille).

- [ ] **Step 1: Clés i18n**

`fr.ts`, section `sheets` (près de `nivAbrege`) :

```ts
    ficheDebloque: "Débloqué ✓",
    ficheAVenir: "À venir",
```

`en.ts` : `ficheDebloque: "Unlocked ✓",` / `ficheAVenir: "Coming up",`
`es.ts` : `ficheDebloque: "Desbloqueado ✓",` / `ficheAVenir: "Próximamente",`

- [ ] **Step 2: Écrire les tests (échec attendu)**

Dans `src/components/mobile/ParcoursSheet.test.tsx`, ajouter (reprendre le mode de rendu des tests existants du fichier) :

```tsx
describe("ParcoursSheet — fiche de déblocage", () => {
  it("tap sur une ligne → fiche avec description et statut débloqué", async () => {
    const user = userEvent.setup();
    render(<ParcoursSheet open onClose={vi.fn()} niveau={6} />);
    await user.click(screen.getByTestId("parcours-row-5")); // Le Flair (N5, atteint)
    expect(screen.getByText(/révèle la cote/)).toBeTruthy();
    expect(screen.getByText("Débloqué ✓")).toBeTruthy();
  });

  it("déblocage futur → statut À venir, fermeture par ✕", async () => {
    const user = userEvent.setup();
    render(<ParcoursSheet open onClose={vi.fn()} niveau={6} />);
    await user.click(screen.getByTestId("parcours-row-30")); // Paliers 3 + Criée (N30)
    expect(screen.getByText("À venir")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Fermer la fiche" }));
    expect(screen.queryByText("À venir")).toBeNull();
  });
});
```

⚠ `parcours-row-30` porte deux déblocages (Paliers 3 ET La Criée) — la ligne devient un bouton PAR déblocage (voir Step 4), le testid reste par déblocage : utiliser `screen.getAllByTestId("parcours-row-30")[0]` si nécessaire. Ajuster l'accname « Fermer la fiche » à la clé aria réellement ajoutée (Step 5).

- [ ] **Step 3: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/ParcoursSheet.test.tsx`
Expected: FAIL (pas de fiche).

- [ ] **Step 4: Grossir les pastilles + lignes cliquables**

Dans `ParcoursSheet.tsx` :

1. `railCol` : `width: 52` → `width: 64`.
2. `pastille()` : base `width/height: 34→48`, `borderRadius: 17→24`, `fontSize: 11→13` ; variante « prochain » `width/height: 40→56`, `borderRadius: 20→28`, `fontSize: 13→15`.
3. Chaque ligne de déblocage (le `<div data-testid=...>` de la boucle `deps.map`) devient un `<button type="button">` :

```tsx
                    {deps.map((dep) => (
                      <button
                        key={`${dep.niveau}-${dep.titre}`}
                        type="button"
                        data-testid={`parcours-row-${dep.niveau}`}
                        data-etat={etat}
                        style={{
                          ...titreLigne(etat),
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          textAlign: "left",
                          cursor: "pointer",
                          width: "100%",
                        }}
                        onClick={() => setFiche({ dep, etat })}
                      >
                        {titreDeblocage(dep, locale)}
                      </button>
                    ))}
```

avec en tête de composant : `const [fiche, setFiche] = useState<{ dep: DeblocageNiveau; etat: EtatNiveau } | null>(null);` (imports : `useState`, `DeblocageNiveau` de `@/data/deblocagesNiveau`, `descriptionDeblocage` de `@/lib/i18n/contenu`). Réinitialiser à la fermeture de la sheet : dans le `useEffect` d'ouverture existant, `if (!open) setFiche(null);` (ou équivalent).

- [ ] **Step 5: La fiche modale**

Styles (à côté des styles existants) :

```tsx
const ficheScrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.45)",
  zIndex: 60,
};

const ficheCarte: CSSProperties = {
  position: "fixed",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(88vw, 360px)",
  background: "var(--paper-100)",
  border: "2px solid var(--brass-500)",
  boxShadow: "0 12px 26px rgba(0,0,0,0.4)",
  padding: "16px 16px 14px",
  zIndex: 61,
};

const ficheTitre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 16,
  color: "var(--ink-900)",
  margin: "0 24px 6px 0",
  lineHeight: 1.25,
};

const ficheMeta: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  marginBottom: 10,
};

const ficheDescription: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 13.5,
  lineHeight: 1.45,
  color: "var(--forest-800)",
  margin: 0,
};
```

Rendu, juste avant la fermeture du fragment racine (après la carte de la sheet) :

```tsx
        {fiche && (
          <>
            <div style={ficheScrim} onClick={() => setFiche(null)} aria-hidden />
            <div role="dialog" aria-modal="true" aria-label={titreDeblocage(fiche.dep, locale)} style={ficheCarte}>
              <button
                type="button"
                style={closeIconBtn}
                onClick={() => setFiche(null)}
                aria-label={d.sheets.fermerFiche}
              >
                ✕
              </button>
              <h3 style={ficheTitre}>{titreDeblocage(fiche.dep, locale)}</h3>
              <div style={ficheMeta}>
                {tr(d.sheets.nivAbrege, { n: fiche.dep.niveau })} ·{" "}
                {fiche.etat === "atteint" ? d.sheets.ficheDebloque : d.sheets.ficheAVenir}
              </div>
              <p style={ficheDescription}>{descriptionDeblocage(fiche.dep, locale)}</p>
            </div>
          </>
        )}
```

Clé aria supplémentaire (les 3 dictionnaires, section `sheets`) : `fermerFiche: "Fermer la fiche"` / `"Close details"` / `"Cerrar la ficha"`. Note : Échap ferme toute la sheet (comportement existant conservé — la fiche se ferme par ✕/scrim ; assumé au design).

- [ ] **Step 6: Vérifier + suite complète**

Run: `npx vitest run src/components/mobile/ParcoursSheet.test.tsx && npx vitest run && npx eslint src`
Expected: fiche 2/2 PASS, suite entière verte, eslint propre.

- [ ] **Step 7: Commit**

```bash
git add src/components/mobile/ParcoursSheet.tsx src/components/mobile/ParcoursSheet.test.tsx \
        src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts
git commit -m "feat(parcours): pastilles élargies + fiche description/effet au tap"
```

---

## Rappel de fin de chantier (hors code)

Vérif device par Guillaume : « Niv. 100 » entier dans les pastilles, fiche lisible, et sur une save TestFlight existante le remboursement v15 (points recrédités). Le PalierOverlay de l'écran Compétences affiche le coût depuis les données — vérifier qu'il montre bien « 1 » partout.
