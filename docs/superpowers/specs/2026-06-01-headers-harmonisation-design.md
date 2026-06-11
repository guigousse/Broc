# Harmonisation des en-têtes — Stockage / Atelier / Collection / Compétences

**Date :** 2026-06-01
**Branche :** `feat/atelier-ui-v2` (continuité)
**Statut :** spec validée

## Contexte

L'Atelier (v2) a introduit un en-tête sticky en grille 3 colonnes : compteur à gauche, titre au centre, bouton d'amélioration à droite. Les autres pages (Stockage, Collection, Compétences) ont chacune leur propre en-tête, hérité de Phase 7. Cette harmonisation aligne les 4 pages sur le même squelette pour un repère visuel constant.

## Composants partagés

### `PageHeaderBar` (`src/components/mobile/PageHeaderBar.tsx`)

Squelette commun en grille 3 colonnes :

```tsx
interface PageHeaderBarProps {
  title: string;        // ex: "Atelier"
  left?: ReactNode;
  right?: ReactNode;
}
```

- Grid `1fr auto 1fr`, gap 10, alignItems center.
- **Titre** centré, display 14 px, letter-spacing 0.22em, brass-700, format `— {TITLE} —` (majuscules, encadré tirets).
- **Left** : aligné à gauche, contenu libre (typiquement display 12 px forest-800).
- **Right** : aligné à droite, contenu libre (bouton, badge, ou span).
- Les zones `left` et `right` ont `min-width: 0` pour gérer le truncate sans casser le centre.

### `UpgradeButton` (`src/components/mobile/UpgradeButton.tsx`)

Bouton vertical réutilisé par Atelier et Stockage.

```tsx
interface UpgradeButtonProps {
  niveauCible: number;
  cout: number;
  peut: boolean;
  onUpgrade: () => void;
  ariaLabel?: string;
}
```

Rendu : flex column, padding 4×10, border laiton, background forest-800 si `peut` sinon paper-200 :
- Ligne 1 : `↑ LVL{niveauCible}` (font-display 9.5, letter-spacing 0.12em, `<ArrowUp size=11 />` + texte)
- Ligne 2 : `{cout} €` (font-mono 10)

Quand le niveau maximum est atteint, le caller passe un `<span>MAX</span>` à la place du bouton via la prop `right` du `PageHeaderBar`.

## Application par page

### Atelier (`/atelier`)
- **left** : `Établi {enCours}/{capacite}` (existant, refactor).
- **right** : `<UpgradeButton>` (existant, extrait du JSX inline).
- **title** : `Atelier`.
- Aucun changement visuel — refactor pour utiliser les composants partagés.

### Stockage (`/stockage`)
- **left** : 2 lignes :
  - Ligne 1 (display 12 forest-800) : `{tierNom} {nbStock}/{capacite}` — ex `Garage 8/10`.
  - Ligne 2 (font-mono 9 ink-500) : `loyer {loyerHebdo} €/sem` (info conservée car invisible ailleurs).
- **right** : `<UpgradeButton>` ou `<span>MAX</span>`.
- **title** : `Stockage`.
- Suppression du gros bandeau body "Stockage LVL X · {capacite} obj · loyer · bouton". Le `CategoriePicker` reste, mais juste en dessous de l'en-tête sticky (déplacé hors du sticky pour éviter de surcharger ; ou conservé dans le sticky si la hauteur cumulée reste raisonnable — voir Risques).

### Collection (`/collection`)
- **left** : 1 ligne `{label} {valeur} €` :
  - `label` = `Total` si pas de filtre, sinon nom complet de la catégorie (truncate via `ellipsis` si dépasse).
  - `valeur` = somme des `donation.valeur` des slots concernés (global ou filtré).
- **right** : 1 ligne `{posseded}/{total}` :
  - `posseded` = nombre de slots avec `donation !== null` (global ou filtré).
  - `total` = nombre de slots (global ou filtré).
- **title** : `Collection`.
- Le `CategoriePicker` existant reste sous l'en-tête sticky.

### Compétences (`/competences`)
- **left** : `undefined`.
- **right** : `undefined`.
- **title** : `Compétences`.
- Le contenu actuel sous le sticky est conservé tel quel.

## Fichiers touchés

- **Créer** : `src/components/mobile/PageHeaderBar.tsx`, `src/components/mobile/UpgradeButton.tsx`.
- **Modifier** : `src/app/atelier/page.tsx`, `src/app/stockage/page.tsx`, `src/app/collection/page.tsx`, `src/app/competences/page.tsx`.

## Comportement détaillé du label catégorie (Collection)

- Sans filtre : `Total`.
- Avec filtre : nom complet de la catégorie. Si la chaîne dépasse, ellipsis via `text-overflow: ellipsis` + `white-space: nowrap` + `overflow: hidden`.
- Le `min-width: 0` sur la colonne gauche garantit que la troncature s'applique, le centre reste centré sur le titre.

## Tests à prévoir (manuels)

1. Atelier : aucune régression visuelle. Bouton upgrade fonctionne, MAX au LVL 3.
2. Stockage : tier name + capacity à gauche, loyer en sous-ligne, bouton upgrade à droite. Suppression du bandeau body, le `CategoriePicker` reste accessible.
3. Collection : `Total {sumValeurs} €` au démarrage. Filtre Musique → `Musique {sumMusique} €` à gauche, `{nMusique possédés}/{nMusique total}` à droite. Catégorie longue (`Livres & Papeterie`) → tronquée avec ellipsis sans rogner le titre.
4. Compétences : titre centré seul, pas de left/right.
5. Viewport 360 px : titre lisible, pas de chevauchement, pas de scrollX involontaire.

## Hors-scope

- Pas d'ajout de pieces bar sur autres pages (atelier-spécifique).
- Pas de refonte des grilles/sections en dessous.
- Pas de modification de `MobileHeader` (bandeau BROC/Jour/Caisse).
- Pas de modification du QG (page d'accueil avec layout différent).

## Risques

- **Hauteur sticky Stockage** : 2 lignes à gauche + CategoriePicker pourrait pousser la zone sticky trop haute. Si > 110 px, sortir le `CategoriePicker` hors du sticky.
- **Truncate Collection** : à 360 px de viewport, le titre central `— COLLECTION —` (~95 px à letter-spacing 0.22em) + paddings + right ≈ 200 px. Reste ~80 px pour la gauche. `Livres & Papeterie 1402€` dépassera et sera tronqué — c'est le comportement attendu.
