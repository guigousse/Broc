# Médaillons d'atouts — 6 illustrations du dock (design)

Date : 2026-07-31 · Statut : validé en brainstorming

## Objet

Remplacer les emojis de secours du `SkillDock` par 6 vraies illustrations
d'atouts, aux chemins déjà attendus par le code :
`public/competences/atout.<id>.webp` pour `flair`, `lotGarni`, `fouille`,
`boniment`, `tchatche`, `criee` (`diplomate` exclu : c'est une compétence,
pas un atout du dock).

Contexte d'affichage (`SkillDock.tsx`) : cercle de 64 px, bordure laiton
2 px dessinée par l'UI, image carrée rognée en cercle (`objectFit: cover`
+ `borderRadius: 50%`), version grisée `grayscale(1) brightness(0.55)`
quand l'atout est verrouillé, pastille d'usages en bas-droite.

## Direction artistique (validée)

- **Rendu** : bas-relief frappé, comme une médaille ou une pièce — motif
  sculpté en relief dans le laiton, lumière rasante, reflets métalliques.
- **Cadrage** : laiton **plein cadre bord à bord**, sans anneau ni listel
  dessiné (la bordure UI fait office de sertissure). Motif centré dans la
  zone sûre centrale (~70 %) pour survivre au rognage circulaire.
- **Couleur** : très ponctuelle, façon touche d'émail ; **naturaliste**
  (la couleur réelle du détail), une seule touche par médaille, laiton à
  ~90 % de la surface.
- **Pas de personnage** (illisible à 64 px), pas de texte.

## Les 6 motifs (validés)

| Atout | Motif frappé | Touche naturaliste |
|---|---|---|
| Le Flair (N5, chinage) | Loupe Art déco inclinée, petit éclat étoilé sous la lentille | Verre de la lentille légèrement bleuté |
| Lot garni (N10, vente) | Panier d'osier débordant (col de bouteille, cadre, bibelot) | Étoffe verte qui dépasse du panier (l'osier resterait trop proche du laiton) |
| La Fouille (N15, chinage) | Caisse en bois entrouverte, objets qui émergent, nuage de poussière | Col de bouteille en verre vert |
| Le Boniment (N20, vente) | Haut-de-forme posé sur une canne de bonimenteur, 3 étincelles | Ruban bordeaux du chapeau |
| La Tchatche (N25, négo) | Banderole de parole ondulante sortant d'un profil minimal | Liseré bordeaux du ruban |
| La Criée (N30, vente) | Porte-voix de crieur, rayons sonores Art déco en éventail | Manche en bois brun-rouge (le cornet reste laiton) |

Chaque motif reste dans l'esprit de l'emoji de secours actuel
(🔍 🧺 🧹 🎩 💬 📣) pour que le fallback `onError` demeure cohérent.

## Pipeline (approche validée : script dédié)

Patron maison identique à `generate-competences.mjs` :

- **Script** : `scripts/generate-atouts.mjs` + config
  `scripts/atouts-prompts.json` (id + description du motif par atout).
- **Génération** : Gemini `gemini-3-pro-image-preview`, 1:1, une
  génération indépendante par médaille. Brief de style commun très
  contraint (laiton frappé, lumière rasante, plein cadre) — la matière
  imposée assure l'homogénéité entre les 6.
- **Post-traitement sharp** : rognage déterministe ~3,5 % des bords
  (liseré parasite), resize **512×512** (affiché 64 px, soit 192 px
  physiques en 3× — inutile de payer du 1024 dans `out/`), WebP q85.
- **CLI** : `npm run gen:atouts` (skip les présents),
  `-- atout.flair` pour une médaille précise, `--force` pour regénérer.
- **Pièges de prompt** (mémoire Gemini) : pas de négations répétées,
  géométrie non contradictoire ; le rognage se corrige côté sharp.

## Contrôle qualité

Planche de vérification rendue à taille réelle avant validation :
montage sharp des 6 médaillons à 64 px, chaque médaillon en deux états —
normal et grisé façon « verrouillé » (`grayscale` + `brightness 0.55`) —
pour juger lisibilité du motif et de la touche d'émail. Sortie dans le
scratchpad, pas dans le dépôt.

## Critères de réussite

- Les 6 fichiers `atout.<id>.webp` existent, 512×512, < ~40 kB chacun.
- Motif et touche de couleur identifiables à 64 px, y compris grisés.
- Aucun anneau/listel visible au bord du cercle après rognage `cover`.
- Aucun texte, aucun personnage, aucune marge de papier.
- Le dock chinage (flair, fouille, tchatche) et le dock vente (lotGarni,
  boniment, criee) affichent les images sans passer par le fallback.

## Hors périmètre

- Aucun changement de code UI (`SkillDock` consomme déjà ces chemins).
- `diplomate` (compétence Négociation P3, pas d'illustration d'atout).
- Le webp de la modale d'info d'atout s'il en fallait un — non demandé.

## Branche

Nouvelle branche `feat/atouts-medaillons` depuis `origin/main`
(la branche courante porte des commits carnet non mergés).
