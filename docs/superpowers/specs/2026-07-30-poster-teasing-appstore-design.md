# Affiche de teasing — sortie App Store (2026-07-30)

## Objet
Une affiche de teasing pour la sortie de BROC, format réseaux sociaux, qui incarne
l'esprit de l'appli et annonce la disponibilité sur l'App Store.

## Décisions validées
- **Destination** : réseaux sociaux, portrait 4:5 → 1080 × 1350 px.
- **Langue** : français seul (déclinable plus tard, le script reste rejouable).
- **Concept** : illustration sur mesure générée par Gemini.
- **Sujet** : un étal de brocante débordant de trésors (gramophone, 33 tours,
  lampe, cadres dorés, vaisselle chinée) dans la lumière dorée du petit matin.

## Composition
1. **Illustration de fond** (Gemini, image-to-image avec une scène existante
   comme référence de style, p. ex. `public/brocantes/disquaire-independant.webp`,
   **plus des items du jeu en références d'objets** pour que l'étal montre de
   vraies trouvailles reconnaissables : `mus.tourne_disque_a_courroie_vintage`,
   `mus.33tours_jazz_1`, `ma.lampe_bureau_artdeco`,
   `ma.horloge_carillon_westminster`, `ma.miroir_dore_fronton`).
   Cadrage portrait, tiers supérieur calme pour le titre. Pièges connus appliqués :
   pas de négations répétées, géométrie corrigée au rognage (sharp), plusieurs
   candidats générés.
2. **Habillage** rendu HTML/CSS → PNG via Playwright (même approche que
   `scripts/appstore`) :
   - haut : `broc-wordmark-light.svg` + `deco-divider.svg` ;
   - bas, sur dégradé sombre : accroche « Chinez. Négociez. Collectionnez. »
     puis badge officiel Apple « Télécharger dans l'App Store » (fr) ;
   - `paper-grain.svg` en surimpression légère ;
   - fontes du projet embarquées en base64 (piège `file://` sous `setContent`).

## Livrables
- `marketing/poster/broc-teasing-fr.png` (1080 × 1350) ;
- script de composition rejouable sous `scripts/poster/`.
