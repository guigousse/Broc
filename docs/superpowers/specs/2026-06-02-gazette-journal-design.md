# Refonte affichage Gazette — sur image de journal

**Date** : 2026-06-02
**Branche** : `feat/qg-decor-ludique`
**Composant principal** : `src/components/mobile/GazetteSheet.tsx`

## Contexte

La Gazette du chineur est aujourd'hui affichée dans un `BottomSheet` minimaliste. Comme pour le Calendrier (déjà refondu sur `public/qg/calendrier.png`), on veut l'afficher sur une image de journal (`public/qg/journalouvert.png`, déjà présente, titre « La Gazette du chineur » gravé dans le PNG).

## Objectif

Restituer une page de journal lisible, immersive et cohérente avec le QG, structurée en trois sections : Carnet mondain, Tendances du marché, Météo de la semaine.

## Cinématique & container

Même pattern que `CalendrierSheet` :
- Overlay fullscreen, scrim sombre, image journal centrée portrait (aspect-ratio conservé via `containerType: inline-size`).
- Tap-hors → ferme. ESC → ferme. `overflow: hidden` sur `body` pendant l'ouverture.
- Suppression de `BottomSheet` pour ce composant.

## Layout vertical (positionné en `cqw` sur le papier)

```
[Jour 12]                              [N°4]    ← AU-DESSUS de la bande titre
            ▓ LA GAZETTE DU CHINEUR ▓           ← gravé dans le PNG
═══════════ séparateur Art Déco ═══════════
                CARNET MONDAIN
  [illu/?]   Léon Daudet est annoncé(e) à
             Saint-Ouen le SAMEDI.
═══════════ séparateur Art Déco ═══════════
              TENDANCE DU MARCHÉ
   ♪   Musique           ↑   +8 %
   ♟   Jeux & Loisirs    ↓   −3 %
   ?   ???               Débloquer Veilleur·Mode
   …                                            (7 lignes, ordre fixe)
═══════════ séparateur Art Déco ═══════════
              MÉTÉO DE LA SEMAINE
       L     M     M     J     V     S     D
       ☀     ☁     🌧    ☀     ☀     🌧    ⛅
```

## Détails par zone

### Jour / N° d'édition
- Position : **au-dessus de la bande titre** (en marge extérieure haute du contenu, pas en overlay sur la bande gravée).
- Style : `font-display`, petites caps, encre noire, `letterSpacing 0.18em`, taille ~3.2cqw.
- Format : `Jour 12` à gauche, `N° 4` à droite. Numéro via `numeroEdition(jourActuel)` de `lib/tendances`.

### Séparateur Art Déco
- SVG inline réutilisable : trait fin horizontal interrompu en son centre par un losange (style art déco simple), couleur `--ink-900` opacité ~0.55.
- Hauteur ~3% du papier, marges latérales ~6%.

### Titre de section
- `font-display`, ~3.8cqw, `letterSpacing 0.22em`, `textTransform: uppercase`, centré, couleur `--ink-900`.

### Carnet mondain
- **Si compétence acquise + célébrité annoncée** : petit cadre 18% × ratio à gauche (placeholder `?` ou illustration future) + texte serif italique à droite, type *« {Nom} est annoncé(e) à {Brocante} le {JOUR}. »*
- **Sinon** : *« Débloquer avec [Mondanités] »*, italique grisé centré.

### Tendances du marché
- **Toujours 7 lignes**, ordre fixe :
  1. Musique · 2. Jeux & Loisirs · 3. Livres & Papeterie · 4. Mode · 5. Maison · 6. Objets d'art · 7. Bricolage.
- Chaque ligne : `[icône] [Catégorie] ........ [valeur droite]`.
  - Connu : flèche `↑`/`↓` + `+X %` / `−X %` (couleur forest si ≥0, vermillion si <0).
  - Inconnu : icône `?` (au lieu du picto) + `???` à la place du nom + texte italique grisé droite *« Débloquer Veilleur·{Catégorie} »*.
- Icônes Lucide par catégorie :
  - Musique → `Music`
  - Jeux & Loisirs → `Dices`
  - Livres & Papeterie → `BookOpen`
  - Mode → `Shirt`
  - Maison → `Home`
  - Objets d'art → `Palette`
  - Bricolage → `Wrench`

### Météo de la semaine
- **Si compétence acquise** : 7 colonnes (L M M J V S D — initiales en haut, icône Lucide météo en bas). Jours passés grisés (opacité ~0.45).
- **Sinon** : *« Débloquer avec [Astrologue] »*, italique grisé centré sous le titre.
- Source : `meteoSemaine` (déjà fourni au composant `CalendrierSheet`) + `jourDebutSemaine` à propager.
- **Pas de bouton reroll** (suppression).

### Gate d'achat
- **Si `!achetee`** : sections rendues avec `filter: blur(6px) opacity(0.45)` (texte illisible, sensation d'aperçu). CTA centré en bas (overlay sur le papier ou juste sous la dernière section) : `Acheter la gazette · 10 €`, désactivé si `budget < prixGazette`. Couleur `--forest-800` / `--brass-300`.
- **Si `achetee`** : consultation directe, pas d'étape supplémentaire.

## Props (API du composant)

Inchangé sauf nettoyage (auto mode : on supprime ce qui ne sert plus) :

```ts
interface GazetteSheetProps {
  open: boolean;
  onClose: () => void;
  jourActuel: number;
  prochainRafraichissement: number;
  tendances: readonly Tendance[];
  categoriesConnues: ReadonlySet<CategorieObjet>;
  meteoSemaine: Meteo[] | null;       // NOUVEAU — semaine complète
  jourDebutSemaine: number;           // NOUVEAU — pour griser jours passés
  revelerMeteo: boolean;
  celebrite: CelebriteEvenement | null;
  revelerCelebrite: boolean;
  // → SUPPRIMÉ : peutInfluencer, influenceUtilisee, onRerollMeteo, onRerollCelebrite
  achetee: boolean;
  onAcheter: () => void;
  budget: number;
  prixGazette: number;
}
```

Le call-site `src/app/qg/page.tsx` est mis à jour : suppression des handlers reroll, ajout de `meteoSemaine` + `jourDebutSemaine` (déjà disponibles dans le state, déjà passés à `CalendrierSheet`).

## Fichiers touchés

1. `src/components/mobile/GazetteSheet.tsx` — refonte complète.
2. `src/app/qg/page.tsx` — props ajustées au call-site.

Pas de nouveaux fichiers de constantes : `CATEGORIES_ORDRE` et la map d'icônes sont définies en haut du fichier `GazetteSheet.tsx` (~10 lignes, restent locales au composant).

## Hors scope

- Illustrations de célébrités (placeholder `?` pour l'instant — sera traité dans une autre passe).
- Modification des compétences ou des effets gameplay.
- Refactor de `BottomSheet` (qui reste utilisé ailleurs).
