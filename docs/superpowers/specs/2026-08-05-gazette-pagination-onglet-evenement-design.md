# Gazette multi-pages & onglet Événement — retouches recette braderie

**Date** : 2026-08-05
**Statut** : validé par Guillaume
**Contexte** : recette locale de `feat/evenements-calendaires` (spec 2026-08-04-evenements-calendaires). Deux constats : (1) l'encart braderie fait déborder le texte de la gazette hors de l'image du journal ; (2) le cadre braderie posé sur la scène tier 1 n'est pas satisfaisant.

## A. Gazette multi-pages

### Principe

Les sections du corps du journal — encart braderie, Carnet mondain, Tendance
du marché, Météo de la semaine — deviennent des blocs **insécables** répartis
sur une ou plusieurs pages. Une section ne se coupe jamais ; on remplit la
page tant que le contenu tient dans la hauteur du papier moins une **marge
basse** ; le reste bascule page suivante.

### Mécanique

- **Mesure réelle** : au montage de la sheet (et à chaque ouverture /
  changement de contenu), un `useLayoutEffect` mesure la hauteur en pixels
  de chaque section (refs) et la hauteur disponible du papier.
- **Répartition** : fonction pure `paginerSections(hauteurs: number[],
  hauteurDisponible: number): number[][]` (indices de sections par page),
  testée unitairement. Règles : remplissage glouton dans l'ordre des
  sections ; une section plus haute qu'une page obtient sa page dédiée
  (dépassement toléré) ; jamais de page vide ; tout-tient-sur-une-page →
  `[[0..n]]`.
- **En-tête** : le bandeau du journal (titre, numéro, semaine) reste affiché
  sur TOUTES les pages ; seules les sections du corps sont paginées, et la
  hauteur disponible se mesure sous l'en-tête.
- **Navigation** : coin de page corné cliquable en bas à droite du papier
  (tourner / revenir), indicateur discret « 1/2 ». Invisibles quand il n'y
  a qu'une page. État de page local, remis à 1 à chaque ouverture.
- Pas de swipe, pas de persistance, pas d'animation de page complexe.

### Périmètre

`src/components/mobile/GazetteSheet.tsx` (+ éventuel petit module
`src/lib/gazettePagination.ts` pour la fonction pure et son test). Clés
i18n : aria-labels du coin corné (« Page suivante » / « Page précédente »)
en 4 langues. Aucun changement de données ni de save.

## B. Onglet Événement (5ᵉ plaque + scène dédiée)

### Principe

Les jours de braderie, le panorama des brocantes gagne une **5ᵉ scène**
« événement » et la barre de plaques une **5ᵉ plaque** dédiée. Le cadre de
la braderie quitte la scène tier 1 (qui retrouve ses 5 brocantes d'origine)
et s'affiche seul, en grand, au centre de la scène événement.

### Mécanique

- **Type de scène** : `SceneId = BrocanteTier | "evenement"` dans la couche
  panorama (`brocantePanoramaLayout.ts`, `BrocantePanorama.tsx`,
  `BrocanteScene.tsx`, `ScenePlaquesBar.tsx`). Le type `Brocante` et la
  save ne changent pas (la braderie reste tier 4 mécaniquement).
- **Visibilité** : la scène et la plaque n'existent que si la liste de
  brocantes reçue contient la braderie — donc uniquement les jours J (le
  filtrage `brocantesVisiblesAuJour` des pages reste la source de vérité ;
  aucune nouvelle prop).
- **Plaque** : icône `Megaphone` (lucide-react) + libellé
  `d.chine.badgeEvenement` (clé existante « Événement », 4 langues déjà en
  place). **Aura dorée pulsante** (animation CSS `@keyframes` sur
  `box-shadow`/`filter`) pour attirer l'œil — piège connu : après ajout de
  `@keyframes`, vérifier sur dev server avec stop + `rm -rf .next` si
  l'animation semble absente (cache Turbopack).
- **Cadre braderie** : retiré de `TIER_1_FRAMES`, ajouté à
  `SCENE_FRAMES["evenement"]` en grand format centré (coords initiales
  ~`left 25% / top 18% / width 50% / height 26%`, ajustées en vérification
  visuelle mesurée).
- **Fond de scène** : `public/brocantes/scenes/scene-evenement.webp`,
  généré par le pipeline existant (`scripts/generate-brocante-scenes.mjs` +
  entrée dans `scripts/brocante-scenes-prompts.json`), même style que les
  scènes tiers 1-4 mais festif : banderoles, fanions, guirlandes, foule.
- **Défilement/sélection** : la scène événement s'ajoute en fin de scroller
  (après le tier 4) ; `dernierTierVisite` continue de ne mémoriser que les
  tiers 1-4 (pas de persistance de la scène événement).

### Tests

- Pagination : cas nominal (1 page), débordement (2 pages), section géante
  (page dédiée), jamais de page vide.
- Panorama : liste AVEC braderie → 5 plaques + scène événement + cadre
  braderie absent de la scène 1 ; liste SANS → 4 plaques, aucune scène
  événement.
- i18n : nouvelles clés (aria coin corné) présentes en 4 langues.
- Suite complète `npx vitest run --maxWorkers=4`, `tsc --noEmit`, eslint.

## Hors périmètre

- Autres usages du multi-pages gazette (éditions passées, archives).
- Teaser de la plaque hors événement (option « toujours visible » écartée).
- Équilibrage braderie (inchangé).
