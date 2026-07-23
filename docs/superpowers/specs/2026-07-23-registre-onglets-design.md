# Registre unifié (commandes + comptes) & refonte cartes de commande — design

**Date** : 2026-07-23
**Statut** : validé par Guillaume (onglets d'index papier, 2 objets de scène conservés)

## Problème

Le carnet de commandes (`CarnetNotesOverlay`, 360px) et le cahier de compte
(`CahierDeCompteOverlay`, 480px) sont deux fenêtres séparées aux habillages
différents. Le carnet est peu lisible : commanditaires en petits avatars 42px,
items recherchés invisibles tant que la carte n'est pas dépliée, cartes étroites.

## Décision

Réunir les deux sous **une seule fenêtre « registre » à 2 onglets d'index
papier** (Commandes / Comptes), châssis carnet crème/bordeaux élargi à 420px,
et refondre les cartes de commande : avatar 64px dominant, aperçu des items
recherchés sur la carte fermée, cartes encadrées.

## Architecture

- **`RegistreOverlay.tsx`** (nouveau, `overlays/`) : scrim, châssis, onglets,
  en-tête, Escape + scroll-lock (logique reprise des deux overlays actuels).
  Props : `open`, `onglet: "commandes" | "comptes"`, `onOngletChange`,
  `onClose`, `state`, `onLivrerMission`, `tempsConfiance?`.
  L'onglet est **contrôlé par le parent** (layout) : un seul état
  `registreOuvert: null | "commandes" | "comptes"`.
- **`OngletCommandes.tsx`** (nouveau) : contenu actuel de `CarnetNotesOverlay`
  (tri `trierActives`, sections principales/quotidiennes/hebdomadaires,
  compte à rebours de renouvellement, section Terminées repliable, compteur
  livrables). Logique strictement inchangée, seul le conteneur disparaît.
- **`OngletComptes.tsx`** (nouveau) : contenu actuel de `CahierDeCompteOverlay`
  (agrégation journées, lignes J{n}, détail repos inline, **mode replay
  plein écran inchangé** — il continue de remplacer toute la fenêtre).
- **`CommandeRow.tsx`** : restylé (voir ci-dessous), API inchangée.
- **Supprimés** : `CarnetNotesOverlay.tsx`, `CahierDeCompteOverlay.tsx`.
- **`layout.tsx` (qg)** : `carnetOuvert` + `carnetNotesOuvert` →
  `registreOuvert`. Le carnet rouge de la scène (`QgCarnetNotes`) ouvre
  `"commandes"`, le cahier (`QgCarnet`) ouvre `"comptes"`. Aria-labels de
  scène inchangés.

## Habillage châssis + onglets

- Châssis : celui du carnet actuel (fond `#f4e9cd` ligné 24px, bordure
  `2px #6e1f1f`, ombre intérieure, ruban rouge) élargi à **maxWidth 420**,
  `maxHeight 88dvh`. Le ruban rouge décoratif reste sur l'onglet Commandes
  uniquement (marque-page des livrables).
- Onglets d'index : rangée au-dessus du châssis, deux boutons
  coins-arrondis-haut, mono uppercase 10px letterspacing 0.14em.
  - Actif : fond `#f4e9cd`, texte `#6e1f1f`, bord `#6e1f1f` sans bord bas,
    soudé au châssis (margin-bottom −2px, zIndex au-dessus du bord).
  - Inactif : fond `#d9c79a`, texte `#7a6438`, légèrement plus bas
    (padding-top réduit), bord `rgba(110,31,31,0.5)`.
- En-tête sous les onglets : titre + sous-titre existants de l'onglet actif
  (`d.carnet.titre` / jour + livrables, ou `d.cahier.titre` / jour + solde).
- i18n : nouveau bloc `registre` dans les 4 dicts :
  FR `{ ongletCommandes: "Commandes", ongletComptes: "Comptes" }`,
  EN `{ "Orders", "Accounts" }`, ES `{ "Pedidos", "Cuentas" }`,
  EL `{ "Παραγγελίες", "Λογαριασμοί" }`.

## Refonte des cartes de commande (`CommandeRow`)

Carte fermée (l'essentiel de la refonte) :

- Chaque carte devient un **encadré** : fond `rgba(255,250,235,0.6)`, filet
  `1px solid rgba(110,31,31,0.35)`, borderRadius 6, marge verticale 8px
  (remplace la ligne + borderBottom).
- **Avatar 64×64** (au lieu de 42), borderRadius 12 (médaillon arrondi, plus
  rond complet), bordure `2px solid #c8a24a` + liseré intérieur crème.
  Fallback initiale conservé.
- Titre de la commande : display 15px (au lieu de 13). Nom + personnalité du
  commanditaire dessous (serif 11, inchangé).
- **Aperçu des items recherchés sur la carte fermée** : sous le bloc
  titre/commanditaire, rangée de vignettes `ItemImage` 30×30 (fond crème,
  filet fin), chacune surmontée d'une pastille d'angle ✓ (vert `#2c5e3f`)
  si la cible est remplie, ○ (beige `#b3a06a`) sinon — source :
  `progressionMission(...).ciblesRemplies`. Maximum 4 vignettes, puis un
  jeton « +{n} ». Missions sans cible objet : la rangée affiche à la place
  le libellé du 1er objectif (`libelleObjectif`) + progression
  `actuel/cible` (mono 10px).
- Colonne droite inchangée : badge « Prêt ✓ » / compteur `x/y` + barre /
  « J−n ».
- Carte dépliée : contenu actuel inchangé (corps, liste complète des cibles
  avec états min, objectifs, récompense, bouton Livrer) ; il s'affiche DANS
  l'encadré de la carte (sous l'en-tête, même fond).

## Tests

- `CarnetNotesOverlay.test.tsx` → `RegistreOverlay.test.tsx` : mêmes 2 tests
  (sections, un seul détail ouvert) via le nouveau composant
  (`onglet="commandes"`), + « ouvre sur l'onglet comptes » (titre Cahier
  visible, Quête A absente) + « bascule d'onglet » (clic sur l'onglet
  Comptes → `onOngletChange` appelé).
- `CommandeRow.test.tsx` : tests existants conservés ; ajout « la carte
  fermée montre une vignette par cible (max 4 + jeton +n) » via
  `data-testid="apercu-cible"` / `"apercu-plus"`.
- Suite complète + `npx tsc --noEmit` + eslint fichiers touchés.

## Hors périmètre

- Fusion des deux objets de la scène QG (les deux restent).
- Toute évolution du mode replay du cahier.
- Génération d'illustrations commanditaires manquantes (mémoire
  vendeurs-nommes : backlog séparé).
