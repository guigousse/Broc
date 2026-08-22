# La borne d'arcade — conception

> Chantier ⑤ annoncé par `2026-08-20-bazar-decor-design.md`, qui avait réservé
> un emplacement vide contre le mur du coin arcade. Le meuble y est posé depuis
> le 2026-08-22 (`feat/borne-arcade-bazar`, décor muet). Ce document conçoit ce
> qui se passe quand on tape dessus.

## Pourquoi

La zone gauche du Bazar s'appelle « arcade » et ne contenait qu'une
bibliothèque, un pan de mur et, depuis ce matin, une borne qu'on ne peut pas
toucher. Le nom promet quelque chose que le lieu ne tient pas.

Par ailleurs le catalogue contient **onze jeux vidéo** dispersés parmi 52 objets
de la catégorie « Jeux & Loisirs ». Rien ne les rassemble aujourd'hui : ils se
noient dans la grille de collection au milieu des poupées et des soldats de
plomb. La borne leur donne une vitrine, et transforme onze objets épars en une
série qu'on cherche à compléter.

## Périmètre

**Dans le périmètre :** l'ouverture au tap, la façade illustrée à trou alpha, le
carrousel un-jeu-à-la-fois, les onze fausses captures en pixel art, l'état
inconnu, la sortie.

**Hors périmètre :** les mini-jeux jouables (ils viendront plus tard, dans cette
coquille), toute récompense de complétion, et les dix *machines* du catalogue
(consoles, flipper, mini-borne) — ce sont des objets à collectionner, pas des
jeux à afficher sur un écran.

**Ce que ce chantier n'ajoute PAS :** aucun champ de sauvegarde, aucune
migration, aucun équilibrage. La borne ne fait que **lire** la collection.

## 1. Le contenu

### Les onze jeux, et pourquoi une constante

`JEUX_ARCADE` est une **constante ordonnée** d'identifiants de templates, pas un
filtre calculé sur le catalogue :

| n° | templateId | génération |
|----|------------|-----------|
| 01 | `jx.cartouche_bluebot_8_bit` | 8-bit |
| 02 | `jx.cartouche_la_legende_de_solda_8_bit` | 8-bit |
| 03 | `jx.cartouche_le_plombier_sauteur_8_bit` | 8-bit |
| 04 | `jx.cartouche_turbo_herisson_16_bit` | 16-bit |
| 05 | `jx.cartouche_street_castagne_ii_16_bit` | 16-bit |
| 06 | `jx.cartouche_gachette_du_temps_rpg_16_bit` | 16-bit |
| 07 | `jx.jeu_le_manoir_du_mal_32_bit` | 32-bit |
| 08 | `jx.jeu_foxy_crush_32_bit` | 32-bit |
| 09 | `jx.jeu_engrenage_de_metal_infiltration_32_bit` | 32-bit |
| 10 | `jx.jeu_solda_flute_temporelle_aventure_3d_64_bit` | 64-bit |
| 11 | `jx.jeu_d_aventure_japonais_128_bit` | 128-bit |

L'ordre suit les générations de console. Ce n'est pas de la coquetterie : il
donne au parcours de gauche à droite le sens d'une chronologie, et il place les
trois 8-bit — les moins chers, donc les premiers trouvés — en tête de liste.

**Pourquoi une constante et non un filtre.** Un filtre du genre « tous les `jx.*`
dont le nom contient `bit` » se réécrirait tout seul le jour où le catalogue
bouge : ajouter un jeu renumérote la série, et le n° 3 du joueur devient le n° 4.
« 03 / 11 » ne veut alors plus rien dire, et une capture d'écran postée par un
joueur devient fausse. Un test garde l'inverse du risque : chaque identifiant de
la constante doit encore exister dans `objetTemplates`.

### Trouvé ou inconnu

Un jeu est **trouvé** quand son slot de collection porte une donation
(`collection[categorie][i].donation !== null`) — la collection au sens strict du
jeu, pas « déjà possédé ». Un jeu acheté puis revendu redevient inconnu, et
c'est l'intention : la borne est le tableau de chasse de la collection, elle
récompense le geste de donner, pas celui de passer.

`CollectionSlot` porte déjà `vu`, `dejaPossede` et `donation` : la borne lit un
champ existant, elle n'en crée aucun.

## 2. La géométrie

C'est la partie qui peut se casser silencieusement, donc celle qui est écrite
le plus précisément.

### L'asset

`public/bazar/borne-facade.webp` — la borne vue en élévation de face, cadrée du
marquee au pupitre, avec un **trou alpha** à l'emplacement du CRT.

Fabrication (générateur Gemini, `gemini-3-pro-image-preview`, image demandée
en 4:3, le visuel de la borne du décor en référence pour garder le même
dessin). Attention à ne pas confondre deux ratios qui n'ont rien à voir : le
4:3 est celui de l'IMAGE commandée au modèle ; le caisson qui en ressort, une
fois détouré et rogné, a le sien (0,939), et c'est celui-là qui pilote le
composant.

- l'écran est demandé en **magenta uni** et le fond en **vert uni** — jamais en
  « fond transparent ». Gemini *peint un damier* quand on lui demande de la
  transparence, et rend une image parfaitement opaque. Constaté le 2026-08-22
  sur les trois premiers tirages, déjà constaté sur les profils de camions.
- le fond vert part par **diffusion depuis les bords**, pas par sélection de
  couleur : le pupitre porte des boutons verts qu'une sélection globale
  percerait aussi.
- le magenta, lui, part par sélection : il n'apparaît nulle part ailleurs.

Mesures de l'asset retenu : caisson **1681 × 1791** (ratio **0,939**), écran
**1204 × 886** (ratio 1,36), soit 72 % de la largeur du caisson.

### Les quatre nombres

Le trou, en pourcentages du caisson, **mesurés sur l'asset et non calés à l'œil** :

```
left 14,16 %   right 14,22 %   top 24,57 %   bottom 25,96 %
```

Ils vivent dans une constante à côté du ratio du caisson, avec un commentaire
disant comment les re-mesurer. Un test garde leur cohérence (somme des insets
horizontaux < 100, idem vertical, et le rapport résultant proche de 4:3).

### La règle de dimensionnement — on cale le TROU, pas le caisson

Le caisson n'a **pas** à tenir dans l'écran du téléphone : il a le droit de
déborder sur les côtés, du moment que l'écran de la borne est visible en entier
(exigence explicite de l'auteur, 2026-08-22).

La boîte est donc agrandie jusqu'à ce que **le trou occupe ~92 % de la largeur
disponible**, puis centrée sur le trou ; le bois sort du cadre à gauche et à
droite. Sur un iPhone de 393 × 760 : caisson 505 × 538 (débordant de 56 px de
chaque côté), écran utile **362 × 266**.

Une seconde contrainte borne la première : **le caisson entier doit tenir en
hauteur**. Si la mise à l'échelle par la largeur donne un caisson plus haut que
la place disponible, on retombe sur la hauteur. Ce n'est pas une précaution
théorique — c'est ce qui garantit que le marquee et le pupitre restent visibles,
et donc qu'on reconnaît une borne. Sur un téléphone la première règle gagne
(538 px de caisson pour 760 disponibles) ; sur un écran large et court, la
seconde.

### L'ordre d'empilement

**L'interface est DESSOUS, l'image du caisson DESSUS**, avec
`pointer-events: none` sur l'image.

C'est ce qui fait que les boules des joysticks — qui montent devant le bas de
l'écran dans le dessin — masquent l'interface sans qu'aucun masque n'ait à être
fabriqué. Le trou *est* le masque. Le corollaire vaut pour tout ce qu'on
peindra plus tard devant la vitre : reflet, poussière, fêlure.

`pointer-events: none` n'est pas décoratif : sans lui l'image avale les taps
destinés aux flèches qui sont dessous.

## 3. L'écran

### Un jeu à la fois

Le motif est celui du **carrousel de chinage**, déjà connu du joueur : un
élément à la fois, flèches ‹ ›, repère « i / n », **bornes strictes sans
boucle** — la flèche s'éteint au bout — et le swipe en plus des flèches.

Disposition, de haut en bas :

- la **capture**, plein cadre, occupant toute la hauteur moins la barre du bas ;
- une **barre de pilotage** : le titre sur sa ligne, puis `‹  03 / 11  ›`, les
  flèches au même niveau que la numérotation et repoussées contre les bords du
  trou. Elles ne flottent pas sur l'image : la capture reste dégagée.

### Jeu inconnu

Neige animée et « PAS DE SIGNAL » à la place de la capture, `???` à la place du
titre. Le numéro reste : le joueur voit combien il lui en manque.

**La capture d'un jeu inconnu n'est pas chargée du tout** — pas seulement
cachée. Une image posée dans le DOM avec `display:none` reste visible dans
l'onglet réseau, et le contenu à découvrir fuiterait pour qui regarde.

### La langue, et pourquoi pas de police pixel

Les titres viennent du catalogue et sont donc traduits en FR/EN/ES/EL. **Aucune
police d'arcade ne couvre le grec** : le look CRT vient du *rendu* — phosphore
vert, lignes de balayage, capitales, interlettrage — sur la pile monospace du
système, jamais d'une police latine importée.

Les deux chaînes propres à cet écran (« PAS DE SIGNAL » et le libellé des
flèches) rejoignent les quatre dictionnaires. `???` n'est pas une chaîne
traduite : c'est un symbole, il reste identique partout.

## 4. Les onze captures

`public/bazar/arcade/{templateId}.webp`, une par jeu.

**Générées en un seul brief**, pas une par une : elles doivent avoir l'air de
tourner sur la même machine. Le brief commun impose une palette **16-bit
franche** (choix de l'auteur contre l'option monochrome vert), de gros pixels
carrés, une scène de jeu lisible d'un coup d'œil, et le **format exact de la
zone d'affichage** pour n'être jamais rognées.

Chaque jeu reçoit sa scène, dérivée de son titre : la boucle du hérisson turbo,
le plombier sur ses briques, le manoir et sa lune, la flûte de Solda…

Un test vérifie qu'il existe un fichier pour chacun des onze identifiants —
c'est le genre d'oubli qui ne se voit qu'au onzième swipe.

## 5. Entrée et sortie

**Entrée.** `BorneArcade` — la borne posée dans le décor du Bazar — est
aujourd'hui une image muette. Elle devient un bouton portant un nom accessible
qui dit ce qu'il ouvre. Ne pas la confondre avec la façade du plein écran, qui
est un second visuel et qui, elle, reste muette (voir ci-dessous).

**Sortie.** Trois voies, dont une visible :

- une **croix en haut à droite**, posée sur le fond flouté **hors du caisson** —
  visible, atteignable, et jamais confondue avec un élément du meuble ;
- le tap sur le fond flouté ;
- la touche Échap.

**Accessibilité.** `role="dialog"`, focus piégé, image du caisson `alt=""`,
flèches nommées, et le titre du jeu sélectionné annoncé à chaque changement —
sans quoi un joueur non-voyant swipe dans le vide. Ce qui est masqué
visuellement par les joysticks ne l'est pas pour un lecteur d'écran : c'est un
recouvrement de pixels, pas un retrait du DOM.

## 6. Découpage

1. **La façade** — génération, découpe des deux couleurs, mesure du trou, asset
   dans `public/bazar/`, entrée dans le générateur pour qu'il soit reproductible.
2. **Le socle** — `JEUX_ARCADE`, la lecture de la collection, les tests de
   cohérence catalogue.
3. **La coquille** — le plein écran, la géométrie, l'empilement, les sorties.
4. **Le carrousel** — flèches, compteur, bornes, swipe, état inconnu.
5. **Les captures** — les onze images et leur test de présence.
6. **L'entrée** — la borne du décor devient un bouton.

Les étapes 1 et 2 sont indépendantes ; 3 dépend de 1, 4 de 3, 5 de 2, 6 de 3.

## 7. Ce qui reste ouvert

- **Le nombre onze n'est pas gravé.** Si le catalogue gagne des jeux vidéo, la
  constante devra être étendue à la main, et l'ajout se fera **en fin de liste**
  pour ne pas renuméroter ce que les joueurs connaissent déjà.
- **La borne suit le Bazar.** Elle hérite de son cadenas (J+20) sans rien
  ajouter : hors du Bazar, elle n'est pas atteignable.
- **Les mini-jeux.** Le jour où une ligne devient jouable, c'est la barre de
  pilotage qui accueillera le bouton — la coquille n'a pas à bouger.
