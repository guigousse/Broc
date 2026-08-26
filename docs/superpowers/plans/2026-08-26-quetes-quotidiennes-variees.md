# Quêtes quotidiennes variées — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le lot de quêtes quotidiennes tire deux de ses trois lignes dans un catalogue élargi de sept formes, dont deux neuves — « trouve une pièce légendaire » et « restaure une pièce » — verrouillées derrière une condition d'accès.

**Architecture :** Le catalogue de formes (`quetes/formes.ts`) gagne deux membres et une famille `atelier` ; un nouveau module `quetes/eligibilite.ts` porte les verrous d'accès sous forme de table ; `quetes/echelle.ts` gagne cinq champs de barème quotidien ; `quetes/periodiques.ts` remplace sa constante quotidienne par un tirage. La prime légendaire, dont le montant dépend de la pièce trouvée, se résout à la livraison via un marqueur `primeVariable` porté par le payload.

**Tech Stack :** TypeScript, React 19 / Next.js, vitest, i18n maison (FR source + overlays EN/ES/EL).

**Spec :** `docs/superpowers/specs/2026-08-26-quetes-quotidiennes-variees-design.md`

## Global Constraints

- **`npx vitest run --maxWorkers=4 <chemin>`** — sans ce drapeau, ~41 faux échecs par famine de workers sur ce Mac Intel. Jamais `npm test` nu.
- **Lint :** `npx eslint src` (le script `npm run lint` est cassé depuis Next 16).
- **Aucune chaîne localisée en sauvegarde.** Le FR est persisté dans le payload ; les autres langues se régénèrent à l'affichage depuis `gabaritId` + `gabaritParams`.
- **`SAVE_VERSION` ne bouge pas** et aucune migration n'est écrite : tous les ajouts sont additifs (nouveau membre d'union, champs optionnels).
- **L'hebdomadaire n'est pas modifié** : ni `FORMES_HEBDOMADAIRES`, ni ses cibles, ni ses gabarits existants.
- **`TAUX_PRIME_LEGENDAIRE = 0.2`** et **`JETONS_LEGENDAIRE = 3`**, déclarés dans `src/lib/recompenses.ts` à côté de `JETONS_QUOTIDIENNE`/`JETONS_HEBDO`.
- Commit après chaque tâche, message en français, préfixe `feat(quetes):` ou `fix(quetes):`.

---

### Task 1 : L'objectif `objetLegendaire` — type et mesure

**Files:**
- Modify: `src/types/game.ts:158-168` (union `ObjectifMission`)
- Modify: `src/lib/quetes/objectifs.ts:40-55` (helper) et `:97-102` (le `switch`)
- Test: `src/lib/quetes/objectifs.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: le membre `{ type: "objetLegendaire"; nombre: number }` d'`ObjectifMission` ; la fonction exportée `legendairesAcquis(state, reso, jourRecu): ObjetTemplate[]`, triée par `prixRefBase` DÉCROISSANT (la tâche 9 lit son premier élément).

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à la fin de `src/lib/quetes/objectifs.test.ts`. Le fichier possède déjà les helpers `chineSession(timestamp, templateIds)`, `reso` (dont `timestampAcceptation: 1000`) et `createMockGameState` ; ne pas les redéfinir. Ajouter `legendairesAcquis` à l'import depuis `"./objectifs"`.

```ts
describe("objetLegendaire", () => {
  const obj = { type: "objetLegendaire" as const, nombre: 1 };

  it("compte les pièces légendaires chinées après l'acceptation", () => {
    const state = createMockGameState({
      historique: [chineSession(1500, ["leg.mus.violon_de_maitre_cremonais_1715"])],
    });
    expect(progressionObjectif(obj, state, reso, 1)).toEqual({ actuel: 1, cible: 1, atteint: true });
  });

  it("un objet rare ne vaut pas un légendaire", () => {
    const state = createMockGameState({
      historique: [chineSession(1500, ["mus.test_pressing_des_trolling_sons"])],
    });
    expect(progressionObjectif(obj, state, reso, 1)).toEqual({ actuel: 0, cible: 1, atteint: false });
  });

  it("ce qui précède l'acceptation ne compte pas", () => {
    const state = createMockGameState({
      historique: [chineSession(500, ["leg.mus.violon_de_maitre_cremonais_1715"])],
    });
    expect(progressionObjectif(obj, state, reso, 1)).toEqual({ actuel: 0, cible: 1, atteint: false });
  });
});

describe("legendairesAcquis", () => {
  it("rend les légendaires du plus cher au moins cher", () => {
    const state = createMockGameState({
      historique: [
        chineSession(1500, [
          "leg.mus.violon_de_maitre_cremonais_1715", // prixRefBase 4500
          "leg.lv.gutenberg_feuillet",               // prixRefBase 6500
          "mus.test_pressing_des_trolling_sons",     // rare, ignoré
        ]),
      ],
    });
    const noms = legendairesAcquis(state, reso, 1).map((t) => t.templateId);
    expect(noms).toEqual([
      "leg.lv.gutenberg_feuillet",
      "leg.mus.violon_de_maitre_cremonais_1715",
    ]);
  });

  it("rend une liste vide sans achat légendaire", () => {
    expect(legendairesAcquis(createMockGameState(), reso, 1)).toEqual([]);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/objectifs.test.ts`
Expected: FAIL — `legendairesAcquis is not a function`, et une erreur de type sur `"objetLegendaire"` qui n'appartient pas à `ObjectifMission`.

- [ ] **Step 3 : Ajouter le membre d'union**

Dans `src/types/game.ts`, juste après la ligne `| { type: "objetsRares"; nombre: number }` :

```ts
  /** « Mets la main sur une pièce légendaire » (SP5 quotidiennes variées).
   *  Membre distinct plutôt qu'un paramètre de rareté greffé sur `objetsRares` :
   *  aucun objectif déjà sauvegardé ne change de forme, donc pas de migration. */
  | { type: "objetLegendaire"; nombre: number }
```

- [ ] **Step 4 : Écrire le helper et le cas de mesure**

Dans `src/lib/quetes/objectifs.ts`, ajouter l'import du type `ObjetTemplate` :

```ts
import { getTemplate, type ObjetTemplate } from "@/data/objetTemplates";
```

(l'import de `getTemplate` existe déjà — le compléter, ne pas en ajouter un second.)

Puis, juste après la fonction privée `sessionsChinageComptees`, ajouter :

```ts
/**
 * Templates LÉGENDAIRES acquis après l'acceptation de la mission, triés du
 * plus cher au moins cher. Exportée parce que deux consommateurs en ont
 * besoin et doivent voir exactement la même liste : la mesure de l'objectif
 * `objetLegendaire` (sa longueur) et la prime variable de `lib/recompenses`
 * (son premier élément, cf. « c'est la plus chère qui compte »).
 */
export function legendairesAcquis(
  state: Pick<GameState, "historique">,
  reso: Pick<MissionResolution, "timestampAcceptation">,
  jourRecu: number,
): ObjetTemplate[] {
  return sessionsChinageComptees(state, reso, jourRecu)
    .flatMap((s) => s.achats)
    .map((a) => getTemplate(a.templateId))
    .filter((t): t is ObjetTemplate => !!t && t.rarete === "legendaire")
    .sort((a, b) => b.prixRefBase - a.prixRefBase);
}
```

Dans le `switch` de `progressionObjectif`, juste après le bloc `case "objetsRares"` :

```ts
    case "objetLegendaire": {
      const n = legendairesAcquis(state, reso, jourRecu).length;
      return { actuel: n, cible: obj.nombre, atteint: n >= obj.nombre };
    }
```

- [ ] **Step 5 : Lancer les tests**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/objectifs.test.ts`
Expected: PASS

- [ ] **Step 6 : Vérifier ce que le nouveau membre casse ailleurs**

Run: `npx tsc --noEmit`
Expected: des erreurs d'exhaustivité dans `src/components/mobile/qg/carnet/objectifs.ts` (le `switch` de `libelleObjectif` ne couvre pas `objetLegendaire`). **C'est voulu** — la tâche 2 les résout. Noter la liste exacte des fichiers signalés ; si un fichier autre que `carnet/objectifs.ts` apparaît, l'ajouter au périmètre de la tâche 2.

- [ ] **Step 7 : Commit**

```bash
git add src/types/game.ts src/lib/quetes/objectifs.ts src/lib/quetes/objectifs.test.ts
git commit -m "feat(quetes): un objectif sait compter les pièces légendaires"
```

---

### Task 2 : Les deux formes au catalogue, leurs icônes et leurs libellés

**Files:**
- Modify: `src/lib/quetes/formes.ts:5-70` (`FormeQuete`, `FAMILLE`, `ICONE_FORME`, `formeDepuisObjectif`)
- Modify: `src/components/mobile/qg/carnet/objectifs.ts:16-72` (`libelleObjectif`, commentaire d'`objectifEnEuros`, `ICONES_LUCIDE`)
- Modify: `src/lib/i18n/ui/fr.ts:693-702`, `en.ts`, `es.ts`, `el.ts` (bloc `carnet.objectifs`)
- Test: `src/lib/quetes/formes.test.ts`

**Interfaces:**
- Consumes: le membre `objetLegendaire` d'`ObjectifMission` (tâche 1).
- Produces: `FormeQuete` élargi à `"objetLegendaire" | "restauration"` ; `FAMILLE: Record<FormeQuete, "chine" | "vente" | "atelier">` ; `ICONE_FORME` renseigné pour les deux nouvelles formes ; `formeDepuisObjectif` qui rend `"restauration"` et `"objetLegendaire"` au lieu de `null`.

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à `src/lib/quetes/formes.test.ts` :

```ts
describe("catalogue élargi", () => {
  test("les deux nouvelles formes ont une famille et une icône", () => {
    expect(FAMILLE.objetLegendaire).toBe("chine");
    expect(FAMILLE.restauration).toBe("atelier");
    expect(ICONE_FORME.objetLegendaire).toBe("Crown");
    expect(ICONE_FORME.restauration).toBe("Hammer");
  });

  test("formeDepuisObjectif reconnaît les deux nouveaux types", () => {
    expect(formeDepuisObjectif("objetLegendaire")).toBe("objetLegendaire");
    expect(formeDepuisObjectif("restauration")).toBe("restauration");
  });

  test("les formes hebdomadaires restent les six d'origine", () => {
    expect(FORMES_HEBDOMADAIRES).toEqual([
      "objet", "objetsRares", "beneficeCumule",
      "chiffreAffaires", "profitVente", "ventesCategorie",
    ]);
  });
});
```

Compléter l'import en tête de fichier : `FAMILLE`, `ICONE_FORME`, `formeDepuisObjectif`, `FORMES_HEBDOMADAIRES` depuis `"./formes"`.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/formes.test.ts`
Expected: FAIL — `FAMILLE.objetLegendaire` est `undefined`.

- [ ] **Step 3 : Élargir le catalogue**

Dans `src/lib/quetes/formes.ts` :

```ts
/** Les formes qu'une quête périodique peut prendre. */
export type FormeQuete =
  | "objet"
  | "objetsRares"
  | "objetLegendaire"
  | "restauration"
  | "beneficeCumule"
  | "chiffreAffaires"
  | "profitVente"
  | "ventesCategorie";

/**
 * Famille d'une forme. Sert au garde-fou du lot hebdomadaire (sans au moins
 * une forme « vente », la semaine ne serait qu'une série de quotidiennes en
 * plus lent) ET à celui du lot quotidien (au plus UNE forme « vente » parmi
 * les deux tirées, sans quoi la journée cesserait d'être tournée vers la
 * chine).
 */
export const FAMILLE: Record<FormeQuete, "chine" | "vente" | "atelier"> = {
  objet: "chine",
  objetsRares: "chine",
  objetLegendaire: "chine",
  restauration: "atelier",
  beneficeCumule: "vente",
  chiffreAffaires: "vente",
  profitVente: "vente",
  ventesCategorie: "vente",
};
```

Dans `ICONE_FORME`, ajouter les deux entrées (garder les commentaires existants) :

```ts
  // La couronne dit « pièce d'exception » sans redire « rare » : `Gem` est
  // déjà pris par objetsRares, et les deux lignes peuvent coexister le même jour.
  objetLegendaire: "Crown",
  restauration: "Hammer",
```

Remplacer le corps de `formeDepuisObjectif` et son commentaire de tête :

```ts
/**
 * Déduit la forme (au sens `ICONE_FORME`) depuis le type d'un objectif de
 * mission. Partagée par les deux cartes du carnet (chapitre courant, ligne
 * périodique) — c'est la même question des deux côtés : quelle icône
 * générique représente ce type d'objectif chiffré ? Les types hors périmètre
 * périodique (`valeurCollection`, `niveau`) n'ont pas de forme — `null`,
 * cadre vide plutôt qu'une exception : un chapitre peut porter un de ces
 * types, l'affichage ne doit pas se briser pour autant.
 */
export function formeDepuisObjectif(type: ObjectifMission["type"]): FormeQuete | null {
  switch (type) {
    case "objetsRares":
      return "objetsRares";
    case "objetLegendaire":
      return "objetLegendaire";
    case "restauration":
      return "restauration";
    case "beneficeCumule":
      return "beneficeCumule";
    case "ventesCumulees":
      return "chiffreAffaires";
    case "profitVente":
      return "profitVente";
    case "ventesCategorie":
      return "ventesCategorie";
    default:
      return null;
  }
}
```

`FORMES_HEBDOMADAIRES` reste **inchangé** (les six d'origine), et son commentaire devient :

```ts
/** Formes éligibles au tirage hebdomadaire. Volontairement PAS élargi aux
 *  deux formes quotidiennes neuves — cf. « Hors périmètre » de la spec. */
```

- [ ] **Step 4 : Le carnet — icônes et libellé**

Dans `src/components/mobile/qg/carnet/objectifs.ts` :

Compléter l'import lucide de la ligne d'import existante avec `Crown` et `Hammer`, puis :

```ts
const ICONES_LUCIDE: Record<string, LucideIcon> = {
  Gem, TrendingUp, Coins, Package, Receipt, Crown, Hammer,
};
```

Dans `libelleObjectif`, ajouter juste après le `case "objetsRares"` :

```ts
    case "objetLegendaire":
      return d.carnet.objectifs.objetLegendaire;
```

Dans le commentaire d'`objectifEnEuros`, remplacer « les 9 membres » par « les 10 membres » et ajouter la ligne d'énumération, après celle d'`objetsRares` :

```
 *   - objetLegendaire    → false (compte des objets)
```

Le corps d'`objectifEnEuros` ne change **pas** : `objetLegendaire` ne se compte pas en euros, et la liste est explicitement positive.

- [ ] **Step 5 : Les quatre dictionnaires**

Dans le bloc `carnet.objectifs` de chaque fichier, ajouter la clé après `objetsRares` :

- `src/lib/i18n/ui/fr.ts` : `objetLegendaire: "Pièce légendaire trouvée",`
- `src/lib/i18n/ui/en.ts` : `objetLegendaire: "Legendary find",`
- `src/lib/i18n/ui/es.ts` : `objetLegendaire: "Pieza legendaria encontrada",`
- `src/lib/i18n/ui/el.ts` : `objetLegendaire: "Θρυλικό εύρημα",`

- [ ] **Step 6 : Lancer les tests et le typage**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/formes.test.ts && npx tsc --noEmit`
Expected: PASS, et `tsc` sans erreur (les erreurs d'exhaustivité relevées en tâche 1 step 6 doivent avoir disparu).

- [ ] **Step 7 : Commit**

```bash
git add src/lib/quetes/formes.ts src/lib/quetes/formes.test.ts src/components/mobile/qg/carnet/objectifs.ts src/lib/i18n/ui
git commit -m "feat(quetes): le catalogue accueille la pièce légendaire et l'établi"
```

---

### Task 3 : Les verrous d'accès

**Files:**
- Create: `src/lib/quetes/eligibilite.ts`
- Test: `src/lib/quetes/eligibilite.test.ts`

**Interfaces:**
- Consumes: `FormeQuete` et `FAMILLE` (tâche 2) ; `calculerBrocantesDebloqueesParTier` de `@/lib/deblocage` ; `ID_GRANDE_BRADERIE` de `@/lib/evenements` ; `aCompetenceReparation` de `@/lib/competences`.
- Produces: `brocanteTier4Debloquee(state: GameState): boolean` et `formeEligible(forme: FormeQuete, state: GameState): boolean`.

**Pourquoi un fichier à part :** `formes.ts` est le catalogue — une table de données. Y importer `deblocage`, `evenements` et `competences` en ferait un carrefour de dépendances alors que sa seule responsabilité est de décrire les formes.

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `src/lib/quetes/eligibilite.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { brocanteTier4Debloquee, formeEligible } from "./eligibilite";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { calculerBrocantesDebloqueesParTier } from "@/lib/deblocage";
import { ID_GRANDE_BRADERIE, prochaineBraderie } from "@/lib/evenements";
import { CATEGORIES } from "@/data/categories";
import { catTreeId } from "@/lib/competences";
import type { CompetenceId } from "@/types/game";

describe("brocanteTier4Debloquee", () => {
  it("est faux sur une partie neuve", () => {
    expect(brocanteTier4Debloquee(createMockGameState())).toBe(false);
  });

  it("la Grande Braderie ouverte ne débloque PAS le tier 4", () => {
    // La braderie s'ouvre sur `estJourBraderie(jourActuel)` : sur une partie
    // neuve elle est FERMÉE, et un test posé là n'exercerait pas l'exclusion
    // qu'il prétend couvrir. On se cale donc sur son jour.
    const state = createMockGameState({ jourActuel: prochaineBraderie(1) });
    const tier4 = calculerBrocantesDebloqueesParTier(state).get(4) ?? new Set<string>();
    // Le test n'a de sens que si la braderie est ouverte ce jour-là ET seule.
    expect([...tier4]).toEqual([ID_GRANDE_BRADERIE]);
    expect(brocanteTier4Debloquee(state)).toBe(false);
  });
});

describe("formeEligible", () => {
  it("une forme sans verrou est toujours éligible", () => {
    const state = createMockGameState();
    for (const f of ["objet", "objetsRares", "beneficeCumule", "chiffreAffaires", "profitVente", "ventesCategorie"] as const) {
      expect(formeEligible(f, state)).toBe(true);
    }
  });

  it("la restauration attend la première compétence Réparer", () => {
    expect(formeEligible("restauration", createMockGameState())).toBe(false);
    const state = createMockGameState({
      competencesDebloquees: [`${catTreeId(CATEGORIES[0])}.reparer.1`] as CompetenceId[],
    });
    expect(formeEligible("restauration", state)).toBe(true);
  });

  it("la pièce légendaire attend une brocante tier 4", () => {
    expect(formeEligible("objetLegendaire", createMockGameState())).toBe(false);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/eligibilite.test.ts`
Expected: FAIL — module `./eligibilite` introuvable.

- [ ] **Step 3 : Écrire le module**

Créer `src/lib/quetes/eligibilite.ts` :

```ts
import { calculerBrocantesDebloqueesParTier } from "@/lib/deblocage";
import { ID_GRANDE_BRADERIE } from "@/lib/evenements";
import { aCompetenceReparation } from "@/lib/competences";
import type { GameState } from "@/types/game";
import type { FormeQuete } from "./formes";

/**
 * Une brocante de tier 4 est-elle ouverte au joueur ?
 *
 * La Grande Braderie est de tier 4 mais n'ouvre que deux jours par an : la
 * compter débloquerait à vie une forme de quête sur un événement de 48 h.
 * `objetsAtteignables` l'écarte déjà pour la même raison.
 */
export function brocanteTier4Debloquee(state: GameState): boolean {
  const tier4 = calculerBrocantesDebloqueesParTier(state).get(4);
  if (!tier4) return false;
  for (const id of tier4) if (id !== ID_GRANDE_BRADERIE) return true;
  return false;
}

/**
 * Verrou d'accès par forme, lu au moment où le lot naît. Une forme absente de
 * cette table est toujours éligible — toute forme future déclare sa condition
 * ICI, et le tirage n'a jamais à connaître une règle métier.
 */
const ELIGIBILITE: Partial<Record<FormeQuete, (s: GameState) => boolean>> = {
  objetLegendaire: brocanteTier4Debloquee,
  restauration: aCompetenceReparation,
};

/** La forme peut-elle être tirée dans l'état courant ? */
export function formeEligible(forme: FormeQuete, state: GameState): boolean {
  const test = ELIGIBILITE[forme];
  return test ? test(state) : true;
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/eligibilite.test.ts`
Expected: PASS

- [ ] **Step 5 : Commit**

```bash
git add src/lib/quetes/eligibilite.ts src/lib/quetes/eligibilite.test.ts
git commit -m "feat(quetes): chaque forme déclare sa condition d'accès"
```

---

### Task 4 : Le barème quotidien

**Files:**
- Modify: `src/lib/quetes/echelle.ts` (interface `CiblesNiveau` et les 5 paliers)
- Test: `src/lib/quetes/echelle.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `CiblesNiveau` gagne `chiffreAffairesJour: number`, `beneficeJour: number`, `profitVenteJour: number`, `ventesCategorieJour: number`, `restaurationEtatMin: EtatObjet`. Lus par `contenuFormeChiffree` (tâche 5).

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à `src/lib/quetes/echelle.test.ts` :

```ts
describe("barème quotidien", () => {
  const NIVEAUX = [0, 10, 20, 40, 70];

  test("chaque cible quotidienne chiffrée croît d'un palier au suivant", () => {
    for (const champ of ["chiffreAffairesJour", "beneficeJour", "profitVenteJour"] as const) {
      for (let i = 1; i < NIVEAUX.length; i++) {
        const avant = ciblesPourNiveau(NIVEAUX[i - 1])[champ];
        const apres = ciblesPourNiveau(NIVEAUX[i])[champ];
        expect(apres, `${champ} au niveau ${NIVEAUX[i]}`).toBeGreaterThan(avant);
      }
    }
  });

  test("les ventes par catégorie ne décroissent jamais", () => {
    for (let i = 1; i < NIVEAUX.length; i++) {
      expect(ciblesPourNiveau(NIVEAUX[i]).ventesCategorieJour).toBeGreaterThanOrEqual(
        ciblesPourNiveau(NIVEAUX[i - 1]).ventesCategorieJour,
      );
    }
  });

  test("la cible quotidienne reste sous la cible hebdomadaire correspondante", () => {
    for (const n of NIVEAUX) {
      const c = ciblesPourNiveau(n);
      expect(c.chiffreAffairesJour).toBeLessThan(c.chiffreAffairesSemaine);
      expect(c.beneficeJour).toBeLessThan(c.beneficeSemaine);
      expect(c.profitVenteJour).toBeLessThan(c.profitVenteUnique);
      expect(c.ventesCategorieJour).toBeLessThanOrEqual(c.ventesCategorie);
    }
  });

  test("la restauration quotidienne ne demande JAMAIS Pristin état", () => {
    // 4 h de temps réel, et il faut déjà posséder une pièce en Très bon :
    // infaisable dans la fenêtre d'une journée.
    for (const n of NIVEAUX) {
      expect(ciblesPourNiveau(n).restaurationEtatMin).not.toBe("Pristin état");
    }
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/echelle.test.ts`
Expected: FAIL — les nouveaux champs sont `undefined`.

- [ ] **Step 3 : Élargir `CiblesNiveau`**

Dans `src/lib/quetes/echelle.ts`, ajouter l'import de type :

```ts
import type { EtatObjet } from "@/types/game";
```

et, dans l'interface, après `ventesCategorie` :

```ts
  /** « Encaisse X € » — version quotidienne (quart de la cible hebdomadaire). */
  chiffreAffairesJour: number;
  /** « Réalise X € de bénéfice » — version quotidienne (quart de l'hebdo). */
  beneficeJour: number;
  /**
   * « Fais X € de marge sur une seule vente » — version quotidienne.
   * MOITIÉ de l'hebdomadaire, pas le quart : une vente reste une vente, elle
   * ne s'étale pas sur la semaine. Au quart, l'objectif serait trivial.
   */
  profitVenteJour: number;
  /** « Vends X objets de catégorie Y » — version quotidienne. */
  ventesCategorieJour: number;
  /**
   * État minimum d'une restauration quotidienne. Jamais `Pristin état` :
   * 4 h de temps RÉEL (cf. `DUREE_RESTAURATION_MS`) et il faut déjà posséder
   * une pièce en Très bon.
   */
  restaurationEtatMin: EtatObjet;
```

- [ ] **Step 4 : Renseigner les cinq paliers**

Remplacer le tableau `PALIERS` par (les valeurs hebdomadaires existantes sont **inchangées**) :

```ts
const PALIERS: { niveauMin: number; cibles: CiblesNiveau }[] = [
  {
    niveauMin: 0,
    cibles: { beneficeSemaine: 300, chiffreAffairesSemaine: 600, profitVenteUnique: 60, ventesCategorie: 3, objetsRaresQuotidien: 2, objetsRaresHebdo: 4, recompenseHebdo: 75, recompenseQuotidienne: 25, chiffreAffairesJour: 150, beneficeJour: 75, profitVenteJour: 30, ventesCategorieJour: 2, restaurationEtatMin: "Bon" },
  },
  {
    niveauMin: 10,
    cibles: { beneficeSemaine: 500, chiffreAffairesSemaine: 1000, profitVenteUnique: 100, ventesCategorie: 4, objetsRaresQuotidien: 2, objetsRaresHebdo: 5, recompenseHebdo: 125, recompenseQuotidienne: 40, chiffreAffairesJour: 250, beneficeJour: 125, profitVenteJour: 50, ventesCategorieJour: 2, restaurationEtatMin: "Bon" },
  },
  {
    niveauMin: 20,
    cibles: { beneficeSemaine: 850, chiffreAffairesSemaine: 1700, profitVenteUnique: 170, ventesCategorie: 5, objetsRaresQuotidien: 3, objetsRaresHebdo: 6, recompenseHebdo: 210, recompenseQuotidienne: 70, chiffreAffairesJour: 425, beneficeJour: 215, profitVenteJour: 85, ventesCategorieJour: 3, restaurationEtatMin: "Très bon" },
  },
  {
    niveauMin: 40,
    cibles: { beneficeSemaine: 1300, chiffreAffairesSemaine: 2600, profitVenteUnique: 260, ventesCategorie: 6, objetsRaresQuotidien: 3, objetsRaresHebdo: 7, recompenseHebdo: 325, recompenseQuotidienne: 110, chiffreAffairesJour: 650, beneficeJour: 325, profitVenteJour: 130, ventesCategorieJour: 3, restaurationEtatMin: "Très bon" },
  },
  {
    niveauMin: 70,
    cibles: { beneficeSemaine: 1800, chiffreAffairesSemaine: 3600, profitVenteUnique: 360, ventesCategorie: 8, objetsRaresQuotidien: 4, objetsRaresHebdo: 9, recompenseHebdo: 450, recompenseQuotidienne: 150, chiffreAffairesJour: 900, beneficeJour: 450, profitVenteJour: 180, ventesCategorieJour: 4, restaurationEtatMin: "Très bon" },
  },
];
```

Compléter le commentaire de tête du fichier avec :

```
 * Cibles QUOTIDIENNES : chiffre d'affaires et bénéfice au quart de la cible
 * hebdomadaire (pas au septième — l'hebdo doit rester confortable pour qui ne
 * joue pas tous les jours) ; marge sur une vente à la moitié (une vente reste
 * une vente). Le palier 0 (niveaux 3 à 9) n'a PAS été mesuré : si la recette
 * le trouve trop dur, diviser par 5 plutôt que par 4 sur ce seul palier.
```

- [ ] **Step 5 : Lancer les tests**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/echelle.test.ts`
Expected: PASS

- [ ] **Step 6 : Commit**

```bash
git add src/lib/quetes/echelle.ts src/lib/quetes/echelle.test.ts
git commit -m "feat(quetes): un barème pour la journée, distinct de celui de la semaine"
```

---

### Task 5 : `contenuFormeChiffree` sait fabriquer les sept formes

**Files:**
- Modify: `src/lib/quetes/formes.ts:95-160` (`ParamsGabarit`, `ContenuForme`, `contenuFormeChiffree`)
- Modify: `src/lib/recompenses.ts` (deux constantes)
- Modify: `src/lib/quetes/periodiques.ts:126-190` (`genererUneChiffree` : jetons et prime)
- Test: `src/lib/quetes/formes.test.ts`

**Interfaces:**
- Consumes: `CiblesNiveau` élargi (tâche 4) ; `FormeQuete` élargi (tâche 2).
- Produces: `ContenuForme` gagne `jetons?: number` et `primeVariable?: PrimeVariable` ; `ParamsGabarit` gagne `etatMin?: EtatObjet` ; les clés de gabarit `"beneficeJour"`, `"chiffreJour"`, `"margeJour"`, `"categorieJour"`, `"restauration"`, `"legendaire"` (consommées en tâches 7 et 8) ; les constantes `TAUX_PRIME_LEGENDAIRE` et `JETONS_LEGENDAIRE`.

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à `src/lib/quetes/formes.test.ts` :

```ts
describe("contenuFormeChiffree — versions quotidiennes", () => {
  const rng = () => 0.5;
  const cats = ["Maison"] as const;

  test("les formes d'argent lisent le barème du jour et changent de gabarit", () => {
    const c = ciblesPourNiveau(20);
    const cas = [
      ["beneficeCumule", "beneficeJour", "benefice", c.beneficeJour, c.beneficeSemaine],
      ["chiffreAffaires", "chiffreJour", "chiffre", c.chiffreAffairesJour, c.chiffreAffairesSemaine],
      ["profitVente", "margeJour", "marge", c.profitVenteJour, c.profitVenteUnique],
    ] as const;
    for (const [forme, cleJour, cleSemaine, montantJour, montantSemaine] of cas) {
      const q = contenuFormeChiffree(forme, "quotidienne", 20, [...cats], rng);
      const h = contenuFormeChiffree(forme, "hebdomadaire", 20, [...cats], rng);
      expect(q?.gabaritCle).toBe(cleJour);
      expect(h?.gabaritCle).toBe(cleSemaine);
      expect(q?.gabaritParams.montant).toBe(montantJour);
      expect(h?.gabaritParams.montant).toBe(montantSemaine);
    }
  });

  test("ventesCategorie : moins d'objets au quotidien, gabarit dédié", () => {
    const c = ciblesPourNiveau(20);
    const q = contenuFormeChiffree("ventesCategorie", "quotidienne", 20, [...cats], rng);
    expect(q?.gabaritCle).toBe("categorieJour");
    expect(q?.gabaritParams.nombre).toBe(c.ventesCategorieJour);
    const h = contenuFormeChiffree("ventesCategorie", "hebdomadaire", 20, [...cats], rng);
    expect(h?.gabaritCle).toBe("categorie");
    expect(h?.gabaritParams.nombre).toBe(c.ventesCategorie);
  });

  test("restauration : l'état minimum vient du palier et voyage en paramètre", () => {
    const q = contenuFormeChiffree("restauration", "quotidienne", 20, [...cats], rng);
    expect(q?.objectifs).toEqual([{ type: "restauration", etatMin: "Très bon" }]);
    expect(q?.gabaritCle).toBe("restauration");
    expect(q?.gabaritParams.etatMin).toBe("Très bon");
  });

  test("objetLegendaire : une pièce, 3 jetons, prime en pourcentage", () => {
    const q = contenuFormeChiffree("objetLegendaire", "quotidienne", 40, [...cats], rng);
    expect(q?.objectifs).toEqual([{ type: "objetLegendaire", nombre: 1 }]);
    expect(q?.gabaritCle).toBe("legendaire");
    expect(q?.jetons).toBe(JETONS_LEGENDAIRE);
    expect(q?.primeVariable).toEqual({
      type: "pourcentageLegendaire",
      taux: TAUX_PRIME_LEGENDAIRE,
    });
    // La part FIXE reste celle d'une quotidienne ordinaire — c'est la décision
    // de design : la prime ne remplace pas le tarif, elle s'y ajoute.
    expect(q?.recompenseArgent).toBe(ciblesPourNiveau(40).recompenseQuotidienne);
  });

  test("objetsRares reste inchangé sur les deux périodes", () => {
    const c = ciblesPourNiveau(20);
    expect(contenuFormeChiffree("objetsRares", "quotidienne", 20, [...cats], rng)?.gabaritParams.nombre)
      .toBe(c.objetsRaresQuotidien);
    expect(contenuFormeChiffree("objetsRares", "hebdomadaire", 20, [...cats], rng)?.gabaritParams.nombre)
      .toBe(c.objetsRaresHebdo);
  });
});
```

Compléter les imports du fichier de test : `contenuFormeChiffree` depuis `"./formes"`, `ciblesPourNiveau` depuis `"./echelle"`, `JETONS_LEGENDAIRE` et `TAUX_PRIME_LEGENDAIRE` depuis `"@/lib/recompenses"`.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/formes.test.ts`
Expected: FAIL — `TAUX_PRIME_LEGENDAIRE` n'est pas exporté.

- [ ] **Step 3 : Les deux constantes et le type de prime**

Dans `src/types/game.ts`, juste avant `CourrierPayloadMission` :

```ts
/**
 * Prime dont le MONTANT n'est connu qu'à la livraison : il dépend de ce que le
 * joueur a trouvé, pas de ce que la quête valait à sa naissance. Résolue par
 * `recompenseEffective` quand un contexte lui est fourni.
 */
export type PrimeVariable = { type: "pourcentageLegendaire"; taux: number };
```

et, dans `CourrierPayloadMission`, ajouter le champ optionnel :

```ts
  /** Prime résolue à la livraison. ADDITIF : absent ⇒ récompense figée. */
  primeVariable?: PrimeVariable;
```

Dans `src/lib/recompenses.ts`, à côté de `JETONS_QUOTIDIENNE` / `JETONS_HEBDO` :

```ts
/**
 * Prime de la quête « pièce légendaire », en fraction du `prixRefBase` de la
 * pièce trouvée. Le pourcentage porte sur la valeur de MARCHÉ et non sur le
 * prix payé au vendeur : sur le prix payé, mal négocier rapporterait plus.
 */
export const TAUX_PRIME_LEGENDAIRE = 0.2;

/** Jetons Bazar d'une quête « pièce légendaire » (au lieu de JETONS_QUOTIDIENNE). */
export const JETONS_LEGENDAIRE = 3;
```

Dans `src/lib/courrier.ts`, `creerCourrierMission` : ajouter `primeVariable?: PrimeVariable;` à l'objet `args` et la ligne de recopie conditionnelle dans `payload`, à la suite des autres :

```ts
    ...(args.primeVariable !== undefined ? { primeVariable: args.primeVariable } : {}),
```

- [ ] **Step 4 : Élargir `ParamsGabarit` et `ContenuForme`**

Dans `src/lib/quetes/formes.ts` :

```ts
/** Paramètres interpolés dans le texte de la quête. */
export interface ParamsGabarit {
  nombre?: number;
  montant?: number;
  categorie?: CategorieObjet;
  /** État minimum, pour la marque `{etat}` (forme `restauration`). */
  etatMin?: EtatObjet;
}

/** Contenu d'une forme SANS objet nommé. */
export interface ContenuForme {
  objectifs: ObjectifMission[];
  recompenseArgent: number;
  /** Famille de gabarit de texte (cf. quetes/textes.ts). */
  gabaritCle: string;
  gabaritParams: ParamsGabarit;
  /** Jetons Bazar, si la forme déroge au tarif de sa période. */
  jetons?: number;
  /** Prime résolue à la livraison (cf. lib/recompenses). */
  primeVariable?: PrimeVariable;
}
```

Ajouter aux imports de type : `EtatObjet`, `PrimeVariable` depuis `@/types/game`, et `JETONS_LEGENDAIRE`, `TAUX_PRIME_LEGENDAIRE` depuis `@/lib/recompenses`.

- [ ] **Step 5 : Réécrire le `switch` de `contenuFormeChiffree`**

Remplacer le corps du `switch` (le préambule `const c = ciblesPourNiveau(niveau)` et `recompenseArgent` ne changent pas) :

```ts
  const jour = periode === "quotidienne";

  switch (forme) {
    case "objetsRares": {
      const nombre = jour ? c.objetsRaresQuotidien : c.objetsRaresHebdo;
      return {
        objectifs: [{ type: "objetsRares", nombre }],
        recompenseArgent,
        gabaritCle: "rares",
        gabaritParams: { nombre },
      };
    }
    case "objetLegendaire":
      // Une seule pièce suffit : à 0,8 % par objet tiré au tier 4, en demander
      // deux reviendrait à écrire une quête qu'on ne réussit jamais.
      return {
        objectifs: [{ type: "objetLegendaire", nombre: 1 }],
        recompenseArgent,
        gabaritCle: "legendaire",
        gabaritParams: {},
        jetons: JETONS_LEGENDAIRE,
        primeVariable: { type: "pourcentageLegendaire", taux: TAUX_PRIME_LEGENDAIRE },
      };
    case "restauration": {
      const etatMin = c.restaurationEtatMin;
      return {
        objectifs: [{ type: "restauration", etatMin }],
        recompenseArgent,
        gabaritCle: "restauration",
        gabaritParams: { etatMin },
      };
    }
    case "beneficeCumule": {
      const montant = jour ? c.beneficeJour : c.beneficeSemaine;
      return {
        objectifs: [{ type: "beneficeCumule", montant }],
        recompenseArgent,
        gabaritCle: jour ? "beneficeJour" : "benefice",
        gabaritParams: { montant },
      };
    }
    case "chiffreAffaires": {
      const montant = jour ? c.chiffreAffairesJour : c.chiffreAffairesSemaine;
      return {
        objectifs: [{ type: "ventesCumulees", montant }],
        recompenseArgent,
        gabaritCle: jour ? "chiffreJour" : "chiffre",
        gabaritParams: { montant },
      };
    }
    case "profitVente": {
      const montant = jour ? c.profitVenteJour : c.profitVenteUnique;
      return {
        objectifs: [{ type: "profitVente", montant }],
        recompenseArgent,
        gabaritCle: jour ? "margeJour" : "marge",
        gabaritParams: { montant },
      };
    }
    case "ventesCategorie": {
      if (categoriesDisponibles.length === 0) return null;
      const categorie =
        categoriesDisponibles[Math.floor(rng() * categoriesDisponibles.length)];
      const nombre = jour ? c.ventesCategorieJour : c.ventesCategorie;
      return {
        objectifs: [{ type: "ventesCategorie", categorie, nombre }],
        recompenseArgent,
        gabaritCle: jour ? "categorieJour" : "categorie",
        gabaritParams: { nombre, categorie },
      };
    }
  }
```

- [ ] **Step 6 : `genererUneChiffree` honore jetons et prime**

Dans `src/lib/quetes/periodiques.ts`, dans `genererUneChiffree`, remplacer le bloc de construction du courrier :

```ts
  const jetons =
    contenu.jetons ?? (type === "quotidienne" ? JETONS_QUOTIDIENNE : JETONS_HEBDO);

  return {
    ...creerCourrierMission({
      id,
      jour: state.jourActuel,
      expediteurId: exp.id,
      titre: texte.titre,
      corps: texte.corps,
      categorie: type,
      cibles: [],
      recompense: { argent: contenu.recompenseArgent, jetons },
      objectifs: contenu.objectifs,
      gabaritId: texte.gabaritId,
      gabaritParams: contenu.gabaritParams,
      ...(contenu.primeVariable ? { primeVariable: contenu.primeVariable } : {}),
    }),
    lu: true,
  };
```

Et passer `contenu.gabaritParams` à `genererTexteChiffre` inchangé — la tâche 7 y ajoutera la prise en charge d'`etatMin`.

- [ ] **Step 7 : Lancer les tests et le typage**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes && npx tsc --noEmit`
Expected: PASS pour les nouveaux tests. **Le test « quotidienne : deux quêtes d'objet et une de rares » échoue encore** — normal, il est remplacé en tâche 6. Le noter et continuer.

- [ ] **Step 8 : Commit**

```bash
git add src/types/game.ts src/lib/courrier.ts src/lib/recompenses.ts src/lib/quetes/formes.ts src/lib/quetes/formes.test.ts src/lib/quetes/periodiques.ts
git commit -m "feat(quetes): sept formes chiffrées, deux barèmes, une prime variable"
```

---

### Task 6 : Le tirage quotidien

**Files:**
- Modify: `src/lib/quetes/periodiques.ts:85-115` (`formesDuLot`) et `:170-197` (`genererLot`)
- Test: `src/lib/quetes/periodiques.test.ts` (remplace le test de composition quotidienne)

**Interfaces:**
- Consumes: `formeEligible` (tâche 3) ; `FAMILLE` élargi (tâche 2) ; `contenuFormeChiffree` élargi (tâche 5).
- Produces: `genererLot(state, type, cle, rng)` — signature INCHANGÉE, comportement quotidien nouveau.

- [ ] **Step 1 : Remplacer le test verrou et ajouter les invariants**

Dans `src/lib/quetes/periodiques.test.ts`, d'abord **compléter le helper `formeDe`** (sinon les nouvelles formes seraient lues comme `"objet"` et les tests passeraient à tort) :

```ts
function formeDe(c: Courrier): FormeQuete {
  if (c.payload.type !== "mission") throw new Error("pas une mission");
  const o = c.payload.objectifs?.[0];
  switch (o?.type) {
    case "objetsRares": return "objetsRares";
    case "objetLegendaire": return "objetLegendaire";
    case "restauration": return "restauration";
    case "beneficeCumule": return "beneficeCumule";
    case "ventesCumulees": return "chiffreAffaires";
    case "profitVente": return "profitVente";
    case "ventesCategorie": return "ventesCategorie";
    default: return "objet";
  }
}
```

Puis **supprimer** le test `test("quotidienne : deux quêtes d'objet et une de rares", ...)` et le remplacer par :

```ts
  test("quotidienne : une seule quête d'objet, deux formes tirées distinctes", () => {
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "quotidienne", `c${g}`, rngGraine(g));
      expect(lot).toHaveLength(3);
      const formes = lot.map(formeDe);
      expect(formes.filter((f) => f === "objet")).toHaveLength(1);
      const tirees = formes.filter((f) => f !== "objet");
      expect(new Set(tirees).size).toBe(2);
    }
  });

  test("quotidienne : au plus UNE forme de vente parmi les tirées", () => {
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "quotidienne", `c${g}`, rngGraine(g));
      const tirees = lot.map(formeDe).filter((f) => f !== "objet");
      expect(tirees.filter((f) => FAMILLE[f] === "vente").length).toBeLessThanOrEqual(1);
    }
  });

  test("quotidienne : la position de la quête d'objet varie", () => {
    // L'invariant qui interdit le retour du lot scripté : avant ce chantier,
    // les deux quêtes d'objet occupaient TOUJOURS les slots 0 et 1.
    const positions = new Set<number>();
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "quotidienne", `c${g}`, rngGraine(g));
      positions.add(lot.findIndex((c) => formeDe(c) === "objet"));
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  test("quotidienne : la composition varie d'une graine à l'autre", () => {
    const vues = new Set<string>();
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "quotidienne", `c${g}`, rngGraine(g));
      vues.add(lot.map(formeDe).sort().join("|"));
    }
    expect(vues.size).toBeGreaterThan(3);
  });

  test("quotidienne : sans verrou ouvert, ni légendaire ni restauration", () => {
    // `createMockGameState()` = partie neuve : pas de tier 4, pas de Réparer.
    for (let g = 1; g <= 80; g++) {
      const lot = genererLot(createMockGameState(), "quotidienne", `c${g}`, rngGraine(g));
      const formes = lot.map(formeDe);
      expect(formes).not.toContain("objetLegendaire");
      expect(formes).not.toContain("restauration");
    }
  });

  test("quotidienne : Réparer débloqué fait apparaître la restauration", () => {
    const state = createMockGameState({
      competencesDebloquees: [`${catTreeId(CATEGORIES[0])}.reparer.1`] as CompetenceId[],
    });
    let vue = false;
    for (let g = 1; g <= 80 && !vue; g++) {
      vue = genererLot(state, "quotidienne", `c${g}`, rngGraine(g))
        .map(formeDe)
        .includes("restauration");
    }
    expect(vue).toBe(true);
  });
```

Compléter les imports du fichier de test : `CATEGORIES` depuis `@/data/categories`, `catTreeId` depuis `@/lib/competences`, `CompetenceId` depuis `@/types/game`.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/periodiques.test.ts`
Expected: FAIL — le lot contient encore deux quêtes d'objet.

- [ ] **Step 3 : Écrire le tirage**

Dans `src/lib/quetes/periodiques.ts`, ajouter aux imports :

```ts
import { formeEligible } from "./eligibilite";
```

Remplacer `formesDuLot` par :

```ts
/**
 * Pool de tirage QUOTIDIEN. `objet` en est absent volontairement : la quête
 * d'objet nommé est ajoutée à part, en un exemplaire garanti. L'inclure ici
 * autoriserait deux ou trois quêtes d'objet le même jour — moins varié
 * qu'avant ce chantier, ce qui serait un comble.
 */
const POOL_QUOTIDIEN: FormeQuete[] = [
  "objetsRares",
  "objetLegendaire",
  "restauration",
  "beneficeCumule",
  "chiffreAffaires",
  "profitVente",
  "ventesCategorie",
];

/**
 * Formes composant un lot.
 *
 * Quotidienne : UNE quête d'objet nommé garantie (photo, commanditaire, négo —
 * l'identité du jeu) plus deux formes distinctes tirées dans le pool éligible,
 * le tout mélangé pour que l'objet garanti ne soit pas éternellement en tête.
 * Garde-fou : au plus une forme de famille « vente » parmi les deux tirées —
 * quatre des sept formes du pool en sont, et sans lui une journée sur trois
 * environ ne serait qu'une paire d'objectifs de caisse.
 *
 * Hebdomadaire : trois formes distinctes parmi les six, avec au moins une forme
 * de vente — sans ce garde-fou, une semaine pourrait n'être qu'une série de
 * quotidiennes en plus lent.
 */
function formesDuLot(
  state: GameState,
  type: TypePeriodique,
  rng: () => number,
): FormeQuete[] {
  if (type === "quotidienne") {
    const pool = melanger(
      POOL_QUOTIDIEN.filter((f) => formeEligible(f, state)),
      rng,
    );
    const tirees: FormeQuete[] = [];
    for (const f of pool) {
      if (tirees.length === 2) break;
      if (FAMILLE[f] === "vente" && tirees.some((t) => FAMILLE[t] === "vente")) continue;
      tirees.push(f);
    }
    return melanger(["objet", ...tirees], rng);
  }

  const choisies = melanger(FORMES_HEBDOMADAIRES, rng).slice(0, 3);
  if (choisies.some((f) => FAMILLE[f] === "vente")) return choisies;

  // Branche actuellement INATTEIGNABLE (et volontairement conservée) : sur
  // les 6 formes hebdomadaires, seules 2 ("objet", "objetsRares") sont de
  // famille "chine" ; 3 tirages distincts contiennent donc TOUJOURS au moins
  // une forme de vente. Elle reste correcte en garde-fou pour un futur
  // catalogue hebdomadaire plus large.
  const ventes = melanger(
    FORMES_HEBDOMADAIRES.filter((f) => FAMILLE[f] === "vente" && !choisies.includes(f)),
    rng,
  );
  return [choisies[0], choisies[1], ventes[0]];
}
```

Dans `genererLot`, remplacer l'appel :

```ts
  const formes = formesDuLot(state, type, rng);
```

**Note :** le pool quotidien compte toujours au moins cinq formes éligibles (les quatre de vente plus `objetsRares`, qui n'ont aucun verrou), donc `tirees` atteint toujours 2. Aucun repli à écrire.

- [ ] **Step 4 : Lancer toute la suite des quêtes**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes`
Expected: PASS — y compris les tests hebdomadaires, qui ne doivent pas avoir bougé.

- [ ] **Step 5 : Vérifier le settle de bout en bout**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/settlePeriodiques.test.ts`
Expected: PASS. Si un test y attendait trois courriers avec des cibles, l'adapter comme les tests de `periodiques.test.ts` l'ont été : une quête chiffrée n'a pas de cible.

- [ ] **Step 6 : Commit**

```bash
git add src/lib/quetes/periodiques.ts src/lib/quetes/periodiques.test.ts src/lib/quetes/settlePeriodiques.test.ts
git commit -m "feat(quetes): le lot quotidien se tire au lieu d'être récité"
```

---

### Task 7 : Les douze gabarits FR

**Files:**
- Modify: `src/lib/quetes/textes.ts:13-15` (`GabaritQueteId`), `:52-77` (`CHIFFREES`), `:110-136` (`genererTexteChiffre`)
- Test: `src/lib/quetes/textes.test.ts`

**Interfaces:**
- Consumes: les clés de gabarit produites par `contenuFormeChiffree` (tâche 5).
- Produces: les familles `beneficeJour`, `chiffreJour`, `margeJour`, `categorieJour`, `restauration`, `legendaire`, à deux variantes chacune ; `genererTexteChiffre` interpole désormais `{etat}`.

**Le piège à connaître :** la marque `{etat}` est rendue par une mention entre parenthèses — `" (état min : Très bon)"` en FR, l'équivalent localisé ailleurs (`MISE_EN_FORME_GABARIT[locale].etat`). Les gabarits de restauration doivent donc être écrits pour **accueillir une parenthèse en fin de phrase**, jamais pour insérer l'état au milieu d'une tournure.

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à `src/lib/quetes/textes.test.ts` :

```ts
describe("gabarits quotidiens", () => {
  const NOUVELLES = ["beneficeJour", "chiffreJour", "margeJour", "categorieJour", "restauration", "legendaire"];

  test("chaque nouvelle famille a deux variantes", () => {
    for (const cle of NOUVELLES) {
      expect(nombreVariantesChiffrees(cle), cle).toBe(2);
    }
  });

  test("aucune famille du jour ne parle de la semaine", () => {
    // Seules `benefice` et `chiffre` nomment une période côté hebdomadaire
    // (« cette semaine », « avant dimanche ») ; `marge` et `categorie` n'en
    // ont jamais nommé, d'où l'asymétrie assumée des deux boucles.
    for (const cle of ["benefice", "chiffre"]) {
      const texte = gabaritsChiffres(cle).flatMap((g) => g.corps).join(" ");
      expect(texte, cle).toMatch(/semaine|dimanche/i);
    }
    for (const cle of ["beneficeJour", "chiffreJour", "margeJour", "categorieJour"]) {
      const texte = gabaritsChiffres(cle).flatMap((g) => g.corps).join(" ");
      expect(texte, cle).not.toMatch(/semaine|dimanche/i);
    }
  });

  test("la restauration interpole l'état minimum", () => {
    const t = genererTexteChiffre("restauration", { etatMin: "Très bon" }, () => 0);
    expect(t.corps.join(" ")).toContain("Très bon");
    expect(t.corps.join(" ")).not.toContain("{etat}");
    expect(t.gabaritId).toBe("restauration#0");
  });

  test("le légendaire ne porte aucune marque à interpoler", () => {
    const t = genererTexteChiffre("legendaire", {}, () => 0);
    expect(t.corps.join(" ")).not.toMatch(/\{[a-z]+\}/);
    expect(t.gabaritId).toBe("legendaire#0");
  });

  test("aucun titre de gabarit ne porte de marque", () => {
    for (const cle of NOUVELLES) {
      for (const g of gabaritsChiffres(cle)) {
        expect(g.titre, `${cle} : ${g.titre}`).not.toMatch(/\{[a-z]+\}/);
      }
    }
  });
});
```

Compléter les imports du fichier de test avec `gabaritsChiffres`, `nombreVariantesChiffrees` et `genererTexteChiffre` depuis `"./textes"`.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes/textes.test.ts`
Expected: FAIL — `nombreVariantesChiffrees("beneficeJour")` rend 2 par repli sur `benefice`, mais le test « ne parle plus du jour » échoue puisque le repli renvoie le texte hebdomadaire.

- [ ] **Step 3 : Élargir le type d'identifiant**

Dans `src/lib/quetes/textes.ts` :

```ts
export type GabaritQueteId =
  | `${"generique" | "jeux-video" | "set-designer" | "mode" | "art"}#${number}`
  | `${"rares" | "benefice" | "chiffre" | "marge" | "categorie"}#${number}`
  | `${"beneficeJour" | "chiffreJour" | "margeJour" | "categorieJour"}#${number}`
  | `${"restauration" | "legendaire"}#${number}`;
```

- [ ] **Step 4 : Écrire les six familles**

Dans l'objet `CHIFFREES`, à la suite des familles existantes (qui ne changent pas) :

```ts
  beneficeJour: [
    { titre: "La journée compte", corps: ["Salut,", "Pas de grands discours : {montant} de bénéfice avant ce soir. On verra bien ce que tu vaux."] },
    { titre: "Ce soir, on fait les comptes", corps: ["Bonjour,", "Dégage {montant} de bénéfice d'ici la fin de la journée et je t'inscris sur mon carnet."] },
  ],
  chiffreJour: [
    { titre: "Faire tourner, aujourd'hui", corps: ["Bonjour,", "Peu importe la marge : je veux du mouvement. {montant} encaissés avant la fermeture."] },
    { titre: "La caisse d'un seul jour", corps: ["Salut,", "Fais chanter ta caisse avant ce soir — {montant} encaissés, pas un centime de moins."] },
  ],
  margeJour: [
    { titre: "Le coup du jour", corps: ["Cher confrère,", "Une belle vente vaut dix médiocres. {montant} de marge sur un seul objet, et avant ce soir."] },
    { titre: "Une seule vente", corps: ["Bonjour,", "Je ne veux pas savoir combien tu vends aujourd'hui. Je veux {montant} de marge sur UNE vente."] },
  ],
  categorieJour: [
    { titre: "Le rayon du jour", corps: ["Bonjour,", "Aujourd'hui tu t'occupes du rayon {categorie}. Vends-m'en {nombre} et on en reparle."] },
    { titre: "Avant la fermeture", corps: ["Salut,", "{nombre} objets de la catégorie {categorie}, vendus avant ce soir. Simple, non ?"] },
  ],
  restauration: [
    { titre: "Rendre son éclat", corps: ["Bonjour,", "J'ai horreur du délabré. Prends une pièce, passe-la à l'établi et remets-la en état{etat}."] },
    { titre: "Un passage à l'établi", corps: ["Salut,", "Une pièce, un établi, un peu de patience. Restaure-moi ça{etat} et on est bons."] },
  ],
  legendaire: [
    { titre: "La pièce d'une vie", corps: ["Cher confrère,", "On ne croise ça qu'une ou deux fois dans une carrière. Si une pièce légendaire passe devant toi aujourd'hui, ne la laisse pas filer — je saurai me montrer reconnaissant."] },
    { titre: "Si elle sort, elle est à toi", corps: ["Bonjour,", "Il paraît qu'une pièce d'exception va sortir quelque part aujourd'hui. Mets la main dessus. Je paierai le prix de la chance."] },
  ],
```

- [ ] **Step 5 : Interpoler `{etat}` dans les formes chiffrées**

Dans `genererTexteChiffre`, élargir la signature et le `fill` :

```ts
export function genererTexteChiffre(
  gabaritCle: string,
  params: { nombre?: number; montant?: number; categorie?: string; etatMin?: EtatObjet },
  rng: () => number = Math.random,
): TexteGenere {
```

et, dans le corps de `fill`, ajouter une ligne AVANT les autres remplacements :

```ts
  const etat = params.etatMin ? ` (état min : ${params.etatMin})` : "";
  const fill = (s: string) =>
    s
      .replaceAll("{etat}", etat)
      .replaceAll("{nombre}", String(params.nombre ?? 0))
      .replaceAll("{montant}", montantFr(params.montant ?? 0))
      .replaceAll("{categorie}", params.categorie ?? "");
```

La mention FR est écrite **à l'identique de celle de `genererTexte`** (même parenthèse, même libellé) : les deux voies doivent produire la même phrase pour un même état, sinon le FR et les traductions divergeraient sur un détail invisible en test.

- [ ] **Step 6 : Lancer les tests**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7 : Commit**

```bash
git add src/lib/quetes/textes.ts src/lib/quetes/textes.test.ts
git commit -m "feat(quetes): douze lettres qui parlent de la journée, pas de la semaine"
```

---

### Task 8 : Les overlays EN, ES et EL

**Files:**
- Modify: `src/lib/i18n/contenu/en/quetesGabarits.ts`
- Modify: `src/lib/i18n/contenu/es/quetesGabarits.ts`
- Modify: `src/lib/i18n/contenu/el/quetesGabarits.ts`
- Test: `src/lib/i18n/contenu/quetesGabarits.test.ts`

**Interfaces:**
- Consumes: les six familles FR et leur nombre de variantes (tâche 7), lus par le test via `nombreVariantesChiffrees`.
- Produces: 36 entrées d'overlay ; le test de couverture élargi aux nouvelles familles.

**Règle de traduction en vigueur :** les familles chiffrées parlent avec la voix du même vieux marchand que le FR, **en plus sec**. Reformulation par ton, jamais calque mot à mot.

- [ ] **Step 1 : Élargir le test de couverture**

Dans `src/lib/i18n/contenu/quetesGabarits.test.ts` :

```ts
const FAMILLES_CHIFFREES = [
  "rares", "benefice", "chiffre", "marge", "categorie",
  "beneficeJour", "chiffreJour", "margeJour", "categorieJour",
  "restauration", "legendaire",
];
```

et, dans `MARQUES_PAR_FAMILLE`, ajouter :

```ts
  beneficeJour: ["{montant}"],
  chiffreJour: ["{montant}"],
  margeJour: ["{montant}"],
  categorieJour: ["{nombre}", "{categorie}"],
  restauration: ["{etat}"],
  legendaire: [],
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run --maxWorkers=4 src/lib/i18n/contenu/quetesGabarits.test.ts`
Expected: FAIL — `beneficeJour#0 manquant` pour les trois langues.

- [ ] **Step 3 : Overlay EN**

Ajouter à `QUETES_GABARITS_EN` :

```ts
  "beneficeJour#0": { titre: "Today's tally", corps: ["Hi,", "No speeches: {montant} in profit before tonight. Then we'll see what you're worth."] },
  "beneficeJour#1": { titre: "We settle up tonight", corps: ["Hello,", "Clear {montant} in profit by the end of the day and I'll put you in my book."] },
  "chiffreJour#0": { titre: "Keep it moving, today", corps: ["Hello,", "Margin doesn't interest me — movement does. {montant} taken before closing."] },
  "chiffreJour#1": { titre: "One day's takings", corps: ["Hi,", "Make that till sing before tonight — {montant} taken, not a penny less."] },
  "margeJour#0": { titre: "Today's coup", corps: ["Dear colleague,", "One fine sale beats ten middling ones. {montant} of margin on a single object, and before tonight."] },
  "margeJour#1": { titre: "One sale, that's all", corps: ["Hello,", "I don't care how much you sell today. I want {montant} of margin on ONE sale."] },
  "categorieJour#0": { titre: "Today's shelf", corps: ["Hello,", "Today you mind the {categorie} shelf. Sell me {nombre} of them and we'll talk."] },
  "categorieJour#1": { titre: "Before closing", corps: ["Hi,", "{nombre} pieces from the {categorie} shelf, sold before tonight. Simple enough?"] },
  "restauration#0": { titre: "Bring back the shine", corps: ["Hello,", "I can't stand a wreck. Take a piece, put it on the bench and bring it back to condition{etat}."] },
  "restauration#1": { titre: "A turn at the bench", corps: ["Hi,", "One piece, one bench, a little patience. Restore that for me{etat} and we're square."] },
  "legendaire#0": { titre: "The piece of a lifetime", corps: ["Dear colleague,", "You meet one of those once or twice in a career. If a legendary piece crosses your path today, don't let it go — I'll know how to show my gratitude."] },
  "legendaire#1": { titre: "If it surfaces, it's yours", corps: ["Hello,", "Word is an exceptional piece is surfacing somewhere today. Get your hands on it. I'll pay the price of luck."] },
```

- [ ] **Step 4 : Overlay ES**

Ajouter à `QUETES_GABARITS_ES` :

```ts
  "beneficeJour#0": { titre: "La cuenta del día", corps: ["Hola:", "Sin discursos: {montant} de beneficio antes de esta noche. Ya veremos lo que vales."] },
  "beneficeJour#1": { titre: "Esta noche echamos cuentas", corps: ["Buenas:", "Saca {montant} de beneficio antes de que acabe el día y te apunto en mi libreta."] },
  "chiffreJour#0": { titre: "Que se mueva, hoy", corps: ["Buenas:", "El margen me da igual: quiero movimiento. {montant} ingresados antes del cierre."] },
  "chiffreJour#1": { titre: "La caja de un solo día", corps: ["Hola:", "Haz cantar la caja antes de esta noche: {montant} ingresados, ni un céntimo menos."] },
  "margeJour#0": { titre: "El golpe del día", corps: ["Estimado colega:", "Una buena venta vale por diez mediocres. {montant} de margen en una sola pieza, y antes de esta noche."] },
  "margeJour#1": { titre: "Una sola venta", corps: ["Buenas:", "No me importa cuánto vendas hoy. Quiero {montant} de margen en UNA venta."] },
  "categorieJour#0": { titre: "La sección del día", corps: ["Buenas:", "Hoy te ocupas de la sección {categorie}. Véndeme {nombre} y hablamos."] },
  "categorieJour#1": { titre: "Antes del cierre", corps: ["Hola:", "{nombre} piezas de la sección {categorie}, vendidas antes de esta noche. ¿Fácil, no?"] },
  "restauration#0": { titre: "Devolverle el brillo", corps: ["Buenas:", "No soporto lo destartalado. Coge una pieza, pásala por el banco y devuélvemela en condiciones{etat}."] },
  "restauration#1": { titre: "Un paso por el banco", corps: ["Hola:", "Una pieza, un banco y algo de paciencia. Restáurame eso{etat} y en paz."] },
  "legendaire#0": { titre: "La pieza de una vida", corps: ["Estimado colega:", "Eso se cruza una o dos veces en toda una carrera. Si hoy pasa ante ti una pieza legendaria, no la dejes escapar: sabré ser agradecido."] },
  "legendaire#1": { titre: "Si aparece, es tuya", corps: ["Buenas:", "Dicen que hoy va a salir una pieza excepcional en alguna parte. Échale el guante. Pagaré el precio de la suerte."] },
```

- [ ] **Step 5 : Overlay EL**

Ajouter à `QUETES_GABARITS_EL` :

```ts
  "beneficeJour#0": { titre: "Ο λογαριασμός της ημέρας", corps: ["Γεια σου,", "Χωρίς πολλά λόγια: {montant} κέρδος πριν από το βράδυ. Εκεί θα φανεί τι αξίζεις."] },
  "beneficeJour#1": { titre: "Απόψε τα λέμε στα ίσια", corps: ["Καλησπέρα,", "Βγάλε {montant} κέρδος μέχρι το τέλος της ημέρας και σε γράφω στο τεφτέρι μου."] },
  "chiffreJour#0": { titre: "Να κινηθεί, σήμερα", corps: ["Καλησπέρα,", "Το περιθώριο δεν με αφορά — η κίνηση με αφορά. {montant} εισπράξεις πριν το κλείσιμο."] },
  "chiffreJour#1": { titre: "Το ταμείο μιας ημέρας", corps: ["Γεια σου,", "Κάνε το ταμείο να τραγουδήσει πριν απόψε — {montant} εισπράξεις, ούτε λεπτό λιγότερο."] },
  "margeJour#0": { titre: "Η μπάζα της ημέρας", corps: ["Αγαπητέ συνάδελφε,", "Μια καλή πώληση αξίζει όσο δέκα μέτριες. {montant} περιθώριο σε ένα μόνο αντικείμενο, και πριν απόψε."] },
  "margeJour#1": { titre: "Μία και μόνη πώληση", corps: ["Καλησπέρα,", "Δεν με νοιάζει πόσα θα πουλήσεις σήμερα. Θέλω {montant} περιθώριο σε ΜΙΑ πώληση."] },
  "categorieJour#0": { titre: "Ο πάγκος της ημέρας", corps: ["Καλησπέρα,", "Σήμερα αναλαμβάνεις τον πάγκο {categorie}. Πούλα μου {nombre} και τα ξαναλέμε."] },
  "categorieJour#1": { titre: "Πριν το κλείσιμο", corps: ["Γεια σου,", "{nombre} κομμάτια από την κατηγορία {categorie}, πουλημένα πριν απόψε. Απλό, έτσι;"] },
  "restauration#0": { titre: "Να ξαναλάμψει", corps: ["Καλησπέρα,", "Σιχαίνομαι τα ρημαγμένα. Πάρε ένα κομμάτι, βάλ' το στον πάγκο και φέρ' το μου σε κατάσταση{etat}."] },
  "restauration#1": { titre: "Ένα πέρασμα από τον πάγκο", corps: ["Γεια σου,", "Ένα κομμάτι, ένας πάγκος, λίγη υπομονή. Αποκατάστησέ μου το{etat} και είμαστε εντάξει."] },
  "legendaire#0": { titre: "Το κομμάτι μιας ζωής", corps: ["Αγαπητέ συνάδελφε,", "Τέτοιο συναντάς μία ή δύο φορές σε ολόκληρη καριέρα. Αν σήμερα περάσει μπροστά σου ένα θρυλικό κομμάτι, μην το αφήσεις να φύγει — θα ξέρω να σε ευγνωμονήσω."] },
  "legendaire#1": { titre: "Αν βγει, δικό σου", corps: ["Καλησπέρα,", "Λένε πως σήμερα βγαίνει κάπου ένα εξαιρετικό κομμάτι. Βάλε χέρι. Θα πληρώσω το τίμημα της τύχης."] },
```

⚠ **Le grec de ce projet n'a jamais été certifié par un locuteur.** Le signaler au moment de rendre la tâche : c'est une relecture à demander, pas un blocage.

- [ ] **Step 6 : Lancer le test**

Run: `npx vitest run --maxWorkers=4 src/lib/i18n/contenu/quetesGabarits.test.ts`
Expected: PASS

- [ ] **Step 7 : Commit**

```bash
git add src/lib/i18n/contenu
git commit -m "feat(i18n): les lettres du jour en anglais, espagnol et grec"
```

---

### Task 9 : La prime résolue à la livraison

**Files:**
- Modify: `src/lib/recompenses.ts:44-52` (`recompenseEffective`)
- Modify: `src/context/GameContext.tsx:2068`
- Modify: `src/components/mobile/qg/carnet/useCeremonieLivraison.ts:78`
- Test: `src/lib/recompenses.test.ts`

**Interfaces:**
- Consumes: `legendairesAcquis` (tâche 1) ; `PrimeVariable` et `payload.primeVariable` (tâche 5).
- Produces: `recompenseEffective(payload, ctx?)` où `ctx: { state, reso, jourRecu }`. **Sans `ctx`, le comportement est identique à aujourd'hui** — c'est ce qui laisse les quatre surfaces d'affichage inchangées.

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à `src/lib/recompenses.test.ts` :

```ts
describe("prime légendaire", () => {
  const payload = {
    type: "mission" as const, categorie: "quotidienne" as const,
    expediteurId: "art", titre: "t", corps: [], cibles: [],
    recompense: { argent: 110, jetons: 3 },
    objectifs: [{ type: "objetLegendaire" as const, nombre: 1 }],
    primeVariable: { type: "pourcentageLegendaire" as const, taux: 0.2 },
  };
  const reso = { courrierId: "x", statut: "active" as const, timestampAcceptation: 1000 };

  /** Copie conforme du helper de `src/lib/quetes/objectifs.test.ts`. */
  function chineSession(timestamp: number, templateIds: string[]): SessionChinage {
    return {
      id: `c${timestamp}`, type: "chinage", jour: 3, timestamp,
      brocanteId: "b1", brocanteNom: "B", xpGagne: {} as SessionChinage["xpGagne"],
      achats: templateIds.map((templateId) => ({
        templateId, nom: "X", categorie: "Musique" as const,
        etat: "Bon" as const, prixReferenceReel: 10, prixPaye: 5,
      })),
    };
  }

  function stateAvec(templateIds: string[]) {
    return createMockGameState({ historique: [chineSession(1500, templateIds)] });
  }

  it("sans contexte, rend exactement la récompense figée", () => {
    expect(recompenseEffective(payload).argent).toBe(110);
  });

  it("ajoute 20 % du prixRefBase de la pièce trouvée", () => {
    // leg.mus.violon_de_maitre_cremonais_1715 : prixRefBase 4500 → +900
    const state = stateAvec(["leg.mus.violon_de_maitre_cremonais_1715"]);
    expect(recompenseEffective(payload, { state, reso, jourRecu: 3 }).argent).toBe(110 + 900);
  });

  it("retient la pièce la PLUS CHÈRE quand il y en a plusieurs", () => {
    // gutenberg 6500 → +1300, violon 4500 → +900 : c'est 1300 qui compte.
    const state = stateAvec([
      "leg.mus.violon_de_maitre_cremonais_1715",
      "leg.lv.gutenberg_feuillet",
    ]);
    expect(recompenseEffective(payload, { state, reso, jourRecu: 3 }).argent).toBe(110 + 1300);
  });

  it("aucune pièce trouvée : pas de prime", () => {
    const state = stateAvec(["mus.test_pressing_des_trolling_sons"]);
    expect(recompenseEffective(payload, { state, reso, jourRecu: 3 }).argent).toBe(110);
  });

  it("un payload SANS primeVariable ignore le contexte", () => {
    const sansPrime = { ...payload, primeVariable: undefined };
    const state = stateAvec(["leg.lv.gutenberg_feuillet"]);
    expect(recompenseEffective(sansPrime, { state, reso, jourRecu: 3 }).argent).toBe(110);
  });
});
```

Compléter les imports du fichier de test : `createMockGameState` depuis `@/lib/__test-fixtures__/gameState`, et le type `SessionChinage` depuis `@/types/game`.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run --maxWorkers=4 src/lib/recompenses.test.ts`
Expected: FAIL — `recompenseEffective` n'accepte qu'un argument.

- [ ] **Step 3 : Implémenter la résolution**

Dans `src/lib/recompenses.ts`, ajouter les imports :

```ts
import { legendairesAcquis } from "@/lib/quetes/objectifs";
import type { GameState, MissionResolution } from "@/types/game";
```

puis :

```ts
/**
 * Contexte de résolution d'une prime variable. Optionnel partout : les
 * surfaces d'AFFICHAGE (carnet, sheet, carte d'histoire) appellent sans lui et
 * montrent la part fixe — la pièce n'est pas encore trouvée, il n'y a rien à
 * chiffrer. Seule la LIVRAISON le fournit.
 */
export interface ContextePrime {
  state: Pick<GameState, "historique">;
  reso: Pick<MissionResolution, "timestampAcceptation">;
  jourRecu: number;
}

/**
 * Part variable de la récompense : un pourcentage du `prixRefBase` de la pièce
 * légendaire trouvée, la plus chère si le joueur en a déniché plusieurs.
 */
function primeVariableArgent(
  payload: CourrierPayloadMission,
  ctx: ContextePrime,
): number {
  if (payload.primeVariable?.type !== "pourcentageLegendaire") return 0;
  const [meilleure] = legendairesAcquis(ctx.state, ctx.reso, ctx.jourRecu);
  if (!meilleure) return 0;
  return Math.round(meilleure.prixRefBase * payload.primeVariable.taux);
}
```

et élargir `recompenseEffective` (garder tout son commentaire de tête, y ajouter un paragraphe sur la prime) :

```ts
export function recompenseEffective(
  payload: CourrierPayloadMission,
  ctx?: ContextePrime,
): RecompenseEffective {
  return {
    argent: payload.recompense.argent + (ctx ? primeVariableArgent(payload, ctx) : 0),
    xp: payload.recompense.xp ?? 0,
    energie: payload.recompense.energie ?? 0,
    jetons: payload.recompense.jetons ?? 0,
  };
}
```

- [ ] **Step 4 : Brancher les deux appelants de livraison**

Dans `src/context/GameContext.tsx`, remplacer la ligne 2068 :

```ts
      const rEff = recompenseEffective(payloadMission, {
        state: current,
        reso: current.missions.find((m) => m.courrierId === courrierId) ?? {},
        jourRecu: courrier.jourRecu,
      });
```

**Attention :** vérifier le nom de la variable d'état en portée à cet endroit (`current` dans le pré-check). Si la résolution est introuvable, `{}` suffit — `timestampAcceptation` optionnel fait retomber `legendairesAcquis` sur le repli « à partir du jour de réception », le même que partout ailleurs.

Dans `src/components/mobile/qg/carnet/useCeremonieLivraison.ts`, remplacer la ligne 78 :

```ts
    const rEff = recompenseEffective(courrier.payload, {
      state,
      reso: state.missions.find((m) => m.courrierId === courrierId) ?? {},
      jourRecu: courrier.jourRecu,
    });
```

L'appel a lieu **avant** `onLivrerMission` : l'état porte encore l'historique de chinage, la pièce est donc visible. Ne pas le déplacer après.

`src/lib/quetes/principales.ts:109` reste **inchangé** : aucune quête de l'arc principal ne porte de `primeVariable`.

- [ ] **Step 5 : Lancer les tests et le typage**

Run: `npx vitest run --maxWorkers=4 src/lib/recompenses.test.ts && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6 : Vérifier la non-régression du versement**

Run: `npx vitest run --maxWorkers=4 src/lib/quetes src/context src/components/mobile/qg`
Expected: PASS — aucun test de cérémonie ni de grand livre ne doit bouger.

- [ ] **Step 7 : Commit**

```bash
git add src/lib/recompenses.ts src/lib/recompenses.test.ts src/context/GameContext.tsx src/components/mobile/qg/carnet/useCeremonieLivraison.ts
git commit -m "feat(quetes): la prime légendaire se chiffre au moment de la livraison"
```

---

### Task 10 : L'appât affiché dans le carnet

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts`, `el.ts` (bloc `carnet`)
- Modify: `src/components/mobile/qg/carnet/LigneQuete.tsx:231` et son rendu de récompense
- Modify: `src/components/mobile/qg/sheets/CourrierSheet.tsx:256-260`
- Test: `src/components/mobile/qg/carnet/LigneQuete.test.tsx`

**Interfaces:**
- Consumes: `payload.primeVariable` (tâche 5).
- Produces: rien de réutilisable — c'est la couche d'affichage.

**Le problème à résoudre :** tant que la pièce n'est pas trouvée, aucun total n'est calculable. La ligne montre donc la part fixe **plus une mention** de ce qui s'y ajoutera.

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `src/components/mobile/qg/carnet/LigneQuete.test.tsx`. Le fichier possède déjà `props`, `createMockGameState` et le motif `render(<LigneQuete {...props} courrier={c} state={…} />)` ; ajouter seulement le helper qui manque :

```ts
function courrierLegendaire(): Courrier {
  return {
    id: "q3", type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "quotidienne", expediteurId: "art",
      titre: "La pièce d'une vie", corps: ["Cher confrère,", "Ne la laisse pas filer."],
      cibles: [], objectifs: [{ type: "objetLegendaire", nombre: 1 }],
      recompense: { argent: 110, jetons: 3 },
      primeVariable: { type: "pourcentageLegendaire", taux: 0.2 },
    },
  };
}

it("annonce la prime variable d'une quête légendaire", () => {
  const c = courrierLegendaire();
  render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c] })} />);
  expect(screen.getByText(/20\s*%/)).toBeTruthy();
});

it("une quête chiffrée ordinaire n'annonce aucune prime", () => {
  const c = courrierChiffre({ type: "objetsRares", nombre: 2 });
  render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c] })} />);
  expect(screen.queryByText(/%/)).toBeNull();
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/qg/carnet/LigneQuete.test.tsx`
Expected: FAIL — aucun texte contenant « % ».

- [ ] **Step 3 : Les quatre libellés**

Dans le bloc `carnet` de chaque dictionnaire, ajouter :

- `fr.ts` : `primeVariableLegendaire: "+ {taux} % de la valeur de la pièce",`
- `en.ts` : `primeVariableLegendaire: "+ {taux}% of the piece's value",`
- `es.ts` : `primeVariableLegendaire: "+ {taux} % del valor de la pieza",`
- `el.ts` : `primeVariableLegendaire: "+ {taux}% της αξίας του κομματιού",`

- [ ] **Step 4 : Afficher la mention**

Dans `src/components/mobile/qg/carnet/LigneQuete.tsx`, à côté du rendu de `rEff`, ajouter :

```tsx
{p.primeVariable && (
  <span style={{ fontSize: 11, opacity: 0.75 }}>
    {tr(d.carnet.primeVariableLegendaire, {
      taux: Math.round(p.primeVariable.taux * 100),
    })}
  </span>
)}
```

Dans `src/components/mobile/qg/sheets/CourrierSheet.tsx`, dans le bloc de récompense, juste après `<RecompenseJetons … />` :

```tsx
{p.primeVariable && (
  <span style={{ fontSize: 12, opacity: 0.8 }}>
    {tr(d.carnet.primeVariableLegendaire, {
      taux: Math.round(p.primeVariable.taux * 100),
    })}
  </span>
)}
```

- [ ] **Step 5 : Lancer les tests**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/qg && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6 : Passe complète**

Run: `npx vitest run --maxWorkers=4 && npx eslint src`
Expected: PASS, zéro erreur de lint.

- [ ] **Step 7 : Commit**

```bash
git add src/lib/i18n/ui src/components/mobile/qg
git commit -m "feat(carnet): la ligne légendaire annonce ce qu'elle ajoutera"
```

---

## Recette à l'œil (après la tâche 10)

Ces points ne sont pas couverts par les tests et demandent une partie réelle :

1. **Palier 0 (niveaux 3 à 9)** — jouer trois jours et vérifier que « 75 € de bénéfice » et « 150 € de chiffre d'affaires » sont atteignables en une session. Si non : diviser par 5 au lieu de 4 sur ce seul palier de `echelle.ts`.
2. **Le carnet à trois lignes variées** — vérifier que la quête d'objet ne tombe pas systématiquement au même endroit sur plusieurs jours consécutifs, et que les icônes `Crown` et `Hammer` se distinguent de `Gem` au premier coup d'œil.
3. **Les quatre langues** — ouvrir une quotidienne de chaque nouvelle forme en FR, EN, ES et EL, et vérifier qu'aucune ne retombe sur le texte français. La mention d'état de la restauration doit se lire correctement entre parenthèses dans les quatre.
4. **Le grec est à faire relire** : il n'a jamais été certifié par un locuteur sur ce projet.
5. **La restauration en fin de journée** — vérifier que la quête reste lisible (et non « cassée ») quand il ne reste pas assez d'heures avant minuit pour la boucler.
