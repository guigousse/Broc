# Fondation notifications locales (🅰) — Design

Date : 2026-06-25 · Branche cible : `feat/systeme-energie` (ou branche dédiée)

## Contexte

L'app Broc (Next.js export statique + Tauri 2) est sur TestFlight (iOS) et visera
Android. Une notification locale « Énergie pleine ⚡ » existe déjà et fonctionne
(`src/lib/notifications/energieNotif.ts`, câblée dans `GameContext.tsx`). Le plugin
`@tauri-apps/plugin-notification` couvre iOS **et** Android avec la même API : la
polyvalence multiplateforme est donc native, sans serveur ni APNs/FCM.

Ce design est le **premier de trois sous-projets** liés :

- **🅰 Fondation notifications** *(ce document)* — généraliser le wrapper spécifique
  énergie en un système réutilisable, et ajouter un rappel de retour par inactivité.
- 🅱️ Restauration en temps réel (refonte `atelier.ts` → timer réel + notif). *Spec ultérieur.*
- 🅲 Quêtes quotidiennes/hebdomadaires en temps réel (refonte `src/lib/quetes/` → reset
  réel + notif ; les quêtes principales sont conservées). *Spec ultérieur.*

🅰 est la colonne vertébrale : 🅱️ et 🅲 consommeront son API. Elle livre aussi une
valeur immédiate (le rappel de retour) sans toucher aux mécaniques de jeu.

## Objectifs

1. Un module de notifications locales **générique et réutilisable** (programmer /
   annuler / permission), indépendant de tout domaine métier.
2. Un **registre central d'IDs** pour éviter les collisions entre notifs.
3. Un **rappel de retour par inactivité** en série progressive **J+1 / J+3 / J+7**.
4. **Migrer** la notif énergie existante par-dessus ce socle, sans changer son
   comportement ni l'API consommée par `GameContext`.

## Non-objectifs (YAGNI)

- Pas de notifications **push distantes** (serveur, APNs/FCM) — 100 % local.
- Pas d'**écran de réglages** in-app : les contrôles OS (iOS/Android) suffisent pour
  l'instant. Un toggle pourra être ajouté plus tard quand 🅱️/🅲 introduiront des
  catégories.
- Pas de notif pour des événements **en temps-jeu** (nouvelle brocante, missions,
  tendances) : ils se produisent pendant la session, sans valeur de notification.

## Architecture

```
src/lib/notifications/
  index.ts          ← cœur générique (API bas niveau neutre)
  ids.ts            ← registre central des IDs 32-bit stables
  energieNotif.ts   ← réécrit par-dessus le cœur (API publique inchangée)
  rappelRetour.ts   ← nouveau : série de rappels d'inactivité
```

### `index.ts` — cœur générique

API neutre, **sans logique métier**. Principes conservés du wrapper actuel : import
**dynamique** du plugin (le code natif n'est jamais évalué hors Tauri), tout dans des
`try/catch` avalés, **no-op hors runtime Tauri** — une panne de notif ne casse jamais
le jeu.

- `notificationsDisponibles(): boolean` — vrai uniquement sous Tauri
  (`"__TAURI_INTERNALS__" in window`).
- `permissionAccordee(): Promise<boolean>` — lit la permission **sans la demander**
  (`isPermissionGranted`).
- `demanderPermission(): Promise<boolean>` — demande la permission (idempotent ;
  `isPermissionGranted` puis `requestPermission`).
- `programmer(opts: { id: number; title: string; body: string; atMs: number }): Promise<void>`
  — annule l'ID puis programme une notif locale à `new Date(atMs)` via
  `Schedule.at(date, false, true)` (non répétée, `allowWhileIdle`).
- `annuler(ids: number[]): Promise<void>` — `cancel(ids)`, erreurs avalées.

### `ids.ts` — registre central

IDs 32-bit stables, plages réservées pour éviter les collisions futures :

```ts
export const NOTIF_IDS = {
  ENERGIE_PLEINE: 1,
  RAPPEL_RETOUR: [10, 11, 12] as const, // J+1, J+3, J+7
  // Réservé 🅱️ restauration : 100–199 (1 par slot d'atelier)
  // Réservé 🅲 quêtes      : 200–299
} as const;
```

## Rappel de retour (série J+1 / J+3 / J+7)

Module `rappelRetour.ts` + un hook `useRappelRetour()` monté dans `GameContext`, à
côté des listeners `focus` / `visibilitychange` déjà présents.

**Comportement :**

- **App en arrière-plan** (`visibilitychange → hidden` ou `blur`) :
  `annuler(RAPPEL_RETOUR)` puis programmer 3 notifs à `now + 24h`, `now + 3j`,
  `now + 7j` (avec `now = Date.now()`).
- **Réouverture** (`focus` ou `visible`) : `annuler(RAPPEL_RETOUR)`.
- **Permission** : le rappel **ne prompt jamais** au moment où le joueur quitte. Il ne
  programme que si `permissionAccordee()` est déjà vrai (permission obtenue via le flux
  énergie). Sinon, no-op silencieux.
- **Temps** : `Date.now()` (heure appareil). La notif se déclenche sur l'horloge
  système de toute façon ; l'anti-triche `tempsConfiance` ne concerne que le crédit
  d'énergie, pas la programmation des rappels.
- **Persistance** : aucune. Tout vit côté OS et est reprogrammé à chaque sortie.

**Messages (ajustables) :**

| Échéance | Titre | Corps |
|----------|-------|-------|
| J+1 | « Ta brocante prend la poussière… » | « Reviens chiner, le camion t'attend ! » |
| J+3 | « Des affaires t'attendent ! » | « De nouvelles trouvailles sont à dénicher. » |
| J+7 | « On range le camion ? » | « Reviens vite récupérer ton énergie ⚡ » |

## Migration de l'énergie

`energieNotif.ts` réécrit pour déléguer au cœur (`programmer` / `annuler` /
`permissionAccordee` / `demanderPermission`) au lieu d'importer le plugin directement.

**API publique identique** — `planifierPleinEnergie(atMs)`, `annulerPleinEnergie()`,
`assurerPermission()`, `notificationsDisponibles()` — afin que **`GameContext.tsx` ne
change pas**. `assurerPermission()` devient un alias de `demanderPermission()` du cœur
(le flux énergie continue de demander la permission à la 1ʳᵉ consommation).

## Flux de données

```
GameContext (effet énergie) ──► energieNotif ──┐
                                                ├──► index.ts (programmer/annuler) ──► plugin Tauri
GameContext (useRappelRetour) ──► rappelRetour ─┘                                       (iOS / Android)
```

`index.ts` est le seul point qui importe `@tauri-apps/plugin-notification`.

## Gestion d'erreurs

- Hors Tauri : toutes les fonctions sont des no-op (retour immédiat / `false`).
- Sous Tauri : chaque appel plugin est dans un `try/catch` qui **avale** l'erreur — une
  notif qui échoue ne remonte jamais et ne casse pas le jeu (principe existant conservé).

## Tests

- `index.test.ts` — no-op hors Tauri ; `programmer` annule-puis-programme avec les bons
  arguments ; `annuler` passe les bons IDs ; erreurs plugin avalées (pas de throw).
- `rappelRetour.test.ts` — programme 3 notifs aux offsets J+1/J+3/J+7 ; **n'agit pas**
  si permission non accordée ; annule les 3 à la réouverture.
- `energieNotif.test.ts` — conservé/adapté en non-régression (comportement public
  inchangé).

Les imports dynamiques du plugin sont mockés (le plugin n'est pas évalué en test, comme
aujourd'hui).

## Risques

- **Toucher au flux énergie (prod/TestFlight)** : mitigé en gardant l'API publique de
  `energieNotif.ts` strictement identique et en s'appuyant sur les tests existants.
- **Multiplicité des notifs OS** : iOS/Android plafonnent le nombre de notifs locales
  programmées (64 sur iOS) — sans objet ici (4 IDs au total).
```
