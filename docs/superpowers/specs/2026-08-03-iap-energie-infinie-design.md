# Achat in-app « Énergie infinie » — design

**Date** : 2026-08-03
**Statut** : validé par Guillaume (approche A, prix 3,99 €)

## Objet

Un achat in-app **non-consommable** à **3,99 €** qui donne une **énergie réellement illimitée** :
la jauge affiche ∞ et ne se vide plus jamais.

Périmètre volontairement restreint (décision Guillaume en brainstorming) :

- Ce n'est **pas** un « supprimer les pubs » : la **boîte mystère garde sa pub récompensée**, inchangée.
- Seule la pub « +1 énergie » devient sans objet pour l'acheteur (masquée dans la machine à énergie).
- Point de vente unique : la **machine à énergie** (`EnergieRecharge.tsx`).
- « Restaurer les achats » dans les **réglages** (`ReglagesModal.tsx`) — exigence Apple pour un non-consommable.

## Contexte technique

- Monétisation actuelle : uniquement des pubs récompensées opt-in via `src/lib/ads/adProvider.ts`
  (interface + stub) et le pont natif `src-tauri/gen/apple/Sources/app/AdmobBridge.swift`.
- Point de débit unique de l'énergie : `consommerEnergie` dans `src/context/GameContext.tsx` (~l. 402).
- Logique d'énergie pure et testée : `src/lib/energie.ts` (settle par ancre de temps de confiance).
- Bundle : `com.guigousse.broc`.

## Architecture

### 1. Pont natif StoreKit 2 — plugin Tauri vendoré `tauri-plugin-iap`

Miroir de `tauri-plugin-admob` (Rust + Swift). Contrairement à AdMob, **le Swift vit
directement dans le plugin** (`ios/Sources/IapPlugin.swift`) : StoreKit est un framework
système, importable sous swift-rs — le détour `NSClassFromString`/gen-apple n'existait que
pour le xcframework Google. Opérations :

- **`verifierEntitlement()`** — au lancement, parcourt `Transaction.currentEntitlements`
  (validation cryptographique on-device, fonctionne hors-ligne) et répond
  `{ energieInfinie: true|false }`.
- **`acheter()`** — `Product.products(for:)` puis `product.purchase()` ; répond
  `achete`, `annule` ou `erreur`. Le cas `pending` (Ask to Buy / contrôle parental)
  répond sans bloquer l'UI.
- **`restaurer()`** — `AppStore.sync()` puis re-vérification de l'entitlement.

Un listener `Transaction.updates` tourne en tâche de fond (achat abouti hors app,
approbation parentale différée, remboursement) et pousse la mise à jour vers la webview.

Product ID unique : `com.guigousse.broc.energie_infinie`.
Pas de serveur : la validation StoreKit 2 on-device suffit pour un non-consommable.

### 2. Côté TS — miroir du motif adProvider

`src/lib/iap/iapProvider.ts` :

- Interface `IapProvider { verifierEntitlement, acheter, restaurer }` + type de résultat
  (`achete | annule | pending | erreur`, prix localisé).
- Implémentation native sous Tauri iOS ; **stub** partout ailleurs (achat simulé réussi
  après un court délai — permet de tester tout le parcours UI en dev/web).
- Singleton `getIapProvider()` identique à `getAdProvider()`.

**Stockage du drapeau : hors save, lié au device/Apple ID.** Clé `broc.energieInfinie`
en localStorage (via `safeLocalStorage`), servant de cache d'affichage au boot, **écrasée
à chaque lancement** par la réponse StoreKit (source de vérité). Conséquences :

- aucune migration de save (SAVE_VERSION intact) ;
- **l'achat vaut pour TOUTES les parties : les 3 emplacements de sauvegarde existants
  ET toute nouvelle partie créée ensuite** (exigence Guillaume 2026-08-03) — garanti
  par construction, puisque le gating se fait à l'exécution dans GameContext à partir
  du drapeau device, jamais à partir d'une donnée stockée dans la save ;
- insensible aux écrasements/chargements de slots ;
- un remboursement Apple fait retomber le drapeau au lancement suivant.

### 3. Effet en jeu

- `consommerEnergie` (GameContext) : si énergie infinie → **ne décrémente plus**
  (le settle continue de tourner, sans effet visible).
- Hook `useEnergieInfinie()` pour l'UI.
- **Jauge** : affiche **∞** à la place du chiffre.
- **Machine à énergie** (`EnergieRecharge.tsx`) :
  - non-acheteur → cartel « Énergie infinie — 3,99 € » sous l'option pub, **prix réel lu
    depuis StoreKit** (jamais codé en dur : autres devises) ;
  - acheteur → état ∞ affiché, option « pub +1 énergie » masquée.
- **Boîte mystère : inchangée.**

### 4. Réglages + i18n

- `ReglagesModal.tsx` : ligne « Restaurer les achats », toujours visible, toast de
  résultat localisé.
- Libellés i18n ×4 (FR/EN/ES/EL). Règle d'or inchangée : jamais de chaîne localisée en save.

### 5. Erreurs et cas limites

| Cas | Comportement |
|---|---|
| Achat annulé par le joueur | Retour silencieux, pas de toast |
| Erreur réseau / StoreKit | Toast d'erreur localisé |
| Achat `pending` (Ask to Buy) | Toast « en attente d'approbation » ; le listener `Transaction.updates` débloquera plus tard |
| Déjà acheté (re-tap) | Apple répond « déjà acheté » → traité comme une restauration |
| Remboursement | L'entitlement disparaît de `currentEntitlements` → drapeau retombe au prochain lancement |
| Stub (dev/web) | Achat toujours réussi après délai, drapeau posé en localStorage |

### 6. Tests et recette

- TDD vitest (`--maxWorkers=4`) : gating de `consommerEnergie`, hook, stub provider,
  affichage ∞, cartel d'achat, restauration.
- Le pont Swift se recette **sur device réel en sandbox** (compte testeur App Store
  Connect) — le simulateur ne fait pas d'achats.
- App Store Connect : créer le produit non-consommable 3,99 € (palier 4), métadonnées
  4 langues, capture + notes de review ; soumettre l'IAP **avec** la prochaine version
  binaire (1.2.0).

## Estimation

- Dev : ~1 journée (pont Swift ~200-250 lignes + provider TS + UI + i18n + tests).
- Hors dev : config App Store Connect + recette sandbox sur device.

## Décisions de prix (brainstorming)

3,99 € retenu : largement au-dessus de la valeur pub vie-entière d'un joueur engagé
(0,50–2 € en récompensées opt-in), assez bas pour convertir les joueurs fidèles ;
l'énergie ∞ est un vrai avantage premium, pas seulement du confort.
