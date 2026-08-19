# Jetons Bazar et boutique du Bazar — conception

**Date :** 2026-08-19
**Chantier :** ①+② sur cinq (voir « Le découpage d'ensemble »)

## Pourquoi

Le 2026-08-18, les quêtes ont cessé de verser de l'XP. `src/lib/recompenses.ts:22`
porte encore le commentaire qui l'acte : *« des jetons Bazar prendront cette
place (à spécifier) »*. Depuis, une quête ne rapporte que de l'argent — or
l'argent est déjà abondant, et il le devient de plus en plus : le barème des
quêtes est multiplié par six du premier au dernier palier, et le commerce écrase
de toute façon les quêtes en volume.

Une quête doit rapporter quelque chose que le commerce ne peut pas fabriquer.
C'est le rôle du jeton : une seconde monnaie, gagnée uniquement par les quêtes,
dépensée uniquement au Bazar, et que l'argent ne peut jamais acheter.

## Le découpage d'ensemble

| | Chantier | État |
|---|---|---|
| ① | **Le jeton** — monnaie, versement, affichage | **ce document** |
| ② | **Le Bazar** — le lieu, deux rayons, rotation | **ce document** |
| ④ | **Cartes Brockymon** — moteur de collectible + 30 cartes | annexe A |
| ③ | **Album de timbres** — 30 timbres, placement libre | annexe B |
| ⑤ | **Borne d'arcade** — mini-jeux, cartouches dorées | annexe C, V2 |

① et ② se livrent **ensemble**. Une monnaie qu'on gagne sans pouvoir la dépenser
est une régression, pas une fondation.

## Périmètre

**Dans ce chantier :** la monnaie et sa persistance, son versement par les quêtes
périodiques, son affichage (compteur, pastille, grand livre), le Bazar comme lieu
accessible, ses deux rayons, sa rotation, le catalogue de lancement, et les
garde-fous d'économie.

**Hors de ce chantier :** les cartes, les timbres, les albums, les paquets, la
borne d'arcade. Conséquence directe : **au lancement, le Bazar ne vend pas de
paquets** — ils n'ont rien à contenir. Le rayon des paquets ouvre avec ④ et ③.

## 1. Le jeton

### État

Champ additif sur `GameState` :

```ts
/** Monnaie du Bazar. Gagnée par les quêtes périodiques uniquement. */
jetons: number;
```

`SAVE_VERSION` passe de **19 à 20** ; la migration pose `0` pour les parties
existantes. Aucune donnée à reconstruire.

### Versement

- Quête **quotidienne** livrée : **1 jeton**
- Quête **hebdomadaire** livrée : **3 jetons**

Le montant est **écrit dans le payload à la naissance de la quête**, pas lu au
moment de la livraison. C'est la règle déjà en vigueur pour les cibles chiffrées
(`echelle.ts` : *« la cible est lue une fois, à la naissance de la quête, et figée
dans l'objectif »*), et elle a la même vertu ici : une quête née hier paie ce
qu'elle promettait hier, quoi qu'il arrive au barème entre-temps. Elle laisse
aussi la porte ouverte à une quête exceptionnelle qui paierait autrement.

`RecompenseEffective` gagne donc un quatrième champ, `jetons`, aux côtés
d'`argent`, `xp` et `energie`. Le point de passage unique du versement
(`recompenseEffective` / `verserRecompense`) reste unique.

**Le montant ne monte pas avec le niveau.** C'est délibéré — voir §4.

### Affichage

Trois surfaces, toutes existantes :

1. **Pastille de récompense** — `RecompenseJetons.tsx` porte déjà trois teintes
   (cire pour l'argent, laiton pour l'XP, vert pour l'énergie). Une quatrième
   s'ajoute pour le jeton. Le composant s'appelait déjà « jetons » au sens
   graphique du terme ; il gagne enfin un vrai jeton.
2. **Compteur permanent** — `MobileHeader.tsx`, à côté du budget.
3. **Grand livre** — `LedgerParams` porte déjà `xp` et `energie` comme *gains non
   monétaires rendus en suffixe* (« +25 XP · +2 ⚡ »). `jetons` s'y ajoute à
   l'identique. **Les colonnes recette/dépense/solde restent en euros purs** : le
   grand livre est la source de vérité comptable du jeu, on n'y mélange pas deux
   unités.

Corollaire : **un achat au Bazar n'écrit rien au grand livre.** Aucun euro ne
bouge. Cela n'empêche pas la comptabilité d'être juste plus tard : l'objet acheté
emporte avec lui un prix d'achat en euros (§5), si bien que sa revente produit une
marge honnête même si son acquisition n'a laissé aucune trace comptable.

## 2. Le Bazar, un lieu

Le Bazar n'est pas un meuble du bureau : c'est un **endroit où l'on se rend**.
Une boutique dans laquelle on entre a un poids qu'un panneau n'a pas — c'est ce
qui fait tenir l'inspiration des boutiques de Zelda.

### Accès

`PorteSheet.tsx` (83 lignes) propose aujourd'hui deux destinations : **Chiner** et
**Étaler**. Elle en proposera **trois** : Chiner, Étaler, **Bazar**. C'est le
point d'entrée le plus modeste possible pour le changement le plus structurant :
le joueur choisit sa sortie du jour.

Route : `/bazar`, sur le modèle des routes de partie existantes. Le composant
respecte `estRoutePartie()` comme tout le reste du chrome.

**Le lieu a un coût que le panneau n'aurait pas.** Un endroit demande un décor, et
une boutique demande au minimum une étagère lisible et une ambiance. C'est le
poste le plus lourd de ce chantier, et le seul qui ne soit pas du code. À
cadrer au plan : une illustration d'intérieur suffit pour livrer ; un marchand
incarné est un ajout ultérieur, pas un prérequis.

### Déblocage

Le Bazar s'ouvre **au même niveau que les quêtes périodiques** —
`NIVEAU_QUETES_PERIODIQUES = 3` (`src/lib/quetes/settlePeriodiques.ts:11`).
Aucune constante neuve : avant ce niveau il n'y a pas de jetons, donc pas de
boutique. La cohérence est structurelle, pas conventionnelle.

### Contenu — deux rayons

**Le fond de commerce.** Toujours là, stock illimité.

| Article | Prix |
|---|---|
| **5 pièces de restauration**, d'une catégorie nommée | **1 jeton** |

`piecesAmelioration` est un `Record<CategorieObjet, number>` — **sept stocks
séparés**, jamais fongibles. L'article porte donc une catégorie explicite
(« 5 pièces · Musique »), et **cette catégorie change à chaque rotation**. Le
joueur prend ce qui passe : c'est ce qui fait d'un étal un étal, et c'est ce qui
donne une raison d'y repasser. Il n'y a pas de choix de catégorie à l'achat.

**La vitrine.** Un seul objet à la fois, en un seul exemplaire.

| Article | Prix |
|---|---|
| **Un objet en Pristin état** | `Math.ceil(valeur de base / 25)` jetons, minimum 1 |

Le prix se calcule sur la **valeur de base** de l'objet, *avant* le multiplicateur
Pristin de ×1,4 (`src/lib/etat.ts:7`). Un objet de base à 250 € coûte donc
**10 jetons** et en vaut 350 une fois en main. Les 40 % restent au joueur, et
c'est justifié : l'objet arrive restauré, ce qui lui épargne l'atelier, l'attente
et les pièces. Une boutique doit donner envie ; au pair, on n'y retourne pas.

Acheté, l'emplacement reste **vide jusqu'à la rotation**. Non acheté, l'objet
**retourne au pot** et pourra réapparaître : rien n'est perdu pour toujours. Le
définitif est réservé aux `uniques`, qui ont déjà leur mécanique.

### Rotation

**Quotidienne**, ancrée sur `cleJourLocal` (`src/lib/quetes/periode.ts`) — la même
horloge que les quêtes quotidiennes, et donc **le même instant** : à minuit local,
les quêtes et l'étal se renouvellent ensemble. Un seul moment dans la journée où
tout est neuf.

L'étal courant est **persisté dans la save** et réglé par un `settle` au tick, sur
le modèle exact de `settlePeriodiques.ts`. On ne le recalcule pas à la volée : la
mésaventure de la notification de restauration en avance a montré ce que coûte une
ancre périmée.

```ts
/** ADDITIF (v20) : étal courant du Bazar. */
bazar?: {
  /** Clé de jour ("YYYY-MM-DD") de l'étal présenté. */
  cleJour: string;
  /** Catégorie du lot de pièces à l'étal ce jour-là. */
  categoriePieces: CategorieObjet;
  /** Objet de vitrine du jour, ou null si déjà acheté. */
  vitrine: { templateId: string; valeurBase: number; prix: number } | null;
};
```

## 3. Ce que le joueur reçoit, en chiffres

Un lot périodique fait **3 commandes** (`genererLot`), et les périodes sont en
**temps réel local**, pas en temps de jeu.

| Source | Calcul | Jetons |
|---|---|---|
| Quotidiennes | 3/jour × 7 × 1 | 21 |
| Hebdomadaires | 3/semaine × 3 | 9 |
| **Plafond hebdomadaire** | | **30** |

Ce plafond **ne bouge jamais**, du niveau 3 au niveau 100.

Trois profils de joueur :

| Profil | Jetons/semaine |
|---|---|
| Assidu, tout complété | 30 |
| Régulier, la moitié | ~15 |
| Une seule connexion dans la semaine | **12** (6 jours de quotidiennes perdus) |

Une semaine parfaite achète donc : **3 objets de vitrine**, ou 30 lots de pièces,
ou un mélange.

## 4. Le ratio, et ce qu'il implique

> **1 jeton = 25 €, fixe, pour toute la partie.**

Se dit au joueur en une phrase, et ne demande aucune table.

Conséquence assumée : le pouvoir d'achat du Bazar est **plafonné à 750 €/semaine à
vie**, pendant que l'économie du jeu est multipliée par six.

| Palier | Argent des quêtes/sem. | Poids du Bazar |
|---|---|---|
| < 10 | 750 € | **100 %** |
| 20 | 2 100 € | 36 % |
| 70+ | 4 500 € | 17 % |

Et cette dernière colonne ignore le commerce, première source de revenus du jeu.
**Le Bazar est décisif au début et marginal à la fin.** Ce n'est pas un défaut à
compenser, c'est un calendrier à exploiter :

- Les **albums sont finis** (30 cartes, 30 timbres) et se complètent tôt, pile
  quand le Bazar est puissant.
- En fin de partie, ce que la vitrine offre ne doit plus être *de la valeur* —
  l'argent est devenu facile — mais **de la rareté** : des objets que l'argent ne
  peut pas acheter ailleurs.
- La **borne d'arcade** (annexe C) est le seul puits de jetons qui ne se dévalue
  jamais : une partie coûte 1 jeton au niveau 3 comme au niveau 100, et ce qu'elle
  rend n'est pas de l'argent.

## 5. Trois garde-fous

### Le prix d'achat fantôme — obligatoire, avec test

Un objet acheté en jetons entre dans le stock. S'il y entre avec un `prixAchat`
de **0 €**, sa revente est un bénéfice pur. Or les quêtes hebdomadaires comptent
`beneficeSemaine`, `chiffreAffairesSemaine` et `profitVenteUnique`
(`src/lib/quetes/echelle.ts`) — et ces quêtes paient des jetons.

La boucle est fermée et rapporte : **jetons → objet à coût nul → bénéfice
gigantesque → quête de bénéfice validée → jetons**.

**Règle :** un objet acquis au Bazar entre en stock avec
`prixAchat = prix en jetons × 25 €`. Le joueur a payé, le jeu doit le savoir.
Ce point mérite un test dédié, pas un commentaire.

### Le plafond du robinet protège la vitrine

À 30 jetons/semaine, la revente de vitrine ne peut pas dépasser **3 objets par
semaine**, quoi qu'il arrive. Même mal calé, ce rayon ne peut pas détrôner la
chine. Le garde-fou est structurel : il ne dépend d'aucun réglage.

### Le joueur du dimanche — à surveiller, pas à corriger

Les quotidiennes en temps réel punissent l'absence : 12 jetons contre 30. Si
l'écart se révèle décourageant à l'usage, deux réponses existent (rattrapage
partiel, ou basculement du poids sur les hebdomadaires). **On ne tranche pas
maintenant** : c'est un réglage de nombre, pas de structure, et il se décidera sur
des retours, pas sur une intuition.

## 6. Tests

- Migration v19 → v20 : `jetons` vaut 0, aucune autre donnée touchée.
- Une quotidienne livrée verse 1 jeton ; une hebdomadaire, 3.
- Le montant est figé à la naissance : une quête née avant un changement de
  barème paie l'ancien montant.
- Le grand livre garde `recette`/`depense` à 0 sur un achat au Bazar, et affiche
  le suffixe jetons sur une livraison de quête.
- L'étal se renouvelle au passage de `cleJourLocal`, et **pas** entre deux ticks
  du même jour.
- Un objet de vitrine acheté n'est plus à l'étal jusqu'à la rotation.
- **Un objet acheté au Bazar porte `prixAchat = prix × 25`** (garde-fou §5).
- Achat refusé si `jetons` est insuffisant, sans effet de bord.

---

## Annexe A — Chantier ④ : les cartes Brockymon

**Le moteur de collectible s'écrit ici, une fois, pour les deux albums.**

- **30 cartes** pour la première série. Une collection se découpe naturellement en
  séries — le catalogue porte déjà « Cartes 'Pocket Monster' — set Jungle ». 30
  cases se remplissent et se montrent ; 100 est un mur.
- **Source : la chine.** 4 emplacements de deck dédiés, **un par palier de
  brocante**, avec une probabilité de carte rare qui monte en crescendo. Le jeu a
  déjà exactement cette forme : `MIX_RARETE_PAR_TIER: Record<1|2|3|4, ...>`
  (`src/lib/chine.ts:170`). Le nombre de cartes différentes ne fait donc **jamais**
  gonfler la table de butin : l'emplacement est fixe, la carte concrète est tirée
  **à l'instanciation**, pas au tirage du deck.
- **La carte est un objet de stock**, comme un vinyle : elle se vend, ou se donne à
  la collection — et alors elle sort de l'économie. L'arbitrage vendre/collectionner
  est déjà codé et compris (`CollectionSlot.donation`).
- **Collection imbriquée.** La grille actuelle
  (`Record<CategorieObjet, CollectionSlot[]>`) gagne un slot d'un genre neuf : une
  **porte**, nommée « Collection de cartes ». Sa valeur affichée est celle de son
  contenu, et elle alimente `valeurTotale(collection)` — qui **débloque déjà des
  compétences** via `valeurCollection` et `valeurCollectionCategorie`
  (`src/lib/deblocage.ts:305`). C'est là qu'est l'intégration à l'économie, et elle
  ne demande presque pas de plomberie neuve.
- **Album à places numérotées.** La carte n° 12 va au slot 12, toujours. L'album
  montre les **trous** — c'est le trou qui fait revenir chiner, et qui dit au
  joueur quoi acheter.
- **Équilibrage à surveiller :** des dizaines de cartes valorisées peuvent faire
  sauter les seuils de déblocage de compétences sans effort. L'équilibrage se joue
  là, pas dans l'album.
- **Le nom se tranche à cette spec-là.** « Brockymon » est un quasi-homophone de
  Pokémon, sur une application publiée. Le jeu porte déjà trois *Cartes 'Pocket
  Monster'* dans `objetTemplates.ts` — le pastiche existe, mais un album entier
  bâti dessus est une exposition d'une autre nature.

## Annexe B — Chantier ③ : l'album de timbres

**Symétrique des cartes à la source, différent à l'usage.**

- **30 timbres**, également chinables : 4 emplacements de deck, un par palier, même
  crescendo de rareté. Timbres et cartes partagent donc **tout le moteur** ; ③ ne
  garde en propre que ses visuels et son geste.
- **Placement libre.** Le joueur pose ses timbres où il veut, les déplace, les
  compose. Un timbre n'a pas de numéro dans la vraie vie : sa valeur est dans
  l'arrangement de la planche.
- **Le point dur est le geste, pas la donnée.** Glisser-déposer dans une WKWebView
  où le `body` est verrouillé et où l'on s'interdit tout ce qui dépend de `window`.
  **Ce chantier mérite une maquette avant qu'on s'engage.** C'est pour cela qu'il
  passe après ④, alors qu'il est plus léger en logique.
- **Charge totale sur la chine :** 8 emplacements de deck (4 cartes + 4 timbres) une
  fois ③ et ④ livrés. La composition d'une session de chine est à revérifier à ce
  moment-là.

## Annexe C — Chantier ⑤ : la borne d'arcade (V2)

Une borne dans le Bazar. **1 jeton = une partie**, sur un jeu que le joueur
**possède dans sa collection**.

- **Elle boucle la collection sur elle-même :** chiner un jeu → le donner à la
  collection → pouvoir y jouer. La collection cesse d'être une vitrine et devient
  une bibliothèque. La catégorie *Jeux & Loisirs* (templates `jx.*`) gagne une
  seconde vie.
- **Chaque jeu a un score à atteindre**, qui débloque la **version dorée de la
  cartouche** — un objet. À spécifier le moment venu : une variante dorée est un
  second exemplaire du même template, ce qui touche l'unicité des slots de
  collection.
- **C'est le puits de jetons de la fin de partie** (voir §4) : son prix ne s'indexe
  sur rien et ne se dévalue jamais.
- **Rien à construire maintenant, une chose à ne pas casser :** la collection doit
  rester interrogeable objet par objet (« le joueur possède-t-il ce template ? »).
  C'est déjà le cas — `CollectionSlot` porte `templateId` et `dejaPossede`.

## Annexe D — Décisions verrouillées

1. Les collections sont **dans l'économie** : la valeur d'un album alimente
   `valeurTotale`, qui débloque des compétences.
2. Cartes et timbres se **chinent** : emplacements de deck fixes (4 par famille,
   un par palier), contenu tiré à l'instanciation, crescendo de rareté.
3. **Collection imbriquée** : un slot devient une porte vers un album.
4. **Cartes = places numérotées** (les trous se voient) ; **timbres = composition
   libre**.
5. Le Bazar **n'accepte que des jetons**. L'argent n'y a pas cours.
6. **Deux rayons** : fond de commerce illimité + vitrine à l'exemplaire unique.
   Pièce ratée → retour au pot.
7. **1 jeton = 25 €**, fixe.
8. Quotidienne = **1 jeton**, hebdomadaire = **3 jetons**.
9. Vitrine : **un seul objet à la fois**, prix = valeur **de base** / 25.
10. Pièces vendues **par lot de 5**, catégorie **étiquetée** et tournante.
11. Le Bazar est un **lieu**, atteint par un **troisième bouton** dans `PorteSheet`.
12. **30 cartes et 30 timbres** pour la première série.

## Annexe E — Questions laissées ouvertes

| Question | Chantier | Pourquoi on ne tranche pas ici |
|---|---|---|
| Rattrapage pour le joueur intermittent (12 jetons contre 30) | ① | Réglage de nombre ; se décide sur des retours d'usage. |
| Le Bazar vendra-t-il aussi des **exclusifs** en fin de partie ? | ② bis | Dépend de ce que la vitrine devient une fois les albums finis. |
| Le nom « Brockymon » | ④ | Se tranche avec les visuels, pas avant. |
| Unicité des slots face à une **cartouche dorée** | ⑤ | Demande de connaître les mini-jeux. |
