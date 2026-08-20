# Le décor du Bazar — conception

> Suite du jalon ①+② (`2026-08-19-jetons-bazar-design.md`), qui a livré la
> monnaie et une boutique fonctionnelle mais **sans décor** : un titre, deux
> sous-titres, des boutons sans style. Ce document conçoit le lieu.

## Pourquoi

L'écran actuel du Bazar est du HTML nu, assumé par le plan précédent (« le lieu
se dessinera avec Guillaume »). La recette locale du 2026-08-20 a montré ce que
ça coûte : bourse vide, boutons `disabled`, et une boutique qui ne répond pas au
doigt sans dire pourquoi. Le décor n'est donc pas seulement une parure — c'est
lui qui rend l'offre lisible.

Le Bazar est aussi le seul lieu neuf depuis le bureau. Il doit tenir la
comparaison avec lui, sinon il sonnera comme un écran de menu déguisé.

## Périmètre

**Dans le périmètre :** le fond illustré, le châssis de panorama, la pose des
articles de la semaine dans la scène, l'état « hors de portée », la sortie par
la porte.

**Hors périmètre :** le vendeur (asset séparé, plus tard), la borne d'arcade
(asset séparé, chantier ⑤), les cartes et les timbres (chantiers ④ et ③), toute
retouche du contenu de l'étal (composition, prix, rotation — déjà livrés).

## 1. La scène

### Format

Une seule image `public/bazar/fond-bazar.webp`, **2752×1536**, exactement comme
`public/qg/fond-cabinet.webp`. Même chaîne de fabrication : `npm run gen:qg --
--model=pro --aspect=16:9 fond-bazar`, entrée ajoutée à `scripts/qg-prompts.json`.

Trois zones de swipe, centres à 1/6, 1/2, 5/6 de la largeur — la géométrie du
bureau, sans exception.

### Ce que chaque zone montre

**Gauche (0–33 %) — le coin jeux vidéo.** Mur latéral gauche qui fuit ; étagères
murales chargées de consoles, cartouches et figurines. Caisses de bric-à-brac
coupées par le bord gauche du cadre, en ancrage de premier plan (le rôle que
tient le bureau d'acajou dans le cabinet). **Un emplacement laissé vide** contre
le mur, sol dégagé, pour la borne d'arcade compositée plus tard.

**Centre (33–66 %) — le comptoir.** Le comptoir massif vu de face, **plateau de
bois nu** : pas de vitrine sous verre, rien dessus. Derrière lui, sur le mur du
fond **plat et frontal**, une étagère montée **haut**, divisée en **neuf cases
égales** (3 colonnes × 3 rangées), toutes **vides**. Entre le plateau du comptoir
et la première planche, une **bande de mur nu** à hauteur de buste : c'est là que
se tiendra le vendeur, sans masquer la marchandise. Au sol derrière le comptoir,
un espace dégagé de la largeur d'une personne. Une suspension au-dessus fait du
comptoir le point le plus lumineux de la boutique.

> **Révision du 2026-08-20**, à la vue des premiers tirages : Guillaume a
> supprimé la vitrine sous verre et demandé neuf cases. L'objet de la semaine ne
> vit donc plus sous le verre du comptoir mais **dans la case centrale** de la
> grille ; les trois lots de pièces occupent la **rangée du bas**. Les cinq cases
> restantes sont vides — elles accueilleront les paquets de cartes du chantier ④,
> et en attendant les trous font leur travail : ils appellent.

**Droite (66–100 %) — les antiquités.** Entassement d'horloges, malles, lampes
et cadres empilés vers 68–82 % : chargé en quantité, terne en couleur. Au centre
de la zone, **une table en bois au plateau vide et bien lisible**. Puis le mur
latéral droit qui fuit, avec **la porte d'entrée** et le jour qui entre par son
verre dépoli.

### Ce qui doit être tenu du bureau

Non négociable, sous peine d'un lieu qui ne semble pas appartenir au même jeu :

- **Un point de fuite au centre**, ligne d'horizon à ~57 % de la hauteur.
- La pièce lue comme **une boîte à trois murs** : latéraux qui fuient aux deux
  extrémités, mur du fond plat au milieu.
- **Corniche et parquet continus** d'un bord à l'autre, aucune couture verticale,
  aucun cadre de triptyque.
- **Lumière directionnelle haut-gauche**, cohérente sur toute la largeur.
- Rendu Art Déco : encre sépia, lavis doux, texture de papier, laiton et bois
  chaud.
- **Rien à cheval sur 33 % ni 66 %** — mur nu à ces deux abscisses. C'est la
  contrainte que le prompt du bureau appelle « breathing zones » : sans elle, le
  snap du swipe coupe un objet en deux.

### La couleur

Palette générale **assourdie**, plus terne encore que le cabinet. Les points qui
attirent l'œil ne sont pas peints dans le fond : ce sont **les éléments
compositées par-dessus** — les articles de la semaine, la borne, le vendeur — et
les deux sources de lumière naturelles de la scène (la suspension du comptoir, le
jour de la porte). Cette règle est ce qui garde le décor lisible quand on lui
ajoutera des objets plus tard.

### Les emplacements réservés

Deux, traités comme le fauteuil du cabinet l'a été (« un espace de sol vide
réservé pour un fauteuil qui sera composité plus tard ») :

| Réservé pour | Où | Contraintes de dessin |
|---|---|---|
| Le vendeur | Derrière le comptoir, zone centre | Sol dégagé large d'une personne, mur nu derrière, aucun objet devant lui, ligne de sol nette |
| La borne d'arcade | Contre le mur, zone gauche | Sol dégagé, mur nu, ombre portée au sol suggérée pour que l'asset s'y pose sans flotter |

### L'anachronisme, assumé

Une borne d'arcade dans une boutique de 1924 est un anachronisme. Le catalogue du
jeu en est déjà plein (consoles 128 bits, vinyles, cartes 'Pocket Monster') : la
boutique est cohérente avec le jeu, pas avec sa date. Décision prise en
connaissance de cause.

## 2. Le châssis

`UnifiedPanorama` fait déjà tout le travail difficile : scroll horizontal natif
avec `scroll-snap`, dimensionnement **par la hauteur** (l'astuce qui a réglé
l'iPad et la porte coupée), ancres de snap, remontée de l'index de zone, calage
des objets à la souris via `?qgedit=1`.

Il est câblé en dur sur le bureau : `src="/qg/fond-cabinet.webp"`, aspect
2752×1536, clés `bureau · porte · repos`.

**Décision : le généraliser, pas le copier.** Trois props neuves — `image`,
`aspect`, `zones` — avec les valeurs du bureau en défaut, donc aucun changement
d'appel côté `(qg)/layout.tsx`. Copier le composant dupliquerait exactement la
logique qui a coûté le plus cher à mettre au point.

Le Bazar l'instancie avec ses zones `arcade · comptoir · antiquites`, ouvertes
sur `comptoir`.

## 3. La pose des articles

### Aucune illustration nouvelle

Vérifié dans le code : les lots de pièces ont déjà leur visuel
(`PieceIcon` — engrenage laiton + badge de catégorie, dessiné en code, utilisé
par `PiecesInventoryBar`), et l'objet de vitrine a déjà son illustration détourée
dans `public/items/`. Les étagères n'ont donc qu'à être vides : le jeu pose
dessus ce qu'il possède déjà. C'est ce qui rend ce chantier abordable.

### Les emplacements

`src/components/bazar/bazarLayout.ts`, coordonnées en pourcentage de la scène,
sur le modèle de `brocantePanoramaLayout.ts` et de `qg/layout.ts` :

| Clé | Rôle |
|---|---|
| `case1` … `case9` | Les neuf cases de l'étagère, numérotées de gauche à droite puis de haut en bas. `case7`, `case8`, `case9` (rangée du bas) portent les trois lots de pièces ; `case5` (centre) porte l'objet de la semaine ; les cinq autres restent vides jusqu'au chantier ④ |
| `porte` | Sortie vers le bureau |
| `borne` | Réservé — muet pour l'instant |
| `table` | Réservé — muet pour l'instant |
| `vendeur` | Réservé — jamais rendu pour l'instant |

Les valeurs sont ajustées à l'œil avec l'outil de calage existant, pas devinées.

### Ce que le joueur voit et touche

- Chaque article est un **vrai `<button>`** avec son libellé complet — l'écran
  reste utilisable à VoiceOver, ce qu'une scène purement spatiale perdrait.
- Sous chaque article, une **étiquette de prix en jetons**.
- La **vitrine achetée** vide sa place et affiche « Vendu » (l'état existe déjà
  dans la save : `bazar.vitrine === null`).
- La **porte** ramène au bureau.
- La **borne** et la **table** ne répondent pas. Choix assumé : mieux vaut un
  décor muet qu'une porte qui ne mène nulle part.

### L'article hors de portée

Le défaut vécu à la recette du 2026-08-20 se referme ici. Un article dont le prix
dépasse la bourse est **désaturé, son prix barré**, et le toucher affiche une
bulle brève : « il te manque *n* jetons ». Une seule chaîne neuve, en quatre
langues. Le bouton reste `disabled` — la bulle est portée par un conteneur
cliquable, pas par le bouton inerte.

## 4. Tests

Les achats eux-mêmes sont déjà couverts (`achat.ts`, `GameContext.acheterAuBazar`,
`EtalBazar.test.tsx`) et ne sont pas retouchés.

S'ajoutent :

1. **Le panorama généralisé n'a pas bougé le bureau** : à props par défaut,
   image, aspect et clés de zone sont ceux du cabinet.
2. **Les zones du Bazar** : trois clés, centres à 1/6, 1/2, 5/6, ouverture sur
   `comptoir`.
3. **La scène** : les trois lots et la vitrine sont rendus aux emplacements du
   layout, chacun avec son prix ; le tap achète.
4. **L'article hors de portée** : bourse à 0 → les quatre articles sont
   désaturés, le tap ne débite rien et montre le manque chiffré.
5. **La vitrine vendue** : `bazar.vitrine === null` → la place est vide et porte
   « Vendu ».
6. **Parité i18n** : la chaîne du manque existe dans les quatre langues
   (`ui.test.ts` vérifie déjà les placeholders `{n}`).

## 5. Recette à la main

Le code ne prouve pas ces points-là :

1. Le swipe ne coupe aucun objet en deux aux frontières de zone (33 %, 66 %).
2. Les articles sont posés sur les étagères, pas flottants au-dessus.
3. La perspective du Bazar se lit comme celle du bureau — même hauteur d'œil,
   même profondeur.
4. Le comptoir et la porte attirent l'œil ; le reste est en retrait.
5. Les emplacements réservés (vendeur, borne) sont crédibles et vides.
6. Les quatre langues sur les étiquettes de prix et la bulle de manque, grec en
   priorité.
7. Sur iPad, la scène remplit la hauteur sans rogner le haut.

## 6. Décisions verrouillées

1. Une seule image de fond, 2752×1536, même pipeline que le bureau.
2. Trois zones : `arcade` (gauche), `comptoir` (centre), `antiquites` (droite).
3. Ouverture sur le comptoir.
4. L'étagère est **vide, frontale, haute**, à **neuf cases** ; le plateau du
   comptoir est **nu** (aucune vitrine sous verre). Les articles sont compositées
   par-dessus : les trois lots sur la rangée du bas, l'objet de la semaine au
   centre.
5. Aucune illustration nouvelle pour les articles — `PieceIcon` et les images
   d'objets existantes.
6. Deux emplacements réservés : vendeur (derrière le comptoir), borne d'arcade
   (zone gauche).
7. La borne et la table sont muettes.
8. La porte ramène au bureau.
9. `UnifiedPanorama` est généralisé, pas copié.
10. L'article hors de portée est désaturé, prix barré, avec le manque chiffré au
    tap.
11. Le fond reste terne ; ce qui attire l'œil est composité par-dessus.

## 7. Questions laissées ouvertes

- **Le son du lieu.** Le bureau a son ambiance ; le Bazar n'a rien de prévu. Non
  traité ici.
- **L'arrivée dans la boutique.** Aucune transition particulière n'est prévue
  (l'iris est réservé menu→bureau). À juger sur appareil.
- **Le nombre de travées.** Trois lots aujourd'hui ; si le catalogue s'élargit
  (paquets de cartes en ④), le mur devra en accueillir plus. Le layout est un
  fichier de coordonnées : l'ajout est possible sans redessiner, tant que les
  étagères dessinées ont de la place libre. À garder en tête au moment du prompt.
