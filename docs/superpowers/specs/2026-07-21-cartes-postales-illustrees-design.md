# Cartes postales illustrées du grand-père — design

**Date** : 2026-07-21
**Statut** : validé par Guillaume

## Objectif

Les cartes postales d'épilogue du grand-père (injectées après `trame_ch12`)
arrivent tous les **10 jours** (au lieu de 6) et s'affichent comme de vraies
cartes postales : **recto illustré** (une image par destination), **tap → flip
3D** vers le **verso** (texte manuscrit + timbre dessiné en code + cachet
postal). La 5ᵉ carte, « Carte sans timbre », n'a volontairement pas de timbre.

## 1. Données — `src/data/cartesPostales.ts`

- `INTERVALLE_CARTES_POSTALES` : `6` → `10`.
  - Aucune migration : le jour d'envoi est calculé à la volée dans
    `src/lib/quetes/tick.ts` (`ch12.jourResolution + (index+1) * INTERVALLE`).
    Les sauvegardes en cours d'épilogue voient simplement la prochaine carte
    arriver plus tard.
- Chaque entrée gagne deux champs :
  - `illustration: string` — chemin public de l'image recto ;
  - `cachet?: string` — nom de ville sur le cachet postal ; absent pour la
    carte 5 → pas de timbre ni cachet au verso.

| id              | illustration                        | cachet    |
|-----------------|-------------------------------------|-----------|
| carte_postale_1 | `/cartes-postales/venise.webp`      | VENEZIA   |
| carte_postale_2 | `/cartes-postales/lisbonne.webp`    | LISBOA    |
| carte_postale_3 | `/cartes-postales/marrakech.webp`   | MARRAKECH |
| carte_postale_4 | `/cartes-postales/kyoto.webp`       | KYOTO     |
| carte_postale_5 | `/cartes-postales/sans-timbre.webp` | —         |

- Nouvel export `cartePostaleParId(id: string)` pour le lookup côté rendu.
- **Assets** : générés par Guillaume, format unique **paysage 3:2, 1200×800,
  webp**, déposés dans `public/cartes-postales/`. Tant qu'un fichier manque,
  fallback gracieux côté rendu (fond papier + nom de la destination), jamais
  d'icône d'image cassée.

## 2. Affichage — `CartePostaleView.tsx` + branchement `CourrierSheet.tsx`

- Dans `CourrierSheet`, si le courrier courant est une carte postale
  (`cartePostaleParId(courant.id)` non nul et payload de type `lettre`), on
  rend `<CartePostaleView>` à la place de l'`<article>` lettre. Le reste du
  flux (pile des non-lus, bouton bas, `onMarquerLu`) ne change pas ; le bouton
  affiche « Compris » (`d.sheets.compris`), son `playClick`.
- **Recto** (face d'arrivée) : illustration plein cadre au ratio 3:2, liseré
  blanc de carte postale, coins légèrement arrondis. Indice discret
  « Touchez pour retourner » (nouvelle clé i18n FR/EN/ES).
- **Flip** : tap n'importe où sur la carte → rotation 3D `rotateY` ~600 ms
  (`perspective` sur le conteneur, `backface-visibility: hidden` sur les deux
  faces). Retournable à volonté dans les deux sens.
- **Verso** : papier crème (mêmes tons que `lettreCard`), titre en haut à
  gauche (via `titreCourrier`, i18n existant), **timbre SVG dessiné en code**
  en haut à droite : bord dentelé, vignette colorée propre à la destination,
  cachet postal rond avec le nom de ville (`cachet`) et lignes d'oblitération
  ondulées débordant sur la carte. Texte manuscrit pleine largeur
  (`corpsCourrier`, fonte handwriting existante), signature « — Grand-père »
  inclinée comme les lettres actuelles. Carte 5 : ni timbre ni cachet.
- Accessibilité : la carte est un élément interactif (bouton) avec libellé
  de retournement ; le texte du verso reste lisible par lecteur d'écran même
  côté recto (contenu présent dans le DOM).

## 3. Tests

- `src/lib/quetes/tick.test.ts` : adapter les jours attendus codés en dur sur
  l'ancien intervalle (ex. « J+6 » → « J+10 »).
- Nouveau test composant `CartePostaleView` : arrive côté recto, flip au tap
  (aller-retour), timbre + cachet présents sur les cartes 1–4, absents sur la
  carte 5, fallback affiché quand l'image ne charge pas.

## Hors périmètre (YAGNI)

- Pas de galerie de relecture des cartes reçues.
- Pas de son dédié au flip.
- Pas de timbres-images générés (timbre 100 % code).
