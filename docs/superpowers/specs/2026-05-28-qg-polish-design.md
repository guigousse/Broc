# QG — Polish météo, ordre, loyer Stockage, bouton Passer

**Date :** 2026-05-28
**Branche cible :** `main` (ou branche dédiée, à décider lors du plan)
**Périmètre :** uniquement la page `/qg` et ses composants directs.

## Objectif

Le QG actuel est lisible mais passif : il liste les sous-modules sans surfacer ce qu'il faut faire aujourd'hui ni laisser au joueur la main sur le temps. On ajoute quatre améliorations ciblées :

1. Météo par jour sur la WeekTimeline, révélée par la compétence Bulletin météo.
2. Réordonner le body pour mettre les actions (État des lieux) avant l'info contextuelle (Gazette).
3. Enrichir la ligne Stockage avec le loyer hebdo.
4. Bouton "Passer" pour avancer d'un jour sans action.

## 1. WeekTimeline — météo par jour (gated)

**Composant :** `src/components/WeekTimeline.tsx`

- Nouvelle prop optionnelle `meteoSemaine?: Meteo[]`. Si `undefined`, comportement actuel (aucune météo affichée).
- Quand fournie, chaque cellule rend une seconde rangée avec `METEO_ICON[meteoSemaine[i]]` (lucide, 12 px, `strokeWidth=1.5`).
- Couleur de l'icône :
  - Aujourd'hui : `--brass-300` (sur fond `--forest-800`).
  - Week-end : `--ink-700`.
  - Autre : `--ink-500`.
- Layout : cellule devient flex-column ; lettre du jour au-dessus, icône en dessous, gap 2-3 px. Pas de changement de largeur de cellule, hauteur augmente d'environ 14 px lorsque la prop est fournie.
- Sans la prop, hauteur strictement identique à aujourd'hui (zéro régression visuelle pour les joueurs sans la compétence).

**Page QG :** `src/app/qg/page.tsx`

- Importer `aGenBulletinMeteo` (déjà importé).
- Passer `meteoSemaine={aGenBulletinMeteo(state) ? state.meteoSemaine : undefined}` à `WeekTimeline`.
- Le composant `WeekTimeline` reste agnostique du système de compétences.

## 2. Réordonner les sections du body

**Page QG :** `src/app/qg/page.tsx`

Ordre actuel (de haut en bas, dans le `<main>`) :

1. Bandeau Huissier (conditionnel)
2. GazetteTeaser
3. État des lieux (titre + `QgEtatDesLieux`)
4. Dernières sessions (titre + `QgHistorique`)

Ordre cible :

1. Bandeau Huissier (inchangé)
2. **État des lieux** (titre + `QgEtatDesLieux`)
3. **GazetteTeaser**
4. Dernières sessions (inchangé)

Aucune modification de style, juste l'ordre. Le titre `— Gazette —` n'existe pas aujourd'hui (le teaser se suffit) ; on n'en ajoute pas.

## 3. Stockage — info loyer dans la ligne État des lieux

**Composant :** `src/components/mobile/QgEtatDesLieux.tsx`

Ligne Stockage actuellement :

```
Stockage    Garage · 5 obj.    ›
```

Cible :

```
Stockage    Garage · 5/10 · loyer 10 €/sem    ›
```

Règles :

- `meta = "${stockTier.nom} · ${nb}/${stockTier.capaciteMax} · loyer ${stockTier.loyerHebdo} €/sem"`
- Si `capaciteMax === Number.POSITIVE_INFINITY` (Entrepôt) : afficher `${stockTier.nom} · ${nb} obj. · loyer ${stockTier.loyerHebdo} €/sem` (pas de `/∞`).
- Le champ `loyerHebdo` est déjà disponible via `getStockageTier(...)`.

Aucune autre ligne (Atelier, Compétences, Collection) n'est modifiée.

## 4. Bouton "Passer" dans le StickyTop

**Page QG :** `src/app/qg/page.tsx`

- La grille du bloc d'actions passe de `gridTemplateColumns: "1.4fr 1fr"` à `"1.2fr 1fr 0.8fr"`.
- Troisième bouton "PASSER" :
  - Style "ghost" pour s'effacer derrière Chiner/Exposer :
    - `background: var(--paper-200)`
    - `color: var(--ink-700)`
    - `border: 1px solid var(--brass-500)`
    - `boxShadow: inset 0 0 0 2px var(--paper-200), inset 0 0 0 3px var(--brass-500)`
    - typographie identique aux deux autres (font-display, 12 px, letterSpacing 0.16em, uppercase)
  - `onClick={() => avancerJour(1)}` (récupéré depuis `useGame()`).
  - Toujours actif (pas de disabled, y compris quand `state.vitrine` est ouverte).
  - Pas de confirmation modale.

**Effets de bord (déjà gérés par `avancerJour` dans `GameContext`) :**

- Restaurations dont `jourFin <= nouveauJour` sont finalisées.
- Si refresh hebdo atteint : nouvelles tendances, loyer Stockage prélevé, huissier déclenché si solde négatif.
- Le bandeau Huissier apparaîtra naturellement au prochain rendu si une saisie a eu lieu.

## Hors-scope (décidé)

- Tooltip / libellé long sur l'icône météo.
- Marqueurs additionnels sur la timeline (célébrité, jour loyer, restauration prête).
- Confirmation modale sur "Passer".
- Animation lors du changement de jour.
- Toute modification des autres lignes de l'État des lieux (Atelier, Compétences, Collection).

## Fichiers touchés

- `src/components/WeekTimeline.tsx` — nouvelle prop `meteoSemaine?: Meteo[]`, rendu seconde rangée d'icônes.
- `src/components/mobile/QgEtatDesLieux.tsx` — meta de la ligne Stockage.
- `src/app/qg/page.tsx` — ordre des sections, ajout bouton Passer (grille 3 col), passage prop météo conditionnelle.

## Critères d'acceptation

- [ ] Sans la compétence Bulletin météo, le QG est strictement identique sur la timeline (hauteur cellules, contenu).
- [ ] Avec la compétence, les 7 cellules affichent leur icône météo de la semaine, dans la bonne couleur selon état.
- [ ] La section État des lieux apparaît au-dessus de la Gazette dans le body.
- [ ] La ligne Stockage affiche capacité (sauf Entrepôt) et loyer hebdo.
- [ ] Le bouton "Passer" est visible à droite de Chiner/Exposer, avance d'un jour et déclenche les effets normaux (resto finie, refresh, loyer, huissier).
- [ ] `npx tsc --noEmit` reste à 0 erreur.
- [ ] `npm run build` réussit.
