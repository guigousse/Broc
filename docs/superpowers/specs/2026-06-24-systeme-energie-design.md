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
- **Anti-triche horloge (dégradation gracieuse)** : objectif = ne pas pouvoir
  avancer la recharge en trafiquant l'heure, **sans** rendre la recharge dépendante
  du réseau. Base = horloge du device ancrée à une **horloge monotone**
  (`performance.now()`, insensible aux changements d'heure en session) ; un **temps
  de confiance** réseau (`TimeSource` : `timeapi.io` aujourd'hui, Supabase plus tard)
  **corrige** l'ancre quand il est disponible (neutralise l'avance d'horloge en
  ligne). Triche résiduelle bornée seulement en hors-ligne total. Voir §2bis.

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
/** Ancre du dernier calcul d'énergie : timestamp de TEMPS DE CONFIANCE
 *  (ms epoch), pas l'horloge brute du device. Voir §2bis. */
energieDerniereMaj: number;
/** Compteur de pubs de recharge regardées dans le jour de confiance courant. */
pubsRecharge: { jourCle: string; compte: number };
```

> ⚠️ `energieDerniereMaj` est toujours exprimé en **temps de confiance** (epoch ms).
> Le crédit d'énergie se calcule contre le temps de confiance courant (§2bis), jamais
> contre `Date.now()` brut — c'est ce qui neutralise l'avance d'horloge.

Constantes centrales (dans `src/lib/energie.ts`) :
```ts
export const ENERGIE_MAX = 5;
export const RECHARGE_INTERVAL_MS = 30 * 60 * 1000; // 30 min
export const PUBS_MAX_PAR_JOUR = 10;
export const ENERGIE_PAR_PUB = 1;
```

`jourCle` = date `YYYY-MM-DD` dérivée du **temps de confiance** (helper `cleJour(now)`
dans `energie.ts`).

### 2bis. Temps de confiance & anti-triche — `src/lib/temps/`

But : neutraliser l'avance/recul de l'horloge système. Deux briques.

**a) `TimeSource` (temps de confiance réseau)** — `src/lib/temps/timeSource.ts`
```ts
export interface TimeSource {
  /** Temps de confiance courant (ms epoch), ou null si indisponible (offline). */
  maintenant(): Promise<number | null>;
}
```
- `HttpTimeSource` (actuel) : `fetch` d'une API de temps JSON CORS-permissive
  (`timeapi.io`, `{year,month,day,hour,minute,seconds,milliSeconds}` en UTC →
  epoch via `Date.UTC`). Timeout court, renvoie `null` hors ligne / en échec.
  (NB : `worldtimeapi.org`, prévu initialement, s'est révélé hors service.)
- Futur : `SupabaseTimeSource` (RPC `select now()`), même interface — swap à un seul
  point d'injection (`getTimeSource()`).

**b) Horloge monotone (tick en session, sans réseau)** — `src/lib/temps/horloge.ts`
- On mémorise un couple de référence `ancre = { confiance: number, mono: number }`
  où `mono = performance.now()` (monotone, insensible aux changements d'heure système).
- Temps effectif courant à tout instant **sans réseau** :
  `tempsConfianceCourant(ancre) = ancre.confiance + (performance.now() - ancre.mono)`.
- Conséquence : une fois l'ancre posée (au montage), toute la session tique sur un
  temps non falsifiable. Avancer l'horloge système **en cours de session** n'a aucun effet.

**Politique de synchronisation & fallback — DÉGRADATION GRACIEUSE**

Décision révisée (2026-06-24, après constat que la source réseau peut être
indisponible) : la recharge ne dépend **plus** d'une dépendance dure au réseau.
Le jeu doit toujours recharger ; le temps de confiance sert de **correcteur**, pas
de prérequis.

1. **Base immédiate au montage** : on pose l'ancre depuis l'**horloge du device**
   (`confiance = Date.now()`, `mono = performance.now()`). L'énergie se recharge
   donc **toujours**, même hors ligne, et change d'horloge en session = sans effet.
2. **Correction réseau** : au lancement (puis focus + ~10 min), `maintenant()`.
   Succès → on **repose l'ancre** sur le temps de confiance (`mono` à jour) → corrige
   le décalage et neutralise une avance d'horloge faite **avant** le lancement.
   Échec (offline) → on garde l'ancre device, on continue à recharger.
2. Anti-recul permanent : si le temps de confiance calculé est **antérieur** à
   `energieDerniereMaj`, on ré-ancre sans créditer (jamais d'énergie négative ni de
   « banque » négative).
3. Réconciliation : le crédit se calcule toujours
   `floor((tempsConfiance - energieDerniereMaj) / 30min)` → un joueur légitimement
   absent 3 h récupère son énergie dès la 1ʳᵉ sync au retour, sans jamais faire
   confiance à l'horloge locale.

### 3. Module pur — `src/lib/energie.ts` (testable, sans horloge réelle)

Toutes les fonctions prennent `now: number` (= **temps de confiance** injecté par
l'appelant) en paramètre — aucun `Date.now()`/`performance.now()` caché → tests
déterministes. Le câblage temps de confiance (§2bis) vit dans `src/lib/temps/` et
dans `GameContext`, pas dans ce module pur.

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

Le contexte expose le **temps de confiance courant** (§2bis) via un petit hook
interne (`useTempsConfiance`) qui maintient l'ancre `{confiance, mono}` et fournit
`tempsConfianceCourant()`. Toutes les actions ci-dessous passent ce temps de
confiance comme `now` au module pur `energie.ts` — jamais `Date.now()` brut.

- État : 3 nouveaux champs initialisés dans `nouvellePartie`. À la création, on
  tente une sync ; en attendant on amorce avec `Date.now()` comme valeur d'ancre
  (partie neuve → énergie pleine, pas d'enjeu de triche au jour 1) :
  `energie: ENERGIE_MAX`, `energieDerniereMaj: <temps de confiance | Date.now()>`,
  `pubsRecharge: { jourCle: cleJour(<idem>), compte: 0 }`.
- `consommerEnergie(n: number)` : `settleEnergie(state, tempsConfiance)` puis
  `energie = max(0, energie - n)`.
- `crediterEnergiePub()` : `settleEnergie`, applique reset jour si besoin, si
  `restant > 0` → `energie = min(ENERGIE_MAX, energie + ENERGIE_PAR_PUB)` et
  `compte += 1`. No-op si plafond atteint.
- `rafraichirEnergie()` : `settleEnergie(state, tempsConfiance)` → persiste l'état.
  Appelé :
  - au montage (hydratation), après tentative de sync,
  - au retour de focus / `visibilitychange` (re-sync),
  - via un intervalle léger (~60 s) tant que l'app est ouverte.
  - L'ancre étant posée dès le montage (base device), `tempsConfiance()` est non-null
    après montage ; les sites d'appel utilisent `tempsConfiance() ?? Date.now()`.
- L'affichage du header recalcule l'énergie/minuteur **en local chaque seconde**
  (dérivé de `energie` + `energieDerniereMaj` + `tempsConfianceCourant()` via
  `energie.ts`), **sans** réécrire l'état global → pas de sauvegarde chaque seconde.

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
  - temps de confiance reculé → ré-ancrage sans crédit (anti-recul) ;
  - `secondesAvantProchaine` cohérent / `null` si plein ;
  - reset quotidien des pubs sur changement de `cleJour` ;
  - `peutRegarderPub` au plafond.
- `src/lib/temps/horloge.test.ts` : `tempsConfianceCourant` = ancre + delta
  monotone ; immunité à un `now` système trafiqué (on injecte un faux
  `performance.now`/ancre → le résultat ne dépend pas de l'heure système).
- `src/lib/temps/timeSource` : `HttpDateTimeSource` renvoie `null` sur échec/timeout
  (test avec `fetch` mocké) et un epoch sur header `Date` valide.
- `src/lib/ads/adProvider` : le stub résout `{ rewarded: true }`.
- `src/lib/migrations.test.ts` : `SAVE_VERSION === 5` ; défauts énergie posés sur
  un vieux save ; un save déjà v5 conserve ses valeurs.

## Hors périmètre (YAGNI)

- Intégration réelle d'un SDK de pub (AdMob/Tauri) — seulement préparée via l'interface.
- `SupabaseTimeSource` — préparée via l'interface `TimeSource`, branchée quand le
  backend Supabase existera (fermera la triche d'horloge résiduelle hors ligne).
  Aujourd'hui : `HttpTimeSource` (`timeapi.io`, JSON UTC).
- Persistance Supabase du `GameState` (localStorage uniquement, comme l'existant).
- Coût d'énergie variable par tier ou par brocante (fixé à 1).
- Achat d'énergie contre argent réel / in-app purchase.

## Note importante (UX horloge réelle)

La recharge dépend du **temps réel** (ancre device, corrigée par le temps de
confiance réseau), pas des « jours de jeu » (`jourActuel`). Modèle = **dégradation
gracieuse**. Conséquences assumées :
- Fermer/rouvrir l'app plus tard crédite l'énergie écoulée — **toujours**, même hors ligne.
- Changer l'horloge **en cours de session** n'a aucun effet (ancre monotone).
- **En ligne** : l'avance d'horloge faite avant le lancement est neutralisée (l'ancre
  est reposée sur le temps de confiance dès la 1ʳᵉ sync).
- **Hors ligne total** (jamais synchronisé) : avancer l'horloge avant lancement peut
  créditer jusqu'au plafond (5) — triche résiduelle bornée, assumée, refermée plus
  tard par `SupabaseTimeSource`. Anti-recul toujours actif.
