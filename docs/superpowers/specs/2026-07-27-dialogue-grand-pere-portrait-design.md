# Dialogues du grand-père : bulle pleine largeur, portrait détouré au-dessus

Date : 2026-07-27
Branche : à créer depuis `main` (voir « Intégration »)

## Problème

`DialogueOverlay` affiche le grand-père en **cercle de 84 px** posé à gauche d'une bulle qui prend le reste de la rangée. Deux conséquences :

1. Les portraits sont des illustrations **détourées** (alpha, cadrage buste). Le `border-radius: 50%` + `object-fit: cover` les rogne en médaillon : le détourage, qui est tout l'intérêt de l'asset, ne sert à rien.
2. La bulle perd ~94 px de largeur (84 de portrait + 10 de gouttière) sur un overlay qui occupe pourtant tout l'écran.

Les modes chinage et vente montrent déjà leurs personnages de la bonne façon — grands, détourés, nus, débordant au-dessus du panneau (`ChineNegoDrawer`). Le grand-père, qui porte toute la trame narrative, est le seul à rester en médaillon.

## Périmètre

**Change :** la mise en page interne de `src/components/mobile/dialogue/DialogueOverlay.tsx`, et l'extraction du style de bandeau-nom aujourd'hui local à `ChineNegoDrawer`.

**Ne change pas :** l'API du composant (`sequence`, `nom`, `portraits`, `onFini`), la mécanique d'avancement au tap, le portail vers `document.body`, le `z-index` 120, le scrim, l'accessibilité (bouton unique + libellé masqué), les trois appelants (`(qg)/layout.tsx`, `chiner/[brocanteId]/ClientPage.tsx`, `vitrine/[brocanteId]/journee/ClientPage.tsx`), les données de `src/data/dialogues.ts`, les traductions.

**Hors périmètre :** régénérer les portraits, ajouter des humeurs, animer l'apparition du personnage, changer les textes.

## Décisions

| Décision | Choix | Raison |
|---|---|---|
| Ancrage du portrait | Débordant, calé à gauche, posé sur le haut de la carte | C'est le langage de `ChineNegoDrawer`, où le vendeur « sort » au-dessus du bandeau. Cohérence avec les deux autres écrans de dialogue du jeu. |
| Cadre du portrait | Aucun — image détourée nue + ombre portée | Rend au détourage sa raison d'être ; identique au traitement vendeur/acheteur. |
| Le nom | Bandeau laiton pleine largeur en tête de carte | Reprend le `namePlate` du chinage, et règle la collision entre le portrait à gauche et un label de texte au même endroit. |
| Peau de la bulle | Parchemin actuel conservé (dégradé, ombre interne, manuscrite 18 px) | Le grand-père garde sa voix visuelle, distincte des marchands. Seul le gabarit change. Les tons laiton du bandeau s'y marient déjà. |
| Queue de bulle | Aucune | Chez les vendeurs la pointe relie une bulle à un portrait *latéral*. Ici le portrait est posé **sur** le bandeau : le contact fait la liaison, une pointe ferait doublon. |
| Coins du bandeau | `overflow: hidden` sur la carte, bandeau à coins droits | Un seul rayon à maintenir (celui de la carte) au lieu de deux valeurs à garder synchronisées. |

## Architecture

```
<button scrim>                     position:fixed inset:0, z-120, flex column, justify:flex-end
  <div colonne>                    margin: 0 12px calc(16px + var(--safe-bottom, 0px))
    <img portrait/>                alignSelf:flex-start, marginLeft:8
    <div carte>                    borderRadius:14, overflow:hidden, parchemin + bordure #b89c5e
      <div namePlate>{nom}</div>   laiton pleine largeur
      <div corps>                  padding: 14px 16px 12px
        <div texte/>               manuscrite 18px
        <div chevron/>             ▼ / ✦ sur la dernière ligne
  <span srOnly>{d.menu.continuer}</span>
```

La rangée `flex` actuelle (`rangee`, portrait + carte côte à côte) devient une **colonne**. Le portrait sort du flux horizontal, la carte n'a plus besoin de `flex: 1` ni de `minWidth: 0` : elle occupe naturellement toute la largeur de la colonne.

### Métriques

| Élément | Valeur |
|---|---|
| Portrait | `height: clamp(140px, 20vh, 190px)`, `width: auto`, `object-fit: contain`, `display: block` |
| Ombre du portrait | `filter: drop-shadow(0 6px 10px rgba(0,0,0,0.45))` |
| Décalage gauche du portrait | `marginLeft: 8` (soit 20 px du bord d'écran, la colonne ayant déjà 12 px) |
| Marge périphérique de la carte | 12 px à gauche/droite, `calc(16px + var(--safe-bottom, 0px))` en bas |

Le `clamp` est le seul réglage à bouger si le rendu device demande un personnage plus petit ou plus grand.

### Extraction du bandeau-nom

Le style existe en `const namePlate` locale dans `ChineNegoDrawer.tsx` (dégradé laiton 3 arrêts, double ombre `inset`, `--font-display` capitales `letter-spacing: .18em`, couleur `--forest-800`). Il part dans un module partagé :

`src/components/ui/namePlate.ts` — le répertoire existe déjà et rassemble les briques visuelles partagées (`BrassCorners`, `Panel`, `DecoDivider`…) ; `src/components/mobile/ui/` n'existe pas.

```ts
export function namePlateStyle(radius: string): CSSProperties
```

Deux appelants : `ChineNegoDrawer` passe `"12px 12px 0 0"` (rendu inchangé, à vérifier à l'œil), `DialogueOverlay` passe `"0"` — la carte le rogne.

Motif : c'est précisément l'unité visuelle que cette refonte cherche à créer. Dix-huit lignes de style dupliquées divergeraient à la première retouche, et la promesse « même bandeau que le chinage » ne tiendrait plus.

## Tests

La mise en page relève de la recette device : une position `flex` et un `clamp` ne s'assertent pas utilement en jsdom.

En revanche la refonte met à nu un comportement **aujourd'hui non couvert** — le portrait change avec l'humeur de la ligne courante. Deux tests s'ajoutent à `src/components/mobile/dialogue/DialogueOverlay.test.tsx` :

1. **Le portrait suit l'humeur.** Sur `SEQUENCES_TUTORIEL.tuto_achat_fait` (ligne 1 `rieur`, ligne 2 `souriant`), vérifier que le `src` de l'image vaut `GRAND_PERE_PORTRAITS.rieur`, puis `GRAND_PERE_PORTRAITS.souriant` après un tap.
2. **Le nom est rendu.** `screen.getByText("Grand-père")` dans la carte.

Les trois tests existants passent sans modification : ni l'accname du bouton, ni la mécanique de tap, ni le rendu `null` sur `sequence` nulle ne bougent.

Filet complet avant de conclure : `npx vitest run` + `npx eslint src` (`npm run lint` est cassé sous Next 16).

## Risques

**Le liseré de détourage — risque principal.** Le cercle `object-fit: cover` masque aujourd'hui les bords des portraits. Détourés sur le scrim sombre, tout résidu de matte clair autour du personnage devient visible. Les quatre fichiers portent bien `hasAlpha: yes`, mais un alpha présent peut être propre *ou* border un halo — cela ne se voit qu'au rendu. **Point n°1 de la recette device.** Si un liseré apparaît, le correctif est une repasse des quatre `.webp`, pas du CSS.

**Portraits carrés.** `/personas/grand-pere/*.webp` sont en 420×420 (les vendeurs sont en 263×332). À 190 px de haut, le portrait fait 190 px de large — plus massif que ce que le ratio vendeur laisse attendre. Se règle par le `clamp`.

**Écrans courts.** Portrait + bulle de quatre lignes + `safe-bottom` remontent haut, la colonne étant ancrée en bas. La borne haute du `clamp` (190 px) sert de garde-fou. À vérifier sur la plus longue réplique du tutoriel (`tuto_accueil`, ligne 2).

Aucune donnée sauvegardée n'est touchée : pas de migration.

## Intégration

Brancher depuis `main`. Vérifié : `fix/pre-appstore` y est déjà fusionnée (`d03f4b9`), et `DialogueOverlay.tsx` comme `ChineNegoDrawer.tsx` sont identiques entre `main` et la branche courante — rien à récupérer ailleurs. Le travail ne dépend pas de `feat/pipeline-reels`, qui porte des modifications en cours sans rapport.

Trois écrans appellent `DialogueOverlay` — la recette device doit passer par les trois : le tutoriel au QG, le tutoriel en chinage, le tutoriel en vitrine.
