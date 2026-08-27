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
