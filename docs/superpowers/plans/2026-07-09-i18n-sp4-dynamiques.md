# i18n SP4 — Textes dynamiques trilingues (FR/EN/ES) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tous les textes générés à la volée (négociation, notifications, courrier/quêtes, grand livre, HUD d'actives, gazette) s'affichent dans la langue courante ; les nouvelles écritures en save persistent des données structurées (ids/params), jamais du texte localisé.

**Architecture:** Deux régimes. (1) **Éphémère** (négo, notifs, HUD, libellés du cahier dérivés) : gabarits PAR LANGUE — pools/gabarits FR canoniques dans `src/lib/`, overlays EN/ES dans `src/lib/i18n/contenu/{en,es}/`, résolution à l'affichage (ou au scheduling pour les notifs). (2) **Persisté** (`Courrier.payload`, `LedgerEntry`) : champs structurés OPTIONNELS additifs (`gabaritId`, `params`) + résolution par id stable ; l'existant FR en save s'affiche tel quel (dégradation assumée, décision de spec §3).

**Tech Stack:** Next.js export statique + Tauri, vitest, i18n maison SP1-SP3 (`useLangue()` → `{locale, d, tr}`, `DICTIONNAIRES`, overlays `contenu/`, helpers `nomTemplate`/`nomBrocante`/`libelleEtat`…).

## Global Constraints

- **Glossaire OBLIGATOIRE** : `docs/superpowers/specs/2026-07-08-i18n-glossaire.md`.
- **Règle d'or** : jamais de chaîne localisée en save. Champs nouveaux en save = ids/params structurés, TOUJOURS optionnels (rétro-compat : leur absence ⇒ fallback sur le texte FR existant). On CONTINUE d'écrire `titre`/`corps`/`designation` FR canoniques (compat lecteurs existants).
- **Gabarits PAR LANGUE, pas de mot-à-mot** (spec §4) : chaque langue reformule avec ses accords/genres ; placeholders IDENTIQUES entre langues (tests de parité).
- Registre : EN international, ES d'Espagne « tú », ton chaleureux France 1924. Prix en €.
- **Ne pas casser les vieilles saves** : tout lecteur doit tolérer l'absence des nouveaux champs ; aucun champ existant modifié/supprimé ; `migrerSauvegarde` intouché sauf besoin explicite.
- Tests : `npx vitest run <fichier>` ciblé, `npm run test:run` complet. Lint : `npx eslint src` (`npm run lint` cassé). Flake connu sans lien : `chine.test.ts` « T4 boss ~80 % » (RNG non seedé) — relancer isolément si flop.
- Zéro dépendance npm nouvelle. Commentaires/commits en français.
- **Résiduels assumés hors SP4** (documenter, ne pas traiter) : `METEO_LABEL`/`descriptionEffetMeteo` = code mort jamais affiché ; `dernierLoyer.tierNom` persisté mais jamais affiché ; « Pocket Monster » = dossier droits d'auteur séparé.

---

### Task 1: Négociation trilingue (messages structurés + pools par langue)

**Files:**
- Modify: `src/types/game.ts` (~l.480 : `NegociationState`)
- Modify: `src/lib/negociation.ts` (pools l.7-43, ouvertures l.66-69, relance l.271)
- Modify: `src/lib/vitrine.ts` (messages l.337, 365, 372, 404)
- Create: `src/lib/i18n/contenu/en/nego.ts`, `src/lib/i18n/contenu/es/nego.ts`
- Modify: `src/lib/i18n/contenu/index.ts` (+ `texteNego`)
- Modify: `src/components/mobile/chine/ChineNegoDrawer.tsx:104`, `src/components/mobile/NegociationSheet.tsx:159`
- Test: `src/lib/i18n/contenu/nego.test.ts` (+ mise à jour des tests existants de negociation/vitrine qui assertent `message` en chaîne)

**Interfaces:**
- Pré-vérification OBLIGATOIRE (avant tout code) : confirmer que `NegociationState` n'est JAMAIS sérialisé en save — `ObjetEnVente[]` vit en `useState` (`src/app/chiner/[brocanteId]/ClientPage.tsx:74`), `ClientEvent` idem (`.../journee/ClientPage.tsx:172`) ; `grep -rn "negociation" src/lib/migrations.ts src/context/GameContext.tsx` ne doit montrer aucune écriture dans `GameState`. Si contredit → STOP, statut BLOCKED.
- Produit :
  ```ts
  // game.ts
  export type CleMessageNego =
    | "ouvertureAchat" | "ouvertureVente"
    | "contreVendeur" | "contreClient"
    | "refusPoliVendeur" | "refusPoliClient"
    | "fache" | "accord" | "relance"
    | "diplomate" | "bonimentConclu" | "bonimentDernierMot" | "lotGarni";
  export interface MessageNego {
    cle: CleMessageNego;
    /** Index de variante tiré au moment de l'événement (modulo la taille du pool par langue). */
    variante: number;
    params?: { prix?: number; cibleSecrete?: number };
  }
  // NegociationState.message : string → MessageNego
  ```
  ```ts
  // contenu/index.ts — consommé par les 2 sheets
  export function texteNego(msg: MessageNego, locale: Locale): string;
  // = pool[locale][msg.cle][msg.variante % longueur] interpolé via tr() avec msg.params
  ```
  Pools : FR canonique reshapé dans `negociation.ts` en `export const POOLS_NEGO_FR: Record<CleMessageNego, string[]>` (mêmes chaînes qu'aujourd'hui, y compris les ex-en-dur : ouvertures, relance l.271, et les 4 messages de `vitrine.ts` déplacés ici) ; EN/ES : `NEGO_EN`/`NEGO_ES` même forme.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/lib/i18n/contenu/nego.test.ts
import { describe, expect, test } from "vitest";
import { POOLS_NEGO_FR } from "@/lib/negociation";
import { NEGO_EN } from "@/lib/i18n/contenu/en/nego";
import { NEGO_ES } from "@/lib/i18n/contenu/es/nego";
import { texteNego } from "@/lib/i18n/contenu";

const CLES = Object.keys(POOLS_NEGO_FR) as (keyof typeof POOLS_NEGO_FR)[];
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

describe.each([["EN", NEGO_EN], ["ES", NEGO_ES]] as const)("pools négo %s", (_, pool) => {
  test("mêmes clés que le FR, aucun pool vide", () => {
    expect(Object.keys(pool).sort()).toEqual([...CLES].sort());
    for (const cle of CLES) expect(pool[cle].length).toBeGreaterThan(0);
  });
  test("placeholders identiques au FR (par clé, ensemble uniforme)", () => {
    for (const cle of CLES) {
      const attendu = placeholders(POOLS_NEGO_FR[cle][0]);
      for (const v of [...POOLS_NEGO_FR[cle], ...pool[cle]]) {
        expect(placeholders(v)).toBe(attendu);
      }
    }
  });
});

test("texteNego : résolution, interpolation, modulo variante", () => {
  const msg = { cle: "accord" as const, variante: 7, params: { prix: 45 } };
  expect(texteNego(msg, "fr")).toBe(
    POOLS_NEGO_FR.accord[7 % POOLS_NEGO_FR.accord.length].replace("{prix}", "45"),
  );
  expect(texteNego(msg, "en")).toContain("45");
  expect(texteNego(msg, "es")).toContain("45");
});
```

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run src/lib/i18n/contenu/nego.test.ts` → FAIL (POOLS_NEGO_FR inexistant)

- [ ] **Step 3: Implémenter**

1. `game.ts` : ajouter `CleMessageNego`/`MessageNego` (code ci-dessus), `NegociationState.message: MessageNego`.
2. `negociation.ts` : reshaper les pools en `POOLS_NEGO_FR` (chaînes EXACTES actuelles ; les ouvertures deviennent `ouvertureAchat`/`ouvertureVente`, la relance l.271 devient `relance`) ; `pickMessage(cle, params?)` retourne `{cle, variante: Math.floor(Math.random() * POOLS_NEGO_FR[cle].length), params}` ; tous les producteurs assignent le `MessageNego`.
3. `vitrine.ts` : les 4 messages en dur (diplomate `{cibleSecrete}`, bonimentConclu, bonimentDernierMot, lotGarni) deviennent des `MessageNego` via leurs clés (chaînes FR déplacées dans `POOLS_NEGO_FR`).
4. Overlays `en/nego.ts`, `es/nego.ts` : reformulation par langue (PAS du mot-à-mot ; garder l'esprit marchand gouailleur ; `{prix}` etc. identiques). Le nombre de variantes PEUT différer du FR (le modulo l'absorbe) mais ≥ 1.
5. `contenu/index.ts` : `texteNego` (lookup pool par locale — FR = `POOLS_NEGO_FR` —, modulo, `tr(gabarit, params)`).
6. Sheets : `{localNego.message}` → `{texteNego(localNego.message, locale)}` (les 2 fichiers ont déjà `useLangue`).
7. Mettre à jour les tests existants de `negociation.ts`/`vitrine.ts` qui assertent des chaînes : asserter désormais `{cle, params}` (structure) et/ou `texteNego(msg, "fr")` pour l'égalité de texte.

- [ ] **Step 4: Vérifier** — `npx vitest run src/lib/i18n/contenu/nego.test.ts src/lib/negociation.test.ts` puis `npm run test:run` + `npx tsc --noEmit` + `npx eslint src` → tout vert.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(i18n): négociation trilingue — messages structurés MessageNego + pools par langue"
```

---

### Task 2: HUD d'actives, phrase célébrité de la Gazette, libellés éphémères du Cahier

**Files:**
- Modify: `src/lib/i18n/ui/{fr,en,es}.ts` (sections `actives`, gazette célébrité, cahier)
- Modify (actives) : `src/app/chiner/[brocanteId]/ClientPage.tsx:358`, `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx:763`, `src/components/mobile/NegociationSheet.tsx:223,233`, `src/components/mobile/chine/ChineNegoDrawer.tsx:155,190`, `src/components/mobile/chine/ItemSwipeDeck.tsx:256`
- Modify (gazette) : `src/components/mobile/GazetteSheet.tsx:393-407`
- Modify (cahier éphémère) : `src/lib/historiqueJournalier.ts:15-30,55-59`, `src/components/mobile/qg/overlays/CahierDeCompteOverlay.tsx:224,290`
- Test: `src/lib/i18n/ui/ui.test.ts` couvre automatiquement la parité des nouvelles clés ; + extension `src/lib/historiqueJournalier.test.ts` (ou création) pour `libelleRepos`/`libelleJournee` localisés

**Interfaces:**
- Produit (dictionnaires) :
  ```ts
  // ui/fr.ts (parité en/es imposée par tsc)
  actives: { flair: "Le Flair", lotGarni: "Lot garni", fouille: "La Fouille",
             boniment: "Le Boniment", tchatche: "La Tchatche", criee: "La Criée",
             diplomate: "Diplomate" },
  // EN/ES : RÉUTILISER les traductions déjà actées dans contenu/{en,es}/deblocages.ts
  // (« The Nose »/« El Olfato » pour flair, etc.) — cohérence inter-écrans obligatoire.
  gazette: { celebriteAnnonce: "{nom} est annoncé(e) à {brocante} le {jour}. Attendez-vous à une forte affluence et à de grosses bourses !",
             celebriteBrocanteInconnue: "une brocante" },
  cahier: { marcheDuJour: "Marché du jour", marcheDuJourN: "Marché du jour J{n}",
            journeeRepos: "Journée de repos", /* + un libellé par entrée de PRIORITE_REPOS */ },
  ```
- Produit (helpers) : `libelleActive(id: ActiveId, d: DictionnaireUI): string` dans `src/lib/i18n/libelles.ts` (switch exhaustif motif `libelleCategorie`) ; `libelleRepos(kind, d)`/`libelleJournee(j, d, locale)` — les fonctions de `historiqueJournalier.ts` qui produisent du texte prennent désormais `d` (et `locale` si elles résolvent une brocante par id) en paramètre, les libellés FR actuels partant dans `ui/fr.ts`.
- ⚠️ Titre de session chinage du Cahier (`CahierDeCompteOverlay.tsx:224` + `historiqueJournalier.ts:55` `libelle = session.brocanteNom`) : résoudre par `session.brocanteId` via `nomBrocante(getBrocanteById(id), locale)` avec fallback `session.brocanteNom` (vieilles saves / id introuvable). AUCUNE écriture save modifiée.

- [ ] **Step 1: Test qui échoue** — dans `libelles.test.ts` : `libelleActive` couvre les 7 `ActiveId` × 3 langues, non vide, et **cohérence** : `libelleActive("flair", DICTIONNAIRES.en)` doit apparaître dans `DEBLOCAGES_EN["Active 🔍 Le Flair"]` (le titre de déblocage EN contient le nom EN de l'active). Dans `historiqueJournalier.test.ts` : `libelleJournee` d'une session chinage avec `brocanteId` connu = nom localisé ; avec `brocanteId` inconnu = fallback `brocanteNom` ; journée vente = `d.cahier.marcheDuJour`.

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run src/lib/i18n/libelles.test.ts src/lib/historiqueJournalier.test.ts` → FAIL

- [ ] **Step 3: Implémenter** — sections dict (traduire la phrase célébrité en EN/ES avec le même ton feuille-de-chou : EN "{nom} is expected at {brocante} on {jour}. Brace for crowds and heavy purses!", ES "¡Se anuncia a {nom} en {brocante} el {jour}! Espera mucha afluencia y bolsas bien llenas." — `{jour}` = jour de semaine déjà localisé par l'appelant), `libelleActive`, refonte signatures `historiqueJournalier`, bascule des 7 sites actives (emoji conservés hors clé), de la phrase gazette (l.393-407 + fallback l.396) et des 2 sites cahier.

- [ ] **Step 4: Vérifier** — tests ciblés + `npm run test:run` + `npx tsc --noEmit` + `npx eslint src` → vert.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(i18n): actives HUD, annonce célébrité gazette et libellés du cahier trilingues"
```

---

### Task 3: Notifications locales trilingues (locale capturée au scheduling)

**Files:**
- Modify: `src/lib/i18n/locales.ts` (+ `localeCourante()`)
- Modify: `src/lib/notifications/energieNotif.ts`, `quetesNotif.ts`, `rappelRetour.ts`, `restaurationNotif.ts` (+ le point d'entrée `index.ts` si les textes y transitent)
- Modify: `src/lib/i18n/ui/{fr,en,es}.ts` (section `notifs`)
- Modify: `src/lib/i18n/LangueContext.tsx` (replanification au changement de langue — voir Step 3.4)
- Test: `src/lib/i18n/locales.test.ts` (étendre), `src/lib/notifications/notifsTextes.test.ts` (créer)

**Interfaces:**
- Produit :
  ```ts
  // locales.ts — utilisable HORS React (les modules notifs ne sont pas des composants)
  export function localeCourante(): Locale; // préférence persistée sinon détection, même logique que le provider
  ```
  Chaque constructeur de `NotifSpec` prend la locale en paramètre explicite (`notifsQuetes(…, locale: Locale)`) — l'appelant de `programmer()` passe `localeCourante()`. Les textes viennent de `DICTIONNAIRES[locale].notifs.*` (import direct de `@/lib/i18n/ui`), interpolés par `tr`.
- Section `notifs` (fr, parité en/es par tsc) — reprendre les chaînes FR EXACTES actuelles des 4 modules (énergie « Énergie pleine ⚡ »…, quêtes « Nouvelles commandes »…, rappels J+1/3/7, restauration « Atelier » / « {nom} est restauré ✓ »).
- Restauration `{nom}` : le module reçoit l'objet en restauration — résoudre `nomObjet(objet, locale)` au scheduling (vérifier la signature réelle ; si seul le nom FR circule, faire transiter le `templateId`).

- [ ] **Step 1: Test qui échoue**

```ts
// src/lib/notifications/notifsTextes.test.ts — sans OS : on teste les BUILDERS de NotifSpec
import { describe, expect, test } from "vitest";
// importer les builders réels (adapter les noms exacts en lisant les modules)
test("notifs énergie : titre/corps traduits selon la locale passée", () => {
  // const fr = buildNotifEnergie(..., "fr"); const en = buildNotifEnergie(..., "en");
  // expect(fr.title).toBe("Énergie pleine ⚡"); expect(en.title).toBe("Full energy ⚡");
  // expect(en.title).not.toBe(fr.title);
});
// + un test par module (quetes, rappelRetour, restauration avec nom d'objet localisé)
// + localeCourante(): localStorage "projet-broc:langue:v1" = "es" → "es" ; vide → détection.
```

(Écrire les tests avec les VRAIS noms de builders après lecture des 4 modules — le test doit appeler la fonction réellement exportée, pas un wrapper créé pour le test.)

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run src/lib/notifications/notifsTextes.test.ts` → FAIL

- [ ] **Step 3: Implémenter**

1. `localeCourante()` dans `locales.ts` (réutilise la logique persistée/détection existante ; SSR-safe : fallback `"fr"` si `window` absent).
2. Section `notifs` dans les 3 dicos.
3. Les 4 modules : textes → `DICTIONNAIRES[locale].notifs.*`, paramètre `locale` ajouté, appelants passent `localeCourante()`.
4. Replanification au changement de langue : identifier la fonction de replanification globale existante (chercher `annulerTout|replanifier|reprogrammer` dans `src/lib/notifications/` et ses appels dans `GameContext`) ; si elle existe et est appelable sans état de jeu complexe, l'invoquer après `persisterLocale` dans `setLocale` (`LangueContext.tsx`) — en import dynamique pour ne pas alourdir le bundle initial. Si la replanification exige l'état de jeu (probable), brancher plutôt un effet dans `GameContext` qui observe `locale` et re-programme comme il le fait déjà après ses propres changements d'état. Si aucun point d'accroche propre n'existe : NE PAS en créer un artificiel — documenter dans le rapport « notifs déjà programmées restent dans l'ancienne langue jusqu'à la prochaine replanification naturelle » (dégradation douce acceptable) et le signaler en concern.

- [ ] **Step 4: Vérifier** — tests ciblés + `npm run test:run` + `npx tsc --noEmit` + `npx eslint src` → vert.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(i18n): notifications locales trilingues — locale capturée au scheduling"
```

---

### Task 4: Courrier à résolution par id stable (arc principal + lettre Maman)

**Files:**
- Create: `src/lib/i18n/contenu/en/courrier.ts`, `src/lib/i18n/contenu/es/courrier.ts`
- Modify: `src/lib/i18n/contenu/index.ts` (+ `titreCourrier`, `corpsCourrier`)
- Modify: `src/components/mobile/qg/sheets/CourrierSheet.tsx:180-181,218-219`, `src/components/mobile/qg/overlays/CommandeRow.tsx` (site `p.titre`/`p.corps`), `src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx:340`
- Test: `src/lib/i18n/contenu/courrier.test.ts`

**Interfaces:**
- Consomme : `QUETES_PRINCIPALES` (`src/data/quetesPrincipales.ts`, 6 chapitres ids `principale_ch1..6`, payload.titre + corps[]) ; `creerLettreMamanDebut` (`src/lib/courrier.ts:13`, id `lettre_maman_debut`).
- Produit :
  ```ts
  // Overlay par langue : Record<courrierId, { titre: string; corps: string[] }>
  export function titreCourrier(c: { id: string; payload: { titre: string } }, locale: Locale): string;
  export function corpsCourrier(c: { id: string; payload: { corps: string[] } }, locale: Locale): string[];
  // Résolution par c.id ; entrée absente → fallback payload FR persisté (vieilles saves, périodiques pré-Task 5).
  ```
- ⚠️ Les corps contiennent du markdown `**gras**` (rendu par les sheets) et des noms d'objets cités (« **lampe d'atelier** ») : conserver les `**` et traduire les mentions d'objets EN COHÉRENCE avec `contenu/{en,es}/objets.ts` (vérifier le nom traduit du template cité, ex. `ma.lampe_petrole_ancienne`).
- ⚠️ Le TON de l'arc principal (grand-père antiquaire : nostalgie + comédie sarcastique + mystère) est la matière du jeu — traduction littéraire, pas fonctionnelle. C'est le morceau de bravoure de cette tâche (7 lettres × 2 langues, plusieurs paragraphes chacune).

- [ ] **Step 1: Test qui échoue**

```ts
// src/lib/i18n/contenu/courrier.test.ts
import { describe, expect, test } from "vitest";
import { QUETES_PRINCIPALES } from "@/data/quetesPrincipales";
import { creerLettreMamanDebut, ID_LETTRE_MAMAN_DEBUT } from "@/lib/courrier";
import { COURRIER_EN } from "@/lib/i18n/contenu/en/courrier";
import { COURRIER_ES } from "@/lib/i18n/contenu/es/courrier";
import { corpsCourrier, manquants, orphelins, titreCourrier } from "@/lib/i18n/contenu";

const IDS = [ID_LETTRE_MAMAN_DEBUT, ...QUETES_PRINCIPALES.map((c) => c.id)];

describe.each([["EN", COURRIER_EN], ["ES", COURRIER_ES]] as const)("overlay courrier %s", (_, ov) => {
  test("complétude + zéro orphelin", () => {
    expect(manquants(IDS, ov)).toEqual([]);
    expect(orphelins(IDS, ov)).toEqual([]);
  });
  test("même nombre de paragraphes que le FR (mise en page des lettres)", () => {
    const maman = creerLettreMamanDebut(1);
    expect(ov[ID_LETTRE_MAMAN_DEBUT].corps.length).toBe(maman.payload.corps.length);
    for (const ch of QUETES_PRINCIPALES) {
      expect(ov[ch.id].corps.length).toBe(ch.payload.corps.length);
    }
  });
});

test("résolution par id + fallback payload FR", () => {
  const maman = creerLettreMamanDebut(1);
  expect(titreCourrier(maman, "fr")).toBe(maman.payload.titre);
  expect(titreCourrier(maman, "en")).toBe(COURRIER_EN[ID_LETTRE_MAMAN_DEBUT].titre);
  const inconnu = { id: "quo_x_1", payload: { titre: "Titre FR généré", corps: ["p"] } };
  expect(titreCourrier(inconnu, "es")).toBe("Titre FR généré");
  expect(corpsCourrier(inconnu, "es")).toEqual(["p"]);
});
```

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run src/lib/i18n/contenu/courrier.test.ts` → FAIL

- [ ] **Step 3: Implémenter** — overlays complets (7 ids × {titre, corps[]} × 2 langues, traduction littéraire, `**` conservés), helpers (fallback payload), bascule des 3 sites d'affichage (`p.titre` → `titreCourrier(courrier, locale)` — attention, le helper prend le COURRIER pas le payload : adapter ce que le composant a sous la main ; si seul `p` est en scope, remonter au courrier parent).

- [ ] **Step 4: Vérifier** — test ciblé + `npm run test:run` + `npx tsc --noEmit` + `npx eslint src` → vert.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(i18n): courrier trilingue par id stable — arc principal + lettre de Maman"
```

---

### Task 5: Quêtes périodiques à gabarits persistés

**Files:**
- Modify: `src/types/game.ts` (`CourrierPayloadLettre` l.111-118, `CourrierPayloadMission` l.131-146 : + `gabaritId?: string`, + `gabaritParams?: { etatMin?: EtatObjet }`)
- Modify: `src/lib/quetes/textes.ts` (retourner le gabarit choisi), `src/lib/quetes/periodiques.ts:52-60` (persister `gabaritId`/`gabaritParams`), `src/lib/courrier.ts:68` (`creerCourrierMission` accepte et copie les champs optionnels)
- Create: `src/lib/i18n/contenu/en/quetesGabarits.ts`, `src/lib/i18n/contenu/es/quetesGabarits.ts`
- Modify: `src/lib/i18n/contenu/index.ts` (extension de `titreCourrier`/`corpsCourrier` : la voie gabarit prime sur la voie id)
- Test: `src/lib/i18n/contenu/quetesGabarits.test.ts` (+ mise à jour `src/lib/quetes/textes.test.ts`)

**Interfaces:**
- Consomme : `GENERIQUE` + `PAR_COMMANDITAIRE` (`src/lib/quetes/textes.ts:9-30` — clés `jeux-video`, `set-designer`, `mode`, `art`, 2 variantes chacune + 1 générique) ; `genererTexte()` l.32-47 (RNG l.39, `{objets}`/`{etat}`).
- Produit :
  ```ts
  // textes.ts — le choix RNG devient traçable
  export type GabaritQueteId = `${"generique" | "jeux-video" | "set-designer" | "mode" | "art"}#${number}`;
  // genererTexte(...) retourne désormais { titre, corps, gabaritId: GabaritQueteId }
  // (même logique RNG, chaînes FR INCHANGÉES)

  // game.ts (additif, rétro-compat)
  // CourrierPayloadMission.gabaritId?: string ; .gabaritParams?: { etatMin?: EtatObjet }

  // Overlays par langue : Record<string /* "cle#index" */, { titre: string; corps: string[] }>
  // avec les MÊMES placeholders {objets}/{etat} que le FR.

  // contenu/index.ts — priorité de résolution dans titreCourrier/corpsCourrier :
  // 1. payload.gabaritId présent ET overlay[locale] a l'entrée → régénérer :
  //    {objets} = cibles.map(c => `« ${nomTemplate(c.templateId, locale)} »`).join(", ")
  //    {etat}  = gabaritParams?.etatMin ? gabarit étatMin localisé (libelleEtat) : ""
  // 2. sinon voie id stable (Task 4)  3. sinon payload FR.
  ```
- ⚠️ La forme exacte de `{objets}`/`{etat}` FR (guillemets « », préfixe ` (état min : …)`) est dans `genererTexte` l.40-44 — EN/ES définissent LEUR PROPRE mise en forme (guillemets droits EN, « » ES, parenthèse traduite) dans une petite fonction par langue à côté de l'overlay, PAS du mot-à-mot.
- ⚠️ Le FR continue de persister `titre`/`corps` générés (compat) — `gabaritId` s'AJOUTE. En locale FR, l'affichage peut continuer à lire le payload FR persisté (identique) — ne pas régénérer pour rien.

- [ ] **Step 1: Test qui échoue**

```ts
// src/lib/i18n/contenu/quetesGabarits.test.ts
import { describe, expect, test } from "vitest";
import { QUETES_GABARITS_EN } from "@/lib/i18n/contenu/en/quetesGabarits";
import { QUETES_GABARITS_ES } from "@/lib/i18n/contenu/es/quetesGabarits";
import { titreCourrier, corpsCourrier } from "@/lib/i18n/contenu";

const CLES = ["generique", "jeux-video", "set-designer", "mode", "art"];

describe.each([["EN", QUETES_GABARITS_EN], ["ES", QUETES_GABARITS_ES]] as const)(
  "gabarits périodiques %s", (_, ov) => {
    test("chaque clé a ≥1 variante indexée depuis #0, placeholders {objets} présents", () => {
      for (const cle of CLES) {
        expect(ov[`${cle}#0`]).toBeDefined();
        const tous = Object.entries(ov).filter(([k]) => k.startsWith(`${cle}#`));
        for (const [, g] of tous) expect(g.corps.join(" ")).toContain("{objets}");
      }
    });
  },
);

test("courrier périodique avec gabaritId : régénéré dans la locale, cibles localisées", () => {
  const courrier = {
    id: "quo_test_1",
    payload: {
      type: "mission", categorie: "quotidien", expediteurId: "jeux-video",
      titre: "TITRE FR PERSISTÉ", corps: ["CORPS FR PERSISTÉ"],
      cibles: [{ templateId: "jx.playbox_pocket", etatMin: "Bon" }],
      recompense: { argent: 10 },
      gabaritId: "jeux-video#0", gabaritParams: { etatMin: "Bon" },
    },
  } as never;
  expect(titreCourrier(courrier, "en")).toBe(QUETES_GABARITS_EN["jeux-video#0"].titre);
  const corps = corpsCourrier(courrier, "en").join(" ");
  expect(corps).toContain("PlayBox Pocket"); // nomTemplate EN
  expect(corps).not.toContain("CORPS FR PERSISTÉ");
  // fallback : sans gabaritId ni id connu → payload FR
  const legacy = { id: "quo_legacy_1", payload: { ...courrier.payload, gabaritId: undefined } } as never;
  expect(corpsCourrier(legacy, "en")).toEqual(["CORPS FR PERSISTÉ"]);
});
```

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run src/lib/i18n/contenu/quetesGabarits.test.ts` → FAIL

- [ ] **Step 3: Implémenter** — types additifs, `genererTexte` retourne `gabaritId` (RNG et chaînes FR inchangés — mettre à jour `textes.test.ts` en conséquence), `periodiques.ts`/`creerCourrierMission` propagent, overlays EN/ES (ton par commanditaire : joueur enthousiaste, set designer pro, modeuse chic, esthète précieux — reformulation, pas calque), résolution 3 niveaux dans les helpers Task 4, mises en forme `{objets}`/`{etat}` par langue.

- [ ] **Step 4: Vérifier** — tests ciblés + `npm run test:run` + `npx tsc --noEmit` + `npx eslint src` → vert. Vérif rétro-compat : un `Courrier` de vieille save (sans `gabaritId`) rend le payload FR à l'identique dans les 3 locales de la voie fallback.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(i18n): quêtes périodiques à gabarits persistés (gabaritId + régénération par langue)"
```

---

### Task 6: Grand livre — params structurés + rendu localisé du Cahier

**Files:**
- Modify: `src/types/game.ts` (`LedgerEntry` l.193-211 : + `params?`)
- Modify: `src/context/GameContext.tsx` — les 10 écritures : l.645 (loyer), 701 (upgrade_atelier), 725 (upgrade_stockage), 866 (upgrade_camion), 986 (session_chinage), 1001 (session_vente), 1378 (courrier_recompense), 1445 (mission_recompense), 1488 (gazette), 1506 (frais_brocante — le `void brocanteId` l.1499 SAUTE : on le range dans params)
- Modify: `src/lib/grandLivre.ts:84,103` (reconstruction post-migration : mêmes params)
- Modify: `src/lib/i18n/libelles.ts` (+ `libelleLedger`), `src/lib/i18n/ui/{fr,en,es}.ts` (section `ledger`)
- Modify: `src/components/mobile/qg/overlays/CahierDeCompteOverlay.tsx:179`
- Test: `src/lib/i18n/libelleLedger.test.ts`

**Interfaces:**
- Produit :
  ```ts
  // game.ts — additif, rétro-compat (vieilles entrées sans params → fallback designation FR)
  export interface LedgerParams {
    niveau?: number;        // loyer (tier), upgrades
    brocanteId?: string;    // session_chinage, frais_brocante
    nb?: number;            // session_chinage (acquis), session_vente (ventes)
    courrierId?: string;    // courrier_recompense, mission_recompense
    jour?: number;          // gazette
  }
  // LedgerEntry.params?: LedgerParams

  // libelles.ts
  export function libelleLedger(e: LedgerEntry, d: DictionnaireUI, locale: Locale): string;
  // switch sur e.kind ; params présents → gabarit dict interpolé
  //   (loyer → tr(d.ledger.loyer, {tier: nomStockageTier(getStockageTierParNiveau(niveau), locale)}) ;
  //    session_chinage → nomBrocante résolu par brocanteId + nb ; etc.)
  // params absents (vieilles saves) → e.designation (FR, dégradation assumée).
  ```
- Section `ledger` (fr) — gabarits reproduisant les chaînes actuelles : `loyer: "Loyer · {tier}"`, `upgradeAtelier: "Atelier N{niveau}"`, `upgradeStockage: "Stockage N{niveau}"`, `upgradeCamion: "Camion N{niveau}"`, `sessionChinage: "{brocante} · {nb} acquis"`, `sessionChinageUn: "{brocante} · 1 acquis"`, `sessionVente: "Étal · {nb} ventes"`, `sessionVenteUne: "Étal · 1 vente"`, `gazette: "Gazette du jour {jour}"`, `fraisBrocante: "Entrée · {brocante}"` (+ singulier/pluriel par clés dédiées `_un`/`_n`, convention SP1 — vérifier le libellé FR EXACT actuel « acqui(s) »/« vente(s) » dans GameContext et le normaliser proprement par clé).
- `courrier_recompense`/`mission_recompense` : résoudre le titre par `courrierId` → retrouver le courrier dans `state.courriers` puis `titreCourrier(courrier, locale)` (Task 4/5) ; courrier introuvable → fallback `designation`. `libelleLedger` reçoit donc AUSSI `courriers: Courrier[]` en paramètre (ou une fonction de lookup) — signature exacte : `libelleLedger(e, d, locale, courriers)`.
- ⚠️ On continue d'écrire `designation` FR (compat lecteurs/debug) ; `params` s'AJOUTE. Les tests existants sur le grand livre ne doivent pas casser.

- [ ] **Step 1: Test qui échoue**

```ts
// src/lib/i18n/libelleLedger.test.ts
import { describe, expect, test } from "vitest";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import { libelleLedger } from "@/lib/i18n/libelles";

const base = { id: "l1", jour: 3, montant: -5, solde: 100 };

test("frais_brocante avec params : brocante localisée", () => {
  const e = { ...base, kind: "frais_brocante", designation: "Entrée · Vide-grenier du quartier",
              params: { brocanteId: "vide-grenier-quartier" } } as never;
  expect(libelleLedger(e, DICTIONNAIRES.en, "en", [])).toContain("Neighborhood yard sale");
  expect(libelleLedger(e, DICTIONNAIRES.fr, "fr", [])).toBe("Entrée · Vide-grenier du quartier");
});

test("vieille entrée sans params : fallback designation FR dans toutes les locales", () => {
  const e = { ...base, kind: "loyer", designation: "Loyer · Garage" } as never;
  expect(libelleLedger(e, DICTIONNAIRES.es, "es", [])).toBe("Loyer · Garage");
});

test("session_chinage singulier/pluriel par langue", () => {
  const un = { ...base, kind: "session_chinage", designation: "x",
               params: { brocanteId: "vide-grenier-quartier", nb: 1 } } as never;
  const n = { ...un, params: { brocanteId: "vide-grenier-quartier", nb: 3 } } as never;
  expect(libelleLedger(un, DICTIONNAIRES.en, "en", [])).toMatch(/1 .*acquired|1 find/i);
  expect(libelleLedger(n, DICTIONNAIRES.en, "en", [])).toContain("3");
});
```

(Adapter les assertions EN aux gabarits réellement écrits — l'esprit du test est : params → localisé, pas de params → designation.)

- [ ] **Step 2: Vérifier l'échec** — `npx vitest run src/lib/i18n/libelleLedger.test.ts` → FAIL

- [ ] **Step 3: Implémenter** — type additif, les 10 écritures GameContext + 2 reconstructions grandLivre.ts gagnent `params` (avec les données listées dans le tableau d'interfaces — le `brocanteId` de `frais_brocante` cesse d'être jeté), section `ledger` ×3 langues, `libelleLedger`, bascule `CahierDeCompteOverlay.tsx:179` (`e.designation` → `libelleLedger(e, d, locale, state.courriers)`).

- [ ] **Step 4: Vérifier** — tests ciblés + `npm run test:run` + `npx tsc --noEmit` + `npx eslint src` → vert. Sanity rétro-compat : les tests existants de grandLivre/migrations passent sans modification de leurs assertions (params est optionnel).

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(i18n): grand livre à params structurés + rendu localisé du Cahier de compte"
```

---

### Task 7: Raisons d'échec localisées + audit final SP4

**Files:**
- Modify: `src/context/GameContext.tsx` (raisons l.658, 691-694, 1416 + toutes celles de l'inventaire Step 1)
- Modify: `src/lib/i18n/ui/{fr,en,es}.ts` (section `raisons`)
- Test: extension `src/lib/i18n/ui/ui.test.ts` automatique (parité) + spot-check dans un test GameContext existant si les raisons y sont assertées

**Interfaces:**
- Inventaire d'abord : `grep -n "raison" src/context/GameContext.tsx` — chaque `raison: "…"` FR devient `raison: tr(DICTIONNAIRES[localeCourante()].raisons.<cle>, params?)` via un petit helper local `raisonLocalisee(cle, params?)` en tête de fichier (GameContext n'est pas un composant par ligne d'écriture — utiliser `localeCourante()` de Task 3, PAS de hook dans les callbacks).
- Les raisons paramétrées (« Il manque {n} € ») gardent leurs placeholders identiques ×3 langues.
- ⚠️ Si un test existant asserte une raison FR littérale, le mettre à jour vers la clé/valeur FR du dico (le texte FR ne change pas).

**Audit final SP4 (clôture du chantier i18n) :**

- [ ] **Step 1: Inventaire + test qui échoue** — greps d'inventaire, ajout de la section `raisons` (test de parité ui.test.ts échoue tant que en/es manquent), écriture des raisons EN/ES.

- [ ] **Step 2: Vérifier l'échec puis le vert** — `npx vitest run src/lib/i18n/ui/ui.test.ts` FAIL → implémentation → PASS.

- [ ] **Step 3: Bascule GameContext** — toutes les raisons passent par `raisonLocalisee`. `npx vitest run src/context` (ou les tests qui couvrent GameContext) → vert.

- [ ] **Step 4: Audit final zéro-FR-en-dur**

```bash
npm run test:run && npx tsc --noEmit && npx eslint src
node scripts/audit-i18n-residuel.mjs
grep -rn "« \|acqui(s)\|Journée\|Marché du jour\|est annoncé\|Le Flair\|La Criée\|Lot garni\|La Tchatche\|Le Boniment\|La Fouille" src/app src/components src/lib --include='*.ts*' | grep -v "test\|/i18n/\|/data/\|quetesPrincipales\|celebrites.ts"
```

Expected : suites vertes ; le grep ne remonte plus AUCUN texte FR affiché en dur hors sources canoniques. Documenter dans le rapport les résiduels ASSUMÉS avec justification : `METEO_LABEL`/`descriptionEffetMeteo` (code mort), `dernierLoyer.tierNom` (persisté jamais affiché), textes FR des vieilles saves (dégradation par design), « Pocket Monster » (dossier droits d'auteur). Si l'audit trouve un VRAI reste affichable : le basculer (dict/overlay selon nature) dans cette tâche.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(i18n): raisons d'échec trilingues + audit final SP4 zéro français en dur"
```

---

## Self-Review (faite à l'écriture du plan)

- **Couverture spec §4** : gazette générée ✅ (T2 — la « génération » réelle est structurée en save, seul le gabarit d'annonce était FR) ; répliques de négo ✅ (T1, y compris vitrine.ts et la relance en dur) ; notifications locales ✅ (T3, locale au scheduling + replanification) ; courrier à gabarits ✅ (T4 ids stables + T5 périodiques persistés) ; audit final zéro FR en dur ✅ (T7). Ajouts justifiés par l'inventaire : grand livre/Cahier (T6 — designation persistée, lecteurs brocanteNom soldés), actives HUD + libellés cahier + raisons d'échec (T2/T7 — affichés, non couverts par SP2/SP3). ICU : non nécessaire (pluriels gérés par clés `_un`/`_n`, convention SP1).
- **Types cohérents** : `MessageNego`/`texteNego` (T1) ; `titreCourrier`/`corpsCourrier` définis T4, étendus T5, consommés T6 (`libelleLedger`) — priorité gabarit > id > payload documentée T5 ; `localeCourante()` définie T3, consommée T7 ; `LedgerParams` additif T6.
- **Règle d'or** : T1 vérifie la non-persistance avant de toucher `NegociationState` ; T4/T5/T6 n'ajoutent que des champs optionnels et continuent d'écrire le FR canonique ; aucun changement de `migrerSauvegarde`.
- **Placeholders** : parité imposée par tests (nego.test, ui.test, quetesGabarits.test).
