# Site vitrine Vercel — design (2026-08-06)

## Problème

Le lien « site du développeur » de la fiche App Store (`https://project-5yn6d.vercel.app`)
servait l'export statique complet du jeu : jouable gratuitement en navigateur,
énergie infinie sans achat. Les URLs `/mentions-legales` et `/privacy` de la fiche
doivent rester valides (Apple les visite), et `/app-ads.txt` doit rester à la racine
(vérification AdMob).

## Décision (approche A validée par Guillaume)

Vercel ne sert plus le build Next : un dossier `site/` statique autonome le remplace.
Plus aucun fichier du jeu en ligne. `vercel.json` : `outputDirectory: site`,
build et install vides, `cleanUrls` conservé.

## Contenu de `site/`

- `index.html` — vitrine de l'app (voir design ci-dessous)
- `mentions-legales.html`, `privacy.html` — contenu extrait du build (`out/`),
  scripts Next retirés, enveloppe HTML minimale ; URLs inchangées
- `app-ads.txt` — copie de `public/app-ads.txt`
- `404.html`, favicon/touch-icon, `assets/` (images webp, badges, fontes, SVG)

## Design de la vitrine

- **Palette** : brun encre `#181009`, vert bouteille `#1E3527`, crème papier `#F3EAD8`,
  or laiton `#C9A34A`, sépia `#8A6B45` — reprise du jeu et de l'affiche.
- **Typo** : wordmark SVG du jeu ; Cinzel (titres), Cormorant Garamond (corps),
  DM Mono (eyebrows/étiquettes) — les fontes du jeu, sous-ensembles latin + grec.
- **Structure** : héros plein écran sur l'illustration « nue » de l'étal
  (`marketing/poster/candidats/illustration-2.png`) avec wordmark, accroche
  « Chinez. Négociez. Collectionnez. » et badge App Store officiel →
  section trois verbes (fond vert bouteille, ornements du jeu) →
  **signature : le « bac à trouvailles »**, les 6 captures App Store en cadres
  inclinés dans un défilement horizontal scroll-snap (métaphore du chinage) →
  bandeau final icône + badge → footer crème avec liens légaux.
- **Langues** : HTML en FR ; script inline (~30 lignes, aucun réseau) bascule
  textes, badge et jeu de captures en EN/ES/EL selon `navigator.language`
  (jeux de captures de `marketing/appstore/<lang>/iphone-6.5/`).
- **Motion** : fondu d'apparition du héros uniquement ; `prefers-reduced-motion` respecté.
- **Lien App Store** : `https://apps.apple.com/app/id6784023113` (universel).

## Déploiement

Branche `fix/site-vitrine` depuis `main`, PR ouverte à la main par Guillaume ;
vérifier dans le dashboard Vercel que la production suit bien `main`, puis merger.
