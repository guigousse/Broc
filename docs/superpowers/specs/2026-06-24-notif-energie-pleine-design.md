# Notification « énergie au maximum » — Design

Date : 2026-06-24
Branche : `feat/systeme-energie` (suite du système d'énergie)

## Contexte

Le système d'énergie est en place (cf. `2026-06-24-systeme-energie-design.md`) :
énergie 0..5, recharge +1 / 30 min en temps réel (modèle de dégradation gracieuse,
ancre device + correction réseau). On veut **notifier le joueur quand l'énergie
atteint 5/5**, y compris quand l'app est fermée / en arrière-plan (le but : le faire
revenir jouer).

Aucun plugin de notification n'est installé aujourd'hui (seulement `tauri-plugin-log`).
Projet en **Tauri v2**.

## Décisions validées

- **Type** : notification **système** (iOS/Android), pas un simple toast in-app.
  Doit s'afficher même app fermée → il faut **planifier** la notif à l'avance.
- **Permission** : demandée **à la 1ʳᵉ consommation d'énergie** (premier moment où
  l'énergie passe sous le max), pas au lancement (meilleure UX / guidelines iOS).
- **Pas d'interrupteur in-app** : la permission OS est le seul contrôle. Refus de
  permission → tout est silencieusement no-op.
- **Hors Tauri (navigateur `npm run dev`)** : tout est no-op (pas d'exception).

## Principe

On ne peut pas exécuter de code quand l'app est fermée. La seule façon de notifier
au bon moment est donc de **programmer une notification locale à l'horodatage futur
où l'énergie sera pleine**, et de la (re)programmer/annuler quand l'énergie change
(pendant que l'app tourne). L'OS déclenche la notif à l'heure prévue, app ouverte ou non.

## Architecture

### 1. Plugin Tauri notification (setup)

Ajouter le plugin officiel `@tauri-apps/plugin-notification` (v2) :
- Dépendance JS : `@tauri-apps/plugin-notification`.
- Crate Rust : `tauri-plugin-notification = "2"` dans `src-tauri/Cargo.toml`.
- Enregistrement : `.plugin(tauri_plugin_notification::init())` dans `src-tauri/src/lib.rs`.
- Permission : ajouter `"notification:default"` aux permissions de
  `src-tauri/capabilities/default.json`.

> À confirmer pendant le plan (lecture doc officielle plugin v2) : l'API exacte de
> planification (`Schedule.at(date)`), d'annulation (`cancel`/`cancelAll`) et de
> consultation (`pending`). Sur desktop la planification peut être limitée ; la cible
> prioritaire est iOS (et Android). Desktop : dégradation acceptable (au pire pas de
> notif planifiée), jamais d'exception.

### 2. Module wrapper — `src/lib/notifications/energieNotif.ts`

Isole toute la dépendance plugin derrière une interface étroite, et **no-op hors Tauri**.

- `notificationsDisponibles(): boolean` — vrai uniquement sous runtime Tauri
  (détection via la présence de l'API Tauri, ex. `isTauri()` de `@tauri-apps/api` ou
  `"__TAURI_INTERNALS__" in window`). Tout le reste court-circuite si faux.
- `assurerPermission(): Promise<boolean>` — `isPermissionGranted()`, sinon
  `requestPermission()`. Idempotent (mémorise le résultat en mémoire process pour ne
  pas re-demander). Renvoie `true` si accordée.
- `planifierPleinEnergie(atMs: number): Promise<void>` — programme **une** notif
  (identifiant fixe `NOTIF_ENERGIE_PLEINE_ID`) à l'horodatage `atMs`. Remplace toute
  notif déjà programmée avec cet id (annule puis reprogramme).
- `annulerPleinEnergie(): Promise<void>` — annule la notif programmée (id fixe).

Toutes ces fonctions attrapent leurs erreurs et ne propagent jamais d'exception
(une panne de notif ne doit jamais casser le jeu).

Contenu de la notif :
- Titre : « Énergie pleine ⚡ »
- Corps : « Tes 5 énergies sont prêtes — reviens chiner ! »

### 3. Helper pur — `secondesAvantPlein(state, now)` dans `src/lib/energie.ts`

```ts
/** Secondes avant d'atteindre ENERGIE_MAX, ou null si déjà plein. */
export function secondesAvantPlein(state: EnergieState, now: number): number | null
```
Implémentation : si `energieCourante(state, now) >= ENERGIE_MAX` → null ; sinon
`secondesAvantProchaine(state, now) + (ENERGIE_MAX - energieCourante(state, now) - 1) * 30min`.
Pur, `now` injecté → testable sans horloge réelle.

### 4. Planification dans `GameContext` (un `useEffect`)

Un effet dédié réagit aux variations d'énergie :
- Dépendances : `state?.energie`, `state?.energieDerniereMaj`, `isHydrated`.
- Si non hydraté ou `!notificationsDisponibles()` → ne rien faire.
- Si `state.energie >= ENERGIE_MAX` → `annulerPleinEnergie()`.
- Sinon (énergie sous le max) :
  1. `const ok = await assurerPermission()` — c'est ici que la permission est demandée
     la **1ʳᵉ fois que l'énergie passe sous le max** (= 1ʳᵉ consommation). Idempotent ensuite.
  2. Si `ok` : `const reste = secondesAvantPlein(state, tempsConfiance() ?? Date.now())` ;
     si `reste != null` → `planifierPleinEnergie(Date.now() + reste * 1000)`.
- Cible en **horloge réelle** (`Date.now() + durée`) : c'est l'OS qui déclenche.
- L'effet ne se relance que quand l'énergie change *réellement* (conso, pub +1, ou un
  tick de regen qui ajoute un point — `energieDerniereMaj` ne bouge que dans ces cas).
  Donc replanification naturelle et peu fréquente, sans emballement.
- Garde anti-race : un flag `annule` dans le cleanup ignore une résolution async tardive.

Comportement à l'ouverture : l'app settle l'énergie au montage ; si déjà pleine,
l'effet annule la notif programmée (évite un doublon si elle n'a pas encore sonné).

### 5. Edge cases
- Permission refusée → `assurerPermission()` renvoie false → aucune notif (silencieux).
- Hors Tauri → `notificationsDisponibles()` false → no-op total (dev navigateur OK).
- Erreur plugin (programmation/annulation) → attrapée, jeu non impacté.
- Énergie déjà pleine au montage → pas de planification, annulation éventuelle.

## Tests

- `src/lib/energie.test.ts` : `secondesAvantPlein` — plein → null ; 4/5 → 30 min ;
  3/5 avec 10 min de reste sur le prochain → `20*60 + 30*60` ; 0/5 → `secondesAvantProchaine + 4*30min`.
- `src/lib/notifications/energieNotif.test.ts` : hors Tauri (pas d'API Tauri stubée),
  `notificationsDisponibles()` → false et `planifierPleinEnergie`/`annulerPleinEnergie`/
  `assurerPermission` ne lèvent pas et n'appellent rien.

## Hors périmètre (YAGNI)
- Notifications autres que « énergie pleine » (missions, événements…).
- Interrupteur in-app / page réglages dédiée.
- Actions sur la notif (boutons, deep-link vers un écran précis) — un tap ouvre l'app.
- Push serveur / Supabase (notifs locales seulement).
