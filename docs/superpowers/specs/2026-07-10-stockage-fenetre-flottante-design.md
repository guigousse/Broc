# Stockage en fenêtre flottante sur le bureau flouté

**Date** : 2026-07-10
**Statut** : validé par Guillaume (approche A)

## Objectif

L'écran Stockage ne remplace plus le panorama : il s'ouvre en **fenêtre
flottante** par-dessus le panorama du bureau, dont le fond est **flouté**
(même habillage que le menu Réglages de l'écran d'accueil). L'overlay est
divisé en **deux blocs séparés** :

- la **bande supérieure** (titre + capacité/loyer + bouton amélioration +
  rangée de catégories) apparaît depuis le haut — elle sort de sous le
  header et glisse vers le bas ;
- le **panneau d'items** (grille d'inventaire) apparaît depuis le bas — il
  sort de la TabBar et monte vers le haut.

Entre les deux blocs, un interstice laisse voir le fond flouté (lecture
« fenêtres flottantes », chaque bloc avec l'habillage carte vert/laiton des
modales du menu principal).

## Décisions validées

- **Navigation** : la route `/stockage` est conservée (TabBar, SwipePager,
  retour arrière inchangés). Un layout partagé rend le panorama du bureau
  derrière `/bureau` ET `/stockage`.
- **Réutilisation** : le châssis d'overlay est un composant générique —
  l'Atelier et la Collection migreront dessus dans de futurs chantiers.
- **Contenu bande haute** : titre + tier/capacité/loyer + bouton
  d'amélioration (l'actuel `PageHeaderBar`) + `CategoriePicker` en dessous.
  Le panneau bas ne contient que la grille.
- **Silhouette** : deux blocs séparés, interstice flouté visible.

## 1. Architecture routes

- Nouveau groupe `src/app/(qg)/` :
  - `(qg)/layout.tsx` : reprend le contenu actuel de `src/app/bureau/page.tsx`
    (panorama + objets QG + sheets + gramophone + verrou scroll + mode
    édition) et rend `{children}` PAR-DESSUS le panorama (dans le même arbre,
    après le conteneur panorama). Le composant reste monté en traversant
    `/bureau` ↔ `/stockage` : l'état (zone de scroll, session gramophone,
    sheets) survit à la transition.
  - `(qg)/bureau/page.tsx` : marqueur vide (`return null`).
  - `(qg)/stockage/page.tsx` : la page overlay (cf. §3).
  - `src/app/bureau/page.tsx` et `src/app/stockage/page.tsx` actuels sont
    déplacés/supprimés en conséquence. URLs inchangées.
- Sur `/stockage`, le panorama derrière est **inerte** : l'overlay plein
  écran intercepte tous les pointeurs (pas besoin de désactiver les hotspots
  un par un), et le **swipe du panorama est gelé** (l'overlay couvre la zone
  de scroll ; aucun `touch-action: pan-x` ne doit fuir).
- Les sheets du bureau (porte, courrier, gazette…) ne peuvent pas être
  ouvertes pendant que l'overlay est monté (pointeurs bloqués) ; une sheet
  déjà ouverte au moment de la navigation reste au-dessus de son z-index
  habituel — cas marginal accepté.
- `SwipePager` : `/bureau` et `/stockage` partagent à nouveau une `pageKey`
  commune (réintroduction ciblée du mécanisme `PANORAMA_GROUP`, avec
  commentaire expliquant que le layout `(qg)` partagé ne doit pas être
  re-monté entre ces deux routes). Le swipe cyclique entre onglets reste
  fonctionnel depuis l'overlay (le geste sur le panneau d'items suit les
  règles existantes : ignoré si un scrollable horizontal peut encore
  scroller, etc.).
- La virtualisation par zone du panorama (`showQgZone`) et ses effets audio
  continuent de tourner derrière l'overlay — pas de gel du rendu, seulement
  des interactions.

## 2. Composant `FloatingRoomOverlay`

`src/components/mobile/floating-room/FloatingRoomOverlay.tsx` :

- **Emprise** : plein écran entre header et TabBar — `position: fixed`,
  `top: calc(var(--safe-top) + var(--mobile-header-h))`,
  `bottom: calc(var(--mobile-tabbar-h) + var(--safe-bottom))`, left/right 0.
  Le header (budget) et la TabBar restent visibles et actifs.
- **Backdrop** : `rgba(15,31,24,0.35)` + `backdropFilter: blur(14px)` (+
  préfixe WebKit) — pattern exact de `ReglagesModal`. Le backdrop couvre
  toute l'emprise et bloque les pointeurs vers le panorama.
- **API** :
  ```tsx
  interface FloatingRoomOverlayProps {
    /** Carte haute (titre, actions, filtres). Glisse depuis le haut. */
    bande: ReactNode;
    /** Panneau bas (contenu scrollable). Monte depuis le bas. */
    children: ReactNode;
  }
  ```
- **Silhouette** : `bande` = carte en haut de l'emprise (marges latérales,
  voir note habillage ci-dessous).
  `children` = carte panneau qui occupe le reste de la hauteur jusqu'en bas
  de l'emprise, avec interstice (~10-14 px) entre les deux blocs.
  Le panneau est le conteneur scrollable (overflow-y auto) ; la bande reste
  fixe.
- **Note habillage** : chaque bloc reprend l'habillage carte des modales du
  menu (`border: 1px solid var(--brass-500)`, double liseré inset, ombre
  portée, `borderRadius: var(--radius-card)`). Le fond des blocs reste celui
  des surfaces actuelles du stockage (papier clair) pour ne pas changer la
  lisibilité de la grille — seul le cadre « carte flottante » est ajouté.
- **Animations d'entrée uniquement** (pas d'animation de sortie — la
  navigation démonte immédiatement, YAGNI) :
  - bande : `translateY(-110%) → 0`, ~320 ms ease-out ;
  - panneau : `translateY(110%) → 0`, ~320 ms ease-out ;
  - keyframes CSS globales (globals.css) préfixées `broc-float-` ; les blocs
    sont clippés par l'emprise (`overflow: hidden` sur le conteneur) pour
    que la bande semble sortir de sous le header et le panneau de la TabBar.
- Le composant ne gère PAS de bouton fermer : on quitte par la TabBar ou le
  swipe, comme aujourd'hui.

## 3. Page stockage re-housée

`(qg)/stockage/page.tsx` reprend l'intégralité de la logique actuelle de
`src/app/stockage/page.tsx` avec ce re-housing :

- Plus de `MobileLayout`/`MobileHeader`/`StickyTop` : le chrome (header
  budget, TabBar) est déjà fourni par le layout `(qg)` (le header vit dans
  le layout partagé).
- `bande` = `PageHeaderBar` actuel (titre `d.chrome.onglets.stockage`,
  gauche tier/capacité/loyer, droite `UpgradeButton`/MAX) +
  `CategoriePicker` en dessous.
- `children` (panneau) = `InventoryGrid` + état vide éventuel.
- Conservés tels quels : deep-link `?cat=` (Suspense + useSearchParams),
  `ObjetDetailOverlay`, `ConfirmReplaceModal`, flash, redirect `/` si pas
  d'état (déjà géré par le layout partagé — ne pas dupliquer).

## 4. Audio

- `/stockage` devient « dans la pièce » : `GlobalVinylAmbiance` traite
  `/stockage` comme le panorama (self-driven, plus de préréglage étouffé
  0.28/800 Hz) — l'ambiance du bureau (cheminée, gramophone modulés par la
  zone) continue telle quelle derrière l'overlay.
- `/atelier` garde son préréglage « pièce voisine » actuel jusqu'à sa propre
  migration.

## 5. Hors périmètre

- Migration Atelier et Collection sur le châssis (chantiers futurs).
- Animation de sortie de l'overlay.
- Tout changement fonctionnel du stockage (filtres, grille, détail objet).

## 6. Tests & vérification

- Tests unitaires si logique extractible (ex. mapping pathname → pageKey du
  SwipePager) ; le châssis étant purement présentationnel, la vérification
  est surtout visuelle.
- Gates : `npx tsc --noEmit`, `npx eslint src`, `npm run lint:hooks`,
  `npm run test:run`, `npx next build` (routes inchangées attendues).
- Vérification visuelle sur le dev server (hot-reload actif) puis passe
  simulateur/device par Guillaume : animations bande/panneau, flou du
  panorama derrière, TabBar active sur Stockage, swipe d'onglets depuis
  l'overlay, gramophone non interrompu, transition /bureau ↔ /stockage sans
  remontage du panorama.
