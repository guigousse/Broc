# Tutoriel v2 — polish post-recette : lisibilité, colis Tetris, pricing guidé, vente scriptée

**Date** : 2026-08-09 · **Statut** : validé par Guillaume (design section par section)
**Branche** : `feat/tuto-brocante-scriptee` (suite du tutoriel v2, spec du 2026-08-08)
**Origine** : recette device de Guillaume + retours de joueurs 60+.

## Objectif

Sept chantiers issus de la recette :

1. **Lisibilité 60+** : dialogues du grand-père plus grands ET dans une police de
   lecture (fini la manuscrite 18 px).
2. **Fixes visuels** : pulse de porte parasite au retour du chinage, bannière qui
   transparaît dans la découpe du coach, main qui passe derrière une ligne du stockage.
3. **Collection** : phase « retrouve ta peluche » (filtre, scroll auto, détail,
   bouton retirer montré).
4. **Colis fixe AVANT l'étal** : le colis revient dans le tutoriel (objets fixes),
   le cadeau post-carnet disparaît. Nouvelles images colis + cadeau d'anniversaire
   à intégrer.
5. **Coffre Tetris + démo** : coffre pré-rempli verrouillé, le grand-père dépose et
   tourne la manette en démo, le joueur pose la carafe.
6. **Pricing guidé** : prix conseillés par le grand-père sur manette + carafe,
   flèches de négo sur les curseurs, colis pré-étiqueté.
7. **Journée de vente scriptée** : 3 acheteurs connus (refus du radin, vente directe,
   négo garantie), présentés par le grand-père.

## 1. Lisibilité 60+

- **Dialogues** (`DialogueOverlay.tsx:81-86`) : actuellement Caveat
  (`--font-handwriting`) 18 px. → **`var(--font-serif)`** (Cormorant Garamond, la
  police de lecture de l'appli), **21 px, fontWeight 500, lineHeight 1.45**. La
  manuscrite reste pour courrier/cartes postales (thématique).
- **Bulles du TutorielCoach** : 18 px (même serif).
- **Bannière d'instructions** (`TutorielBanniere.tsx:31-35`) : mono 12 → 13 px.

## 2. Fixes visuels

- **Pulse de porte** (`(qg)/layout.tsx:575`) : découpler pulse et permission. Le tap
  reste permis sur toute la liste `portePermise` actuelle (anti-soft-lock intact) ;
  le **pulse** ne s'affiche plus qu'aux étapes où la porte est l'action prescrite :
  `aller-chiner`, les 4 étapes de chine scriptée (sortie anticipée : y retourner EST
  le chemin), `preparer-etal`, `vente-*` (reprise de journée). **Plus de pulse à
  `chine-sortir`** ni pendant stockage/collection/colis.
- **Bannière vs coach** (captures 1-2) : la bannière (z 90) transparaît dans la
  découpe du coach (z 100). → petit module pub/sub `src/lib/coachActif.ts` (pattern
  `affichageGele` existant) : `TutorielCoach` publie ouvert/fermé, la bannière s'y
  abonne (`useSyncExternalStore`) et se masque pendant un coach — en libérant
  `--tuto-banniere-h` (le cleanup existant `TutorielBanniere.tsx:86-89` le fait
  quand `visible` devient faux).
- **Main derrière une ligne** (capture 3) : pendant `collection-envoyer`, la ligne
  guidée du stockage reçoit `position: relative` + z-index au-dessus de ses sœurs
  (la main `tuto-main-haut` déborde vers la ligne précédente).

## 3. Collection — retrouver la peluche

Toujours dans l'étape `collection-lecon` (machine locale à la page, fail-open),
après les 3 bulles actuelles du coach :

1. Main sur le **filtre Jeux & Loisirs** du `CategoriePicker` (les autres filtres
   sont inertes pendant la phase).
2. Au tap : filtre appliqué + **scroll automatique** jusqu'à la case de la peluche
   (exposer `scrollToIndex` du `useVirtualizer` de `CollectionGrid.tsx:296-303`, ou
   `scrollIntoView` sur la case rendue — avec le filtre appliqué la grille est
   quasi vide, le scroll est trivial).
3. Main sur la **case de la peluche** → le tap ouvre `CollectionDetailOverlay`.
4. Une bulle du coach pointe le bouton **« Retirer de la collection »**
   (`CollectionDetailOverlay.tsx:174-197`, `data-tuto-coach` dessus) — montré,
   PAS pressé : le bouton est inerte pendant le tutoriel.
5. Fermeture du détail → dialogue `tuto_collection_lecon` → `preparer-etal`
   (inchangé, mais déplacé après cette phase).

## 4. Colis fixe avant l'étal

- **L'étape `ouvrir-colis` réapparaît** dans `TutorielEtape`, entre
  `collection-lecon` et `preparer-etal` (le dialogue de fin de leçon collection y
  mène). Retour au bureau : le colis attend devant la porte (`QgColis`), dialogue
  de remise du grand-père (adapter `tuto_colis_cadeau` → `tuto_colis_avant`),
  cérémonie ×5 existante, étape → `preparer-etal` quand le colis est vide.
- **Contenu FIXE** : 5 objets scriptés (4 communs + 1 rare en final de cérémonie),
  définis dans `tutorielScenario.ts` (`COLIS_TUTORIEL_SCRIPTE`), choisis au plan
  pour leurs **tailles** (pièces du Tetris, compatibles coffre niveau 1) et leurs
  illustrations (`ITEMS_WITH_IMAGE`). `objetColisTutoriel(index)` sert l'objet fixe
  d'index i (même signature, plus de tirage).
- **Le cadeau post-carnet disparaît** : `colisEnAttente()` supprimé, branches
  `colisCadeauEnCours` du layout retirées ; `appliquerFinTutoriel` **re-livre le
  reliquat du colis en bloc** (fail-open « Passer » — retour au comportement
  d'origine, mais objets fixes).
- **Nouvelles images** : `public/qg/colis - copie.png` et
  `public/qg/cadeau-anniversaire - copie.png` (déposées le 30/07) sont les
  nouvelles versions → convertir en webp aux dimensions des assets actuels
  (`colis.webp`, `cadeau-anniversaire.webp`), remplacer, supprimer les « - copie ».

## 5. Coffre Tetris + démo du grand-père

- **Pré-remplissage** : à l'entrée en prep pendant le tutoriel, la vitrine est
  pré-remplie de **3 objets du colis** (4 si la géométrie du plan l'exige pour
  dessiner les deux trous) à positions/rotations fixes
  (`PREFILL_COFFRE_TUTORIEL` dans le scénario), **verrouillés** : le `hitTest` de
  `CoffreCanvas` les ignore pendant le tuto (pas de drag, pas de retrait), leurs
  prix sont déjà réglés (valeurs du scénario). Les trous restants dessinent les
  emplacements manette et carafe.
- **Traces** : la silhouette de la **manette passe à ~25°** (la démo doit avoir une
  rotation à montrer) ; la **carafe remonte** (`posY` 0.5 → ~0.42, rotation 40°
  conservée). Le **cadre pointillé disparaît** (`CoffreCanvas.tsx:337-338`) :
  silhouette seule, opacité relevée (~0.45), pulse conservé.
- **Démo (`coffre-trace-un`)** : animation bloquante ~4 s — une main glisse du
  carrousel (position mesurée de la manette) vers le trou, **dépose réellement**
  la manette (état du jeu), une **deuxième main apparaît en face** de la première,
  l'ensemble **tourne jusqu'à 25°** (commit réel), son de snap, mains qui
  s'estompent, input débloqué → `coffre-trace-deux`. Interruption (kill/sortie) :
  au remontage, si la manette n'est pas posée, la démo rejoue.
- **La carafe est au joueur** (`coffre-trace-deux`, inchangé) ; le `RotationHint`
  reste en rappel après 8 s d'inactivité.
- **Puzzle protégé** : pendant `coffre-trace-*`, seuls manette et carafe sont
  ajoutables depuis le carrousel (tap/drag des autres objets inertes).
- `traceAPoser`/`tracesToutesPosees` inchangés (les objets verrouillés ne comptent
  pas dans les traces).

## 6. Pricing guidé

- **Objets du colis** : sliders en **lecture seule**, prix pré-réglés (« le
  grand-père les a étiquetés »).
- **Manette + carafe** : `PRIX_CONSEILLES_TUTORIEL` dans le scénario (valeurs
  fixées au plan : marge sur le prix d'achat, cohérentes avec les budgets des
  acheteurs scriptés de la §7). `PrixSlider` reçoit `cible` + `tutoFleches` : la
  poignée porte les flèches de négo (`.tuto-fleches`, `globals.css:1558-1581` —
  précédent `NegoBar.tsx:108`), **s'aimante à ±2 €** de la cible. « Valider »
  inactif tant que les deux prix ne sont pas posés.
- Dialogues : `tuto_prix_avant` (pourquoi ces prix) et `tuto_prix_apres` (court).

## 7. Journée de vente scriptée

- **3 étapes persistées** remplacent `premiere-vente` : `vente-refus`,
  `vente-directe`, `vente-nego` (bannière, reprise après kill, garanties par
  étape). **Pas de bump de `SAVE_VERSION`** : la v19 n'a jamais shippé, le type
  s'étend librement (les étapes retirées sont absorbées par la normalisation).
- **File scriptée** : `SESSION_VENTE_TUTORIEL` dans le scénario — 3 acheteurs
  (personnage nommé tier 1 à portrait existant, objet ciblé, mode, offre initiale,
  budget max, bornes du curseur joueur). `genererClientEventScripte(etape)`
  fabrique le `ClientEvent` ; branché au point de spawn
  (`journee/ClientPage.tsx:545-554`), rythme piloté par `prochainClientRef`
  (précédent « La Criée », `:408`).
  1. **`vente-refus` — le radin** : vise la carafe, offre insultante, budget max
     trop bas ; le curseur joueur est **borné au-dessus** du budget du radin
     (impossible de brader) → seule issue « **Laisser tomber** »
     (`NegociationSheet.tsx:228-233`, main dessus). Débrief : refuser est un choix.
  2. **`vente-directe` — l'ami du grand-père** : veut la manette au prix affiché
     (mode achat direct), main sur « Accepter ».
  3. **`vente-nego` — la négociatrice** : veut la carafe, négo de vente réelle
     (elle monte vers sa cible), bornes + persona figé + `ALEA_NEGO_SCRIPTEE` →
     accord garanti, prouvé par test force brute (miroir du chinage, mode
     "vente"). Puis → `conclusion`, Sortir pulse.
- **Visages connus** : `personaRevele` forcé à vrai pendant le tutoriel
  (`journee/ClientPage.tsx:893-896`) — portraits réels + noms. Le grand-père
  **présente chaque acheteur** (dialogues avant/après ×3, 4 langues).
- **Garde-fous** : pas de clients aléatoires pendant le tuto (la file scriptée est
  la seule source) ; la fin de journée (horloge) est retenue tant que les étapes
  `vente-*` ne sont pas conclues ; `NegociationSheet`/`NegoBar` reçoivent bornes +
  aléa scripté (props façon `scriptTuto` du chinage).

## Hors périmètre

- Réglage global de taille de texte (accessibilité) — plus tard.
- Toute refonte du bilan de journée / des mécaniques de vente hors tutoriel.

## Tests

- Garanties de vente par force brute (radin : jamais d'accord possible dans les
  bornes ; négociatrice : accord ≤ patience avec la stratégie borne min), via
  `proposerOffre` mode "vente" + `ALEA_NEGO_SCRIPTEE`.
- Colis scripté : 5 templates connus, illustrés, tailles compatibles coffre.
- Préfill : positions dans les bornes, zéro collision entre objets verrouillés et
  traces (masques pixel réutilisés en test si praticable, sinon garde bbox).
- Prix conseillés : dans l'échelle du `PrixSlider` (1..2×réf) et cohérents avec
  les budgets des acheteurs scriptés (le radin < prix carafe ; l'ami ≥ prix
  manette ; la négociatrice converge ≥ borne min).
- i18n : nouvelles clés bannière (`vente-*`, `ouvrir-colis`) et séquences (remise
  du colis, prix, 3×avant/après acheteurs) dans les 4 langues.
