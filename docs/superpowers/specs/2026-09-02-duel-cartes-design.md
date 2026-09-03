# Duel de cartes — règles, équilibrage et données des 50 cartes

Date : 2026-09-02 · Branche : `feat/classeur-album` (à confirmer au plan ; une
branche fille `feat/duel-cartes` est possible)

## 1. Intention

Les 50 cartes du classeur (`src/data/cartes.ts`) deviennent un **véritable jeu
de cartes à jouer**, à la manière de Pokémon : des objets de brocante
toonifiés qui s'affrontent. Chaque carte porte ses caractéristiques propres ;
l'ensemble des 50 permet à deux personnes de construire chacune un deck de
20 cartes et de jouer une partie **équilibrée**.

Ce chantier livre **les règles, les caractéristiques des 50 cartes, la preuve
chiffrée de leur équilibre, et leur affichage dans l'app** (fiche de carte,
livret de règles). Il ne livre **pas** de duel jouable : le moteur écrit pour
la simulation est conçu pour devenir le moteur de jeu plus tard, mais il
n'est branché à aucun écran.

## 2. Décisions prises (avec Guillaume, 2026-09-02)

| Sujet | Décision |
|---|---|
| Nature | Conçu pour un moteur (déterministe, aucun effet « à l'appréciation des joueurs »), sans mode jouable dans ce chantier. |
| Fiction | Combat façon Pokémon entre objets de brocante toonifiés. |
| Ressource | Énergie croissante : plafond +1 par tour jusqu'à 5, rechargée chaque tour. Pas de cartes énergie. |
| Victoire | Points de vie du joueur (« vitrine », 20). Les objets attaquent la vitrine ou un objet. |
| Catégories | Roue de forces à 7 crans, bonus **+1 dégât** (pas ×2), sans malus inverse. Pas de synergies de famille en règle de base. |
| Deck | 20 cartes, **singleton**, 2 légendaires maximum. |
| Effets | Communes : un mot-clé au plus, liste fermée de 6 ; rares et légendaires : un effet unique bâti sur un vocabulaire fermé. |
| Équilibrage | Budget de points pour la première version, puis simulation informatique jusqu'à des cibles chiffrées (§6). |

## 3. Les règles du duel

### 3.1 Mise en place

- Deux joueurs, 20 points de vie chacun (leur **vitrine**).
- Chaque joueur mélange son deck de 20 cartes et pioche 4 cartes.
- Le second joueur pioche une 5ᵉ carte **et** dispose d'1 énergie
  supplémentaire à son premier tour.

**Amendement 2026-09-03** : le paramètre d'équilibrage d'origine offrait le
choix entre les deux compensations (5ᵉ carte, ou +1 énergie) ; la campagne les
a mesurées séparément puis **cumulées** (rapport d'équilibrage, « les trois
variantes »), et c'est le cumul qui est retenu ci-dessus — c'est la variante
la plus proche de 50 % pour le premier joueur, sans toutefois l'atteindre
(l'avantage du premier joueur résiste, voir le rapport, « Ce qui résiste »).

### 3.2 Le tour, dans cet ordre

1. **Énergie** : le plafond monte de 1 (maximum 5) ; l'énergie disponible
   est rechargée au plafond.
2. **Pioche** : 1 carte. Deck vide : le joueur subit 1 dégât au premier
   échec de pioche, 2 au second, 3 au troisième, etc. Main limitée à 7 :
   une carte piochée au-delà part à la casse.
3. **Pose et attaques**, dans l'ordre voulu par le joueur :
   - poser une carte de sa main en payant son coût en énergie ; **4 objets
     maximum** sur son étal ;
   - faire attaquer chaque objet **une fois**, à condition qu'il ait été
     posé avant le début de ce tour (sauf Prompt).
4. **Fin de tour** : les effets « en fin de tour » se résolvent (Fragile).

### 3.3 L'attaque

- Cible au choix : la vitrine adverse ou un objet adverse.
- Si l'adversaire a au moins un objet **Barrage**, la cible doit être un
  Barrage.
- Contre un objet : les deux objets se blessent **mutuellement** de leur
  valeur d'attaque, simultanément.
- Contre la vitrine : seul l'attaquant frappe ; la vitrine perd les points.
- Un objet à 0 PV ou moins part à la **casse** (défausse). Les dégâts
  restent marqués d'un tour à l'autre ; pas de guérison automatique.
- Un objet d'attaque 0 ne peut pas attaquer.

### 3.4 La roue des catégories

Bricolage → Maison → Mode → Musique → Livres & Papeterie → Jeux & Loisirs →
Objets d'art → Bricolage (« A → B » : A domine B).

- Un objet qui blesse un objet de la catégorie qu'il domine inflige
  **1 dégât de plus**, y compris en riposte.
- Aucun bonus contre la vitrine. Aucun malus dans l'autre sens.
- Le bonus ne concerne que les blessures d'attaque (§3.3), jamais les
  dégâts infligés par un Cri ou un effet.

### 3.5 Victoire

La vitrine adverse tombe à 0 ou moins. Les deux à zéro au même instant :
match nul.

### 3.6 Le deck

20 cartes, une seule copie de chaque carte, 2 légendaires au maximum.

## 4. Anatomie d'une carte

### 4.1 Caractéristiques

| Champ | Domaine |
|---|---|
| Coût | 1 à 5 |
| Attaque | 0 à 6 |
| Points de vie | 1 à 8 |
| Catégorie | l'une des 7 (déjà dans le catalogue), avec sa proie sur la roue |
| Texte | rien, ou un mot-clé (communes), ou un effet unique (rares, légendaires) |

### 4.2 Les 6 mots-clés (communes uniquement, liste fermée)

| Mot-clé | Règle |
|---|---|
| **Barrage** | Tant qu'il est en jeu, les attaques adverses doivent le viser. |
| **Prompt** | Peut attaquer le tour où il est posé. |
| **Solide** | Chaque dégât reçu est réduit de 1 (minimum 0). |
| **Fragile** | Perd 1 PV en fin de tour de son propriétaire. |
| **Ruse** | Ne peut pas être ciblé avant le prochain tour de son propriétaire. |
| **Cri** | Effet à la pose, parmi trois variantes : *piochez 1 carte* ; *1 dégât à un objet adverse au choix* ; *rendez 2 PV à votre vitrine*. |

Précisions de résolution :

- Un Barrage sous Ruse (posé ce tour) ne contraint pas la cible : il est
  ignoré comme s'il n'était pas là.
- Solide s'applique à tout dégât (attaque, riposte, Cri, effet) ; la perte
  de PV de Fragile n'est pas un dégât, Solide ne la réduit pas.
- Un objet tombé à 0 PV par Fragile part à la casse comme par une blessure.

**Amendement 2026-09-03** (Ruse) : la formulation initiale (« le tour où il
est posé ») ne couvrait que la moitié de la protection réellement codée
(`sousRuse`) — celle-ci dure aussi tout le tour adverse qui suit la pose, pas
seulement le tour de pose lui-même. La table ci-dessus reflète maintenant le
code.

Une dizaine de communes sont « vanille » (sans texte), avec de meilleures
stats en compensation.

### 4.3 Les effets uniques (15 rares, 5 légendaires)

Un effet = **un déclencheur + une ou deux actions**, exprimé dans un
vocabulaire fermé que le moteur interprète sans code par carte.

- Déclencheurs : `pose`, `casse`, `debutTour` (du propriétaire),
  `attaque` (quand il attaque), `blesse` (quand il subit des dégâts).
- Actions (avec cible et valeur) : dégâts à un objet adverse au choix / à
  tous les objets adverses / à la vitrine adverse ; soin de la vitrine ;
  pioche ; énergie supplémentaire ce tour ; gain d'attaque ou de PV pour
  lui-même / pour tous ses alliés / pour ses alliés d'une catégorie ;
  retour d'un objet adverse dans la main de son propriétaire ; vol d'un
  mot-clé d'un objet adverse.
- Les rares portent une action ; les légendaires au plus deux, ou une
  action qui touche tout le plateau.
- Exemples de ton (textes définitifs au §7) : *Feuillet de Gutenberg* —
  « À la pose, piochez 2 cartes. » ; *Violon crémonais* — « En début de
  votre tour, vos objets Musique gagnent 1 d'attaque. »

### 4.4 Données dans le code

- Nouveau fichier `src/data/duel/cartesDuel.ts` : `Record<idCarte,
  StatsDuel>` avec `cout`, `attaque`, `pv`, et `texte?: MotCle | Effet`
  (union discriminée). Le catalogue `cartes.ts` **ne change pas**.
- `src/data/duel/roue.ts` : l'ordre de la roue et `domine(a, b)`.
- Test de garde : les 50 cartes ont des stats ; domaines respectés ; une
  commune ne porte qu'un mot-clé de la liste ; une rare/légendaire ne porte
  qu'un `Effet` ; ≤ 2 actions par effet ; la courbe de coût du §5.3 est
  respectée ; chaque catégorie couvre les coûts 1 à 4.
- Les libellés (mots-clés, déclencheurs, actions) sont traduits **une fois
  chacun** dans les dictionnaires UI (FR/EN/ES/EL) ; le texte d'une carte
  est composé par un générateur `libelleTexteDuel(texte, d)`. Jamais de
  phrase écrite à la main par carte.

## 5. Formule de budget et répartition du set

### 5.1 Budget

Une carte de coût C dispose de **2C + 1 points** de stats (1 point par point
d'attaque, 1 point par PV). Bornes : attaque ≤ 6, PV ≤ 8.

### 5.2 Prix des mots-clés et des effets (retiré du budget)

| Texte | Prix | Note |
|---|---|---|
| Barrage | 1 | |
| Prompt | 1 | Attaque ≤ 3 sur un Prompt |
| Solide | 2 | PV ≤ 5 sur un Solide |
| Ruse | 1 | |
| Cri : pioche | 2 | |
| Cri : 1 dégât | 1 | |
| Cri : 2 PV | 1 | |
| Fragile | −2 | Rend des points : surdimensionné mais éphémère |
| Effet de rare | 1 à 3 | Estimation initiale, corrigée par la simulation |
| Effet de légendaire | jusqu'à 4 | Les légendaires ont **+1 point** de budget (limite de 2 par deck) |

### 5.3 Courbe de coût

| Coût | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Cartes | 8 | 12 | 13 | 10 | 7 |

Les 5 légendaires coûtent 4 ou 5. Chaque catégorie couvre au moins les
coûts 1 à 4.

### 5.4 Personnalité mécanique des catégories

| Catégorie | Cartes | Personnalité |
|---|---|---|
| Bricolage | 8 | Attaque haute, PV bas, Prompt — agressif |
| Maison | 7 | PV hauts, Barrage, soin — défensif |
| Mode | 7 | Ruse, retour en main, tempo |
| Musique | 8 | Cri pioche, gains d'attaque alliés |
| Livres & Papeterie | 7 | Dégâts directs, pioche, contrôle |
| Jeux & Loisirs | 7 | Prompt, Fragile, bon marché — rapide |
| Objets d'art | 6 | Solide, PV moyens, valeur brute |

## 6. Moteur de simulation et campagne d'équilibrage

### 6.1 Moteur (`src/lib/duel/`)

- Module pur : sans React, sans save, sans i18n.
- État immuable : vitrines, plafond et énergie, mains, decks, étals (objets
  avec PV courant, attaque courante, drapeaux « posé ce tour » / « a
  attaqué »), casse, numéro de tour, joueur actif, compteur d'échecs de
  pioche.
- Actions fermées : `poser(idCarte)`, `attaquer(idObjet, cible)`,
  `finirTour()`. Chaque action renvoie le nouvel état ou un refus motivé.
- Hasard par générateur à graine (comme `tirerPiece`). Même graine, même
  partie.
- Un seul interpréteur des mots-clés et du vocabulaire d'effets (§4.3).

### 6.2 Joueurs artificiels (deux profils, déterministes, un coup d'avance)

- **Agressif** : pose ce qui dépense le plus d'énergie ; cherche le coup
  fatal ; sinon frappe la vitrine ; n'échange contre un objet que si le
  sien survit.
- **Prudent** : pose de même ; échange dès qu'il peut casser un objet
  adverse de valeur ≥ à la sienne ; ne frappe la vitrine qu'avec un étal
  dominant (somme d'attaque supérieure à celle de l'adversaire).

### 6.3 Decks de campagne (tirés avec la graine)

- Aléatoires sous contraintes (§3.6).
- Bicolores : deux catégories adjacentes ou opposées sur la roue.
- Par courbe : agressif (coûts 1 à 3) contre contrôle (coûts 3 à 5).

### 6.4 Mesures et cibles (campagne = 20 000 parties)

| Mesure | Cible |
|---|---|
| Taux de victoire d'une carte présente dans un deck | 45 à 55 % |
| Taux de pose d'une carte quand elle est piochée | ≥ 60 % |
| Taux de victoire d'une catégorie | 45 à 55 % |
| Avantage du premier joueur | < 55 % |
| Durée des parties | moyenne 8 à 14 tours, aucune > 25 |
| Matchs nuls + parties décidées par la pioche épuisée | < 2 % |
| Agressif contre contrôle | 45 à 55 % |

### 6.5 Protocole

- Script `scripts/duel-campagne.ts` (lancé par `tsx`), graine et nombre de
  parties en argument, sortie : tableau des mesures + liste des cartes hors
  cible.
- Chaque campagne est numérotée et consignée (chiffres + retouches
  décidées) dans `docs/superpowers/duel/rapport-equilibrage.md`.
- Retouches par petites touches : prix d'effets d'abord, stats ensuite,
  **jamais les règles**.
- Set déclaré équilibré quand toutes les cibles sont atteintes sur **trois
  campagnes consécutives à graines différentes**.

### 6.6 Tests

- Moteur en TDD : un test par règle du §3 et par mot-clé du §4.2, un test
  par action du vocabulaire d'effets, un test de déterminisme (même graine
  → même journal de partie).
- Test rapide de robustesse : 200 parties aléatoires, aucune exception,
  aucune partie au-delà de 60 tours (garde-fou de boucle).
- La campagne complète n'est pas un test.

## 7. Les 50 cartes

Les caractéristiques définitives sont produites par le plan (première
version au budget du §5, puis boucle d'équilibrage du §6) et vivent dans
`cartesDuel.ts`. Le rapport d'équilibrage garde la trace de chaque version.
La spec ne les fige pas : c'est la simulation qui les fige.

## 8. Ce que le joueur voit

- **Fiche de carte** (`FichePiece`, cartes seulement) : sous le visuel, une
  ligne de duel — coût dans une pastille d'énergie, attaque et PV avec
  pictogrammes, texte composé par `libelleTexteDuel`, et la proie sur la
  roue (« Casse : Maison »). Les timbres ne changent pas.
- **Livret de règles** : bouton « Règles » dans `LigneBasAlbum` du classeur
  → feuille qui défile (règles du §3 en une page, roue dessinée en cercle,
  liste des 6 mots-clés). Textes dans les dictionnaires UI, 4 langues.
- **Hors périmètre** : duel jouable, constructeur de deck, IA visible,
  modification de la save (`SAVE_VERSION` intact).
- **Chantier suivant** : l'art des 50 cartes lira `cartesDuel.ts` pour
  imprimer coût, attaque, PV et texte sur le gabarit.

## 9. Ordre de livraison

1. Roue, types de données, test de garde (avec des stats provisoires).
2. Moteur en TDD (règles, mots-clés, interpréteur d'effets).
3. IA, générateurs de decks, script de campagne, rapport vide.
4. Première version des 50 cartes au budget.
5. Boucle d'équilibrage jusqu'aux cibles (§6.5).
6. Fiche de carte et livret de règles, i18n 4 langues.
