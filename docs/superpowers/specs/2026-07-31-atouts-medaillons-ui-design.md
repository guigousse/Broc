# Médaillons d'atouts dans le parcours et la fenêtre de level-up (design)

Date : 2026-07-31 · Statut : validé en brainstorming
Prérequis : les 6 webp `public/competences/atout.<id>.webp` livrés par
`docs/superpowers/specs/2026-07-31-atouts-medaillons-design.md` (même branche
`feat/atouts-medaillons` — ce travail s'empile dessus, même PR).

## Objet

Remplacer les emojis d'atouts par les médaillons de laiton dans les deux
surfaces de récompense de niveau :

1. **La fenêtre de level-up** (`LevelUpOverlay`) — l'emoji extrait du titre
   localisé laisse place au médaillon.
2. **Le parcours** (`ParcoursSheet`) — les lignes d'atouts de la timeline et
   la fiche détail affichent le médaillon.

Décision utilisateur : les lignes « 2ᵉ/3ᵉ usage par jour » (N35-60, N65-90)
reprennent le **même médaillon avec un badge « +1 »** superposé dans le coin
inférieur droit (chaque palier ajoute bien +1 usage/jour).

## 1. Donnée (`src/data/deblocagesNiveau.ts`)

`DeblocageNiveau` gagne deux champs optionnels :

- `activeId?: ActiveId` — présent sur les 18 entrées d'atouts (3 × 6),
  aujourd'hui l'id est perdu à la construction (seul le titre subsiste).
  L'UI en déduit `/competences/atout.${activeId}.webp` et l'emoji de secours.
- `usageSupplementaire?: boolean` — `true` sur les 12 entrées 2ᵉ/3ᵉ usage
  (déclenche le badge +1).

Aucun changement de save, aucune nouvelle chaîne i18n : les titres localisés
gardent leur emoji en donnée ; il n'est plus AFFICHÉ que là où aucun
médaillon n'existe (ligne « À venir » du level-up, prochain déblocage de la
bibliothèque — hors périmètre, inchangés).

## 2. Composant partagé (`src/components/mobile/MedaillonAtout.tsx`)

Présentationnel, sans état métier :

- Props : `activeId`, `taille` (px), `grise?: boolean`,
  `bonusUsage?: boolean` (badge +1), `emojiFallback: string`.
- Image ronde (`borderRadius: 50%`, `objectFit: cover`) cerclée de laiton
  (2 px `var(--brass-500)`, même sertissure que le dock), fond
  `var(--forest-800)`.
- `grise` : même filtre que le dock verrouillé —
  `grayscale(1) brightness(0.55)`.
- Badge +1 : pastille laiton coin bas-droit, même recette que la pastille
  d'usages du dock (`var(--brass-500)`, bord `var(--forest-800)`, fonte
  mono, texte « +1 »), taille proportionnée au médaillon.
- Fallback : `onError` → emoji (même mécanique que `SkillDock`), grisé via
  filtre le cas échéant.
- Décoratif : `aria-hidden` / `alt=""` — le titre texte adjacent porte
  toujours l'information.
- Le helper `extraireEmoji` de `LevelUpOverlay` migre vers un module
  partagé (`src/lib/emoji.ts`) pour servir les deux surfaces.

## 3. Fenêtre de level-up (`LevelUpOverlay`)

Pour les déblocages `famille: "active"` : `MedaillonAtout` ~44 px, en
couleur (c'est une célébration — jamais grisé), badge +1 si
`usageSupplementaire`, à gauche du titre (alignement existant conservé,
`alignItems` ajusté au besoin pour centrer le médaillon sur la ligne de
titre). Le titre reste débarrassé de son emoji (`extraireEmoji`). La ligne
« À venir » (prochain palier) reste texte + emoji, inchangée.

## 4. Parcours (`ParcoursSheet`)

- **Timeline** : chaque ligne d'atout s'ouvre sur un `MedaillonAtout`
  ~32 px avant le titre (bouton en flex, médaillon non rétrécissable,
  titre à gauche). Couleur si niveau `atteint` ou `prochain` (l'opacité
  0.55 existante du bloc estompe déjà l'atteint), `grise` si `a-venir`.
  Badge +1 sur les lignes d'usage. L'emoji disparaît du titre affiché.
- **Fiche détail** : `MedaillonAtout` ~96 px centré au-dessus du titre,
  `grise` si la fiche est ouverte depuis une ligne `a-venir`, badge +1
  compris. Titre de la fiche sans emoji. Les fiches non-atout sont
  inchangées.

## Tests

- `deblocagesNiveau` : les 18 entrées d'atouts portent `activeId`, les 12
  d'usage portent `usageSupplementaire` (test de table).
- `MedaillonAtout` : rend l'image au bon chemin, badge +1 conditionnel,
  filtre grisé conditionnel, fallback emoji sur `onError`.
- `LevelUpOverlay` : le déblocage d'atout rend le médaillon (src attendu)
  et plus d'emoji dans l'en-tête ; un palier d'usage rend le badge +1.
- `ParcoursSheet` : ligne d'atout → médaillon (grisé si à-venir) ; fiche
  d'atout → grand médaillon ; ligne non-atout inchangée.

## Critères de réussite

- Plus aucun emoji d'atout affiché dans la timeline du parcours, la fiche
  d'atout et l'en-tête de récompense du level-up (l'emoji ne subsiste que
  comme fallback `onError` et dans les lignes texte sans médaillon).
- Les 3 occurrences d'un même atout dans le parcours montrent le même
  médaillon, les 2ᵉ/3ᵉ avec badge +1.
- États : grisé uniquement dans le parcours pour `a-venir` ; jamais dans le
  level-up.
- Suite vitest verte (`--maxWorkers=4`).

## Hors périmètre

- Bibliothèque (`prochain` déblocage texte) et ligne « À venir » du
  level-up : gardent le titre avec emoji.
- Le dock (`SkillDock`) : déjà servi par les webp, inchangé.
- Toute retouche des webp eux-mêmes.
