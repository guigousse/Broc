# Sauvegardes multiples (3 emplacements) — Design

Validé par Guillaume le 2026-07-07 (3 slots ; Continuer + écran Parties ; actions Supprimer et Renommer — pas de Dupliquer).

## Objectif

Permettre 3 parties indépendantes sur le même appareil (ex. partie principale + partie de test), sans toucher au format de sauvegarde ni aux migrations du `GameState`.

## Modèle de stockage

- **Clés de parties** : `projet-broc:slot:1:v1`, `projet-broc:slot:2:v1`, `projet-broc:slot:3:v1` — chacune contient un `GameState` sérialisé, exactement comme l'actuelle clé unique.
- **Index** : `projet-broc:slots:v1` —

```ts
interface IndexSlots {
  actif: 1 | 2 | 3;                       // l'emplacement que Continuer reprend et que GameContext lit/écrit
  slots: Record<1 | 2 | 3, MetaSlot | null>; // null = emplacement vide
}
interface MetaSlot {
  nom: string | null;        // nom donné par le joueur (Renommer) ; null = libellé auto « Partie N »
  derniereSession: number;   // timestamp ms de la dernière écriture (affichage « il y a X »)
}
```

- Les métadonnées d'affichage (jour, niveau, budget) ne sont PAS dénormalisées dans l'index : l'écran Parties parse les 3 saves à l'ouverture (~80 Ko chacune, coût négligeable) — zéro risque de dérive.
- Le `GameState` et `SAVE_VERSION` ne changent pas. Les noms de parties vivent dans l'index uniquement.

## Migration de l'existant

Au premier accès à l'index (lazy, dans la couche storage) : si `projet-broc:game-state:v1` existe et qu'aucun index n'existe →
1. copier la valeur brute vers `projet-broc:slot:1:v1` ;
2. relire la clé slot 1 et VÉRIFIER l'égalité avec l'original ;
3. seulement alors : écrire l'index (`actif: 1`, slot 1 = `{nom: null, derniereSession: Date.now()}`) et supprimer l'ancienne clé.
En cas d'échec à n'importe quelle étape : ne rien supprimer, ne pas écrire l'index, retomber sur le comportement actuel (la clé legacy reste la source). Idempotent.

## Couche storage

- Nouveau module `src/lib/storage/slots.ts` : `chargerIndex()` (avec migration lazy), `slotActif()`, `changerSlotActif(n)`, `metaSlot(n)`, `renommerSlot(n, nom)`, `supprimerSlot(n)` (clé + entrée d'index ; si c'était l'actif, l'actif reste sur n — l'emplacement devient vide), `resumeSlot(n)` (parse la save du slot → `{jour, niveau, budget} | null`), `toucherDerniereSession(n)`.
- `localGameRepository` : `load/save/clear` opèrent sur la clé du slot actif (via `slots.ts`) ; `save` met à jour `derniereSession` de l'actif. L'interface `GameRepository` consommée par `GameContext` est INCHANGÉE.
- `GameContext` : inchangé hormis d'éventuels imports. `reset()` (Réglages « Supprimer la sauvegarde ») efface le slot actif seulement (comportement via `clear()` inchangé).

## Changement de partie

Uniquement depuis l'écran titre (aucun état de jeu en vol) : choisir « Jouer » sur un emplacement → `changerSlotActif(n)` synchrone → navigation dure (`window.location.href = "/bureau"`, rechargement propre → GameContext hydrate le nouveau slot). Le piège « auto-save non flushée » ne s'applique pas ici : au titre, aucun état modifié à sauver ; c'est le SEUL endroit où une navigation dure est légitime.

## UI (écran titre)

- **Continuer** : inchangé — reprend le slot actif (= dernière partie jouée).
- **Parties** (nouveau bouton, rangée Réglages · Crédits) : modal (pattern `ReglagesModal`) listant les 3 emplacements :
  - occupé : nom (ou « Partie N »), résumé « Jour X · Niveau N · Y € », « il y a Z », badge « Active » sur le slot actif ; actions **Jouer** (masquée sur l'actif si une save existe — ou libellée « Reprendre »), **Renommer** (petit champ inline, max ~20 caractères), **Supprimer** (ConfirmModal existant, confirmation explicite).
  - vide : « Emplacement vide » + action **Nouvelle partie ici** (joue l'intro puis crée dans CE slot).
- **Nouvelle partie** (bouton principal) : s'il existe un emplacement vide → utilise le PREMIER libre (change l'actif avant l'intro), intro inchangée ; si les 3 sont occupés → ouvre la modal Parties en mode « choisir un emplacement à écraser » (l'écrasement demande confirmation). Le flux actuel de confirmation « écraser la partie » disparaît au profit de ce mécanisme (il ne peut écraser que via la modal).
- Suppression du slot actif : l'écran titre repasse en état « pas de sauvegarde » si les autres slots sont vides, sinon l'actif bascule sur le slot occupé le plus récent.

## Tests

- `slots.test.ts` : index par défaut, migration legacy (succès, échec de relecture → rien détruit, idempotence), changerSlotActif, renommer, supprimer (actif et non-actif), resumeSlot sur save valide/corrompue.
- `localGameRepository.test.ts` : load/save/clear visent la clé du slot actif ; save touche `derniereSession`.
- RTL `PartiesModal.test.tsx` : rendu 3 slots (occupé/vide), Jouer change l'actif, Renommer persiste, Supprimer exige confirmation, mode « choisir pour écraser ».
- E2E léger (Playwright, comme les vérifs précédentes) : créer partie slot 1 → Parties → nouvelle partie slot 2 → alterner entre les deux → supprimer slot 1.

## Hors périmètre

Dupliquer un slot ; sauvegarde cloud (l'interface `GameRepository`/`createGameRepository` reste le point d'extension prévu) ; plus de 3 emplacements.
