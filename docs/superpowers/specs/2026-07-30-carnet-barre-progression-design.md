# Carnet de commandes — barre de progression, doublon de récompense, fond

Date : 2026-07-30

Trois retouches d'affichage du carnet de commandes, sans changement de règles de jeu :
supprimer le bandeau de récompense en doublon, refondre la ligne de progression
(compteur dans la barre, bouton Livrer à sa droite), et retirer les lignes du
papier dans le fond du carnet.

## 1. Fond du carnet — suppression des lignes

`RegistreOverlay.tsx`, style `carnetChassis`.

`backgroundImage` empile deux couches : les lignes horizontales pâles (tuile
24 px) et le dégradé crème de base. On retire la couche de lignes ; il reste le
seul dégradé `#f4e9cd → #ecdfb6`, avec sa bordure bordeaux et son ombre interne
inchangées. `backgroundSize` / `backgroundRepeat` sont ramenés à une seule
couche.

Rien d'autre dans l'overlay ne change (onglets, en-tête, bouton de fermeture,
mode replay).

## 2. Bandeau de récompense — suppression du doublon

`CommandeRow.tsx` rend aujourd'hui **deux** `<RecompenseJetons variante="bandeau">` :
un sur la carte repliée (sous le bloc titre) et un second à l'intérieur du
panneau déplié, juste au-dessus du bouton Livrer. Le second est supprimé.

Conséquence sur la cérémonie de livraison (`OngletCommandes.lancerLivraison`) :
l'envol masque tous les `[data-jeton="…"]` de la carte via `querySelectorAll`
précisément parce qu'il y en avait deux. Le code reste correct avec un seul
jumeau, mais le commentaire qui justifie le `querySelectorAll` par « carte
dépliée = DEUX bandeaux » devient faux et doit être mis à jour.

## 3. Ligne de progression — compteur centré et bouton Livrer

### Sortie de la ligne hors du toggle

Aujourd'hui `barreWrap` vit dans `blocCentral`, lui-même dans le `<button>`
accordéon (`row`). Y placer un bouton Livrer donnerait un bouton imbriqué dans un
bouton : HTML invalide et cible de tap ambiguë.

La ligne de progression sort donc du toggle :

- le `<button>` accordéon ne couvre plus qu'avatar + titre + expéditeur +
  vignettes (ou libellé d'objectif) ;
- la ligne `[barre] [Livrer]` devient un frère juste en dessous, dans `carte`, sur
  toute la largeur de la carte.

Effet visuel assumé : la barre n'est plus calée sur la colonne centrale, elle
passe sous l'avatar et court d'un bord à l'autre — ce qui dégage la place du
compteur et du bouton.

### Compteur dans la barre

Le compteur `x/y` (ou `actuel / cible €`) quitte sa position à droite de la barre
pour passer **en surimpression, centré dans la barre**.

- Hauteur de la barre : 7 px → 18 px, pour loger le texte.
- Texte : `var(--font-mono)`, 11 px, gras, bordeaux `#6e1f1f`, avec un halo clair
  discret (`text-shadow` crème) pour rester lisible aussi bien sur la portion
  remplie (or) que sur la portion vide (crème).
- Le remplissage garde sa transition `width 300ms ease` et reste sous le texte.
- Les `data-testid` `progression-barre` et `progression-compteur` sont conservés.

### Bouton Livrer

Le bouton quitte le panneau déplié et se place **à droite de la barre**, rendu
**uniquement quand la commande est livrable** (ou pendant sa propre cérémonie).
La barre étant en `flex: 1` et le bouton en largeur fixe, la barre se rétrécit
d'elle-même à l'apparition du bouton.

États conservés à l'identique :

- livrable, hors cérémonie → bouton bordeaux actif, libellé `d.carnet.livrer` ;
- cérémonie de cette carte (`enCeremonie`) → bouton vert, libellé `d.carnet.pret`,
  tap inopérant ;
- cérémonie d'une **autre** carte (`livrerVerrouille`) → bouton grisé, tap refusé.

Le cas « non livrable » n'affiche plus de bouton du tout : le libellé
`Livrer (n/total)` n'a donc plus de point d'appel. La clé i18n
`carnet.livrerProgress` est supprimée du type `DictionnaireUI` et des quatre
dictionnaires (fr, en, es, el), après vérification qu'elle n'est référencée
nulle part ailleurs.

## Ce qui ne change pas

- Les sections du carnet (principales / quotidiennes / hebdomadaires / terminées),
  leur ordre, leur repli et le tri interne des commandes.
- Le contenu du panneau déplié hors bandeau et bouton : texte de la lettre, liste
  des objets demandés, liste des objectifs chiffrés.
- La logique de livraison, la cérémonie d'envol des jetons, le gel/dégel des
  compteurs du header.

## Vérification

- Tests existants `CommandeRow.test.tsx` et `OngletCommandes.test.tsx` adaptés à
  la nouvelle structure, puis étendus : le bouton Livrer est absent tant que la
  commande n'est pas livrable, présent et actif dès qu'elle l'est, grisé sous
  `livrerVerrouille`, et le panneau déplié ne contient plus qu'un seul bandeau de
  récompense.
- Suite complète en `--maxWorkers=4` (sans ce drapeau, faux échecs par famine de
  workers sur ce poste).
- Recette visuelle sur `next dev` (via `localhost`) : mesure des rects de la barre
  repliée / livrable plutôt qu'un jugement à l'œil.
