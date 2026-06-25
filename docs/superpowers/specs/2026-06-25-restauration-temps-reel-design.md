# Restauration en temps réel (🅱) — Design

Date : 2026-06-25 · Branche cible : `feat/systeme-energie` (ou branche dédiée)

## Contexte

Broc (Next.js export statique + Tauri 2). Deuxième des trois sous-projets liés au
système de notifications locales (cf. [[systeme-notifications]] / spec
`2026-06-25-fondation-notifications-design.md`) :

- 🅰 Fondation notifications — **FAIT** (cœur générique `src/lib/notifications/`,
  rappel de retour, notif énergie ; bug iOS de planification corrigé via patch
  vendoré).
- 🅱 Restauration en temps réel — *ce document*.
- 🅲 Quêtes quotidiennes/hebdomadaires — spec ultérieur.

Aujourd'hui, la restauration d'un objet à l'atelier est en **jours de jeu** :
`restaurerObjet(id, etatCible, { dureeJours })` pose
`enRestauration: { etatCible, jourFin: jourActuel + duree }`, avec `duree` = 5
jours (ou 3 avec la compétence « Maître Réparer », cf. `dureeRestauration` dans
`src/lib/competences.ts`). La fin se récupère par un clic explicite « Récupérer »
quand `jourActuel >= jourFin` (`appliquerRecuperation` dans `src/lib/atelier.ts`).
L'atelier offre 1/2/3 slots selon `niveauAtelier`.

Le passage du jour ne termine déjà PLUS la restauration automatiquement
(`GameContext` ~ligne 463) : l'objet reste `enRestauration` jusqu'au clic.

## Objectif

Faire passer la restauration d'un délai en **jours de jeu** à un **timer en temps
réel** (comme l'énergie : ancre + durée en ms, « settle » au focus, via le temps de
confiance anti-triche), notifier « Objet restauré » à l'échéance, et préparer un
**skip via pub** (mécanique construite, déclencheur pub câblé plus tard).

## Décisions (validées avec l'utilisateur le 2026-06-25)

- **Durées selon l'état de départ** (plus l'objet est déjà en bon état, plus c'est
  long) : `Mauvais→Bon` = **1 h**, `Bon→Très bon` = **2 h**, `Très bon→Pristin` =
  **4 h**. Compétence **« Maître Réparer »** → facteur **×0,6**.
- **Récupération** : on **garde le clic explicite « Récupérer »** (l'objet reste
  prêt jusqu'au clic), comme aujourd'hui.
- **Skip pub** : possible uniquement quand il reste **≤ 30 min**. On construit la
  mécanique « terminer immédiatement » (fonction pure + action) maintenant ; le
  **déclencheur pub est un stub** (pas de SDK pub au lancement, cf.
  [[app-store-launch]]). Le bouton UI est masqué derrière un flag
  `PUB_DISPONIBLE = false` au lancement (pas de bouton mort).
- **Notification** : une notif « Objet restauré » par objet, programmée à `finMs`.

## Non-objectifs (YAGNI)

- Pas de SDK pub ni de vraie pub récompensée (chantier séparé). On ne fournit que la
  mécanique + le flag.
- Durée indépendante de la rareté / valeur de l'objet (seul l'état de départ et la
  compétence comptent).
- Pas de récupération automatique : le clic « Récupérer » reste.

## Architecture

### 1. Modèle de données (`src/types/game.ts`)

```ts
enRestauration?: {
  etatCible: EtatObjet;
  /** Ancre (temps de confiance, epoch ms) du début. */
  debutMs: number;
  /** Échéance (epoch ms) : restauration prête quand now >= finMs. */
  finMs: number;
};
```

Remplace `{ etatCible, jourFin }`. Nouvelles constantes (dans `src/lib/restauration.ts`) :

```ts
export const DUREE_RESTAURATION_MS: Record<EtatObjet, number> = {
  "Mauvais": 1 * 60 * 60 * 1000,
  "Bon": 2 * 60 * 60 * 1000,
  "Très bon": 4 * 60 * 60 * 1000,
  "Pristin état": 0, // non restaurable
};
export const MAITRE_REPARER_FACTEUR = 0.6;
export const FENETRE_PUB_MS = 30 * 60 * 1000;
```

### 2. Logique pure — `src/lib/restauration.ts` (nouveau)

Fonctions pures et testables (modèle de `energie.ts`). `now` = **temps de confiance**
(epoch ms ; ancre monotone anti-triche, cf. `src/lib/temps/horloge.ts`), jamais
l'horloge brute.

- `dureeRestaurationMs(state, cat, etatDepart): number` — durée totale ; applique
  `MAITRE_REPARER_FACTEUR` si `aMaitreReparer(state, cat)` (`src/lib/competences.ts`),
  arrondie à l'entier ms.
- `restantMs(enRest, now): number` — `max(0, finMs - now)`.
- `progression(enRest, now): number` — `clamp01((now - debutMs) / (finMs - debutMs))` ;
  `1` si `finMs <= debutMs`.
- `estPret(enRest, now): boolean` — `now >= finMs`.
- `peutTerminerImmediat(enRest, now): boolean` — `0 < restantMs(enRest, now) <= FENETRE_PUB_MS`.

`src/lib/competences.ts` : `dureeRestauration` (jours) devient obsolète ; on la
retire et on bascule ses appelants sur `dureeRestaurationMs`. `aMaitreReparer`
reste utilisée.

### 3. GameContext (`src/context/GameContext.tsx`)

- `restaurerObjet(id, etatCible)` : supprime le param `options.dureeJours` ; pose
  `enRestauration: { etatCible, debutMs: now, finMs: now + dureeRestaurationMs(...) }`
  où `now = tempsConfiance() ?? Date.now()`.
- `recupererObjetRestaure(id)` : test de complétion via `estPret(enRest, now)` au lieu
  de `jourActuel >= jourFin`. `appliquerRecuperation` (atelier.ts) adapté pareil
  (signature `(state, id, now)`).
- `terminerRestaurationImmediate(id)` : **nouvelle action**. Si
  `peutTerminerImmediat(enRest, now)`, applique la récupération immédiatement
  (même mutation d'état que `recupererObjetRestaure`). Déclencheur pub = stub
  (appelée par le bouton UI, lui-même masqué tant que `PUB_DISPONIBLE` est faux).

### 4. Notification — `src/lib/notifications/restaurationNotif.ts` (nouveau)

Réutilise le cœur 🅰 (`programmer`, `annuler`, `permissionAccordee`). Plage d'IDs
`NOTIF_IDS.RESTAURATION = [100, 101, 102]` (1 par slot ; max niveau 3) — à ajouter
dans `src/lib/notifications/ids.ts`.

- `synchroniserNotifsRestauration(objetsEnRestauration, now)` : annule les 3 IDs,
  puis pour chaque objet en cours (≤ 3) programme une notif à `finMs` —
  titre « Atelier », corps « « {nom} » est restauré ✓ », `sound: "default"`. Ne
  programme que si permission déjà accordée (ne prompt jamais).
- Câblé dans GameContext par un effet qui se relance quand l'ensemble en
  restauration change (ids + finMs), à côté des effets énergie/rappel. No-op hors
  Tauri.

### 5. UI atelier (`src/app/atelier/gerer/page.tsx` + lignes associées)

- Remplacer l'affichage « fin jour N°XXX » / `restant = jourFin - jourActuel` par un
  **compte à rebours temps réel** (ticker `setInterval` 1 s qui force le re-render),
  format `Hh MM` ou `MM:SS`, et « prêt ✓ » quand `estPret`.
- Bouton **« Terminer (pub) »** rendu seulement si `peutTerminerImmediat` ET
  `PUB_DISPONIBLE` (constante, `false` au lancement) → appelle
  `terminerRestaurationImmediate`. Au lancement : non rendu.
- Le libellé de départ « … dans X j. » devient « … dans 1 h / 2 h / 4 h » (durée réelle).

### 6. Migration (`src/lib/migrations.ts`)

Bump `SAVE_VERSION`. Pour chaque objet d'une ancienne sauvegarde portant
`enRestauration.jourFin` : convertir en `{ etatCible, debutMs: 0, finMs: 0 }` →
`estPret` vrai immédiatement (le joueur récupère). Pas de tentative de conversion
jour→temps réel (non fiable).

## Flux de données

```
UI atelier ──restaurerObjet──► GameContext (pose debutMs/finMs via tempsConfiance)
   ▲                                    │
   │ ticker 1s (restantMs/estPret)      ├──► effet notif ──► restaurationNotif ──► cœur 🅰 ──► plugin
   └──recupererObjetRestaure / terminerRestaurationImmediate──► appliquerRecuperation (mutation état)
```

## Gestion d'erreurs / cas limites

- **Temps de confiance indisponible** → repli `Date.now()` (déjà le pattern énergie).
- **finMs dépassé pendant l'absence** → `estPret` vrai au retour ; notif déjà tombée.
- **Anti-recul horloge** → assuré par l'ancre monotone du temps de confiance.
- **Notif** : no-op hors Tauri, erreurs avalées (principe 🅰).

## Tests

- `src/lib/restauration.test.ts` — durées par état + facteur compétence ;
  `restantMs`/`progression`/`estPret` ; fenêtre `peutTerminerImmediat` (bornes 0 et
  30 min).
- `src/lib/atelier.test.ts` — `appliquerRecuperation` adapté au temps réel
  (`(state, id, now)`), prêt/non-prêt.
- `src/lib/migrations.test.ts` — ancien `jourFin` → `debutMs/finMs = 0` (prêt).
- `src/lib/notifications/restaurationNotif.test.ts` — no-op hors Tauri ; IDs 100–102 ;
  synchronisation (annule puis programme par objet).

## Risques

- **Changement de save** : couvert par la migration + bump `SAVE_VERSION` + garde
  anti-régression existante.
- **Re-render ticker** : un `setInterval` 1 s borné à la page atelier (cleanup au
  démontage) — pas de fuite.
- **Notif iOS** : repose sur le patch vendoré déjà validé (🅰).
