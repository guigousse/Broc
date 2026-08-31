# Générateur TikTok « roulette d'objets » — design

Date : 2026-08-27. Statut : validé en discussion, à planifier.

## But

Produire à la chaîne, **depuis l'iPhone**, des vidéos verticales courtes pour TikTok :
une roulette d'objets du jeu défile devant un fond de brocante ; une silhouette au centre
indique l'objet cible ; le spectateur doit mettre pause pile quand la cible est calée dans
la silhouette. À cet instant exact, un **flash promo BROC** est incrusté : mettre pause au
bon moment = découvrir la promo. La vidéo boucle parfaitement.

## Décisions prises

| Sujet | Décision |
|---|---|
| Forme | Mini-app web statique, sans framework ni build, utilisée dans Safari iOS (ajoutée à l'écran d'accueil). |
| Hébergement | Dossier `tiktok-gen/` du repo, **projet Vercel séparé** de la vitrine, Deployment Protection activée. Rien de sensible n'y est servi (images déjà dans le binaire de l'app). |
| Rendu | `<canvas>` 1080×1920, animation à temps déterministe (`état = f(t)`), aperçu et enregistrement identiques. |
| Export | `canvas.captureStream()` + piste audio WebAudio → `MediaRecorder` (mp4 H.264/AAC natif Safari iOS) → `navigator.share({ files })` vers Photos/TikTok. Enregistrement en temps réel (15 s de vidéo = 15 s). |
| Défilement | Plusieurs passages : la cible passe au centre N fois (2-4), boucle parfaite (durée = nombre entier de tours). |
| Flash promo | **Uniquement** à l'instant où la cible est centrée. Fenêtre de 3-4 images (~100-130 ms à 30 fps, réglable). L'overlay se superpose sans cacher la cible calée. |
| Consigne | Texte modifiable affiché en haut (défaut : « Mets pause sur … »). |
| Son | « Tic » de roulette synthétisé WebAudio à chaque objet franchissant le centre, « ding » sur la cible. Mixé dans le mp4. |
| Vitesse | Réglage central, en objets/seconde ; l'app affiche la fenêtre de pause résultante. |

## Interface (une page, pour le pouce)

1. **Aperçu** : le canvas réduit, 9:16, lecture en boucle.
2. **Fond** : grille des fonds `public/brocantes` + « Importer une photo » (pellicule, via `<input type=file accept=image/*>`), recadrée en cover 9:16.
3. **Objets** : grille filtrable (catégorie, recherche sur le nom FR), bouton « Aléatoire ×N », choix de la **cible** (bouton « Cible » sur l'objet sélectionné). 6 à 12 objets recommandés.
4. **Réglages** :
   - vitesse (objets/s, 1,5 → 4), espacement (px entre centres),
   - nombre de passages (2-4) → durée calculée ; ou durée cible → arrondie au tour entier,
   - largeur du flash (images), consigne, son on/off,
   - affichage en direct : durée, fenêtre de pause en ms.
5. **Enregistrer** (progression) → **Partager**. Réglages mémorisés en `localStorage`.

## Scène

- Fond : image cover, léger assombrissement radial au centre.
- Bande d'objets : entrée à gauche, sortie à droite, vitesse constante, hauteur d'objet ≈ 420 px, centrés verticalement. La bande est cyclique : `x_i(t) = centre + (i·espacement − v·t) mod longueurBande`.
- Silhouette : masque alpha de la cible rempli noir 85 %, échelle ×1,15, liseré doré fin.
- Consigne : Cinzel, haut de l'écran, sur bandeau translucide.
- Overlay promo (dessiné dans le canvas) : voile sombre 45 %, « BROC » en Verve Shadow, « Le jeu de brocante » en Cinzel, en bas « Disponible gratuitement sur » + badges App Store / Google Play (SVG officiels, à déposer dans `tiktok-gen/assets/badges/`). La cible calée reste visible au centre.

## Modules (`tiktok-gen/`)

- `index.html`, `styles.css`
- `src/catalogue.js` — charge `assets/catalogue.json`.
- `src/roulette.js` — **logique pure, testée** : positions des objets à `t`, durée de boucle, instants de centrage de la cible, instants des tics, fenêtre de flash, fenêtre de pause en ms.
- `src/rendu.js` — dessine une frame sur un contexte 2D à partir de l'état.
- `src/son.js` — planification WebAudio (tics, ding) sur un `AudioContext`, vers un `MediaStreamDestination`.
- `src/enregistreur.js` — capture + MediaRecorder + partage.
- `src/ui.js` — panneau, persistance.
- `tests/roulette.test.mjs` (vitest, `--maxWorkers=4`).

## Pipeline d'assets (`scripts/tiktok-gen-assets.mjs`)

Copie depuis `public/items` (pleines + miniatures 160 px) et `public/brocantes`, fontes Verve Shadow + Cinzel, génère `catalogue.json` (id, nom FR, catégorie) depuis les données du jeu. Sortie dans `tiktok-gen/assets/` (commitée ou générée au déploiement — à trancher au plan ; commitée par défaut, ~30 Mo).

## Gestion d'erreurs

- `MediaRecorder`/`captureStream` absents ou mp4 non supporté → message clair, proposition de l'enregistrement d'écran iOS.
- Perte d'images pendant l'enregistrement : indicateur de fps ; en dessous de 25 fps moyen, avertissement « réenregistrer ».
- `navigator.share` indisponible → lien de téléchargement.
- Images d'objets manquantes → objet ignoré avec avertissement.

## Tests

- Unitaires : `roulette.js` (boucle parfaite, N passages exacts, tics = un par objet, flash centré sur l'instant de calage, fenêtre de pause = espacement/vitesse).
- Manuels sur iPhone : enregistrement, son présent dans le mp4, partage vers TikTok, boucle sans saut, flash visible en pause.

## Hors périmètre

Montage multi-scènes, sous-titres, publication automatique sur TikTok, autres langues que le FR.
