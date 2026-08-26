# Quêtes périodiques variées — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner aux quêtes quotidiennes et hebdomadaires cinq formes au lieu d'une seule, avec une difficulté qui suit le niveau du joueur.

**Architecture :** Le moteur d'objectifs est une union discriminée avec un point de calcul unique (`progressionObjectif`). On lui ajoute trois membres, on ouvre deux formes existantes aux périodiques, et on remplace le générateur mono-forme par un tirage sur un catalogue de formes. La difficulté sort d'une table de paliers pure (`niveau → cibles`), lue une seule fois à la naissance de la quête. Tout est additif : aucune migration de sauvegarde.

**Tech Stack :** TypeScript, React 19 / Next 16, Vitest, i18n maison par dictionnaires (FR/EN/ES/EL).

## Global Constraints

- **`vitest` exige `--maxWorkers=4` sur ce Mac.** Sans le drapeau, une quarantaine de faux échecs apparaissent par famine de workers. Toutes les commandes de test de ce plan le portent.
- **Aucun changement de `SAVE_VERSION`, aucune migration.** Tout ajout est additif.
- **Jamais de chaîne localisée dans une sauvegarde.** Les textes sont régénérés à l'affichage depuis un `gabaritId` + des paramètres structurés.
- **Quatre langues, sans exception :** FR, EN, ES, EL. Une clé ajoutée dans l'une doit l'être dans les quatre.
- **Rareté visée :** `rare` uniquement. `objetsAtteignables` exclut déjà les légendaires.
- **Lint :** `npm run lint` est cassé (Next 16) — utiliser `npx eslint src`.

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
|---|---|
| `src/lib/quetes/echelle.ts` | La table de paliers `niveau → cibles`. Pure, sans dépendance au state. |
| `src/lib/quetes/echelle.test.ts` | Verrouille les paliers, les bornes, la monotonie. |
| `src/lib/quetes/formes.ts` | Catalogue des formes de quêtes : famille, périodes autorisées, construction du contenu d'une forme chiffrée. |
| `src/lib/quetes/formes.test.ts` | Familles, construction, replis. |

**Modifiés :**

| Fichier | Ce qui change |
|---|---|
| `src/types/game.ts:154-160` | 3 membres ajoutés à `ObjectifMission`. |
| `src/lib/quetes/objectifs.ts` | 3 branches ajoutées au `switch`, + helper `sessionsChinageComptees`. |
| `src/lib/quetes/settlePeriodiques.ts` | Propage `now` jusqu'aux missions créées (horodatage). |
| `src/lib/quetes/periodiques.ts` | `genererLot` tire des formes au lieu de générer 3 fois la même. |
| `src/lib/quetes/textes.ts` | Familles de gabarits FR pour les formes chiffrées. |
| `src/lib/i18n/contenu/index.ts` | Interpolation `{nombre}` / `{montant}` / `{categorie}` par locale. |
| `src/lib/i18n/contenu/{en,es,el}/quetesGabarits.ts` | Overlays des nouvelles familles. |
| `src/lib/i18n/contenu/quetesGabarits.test.ts` | Test de parité généralisé (marques déclarées par famille). |
| `src/lib/i18n/ui/{fr,en,es,el}.ts` | 3 libellés d'objectifs. |
| `src/components/mobile/qg/overlays/CommandeRow.tsx` | 3 cas de `libelleObjectif` + correctif du suffixe « € ». |

---

### Task 1 : Les trois nouveaux types d'objectifs

**Files:**
- Modify: `src/types/game.ts:154-160`
- Modify: `src/lib/quetes/objectifs.ts`
- Test: `src/lib/quetes/objectifs.test.ts`

**Interfaces:**
- Consumes: rien (première tâche).
- Produces: les membres `{ type: "objetsRares"; nombre: number }`, `{ type: "beneficeCumule"; montant: number }`, `{ type: "ventesCategorie"; categorie: CategorieObjet; nombre: number }` de `ObjectifMission`, tous gérés par `progressionObjectif(obj, state, reso, jourRecu): ProgressionObjectif`.

**Contexte à connaître.** `progressionObjectif` compte « ce qui arrive après l'apparition de la quête » via le helper existant `sessionsComptees`, qui filtre l'historique sur `timestampAcceptation` (ou, à défaut, sur `s.jour >= jourRecu`). Les sessions de vente ont ce helper ; **les sessions de chinage n'en ont pas** — il faut son jumeau. Et `AchatHistorique` ne porte pas la rareté de l'objet : elle se relit depuis `getTemplate(templateId)?.rarete`.

- [ ] **Step 1 : Écrire les tests qui échouent**

À ajouter à la fin de `src/lib/quetes/objectifs.test.ts`. Le fichier utilise déjà `createMockGameState`, la constante `reso` (`timestampAcceptation: 1000`) et le helper `venteSession(timestamp, ventes)` — les réutiliser. Il manque son équivalent chinage, à écrire à côté de `venteSession` :

```ts
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
```

> Ajouter `SessionChinage` à l'import de types depuis `@/types/game`.
> Identifiants réels utilisés ci-dessous : `mus.guitare_classique_ancienne` et
> `mus.test_pressing_des_trolling_sons` sont **rares** ; `mus.33tours_jazz_1` est **commun**.

```ts
describe("objetsRares", () => {
  const obj = { type: "objetsRares" as const, nombre: 2 };

  it("compte les objets rares chinés après l'acceptation", () => {
    const state = createMockGameState({
      historique: [
        chineSession(500, ["mus.guitare_classique_ancienne"]), // avant acceptation
        chineSession(1500, ["mus.guitare_classique_ancienne", "mus.33tours_jazz_1"]),
        chineSession(2500, ["mus.test_pressing_des_trolling_sons"]),
      ],
    });
    expect(progressionObjectif(obj, state, reso, 1)).toEqual({ actuel: 2, cible: 2, atteint: true });
  });

  it("ce qui précède l'acceptation ne compte pas", () => {
    const state = createMockGameState({
      historique: [chineSession(500, ["mus.guitare_classique_ancienne", "mus.test_pressing_des_trolling_sons"])],
    });
    expect(progressionObjectif(obj, state, reso, 1)).toEqual({ actuel: 0, cible: 2, atteint: false });
  });

  it("le stock déjà possédé ne compte pas", () => {
    const state = createMockGameState({
      historique: [],
      inventaireJoueur: [createMockObjet({ templateId: "mus.guitare_classique_ancienne", categorie: "Musique" })],
    });
    expect(progressionObjectif(obj, state, reso, 1).actuel).toBe(0);
  });
});

describe("beneficeCumule", () => {
  const obj = { type: "beneficeCumule" as const, montant: 300 };

  it("somme les marges des ventes postérieures", () => {
    const state = createMockGameState({
      historique: [venteSession(1500, [{ prixVente: 200, prixAchat: 50 }, { prixVente: 100, prixAchat: 40 }])],
    });
    expect(progressionObjectif(obj, state, reso, 1)).toEqual({ actuel: 210, cible: 300, atteint: false });
  });

  it("ignore les ventes sans prix d'achat connu", () => {
    const state = createMockGameState({
      historique: [venteSession(1500, [{ prixVente: 500, prixAchat: null }, { prixVente: 100, prixAchat: 40 }])],
    });
    expect(progressionObjectif(obj, state, reso, 1).actuel).toBe(60);
  });

  it("une perte nette ne descend pas sous zéro", () => {
    const state = createMockGameState({
      historique: [venteSession(1500, [{ prixVente: 10, prixAchat: 200 }])],
    });
    expect(progressionObjectif(obj, state, reso, 1).actuel).toBe(0);
  });
});

describe("ventesCategorie", () => {
  const obj = { type: "ventesCategorie" as const, categorie: "Musique" as const, nombre: 3 };

  it("ne compte que la catégorie demandée", () => {
    const state = createMockGameState({
      historique: [
        venteSession(1500, [
          { prixVente: 10, prixAchat: 5, categorie: "Musique" },
          { prixVente: 10, prixAchat: 5, categorie: "Musique" },
          { prixVente: 10, prixAchat: 5, categorie: "Mode" },
        ]),
      ],
    });
    expect(progressionObjectif(obj, state, reso, 1)).toEqual({ actuel: 2, cible: 3, atteint: false });
  });
});
```

> `venteSession` construit ses ventes par `{ …défauts, ...v }` : passer `categorie` dans
> l'objet de vente suffit à l'écraser. Élargir sa signature à
> `Array<{ prixVente: number; prixAchat: number | null; categorie?: CategorieObjet }>`.
> Importer `createMockObjet` depuis `@/lib/__test-fixtures__/gameState`.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes/objectifs.test.ts
```

Attendu : ÉCHEC de compilation TypeScript — les trois types n'existent pas dans `ObjectifMission`.

- [ ] **Step 3 : Ajouter les trois membres à l'union**

Dans `src/types/game.ts`, remplacer la définition de `ObjectifMission` :

```ts
export type ObjectifMission =
  | { type: "objet"; templateId: string; etatMin?: EtatObjet }
  | { type: "ventesCumulees"; montant: number }
  | { type: "profitVente"; montant: number }
  | { type: "restauration"; etatMin: EtatObjet }
  | { type: "valeurCollection"; montant: number }
  | { type: "niveau"; niveau: number }
  /* Périodiques (SP5) — comptés APRÈS l'apparition de la quête. */
  | { type: "objetsRares"; nombre: number }
  | { type: "beneficeCumule"; montant: number }
  | { type: "ventesCategorie"; categorie: CategorieObjet; nombre: number };
```

- [ ] **Step 4 : Implémenter les trois branches**

Dans `src/lib/quetes/objectifs.ts`, ajouter aux imports :

```ts
import { getTemplate } from "@/data/objetTemplates";
```

et `SessionChinage` à la liste des types importés depuis `@/types/game`.

Ajouter le jumeau chinage de `sessionsComptees`, juste après elle :

```ts
/** Idem `sessionsComptees`, pour les sessions de chinage. */
function sessionsChinageComptees(
  state: Pick<GameState, "historique">,
  reso: Pick<MissionResolution, "timestampAcceptation">,
  jourRecu: number,
): SessionChinage[] {
  return state.historique.filter((s): s is SessionChinage => {
    if (s.type !== "chinage") return false;
    return reso.timestampAcceptation !== undefined
      ? s.timestamp > reso.timestampAcceptation
      : s.jour >= jourRecu;
  });
}
```

Puis les trois branches dans le `switch` de `progressionObjectif`, avant l'accolade fermante :

```ts
    case "objetsRares": {
      const n = sessionsChinageComptees(state, reso, jourRecu)
        .flatMap((s) => s.achats)
        .filter((a) => getTemplate(a.templateId)?.rarete === "rare").length;
      return { actuel: n, cible: obj.nombre, atteint: n >= obj.nombre };
    }
    case "beneficeCumule": {
      // Une vente à perte ne doit pas rendre la barre négative (largeur NaN%).
      const brut = sessionsComptees(state, reso, jourRecu)
        .flatMap((s) => s.ventes)
        .reduce((acc, v) => (v.prixAchat === null ? acc : acc + (v.prixVente - v.prixAchat)), 0);
      const total = Math.max(0, brut);
      return { actuel: total, cible: obj.montant, atteint: total >= obj.montant };
    }
    case "ventesCategorie": {
      const n = sessionsComptees(state, reso, jourRecu)
        .flatMap((s) => s.ventes)
        .filter((v) => v.categorie === obj.categorie).length;
      return { actuel: n, cible: obj.nombre, atteint: n >= obj.nombre };
    }
```

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes/objectifs.test.ts
```

Attendu : SUCCÈS.

- [ ] **Step 6 : Vérifier qu'aucun `switch` exhaustif ailleurs n'est cassé**

```bash
npx tsc --noEmit
```

Attendu : SUCCÈS. En cas d'erreur « not all code paths return a value » ou de cas manquant sur `ObjectifMission`, ce sont les consommateurs à compléter — les traiter maintenant (la tâche 8 couvre `libelleObjectif`, tout autre appelant est à corriger ici).

- [ ] **Step 7 : Commit**

```bash
git add src/types/game.ts src/lib/quetes/objectifs.ts src/lib/quetes/objectifs.test.ts
git commit -m "feat(quetes): trois nouveaux types d'objectifs (rares, bénéfice, ventes par catégorie)"
```

---

### Task 2 : Horodater les missions périodiques

**Files:**
- Modify: `src/lib/quetes/settlePeriodiques.ts`
- Test: `src/lib/quetes/settlePeriodiques.test.ts`

**Interfaces:**
- Consumes: rien de la tâche 1.
- Produces: toute mission créée par `settleQuetesPeriodiques(state, now)` porte `timestampAcceptation === now`.

**Pourquoi.** Sans horodatage, `progressionObjectif` retombe sur `s.jour >= jourRecu`, c'est-à-dire le **jour de jeu** en cours : des ventes antérieures à l'apparition de la quête compteraient pour elle. Sans conséquence pour « trouve tel objet », faux pour tout le reste.

- [ ] **Step 1 : Écrire le test qui échoue**

À ajouter dans `src/lib/quetes/settlePeriodiques.test.ts`. Le fichier définit déjà une constante `now` et construit un état débloqué (le verrou `NIVEAU_QUETES_PERIODIQUES = 3` impose un niveau ≥ 3) — **reprendre exactement la construction d'état d'un test voisin qui obtient bien un lot**, plutôt que d'en inventer une.

```ts
it("les missions périodiques créées portent leur horodatage d'apparition", () => {
  const state = /* même construction d'état qu'un test voisin produisant un lot */;
  const apres = settleQuetesPeriodiques(state, now);
  const nouvelles = apres.missions.filter(
    (m) => !state.missions.some((v) => v.courrierId === m.courrierId),
  );
  expect(nouvelles.length).toBeGreaterThan(0);
  for (const m of nouvelles) expect(m.timestampAcceptation).toBe(now);
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes/settlePeriodiques.test.ts
```

Attendu : ÉCHEC — `timestampAcceptation` vaut `undefined`.

- [ ] **Step 3 : Propager `now` jusqu'aux missions**

Dans `src/lib/quetes/settlePeriodiques.ts`, ajouter un paramètre `now` à `settleUnLot` et l'utiliser à la création des missions :

```ts
function settleUnLot(
  state: GameState,
  type: TypePeriodique,
  lot: LotPeriodique,
  cleActuelle: string,
  now: number,
):
```

et dans le `return` de cette fonction :

```ts
    missions: [
      ...missions,
      ...nouveaux.map((c) => ({
        courrierId: c.id,
        statut: "active" as const,
        // Sans cet horodatage, les objectifs cumulatifs retomberaient sur le
        // jour de JEU en cours et compteraient des ventes antérieures à la quête.
        timestampAcceptation: now,
      })),
    ],
```

Puis passer `now` aux deux appels dans `settleQuetesPeriodiques` :

```ts
  const q = settleUnLot({ ...state, courriers, missions }, "quotidienne", quotidien, cleJourLocal(now), now);
```

```ts
  const h = settleUnLot({ ...state, courriers, missions }, "hebdomadaire", hebdo, cleSemaineLocale(now), now);
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes/settlePeriodiques.test.ts
```

Attendu : SUCCÈS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/quetes/settlePeriodiques.ts src/lib/quetes/settlePeriodiques.test.ts
git commit -m "fix(quetes): horodater les missions périodiques à leur apparition"
```

---

### Task 3 : La table de paliers

**Files:**
- Create: `src/lib/quetes/echelle.ts`
- Test: `src/lib/quetes/echelle.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `ciblesPourNiveau(niveau: number): CiblesNiveau` et l'interface `CiblesNiveau` (huit champs numériques, listés ci-dessous). Consommé par les tâches 4 et 5.

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `src/lib/quetes/echelle.test.ts` :

```ts
import { describe, expect, test } from "vitest";
import { ciblesPourNiveau, type CiblesNiveau } from "./echelle";

const CLES: (keyof CiblesNiveau)[] = [
  "beneficeSemaine",
  "chiffreAffairesSemaine",
  "profitVenteUnique",
  "ventesCategorie",
  "objetsRaresQuotidien",
  "objetsRaresHebdo",
  "recompenseHebdo",
  "recompenseQuotidienne",
];

describe("table de paliers", () => {
  test("palier d'entrée (niveau 3, ouverture des quêtes)", () => {
    expect(ciblesPourNiveau(3)).toEqual({
      beneficeSemaine: 300,
      chiffreAffairesSemaine: 600,
      profitVenteUnique: 60,
      ventesCategorie: 3,
      objetsRaresQuotidien: 2,
      objetsRaresHebdo: 4,
      recompenseHebdo: 75,
      recompenseQuotidienne: 25,
    });
  });

  test("palier terminal (niveau 100, plafond)", () => {
    expect(ciblesPourNiveau(100)).toEqual({
      beneficeSemaine: 1800,
      chiffreAffairesSemaine: 3600,
      profitVenteUnique: 360,
      ventesCategorie: 8,
      objetsRaresQuotidien: 4,
      objetsRaresHebdo: 9,
      recompenseHebdo: 450,
      recompenseQuotidienne: 150,
    });
  });

  test("les bornes de palier basculent au bon niveau", () => {
    expect(ciblesPourNiveau(9).beneficeSemaine).toBe(300);
    expect(ciblesPourNiveau(10).beneficeSemaine).toBe(500);
    expect(ciblesPourNiveau(19).beneficeSemaine).toBe(500);
    expect(ciblesPourNiveau(20).beneficeSemaine).toBe(850);
    expect(ciblesPourNiveau(39).beneficeSemaine).toBe(850);
    expect(ciblesPourNiveau(40).beneficeSemaine).toBe(1300);
    expect(ciblesPourNiveau(69).beneficeSemaine).toBe(1300);
    expect(ciblesPourNiveau(70).beneficeSemaine).toBe(1800);
  });

  test("monotone : aucun palier n'est plus facile que le précédent", () => {
    for (const cle of CLES) {
      for (let n = 1; n <= 100; n++) {
        expect(ciblesPourNiveau(n)[cle]).toBeGreaterThanOrEqual(ciblesPourNiveau(n - 1)[cle]);
      }
    }
  });

  test("un niveau hors bornes retombe sur un palier valide", () => {
    expect(ciblesPourNiveau(0)).toEqual(ciblesPourNiveau(1));
    expect(ciblesPourNiveau(999)).toEqual(ciblesPourNiveau(100));
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes/echelle.test.ts
```

Attendu : ÉCHEC — le module `./echelle` n'existe pas.

- [ ] **Step 3 : Écrire la table**

Créer `src/lib/quetes/echelle.ts` :

```ts
/**
 * Difficulté des quêtes périodiques chiffrées, par paliers de niveau.
 *
 * SOURCE UNIQUE : cibles ET récompenses sortent d'ici. Aucun coefficient
 * ailleurs. Du premier au dernier palier : ×6 — la croissance économique
 * réelle du jeu (marchandise accessible ×2,8, chargement ×1,75, marges des
 * compétences). Voir l'annexe B de la spec pour les mesures.
 *
 * La cible est lue UNE FOIS, à la naissance de la quête, et figée dans
 * l'objectif : un joueur qui prend un niveau en milieu de semaine ne voit pas
 * son objectif se durcir sous ses pieds.
 */
export interface CiblesNiveau {
  /** « Réalise X € de bénéfice » (hebdomadaire). */
  beneficeSemaine: number;
  /** « Réalise X € de chiffre d'affaires » (hebdomadaire). */
  chiffreAffairesSemaine: number;
  /** « Fais X € de marge sur une seule vente » (hebdomadaire). */
  profitVenteUnique: number;
  /** « Vends X objets de catégorie Y » (hebdomadaire). */
  ventesCategorie: number;
  /** « Trouve X objets rares » — version quotidienne. */
  objetsRaresQuotidien: number;
  /** « Trouve X objets rares » — version hebdomadaire, plus exigeante. */
  objetsRaresHebdo: number;
  /** Récompense en € d'une hebdomadaire SANS objet nommé. */
  recompenseHebdo: number;
  /** Récompense en € d'une quotidienne SANS objet nommé. */
  recompenseQuotidienne: number;
}

/** Paliers, du plus bas au plus haut. Le premier couvre tout niveau < 10. */
const PALIERS: { niveauMin: number; cibles: CiblesNiveau }[] = [
  {
    niveauMin: 0,
    cibles: { beneficeSemaine: 300, chiffreAffairesSemaine: 600, profitVenteUnique: 60, ventesCategorie: 3, objetsRaresQuotidien: 2, objetsRaresHebdo: 4, recompenseHebdo: 75, recompenseQuotidienne: 25 },
  },
  {
    niveauMin: 10,
    cibles: { beneficeSemaine: 500, chiffreAffairesSemaine: 1000, profitVenteUnique: 100, ventesCategorie: 4, objetsRaresQuotidien: 2, objetsRaresHebdo: 5, recompenseHebdo: 125, recompenseQuotidienne: 40 },
  },
  {
    niveauMin: 20,
    cibles: { beneficeSemaine: 850, chiffreAffairesSemaine: 1700, profitVenteUnique: 170, ventesCategorie: 5, objetsRaresQuotidien: 3, objetsRaresHebdo: 6, recompenseHebdo: 210, recompenseQuotidienne: 70 },
  },
  {
    niveauMin: 40,
    cibles: { beneficeSemaine: 1300, chiffreAffairesSemaine: 2600, profitVenteUnique: 260, ventesCategorie: 6, objetsRaresQuotidien: 3, objetsRaresHebdo: 7, recompenseHebdo: 325, recompenseQuotidienne: 110 },
  },
  {
    niveauMin: 70,
    cibles: { beneficeSemaine: 1800, chiffreAffairesSemaine: 3600, profitVenteUnique: 360, ventesCategorie: 8, objetsRaresQuotidien: 4, objetsRaresHebdo: 9, recompenseHebdo: 450, recompenseQuotidienne: 150 },
  },
];

/** Cibles applicables à un niveau de Brocanteur. Jamais `undefined`. */
export function ciblesPourNiveau(niveau: number): CiblesNiveau {
  let out = PALIERS[0].cibles;
  for (const p of PALIERS) if (niveau >= p.niveauMin) out = p.cibles;
  return out;
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes/echelle.test.ts
```

Attendu : SUCCÈS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/quetes/echelle.ts src/lib/quetes/echelle.test.ts
git commit -m "feat(quetes): table de paliers de difficulté par niveau"
```

---

### Task 4 : Le catalogue de formes

**Files:**
- Create: `src/lib/quetes/formes.ts`
- Test: `src/lib/quetes/formes.test.ts`

**Interfaces:**
- Consumes: `ciblesPourNiveau` / `CiblesNiveau` (tâche 3) ; les types d'objectifs (tâche 1).
- Produces:
  - `type FormeQuete = "objet" | "objetsRares" | "beneficeCumule" | "chiffreAffaires" | "profitVente" | "ventesCategorie"`
  - `const FAMILLE: Record<FormeQuete, "chine" | "vente">`
  - `const FORMES_HEBDOMADAIRES: FormeQuete[]`
  - `const ICONE_FORME: Record<FormeQuete, string>` — nom d'icône `lucide-react`, consommé par le chantier ②
  - `interface ContenuForme { objectifs: ObjectifMission[]; recompenseArgent: number; gabaritCle: string; gabaritParams: ParamsGabarit }`
  - `interface ParamsGabarit { nombre?: number; montant?: number; categorie?: CategorieObjet }`
  - `contenuFormeChiffree(forme, periode, niveau, categoriesDisponibles, rng): ContenuForme | null`

**Portée.** Ce module ne traite **que les formes sans objet nommé**. La forme `objet` garde sa fabrique existante (`genererUne` dans `periodiques.ts`), qui sait déjà choisir des cibles dans le pool atteignable et calculer leur récompense.

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `src/lib/quetes/formes.test.ts` :

```ts
import { describe, expect, test } from "vitest";
import { FAMILLE, FORMES_HEBDOMADAIRES, ICONE_FORME, contenuFormeChiffree } from "./formes";
import { ciblesPourNiveau } from "./echelle";

const rngFixe = () => 0;

describe("familles", () => {
  test("chine et vente sont correctement réparties", () => {
    expect(FAMILLE.objet).toBe("chine");
    expect(FAMILLE.objetsRares).toBe("chine");
    expect(FAMILLE.beneficeCumule).toBe("vente");
    expect(FAMILLE.chiffreAffaires).toBe("vente");
    expect(FAMILLE.profitVente).toBe("vente");
    expect(FAMILLE.ventesCategorie).toBe("vente");
  });

  test("chaque forme déclare son icône ; seule la forme objet n'en a pas", () => {
    for (const f of FORMES_HEBDOMADAIRES) {
      if (f === "objet") expect(ICONE_FORME[f]).toBeNull();
      else expect(typeof ICONE_FORME[f]).toBe("string");
    }
  });

  test("les six formes sont éligibles à l'hebdomadaire", () => {
    expect([...FORMES_HEBDOMADAIRES].sort()).toEqual(
      ["beneficeCumule", "chiffreAffaires", "objet", "objetsRares", "profitVente", "ventesCategorie"].sort(),
    );
  });
});

describe("contenuFormeChiffree", () => {
  test("objetsRares : cible quotidienne et hebdomadaire distinctes", () => {
    const q = contenuFormeChiffree("objetsRares", "quotidienne", 3, ["Musique"], rngFixe);
    const h = contenuFormeChiffree("objetsRares", "hebdomadaire", 3, ["Musique"], rngFixe);
    expect(q?.objectifs).toEqual([{ type: "objetsRares", nombre: 2 }]);
    expect(h?.objectifs).toEqual([{ type: "objetsRares", nombre: 4 }]);
  });

  test("beneficeCumule : cible et récompense lues dans la table", () => {
    const c = ciblesPourNiveau(25);
    const r = contenuFormeChiffree("beneficeCumule", "hebdomadaire", 25, ["Musique"], rngFixe);
    expect(r?.objectifs).toEqual([{ type: "beneficeCumule", montant: c.beneficeSemaine }]);
    expect(r?.recompenseArgent).toBe(c.recompenseHebdo);
    expect(r?.gabaritParams).toEqual({ montant: c.beneficeSemaine });
  });

  test("ventesCategorie : la catégorie est tirée parmi celles fournies", () => {
    const r = contenuFormeChiffree("ventesCategorie", "hebdomadaire", 3, ["Mode"], rngFixe);
    expect(r?.objectifs).toEqual([{ type: "ventesCategorie", categorie: "Mode", nombre: 3 }]);
    expect(r?.gabaritParams).toEqual({ nombre: 3, categorie: "Mode" });
  });

  test("ventesCategorie sans catégorie disponible : repli null", () => {
    expect(contenuFormeChiffree("ventesCategorie", "hebdomadaire", 3, [], rngFixe)).toBeNull();
  });

  test("la récompense quotidienne diffère de l'hebdomadaire", () => {
    const c = ciblesPourNiveau(3);
    const q = contenuFormeChiffree("objetsRares", "quotidienne", 3, ["Musique"], rngFixe);
    expect(q?.recompenseArgent).toBe(c.recompenseQuotidienne);
  });

  test("chaque forme chiffrée annonce une clé de gabarit distincte", () => {
    const cles = (["objetsRares", "beneficeCumule", "chiffreAffaires", "profitVente", "ventesCategorie"] as const).map(
      (f) => contenuFormeChiffree(f, "hebdomadaire", 3, ["Musique"], rngFixe)?.gabaritCle,
    );
    expect(new Set(cles).size).toBe(cles.length);
    expect(cles.every((c) => typeof c === "string" && c.length > 0)).toBe(true);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes/formes.test.ts
```

Attendu : ÉCHEC — le module `./formes` n'existe pas.

- [ ] **Step 3 : Écrire le catalogue**

Créer `src/lib/quetes/formes.ts` :

```ts
import { ciblesPourNiveau } from "./echelle";
import type { TypePeriodique } from "./periodiques";
import type { CategorieObjet, ObjectifMission } from "@/types/game";

/** Les six formes qu'une quête périodique peut prendre. */
export type FormeQuete =
  | "objet"
  | "objetsRares"
  | "beneficeCumule"
  | "chiffreAffaires"
  | "profitVente"
  | "ventesCategorie";

/**
 * Famille d'une forme. Sert au garde-fou du lot hebdomadaire : sans au moins
 * une forme « vente », la semaine ne serait qu'une série de quotidiennes en
 * plus lent.
 */
export const FAMILLE: Record<FormeQuete, "chine" | "vente"> = {
  objet: "chine",
  objetsRares: "chine",
  beneficeCumule: "vente",
  chiffreAffaires: "vente",
  profitVente: "vente",
  ventesCategorie: "vente",
};

/**
 * Icône `lucide-react` de chaque forme, consommée par le carnet (chantier ②).
 * `objet` n'en a pas : cette forme s'affiche avec la PHOTO de l'objet demandé.
 */
export const ICONE_FORME: Record<FormeQuete, string | null> = {
  objet: null,
  objetsRares: "Gem",
  beneficeCumule: "TrendingUp",
  chiffreAffaires: "TrendingUp",
  profitVente: "Coins",
  ventesCategorie: "Package",
};

/** Formes éligibles au tirage hebdomadaire (les six). */
export const FORMES_HEBDOMADAIRES: FormeQuete[] = [
  "objet",
  "objetsRares",
  "beneficeCumule",
  "chiffreAffaires",
  "profitVente",
  "ventesCategorie",
];

/** Paramètres interpolés dans le texte de la quête. */
export interface ParamsGabarit {
  nombre?: number;
  montant?: number;
  categorie?: CategorieObjet;
}

/** Contenu d'une forme SANS objet nommé. */
export interface ContenuForme {
  objectifs: ObjectifMission[];
  recompenseArgent: number;
  /** Famille de gabarit de texte (cf. quetes/textes.ts). */
  gabaritCle: string;
  gabaritParams: ParamsGabarit;
}

/**
 * Construit le contenu d'une forme chiffrée. `null` si la forme est
 * inconstructible dans l'état courant (seul cas aujourd'hui : `ventesCategorie`
 * sans aucune catégorie accessible au joueur).
 *
 * La forme `objet` n'est PAS traitée ici : elle garde sa fabrique historique
 * dans `periodiques.ts`, qui choisit ses cibles dans le pool atteignable.
 */
export function contenuFormeChiffree(
  forme: Exclude<FormeQuete, "objet">,
  periode: TypePeriodique,
  niveau: number,
  categoriesDisponibles: CategorieObjet[],
  rng: () => number,
): ContenuForme | null {
  const c = ciblesPourNiveau(niveau);
  const recompenseArgent =
    periode === "quotidienne" ? c.recompenseQuotidienne : c.recompenseHebdo;

  switch (forme) {
    case "objetsRares": {
      const nombre =
        periode === "quotidienne" ? c.objetsRaresQuotidien : c.objetsRaresHebdo;
      return {
        objectifs: [{ type: "objetsRares", nombre }],
        recompenseArgent,
        gabaritCle: "rares",
        gabaritParams: { nombre },
      };
    }
    case "beneficeCumule":
      return {
        objectifs: [{ type: "beneficeCumule", montant: c.beneficeSemaine }],
        recompenseArgent,
        gabaritCle: "benefice",
        gabaritParams: { montant: c.beneficeSemaine },
      };
    case "chiffreAffaires":
      return {
        objectifs: [{ type: "ventesCumulees", montant: c.chiffreAffairesSemaine }],
        recompenseArgent,
        gabaritCle: "chiffre",
        gabaritParams: { montant: c.chiffreAffairesSemaine },
      };
    case "profitVente":
      return {
        objectifs: [{ type: "profitVente", montant: c.profitVenteUnique }],
        recompenseArgent,
        gabaritCle: "marge",
        gabaritParams: { montant: c.profitVenteUnique },
      };
    case "ventesCategorie": {
      if (categoriesDisponibles.length === 0) return null;
      const categorie =
        categoriesDisponibles[Math.floor(rng() * categoriesDisponibles.length)];
      const nombre = c.ventesCategorie;
      return {
        objectifs: [{ type: "ventesCategorie", categorie, nombre }],
        recompenseArgent,
        gabaritCle: "categorie",
        gabaritParams: { nombre, categorie },
      };
    }
  }
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes/formes.test.ts
```

Attendu : SUCCÈS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/quetes/formes.ts src/lib/quetes/formes.test.ts
git commit -m "feat(quetes): catalogue des formes de quêtes périodiques"
```

---

### Task 5 : Le tirage des lots

**Files:**
- Modify: `src/lib/quetes/periodiques.ts`
- Test: `src/lib/quetes/periodiques.test.ts`

**Interfaces:**
- Consumes: `FAMILLE`, `FORMES_HEBDOMADAIRES`, `contenuFormeChiffree` (tâche 4) ; `genererTexteChiffre` (tâche 6, **écrit après** — voir la note ci-dessous).
- Produces: `genererLot(state, type, cle, rng)` renvoie désormais des courriers de formes variées. Signature inchangée.

**Ordre d'écriture.** Cette tâche a besoin de `genererTexteChiffre`, qui appartient à la tâche 6. Pour rester testable seule, elle utilise un texte FR minimal en dur, remplacé par l'appel réel en tâche 6. La tâche 6 porte le test qui verrouille ce remplacement.

**Composition à produire :**

| | Formes |
|---|---|
| Quotidienne | `objet`, `objet`, `objetsRares` |
| Hebdomadaire | 3 formes distinctes tirées parmi les 6, **dont au moins une de famille « vente »** |

- [ ] **Step 1 : Écrire les tests qui échouent**

**D'abord, réparer deux tests existants.** `periodiques.test.ts` contient aujourd'hui « quotidienne : missions de catégorie quotidienne, 1 cible chacune » et « hebdomadaire : 2 à 3 cibles par commande », qui bouclent sur **tous** les courriers du lot. Les quêtes chiffrées n'ont aucune cible : ces deux tests vont échouer légitimement. Les restreindre aux quêtes d'objet en ajoutant, dans chaque boucle, juste après le test `payload.type === "mission"` :

```ts
        if (c.payload.cibles.length === 0) continue; // quête chiffrée : pas de cible
```

Puis ajouter les nouveaux tests. Le fichier utilise `createMockGameState` et un helper `rngSeq(vals)` ; le tirage étant aléatoire, on l'exerce sur de nombreuses graines, ce qui demande un générateur pseudo-aléatoire plutôt qu'une séquence fixe.

```ts
import { FAMILLE, type FormeQuete } from "./formes";
import { objetsAtteignables } from "./atteignables";
import type { Courrier } from "@/types/game";

/** Générateur pseudo-aléatoire déterministe, pour rejouer une graine. */
function rngGraine(graine: number): () => number {
  let s = graine >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Forme d'un courrier généré, déduite de son unique objectif. */
function formeDe(c: Courrier): FormeQuete {
  if (c.payload.type !== "mission") throw new Error("pas une mission");
  const o = c.payload.objectifs?.[0];
  switch (o?.type) {
    case "objetsRares": return "objetsRares";
    case "beneficeCumule": return "beneficeCumule";
    case "ventesCumulees": return "chiffreAffaires";
    case "profitVente": return "profitVente";
    case "ventesCategorie": return "ventesCategorie";
    default: return "objet";
  }
}

describe("composition des lots", () => {
  test("quotidienne : deux quêtes d'objet et une de rares", () => {
    for (let g = 1; g <= 30; g++) {
      const lot = genererLot(createMockGameState(), "quotidienne", `c${g}`, rngGraine(g));
      expect(lot).toHaveLength(3);
      const formes = lot.map(formeDe).sort();
      expect(formes).toEqual(["objet", "objet", "objetsRares"].sort());
    }
  });

  test("hebdomadaire : trois formes distinctes, dont au moins une de vente", () => {
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "hebdomadaire", `c${g}`, rngGraine(g));
      expect(lot).toHaveLength(3);
      const formes = lot.map(formeDe);
      expect(new Set(formes).size).toBe(3);
      expect(formes.some((f) => FAMILLE[f] === "vente")).toBe(true);
    }
  });

  test("hebdomadaire : la composition varie d'une graine à l'autre", () => {
    const vues = new Set<string>();
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "hebdomadaire", `c${g}`, rngGraine(g));
      vues.add(lot.map(formeDe).sort().join("|"));
    }
    expect(vues.size).toBeGreaterThan(3);
  });

  test("les identifiants de courrier restent uniques dans un lot", () => {
    const lot = genererLot(createMockGameState(), "hebdomadaire", "cle", rngGraine(7));
    expect(new Set(lot.map((c) => c.id)).size).toBe(lot.length);
  });

  test("la catégorie demandée est toujours accessible au joueur", () => {
    const state = createMockGameState();
    const accessibles = new Set(objetsAtteignables(state).map((t) => t.categorie));
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(state, "hebdomadaire", `c${g}`, rngGraine(g));
      for (const c of lot) {
        if (c.payload.type !== "mission") continue;
        const o = c.payload.objectifs?.[0];
        if (o?.type === "ventesCategorie") expect(accessibles.has(o.categorie)).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes/periodiques.test.ts
```

Attendu : ÉCHEC — le lot ne contient que des quêtes d'objet.

- [ ] **Step 3 : Implémenter le tirage**

Dans `src/lib/quetes/periodiques.ts`, ajouter aux imports :

```ts
import { FAMILLE, FORMES_HEBDOMADAIRES, contenuFormeChiffree, type FormeQuete } from "./formes";
import { objetsAtteignables } from "./atteignables";
```

*(`objetsAtteignables` est peut-être déjà importé — vérifier avant d'ajouter la ligne.)*

Ajouter, avant `genererLot`, le tirage des formes et la fabrique des quêtes chiffrées :

```ts
/** Mélange une copie du tableau (Fisher-Yates sur `rng`). */
function melanger<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Formes composant un lot.
 *
 * Quotidienne : la journée reste tournée vers la chine, faisable en une session.
 * Hebdomadaire : trois formes distinctes parmi les six, avec au moins une forme
 * de vente — sans ce garde-fou, une semaine pourrait n'être qu'une série de
 * quotidiennes en plus lent.
 */
function formesDuLot(type: TypePeriodique, rng: () => number): FormeQuete[] {
  if (type === "quotidienne") return ["objet", "objet", "objetsRares"];

  const choisies = melanger(FORMES_HEBDOMADAIRES, rng).slice(0, 3);
  if (choisies.some((f) => FAMILLE[f] === "vente")) return choisies;

  // Aucune vente tirée : on remplace la dernière par une forme de vente.
  const ventes = melanger(
    FORMES_HEBDOMADAIRES.filter((f) => FAMILLE[f] === "vente" && !choisies.includes(f)),
    rng,
  );
  return [choisies[0], choisies[1], ventes[0]];
}

/** Génère UNE quête chiffrée (sans objet nommé). `null` si inconstructible. */
function genererUneChiffree(
  state: GameState,
  forme: Exclude<FormeQuete, "objet">,
  type: TypePeriodique,
  id: string,
  rng: () => number,
): Courrier | null {
  const categories = [...new Set(objetsAtteignables(state).map((t) => t.categorie))];
  const contenu = contenuFormeChiffree(
    forme,
    type,
    state.brocanteur.niveau,
    categories,
    rng,
  );
  if (!contenu) return null;

  // Le commanditaire donne le TON de la lettre : celui de la catégorie demandée
  // quand il y en a une, un marchand générique sinon.
  const commanditaires = Object.values(EXPEDITEURS).filter(
    (e) => e.id !== "maman" && e.id !== "grand-pere" && e.domaine,
  );
  const cat = contenu.gabaritParams.categorie;
  const exp =
    (cat ? commanditaires.find((e) => e.domaine === cat) : undefined) ??
    pick(commanditaires, rng);

  // TÂCHE 6 : remplacer ce texte de rechange par `genererTexteChiffre`.
  const titre = `Quête : ${forme}`;
  const corps = ["Bonjour,", "J'ai une demande pour toi."];

  return {
    ...creerCourrierMission({
      id,
      jour: state.jourActuel,
      expediteurId: exp.id,
      titre,
      corps,
      categorie: type,
      cibles: [],
      recompense: { argent: contenu.recompenseArgent },
      objectifs: contenu.objectifs,
    }),
    lu: true,
  };
}
```

Puis remplacer le corps de `genererLot` :

```ts
export function genererLot(
  state: GameState,
  type: TypePeriodique,
  cle: string,
  rng: () => number = Math.random,
): Courrier[] {
  const prefixe = type === "quotidienne" ? "quo" : "heb";
  const pris = new Set<string>();
  const lot: Courrier[] = [];
  const formes = formesDuLot(type, rng);
  for (let i = 0; i < formes.length; i++) {
    const id = `${prefixe}_${cle}_${i}`;
    const forme = formes[i];
    const c =
      forme === "objet"
        ? genererUne(state, type, id, pris, rng)
        : genererUneChiffree(state, forme, type, id, rng);
    if (c) lot.push(c);
  }
  return lot;
}
```

> `creerCourrierMission` accepte-t-il `cibles: []` ? Oui — les chapitres d'histoire
> sans cible (ex. « Vendre, c'est vivre ») passent déjà par là.

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes/periodiques.test.ts
```

Attendu : SUCCÈS. Le test « la composition varie » doit passer sans être flaky : il utilise des graines fixes.

- [ ] **Step 5 : Lancer toute la suite des quêtes (non-régression)**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes
```

Attendu : SUCCÈS. Si `settlePeriodiques.test.ts` casse sur un nombre de courriers attendu, c'est légitime : ajuster l'attente au nouveau contenu, jamais le code de production.

- [ ] **Step 6 : Commit**

```bash
git add src/lib/quetes/periodiques.ts src/lib/quetes/periodiques.test.ts
git commit -m "feat(quetes): tirage de formes variées dans les lots périodiques"
```

---

### Task 6 : Les textes français des nouvelles formes

**Files:**
- Modify: `src/lib/quetes/textes.ts`
- Modify: `src/lib/quetes/periodiques.ts` (branchement)
- Test: `src/lib/quetes/textes.test.ts`

**Interfaces:**
- Consumes: `ParamsGabarit` (tâche 4).
- Produces: `genererTexteChiffre(gabaritCle: string, params: ParamsGabarit, rng): TexteGenere`, où `TexteGenere = { titre: string; corps: string[]; gabaritId: GabaritQueteId }`. Le `gabaritId` vaut `"<gabaritCle>#<index>"` — consommé par la tâche 7 pour la régénération dans les autres langues.

- [ ] **Step 1 : Écrire les tests qui échouent**

À ajouter dans `src/lib/quetes/textes.test.ts` :

```ts
import { genererTexteChiffre } from "./textes";

describe("genererTexteChiffre", () => {
  test("interpole le montant et renvoie un gabaritId de la bonne famille", () => {
    const t = genererTexteChiffre("benefice", { montant: 850 }, () => 0);
    expect(t.gabaritId.startsWith("benefice#")).toBe(true);
    expect(t.corps.join(" ")).toContain("850");
    expect(t.corps.join(" ")).not.toContain("{montant}");
  });

  test("interpole nombre et catégorie", () => {
    const t = genererTexteChiffre("categorie", { nombre: 5, categorie: "Mode" }, () => 0);
    const tout = [t.titre, ...t.corps].join(" ");
    expect(tout).toContain("5");
    expect(tout).toContain("Mode");
    expect(tout).not.toContain("{nombre}");
    expect(tout).not.toContain("{categorie}");
  });

  test("aucune marque non remplacée, quelle que soit la famille", () => {
    for (const cle of ["rares", "benefice", "chiffre", "marge", "categorie"]) {
      const t = genererTexteChiffre(cle, { nombre: 3, montant: 500, categorie: "Musique" }, () => 0);
      const tout = [t.titre, ...t.corps].join(" ");
      expect(tout).not.toMatch(/\{[a-z]+\}/);
    }
  });

  test("un index hors borne retombe sur la variante 0", () => {
    const t = genererTexteChiffre("benefice", { montant: 100 }, () => 0.999999);
    expect(t.gabaritId).toMatch(/^benefice#\d+$/);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes/textes.test.ts
```

Attendu : ÉCHEC — `genererTexteChiffre` n'est pas exportée.

- [ ] **Step 3 : Écrire les gabarits FR et la fabrique**

Dans `src/lib/quetes/textes.ts`, élargir le type d'identifiant :

```ts
export type GabaritQueteId =
  | `${"generique" | "jeux-video" | "set-designer" | "mode" | "art"}#${number}`
  | `${"rares" | "benefice" | "chiffre" | "marge" | "categorie"}#${number}`;
```

Ajouter les familles, après `PAR_COMMANDITAIRE` :

```ts
/**
 * Gabarits des formes CHIFFRÉES (sans objet nommé). Marques disponibles :
 * `{nombre}`, `{montant}` (déjà formaté « 1 800 € »), `{categorie}`.
 * Une famille par forme — la clé est produite par `contenuFormeChiffree`.
 */
const CHIFFREES: Record<string, Gabarit[]> = {
  rares: [
    { titre: "L'œil du connaisseur", corps: ["Bonjour,", "On dit que tu as l'œil. Rapporte {nombre} pièces rares de tes prochaines brocantes, et je saurai à qui m'adresser désormais."] },
    { titre: "Rien que du beau", corps: ["Cher chineur,", "Le tout-venant ne m'intéresse plus. {nombre} pièces rares, pas une de moins — je veux voir ce que tu sais dénicher."] },
  ],
  benefice: [
    { titre: "La marge, mon garçon", corps: ["Salut,", "Acheter, tout le monde sait faire. Dégage {montant} de bénéfice cette semaine et on reparlera de ton métier."] },
    { titre: "Le nerf de la guerre", corps: ["Bonjour,", "Un pari : {montant} de bénéfice d'ici la fin de la semaine. Tu tiens, je paie."] },
  ],
  chiffre: [
    { titre: "Faire tourner la boutique", corps: ["Bonjour,", "Peu importe la marge : je veux voir du mouvement. {montant} de ventes cette semaine."] },
    { titre: "Le tiroir-caisse chante", corps: ["Salut,", "Fais chanter ta caisse — {montant} encaissés avant dimanche."] },
  ],
  marge: [
    { titre: "Le coup du siècle", corps: ["Cher confrère,", "Tout le monde vend beaucoup. Peu réussissent LE coup. Fais {montant} de marge sur une seule vente."] },
    { titre: "Une seule suffit", corps: ["Bonjour,", "Une belle vente vaut dix médiocres. {montant} de marge, sur un seul objet."] },
  ],
  categorie: [
    { titre: "Spécialiste demandé", corps: ["Bonjour,", "J'ai besoin de quelqu'un qui connaît son rayon. Vends {nombre} objets de la catégorie {categorie} et tu auras ma confiance."] },
    { titre: "Vider le rayon", corps: ["Salut,", "Mon stock déborde du côté {categorie}. Écoule-m'en {nombre} et je te revaudrai ça."] },
  ],
};

/** Format monétaire FR des gabarits : « 1 800 € » (espace insécable fine). */
function montantFr(n: number): string {
  return `${n.toLocaleString("fr-FR")} €`;
}

/**
 * Texte FR d'une quête chiffrée. Même contrat que `genererTexte` : le FR est
 * persisté dans le payload, le `gabaritId` permet la régénération dans les
 * autres langues à l'affichage.
 */
export function genererTexteChiffre(
  gabaritCle: string,
  params: { nombre?: number; montant?: number; categorie?: string },
  rng: () => number = Math.random,
): TexteGenere {
  const gabarits = CHIFFREES[gabaritCle] ?? CHIFFREES.benefice;
  const cle = CHIFFREES[gabaritCle] ? gabaritCle : "benefice";
  const index = Math.floor(rng() * gabarits.length);
  const g = gabarits[index] ?? gabarits[0];
  const indexReel = gabarits[index] ? index : 0;
  const fill = (s: string) =>
    s
      .replaceAll("{nombre}", String(params.nombre ?? 0))
      .replaceAll("{montant}", montantFr(params.montant ?? 0))
      .replaceAll("{categorie}", params.categorie ?? "");
  return {
    titre: fill(g.titre),
    corps: g.corps.map(fill),
    gabaritId: `${cle}#${indexReel}` as GabaritQueteId,
  };
}
```

- [ ] **Step 4 : Brancher le texte réel dans le générateur**

Dans `src/lib/quetes/periodiques.ts`, importer `genererTexteChiffre` aux côtés de `genererTexte`, puis remplacer le texte de rechange de `genererUneChiffree` :

```ts
  const texte = genererTexteChiffre(contenu.gabaritCle, contenu.gabaritParams, rng);
```

et le `creerCourrierMission` correspondant :

```ts
    ...creerCourrierMission({
      id,
      jour: state.jourActuel,
      expediteurId: exp.id,
      titre: texte.titre,
      corps: texte.corps,
      categorie: type,
      cibles: [],
      recompense: { argent: contenu.recompenseArgent },
      objectifs: contenu.objectifs,
      gabaritId: texte.gabaritId,
      gabaritParams: contenu.gabaritParams,
    }),
```

> `gabaritParams` doit accepter `{ nombre?, montant?, categorie? }` en plus de
> `etatMin?`. Élargir son type dans `creerCourrierMission` (`src/lib/courrier.ts`)
> et dans `CourrierPayloadMission` (`src/types/game.ts`) si nécessaire — la tâche 7
> élargit le type côté i18n.

- [ ] **Step 5 : Ajouter le test de non-régression du branchement**

À ajouter dans `src/lib/quetes/periodiques.test.ts` :

```ts
test("les quêtes chiffrées portent un gabaritId et un texte sans marque", () => {
  for (let g = 1; g <= 30; g++) {
    const lot = genererLot(createMockGameState(), "hebdomadaire", `c${g}`, rngGraine(g));
    for (const c of lot) {
      if (c.payload.type !== "mission") continue;
      if (c.payload.cibles.length > 0) continue; // quête d'objet : autre voie
      expect(c.payload.gabaritId).toBeDefined();
      expect([c.payload.titre, ...c.payload.corps].join(" ")).not.toMatch(/\{[a-z]+\}/);
    }
  }
});
```

- [ ] **Step 6 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/lib/quetes
```

Attendu : SUCCÈS.

- [ ] **Step 7 : Commit**

```bash
git add src/lib/quetes/textes.ts src/lib/quetes/textes.test.ts src/lib/quetes/periodiques.ts src/lib/quetes/periodiques.test.ts src/lib/courrier.ts src/types/game.ts
git commit -m "feat(quetes): textes FR des quêtes chiffrées"
```

---

### Task 7 : Les trois autres langues

**Files:**
- Modify: `src/lib/i18n/contenu/index.ts:435-525`
- Modify: `src/lib/i18n/contenu/en/quetesGabarits.ts`
- Modify: `src/lib/i18n/contenu/es/quetesGabarits.ts`
- Modify: `src/lib/i18n/contenu/el/quetesGabarits.ts`
- Test: `src/lib/i18n/contenu/quetesGabarits.test.ts`

**Interfaces:**
- Consumes: les clés de gabarit `rares` / `benefice` / `chiffre` / `marge` / `categorie` et leurs paramètres (tâches 4 et 6).
- Produces: `titreCourrier(courrier, locale)` et `corpsCourrier(courrier, locale)` régénèrent les quêtes chiffrées dans les quatre langues.

**Ce qui casse si on ne fait rien.** `quetesGabarits.test.ts` exige aujourd'hui la marque `{objets}` dans **chaque** gabarit de chaque overlay. Les nouvelles familles n'en ont pas : le test doit déclarer les marques attendues **par famille**.

- [ ] **Step 1 : Généraliser le test de parité (il doit échouer)**

Dans `src/lib/i18n/contenu/quetesGabarits.test.ts`, remplacer la constante `CLES` et le `describe.each` par une déclaration des marques attendues :

```ts
/** Marque obligatoire dans le CORPS de chaque famille de gabarits. */
const MARQUES_PAR_FAMILLE: Record<string, string> = {
  generique: "{objets}",
  "jeux-video": "{objets}",
  "set-designer": "{objets}",
  mode: "{objets}",
  art: "{objets}",
  rares: "{nombre}",
  benefice: "{montant}",
  chiffre: "{montant}",
  marge: "{montant}",
  categorie: "{categorie}",
};

describe.each([
  ["EN", QUETES_GABARITS_EN],
  ["ES", QUETES_GABARITS_ES],
  ["EL", QUETES_GABARITS_EL],
] as const)("gabarits périodiques %s", (_, ov) => {
  test("chaque famille a ≥1 variante indexée depuis #0, avec sa marque", () => {
    for (const [cle, marque] of Object.entries(MARQUES_PAR_FAMILLE)) {
      expect(ov[`${cle}#0`]).toBeDefined();
      const tous = Object.entries(ov).filter(([k]) => k.startsWith(`${cle}#`));
      expect(tous.length).toBeGreaterThan(0);
      for (const [, g] of tous) expect(g.corps.join(" ")).toContain(marque);
    }
  });

  test("aucune famille orpheline dans l'overlay", () => {
    for (const k of Object.keys(ov)) {
      const famille = k.slice(0, k.lastIndexOf("#"));
      expect(Object.keys(MARQUES_PAR_FAMILLE)).toContain(famille);
    }
  });
});
```

Ajouter aussi le test de bout en bout de la régénération :

```ts
test("quête chiffrée régénérée dans la locale, sans marque résiduelle", () => {
  const payload = {
    type: "mission" as const,
    categorie: "hebdomadaire" as const,
    expediteurId: "mode",
    titre: "TITRE FR PERSISTÉ",
    corps: ["CORPS FR PERSISTÉ"],
    cibles: [],
    recompense: { argent: 210 },
    gabaritId: "categorie#0",
    gabaritParams: { nombre: 5, categorie: "Mode" as const },
  };
  const courrier = { id: "heb_test_1", payload };
  for (const loc of ["en", "es", "el"] as const) {
    const tout = [titreCourrier(courrier, loc), ...corpsCourrier(courrier, loc)].join(" ");
    expect(tout).not.toContain("PERSISTÉ");
    expect(tout).not.toMatch(/\{[a-z]+\}/);
    expect(tout).not.toContain("Mode"); // la catégorie doit sortir TRADUITE
  }
});
```

> Le dernier `expect` est volontairement sévère : « Mode » en français dans une phrase
> grecque est exactement le défaut qu'on veut interdire. Si la traduction EN d'une
> catégorie coïncide avec le mot français, restreindre l'assertion aux locales `es` et `el`.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/lib/i18n/contenu/quetesGabarits.test.ts
```

Attendu : ÉCHEC — les familles `rares` / `benefice` / `chiffre` / `marge` / `categorie` n'existent dans aucun overlay.

- [ ] **Step 3 : Élargir l'interpolation dans `contenu/index.ts`**

Élargir le type des paramètres — dans `PayloadCourrier` :

```ts
type PayloadCourrier = {
  titre: string;
  corps: string[];
  gabaritId?: string;
  gabaritParams?: { etatMin?: EtatObjet; nombre?: number; montant?: number; categorie?: CategorieObjet };
  cibles?: MissionCible[];
};
```

Ajouter les formateurs par locale dans `MISE_EN_FORME_GABARIT`, à côté de `objets` et `etat`. Le montant suit la convention monétaire de la locale ; la catégorie passe par `libelleCategorie` :

```ts
const MISE_EN_FORME_GABARIT: Record<
  LocaleTraduite,
  {
    objets: (cibles: MissionCible[], locale: LocaleTraduite) => string;
    etat: (etatMin: EtatObjet | undefined, locale: LocaleTraduite) => string;
    montant: (n: number) => string;
    categorie: (c: CategorieObjet | undefined, locale: LocaleTraduite) => string;
  }
> = {
  en: {
    /* … objets et etat inchangés … */
    montant: (n) => `€${n.toLocaleString("en-GB")}`,
    categorie: (c, locale) => (c ? libelleCategorie(c, DICTIONNAIRES[locale]) : ""),
  },
  es: {
    /* … */
    montant: (n) => `${n.toLocaleString("es-ES")} €`,
    categorie: (c, locale) => (c ? libelleCategorie(c, DICTIONNAIRES[locale]) : ""),
  },
  el: {
    /* … */
    montant: (n) => `${n.toLocaleString("el-GR")} €`,
    categorie: (c, locale) => (c ? libelleCategorie(c, DICTIONNAIRES[locale]) : ""),
  },
};
```

> Importer `libelleCategorie` depuis `@/lib/i18n/libelles` et `CategorieObjet` depuis `@/types/game`.

Puis élargir `resoudreGabaritCore` — nouveau paramètre `params`, et interpolation des trois marques :

```ts
function resoudreGabaritCore(
  gabaritId: string | undefined,
  cibles: MissionCible[],
  etatMin: EtatObjet | undefined,
  locale: LocaleTraduite,
  params: { nombre?: number; montant?: number; categorie?: CategorieObjet } = {},
): { titre: string; corps: string[] } | null {
```

et, à la place du `fill` existant :

```ts
  const fill = (s: string) =>
    s
      .replaceAll("{objets}", objets)
      .replaceAll("{etat}", etat)
      .replaceAll("{nombre}", String(params.nombre ?? 0))
      .replaceAll("{montant}", fmt.montant(params.montant ?? 0))
      .replaceAll("{categorie}", fmt.categorie(params.categorie, locale));
```

Enfin, `resoudreGabarit` transmet les paramètres :

```ts
function resoudreGabarit(
  payload: PayloadCourrier,
  locale: LocaleTraduite,
): { titre: string; corps: string[] } | null {
  return resoudreGabaritCore(
    payload.gabaritId,
    payload.cibles ?? [],
    payload.gabaritParams?.etatMin,
    locale,
    {
      nombre: payload.gabaritParams?.nombre,
      montant: payload.gabaritParams?.montant,
      categorie: payload.gabaritParams?.categorie,
    },
  );
}
```

> `titreDepuisGabarit` (voie grand livre) appelle aussi `resoudreGabaritCore` : le nouveau
> paramètre ayant une valeur par défaut, cet appel reste valide sans modification.

- [ ] **Step 4 : Écrire les overlays des trois langues**

Dans chacun des trois fichiers `src/lib/i18n/contenu/{en,es,el}/quetesGabarits.ts`, ajouter les cinq familles, **deux variantes chacune** (`#0` et `#1`), pour correspondre au FR.

**Ce ne sont pas des calques du français.** Chaque langue garde le ton du jeu : le vieux marchand un peu bourru en FR, plus sec en EN, plus chaleureux en ES. Reprendre le ton déjà établi dans les familles existantes du même fichier.

Exemple pour l'anglais — à écrire dans le même style pour ES et EL :

```ts
  "rares#0": {
    titre: "An eye for the good stuff",
    corps: ["Hello,", "Word is you've got an eye. Bring back {nombre} rare pieces from your next rounds and I'll know who to call."],
  },
  "rares#1": {
    titre: "Nothing but the best",
    corps: ["Dear picker,", "Everyday clutter bores me. {nombre} rare pieces, not one less — show me what you can dig up."],
  },
  "benefice#0": {
    titre: "Mind the margin",
    corps: ["Hi,", "Anyone can buy. Clear {montant} in profit this week and we'll talk about your trade."],
  },
  "benefice#1": {
    titre: "Where the money is",
    corps: ["Hello,", "A wager: {montant} in profit before the week is out. You deliver, I pay."],
  },
  "chiffre#0": {
    titre: "Keep the shop moving",
    corps: ["Hello,", "Never mind the margin — I want to see movement. {montant} in sales this week."],
  },
  "chiffre#1": {
    titre: "Make the till sing",
    corps: ["Hi,", "Let that till sing — {montant} taken before Sunday."],
  },
  "marge#0": {
    titre: "The big one",
    corps: ["Dear colleague,", "Everyone sells plenty. Few land THE one. Make {montant} of margin on a single sale."],
  },
  "marge#1": {
    titre: "One will do",
    corps: ["Hello,", "One fine sale beats ten middling ones. {montant} of margin, on a single piece."],
  },
  "categorie#0": {
    titre: "Specialist wanted",
    corps: ["Hello,", "I need someone who knows their aisle. Sell {nombre} items from {categorie} and you'll have my trust."],
  },
  "categorie#1": {
    titre: "Clear the shelf",
    corps: ["Hi,", "My {categorie} stock is overflowing. Move {nombre} of them for me and I'll owe you one."],
  },
```

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/lib/i18n
```

Attendu : SUCCÈS, y compris `locales.test.ts` (parité générale des dictionnaires).

- [ ] **Step 6 : Commit**

```bash
git add src/lib/i18n/contenu
git commit -m "feat(i18n): gabarits des quêtes chiffrées en EN/ES/EL"
```

---

### Task 8 : Les libellés du carnet

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts:653-659` (et les trois autres dictionnaires)
- Modify: `src/components/mobile/qg/overlays/CommandeRow.tsx:106-127` et `:169-178`
- Test: `src/components/mobile/qg/overlays/CommandeRow.test.tsx`

**Interfaces:**
- Consumes: les trois types d'objectifs (tâche 1).
- Produces: rien pour les tâches suivantes — c'est la dernière.

**Deux choses à corriger, pas une.**

1. `libelleObjectif` ne connaît pas les trois nouveaux types : sans ses branches, TypeScript refuse de compiler (le `switch` est exhaustif).
2. **Le suffixe « € » est appliqué à tort.** Ligne 177 et ligne 268, la condition est `o.type !== "niveau" && o.type !== "restauration"` — c'est-à-dire « tout le reste est en euros ». `objetsRares` et `ventesCategorie` comptent des **objets** : sans correctif, le carnet afficherait **« 3 / 5 € »** pour « vends 5 objets ».

- [ ] **Step 1 : Écrire les tests qui échouent**

À ajouter dans `src/components/mobile/qg/overlays/CommandeRow.test.tsx`. Le fichier a déjà `courrierMission()`, `createMockGameState` et `screen` — ajouter à côté une fabrique de courrier chiffré :

```ts
function courrierChiffre(objectif: ObjectifMission): Courrier {
  return {
    id: "m2", type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "hebdomadaire", expediteurId: "mode",
      titre: "Quête chiffrée", corps: ["Vas-y."],
      cibles: [], objectifs: [objectif], recompense: { argent: 210 },
    },
  };
}
```

> Ajouter `ObjectifMission` à l'import de types depuis `@/types/game`.

```tsx
describe("objectifs chiffrés", () => {
  it("un objectif qui compte des objets n'a PAS de suffixe €", () => {
    const state = createMockGameState({ missions: [{ courrierId: "m2", statut: "active" }] });
    render(
      <CommandeRow
        courrier={courrierChiffre({ type: "ventesCategorie", categorie: "Mode", nombre: 5 })}
        state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}}
      />,
    );
    const compteur = screen.getByTestId("progression-compteur").textContent ?? "";
    expect(compteur).toContain("5");
    expect(compteur).not.toContain("€");
  });

  it("un objectif en argent garde son suffixe €", () => {
    const state = createMockGameState({ missions: [{ courrierId: "m2", statut: "active" }] });
    render(
      <CommandeRow
        courrier={courrierChiffre({ type: "beneficeCumule", montant: 850 })}
        state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}}
      />,
    );
    expect(screen.getByTestId("progression-compteur").textContent ?? "").toContain("€");
  });

  it("objets rares : compteur sans € et libellé sans marque non remplacée", () => {
    const state = createMockGameState({ missions: [{ courrierId: "m2", statut: "active" }] });
    const { container } = render(
      <CommandeRow
        courrier={courrierChiffre({ type: "objetsRares", nombre: 3 })}
        state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}}
      />,
    );
    expect(screen.getByTestId("progression-compteur").textContent ?? "").not.toContain("€");
    expect(container.textContent ?? "").not.toMatch(/\{[a-z]+\}/);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/overlays/CommandeRow.test.tsx
```

Attendu : ÉCHEC (compilation, ou suffixe « € » de trop).

- [ ] **Step 3 : Ajouter les trois libellés dans les quatre dictionnaires**

Dans `src/lib/i18n/ui/fr.ts`, à l'intérieur de `carnet.objectifs` :

```ts
      objetsRares: "Objets rares trouvés",
      beneficeCumule: "Bénéfice réalisé",
      ventesCategorie: "Objets vendus ({categorie})",
```

Les mêmes clés dans `en.ts`, `es.ts`, `el.ts` :

```ts
// en.ts
      objetsRares: "Rare finds",
      beneficeCumule: "Profit made",
      ventesCategorie: "Items sold ({categorie})",
// es.ts
      objetsRares: "Piezas raras encontradas",
      beneficeCumule: "Beneficio obtenido",
      ventesCategorie: "Objetos vendidos ({categorie})",
// el.ts
      objetsRares: "Σπάνια ευρήματα",
      beneficeCumule: "Κέρδος που επιτεύχθηκε",
      ventesCategorie: "Αντικείμενα που πουλήθηκαν ({categorie})",
```

- [ ] **Step 4 : Compléter `libelleObjectif` et corriger le suffixe**

Dans `src/components/mobile/qg/overlays/CommandeRow.tsx`, ajouter aux imports :

```ts
import { libelleCategorie } from "@/lib/i18n/libelles";
```

*(`libelleEtat` vient déjà de ce module — compléter l'import existant.)*

Ajouter les trois branches au `switch` de `libelleObjectif` :

```ts
    case "objetsRares":
      return d.carnet.objectifs.objetsRares;
    case "beneficeCumule":
      return d.carnet.objectifs.beneficeCumule;
    case "ventesCategorie":
      return tr(d.carnet.objectifs.ventesCategorie, { categorie: libelleCategorie(o.categorie, d) });
```

Ajouter, juste après `libelleObjectif`, le prédicat qui décide du suffixe :

```ts
/**
 * Un objectif se compte-t-il en euros ? La liste est EXPLICITE et non une
 * négation : « tout sauf niveau et restauration » avait fait afficher
 * « 3 / 5 € » pour un objectif qui compte des objets.
 */
function objectifEnEuros(type: ObjectifMission["type"]): boolean {
  return type === "ventesCumulees" || type === "profitVente" || type === "beneficeCumule";
}
```

Puis remplacer les **deux** conditions de suffixe. Ligne ~177, dans le calcul de `compteur` :

```ts
  const compteur = objectifChiffre && progPremierObjectif
    ? `${accompli ? progPremierObjectif.cible : progPremierObjectif.actuel} / ${progPremierObjectif.cible}${objectifEnEuros(objectifChiffre.type) ? " €" : ""}`
    : `${accompli ? totalObjectifs : rempliesObjectifs}/${totalObjectifs}`;
```

Ligne ~268, dans la liste dépliée des objectifs :

```ts
                  {accompli ? progObj.cible : progObj.actuel}/{progObj.cible}{objectifEnEuros(o.type) ? " €" : ""}
```

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/overlays
```

Attendu : SUCCÈS.

- [ ] **Step 6 : Suite complète et lint**

```bash
npx vitest run --maxWorkers=4
npx tsc --noEmit
npx eslint src
```

Attendu : SUCCÈS partout. Le nombre total de tests doit avoir augmenté d'environ 25.

- [ ] **Step 7 : Commit**

```bash
git add src/lib/i18n/ui src/components/mobile/qg/overlays/CommandeRow.tsx src/components/mobile/qg/overlays/CommandeRow.test.tsx
git commit -m "feat(carnet): libellés des nouveaux objectifs et correctif du suffixe €"
```

---

## Recette manuelle (après la tâche 8)

Le plan est couvert par des tests unitaires, mais deux choses ne se vérifient qu'à l'œil.

1. **Voir les nouvelles quêtes.** Lancer `npm run dev`, charger une partie de niveau ≥ 3, ouvrir le carnet. Les hebdomadaires doivent montrer des formes variées, avec un texte français lisible et **aucune accolade** à l'écran.
2. **Vérifier les quatre langues.** Changer de langue dans les réglages et rouvrir le carnet : le texte doit être régénéré, la catégorie traduite, le montant au format local.

> ⚠️ `localhost` obligatoire pour les captures Playwright — `127.0.0.1` est bloqué et
> l'app reste figée sur « Ouverture du local… ».

## Ce que ce plan ne fait pas

Aucune refonte visuelle. Le carnet reste tel quel : les nouvelles quêtes s'y affichent sous forme de ligne de texte, ce qui est austère mais juste. La refonte est le chantier ②, dont toutes les décisions déjà prises sont consignées en annexe A de la spec.
