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

**Enregistrer** capture la scène telle qu'elle s'affiche : le canvas
(`captureStream`) et le son (la sortie `MediaStream` du graphe audio) sont
encodés ensemble par un `MediaRecorder`.

- La prise se fait **en temps réel** : elle dure exactement la durée
  annoncée sous les réglages (« Durée 12,0 s »). Pas de rendu accéléré —
  le son est joué par le contexte audio, qui avance à la vitesse du monde
  réel. Les réglages sont gelés pendant ce temps ; ne pas quitter la page.
- Sur **Safari iOS**, le fichier est un **mp4 H.264/AAC** : TikTok
  l'accepte tel quel, sans réencodage. Sur Chrome/Firefox c'est un **webm**
  (VP9/Opus) — bon pour vérifier au bureau, à ne pas téléverser sur TikTok.
- La dernière image est identique à la première : la vidéo **boucle** sans
  saut, comme le veut le format.
- Si la case **Son** est décochée, la vidéo a bien une piste audio, mais
  silencieuse.
- Le message final donne la cadence obtenue (« Enregistré : 12,0 s ·
  30 fps »). En dessous de 25 fps, l'app prévient que la prise est
  saccadée : fermer les autres apps et recommencer.

**Partager** ouvre la feuille de partage iOS (`navigator.share` avec le
fichier) → « Enregistrer dans Photos », puis publication depuis TikTok. Si
le navigateur ne sait pas partager de fichiers — c'est le cas au bureau, et
**en HTTP local dans tous les cas** — le fichier est simplement téléchargé.

Si le navigateur ne sait pas enregistrer du tout, l'app le dit et renvoie
vers l'enregistrement d'écran iOS.

## Déploiement

Ce dossier est déployé comme un **projet Vercel séparé** du jeu principal
(la mini-app n'a rien à voir avec le build Next.js/Tauri du jeu). Réglages
du projet Vercel :

- **Root Directory** : `tiktok-gen`
- Cocher **« Include source files outside of the Root Directory »**
  (le build lit `public/items`, `public/brocantes`, `public/fonts` et
  `docs/items-catalogue.csv` à la racine du monorepo)
- Activer **Deployment Protection** (la mini-app n'est pas destinée à être
  publique)

`vercel.json` fixe `buildCommand: "node build.mjs"` et
`outputDirectory: "dist"`.

## Badges de téléchargement

`assets/badges/app-store.svg` et `google-play.svg` sont des **placeholders**
dessinés à la main (rectangle noir, texte système). Avant publication, les
remplacer par les badges officiels — en gardant les mêmes noms de fichier :

- Apple : developer.apple.com/app-store/marketing/guidelines
- Google : play.google.com/intl/fr/badges
