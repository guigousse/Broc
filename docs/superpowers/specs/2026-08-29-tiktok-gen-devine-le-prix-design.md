# Générateur TikTok — 3ᵉ type de vidéo « Devine le prix » — design

## But
Un format qui fait **commenter** (les deux premiers jouent sur l'attente). Une
série d'objets du jeu : chacun apparaît, un compte à rebours laisse deviner son
prix, puis le prix (et sa rareté) est révélé avec un ding. Le dernier peut rester
sans réponse (« ta réponse en commentaire »).

## Décisions
- **Série** = les objets sélectionnés, dans l'ordre de la sélection (3 à 5 conseillés,
  1 minimum, pas de cible nécessaire). Pas de boucle.
- **Par objet** : apparition 0,5 s (zoom + fondu) → compte à rebours `dureeCompte`
  (2–5 s, défaut 3 : gros chiffres 3-2-1, un tic par chiffre) → révélation
  `dureeRevele` (1–4 s, défaut 2 : l'étiquette « ? » se change en prix avec un
  rebond, le mot de rareté dessous, son de célébration).
- **Dernier mystère** (case, défaut non) : le dernier objet garde son « ? » et affiche
  « Ta réponse en commentaire ».
- **Overlay promo** (BROC, calques, badges) : pendant la révélation du dernier objet
  (comme l'arrêt final de la Roulette). `{nom}`/`{prix}` = le dernier objet.
- Nom de l'objet toujours visible sous lui (Cinzel), étiquette de prix en plaque
  laiton sous le nom.

## Modules
- `devine.js` (pur, testé) : `calculerDevine(cfg)` → même contrat que les roulettes
  (`duree`, `instantsTics`, `instantsCelebration[]`, `arretDepuis` = début de la
  dernière révélation, `geleAuFlash:false`, `instantsCentrage:[]`) + `etapes[]` et
  `etapeA(t, r)` → `{ index, phase: apparition|compte|revelation, u, reste }`.
- `roulette.js` : `TYPES_VIDEO` + aiguillage `calculerPour`, `instantFin` (dernière
  révélation + 0,8 s).
- `son.js` : `instantsCelebration` (tableau) en plus de `instantCelebration`.
- `rendu.js` : `dessinerFrameDevine` (fond, objet, chiffre, nom, étiquette, rareté).
- `apercu.js` : `construireCfg` accepte 1 objet sans cible pour ce type, pas de
  silhouette ; `scene.serie` = entrées du catalogue (nom, prix, rareté).
- `reglages.js` : `dureeCompte`, `dureeRevele`, `dernierMystere` ; `ui.js`/`index.html` :
  option du type, curseurs `data-mode="devine"`, libellé d'info « révélation ».

## Tests
`devine.test.mjs` (chronologie, tics, célébrations, dernier mystère, etapeA),
`apercu`/`reglages` (cfg à 1 objet, bornes), `son` (plusieurs célébrations).

## Hors périmètre
Prix saisi à la main, choix multiple à l'écran, musique de fond.
