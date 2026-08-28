# Générateur TikTok BROC

Mini-app statique qui génère des vidéos TikTok à partir des assets du jeu
(objets, fonds de brocante, fontes). Sans dépendance, sans framework.

## Usage local

```bash
npm run tiktok:serve
```

Construit `tiktok-gen/dist/` puis sert le dossier sur
http://localhost:3200.

Pour juste reconstruire les assets sans lancer de serveur :

```bash
npm run tiktok:build
```

> ⚠️ `navigator.share` exige HTTPS : le bouton de partage ne fonctionnera
> pas en local. Tester le partage sur l'URL Vercel du déploiement, pas en
> local.

## Enregistrer et partager

**Enregistrer** rend la vidéo **hors ligne** (WebCodecs) : chaque image est
dessinée puis encodée une par une, à **60 images/s fixes** — aucune image ne
peut être perdue. Le son du tour est rendu par `OfflineAudioContext` puis
encodé en AAC ; le tout est muxé en mp4 H.264 (`src/encodeur.js`, muxeur
`tiktok-gen/vendor/mp4-muxer.mjs`, vendorisé — Vercel n'installe rien). Le rendu prend à peu près la durée du clip sur
iPhone, souvent moins.

Pourquoi : l'ancienne prise en **temps réel** (`MediaRecorder` sur
`canvas.captureStream`, `src/enregistreur.js`) ne capturait que ce que le
téléphone avait réussi à dessiner à temps — sur un vrai fichier iPhone, 11
images perdues sur 197 (trous de 42 à 67 ms) et une cadence variable que
TikTok, en ré-encodant à cadence fixe, transformait en saccades. Elle reste
en **secours** si `VideoEncoder` manque ; le message final le dit
(« Enregistrement en cours… (temps réel) »).

- La vidéo **boucle** sans saut : première image à `t = 0`, dernière à
  `duree − 1/60` — jamais une seconde copie de la première.
- Si la case **Son** est décochée, la piste audio existe mais est silencieuse.
- Sans `AudioEncoder` (WebKit ancien), le fichier sort **muet** et le message
  le dit.
- Le message final : « Rendu : 6,7 s · 60 fps ».

**Partager** ouvre la feuille de partage iOS (`navigator.share` avec le
fichier) → « Enregistrer dans Photos », puis publication depuis TikTok. Si
le navigateur ne sait pas partager de fichiers — c'est le cas au bureau, et
**en HTTP local dans tous les cas** — le fichier est simplement téléchargé.

## Déploiement

Ce dossier est déployé comme un **projet Vercel séparé** du jeu principal
(la mini-app n'a rien à voir avec le build Next.js/Tauri du jeu). `vercel.json`
fixe `buildCommand: "node build.mjs"` et `outputDirectory: "dist"`.

Procédure (dashboard Vercel, une seule fois) :

1. **Add New Project** → importer le repo GitHub du monorepo.
2. **Root Directory** : `tiktok-gen`.
3. Cocher **« Include source files outside of the Root Directory »** (le
   build lit `public/items`, `public/brocantes`, `public/fonts` et
   `docs/items-catalogue.csv` à la racine du monorepo, hors de
   `tiktok-gen/`).
4. **Framework Preset** : `Other`.
5. **Deploy**.
6. Une fois le projet créé, **Settings → Deployment Protection** → activer
   **« Vercel Authentication »** (ou **« Password Protection »**) : la
   mini-app n'est pas destinée à être publique.
7. Vérifier le déploiement :
   - `https://<projet>.vercel.app/assets/catalogue.json` répond du JSON.
   - `https://<projet>.vercel.app/` affiche l'app.

Ensuite, chaque `git push` sur la branche suivie **redéploie
automatiquement**. Le build prend environ **1 minute** (il copie ~70 Mo
d'assets depuis la racine du monorepo).

## Recette iPhone

À faire sur un vrai iPhone (Safari), sur l'URL Vercel déployée — pas en
local (voir l'avertissement sur `navigator.share` plus haut).

- [ ] **1. Ajouter à l'écran d'accueil.** L'app s'ouvre en plein écran
  (pas de barre Safari), grâce à `apple-mobile-web-app-capable`.
- [ ] **2. Composer** un fond, 8 objets et une cible. L'aperçu tourne à
  60 fps, le son démarre au premier tap (déblocage audio iOS).
- [ ] **3. Enregistrer.** La progression va de 0 à 100 % en `duree`
  secondes, sans message d'avertissement « saccadé ».
- [ ] **4. Partager → Enregistrer la vidéo.** Dans Photos : un mp4 de
  `duree` secondes, **avec son**, boucle propre (pas de saut ni d'arrêt
  visible au raccord), et une pause nette au moment du calage (l'overlay
  de résultat est visible).
- [ ] **5. Partager → TikTok.** La vidéo est acceptée telle quelle, sans
  réencodage refusé ni erreur de format.
- [ ] **6. Réglages conservés** après fermeture complète de l'app (fond,
  objets, cible, durée, son).
- [ ] **7. Importer une photo** de la pellicule comme fond personnalisé.

**Comment signaler un écart** : noter le numéro du point concerné et
joindre un enregistrement d'écran (Réglages → Centre de contrôle →
Enregistrement de l'écran) montrant le comportement observé.

## Ajouter à l'écran d'accueil

Safari → bouton **Partager** → **Sur l'écran d'accueil**. L'app s'ouvre
alors plein écran, sans chrome Safari, grâce à
`apple-mobile-web-app-capable`. Comme sur toute page web iOS, le **premier
tap** débloque le son (contrainte du navigateur, pas un bug de l'app).

## Limites connues

- En secours temps réel seulement : le chiffre de fps affiché mesure la
  boucle de dessin, pas la cadence réellement encodée.
- Un `fondPerso` (photo importée) de plus de **2 Mo n'est pas persisté**
  d'une session à l'autre — il faut réimporter la photo si l'app est
  relancée.

## Badges de téléchargement

`assets/badges/app-store.svg` (badge Apple officiel FR) et `google-play.png`
(badge Google Play officiel FR, 646×192) viennent de `marketing/poster/`.
L'overlay les dessine chacun à son ratio natif ; le badge Google embarque sa
propre marge transparente, d'où sa hauteur un peu supérieure dans `overlay.js`.
