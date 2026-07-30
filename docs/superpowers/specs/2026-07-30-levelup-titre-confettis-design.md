# Montée de niveau — le chiffre d'abord, l'encadré ensuite

Date : 2026-07-30
Composant : `src/components/mobile/LevelUpOverlay.tsx`

## Problème

La v3 « certificat + cachet de cire » (2026-07-23) enferme tout dans un seul
bloc : l'eyebrow « Certificat de brocanteur », le `Niveau X`, les déblocages et
le cachet arrivent en une cascade continue à l'intérieur du même cadre. Le
moment fort — le passage de niveau lui-même — n'a pas d'instant propre : il est
noyé dans la liste des récompenses.

## Ce qu'on veut

Deux temps distincts. D'abord le chiffre, seul, en grand, avec le son et un feu
d'artifice qui part de son centre en rayons, plusieurs bouquets éclatant autour
de lui. Une fois le feu éteint seulement, l'encadré des récompenses, qui sépare
clairement ce que le niveau apporte de ce que promet le prochain palier.

## Suppressions

- L'eyebrow « — Certificat de brocanteur — » : le `<div>` et la clé
  `sheets.eyebrowCertificat` dans `fr.ts` / `en.ts` / `es.ts` / `el.ts`.
- Le cachet de cire : l'`<img src="/ui/cachet-cire.webp">`, le style `cachetImg`,
  les keyframes `broc-levelup-cachet-slam`.
- Le shake du cadre (`broc-levelup-certificat-shake` + la variable
  `--shake-delay`) : il n'existait que pour encaisser l'impact du cachet.
  L'asset `public/ui/cachet-cire.webp` reste en place, il n'est plus référencé.
- La classe `.broc-levelup-certificat` est renommée `.broc-levelup-carte` — le
  mot « certificat » ne décrit plus rien.
- Tous les ornements art déco du cadre : les quatre `CornerOrnament` et les
  filets ◆ qui séparaient les mentions (`FiletOr`, ses quatre styles). Le
  composant `CornerOrnament` reste utilisé par `EtapeBandeau` et
  `BrocanteDetailFloating`, il n'est pas supprimé.

## Le titre

Bloc autonome **au-dessus** du cadre, enfant direct du voile, qui devient une
colonne centrée.

- Texte : `sheets.niveauNCelebration` (« Niveau {n} »), clé conservée telle
  quelle.
- Police : `--font-brocante-title` (Arcane Nine), celle des titres de brocantes
  et du bandeau de vente. Le grec est déjà couvert : `globals.css` aliase Arcane
  Nine vers GFS Didot sur les plages `U+0370-03FF` / `U+1F00-1FFF`.
- Taille `clamp(42px, 13vw, 62px)`, couleur `--brass-300`, halo doré en
  `text-shadow`, `white-space: nowrap`. 13vw et pas 15 : mesuré en Playwright,
  « Επίπεδο 100 » (le libellé le plus long) faisait 340 px de large sur un
  écran de 360 px, soit 10 px de marge ; à 13vw il en reste 33.

## Chronologie

| t | événement | durée |
|---|---|---|
| 0 | voile sombre en fondu, écran par ailleurs vide | 350 ms |
| 0,15 s | le chiffre grossit : `scale(0.25)` → `1.12` → `1` | 700 ms |
| 0,45 s | `audioManager.playLevelUp()` — la fanfare attaque juste avant la pleine taille | ~1,7 s |
| 0,55 s | premier bouquet du feu d'artifice + sa détonation ; les trois autres suivent à +0,20 / +0,36 / +0,52 s | vol 1,1 s chacun |
| 2,25 s | l'encadré des récompenses monte en fondu | 450 ms |
| 2,40 s + | cascade des lignes, écart 0,09 s | 350 ms chacune |
| après la dernière ligne + 0,20 s | bouton Continuer, sous l'encadré | |

**Le cadre attend l'extinction de la dernière étincelle** : le dernier bouquet
part à 0,55 + 0,52 s (+ jusqu'à 0,07 s de jitter) et vole 1,1 s, donc le feu
est fini à 2,24 s. Un test vérifie cette invariante plutôt que la valeur
2,25 s en dur.

Le son était déclenché au montage du composant ; il passe dans un `setTimeout`
de 800 ms, nettoyé au démontage pour qu'un changement de route pendant
l'attente ne laisse pas partir la fanfare.

Soit **3,05 s** avant que le bouton commence à apparaître sur un niveau à cinq
lignes (2 intertitres + 2 récompenses + 1 palier), 3,4 s avant qu'il soit
complètement opaque. La célébration se rejoue à chaque niveau : au-delà, elle
devient une attente.

L'écart cadre → première ligne est de 0,15 s : le cadre ne contient plus de
titre, un décalage plus long laisserait voir un grand rectangle vert vide.

## L'encadré des récompenses

Fond vert (`--forest-700` → `--forest-900` en radial), **cadre laiton simple** (`2px solid var(--brass-500)`, pas de double filet), texte crème
(`--paper-100/200/300`). Aucun ornement.

Tout le texte est **aligné à gauche**, chaque mention ouverte par une **grosse
puce ronde laiton** de 9 px. La puce est en `align-items: flex-start` et non
`center` : sur un atout le texte fait plusieurs lignes et la puce doit rester
en haut. La ligne « À venir » porte la même puce que les récompenses — sans
elle, la ligne seule sous son intertitre flottait.

Deux sections, chacune ouverte par un **intertitre** : capitales
`--font-display` en **gras 700**, 13 px, `--brass-300`, suivies d'un filet
laiton de 2 px qui se dégrade vers la droite.

- **Récompenses** — tout ce que le niveau rapporte maintenant : le point de
  compétence (masqué si le plafond à vie est atteint) et les déblocages du
  niveau, dont les atouts en grand format (emoji, titre, description).
- **À venir** — le palier suivant, en `Niv. {n} · <titre>` via la clé existante
  `nivAbrege` (et non plus `prochainNiv`, qui reste utilisée par la
  bibliothèque).

Une section sans contenu est retirée **avec son intertitre** : plafond atteint
sur un niveau sans déblocage → pas de « Récompenses » vide ; dernier palier
franchi → pas de « À venir » orphelin.

Les intertitres comptent comme des lignes de la cascade, sinon « À venir »
démarrerait avant la fin de la section précédente.

Le bouton Continuer est **posé sous l'encadré**, à sa largeur, en aplat laiton
(`--brass-500`) à lettres vertes (`--forest-900`), coins arrondis à 10 px —
plus ronds que le cadre (4 px) pour se lire comme une commande et non comme
une seconde fenêtre : la fenêtre porte
l'information, le bouton porte l'action, les deux ne se mélangent pas.

Nouvelles clés i18n (4 langues) : `sheets.sectionRecompenses` et
`sheets.sectionAVenir`.

## Le feu d'artifice

100 % DOM + CSS, aucune dépendance ni `<canvas>` — contrainte WebView.

Quatre **bouquets** tirés à contretemps, positionnés en px depuis le centre du
chiffre : le premier part de ce centre exact (16 étincelles, rayon 150), les
trois autres éclatent autour (12 / 12 / 10 étincelles, rayons ~90-105) avec
0,34 s, 0,62 s et 0,92 s de retard. 50 étincelles au total.

- **Tous les points de tir sont au niveau du chiffre ou au-dessus.** Un bouquet
  centré plus bas éclatait pile sur la première mention du cadre au moment où
  elle apparaissait et la rendait illisible pendant une seconde (constaté en
  capture).
- Chaque étincelle est un rectangle fin (3-5 × 13-22 px) dont le **grand axe
  reste aligné sur son rayon pendant tout le vol** — pas de rotation libre :
  c'est ce qui la fait lire comme une étincelle qui file et non comme un
  confetti qui culbute. Elle s'étire en partant (`scaleY` 0,35 → 1,15) puis se
  raccourcit en s'éteignant.
- Rayons régulièrement répartis sur 360° avec un léger jitter : la régularité
  donne l'étoile, le jitter enlève l'air mécanique. Une composante de gravité
  (`rayon × 0,22`) fait retomber la gerbe.
- Un bouquet n'utilise que **deux** couleurs alternées, pas les quatre — c'est
  ce qui le fait lire comme une explosion. Palette : `#C5A059` laiton,
  `#3B6A52` vert forêt, `#A33B2A` rouge cachet, `#3B6EA5` bleu.
- Angle / distance / longueur / retard sont dérivés de l'index par une suite
  pseudo-aléatoire déterministe (pas de `Math.random()`) : rendu stable en test
  et insensible au double-rendu de StrictMode.
- Vol de 1,1 s en `cubic-bezier(0.1, 0.75, 0.25, 1)` — départ sec, longue
  décélération.
- **Chaque bouquet détone** : `audioManager.playExplosion(force, vitesse)`, un
  timer par bouquet. L'échantillon est `public/sounds/explosion.mp3` — le
  « single firework » de Freesound, ré-encodé mono 44,1 kHz / 96 kbps et coupé
  à 0,8 s avec un fondu de sortie sur les 80 dernières ms (43 Ko → 10 Ko ; le
  fichier d'origine traînait 0,78 s de quasi-silence).
- **Synchro du bang sur l'éclat** : la détonation n'est pas au début du
  fichier, elle est à **36 ms** (mesuré sur l'asset final, puis re-mesuré après
  décodage dans Chromium). La constante exportée `PIC_EXPLOSION_S = 0.035` sert
  à déclencher la lecture d'autant EN AVANCE du bouquet, divisé par la vitesse
  de lecture : premier bouquet à 0,55 s → lecture lancée à 0,515 s.
- `force` (1 / 0,72 / 0,66 / 0,58) fait décroître les bouquets secondaires et
  `vitesse` (1 / 1,14 / 0,92 / 1,06) les détimbre : quatre lectures identiques
  du même échantillon s'entendraient comme un bug.
- **Préchargement obligatoire** : le composant appelle
  `audioManager.preload([SON_EXPLOSION])` au montage. Sans ça, le `await` du
  chargement décalerait la première détonation et casserait la synchro.
- `aria-hidden="true"` et `pointer-events: none` sur la couche : elle ne doit
  jamais voler un tap au bouton Continuer. Le voile porte `overflow: hidden` —
  les étincelles des bouquets latéraux sortent de l'écran et ne doivent pas
  installer un débordement sur le body verrouillé. Le bloc du titre garde un
  `z-index: 2` : inutile depuis que le cadre attend la fin du feu, mais c'est
  le filet si les délais sont un jour resserrés.

## Mouvement réduit

Sous `prefers-reduced-motion: reduce`, le feu d'artifice n'est pas rendu du tout
— donc aucune détonation non plus, seule la fanfare part, immédiatement —
(côté React, via `matchMedia`) plutôt que neutralisés en CSS : `animation: none`
laisserait les étincelles figées, empilées sur leurs quatre points de tir. Le titre et le cadre
s'affichent immédiatement, sans délai — le bloc `@media` existant qui met
`animation: none` sur les classes de level-up est étendu aux nouvelles classes.

## Tests

`src/components/mobile/LevelUpOverlay.test.tsx` :

- retirer le test de l'eyebrow ;
- remplacer « certificat unique : titre ET bouton dans le même bloc, cachet
  présent » par un test qui vérifie l'inverse : le titre est **hors** de
  `.broc-levelup-carte`, et plus aucun `levelup-cachet` n'est rendu ;
- ajouter des tests sur la couche du feu : présence, `aria-hidden`,
  `pointer-events: none`, 50 étincelles, retards distincts par bouquet,
  orientation radiale (`--cr` ≈ angle de `--cx`/`--cy` + 90°) et
  reproductibilité entre deux rendus ;
- ajouter des tests sur les deux sections : ordre « Récompenses » puis
  « À venir », intertitre en tête de cascade, et les deux cas de section vide ;
- vérifier que le bouton est HORS de `.broc-levelup-carte` et la suit dans le
  document, et qu'une puce ouvre chaque mention sans en ajouter au bouton ;
- ajouter un test d'invariante de rythme : `animationDelay` du cadre ≥ dernier
  tir + 1,1 s de vol ;
- ajouter les tests du son : une détonation par bouquet, déclenchée 35 ms EN
  AVANCE de son éclat, de `force` décroissante et de `vitesse` toutes
  différentes, l'échantillon préchargé au montage, aucune détonation au
  démontage ni en mouvement réduit ;
- ajouter, dans `audioManager.test.ts`, les tests de `playExplosion` (charge
  bien `/sounds/explosion.mp3`, `force` sur le gain et `vitesse` sur le
  `playbackRate`, aucun fetch si `effets` est off). La fausse
  `AudioBufferSourceNode` gagne un `playbackRate` — elle n'en avait pas, alors
  que `playCoffreOuvre` s'en sert déjà.
- les autres tests (garde de route, plafond de compétences, bloc atout,
  multi-niveaux, `marquerNiveauVu`) restent valables tels quels.
