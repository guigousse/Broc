# Quêtes périodiques variées — conception

**Date :** 2026-08-13
**Chantier :** ① sur deux (② = refonte visuelle du carnet, voir annexe A)

## Pourquoi

Le générateur de quêtes périodiques ne sait produire **qu'une seule forme de quête** :
« trouve tel objet précis » (`periodiques.ts` tire 1 objet pour une quotidienne,
2 à 3 pour une hebdomadaire). Six quêtes par semaine, toutes identiques dans leur
principe. On ajoute quatre formes neuves et on ouvre une forme existante aux
périodiques, pour que la boucle de vente compte autant que la boucle de chine.

Ce chantier est le préalable à la refonte visuelle du carnet : la règle d'affichage
voulue — *objet précis → photo, sinon icône* — ne peut être dessinée qu'une fois la
liste des formes fermée. Chaque forme a son icône, sa formulation et sa barre de
progression ; un « 327 / 500 € » ne se met pas en page comme un « 6 / 8 objets ».

## Périmètre

**Dans ce chantier :** les types d'objectifs, leur calcul de progression, la
composition des lots, l'échelle de difficulté, les récompenses, les textes en
quatre langues, et les trois libellés manquants pour que les nouvelles quêtes
soient lisibles dans le carnet actuel.

**Hors de ce chantier :** toute refonte visuelle. Le carnet reste tel quel.

## 1. Les cinq formes de quêtes

Le moteur d'objectifs est une union discriminée avec un point de calcul unique
(`progressionObjectif`, un `switch` dans `src/lib/quetes/objectifs.ts`). Ajouter
une forme, c'est ajouter un membre à l'union et une branche au `switch`.

| Forme | Type | Ce qui est compté |
|---|---|---|
| Trouve tel objet | `objet` *(existe)* | l'objet est en stock |
| Trouve X objets rares | `objetsRares` **neuf** | objets de rareté *rare* chinés depuis l'apparition |
| Réalise X € de bénéfice | `beneficeCumule` **neuf** | Σ (prix de vente − prix d'achat) depuis l'apparition |
| Vends X objets de catégorie Y | `ventesCategorie` **neuf** | objets de cette catégorie vendus depuis l'apparition |
| X € sur une seule vente | `profitVente` *(existe)* | meilleure marge d'une vente unique |
| X € de chiffre d'affaires | `ventesCumulees` *(existe)* | Σ prix de vente depuis l'apparition |

Les deux dernières existent déjà mais ne sont accessibles qu'aux chapitres
d'histoire. On les ouvre aux périodiques sans les réécrire.

**Rareté visée :** `rare` uniquement. Le pool d'objets atteignables
(`objetsAtteignables`) exclut déjà les légendaires, réservés à l'arc principal —
une quête « trouve 3 légendaires » serait infaisable.

### Règles de comptage

- **Ce qui compte, c'est ce qui arrive après.** « Trouve 2 objets rares » compte
  les objets chinés **après** l'apparition de la quête, pas le stock déjà là.
  Sinon un joueur avec une caisse pleine valide la quête en ouvrant son carnet.
  Idem pour toutes les formes de vente. Seule exception, la forme historique
  `objet` : un objet nommé peut être livré depuis le stock, c'est le comportement
  actuel et il est voulu.
- **Pas de marge sur ce qui n'a pas été acheté.** Les ventes dont `prixAchat` est
  `null` (inventaire de départ, cadeaux) sont ignorées par `beneficeCumule`.
  C'est déjà la règle de `profitVente`.

### Correctif d'horodatage

Les missions périodiques sont créées sans `timestampAcceptation` (cf.
`settleUnLot`). Le moteur retombe alors sur `s.jour >= jourRecu`, c'est-à-dire le
**jour de jeu** en cours. Sans conséquence pour « trouve tel objet » ; faux pour
« vends 12 objets », où des ventes antérieures à l'apparition de la quête
compteraient pour elle.

`settleQuetesPeriodiques` reçoit déjà `now` (temps de confiance). On le propage
jusqu'à la création des missions du lot, qui portent désormais leur horodatage.
Additif : aucune migration, les lots en cours continuent de tourner sur l'ancien
repli jusqu'à leur renouvellement.

## 2. Composition des lots

Trois quêtes quotidiennes, trois hebdomadaires — inchangé. Ce qui change, c'est
ce qu'on met dedans.

| | Composition |
|---|---|
| **Quotidiennes** | 2 × « trouve tel objet » + 1 × « trouve X objets rares » |
| **Hebdomadaires** | 3 formes tirées **sans répétition** parmi les 6, avec **au moins une forme de vente** |

Les deux familles, pour lever toute ambiguïté sur le garde-fou :

- **chine** — `objet`, `objetsRares`
- **vente** — `beneficeCumule`, `ventesCumulees`, `profitVente`, `ventesCategorie`

La journée reste tournée vers la chine, légère, faisable en une session. La
semaine brasse les six formes : **20 compositions possibles**, contre une seule
aujourd'hui.

Le garde-fou « au moins une vente » évite le lot hebdomadaire
« trouve 3 objets / trouve 2 objets / trouve des objets rares », qui ne serait
qu'une série de quotidiennes en plus lent. La semaine doit demander autre chose
que la journée.

Les quêtes d'objets hebdomadaires gardent ce qui les distingue déjà des
quotidiennes : 2 à 3 cibles au lieu d'une, et un état minimum « Très bon » une
fois sur deux.

**Pas de mémoire entre les périodes.** Un tirage sans répétition intra-lot
suffit ; stocker les formes de la semaine passée pour les éviter la suivante
ajouterait un champ de sauvegarde pour un gain marginal.

**La catégorie demandée** par « vends X objets de catégorie Y » est tirée parmi
les catégories que le joueur peut réellement rencontrer dans son pool accessible,
sinon la quête tombe un jour où il n'a — et ne trouvera — aucun objet concerné.

## 3. Échelle de difficulté

Indexée sur le **niveau du joueur**, par paliers. Les quêtes s'ouvrent au niveau 3
(`NIVEAU_QUETES_PERIODIQUES`), le niveau plafonne à 100
(`NIVEAU_BROCANTEUR_MAX`).

| Niveau | 3 – 9 | 10 – 19 | 20 – 39 | 40 – 69 | 70 – 100 |
|---|---|---|---|---|---|
| Bénéfice sur la semaine | 300 € | 500 € | 850 € | 1 300 € | 1 800 € |
| Chiffre d'affaires sur la semaine | 600 € | 1 000 € | 1 700 € | 2 600 € | 3 600 € |
| Bénéfice sur une seule vente | 60 € | 100 € | 170 € | 260 € | 360 € |
| Objets vendus dans une catégorie | 3 | 4 | 5 | 6 | 8 |
| Objets rares à trouver — quotidienne | 2 | 2 | 3 | 3 | 4 |
| Objets rares à trouver — hebdomadaire | 4 | 5 | 6 | 7 | 9 |
| Récompense d'une hebdomadaire sans objet | 75 € | 125 € | 210 € | 325 € | 450 € |
| Récompense d'une quotidienne sans objet | 25 € | 40 € | 70 € | 110 € | 150 € |

Du premier au dernier palier, les cibles **en argent** (bénéfice semaine, chiffre
d'affaires, bénéfice sur une vente, récompenses sans objet) grimpent exactement
**×6**, soit la croissance réelle mesurée sur le jeu (annexe B). Les cibles **en
nombre d'objets** grimpent plus doucement (×2 à ×2,7 selon la ligne) — on ne peut
pas raisonnablement demander 18 objets rares en une semaine sous prétexte que
l'argent, lui, a été multiplié par 6. Les quêtes suivent le joueur sans jamais le
distancer.

Le chiffre d'affaires est calé au double du bénéfice — un objet revendu rapporte
grossièrement le double de son prix d'achat.

### Règles associées

- **La cible est figée à la naissance de la quête.** Elle est calculée une fois, à
  la génération du lot, et écrite dans l'objectif. Un joueur qui prend un niveau
  en milieu de semaine ne voit pas son objectif se durcir sous ses pieds.
- **Une seule table, un seul fichier.** Cibles et récompenses sortent du même
  bloc de constantes. Changer un nombre suffit ; aucun coefficient caché ailleurs.
- **Valeurs rondes.** 900 €, pas 883 €. Un nombre rond se retient.

## 4. Récompenses

`calculerRecompense` part de la valeur des objets demandés — inutilisable pour une
quête sans objet. Les formes sans objet nommé n'y passent donc pas : leur
récompense est lue TELLE QUELLE dans la table ci-dessus (`recompenseQuotidienne` /
`recompenseHebdo`), sans prime ni second arrondi — la table est déjà exprimée en
valeurs rondes (multiples de 5 €), ce qui rend la question de l'arrondi sans objet.
Les deux familles restent comparables dans le carnet parce que la table a été
calibrée pour ça, pas parce qu'elles partagent un calcul.

Les quêtes d'objets nommés, quotidiennes comme hebdomadaires, conservent leur
calcul actuel — rien ne change pour elles. Les formes sans objet nommé (y compris
la quotidienne « trouve X objets rares ») lisent leur récompense dans la table.

## 5. Textes, en quatre langues

Les textes de quêtes passent par des gabarits localisés : le payload persiste le
FR et un `gabaritId` (`"clé#index"`), et les helpers `titreCourrier` /
`corpsCourrier` régénèrent le texte dans la locale d'affichage à partir des
overlays `contenu/{en,es,el}/quetesGabarits.ts`.

Chaque forme neuve reçoit sa famille de gabarits, deux à trois variantes,
déclinée FR / EN / ES / EL. Nouvelles marques à interpoler : `{nombre}`,
`{montant}`, `{categorie}`. **La catégorie doit sortir traduite** — pas de mot
français dans une phrase grecque. Les montants suivent la mise en forme monétaire
de la locale.

**Le commanditaire reste, même sans son portrait.** Une quête est écrite par un
personnage — le collectionneur de jeux vidéo, la modeuse, le chef décorateur — et
c'est lui qui donne le ton de la lettre. Le chantier ② retire sa tête du carnet,
pas sa voix. Pour « vends X objets de catégorie Y », le commanditaire est choisi
dans la catégorie demandée ; pour les quêtes d'argent, un ton générique de
marchand.

**Le test de parité est à généraliser.** `quetesGabarits.test.ts` exige
aujourd'hui la marque `{objets}` dans *chaque* gabarit — les nouvelles formes n'en
ont pas. Chaque famille déclare désormais les marques qu'elle attend, et le test
vérifie cette déclaration.

## 6. Icônes

Décidées ici parce qu'elles font partie de la définition d'une forme ; consommées
par le chantier ②.

| Forme | Visuel |
|---|---|
| Trouve tel objet | la photo de l'objet |
| Trouve X objets rares | `Gem` |
| Bénéfice sur la semaine | `TrendingUp` |
| Chiffre d'affaires | `TrendingUp` |
| X € sur une seule vente | `Coins` |
| Vends X objets de catégorie Y | `Package` |

## 7. Affichage en attendant le chantier ②

Le carnet actuel sait déjà rendre une mission sans objet : `CommandeRow` retombe
sur une ligne de texte produite par `libelleObjectif`, et la barre de progression
gère le cas « objectif chiffré unique » (affichage « actuel / cible € »).

Il suffit d'ajouter les trois libellés manquants dans les quatre dictionnaires
(`d.carnet.objectifs.*`). Le résultat sera austère, mais jouable, testable et
livrable seul.

## 8. Compatibilité des sauvegardes

**Aucune migration, aucun changement de `SAVE_VERSION`.** Tout est additif :

- nouveaux membres de l'union `ObjectifMission` — les anciennes sauvegardes n'en
  contiennent pas ;
- `timestampAcceptation` ajouté aux missions périodiques — champ déjà optionnel ;
- les lots en cours au moment de la mise à jour continuent de tourner et sont
  remplacés au renouvellement suivant (minuit local, ou lundi).

## 9. Tests

- **Une batterie par forme neuve** : progression à zéro, à mi-parcours, atteinte,
  et le cas qui compte le plus — *ce qui précède l'apparition de la quête ne
  compte pas*.
- **Le correctif d'horodatage** : un test qui échoue si une mission périodique
  naît sans son horodatage.
- **La table de paliers** est une fonction pure `niveau → cibles` : on verrouille
  les cinq paliers, les bornes (niveaux 3 et 100), et la **monotonie** — aucun
  palier ne doit être plus facile que le précédent. C'est l'erreur qu'une table
  écrite à la main laisse passer.
- **La composition des lots** : une quotidienne ne contient que des formes de
  chine ; une hebdomadaire ne répète jamais une forme et contient toujours au
  moins une forme de vente.
- **La catégorie demandée** est toujours présente dans le pool accessible.
- **Parité i18n** : chaque famille de gabarits existe dans les quatre langues avec
  ses marques.

Rappel d'exécution : `vitest` sur ce Mac exige `--maxWorkers=4`, sans quoi une
quarantaine de faux échecs apparaissent par famine de workers.

---

## Annexe A — Décisions déjà prises pour le chantier ② (refonte du carnet)

Consignées ici pour ne pas les reperdre. Elles ne sont **pas** dans le périmètre
de ①.

- **Fenêtre flottante conservée**, ouverte sur le bureau.
- **Pas d'onglets.** Trois sections rétractables, dépliées par défaut, état de
  repli mémorisé, en-têtes collantes, et un compteur sur l'en-tête repliée
  (« 2/3 · 1 prête ») pour que replier ne cache jamais une action possible.
- **L'onglet « Comptes » disparaît** (peut-être réintégré ailleurs plus tard). Il
  n'est ouvert par aucun autre point du code que son propre onglet ; seul le
  *replay* de session `SessionSummary` perd son point d'entrée.
- **Plus de têtes de vendeurs.**
- **Items recherchés scotchés** sur la page, effet « vrai carnet ».
- **Carte de la quête principale** : la trame n'avance qu'un chapitre à la fois,
  il y a donc toujours 0 ou 1 quête principale active. La carte porte un bloc
  « Objectif actuel » avec sa barre, et un fil d'étapes qui raconte **l'histoire** :
  les deux derniers chapitres livrés (✓), le chapitre en cours (◉), puis « ??? ».
- **Le pavé « Récompense » devient le bouton « Livrer »** quand la quête est
  livrable : même emplacement, il s'allume. La cérémonie d'envol des jetons part
  ainsi de l'endroit exact où ils étaient dessinés.
- **Palette** : les jetons de couleur existants (`--paper-*`, `--brass-*`,
  `--ink-*`, `--patina-500`), qui sont exactement ceux de la maquette. Le bordeaux
  `#6e1f1f` codé en dur du carnet actuel disparaît.

## Annexe B — Mesures ayant servi à l'équilibrage

Deux échelles candidates ont été écartées après mesure sur les données réelles.

**Le prix médian du pool accessible ne bouge presque pas** — le pool est
cumulatif, les objets à 8 € du début ne disparaissent jamais :

| Pool | médiane | 3ᵉ quartile | max |
|---|---|---|---|
| 1⭐ | 22 € | 32 € | 280 € |
| 2⭐ | 28 € | 55 € | 600 € |
| 3⭐ | 38 € | 90 € | 1 200 € |
| 4⭐ | 38 € | 90 € | 1 200 € |

Le tier 4 n'ajoute aucun objet au pool : il joue sur les clients, pas sur la
marchandise. Une échelle indexée sur la médiane donnerait ×1,7 sur toute la
partie.

**La capacité nominale du véhicule est très surestimée.** `capacitePlaces`
annonce 9 → 16 → 25, mais le rangement se fait en Tetris et les aires de coffre
réelles (`scripts/capacite-camions.mjs`) donnent Rogers ×1,00 → Break ×1,19 →
Utilitaire ×1,75.

**D'où la croissance réelle retenue :** marchandise accessible ×2,8, chargement
×1,75, plus les marges des compétences — de l'ordre de **×6** sur toute la partie.
C'est la borne que respecte la table de paliers.
