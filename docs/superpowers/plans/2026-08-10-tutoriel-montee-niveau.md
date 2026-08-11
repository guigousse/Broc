# Tutoriel — la montée de niveau devient une leçon : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insérer trois étapes de tutoriel entre la dernière vente et la conclusion : la fanfare de montée de niveau se joue, le grand-père félicite et fait visiter l'écran Compétences, le joueur dépense son premier point sur « Lecteur d'âmes ».

**Architecture:** Aucun mécanisme neuf — on rejoue les patrons déjà éprouvés du tutoriel : étapes persistées dans `TutorielEtape`, données de scénario dans `src/data/tutorielScenario.ts`, helpers purs dans `src/lib/tutoriel.ts`, guidage d'écran par `TutorielCoach` + classes `tuto-main`, dialogues du grand-père en 4 langues.

**Tech Stack:** Next.js/React/TypeScript, vitest, i18n maison 4 langues (FR source).

**Spec:** `docs/superpowers/specs/2026-08-10-tutoriel-montee-niveau-design.md`

## Global Constraints

- **Tests** : `npx vitest run <fichier> --maxWorkers=4` — drapeau OBLIGATOIRE sur ce Mac. Suite complète : `npx vitest run --maxWorkers=4`, **au premier plan**, timeout 8 min, jamais en arrière-plan ni via un moniteur. Un échec sur un fichier SANS RAPPORT est probablement un fantôme de contention : le relancer seul pour confirmer, et le signaler.
- **Lint** : `npx eslint <chemins>` (`npm run lint` est cassé). **Typecheck** : `npx tsc --noEmit` — ignorer UNIQUEMENT les erreurs pré-existantes du fichier non suivi `scripts/_gen-saves-evenements.ts`.
- **PAS de bump `SAVE_VERSION`** (reste 19) : les étapes s'ajoutent au type, la migration normalise déjà toute valeur inconnue vers `termine`.
- **i18n** : toute clé UI dans les QUATRE fichiers `src/lib/i18n/ui/{fr,en,es,el}.ts` (le typage sur la forme du FR casse la compilation en cas d'oubli) ; tout dialogue dans `src/data/dialogues.ts` + overlays `src/lib/i18n/contenu/{en,es,el}/dialogues.ts` (parité testée) + la liste d'ids attendus de `src/data/dialogues.test.ts`.
- **Étapes cibles (23)**, ordre exact : `accueil, aller-chiner, chine-nego-echec, chine-achat-direct, chine-nego-un, chine-nego-deux, chine-sortir, stockage-ouvrir, stockage-focus, collection-envoyer, collection-lecon, ouvrir-colis, preparer-etal, coffre-trace-un, coffre-trace-deux, vente-refus, vente-directe, vente-nego, niveau-celebration, competences-visite, competences-choix, conclusion, termine`.
- **Compétence cible** : `general.presentation.1` (« Lecteur d'âmes », arbre `general`, branche `presentation`, coût 1 point, `niveauBrocanteurRequis: 0`) — vérifié au catalogue.
- **⚠ Piège de clipping des mains, rencontré DEUX fois sur ce projet** : tout conteneur portant `content-visibility: auto` (`.broc-grid-cell`, `.broc-list-row`) ou `overflow: hidden` clippe le pseudo-élément `::after` de `.tuto-main*` dessiné hors de la boîte. Sur tout élément qui porte une main, poser en inline `contentVisibility: "visible"` + `position: relative` + un `zIndex` au-dessus des voisins (précédents : `src/components/CollectionGrid.tsx`, `src/components/mobile/StockageItemRow.tsx`). Vérifier aussi qu'aucun ancêtre opaque de z-index supérieur ne recouvre la zone où la main est dessinée (~114 px au-dessus pour `tuto-main-haut`, ~94 px sur le côté pour `tuto-main`/`tuto-main-droite`).
- **Fail-open** : « Passer le tutoriel » reste disponible à chaque étape ; aucune étape ne doit pouvoir bloquer le joueur.
- Commits `feat(tuto): …` / `fix(tuto): …`, corps terminé par `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- ⚠ L'arbre contient des modifications AdMob non commitées d'une autre session (Swift/Rust + `src/lib/ads/emplacementsAppeles.test.ts` non suivi) : **ne pas les toucher, ne pas les committer** — `git add` uniquement ses propres fichiers.

---

### Task 1 : Étapes, scénario, helpers et bannière

Le socle : les 3 nouvelles étapes dans le type et l'ordre, la compétence cible dans le scénario, les helpers purs, les instructions de bannière. Aucun écran n'est encore câblé — le tutoriel saute ces étapes sans rien afficher (Task 2 et 3 les branchent).

**Files:**
- Modify: `src/types/game.ts` (type `TutorielEtape`)
- Modify: `src/lib/tutoriel.ts` (`ETAPES_TUTORIEL`, `ongletTutorielPermis`, nouveau `competenceGuidee`)
- Modify: `src/data/tutorielScenario.ts` (`COMPETENCE_PREMIER_POINT`)
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (`tutoriel.instructions`)
- Test: `src/lib/tutoriel.test.ts`, `src/data/tutorielScenario.test.ts`

**Interfaces:**
- Produces:
  - `TutorielEtape` à 23 valeurs (liste exacte en Global Constraints) et `ETAPES_TUTORIEL` dans le même ordre.
  - `src/data/tutorielScenario.ts` :

```ts
/** Le premier point de compétence du joueur, désigné par le grand-père. */
export const COMPETENCE_PREMIER_POINT = {
  treeId: "general",
  brancheId: "presentation",
  competenceId: "general.presentation.1",
} as const;
```

  - `src/lib/tutoriel.ts` : `competenceGuidee(etape: TutorielEtape): typeof COMPETENCE_PREMIER_POINT | null` (non-null uniquement à `competences-choix`) ; `ongletTutorielPermis` renvoie `"/bibliotheque"` pour `competences-visite` et `competences-choix`.

- [ ] **Step 1 : tests qui échouent.** Dans `src/lib/tutoriel.test.ts`, remplacer l'assertion d'ordre existante par la liste des 23 valeurs (Global Constraints) et ajouter :

```ts
import { competenceGuidee, ongletTutorielPermis } from "./tutoriel";
import { COMPETENCE_PREMIER_POINT } from "@/data/tutorielScenario";

describe("leçon de montée de niveau", () => {
  it("guide vers l'écran Compétences pendant la visite et le choix", () => {
    expect(ongletTutorielPermis("competences-visite")).toBe("/bibliotheque");
    expect(ongletTutorielPermis("competences-choix")).toBe("/bibliotheque");
  });
  it("ne guide nulle part pendant la célébration (elle se joue au bureau)", () => {
    expect(ongletTutorielPermis("niveau-celebration")).toBeNull();
  });
  it("competenceGuidee ne désigne la cible qu'à l'étape du choix", () => {
    expect(competenceGuidee("competences-choix")).toBe(COMPETENCE_PREMIER_POINT);
    expect(competenceGuidee("competences-visite")).toBeNull();
    expect(competenceGuidee("conclusion")).toBeNull();
    expect(competenceGuidee("termine")).toBeNull();
  });
});
```

Dans `src/data/tutorielScenario.test.ts` :

```ts
import { COMPETENCE_PREMIER_POINT } from "./tutorielScenario";
import { getCompetence } from "@/data/competences";

describe("COMPETENCE_PREMIER_POINT", () => {
  it("désigne une compétence réelle, achetable dès le niveau 1 pour 1 point", () => {
    const c = getCompetence(COMPETENCE_PREMIER_POINT.competenceId);
    expect(c, COMPETENCE_PREMIER_POINT.competenceId).toBeDefined();
    expect(c!.coutPoints).toBe(1);
    expect(c!.niveauBrocanteurRequis).toBe(0);
  });
  it("l'id se décompose bien en arbre + branche annoncés", () => {
    expect(COMPETENCE_PREMIER_POINT.competenceId).toBe(
      `${COMPETENCE_PREMIER_POINT.treeId}.${COMPETENCE_PREMIER_POINT.brancheId}.1`,
    );
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/tutoriel.test.ts src/data/tutorielScenario.test.ts --maxWorkers=4` → FAIL (étapes inconnues, exports absents).

- [ ] **Step 3 : implémentation.**
  - `src/types/game.ts` : insérer `"niveau-celebration"`, `"competences-visite"`, `"competences-choix"` entre `"vente-nego"` et `"conclusion"` dans l'union, et mettre à jour le commentaire de flux au-dessus du type.
  - `src/lib/tutoriel.ts` : même insertion dans `ETAPES_TUTORIEL` ; dans `ongletTutorielPermis`, ajouter `case "competences-visite": case "competences-choix": return "/bibliotheque";` ; ajouter :

```ts
/**
 * Compétence désignée par le grand-père pour le tout premier point du
 * joueur (étape `competences-choix`). Les autres branches et paliers sont
 * inertes tant que celle-ci n'est pas achetée.
 */
export function competenceGuidee(
  etape: TutorielEtape,
): typeof COMPETENCE_PREMIER_POINT | null {
  return etape === "competences-choix" ? COMPETENCE_PREMIER_POINT : null;
}
```

  (import de `COMPETENCE_PREMIER_POINT` depuis `@/data/tutorielScenario`.)
  - `src/data/tutorielScenario.ts` : ajouter l'export `COMPETENCE_PREMIER_POINT` (bloc exact ci-dessus).
  - i18n `tutoriel.instructions` — ajouter les 3 clés dans les 4 dictionnaires :
    - FR : `"niveau-celebration": "Tu montes d'un niveau — savoure !"` ; `"competences-visite": "Ouvre les Compétences depuis la barre du bas."` ; `"competences-choix": "Dépense ton premier point : branche Présentation, « Lecteur d'âmes »."`
    - EN : `"You've gained a level — enjoy it!"` ; `"Open the Skills screen from the bottom bar."` ; `"Spend your first point: the Presentation branch, “Soul reader”."`
    - ES et EL : traductions soignées, registre des instructions voisines. (Pour EN/ES/EL, reprendre le nom LOCALISÉ de la compétence tel qu'il figure déjà dans les overlays de contenu — vérifier `src/lib/i18n/contenu/{en,es,el}/competences.ts` et citer ce nom, pas une traduction improvisée.)

- [ ] **Step 4 : vérifier** — les deux fichiers de test PASS ; `npx tsc --noEmit` ; suite complète verte.

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): trois étapes pour la leçon de montée de niveau"`.

---

### Task 2 : La célébration s'ouvre au tutoriel

Le level-up se rejoue à l'étape `niveau-celebration` (sa garde `!tutorielActif` est levée pour ce cas précis), sa fermeture fait avancer, et l'absence de niveau à célébrer saute proprement les deux étapes de compétences.

**Files:**
- Modify: `src/components/mobile/LevelUpOverlay.tsx`
- Modify: `src/app/(qg)/layout.tsx` (avance depuis `vente-nego`… déjà fait par la vente ; ici : saut si rien à célébrer + dialogue `tuto_niveau_avant`)
- Test: `src/components/mobile/LevelUpOverlay.test.tsx`

**Interfaces:**
- Consumes: étapes de la Task 1 ; `getDialogueActif`/`getCoachOuvert` (déjà en place).
- Produces: le level-up affichable pendant le tutoriel à la seule étape `niveau-celebration` ; `marquerNiveauVu` + avance vers `competences-visite` au tap de fermeture.

- [ ] **Step 1 : tests qui échouent.** Le harnais réel du fichier : `etat(niveauVu, niveau, pointsDisponibles = 0, competencesDebloquees = [], tutorielEtape = "termine")` (l.58-70, paramètres POSITIONNELS), `mockState = …` + `mockPathname = "/bureau"` avant `render(<LevelUpOverlay />)`, et l'assertion « masqué » se fait sur `container.firstChild).toBeNull()` (l.78). Réutiliser exactement ces conventions :

```ts
it("reste masqué pendant le tutoriel hors de l'étape de célébration", () => {
  mockState = etat(0, 1, 1, [], "vente-nego");
  mockPathname = "/bureau";
  const { container } = render(<LevelUpOverlay />);
  expect(container.firstChild).toBeNull();
});

it("s'affiche à l'étape niveau-celebration", () => {
  mockState = etat(0, 1, 1, [], "niveau-celebration");
  mockPathname = "/bureau";
  render(<LevelUpOverlay />);
  expect(screen.getByText("Niveau 1")).toBeTruthy();
});

it("reste masqué à niveau-celebration si un dialogue est ouvert", () => {
  setDialogueActif(true);
  mockState = etat(0, 1, 1, [], "niveau-celebration");
  mockPathname = "/bureau";
  const { container } = render(<LevelUpOverlay />);
  expect(container.firstChild).toBeNull();
  setDialogueActif(false);
});
```

(`setDialogueActif` s'importe de `@/lib/dialogueActif` ; vérifier comment le fichier gère déjà `coachActif`/`dialogueActif` dans ses tests existants et s'aligner — notamment le nettoyage entre tests.)

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/components/mobile/LevelUpOverlay.test.tsx --maxWorkers=4` → FAIL sur le cas `niveau-celebration` (aujourd'hui masqué par la garde `!tutorielActif`).

- [ ] **Step 3 : implémentation.**
  - `LevelUpOverlay.tsx` — remplacer la garde `!(state && tutorielActif(state))` du calcul d'`affichable` (l.~354) par :

```ts
    // Le tutoriel s'approprie la toute première montée de niveau : elle se
    // joue à l'étape dédiée (leçon des compétences), et reste bloquée
    // partout ailleurs pendant le tutoriel pour ne pas couper une leçon.
    (!state ||
      !tutorielActif(state) ||
      state.tutorielEtape === "niveau-celebration") &&
```

    (les gardes `!dialogueActif` et `!coachOuvert` restent inchangées : la fanfare ne doit pas percuter un dialogue.)
  - `LevelUpOverlay.tsx` — la fermeture (`onClick={marquerNiveauVu}`, l.~562) devient un handler local qui appelle `marquerNiveauVu()` puis, si `state?.tutorielEtape === "niveau-celebration"`, `avancerTutoriel("competences-visite")` (récupérer `avancerTutoriel` via `useGameActions()` — vérifier l'import utilisé ailleurs dans le fichier/les voisins).
  - `src/app/(qg)/layout.tsx` — filet « rien à célébrer » : un effet qui, à l'étape `niveau-celebration`, avance directement à `conclusion` quand `state.brocanteur.niveau <= state.niveauVu` (aucune fanfare due). Commentaire : le tutoriel ne doit jamais dépendre d'un level-up qui n'a pas eu lieu.

- [ ] **Step 4 : vérifier** — le fichier de test PASS (y compris les 21 tests pré-existants) ; `npx tsc --noEmit` ; `npx eslint src/components/mobile "src/app/(qg)"` ; suite complète.

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): la première montée de niveau se joue dans le tutoriel"`.

---

### Task 3 : Dialogues du grand-père (4 langues)

**Files:**
- Modify: `src/data/dialogues.ts`, `src/lib/i18n/contenu/{en,es,el}/dialogues.ts`, `src/data/dialogues.test.ts`
- Test: `src/lib/i18n/contenu/dialogues.test.ts` (parité, existant)

**Interfaces:**
- Produces: séquences `tuto_niveau_avant` et `tuto_niveau_apres`, consommées par les Tasks 2 et 4.

- [ ] **Step 1 : FR.** Dans `SEQUENCES_TUTORIEL` :

```ts
tuto_niveau_avant: {
  id: "tuto_niveau_avant",
  lignes: [
    { humeur: "rieur", texte: "Un niveau de plus ! Tu vois cette pluie d'or ? Elle veut dire que le métier commence à rentrer." },
    { humeur: "souriant", texte: "Chaque niveau t'offre un point à dépenser. C'est comme ça qu'on se forge un savoir-faire — le tien." },
    { humeur: "songeur", texte: "Ouvre les Compétences, en bas : je te fais visiter." },
  ],
},
tuto_niveau_apres: {
  id: "tuto_niveau_apres",
  lignes: [
    { humeur: "souriant", texte: "« Lecteur d'âmes » : dès la prochaine vente, tu sauras à qui tu as affaire. Un nom, un caractère — et déjà la moitié de la négociation." },
    { humeur: "emu", texte: "Les autres branches attendront tes prochains niveaux. Rentrons, j'ai encore une chose à te confier." },
  ],
},
```

- [ ] **Step 2 : EN/ES/EL.** Ajouter les mêmes ids avec la même cardinalité (3 lignes / 2 lignes). EN verbatim :

```ts
tuto_niveau_avant: [
  "A level up! See that shower of gold? It means the trade is starting to sink in.",
  "Every level gives you a point to spend. That's how you forge a craft — your own.",
  "Open the Skills screen, down there: let me show you around.",
],
tuto_niveau_apres: [
  "“Soul reader”: from the next sale on, you'll know who you're dealing with. A name, a temper — half the haggling done already.",
  "The other branches will wait for your next levels. Let's head home, I've one more thing to entrust to you.",
],
```

(ES/EL : traductions soignées ; pour le nom de la compétence entre guillemets, reprendre EXACTEMENT le nom localisé de `general.presentation.1` déjà présent dans `src/lib/i18n/contenu/{es,el}/competences.ts`.)

- [ ] **Step 3 : liste d'ids.** Ajouter les 2 nouveaux ids à la liste attendue de `src/data/dialogues.test.ts`.

- [ ] **Step 4 : vérifier** — `npx vitest run src/lib/i18n/contenu/dialogues.test.ts src/data/dialogues.test.ts --maxWorkers=4` PASS ; `npx tsc --noEmit`.

- [ ] **Step 5 : commit** — `git commit -m "feat(tuto): dialogues de la leçon de montée de niveau (4 langues)"`.

---

### Task 4 : Visite guidée et achat du premier point

Le cœur de la leçon : le dialogue de félicitations, la main vers l'onglet Compétences, le coach en 3 bulles, puis le guidage jusqu'à l'achat.

**Files:**
- Modify: `src/app/(qg)/layout.tsx` (dialogue `tuto_niveau_avant`)
- Modify: `src/app/(qg)/bibliotheque/page.tsx` (coach, mains, gates, dialogue `tuto_niveau_apres`)
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (3 clés de coach)

**Interfaces:**
- Consumes: `competenceGuidee` (T1), `COMPETENCE_PREMIER_POINT` (T1), séquences (T3), `TutorielCoach` (`{ cible: string | null; texte: string }`, fail-open si la cible est absente).
- Produces: machine locale de page `phaseLecon: "coach" | "branche" | "palier" | "dialogue"`.

- [ ] **Step 1 : dialogue de félicitations (layout QG).** Dans l'effet de dialogues du layout (celui qui utilise `jouerDialogueQg` et `dialoguesQgJouesRef` — le ref-guard est OBLIGATOIRE ici : l'étape `competences-visite` n'avance PAS à la fin du dialogue, sans garde il rejouerait en boucle), ajouter :

```ts
else if (etape === "competences-visite") jouerDialogueQg(SEQUENCES_TUTORIEL.tuto_niveau_avant);
```

La main de la TabBar vers `/bibliotheque` vient déjà de `ongletTutorielPermis` (Task 1) — vérifier qu'elle s'affiche bien et que l'onglet est visible (il se démasque au niveau 1 : `TabBar` `masque: (s) => s.brocanteur.niveau < 1`).

- [ ] **Step 2 : la page Compétences.** Dans `src/app/(qg)/bibliotheque/page.tsx` :

```ts
const { avancerTutoriel } = useGameActions();
const etapeTuto = state?.tutorielEtape;
const guide = etapeTuto ? competenceGuidee(etapeTuto) : null;
const enLecon = etapeTuto === "competences-visite" || etapeTuto === "competences-choix";
type PhaseLecon = "coach" | "branche" | "palier" | "dialogue";
const [phaseLecon, setPhaseLecon] = useState<PhaseLecon>("coach");
```

  - **Arrivée** : un effet qui, à `competences-visite`, avance à `competences-choix` — mais SEULEMENT à la fin du coach (voir ci-dessous), pour que la bannière affiche la bonne consigne pendant la visite.
  - **Attributs de cible** : `data-tuto-coach="competences-xp"` sur le bloc niveau + barre d'XP + points (le conteneur `display: flex` de la carte du milieu, l.~106-175) ; `data-tuto-coach="competences-arbres"` sur le wrapper du `TreePicker` (l.~84-90) ; `data-tuto-coach="competences-point"` sur le bloc du compteur de points (l.~163-190, celui qui affiche `pointsDisponibles` + `ptsCaption`).
  - **Coach** (rendu si `enLecon && phaseLecon === "coach"`), 3 bulles dans cet ordre, `onFini` → `setPhaseLecon("branche")` ET `avancerTutoriel("competences-choix")` :

```tsx
<TutorielCoach
  etapes={[
    { cible: "competences-xp", texte: d.tutoriel.coachCompetencesXp },
    { cible: "competences-arbres", texte: d.tutoriel.coachCompetencesArbres },
    { cible: "competences-point", texte: d.tutoriel.coachCompetencesPoint },
  ]}
  onFini={() => { setPhaseLecon("branche"); avancerTutoriel("competences-choix"); }}
/>
```

  - **Phase branche** : la `<section>` de la branche `presentation` (dans le `map` sur `treeDef?.branches`) porte la main quand `guide && phaseLecon === "branche" && branche.id === guide.brancheId` — classe `"tuto-main tuto-main-droite"` (la main à droite : les sections occupent toute la largeur, la variante gauche serait coupée par le bord à 360 px — précédent `CategoriePicker`), plus, EN INLINE sur cette section : `position: "relative", zIndex: 2, contentVisibility: "visible"` (piège de clipping, cf. Global Constraints). Le tap d'un palier d'une AUTRE branche est ignoré pendant la leçon ; le tap d'un palier de la bonne branche passe à `phaseLecon: "palier"`.
    Simplification acceptée : la main désigne la branche, et c'est le tap du bon palier qui fait avancer — pas de gate supplémentaire sur la branche elle-même (rien n'est cliquable au niveau de la section, seuls les paliers le sont).
  - **Phase palier** : sur la tuile du palier cible (`c.id === guide.competenceId`), passer une prop `main?: boolean` à `PalierTile` → `className="tuto-main tuto-main-droite"` + les trois styles inline du piège ; les autres tuiles ont leur `onTap` neutralisé pendant `enLecon` (ne rien faire).
  - **Achat** : dans le `onAcheter` du `PalierOverlay`, après `res.ok` et si `etapeTuto === "competences-choix"` et `palierActif.id === guide?.competenceId` → `setPhaseLecon("dialogue")`.
  - **Phase dialogue** : rendre un `DialogueOverlay` avec `SEQUENCES_TUTORIEL.tuto_niveau_apres` (copier le patron de `src/app/collection/page.tsx` : `nomExpediteur("grand-pere", locale)`, `GRAND_PERE_PORTRAITS`), `onFini={() => avancerTutoriel("conclusion")}`.
  - **Sortie sans achat** : rien à faire — l'onglet Compétences reste le seul permis (Task 1), la main de la TabBar ramène le joueur. Ne PAS ajouter de garde supplémentaire.

- [ ] **Step 3 : i18n du coach.** Ajouter dans la section `tutoriel` des 4 dictionnaires :
  - FR : `coachCompetencesXp: "Ton niveau et ta barre d'expérience : chaque vente, chaque trouvaille la remplit."` ; `coachCompetencesArbres: "Un arbre général, et un par famille d'objets — tu te spécialiseras plus tard."` ; `coachCompetencesPoint: "Et voilà ton premier point à dépenser. Il t'attend."`
  - EN : `"Your level and experience bar: every sale, every find fills it."` ; `"One general tree, and one per family of objects — you'll specialise later."` ; `"And there's your first point to spend. It's waiting for you."`
  - ES/EL : traductions soignées, registre des bulles de coach voisines (concis, factuel).

- [ ] **Step 4 : vérifier** — `npx tsc --noEmit` ; `npx eslint "src/app/(qg)" src/components/mobile` → 0 erreur ; suite complète au premier plan.

- [ ] **Step 5 : trace écrite** dans le rapport (fichier:ligne à chaque transition) : fin de `vente-nego` → retour bureau → `niveau-celebration` (fanfare seule) → fermeture → `competences-visite` (dialogue de félicitations, main TabBar, autres onglets inertes) → écran Compétences → coach ×3 → `competences-choix` → main sur la branche Présentation → tap du bon palier → sheet → achat → `tuto_niveau_apres` → `conclusion` ; chemins alternatifs : sortie de l'écran sans acheter (retour ramené par la TabBar), tap d'une autre branche/palier (inerte), remontage mi-leçon (la machine repart à `"coach"`), aucun niveau à célébrer (saut direct à `conclusion`), « Passer le tutoriel » à chacune des 3 étapes.

- [ ] **Step 6 : commit** — `git commit -m "feat(tuto): visite guidée des compétences et achat du premier point"`.

---

### Task 5 : Balayage et cohérence de bout en bout

**Files:**
- Modify: divers (résultats des greps)
- Test: suite complète

- [ ] **Step 1 : greps.** `grep -rn '"premiere-vente"\|coachStockageObjet\|RotationHint' src scripts` → zéro occurrence vivante (héritages des passes précédentes). `grep -rn "niveau-celebration\|competences-visite\|competences-choix" src` → chaque étape a bien un propriétaire (une transition qui y mène et une qui en sort).

- [ ] **Step 2 : lecture de bout en bout.** Rejouer par la lecture le tutoriel complet v4 (23 étapes), en vérifiant à chaque couture qui avance l'étape, et écrire la trace dans le rapport avec fichier:ligne. Points de vigilance : la bannière affiche la bonne consigne à chacune des 3 nouvelles étapes (elle est masquée pendant les coachs via `coachActif`, visible sinon) ; le badge de points de la TabBar (`badge: (state) => state.brocanteur.pointsDisponibles`) s'allume bien au level-up ; le `LevelUpOverlay` ne se rejoue pas après `marquerNiveauVu`.

- [ ] **Step 3 : qualité.** `npx vitest run --maxWorkers=4` verte (au premier plan), `npx tsc --noEmit` propre, `npx eslint src` → 0 erreur.

- [ ] **Step 4 : commit** (si des correctifs sortent des steps 1-2) — `git commit -m "fix(tuto): balayage de la leçon de montée de niveau"` ; sinon ne rien committer et le dire.
