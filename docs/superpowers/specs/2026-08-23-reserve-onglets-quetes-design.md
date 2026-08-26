# Réserve à onglets & onglet Quêtes — design

Date : 2026-08-23

## Le problème

La barre du bas porte cinq destinations : Collection, Bibliothèque, Bureau,
Stockage, Atelier. Deux d'entre elles — Stockage et Atelier — sont déjà, au
pixel près, le même écran : une fenêtre flottante (`FloatingRoomOverlay`)
posée sur le panorama du bureau, avec la même carte de tête
(`PageHeaderBar`) et le même panneau scrollable. Elles occupent deux
colonnes pour une seule idée : « mes objets et ce que j'en fais ».

Dans le même temps, le carnet de quêtes — le cœur de la progression — n'a
aucune entrée dans la barre. On l'atteint en swipant jusqu'à la bonne zone
du panorama du bureau, puis en tapant un livre posé sur la table.

## Ce qu'on fait

1. Fusionner Stockage et Atelier en une pièce unique, **la Réserve**, à deux
   onglets hauts.
2. Libérer la colonne ainsi gagnée pour un onglet **Quêtes** qui ouvre
   directement le carnet.
3. Retirer le livre du panorama du bureau : l'onglet devient le seul chemin.
4. Adapter le tutoriel, qui désigne des positions à l'écran que ces trois
   points déplacent.

Nouvelle barre du bas, dans cet ordre :

| # | Onglet | Icône | Route | Verrou |
|---|---|---|---|---|
| 1 | Quêtes | `ScrollText` | `/quetes` | — |
| 2 | Biblio. | `BookOpen` | `/bibliotheque` | niveau ≥ 1 |
| 3 | Bureau | `Home` | `/bureau` | — |
| 4 | Réserve | `Warehouse` | `/stockage` (+ `/atelier`) | — |
| 5 | Collection | `Album` | `/collection` | — |

Le Bureau reste au centre. L'ordre de `TAB_ORDER` est aussi l'ordre du
swipe entre pièces : le cycle devient Quêtes → Biblio → Bureau → Réserve →
Collection → Quêtes.

## Architecture des routes

**`/stockage` et `/atelier` restent deux vraies routes.** Elles rendent la
même coquille ; l'onglet haut actif se déduit de l'URL, et taper l'autre
onglet fait un `router.replace()`.

C'est contre-intuitif pour une « fusion », et c'est pourtant le choix le
moins cher : sept mécanismes du jeu désignent ces pièces par leur chemin et
continuent de fonctionner sans être touchés —

| Mécanisme | Fichier |
|---|---|
| Chrome global (bannière tuto, level-up) | `lib/routesPartie.ts` |
| Ambiance sonore par pièce | `components/mobile/GlobalVinylAmbiance.tsx` |
| Vol des objets vers l'onglet (`data-fly-target`) | `lib/flyAnimation.ts` |
| Onglet permis par le tutoriel scripté | `lib/tutoriel.ts` |
| Fermeture des sheets hors bureau | `components/mobile/qg/useFermerSheetHorsBureau.ts` |
| Deep-link de catégorie `?cat=` | `app/(qg)/stockage/page.tsx` |
| Notification « restauration prête » | `lib/notifications/restaurationNotif.ts` |

L'alternative — une route unique `/reserve?onglet=atelier` — imposerait de
réécrire ces sept-là sans rien apporter en échange.

### Ce qui change dans la navigation

- `TabDef` gagne `routes: string[]`, la liste des chemins appartenant à
  l'onglet. L'entrée Réserve devient
  `{ icon: Warehouse, cle: "reserve", path: "/stockage", routes: ["/stockage", "/atelier"] }`.
  Les autres onglets ont `routes: [path]`.
- `findActiveTabIndex` cherche dans `routes` au lieu de `path`. **Sans ce
  changement, arrivé sur `/atelier` elle renverrait `-1` et le swipe entre
  pièces casserait** : `SwipePager` s'en sert pour savoir d'où il part.
- Le badge « restaurations prêtes », aujourd'hui sur l'onglet Atelier,
  remonte sur l'onglet Réserve, et se redouble en pastille sur l'onglet
  **haut** Atelier — le joueur doit savoir laquelle des deux moitiés
  l'appelle.
- Le verrou `aCompetenceReparation` quitte la barre du bas pour l'onglet
  haut Atelier.
- Nouvelle route `/quetes` dans le groupe `(qg)`, page marqueur rendant
  `null` (même montage que `/bureau`) ; ajoutée à `ROUTES_PARTIE`, à la
  liste de `SwipePager` et à celle de `GlobalVinylAmbiance`.

### Nouveaux fichiers

- `src/components/mobile/reserve/ReserveTabs.tsx` — la bande d'onglets
  haute : deux onglets, cadenas, pastille de badge.
- `src/components/mobile/reserve/ReserveShell.tsx` — le
  `FloatingRoomOverlay` commun, qui reçoit `bande` / `milieu` / contenu de
  l'onglet actif et gère la règle d'animation ci-dessous.

Les corps des deux pages actuelles (315 et 896 lignes) sont **extraits, pas
réécrits**, en `StockageContenu` et `AtelierContenu`. Un changement de
navigation ne justifie pas de réécrire 1 200 lignes de logique métier.

## La bande d'onglets haute

Elle **remplace** le titre centré `— STOCKAGE —` / `— ATELIER —` en tête de
la carte du haut, au lieu de s'y ajouter : le titre devient redondant dès
qu'un onglet porte le même mot, et une barre supplémentaire coûterait
~34 px sur un écran déjà serré entre le header et la barre du bas.

```
┌─ header (énergie, budget, date) ───────────┐
├────────────────────────────────────────────┤   ← carte papier de la bande
│╔══════════════╗                            │
│║   STOCKAGE   ║  🔒 ATELIER                │   ← l'onglet actif est du même
│╚══════════════╝────────────────────────────│      papier que la carte, sans
│  MALLE  14/20            [ AMÉLIORER 250€ ]│      trait dessous
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│  (contenu de l'onglet, scrollable)          │
```

Chaque onglet garde sa ligne de contexte inchangée : Stockage affiche le
palier et la capacité (`MALLE 14/20`) plus le bouton d'amélioration ;
Atelier affiche le compteur d'établis, la barre de pièces, et son bloc
`milieu` (les trois établis) que le Stockage n'a pas.

Habillage : onglet actif sur `paper-100` — le papier de la carte — texte
`forest-800`, sans bordure basse, de sorte que l'onglet et la carte ne
fassent qu'un. Onglet inactif sur `paper-200`, texte `brass-700`, bordure
basse `brass-500`. Police d'affichage, capitales, interlettrage large,
comme la barre du bas.

Onglet verrouillé : icône grisée, cadenas laiton par-dessus, opacité 0,55,
et le tap répond par le toast `verrouAtelier` sans naviguer — exactement le
vocabulaire de la barre du bas, pour que le joueur reconnaisse la règle.

**Pas de swipe horizontal entre les deux onglets hauts.** `SwipePager`
capte déjà le swipe horizontal pour passer de pièce en pièce ; un second
swipe imbriqué se disputerait le même geste. Les onglets se tapent.

### La règle d'animation

`FloatingRoomOverlay` joue une entrée de 320 ms : la bande glisse de sous
le header, le panneau monte de la barre du bas. C'est juste à l'arrivée
dans la pièce, mais rejoué à chaque tap d'onglet ce serait lourd — et comme
on change réellement de route, React démonte tout et l'animation
repartirait.

`ReserveShell` retient donc en mémoire de module la dernière pièce de la
Réserve quittée. Si on arrive sur `/atelier` en venant de `/stockage` (ou
l'inverse), la coquille **saute le glissement** et fait un fondu de 140 ms
sur le seul contenu : les deux cartes ne bougent pas. Arrivée depuis le
Bureau, la Collection ou n'importe où ailleurs : glissement complet, comme
aujourd'hui.

Ce garde-fou sert deux fois. Il évite une animation lourde, et il donne au
coach du tutoriel une image immobile à mesurer — la découpe du coach mesure
le rectangle réel de sa cible, et cette animation de 320 ms a déjà faussé
la mesure au montage (recette du 19 août).

## L'onglet Quêtes

`CarnetOverlay` est déjà monté dans le layout `(qg)`, piloté par un booléen
`carnetOuvert`. Ce booléen est remplacé par la route : `/quetes` est une
page marqueur rendant `null`, et le layout ouvre le carnet quand
`pathname === "/quetes"`. Sa croix de fermeture navigue vers `/bureau`.
Le carnet lui-même — sections, cérémonie de livraison, cartes d'histoire —
n'est pas touché.

**Un ajustement nécessaire** : le carnet est déjà cadré entre le header et
la barre du bas, mais son voile de fond couvre tout l'écran en
`z-index: 50` et **recouvre donc la barre du bas** — cohérent quand on
l'ouvrait depuis le bureau et qu'on en sortait par sa croix, intenable pour
un onglet dont on doit pouvoir sortir par la barre. Le voile s'arrête au
sommet de la barre (`bottom: var(--mobile-tabbar-h)`) et descend en
`z-index: 35`, comme la fenêtre flottante de la Réserve.

Un badge sur l'onglet Quêtes compte les missions livrables : l'information
que portaient les pastilles du bureau doit rester visible depuis n'importe
quelle pièce.

### Le retrait du livre

`QgCarnet` disparaît du panorama. Ce qui en dépend :

- Les pastilles de livrables (`LivrablesBadges`) restent dans le bureau
  mais naviguent vers `/quetes?mission=<id>` au lieu d'ouvrir un calque.
- Le doigt qui invitait à swiper vers la zone du livre
  (`doigtSwipeVersCarnet`) disparaît : il n'y a plus de zone à rejoindre.
- La fin du tutoriel, voir ci-dessous.

## Libellés

Nouvelles clés dans `chrome.onglets`, quatre langues :

| Clé | fr | en | es | el |
|---|---|---|---|---|
| `reserve` | Réserve | Storeroom | Almacén | Αποθήκη |
| `quetes` | Quêtes | Quests | Misiones | Αποστολές |
| `quetesAbrege` | Quêtes | Quests | Misiones | Αποστ. |

Le grec est le cas serré : « Αποστολές » ne tient pas dans un cinquième
d'écran, d'où l'abrégé.

`libelleAbrege` et `libelleAria` traitent aujourd'hui la Bibliothèque en
cas particulier codé en dur. Elles sont généralisées : `TabDef` porte une
clé d'abrégé optionnelle, et l'aria-label reprend le libellé complet quand
les deux diffèrent. Un troisième cas particulier en dur serait le début
d'une liste.

Les clés `stockage` et `atelier` restent : elles servent désormais aux
onglets **hauts**.

Le mot « réserve » est déjà dans la bouche du grand-père
(`coachStockageCapacite` : « Ta réserve : le Garage, 10 places »). Le
nouveau libellé ne dépayse personne.

## Le tutoriel

Le tutoriel ne nomme pas des routes : il désigne des positions à l'écran.
Trois de ces positions bougent.

**① La consigne qui nomme l'onglet.** `instructions["stockage-ouvrir"]`
— « Ouvre le *Stockage*, en bas. » — devient « Ouvre la *Réserve*, en
bas. », dans les quatre langues. Sans ça, la bannière montre un mot que la
barre n'affiche plus : le pire cas pour un nouveau joueur.

**② La visite de l'Atelier.** Quand le joueur achète sa première compétence
*Réparer*, le jeu arme `miniTutoAtelier: "visite"` et pose une main sur
l'onglet Atelier du bas. Cet onglet n'existe plus. La guidance passe **en
deux temps** : main sur RÉSERVE (barre du bas), puis, la page ouverte, main
sur l'onglet ATELIER (bande haute) dont le cadenas vient de tomber. C'est
le seul endroit où l'on **ajoute** de la mécanique de tutoriel au lieu d'en
déplacer.

**③ La fin du tutoriel.** Elle se déclenche aujourd'hui à l'ouverture du
carnet (`miniTutoCarnet`, layout ligne 452), désigné par une main sur le
livre. Elle se rebranche sur l'**arrivée sur `/quetes`**, et la main passe
sur l'onglet Quêtes, désormais tout à gauche.

**④ Le mini-tuto vinyle** (« range le vinyle ») pointe déjà `/stockage` :
la main tombe juste, seul le mot change.

**⑤ Le cadenas pendant le tutoriel.** L'onglet haut ATELIER reste visible
et cadenassé pendant le tutoriel, et la visite guidée du stockage gagne une
bulle de coach : « Et là, l'atelier — il ouvrira quand tu sauras réparer. »
Le joueur sait dès la première heure qu'il y a une seconde pièce à gagner.
Une bulle de plus à écrire en quatre langues, ancrée sur un nouveau
`data-tuto-coach="reserve-onglet-atelier"`.

## Tests

Développement en TDD, comme le reste du dépôt.

- `findActiveTabIndex("/atelier")` renvoie l'onglet Réserve. **C'est le
  test qui empêche la régression silencieuse du swipe entre pièces.**
- `ongletSuivantOuvert` boucle sur les cinq onglets dans le nouvel ordre,
  en sautant la Bibliothèque verrouillée.
- L'onglet haut Atelier est cadenassé sans compétence Réparer, ouvert avec,
  et son tap verrouillé ne navigue pas.
- Arrivée sur `/atelier` depuis `/stockage` : pas de glissement. Depuis
  `/bureau` : glissement.
- `/quetes` ouvre le carnet ; `/quetes?mission=<id>` déplie la bonne quête.
- La barre du bas reste atteignable quand le carnet est ouvert.
- La fin du tutoriel se clôt sur l'arrivée en `/quetes`.
- La consigne de l'étape `stockage-ouvrir` nomme la Réserve dans les quatre
  langues.

Vérification faite : **ces deux pages n'ont aucun test de rendu
aujourd'hui** — il n'existe ni `stockage/page.test.tsx` ni
`atelier/page.test.tsx`. Rien à recibler, donc, mais rien ne les protège
non plus pendant l'extraction. Les tests ci-dessus sont d'autant plus le
filet.

**Une garde lit ces pages par leur chemin de fichier.**
`src/lib/ads/emplacementsAppeles.test.ts` ouvre
`src/app/(qg)/atelier/page.tsx` en clair et vérifie qu'il appelle
`showRewardedAd(EMPLACEMENTS_PUB.restauration)` — c'est le test qui empêche
tout le trafic publicitaire de retomber sur le bloc de la recharge
d'énergie. Extraire le corps de l'atelier vers `AtelierContenu.tsx` **casse
cette garde en silence** : le fichier lu ne contiendra plus l'appel. Sa
table `APPELANTS` doit suivre le déplacement dans la même tâche.

Commande : `npx vitest run --maxWorkers=4`. Sans ce drapeau, ce Mac produit
~41 faux échecs par famine de workers.

## Ordre de livraison

1. **La Réserve** : `ReserveShell`, `ReserveTabs`, extraction des contenus,
   `TabDef.routes`, `findActiveTabIndex`, badge et verrou déplacés, règle
   d'animation. Recette visuelle sur le localhost.
2. **L'onglet Quêtes** : route `/quetes`, cadrage du voile du carnet,
   retrait du livre, `LivrablesBadges` re-routées, réordonnancement de la
   barre, libellés des quatre langues.
3. **La passe tutoriel** : les cinq points ci-dessus.

Le tutoriel vient en dernier parce qu'il désigne des positions qui ne sont
stables qu'une fois ① et ② posés.

## Hors périmètre

- Aucune migration de sauvegarde : rien de tout ceci ne touche l'état
  persisté. `SAVE_VERSION` ne bouge pas.
- La Collection ne migre pas vers le châssis de fenêtre flottante, même si
  elle le pourrait.
- Le contenu du carnet de quêtes n'est pas retouché.
