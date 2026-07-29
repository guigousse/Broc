# Visuels App Store — conception

Date : 2026-07-29
Statut : conception validée, prête pour le plan d'implémentation

## Objectif

Produire les captures de la fiche App Store de Broc : cinq visuels qui donnent
un aperçu du jeu, chacun avec un grand titre en haut et de vrais assets de
l'application, déclinés pour iPhone et iPad dans les quatre langues de la
fiche. Objectif business : maximiser le taux de téléchargement.

Livrable : **40 fichiers PNG** (5 visuels × 2 appareils × 4 langues).

## Décisions figées

| Sujet | Décision |
|---|---|
| Écran de jeu | Vraies captures de l'application, pilotées par Playwright |
| Gabarit | Fond sombre chaud, titre Cinzel centré en haut, filet doré, châssis d'appareil au centre, grand-père détouré au premier plan bas-gauche |
| Châssis | iPhone (Dynamic Island, bord titane, boutons latéraux) sur les visuels iPhone ; **châssis d'iPad** sur les visuels iPad |
| Grand-père | Sur les cinq visuels, en fil rouge, avec une expression différente par visuel |
| Coin bas-droit | Laissé vide — pas d'objet, pas de logo, pas de cachet |
| Langues | FR, EN, ES, EL |
| Visuel 5 | Seule dérogation au gabarit : galerie de médaillons, pas de châssis |

## Le gabarit

Fond : dégradé `#1e1208 → #3a2310 → #6b4720 → #8a5c2a` à 172°, plus un halo
radial chaud centré haut.

Titre : Cinzel 700, centré, `#f8ead0`, ombre portée douce, sur deux lignes
maximum, occupant la bande 4 %–15 % de la hauteur. Filet doré dégradé
(transparent → `#cfa863` → transparent) juste en dessous.

Châssis : centré horizontalement, 70 % de la largeur du visuel, haut à 18 %.
Bord titane en dégradé à 150°, coque noire, écran au ratio exact de l'appareil.
Dynamic Island, barre d'accueil, et les quatre boutons latéraux (silencieux,
volume haut, volume bas, veille).

Grand-père : détouré, bas-gauche, débordant du cadre (`bottom: -3%`,
`left: -10%`, largeur 52 %), ombre portée marquée. Il passe devant le châssis.

Bulle de dialogue (visuel 5 seulement) : fond `#FBF7EE`, bord `#C5A059` de
2 px, rayon 14 px, pointe triangulaire dirigée vers le grand-père, texte Caveat.

### Adaptation au format iPad

Les deux formats n'ont pas du tout le même ratio : 0,462 pour l'iPhone
(1242 × 2688), 0,750 pour l'iPad (2064 × 2752). Le gabarit ne peut donc pas être
mis à l'échelle tel quel — le châssis dimensionné à 70 % de la largeur
déborderait de la hauteur sur iPad.

Règle : sur iPhone le châssis est **dimensionné par sa largeur** (70 %), sur
iPad il l'est **par sa hauteur** (60 % de la hauteur du visuel), sa largeur
découlant du ratio de l'écran iPad. Les autres ajustements iPad :

| Élément | iPhone | iPad |
|---|---|---|
| Bande de titre | 4 %–15 % de la hauteur | 4 %–13 % de la hauteur |
| Châssis | largeur 70 %, haut à 18 % | hauteur 60 %, haut à 17 %, centré |
| Grand-père | largeur 52 % | largeur 40 % |
| Grille du visuel 5 | 4 × 4 | 5 × 4 |

Le châssis d'iPad se distingue du modèle iPhone : bords égaux sur les quatre
côtés, pas de Dynamic Island, coins nettement moins arrondis, deux boutons
seulement (volume et veille).

## Les cinq visuels

L'ordre place **Négocier en deuxième** et non en quatrième : c'est la mécanique
la plus distinctive du jeu, et les deux premières vignettes sont les seules que
la plupart des visiteurs voient sans faire défiler.

| # | Écran capturé | Route | Expression |
|---|---|---|---|
| 1 | Chinage — objet en gros, prix, boutons Négocier / Acheter | `/chiner/[brocanteId]` | souriant |
| 2 | Tiroir de négociation — vendeur, réplique, jauge d'humeur | `/chiner/[brocanteId]`, tiroir ouvert | rieur |
| 3 | L'étal — client, offre en cours | `/vitrine/[brocanteId]/journee` | ému |
| 4 | La collection — étagères, grille, raretés | `/collection` | songeur |
| 5 | *(aucun — galerie de médaillons)* | — | souriant |

### Contenu du visuel 1

L'objet mis en avant est le **vase Ming** (`uniq.ma.vase_ming_dynasty.webp`,
objet unique) au prix affiché de **2 500 €**. La carte porte le nom, le prix
seul sur sa ligne, puis les deux boutons `Négocier` et `Acheter 2 500 €`. Aucune
ligne d'estimation de valeur.

### Contenu du visuel 5

Grille de **4 × 4 médaillons** ronds cerclés d'or : 15 portraits de personnages
et, en seizième position, un médaillon **« et + »** — cercle en pointillés
doré, fond sombre, sans portrait. Grand-père au premier plan, bulle de dialogue
à droite.

Le compte annoncé est **31 personnages uniques** : 10 vendeurs nommés,
16 clients, 5 commanditaires (dont le grand-père). `vendeur-mystere` et
`client-inconnu` sont exclus, ce sont des silhouettes de repli utilisées par
`personaIllustrations.ts`.

Les 15 portraits affichés, dans cet ordre de lecture (9 vendeurs, 4 clients,
2 commanditaires) :

`vendeur-antiquaire`, `vendeur-bonimenteur`, `vendeur-disquaire`,
`vendeur-grincheux`, `vendeur-malin`, `vendeur-naif`, `vendeur-pipelette`,
`vendeur-videcave`, `vendeur-bonhomme`, `client-galeriste`,
`client-bibliophile`, `client-snob_bourgeois`, `client-gamer_nostalgique`,
`client-passionnee_artdeco`, `commanditaires/mode`.

Sur iPad, la grille passe à 5 × 4 : les quatre portraits supplémentaires sont
`client-retraite_chineur`, `client-touriste_perdu`, `vendeur-mamie` et
`commanditaires/art`, le médaillon « et + » restant en dernière position.

## Les textes

**Les versions EN, ES et EL sont à valider** — ce sont des propositions, pas des
traductions littérales.

L'écran de jeu capturé doit lui aussi être dans la langue du visuel : un titre
anglais au-dessus d'une interface française serait incohérent. La capture est
donc refaite pour chaque langue, en écrivant la clé `projet-broc:langue:v1`
(valeur `{"locale":"<langue>"}`) dans le `localStorage` en même temps que la
sauvegarde de démo. Cela porte le total à **40 captures** et non 10.

| # | FR | EN | ES | EL |
|---|---|---|---|---|
| 1 | Dénichez des trésors oubliés | Uncover forgotten treasures | Descubre tesoros olvidados | Ανακαλύψτε ξεχασμένους θησαυρούς |
| 2 | Négociez chaque euro | Haggle for every euro | Regatea hasta el último euro | Παζαρέψτε για κάθε ευρώ |
| 3 | Tenez votre propre stand | Run your own stall | Monta tu propio puesto | Στήστε τον δικό σας πάγκο |
| 4 | Complétez votre collection | Complete your collection | Completa tu colección | Ολοκληρώστε τη συλλογή σας |
| 5 | 31 personnages uniques à rencontrer | 31 unique characters to meet | 31 personajes únicos por conocer | 31 μοναδικοί χαρακτήρες |

Bulle du visuel 5 :

| FR | EN | ES | EL |
|---|---|---|---|
| Méfie-toi de celui qui sourit le plus | Beware the one who smiles the most | Desconfía del que más sonríe | Να φυλάγεσαι απ' αυτόν που χαμογελάει πιο πολύ |

### Typographie et grec

Le fichier de fontes Cinzel ne contient aucun glyphe grec, mais **le projet a
déjà résolu le problème** : `globals.css` déclare, sous le nom de famille
`Cinzel`, deux `@font-face` supplémentaires pointant sur GFS Didot avec la plage
Unicode grecque (`U+0370-03FF` et `U+1F00-1FFF`). Le même mécanisme existe pour
`Caveat`, servie en grec par l'italique d'EB Garamond, et pour
`Cormorant Garamond`. Demander « Cinzel » suffit donc : le grec bascule seul sur
la fonte de substitution, sans aucun cas particulier.

Le gabarit n'embarque donc pas sa propre liste de fontes. Il **extrait les blocs
`@font-face` de `src/app/globals.css`** pour les familles dont il a besoin
(`Cinzel`, `Caveat`) et réécrit les URL `/fonts/google/…` en chemins absolus.
Conséquence : la typographie des visuels reste par construction identique à
celle du jeu, y compris si les fontes changent un jour.

## Le pipeline

Un script `scripts/marketing-shots.mjs`, dans le style des autres scripts du
dépôt (Node ESM, `sharp` et `playwright` déjà en dépendances).

### Étape A — captures de l'application

1. Vérifier la présence de `out/` (sinon inviter à lancer `npm run build`).
2. Régénérer la sauvegarde de démo : `npx tsx scripts/gen-save-demo.ts >
   scripts/save-demo.json` (partie niveau 75, ~1/4 de la collection, stand
   garni).
3. Servir `out/` sur un port local via un petit serveur statique Node.
4. Lancer Playwright Chromium. Pour chaque appareil, créer un contexte avec le
   viewport et la densité voulus :
   - iPhone 6,5" : `viewport 414×896`, `deviceScaleFactor 3` → **1242 × 2688**
   - iPad Pro 13" : `viewport 1032×1376`, `deviceScaleFactor 2` → **2064 × 2752**
5. Injecter la save avant hydratation via `page.addInitScript`, en écrivant les
   trois clés que `seed-demo-sim.sh` utilise déjà :
   `projet-broc:slot:1:v1`, `projet-broc:slot:1:v1:backup`,
   `projet-broc:slots:v1`, plus `projet-broc:langue:v1` pour la langue.
6. Naviguer vers chaque route, attendre un sélecteur stable propre à l'écran,
   puis `page.screenshot()`.

Les sélecteurs d'attente sont choisis **indépendants de la langue** : ils visent
des chemins d'images (`img[src*="/items/"]`, `img[src*="/personas/clients/"]`,
`img[src*="/items/thumbs/"]`) plutôt que du texte traduit. Aucune modification
du code de l'application n'est nécessaire.

Le visuel 2 demande une interaction : ouvrir le tiroir de négociation en
cliquant le bouton `Négocier`, dont le libellé est traduit (`Négocier`,
`Haggle`, `Regatear`, `Παζάρεμα`). Ces quatre libellés sont recopiés dans le
module de textes du pipeline, et un test les compare aux fichiers
`src/lib/i18n/ui/<langue>.ts` pour qu'un renommage dans le jeu casse le test
plutôt que la capture.

Le repli, si l'export statique refuse de tourner dans un Chromium nu, est de
faire pointer le script sur `next dev` — le contrat du script ne change pas.

### Étape B — composition

Un gabarit HTML unique, paramétré par langue / appareil / visuel, rendu par le
même Playwright directement aux dimensions finales, la capture de l'étape A
injectée dedans en `background-image` sur `data:` URI. Export PNG.

Une seule technologie pour les deux étapes, aucune manipulation pixel à pixel.

### Étape C — sortie et contrôle

```
marketing/appstore/
  fr/
    iphone-6.5/  01-chiner.png  02-negocier.png  03-vendre.png  04-collection.png  05-personnages.png
    ipad-13/     (idem)
  en/ es/ el/    (idem)
```

Contrôle automatique en fin de script, via `sharp`, sur les 40 fichiers :
dimensions exactes attendues, espace colorimétrique sRGB, et **absence de canal
alpha** — Apple refuse les captures avec transparence.

### Options de ligne de commande

`--lang=fr,en` · `--device=iphone,ipad` · `--only=1,5` · `--skip-capture`
(recomposer sans relancer le navigateur sur l'app).

## Préalable : le grand-père en haute définition

Les portraits actuels plafonnent à 446 px de côté (`emu` 446, `souriant` et
`rieur` 420, `songeur` 319). Sur un visuel de 1242 px de large, le grand-père en
occupe environ 700 px ; sur iPad, environ 1 200 px. La source est insuffisante.

Génération de quatre portraits haute définition via l'API Gemini, en
**image-to-image** depuis les portraits existants pour préserver l'identité —
c'est la technique déjà employée par `generate-client-personas.mjs` pour les
variantes fâchées. Même chaîne : fond magenta, chroma-key, export webp.
`GEMINI_API_KEY` est déjà présent dans `.env`.

- Cible : ~2048 px de côté, quatre expressions (souriant, rieur, ému, songeur).
- Sortie : `public/personas/grand-pere/hd/<expression>.webp`, à côté des
  originaux et sans les remplacer — l'application continue d'utiliser les
  fichiers actuels.
- **Point de contrôle obligatoire** : validation visuelle des quatre portraits
  avant de lancer la production des 40 images. Le risque connu est la dérive de
  ressemblance et le liseré de détourage.

## Points signalés, laissés en l'état

- **Les atouts s'affichent en emoji** (🔍 🧹 💬) dans la barre du bas du jeu,
  car `public/competences/atout.*.webp` n'existe pas et `SkillDock` retombe sur
  `emojiFallback`. C'est fidèle à ce que voit un joueur. Sur une capture
  marketing le rendu est un peu brut, mais rien n'est modifié sans demande
  explicite.

## Hors périmètre

- La vidéo App Store de 20 secondes.
- Les trois pages produit personnalisées.
- La rédaction de la fiche elle-même (nom, sous-titre, description,
  mots-clés) — traitée dans `docs/appstore/FICHE_APP_STORE.md`.
- Les deux visuels restants du plan marketing initial, qui en prévoyait sept
  (« Redonnez vie à vos trouvailles » et « Percez un secret de famille »). Le
  gabarit et le pipeline les accueilleront sans modification si tu les veux
  plus tard.
