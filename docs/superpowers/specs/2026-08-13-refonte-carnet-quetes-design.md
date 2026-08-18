# Refonte du carnet de quêtes — conception

**Date :** 2026-08-13
**Chantier :** ② sur deux (① = catalogue de quêtes périodiques, livré sur
`feat/quetes-periodiques-variees`, spec `2026-08-13-quetes-periodiques-variees-design.md`)

## Pourquoi

Le carnet actuel est un registre à onglets hérité : bordeaux codé en dur, têtes
de commanditaires en 92 px, sections empilées sans hiérarchie, et un onglet
« Comptes » que rien n'ouvre jamais sauf lui-même. Une maquette a été fournie —
papier crème, reliure, photos scotchées — et c'est elle qui fait référence.

Le chantier ① a fermé la liste des formes de quêtes, ce qui était le préalable :
la règle d'affichage *objet précis → photo, sinon icône* ne pouvait être dessinée
qu'une fois cette liste connue.

## Périmètre

**Dans ce chantier :** la fenêtre, ses sections rétractables, la carte
d'histoire, la ligne de quête périodique, le pavé récompense/livrer, et
l'enchaînement automatique des chapitres du grand-père.

**Hors de ce chantier :** l'équilibrage des quêtes, le contenu textuel, et toute
réintégration ailleurs du rejeu des bilans de session.

## 1. La fenêtre et ses sections

Le carnet reste une **fenêtre flottante** ouverte sur le bureau, calée entre le
header et la barre d'onglets. Tout le reste change.

**Pas d'onglets.** Une page qui défile, **trois sections rétractables** —
HISTOIRE, QUÊTES DU JOUR, QUÊTES DE LA SEMAINE — dépliées à la première
ouverture.

Les onglets ont été écartés délibérément : le carnet complet fait six à sept
entrées, soit deux écrans. Des onglets factureraient un tap pour voir ce qu'un
pouce trouve seul, et cacheraient les quêtes du jour, qui sont la raison
première d'ouvrir le carnet.

**L'état de repli vit dans `localStorage`**, clé `broc.carnet.sections`, pas dans
la sauvegarde. C'est une préférence d'affichage de la personne, pas de la
partie : elle n'a pas à voyager entre les trois emplacements de sauvegarde, et
elle ne justifie ni un `SAVE_VERSION` ni une migration. Le projet range déjà
`broc.qg-edit.enabled` de cette façon.

**En-têtes collantes** pendant le défilement : on sait toujours où on est, et le
compte à rebours « se renouvelle dans 05h 17m » reste visible.

**Une en-tête repliée porte son état** — `QUÊTES DU JOUR (2/3) · 1 prête`.
Replier ne doit jamais cacher une action possible ; c'est cette règle qui rend
le repli sans danger.

### Les sections vides parlent

| Situation | Ce qui s'affiche |
|---|---|
| Niveau < 3 | les deux sections périodiques portent une ligne verrouillée « à partir du niveau 3 » |
| Après le chapitre 16 | HISTOIRE porte une ligne de clôture — la trame est finie |
| Entre deux chapitres | ne se produit plus : le grand-père enchaîne (§3) |

Une page vide est un cul-de-sac. Le joueur de niveau 2 apprend que les quêtes du
jour existent avant de les avoir. Ces deux phrases sont du texte de jeu : elles
s'écrivent dans les quatre langues, comme le reste.

### Ce qui ne change pas

**Le point d'entrée.** Le carnet s'ouvre toujours en tapant le livre sur le
bureau (`QgCarnet`), et l'ouverture reste ce qui déclenche le premier chapitre en
fin de tutoriel. Le tutoriel ne s'accroche qu'à l'ouverture, jamais au contenu —
la refonte est donc sans risque pour lui, à condition de ne pas déplacer ce
point d'entrée.

**L'ouverture ciblée.** Taper la pastille d'une quête livrable dans le QG ouvre
le carnet **sur cette quête** : la section concernée est dépliée d'office même
si le joueur l'avait repliée, la quête est dépliée, et le carnet défile jusqu'à
elle. C'est le rôle de l'actuel `missionInitialeId`, et il doit survivre à la
refonte — sans quoi la pastille mène à un carnet où il faut chercher.

### Ce qui disparaît

La barre d'onglets, l'onglet « Comptes », le rejeu des bilans de session, la
section « Terminées ». Le carnet ne parle plus que de ce qu'il y a à faire.

`OngletComptes.tsx` est supprimé. Le rejeu (`SessionSummary` en mode
`xpReplayMode`) perd son unique point d'entrée et part avec lui ; l'historique
git le conserve si le sujet revient. **Correction post-revue** : `SessionSummary`
lui-même n'a JAMAIS servi au bilan de fin de session — c'est
`src/components/mobile/bilan/BilanSession.tsx` qui en est chargé, et il n'est
pas touché par cette refonte. `SessionSummary` n'était atteint que par le rejeu
de l'ancien registre supprimé ci-dessus ; il n'a donc plus aucun importeur.
Il n'est pas supprimé par cette même refonte (décision qui revient à l'auteur
du projet), mais son sort n'est plus lié au bilan de fin de session.

## 2. Les deux cartes

Deux formes, une règle commune : **on lit la quête sans lire le texte.**

### La carte d'histoire

Une seule à la fois — `chapitrePret` ne propose le chapitre suivant que si le
précédent est livré, donc il y a toujours 0 ou 1 quête principale active.

- **Photo scotchée** de l'objet demandé, légèrement de travers, en polaroïd. Les
  objets suivants sont des vignettes scotchées plus petites : **trois vignettes
  au maximum en plus du polaroïd**, puis un « +n » pour le reste. Un chapitre
  sans objet — « Vendre, c'est vivre » compte des ventes — porte l'icône Lucide
  de sa forme, sur le même papier, avec le même ruban.
- **Surtitre** « QUÊTE PRINCIPALE » en laiton, titre, première phrase de la lettre.
- Bloc **« Objectif actuel »** avec sa barre et son compteur.
- **Pavé de récompense** à droite, qui devient **LIVRER** quand c'est prêt (§2.3).
- **Fil des chapitres** : **jusqu'à** deux derniers livrés (✓), celui en cours
  (◉), puis « ??? ». Au tout premier chapitre il n'y a rien au-dessus du ◉, et le
  fil commence donc par lui — c'est le cas normal, pas un état dégradé. Les
  titres sont lus depuis les courriers, qui persistent pour les chapitres (seuls
  les courriers périodiques sont purgés) — donc localisés par `titreCourrier`.

**L'illustration au trait** en filigrane de la maquette (fauteuil, lampadaire)
n'est pas reprise : elle demande un asset à produire et ne dit rien au joueur.

### La ligne de quête périodique

Photo(s) scotchée(s) à gauche pour les quêtes d'objets, pastille ronde à icône
Lucide pour les quêtes chiffrées — l'icône vient de `ICONE_FORME`
(`src/lib/quetes/formes.ts`), livré par le chantier ①. Au centre : titre en
capitales, demande en une ligne, barre de progression quand il y a un compte à
suivre. À droite, séparé par un filet, le pavé.

**La ligne reste dépliable.** Un tap révèle la lettre entière et le détail des
objectifs — c'est là que vit l'écriture des commanditaires. Le tap sur le pavé
livre, le tap sur la ligne déplie : deux cibles distinctes.

**Les quêtes livrables remontent** en tête de leur section, comme aujourd'hui.

### Le pavé récompense ↔ livrer

Un seul composant, partagé par la carte d'histoire et la ligne périodique.

Tant que la quête n'est pas remplie, il montre la récompense en teinte sourde.
Dès qu'elle est livrable, **le même pavé s'allume et devient le bouton LIVRER**.
Un seul endroit à regarder — et la cérémonie d'envol des jetons part de
l'endroit exact où ils étaient dessinés, ce qui rend le vol naturel.

Il n'existe qu'une fois précisément parce qu'il porte la cérémonie : deux
copies, et le jour où l'animation change, l'une des deux est oubliée.

## 3. L'enchaînement du grand-père

**Aujourd'hui :** le joueur livre un chapitre → cérémonie → une pastille « ! »
apparaît sur le grand-père → il faut aller la taper → la scène se joue → le
chapitre suivant s'inscrit.

**Demain :** la fin de l'animation de récompense déclenche la scène.

Séquence exacte :

```
dernier jeton atterri
   ↓  la carte livrée se fond (300 ms — durée déjà en place)
   ↓  pause de 500 ms  ← constante nommée, ajustable à l'oreille
carnet fermé, le grand-père parle
   ↓
le chapitre suivant est inscrit dans le carnet
```

On réutilise `chapitreEnAttente` dans `src/app/(qg)/layout.tsx` : ce mécanisme
sert déjà à jouer une scène **après** que quelque chose d'autre se soit terminé
(mini-tuto du carnet). Aucun chemin parallèle à inventer.

Les 16 dialogues écrits à la main se jouent donc tous — l'enchaînement supprime
le trajet, pas la scène.

### Quatre garde-fous

- **Le déclenchement part du tap sur « Livrer », jamais d'un effet observant le
  state.** Règle que ce projet s'est donnée après avoir crédité des jetons en
  double : sous StrictMode un effet se monte deux fois. La mise en file suit le
  chemin de la cérémonie, qui est déjà déclenchée par le tap.
- **Seule la livraison d'un chapitre enchaîne.** Livrer une quotidienne ne fait
  pas surgir le grand-père, même si un chapitre l'attendait depuis la veille.
- **La pastille reste.** Si l'app meurt entre la cérémonie et la scène, le
  grand-père porte toujours son « ! » et l'ancien chemin fonctionne. Aucune
  impasse, et **rien à persister** : la file est de l'état React.
- **Le premier chapitre garde son traitement à part** — c'est l'ouverture du
  carnet, en fin de tutoriel, qui le délivre. Intouché.

Après le chapitre 16, `chapitrePret` renvoie `null` : rien n'est mis en file, le
carnet ne se referme pas, HISTOIRE affiche sa ligne de clôture.

## 4. Palette

Les jetons de couleur existants : `--paper-100/200/300`, `--brass-500`,
`--ink-*`, et `--patina-500` (`#6B7F6E`) pour les pastilles ✓. Ce sont
exactement ceux de la maquette — c'est le carnet actuel, avec son bordeaux
`#6e1f1f` codé en dur, qui est l'intrus. Aucune couleur nouvelle.

## 5. Découpe des fichiers

Le carnet actuel tient dans trois fichiers de 300 à 430 lignes, dont un
(`CommandeRow`) fait tout : avatar, barre, bandeau, détail dépliable, objectifs.
C'est ce qui le rend pénible à modifier. La refonte découpe par
**responsabilité**, pas par couche.

| Fichier | Ce dont il répond |
|---|---|
| `CarnetOverlay.tsx` | châssis : voile, fenêtre, en-tête, défilement, fermeture |
| `SectionRetractable.tsx` | une section : en-tête collante, chevron, compteur, repli |
| `CarteHistoire.tsx` | carte de chapitre : polaroïd, objectif actuel, fil des étapes |
| `LigneQuete.tsx` | ligne périodique : vignettes, barre, dépliage |
| `PaveRecompense.tsx` | pavé récompense ↔ bouton Livrer, **partagé** |
| `PhotoScotchee.tsx` | une photo scotchée, ou l'icône Lucide à sa place |
| `useCarnetSections.ts` | lecture/écriture du repli dans `localStorage` |

**Supprimés :** `OngletComptes.tsx`, `RegistreOverlay.tsx`, `OngletCommandes.tsx`,
`CommandeRow.tsx`.

**Déménagent sans être réécrits :** la logique de progression et le prédicat
`objectifEnEuros` de `CommandeRow`, tout juste corrigés par le chantier ① — le
`valeurCollection` manquant a coûté une régression, il ne faut pas la refaire.

## 6. Tests

Au-delà du rendu :

- **La mémoire du repli** : replier, remonter le composant, retrouver replié. Un
  `localStorage` vide, corrompu ou indisponible ne doit pas empêcher le carnet
  de s'ouvrir.
- **Le compteur d'en-tête repliée ne ment pas** : une quête livrable dans une
  section repliée apparaît dans son compteur.
- **La règle photo/icône** : une quête à objets montre des photos, une quête
  chiffrée montre son icône, jamais un mélange.
- **Le pavé** : récompense sourde quand ce n'est pas prêt, bouton actif quand ça
  l'est, bouton grisé pendant la cérémonie d'une autre quête.
- **L'enchaînement** : livrer un chapitre met le suivant en file après le délai ;
  livrer une quotidienne ne met rien en file ; la file ne se remplit jamais deux
  fois pour la même livraison (piège StrictMode).
- **Les sections vides** : ligne verrouillée sous le niveau 3, ligne de clôture
  après le chapitre 16.
- **L'ouverture ciblée** : ouvrir le carnet sur une quête donnée la déplie et
  déplie sa section, **même si cette section était mémorisée repliée** — c'est le
  seul cas où la préférence du joueur est outrepassée, et il doit être testé.
- **Les quatre langues** : aucune accolade non remplacée, libellés neufs partout.

Rappel d'exécution : `vitest` exige `--maxWorkers=4` sur ce Mac, sans quoi une
quarantaine de faux échecs apparaissent par famine de workers.

## 7. Compatibilité des sauvegardes

**Aucune migration, `SAVE_VERSION` inchangé.** Le repli des sections vit dans
`localStorage` ; la file d'attente du grand-père est de l'état React. Rien de
neuf n'entre dans la sauvegarde.

## Annexe — Points laissés ouverts

- **`ICONE_FORME` donne la même icône `TrendingUp`** à `beneficeCumule` et
  `chiffreAffaires` (spec ① §6). Deux cartes hebdomadaires se ressembleront à
  l'œil. À rejuger avec la mise en page sous les yeux, une fois la ligne dessinée.
- **Le rejeu des bilans de session** part sans remplaçant. Si le sujet revient,
  il lui faudra une porte d'entrée hors du carnet — le fauteuil ou le journal du
  bureau sont les candidats naturels.
