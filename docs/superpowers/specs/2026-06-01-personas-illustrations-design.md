# Illustrations de personnages — Pipeline & intégration (Phase 1 : vendeurs)

**Date :** 2026-06-01
**Scope phase 1 :** 6 archétypes vendeurs (chiner). Les 15 archétypes clients (vitrine) suivront en phase 2 avec le même pipeline.

## Objectif

Remplacer le SVG schématique actuel (`PersonaAvatar.tsx`) par des illustrations
bustes (tête + torse) cohérentes stylistiquement, une par archétype vendeur.
La cohérence est garantie par un **prompt template** unique + une **fiche
d'identité visuelle fixe** par archétype.

## Style commun (constants — base de cohérence)

Ces éléments sont identiques dans les 6 prompts pour garantir une famille
visuelle reconnaissable :

- **Technique** : aquarelle + encre légère, illustration vintage, traits doux
  sans contours noirs durs, lavis colorés
- **Palette** : verts forêt (`#2E4A33`), bruns (`#6B4A2B`), ocres (`#C9A04A`),
  laiton (`#B8893A`), blanc cassé (`#F4EFE6`) — tons terre
- **Époque vestimentaire** : années 1930-1950, ambiance marchand / brocanteur
- **Cadrage** : buste 3/4 face, regard vers la caméra, environ 60% du frame
  occupé par le personnage, espace au-dessus de la tête
- **Lumière** : douce, latérale gauche, ombres chaudes
- **Fond** : gris uni `#E8E2D5` (proche `--paper-200` du jeu), plat, sans
  texture ni dégradé
- **Format brut** : PNG 1024×1024, fond uni neutre (avant détourage)

## Identités par archétype (variables)

| ID | Nom affiché | Identité visuelle |
|---|---|---|
| `naif` | Le Naïf | Jeune homme ~20 ans, joues rondes, sourire candide bouche entrouverte, cheveux châtains ébouriffés, chemise beige simple un peu trop grande, casquette de toile de travers |
| `bonhomme` | Le Bonhomme | Homme ~55 ans, bedaine, large sourire jovial, joues rouges, casquette gavroche brune, chemise à carreaux verts ouverte au col, bretelles brunes |
| `mamie` | Mamie pressée | Femme ~70 ans, foulard à motifs sur cheveux gris bouclés, regard vif légèrement nerveux, cardigan vert boutonné, broche en laiton au col, petite montre poignet visible |
| `malin` | Le Malin | Homme ~40 ans, sourire en coin entendu, sourcil droit arqué, fine moustache brune, veste cintrée brun-ocre à pochette, foulard ascot vert noué au cou |
| `grincheux` | Le Grincheux | Homme ~60 ans, sourcils épais froncés, bouche tombante, casquette plate tirée bas sur le front, gilet de laine usé brun-vert, pipe en bruyère éteinte au coin de la bouche |
| `antiquaire` | L'Antiquaire | Femme ~55 ans, cheveux gris-blond tirés en chignon strict, lunettes demi-lune dorées sur le bout du nez, veston tweed kaki, foulard de soie ocre, expression posée et experte |

Chaque identité reflète le comportement mécanique de l'archétype
(margePct, sangFroid, etc.) — par ex. le Grincheux a une mine fermée
(margePct 0.10), l'Antiquaire est posée (sangFroid 0.95).

## Prompt template

Le prompt suivant est utilisé tel quel pour chaque génération, en remplaçant
uniquement `{{IDENTITE}}` par la colonne « Identité visuelle » du tableau
ci-dessus.

```
Vintage watercolor illustration of a French flea market vendor character,
bust portrait (head and torso only), three-quarter view facing camera, soft
gaze toward viewer.

CHARACTER: {{IDENTITE}}

STYLE: watercolor and light ink illustration, vintage editorial style, soft
washed colors, no hard black outlines, gentle pencil sketch underneath color
washes. Reminiscent of 1940s French magazine illustrations.

PALETTE: earthy tones, forest green (#2E4A33), warm browns (#6B4A2B), ochre
(#C9A04A), brass (#B8893A), off-white (#F4EFE6). Avoid saturated reds, blues,
or neons.

WARDROBE: 1930s-1950s French working-class merchant attire, period accurate.

COMPOSITION: bust portrait centered, character occupies ~60% of frame, empty
headroom above. Soft lighting from the upper left, warm soft shadows.

BACKGROUND: solid flat light beige-grey (#E8E2D5), no texture, no gradient,
no decorative elements, no shadow cast on background.

OUTPUT: square 1024x1024 PNG, sharp focused subject, no text or watermark.
```

## Pipeline de génération (manuel — 2 étapes)

### Étape A : génération avec Gemini

Pour chaque archétype :

1. Ouvrir Gemini (UI web, modèle Gemini 2.5 Flash Image / nano-banana).
2. Coller le prompt template avec `{{IDENTITE}}` substitué.
3. Régénérer si le résultat ne respecte pas le style (pas d'aquarelle, fond
   non uni, contours trop durs, palette hors gamme).
4. Télécharger le PNG.
5. Sauvegarder sous `tmp-personas/raw/vendeur-{archetype}.png` (dossier local
   non versionné, créé par l'utilisateur — pas commité).

Critères de validation visuelle :
- Identité du personnage clairement reconnaissable (correspond à la fiche)
- Palette dans la gamme terre (pas de bleu vif, rouge vif, jaune néon)
- Fond uni clair, pas de texture
- Cadrage buste, espace au-dessus de la tête
- Pas de texte ni filigrane

### Étape B : détourage du fond

Pour chaque PNG brut :

1. Aller sur https://www.remove.bg (gratuit pour un usage ponctuel ; si la
   sortie est limitée en résolution, créer un compte gratuit).
2. Drag-drop le PNG brut.
3. Télécharger le résultat (PNG transparent).
4. Sauvegarder sous `public/personas/vendeur-{archetype}.png`.

Critères de validation détourage :
- Bord propre autour des cheveux et du col
- Pas de halo gris résiduel
- Pas de morceau de fond conservé dans des creux (sous menton, etc.)

Si remove.bg rate un cas (chignon complexe, pipe traversant le bord), refaire
sur Photopea (gratuit, en ligne) avec l'outil **Select Subject** d'Adobe-like.

## Naming convention & arborescence

```
public/
  personas/
    vendeur-naif.png         # 1024x1024, alpha
    vendeur-bonhomme.png
    vendeur-mamie.png
    vendeur-malin.png
    vendeur-grincheux.png
    vendeur-antiquaire.png
```

Phase 2 (clients) utilisera le préfixe `client-` :
`client-retraite_chineur.png`, etc.

## Intégration code

### Mapping archétype → fichier

Nouveau fichier `src/lib/personaIllustrations.ts` :

```ts
import type { VendeurArchetypeId } from "@/types/game";

export const VENDEUR_ILLUSTRATION: Record<VendeurArchetypeId, string> = {
  naif: "/personas/vendeur-naif.png",
  bonhomme: "/personas/vendeur-bonhomme.png",
  mamie: "/personas/vendeur-mamie.png",
  malin: "/personas/vendeur-malin.png",
  grincheux: "/personas/vendeur-grincheux.png",
  antiquaire: "/personas/vendeur-antiquaire.png",
};
```

### Modification de `PersonaAvatar.tsx`

L'avatar actuel utilise un SVG schématique. Nouvelle signature :

```tsx
interface PersonaAvatarProps {
  message: string;
  info: PersonaInfo;
  /** Chemin vers l'illustration PNG. Si absent, fallback SVG schématique. */
  illustrationSrc?: string;
}
```

Comportement :
- Si `illustrationSrc` fourni → afficher `<Image>` (next/image) 92×92,
  `object-fit: contain`, fond transparent.
- Sinon → conserver le SVG actuel (fallback, utile tant que la phase 2 clients
  n'est pas livrée).
- Le bouton (i) reste positionné comme aujourd'hui (bottom-right, 26×26).

### Wiring

- `src/app/chiner/[brocanteId]/ClientPage.tsx` :
  passer `illustrationSrc={VENDEUR_ILLUSTRATION[persona.archetype]}` à
  `<NegociationSheet>` qui le transmet à `PersonaAvatar`.
- `NegociationSheet.tsx` : ajouter prop `illustrationSrc?: string` et la
  passer au `<PersonaAvatar>` dans `topDecoration`.
- `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` :
  **pas de modification phase 1** — laisser le fallback SVG schématique pour
  les clients, sera remplacé en phase 2.

## Tests / validation manuelle

- Vérifier visuellement chaque archétype dans la sheet de négociation chiner
  (générer plusieurs items, déclencher chaque archétype).
- Vérifier que l'image se charge instantanément (préchargée par Next).
- Vérifier le rendu sur fond `--paper-200` (pas de halo visible).
- Vérifier que la bulle de dialogue reste lisible à côté du portrait.

## Hors scope (renvoyés à phase 2 ou plus tard)

- 15 illustrations clients (même pipeline, phase 2).
- Variantes par archétype (un seul portrait fixe par archétype en phase 1).
- Animation d'humeur (le portrait reste statique, c'est la `HumeurGauge` qui
  porte l'état).
- Génération via API (manuel suffisant pour 6 images one-shot).
- Compression/optimisation au-delà du défaut Next.js Image.

## Critères de succès

1. Les 6 PNG sont présents dans `public/personas/`, ~400-800 Ko chacun,
   1024×1024, alpha propre.
2. La sheet de négociation chiner affiche le portrait au-dessus du bandeau
   art déco, avatar bottom aligné au top du bandeau (comportement actuel
   conservé).
3. Le style des 6 portraits est manifestement homogène (même palette, même
   technique, même cadrage) — un observateur extérieur identifie une « série ».
4. Chaque portrait est reconnaissable d'une partie à l'autre (identité visuelle
   stable).
