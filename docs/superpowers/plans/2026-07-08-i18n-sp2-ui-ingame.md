# i18n SP2 — UI in-game trilingue — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toute l'interface in-game (chrome, QG, chine, vente, stockage/atelier, collection, bibliothèque, quêtes/gazette UI) passe par les dictionnaires FR/EN/ES — le contenu de jeu (src/data) et les textes générés restent français (SP3/SP4).

**Architecture:** On étend les dictionnaires SP1 (`src/lib/i18n/ui/{fr,en,es}.ts`, type dérivé du français) avec une section par écran. Chaque tâche-écran suit la même méthode : inventaire des chaînes en dur du lot → ajout des clés aux 3 dictionnaires (traductions suivant le glossaire) → migration des composants → vérification (tests inchangés verts, tsc, eslint, zéro résidu FR dans le lot). Deux helpers transversaux (`libelleEtat`, `libelleRarete`) traduisent à l'affichage les unions internes `EtatObjet`/`Rarete` sans toucher aux valeurs persistées.

**Tech Stack:** Infra SP1 (`useLangue()` → `{ locale, setLocale, d, tr }`), vitest, Playwright pour l'E2E final. Aucune dépendance nouvelle.

**Spec:** `docs/superpowers/specs/2026-07-08-internationalisation-design.md` (phasage n°2)

## Global Constraints

- **Frontière SP2** : une chaîne écrite EN DUR dans un composant/page = SP2. Une chaîne venant de `src/data/*` (noms d'objets, catégories, compétences, brocantes, vendeurs, quêtes, météos, vinyles) ou générée par une lib (gazette, répliques de négo, corps de courrier, notifications) = **NE PAS TOUCHER** (SP3/SP4). Dans le doute : si la valeur transite par une prop/donnée typée venant de data ou du GameState, on la laisse.
- `EtatObjet` (« Mauvais »…« Pristin état ») et `Rarete` (« commun/rare/legendaire ») restent les valeurs internes/persistées ; SEUL l'affichage passe par `libelleEtat`/`libelleRarete` (Task 1).
- Le français reste la source des dictionnaires ; en/es contraints par `DictionnaireUI` (clé manquante = erreur tsc). Traductions conformes au **glossaire** (Task 1) — terme du glossaire = obligatoire, pas d'improvisation par écran.
- `useLangue()` TOUJOURS appelé avant les early returns (filet `npm run lint:hooks` / `npx eslint src`).
- Les tests existants passent SANS modification (défaut de contexte fr), sauf mention contraire explicite dans une tâche (cas des tests qui requêtent un libellé changé — alors les mettre à jour dans la même tâche).
- Interpolation : `tr(d.section.cle, { x })` ; nombres via `toLocaleString(locale)` quand ils sont formatés ; prix en € partout.
- Décision d'échelle actée : dictionnaires UI = un fichier par locale (même gros) ; le contenu SP3 vivra à part dans `src/lib/i18n/contenu/`. Pas d'`import()` dynamique en SP2 (poids UI négligeable) — à réévaluer en SP3.
- Vérif lint : `npx eslint src` (`npm run lint` cassé repo-wide). Commits français `feat(i18n): …`.

## Méthode commune des tâches-écrans (référencée par les Tasks 2 à 8)

Chaque tâche-écran exécute exactement ces étapes sur SON lot de fichiers :

1. **Inventaire** : lister toutes les chaînes utilisateur en dur du lot (JSX texte, `aria-label`, `title`, `placeholder`, toasts, libellés construits par template literal). Commande de détection (à compléter d'une lecture réelle de chaque fichier — la regex rate les minuscules et gabarits) :
   `grep -nE '>[^<>{}]*[a-zA-Zéèêàçûôîù]{3,}[^<>{}]*<|aria-label=|title=|placeholder=|toast\(' <fichiers du lot> | grep -viE "var\(|import|from|//"`
   Trier : UI en dur (à migrer) vs donnée/contenu (à laisser, cf. frontière SP2).
2. **Clés** : ajouter la section de la tâche dans `src/lib/i18n/ui/fr.ts` (clés en camelCase français descriptif), puis les traductions dans `en.ts` et `es.ts` en respectant le glossaire. `npx tsc --noEmit` doit passer (le type force la complétude).
3. **Migration** : remplacer chaque chaîne par `d.<section>.<cle>` / `tr(...)`. Hooks avant early returns. Ne pas restructurer le JSX au-delà du remplacement.
4. **Vérification** : `npx eslint src && npx vitest run <tests du lot + suite si doute> && npx tsc --noEmit` ; puis re-passer la commande d'inventaire sur le lot → plus aucune chaîne UI en dur (les résidus data/contenu tolérés sont listés dans le rapport avec leur justification).
5. **Commit** : message de la tâche.

---

### Task 1: Fondations SP2 — glossaire, helpers état/rareté, reliquats SP1

**Files:**
- Create: `docs/superpowers/specs/2026-07-08-i18n-glossaire.md`
- Modify: `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts` (sections `etats`, `raretes`, clé `parties.emplacementN`)
- Create: `src/lib/i18n/libelles.ts`
- Modify: `src/lib/i18n/LangueContext.tsx` (commentaire flash)
- Modify: `src/components/mobile/PartiesModal.tsx` (aria-label section)
- Modify: `src/components/mobile/PartiesModal.test.tsx` (requêtes sur le nom du groupe)
- Test: `src/lib/i18n/libelles.test.ts`

**Interfaces:**
- Consumes: infra SP1.
- Produces: `libelleEtat(etat: EtatObjet, d: DictionnaireUI): string` ; `libelleRarete(rarete: Rarete, d: DictionnaireUI): string` (exportés de `@/lib/i18n/libelles`) ; le glossaire, référence obligatoire des Tasks 2-8.

- [ ] **Step 1: Écrire le glossaire**

Créer `docs/superpowers/specs/2026-07-08-i18n-glossaire.md` :

```markdown
# Glossaire i18n Broc — FR → EN / ES

Référence OBLIGATOIRE pour toute traduction UI (SP2) et contenu (SP3+).
Registre : jeu chaleureux, vintage France 1924. EN = anglais international
(pas d'argot US daté), ES = espagnol d'Espagne neutre. Vouvoiement FR =
« you » neutre EN = « tú » ES (ton jeu, proximité).

| FR | EN | ES | Note |
|---|---|---|---|
| chiner / le chinage | pick / picking | rebuscar / la rebusca | verbe cœur du jeu (à la « American Pickers ») |
| Chiner (bouton) | Pick | Rebuscar | |
| brocante (événement) | flea market | mercadillo | |
| vide-grenier | yard sale | rastrillo | |
| Étaler (bouton) | Set up stall | Montar puesto | |
| l'étal / la vitrine | the stall | el puesto | « vitrine » in-game = étal de vente |
| le QG | the HQ | el cuartel | rarement affiché |
| Bureau | Office | Despacho | onglet/pièce |
| Stockage | Storage | Almacén | |
| Atelier | Workshop | Taller | |
| Collection | Collection | Colección | |
| Bibliothèque / Compétences | Skills | Habilidades | l'écran des compétences |
| restaurer / restauration | restore / restoration | restaurar / restauración | |
| la caisse | the till | la caja | argent liquide du joueur |
| le budget | funds | los fondos | |
| l'énergie | energy | la energía | |
| la cote | market value | la cotización | valeur de référence d'un objet |
| le juste prix | fair price | el precio justo | |
| négociation / négocier | haggling / to haggle | regateo / regatear | |
| contre-offre | counteroffer | contraoferta | |
| vendeur (chine) | seller | vendedor | |
| client (vente) | customer | cliente | |
| commanditaire | patron | comitente | donneurs de missions |
| quête / mission | quest / commission | misión / encargo | quête=quest, mission livrée=commission |
| le carnet (de quêtes) | the notebook | el cuaderno | |
| la Gazette | the Gazette | la Gaceta | nom propre du journal, traduit léger |
| donation (collection) | donation | donación | |
| emplacement (save/slot) | slot | ranura | déjà acté SP1 |
| partie (save) | game | partida | déjà acté SP1 |
| jour / journée | day | día | |
| niveau (brocanteur) | level | nivel | |
| point (compétence) | point | punto | |
| palier | tier | rango | paliers 1-3 des compétences |
| débloquer | unlock | desbloquear | |
| verrouillé(e) | locked | bloqueado/a | |
| boîte mystère | mystery box | caja misteriosa | |
| gramophone / vinyle | gramophone / record | gramófono / vinilo | |
| le courrier / une lettre | the mail / a letter | el correo / una carta | |
| la météo | weather | el tiempo | |
| énergie pleine | full energy | energía llena | notifs |

## États d'objet (EtatObjet — valeurs internes inchangées)
| FR (valeur interne) | EN | ES |
|---|---|---|
| Mauvais | Poor | Malo |
| Bon | Good | Bueno |
| Très bon | Very good | Muy bueno |
| Pristin état | Pristine | Impecable |

## Raretés (Rarete — valeurs internes inchangées)
| FR (valeur interne) | EN | ES |
|---|---|---|
| commun | common | común |
| rare | rare | raro |
| legendaire | legendary | legendario |
```

- [ ] **Step 2: Tests des helpers (RED)**

Créer `src/lib/i18n/libelles.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import { libelleEtat, libelleRarete } from "@/lib/i18n/libelles";

describe("libelles état / rareté", () => {
  it("traduit les 4 états dans les 3 langues", () => {
    expect(libelleEtat("Pristin état", DICTIONNAIRES.fr)).toBe("Pristin état");
    expect(libelleEtat("Pristin état", DICTIONNAIRES.en)).toBe("Pristine");
    expect(libelleEtat("Pristin état", DICTIONNAIRES.es)).toBe("Impecable");
    expect(libelleEtat("Mauvais", DICTIONNAIRES.en)).toBe("Poor");
    expect(libelleEtat("Bon", DICTIONNAIRES.es)).toBe("Bueno");
    expect(libelleEtat("Très bon", DICTIONNAIRES.en)).toBe("Very good");
  });

  it("traduit les 3 raretés dans les 3 langues", () => {
    expect(libelleRarete("commun", DICTIONNAIRES.fr)).toBe("commun");
    expect(libelleRarete("legendaire", DICTIONNAIRES.en)).toBe("legendary");
    expect(libelleRarete("rare", DICTIONNAIRES.es)).toBe("raro");
  });
});
```

Run: `npx vitest run src/lib/i18n/libelles.test.ts` → FAIL (module absent).

- [ ] **Step 3: Clés + helpers (GREEN)**

Dans `fr.ts`, ajouter (et l'équivalent en/es selon le glossaire Step 1) :

```ts
  etats: {
    mauvais: "Mauvais",
    bon: "Bon",
    tresBon: "Très bon",
    pristin: "Pristin état",
  },
  raretes: {
    commun: "commun",
    rare: "rare",
    legendaire: "légendaire",
  },
```

(en.ts : Poor/Good/Very good/Pristine, common/rare/legendary ; es.ts :
Malo/Bueno/Muy bueno/Impecable, común/raro/legendario.)

Ajouter aussi la clé `parties.emplacementN: "Emplacement {n}"` (en :
`"Slot {n}"`, es : `"Ranura {n}"`).

Créer `src/lib/i18n/libelles.ts` :

```ts
import type { EtatObjet, Rarete } from "@/types/game";
import type { DictionnaireUI } from "@/lib/i18n/ui";

/**
 * Traduction À L'AFFICHAGE des unions internes persistées (EtatObjet,
 * Rarete). Les valeurs de save/logique ne changent JAMAIS (règle d'or de
 * la spec i18n) — seul le libellé rendu passe par le dictionnaire.
 */
export function libelleEtat(etat: EtatObjet, d: DictionnaireUI): string {
  switch (etat) {
    case "Mauvais":
      return d.etats.mauvais;
    case "Bon":
      return d.etats.bon;
    case "Très bon":
      return d.etats.tresBon;
    case "Pristin état":
      return d.etats.pristin;
  }
}

export function libelleRarete(rarete: Rarete, d: DictionnaireUI): string {
  switch (rarete) {
    case "commun":
      return d.raretes.commun;
    case "rare":
      return d.raretes.rare;
    case "legendaire":
      return d.raretes.legendaire;
  }
}
```

Run: `npx vitest run src/lib/i18n/libelles.test.ts && npx tsc --noEmit` → PASS.

- [ ] **Step 4: Reliquats SP1**

- `PartiesModal.tsx` : `aria-label={\`Emplacement ${ligne.n}\`}` →
  `aria-label={tr(d.parties.emplacementN, { n: ligne.n })}`.
- `PartiesModal.test.tsx` : la fabrique `ligne(n)` requête
  `getByRole("group", { name: \`Emplacement ${numero}\` })` — inchangée en
  pratique (défaut fr identique), le vérifier en lançant le fichier de test.
- `LangueContext.tsx` : compléter le commentaire du useEffect de détection :
  `// Conséquence assumée : sur navigateur non-FR, premier paint en français puis bascule (flash d'une frame) — inhérent à l'export statique sans détection SSR.`

- [ ] **Step 5: Vérification + commit**

Run: `npx eslint src && npx vitest run && npx tsc --noEmit` → tout vert.

```bash
git add docs/superpowers/specs/2026-07-08-i18n-glossaire.md src/lib/i18n/ src/components/mobile/PartiesModal.tsx src/components/mobile/PartiesModal.test.tsx
git commit -m "feat(i18n): glossaire SP2, helpers libelleEtat/libelleRarete, reliquats SP1"
```

---

### Task 2: Chrome — header, tabbar, navigation, toasts, composants UI partagés

**Files (lot):**
- Modify: `src/components/mobile/MobileHeader.tsx`, `TabBar.tsx`, `PageHeaderBar.tsx`, `MobileLayout.tsx`, `SwipePager.tsx`, `ActionFab.tsx`, `Badge.tsx`, `StickyTop.tsx`, `XpFloats.tsx`, `EnergieRecharge.tsx`, `UpgradeButton.tsx`, `BottomSheet.tsx`
- Modify: `src/components/ui/Toast.tsx`, `SkeletonScreen.tsx`, `ErrorScreen.tsx` (+ `src/app/error.tsx`, `src/app/global-error.tsx` si textes)
- Modify: `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts` (section `chrome`)
- Tests existants du lot : `TabBar.test.tsx`, `MobileHeader.test.tsx` (ne pas modifier sauf libellé changé — documenter le cas échéant)

**Interfaces:**
- Consumes: Task 1 (glossaire ; `d`, `tr` via `useLangue`).
- Produces: section `d.chrome.*` (onglets, énergie, caisse, niveaux, boutons génériques) consommée par les écrans suivants si besoin.

- [ ] **Step 1-5: Méthode commune** (cf. tête de plan) sur le lot ci-dessus, section `chrome`. Points connus du lot : libellés d'onglets TabBar (Collection/Bureau/Stockage/Atelier → glossaire), « Énergie »/« Caisse »/« Niv. »/« Pts » du header, aria-labels (« Recharger l'énergie », « Niveau de Brocanteur {n} »), textes de EnergieRecharge (pub/recharge), toasts génériques, `SkeletonScreen` (les libellés « — consultation du grimoire… » etc. sont passés par les PAGES appelantes : les migrer dans la tâche de leur écran, PAS ici — ici seulement le défaut éventuel du composant). Attention MobileHeader : le wordmark « Broc » n'est PAS une chaîne à traduire.

Commit : `feat(i18n): chrome trilingue — header, tabbar, toasts, composants partagés`

---

### Task 3: QG — panorama, objets interactifs, sheets de pièce

**Files (lot):**
- Modify: `src/app/(panorama)/layout.tsx`, `bureau/page.tsx`, `atelier/page.tsx`, `collection/page.tsx`, `stockage/page.tsx`
- Modify: `src/components/mobile/qg/` : `QgPanorama.tsx`, `QgPorte.tsx`, `QgCourrier.tsx`, `QgCarnet.tsx`, `QgCarnetNotes.tsx`, `QgCalendrier.tsx`, `QgGramophone.tsx`, `QgFauteuil.tsx`, `QgChatBaladeur.tsx`, `QgPortemanteau.tsx`, `QgPorteRevues.tsx`, `QgStockageBoxes.tsx`, `QgScene.tsx`
- Modify: `src/components/mobile/qg/sheets/PorteSheet.tsx`, `PasserConfirmSheet.tsx`
- Modify: dictionnaires (section `qg`)

**Interfaces:**
- Consumes: Task 1 ; `d.chrome.*` de la Task 2 si des libellés s'y trouvent déjà (ne pas dupliquer une clé existante).
- Produces: section `d.qg.*`.

- [ ] **Step 1-5: Méthode commune**, section `qg`. Points connus : « Chiner »/« Étaler » (PorteSheet — glossaire !), « Stockage plein », confirmation « Passer la journée », aria-labels des objets interactifs du panorama, textes du carnet de notes du QG. Les NOMS de vinyles, textes de lettres, contenus de gazette = contenu (laisser).

Commit : `feat(i18n): QG trilingue — panorama, objets interactifs, sheets de pièce`

---

### Task 4: Sheets transverses — courrier, calendrier, gramophone, gazette (UI), parcours, level-up, boîte mystère

**Files (lot):**
- Modify: `src/components/mobile/qg/sheets/CourrierSheet.tsx`, `CalendrierSheet.tsx`, `GramophoneSheet.tsx`
- Modify: `src/components/mobile/GazetteSheet.tsx`, `ParcoursSheet.tsx`, `LevelUpOverlay.tsx`, `BoiteMystereOverlay.tsx`
- Modify: dictionnaires (section `sheets`)
- Tests du lot le cas échéant (LevelUpOverlay a des tests — défaut fr, ne pas toucher)

**Interfaces:**
- Consumes: Tasks 1-2.
- Produces: section `d.sheets.*`.

- [ ] **Step 1-5: Méthode commune**, section `sheets`. Frontière stricte ici : dans CourrierSheet et GazetteSheet, SEULS les libellés d'interface (titres d'écran, boutons « Lire »/« Livrer », état vide, jours) sont SP2 — les corps de lettres, titres de missions, articles de gazette viennent du state/générateurs → laisser (SP4). Dans LevelUpOverlay : « Niveau {n} ! », libellés de déblocages génériques UI seulement (les titres de déblocages viennent de data → laisser).

Commit : `feat(i18n): sheets trilingues — courrier, calendrier, gramophone, gazette UI, parcours, level-up, boîte mystère`

---

### Task 5: Chine — liste des brocantes, session de chine, drawers

**Files (lot):**
- Modify: `src/app/chiner/page.tsx`, `src/app/chiner/[brocanteId]/ClientPage.tsx` (+ `page.tsx` si textes)
- Modify: `src/components/mobile/BrocanteCarousel.tsx`, `BrocanteCard.tsx` (racine components/), `WeekTimeline.tsx`
- Modify: `src/components/mobile/chine/ChineSlide.tsx`, `ItemSwipeDeck.tsx`, `ChineNegoDrawer.tsx`, `ChineMystereDrawer.tsx`
- Modify: `src/components/mobile/PersonaInfoOverlay.tsx`, `HumeurGauge.tsx`
- Modify: dictionnaires (section `chine`)

**Interfaces:**
- Consumes: Tasks 1-2 (`libelleEtat`/`libelleRarete` pour les fiches objets de la chine).
- Produces: section `d.chine.*`.

- [ ] **Step 1-5: Méthode commune**, section `chine`. Points connus : boutons Acheter/Passer/négo du drawer, « Vendeur fâché », cartes mystère, labels de la jauge d'humeur, entête de session (droit d'entrée, énergie). Les NOMS de vendeurs (« Mamie Odette »…), noms/descriptions d'objets, répliques de négo générées = contenu (laisser). Affichages d'`EtatObjet`/`Rarete` → basculer sur `libelleEtat`/`libelleRarete`.

Commit : `feat(i18n): chine trilingue — brocantes, session, drawers`

---

### Task 6: Vente — préparation, étal, négociation, fin de journée

**Files (lot):**
- Modify: `src/app/vitrine/page.tsx`, `prep/page.tsx`, `[brocanteId]/ClientPage.tsx`, `journee/ClientPage.tsx` (+ `page.tsx` si textes)
- Modify: `src/components/mobile/NegociationSheet.tsx`, `NegoBar.tsx`, `NegoItemRow.tsx`
- Modify: `src/components/vente/CoffreCanvas.tsx`, `CoffreChargement.tsx`, `DevPanel.tsx` (libellés joueur seulement — les libellés dev/debug restent FR, hors périmètre joueur), `src/components/SessionSummary.tsx`
- Modify: dictionnaires (section `vente`)

**Interfaces:**
- Consumes: Tasks 1-2.
- Produces: section `d.vente.*`.

- [ ] **Step 1-5: Méthode commune**, section `vente`. Points connus : chargement du coffre, prix/plaques de négo (« Accepter », « Contre-offre », « Refuser »), récap de fin de journée (ventes, gains), boutons d'actives (Criée, Boniment… : les NOMS de compétences = data → laisser tels quels, mais les libellés d'UI autour — quotas, tooltips génériques — sont SP2). Répliques des clients = générées (laisser).

Commit : `feat(i18n): vente trilingue — prep, étal, négociation, fin de journée`

---

### Task 7: Stockage, atelier, collection, inventaires

**Files (lot):**
- Modify: `src/app/stockage/gerer/page.tsx`, `src/app/atelier/gerer/page.tsx`, `src/app/collection/grille/page.tsx`
- Modify: `src/components/atelier/AtelierItemRow.tsx`, `PiecesInventoryBar.tsx`, `PieceIcon.tsx`
- Modify: `src/components/mobile/StockageItemRow.tsx`, `CollectionDetailOverlay.tsx`, `ObjetDetailOverlay.tsx`, `DonationPickerSheet.tsx`, `ConfirmReplaceModal.tsx`, `CategoriePicker.tsx`, `CategorieChips.tsx`, `ColonnesSlider.tsx`
- Modify: `src/components/CollectionGrid.tsx`, `InventoryGrid.tsx`, `src/components/ui/ItemSticker.tsx`, `ItemImage.tsx` (alt génériques)
- Modify: dictionnaires (section `inventaire`)
- Tests du lot : `CollectionGrid.test.tsx` (défaut fr — ne pas modifier sauf libellé requêté changé)

**Interfaces:**
- Consumes: Task 1 (`libelleEtat`/`libelleRarete` — c'est LE lot qui affiche le plus d'états).
- Produces: section `d.inventaire.*`.

- [ ] **Step 1-5: Méthode commune**, section `inventaire`. Points connus : « Restaurer », durées/coûts atelier, « Donner à la collection », confirmations de remplacement, états vides des grilles, libellés de tri/filtres. Les NOMS de catégories (« Musique », « Jeux & Loisirs »… = valeurs `CategorieObjet` de data) : NE PAS traduire en SP2 — noter chaque occurrence affichée dans le rapport (liste d'attente SP3).

Commit : `feat(i18n): inventaires trilingues — stockage, atelier, collection`

---

### Task 8: Bibliothèque (compétences) + divers restants

**Files (lot):**
- Modify: `src/app/bibliotheque/page.tsx` (libellés UI : « Compétences », N{n}, Pts, coût, « Acheter », bannières verrouillée/acquise — les NOMS/descriptions de compétences = data, laisser)
- Modify: `src/components/mobile/TreePicker.tsx`, `IntroPorte.tsx` (aria/tap pour passer), `PersonaAvatar.tsx` (alt), `ConfirmReplaceModal.tsx` si restant, tout fichier du périmètre SP2 découvert non couvert par les Tasks 2-7 (les lister dans le rapport)
- Modify: dictionnaires (section `bibliotheque` + compléments)

**Interfaces:**
- Consumes: Tasks 1-2.
- Produces: section `d.bibliotheque.*`.

- [ ] **Step 1-5: Méthode commune**, section `bibliotheque`. Le libellé de skeleton « — consultation du grimoire… » (passé par la page) se migre ici, ainsi que tout skeleton-label des autres pages s'il en reste (vérifier `SkeletonScreen` call sites : `grep -rn "SkeletonScreen" src/app src/components --include='*.tsx' | grep label`).

Commit : `feat(i18n): bibliothèque trilingue + libellés restants`

---

### Task 9: Audit final + E2E trilingue

**Files:**
- Create: `scripts/audit-i18n-residuel.mjs`
- Aucune autre modification attendue (sauf résidus trouvés → les corriger ici)

**Interfaces:**
- Consumes: tout SP2.
- Produces: script d'audit rejouable (servira aussi en SP3/SP4).

- [ ] **Step 1: Script d'audit**

Créer `scripts/audit-i18n-residuel.mjs` : parcourt les `.tsx` de `src/app` et `src/components` (hors `*.test.tsx`, hors `src/components/mobile/qg/dev/`), extrait les littéraux JSX et attributs utilisateur (`aria-label`, `title`, `placeholder`) contenant des mots français probables (regex `[éèêàâçîïôûùœ]|\b(le|la|les|des|un|une|votre|vos)\b` sur du texte ≥ 3 caractères hors `var(--…)`, urls, classes), et imprime fichier:ligne. Sortie attendue après SP2 : uniquement des faux positifs documentés (props recevant du contenu data) — les consigner en tête du script dans une liste d'exclusions commentée, chacune avec sa justification SP3/SP4.

- [ ] **Step 2: E2E Playwright trilingue**

Dev server lancé. Script scratchpad : forcer `projet-broc:langue:v1` à `en`, créer une partie (bouton « New game », intro tap pour passer), vérifier au fil de la navigation : header (Energy/Till), TabBar (Office/Storage/Workshop/Collection), PorteSheet (« Pick »/« Set up stall »), écran chiner (entête session), vitrine prep, collection, bibliothèque (« Skills »), Réglages in-game si accessible. Screenshot par écran. Répéter le spot-check en `es` sur 3 écrans (bureau, chine, compétences). 0 pageerror exigé. Les noms d'objets/vendeurs encore FR sont ATTENDUS (SP3) — le vérifier visuellement et le noter.

- [ ] **Step 3: Suite complète + résidus**

Run: `node scripts/audit-i18n-residuel.mjs && npx vitest run && npx tsc --noEmit && npx eslint src`
Expected: audit vide (hors exclusions justifiées), suite verte.

- [ ] **Step 4: Ledger + mémoire + commit**

```bash
git add scripts/audit-i18n-residuel.mjs
git commit -m "feat(i18n): script d'audit des résidus français + vérification E2E SP2"
```
