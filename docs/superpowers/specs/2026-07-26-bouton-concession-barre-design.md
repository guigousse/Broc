# Le bouton de concession dans la barre d'actions

Date : 2026-07-26
Branche : `fix/pre-appstore`
Remplace le point d'entrée livré par `docs/superpowers/specs/2026-07-26-amelioration-vehicule-garage-design.md`

## Problème

La pancarte de concession posée sur le mur du garage (`PanneauGarage`, livrée entre `2fddc4c` et `eb868ec`) ne donne pas le rendu attendu. Le point d'entrée change ; tout ce qui est derrière reste.

## Périmètre

**Change :** le point d'entrée. La pancarte murale devient un troisième bouton au centre de la barre d'actions du bas, montrant le véhicule du joueur de profil avec une clé à molette par-dessus.

**Ne change pas :** `ConcessionSheet`, l'achat (`acheterCamion`, grand livre, sauvegarde), toute la relève (`releveVehicule.ts`, les gardes sur `handleValider`, les tests), les prix et capacités.

**Hors périmètre :** rééquilibrage, lieu « Garage » dans le QG, nouvelle clé de sauvegarde, migration.

## Décisions

| Décision | Choix | Raison |
|---|---|---|
| Quelle voiture sur le bouton | Celle que le joueur possède | La clé à molette dit « améliore ta voiture », la formule de la demande d'origine. Le bouton change quand on progresse : récompense visuelle. |
| Répartition de la barre | Carré central, latéraux à `flex: 1` | La voiture garde ses proportions à toute largeur d'écran, et les deux libellés ont la même place — ce qui compte quand le grec est 40-90 % plus long que le français. |
| La clé à molette | Icône `Wrench` de lucide en surcouche, pas peinte dans l'image | Identique sur les trois véhicules (aucune dérive de génération), nette à toute taille, et grisable avec le bouton. |
| Image de référence | Le `{visuelId}-ferme.webp` existant | Sans référence, le profil serait une voiture cousine et jurerait avec le véhicule du garage. |

## Assets

Trois images, une par véhicule : `public/coffre/{visuelId}-profil.webp` — `rogers`, `break`, `utilitaire`.

Le nommage prolonge la convention documentée dans `src/lib/coffreAssets.ts` (`public/coffre/{visuelId}-{etat}.webp`, `etat` ∈ `ouvert`, `ferme`, `mask`). Le champ `profil` s'ajoute à l'interface `CoffreAssets` et aux trois entrées de `COFFRE_ASSETS`.

Génération par `scripts/generate-camions-profil.mjs` + `scripts/camions-profil-prompts.json`, calqués sur `generate-qg-images.mjs` / `qg-prompts.json` (même chargement de `.env`, même choix de modèle `--model=pro|flash`, même `--force`, même écriture PNG puis conversion webp).

Chaque entrée porte `reference: "{visuelId}-ferme"`, que le script charge depuis `public/coffre/` et envoie à Gemini. Le prompt demande le **même véhicule** vu de profil strict, roues visibles, orienté vers la droite, détouré sur fond transparent, dans le style des assets existants : illustration vectorielle, traits fins et sombres, aplats légèrement ombrés, palette sourde.

Note : les `-ferme.webp` existants sont des vues **arrière**, pas des profils — d'où la nécessité de générer, plutôt que de recadrer l'existant.

## Architecture

### `BoutonConcession` — nouveau

`src/components/vente/BoutonConcession.tsx`

```ts
export interface BoutonConcessionProps {
  /** Véhicule possédé — c'est lui qu'on montre, pas le palier suivant. */
  actuel: CamionConfig;
  /** Le budget couvre-t-il le prochain palier ? Grise sans désactiver. */
  peutPayer: boolean;
  /** Séquence de départ en cours : bouton estompé et inopérant. */
  inerte: boolean;
  onOuvrir: () => void;
}
export function BoutonConcession(p: BoutonConcessionProps): JSX.Element;
```

Purement présentationnel. Il ne connaît ni le `GameState`, ni le budget brut, ni l'achat.

Rendu : un `<button type="button">` carré, `width: calc(var(--mobile-tabbar-h) - 8px)` et `height: calc(100% - 8px)`, bordure `1px solid var(--brass-500)` comme ses voisins. Dedans, le profil du véhicule en `object-fit: contain` (via `getCoffreAssets(actuel.visuelId).profil`), et l'icône `Wrench` de lucide en position absolue bas-droite, en `var(--brass-300)` sur une pastille `var(--forest-800)` pour rester lisible sur une carrosserie claire.

Grisé (`opacity`, `grayscale`) quand `peutPayer` est faux, mais **toujours tapable** — consulter ce qu'on ne peut pas encore s'offrir entretient l'envie, et un bouton mort n'expliquerait rien. Estompé **et** `disabled` quand `inerte` est vrai.

**Un `aria-label` est obligatoire ici**, et c'est l'exact inverse de la règle appliquée à `PanneauGarage`. Là-bas le contenu textuel nommait le bouton et le label l'appauvrissait. Ici le bouton n'a aucun texte : sans label, un lecteur d'écran annonce « bouton » et rien d'autre. Le label vaut `d.vente.ameliorerVehicule`.

### `CoffreChargement` — modifié

La barre d'actions passe de deux à trois enfants :

| Position | Bouton | Largeur |
|---|---|---|
| Gauche | Retour au magasin (`p.onAnnuler`) | `flex: 1` |
| Centre | `BoutonConcession` | carré, largeur fixe |
| Droite | Valider le chargement (`handleValider`) | `flex: 1` |

« Valider » perd son `flex: 2` : c'est le prix des trois libellés, et ça protège le grec.

Le bouton central est rendu quand `p.tuto !== true`. **Le tutoriel est le seul cas où il disparaît.**

C'est une déviation assumée par rapport au garde `panneauVisible` de la version précédente, qui incluait `closing` : la pancarte murale pouvait disparaître sans conséquence de mise en page, un enfant de la barre non. Faire disparaître le bouton au moment où le joueur tape « Valider » ferait sauter la mise en page pendant que la voiture s'en va — il reste donc en place avec `inerte={closing}`.

**Correction issue de la revue finale.** Le garde d'origine était `prochainCamion !== null && p.tuto !== true`, et il rouvrait le même défaut par une autre porte : à l'achat du dernier palier, `prochainCamion` tombe à `null` dès `RELEVE_BASCULE_MS` (300 ms), donc le bouton se démontait **en pleine relève** et les deux voisins s'élargissaient d'un coup pendant que le bandeau était encore à l'écran. Au palier maximum le bouton reste donc monté, montrant le véhicule possédé, mais grisé, `disabled` et **sans clé à molette** — l'icône promettrait une amélioration qui n'existe plus. C'est un trophée. La prop `ameliorable` le lui dit ; il ne le déduit pas.

Le reste de `CoffreChargement` est inchangé : l'état `sheetOuverte`, le garde dérivé `open={sheetOuverte && !closing}` sur la fiche, le garde `closing || releveRafRef.current !== null` sur `handleValider`, et toute la relève.

### Suppressions

- `src/components/vente/PanneauGarage.tsx` et `PanneauGarage.test.tsx`.
- La prop `panneau?: ReactNode` de `CoffreCanvas`, son rendu, et le bloc qui la passait depuis `CoffreChargement` — plus aucun consommateur.
- Le calcul `panneauVisible`, remplacé par la condition de rendu du bouton central.

## Internationalisation

Échange à somme nulle dans la section `vente` des quatre fichiers `src/lib/i18n/ui/{fr,en,es,el}.ts`.

Retirée : `concession` (surtitre de la pancarte, plus rien ne l'affiche).

Ajoutées :

| Clé | FR | EN | ES | EL |
|---|---|---|---|---|
| `vente.ameliorerVehicule` | `Améliorer le véhicule` | `Upgrade the vehicle` | `Mejorar el vehículo` | `Αναβάθμιση του οχήματος` |
| `vente.vehiculeAuMaximum` | `Véhicule au niveau maximum` | `Vehicle at maximum level` | `Vehículo al nivel máximo` | `Όχημα στο μέγιστο επίπεδο` |
| `commun.retour` | `Retour` | `Back` | `Volver` | `Επιστροφή` |

**Correction issue de la revue finale.** Cette section prévoyait `retourMagasin` (« Retour au magasin ») pour le bouton de gauche. La revue a montré que le libellé était **faux dans un des deux flux** : l'écran est monté par deux pages, et si `vitrine/prep/page.tsx` revient bien au bureau, `vitrine/[brocanteId]/ClientPage.tsx` revient sur `/vitrine`, la liste des brocantes. Un libellé qui nomme une destination ne peut pas être juste des deux côtés — l'ancien `d.commun.annuler` ne l'était que parce qu'il n'en nommait aucune. Le bouton porte donc `d.commun.retour`, neutre. Cela règle au passage une collision de vocabulaire : le français disait « magasin » là où tout le reste du jeu dit « boutique », et les traductions EN/ES/EL reproduisaient mot pour mot la clé existante `d.bilan.rentrerBoutique`.

Les deux clés `vehiculeAuMaximum` et `commun.retour` ne figuraient pas dans la conception initiale ; elles viennent des correctifs ci-dessus.

Conservées et toujours consommées : `placesCompte`, `acheterVehicule`, `manqueSomme` (la fiche), `vehiculeAcquis` (le bandeau de relève).

`d.commun.annuler` n'est plus utilisé par cet écran mais reste employé ailleurs : ne pas le retirer.

Aucune chaîne localisée n'entre en sauvegarde ; seul `niveauCamion` est persisté.

## Tests

- `BoutonConcession` : rend le profil du véhicule **actuel** (pas le suivant) ; grisé sans budget mais toujours tapable ; `disabled` et non déclenchable quand `inerte` ; porte un `aria-label` non vide.
- `CoffreChargement` : le bouton central est présent au niveau 1, absent au niveau 3, absent pendant le tutoriel, **présent mais inerte** pendant `closing` ; le tap ouvre la fiche.
- Tests existants à adapter : ceux qui interrogeaient la pancarte par son texte « Concession » visent désormais le bouton par son `aria-label`.
- Les tests de la fiche, de la relève et du minutage ne changent pas.

Filets : `npx vitest run`, `npx eslint src`, `npx tsc --noEmit`. (`npm run lint` est cassé sous Next 16.)

## Recette device

- Le carré central ne comprime pas les deux libellés sur petit écran (iPhone SE), en français comme en grec (« Επιστροφή στο μαγαζί » / « Αναβάθμιση του οχήματος »).
- Les trois profils générés sont reconnaissables à la taille réelle du bouton (~48-60 px de côté) : un véhicule de profil réduit à cette taille peut devenir illisible.
- La clé à molette reste lisible sur les trois carrosseries.
- Le bouton change bien de véhicule après un achat, à la fin de la relève.
- Rien ne saute dans la mise en page quand le bouton passe en inerte au départ de la voiture.
- VoiceOver : le bouton s'annonce avec son libellé, dans les quatre langues.
