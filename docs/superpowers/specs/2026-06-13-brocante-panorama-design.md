# Brocante Panorama — Design

## Contexte

Les pages `/chiner` et `/vitrine` utilisent aujourd'hui :
- des pills tier (★ / ★★ / ★★★ / Boss) en haut, dans `StickyTop`,
- un `BrocanteCarousel` qui montre une brocante à la fois (flèches + dots).

L'expérience est fonctionnelle mais peu immersive : on ne ressent pas la progression de prestige entre les tiers, et chaque brocante est consultée isolée des autres.

## Objectif

Remplacer cette UI par un **panorama de 4 scènes** (1 scène par tier), avec :
- une progression visuelle du prestige (scène 1 modeste → scène 4 fastueuse),
- les illustrations de toutes les brocantes d'un tier accrochées dans des cadres sur la scène,
- une plaquette gravée par scène indiquant le rang d'étoiles,
- une sélection au clic qui surligne le cadre et affiche le détail de la brocante en bas,
- une navigation par swipe horizontal natif avec snap, traitée comme un panorama continu.

Comportement à conserver : mêmes règles de déblocage, mêmes frais d'entrée, mêmes routes `/chiner/[id]` et `/vitrine/[id]`.

## Architecture

```
/chiner/page.tsx (et /vitrine/page.tsx)
└── MobileLayout
    ├── ContextualHeader (inchangé)
    └── BrocantePanorama (NOUVEAU)
        ├── BrocanteScene × 4         (1 par tier)
        │   ├── <fond-tier-N.webp>
        │   ├── BrocanteFrame × N     (cadres positionnés en vw/vh)
        │   └── ScenePlaque           (plaquette laiton avec étoiles)
        └── BrocanteDetailPanel       (sticky bas, écoute la sélection)
```

Plus de pills, plus d'état tier dans la page : le tier visible est implicite — c'est la scène qui a le snap. La page passe les **17 brocantes** au panorama qui les regroupe par tier en interne.

## Composants

### `BrocantePanorama`

Conteneur scroll horizontal :
- `overflow-x: auto`, `scroll-snap-type: x mandatory`, `scroll-behavior: smooth`,
- largeur enfants = `400vw` total, chaque scène = `100vw`, snap par scène,
- gère l'état `selectedBrocanteId: string | null`,
- gère la position initiale (scroll sur le tier le plus haut débloqué par défaut).

Props :
```ts
{
  brocantes: Brocante[];        // 17 brocantes
  state: GameState;
  debloqueesIds: Set<string>;
  decrireConditions: (b: Brocante) => string;
  destination: "chiner" | "vitrine";
}
```

### `BrocanteScene`

Une scène = un décor + des cadres + une plaquette.

Props :
```ts
{
  tier: 1 | 2 | 3 | 4;
  brocantes: Brocante[];         // brocantes du tier
  selectedId: string | null;
  onSelect: (id: string) => void;
  debloqueesIds: Set<string>;
}
```

Layout interne (cf. `UnifiedPanorama` pour le pattern) :
- `position: relative`, `width: 100vw`, `height: 100%`,
- `<img>` de fond plein écran (`object-fit: cover`),
- couche `objects` en `position: absolute; inset: 0` pour cadres + plaquette,
- coordonnées des cadres définies dans `brocantePanoramaLayout.ts`.

### `BrocanteFrame`

Cadre cliquable contenant l'illustration de la brocante :
- bordure laiton (cohérent charte),
- `<Image>` Next avec `getBrocanteImageUrl(id)`, grayscale si verrouillée,
- highlight si sélectionnée :
  - bordure intensifiée + `box-shadow` doré pulsant (anim CSS `@keyframes`),
  - cadres non sélectionnés : opacité 0.85,
- restent cliquables si verrouillés (pour afficher la raison en bas).

### `ScenePlaque`

Plaquette gravée centrée bas-de-scène :
- contenu : `★`, `★★`, `★★★`, ou `★★★★ — SALON DES ANTIQUAIRES`,
- typographie display, lettering laiton/forest,
- visuel "plaque vissée" (fond laiton, ombre interne, bord biseauté en CSS).

### `BrocanteDetailPanel`

Panneau bas, hauteur fixe `35vh` (le panorama occupe `65vh` au-dessus, sous le `ContextualHeader`). Pas de chevauchement : le panorama et le panel sont deux blocs flex dans `MobileLayout`, séparés par un filet laiton fin.

- état vide : message italique « Choisissez une brocante »,
- état rempli :
  - nom, étoiles (`★.repeat(tier)`),
  - description,
  - meta `taillePool` · `entrée X €`,
  - raison de verrouillage si verrouillée,
  - bouton **Entrer** (réutilise la logique de `BrocanteCarousel.enterBtn` : disabled si verrouillé ou fonds insuffisants).

### `brocantePanoramaLayout.ts`

Configuration des coordonnées :
```ts
type FrameCoord = { id: string; left: string; top: string; width: string; height: string };
export const SCENE_LAYOUTS: Record<1|2|3|4, FrameCoord[]>;
export const PLAQUE_COORDS: Record<1|2|3|4, { left: string; top: string }>;
```
Pattern existant (cf. coordonnées QG/atelier) : chaînes `vw` / `%`, ajustées au fil de l'eau.

## Scènes — direction artistique

| Tier | Ambiance | Repères visuels |
|---|---|---|
| 1 | Rue / vide-grenier de quartier | Façades modestes, tréteaux, pavé, lumière du matin |
| 2 | Marché couvert / hall vintage | Halles métalliques, lampes industrielles, tons cuivre |
| 3 | Galerie / hôtel des ventes | Parquet, moulures, dorures discrètes |
| 4 | Grand salon Drouot | Marbre, lustres, velours rouge, opulence |

Les 4 illustrations sont à produire (commande externe, hors scope spec). En attendant, **stubs CSS** : dégradés + texte « Scène tier N » pour permettre le développement et l'intégration logique.

## Transitions panorama

Pour que le swipe entre scènes paraisse continu :
- chaque image de fond conçue avec **bords latéraux compatibles** (sortie de scène = entrée de scène suivante : porte, rideau, perspective qui se prolonge),
- côté code, snap-x natif suffit — pas de croisement / dissolve à gérer si les images sont bien raccordées,
- en attendant les vrais assets, les stubs n'ont pas de raccord (acceptable pour la V1 dev).

## Sélection — règles

- État `selectedBrocanteId` au niveau `BrocantePanorama`.
- Au mount : `selectedBrocanteId = null` (le panneau affiche le prompt « Choisissez une brocante »).
- Au snap sur une nouvelle scène : si la brocante sélectionnée n'appartient pas au tier courant, on remet à `null`. Sinon on garde.
- Une seule brocante sélectionnée à la fois, tous tiers confondus.

## Verrouillage

- Image en grayscale (comportement déjà en place).
- Cliquable : la sélection s'applique normalement et le `BrocanteDetailPanel` affiche la raison + bouton **Entrer** disabled.

## Position initiale

Au montage de la page, le panorama scroll vers la **scène du tier le plus haut où le joueur a au moins une brocante débloquée**. Heuristique :
- on calcule `maxUnlockedTier = max(b.tier where debloqueesIds.has(b.id))`,
- scroll instantané vers la scène correspondante (pas d'animation au mount).

## Pages — modifications

`src/app/chiner/page.tsx` et `src/app/vitrine/page.tsx` :
- suppression de `useState<Tier>(1)` et du calcul `brocantesParTier(tier)`,
- suppression du `StickyTop` avec les 4 pills,
- passage de l'ensemble des 17 brocantes (`BROCANTES`) au nouveau composant,
- `ContextualHeader` et le sous-titre (« N brocantes ouvertes ») restent identiques.

## Données / contrats

Aucune modification de `src/data/brocantes.ts`, `src/types/game.ts`, `src/lib/deblocage.ts` ou `src/lib/brocanteImages.ts`.

## Fichiers

**Nouveaux** :
- `src/components/mobile/brocante-pano/BrocantePanorama.tsx`
- `src/components/mobile/brocante-pano/BrocanteScene.tsx`
- `src/components/mobile/brocante-pano/BrocanteFrame.tsx`
- `src/components/mobile/brocante-pano/ScenePlaque.tsx`
- `src/components/mobile/brocante-pano/BrocanteDetailPanel.tsx`
- `src/components/mobile/brocante-pano/brocantePanoramaLayout.ts`
- 4 stubs assets : référencés par chemin `/brocantes/scenes/fond-tier-{1,2,3,4}.webp` ; tant qu'absents, fallback CSS dégradé.

**Modifiés** :
- `src/app/chiner/page.tsx`
- `src/app/vitrine/page.tsx`

**Conservés provisoirement** :
- `src/components/mobile/BrocanteCarousel.tsx` (suppression différée après validation visuelle).

## Tests

- Tests unitaires composants : `BrocanteDetailPanel` (état vide / rempli / verrouillé / fonds insuffisants), `ScenePlaque` (rendu des 4 tiers).
- Tests d'intégration : `BrocantePanorama` — sélection au clic, reset au changement de scène, position initiale sur `maxUnlockedTier`.
- Pas de test sur les coordonnées (fichier de config visuelle).
- Pattern : Vitest + Testing Library (cf. `ColonnesSlider.test.tsx`).

## Non-objectifs

- Production des illustrations de scènes (commande externe).
- Suppression définitive de `BrocanteCarousel` (différée).
- Animation de transition entre scènes au-delà du snap natif.
- Modification des règles de déblocage, frais d'entrée, ou routing.
- Ré-écriture de la page `/chiner/[id]` ou `/vitrine/[id]`.
