# Tutoriel v2 — brocante scriptée : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre le tutoriel en 17 étapes : première brocante scriptée (6 objets fixes, échec de négo / achat direct / 2 négos réussies garanties), visite guidée stockage + leçon de collection (déblocage réel), coffre à traces fantômes avec apprentissage de la rotation, colis du grand-père déplacé en cadeau post-tutoriel.

**Architecture:** Scénario déclaratif (`src/data/tutorielScenario.ts`) + helpers purs (`src/lib/tutoriel.ts`, `src/lib/coffreTuto.ts`) consommés par les pages. La négo scriptée est garantie par bornage du curseur (`minJoueur`/`maxJoueur` existants de `NegoBar`), personas à valeurs fixes et neutralisation de l'aléa de fin (`proposerOffre` reçoit une source d'aléa injectable).

**Tech Stack:** Next.js/React (App Router), TypeScript, vitest, i18n maison 4 langues (FR source), save versionnée (`src/lib/migrations.ts`).

**Spec:** `docs/superpowers/specs/2026-08-08-tutoriel-brocante-scriptee-design.md`

## Global Constraints

- **Tests** : `npx vitest run <fichier> --maxWorkers=4` — le drapeau `--maxWorkers=4` est OBLIGATOIRE sur ce Mac (sans lui ~41 faux échecs par famine de workers). Suite complète : `npx vitest run --maxWorkers=4`.
- **Lint** : `npm run lint` est cassé (Next 16) → utiliser `npx eslint src`.
- **Jamais de chaîne localisée en save** — uniquement des ids (`tutorielEtape`, ids de séquences).
- **i18n** : toute nouvelle clé UI s'ajoute aux QUATRE fichiers `src/lib/i18n/ui/{fr,en,es,el}.ts` (le typage sur la forme du FR casse la compilation en cas d'oubli). Tout nouveau dialogue s'ajoute à `src/data/dialogues.ts` (FR) ET aux overlays `src/lib/i18n/contenu/{en,es,el}/dialogues.ts` (test de parité : `src/lib/i18n/contenu/dialogues.test.ts`).
- **`avancerTutoriel("termine")` est un no-op** : la clôture passe par `terminerTutoriel()` (GameContext) / `appliquerFinTutoriel` (lib).
- **SAVE_VERSION = version de la base + 1.** Sur `main` au 2026-08-08 elle vaut **17** → viser **18**. ⚠ Si `feat/audit-competences` (qui pose 18) est mergée dans la base avant ce travail, viser **19**. Le test `src/lib/migrations.test.ts` asserte la valeur — le mettre à jour.
- **Z-index** : DialogueOverlay 120 > TutorielCoach 100 > bannière tuto 90 > barre bas session 50 > sheets 40-70 > FloatingRoomOverlay 35 > TabBar 30 (→ 40 quand une main déborde).
- **StrictMode** : ne pas retirer les refs de garde des pages de session (`entreePayeeRef`, etc.).
- **`prefers-reduced-motion`** : toute nouvelle animation CSS s'ajoute au bloc média de `src/app/globals.css` (~l.1622) qui coupe les animations tuto.
- Commits fréquents, messages `feat(tuto): …` / `test(tuto): …`, suffixe `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1 : Étapes v2, migration, colis post-tutoriel

Le socle : nouveau type `TutorielEtape` (17 valeurs), ordre linéaire, bannière i18n, bump de `SAVE_VERSION`, `appliquerFinTutoriel` sans livraison de colis, `QgColis` re-gaté en post-tutoriel. Les références aux étapes supprimées (`premier-achat`, `rentrer`, `ouvrir-colis`) sont remappées mécaniquement pour compiler — le flux complet arrive dans les tâches suivantes (branche de feature : l'UX intermédiaire peut être imparfaite, la compilation et les tests doivent être verts).

**Files:**
- Modify: `src/types/game.ts` (~l.296 : type `TutorielEtape`)
- Modify: `src/lib/tutoriel.ts` (`ETAPES_TUTORIEL`, `appliquerFinTutoriel`)
- Modify: `src/lib/migrations.ts` (l.108 : `SAVE_VERSION`)
- Modify: `src/lib/i18n/ui/fr.ts` (~l.174 : `tutoriel.instructions`) + `en.ts`, `es.ts`, `el.ts`
- Modify: `src/app/(qg)/layout.tsx` (remaps + `QgColis`)
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx` (remaps compilation)
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (remaps compilation — grep `premiere-vente`/`preparer-etal`/`rentrer`)
- Test: `src/lib/tutoriel.test.ts`, `src/lib/migrations.test.ts`

**Interfaces:**
- Produces: type `TutorielEtape` v2 (17 valeurs ci-dessous), `ETAPES_TUTORIEL` réordonné, `appliquerFinTutoriel` SANS livraison de colis, condition d'apparition du colis post-tuto : `colisEnAttente(state)`.

- [ ] **Step 1 : tests qui échouent** — dans `src/lib/tutoriel.test.ts`, ajouter :

```ts
import { describe, expect, it } from "vitest";
import {
  appliquerFinTutoriel,
  colisEnAttente,
  ETAPES_TUTORIEL,
  etapeSuivante,
} from "./tutoriel";
// construire un GameState minimal via le helper de test existant du fichier
// (ou créer un `stateMinimal()` local copié de migrations.test.ts).

describe("étapes v2", () => {
  it("ordonne les 17 étapes du nouveau flux", () => {
    expect(ETAPES_TUTORIEL).toEqual([
      "accueil", "aller-chiner",
      "chine-nego-echec", "chine-achat-direct", "chine-nego-un",
      "chine-nego-deux", "chine-sortir",
      "stockage-ouvrir", "stockage-focus",
      "collection-envoyer", "collection-lecon",
      "preparer-etal", "coffre-trace-un", "coffre-trace-deux",
      "premiere-vente", "conclusion", "termine",
    ]);
  });
  it("etapeSuivante enchaîne chine-nego-deux → chine-sortir", () => {
    expect(etapeSuivante("chine-nego-deux")).toBe("chine-sortir");
  });
});

describe("appliquerFinTutoriel (v2)", () => {
  it("ne livre PLUS le colis (inventaire inchangé, compteur intact)", () => {
    const s = { ...stateMinimal(), tutorielEtape: "accueil" as const, colisTutorielLivres: 0 };
    const fin = appliquerFinTutoriel(s);
    expect(fin.tutorielEtape).toBe("termine");
    expect(fin.inventaireJoueur).toHaveLength(s.inventaireJoueur.length);
    expect(fin.colisTutorielLivres).toBe(0);
    expect(fin.miniTutoCarnet).toBe("ouvrir");
  });
});

describe("colisEnAttente", () => {
  it("faux tant que le tutoriel court ou que le carnet n'est pas consommé", () => {
    expect(colisEnAttente({ tutorielEtape: "accueil", miniTutoCarnet: undefined, colisTutorielLivres: 0 })).toBe(false);
    expect(colisEnAttente({ tutorielEtape: "termine", miniTutoCarnet: "ouvrir", colisTutorielLivres: 0 })).toBe(false);
  });
  it("vrai après le carnet tant que le colis n'est pas vidé", () => {
    expect(colisEnAttente({ tutorielEtape: "termine", miniTutoCarnet: "termine", colisTutorielLivres: 3 })).toBe(true);
    expect(colisEnAttente({ tutorielEtape: "termine", miniTutoCarnet: "termine", colisTutorielLivres: 5 })).toBe(false);
  });
  it("vrai pour une vieille save sans miniTutoCarnet et colis entamé", () => {
    expect(colisEnAttente({ tutorielEtape: "termine", miniTutoCarnet: undefined, colisTutorielLivres: 2 })).toBe(true);
  });
});
```

Dans `src/lib/migrations.test.ts` : mettre à jour l'assertion `SAVE_VERSION` (l.~155 et toute valeur en dur) vers la nouvelle valeur, et ajouter :

```ts
it("normalise les étapes de l'ancien tutoriel disparues vers termine", () => {
  const s = { ...stateMinimal(), tutorielEtape: "premier-achat" };
  const m = migrerSauvegarde(s as unknown as GameState);
  expect(m.tutorielEtape).toBe("termine");
});
it("conserve les étapes v2 en cours", () => {
  const s = { ...stateMinimal(), version: SAVE_VERSION, tutorielEtape: "chine-nego-un" };
  expect(migrerSauvegarde(s as GameState).tutorielEtape).toBe("chine-nego-un");
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/tutoriel.test.ts src/lib/migrations.test.ts --maxWorkers=4` → FAIL (étapes inconnues, `colisEnAttente` inexistant).

- [ ] **Step 3 : implémentation.**

`src/types/game.ts` — remplacer le type :

```ts
export type TutorielEtape =
  | "accueil"
  | "aller-chiner"
  | "chine-nego-echec"
  | "chine-achat-direct"
  | "chine-nego-un"
  | "chine-nego-deux"
  | "chine-sortir"
  | "stockage-ouvrir"
  | "stockage-focus"
  | "collection-envoyer"
  | "collection-lecon"
  | "preparer-etal"
  | "coffre-trace-un"
  | "coffre-trace-deux"
  | "premiere-vente"
  | "conclusion"
  | "termine";
```

`src/lib/tutoriel.ts` — `ETAPES_TUTORIEL` = la liste du test ; dans `appliquerFinTutoriel`, SUPPRIMER le bloc « Colis du tutoriel : livre le restant » (boucle `manquants`) et les champs `inventaireJoueur`/`colisTutorielLivres` du retour ; retirer l'import `objetColisTutoriel` (mort) et le type `Objet` s'il ne sert plus, garder `COLIS_TUTORIEL_TAILLE` pour `colisEnAttente` ; ajouter :

```ts
/**
 * Le colis du grand-père est un cadeau de fin de tutoriel : il apparaît au
 * bureau une fois le tutoriel clos ET la séquence du carnet consommée
 * (miniTutoCarnet ≠ "ouvrir" — absent sur les vieilles saves = consommé),
 * tant qu'il reste des objets à retirer.
 */
export function colisEnAttente(
  state: Pick<GameState, "tutorielEtape" | "miniTutoCarnet" | "colisTutorielLivres">,
): boolean {
  return (
    state.tutorielEtape === "termine" &&
    state.miniTutoCarnet !== "ouvrir" &&
    (state.colisTutorielLivres ?? 0) < COLIS_TUTORIEL_TAILLE
  );
}
```

`src/lib/migrations.ts` — `SAVE_VERSION` +1 (cf. contrainte globale). La normalisation `tutorielEtape` (l.~480) est déjà « valeur hors `ETAPES_TUTORIEL` ⇒ termine » : elle absorbe seule les anciennes étapes. Vérifier que la lettre de Maman est bien injectée dans ce cas (`tutorielFini === true` → oui, l.~510).

`src/lib/i18n/ui/fr.ts` — remplacer `tutoriel.instructions` :

```ts
instructions: {
  "accueil": "Écoute ton grand-père…",
  "aller-chiner": "Passe la porte, choisis « Chiner », puis le Vide-grenier du quartier.",
  "chine-nego-echec": "Déplie « Négocier » et tente une offre très basse, pour voir.",
  "chine-achat-direct": "Cette carafe est à prix honnête : achète-la au prix affiché.",
  "chine-nego-un": "Négocie la manette — propose un prix avec le curseur.",
  "chine-nego-deux": "Négocie la peluche — tu commences à avoir le coup de main.",
  "chine-sortir": "Regarde les derniers étals si tu veux, puis sors de la brocante.",
  "stockage-ouvrir": "Ouvre le Stockage depuis la barre du bas.",
  "stockage-focus": "Fais le tour de ton stockage — touche pour continuer.",
  "collection-envoyer": "Envoie la peluche mohair dans ta collection.",
  "collection-lecon": "Ouvre la Collection depuis la barre du bas.",
  "preparer-etal": "Repasse la porte et choisis « Étaler » pour préparer ta vitrine.",
  "coffre-trace-un": "Prends le premier objet et pose-le sur son emplacement.",
  "coffre-trace-deux": "Un doigt pour déplacer, un second pour tourner : pose l'objet sur sa trace.",
  "premiere-vente": "Vends un objet à un client, puis referme l'étal.",
  "conclusion": "Écoute ton grand-père…",
},
```

EN : `"chine-nego-echec": "Open “Haggle” and try a very low offer — just to see."`, `"chine-achat-direct": "That carafe is fairly priced: buy it at the asking price."`, `"chine-nego-un": "Haggle for the controller — make an offer with the slider."`, `"chine-nego-deux": "Haggle for the teddy bear — you're getting the knack."`, `"chine-sortir": "Browse the last stalls if you like, then leave the flea market."`, `"stockage-ouvrir": "Open Storage from the bottom bar."`, `"stockage-focus": "Take a tour of your storage — tap to continue."`, `"collection-envoyer": "Send the mohair teddy bear to your collection."`, `"collection-lecon": "Open the Collection from the bottom bar."`, `"coffre-trace-un": "Pick up the first item and set it on its outline."`, `"coffre-trace-deux": "One finger to move, a second to rotate: set the item on its outline."` — décliner ES et EL de même (traduire, pas de clé manquante : la compilation le garantit).

Remaps mécaniques de compilation (le vrai flux arrive plus tard) :
- `src/app/(qg)/layout.tsx` : `etape === "rentrer"` (l.421) → `etape === "chine-sortir"` ; `avancerTutoriel("ouvrir-colis")` (l.929) → `avancerTutoriel("stockage-ouvrir")` ; bloc `etape === "ouvrir-colis" && <QgColis…>` (l.570) → `colisEnAttente(state) && !dialogueQg && <QgColis…>` (import depuis `@/lib/tutoriel`) ; dans le `onRecuperer` du `ColisOverlay` (l.883), supprimer `avancerTutoriel("preparer-etal")` (le colis n'est plus une étape) ; `portePermise` (l.484) →

```ts
const portePermise =
  etape === "aller-chiner" ||
  etape === "chine-nego-echec" ||
  etape === "chine-achat-direct" ||
  etape === "chine-nego-un" ||
  etape === "chine-nego-deux" ||
  etape === "chine-sortir" ||
  etape === "preparer-etal" ||
  etape === "coffre-trace-un" ||
  etape === "coffre-trace-deux" ||
  etape === "premiere-vente";
```

  et `PorteSheet` (l.701-702) : `tutoChiner={etape === "aller-chiner" || etape?.startsWith("chine-")}` → écrire les comparaisons explicites (pas de startsWith sur union) : `tutoChiner={etape === "aller-chiner" || etape === "chine-nego-echec" || etape === "chine-achat-direct" || etape === "chine-nego-un" || etape === "chine-nego-deux" || etape === "chine-sortir"}` ; `tutoEtaler={etape === "preparer-etal" || etape === "coffre-trace-un" || etape === "coffre-trace-deux" || etape === "premiere-vente"}`.
- `src/app/chiner/[brocanteId]/ClientPage.tsx` : `etape === "premier-achat"` (3 occurrences : l.365, l.570, l.595-596) → `etape === "chine-nego-echec"` provisoirement ; `pulseSortir={etape === "rentrer"}` (l.547) → `pulseSortir={etape === "chine-sortir"}` ; `avancerTutoriel("premier-achat")` (l.595) → `avancerTutoriel("chine-nego-echec")` ; `avancerTutoriel("rentrer")` (l.596) → `avancerTutoriel("chine-sortir")`.
- `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` : `grep -n '"preparer-etal"\|"premiere-vente"\|"rentrer"\|"ouvrir-colis"\|"premier-achat"'` — remplacer la condition d'entrée `etape === "preparer-etal"` par `etape === "coffre-trace-deux"` ; les autres (`premiere-vente`, `conclusion`) restent.
- Grep repo-wide final : `grep -rn '"premier-achat"\|"rentrer"\|"ouvrir-colis"' src scripts` → tout point restant est remappé (scripts de save de démo : poser `"termine"`).

- [ ] **Step 4 : vérifier** — `npx vitest run src/lib/tutoriel.test.ts src/lib/migrations.test.ts --maxWorkers=4` → PASS ; `npx tsc --noEmit` → 0 erreur ; `npx vitest run --maxWorkers=4` → suite verte.

- [ ] **Step 5 : commit** — `git add -A && git commit -m "feat(tuto): étapes v2 (17 valeurs), colis post-tutoriel, migration"`.

---

### Task 2 : Scénario déclaratif + helpers purs

**Files:**
- Create: `src/data/tutorielScenario.ts`
- Modify: `src/lib/tutoriel.ts` (helpers de lecture du scénario)
- Test: `src/data/tutorielScenario.test.ts`

**Interfaces:**
- Consumes: `TutorielEtape` v2 (Task 1), `NegoPersona`/`EtatObjet` (`src/types/game.ts`), `calculerPrixMinAcceptDepuisPersona` (`src/lib/personas.ts`), `getTemplate` (`src/data/objetTemplates.ts`).
- Produces:
  - `ObjetScenario { templateId: string; etat: EtatObjet; prixVendeur: number; role: RoleScenario; persona: NegoPersona; bornesOffre?: { min: number; max: number } }`
  - `RoleScenario = "nego-echec" | "achat-direct" | "nego-reussie" | "decor"`
  - `SESSION_TUTORIEL: readonly ObjetScenario[]` (6 entrées), `PELUCHE_TEMPLATE_ID`
  - `TraceScenario { templateId: string; posX: number; posY: number; rotation: number }`, `TRACES_TUTORIEL` (2), `TOLERANCE_TRACE_POS = 0.08`, `TOLERANCE_TRACE_ROT = 10`
  - helpers (lib/tutoriel.ts) : `scenarioDeLEtape(etape): ObjetScenario | null`, `indexObjetScenario(etape): 0|1|2|3|null`, `deckVerrouille(etape): boolean`, `ongletTutorielPermis(etape): "/stockage" | "/collection" | "/bureau" | null`, `donCollectionPermis(etape, templateId): boolean`

- [ ] **Step 1 : test qui échoue** — `src/data/tutorielScenario.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { getTemplate } from "@/data/objetTemplates";
import { calculerPrixMinAcceptDepuisPersona } from "@/lib/personas";
import {
  PELUCHE_TEMPLATE_ID, SESSION_TUTORIEL, TRACES_TUTORIEL,
} from "./tutorielScenario";
import {
  deckVerrouille, donCollectionPermis, indexObjetScenario,
  ongletTutorielPermis, scenarioDeLEtape,
} from "@/lib/tutoriel";
import { ITEMS_WITH_IMAGE } from "@/lib/itemImages";

describe("SESSION_TUTORIEL", () => {
  it("contient 6 objets aux templates connus, illustrés, sans doublon", () => {
    expect(SESSION_TUTORIEL).toHaveLength(6);
    const ids = SESSION_TUTORIEL.map((s) => s.templateId);
    expect(new Set(ids).size).toBe(6);
    for (const s of SESSION_TUTORIEL) {
      expect(getTemplate(s.templateId), s.templateId).toBeDefined();
      expect(ITEMS_WITH_IMAGE.has(s.templateId), s.templateId).toBe(true);
    }
  });
  it("suit l'ordre des rôles : échec, direct, réussite ×2, décor ×2", () => {
    expect(SESSION_TUTORIEL.map((s) => s.role)).toEqual([
      "nego-echec", "achat-direct", "nego-reussie", "nego-reussie", "decor", "decor",
    ]);
  });
  it("la peluche est le 4e objet et part en collection", () => {
    expect(SESSION_TUTORIEL[3].templateId).toBe(PELUCHE_TEMPLATE_ID);
  });
  it("l'échec est garanti : toute offre bornée est insultante au tour 1", () => {
    const s = SESSION_TUTORIEL[0];
    const seuil = s.prixVendeur * (1 - s.persona.tolerancePct);
    expect(s.bornesOffre!.max).toBeLessThan(seuil);
  });
  it("les réussites sont garanties : min ≥ prix plancher et jamais d'insulte", () => {
    for (const s of SESSION_TUTORIEL.filter((x) => x.role === "nego-reussie")) {
      const plancher = calculerPrixMinAcceptDepuisPersona(s.persona, s.prixVendeur);
      expect(s.bornesOffre!.min).toBeGreaterThanOrEqual(plancher);
      // pire cas d'insulte : prix adverse au plus haut (tour 1)
      expect(s.bornesOffre!.min).toBeGreaterThanOrEqual(
        s.prixVendeur * (1 - s.persona.tolerancePct),
      );
      expect(s.bornesOffre!.max).toBeLessThan(s.prixVendeur);
    }
  });
  it("le budget initial couvre large les 3 achats au pire prix", () => {
    const pire = SESSION_TUTORIEL[1].prixVendeur +
      SESSION_TUTORIEL[2].bornesOffre!.max + SESSION_TUTORIEL[3].bornesOffre!.max;
    expect(pire).toBeLessThanOrEqual(120); // INITIAL_BUDGET = 150, marge 30
  });
  it("la valeur de donation de la peluche franchit le seuil de 30 €", () => {
    const tpl = getTemplate(PELUCHE_TEMPLATE_ID)!;
    // état "Très bon" → prixReferenceReel = prixRefBase ; prime donation 1.1
    expect(SESSION_TUTORIEL[3].etat).toBe("Très bon");
    expect(Math.round(tpl.prixRefBase * 1.1)).toBeGreaterThanOrEqual(30);
  });
});

describe("TRACES_TUTORIEL", () => {
  it("vise la manette (droite) puis la carafe (pivotée)", () => {
    expect(TRACES_TUTORIEL[0]).toMatchObject({ templateId: "jx.manette_vibraduo", rotation: 0 });
    expect(TRACES_TUTORIEL[1].templateId).toBe("ma.carafe_cristal_taille");
    expect(TRACES_TUTORIEL[1].rotation).toBeGreaterThanOrEqual(30);
  });
  it("reste dans les bornes du coffre sans se chevaucher", () => {
    for (const t of TRACES_TUTORIEL) {
      expect(t.posX).toBeGreaterThan(0.12); expect(t.posX).toBeLessThan(0.88);
      expect(t.posY).toBeGreaterThan(0.12); expect(t.posY).toBeLessThan(0.88);
    }
    const [a, b] = TRACES_TUTORIEL;
    expect(Math.hypot(a.posX - b.posX, a.posY - b.posY)).toBeGreaterThan(0.2);
  });
});

describe("helpers d'étape", () => {
  it("scenarioDeLEtape mappe les 4 étapes scriptées", () => {
    expect(scenarioDeLEtape("chine-nego-echec")).toBe(SESSION_TUTORIEL[0]);
    expect(scenarioDeLEtape("chine-achat-direct")).toBe(SESSION_TUTORIEL[1]);
    expect(scenarioDeLEtape("chine-nego-un")).toBe(SESSION_TUTORIEL[2]);
    expect(scenarioDeLEtape("chine-nego-deux")).toBe(SESSION_TUTORIEL[3]);
    expect(scenarioDeLEtape("chine-sortir")).toBeNull();
    expect(indexObjetScenario("chine-nego-deux")).toBe(3);
  });
  it("deckVerrouille : vrai sur les 4 étapes scriptées, faux ensuite", () => {
    expect(deckVerrouille("chine-nego-echec")).toBe(true);
    expect(deckVerrouille("chine-sortir")).toBe(false);
    expect(deckVerrouille("termine")).toBe(false);
  });
  it("ongletTutorielPermis guide stockage → collection → bureau", () => {
    expect(ongletTutorielPermis("stockage-ouvrir")).toBe("/stockage");
    expect(ongletTutorielPermis("stockage-focus")).toBe("/stockage");
    expect(ongletTutorielPermis("collection-envoyer")).toBe("/stockage");
    expect(ongletTutorielPermis("collection-lecon")).toBe("/collection");
    expect(ongletTutorielPermis("preparer-etal")).toBe("/bureau");
    expect(ongletTutorielPermis("accueil")).toBeNull();
    expect(ongletTutorielPermis("termine")).toBeNull();
  });
  it("donCollectionPermis : seule la peluche pendant collection-envoyer, tout hors tuto", () => {
    expect(donCollectionPermis("collection-envoyer", PELUCHE_TEMPLATE_ID)).toBe(true);
    expect(donCollectionPermis("collection-envoyer", "ma.carafe_cristal_taille")).toBe(false);
    expect(donCollectionPermis("stockage-focus", PELUCHE_TEMPLATE_ID)).toBe(false);
    expect(donCollectionPermis("termine", "ma.carafe_cristal_taille")).toBe(true);
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/data/tutorielScenario.test.ts --maxWorkers=4` → FAIL (module absent).

- [ ] **Step 3 : implémentation.** `src/data/tutorielScenario.ts` :

```ts
import type { EtatObjet, NegoPersona } from "@/types/game";

/**
 * Le script de la première brocante (tutoriel v2). Tout est FIXE — mêmes
 * objets, mêmes prix, mêmes vendeurs pour tous les joueurs — afin que les
 * trois scénarios (échec de négo, achat direct, négos réussies) se jouent
 * à coup sûr. Les personas sont des valeurs figées (pas de jitter) : la
 * trajectoire du vendeur en négo est déterministe.
 * Spec : docs/superpowers/specs/2026-08-08-tutoriel-brocante-scriptee-design.md
 */
export type RoleScenario = "nego-echec" | "achat-direct" | "nego-reussie" | "decor";

export interface ObjetScenario {
  templateId: string;
  etat: EtatObjet;
  /** Prix affiché du vendeur (prixAffiche est toujours vrai dans le script). */
  prixVendeur: number;
  role: RoleScenario;
  /** Persona figé — prixMinAccept en découle via calculerPrixMinAcceptDepuisPersona. */
  persona: NegoPersona;
  /** Bornes du curseur d'offre pendant l'étape scriptée (négo uniquement). */
  bornesOffre?: { min: number; max: number };
}

const PERSONA_DECOR: NegoPersona = {
  archetype: "bonhomme", margePct: 0.4, elanPct: 0.55, patience: 5,
  tolerancePct: 0.7, sangFroid: 0.85,
};

export const PELUCHE_TEMPLATE_ID = "jx.ours_en_peluche_mohair_recent";

export const SESSION_TUTORIEL: readonly ObjetScenario[] = [
  {
    // Le bel objet qu'on perd : offre bornée sous le seuil de colère
    // (90 × (1 − 0.30) = 63 > max 40) → « fâché » garanti au tour 1.
    templateId: "mus.tourne_disque_a_courroie_vintage",
    etat: "Très bon", prixVendeur: 90, role: "nego-echec",
    persona: { archetype: "grincheux", margePct: 0.10, elanPct: 0.25, patience: 3, tolerancePct: 0.30, sangFroid: 0.25 },
    bornesOffre: { min: 5, max: 40 },
  },
  {
    // Bonne affaire sous la cote (réf. 21 en état Bon) : on achète direct.
    templateId: "ma.carafe_cristal_taille",
    etat: "Bon", prixVendeur: 18, role: "achat-direct",
    persona: PERSONA_DECOR,
  },
  {
    // Négo garantie : plancher 24 × (1 − 0.5) = 12 = borne min ; élan 0.9 →
    // le vendeur rejoint la borne min en 2 contre-offres (24 → 13 → 12).
    templateId: "jx.manette_vibraduo",
    etat: "Très bon", prixVendeur: 24, role: "nego-reussie",
    persona: { archetype: "naif", margePct: 0.50, elanPct: 0.90, patience: 5, tolerancePct: 0.95, sangFroid: 0.95 },
    bornesOffre: { min: 12, max: 20 },
  },
  {
    // La peluche (future donation) : plancher round(58 × 0.7) = 41 = borne min.
    templateId: PELUCHE_TEMPLATE_ID,
    etat: "Très bon", prixVendeur: 58, role: "nego-reussie",
    persona: { archetype: "mamie", margePct: 0.30, elanPct: 0.85, patience: 4, tolerancePct: 0.55, sangFroid: 0.50 },
    bornesOffre: { min: 41, max: 52 },
  },
  { templateId: "mus.radio_cassette_annees_80", etat: "Bon", prixVendeur: 21, role: "decor", persona: PERSONA_DECOR },
  { templateId: "br.lampe_baladeuse_atelier", etat: "Mauvais", prixVendeur: 6, role: "decor", persona: PERSONA_DECOR },
];

/* === Coffre à traces ==================================================== */

export interface TraceScenario {
  templateId: string;
  /** Centre visé, coordonnées normalisées du conteneur coffre (0..1). */
  posX: number;
  posY: number;
  /** Rotation visée en degrés (0..360). */
  rotation: number;
}

/** Trace 1 : la manette, droite. Trace 2 : la carafe, pivotée (leçon rotation). */
export const TRACES_TUTORIEL: readonly TraceScenario[] = [
  { templateId: "jx.manette_vibraduo", posX: 0.38, posY: 0.55, rotation: 0 },
  { templateId: "ma.carafe_cristal_taille", posX: 0.62, posY: 0.5, rotation: 40 },
];

/** Tolérance de pose : distance (normalisée) et angle (degrés). */
export const TOLERANCE_TRACE_POS = 0.08;
export const TOLERANCE_TRACE_ROT = 10;
```

`src/lib/tutoriel.ts` — ajouter (imports : `SESSION_TUTORIEL`, `ObjetScenario`, `PELUCHE_TEMPLATE_ID` depuis `@/data/tutorielScenario`) :

```ts
/** Étapes de chine scriptée, dans l'ordre du deck (index = objet du scénario). */
const ETAPES_CHINE_SCRIPTEE: readonly TutorielEtape[] = [
  "chine-nego-echec", "chine-achat-direct", "chine-nego-un", "chine-nego-deux",
];

export function indexObjetScenario(etape: TutorielEtape): 0 | 1 | 2 | 3 | null {
  const i = ETAPES_CHINE_SCRIPTEE.indexOf(etape);
  return i === -1 ? null : (i as 0 | 1 | 2 | 3);
}

export function scenarioDeLEtape(etape: TutorielEtape): ObjetScenario | null {
  const i = indexObjetScenario(etape);
  return i === null ? null : SESSION_TUTORIEL[i];
}

/** Deck verrouillé sur la carte active pendant les 4 étapes scriptées. */
export function deckVerrouille(etape: TutorielEtape): boolean {
  return indexObjetScenario(etape) !== null;
}

/**
 * Onglet de TabBar autorisé (et pointé par la main) pendant le tutoriel.
 * null = aucun onglet permis (comportement historique : taps inertes).
 */
export function ongletTutorielPermis(
  etape: TutorielEtape,
): "/stockage" | "/collection" | "/bureau" | null {
  switch (etape) {
    case "stockage-ouvrir":
    case "stockage-focus":
    case "collection-envoyer":
      return "/stockage";
    case "collection-lecon":
      return "/collection";
    case "preparer-etal":
      return "/bureau";
    default:
      return null;
  }
}

/**
 * Pendant le tutoriel, seule la peluche désignée par le grand-père peut
 * rejoindre la collection — et uniquement à l'étape dédiée.
 */
export function donCollectionPermis(
  etape: TutorielEtape,
  templateId: string,
): boolean {
  if (etape === "termine") return true;
  return etape === "collection-envoyer" && templateId === PELUCHE_TEMPLATE_ID;
}
```

- [ ] **Step 4 : vérifier** — `npx vitest run src/data/tutorielScenario.test.ts --maxWorkers=4` → PASS. Si `ITEMS_WITH_IMAGE` ne contient pas un des 6 templates, CHANGER l'objet de décor fautif pour un template illustré voisin de même gamme de prix (et adapter spec + tests) — ne jamais retirer l'assertion.

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): scénario déclaratif de la brocante scriptée + helpers d'étape"`.

---

### Task 3 : `genererSessionScriptee` (chine.ts)

**Files:**
- Modify: `src/lib/chine.ts` (l.69 : `instancier` ; export nouvelle fonction)
- Test: `src/lib/chine.test.ts` (ajout d'un `describe`)

**Interfaces:**
- Consumes: `SESSION_TUTORIEL` (Task 2), `calculerPrixMinAcceptDepuisPersona`.
- Produces: `genererSessionScriptee(): ObjetEnVente[]` — 6 objets dans l'ordre du scénario, déterministes (hors `id` aléatoires), `prixAffiche: true`, `statut: "disponible"`, `negociation: null`.

- [ ] **Step 1 : test qui échoue** — dans `src/lib/chine.test.ts` :

```ts
import { genererSessionScriptee } from "./chine";
import { SESSION_TUTORIEL } from "@/data/tutorielScenario";
import { calculerPrixMinAcceptDepuisPersona } from "./personas";

describe("genererSessionScriptee", () => {
  it("produit les 6 objets du scénario, dans l'ordre, aux valeurs forcées", () => {
    const session = genererSessionScriptee();
    expect(session).toHaveLength(6);
    session.forEach((it, i) => {
      const s = SESSION_TUTORIEL[i];
      expect(it.objet.templateId).toBe(s.templateId);
      expect(it.objet.etat).toBe(s.etat);
      expect(it.prixVendeur).toBe(s.prixVendeur);
      expect(it.prixAffiche).toBe(true);
      expect(it.persona).toEqual(s.persona);
      expect(it.prixMinAccept).toBe(
        calculerPrixMinAcceptDepuisPersona(s.persona, s.prixVendeur),
      );
      expect(it.statut).toBe("disponible");
      expect(it.negociation).toBeNull();
    });
  });
  it("est reproductible (mêmes valeurs à chaque appel, hors ids)", () => {
    const a = genererSessionScriptee();
    const b = genererSessionScriptee();
    expect(a.map((x) => [x.objet.templateId, x.prixVendeur, x.objet.prixReferenceReel]))
      .toEqual(b.map((x) => [x.objet.templateId, x.prixVendeur, x.objet.prixReferenceReel]));
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/chine.test.ts --maxWorkers=4` → FAIL.

- [ ] **Step 3 : implémentation.** Dans `src/lib/chine.ts`, étendre `instancier` avec un paramètre d'overrides (défauts = comportement actuel, AUCUN appel existant à changer) :

```ts
interface OptionsInstance {
  etat?: EtatObjet;
  prixVendeur?: number;
  prixAffiche?: boolean;
  persona?: NegoPersona;
}

function instancier(
  template: ObjetTemplate,
  tendances: readonly Tendance[],
  tier: 1 | 2 | 3 | 4 = 1,
  brocante?: Brocante,
  opts?: OptionsInstance,
): ObjetEnVente {
  const etat = opts?.etat ?? pickRandom(ETATS);
  // …prixReferenceReel inchangé (dépend de etat)…
  const persona = opts?.persona ?? tirerPersonaVendeur(brocante, template.categorie);
  // …les calculs existants (l.81-91 : facteurVendeur, modTend, modSpec,
  // surcote) restent tels quels…
  const prixVendeur =
    opts?.prixVendeur ??
    Math.max(1, Math.round(prixReferenceReel * facteurVendeur * modTend * modSpec * surcote));
  const prixMinAccept = calculerPrixMinAcceptDepuisPersona(persona, prixVendeur);
  return {
    // …identique, sauf :
    prixAffiche: opts?.prixAffiche ?? Math.random() > 0.4,
  };
}

/**
 * Session de chinage du tutoriel : les 6 objets du scénario déclaratif,
 * dans l'ordre, tout forcé (état, prix, persona). Déterministe — la
 * session se reconstruit à l'identique si le joueur sort et revient.
 */
export function genererSessionScriptee(): ObjetEnVente[] {
  return SESSION_TUTORIEL.map((s) => {
    const t = getTemplate(s.templateId);
    if (!t) throw new Error(`[tutoriel] template inconnu : ${s.templateId}`);
    return instancier(t, [], 1, undefined, {
      etat: s.etat,
      prixVendeur: s.prixVendeur,
      prixAffiche: true,
      persona: s.persona,
    });
  });
}
```

(import `SESSION_TUTORIEL` depuis `@/data/tutorielScenario`, `NegoPersona` depuis les types.)

- [ ] **Step 4 : vérifier** — `npx vitest run src/lib/chine.test.ts --maxWorkers=4` → PASS (toute la suite du fichier, pas seulement le nouveau describe).

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): genererSessionScriptee — session de chine déterministe"`.

---

### Task 4 : Négo déterministe (`proposerOffre` + garanties prouvées)

**Files:**
- Modify: `src/lib/negociation.ts` (l.~415 : `proposerOffre`)
- Test: `src/lib/negociation.test.ts` (ajout), `src/data/tutorielScenario.test.ts` (garanties bout en bout)

**Interfaces:**
- Produces: `proposerOffre(nego, persona, offre, alea: () => number = Math.random)` — 4e paramètre optionnel, rétro-compatible ; `ALEA_NEGO_SCRIPTEE: () => number` (renvoie 1 : la fin probabiliste — étape 3 de la fonction — ne se déclenche jamais).

- [ ] **Step 1 : tests qui échouent.** Dans `src/lib/negociation.test.ts` :

```ts
import { ALEA_NEGO_SCRIPTEE, ouvrirNegociation, proposerOffre } from "./negociation";

describe("proposerOffre — aléa injectable", () => {
  const persona = { archetype: "mamie", margePct: 0.3, elanPct: 0.85, patience: 4, tolerancePct: 0.55, sangFroid: 0.5 };
  it("avec ALEA_NEGO_SCRIPTEE, jamais de fin probabiliste (fache/refus hors insulte/patience)", () => {
    let nego = ouvrirNegociation("achat", 58, 41);
    // offre non insultante, répétée : seuls "en_cours" puis accord/patience possibles
    for (let i = 0; i < 3 && nego.statut === "en_cours"; i++) {
      nego = proposerOffre(nego, persona, 41, ALEA_NEGO_SCRIPTEE);
      expect(["en_cours", "conclu"]).toContain(nego.statut);
    }
    expect(nego.statut).toBe("conclu");
  });
});
```

Dans `src/data/tutorielScenario.test.ts`, le test de bout en bout des garanties :

```ts
import { ALEA_NEGO_SCRIPTEE, ouvrirNegociation, proposerOffre } from "@/lib/negociation";
import { genererSessionScriptee } from "@/lib/chine";

describe("garanties de négo du scénario", () => {
  it("objet 1 : TOUTE offre bornée fâche le vendeur au tour 1", () => {
    const s = SESSION_TUTORIEL[0];
    const it = genererSessionScriptee()[0];
    for (let offre = s.bornesOffre!.min; offre <= s.bornesOffre!.max; offre++) {
      const nego = proposerOffre(
        ouvrirNegociation("achat", it.prixVendeur, it.prixMinAccept),
        s.persona, offre, ALEA_NEGO_SCRIPTEE,
      );
      expect(nego.statut, `offre ${offre}`).toBe("fache");
    }
  });
  it.each([[2], [3]])("objet %d : aucune suite d'offres bornées ne peut échouer", (idx) => {
    const s = SESSION_TUTORIEL[idx];
    const it = genererSessionScriptee()[idx];
    // Pire stratégie pour l'accord : offrir la borne MIN à chaque tour
    // (une offre plus haute conclut plus tôt). La trajectoire adverse est
    // déterministe : il suffit de la dérouler.
    let nego = ouvrirNegociation("achat", it.prixVendeur, it.prixMinAccept);
    let tours = 0;
    while (nego.statut === "en_cours" && tours < 10) {
      nego = proposerOffre(nego, s.persona, s.bornesOffre!.min, ALEA_NEGO_SCRIPTEE);
      tours++;
      expect(["en_cours", "conclu"], `tour ${tours}`).toContain(nego.statut);
    }
    expect(nego.statut).toBe("conclu");
    expect(tours).toBeLessThanOrEqual(s.persona.patience);
    // Et l'insulte est impossible sur TOUTE la plage au prix adverse le plus
    // haut (tour 1) — les prix suivants ne font que baisser le seuil.
    expect(s.bornesOffre!.min).toBeGreaterThanOrEqual(
      it.prixVendeur * (1 - s.persona.tolerancePct),
    );
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/negociation.test.ts src/data/tutorielScenario.test.ts --maxWorkers=4` → FAIL (`ALEA_NEGO_SCRIPTEE` absent, 4e paramètre inconnu).

- [ ] **Step 3 : implémentation.** `src/lib/negociation.ts` :
  - signature : `export function proposerOffre(nego: NegociationState, persona: NegoPersona, offre: number, alea: () => number = Math.random): NegociationState`
  - l.463 : `if (Math.random() < chanceFin)` → `if (alea() < chanceFin)`
  - ajouter près de l'export :

```ts
/**
 * Source d'aléa pour les négos scriptées du tutoriel : renvoie 1, donc la
 * fin probabiliste (étape 3) ne se déclenche jamais — seuls l'insulte,
 * la patience et l'accord décident. Les scénarios deviennent prouvables.
 */
export const ALEA_NEGO_SCRIPTEE = (): number => 1;
```

- [ ] **Step 4 : vérifier** — les deux fichiers de test → PASS ; `npx vitest run src/lib --maxWorkers=4` → PASS (non-régression : l'appel 3 args reste valide).

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): aléa injectable dans proposerOffre — négos scriptées prouvables"`.

---

### Task 5 : Dialogues du grand-père (FR + EN/ES/EL)

**Files:**
- Modify: `src/data/dialogues.ts` (`SEQUENCES_TUTORIEL`)
- Modify: `src/lib/i18n/contenu/en/dialogues.ts`, `es/dialogues.ts`, `el/dialogues.ts`
- Test: `src/lib/i18n/contenu/dialogues.test.ts` (parité — existant, doit rester vert)

**Interfaces:**
- Produces: ids de séquences consommés par les tâches 7, 8, 10, 11 : `tuto_chine_entree` (réécrit), `tuto_nego_echec_avant/apres`, `tuto_achat_direct_avant/apres`, `tuto_nego_un_avant/apres`, `tuto_nego_deux_avant/apres`, `tuto_chine_sortir`, `tuto_retour` (réécrit), `tuto_peluche_collection`, `tuto_collection_lecon`, `tuto_colis_cadeau`. Supprimé : `tuto_achat_fait`.

- [ ] **Step 1 : implémentation FR.** Dans `SEQUENCES_TUTORIEL`, supprimer `tuto_achat_fait`, réécrire `tuto_chine_entree` et `tuto_retour`, ajouter les nouvelles séquences :

```ts
tuto_chine_entree: {
  id: "tuto_chine_entree",
  lignes: [
    { humeur: "souriant", texte: "Ah, l'odeur des vieilleries au petit matin… Aujourd'hui, c'est moi qui guide : quatre objets, quatre leçons." },
    { humeur: "songeur", texte: "Regarde ce tourne-disque. Joli, hein ? Déplie « Négocier » et propose-lui trois fois rien — on verra bien ce que ça donne." },
  ],
},
tuto_nego_echec_avant: {
  id: "tuto_nego_echec_avant",
  lignes: [
    { humeur: "rieur", texte: "Vas-y, ose : glisse le curseur tout en bas et propose. Au pire, il grogne." },
  ],
},
tuto_nego_echec_apres: {
  id: "tuto_nego_echec_apres",
  lignes: [
    { humeur: "rieur", texte: "Et voilà, il est vexé ! Une offre trop basse, c'est comme marcher sur ses plates-bandes : chaque vendeur a son seuil… et son caractère." },
    { humeur: "songeur", texte: "Avec l'expérience — des niveaux, des compétences, l'œil qui se fait — tu sauras jusqu'où descendre sans froisser personne." },
    { humeur: "souriant", texte: "Ça arrive aux meilleurs. Allez, carte suivante : je te montre l'inverse." },
  ],
},
tuto_achat_direct_avant: {
  id: "tuto_achat_direct_avant",
  lignes: [
    { humeur: "songeur", texte: "Cette carafe en cristal… à ce prix, c'est une affaire. Parfois on ne négocie pas : on tend les billets avant qu'un autre le fasse." },
  ],
},
tuto_achat_direct_apres: {
  id: "tuto_achat_direct_apres",
  lignes: [
    { humeur: "souriant", texte: "Bien. Reconnaître une bonne affaire au premier coup d'œil, c'est déjà du métier." },
  ],
},
tuto_nego_un_avant: {
  id: "tuto_nego_un_avant",
  lignes: [
    { humeur: "souriant", texte: "Une manette Vibraduo ! Les collectionneurs en raffolent. Cette fois, négocie pour de vrai : reste dans la zone du curseur, ni trop bas, ni trop haut." },
  ],
},
tuto_nego_un_apres: {
  id: "tuto_nego_un_apres",
  lignes: [
    { humeur: "rieur", texte: "Ta première négo ! Tu as vu l'aller-retour ? Toi qui montes, lui qui descend… et on se retrouve au milieu." },
  ],
},
tuto_nego_deux_avant: {
  id: "tuto_nego_deux_avant",
  lignes: [
    { humeur: "emu", texte: "Oh… une peluche en mohair. Ta grand-mère avait la même sur son fauteuil. Négocie-la-moi gentiment, tu veux ?" },
  ],
},
tuto_nego_deux_apres: {
  id: "tuto_nego_deux_apres",
  lignes: [
    { humeur: "souriant", texte: "Négocié comme un chef ! Prends-en soin, de celle-là… j'ai ma petite idée sur son avenir." },
  ],
},
tuto_chine_sortir: {
  id: "tuto_chine_sortir",
  lignes: [
    { humeur: "souriant", texte: "On a assez dépensé pour aujourd'hui — garde des sous pour la suite. Jette un œil aux derniers étals si tu veux, puis passe la sortie." },
  ],
},
tuto_retour: {
  id: "tuto_retour",
  lignes: [
    { humeur: "souriant", texte: "Trois trouvailles d'un coup ! Mais un brocanteur qui empile, c'est un brocanteur qui perd. Chaque chose à sa place." },
    { humeur: "songeur", texte: "Ouvre le Stockage, en bas — je te fais visiter la réserve." },
  ],
},
tuto_peluche_collection: {
  id: "tuto_peluche_collection",
  lignes: [
    { humeur: "emu", texte: "La peluche… Ne la vends pas, celle-là. Il y a des objets qu'on garde — c'est ça, une collection." },
    { humeur: "souriant", texte: "Envoie-la dans ta collection : touche son petit bouton, là." },
  ],
},
tuto_collection_lecon: {
  id: "tuto_collection_lecon",
  lignes: [
    { humeur: "souriant", texte: "Tu vois ce chiffre ? La valeur de ta collection. C'est elle qui fait ta réputation de brocanteur." },
    { humeur: "rieur", texte: "Et regarde : le Marché aux puces du dimanche t'ouvre déjà ses portes. On commence à parler de toi, petit !" },
    { humeur: "songeur", texte: "Maintenant, la vente. Retourne au bureau — la porte nous attend." },
  ],
},
tuto_colis_cadeau: {
  id: "tuto_colis_cadeau",
  lignes: [
    { humeur: "emu", texte: "Une dernière chose. Ce colis, c'est de ma part : quelques pièces de la boutique pour te lancer." },
    { humeur: "souriant", texte: "Tu as l'œil, tu as la main… le reste viendra tout seul. Ouvre-le, et au travail !" },
  ],
},
```

- [ ] **Step 2 : parité EN/ES/EL.** Dans chaque overlay (`DIALOGUES_EN/ES/EL`), retirer `tuto_achat_fait` et ajouter les clés avec le même nombre de lignes. EN complet (traduire ES et EL avec le même soin, une entrée par clé, même cardinalité) :

```ts
tuto_chine_entree: [
  "Ah, the smell of old things in the early morning… Today I'm the guide: four objects, four lessons.",
  "Look at that turntable. Pretty, eh? Open “Haggle” and offer him next to nothing — let's see what happens.",
],
tuto_nego_echec_avant: [
  "Go on, dare: slide the cursor right down and make the offer. Worst case, he growls.",
],
tuto_nego_echec_apres: [
  "There — he's miffed! An offer that low is like trampling his flowerbeds: every seller has a threshold… and a temper.",
  "With experience — levels, skills, a sharper eye — you'll know how low you can go without ruffling anyone.",
  "It happens to the best of us. Next stall: let me show you the opposite.",
],
tuto_achat_direct_avant: [
  "That crystal carafe… at this price, it's a steal. Sometimes you don't haggle: you hand over the notes before someone else does.",
],
tuto_achat_direct_apres: [
  "Good. Spotting a bargain at first glance — that's the trade already.",
],
tuto_nego_un_avant: [
  "A Vibraduo controller! Collectors adore these. This time, haggle for real: stay inside the slider's zone — not too low, not too high.",
],
tuto_nego_un_apres: [
  "Your first successful haggle! Did you see the back-and-forth? You climb, he comes down… and you meet in the middle.",
],
tuto_nego_deux_avant: [
  "Oh… a mohair teddy bear. Your grandmother had the very same on her armchair. Haggle it for me nicely, will you?",
],
tuto_nego_deux_apres: [
  "Haggled like a pro! Take good care of that one… I have a little idea about its future.",
],
tuto_chine_sortir: [
  "We've spent enough for today — keep some coins for what's next. Browse the last stalls if you like, then take the exit.",
],
tuto_retour: [
  "Three finds in one trip! But a dealer who piles things up is a dealer who loses them. A place for everything.",
  "Open the Storage, down there — let me show you around the back room.",
],
tuto_peluche_collection: [
  "The teddy bear… Don't sell that one. Some objects are for keeping — that's what a collection is.",
  "Send it to your collection: tap its little button, right there.",
],
tuto_collection_lecon: [
  "See that number? The value of your collection. That's what builds your reputation as a dealer.",
  "And look: the Sunday flea market is already opening its doors to you. People are starting to talk, kid!",
  "Now, selling. Back to the office — the door awaits.",
],
tuto_colis_cadeau: [
  "One last thing. This parcel is from me: a few pieces from the shop to get you started.",
  "You have the eye, you have the hands… the rest will come. Open it, and to work!",
],
```

- [ ] **Step 3 : vérifier** — `npx vitest run src/lib/i18n/contenu/dialogues.test.ts --maxWorkers=4` → PASS (parité de cardinalité 4 langues) ; `npx tsc --noEmit`.

- [ ] **Step 4 : commit** — `git commit -m "feat(tuto): dialogues du grand-père — consignes et débriefs des achats scriptés (4 langues)"`.

---

### Task 6 : Props scriptées des composants de chine

**Files:**
- Modify: `src/components/mobile/chine/ChineNegoDrawer.tsx`
- Modify: `src/components/mobile/chine/ItemSwipeDeck.tsx`

**Interfaces:**
- Consumes: `ALEA_NEGO_SCRIPTEE` (Task 4).
- Produces:
  - `ChineNegoDrawer` : prop `scriptTuto?: { role: RoleScenario; bornes?: { min: number; max: number } } | null` (type importé de `@/data/tutorielScenario`).
  - `ItemSwipeDeck` : prop `indexImpose?: number | null`.

- [ ] **Step 1 : `ChineNegoDrawer`.**
  - Nouvelle prop `scriptTuto` (défaut `null`). Dérivés :

```ts
const roleTuto = scriptTuto?.role ?? null;
const bornes = scriptTuto?.bornes ?? null;
const negocierBloque = roleTuto === "achat-direct" || roleTuto === "decor";
const acheterBloqueTuto = roleTuto !== null && roleTuto !== "achat-direct";
```

  - Bouton « Négocier » (l.122) : `disabled={negocierBloque}` + style grisé (réutiliser `btn(negocierBloque)`), et la main tuto passe sur le bon bouton : `className={tutoGuide && !negocierBloque ? "tuto-main" : undefined}` ; sur « Acheter » (l.130) : `disabled={acheterDisabled || acheterBloqueTuto}` et `className={tutoGuide && roleTuto === "achat-direct" ? "tuto-main" : undefined}`.
  - Offre initiale (l.67) clampée : `Math.min(bornes?.max ?? Infinity, Math.max(bornes?.min ?? 1, Math.round(prixVendeur * 0.25)))` — extraire dans le `useState` initialisateur.
  - `NegoBar` (l.154-155) : `minJoueur={bornes?.min ?? 1}` et `maxJoueur={Math.min(bornes?.max ?? Infinity, localNego.prixAdverseCourant)}`.
  - `handleProposer` (l.88) : `proposerOffre(localNego, persona, offreJoueur, scriptTuto ? ALEA_NEGO_SCRIPTEE : undefined)`.

- [ ] **Step 2 : `ItemSwipeDeck`.**
  - Nouvelle prop `indexImpose?: number | null` (défaut `null`).
  - `const clampedIdx = indexImpose ?? (slides.length ? Math.min(index, slides.length - 1) : 0);` (l.64).
  - `go()` : premier garde `if (indexImpose !== null) return;`.
  - `onPointerDown` : `if (indexImpose !== null) return;` (le swipe est inerte, les autres handlers ne s'arment pas sans `startXRef`).
  - Boutons ◀ ▶ : `disabled={indexImpose !== null || …existant}`.
  - Le compteur `n / N` reste rendu (repère utile).

- [ ] **Step 3 : vérifier** — `npx tsc --noEmit` ; `npx eslint src/components/mobile/chine` → 0 erreur.

- [ ] **Step 4 : commit** — `git commit -m "feat(tuto): bornes de négo, modes prescrits et deck verrouillable (composants chine)"`.

---

### Task 7 : Orchestration de la session de chine scriptée

**Files:**
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx`

**Interfaces:**
- Consumes: `genererSessionScriptee` (T3), `scenarioDeLEtape`/`indexObjetScenario`/`deckVerrouille`/`etapeSuivante` (T1-T2), séquences T5, props T6.

- [ ] **Step 1 : session scriptée.** Dans l'effet d'entrée (l.186), remplacer l'appel unique :

```ts
const session = tutorielActif(state)
  ? genererSessionScriptee()
  : genererSession(brocante.taillePool, state.tendances, brocante, celebriteAujourdhui, uniquesExclusDuChinage(state));
```

**Reprise après sortie anticipée** : si `tutorielActif` et que des étapes scriptées sont déjà passées (l'étape courante n'est pas `aller-chiner`), rejouer l'état : marquer `statut: "achete"` les objets d'index < `indexObjetScenario(etape)` qui sont dans `state.inventaireJoueur` (match `templateId`), et `statut: "refuse"` l'objet 0 si l'étape est au-delà de `chine-nego-echec` et qu'il n'est pas possédé :

```ts
if (tutorielActif(state)) {
  const i = indexObjetScenario(state.tutorielEtape);
  const borne = i ?? (state.tutorielEtape === "chine-sortir" ? 4 : 0);
  const possedes = new Set(state.inventaireJoueur.map((o) => o.templateId));
  for (let k = 0; k < borne; k++) {
    const it = session[k];
    it.statut = possedes.has(it.objet.templateId) ? "achete" : "refuse";
  }
}
```

- [ ] **Step 2 : dialogues « avant » par étape.** Remplacer l'effet l.226 :

```ts
const dialoguesJouesRef = useRef<Set<string>>(new Set());
useEffect(() => {
  if (!etape || dialogueTuto) return;
  const AVANT: Partial<Record<TutorielEtape, DialogueSequence>> = {
    "aller-chiner": SEQUENCES_TUTORIEL.tuto_chine_entree,
    "chine-nego-echec": SEQUENCES_TUTORIEL.tuto_nego_echec_avant,
    "chine-achat-direct": SEQUENCES_TUTORIEL.tuto_achat_direct_avant,
    "chine-nego-un": SEQUENCES_TUTORIEL.tuto_nego_un_avant,
    "chine-nego-deux": SEQUENCES_TUTORIEL.tuto_nego_deux_avant,
    "chine-sortir": SEQUENCES_TUTORIEL.tuto_chine_sortir,
  };
  const seq = AVANT[etape];
  if (seq && !dialoguesJouesRef.current.has(seq.id)) {
    dialoguesJouesRef.current.add(seq.id);
    setDialogueTuto(seq);
  }
}, [etape, dialogueTuto]);
```

  `onFini` du `DialogueOverlay` (l.593) devient :

```ts
onFini={() => {
  setDialogueTuto(null);
  if (etape === "aller-chiner") avancerTutoriel("chine-nego-echec");
  else if (dialogueApresRef.current) {
    const vers = dialogueApresRef.current;
    dialogueApresRef.current = null;
    avancerTutoriel(vers);
  }
}}
```

  avec `const dialogueApresRef = useRef<TutorielEtape | null>(null);` — posé par les débriefs ci-dessous.

- [ ] **Step 3 : débriefs et avancement.**
  - Échec de l'objet 1 : envelopper `onUpdateNego` (l.562) —

```ts
onUpdateNego={(nego) => {
  setItem(item.id, { negociation: nego });
  if (etape === "chine-nego-echec" && nego.statut === "fache" && item.statut !== "refuse") {
    // L'objet est perdu : il disparaît du deck après un battement, le
    // temps de voir le tampon « fâché », puis le grand-père débriefe.
    window.setTimeout(() => {
      setItem(item.id, { statut: "refuse" });
      setNegoOuverte(null);
      dialogueApresRef.current = "chine-achat-direct";
      setDialogueTuto(SEQUENCES_TUTORIEL.tuto_nego_echec_apres);
    }, 900);
  }
}}
```

  - Achats : dans `handleAchatAuPrix` (l.365), remplacer le bloc `if (etape === "chine-nego-echec")` hérité de la Task 1 par :

```ts
const APRES: Partial<Record<TutorielEtape, { seq: DialogueSequence; vers: TutorielEtape }>> = {
  "chine-achat-direct": { seq: SEQUENCES_TUTORIEL.tuto_achat_direct_apres, vers: "chine-nego-un" },
  "chine-nego-un": { seq: SEQUENCES_TUTORIEL.tuto_nego_un_apres, vers: "chine-nego-deux" },
  "chine-nego-deux": { seq: SEQUENCES_TUTORIEL.tuto_nego_deux_apres, vers: "chine-sortir" },
};
const suite = etape ? APRES[etape] : undefined;
if (suite) {
  dialogueApresRef.current = suite.vers;
  setDialogueTuto(suite.seq);
}
```

- [ ] **Step 4 : verrouillage du deck et rôles.**
  - Deck : calculer l'index imposé sur les slides (les slides filtrent les `refuse`, on cherche par identité de template) :

```ts
const scnActif = etape ? scenarioDeLEtape(etape) : null;
const indexImpose = useMemo(() => {
  if (!scnActif) return null;
  const i = slides.findIndex(
    (s) => s.kind === "item" && s.item.objet.templateId === scnActif.templateId,
  );
  return i === -1 ? null : i;
}, [slides, scnActif]);
```

  passer `indexImpose={indexImpose}` à `ItemSwipeDeck`.
  - Rôles par carte (le tiroir est rendu par carte) :

```ts
const scriptTutoPour = (it: ObjetEnVente) => {
  if (!state || !tutorielActif(state)) return null;
  const scn = SESSION_TUTORIEL.find((s) => s.templateId === it.objet.templateId);
  if (!scn) return null;
  if (scnActif && scn === scnActif) {
    return { role: scn.role, bornes: scn.bornesOffre };
  }
  // Hors de la carte active pendant le script (et pendant chine-sortir) :
  // rien ne s'achète — le grand-père a dit stop.
  return it.statut === "achete" ? null : { role: "decor" as const };
};
```

  passer `scriptTuto={scriptTutoPour(item)}` au `ChineNegoDrawer` et remplacer le `tutoGuide` provisoire : `tutoGuide={scnActif !== null && item.objet.templateId === scnActif.templateId && item.statut !== "achete"}`.
  - Supprimer les remaps provisoires de la Task 1 devenus morts (l'ancien `avancerTutoriel("chine-sortir")` post-achat, etc.).

- [ ] **Step 5 : vérification manuelle** — `npm run dev` (⚠ `localhost`, jamais `127.0.0.1`), nouvelle partie, dérouler : dialogue d'accueil → porte → chine → échec tourne-disque (offre max 40 → fâché, l'objet disparaît, débrief) → carafe (négocier grisé, acheter main) → manette (négo bornée 12-20, accord ≤ 3 tours) → peluche (41-52) → chine-sortir (swipe libre, achats grisés sur radio/lampe, Sortir pulse) → bilan → bureau. Vérifier le budget final ≥ 55 €.

- [ ] **Step 6 : commit** — `git commit -m "feat(tuto): session de chine scriptée — 4 leçons guidées par le grand-père"`.

---

### Task 8 : TabBar sélective, retour au bureau, colis cadeau

**Files:**
- Modify: `src/components/mobile/TabBar.tsx`
- Modify: `src/app/(qg)/layout.tsx`

**Interfaces:**
- Consumes: `ongletTutorielPermis` (T2), `colisEnAttente` (T1), séquences `tuto_retour`, `tuto_peluche_collection`, `tuto_colis_cadeau` (T5).

- [ ] **Step 1 : TabBar.** Après `tutoEnCours` (l.164) :

```ts
const ongletPermis = state ? ongletTutorielPermis(state.tutorielEtape) : null;
```

  - `onClick` (l.213) : `if (tutoEnCours && tab.path !== ongletPermis) return;`
  - Main de guidage : généraliser `mainMiniTuto` —

```ts
const mainTuto = (tabPath: string): boolean => {
  if (ongletPermis && tabPath === ongletPermis && pathname !== ongletPermis) return true;
  return mainMiniTuto(tabPath);
};
```

  utiliser `mainTuto` pour `className` (l.212) et `mainAffichee` (l.184) — le z-index 40 existant suit.

- [ ] **Step 2 : layout QG — dialogues d'étape.** L'effet l.418 déclenche par étape mais certains dialogues ne font PAS avancer l'étape à leur fin (la boucle infinie guette) : introduire le garde une-fois :

```ts
const dialoguesQgJouesRef = useRef<Set<string>>(new Set());
const jouerDialogueQg = (seq: DialogueSequence) => {
  if (dialoguesQgJouesRef.current.has(seq.id)) return;
  dialoguesQgJouesRef.current.add(seq.id);
  setDialogueQg(seq);
};
useEffect(() => {
  if (dialogueQg) return;
  if (etape === "accueil") jouerDialogueQg(SEQUENCES_TUTORIEL.tuto_accueil);
  else if (etape === "chine-sortir") jouerDialogueQg(SEQUENCES_TUTORIEL.tuto_retour);
  else if (etape === "collection-envoyer") jouerDialogueQg(SEQUENCES_TUTORIEL.tuto_peluche_collection);
  else if (etape === "conclusion") jouerDialogueQg(SEQUENCES_TUTORIEL.tuto_conclusion);
}, [etape, dialogueQg]);
```

  (`accueil`/`conclusion` avancent à l'`onFini` comme aujourd'hui — le garde ne gêne pas, l'étape change.)
  `onFini` (l.919) : `else if (etape === "chine-sortir") avancerTutoriel("stockage-ouvrir");` remplace la ligne `rentrer` héritée ; ajouter `else if (colisCadeauEnCours) { setColisCadeauEnCours(false); const premier = ouvrirObjetColis(); if (premier) { setNumeroColis(1); setObjetColis(premier); } }`.

- [ ] **Step 3 : colis cadeau.** État local `const [colisCadeauEnCours, setColisCadeauEnCours] = useState(false);`. Le `onTap` du `QgColis` :

```ts
onTap={() => {
  playClick();
  if ((state?.colisTutorielLivres ?? 0) === 0 && !dialoguesQgJouesRef.current.has("tuto_colis_cadeau")) {
    dialoguesQgJouesRef.current.add("tuto_colis_cadeau");
    setColisCadeauEnCours(true);
    setDialogueQg(SEQUENCES_TUTORIEL.tuto_colis_cadeau);
    return;
  }
  const premier = ouvrirObjetColis();
  if (premier) {
    setNumeroColis((state?.colisTutorielLivres ?? 0) + 1);
    setObjetColis(premier);
  }
}}
```

  (la condition d'affichage `colisEnAttente(state) && !dialogueQg` vient de la Task 1).

- [ ] **Step 4 : vérification manuelle** — reprendre la save de la Task 7 au bureau : dialogue `tuto_retour` → main sur l'onglet Stockage, autres onglets inertes ; en fin de partie tuto complète : après l'ouverture du carnet (chapitre 1), le colis apparaît devant la porte, son premier tap joue `tuto_colis_cadeau` puis la cérémonie ×5 s'enchaîne. Vérifier aussi « Passer le tutoriel » → colis disponible après le carnet.

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): TabBar sélective et colis en cadeau post-carnet"`.

---

### Task 9 : Composant `TutorielCoach`

**Files:**
- Create: `src/components/mobile/tutoriel/TutorielCoach.tsx`
- Modify: `src/app/globals.css` (styles + reduced-motion)
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (clé `tutoriel.coachContinuer`)

**Interfaces:**
- Produces:

```ts
export interface CoachEtape {
  /** Valeur de l'attribut data-tuto-coach de l'élément à éclairer ; null = carte centrée sans découpe. */
  cible: string | null;
  texte: string;
}
export function TutorielCoach({ etapes, onFini }: { etapes: CoachEtape[]; onFini: () => void }): JSX.Element | null;
```

- [ ] **Step 1 : implémentation.** Overlay `position: fixed; inset: 0; zIndex: 100` rendu via portal (`createPortal(document.body)`, même pattern que `DialogueOverlay`). Fonctionnement :
  - état `idx` (0-based) ; à chaque étape, si `cible !== null`, localiser `document.querySelector('[data-tuto-coach="' + cible + '"]')` et mesurer `getBoundingClientRect()` (recalcul sur `resize`/`scroll` capturés + un `requestAnimationFrame` après montage — les rects bougent à l'ouverture de la fenêtre flottante). Élément introuvable ⇒ traiter comme `cible: null` (fail-open, jamais de blocage).
  - découpe : un div positionné sur le rect (padding 6px, `borderRadius: 10`) avec `boxShadow: "0 0 0 200vmax rgba(15,30,22,0.72)"` et `border: "2px solid var(--brass-300)"` — le voile est le box-shadow, la zone reste éclairée. `pointerEvents: none` sur la découpe, le conteneur capte le tap.
  - bulle : carte `var(--paper-100)`, bord `var(--brass-500)`, `fontFamily: var(--font-serif)`, positionnée sous le rect si `rect.top < 50%` de la fenêtre, au-dessus sinon ; largeur `min(320px, calc(100vw - 32px))` ; en bas, la mention `d.tutoriel.coachContinuer` en `--font-mono` 10px uppercase.
  - tap n'importe où : `idx + 1`, ou `onFini()` après la dernière étape.
  - accessibilité : conteneur `role="dialog"` + `aria-live="polite"`, le texte de l'étape dans la bulle.
  - i18n : ajouter `coachContinuer: "Touche pour continuer"` (`fr`), `"Tap to continue"`, `"Toca para continuar"`, `"Άγγιξε για να συνεχίσεις"` dans la section `tutoriel` des 4 dictionnaires.
  - CSS : classe `.coach-decoupe { transition: all 260ms ease; }` dans `globals.css`, et dans le bloc `prefers-reduced-motion` existant : `.coach-decoupe { transition: none; }`.

- [ ] **Step 2 : vérifier** — `npx tsc --noEmit` ; `npx eslint src/components/mobile/tutoriel`.

- [ ] **Step 3 : commit** — `git commit -m "feat(tuto): TutorielCoach — visite guidée à découpe lumineuse"`.

---

### Task 10 : Visite du stockage + envoi de la peluche

**Files:**
- Modify: `src/app/(qg)/stockage/page.tsx`
- Modify: `src/components/InventoryGrid.tsx` (et sa ligne `StockageItemRow` si séparée — vérifier avec `grep -rn "mainVinyles" src/components`)
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (clés `tutoriel.coachStockage*`)

**Interfaces:**
- Consumes: `TutorielCoach` (T9), `donCollectionPermis`/`PELUCHE_TEMPLATE_ID` (T2), `avancerTutoriel`.
- Produces: attributs `data-tuto-coach` : `"stockage-capacite"`, `"stockage-categories"`, `"stockage-objet"`, `"stockage-amelioration"` ; prop `InventoryGrid.mainTemplateId?: string | null`.

- [ ] **Step 1 : arrivée et coach.** Dans `StockagePageInner` :

```ts
const { avancerTutoriel } = useGameActions();
const etape = state?.tutorielEtape;
useEffect(() => {
  if (etape === "stockage-ouvrir") avancerTutoriel("stockage-focus");
}, [etape, avancerTutoriel]);
```

  Poser les attributs : `data-tuto-coach="stockage-capacite"` sur le div gauche du `PageHeaderBar` (l.147), `data-tuto-coach="stockage-amelioration"` sur un wrapper du `UpgradeButton`/`max` (l.171), `data-tuto-coach="stockage-categories"` sur le div l.210, `data-tuto-coach="stockage-objet"` sur un wrapper du `InventoryGrid`. Rendu du coach :

```tsx
{etape === "stockage-focus" && (
  <TutorielCoach
    etapes={[
      { cible: "stockage-capacite", texte: d.tutoriel.coachStockageCapacite },
      { cible: "stockage-categories", texte: d.tutoriel.coachStockageCategories },
      { cible: "stockage-objet", texte: d.tutoriel.coachStockageObjet },
      { cible: "stockage-amelioration", texte: d.tutoriel.coachStockageAmelioration },
    ]}
    onFini={() => avancerTutoriel("collection-envoyer")}
  />
)}
```

  Clés FR : `coachStockageCapacite: "Ta réserve : le Garage, 10 places. Chaque trouvaille y arrive après la brocante."`, `coachStockageCategories: "Filtre par catégorie pour t'y retrouver quand la réserve se remplit."`, `coachStockageObjet: "Chaque ligne montre l'état de l'objet — et son bouton pour l'envoyer en collection."`, `coachStockageAmelioration: "Plus tard, tu pourras agrandir : cave, puis hangar."` (+ EN/ES/EL).

- [ ] **Step 2 : main sur la peluche + gate du don.**
  - `InventoryGrid` : ajouter `mainTemplateId?: string | null`, transmis à la ligne ; dans la ligne, si `objet.templateId === mainTemplateId`, poser `className="tuto-main tuto-main-haut"` sur le bouton « → Collection » (suivre le pattern du prop `mainVinyles` existant — même piège de z-index : la fenêtre flottante est à 35, vérifier que la main reste visible ; sinon élever le bouton en `position: relative; zIndex: 36` quand la main est posée).
  - Page stockage : `mainTemplateId={etape === "collection-envoyer" ? PELUCHE_TEMPLATE_ID : null}` ; dans `envoyerCollection` (l.94), en tête :

```ts
if (state && !donCollectionPermis(state.tutorielEtape, o.templateId)) return;
```

  et après `res.ok`, si `etape === "collection-envoyer"` → `avancerTutoriel("collection-lecon")`.

- [ ] **Step 3 : vérification manuelle** — depuis la save T8 : onglet Stockage → coach 4 temps → dialogue peluche (layout, T8) → main sur la ligne de la peluche → don → étape `collection-lecon`, main TabBar sur Collection. Les autres boutons collection inertes pendant l'étape.

- [ ] **Step 4 : commit** — `git commit -m "feat(tuto): visite guidée du stockage et envoi de la peluche en collection"`.

---

### Task 11 : Leçon de collection

**Files:**
- Modify: `src/app/collection/page.tsx`
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (clés `tutoriel.coachCollection*`)

**Interfaces:**
- Consumes: `TutorielCoach` (T9), séquence `tuto_collection_lecon` (T5), `PELUCHE_TEMPLATE_ID`.
- Produces: `data-tuto-coach="collection-case"`, `"collection-valeur"`.

- [ ] **Step 1 : repérage.** Lire `src/app/collection/page.tsx` et `src/components/CollectionGrid.tsx` : localiser (a) l'en-tête affichant la valeur/progression globale (poser `data-tuto-coach="collection-valeur"`), (b) la case du slot de la peluche (le composant de slot reçoit le templateId — poser `data-tuto-coach="collection-case"` conditionnellement quand `templateId === PELUCHE_TEMPLATE_ID`). S'il n'existe PAS d'affichage de valeur totale sur cette page, cibler la barre de progression de catégorie « Jeux & Loisirs » à la place — ne pas inventer d'UI nouvelle.

- [ ] **Step 2 : coach + dialogue.** Sur la page collection :

```tsx
const [coachFini, setCoachFini] = useState(false);
{etape === "collection-lecon" && !coachFini && (
  <TutorielCoach
    etapes={[
      { cible: "collection-case", texte: d.tutoriel.coachCollectionCase },
      { cible: "collection-valeur", texte: d.tutoriel.coachCollectionValeur },
      { cible: null, texte: d.tutoriel.coachCollectionDeblocage },
    ]}
    onFini={() => setCoachFini(true)}
  />
)}
{etape === "collection-lecon" && coachFini && (
  <DialogueOverlay
    sequence={SEQUENCES_TUTORIEL.tuto_collection_lecon}
    nom={nomExpediteur("grand-pere", locale)}
    portraits={GRAND_PERE_PORTRAITS}
    onFini={() => avancerTutoriel("preparer-etal")}
  />
)}
```

  Clés FR : `coachCollectionCase: "La peluche a rejoint sa case : elle ne se vend plus, elle se montre."`, `coachCollectionValeur: "La valeur de ta collection grandit à chaque donation."`, `coachCollectionDeblocage: "Cette valeur débloque de nouvelles brocantes — et fait ta réputation."` (+ EN/ES/EL).

- [ ] **Step 3 : vérification manuelle** — le Marché aux puces doit être réellement débloqué (peluche 65 € × 1.1 = 72 ≥ 30) : après la leçon, `/chiner` liste 2 brocantes hors tuto… (pendant le tuto la liste reste réduite — vérifier seulement `calculerBrocantesDebloqueesParTier` via l'écran après fin de tuto, ou en test : déjà couvert par `deblocage.test.ts` + le test de seuil T2). Vérifier le retour : main TabBar → Bureau, porte pulse, « Étaler » actif.

- [ ] **Step 4 : commit** — `git commit -m "feat(tuto): leçon de collection — valeur, réputation, déblocage réel"`.

---

### Task 12 : `lib/coffreTuto.ts` (logique pure des traces)

**Files:**
- Create: `src/lib/coffreTuto.ts`
- Test: `src/lib/coffreTuto.test.ts`

**Interfaces:**
- Consumes: `TRACES_TUTORIEL`, `TOLERANCE_TRACE_POS`, `TOLERANCE_TRACE_ROT`, `TraceScenario` (T2) ; `ObjetEnVitrine`, `TutorielEtape`.
- Produces:

```ts
export function traceActive(etape: TutorielEtape): TraceScenario | null;
export function estSurTrace(ov: Pick<ObjetEnVitrine, "posX" | "posY" | "rotation">, trace: TraceScenario): boolean;
export function tracesToutesPosees(etape: TutorielEtape, coffre: readonly ObjetEnVitrine[]): boolean;
```

- [ ] **Step 1 : test qui échoue** — `src/lib/coffreTuto.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { estSurTrace, traceActive, tracesToutesPosees } from "./coffreTuto";
import { TRACES_TUTORIEL } from "@/data/tutorielScenario";

const t0 = TRACES_TUTORIEL[0]; // manette, rotation 0
const t1 = TRACES_TUTORIEL[1]; // carafe, rotation 40

describe("traceActive", () => {
  it("mappe les deux étapes du coffre", () => {
    expect(traceActive("coffre-trace-un")).toBe(t0);
    expect(traceActive("coffre-trace-deux")).toBe(t1);
    expect(traceActive("preparer-etal")).toBeNull();
  });
});

describe("estSurTrace", () => {
  it("accepte dans les tolérances (distance ET angle)", () => {
    expect(estSurTrace({ posX: t0.posX + 0.05, posY: t0.posY, rotation: 8 }, t0)).toBe(true);
    expect(estSurTrace({ posX: t1.posX, posY: t1.posY - 0.04, rotation: 47 }, t1)).toBe(true);
  });
  it("refuse hors distance ou hors angle", () => {
    expect(estSurTrace({ posX: t0.posX + 0.12, posY: t0.posY, rotation: 0 }, t0)).toBe(false);
    expect(estSurTrace({ posX: t1.posX, posY: t1.posY, rotation: 90 }, t1)).toBe(false);
  });
  it("gère le tour complet (350° ≈ −10°) et les champs absents", () => {
    expect(estSurTrace({ posX: t0.posX, posY: t0.posY, rotation: 352 }, t0)).toBe(true);
    expect(estSurTrace({ rotation: undefined, posX: undefined, posY: undefined }, t0)).toBe(false);
  });
});

describe("tracesToutesPosees", () => {
  const ovManette = { objet: { templateId: "jx.manette_vibraduo" }, posX: t0.posX, posY: t0.posY, rotation: 0 };
  const ovCarafe = { objet: { templateId: "ma.carafe_cristal_taille" }, posX: t1.posX, posY: t1.posY, rotation: 40 };
  it("étape un : la trace 1 posée suffit", () => {
    expect(tracesToutesPosees("coffre-trace-un", [ovManette] as never)).toBe(true);
    expect(tracesToutesPosees("coffre-trace-un", [] as never)).toBe(false);
  });
  it("étape deux : les DEUX traces doivent être posées", () => {
    expect(tracesToutesPosees("coffre-trace-deux", [ovManette, ovCarafe] as never)).toBe(true);
    expect(tracesToutesPosees("coffre-trace-deux", [ovManette] as never)).toBe(false);
    expect(tracesToutesPosees("coffre-trace-deux", [ovManette, { ...ovCarafe, rotation: 0 }] as never)).toBe(false);
  });
  it("hors étapes coffre : vrai (ne bloque jamais Valider)", () => {
    expect(tracesToutesPosees("termine", [] as never)).toBe(true);
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/coffreTuto.test.ts --maxWorkers=4` → FAIL.

- [ ] **Step 3 : implémentation** — `src/lib/coffreTuto.ts` :

```ts
import type { ObjetEnVitrine, TutorielEtape } from "@/types/game";
import {
  TOLERANCE_TRACE_POS, TOLERANCE_TRACE_ROT, TRACES_TUTORIEL,
  type TraceScenario,
} from "@/data/tutorielScenario";

/** Trace fantôme à afficher pour l'étape courante du tutoriel du coffre. */
export function traceActive(etape: TutorielEtape): TraceScenario | null {
  if (etape === "coffre-trace-un") return TRACES_TUTORIEL[0];
  if (etape === "coffre-trace-deux") return TRACES_TUTORIEL[1];
  return null;
}

/** L'objet est-il posé sur la trace (distance ET angle dans les tolérances) ? */
export function estSurTrace(
  ov: Pick<ObjetEnVitrine, "posX" | "posY" | "rotation">,
  trace: TraceScenario,
): boolean {
  if (ov.posX === undefined || ov.posY === undefined) return false;
  const dist = Math.hypot(ov.posX - trace.posX, ov.posY - trace.posY);
  if (dist > TOLERANCE_TRACE_POS) return false;
  const rot = (((ov.rotation ?? 0) % 360) + 360) % 360;
  const brut = Math.abs(rot - trace.rotation);
  return Math.min(brut, 360 - brut) <= TOLERANCE_TRACE_ROT;
}

function poseeDans(coffre: readonly ObjetEnVitrine[], trace: TraceScenario): boolean {
  const ov = coffre.find((o) => o.objet.templateId === trace.templateId);
  return !!ov && estSurTrace(ov, trace);
}

/**
 * Le bouton Valider du coffre n'est actif, pendant le tutoriel, que quand
 * les traces exigées par l'étape sont satisfaites. Hors étapes coffre :
 * toujours vrai (fail-open).
 */
export function tracesToutesPosees(
  etape: TutorielEtape,
  coffre: readonly ObjetEnVitrine[],
): boolean {
  if (etape === "coffre-trace-un") return poseeDans(coffre, TRACES_TUTORIEL[0]);
  if (etape === "coffre-trace-deux") {
    return poseeDans(coffre, TRACES_TUTORIEL[0]) && poseeDans(coffre, TRACES_TUTORIEL[1]);
  }
  return true;
}
```

- [ ] **Step 4 : vérifier** — PASS ; **Step 5 : commit** — `git commit -m "feat(tuto): coffreTuto — logique pure des traces fantômes"`.

---

### Task 13 : Coffre à traces — UI et orchestration

**Files:**
- Modify: `src/components/vente/CoffreCanvas.tsx` (rendu de la trace)
- Modify: `src/components/vente/CoffreChargement.tsx` (props traversantes, gate Valider, main carrousel)
- Modify: `src/components/vente/CarrouselStock.tsx` (main par templateId)
- Modify: `src/app/vitrine/prep/page.tsx` (orchestration, snap, avancement)

**Interfaces:**
- Consumes: T12, `TraceScenario`, `getItemThumbUrl`, `getScaleCoffre`/`tailleDe` (patterns d'`ItemDansCoffre`).
- Produces:
  - `CoffreCanvas` prop `trace?: TraceScenario | null`
  - `CoffreChargement` props `trace?: TraceScenario | null; validerBloque?: boolean; mainTemplateId?: string | null`
  - `CarrouselStock` prop `mainTemplateId?: string | null` (remplace l'usage index-0 de `tutoMain` pendant le tuto v2 ; l'ancienne prop reste pour compat).

- [ ] **Step 1 : rendu de la trace (`CoffreCanvas`).** Après l'overlay du masque (l.299), quand `trace && !closing` :

```tsx
{trace && !closing && (() => {
  const tpl = getTemplate(trace.templateId);
  if (!tpl) return null;
  const scale = getScaleCoffre(tailleDe(tpl), camion.capacitePlaces);
  const w = ref.current?.getBoundingClientRect().width ?? 280;
  const sizePx = scale * w;
  const src = getItemThumbUrl(trace.templateId);
  return (
    <div
      aria-hidden
      className="trace-fantome"
      style={{
        position: "absolute",
        left: `calc(${trace.posX * 100}% - ${sizePx / 2}px)`,
        top: `calc(${trace.posY * 100}% - ${sizePx / 2}px)`,
        width: sizePx,
        height: sizePx,
        transform: `rotate(${trace.rotation}deg)`,
        border: "2px dashed var(--brass-300)",
        borderRadius: 8,
        zIndex: 1,
        pointerEvents: "none",
        display: "grid",
        placeItems: "center",
      }}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" style={{ width: "88%", height: "88%", objectFit: "contain", filter: "brightness(0)", opacity: 0.35 }} />
      )}
    </div>
  );
})()}
```

  et dans `globals.css` : `.trace-fantome { animation: broc-trace-pulse 1.6s ease-in-out infinite; } @keyframes broc-trace-pulse { 0%,100% { opacity: 0.75; } 50% { opacity: 1; } }` + neutralisation dans le bloc reduced-motion. La position de l'image ne suit pas la hauteur `w / aspectRatio` — reprendre EXACTEMENT le mapping d'`ItemDansCoffre` (`posX * cotePixelsX`, `posY * cotePixelsY` avec `cotePixelsY = w / camion.aspectRatio`) pour que trace et objet coïncident : utiliser `left: trace.posX * w - sizePx/2` et `top: trace.posY * (w / camion.aspectRatio) - sizePx/2` en pixels (le conteneur a `aspectRatio`, ses % verticaux ≠ horizontaux).

- [ ] **Step 2 : traversée et gate (`CoffreChargement`).** Ajouter les 3 props, passer `trace` à `CoffreCanvas`, et :
  - `const peutValider = p.coffre.length > 0 && overlaps.size === 0 && p.validerBloque !== true;`
  - `CarrouselStock` : `mainTemplateId={p.mainTemplateId ?? null}` — dans `CarrouselStock`, la main se pose sur l'objet dont `o.templateId === mainTemplateId` (sinon comportement `tutoMain` existant) :

```ts
className={
  (mainTemplateId ? o.templateId === mainTemplateId : tutoMain && i === 0)
    ? "tuto-main tuto-main-droite"
    : undefined
}
```

  - le `className` du bouton Valider (l.634) : la main seulement si `p.tuto && peutValider && !closing` — inchangé, le gate `validerBloque` suffit.

- [ ] **Step 3 : orchestration (`prep/page.tsx`).**

```ts
const { avancerTutoriel } = useGameActions();
const etape = state?.tutorielEtape;
useEffect(() => {
  if (etape === "preparer-etal") avancerTutoriel("coffre-trace-un");
}, [etape, avancerTutoriel]);

const trace = etape ? traceActive(etape) : null;
const validerBloque = state ? !tracesToutesPosees(state.tutorielEtape, coffre) : false;

/** Snap : dès que l'objet de la trace entre dans les tolérances, il s'aimante. */
const verifierTrace = (objetId: string, x: number, y: number, rot: number) => {
  if (!trace || !state) return false;
  const ov = coffre.find((o) => o.objet.id === objetId);
  if (!ov || ov.objet.templateId !== trace.templateId) return false;
  if (!estSurTrace({ posX: x, posY: y, rotation: rot }, trace)) return false;
  ajusterPositionVitrine(objetId, trace.posX, trace.posY, trace.rotation);
  void audioManager.playCoffreOuvre();
  if (state.tutorielEtape === "coffre-trace-un") avancerTutoriel("coffre-trace-deux");
  return true;
};
```

  Brancher : dans `handleAjouter` (après `mettreEnVitrine`) → `verifierTrace(objetId, posX, posY, 0)` ; dans `onMove` → si `verifierTrace(id, x, y, ov.rotation ?? 0)` retourne vrai, ne pas rappeler `ajusterPositionVitrine` ; dans `handleRotate` → idem avec `(ov.posX, ov.posY, norm)`. Passer à `CoffreChargement` : `trace={trace}`, `validerBloque={validerBloque}`, `mainTemplateId={trace?.templateId ?? null}`, et `tuto={state.tutorielEtape === "coffre-trace-un" || state.tutorielEtape === "coffre-trace-deux"}` (remplace `preparer-etal`) ; `CoffrePricing` : `tutoMainValider={state.tutorielEtape === "coffre-trace-deux"}`.

- [ ] **Step 4 : vérification manuelle** — arrivée dans la prep : étape passe à `coffre-trace-un`, main sur la manette dans le carrousel ; tap → objet au centre, trace pointillée visible ; glisser sur la trace → aimantation + son + étape 2 ; trace carafe pivotée 40° ; poser sans tourner → pas de snap ; rotation 2 doigts dans la tolérance → snap ; Valider inactif tant que tout n'est pas posé. Sortir par Retour (vide la vitrine) et re-rentrer : les traces se rejouent proprement (étape conservée).

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): coffre à traces fantômes — pose aimantée et validation gatée"`.

---

### Task 14 : Animation « un doigt déplace, deux doigts tournent »

**Files:**
- Create: `src/components/vente/RotationHint.tsx`
- Modify: `src/components/vente/CoffreChargement.tsx` (montage)
- Modify: `src/app/globals.css` (keyframes + reduced-motion)
- Modify: `src/app/vitrine/prep/page.tsx` (prop)

**Interfaces:**
- Consumes: asset existant `public/tutoriel/main-pointeuse.webp`.
- Produces: `<RotationHint actif={boolean} />` — overlay `pointerEvents: none` centré sur le coffre.

- [ ] **Step 1 : implémentation.** `RotationHint` : un conteneur absolu centré dans le canvas (`position: absolute; inset: 0; display: grid; placeItems: center; pointerEvents: none; zIndex: 2`), contenant un « objet fantôme » (carré arrondi 64px semi-transparent) et DEUX images `main-pointeuse.webp` (26px) :
  - Phase 1 (0 → 40 % du cycle) : main A seule, translation gauche→droite avec l'objet (déplacer à un doigt).
  - Phase 2 (40 → 100 %) : main B apparaît (fondu), le groupe objet+mains tourne de 0 à 40° (deux doigts qui tournent).
  - Une seule `@keyframes broc-rotation-hint` sur le groupe (translate puis rotate), `animation: broc-rotation-hint 3.2s ease-in-out infinite`, et un fondu `broc-rotation-hint-main2` pour la main B. Cycle ~3.2 s, pause naturelle entre boucles via 10 % de keyframes immobiles.
  - Masquage sur interaction : le composant écoute `pointerdown` sur `document` → `setHidden(true)` + minuteur 8 s → `setHidden(false)` (cleanté au démontage). `prefers-reduced-motion` : dans le bloc média de `globals.css`, `animation: none` sur les deux classes, le hint reste affiché statique (objet + deux mains posées, image parlante sans mouvement).
- [ ] **Step 2 : montage.** `CoffreChargement` reçoit `rotationHint?: boolean` et rend `<RotationHint actif={p.rotationHint === true && !closing} />` DANS le conteneur du canvas (à côté de `CoffreCanvas`, wrapper `position: relative`). `prep/page.tsx` : `rotationHint={etape === "coffre-trace-deux" && validerBloque}` (visible tant que la carafe n'est pas posée).
- [ ] **Step 3 : vérifier** — visuel en dev, `npx eslint src/components/vente` ; **Step 4 : commit** — `git commit -m "feat(tuto): animation d'apprentissage de la rotation à deux doigts"`.

---

### Task 15 : Journée de vente, balayage final, recette

**Files:**
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (vérifier les conditions posées en Task 1)
- Modify: divers (résultats du grep)
- Test: suite complète

- [ ] **Step 1 : journée.** Vérifier dans `journee/ClientPage.tsx` : l'entrée déclenche `tuto_vente_entree` quand `etape === "coffre-trace-deux"` puis `avancerTutoriel("premiere-vente")` ; la vente conclue déclenche `tuto_vente_faite` → `avancerTutoriel("conclusion")` ; le bouton Sortir pulse à `conclusion` — ces trois points existaient, seule la première condition a changé (Task 1). Dérouler en dev.

- [ ] **Step 2 : balayage.**
  - `grep -rn '"premier-achat"\|"rentrer"\|"ouvrir-colis"\|tuto_achat_fait' src scripts docs/superpowers/plans` → zéro occurrence de code vivant (les specs/plans historiques ne comptent pas).
  - `grep -rn "tutorielEtape" scripts src/lib/storage src/lib/simulation` → les saves de démo/bancs posent des valeurs encore valides (`"accueil"`/`"termine"`).
  - Level-up : vérifier le gating de `LevelUpOverlay` (grep `LevelUpOverlay` dans `src/app/layout.tsx`/composants) — si la célébration peut se jouer au bureau pendant le tutoriel, la différer avec `!tutorielActif(state)` (le mécanisme `niveauVu` rejouera la célébration après). XP attendue du tuto ≈ 70 < 100 (niveau 1) : le cas est théorique, le garde est une ceinture.
  - Mystère/pub : `ClientPage.tsx` chine — le vendeur mystère reste exclu (`!tutorielActif`), inchangé.
  - `chiner/page.tsx` et `vitrine/page.tsx` : la liste réduite à `["vide-grenier-quartier"]` pendant `tutorielActif` — inchangée, vérifier compile.

- [ ] **Step 3 : suite complète + lint.** `npx vitest run --maxWorkers=4` → verte ; `npx tsc --noEmit` ; `npx eslint src` → 0 erreur.

- [ ] **Step 4 : recette complète en dev.** Nouvelle partie, dérouler TOUT le flux : accueil → chine scriptée (échec/direct/négo ×2, sortie) → bilan → retour (dialogue) → stockage (coach ×4) → peluche en collection → leçon collection → bureau → porte « Étaler » → coffre trace 1 → trace 2 + rotation → pricing → brocante → première vente → conclusion → carnet/chapitre 1 → colis cadeau ×5. Puis « Passer le tutoriel » depuis l'accueil d'une partie neuve : lettre de Maman présente, carnet guidé, colis disponible après le carnet, aucune main orpheline.

- [ ] **Step 5 : commit final** — `git commit -m "feat(tuto): balayage final du tutoriel v2 — flux complet recetté"`.
