# Tutoriel v2 — polish post-recette : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer les 7 chantiers du polish : lisibilité 60+, fixes de superposition, phase « retrouve ta peluche », colis fixe avant l'étal, coffre Tetris pré-rempli + démo du grand-père, pricing guidé, journée de vente scriptée à 3 acheteurs connus.

**Architecture:** Extension du scénario déclaratif existant (`src/data/tutorielScenario.ts` + helpers purs) : le colis, le préfill du coffre, les prix conseillés et la file d'acheteurs deviennent des données scriptées consommées par les pages. `TutorielEtape` passe de 17 à 20 valeurs (retour d'`ouvrir-colis`, `premiere-vente` → `vente-refus`/`vente-directe`/`vente-nego`) SANS bump de `SAVE_VERSION` (la v19 n'a jamais shippé).

**Tech Stack:** Next.js/React/TypeScript, vitest, i18n 4 langues (FR source), sharp (conversion d'assets, script one-off).

**Spec:** `docs/superpowers/specs/2026-08-09-tutoriel-polish-design.md`

## Global Constraints

- **Tests** : `npx vitest run <fichier> --maxWorkers=4` — drapeau OBLIGATOIRE sur ce Mac. Suite complète : `npx vitest run --maxWorkers=4`.
- **Lint** : `npx eslint <chemins>` (`npm run lint` est cassé).
- **PAS de bump `SAVE_VERSION`** (reste 19) : les nouvelles étapes s'ajoutent au type, les retirées sont absorbées par la normalisation existante (« hors `ETAPES_TUTORIEL` ⇒ termine »).
- **i18n** : toute clé UI dans les QUATRE fichiers `src/lib/i18n/ui/{fr,en,es,el}.ts` ; tout dialogue dans `src/data/dialogues.ts` + overlays `src/lib/i18n/contenu/{en,es,el}/dialogues.ts` (parité testée).
- **Étapes cibles (20)** : `accueil, aller-chiner, chine-nego-echec, chine-achat-direct, chine-nego-un, chine-nego-deux, chine-sortir, stockage-ouvrir, stockage-focus, collection-envoyer, collection-lecon, ouvrir-colis, preparer-etal, coffre-trace-un, coffre-trace-deux, vente-refus, vente-directe, vente-nego, conclusion, termine`.
- **Chiffres scriptés de la vente** (dérivés de la mécanique réelle, prouvés par tests en Task 3) : prix conseillés manette **22 €** / carafe **26 €** ; radin : vise la carafe, `offreInitiale 16`, `prixMax 17`, bornes joueur `[22, 24]`, persona `{margePct dérivée, elanPct 0.25, patience 6, tolerancePct 0.55, sangFroid 0.95}` → aucune vente possible, aucune insulte possible ; ami direct : manette au prix affiché 22 ; négociatrice : carafe, `offreInitiale 18`, `prixMax 26` (= cible ≥ borne max), bornes `[24, 26]`, persona `{elanPct 0.85, patience 5, tolerancePct 0.6, sangFroid 0.95}` → accord ≤ 2 tours garanti.
- **Acheteurs scriptés** (personnages nommés tier 1, `src/data/clients.ts:304+`) : radin = « Maxime du puçier », direct = « Léo le rétro » (préférence Jeux & Loisirs), négo = « Bérénice la déco » (préférence Maison). Un test vérifie que `getClientIllustration(p.id)` est défini pour les trois — si un portrait manque, remplacer par un personnage du MÊME archétype qui en a un.
- **Colis scripté (5 objets fixes)** : proposition initiale — `mus.ukulele_soprano` (Bon), `br.boite_outils_complete` (Bon), `ma.lampe_globe_opaline` (Bon), `art.boite_marqueterie_florentine` (Très bon), rare final `mus.boite_musique_mecanique` (Très bon). Un test valide : 5 templates existants, illustrés (`ITEMS_WITH_IMAGE`), tailles ∈ {XS,S,M}, 4 communs + 1 rare, aucun doublon avec `SESSION_TUTORIEL` ni la peluche. Si un candidat échoue, le remplacer par un template de même catégorie/gamme qui passe — ne JAMAIS affaiblir le test.
- Z-index inchangés : DialogueOverlay 120 > coach 100 > bannière 90 > barre session 50 > FloatingRoom 35 > TabBar 30/40.
- Commits fréquents `feat(tuto): …` / `fix(tuto): …`, suffixe `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1 : Lisibilité 60+ et fixes visuels

**Files:**
- Modify: `src/components/mobile/dialogue/DialogueOverlay.tsx:81-86`
- Modify: `src/components/mobile/tutoriel/TutorielCoach.tsx` (style de la bulle)
- Modify: `src/components/mobile/tutoriel/TutorielBanniere.tsx:31-35, 58-59`
- Create: `src/lib/coachActif.ts`
- Modify: `src/components/InventoryGrid.tsx` (ligne guidée surélevée)
- Test: `src/lib/coachActif.test.ts`

**Interfaces:**
- Produces: `src/lib/coachActif.ts` —

```ts
export function setCoachOuvert(ouvert: boolean): void;
export function subscribeCoachOuvert(cb: () => void): () => void;
export function getCoachOuvert(): boolean;
```

- [ ] **Step 1 : test qui échoue** — `src/lib/coachActif.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { getCoachOuvert, setCoachOuvert, subscribeCoachOuvert } from "./coachActif";

describe("coachActif", () => {
  it("publie l'état et notifie les abonnés", () => {
    const cb = vi.fn();
    const off = subscribeCoachOuvert(cb);
    expect(getCoachOuvert()).toBe(false);
    setCoachOuvert(true);
    expect(getCoachOuvert()).toBe(true);
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    setCoachOuvert(false);
    expect(cb).toHaveBeenCalledTimes(1); // désabonné
  });
  it("ne notifie pas si la valeur ne change pas", () => {
    const cb = vi.fn();
    const off = subscribeCoachOuvert(cb);
    setCoachOuvert(false);
    expect(cb).not.toHaveBeenCalled();
    off();
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/coachActif.test.ts --maxWorkers=4` → FAIL (module absent).

- [ ] **Step 3 : implémentation.**

`src/lib/coachActif.ts` (calqué sur le pattern pub/sub d'`affichageGele`) :

```ts
/**
 * Un TutorielCoach est-il ouvert ? La bannière du tutoriel s'y abonne pour
 * se masquer pendant une visite guidée : sa découpe lumineuse laissait
 * sinon transparaître la bannière (z 90 < voile 100) — jusqu'à faire
 * croire que « Passer le tutoriel » était la cible (recette 2026-08-09).
 */
let coachOuvert = false;
const abonnes = new Set<() => void>();

export function getCoachOuvert(): boolean {
  return coachOuvert;
}

export function setCoachOuvert(ouvert: boolean): void {
  if (ouvert === coachOuvert) return;
  coachOuvert = ouvert;
  for (const cb of abonnes) cb();
}

export function subscribeCoachOuvert(cb: () => void): () => void {
  abonnes.add(cb);
  return () => abonnes.delete(cb);
}
```

`TutorielCoach.tsx` : dans un `useEffect` de montage, `setCoachOuvert(true)` et cleanup `setCoachOuvert(false)`.
`TutorielBanniere.tsx` : `const coachOuvert = useSyncExternalStore(subscribeCoachOuvert, getCoachOuvert, () => false);` et la condition l.58 devient `estRoutePartie(pathname) && !!state && tutorielActif(state) && !coachOuvert` (le cleanup existant l.86-89 libère `--tuto-banniere-h`).

Typo :
- `DialogueOverlay.tsx:81-86` : `texteStyle` → `fontFamily: "var(--font-serif)"`, `fontSize: 21`, `fontWeight: 500`, `lineHeight: 1.45` (couleur inchangée).
- `TutorielCoach.tsx` : la bulle passe à `fontSize: 18` (serif déjà).
- `TutorielBanniere.tsx:31-35` : `fontSize: 12` → `13`.

Ligne guidée surélevée : dans le composant de ligne du stockage (`StockageItemRow`, cf. `grep -rn "guideCollection" src/components`), quand `guideCollection` est vrai, le wrapper de la ligne reçoit `position: "relative", zIndex: 37` (au-dessus des lignes sœurs ET de la fenêtre flottante 35 — la main `tuto-main-haut` ne passe plus derrière la ligne du dessus).

- [ ] **Step 4 : vérifier** — test coachActif PASS ; `npx tsc --noEmit` (ignorer les erreurs pré-existantes du fichier untracked `scripts/_gen-saves-evenements.ts`) ; `npx eslint src/lib/coachActif.ts src/components/mobile/tutoriel src/components/mobile/dialogue src/components/InventoryGrid.tsx` → 0 erreur ; suite complète.

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): lisibilité 60+ (serif 21px) et bannière masquée pendant le coach"`.

---

### Task 2 : Étapes v3, i18n, porte, remaps

**Files:**
- Modify: `src/types/game.ts` (type `TutorielEtape`)
- Modify: `src/lib/tutoriel.ts` (`ETAPES_TUTORIEL`, `ongletTutorielPermis`)
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (`tutoriel.instructions`)
- Modify: `src/app/(qg)/layout.tsx` (pulse porte découplé, `portePermise`, PorteSheet)
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (remaps compilation `premiere-vente` → `vente-*`)
- Test: `src/lib/tutoriel.test.ts`, `src/lib/migrations.test.ts`

**Interfaces:**
- Produces: le type à 20 valeurs (liste EXACTE en Global Constraints), `ETAPES_TUTORIEL` même ordre, `portePulse(etape)` helper.

- [ ] **Step 1 : tests qui échouent** — dans `src/lib/tutoriel.test.ts`, remplacer l'assertion d'ordre par la liste à 20 valeurs (Global Constraints) et ajouter :

```ts
import { portePulse } from "./tutoriel";

describe("portePulse — la porte ne pulse que quand elle est le chemin", () => {
  it("pulse aux étapes prescrites", () => {
    for (const e of ["aller-chiner", "chine-nego-echec", "chine-achat-direct",
      "chine-nego-un", "chine-nego-deux", "preparer-etal",
      "vente-refus", "vente-directe", "vente-nego"] as const) {
      expect(portePulse(e), e).toBe(true);
    }
  });
  it("ne pulse pas à chine-sortir ni pendant stockage/collection/colis", () => {
    for (const e of ["chine-sortir", "stockage-ouvrir", "stockage-focus",
      "collection-envoyer", "collection-lecon", "ouvrir-colis",
      "coffre-trace-un", "coffre-trace-deux", "accueil", "conclusion", "termine"] as const) {
      expect(portePulse(e), e).toBe(false);
    }
  });
});
```

Dans `src/lib/migrations.test.ts`, ajouter au describe v19 :

```ts
it("normalise premiere-vente (étape v2 disparue) vers termine", () => {
  const s = { ...createMockGameState(), version: SAVE_VERSION, tutorielEtape: "premiere-vente" };
  expect(migrerSauvegarde(s as unknown as GameState).tutorielEtape).toBe("termine");
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/tutoriel.test.ts src/lib/migrations.test.ts --maxWorkers=4` → FAIL.

- [ ] **Step 3 : implémentation.**
- `src/types/game.ts` + `ETAPES_TUTORIEL` : la liste à 20 valeurs (retirer `premiere-vente`, insérer `ouvrir-colis` après `collection-lecon`, `vente-refus`/`vente-directe`/`vente-nego` avant `conclusion`). Mettre à jour le commentaire du type.
- `src/lib/tutoriel.ts` :

```ts
/**
 * La porte du bureau pulse uniquement quand la franchir est l'action
 * prescrite. Elle reste TAPABLE sur un ensemble plus large (portePermise,
 * anti-soft-lock) — le pulse parasite au retour du chinage venait de la
 * confusion des deux rôles (recette 2026-08-09).
 */
export function portePulse(etape: TutorielEtape): boolean {
  switch (etape) {
    case "aller-chiner":
    case "chine-nego-echec":
    case "chine-achat-direct":
    case "chine-nego-un":
    case "chine-nego-deux":
    case "preparer-etal":
    case "vente-refus":
    case "vente-directe":
    case "vente-nego":
      return true;
    default:
      return false;
  }
}
```

  et `ongletTutorielPermis` : ajouter `case "ouvrir-colis": return "/bureau";` (le joueur revient de la collection).
- `(qg)/layout.tsx` : `portePermise` — remplacer `etape === "premiere-vente"` par les 3 `vente-*` et AJOUTER `ouvrir-colis` n'y figure PAS (la porte n'est pas permise pendant le colis — le colis est devant elle) ; `pulse={portePulse(etape ?? "termine") && !porteOuverte}` (import depuis `@/lib/tutoriel`) ; `PorteSheet` : `tutoEtaler={etape === "preparer-etal" || etape === "coffre-trace-un" || etape === "coffre-trace-deux" || etape === "vente-refus" || etape === "vente-directe" || etape === "vente-nego"}`.
- `journee/ClientPage.tsx` remaps de compilation (le vrai flux arrive en Task 10) : l'entrée (l.~669 `etape === "coffre-trace-deux"`) reste ; son onFini `avancerTutoriel("premiere-vente")` (l.~1228) → `avancerTutoriel("vente-refus")` ; les conditions `etape === "premiere-vente"` (vente conclue l.~737/764, `tutoMainJoueur` l.~1080) → `etape === "vente-nego"` provisoirement ; `grep -n '"premiere-vente"' src/` → zéro occurrence vivante.
- i18n `tutoriel.instructions` (4 langues) : retirer `premiere-vente`, ajouter :
  - `"ouvrir-colis": "Ouvre le colis du grand-père, devant la porte."` (EN `"Open your grandfather's parcel, by the door."`, ES/EL à traduire)
  - `"vente-refus": "Ce client offre trop peu — laisse tomber, sans regret."` (EN `"This customer offers too little — walk away, no regrets."`)
  - `"vente-directe": "Il prend la manette au prix affiché : accepte !"` (EN `"He'll take the controller at the asking price: accept!"`)
  - `"vente-nego": "Négocie la carafe — tiens ton prix, elle montera."` (EN `"Haggle over the carafe — hold your price, she'll come up."`)

- [ ] **Step 4 : vérifier** — tests PASS, `npx tsc --noEmit` propre (hors untracked connu), suite complète verte.

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): étapes v3 (colis + 3 leçons de vente), pulse de porte découplé"`.

---

### Task 3 : Données du scénario v3 + garanties prouvées

**Files:**
- Modify: `src/data/tutorielScenario.ts`
- Modify: `src/data/tutorielScenario.test.ts`

**Interfaces:**
- Consumes: `ClientPersonnage`, `ALL_PERSONNAGES` (`src/data/clients.ts:304`), `getClientIllustration` (`src/lib/personaIllustrations.ts:198`), `proposerOffre`/`ouvrirNegociation`/`ALEA_NEGO_SCRIPTEE` (`src/lib/negociation.ts`), `ITEMS_WITH_IMAGE`, `getTemplate`/`tailleDe`.
- Produces:

```ts
export interface ObjetColisScenario { templateId: string; etat: EtatObjet; }
export const COLIS_TUTORIEL_SCRIPTE: readonly ObjetColisScenario[]; // 5, rare en DERNIER
export interface PrefillCoffre { templateId: string; posX: number; posY: number; rotation: number; prixVente: number; }
export const PREFILL_COFFRE_TUTORIEL: readonly PrefillCoffre[]; // 3 (indices 0..2 du colis)
export const PRIX_CONSEILLES_TUTORIEL: Readonly<Record<string, number>>; // { manette: 22, carafe: 26 }
export const TOLERANCE_PRIX_CONSEILLE = 2;
export interface AcheteurScenario {
  personnageNom: string;              // nom EXACT dans ALL_PERSONNAGES
  templateIdCible: string;
  mode: "achat-direct" | "negociation";
  offreInitiale?: number;             // négociation seulement
  prixMax: number;                    // budget max du client
  bornesOffre?: { min: number; max: number }; // bornes du curseur joueur
  persona: NegoPersona;               // axes figés (négociation)
}
export const SESSION_VENTE_TUTORIEL: readonly AcheteurScenario[]; // [refus, direct, nego]
export function acheteurDeLEtape(etape: TutorielEtape): AcheteurScenario | null;
export function personnageScenario(a: AcheteurScenario): ClientPersonnage; // résout par nom, throw si absent
```

- [ ] **Step 1 : tests qui échouent** — ajouter à `src/data/tutorielScenario.test.ts` :

```ts
import { getClientIllustration } from "@/lib/personaIllustrations";
import { ITEMS_WITH_IMAGE } from "@/lib/itemImages";
import { tailleDe, getTemplate } from "@/data/objetTemplates";
import { ALEA_NEGO_SCRIPTEE, ouvrirNegociation, proposerOffre } from "@/lib/negociation";
import {
  acheteurDeLEtape, COLIS_TUTORIEL_SCRIPTE, personnageScenario,
  PREFILL_COFFRE_TUTORIEL, PRIX_CONSEILLES_TUTORIEL, SESSION_VENTE_TUTORIEL,
  TOLERANCE_PRIX_CONSEILLE, TRACES_TUTORIEL, SESSION_TUTORIEL, PELUCHE_TEMPLATE_ID,
} from "./tutorielScenario";

describe("COLIS_TUTORIEL_SCRIPTE", () => {
  it("5 objets connus, illustrés, petits, 4 communs + 1 rare en dernier", () => {
    expect(COLIS_TUTORIEL_SCRIPTE).toHaveLength(5);
    const dejaVus = new Set([...SESSION_TUTORIEL.map((s) => s.templateId), PELUCHE_TEMPLATE_ID]);
    for (const o of COLIS_TUTORIEL_SCRIPTE) {
      const t = getTemplate(o.templateId);
      expect(t, o.templateId).toBeDefined();
      expect(ITEMS_WITH_IMAGE.has(o.templateId), o.templateId).toBe(true);
      expect(["XS", "S", "M"], o.templateId).toContain(tailleDe(t!));
      expect(dejaVus.has(o.templateId), o.templateId).toBe(false);
    }
    expect(COLIS_TUTORIEL_SCRIPTE.slice(0, 4).every((o) => getTemplate(o.templateId)!.rarete === "commun")).toBe(true);
    expect(getTemplate(COLIS_TUTORIEL_SCRIPTE[4].templateId)!.rarete).toBe("rare");
  });
});

describe("PREFILL_COFFRE_TUTORIEL", () => {
  it("3 objets pris dans le colis, dans les bornes, sans chevaucher les traces (bbox)", () => {
    expect(PREFILL_COFFRE_TUTORIEL).toHaveLength(3);
    const colisIds = new Set(COLIS_TUTORIEL_SCRIPTE.map((o) => o.templateId));
    for (const p of PREFILL_COFFRE_TUTORIEL) {
      expect(colisIds.has(p.templateId), p.templateId).toBe(true);
      expect(p.posX).toBeGreaterThan(0.1); expect(p.posX).toBeLessThan(0.9);
      expect(p.posY).toBeGreaterThan(0.1); expect(p.posY).toBeLessThan(0.9);
      expect(p.prixVente).toBeGreaterThan(0);
    }
    // Écart minimal entre chaque objet verrouillé et chaque trace (les
    // formes réelles sont plus petites que ces disques — garde grossière).
    for (const p of PREFILL_COFFRE_TUTORIEL) {
      for (const t of TRACES_TUTORIEL) {
        expect(Math.hypot(p.posX - t.posX, p.posY - t.posY), `${p.templateId}↔${t.templateId}`).toBeGreaterThan(0.16);
      }
    }
  });
});

describe("traces v3", () => {
  it("manette pivotée (démo), carafe remontée", () => {
    expect(TRACES_TUTORIEL[0].rotation).toBeGreaterThanOrEqual(20);
    expect(TRACES_TUTORIEL[1].posY).toBeLessThanOrEqual(0.45);
  });
});

describe("PRIX_CONSEILLES_TUTORIEL", () => {
  it("couvre manette et carafe, dans l'échelle du PrixSlider (1..2×réf)", () => {
    const manette = getTemplate("jx.manette_vibraduo")!;
    const carafe = getTemplate("ma.carafe_cristal_taille")!;
    // états scriptés du chinage : manette Très bon (réf 18), carafe Bon (réf 21)
    expect(PRIX_CONSEILLES_TUTORIEL["jx.manette_vibraduo"]).toBeLessThanOrEqual(18 * 2);
    expect(PRIX_CONSEILLES_TUTORIEL["ma.carafe_cristal_taille"]).toBeLessThanOrEqual(21 * 2);
    expect(TOLERANCE_PRIX_CONSEILLE).toBeGreaterThan(0);
    void manette; void carafe;
  });
});

describe("SESSION_VENTE_TUTORIEL — garanties", () => {
  it("3 acheteurs résolus (personnage nommé + portrait) visant des objets du coffre", () => {
    expect(SESSION_VENTE_TUTORIEL).toHaveLength(3);
    for (const a of SESSION_VENTE_TUTORIEL) {
      const p = personnageScenario(a);
      expect(getClientIllustration(p.id), p.nom).toBeDefined();
      expect(["jx.manette_vibraduo", "ma.carafe_cristal_taille"]).toContain(a.templateIdCible);
    }
    expect(SESSION_VENTE_TUTORIEL.map((a) => a.mode)).toEqual(["negociation", "achat-direct", "negociation"]);
  });
  it("acheteurDeLEtape mappe les 3 étapes de vente", () => {
    expect(acheteurDeLEtape("vente-refus")).toBe(SESSION_VENTE_TUTORIEL[0]);
    expect(acheteurDeLEtape("vente-directe")).toBe(SESSION_VENTE_TUTORIEL[1]);
    expect(acheteurDeLEtape("vente-nego")).toBe(SESSION_VENTE_TUTORIEL[2]);
    expect(acheteurDeLEtape("conclusion")).toBeNull();
  });
  it("radin : AUCUNE offre bornée ne peut conclure ni insulter", () => {
    const a = SESSION_VENTE_TUTORIEL[0];
    // borne min > prixMax → jamais d'accord (offreRejoint vente : offre ≤ prixAdverse ≤ prixMax)
    expect(a.bornesOffre!.min).toBeGreaterThan(a.prixMax);
    // pire cas d'insulte : prixAdverse au plus bas (tour 1 = offreInitiale)
    expect(a.bornesOffre!.max).toBeLessThanOrEqual(a.offreInitiale! * (1 + a.persona.tolerancePct));
    // déroulé complet : quelle que soit l'offre constante, fin en refus_poli (patience), jamais conclu/fache
    for (let offre = a.bornesOffre!.min; offre <= a.bornesOffre!.max; offre++) {
      let nego = ouvrirNegociation("vente", a.offreInitiale!, a.prixMax);
      let tours = 0;
      while (nego.statut === "en_cours" && tours < 12) {
        nego = proposerOffre(nego, a.persona, offre, ALEA_NEGO_SCRIPTEE);
        tours++;
      }
      expect(nego.statut, `offre ${offre}`).toBe("refus_poli");
    }
  });
  it("négociatrice : la stratégie borne MAX (la plus lente) conclut dans la patience", () => {
    const a = SESSION_VENTE_TUTORIEL[2];
    expect(a.prixMax).toBeGreaterThanOrEqual(a.bornesOffre!.max); // alignement toujours atteignable
    let nego = ouvrirNegociation("vente", a.offreInitiale!, a.prixMax);
    let tours = 0;
    while (nego.statut === "en_cours" && tours < 10) {
      nego = proposerOffre(nego, a.persona, a.bornesOffre!.max, ALEA_NEGO_SCRIPTEE);
      tours++;
      expect(["en_cours", "conclu"], `tour ${tours}`).toContain(nego.statut);
    }
    expect(nego.statut).toBe("conclu");
    expect(tours).toBeLessThanOrEqual(a.persona.patience);
    // et jamais d'insulte sur la plage au prix adverse le plus bas
    expect(a.bornesOffre!.max).toBeLessThanOrEqual(a.offreInitiale! * (1 + a.persona.tolerancePct));
  });
  it("cohérence prix : l'ami paie le prix conseillé de la manette, le radin ne peut pas payer la carafe", () => {
    expect(SESSION_VENTE_TUTORIEL[1].prixMax).toBeGreaterThanOrEqual(PRIX_CONSEILLES_TUTORIEL["jx.manette_vibraduo"]);
    expect(SESSION_VENTE_TUTORIEL[0].prixMax).toBeLessThan(PRIX_CONSEILLES_TUTORIEL["ma.carafe_cristal_taille"]);
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/data/tutorielScenario.test.ts --maxWorkers=4` → FAIL.

- [ ] **Step 3 : implémentation** — dans `src/data/tutorielScenario.ts` :

```ts
import { ALL_PERSONNAGES, type ClientPersonnage } from "@/data/clients";

/* === Colis du grand-père (fixe) ======================================== */

export interface ObjetColisScenario { templateId: string; etat: EtatObjet; }

/** 4 communs + 1 rare, le rare en DERNIER (final de cérémonie). Petites
 *  tailles : les 3 premiers pré-remplissent le coffre (pièces du Tetris). */
export const COLIS_TUTORIEL_SCRIPTE: readonly ObjetColisScenario[] = [
  { templateId: "mus.ukulele_soprano", etat: "Bon" },
  { templateId: "br.boite_outils_complete", etat: "Bon" },
  { templateId: "ma.lampe_globe_opaline", etat: "Bon" },
  { templateId: "art.boite_marqueterie_florentine", etat: "Très bon" },
  { templateId: "mus.boite_musique_mecanique", etat: "Très bon" },
];

/* === Coffre Tetris ====================================================== */

export interface PrefillCoffre {
  templateId: string; posX: number; posY: number; rotation: number; prixVente: number;
}

/** Le grand-père a déjà chargé 3 pièces du colis : elles dessinent deux
 *  « trous » — la manette à gauche (pivotée, démo) et la carafe en haut à
 *  droite. Verrouillées pendant le tutoriel, prix déjà étiquetés. */
export const PREFILL_COFFRE_TUTORIEL: readonly PrefillCoffre[] = [
  { templateId: "mus.ukulele_soprano", posX: 0.2, posY: 0.32, rotation: 105, prixVente: 24 },
  { templateId: "br.boite_outils_complete", posX: 0.78, posY: 0.62, rotation: 0, prixVente: 30 },
  { templateId: "ma.lampe_globe_opaline", posX: 0.22, posY: 0.72, rotation: 0, prixVente: 36 },
];

/* Traces v3 : la manette est PIVOTÉE (c'est la démo du grand-père qui
   la tourne), la carafe remonte dans le trou haut-droit. */
export const TRACES_TUTORIEL: readonly TraceScenario[] = [
  { templateId: "jx.manette_vibraduo", posX: 0.47, posY: 0.5, rotation: 25 },
  { templateId: "ma.carafe_cristal_taille", posX: 0.62, posY: 0.38, rotation: 40 },
];

/* === Pricing guidé ====================================================== */

export const PRIX_CONSEILLES_TUTORIEL: Readonly<Record<string, number>> = {
  "jx.manette_vibraduo": 22,
  "ma.carafe_cristal_taille": 26,
};
/** Aimantation du curseur : à ± cette distance, le prix saute sur le conseil. */
export const TOLERANCE_PRIX_CONSEILLE = 2;

/* === Journée de vente scriptée ========================================= */

export interface AcheteurScenario {
  personnageNom: string;
  templateIdCible: string;
  mode: "achat-direct" | "negociation";
  offreInitiale?: number;
  prixMax: number;
  bornesOffre?: { min: number; max: number };
  persona: NegoPersona;
}

export const SESSION_VENTE_TUTORIEL: readonly AcheteurScenario[] = [
  {
    // Le radin : son plafond (17) est sous la borne basse du joueur (22) —
    // aucune vente possible ; sa tolérance borne le curseur (max 24 ≤
    // 16 × 1.55) — aucune insulte possible. Il finira par renoncer
    // poliment… sauf si le joueur le congédie d'abord (la leçon).
    personnageNom: "Maxime du puçier",
    templateIdCible: "ma.carafe_cristal_taille",
    mode: "negociation",
    offreInitiale: 16,
    prixMax: 17,
    bornesOffre: { min: 22, max: 24 },
    persona: { archetype: "radin_tuto", margePct: 0.06, elanPct: 0.25, patience: 6, tolerancePct: 0.55, sangFroid: 0.95 },
  },
  {
    // L'ami du grand-père : la manette au prix affiché, sans discuter.
    personnageNom: "Léo le rétro",
    templateIdCible: "jx.manette_vibraduo",
    mode: "achat-direct",
    prixMax: 30,
    persona: { archetype: "ami_tuto", margePct: 0, elanPct: 0.5, patience: 4, tolerancePct: 0.9, sangFroid: 0.9 },
  },
  {
    // La négociatrice : sa cible (26) couvre la borne max du joueur —
    // l'alignement conclut en ≤ 2 tours quelle que soit l'offre bornée.
    personnageNom: "Bérénice la déco",
    templateIdCible: "ma.carafe_cristal_taille",
    mode: "negociation",
    offreInitiale: 18,
    prixMax: 26,
    bornesOffre: { min: 24, max: 26 },
    persona: { archetype: "nego_tuto", margePct: 0.3, elanPct: 0.85, patience: 5, tolerancePct: 0.6, sangFroid: 0.95 },
  },
];

export function acheteurDeLEtape(etape: TutorielEtape): AcheteurScenario | null {
  if (etape === "vente-refus") return SESSION_VENTE_TUTORIEL[0];
  if (etape === "vente-directe") return SESSION_VENTE_TUTORIEL[1];
  if (etape === "vente-nego") return SESSION_VENTE_TUTORIEL[2];
  return null;
}

/** Résout le personnage nommé du scénario (throw si le casting a changé). */
export function personnageScenario(a: AcheteurScenario): ClientPersonnage {
  const p = ALL_PERSONNAGES.find((x) => x.nom === a.personnageNom);
  if (!p) throw new Error(`[tutoriel] personnage inconnu : ${a.personnageNom}`);
  return p;
}
```

(imports `EtatObjet`, `TutorielEtape` à compléter ; garder les exports existants intacts.)

- [ ] **Step 4 : vérifier** — tests du fichier PASS. Si `getClientIllustration` est indéfini pour un des trois noms, choisir un autre personnage du même archétype (liste `src/data/clients.ts:304-383`) et adapter le nom — jamais l'assertion. Si un candidat du colis échoue (image/taille/rareté), le remplacer par un template voisin qui passe et reporter le choix dans le rapport. Vérifier aussi `npx vitest run src/lib/coffreTuto.test.ts --maxWorkers=4` (les traces ont bougé — les fixtures du test utilisent `TRACES_TUTORIEL[i]` dynamiquement, elles doivent rester vertes ; si un cas « hors angle » utilisait 90° vs rotation 0, l'adapter à la nouvelle rotation 25°).

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): scénario v3 — colis fixe, préfill Tetris, prix conseillés, file d'acheteurs prouvée"`.

---

### Task 4 : Colis scripté dans le tutoriel

**Files:**
- Modify: `src/data/starterInventory.ts` (`objetColisTutoriel` scripté)
- Modify: `src/lib/tutoriel.ts` (`appliquerFinTutoriel` re-livre ; `colisEnAttente` supprimé)
- Modify: `src/app/(qg)/layout.tsx` (QgColis à l'étape `ouvrir-colis`, dialogue de remise, avance, retrait du cadeau post-carnet)
- Test: `src/lib/tutoriel.test.ts`, tests existants de `starterInventory` s'il y en a (`grep -rn "objetColisTutoriel" src --include=*.test.*`)

**Interfaces:**
- Consumes: `COLIS_TUTORIEL_SCRIPTE` (T3), séquence `tuto_colis_avant` (T5 — utiliser `SEQUENCES_TUTORIEL.tuto_colis_avant`, la Task 5 la fournit ; les deux tâches peuvent s'exécuter dans n'importe quel ordre à condition de lancer la suite complète après les deux).
- Produces: `objetColisTutoriel(index, _possedes?)` renvoie l'objet FIXE d'index i (état scripté, `prixReferenceReel = prixRefBase × FACTEUR_ETAT[etat]`) ; `appliquerFinTutoriel` livre le reliquat du colis scripté ; plus de `colisEnAttente`.

- [ ] **Step 1 : tests qui échouent** — `src/lib/tutoriel.test.ts` :

```ts
import { COLIS_TUTORIEL_SCRIPTE } from "@/data/tutorielScenario";
import { objetColisTutoriel, COLIS_TUTORIEL_TAILLE } from "@/data/starterInventory";

describe("colis scripté", () => {
  it("objetColisTutoriel sert les 5 objets fixes, dans l'ordre", () => {
    for (let i = 0; i < COLIS_TUTORIEL_TAILLE; i++) {
      const o = objetColisTutoriel(i);
      expect(o.templateId).toBe(COLIS_TUTORIEL_SCRIPTE[i].templateId);
      expect(o.etat).toBe(COLIS_TUTORIEL_SCRIPTE[i].etat);
    }
  });
  it("appliquerFinTutoriel livre le reliquat du colis scripté (fail-open « Passer »)", () => {
    const s = { ...stateMinimal(), tutorielEtape: "accueil" as const, colisTutorielLivres: 2 };
    const fin = appliquerFinTutoriel(s);
    expect(fin.colisTutorielLivres).toBe(COLIS_TUTORIEL_TAILLE);
    const ids = fin.inventaireJoueur.map((o) => o.templateId);
    for (const attendu of COLIS_TUTORIEL_SCRIPTE.slice(2).map((c) => c.templateId)) {
      expect(ids).toContain(attendu);
    }
  });
});
```

Supprimer le describe `colisEnAttente` (la fonction disparaît) et adapter le test `appliquerFinTutoriel (v2)` (il livre à nouveau — inverser les assertions d'inventaire).

- [ ] **Step 2 : vérifier l'échec.**

- [ ] **Step 3 : implémentation.**
- `starterInventory.ts` : `objetColisTutoriel(index, _templateIdsPossedes = [])` → construit l'objet depuis `COLIS_TUTORIEL_SCRIPTE[index]` (garde `index` hors bornes → dernier), via `getTemplate` + `FACTEUR_ETAT` local existant ; le paramètre anti-doublon devient inutile (garder la signature pour compat, préfixer `_`). `createStarterInventory` inchangé.
- `tutoriel.ts` : re-livraison dans `appliquerFinTutoriel` (boucle `for (let i = livres; i < COLIS_TUTORIEL_TAILLE; i++) manquants.push(objetColisTutoriel(i))` + `inventaireJoueur`/`colisTutorielLivres` dans le retour — le code d'avant la passe « colis cadeau », sans le paramètre anti-doublon) ; SUPPRIMER `colisEnAttente`.
- `(qg)/layout.tsx` :
  - `QgColis` visible quand `etape === "ouvrir-colis"` (remplace `colisEnAttente(state) && !dialogueQg`).
  - Effet dialogue : `else if (etape === "ouvrir-colis") jouerDialogueQg(SEQUENCES_TUTORIEL.tuto_colis_avant);` — la remise se joue à l'arrivée à l'étape (une fois, ref-guard existant).
  - `onTap` du QgColis : retirer tout le bloc `colisCadeauEnCours`/`tuto_colis_cadeau` → tap = `ouvrirObjetColis()` + cérémonie (le comportement d'avant).
  - `onRecuperer` du `ColisOverlay` : quand le colis est vide (`suivant === null`), `avancerTutoriel("preparer-etal")` (comme l'ancien tuto).
  - `onFini` du DialogueOverlay : supprimer la branche `colisCadeauEnCours` et l'état associé ; la fin du dialogue de la leçon collection (page collection) mène désormais à `ouvrir-colis` → **modifier `src/app/collection/page.tsx`** : `onFini={() => avancerTutoriel("ouvrir-colis")}`.
  - TabBar : à `ouvrir-colis`, l'onglet permis est `/bureau` (T2 l'a fait via `ongletTutorielPermis`).

- [ ] **Step 4 : vérifier** — tests PASS (`tutoriel`, `migrations`), tsc, suite complète (la parité dialogues échouera si T5 n'est pas passée — dans ce cas lancer tout SAUF `dialogues.test` et noter la dépendance dans le rapport).

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): le colis fixe rejoint le tutoriel avant l'étal"`.

---

### Task 5 : Dialogues v3 (4 langues) + assets colis/cadeau

**Files:**
- Modify: `src/data/dialogues.ts` + `src/lib/i18n/contenu/{en,es,el}/dialogues.ts`
- Replace: `public/qg/colis.webp`, `public/qg/cadeau-anniversaire.webp` (depuis les « - copie.png »)
- Test: `src/lib/i18n/contenu/dialogues.test.ts` (parité, existant)

**Interfaces:**
- Produces: séquences `tuto_colis_avant`, `tuto_prix_avant`, `tuto_prix_apres`, `tuto_vente_refus_avant/apres`, `tuto_vente_directe_avant/apres`, `tuto_vente_nego_avant/apres` ; `tuto_vente_entree` réécrit ; `tuto_colis_cadeau` SUPPRIMÉ partout.

- [ ] **Step 1 : FR.** Dans `SEQUENCES_TUTORIEL` : supprimer `tuto_colis_cadeau`, réécrire `tuto_vente_entree`, ajouter :

```ts
tuto_colis_avant: {
  id: "tuto_colis_avant",
  lignes: [
    { humeur: "emu", texte: "Avant d'aller vendre, tiens : un colis de ma part. Quelques pièces de la boutique pour garnir ton premier étal." },
    { humeur: "souriant", texte: "Ouvre-le — il t'attend devant la porte." },
  ],
},
tuto_prix_avant: {
  id: "tuto_prix_avant",
  lignes: [
    { humeur: "songeur", texte: "Le prix, c'est la moitié du métier. Trop haut, personne ne s'arrête ; trop bas, tu travailles pour rien." },
    { humeur: "souriant", texte: "J'ai déjà étiqueté mes pièces. Pour la manette et la carafe, glisse le curseur sur le prix que je t'indique — une petite marge, sous la cote : ça part vite." },
  ],
},
tuto_prix_apres: {
  id: "tuto_prix_apres",
  lignes: [
    { humeur: "rieur", texte: "Voilà des étiquettes honnêtes. En route — les clients n'attendent pas." },
  ],
},
tuto_vente_entree: {
  id: "tuto_vente_entree",
  lignes: [
    { humeur: "souriant", texte: "Bel étal ! Je reste avec toi pour cette première — et ça tombe bien : ici, je connais tout le monde." },
    { humeur: "songeur", texte: "Trois visages vont passer. Écoute-les, et souviens-toi : c'est TOI qui tiens le prix." },
  ],
},
tuto_vente_refus_avant: {
  id: "tuto_vente_refus_avant",
  lignes: [
    { humeur: "songeur", texte: "Tiens, Maxime du puçier… Il propose toujours trois fois rien. Écoute son offre — et n'aie pas peur de le laisser filer." },
  ],
},
tuto_vente_refus_apres: {
  id: "tuto_vente_refus_apres",
  lignes: [
    { humeur: "rieur", texte: "Et voilà. Refuser une mauvaise vente, c'est déjà gagner. La carafe trouvera preneur — au juste prix." },
  ],
},
tuto_vente_directe_avant: {
  id: "tuto_vente_directe_avant",
  lignes: [
    { humeur: "souriant", texte: "Ah, Léo ! Un ami — et un fou de vieilles manettes. À prix juste, il ne discutera même pas." },
  ],
},
tuto_vente_directe_apres: {
  id: "tuto_vente_directe_apres",
  lignes: [
    { humeur: "rieur", texte: "Tu vois ? Un prix honnête se vend tout seul. Le tiroir-caisse chante déjà." },
  ],
},
tuto_vente_nego_avant: {
  id: "tuto_vente_nego_avant",
  lignes: [
    { humeur: "souriant", texte: "Bérénice, la décoratrice. Elle va marchander, c'est plus fort qu'elle… Tiens ton prix : elle montera." },
  ],
},
tuto_vente_nego_apres: {
  id: "tuto_vente_nego_apres",
  lignes: [
    { humeur: "emu", texte: "Ta première vraie négociation de vente. Tu as tenu bon — je n'ai plus grand-chose à t'apprendre." },
    { humeur: "souriant", texte: "Referme l'étal quand tu veux, et rentrons. J'ai encore deux mots à te dire à la maison." },
  ],
},
```

- [ ] **Step 2 : EN/ES/EL.** Retirer `tuto_colis_cadeau` des 3 overlays, réécrire `tuto_vente_entree`, ajouter les 9 séquences avec la même cardinalité. EN verbatim :

```ts
tuto_colis_avant: [
  "Before we go selling — here: a parcel from me. A few pieces from the shop to fill your first stall.",
  "Open it — it's waiting by the door.",
],
tuto_prix_avant: [
  "Pricing is half the trade. Too high, nobody stops; too low, you work for nothing.",
  "I've already tagged my pieces. For the controller and the carafe, slide the cursor to the price I show you — a small margin, under market: it sells fast.",
],
tuto_prix_apres: [
  "Honest tags, those. Off we go — customers don't wait.",
],
tuto_vente_entree: [
  "Fine stall! I'll stay with you for this first one — and lucky you: around here, I know everybody.",
  "Three faces will come by. Listen to them, and remember: YOU hold the price.",
],
tuto_vente_refus_avant: [
  "Well, well — Maxime from the flea pit… He always offers next to nothing. Hear him out — and don't be afraid to let him walk.",
],
tuto_vente_refus_apres: [
  "There you go. Turning down a bad sale is already a win. The carafe will find its buyer — at the right price.",
],
tuto_vente_directe_avant: [
  "Ah, Léo! A friend — and mad about old controllers. At a fair price, he won't even argue.",
],
tuto_vente_directe_apres: [
  "See? An honest price sells itself. The till is singing already.",
],
tuto_vente_nego_avant: [
  "Bérénice, the decorator. She'll haggle — she can't help it… Hold your price: she'll come up.",
],
tuto_vente_nego_apres: [
  "Your first real sales negotiation. You held firm — there's not much left for me to teach you.",
  "Close the stall whenever you like, and let's head home. I've a couple more words for you at the house.",
],
```

(ES et EL : traductions propres, registre du personnage, réutiliser le vocabulaire canonique des overlays.)

- [ ] **Step 3 : assets.** Les nouvelles images sont déjà aux dimensions des actuelles (360×306 et 360×292). Conversion + remplacement + nettoyage :

```bash
node -e "const s=require('sharp');(async()=>{await s('public/qg/colis - copie.png').webp({quality:90}).toFile('public/qg/colis.webp');await s('public/qg/cadeau-anniversaire - copie.png').webp({quality:90}).toFile('public/qg/cadeau-anniversaire.webp');})()"
rm "public/qg/colis - copie.png" "public/qg/cadeau-anniversaire - copie.png"
```

puis contrôler visuellement les deux webp (Read) et vérifier leurs consommateurs (`grep -rn "colis.webp\|cadeau-anniversaire.webp" src/`) — aucun changement de code attendu.

- [ ] **Step 4 : vérifier** — `npx vitest run src/lib/i18n/contenu/dialogues.test.ts --maxWorkers=4` PASS ; `grep -rn "tuto_colis_cadeau" src/` → zéro (la Task 4 a retiré l'usage ; si elle n'est pas encore passée, le retrait d'ici casse la compilation → coordonner : ce grep doit être vide à la FIN des deux tâches, exécuter la suite complète à ce moment-là) ; tsc.

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): dialogues v3 (colis, prix, trois acheteurs) + nouvelles images colis/cadeau"`.

---

### Task 6 : Collection — retrouve ta peluche

**Files:**
- Modify: `src/app/collection/page.tsx`
- Modify: `src/components/CollectionGrid.tsx` (scroll auto + main sur la case)
- Modify: `src/components/mobile/CategoriePicker.tsx` (main + gate pendant la phase)
- Modify: `src/components/mobile/CollectionDetailOverlay.tsx` (`data-tuto-coach="collection-retirer"` + bouton inerte pendant le tuto)
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (clé `tutoriel.coachCollectionRetirer`)

**Interfaces:**
- Consumes: `PELUCHE_TEMPLATE_ID`, `TutorielCoach`, `tutorielActif`.
- Produces: machine locale de page `phaseLecon: "coach" | "filtre" | "case" | "detail" | "dialogue"`.

- [ ] **Step 1 : implémentation.** Dans `collection/page.tsx`, remplacer le couple `coachFini` par la machine :

```ts
type PhaseLecon = "coach" | "filtre" | "case" | "detail" | "dialogue";
const [phaseLecon, setPhaseLecon] = useState<PhaseLecon>("coach");
const enLecon = etape === "collection-lecon";
```

- `TutorielCoach` (3 bulles existantes) rendu si `enLecon && phaseLecon === "coach"`, `onFini={() => setPhaseLecon("filtre")}`.
- **Phase filtre** : `CategoriePicker` reçoit `mainCategorie?: CategorieObjet | null` (nouvelle prop) — la pastille « Jeux & Loisirs » porte `tuto-main tuto-main-haut` ; et `onChange` de la page : si `enLecon && phaseLecon === "filtre"`, n'accepter QUE `"Jeux & Loisirs"` (autres taps ignorés) puis `setPhaseLecon("case")`. Hors leçon, comportement intact.
- **Scroll auto + main sur la case** : `CollectionGrid` reçoit `scrollVersTemplateId?: string | null` et `mainTemplateId?: string | null`. Implémentation dans la grille : un `useEffect` sur `scrollVersTemplateId` → trouve l'index de la rangée contenant ce templateId dans `rangees` et appelle `virtualizer.scrollToIndex(idx, { align: "center" })` (le virtualizer est local au composant — c'est LE bon endroit) ; la case dont `s.templateId === mainTemplateId` porte `className="tuto-main tuto-main-haut"` sur son `<button>` (l.134-147) et `position: relative, zIndex: 2`. Page : `scrollVersTemplateId={enLecon && phaseLecon === "case" ? PELUCHE_TEMPLATE_ID : null}`, idem `mainTemplateId`.
- **Phase détail** : le `onTap` de la page (l.187-193) — si `enLecon && phaseLecon === "case"` et `s.templateId === PELUCHE_TEMPLATE_ID` → `setPhaseLecon("detail")` puis ouvrir le détail (les taps d'autres cases sont ignorés pendant la phase). `CollectionDetailOverlay` : poser `data-tuto-coach="collection-retirer"` sur le bouton retirer (l.174-197) et une prop `retirerInerte?: boolean` (bouton `disabled` visuellement normal — pendant le tuto on MONTRE sans presser). Pendant `phaseLecon === "detail"`, rendre un `TutorielCoach` à une seule étape : `[{ cible: "collection-retirer", texte: d.tutoriel.coachCollectionRetirer }]`, `onFini={() => { fermer le détail ; setPhaseLecon("dialogue"); }}`.
- **Phase dialogue** : le `DialogueOverlay` existant (`tuto_collection_lecon`) rendu si `phaseLecon === "dialogue"`, `onFini={() => avancerTutoriel("ouvrir-colis")}` (la Task 4 pose cette cible ; si T4 n'est pas encore passée, `"ouvrir-colis"` existe déjà dans le type depuis T2 — pas de dépendance de compilation).
- i18n : `coachCollectionRetirer: "Un objet donné n'est pas perdu : ce bouton le rend à ta réserve — mais la valeur s'en va avec lui."` (+ EN `"A donated piece isn't locked away: this button returns it to storage — but its value leaves with it."`, ES/EL).
- Remontage en cours de leçon : la machine repart à `"coach"` (fail-open, cohérent avec l'existant).

- [ ] **Step 2 : vérifier** — tsc ; `npx eslint src/app/collection src/components/CollectionGrid.tsx src/components/mobile/CategoriePicker.tsx src/components/mobile/CollectionDetailOverlay.tsx` ; suite complète ; trace écrite du flux (fichier:ligne à chaque phase) dans le rapport.

- [ ] **Step 3 : commit** — `git commit -m "feat(tuto): retrouve ta peluche — filtre guidé, scroll auto, bouton retirer montré"`.

---

### Task 7 : Coffre Tetris — préfill verrouillé

**Files:**
- Modify: `src/app/vitrine/prep/page.tsx` (injection du préfill)
- Modify: `src/components/vente/CoffreCanvas.tsx` (hitTest ignore les verrouillés ; ghost sans cadre)
- Modify: `src/components/vente/CoffreChargement.tsx` + `src/components/vente/CarrouselStock.tsx` (ajouts hors script inertes)
- Test: `src/lib/coffreTuto.test.ts` (les traces v3 restent vertes — T3 l'a vérifié ; pas de nouveau test pur ici)

**Interfaces:**
- Consumes: `PREFILL_COFFRE_TUTORIEL` (T3), `tutorielActif`, `mettreEnVitrine`/`ajusterPositionVitrine` (GameContext).
- Produces: `CoffreCanvas` prop `verrouillesIds?: ReadonlySet<string>` ; `CoffreChargement` props `verrouillesIds?: ReadonlySet<string>` et `ajoutsAutorisesTemplateIds?: ReadonlySet<string> | null` ; `CarrouselStock` prop `templateIdsAutorises?: ReadonlySet<string> | null` (null = tout autorisé).

- [ ] **Step 1 : injection.** Dans `prep/page.tsx`, étendre l'effet d'arrivée :

```ts
const prefillFaitRef = useRef(false);
useEffect(() => {
  if (!state || !tutorielActif(state)) return;
  if (etapeTuto === "preparer-etal") avancerTutoriel("coffre-trace-un");
  // Préfill : une seule fois, quand la vitrine est ouverte et encore vide.
  if (prefillFaitRef.current) return;
  if (!state.vitrine || state.vitrine.objets.length > 0) return;
  const parTemplate = new Map(state.inventaireJoueur.map((o) => [o.templateId, o]));
  const aTousLesObjets = PREFILL_COFFRE_TUTORIEL.every((p) => parTemplate.has(p.templateId));
  if (!aTousLesObjets) return; // fail-open : sans le colis (vieux flux), pas de préfill
  prefillFaitRef.current = true;
  for (const p of PREFILL_COFFRE_TUTORIEL) {
    const obj = parTemplate.get(p.templateId)!;
    mettreEnVitrine(obj.id, p.prixVente, p.posX, p.posY, p.rotation);
  }
}, [state, etapeTuto, avancerTutoriel, mettreEnVitrine]);
```

  et calculer `const verrouillesIds = useMemo(() => { if (!state || !tutorielActif(state)) return new Set<string>(); const t = new Set(PREFILL_COFFRE_TUTORIEL.map((p) => p.templateId)); return new Set(coffre.filter((ov) => t.has(ov.objet.templateId)).map((ov) => ov.objet.id)); }, [state, coffre]);` — passé à `CoffreChargement`. `ajoutsAutorisesTemplateIds` = pendant `coffre-trace-*` : `new Set(["jx.manette_vibraduo", "ma.carafe_cristal_taille"])`, sinon `null`.

- [ ] **Step 2 : verrouillage.**
- `CoffreCanvas` : prop `verrouillesIds` ; dans `hitTest` (l.83-102), sauter les `ov` dont l'id est verrouillé (`if (verrouillesIds?.has(ov.objet.id)) continue;`) → pas de drag, pas de rotation, pas de retrait (le retrait passe par le drag hors coffre). Le ghost : supprimer `border` et `borderRadius` (l.337-338) et passer l'opacité de l'image de 0.35 → **0.45**.
- `CoffreChargement` : props traversantes (`verrouillesIds` → `CoffreCanvas`, `ajoutsAutorisesTemplateIds` → gate de `handleTap`/`handleDragStart` : si l'ensemble est non-null et ne contient pas le templateId de l'objet, ne rien faire) et → `CarrouselStock templateIdsAutorises` (vignette grisée `opacity: 0.45` + pas de handlers quand non autorisé).
- Pricing : les objets verrouillés gardent leur `prixVente` du préfill — `CoffrePricing` les rendra en lecture seule (Task 9).

- [ ] **Step 3 : vérifier** — tsc, eslint sur les 4 fichiers, suite complète ; trace écrite : entrée prep pendant tuto → 3 objets posés/verrouillés (drag sans effet), carrousel : manette+carafe actives, reste grisé ; hors tuto : zéro préfill, tout se comporte comme avant (props null/vides).

- [ ] **Step 4 : commit** — `git commit -m "feat(tuto): coffre Tetris — préfill du colis verrouillé, ghost sans cadre"`.

---

### Task 8 : Démo du grand-père (dépôt + rotation de la manette)

**Files:**
- Create: `src/components/vente/DemoDepotManette.tsx`
- Modify: `src/components/vente/CoffreChargement.tsx` (montage + mesure des rects)
- Modify: `src/components/vente/CarrouselStock.tsx` (attribut `data-carrousel-template` sur chaque vignette)
- Modify: `src/app/vitrine/prep/page.tsx` (orchestration : la démo REMPLACE l'interaction à `coffre-trace-un`)
- Modify: `src/app/globals.css` (keyframes + reduced-motion)

**Interfaces:**
- Consumes: `TRACES_TUTORIEL[0]` (manette, rotation 25), asset `public/tutoriel/main-pointeuse.webp`, `getItemThumbUrl`.
- Produces: `<DemoDepotManette actif onTerminee={() => void} cibleRect={{x,y,w,h,rotation}} departRect={{x,y,w,h}} imageSrc={string} />` — overlay `position: fixed`, `zIndex: 60`, `pointerEvents: "auto"` (BLOQUE l'input), qui anime un clone de la manette du carrousel jusqu'à la trace puis la rotation, et appelle `onTerminee` à la fin.

- [ ] **Step 1 : composant.** `DemoDepotManette` :
- Rendu portal (`createPortal(document.body)`), voile transparent plein écran (`position: fixed; inset: 0; zIndex: 60; pointerEvents: auto` — avale tous les taps pendant la démo ; z 60 < bannière 90 : la bannière reste lisible, le coffre est en dessous de 50).
- Un **clone de la manette** (`<img src={imageSrc}>`, taille `departRect.w`) positionné en `departRect`, plus **main A** (main-pointeuse, 28 px) collée au clone.
- Timeline pilotée par transitions CSS + `setTimeout` en 3 phases (total ~3,8 s) :
  1. **0–400 ms** : main A apparaît sur la vignette (fondu).
  2. **400–1800 ms** : clone + main A glissent vers `cibleRect` (transition `left/top/width` 1.4 s ease-in-out) — à l'arrivée, `onDepose()` interne.
  3. **1800–3400 ms** : **main B** apparaît en face (fondu 300 ms, positionnée de l'autre côté du clone), puis le groupe tourne `rotate(0deg → 25deg)` (1.2 s) ; à la fin les deux mains s'estompent (400 ms) et `onTerminee()`.
- `prefers-reduced-motion` : pas d'animation — le composant appelle `onTerminee` après 600 ms avec un rendu statique (clone déjà sur la cible + deux mains posées) pour rester pédagogique sans mouvement.
- Cleanup : tous les timeouts dans des refs, clear au démontage ; si démonté avant la fin, PAS de `onTerminee` (le remontage rejouera).

- [ ] **Step 2 : orchestration.**
- `CarrouselStock` : chaque vignette porte `data-carrousel-template={o.templateId}` (mesure du rect de départ).
- `CoffreChargement` : nouvelle prop `demoManette?: { onTerminee: () => void } | null`. Quand non-null : mesurer `departRect` = `querySelector('[data-carrousel-template="jx.manette_vibraduo"]')?.getBoundingClientRect()` et `cibleRect` = position de la trace 0 convertie en pixels via le rect du conteneur coffre (`conteneurCoffreRef` existant : `left = rect.left + trace.posX*rect.width - sizePx/2`, `top = rect.top + trace.posY*(rect.width/camion.aspectRatio) - sizePx/2`, `sizePx = getScaleCoffre(tailleDe(tpl), camion.capacitePlaces) * rect.width`) ; rendre `<DemoDepotManette …/>`. Si un des deux rects est introuvable (élément absent), appeler `onTerminee` immédiatement (fail-open).
- `prep/page.tsx` : à `coffre-trace-un` pendant le tuto, `demoManette = { onTerminee: () => { const manette = state.inventaireJoueur.find((o) => o.templateId === "jx.manette_vibraduo"); if (manette) { mettreEnVitrine(manette.id, prixConseilleManette, TRACES_TUTORIEL[0].posX, TRACES_TUTORIEL[0].posY, TRACES_TUTORIEL[0].rotation); } avancerTutoriel("coffre-trace-deux"); } }` — le dépôt réel se fait À LA FIN de la démo (un seul commit d'état, pas de demi-état si interruption). `prixConseilleManette = PRIX_CONSEILLES_TUTORIEL["jx.manette_vibraduo"]`. Pendant la démo, la main du carrousel (`mainTemplateId`) est nulle (pas de double appel du regard). Garde de re-jeu : la démo se monte si `etapeTuto === "coffre-trace-un"` ET la manette est encore en stock. Le `verifierTrace`/snap existant reste pour la carafe (`coffre-trace-deux`) — la manette n'est plus posée par le joueur, retirer l'ancienne branche d'avance de `coffre-trace-un` dans `verifierTrace` (elle devient inatteignable mais autant la nettoyer).
- CSS : keyframes de fondu des mains (`broc-demo-main-in/out`) + neutralisation reduced-motion.

- [ ] **Step 3 : vérifier** — tsc, eslint, suite ; trace écrite : montage de la prep à coffre-trace-un → démo bloque l'input → dépôt réel + rotation 25° + avance ; kill pendant la démo → au remontage la manette est en stock, la démo rejoue ; reduced-motion → version statique 600 ms.

- [ ] **Step 4 : commit** — `git commit -m "feat(tuto): démo du grand-père — dépôt et rotation de la manette"`.

---

### Task 9 : Pricing guidé

**Files:**
- Modify: `src/components/vente/PrixSlider.tsx` (props `cible`, `tutoFleches`, `readOnly`)
- Modify: `src/components/vente/CoffrePricing.tsx` (gate Valider + lecture seule colis + mains)
- Modify: `src/app/vitrine/prep/page.tsx` (câblage + dialogues)
- Modify: `src/app/vitrine/[brocanteId]/ClientPage.tsx` (compilation : nouvelles props optionnelles, aucun changement de comportement)
- Test: `src/lib/coffreTuto.test.ts` (helper pur `prixPoses`)

**Interfaces:**
- Consumes: `PRIX_CONSEILLES_TUTORIEL`, `TOLERANCE_PRIX_CONSEILLE` (T3), classe CSS `.tuto-fleches` (`globals.css:1558`), séquences `tuto_prix_avant/apres` (T5).
- Produces: `PrixSlider` props `cible?: number | null`, `tutoFleches?: boolean`, `readOnly?: boolean` ; helper pur :

```ts
// src/lib/coffreTuto.ts
export function prixPoses(coffre: readonly ObjetEnVitrine[]): boolean;
// vrai si chaque objet du coffre présent dans PRIX_CONSEILLES_TUTORIEL a
// prixVente === le prix conseillé (l'aimantation garantit l'égalité stricte)
```

- [ ] **Step 1 : test qui échoue** — `src/lib/coffreTuto.test.ts` :

```ts
import { prixPoses } from "./coffreTuto";
import { PRIX_CONSEILLES_TUTORIEL } from "@/data/tutorielScenario";

describe("prixPoses", () => {
  const manette = (prix: number) => ({ objet: { templateId: "jx.manette_vibraduo" }, prixVente: prix }) as never;
  const carafe = (prix: number) => ({ objet: { templateId: "ma.carafe_cristal_taille" }, prixVente: prix }) as never;
  const autre = { objet: { templateId: "mus.ukulele_soprano" }, prixVente: 24 } as never;
  it("vrai quand manette et carafe sont au prix conseillé (les autres objets sont ignorés)", () => {
    expect(prixPoses([manette(PRIX_CONSEILLES_TUTORIEL["jx.manette_vibraduo"]), carafe(PRIX_CONSEILLES_TUTORIEL["ma.carafe_cristal_taille"]), autre])).toBe(true);
  });
  it("faux si un prix conseillé n'est pas posé", () => {
    expect(prixPoses([manette(PRIX_CONSEILLES_TUTORIEL["jx.manette_vibraduo"]), carafe(99), autre])).toBe(false);
  });
  it("vrai sur un coffre sans objets conseillés (fail-open hors tuto)", () => {
    expect(prixPoses([autre])).toBe(true);
  });
});
```

- [ ] **Step 2 : vérifier l'échec, puis implémentation.**
- `coffreTuto.ts` :

```ts
export function prixPoses(coffre: readonly ObjetEnVitrine[]): boolean {
  return coffre.every((ov) => {
    const conseil = PRIX_CONSEILLES_TUTORIEL[ov.objet.templateId];
    return conseil === undefined || ov.prixVente === conseil;
  });
}
```

- `PrixSlider` :
  - `readOnly?: boolean` → la poignée n'installe pas ses handlers, opacité 0.7, et une petite étiquette `d.vente.etiquetteGrandPere` (« Étiqueté par le grand-père » — nouvelle clé i18n ×4) sous la piste.
  - `cible?: number | null` → une pastille supplémentaire sur la piste (même style que la pastille marché, couleur `var(--brass-500)`, aria-label `d.vente.prixConseille`) ; **aimantation** : dans le handler de drag, si `Math.abs(valeur - cible) <= TOLERANCE_PRIX_CONSEILLE`, committer `cible` au lieu de la valeur.
  - `tutoFleches?: boolean` → `className="tuto-fleches"` sur le div racine de la POIGNÉE (la `Pastille` de vente, l.118-131 — étendre `Pastille` avec une prop `className` traversée jusqu'à son div racine l.159).
- `CoffrePricing` : props `readOnlyTemplateIds?: ReadonlySet<string>`, `cibles?: Readonly<Record<string, number>> | null`, `validerBloque?: boolean` ; par ligne : `readOnly={readOnlyTemplateIds?.has(ov.objet.templateId)}`, `cible={cibles?.[ov.objet.templateId] ?? null}`, `tutoFleches={cible non-null && ov.prixVente !== cible}` ; bouton Valider `disabled` aussi quand `validerBloque`.
- `prep/page.tsx` : pendant le tuto — `readOnlyTemplateIds = new Set(PREFILL_COFFRE_TUTORIEL.map((p) => p.templateId))`, `cibles = PRIX_CONSEILLES_TUTORIEL`, `validerBloque = !prixPoses(coffre)` ; au passage packing→pricing (`onValider` du chargement), jouer `tuto_prix_avant` (DialogueOverlay local à la page, pattern de la page collection) ; à la validation du pricing, jouer `tuto_prix_apres` puis `router.push("/vitrine")` à son onFini. `tutoMainValider={tuto && prixPoses(coffre)}`.
- `vitrine/[brocanteId]/ClientPage.tsx` : passe `CoffrePricing` sans les nouvelles props (optionnelles) — vérifier la compilation seulement.

- [ ] **Step 3 : vérifier** — tests coffreTuto PASS, tsc, eslint, suite ; trace écrite (flèches sur les 2 poignées, aimantation, valider gaté, colis readonly).

- [ ] **Step 4 : commit** — `git commit -m "feat(tuto): pricing guidé — prix conseillés aimantés, colis pré-étiqueté"`.

---

### Task 10 : Journée de vente scriptée

**Files:**
- Modify: `src/lib/vitrine.ts` (`genererClientEventScripte`)
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (file scriptée, dialogues, avances, garde de fin)
- Modify: `src/components/mobile/NegociationSheet.tsx` (bornes scriptées + aléa + mains refus/accepter)
- Test: `src/lib/vitrine.test.ts`

**Interfaces:**
- Consumes: `SESSION_VENTE_TUTORIEL`, `acheteurDeLEtape`, `personnageScenario` (T3), `ALEA_NEGO_SCRIPTEE`, séquences T5.
- Produces:

```ts
// src/lib/vitrine.ts
export function genererClientEventScripte(
  acheteur: AcheteurScenario,
  vitrine: VitrineActive,
): ClientEvent | null; // null si l'objet ciblé n'est plus en vitrine (déjà vendu)
```

  `NegociationSheet` props : `scriptTuto?: { bornes?: { min: number; max: number }; mainLaisserTomber?: boolean } | null` (négo scriptée → `proposerOffre(..., ALEA_NEGO_SCRIPTEE)` et bornes du curseur) et `venteDirecte.tutoMainAccepter?: boolean`.

- [ ] **Step 1 : test qui échoue** — `src/lib/vitrine.test.ts` :

```ts
import { genererClientEventScripte } from "./vitrine";
import { SESSION_VENTE_TUTORIEL, personnageScenario } from "@/data/tutorielScenario";

describe("genererClientEventScripte", () => {
  const vitrine = {
    brocanteId: "vide-grenier-quartier",
    objets: [
      { objet: { id: "i1", templateId: "jx.manette_vibraduo" }, prixVente: 22 },
      { objet: { id: "i2", templateId: "ma.carafe_cristal_taille" }, prixVente: 26 },
    ],
  } as never;
  it("fabrique l'événement du radin : négo sur la carafe, valeurs scriptées", () => {
    const a = SESSION_VENTE_TUTORIEL[0];
    const ev = genererClientEventScripte(a, vitrine)!;
    expect(ev.persona.nom).toBe(personnageScenario(a).nom);
    expect(ev.mode).toBe("negociation");
    expect(ev.panier[0].objet.templateId).toBe("ma.carafe_cristal_taille");
    expect(ev.offreInitiale).toBe(a.offreInitiale);
    expect(ev.prixMax).toBe(a.prixMax);
    expect(ev.prixDemande).toBe(26);
  });
  it("mode achat direct pour l'ami", () => {
    const ev = genererClientEventScripte(SESSION_VENTE_TUTORIEL[1], vitrine)!;
    expect(ev.mode).toBe("achat-direct");
    expect(ev.panier[0].objet.templateId).toBe("jx.manette_vibraduo");
  });
  it("null si l'objet ciblé n'est plus en vitrine", () => {
    const sansCarafe = { ...vitrine, objets: [vitrine.objets[0]] } as never;
    expect(genererClientEventScripte(SESSION_VENTE_TUTORIEL[0], sansCarafe)).toBeNull();
  });
});
```

- [ ] **Step 2 : vérifier l'échec, puis `genererClientEventScripte`** dans `src/lib/vitrine.ts` (à côté de `genererClientEvent`) :

```ts
/**
 * Événement client de la journée scriptée du tutoriel : personnage, objet
 * ciblé, mode et chiffres viennent du scénario — rien d'aléatoire. Le
 * persona de négo est celui du scénario (axes figés).
 */
export function genererClientEventScripte(
  acheteur: AcheteurScenario,
  vitrine: VitrineActive,
): ClientEvent | null {
  const ov = vitrine.objets.find((o) => o.objet.templateId === acheteur.templateIdCible);
  if (!ov) return null;
  const persona = personnageScenario(acheteur);
  return {
    persona,
    panier: [ov],
    prixMax: acheteur.prixMax,
    prixDemande: ov.prixVente,
    offreInitiale: acheteur.offreInitiale ?? ov.prixVente,
    mode: acheteur.mode,
    fancy: false,
    toleranceBoost: 0,
    fourchettePrixMax: null,
  };
}
```

  (aligner les champs sur le type `ClientEvent` réel — `src/lib/vitrine.ts:55-75` ; si `fourchettePrixMax`/`toleranceBoost` ont d'autres formes/valeurs par défaut, reprendre celles de `genererClientEvent`. Le persona de NÉGO côté sheet vient de `personaDepuisClient` — voir Step 3 : pendant le tuto on courcircuite avec `acheteur.persona`.)

- [ ] **Step 3 : orchestration de la journée** (`journee/ClientPage.tsx`) :
- **Entrée** : le dialogue `tuto_vente_entree` (déjà déclenché à `coffre-trace-deux`) avance vers `vente-refus` (T2 l'a câblé).
- **Dialogues avant/après** : même pattern que la chine — `dialoguesJouesRef` + map `AVANT` (`vente-refus → tuto_vente_refus_avant`, `vente-directe → tuto_vente_directe_avant`, `vente-nego → tuto_vente_nego_avant`) jouée quand l'étape est atteinte ET qu'aucun client n'est présent ; `dialogueApresRef` porte l'étape suivante, posée par les débriefs.
- **Spawn scripté** : dans le tick (l.~525), si `tutorielActif(state)` : ne JAMAIS utiliser le pool aléatoire ; si un dialogue tuto est ouvert ou un client présent → return ; sinon si `acheteurDeLEtape(etape)` existe et que son « avant » a déjà été joué → `const ev = genererClientEventScripte(acheteur, state.vitrine!)` ; si `ev` est null (objet déjà vendu — impossible dans le flux normal) → avancer l'étape (garde-fou) ; sinon poser le client (mêmes setters que l'existant l.561-575, MAIS `ouvrirNegociation("vente", ev.offreInitiale, ev.prixMax, temperamentDe(...))` reçoit le persona scripté : stocker `acheteur.persona` dans un ref pour `NegociationSheet`). `prochainClientRef.current = 1.5` après la fermeture du dialogue « avant » (spawn quasi immédiat, précédent Criée l.408).
- **personaRevele** : `const personaRevele = … || tutorielActif(state)` (l.893-896) — visages et noms réels.
- **Issues des visites** :
  - `vente-refus` : dans `terminerVisiteClient` (l.771-782), si `etape === "vente-refus"` et pas de vente conclue pour ce client → `dialogueApresRef.current = "vente-directe"; setDialogueTuto(tuto_vente_refus_apres)`. (Tous les chemins passent par `terminerVisiteClient` : laisser tomber, refus_poli, fermeture.)
  - `vente-directe` : au point « vente conclue » (l.~737 achat direct), si `etape === "vente-directe"` → débrief `tuto_vente_directe_apres` → `vente-nego`. Si le joueur REFUSE l'ami (`terminerVisiteClient` sans vente à `vente-directe`) → pas de débrief, le tick refera surgir le même acheteur (l'« avant » ne rejoue pas, ref).
  - `vente-nego` : vente conclue en négo (l.~764) → débrief `tuto_vente_nego_apres` (remplace `tuto_vente_faite` pendant le tuto) → `conclusion`. Le bouton Sortir pulse à `conclusion` (existant).
- **NegociationSheet** : prop `scriptTuto` — bornes sur le curseur (`minJoueur`/`maxJoueur` internes l.126-128 : les clamper avec `scriptTuto.bornes` comme `ChineNegoDrawer`), `proposerOffre(..., ALEA_NEGO_SCRIPTEE)` quand scripté, offre initiale du joueur clampée dans les bornes ; `mainLaisserTomber` → `className="tuto-main"` sur le bouton « laisser tomber » (l.228-233) ; `venteDirecte.tutoMainAccepter` → main sur le bouton vendre (l.195-197). Câblage : `scriptTuto={acheteurCourantScripte ? { bornes: acheteurCourantScripte.bornesOffre, mainLaisserTomber: etape === "vente-refus" } : null}` et `tutoMainAccepter: etape === "vente-directe"`.
- **Garde de fin de journée** : à la condition de fin auto (l.~647), ajouter `&& (!state || !tutorielActif(state) || etape === "conclusion")` — l'horloge ne clôt jamais la journée avant la fin du script (elle reprend ses droits à `conclusion`).
- **Nettoyage** : `tuto_vente_faite` n'est plus déclenché pendant le tuto (remplacé par les débriefs) — retirer les remaps provisoires de T2.

- [ ] **Step 4 : vérifier** — tests vitrine PASS, tsc, eslint (`src/lib/vitrine.ts`, la page journée, `NegociationSheet`), suite complète ; TRACE ÉCRITE complète du flux (arrivée → 3 acheteurs → conclusion, chaque transition avec fichier:ligne, y compris les chemins de refus de l'ami et de kill mi-journée).

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): journée de vente scriptée — trois visages connus, trois leçons"`.

---

### Task 11 : Balayage final et recette de lecture

**Files:**
- Modify: divers (résultats des greps)
- Test: suite complète

- [ ] **Step 1 : greps.** `grep -rn '"premiere-vente"\|tuto_colis_cadeau\|colisEnAttente\|tuto_vente_faite' src scripts` → plus aucune occurrence vivante (`tuto_vente_faite` peut rester DÉFINI dans dialogues.ts + overlays s'il sert hors tuto — vérifier : s'il n'a plus AUCUN usage, le supprimer des 4 langues ; sinon documenter où il sert).
- [ ] **Step 2 : cohérence bout en bout (lecture).** Rejouer sur papier le flux complet v3 : accueil → chine ×4 → sortie → retour (dialogue) → stockage coach ×4 (bannière masquée) → peluche → collection (coach ×3 + filtre + case + détail + dialogue) → colis ×5 (dialogue de remise) → porte (pulse SEULEMENT ici) → prep (préfill 3 verrouillés + démo manette + carafe joueur) → pricing (2 curseurs guidés, colis readonly) → /vitrine → journée (3 acheteurs) → conclusion → carnet/chapitre 1 (le colis post-carnet n'existe PLUS — vérifier qu'aucun reliquat d'UI n'y fait référence) → « Passer le tutoriel » à 5 étapes différentes (accueil, stockage-focus, ouvrir-colis à moitié ouvert, coffre-trace-un pendant la démo, vente-refus) : lettre de Maman + reliquat colis livrés, aucune main orpheline, aucun softlock. Écrire cette trace dans le rapport avec fichier:ligne.
- [ ] **Step 3 : suite + qualité.** `npx vitest run --maxWorkers=4` verte, `npx tsc --noEmit` propre (hors untracked connu), `npx eslint src` → 0 erreur.
- [ ] **Step 4 : commit** (si des fixes sont sortis des steps 1-2) — `git commit -m "fix(tuto): balayage final du polish v3"`.
