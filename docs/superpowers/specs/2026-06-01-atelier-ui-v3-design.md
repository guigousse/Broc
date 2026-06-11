# Atelier UI v3 — Sous-onglets, animations et sons (design)

**Date :** 2026-06-01
**Branche :** `feat/atelier-ui-v2` (continuité)
**Statut :** spec validée, prêt pour le plan d'implémentation

## Contexte

La v2 a posé un atelier mobile-first avec lignes objet façon Stockage. Cette v3 :
- sépare Restaurations et Démantèlement en sous-onglets pour clarifier les flux,
- filtre la liste Restauration aux objets effectivement réalisables (pièces suffisantes),
- introduit des confirmations + animations pour donner du poids aux actions,
- ajoute deux sons pour l'immersion.

## Changements

### 1. Structure de la page Atelier

```
Header (établi · ATELIER · upgrade)
PiecesInventoryBar
— TRAVAUX EN COURS —
[carte travaux]
[ RESTAURATIONS ] [ DÉMANTÈLEMENT ]    ← sous-onglets
[carte filtrée — bordure rouge si Démantèlement actif]
```

- **Sous-onglets** : 2 boutons côte à côte (grid 1fr 1fr, gap 4), font display 11px uppercase, padding 8×12.
  - Actif : fond `var(--forest-800)`, couleur `var(--brass-300)`.
  - Inactif : fond `var(--paper-100)`, couleur `var(--ink-500)`.
  - Pas de pastille/compteur (onglets simples).
- **Onglet par défaut** au chargement : **Restaurations**.
- **Bordure rouge** : si l'onglet actif est Démantèlement, la carte d'objets passe `border-color: var(--vermillion-600)` (en plus du highlight d'onglet). Les sous-onglets eux-mêmes restent sobres.

### 2. Filtre Restaurations

Liste filtrée pour ne montrer que les objets restaurables ET avec pièces suffisantes :

```ts
restaurables = inventaire.filter(o =>
  !o.enRestauration &&
  peutRestaurerTransition(state, o.categorie, o.etat) &&
  pieces[o.categorie] >= coutAmelioration(o, prochaineEtatCible(o.etat))
)
```

**Empty state** : *« Aucune pièce à restaurer. »*

### 3. Confirmation Restauration

Avant de lancer une restauration, ouvrir un `BottomSheet` (même pattern que démantèlement actuel) :

- Titre : `Restauration`
- Corps :
  > Restaurer **{nom}** en **{cible}** prend **7 jours** et coûte **N ⚙ {catégorie}**.
- Boutons : `Annuler` (paper-200 / ink-700) | `Confirmer` (forest-800 / brass-300)

Sur `Confirmer`, lancer animation + son + appeler `restaurerObjet`.

### 4. Animations

#### 4a. Restauration confirmée — vol vers "Travaux en cours"

1. Au tap sur `Confirmer`, capture le `getBoundingClientRect()` du thumbnail de la ligne.
2. Lance `flyToTab` (réutilisé) avec :
   - `imageUrl` = url de l'image de l'objet
   - `fallbackBg` = couleur rareté
   - `borderColor` = couleur rareté outer
   - `targetSelector = '[data-fly-target="travaux"]'`
   - `playSound: false` (pas de `playPickup` ici, on a déjà `repair.mp3`)
3. Le titre `— Travaux en cours —` porte un attribut `data-fly-target="travaux"` (cible visuelle).
4. Le son `repair.mp3` est joué AU MOMENT du lancement de l'animation.
5. Après la durée d'animation (~620ms), l'appel réel à `restaurerObjet` est exécuté (l'objet apparaît dans Travaux). La BottomSheet se ferme avant l'animation.

#### 4b. Démantèlement confirmé — vol vers l'engrenage de la catégorie

1. Au tap sur `Confirmer`, capture le rect du thumbnail.
2. Joue immédiatement `break.mp3`.
3. Capture l'élément `PieceIcon` correspondant dans `PiecesInventoryBar` via `data-fly-target="piece-{categorie}"` (à ajouter sur chaque cellule).
4. Crée un clone DOM du `PieceIcon` (engrenage laiton + icône catégorie) à la position du thumbnail.
5. Anime ce clone (transition CSS 620ms) vers la position de la cible.
6. Pendant le vol, l'`AtelierItemRow` s'opacifie de 1 → 0 sur 250ms (effet destruction).
7. À l'arrivée : pulsation `broc-pulse-once` sur la cellule de l'engrenage. **Un badge `+N` flottant** apparaît brièvement (200ms fade-in puis 500ms hold puis 300ms fade-out) à côté du compteur. `playPickup()` joué.
8. L'appel réel à `demantelerObjet` est exécuté **à la fin** de l'animation (à ~620ms), pour que la pièce arrive en même temps que le compteur s'incrémente.

### 5. Sons

Ajout au `audioManager` :

```ts
async playRepair(): Promise<void> {
  if (!this.prefs.clic) return;
  // pattern identique à playCash() avec '/sounds/repair.mp3'
}

async playBreak(): Promise<void> {
  if (!this.prefs.clic) return;
  // pattern identique à playCash() avec '/sounds/break.mp3'
}
```

Les MP3 fournis par l'utilisateur sont copiés vers `public/sounds/` :
- `freesound_community-repair_metal-85833.mp3` → `public/sounds/repair.mp3`
- `nematoki-wooden-branch-breaks-493323.mp3` → `public/sounds/break.mp3`

Gating : la préférence existante `prefs.clic` couvre ces deux sons (cohérent avec `playClick`, `playPickup`, etc. déjà gatés par `clic`).

### 6. Fichiers touchés

- `src/lib/audio/audioManager.ts` — ajout `playRepair` + `playBreak`.
- `src/components/atelier/PiecesInventoryBar.tsx` — ajout `data-fly-target="piece-{categorie}"` sur chaque cellule.
- `src/app/atelier/page.tsx` :
  - state `onglet: "restaurations" | "demantelement"` (init `"restaurations"`)
  - new state `restaurerCible: { objet: Objet; etatCible: EtatObjet; thumbRect: DOMRect } | null`
  - filtre `restaurables` enrichi (skip si pièces insuffisantes)
  - BottomSheet de confirmation pour restauration
  - handlers : capture du rect, animation, son, appel context
  - rendu : sous-onglets, branche conditionnelle de la carte, attribut `data-fly-target="travaux"` sur le titre
- `public/sounds/repair.mp3` + `public/sounds/break.mp3` (nouveaux assets).

### 7. Tests à prévoir (manuels)

- Onglet par défaut = Restaurations.
- Bascule entre onglets : la carte change, la bordure devient rouge en Démantèlement.
- Restauration filtre les objets sans pièces suffisantes (créer un cas test : avoir un objet restaurable avec compétence mais 0 pièce → doit être masqué).
- Empty state Restauration affiche "Aucune pièce à restaurer." quand la liste est vide.
- Confirmation restauration : Annuler ne change rien, Confirmer joue le son `repair.mp3` + anime + l'objet passe en Travaux.
- Confirmation démantèlement : Annuler ne change rien, Confirmer joue `break.mp3` + opacifie la ligne + pièce vole + pulse engrenage + `playPickup`.
- Volume 0 ou `clic` désactivé : aucun son joué, animations toujours visibles.
- Plusieurs démantèlements rapprochés : pas de leak DOM, clones bien nettoyés.

### 8. Hors-scope v3

- Variation sonore selon la rareté.
- Multiples pièces en cascade au démantèlement (un seul vol agrégé, cf. décision plus tôt).
- Animation au retour d'un objet restauré (fin de chantier — comportement actuel conservé).
- Réordonnancement des objets dans Travaux.
- Pastilles compteur sur les sous-onglets.

## Risques

- **Race UI** : si l'utilisateur ferme la BottomSheet juste avant la fin d'animation, le clone DOM doit toujours se nettoyer. `flyToTab` gère déjà ce cas. Pour le démantèlement custom, prévoir un `setTimeout` qui supprime le clone même si la cible disparaît.
- **`data-fly-target` collision** : préfixer avec `piece-` pour éviter conflit avec `/atelier`, `/collection`, etc.
- **Performance** : animations CSS uniquement, pas de RAF custom — devrait être fluide sur mobile.
