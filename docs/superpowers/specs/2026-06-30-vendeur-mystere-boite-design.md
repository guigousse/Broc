# Vendeur mystère & boîte mystère — design

**Date :** 2026-06-30
**Statut :** validé (brainstorming), prêt pour plan d'implémentation

## Contexte & objectif

Ajouter une mécanique de monétisation au mode chinage : un **vendeur mystère**
apparaît aléatoirement à l'intérieur d'une brocante et propose une **boîte
mystère**. La boîte contient un objet aléatoire que le joueur obtient
**gratuitement en échange d'une pub récompensée** (rewarded ad).

L'objectif explicite est d'**optimiser la rentabilité** de l'application sans
casser l'économie du jeu. Levier de revenu = vues de pub. Risque principal =
l'objet étant gratuit et revendable, il injecte de l'argent sans jouer →
inflation et progression trivialisée. Toute la calibration vise cet équilibre.

## Décisions validées

| Sujet | Décision |
|---|---|
| Emplacement | À l'intérieur d'une brocante, mêlé aux vendeurs normaux |
| Déclenchement | % de chance par entrée en brocante, plafonné par jour |
| Contenu | **Objets uniquement** (pas d'argent/pièces/énergie en v1) |
| Différenciateur | Table de drop **boostée** sur la rareté **et** l'état |
| Plafond | **Proba décroissante** (plafond mou) : 1/10, puis ÷2 par boîte réclamée (1/20, 1/40…), reset chaque jour de jeu. Pas de cap dur |
| Taux légendaire | **4 %** dans la boîte |
| Révélation | **Mystère total** — rien de visible avant la pub |
| Paiement | Pub récompensée uniquement (0 budget dépensé) |

## Calibration (chiffres de référence — réglables)

### Apparition — probabilité décroissante (plafond mou)
La chance par entrée dépend du **nombre de boîtes déjà réclamées le jour de jeu
courant** (`n`), divisée par 2 à chaque boîte :
- `chance(n) = CHANCE_APPARITION_BASE / 2 ** n`, avec **`CHANCE_APPARITION_BASE = 0.10`**.
- 1ʳᵉ boîte du jour : **1/10** · 2ᵉ : **1/20** · 3ᵉ : **1/40** · 4ᵉ : **1/80** …
- **Pas de cap dur** : auto-limitant. Le tirage porte sur l'*apparition* ; le
  compteur `n` n'augmente qu'à la *réclamation* (pub vue). Une boîte apparue
  mais non ouverte ne décale pas la proba.
- Le compteur repart de 0 (→ 1/10) au changement de `jourActuel`.
- Repère : à 1/10, ~5 entrées/jour ⇒ ~41 % de voir la 1ʳᵉ boîte ; une 2ᵉ le même
  jour reste improbable (1/20) et lourdement bridée par l'énergie temps réel.

### Pool — gating par tier (garde-fou central)
La boîte puise dans **le même pool tier-filtré que la brocante hôte**
(`poolPourTier(brocante.tier)`), exactement comme le chinage normal. Conséquence :
la valeur de la boîte **monte avec la progression** automatiquement (brocante
1⭐ → objets bon marché ~30 ; brocante 4⭐ → gros lots possibles). Pas besoin
d'autre frein early-game.

### Table de rareté

| | Commun | Rare | Légendaire |
|---|---|---|---|
| Chinage 1⭐ (existant) | 88 % | 10 % | 2 % |
| **Boîte mystère** | **70 %** | **26 %** | **4 %** |

Poids unique pour tous les tiers ; le pool tier-filtré limite naturellement
*quels* rares/légendaires peuvent sortir (cohérent avec le comportement actuel
du chinage).

### Table d'état

| | Mauvais | Bon | Très bon | Pristin |
|---|---|---|---|---|
| Chinage (existant) | 33 % | 33 % | 33 % | **0 %** |
| **Boîte mystère** | **10 %** | **30 %** | **45 %** | **15 %** |

Le Pristin (1,4×, normalement réservé à l'atelier) à 15 % est le 2ᵉ
différenciateur : la boîte sort des états introuvables gratuitement en chinage.

### Paysage de valeurs (référence, prixRefBase = valeur à « Très bon »)
- Commun : méd. 30, moy. 38, étendue 8–140
- Rare : méd. 280, moy. 364, étendue 55–1 200
- Légendaire : méd. 4 200, étendue 800–6 500
- Budget de départ : 150

## Architecture & composants

Réutilise les systèmes existants : pool tier-filtré (`poolPourTier`),
instanciation d'objet, provider de pub (`getAdProvider().showRewardedAd()`,
pattern déjà utilisé pour l'énergie et l'atelier), tendances, exclusion des
uniques/doublons.

### Nouveau module : `src/lib/boiteMystere.ts` (logique pure, testable)
- Constantes : `CHANCE_APPARITION_BASE = 0.10`, `POIDS_RARETE_BOITE`,
  `DISTRIB_ETAT_BOITE`.
- `nbBoitesReclamees(state, jourActuel): number` — `boiteMystere.reclamees` si
  `boiteMystere.jour === jourActuel`, sinon `0`.
- `chanceApparition(n): number` — `CHANCE_APPARITION_BASE / 2 ** n`.
- `tenterApparition(n, rng = Math.random): boolean` — tire `chanceApparition(n)`.
- `tirerContenuBoite(brocante, tendances, exclureUniques, rng = Math.random): Objet`
  — tire rareté (table boîte) + template dans le pool tier (dédup uniques déjà
  possédés) + état (table boîte) ; calcule `prixReferenceReel` via `FACTEUR_ETAT`.
  Retourne un `Objet` prêt à ajouter (pas d'`ObjetEnVente` : pas de négociation,
  pas de `prixVendeur`).

Toutes les fonctions à `rng` injectable pour les tests (défaut `Math.random`).

### Modèle de données — ajout `GameState`
```ts
/** Suivi des boîtes mystère réclamées le jour de jeu courant
 *  (pilote la probabilité décroissante). Absent = aucune. */
boiteMystere?: { jour: number; reclamees: number };
```
À chaque changement de `jourActuel`, `reclamees` est considéré nul si
`boiteMystere.jour !== jourActuel` (reset paresseux à la lecture). Migration :
champ optionnel, défaut `undefined`. Bump `SAVE_VERSION` + entrée dans
`lib/migrations.ts` (pattern existant).

### Action `GameContext` : `reclamerBoiteMystere(objet: Objet)`
1. Re-vérifie la capacité de stockage (`stockageEstPlein`) — **ne jamais
   ajouter en silence si plein**.
2. Ajoute l'objet à `inventaireJoueur`.
3. Incrémente le compteur du jour : si `boiteMystere?.jour === jourActuel` →
   `reclamees + 1` ; sinon → `{ jour: jourActuel, reclamees: 1 }`.
La génération du contenu reste dans la lib (pure) ; l'action ne fait que muter
l'état.

### UI
- **`ClientPage`** : à la génération de session, calcule
  `vendeurPresent = placeRestante(state) >= 1 && tenterApparition(nbBoitesReclamees(state, jourActuel))`.
  Stocké en state local du composant (comme les items). Rend une **carte
  spéciale** parmi les objets (icône cadeau/boîte lucide, style distinct).
- **`BoiteMystereOverlay`** (nouveau composant, calqué sur `EnergieRecharge`) :
  modale présentant la boîte fermée + bouton « Regarder une pub pour ouvrir ».
  - Au clic : `getAdProvider().showRewardedAd()`.
  - Si `rewarded` : `tirerContenuBoite(...)` → `reclamerBoiteMystere(objet)` →
    animation de révélation (image, nom, couleur de rareté, étoiles d'état,
    valeur).
  - Fermeture : le vendeur disparaît pour la journée (déjà réclamé).

## Flux UX
1. Le joueur entre dans une brocante (−1 ⚡).
2. Si éligible (place libre) et tirage `chance(n)` réussi (`n` = boîtes déjà
   réclamées aujourd'hui) : le vendeur mystère figure parmi les étals.
3. Le joueur tape dessus → modale boîte fermée.
4. « Regarder une pub » → pub → révélation de l'objet → ajouté à l'inventaire.
5. La réclamation fait chuter la proba de la suivante (÷2) pour le reste du jour
   de jeu ; remise à 1/10 le lendemain.

## Cas limites
- **Stockage plein** : le vendeur n'apparaît pas (`placeRestante < 1`).
  Re-vérification à la réclamation (au cas où le stock se remplit entre-temps) :
  bloquer **avant** la pub avec un message clair (« Stockage plein »), jamais de
  pub gâchée.
- **Pub non complétée** (`rewarded = false`) : rien n'est donné, la boîte reste
  ouvrable, compteur `boiteMystere.reclamees` non modifié.
- **Joueur quitte sans ouvrir** : aucune réclamation → le compteur `n` ne bouge
  pas, la boîte peut réapparaître à une entrée ultérieure à la même proba
  (mystère total ⇒ pas d'exploit de reroll).
- **Uniques déjà possédés** : exclus du tirage (logique de dédup existante).
- **Contenu décidé à l'ouverture** (après la pub), pas à l'apparition.

## Tests
`src/lib/boiteMystere.test.ts` :
- Distribution de rareté ~ table (tolérance statistique, rng contrôlé).
- Distribution d'état ~ table, présence de Pristin.
- `tirerContenuBoite` exclut les uniques déjà possédés et calcule
  `prixReferenceReel` correct par état.
- `chanceApparition(n)` : 0.10, 0.05, 0.025… (division par 2 à chaque `n`).
- `nbBoitesReclamees` : 0 si absent / autre jour ; valeur du jour sinon.
- `tenterApparition` respecte le seuil `chance(n)` (rng aux bornes).
- `reclamerBoiteMystere` : incrémente le compteur du jour, reset si jour différent.

## Hors scope (YAGNI v1)
- Récompenses non-objet (argent, pièces d'amélioration, énergie).
- Indice de rareté / catégorie visible avant la pub.
- Cooldown temps réel (l'auto-limitation par proba décroissante suffit en v1).
- Art final du PNJ (icône placeholder en v1).

## Curseurs réglables (post-launch, selon métriques)
`CHANCE_APPARITION_BASE`, le facteur de décroissance (÷2 par boîte), poids de
rareté, distribution d'état, taux de Pristin. Tous isolés dans `boiteMystere.ts`
pour itération rapide selon le taux de complétion de pub et l'inflation observée.
