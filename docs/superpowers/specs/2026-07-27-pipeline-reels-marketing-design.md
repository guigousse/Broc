# Pipeline de production des Reels / TikTok marketing

**Date :** 2026-07-27
**Statut :** design validé, prêt pour le plan d'implémentation

## Intention

Produire en série des vidéos verticales courtes pour Instagram Reels et TikTok,
mettant en scène **le même plan fixe** : un POV de vendeur derrière son étal, sur
une brocante de quartier. D'un épisode à l'autre, **deux choses seulement
changent** :

1. les objets posés sur l'étal ;
2. l'acheteur qui vient chiner.

Tout le reste — cadrage, décor, style, habillage — est figé, ce qui donne à la
série son effet de reconnaissance dans le fil et permet de sortir un épisode en
changeant quelques lignes de JSON.

Ces vidéos alimentent le plan de `CAMPAGNE_MARKETING_LANCEMENT.md` (section 7,
« Douze vidéos prêtes à tourner », format 1080 × 1920). Un épisode dure ~10 s,
soit sous la fourchette de 15–25 s du plan de campagne : choix assumé, dicté par
la limite native des modèles vidéo et par le coût d'itération. Le format court
reste performant sur TikTok.

## Décisions structurantes

| Question | Décision |
|---|---|
| Rendu | Style illustré du jeu (cohérent avec décors, personas, cartes postales déjà générés) |
| Unité de production | Un plan continu de ~8 s + carte de fin de 2 s |
| Son | Dialogue parlé généré nativement par le modèle vidéo, doublé d'un sous-titre incrusté |
| Objets | Tirés du catalogue du jeu (`docs/items-catalogue.csv` + `public/items/*.webp`) |
| Acheteur | Décrit librement dans l'épisode ; un identifiant de `scripts/clients-prompts.json` est accepté à la place |
| Architecture | Deux étages : image maître → animation image-to-video |

### Pourquoi deux étages

Une image coûte des centimes, une vidéo Veo se facture à la seconde. En
composant d'abord l'image de départ et en la validant à l'œil, on itère sur
l'étage bon marché et on ne paie la vidéo qu'une fois le cadre juste. Le décor
étant toujours dérivé de la même image de référence, il reste rigoureusement
identique d'un épisode à l'autre — approche déjà éprouvée dans le repo par le
champ `reference` de `scripts/generate-brocante-scenes.mjs`.

## Modèles

Vérifiés disponibles sur la clé `GEMINI_API_KEY` du `.env` (2026-07-27) :

- **Image** : `gemini-3-pro-image` (défaut), `gemini-2.5-flash-image` (rapide).
- **Vidéo** : `veo-3.1-fast-generate-preview` (défaut), `veo-3.1-generate-preview`
  (prise finale), `veo-3.1-lite-generate-preview`.

L'appel vidéo est asynchrone : `ai.models.generateVideos()` rend une opération à
sonder jusqu'à complétion, puis le fichier est téléchargé. Le script gère
l'attente avec un compte-rendu de progression.

## Le plan fixe

Format 9:16 vertical, style illustré du jeu. De bas en haut :

| Zone | Hauteur | Contenu | Statut |
|---|---|---|---|
| Amorce | ~25 % | Plateau de l'étal en trois-quarts plongeant, nappe, caisse à monnaie, épaules et mains du vendeur en amorce sombre dans les coins bas | figé |
| Étal | ~45 % | Les objets en vente sur la nappe | **variable 1** |
| Visiteur | ~20 % | L'espace derrière la table, à hauteur de buste, où se plante l'acheteur | **variable 2** |
| Fond | ~10 % | La rue de brocante : stands, passants, arbres, façades | structure figée, animation libre |

L'amorce du vendeur est ce qui installe le POV : le spectateur est *derrière* la
table, à sa place.

**Caméra strictement fixe.** Le prompt vidéo interdit explicitement tout
mouvement d'appareil : pas de panoramique, pas de zoom, pas de recadrage, pas de
tremblement. Seuls bougent l'acheteur, les mains et la vie d'arrière-plan.

## Arborescence

Rien ne va dans `public/` : ces fichiers ne doivent pas entrer dans le bundle
iOS.

```
scripts/generate-reels.mjs        le script
scripts/reels-prompts.json        le seul fichier édité au quotidien
marketing/reels/master/           image de référence + étals composés
marketing/reels/out/              prises vidéo, journaux, mp4 finaux
marketing/reels/musique/          mp3 optionnels mixés au montage
```

## Format de `scripts/reels-prompts.json`

```json
{
  "decor": "<bloc décor figé, injecté dans chaque prompt image>",
  "camera": "<bloc contraintes de caméra et de style, injecté dans chaque prompt vidéo>",
  "episodes": [
    {
      "id": "ep01-juste-prix",
      "items": ["art.aquarelle_marine_xixe", "mu.violon_etude", "li.malle_voyage"],
      "vedette": "art.aquarelle_marine_xixe",
      "acheteur": "une femme d'une trentaine d'années, veste en jean délavé, chignon défait, lunettes rondes, sac en toile",
      "action": "elle soulève l'aquarelle à deux mains et la penche vers la lumière",
      "replique": "Elle est signée, celle-là… vous en voulez combien ?",
      "accroche": "Vous la vendez combien ?",
      "chute": "auto",
      "fond": "matin d'automne, lumière rasante, deux passants au loin"
    }
  ]
}
```

Les blocs `decor` et `camera` sont stockés une seule fois : corriger un défaut de
style se fait à un seul endroit pour toute la série.

### Résolution des champs

- **`items`** — chaque identifiant est cherché dans `docs/items-catalogue.csv`
  (colonne `templateId`, séparateur `;`) ; l'image correspondante
  `public/items/<templateId>.webp` est envoyée **en image d'entrée** au modèle,
  avec l'image maître, et la consigne de poser ces objets sur la nappe. Un
  identifiant introuvable dans le CSV ou sans `.webp` est une erreur bloquante
  avec le nom fautif affiché.
- **`vedette`** — doit appartenir à `items`. Sert à l'`action` et à la chute.
- **`acheteur`** — si la chaîne correspond à un `id` de
  `scripts/clients-prompts.json`, sa description `desc` est utilisée ; sinon la
  chaîne est prise telle quelle.
- **`chute: "auto"`** — le script lit la colonne `prix_TresBon` de l'objet vedette
  et compose « Valeur réelle : N € », formulation neutre qui évite tout accord de
  genre. Toute autre chaîne est utilisée telle quelle.
- **`fond`** — variation d'ambiance libre (météo, heure, passants) ; ne doit pas
  décrire d'architecture, celle-ci venant du décor figé.

## Commandes

```
npm run gen:reels -- --master        régénère l'image de référence (rare)
npm run gen:reels -- --frame ep01    compose l'étal de l'épisode
npm run gen:reels -- --video ep01    anime la frame validée
npm run gen:reels -- --montage ep01  habille et exporte
npm run gen:reels -- ep01            enchaîne frame → video → montage
```

Drapeaux : `--force` (regénérer un fichier existant), `--model=pro|fast|lite`,
`--yes` (sauter la confirmation payante), `--dry-run` (afficher les prompts
résolus et le coût estimé sans appeler l'API).

L'itération rapide vit à l'étape `--frame` : changer trois identifiants d'objets,
relancer, regarder l'image. Tant que le cadre n'est pas bon, rien n'est dépensé.

## Garde-fous

- `--video` **refuse de démarrer** si l'image de l'épisode n'existe pas.
- Avant l'appel Veo, le script affiche modèle, durée et coût estimé, puis demande
  confirmation (sauf `--yes`).
- Le tarif à la seconde est une constante en tête de script, à caler sur la page
  de tarification Google. Le palier par défaut est le moins cher.
- **Une prise payée n'est jamais écrasée** : une relance écrit
  `ep01-take2.mp4`, `take3`… `--force` ne s'applique qu'aux images.
- Chaque prise dépose un `ep01-takeN.json` : prompt exact, modèle, date,
  identifiants sources. Traçabilité de ce qui produit un bon plan.
- Le script suit le patron des `generate-*.mjs` existants : chargement manuel du
  `.env`, absence de clé signalée clairement, sortie non nulle en cas d'échec.

## Montage

Passe `ffmpeg` sur le clip brut, gratuite et rejouable sans rien regénérer :

1. Mise à l'échelle et complétion en 1080 × 1920 exact, quel que soit le rendu de
   Veo.
2. **Accroche** incrustée dans le tiers haut, secondes 0 à 2, police
   `public/fonts/VerveShadow.ttf`.
3. **Réplique** en sous-titre bas à partir de la 2ᵉ seconde, ligne fixe sans
   timing au mot — le fil se regarde majoritairement en muet.
4. **Carte de fin** de 2 s : icône `public/icon-512.png`, la chute, la signature
   « Broc — Chaque objet a une histoire. » et le CTA. Gabarit unique, donc
   identique sur toute la série.
5. **Son** : fondu de sortie sur l'ambiance ; un mp3 déposé dans
   `marketing/reels/musique/` est mixé en dessous à faible niveau.

Sortie : `marketing/reels/out/ep01.mp4`, ~10 s, prêt à téléverser.

### Prérequis

`ffmpeg` n'est pas installé sur la machine (vérifié 2026-07-27) : un
`brew install ffmpeg` est nécessaire avant l'étape montage. Les étapes image et
vidéo n'en dépendent pas — sans ffmpeg, la pipeline reste utilisable et rend le
clip nu, l'étape montage échouant avec un message explicite.

## Ce que la pipeline ne fait pas

- Pas de publication automatique vers Instagram ou TikTok : l'export est manuel.
- Pas de multi-plans ni de montage narratif : un épisode est un plan continu.
- Pas de sous-titrage mot à mot ni de traduction : les épisodes sont en français.
- Pas de génération de l'accroche ou de la réplique : c'est de l'écriture, elle
  reste à la main dans le JSON.

## Vérification

- `--dry-run` sur un épisode témoin affiche les prompts résolus, les chemins
  d'images d'entrée trouvés et la cote lue dans le CSV — vérifiable sans dépense.
- Un identifiant d'objet inexistant échoue avec un message nommant le fautif.
- `--video` sans frame préalable échoue sans appeler l'API.
- Recette manuelle sur un premier épisode complet : image validée à l'œil, clip
  regardé, mp4 final lu sur téléphone en 9:16.
