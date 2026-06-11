# Atelier UI v2 — Refonte interface (design)

**Date :** 2026-06-01
**Branche cible :** à créer depuis `main` (post-merge de la v1 atelier pièces)
**Statut :** spec validée, en attente du plan d'implémentation

## Contexte

La v1 du système de pièces d'amélioration (mergée le 2026-06-01) a posé l'économie. Cette spec retouche l'interface de la page Atelier pour densifier le header, retirer une redondance, harmoniser l'affichage des objets avec la page Stockage et remplacer le rendu des engrenages.

## Changements

### 1. En-tête (StickyTop) — bandeau 3 colonnes

```
[ÉTABLI N/M]     — ATELIER —     [↑ LVL2 / 500 €]
```

- **Gauche — Établi N/M** : `N` = chantiers en cours, `M` = capacité atelier (`ATELIER_SLOTS[niveauAtelier]`). Typo display ~13px forêt-800. Pas d'indicateur "prêt" inline (déjà signalé via la pastille de la TabBar).
- **Centre — `— ATELIER —`** : titre display ~14-15px brass-700, letter-spacing élargi. Pièce maîtresse visuelle.
- **Droite — Bouton upgrade vertical** : deux lignes, alignées à droite :
  - Ligne 1 : `↑ LVL2` (flèche `ArrowUp` lucide + label cible) — display 10px brass-300 sur fond forêt-800.
  - Ligne 2 : `500 €` — font-mono 10px brass-300.
  - Désactivé (paper-200 / ink-500) si budget insuffisant ; remplacé par `MAX` si niveau 3 atteint.

### 2. Bandeau pièces (PiecesInventoryBar)

- **Cercle** remplacé par **`<Cog />` lucide** ~38-40px en arrière-plan :
  - `color` (stroke) : `var(--brass-700)`.
  - `strokeWidth` 1.5.
  - Fond circulaire interne `var(--paper-100)` (CSS background-color sur le wrapper).
  - **Drop-shadow** : `filter: drop-shadow(0 1px 1px rgba(40,25,5,0.25))` pour la profondeur.
  - **Brillance** : un léger highlight via `linear-gradient` n'est pas applicable sur un SVG stroke ; on simule l'effet de profondeur avec le drop-shadow + la couleur de stroke laiton chaud.
- **Icône catégorie** : `<CategorieIcon size={18} strokeWidth={1.6} color="var(--forest-800)" />` centrée par-dessus la roue (position absolute, top/left 50% transform translate -50%).
- **Compteur** : inchangé (font-mono 10px sous l'engrenage).

### 3. Suppression du bandeau redondant "Atelier LVL X"

Le grand cadre laiton `Atelier LVL N · M slot(s) · [→ LVL N+1 · cout €]` est **entièrement supprimé** de la page. Toute son information est portée par le nouvel en-tête.

### 4. Affichage des objets — format inspiré du Stockage

Trois sections : **Travaux en cours**, **Restaurations possibles**, **Démantèlement**.

#### Layout par ligne

```
┌────────────────────────────────────────────────┐
│ [thumb 48]  NOM EN MAJUSCULES          [bouton] │
│             ★★☆ <CategorieIcon>                 │
│             ligne meta spécifique               │
└────────────────────────────────────────────────┘
```

- **Thumbnail 48×48** : couleur de rareté (`getRarityColors`) + `<ItemImage templateId fallbackIconSize=20 />`. Réutilise les styles `thumbBase` de `StockageItemRow`.
- **Nom** : display 11px uppercase, gras forêt-800. Truncate ellipsis si dépasse.
- **Ligne meta 1 (étoiles + catégorie)** : étoiles `<Star size=12 />` × 3 remplies selon `etoileCount(o.etat)` + `<CategorieIcon size=14 />` à droite. Couleur rareté pour les étoiles. Identique à stockage.
- **Ligne meta 2 (contextuelle)** :
  - **Travaux en cours** : `Bon → Très bon · fin jour N°243` ou `Bon → Très bon · prêt ✓` quand `state.jourActuel >= jourFin`. Font-mono 9.5px ink-500.
  - **Restaurations possibles** : `Très bon → Pristin · 7 j. · réf. 100 → 140 €`. Font-mono 9.5px ink-500, prix-après en brass-700.
  - **Démantèlement** : `Très bon · réf. 100 €`. Font-mono 9.5px ink-500.
- **Bouton action droite** : 56×~52px (full row height), style laiton (cf. `actionBtn` de StockageItemRow), TOUJOURS visible (pas de swipe-to-reveal sur l'atelier).
  - **Restaurer** : `<Hammer size=22 strokeWidth=1.5 />` à gauche + ligne `N ⚙ <CategorieIcon size=10 />` à droite. Couleurs :
    - Fond `var(--forest-800)` / icône `var(--brass-300)` quand action possible
    - Fond `var(--paper-200)` / icône `var(--ink-500)` quand atelier plein, compétence absente, ou pièces insuffisantes
    - Texte coût en rouge `var(--rouge-700, #8b1a1a)` si pièces insuffisantes (visible même bouton désactivé pour qu'on sache pourquoi)
  - **Démanteler** : `<Pickaxe size=22 strokeWidth=1.5 />` à gauche + ligne `+N ⚙ <CategorieIcon size=10 />` à droite. Fond `var(--brass-600)` / icône `var(--paper-100)`. Toujours actif sur stock libre.
  - **Travaux en cours** : pas de bouton — la zone droite affiche le badge état `Prêt ✓` (forest-700) ou `N j. rest.` (brass-700) en font-mono 9.5px.

### 5. Structure de fichiers

- **Modifier** : `src/app/atelier/page.tsx` — refonte intégrale de la zone sticky et des 3 sections.
- **Modifier** : `src/components/atelier/PiecesInventoryBar.tsx` — remplacer le cercle par `<Cog />` + `<CategorieIcon />`.
- **Créer** : `src/components/atelier/AtelierItemRow.tsx` — composant ligne objet réutilisé par les 3 sections, paramétré par `variant: "travaux" | "restauration" | "demantelement"`. Évite de répéter le markup thumbnail + nom + étoiles 3 fois.
- **Aucun** changement de logique métier (helpers `coutAmelioration`, `rendementDemantelement`, `peutDemanteler`, `restaurerObjet`, `demantelerObjet` inchangés).

### 6. Pastille "objets prêts" sur la TabBar

**Aucune modification** : la pastille rouge sur l'onglet Atelier existe déjà depuis Phase 7 (basée sur `state.inventaireJoueur.filter(o => o.enRestauration && o.enRestauration.jourFin <= state.jourActuel).length`). On la conserve telle quelle.

### 7. Tests à prévoir (manuels)

- Header en 3 colonnes lisible sur 360 px (titre centré non rogné, bouton upgrade non tronqué).
- Pastille TabBar reste opérationnelle (un objet prêt fait apparaître le badge).
- Bouton upgrade : désactivé visuellement quand budget < cout, affiche `MAX` au LVL 3.
- Engrenages : 7 visibles ou scroll horizontal sur viewport 360.
- Drop-shadow visible mais discret.
- Lignes objet : thumbnail s'affiche avec fallback CategorieIcon quand pas d'image disponible.
- Bouton Restaurer désactivé si pièces insuffisantes ; libellé pièces reste rouge dans ce cas.
- Bouton Démanteler ouvre la BottomSheet existante.
- Suppression du gros bandeau LVL → pas de zone vide ni saut visuel.

## Hors-scope v2

- Animation flyToTab depuis l'atelier (sans intérêt ici puisqu'on reste sur la page).
- Tap sur la ligne objet pour ouvrir une vue détail (à voir plus tard si besoin).
- Drag-to-reorder ou swipe-actions (l'atelier est un écran d'action ciblée, pas de gestion en masse).
- Génération d'icône PNG via Gemini pour l'engrenage (testée plus tard si rendu lucide insuffisant).

## Risques

- **Hauteur de l'en-tête** : 3 colonnes + le bandeau pièces juste en-dessous risquent de pousser la zone sticky au-delà de ~120 px. Si trop haut, sortir le bandeau pièces du sticky (en première position non-sticky de `<main>`).
- **Bouton upgrade** vertical : tester sur 360 px que les deux lignes (`↑ LVL2` + `500 €`) ne se chevauchent pas et restent lisibles.
- **AtelierItemRow** : nouveau composant — surface ~150-200 lignes selon le variant. Si trop dense, splitter en 3 sous-composants ; sinon, garder un seul avec switch sur `variant`.
