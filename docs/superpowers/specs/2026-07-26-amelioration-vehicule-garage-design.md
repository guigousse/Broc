# Amélioration du véhicule depuis le garage

Date : 2026-07-26
Branche de départ : `fix/pre-appstore`

## Problème

Le joueur ne peut pas acheter un véhicule plus grand. Le palier de véhicule
reste bloqué à `Rogers` (9 places) pour toute la partie, sauf à passer par le
DevPanel (`setNiveauCamionDev`, dev uniquement).

Ce n'est pas un système manquant, c'est un point d'entrée manquant. Tout le
reste est déjà en place :

- `src/data/camion.ts` — 3 véhicules (Rogers 9 places, Break 16, Utilitaire 25),
  avec `prixUpgradeVersCeNiveau` à 200 € et 500 €, plus position et échelle sur
  le fond garage.
- `public/coffre/` — les 12 assets des 3 véhicules (`ouvert`, `ferme`, `mask`,
  `mask-expanded`) sont présents.
- `GameContext.tsx:1041` — `acheterCamion(niveau)` vérifie l'adjacence du palier
  et le budget, débite, écrit une ligne `upgrade_camion` au grand livre.
- `vitrine/prep/page.tsx:154` et `vitrine/[brocanteId]/ClientPage.tsx:159` —
  passent déjà `onUpgrade={acheterCamion}` à `CoffreChargement`.
- `CoffreChargement.tsx:52` — déclare la prop `onUpgrade` et **ne l'appelle
  jamais**. Aucun rendu associé.
- `nomCamion(c, locale)` (`src/lib/i18n/contenu/index.ts:360`) — les noms de
  véhicules sont déjà traduits en 4 langues et testés.

## Périmètre

Exposer l'échelle existante, rien de plus. Un seul axe de progression : la
capacité du coffre. Pas de second effet de gameplay (trajet, énergie, accès aux
brocantes), pas d'atelier de tuning avec pièces indépendantes. Aucun
rééquilibrage : les prix 200 € / 500 € et les capacités 9 / 16 / 25 restent tels
quels.

Hors périmètre : lieu « Garage » dans le QG, nouvelle route, nouvel asset peint,
nouvelle clé de sauvegarde, migration.

## Décisions

| Décision | Choix | Raison |
|---|---|---|
| Emplacement | Écran de chargement du coffre | Le fond garage et le véhicule y sont déjà rendus, `onUpgrade` y est déjà branché. Le joueur rencontre l'offre là où la contrainte existe. |
| Forme | Panneau diégétique permanent | Reste dans l'univers, visible sans surgir. Le joueur peut convoiter avant de pouvoir payer. |
| Visuel du panneau | CSS, variables existantes | Aucun asset à générer, aucun poids ajouté au bundle (`out/` est à 155 Mo), retouchable en une ligne. |
| Retour à l'achat | Relève courte et sonore (~1,2 s) | Proportionné à un jalon intermédiaire. Ne réutilise pas la cérémonie du level-up, qui perdrait de sa valeur. |

## Architecture

Trois unités, une responsabilité chacune.

### `PanneauGarage` — nouveau

`src/components/vente/PanneauGarage.tsx`

Pancarte purement présentationnelle, positionnée en absolu dans `CoffreCanvas`.

```ts
interface Props {
  prochain: CamionConfig | null;
  peutPayer: boolean;
  onOuvrir: () => void;
}
```

Ne connaît ni le `GameState`, ni le budget brut, ni l'achat. Rend `null` si
`prochain` est `null`.

### `ConcessionSheet` — nouveau

`src/components/vente/ConcessionSheet.tsx`

Fiche du véhicule suivant, bâtie sur le `BottomSheet` existant.

```ts
interface Props {
  open: boolean;
  onClose: () => void;
  actuel: CamionConfig;
  prochain: CamionConfig;
  budget: number;
  onAcheter: () => void;
}
```

Décide seule de l'état de son bouton d'achat à partir de `budget` et de
`prochain.prixUpgradeVersCeNiveau`.

### `CoffreChargement` — existant, orchestre

Tient l'état `sheetOuverte`, calcule `getProchainCamion(p.niveauCamion)`, appelle
le `p.onUpgrade` déjà câblé, et joue la séquence de relève. C'est déjà lui qui
pilote les autres séquences animées du garage (fermeture du coffre, départ de la
voiture) — la relève y a sa place.

Aucune donnée nouvelle. `camion.ts`, `acheterCamion`, le grand livre et la
sauvegarde (`niveauCamion`, migrations) restent intacts.

## Comportement

### Le panneau

Posé en absolu sur le mur du garage, au-dessus du véhicule. Le fond est en
portrait (`GARAGE_ASPECT_RATIO = 1536 / 2752`) et le véhicule est centré vers
`garageY` 0,63–0,70 : la bande haute est libre. Légèrement incliné, trois lignes :

```
CONCESSION            mono 9px, --brass-700
BREAK                 display, nomCamion(prochain, locale)
16 places · 200 €     mono 10px
```

Grisé et désaturé quand `peutPayer` est faux, mais **toujours cliquable** :
regarder ce qu'on ne peut pas encore s'offrir entretient l'envie, et un bouton
mort n'expliquerait rien.

Il n'est pas rendu dans trois cas :

1. Niveau 3 atteint — `getProchainCamion()` renvoie `null`.
2. Pendant `closing` — la voiture s'en va, ce n'est plus le moment.
3. Pendant le tutoriel `preparer-etal` — la main de guidage désigne déjà le
   carrousel puis Valider ; un second appel du regard brouillerait la leçon.

### La fiche

`BottomSheet` titré au nom du véhicule, avec `bottomOffset` réglé sur la hauteur
de la barre d'actions fixe. Cette prop est indispensable : le scrim de la sheet
est en `z-index: 40`, la barre d'actions du bas en `z-index: 50` — sans
`bottomOffset`, la sheet passerait sous la barre.

Contenu :

- Le véhicule en grand via `getCoffreAssets(prochain.visuelId).ferme` — asset
  déjà présent, coût nul.
- Le comparatif : `Rogers · 9 places → Break · 16 places`, avec le delta
  (`+7 places`) mis en valeur.
- Le prix.
- Le bouton : `Acheter · 200 €` si le budget suffit ; sinon désactivé et
  sous-titré `Il vous manque 40 €` — un refus qui donne le chiffre.

### La relève

À la validation de l'achat :

1. La fiche se ferme.
2. `onUpgrade(niveauActuel + 1)` — budget débité, ligne `upgrade_camion` écrite.
3. Séquence d'environ 1,2 s pilotée par `CoffreChargement` :
   - fondu du véhicule de 1 à 0 sur 300 ms via `truckOpacity` (le mécanisme
     existe déjà pour l'animation de départ) ;
   - 100 ms de pause, pendant lesquelles l'état a déjà basculé sur le nouveau
     palier ;
   - remontée de 0 à 1 sur 400 ms, avec `audioManager.playDepartVoiture` pour
     le coup de moteur ;
   - bandeau `Break — 16 places` qui s'efface.
4. Un tap n'importe où pendant la séquence la saute et affiche directement
   l'état final.

Le `requestAnimationFrame` de la séquence est annulé au démontage, comme celui
du départ de voiture (`departRafRef`).

### Les objets déjà dans le coffre

Ils gardent leur `posX`/`posY` relatifs, mais le masque du coffre et l'échelle
des objets changent avec le palier. Le filet existe déjà et se recalcule sur
`camion.capacitePlaces` et `trunkMask` :
`computeOverlapsPixel` (`src/lib/coffre.ts:282`) marque les IDs en conflit, ce
qui couvre les chevauchements **et** le hors-coffre. Les objets marqués
apparaissent en rouge, `Valider` se bloque et le message « réorganiser le
coffre » s'affiche.

Aucun risque de blocage : les objets rétrécissent dans un coffre plus grand
(`getScaleCoffre` applique un facteur `(9/capacite)^0.25`), et le joueur peut
toujours les déplacer ou les retirer.

Aucun repositionnement automatique. Deviner l'intention du joueur produirait un
résultat moins bon que de le laisser réorganiser lui-même, et l'indication
visuelle du conflit est déjà claire.

## Internationalisation

Cinq clés nouvelles dans la section `vente` des quatre fichiers
`src/lib/i18n/ui/{fr,en,es,el}.ts` :

| Clé | FR |
|---|---|
| `concession` | `Concession` |
| `placesCompte` | `{n} places` |
| `acheterVehicule` | `Acheter · {prix} €` |
| `manqueSomme` | `Il vous manque {somme} €` |
| `vehiculeAcquis` | `{nom} — {n} places` |

Les noms de véhicules passent par `nomCamion(c, locale)`, déjà traduit et testé.
Aucune chaîne localisée n'entre en sauvegarde : seul `niveauCamion` (un nombre)
est persisté.

## Tests

- `PanneauGarage` : masqué dans les trois conditions (niveau 3, `closing`,
  tutoriel) ; grisé quand `peutPayer` est faux mais toujours cliquable ; affiche
  le nom, la capacité et le prix du palier suivant.
- `ConcessionSheet` : bouton d'achat actif au budget exact, désactivé en dessous
  avec la somme manquante juste ; `onAcheter` non appelé quand le budget manque.
- `CoffreChargement` : le tap sur le panneau ouvre la fiche ; la validation
  appelle `onUpgrade` avec `niveauCamion + 1` et une seule fois.

Filets existants à faire passer : `npx eslint src` (`npm run lint` est cassé
sous Next 16), `npm run lint:hooks`, la suite de tests complète.

## Recette device

À vérifier sur simulateur puis sur appareil :

- Le panneau ne recouvre pas le véhicule ni la zone de dépose d'objets, sur
  petit écran comme sur grand.
- La fiche reste au-dessus de la barre d'actions fixe (`bottomOffset`).
- Le coup de moteur ne coupe pas l'ambiance sonore en cours.
- La relève ne provoque pas de saut de mise en page dans la WebView.
