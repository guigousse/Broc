# Refonte du mode chinage — carrousel un-objet-à-la-fois + design sonore

**Date :** 2026-07-01
**Statut :** en validation (brainstorming)

## Contexte & objectif

Aujourd'hui, entrer dans une brocante affiche **tous les objets d'un coup** dans
une grille (`ClientPage` → `ObjetCardMobile`), et la négociation se fait via une
feuille modale (`NegociationSheet`). On remplace ce modèle par une expérience
**immersive un-objet-à-la-fois en swipe**, plus mobile et plus incarnée (on
« rencontre » chaque objet et son vendeur). On en profite pour ajouter un
**design sonore** (apparition / rareté / mystère) désormais trivial à cadencer
puisqu'on ne révèle qu'un objet à la fois.

Ce spec couvre **un seul écran** : la session de chine
(`src/app/chiner/[brocanteId]/ClientPage.tsx`). Toute la logique de jeu (achat,
XP, budget, énergie, suivi des achats, résumé de session, collection) est
conservée ; seule la **présentation** change (grille → carrousel) et la
négociation est **relocalisée** (déclenchée depuis la fiche du bas).

## Décisions validées

| Sujet | Décision |
|---|---|
| Modèle | Un objet à la fois, **carrousel libre** (swipe gauche/droite = précédent/suivant, on peut revenir). Plus de grille. |
| Layout | Header (existant) · moitié haute = l'objet en grand · moitié basse = vendeur + bouton **Négocier/Acheter**. |
| Négociation | La fiche basse montre le vendeur + le bouton. « Négocier » fait **remonter** le vendeur et ouvre la modale `NegociationSheet` depuis le bas, **sans l'item** dedans (déjà affiché au-dessus). |
| Vendeur mystère | Devient une **carte du carrousel** (en tête si présent). Sa fiche basse propose « Regarder une pub » (ouvre `BoiteMystereOverlay`) au lieu de Négocier/Acheter. |
| Sons | Joués à la **première apparition** de chaque carte : apparition (toutes) + rareté superposée (rare/lég./unique) + mystère superposé (vendeur). Revenir sur une carte déjà vue **ne rejoue pas**. |

## Layout cible

```
┌───────────────────────────────┐
│  Header (ContextualHeader)     │  ← inchangé (budget, retour, etc.)
├───────────────────────────────┤
│                                │
│        OBJET EN GRAND          │  ← moitié haute : image, nom,
│     (image, nom, rareté,       │     couleur de rareté, étoiles d'état,
│      étoiles, valeur, prix)    │     valeur, prix affiché
│                                │     + repère de position « 3 / 12 »
├───────────────────────────────┤
│      VENDEUR (illustration)    │  ← moitié basse : persona du vendeur
│   ┌─────────────────────────┐  │     + un bouton d'action :
│   │   Négocier / Acheter     │  │     • objet dispo → Négocier/Acheter
│   └─────────────────────────┘  │     • vendeur mystère → Regarder une pub
│                                │     • déjà acquis → état « Acquis »
└───────────────────────────────┘
   ← swipe →  (flèches ‹ › aussi, pour l'affordance + accessibilité)
```

## Interaction — carrousel

- La session génère la liste de « slides ». Une slide est soit un **objet**
  (`ObjetEnVente`), soit la **carte vendeur mystère** (0 ou 1, en tête si
  présente). Ordre des objets = ordre de `genererSession` (inchangé).
- Un index courant (`indexCourant`, state local) pointe la slide affichée.
  Swipe gauche → suivant, swipe droite → précédent (bornes : pas de boucle).
  Flèches ‹ › cliquables en complément (affordance + accessibilité clavier).
- Transition : glissement horizontal (`transform: translateX`) ~200 ms ease-out.
  `prefers-reduced-motion` → transition instantanée (sons toujours joués).
- Repère de position discret (« 3 / 12 ») pour situer l'avancée dans le paquet.

## Fiche du bas & négociation

- La moitié basse affiche l'**illustration du vendeur** (persona de l'objet
  courant, via `getVendeurIllustration(persona.archetype)`) + un bouton
  contextuel :
  - objet **disponible** : bouton double **« Négocier »** / **« Acheter »**
    (achat direct au prix affiché via `handleAcheter`, comme aujourd'hui) ;
  - objet **trop cher** (`budget < prixVendeur`) : « Acheter » désactivé,
    « Négocier » reste possible ;
  - objet **acquis** : état « Acquis », plus de bouton d'action ;
  - négo **fâchée / refus poli** : reprend le comportement actuel (bouton adapté).
- **« Négocier »** ouvre `NegociationSheet` (réutilisé) depuis le bas.
  Changement requis : rendre le prop `header` (le `NegoItemRow` = l'item)
  **optionnel** et l'**omettre** ici — l'objet est déjà affiché dans la moitié
  haute. Tous les autres props (persona, `echelleMax`, `cibleSecrete`,
  `prixDepartAdverse`, `nego`, `onUpdateNego`, `onConclu`) restent identiques.
- L'issue de négo (`onConclu`) et l'achat direct passent par les handlers
  **existants** `handleAchatAuPrix` / `handleAcheter` (aucune logique de jeu
  modifiée : budget, `ajouterObjet`, `marquerDejaPossedeTemplate`, XP, `achats`).

## Vendeur mystère dans le carrousel

- Le tirage d'apparition reste inchangé (`tenterApparition(nbBoitesReclamees…)`,
  `placeRestante(state) >= 1`) au moment de la génération de session.
- S'il apparaît, il devient la **1ʳᵉ slide** du carrousel. Sa moitié haute
  montre l'art du vendeur mystère (`VENDEUR_MYSTERE_ILLUSTRATION`) + « boîte
  scellée » ; sa moitié basse a un bouton **« Regarder une pub pour ouvrir »**
  qui ouvre `BoiteMystereOverlay` (inchangé). Après réclamation (`onClaimed`),
  la slide se marque « ouverte » (bouton retiré), on reste dans le carrousel.

## Design sonore

3 sons **one-shot** ajoutés à `audioManager` (pattern `playOneShot` existant),
préchargés à l'entrée (`audioManager.preload([...])`), gated par le réglage SFX
existant (même garde que `playCash`/`playRepair`).

- `playApparition()` — joué à la **première apparition** de **chaque** carte.
- `playRarete()` — **superposé** quand la carte révélée est rare/légendaire/unique.
  Déclencheur : `rarete !== "commun"` **ou** template `unique`
  (`getTemplate(templateId)?.unique === true`).
- `playMystere()` — **superposé** sur la carte vendeur mystère (donc apparition +
  mystère).

**« Première apparition »** = première fois que l'index atteint cette slide
pendant la session. On tient un `Set<number>` des index déjà vus ; à chaque
changement d'index (et à l'entrée pour la 1ʳᵉ slide), si l'index est nouveau, on
joue les sons puis on l'ajoute au Set. Revenir en arrière ne rejoue rien.

`prefers-reduced-motion` : les sons restent joués (c'est le mouvement qui est
réduit, pas l'audio).

### Fichiers son à fournir (`public/sounds/`, mp3, normalisés, **CC0 / libre de droits**)

| Fichier | Situation | Caractère & recherche |
|---|---|---|
| `item-apparition.mp3` | apparition (toutes) | doux/court (<200 ms), non fatigant. `soft pop ui`, `short whoosh`, `paper swish` |
| `rarete.mp3` | rare/lég./unique | brillant/cristallin (~300-500 ms), ressort par-dessus l'apparition. `sparkle`, `shimmer chime`, `reward twinkle` |
| `mystere.mp3` | vendeur mystère | intrigant/mystique (~500-800 ms). `mysterious sting`, `mystical chime`, `music box mysterious` |

## Composants & architecture

- **`ClientPage`** garde toute la logique (entrée, énergie, génération, achat,
  négo handlers, session, résumé) mais son **rendu** passe du grid à un carrousel.
- **Nouveau composant** `src/components/mobile/chine/ItemSwipeDeck.tsx` : reçoit
  les slides + l'état + les callbacks (`onNegocier`, `onAcheter`,
  `onOuvrirBoite`), gère `indexCourant`, le swipe, l'affordance, et remonte
  l'événement « nouvelle slide révélée » (pour les sons) via un callback
  `onRevele(slide)`. Pas de logique de jeu dedans (présentation + navigation).
- **Nouveau composant** `src/components/mobile/chine/ChineSlide.tsx` (ou inline
  dans le deck) : le rendu d'une slide (moitié haute objet/vendeur + moitié basse
  action). Remplace `ObjetCardMobile` (qui est supprimé / réduit à ce qui reste
  utile).
- **`NegociationSheet`** : `header?` rendu optionnel (déjà un `ReactNode` ;
  n'afficher le bloc que s'il est fourni).
- **`audioManager`** : +3 méthodes one-shot + préchargement.
- Réutilisés inchangés : `BoiteMystereOverlay`, `boiteMystere.ts`, `chine.ts`,
  `personaIllustrations`, `SessionSummary`, handlers d'achat/négo.

## États & sortie

- **Acquis** : la slide affiche l'état « Acquis » (réutilise `statut: "achete"`),
  bouton d'action retiré ; on peut continuer à swiper.
- **Refus poli / fâché** : comportement de négo actuel conservé.
- **Sortie** : action « Rentrer · fin de journée » conservée (dans le header ou
  un bouton fixe) → `SessionSummary` → retour QG (inchangé).

## Accessibilité / réglages

- Flèches ‹ › cliquables (pas seulement le swipe) + navigation clavier.
- `prefers-reduced-motion` respecté (glissement instantané).
- Sons gated par le réglage SFX existant ; volume via le master `audioManager`.

## Hors scope (YAGNI)

- Geste « swipe pour passer/refuser » (Tinder) — on reste en carrousel libre.
- Vue grille / toggle / mini-aperçu — pur swipe assumé.
- Différencier le son par rareté (un seul `rarete.mp3` partagé).
- Différencier le son du vendeur selon l'archétype.
- Animation d'entrée « montée depuis le bas » de la première grille (remplacée
  par le carrousel).

## Curseurs réglables

Durée de transition, vitesse/seuil de swipe, présence et style du repère de
position, volumes relatifs des 3 sons. Isolés dans `ItemSwipeDeck` /
`audioManager` pour itérer.

## Assets à fournir (utilisateur)

`public/sounds/item-apparition.mp3`, `public/sounds/rarete.mp3`,
`public/sounds/mystere.mp3` (CC0 / libre de droits). En attendant, l'implémentation
peut fonctionner avec des placeholders silencieux ou des sons synthétisés
temporaires (comme `playClick`), à remplacer par les fichiers finaux.
