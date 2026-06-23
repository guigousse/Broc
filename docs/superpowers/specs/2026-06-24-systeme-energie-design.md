# Système d'Énergie — Design

Date : 2026-06-24
Branche : `feat/bureau-deux-carnets` (ou branche dédiée à créer)

## Contexte

Le « système de tickets » actuel est **purement cosmétique** :
- `MobileHeader.tsx` affiche « Tickets 5/5 » via une prop `tickets` codée en dur
  (jamais passée par les pages → toujours `5/5`), sans état réel.
- `BrocanteDetailFloating.tsx` affiche une icône `Ticket` (lucide-react) à côté
  des frais d'entrée, avec un aria-label narratif « …euros et 1 ticket ».

Aucun compteur fonctionnel, aucune consommation, aucune recharge, aucun SDK de pub.

Le vrai coût d'entrée d'une brocante est l'**argent** (`FRAIS_ENTREE` par tier dans
`src/data/brocantes.ts`), payé via `payerFraisBrocante` au moment d'entrer en
chinage (`src/app/chiner/[brocanteId]/ClientPage.tsx`) ou en vente
(`src/app/vitrine/[brocanteId]/ClientPage.tsx`).

## Objectif

Transformer les « tickets » en **Énergie** :
1. Renommage cosmétique (libellé + icône éclair `Zap`).
2. Rendre le système **opérationnel** : compteur qui descend à la consommation et
   se recharge dans le temps réel à raison d'**1 énergie / 30 min**.
3. Coupler à un système de **pub optionnelle** : regarder une pub recharge +1
   énergie, **max 10 pubs / jour calendaire**. Provider de pub factice (stub) pour
   l'instant, mais terrain prêt pour brancher un vrai SDK (AdMob via Tauri) sans
   toucher à la logique de jeu.

## Décisions validées

- **Ce que l'énergie consomme** : entrer en **chinage** ET ouvrir une **vente**
  (1 énergie par entrée, fixe, quel que soit le tier de la brocante). L'argent
  (frais d'entrée) reste inchangé — l'énergie s'y ajoute comme limite de fréquence.
- **Capacité max** : `ENERGIE_MAX = 5` (conserve la jauge 5/5 existante).
  Recharge complète depuis 0 = 2h30.
- **Recharge temps réel** : 1 énergie / 30 min (`RECHARGE_INTERVAL_MS`).
- **Pub** : `+1` énergie par pub (`ENERGIE_PAR_PUB = 1`), plafonné à `ENERGIE_MAX`.
  `PUBS_MAX_PAR_JOUR = 10` (reset au changement de jour **calendaire** local).
- **Provider pub** : stub simulé maintenant, interface stable pour swap futur.
- **Accès recharge** : quand `energie < ENERGIE_MAX`, un petit **« + »** apparaît à
  gauche du compteur dans le header ; tap → panneau (jauge + minuteur + bouton pub).
- **Énergie = 0 à l'entrée** : entrée **bloquée** (toast « Plus d'énergie »), au même
  titre que le blocage budget existant (`raison=budget`). Pas de modale auto ; la
  recharge se fait via le « + » du header.

## Architecture

### 1. Renommage cosmétique

- `src/components/mobile/MobileHeader.tsx`
  - Libellé « Tickets » → « Énergie ».
  - Affiche `energie/ENERGIE_MAX` avec une icône `Zap` (lucide-react).
  - La prop est désormais alimentée par le `GameState` réel (voir §5).
- `src/components/mobile/brocante-pano/BrocanteDetailFloating.tsx`
  - Icône `Ticket` → `Zap`. Aria-label « …euros et 1 énergie ».
  - Le bloc « ENTRÉE : X € + ⚡ » devient fonctionnel.

### 2. Modèle de données — `GameState` (migration v4 → v5)

`src/types/game.ts`, ajout à `GameState` :
```ts
/** Énergie courante (0..ENERGIE_MAX). Démarre pleine. */
energie: number;
/** Timestamp (Date.now()) de l'ancre du dernier calcul d'énergie. */
energieDerniereMaj: number;
/** Compteur de pubs de recharge regardées dans le jour calendaire courant. */
pubsRecharge: { jourCle: string; compte: number };
```

Constantes centrales (dans `src/lib/energie.ts`) :
```ts
export const ENERGIE_MAX = 5;
export const RECHARGE_INTERVAL_MS = 30 * 60 * 1000; // 30 min
export const PUBS_MAX_PAR_JOUR = 10;
export const ENERGIE_PAR_PUB = 1;
```

`jourCle` = date locale `YYYY-MM-DD` (helper `cleJour(now)` dans `energie.ts`).

### 3. Module pur — `src/lib/energie.ts` (testable, sans horloge réelle)

Toutes les fonctions prennent `now: number` en paramètre (aucun `Date.now()`
caché → tests déterministes).

- `cleJour(now): string` — clé de jour calendaire local `YYYY-MM-DD`.
- `settleEnergie(state, now): { energie, energieDerniereMaj }`
  - `ecoule = now - energieDerniereMaj`.
  - Si `energie >= ENERGIE_MAX` → `{ energie: ENERGIE_MAX, energieDerniereMaj: now }`
    (pas de banque de temps au-delà du max).
  - Sinon `gagne = floor(ecoule / RECHARGE_INTERVAL_MS)`,
    `nouvelle = min(ENERGIE_MAX, energie + gagne)`.
    - Si `nouvelle >= ENERGIE_MAX` → ancre = `now`.
    - Sinon ancre = `energieDerniereMaj + gagne * RECHARGE_INTERVAL_MS` (garde le reste).
  - Tolérant : `ecoule < 0` (horloge reculée) → ancre remise à `now`, énergie inchangée.
- `energieCourante(state, now): number` — `settleEnergie(...).energie` (display).
- `secondesAvantProchaine(state, now): number | null` — `null` si déjà plein,
  sinon secondes jusqu'au prochain +1 (pour le minuteur).
- `compteursPubs(state, now): { compte, restant }` — applique le reset si
  `cleJour(now) !== state.pubsRecharge.jourCle`.
- `peutRegarderPub(state, now): boolean` — `compteursPubs(...).restant > 0`.

### 4. Provider de pub — `src/lib/ads/adProvider.ts`

```ts
export interface AdResult { rewarded: boolean }
export interface AdProvider {
  /** Affiche une pub récompensée. `rewarded` = true si visionnée jusqu'au bout. */
  showRewardedAd(): Promise<AdResult>;
}
```
- `StubAdProvider` : simule un court délai (ex. ~800 ms) puis résout
  `{ rewarded: true }`. Utilisé pour l'instant.
- Futur : `AdMobAdProvider` (Tauri natif) implémentant la même interface. Le swap
  se fait à un seul point d'injection — aucune autre modification de la logique.
- Point d'accès unique : un petit module/hook `getAdProvider()` retourne le
  provider courant (stub aujourd'hui).

### 5. Actions `GameContext` (`src/context/GameContext.tsx`)

- État : 3 nouveaux champs initialisés dans `nouvellePartie` :
  `energie: ENERGIE_MAX`, `energieDerniereMaj: Date.now()`,
  `pubsRecharge: { jourCle: cleJour(Date.now()), compte: 0 }`.
- `consommerEnergie(n: number)` : `settleEnergie` puis `energie = max(0, energie - n)`.
- `crediterEnergiePub()` : `settleEnergie`, applique reset jour si besoin, si
  `restant > 0` → `energie = min(ENERGIE_MAX, energie + ENERGIE_PAR_PUB)` et
  `compte += 1`. No-op si plafond atteint.
- `rafraichirEnergie()` : `settleEnergie` → persiste l'état. Appelé :
  - au montage (hydratation),
  - au retour de focus / `visibilitychange`,
  - via un intervalle léger (~60 s) tant que l'app est ouverte.
- L'affichage du header recalcule l'énergie/minuteur **en local chaque seconde**
  (dérivé de `energie` + `energieDerniereMaj` via `energie.ts`), **sans** réécrire
  l'état global → pas de sauvegarde chaque seconde.

### 6. Consommation à l'entrée (chiner + vente)

- `src/app/chiner/[brocanteId]/ClientPage.tsx` : avant `payerFraisBrocante`,
  ajouter la garde énergie. Si `energieCourante < 1` → redirection/bloc
  (`raison=energie`, symétrique à `raison=budget`) + toast « Plus d'énergie ».
  Sinon `consommerEnergie(1)` en plus du paiement des frais.
- `src/app/vitrine/[brocanteId]/ClientPage.tsx` (`handleOuvrir`) : même garde +
  `consommerEnergie(1)` avant d'ouvrir la journée de vente.
- La page `chiner` (liste) doit gérer le paramètre `raison=energie` pour afficher
  le message adéquat (réutiliser le pattern `raison=budget`).

### 7. UI de recharge

Composant `EnergieRecharge` (panneau/popover) ouvert par le « + » du header :
- Jauge `energie/ENERGIE_MAX`.
- Minuteur « prochaine ⚡ dans mm:ss » (masqué si plein), tick local 1 s.
- Bouton **« Regarder une pub — +1 ⚡ »** :
  - `onClick` → `getAdProvider().showRewardedAd()` ; si `rewarded` → `crediterEnergiePub()`.
  - Désactivé pendant l'affichage de la pub (état loading).
  - Désactivé si `restant === 0` → mention « Limite du jour atteinte (10/10) ».
- Le « + » n'apparaît que si `energie < ENERGIE_MAX`.

### 8. Migration (`src/lib/migrations.ts`)

- `SAVE_VERSION` : 4 → **5**.
- Dans l'objet retourné par `appliquerMigrations`, défauts pour les saves existants :
  - `energie: typeof loaded.energie === "number" ? clamp(0..MAX) : ENERGIE_MAX`,
  - `energieDerniereMaj: typeof loaded.energieDerniereMaj === "number" ? ... : Date.now()`,
  - `pubsRecharge: objet valide ? ... : { jourCle: cleJour(Date.now()), compte: 0 }`.

## Tests

- `src/lib/energie.test.ts` :
  - regen : +1 toutes les 30 min, plafonné à `ENERGIE_MAX` ;
  - conservation du reste (ancre avancée correctement) ;
  - plein → ancre = now (pas de banque) ;
  - horloge reculée → tolérée ;
  - `secondesAvantProchaine` cohérent / `null` si plein ;
  - reset quotidien des pubs sur changement de `cleJour` ;
  - `peutRegarderPub` au plafond.
- `src/lib/ads/adProvider` : le stub résout `{ rewarded: true }`.
- `src/lib/migrations.test.ts` : `SAVE_VERSION === 5` ; défauts énergie posés sur
  un vieux save ; un save déjà v5 conserve ses valeurs.

## Hors périmètre (YAGNI)

- Intégration réelle d'un SDK de pub (AdMob/Tauri) — seulement préparée via l'interface.
- Persistance Supabase (localStorage uniquement, comme l'existant).
- Coût d'énergie variable par tier ou par brocante (fixé à 1).
- Achat d'énergie contre argent réel / in-app purchase.
