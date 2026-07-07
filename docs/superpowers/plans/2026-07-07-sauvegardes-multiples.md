# Sauvegardes multiples (3 emplacements) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3 parties indépendantes sur l'appareil — index léger + clés par emplacement, migration vérifiée de la save actuelle, modal « Parties » (Jouer/Renommer/Supprimer), « Nouvelle partie » sur le premier slot libre — sans toucher au format `GameState` ni aux migrations.

**Architecture:** Spec validée : `docs/superpowers/specs/2026-07-07-sauvegardes-multiples-design.md` (BINDANTE — la lire avant chaque tâche). Nouveau module `src/lib/storage/slots.ts` (index + migration lazy) ; `localGameRepository` re-routé sur la clé du slot actif ; interface `GameRepository` et `GameContext` inchangés ; UI uniquement sur l'écran titre. ⚠ CE PLAN S'EXÉCUTE DANS LE WORKTREE `/Users/guillaume/dev/Projet Broc V2/.worktrees/sauvegardes` (branche feat/sauvegardes-multiples) — un autre chantier occupe le checkout principal ; ne JAMAIS exécuter de commande git/npm hors du worktree.

**Tech Stack:** identique (Next.js App Router export statique, React Context, TS, vitest + RTL, localStorage).

## Global Constraints

- Clés : `projet-broc:slot:{1|2|3}:v1` ; index `projet-broc:slots:v1` = `{ actif: 1|2|3, slots: { 1: MetaSlot|null, 2: ..., 3: ... } }`, `MetaSlot = { nom: string|null, derniereSession: number }`.
- Migration legacy (`projet-broc:game-state:v1`) : copier → RELIRE et comparer → seulement alors écrire l'index et supprimer la clé legacy. Échec à toute étape = rien détruit, pas d'index, comportement legacy conservé. Idempotent.
- `GameState`/`SAVE_VERSION`/migrations du jeu : INTOUCHÉS. Interface `GameRepository` : INCHANGÉE.
- Navigation dure (`window.location`) UNIQUEMENT à l'écran titre (aucun état de jeu en vol). Partout ailleurs c'est interdit (leçon : auto-save post-commit).
- ⚠ Suppression du SLOT ACTIF depuis la modal : le GameContext en mémoire détient encore l'état supprimé et son auto-save pourrait RE-CRÉER le slot — après suppression de l'actif, basculer l'actif sur le slot occupé le plus récent (ou le laisser vide) puis `window.location.reload()` immédiat.
- `clear()` du repository (Réglages « Supprimer la sauvegarde ») : efface la clé du slot actif ET met son entrée d'index à null.
- Nommage français ; `npx tsc --noEmit` 0 ; suite `npx vitest run` verte avant chaque commit ; commits `feat(saves):`/`fix(saves):`.

---

### Task 1: `src/lib/storage/slots.ts` — index, migration vérifiée, opérations

**Files:** Create `src/lib/storage/slots.ts` ; Test `src/lib/storage/slots.test.ts`.

**Interfaces — Produces:**
```ts
export type NumeroSlot = 1 | 2 | 3;
export interface MetaSlot { nom: string | null; derniereSession: number; }
export interface IndexSlots { actif: NumeroSlot; slots: Record<NumeroSlot, MetaSlot | null>; }
export const CLE_INDEX = "projet-broc:slots:v1";
export function cleSlot(n: NumeroSlot): string;                    // "projet-broc:slot:N:v1"
export function chargerIndex(): IndexSlots;                        // migration lazy incluse ; défaut {actif:1, slots:{1:null,2:null,3:null}}
export function slotActif(): NumeroSlot;
export function changerSlotActif(n: NumeroSlot): void;
export function renommerSlot(n: NumeroSlot, nom: string | null): void;  // trim, tronqué à 24 chars, "" → null
export function supprimerSlot(n: NumeroSlot): void;                // clé + entrée index à null ; si actif : actif ← slot occupé le plus récent, sinon reste n
export function toucherDerniereSession(n: NumeroSlot): void;       // upsert meta (nom conservé), derniereSession = Date.now()
export function premierSlotLibre(): NumeroSlot | null;
export function resumeSlot(n: NumeroSlot): { jour: number; niveau: number; budget: number } | null; // parse la save ; null si vide/corrompue
```
Toutes les fonctions : no-op/défauts sûrs si `typeof window === "undefined"` ; écritures d'index atomiques (relire-modifier-écrire à chaque appel, pas de cache module — deux onglets/sessions ne doivent pas se corrompre) ; utiliser `safeLocalStorageGet/Set` s'ils conviennent (voir `src/lib/storage/safeLocalStorage.ts`), sinon try/catch localStorage direct comme `localGameRepository`.

- [ ] **Step 1 (RED)** — `slots.test.ts` (jsdom, `beforeEach` → `localStorage.clear()`) :

```ts
describe("index par défaut", () => {
  it("sans rien en storage : actif 1, trois slots vides", ...);
});
describe("migration legacy", () => {
  it("copie game-state:v1 vers slot 1, vérifie, crée l'index, supprime la legacy", () => {
    localStorage.setItem("projet-broc:game-state:v1", '{"budget":123}');
    const idx = chargerIndex();
    expect(localStorage.getItem(cleSlot(1))).toBe('{"budget":123}');
    expect(localStorage.getItem("projet-broc:game-state:v1")).toBeNull();
    expect(idx.actif).toBe(1);
    expect(idx.slots[1]).not.toBeNull();
  });
  it("échec de relecture : rien n'est détruit", () => {
    // simuler l'échec : spy sur Storage.prototype.setItem qui n'écrit PAS pour la clé slot:1
    // → chargerIndex() retombe sur le défaut SANS supprimer la legacy ni écrire l'index
  });
  it("idempotente : un second chargerIndex ne refait rien", ...);
  it("pas de migration si un index existe déjà", ...);
});
describe("opérations", () => {
  it("changerSlotActif persiste", ...);
  it("renommerSlot trim/tronque/vide→null et préserve derniereSession", ...);
  it("supprimerSlot d'un slot non actif : clé effacée, entrée null, actif inchangé", ...);
  it("supprimerSlot de l'actif : bascule sur le slot occupé le plus récent", () => {
    // slot1 actif (derniereSession 100), slot2 occupé (200), slot3 vide → supprimer 1 → actif 2
  });
  it("supprimerSlot de l'actif sans autre slot occupé : actif inchangé (vide)", ...);
  it("premierSlotLibre : 1→2→3→null", ...);
  it("resumeSlot lit jourActuel/brocanteur.niveau/budget ; null si vide ou JSON invalide", ...);
  it("toucherDerniereSession upsert sans écraser le nom", ...);
});
```

- [ ] **Step 2** — RED : `npx vitest run src/lib/storage/slots.test.ts`.
- [ ] **Step 3** — Implémenter (migration DANS `chargerIndex`, gardée par l'absence d'index ; comparer la relecture par égalité de chaîne stricte avant suppression legacy).
- [ ] **Step 4** — GREEN + suite + tsc.
- [ ] **Step 5** — Commit `feat(saves): module slots — index des emplacements et migration vérifiée de la save unique`.

---

### Task 2: `localGameRepository` slot-aware

**Files:** Modify `src/lib/storage/localGameRepository.ts` ; Test `src/lib/storage/localGameRepository.test.ts` (créer s'il n'existe pas).

**Interfaces — Consumes:** Task 1. **Produces:** `load()/save()/clear()` opèrent sur `cleSlot(slotActif())` ; `save` appelle `toucherDerniereSession(slotActif())` après écriture réussie ; `clear` supprime la clé ET met l'entrée d'index de l'actif à null (via une fonction de slots.ts — ajouter `viderSlotActif()` là-bas si plus propre). La constante legacy `STORAGE_KEY` disparaît de ce fichier (la seule référence restante à la clé legacy vit dans la migration de slots.ts).

- [ ] **Step 1 (RED)** : load lit le slot actif (écrire directement `cleSlot(2)` + index actif=2 → load retourne cette save) ; save écrit le slot actif + touche derniereSession ; save sur slot 3 n'écrase pas slot 1 ; clear vide la clé et l'entrée d'index de l'actif seulement ; la migration legacy joue au premier load (la save unique existante est chargée via le slot 1).
- [ ] **Step 2** — RED. **Step 3** — Implémenter. **Step 4** — GREEN + suite + tsc (⚠ vérifier que les tests contexte existants — GameContext.*.test.tsx — restent verts : ils passent par le vrai repository sur jsdom).
- [ ] **Step 5** — Commit `feat(saves): le repository lit et écrit l'emplacement actif`.

---

### Task 3: Modal « Parties » (`src/components/mobile/PartiesModal.tsx`)

**Files:** Create `PartiesModal.tsx` ; Test `PartiesModal.test.tsx`. Suivre le pattern visuel/structurel de `ReglagesModal.tsx` (scrim, carte papier, titres mono uppercase, ConfirmModal pour les confirmations).

**Interfaces — Produces:**
```ts
export function PartiesModal(props: {
  open: boolean;
  onClose: () => void;
  /** mode "gestion" (bouton Parties) ou "choisir-ecrasement" (Nouvelle partie, 3 slots pleins) */
  mode: "gestion" | "choisir-ecrasement";
  /** Nouvelle partie dans ce slot (vide en gestion, n'importe lequel en écrasement — la confirmation est DANS la modal) */
  onNouvellePartie: (slot: NumeroSlot) => void;
}): JSX.Element | null;
```
Comportements internes (pas de props supplémentaires) : liste les 3 slots via `chargerIndex()`/`resumeSlot()` (état local rechargé à l'ouverture) ; slot occupé → nom (ou « Partie N »), « Jour X · Niveau N · Y € » (`toLocaleString("fr-FR")`), « il y a … » (helper local : minutes/heures/jours), badge « Active » ; actions par slot occupé : **Jouer** (`changerSlotActif(n)` puis `window.location.href = "/bureau"` — légitime : écran titre ; masqué en mode écrasement ; sur le slot actif libellé « Reprendre ») ; **Renommer** (champ inline, Enter/blur → `renommerSlot`, maxLength 24) ; **Supprimer** (ConfirmModal « Supprimer “{nom}” ? Cette partie sera définitivement perdue. » ; si slot actif : `supprimerSlot` puis `window.location.reload()` ; sinon `supprimerSlot` + refresh de la liste locale). Slot vide → « Emplacement vide » + bouton **Nouvelle partie ici** → `onNouvellePartie(n)`. En mode « choisir-ecrasement » : chaque slot occupé propose **Écraser** (ConfirmModal) → `onNouvellePartie(n)` ; slot vide → « Nouvelle partie ici » direct.

- [ ] **Step 1 (RED)** — RTL (mock localStorage naturel jsdom ; seed l'index/les saves via les VRAIES fonctions de slots.ts) : rendu 3 slots avec résumés ; badge Active ; Jouer change l'actif (mocker window.location — pattern : `Object.defineProperty` ou spy sur un wrapper) ; Renommer persiste via renommerSlot ; Supprimer exige la confirmation et ne supprime pas sur Annuler ; slot vide → onNouvellePartie(n) ; mode écrasement → Écraser confirme puis appelle onNouvellePartie.
- [ ] **Step 2** — RED. **Step 3** — Implémenter. **Step 4** — GREEN + suite + tsc.
- [ ] **Step 5** — Commit `feat(saves): modal Parties — jouer, renommer, supprimer, choisir l'emplacement à écraser`.

---

### Task 4: Écran titre — bouton Parties + Nouvelle partie multi-slots

**Files:** Modify `src/app/page.tsx` ; Test : étendre le test existant de page.tsx s'il y en a un, sinon vérifs RTL minimales dans `PartiesModal.test.tsx` (déjà couvert) + E2E Task 5.

**Interfaces — Consumes:** Tasks 1-3, `IntroPorte` existant.

- [ ] **Step 1** — Câblage :
  - Bouton **Parties** dans la rangée secondaire (« Réglages · Crédits ») → `PartiesModal mode="gestion"`.
  - **Nouvelle partie** : remplacer la logique actuelle (confirm si save existante) par : `premierSlotLibre()` → s'il existe : `changerSlotActif(libre)` puis intro (`setIntroEnCours(true)`) — le flux intro→`nouvellePartie()` existant crée la partie dans le slot devenu actif ; sinon : ouvrir `PartiesModal mode="choisir-ecrasement"` ; son `onNouvellePartie(n)` fait `changerSlotActif(n)` + ferme la modal + `setIntroEnCours(true)`. ⚠ NE PAS toucher `onIntroFinie` (le commentaire sur l'interdiction de window.location.href reste vrai).
  - **Continuer** : inchangé (slot actif). Le libellé « Continuer · sauvegarde » peut afficher le nom du slot actif s'il en a un (petit plus, optionnel).
  - `aSauvegarde` : aujourd'hui `state !== null` — reste vrai (le GameContext hydrate le slot actif). Vérifier le cas « slot actif vide mais d'autres occupés » : Continuer doit être grisé mais Parties accessible.
  - L'ancien `ConfirmModal` « écraser la partie » de Nouvelle partie disparaît (l'écrasement passe par la modal Parties).
- [ ] **Step 2** — tsc + suite complète (adapter les tests existants de page.tsx si présents ; grep `TitleScreen` dans les tests).
- [ ] **Step 3** — Commit `feat(saves): écran titre — bouton Parties, nouvelle partie sur le premier emplacement libre`.

---

### Task 5: Vérification bout en bout

- [ ] **Step 1** — `npx vitest run` 0 échec ; `npx tsc --noEmit` 0 (DANS le worktree).
- [ ] **Step 2** — E2E Playwright (dev server du worktree, PORT=3211 pour ne pas gêner l'autre session, viewport 375×812, pageerror+console listeners) :
  1. **Migration** : seed `projet-broc:game-state:v1` (save v11 valide, réutiliser le seeding des E2E précédents) → charger `/` → Continuer actif ; vérifier localStorage : `slot:1:v1` présent, legacy absente, index actif=1.
  2. **Nouvelle partie → slot 2** : depuis ce même état, Nouvelle partie → l'intro se joue (tap pour passer) → `/bureau` ; vérifier index actif=2, `slot:2:v1` créée, slot 1 intact.
  3. **Alternance** : retour `/` → Parties → Jouer sur la partie 1 → `/bureau` avec les données du slot 1 (vérifier un marqueur, ex. budget différent) ; re-Parties → Reprendre/Jouer slot 2.
  4. **Renommer** : nommer le slot 1 « Ma vraie partie » → visible après fermeture/réouverture.
  5. **Supprimer** : supprimer le slot 2 (actif) → confirmation → reload → l'actif a basculé sur le slot 1 ; le slot 2 est « Emplacement vide ».
  6. 0 pageerror, 0 console.error. Serveur tué à la fin (port 3211 libre).
- [ ] **Step 3** — Ledger + revue finale de branche (fable) + fixes éventuels.

---

## Notes pour l'exécuteur

- TOUT se passe dans `/Users/guillaume/dev/Projet Broc V2/.worktrees/sauvegardes` — chaque dispatch le rappelle. Le checkout principal appartient à un autre chantier.
- Ne pas ajouter de champ au `GameState` — si une tâche semble l'exiger, STOP et remonter.
- `Date.now()` est permis dans le code produit (pas dans les workflows) ; dans les tests, `vi.setSystemTime` pour « il y a X ».
- Après merge : le merge se fait depuis le checkout principal quand l'autre chantier n'est pas en train de committer — le contrôleur s'en charge, pas les sous-agents.
