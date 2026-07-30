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
« Douze vidéos prêtes à tourner », format 1080 × 1920, 15–25 s).

## Décisions structurantes

| Question | Décision |
|---|---|
| Rendu | Style illustré du jeu (cohérent avec décors, personas, cartes postales déjà générés) |
| Unité de production | **Deux plans de 8 s raccordés** + carte de fin de 2 s ≈ 18 s |
| Son | Dialogue parlé généré nativement par le modèle, doublé d'un sous-titre incrusté |
| Voix du vendeur | Voix off, hors champ — le vendeur n'apparaît jamais, seul le chineur est animé |
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
- **Vidéo** : `veo-3.1-lite-generate-preview` (défaut), `veo-3.1-fast-generate-preview`
  (prise finale), `veo-3.1-generate-preview` (exceptionnel).

L'appel vidéo est asynchrone : `ai.models.generateVideos()` rend une opération à
sonder jusqu'à complétion, puis le fichier est téléchargé. Le script gère
l'attente avec un compte-rendu de progression.

### Tarifs et stratégie de paliers

Relevés sur la page de tarification Google le 2026-07-27, par seconde de vidéo,
audio inclus :

| Palier | 720p | 1080p | Un plan de 8 s en 1080p | Un épisode (2 plans) |
|---|---|---|---|---|
| Lite | 0,05 $ | 0,08 $ | 0,64 $ | ≈ 1,30 $ |
| Fast | 0,10 $ | 0,12 $ | 0,96 $ | ≈ 1,90 $ |
| Standard | 0,40 $ | 0,40 $ | 3,20 $ | ≈ 6,40 $ |

Images : 0,134 $ par étal composé en `gemini-3-pro-image`, 0,039 $ en
`gemini-2.5-flash-image`. Négligeable — dix essais de cadrage coûtent moins qu'une
seconde de Veo Standard.

**Stratégie en deux temps, qui est la raison d'être des paliers :**

1. **Brouillon en Lite 720p** — 0,40 $ le plan. C'est là qu'on juge si le chineur
   fait le bon geste, si la réplique tombe bien, si le raccord tient. Cinq essais
   coûtent deux euros.
2. **Prise finale en Fast 1080p** — uniquement une fois l'action validée.

Le Standard reste disponible mais n'est pas un défaut : à 3,20 $ le plan, il ne se
justifie que pour un épisode dont on sait déjà qu'il performe.

Le script affiche donc systématiquement palier, définition et coût estimé avant de
lancer, et rappelle en fin de course le cumul dépensé pour l'épisode (lu dans les
journaux de prises).

## Le plan fixe

Format 9:16 vertical, style illustré du jeu. De bas en haut :

| Zone | Hauteur | Contenu | Statut |
|---|---|---|---|
| Amorce | ~25 % | Plateau de l'étal en trois-quarts plongeant, nappe, caisse à monnaie, épaules et mains du vendeur en amorce sombre dans les coins bas | figé |
| Étal | ~45 % | Les objets en vente sur la nappe | **variable 1** |
| Visiteur | ~20 % | L'espace derrière la table, à hauteur de buste, où se plante l'acheteur | **variable 2** |
| Fond | ~10 % | La rue de brocante : stands, passants, arbres, façades | structure figée, animation libre |

L'amorce du vendeur est ce qui installe le POV : le spectateur est *derrière* la
table, à sa place. Le vendeur n'entre jamais dans le champ : ses mains restent en
amorce immobile et sa voix vient de derrière la caméra. Le modèle n'a donc qu'un
seul visage à animer, celui du chineur — c'est aussi ce qui supprime tout risque
de synchro labiale ratée côté vendeur.

**Caméra strictement fixe.** Le prompt vidéo interdit explicitement tout
mouvement d'appareil : pas de panoramique, pas de zoom, pas de recadrage, pas de
tremblement. Seuls bougent l'acheteur, les mains et la vie d'arrière-plan. C'est
aussi la condition technique du raccord entre les deux plans.

## Les deux plans

**Plan 1 — la demande.** Le chineur entre dans le champ, s'arrête devant l'étal,
prend l'objet vedette, l'examine et demande le prix. Le vendeur annonce son prix
en voix off.

**Plan 2 — le dénouement.** Trois issues possibles, déclarées dans l'épisode :

| `denouement` | Ce qui se passe | Carte de fin par défaut |
|---|---|---|
| `marchande` | Le chineur repose l'objet, hésite, propose un prix plus bas | « Vous auriez accepté ? » + appel au commentaire |
| `achete` | Le chineur sort son porte-monnaie, paie, repart avec l'objet | « Valeur réelle : N € » |
| `repart` | Le chineur repose l'objet, sourire gêné, s'éloigne du cadre | « Trop cher ? Ou l'affaire du jour ? » |

Le plan 1 se réutilise tel quel pour tester les trois dénouements sur le même
étal : trois vidéos pour un seul décor composé.

### Le raccord

Le plan 2 ne part pas d'un prompt : il part de **la dernière image du plan 1**,
extraite par `ffmpeg` et donnée comme image de départ à Veo. La caméra étant fixe
et le décor identique, la jointure est invisible — c'est la même image des deux
côtés de la coupe. Plus fiable que de demander au modèle de « continuer » la
scène.

Le raccord **sonore** est le point faible : chaque clip génère sa propre ambiance
et la coupe peut s'entendre. Trois mesures, cumulées :

1. fondu croisé audio de 0,2 s à la jointure ;
2. lit musical continu passant par-dessus la coupe ;
3. bloc d'ambiance identique dans les deux prompts (mêmes bruits, même densité de
   foule, même météo), pour que les deux fonds sonores soient déjà proches.

Si le raccord reste audible sur les premiers épisodes, le repli est de couper
entièrement l'audio du plan 2 sauf la réplique, et de laisser l'ambiance du plan 1
courir sous les deux — décision à prendre à la recette, pas maintenant.

## Arborescence

Rien ne va dans `public/` : ces fichiers ne doivent pas entrer dans le bundle
iOS.

```
scripts/generate-reels.mjs        le script
scripts/reels-prompts.json        le seul fichier édité au quotidien
marketing/reels/master/           image de référence + étals composés + frames de raccord
marketing/reels/out/              prises vidéo, journaux, mp4 finaux
marketing/reels/musique/          mp3 optionnels mixés au montage
```

Nommage des sorties d'un épisode :

```
master/_master-etal.png       le décor de référence, commun à la série
master/ep01-etal.png          l'étal composé de l'épisode (image de départ du plan 1)
master/ep01-raccord.png       la dernière image du plan 1 (image de départ du plan 2)
out/ep01-p1-take1.mp4         prises du plan 1
out/ep01-p2-take1.mp4         prises du plan 2
out/ep01.mp4                  le montage final
```

## Format de `scripts/reels-prompts.json`

```json
{
  "decor": "<bloc décor figé, injecté dans chaque prompt image>",
  "camera": "<bloc contraintes de caméra et de style, injecté dans chaque prompt vidéo>",
  "ambiance": "<bloc de fond sonore figé, injecté dans les deux plans>",
  "episodes": [
    {
      "id": "ep01-juste-prix",
      "items": ["art.aquarelle_marine_xixe", "mu.violon_etude", "li.malle_voyage"],
      "vedette": "art.aquarelle_marine_xixe",
      "acheteur": "une femme d'une trentaine d'années, veste en jean délavé, chignon défait, lunettes rondes, sac en toile",
      "fond": "matin d'automne, lumière rasante, deux passants au loin",
      "accroche": "Elle vaut combien, à votre avis ?",
      "plan1": {
        "action": "elle soulève l'aquarelle à deux mains et la penche vers la lumière",
        "demande": "Elle est signée, celle-là… vous en voulez combien ?",
        "prix": "Quarante euros."
      },
      "plan2": {
        "denouement": "marchande",
        "action": "elle repose l'aquarelle sur la nappe, croise les bras, sourire en coin",
        "replique": "Vingt-cinq, et je la prends tout de suite."
      },
      "chute": "auto"
    }
  ]
}
```

Les blocs `decor`, `camera` et `ambiance` sont stockés une seule fois : corriger
un défaut de style ou de fond sonore se fait à un seul endroit pour toute la
série.

### Résolution des champs

- **`items`** — chaque identifiant est cherché dans `docs/items-catalogue.csv`
  (colonne `templateId`, séparateur `;`) ; l'image correspondante
  `public/items/<templateId>.webp` est envoyée **en image d'entrée** au modèle,
  avec l'image maître, et la consigne de poser ces objets sur la nappe. Un
  identifiant introuvable dans le CSV ou sans `.webp` est une erreur bloquante
  avec le nom fautif affiché.
- **`vedette`** — doit appartenir à `items`. Sert aux actions et à la chute.
- **`acheteur`** — si la chaîne correspond à un `id` de
  `scripts/clients-prompts.json`, sa description `desc` est utilisée ; sinon la
  chaîne est prise telle quelle.
- **`plan1.prix`** — dit en voix off par le vendeur, hors champ. Le prompt
  précise explicitement que la voix vient de derrière la caméra et qu'aucun
  personnage à l'écran ne la prononce.
- **`plan2.denouement`** — `marchande`, `achete` ou `repart`. Détermine la carte
  de fin par défaut et le squelette d'action injecté dans le prompt du plan 2.
- **`chute: "auto"`** — résolue selon le dénouement : pour `achete`, le script lit
  la colonne `prix_TresBon` de l'objet vedette et compose « Valeur réelle : N € »,
  formulation neutre qui évite tout accord de genre ; pour les deux autres, le
  texte du tableau ci-dessus. Toute autre chaîne est utilisée telle quelle.
- **`fond`** — variation d'ambiance visuelle libre (météo, heure, passants) ; ne
  doit pas décrire d'architecture, celle-ci venant du décor figé.

## Commandes

```
npm run gen:reels -- --master        régénère l'image de référence (rare)
npm run gen:reels -- --frame ep01    compose l'étal de l'épisode
npm run gen:reels -- --video ep01    plan 1, extraction du raccord, plan 2
npm run gen:reels -- --montage ep01  assemble, habille et exporte
npm run gen:reels -- ep01            enchaîne frame → video → montage
```

Drapeaux : `--force` (regénérer une image existante), `--model=lite|fast|pro`
(défaut `lite`), `--hd` (1080p, sinon 720p),
`--plan=1|2` (ne rejouer qu'un seul plan), `--take1=N --take2=N` (choisir les
prises à monter, la plus récente par défaut), `--yes` (sauter la confirmation
payante), `--dry-run` (afficher les prompts résolus et le coût estimé sans
appeler l'API).

L'itération rapide vit à l'étape `--frame` : changer trois identifiants d'objets,
relancer, regarder l'image. Tant que le cadre n'est pas bon, rien n'est dépensé.

## Garde-fous

- `--video` **refuse de démarrer** si l'image de l'épisode n'existe pas ;
  `--plan=2` refuse de démarrer si la frame de raccord n'existe pas.
- Avant les appels Veo, le script affiche modèle, nombre de plans, durée totale et
  coût estimé, puis demande confirmation (sauf `--yes`). Un épisode complet =
  **deux clips payés**.
- La grille tarifaire est une table de constantes en tête de script (palier ×
  définition), datée, à recaler si Google change ses prix. Le palier par défaut est
  Lite 720p, le moins cher.
- **Une prise payée n'est jamais écrasée** : une relance écrit
  `ep01-p1-take2.mp4`, `take3`… `--force` ne s'applique qu'aux images.
- Chaque prise dépose un `ep01-p1-takeN.json` : prompt exact, modèle, date,
  identifiants sources. Traçabilité de ce qui produit un bon plan.
- La frame de raccord est extraite de **la prise du plan 1 réellement retenue** :
  celle qui vient d'être générée lors d'un `--video` complet, ou celle désignée
  par `--take1=N`. Le nom de la prise source est inscrit dans le journal du
  plan 2 ; au montage, le script vérifie que le plan 2 retenu descend bien du
  plan 1 retenu, et refuse d'assembler deux prises qui ne se raccordent pas.
- Le script suit le patron des `generate-*.mjs` existants : chargement manuel du
  `.env`, absence de clé signalée clairement, sortie non nulle en cas d'échec.

## Montage

Passe `ffmpeg`, gratuite et rejouable sans rien regénérer :

1. Concaténation des deux plans, avec fondu croisé audio de 0,2 s à la jointure
   (coupe franche à l'image, puisque les deux frames sont identiques).
2. Mise à l'échelle et complétion en 1080 × 1920 exact, quel que soit le rendu de
   Veo.
3. **Accroche** incrustée dans le tiers haut, secondes 0 à 2, police
   `public/fonts/VerveShadow.ttf`.
4. **Sous-titres** en bas, ligne fixe par réplique et sans timing au mot : la
   demande du chineur, puis le prix du vendeur, puis la réplique du plan 2. Le fil
   se regarde majoritairement en muet — les sous-titres ne sont pas optionnels.
5. **Carte de fin** de 2 s : icône `public/icon-512.png`, la chute selon le
   dénouement, la signature « Broc — Chaque objet a une histoire. » et le CTA.
   Gabarit unique, donc identique sur toute la série.
6. **Son** : fondu de sortie sur l'ambiance ; un mp3 déposé dans
   `marketing/reels/musique/` est mixé en dessous à faible niveau et couvre la
   jointure.

Sortie : `marketing/reels/out/ep01.mp4`, ~18 s, prêt à téléverser.

### Prérequis

`ffmpeg` **n'est pas installé sur la machine** (vérifié 2026-07-27) et devient un
prérequis dur : c'est lui qui extrait la frame de raccord entre les deux plans,
donc sans lui il n'y a pas de plan 2 du tout. Un `brew install ffmpeg` est
nécessaire avant la première utilisation. Le script vérifie sa présence au
démarrage et s'arrête avec un message explicite s'il manque.

## Ce que la pipeline ne fait pas

- Pas de publication automatique vers Instagram ou TikTok : l'export est manuel.
- Pas de montage narratif au-delà des deux plans : pas de coupes internes, pas de
  plans de coupe, pas d'inserts.
- Pas de sous-titrage mot à mot ni de traduction : les épisodes sont en français.
- Pas de génération de l'accroche ni des répliques : c'est de l'écriture, elle
  reste à la main dans le JSON.

## Vérification

- `--dry-run` sur un épisode témoin affiche les deux prompts résolus, les chemins
  d'images d'entrée trouvés, la cote lue dans le CSV et le coût estimé — sans
  dépense.
- Un identifiant d'objet inexistant échoue avec un message nommant le fautif.
- `--video` sans frame préalable, et `--plan=2` sans frame de raccord, échouent
  sans appeler l'API.
- Recette manuelle sur un premier épisode complet : étal validé à l'œil, les deux
  plans regardés séparément, **puis le raccord jugé sur le mp4 final — image
  d'abord (aucun saut attendu), son ensuite (c'est là que ça peut s'entendre)**,
  et lecture sur téléphone en 9:16.
