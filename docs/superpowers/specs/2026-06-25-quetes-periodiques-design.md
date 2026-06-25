# Quêtes quotidiennes / hebdomadaires (🅲) — Design

Date : 2026-06-25 · Branche cible : `feat/systeme-energie` (ou branche dédiée)

## Contexte

Broc (Next.js export statique + Tauri 2). Troisième et dernier des sous-projets liés
au système de notifications locales (cf. [[systeme-notifications]]) :

- 🅰 Fondation notifications — **FAIT** (cœur générique, rappel de retour, patch iOS).
- 🅱 Restauration en temps réel — **FAIT**.
- 🅲 Quêtes quotidiennes/hebdomadaires — *ce document*.

Aujourd'hui les quêtes sont des **commandes** (un commanditaire demande de livrer des
objets) portées par des **courriers** (`CourrierPayloadMission`, `categorie:
"principale" | "secondaire"`, `cibles: MissionCible[]`, expiration `jourLimite` en
jours de jeu). Les secondaires sont générées par **jour de jeu** :
`src/lib/quetes/generateurSecondaire.ts` (probabilité `P_GEN = 0,3` sous un cap,
échéance 14–21 jours-jeu), orchestrées par `tickQuetes` (`src/lib/quetes/tick.ts`)
appelé dans `avancerJour` (GameContext). Les **principales** sont l'arc du grand-père
(`debloquerQuetesPrincipales`, registre `src/data/quetesPrincipales.ts`). Le carnet
(`CarnetNotesOverlay.tsx`, `CommandeRow.tsx`) affiche Principales/Secondaires/Terminées.

## Objectif

Remplacer la génération des commandes **secondaires par jour-jeu** par des commandes
**quotidiennes et hebdomadaires en temps réel**, en **conservant** les principales.

## Décisions (validées avec l'utilisateur le 2026-06-25)

- Toujours des **commandes** (livrer des objets), via le carnet + commanditaires existants.
- **3 quotidiennes** (simples) + **3 hebdomadaires** (plus difficiles), en plus des principales.
- **Reset** : minuit local (quotidiennes) / lundi 00:00 local (hebdomadaires). Via le
  **temps de confiance** + fuseau local.
- **Remplacement total au reset** : au reset, les 3 du lot (livrées ou non) sont
  remplacées par 3 fraîches. Une commande livrée reste « terminée » jusqu'au reset ;
  pas de recharge en cours de période.

## Non-objectifs (YAGNI)

- Pas d'objectifs d'action (« vends 3 objets ») : on reste sur le modèle commande.
- Les **principales** ne changent pas (déblocage par progression conservé).
- Pas de pénalité pour commande non livrée (elle est simplement remplacée au reset).

## Architecture

### 1. Modèle de données (`src/types/game.ts`)

- `MissionCategorie` : `"principale" | "secondaire"` → **`"principale" | "quotidienne" | "hebdomadaire"`**.
- Nouveau champ dans `GameState` :

```ts
export interface LotPeriodique {
  /** Clé de la période en cours : "2026-06-25" (jour local) ou "2026-W26" (semaine ISO locale). */
  cle: string;
  /** IDs des courriers du lot courant. */
  courrierIds: string[];
}

// dans GameState :
quetesPeriodiques: {
  quotidien: LotPeriodique;
  hebdo: LotPeriodique;
};
```

### 2. Période — `src/lib/quetes/periode.ts` (nouveau, pur)

Fonctions pures sur `now` (epoch ms = temps de confiance), en **fuseau local** :
- `cleJourLocal(now): string` — `"YYYY-MM-DD"` local.
- `cleSemaineLocale(now): string` — `"YYYY-Www"` (semaine ISO, lundi = début).
- `prochainMinuitLocalMs(now): number` — epoch ms du prochain minuit local.
- `prochainLundiLocalMs(now): number` — epoch ms du prochain lundi 00:00 local.

### 3. Génération — `src/lib/quetes/periodiques.ts` (nouveau)

Réutilise `atteignables` (objets des brocantes débloquées), `recompense`, `textes`,
et le modèle `CourrierPayloadMission`.
- `genererCommande(state, type: "quotidienne" | "hebdomadaire", seed, rng): Courrier`
  - **quotidienne** : 1 cible, 1 objet, réalisable, récompense via formule actuelle.
  - **hebdomadaire** : 2–3 cibles (objets plus rares / meilleur état), récompense plus grosse.
  - `id` déterministe basé sur `seed` (clé période + index) pour éviter les collisions.
- `genererLot(state, type, cle, rng): Courrier[]` — 3 commandes du type.
- Commanditaire : rotation parmi les commanditaires existants (`src/data/expediteursCourrier.ts`).

### 4. Settle (détection du reset) — `src/lib/quetes/settlePeriodiques.ts` (nouveau)

`settleQuetesPeriodiques(state, now): GameState` (pur) :
- Calcule `cleJourLocal(now)` et `cleSemaineLocale(now)`.
- Si `cle` du lot quotidien diffère → supprime les courriers/missions du lot
  (`courrierIds`), génère 3 nouvelles quotidiennes, met à jour
  `quetesPeriodiques.quotidien = { cle, courrierIds }`. Idem hebdo.
- Idempotent si les clés n'ont pas changé (retourne `state` inchangé).
- Les courriers/missions **principaux** et le reste de l'état ne sont jamais touchés.

Câblé dans GameContext **là où l'énergie settle** (hydratation, `focus`,
`visibilitychange`, intervalle), avec `now = tempsConfiance() ?? Date.now()`. Retiré
de `avancerJour`. La nouvelle partie et le chargement déclenchent un settle initial.

### 5. Suppression de l'ancien système

- Retirer `src/lib/quetes/generateurSecondaire.ts` (+ test) et son appel dans
  `tick.ts`. `tickQuetes` ne garde que `debloquerQuetesPrincipales` (les principales
  restent débloquées dans `avancerJour`). Retirer `expireMissions` pour les
  secondaires si plus utilisé (les périodiques n'expirent pas par `jourLimite`).

### 6. Carnet (UI)

`CarnetNotesOverlay.tsx` : sections **Principales / Quotidiennes / Hebdomadaires**
(+ Terminées du lot courant). En tête de chaque section périodique, un **compte à
rebours** « nouvelles commandes dans Xh » jusqu'au prochain reset (ticker 1 s, comme
l'atelier ; `prochainMinuitLocalMs` / `prochainLundiLocalMs`). `CommandeRow.tsx`
inchangé (rendu d'une commande). Plus d'affichage `jourLimite`.

### 7. Notification « Nouvelles quêtes » (IDs 200–201)

`src/lib/notifications/quetesNotif.ts` (nouveau, réutilise le cœur 🅰) :
- `synchroniserNotifsQuetes(now)` : programme 2 notifs — id `200` au prochain minuit
  local (quotidiennes), id `201` au prochain lundi (hebdo) — corps « De nouvelles
  commandes t'attendent ! ». Conversion en **horloge murale** (comme la restauration).
- `NOTIF_IDS.QUETES = [200, 201]` dans `ids.ts`.
- Câblée dans GameContext (effet relancé au settle / changement de clé).

### 8. Migration (`src/lib/migrations.ts`)

Bump `SAVE_VERSION`. Migration :
- Le type `MissionCategorie` perdant `"secondaire"`, on supprime **TOUS** les courriers
  de mission `categorie === "secondaire"` (actifs ET livrés) + leurs `MissionResolution`,
  pour garder un état typé cohérent. L'historique des gains reste dans le Grand livre
  (non touché) ; seul l'affichage carnet « Terminées » de ces anciennes secondaires
  disparaît. Les **principales** sont conservées intactes.
- Ajoute `quetesPeriodiques` vide (`{ quotidien: { cle: "", courrierIds: [] }, hebdo: { cle: "", courrierIds: [] } }`)
  → le 1ᵉʳ settle génère les lots.

## Flux de données

```
GameContext settle (focus/interval/hydratation)
  └─ settleQuetesPeriodiques(state, now)  ── clé changée ? ──► genererLot ──► courriers+missions
        │                                                                         (carnet)
        └─ effet notif ──► synchroniserNotifsQuetes(now) ──► cœur 🅰 ──► plugin (prochain minuit/lundi)
```

## Gestion d'erreurs / cas limites

- **Temps de confiance indisponible** → repli `Date.now()` (pattern existant).
- **Pas d'objets réalisables** (début de partie, peu de brocantes) → le générateur
  produit le plus simple possible ; si vraiment aucun objet réalisable, le lot peut
  contenir moins de 3 commandes (jamais d'erreur).
- **Changement de fuseau / d'horloge** → la clé locale change, le lot se régénère ;
  l'ancre monotone du temps de confiance limite les sauts arrière.
- **Notif** : no-op hors Tauri, erreurs avalées (principe 🅰).

## Tests

- `src/lib/quetes/periode.test.ts` — clés jour/semaine (cas limites : passage minuit,
  dimanche→lundi, fin d'année) ; prochain minuit/lundi.
- `src/lib/quetes/periodiques.test.ts` — quotidienne = 1 cible, hebdo = 2–3 cibles ;
  réalisable ; récompense hebdo > quotidienne ; ids déterministes.
- `src/lib/quetes/settlePeriodiques.test.ts` — régénère quand la clé change ;
  idempotent sinon ; ne touche pas aux principales ; supprime bien l'ancien lot.
- `src/lib/migrations.test.ts` — secondaires actifs supprimés, principales conservées,
  `quetesPeriodiques` ajouté.
- `src/lib/notifications/quetesNotif.test.ts` — IDs 200–201 ; no-op hors Tauri.

## Risques

- **Refonte du carnet** : sections + comptes à rebours ; suivre les tokens/UI existants.
- **Changement de save** : couvert par migration + bump `SAVE_VERSION`.
- **Notif iOS** : repose sur le patch vendoré validé (🅰), conversion horloge murale.
- **Équilibrage** : difficulté quotidienne/hebdo et récompenses tunables après test.
