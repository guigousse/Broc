# Refonte UI du mode étal (vente) — dock d'atouts, fond, cadres, fix info

**Date** : 2026-07-13
**Statut** : validé par Guillaume

## Objectif

Aligner le mode étal (page journée de vente) sur la refonte du mode chinage :

1. Même header inférieur : « Sortir » à gauche, atouts en cercles à droite.
2. Fond = image floutée de la brocante sélectionnée.
3. Slots d'items en cadre simple laiton (plus de double liseré).
4. Corriger le bug : fermer la fenêtre info (i) d'un client quitte la vente
   en cours et fait perdre la transaction.

## 1. `SkillDock` partagé

- `ChineSkillDock` est renommé **`SkillDock`**
  (`src/components/mobile/SkillDock.tsx`, type `DockSkill` inchangé) ; le
  test suit (`SkillDock.test.tsx`). Imports du chinage mis à jour
  (`ItemSwipeDeck` n'importe que le type via ClientPage ; seul
  `chiner/[brocanteId]/ClientPage.tsx` importe le composant). Zéro
  changement de comportement côté chinage.

## 2. Page journée de vente (`vitrine/[brocanteId]/journee/ClientPage.tsx`)

- Structure alignée sur le chinage : `height: 100dvh`, `main` scrollable
  (`flex: 1`, `overflowY: auto`), **barre du bas en flux** (fond
  `--forest-800`, liseré haut laiton, padding safe-bottom) :
  - Gauche : bouton « Sortir » (icône `DoorOpen` + `d.chine.sortir`, mêmes
    styles qu'`ItemSwipeDeck`) → `handleFermerEnAvance` (baisser le rideau,
    logique existante inchangée).
  - Droite : `SkillDock` avec les 3 atouts de vente, ordre de déblocage :
    **Lot garni (N10, 🧺), Boniment (N20, 🎩), Criée (N30, 📣)**.
    Webp `public/competences/atout.{lotGarni,boniment,criee}.webp`
    (fallback emoji via onError — génération d'assets dans une session
    dédiée). Verrouillé = grisé + cadenas + pastille « N{niveau} » + toast
    `d.chine.atoutVerrouilleToast` ; débloqué = pastille d'usages restants.
- **Suppressions** : le FAB « Baisser le rideau » (`ActionFab`), le bouton
  📣 Criée de la section horloge, les boutons 🧺 Lot garni et 🎩 Boniment de
  `NegociationSheet` (et leurs props `lotGarni`/`boniment`).
- **Fond** : image de la brocante (`getBrocanteImageUrl(brocante.id)`)
  floutée + voile sombre, même recette que le chinage (couche absolue
  zIndex 0, contenu zIndex 1). Les sections horloge/journal gardent leur
  fond papier. Le texte « étal vide » posé directement sur le fond passe
  en couleur claire + text-shadow pour rester lisible.

## 3. Dock au-dessus de la sheet de négociation

- La barre du bas est en `zIndex: 50` (au-dessus du scrim 40 / sheet 41 de
  `BottomSheet`) et `position` en flux ; `BottomSheet` gagne une prop
  optionnelle `bottomOffset?: number` (px) appliquée à `bottom` de la sheet
  et du padding du scrim, pour que la sheet s'arrête juste au-dessus du dock.
  La page vente passe la hauteur du dock ; les autres usages de BottomSheet
  restent inchangés (défaut 0).
- **Activation contextuelle des cercles** :
  - Criée : hors visite client uniquement (`!clientActuel`), temps restant
    ≥ `CRIEE_INTERVALLE_SEC × CRIEE_NB_CLIENTS`, quota > 0 (conditions
    actuelles du bouton horloge).
  - Lot garni : visite en cours en mode négociation, `panier.length < 2`,
    `objetsAjoutablesLotGarni.length > 0`, quota > 0 → ouvre le mini-picker
    existant (`setLotGarniOuvert(true)` ; le picker consomme le quota au
    choix, logique existante).
  - Boniment : visite en cours en mode négociation, statut `en_cours`,
    quota > 0 → applique le boniment.
- **Boniment remonté dans ClientPage** (même approche que la Tchatche en
  chinage) : `jouerBoniment` consomme le quota puis
  `appliquerBoniment(negoVente, offreJoueur)` → `setNegoVente` ; si le
  statut passe à `conclu`, `playCash` + `encaisserVente` différé (600 ms),
  comme l'actuel `handleBoniment` du sheet.
- **`offreJoueur` lifté** : `NegociationSheet` devient contrôlée pour
  l'offre du joueur — props `offreJoueur: number` +
  `onChangeOffre: (n: number) => void` remplacent le `useState` interne ;
  la page possède l'état (réinitialisé à l'arrivée de chaque client).
  `NegociationSheet` n'a plus qu'un seul consommateur (cette page).

## 4. Cadres simples (`ItemCard`)

- `src/components/ui/ItemCard.tsx` : suppression du double liseré incrusté —
  le `boxShadow: inset 0 0 0 2px paper, inset 0 0 0 3px inner` du cadre
  principal (ligne ~48) disparaît ; la bordure `1.5px solid colors.outer`
  (couleur de rareté) est conservée. Même traitement pour le médaillon rond
  interne (ligne ~109 : garder la bordure, retirer les insets, conserver
  l'ombre portée externe). Appliqué globalement : étal + Boîte mystère
  (seuls consommateurs).

## 5. Fix du bug info (i)

- **Cause racine** : `PersonaInfoOverlay` est rendue dans le conteneur
  `topDecoration` de `BottomSheet` qui a `pointerEvents: "none"`
  (`BottomSheet.tsx:240`). Le scrim et la carte de l'overlay héritent de
  `pointer-events: none` → tout clic traverse et atterrit sur le scrim de
  la sheet → `onClose` → `terminerVisiteClient` → client parti, vente
  perdue.
- **Fix** : `pointerEvents: "auto"` sur le style `scrim` de
  `PersonaInfoOverlay`. Fermer l'info (scrim ou ✕) ne ferme plus la sheet.
- jsdom n'applique pas `pointer-events` : le test unitaire asserte le
  style ; la preuve comportementale vient du e2e Playwright (vrai
  navigateur).

## 6. i18n & tests

- Aucune nouvelle chaîne : « Sortir », arias et toasts du dock réutilisent
  les clés `d.chine.*` du chinage ; noms d'atouts via `libelleActive`.
- Tests : renommage du test SkillDock ; `NegociationSheet` contrôlée
  (offre) ; assertion de style sur le scrim info ; e2e Playwright — journée
  de vente : info client ouverte/fermée → la visite continue et la
  transaction reste possible ; criée depuis le dock hors client ;
  boniment/lot garni depuis le dock pendant une négo ; « Sortir » termine
  la journée.
- Lint : `npx eslint src` + `npm run lint:hooks` ; `npx tsc --noEmit`.

## Hors périmètre

- Génération des 3 webp `atout.{lotGarni,boniment,criee}.webp` (session
  d'assets dédiée ; fallback emoji en attendant).
- Pages de préparation de l'étal (`/vitrine`, `/vitrine/[brocanteId]`) —
  seule la page journée est refondue.
- Fermeture de la sheet par Escape pendant l'overlay info (cas
  desktop-only, accepté).
