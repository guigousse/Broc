# Quêtes quotidiennes variées — design

**Date :** 2026-08-26
**Statut :** design validé en séance, prêt pour plan d'implémentation

## Le problème

Le lot quotidien est écrit en dur depuis la livraison du catalogue périodique
(`periodiques.ts`, `formesDuLot`) :

```ts
if (type === "quotidienne") return ["objet", "objet", "objetsRares"];
```

Trois conséquences, toutes constatées en jeu :

1. La **troisième ligne est toujours « trouve N objets rares »**, sans exception
   ni tirage. Seul l'hebdomadaire tire ses formes.
2. Le **nombre lui-même ne bouge pas** : `objetsRaresQuotidien` vaut 2 du niveau 0
   au niveau 19, soit toute la première moitié de la progression. La ligne est
   donc littéralement identique jour après jour pendant des dizaines d'heures
   de jeu.
3. L'ordre est figé : objet, objet, rares. Le carnet se lit toujours pareil.

Par ailleurs, deux mécaniques du jeu ne sont **jamais sollicitées par une quête
périodique** : l'Atelier (restauration) et les objets légendaires.

## Ce qu'on construit

Un lot quotidien qui **tire** deux de ses trois lignes dans un catalogue élargi,
avec deux nouvelles formes verrouillées derrière une condition d'accès.

### Composition du lot quotidien

| | Aujourd'hui | Après |
|---|---|---|
| Lignes | `objet`, `objet`, `objetsRares` | 1 × `objet` garantie + 2 formes distinctes tirées |
| Ordre | figé | mélangé — l'objet garanti tombe en slot 1, 2 ou 3 |
| Pool de tirage | — | `objetsRares`, `chiffreAffaires`, `beneficeCumule`, `profitVente`, `ventesCategorie`, `restauration`, `objetLegendaire` |

**`objet` est exclu du pool de tirage.** Sinon certains jours donneraient deux ou
trois quêtes d'objet nommé — moins varié qu'aujourd'hui, ce qui serait un comble.
Exactement une quête d'objet par jour, ni plus ni moins.

**Garde-fou de famille : au plus UNE forme de famille `vente` parmi les deux
tirées — mais seulement s'il reste un vrai choix.** Quatre des sept formes du
pool sont de famille vente ; sans garde-fou, une journée sur trois environ
serait « un objet à chiner, puis deux objectifs de caisse ». La spec d'origine
défendait « la journée reste tournée vers la chine, faisable en une session » —
ce garde-fou est ce qui tient cette promesse une fois le tirage ouvert.

Correctif post-revue (mesuré sur partie neuve, 500 graines) : ce garde-fou ne
s'applique QUE si le pool éligible compte au moins **deux** formes hors famille
vente. Sur une partie neuve, `objetLegendaire` et `restauration` sont
verrouillées et il ne reste qu'une seule forme hors-vente (`objetsRares`) —
imposer « au plus une vente » sans condition forçait alors `objetsRares` dans
**500 lots sur 500**, avec seulement 4 compositions distinctes possibles :
exactement l'invariance que ce chantier existe pour supprimer. Le garde-fou ne
redevient actif qu'une fois un second verrou hors-vente ouvert (Réparer, ou une
brocante tier 4).

L'hebdomadaire n'est **pas modifié** par ce chantier.

### Les deux nouvelles formes

**`objetLegendaire`** — « Mets la main sur une pièce légendaire. »
Éligible seulement si une brocante de **tier 4** est débloquée.

C'est une ligne qu'on rate la plupart du temps, et c'est assumé : au tier 4 le
mix de rareté donne **0,8 %** par objet tiré (`MIX_RARETE_PAR_TIER`) et le Grand
Salon des Antiquaires propose **12 objets** par session, soit ~**9 % de chance
qu'un légendaire soit seulement présent** à l'étal — avant même de pouvoir se
l'offrir. La forme n'étant tirée qu'un jour sur quelques-uns, la réussite est un
petit événement. La récompense est calibrée en conséquence (voir plus bas).

`ObjectifMission` gagne le membre `{ type: "objetLegendaire"; nombre: number }`
(toujours 1 pour l'instant), mesuré dans `objectifs.ts` comme `objetsRares` mais
sur `rarete === "legendaire"`, sur les sessions comptées après
`timestampAcceptation`. Membre neuf plutôt que paramètre de rareté ajouté à
`objetsRares` : aucun objectif déjà sauvegardé ne change de forme.

**`restauration`** — « Redonne son éclat à une pièce (état minimum X). »
Éligible seulement si `aCompetenceReparation(state)` est vrai, c'est-à-dire dès
que le joueur sait réparer quelque chose, toutes catégories confondues — la
condition qui ouvre déjà l'Atelier. Sans ce verrou, la ligne tomberait sur des
joueurs dont l'onglet Atelier est encore cadenassé.

Le type d'objectif `restauration` **existe déjà** (`ObjectifMission`,
`objectifs.ts`) et est correctement daté sur `timestampAcceptation` : il compte
les restaurations terminées **après** la naissance de la quête. Rien à écrire
côté mesure.

### Éligibilité — une table, pas des `if`

```ts
// formes.ts
const ELIGIBILITE: Partial<Record<FormeQuete, (s: GameState) => boolean>> = {
  objetLegendaire: (s) => brocanteTier4Debloquee(s),
  restauration:    (s) => aCompetenceReparation(s),
};
```

Une forme sans entrée est toujours éligible. Le tirage filtre le pool par cette
table et ne connaît aucune règle métier ; toute forme future déclare sa condition
au même endroit.

`brocanteTier4Debloquee(s)` s'appuie sur `calculerBrocantesDebloqueesParTier(s)`
et teste que le set du tier 4 est **non vide en excluant la Grande Braderie** —
la braderie est de tier 4 mais n'ouvre que deux jours par an, elle ne doit pas
débloquer la forme le reste de l'année (même raisonnement que dans
`objetsAtteignables`, qui l'écarte déjà pour cette raison).

### Familles

`FAMILLE` gagne la valeur `"atelier"`, portée par `restauration` seule :

| Famille | Formes |
|---|---|
| `chine` | `objet`, `objetsRares`, `objetLegendaire` |
| `vente` | `beneficeCumule`, `chiffreAffaires`, `profitVente`, `ventesCategorie` |
| `atelier` | `restauration` |

Le garde-fou hebdomadaire (« au moins une forme de vente ») reste inchangé et
continue de fonctionner : `FORMES_HEBDOMADAIRES` n'est pas élargi par ce
chantier.

## Barème quotidien

`echelle.ts` ne porte aujourd'hui que des cibles hebdomadaires pour les formes
d'argent. Les réutiliser en quotidien donnerait des objectifs infaisables en une
journée. `CiblesNiveau` gagne donc cinq champs, et reste la **source unique**
des cibles comme des récompenses.

| Palier (niveau min) | 0 | 10 | 20 | 40 | 70 |
|---|---|---|---|---|---|
| `chiffreAffairesJour` | 150 | 250 | 425 | 650 | 900 |
| `beneficeJour` | 75 | 125 | 215 | 325 | 450 |
| `profitVenteJour` | 30 | 50 | 85 | 130 | 180 |
| `ventesCategorieJour` | 2 | 2 | 3 | 3 | 4 |
| `restaurationEtatMin` | Bon | Bon | Très bon | Très bon | Très bon |

Règles de dérivation, pour que le prochain lecteur sache pourquoi ces nombres :

- **Chiffre d'affaires et bénéfice : le quart de la cible hebdomadaire.** Pas le
  septième — l'hebdomadaire doit rester confortable pour un joueur qui ne joue
  pas tous les jours, alors que la quotidienne doit se boucler dans la session
  du jour. Quatre quotidiennes réussies valent une hebdomadaire.
- **Marge sur une vente : la moitié de la cible hebdomadaire.** Le « coup du
  siècle » ne s'étale pas sur plusieurs jours : c'est une seule vente dans les
  deux cas. Le diviser par quatre le rendrait trivial.
- **Ventes par catégorie :** deux ou trois objets, un chiffre qu'on atteint dans
  une session d'étal.
- **Restauration :** jamais `Pristin état` au quotidien. Une restauration coûte
  du temps RÉEL (`DUREE_RESTAURATION_MS` : 1 h depuis Mauvais, 2 h depuis Bon,
  4 h depuis Très bon) ; viser Pristin imposerait 4 h d'attente **et** de
  posséder déjà une pièce en Très bon. `Bon` se satisfait d'une restauration
  Mauvais → Bon, soit 1 h.

**Point à surveiller à la recette : le palier 0** (niveaux 3 à 9). 75 € de
bénéfice ou 150 € de chiffre d'affaires en une journée de début de partie n'ont
pas été mesurés. Si ça coince, diviser par 5 plutôt que par 4 sur ce seul palier.

`objetsRaresQuotidien`, `recompenseQuotidienne` et toutes les valeurs
hebdomadaires existantes sont **inchangés**.

### Le trou de fin de journée

Les objectifs quotidiens chiffrés et la restauration se mesurent en temps réel,
depuis `timestampAcceptation`, et expirent au minuit local suivant. Un joueur qui
ouvre l'application pour la première fois à 23 h ne peut mécaniquement pas boucler
une restauration d'une heure ni un objectif de caisse. C'est un trait déjà présent
du système périodique (il vaut aussi pour les formes hebdomadaires en fin de
semaine), pas une régression introduite ici ; on l'accepte tel quel.

## La prime légendaire

Décision : **la prime en euros reste celle d'une quotidienne ordinaire, augmentée
d'un pourcentage de la valeur de la pièce trouvée, et la quête verse 3 jetons
Bazar au lieu d'un.**

```
argent = c.recompenseQuotidienne  +  TAUX_PRIME_LEGENDAIRE × prixRefBase(pièce)
jetons = 3
```

avec `TAUX_PRIME_LEGENDAIRE = 0,20`.

Deux arbitrages inscrits ici pour ne pas se reperdre :

- **Le pourcentage porte sur `prixRefBase`**, la valeur de marché du template,
  et non sur le prix réellement payé au vendeur. Sur le prix payé, un joueur qui
  négocie mal serait récompensé davantage — l'incitation serait à l'envers.
- **Si plusieurs légendaires sont acquis dans la journée, c'est le plus cher qui
  compte.** Un seul suffit à valider l'objectif ; autant que ce soit le bon.

### Ce que ça demande au système de récompense

`recompenseEffective(payload)` lit aujourd'hui un montant **figé à la naissance
de la quête**. Le légendaire, lui, est inconnu à ce moment-là : la prime ne peut
être résolue qu'à la livraison.

Le payload de mission porte donc un marqueur optionnel :

```ts
primeVariable?: { type: "pourcentageLegendaire"; taux: number }
```

et `recompenseEffective` accepte un contexte optionnel (`state`, `reso`) lui
permettant de retrouver la pièce déclenchante et d'ajouter la prime. Sans
contexte — les surfaces d'affichage qui n'ont pas encore de pièce à montrer — la
fonction retourne la base seule, exactement comme aujourd'hui. Aucune quête
existante ne porte le marqueur : le comportement est inchangé partout ailleurs.

**Conséquence d'affichage assumée :** tant que la pièce n'est pas trouvée, le
carnet ne peut pas afficher un total. Il affiche la base plus une mention
« + 20 % de la valeur de la pièce ». C'est l'appât de la ligne.

## Textes

Les gabarits chiffrés existants sont **écrits pour la semaine** :

> « Dégage {montant} de bénéfice **cette semaine** et on reparlera de ton métier. »
> « Fais chanter ta caisse — {montant} encaissés **avant dimanche**. »

Les servir tels quels sur une quotidienne produirait des lettres fausses. Il faut
donc des familles de gabarits en version « aujourd'hui ».

| Clé de gabarit | Usage | Existe ? |
|---|---|---|
| `rares` | objetsRares, les deux périodes | oui — texte neutre, réutilisable tel quel |
| `benefice`, `chiffre`, `marge`, `categorie` | hebdomadaire | oui, inchangés |
| `beneficeJour`, `chiffreJour`, `margeJour`, `categorieJour` | quotidien | **à écrire** |
| `restauration` | quotidien | **à écrire** |
| `legendaire` | quotidien | **à écrire** |

Six nouvelles familles × 2 variantes = **12 gabarits**, en FR (source dans
`quetes/textes.ts`) puis en EN, ES et EL (`i18n/contenu/{en,es,el}/quetesGabarits.ts`).
Le type `GabaritQueteId` s'élargit d'autant.

Règle de traduction déjà en vigueur, à respecter : les familles chiffrées parlent
avec la voix du même vieux marchand, en plus sec — **reformulation par ton, pas
calque du FR**.

## Carnet

- `ICONE_FORME` gagne deux entrées : `objetLegendaire` → `Crown`,
  `restauration` → `Hammer`.
- `formeDepuisObjectif` gagne les deux cas correspondants — c'est la source
  unique qui alimente les deux cartes du carnet, elle ne doit pas diverger.

Aucun autre changement d'UI : les lignes périodiques passent déjà par ces deux
tables.

## Sauvegarde

Aucune migration. Un nouveau membre d'`ObjectifMission` et un champ optionnel de
payload n'invalident aucune save existante ; le lot quotidien se régénère de
toute façon au premier changement de clé de jour. `SAVE_VERSION` reste inchangé.

## Tests

Le test qui verrouille aujourd'hui la composition (`periodiques.test.ts`,
« quotidienne : deux quêtes d'objet et une de rares ») **doit être remplacé**, pas
supprimé — il devient le test des nouveaux invariants :

- exactement une forme `objet` par lot quotidien ;
- deux formes tirées **distinctes**, et distinctes d'`objet` ;
- au plus une forme de famille `vente` parmi les tirées — **tant que ce garde-fou
  reste satisfiable**, c'est-à-dire tant qu'au moins deux formes hors `vente`
  sont éligibles (cf. le correctif décrit plus haut) ;
- la position de la quête `objet` **varie** selon la graine (l'invariant qui
  interdit le retour du lot scripté) ;
- la composition varie d'une graine à l'autre.

Verrous d'éligibilité :

- sans brocante tier 4 débloquée, `objetLegendaire` n'apparaît **jamais**, sur
  un grand nombre de graines ;
- la Grande Braderie seule ne débloque pas `objetLegendaire` ;
- sans `aCompetenceReparation`, `restauration` n'apparaît jamais ;
- avec les deux verrous ouverts, les deux formes apparaissent bien sur un
  échantillon de graines (sinon un filtre trop zélé passerait inaperçu).

Barème et prime :

- chaque nouveau champ d'`echelle.ts` est croissant d'un palier au suivant ;
- `restaurationEtatMin` n'est jamais `Pristin état` ;
- la prime légendaire vaut base + 20 % du `prixRefBase` de la pièce, et retient
  **la plus chère** quand il y en a plusieurs ;
- sans marqueur `primeVariable`, `recompenseEffective` rend exactement ce qu'elle
  rendait avant (test de non-régression).

Textes : le test existant qui vérifie qu'aucun `gabaritId` produit n'est
orphelin des trois overlays de langue doit couvrir les 12 nouvelles clés — c'est
lui qui empêche une quête de sortir en français au milieu d'une partie grecque.

⚠ `npm run test -- --maxWorkers=4` : sans ce drapeau, ~41 faux échecs par famine
de workers sur ce Mac.

## Hors périmètre

- L'hebdomadaire : ni son tirage, ni son barème, ni ses textes ne bougent.
  (`objetLegendaire` et `restauration` pourraient un jour rejoindre
  `FORMES_HEBDOMADAIRES` — pas ce chantier.)
- Le taux de drop des légendaires (`MIX_RARETE_PAR_TIER`) n'est pas retouché :
  la rareté de la ligne est voulue.
- Aucune cérémonie ni animation particulière pour la réussite légendaire.
