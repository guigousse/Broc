# Carnet de session — refonte vintage (overlay flottant)

**Date** : 2026-06-15
**Statut** : design validé

## Contexte

Le carnet de sessions actuel (`CarnetSheet`) est un BottomSheet sobre qui affiche les 3 dernières sessions via `QgHistorique`, avec un lien vers `/historique` pour la liste complète. Il sert uniquement de raccourci visuel sur le P&L des sessions de chinage/vente — il ignore les autres flux de budget (loyer, gazette, courriers, upgrades, frais d'entrée brocante).

On veut transformer le carnet en un véritable **registre de tenue financière + tableau de bord des missions**, avec un habillage "cahier de compte papier ancien" qui en fait un objet à part entière dans l'univers du QG.

## Objectifs

1. Donner au joueur une vue financière complète : toutes les transactions, jour par jour, avec solde courant.
2. Introduire un système de **missions reçues par courrier** (un autre PNJ demande au joueur de lui trouver un objet précis contre récompense).
3. Habillage visuel "cahier de compte ancien" qui fait écho à la référence visuelle fournie (page A4 papier crème, lignes fines, headers serif noirs).
4. Remplacer le carnet + page `/historique` par un unique overlay full-screen, supprimer le code devenu redondant.

## Non-objectifs

- Pas de système de filtres / recherche / pagination dans le grand livre (volume reste petit, on scroll).
- Pas de moyen de paiement (espèces uniquement dans le jeu, la colonne "Moyen de paiement" du cahier de référence est retirée).
- Pas de génération de missions automatiques par le moteur dans cette spec — la spec décrit le système ; les missions concrètes (expéditeurs, cibles, déclencheurs) seront ajoutées au pipeline `courrier.ts` au cas par cas dans une itération suivante.

## Architecture

### Données — extensions de `src/types/game.ts`

**Nouveau payload de courrier : mission**

```ts
export interface CourrierPayloadMission {
  type: "mission";
  expediteurId: string;
  titre: string;
  corps: string[];
  cible: { templateId: string; etatMin?: EtatObjet };
  jourLimite?: number;       // si défini, mission expirée si jourActuel > jourLimite
  recompense: { argent: number };
}

export type CourrierPayload = CourrierPayloadLettre | CourrierPayloadMission;
```

Le payload mission réutilise l'infra existante du courrier (expéditeurs, signatures, paragraphes markdown). La mission *est* le contenu d'une lettre.

**Résolution de mission** (table side-by-side du courrier)

```ts
export type MissionStatut = "active" | "livree" | "expiree";

export interface MissionResolution {
  courrierId: string;        // pointeur vers le Courrier de type mission
  statut: MissionStatut;
  jourResolution?: number;   // jour de livraison ou d'expiration
}
```

Une mission devient `active` au moment où le joueur **lit** son courrier (équivalent à `marquerCourrierLu`). Avant ça, c'est juste un courrier non lu. Pas de duplication d'état narratif : le titre/corps/expéditeur restent dans `Courrier.payload`, seule la résolution vit ici.

**Grand livre (journal de transactions)**

```ts
export type LedgerKind =
  | "session_chinage"
  | "session_vente"
  | "frais_brocante"
  | "loyer"
  | "gazette"
  | "courrier_recompense"
  | "mission_recompense"
  | "upgrade_atelier"
  | "upgrade_stockage"
  | "upgrade_camion";

export interface LedgerEntry {
  id: string;
  jour: number;
  timestamp: number;
  kind: LedgerKind;
  designation: string;       // libellé court : "Brocante du Lac · 4 acquis", "Loyer stockage N2"
  recette: number;           // >= 0
  depense: number;           // >= 0
  soldeApres: number;        // budget après l'opération (snapshot, utilisé pour l'affichage)
  sessionId?: string;        // lien vers Session quand applicable (expand inline)
  courrierId?: string;       // lien vers Courrier (mission/lettre récompense)
}
```

**Ajouts à `GameState`**

```ts
export interface GameState {
  // … existant
  grandLivre: LedgerEntry[];
  missions: MissionResolution[];
}
```

### Logging des transactions — `GameContext`

Centraliser la mutation `budget` derrière un helper interne qui push automatiquement une `LedgerEntry`. Le helper est utilisé par chacune des actions financières :

| Action                            | Kind                   | Désignation (exemple)                   | Détail                                            |
|-----------------------------------|------------------------|------------------------------------------|---------------------------------------------------|
| Clôture session chinage           | `session_chinage`      | `Brocante du Lac · 4 acquis`             | `depense` = somme `prixPaye`, `sessionId` lié    |
| Clôture session vente             | `session_vente`        | `Étal Lac · 3 ventes`                    | `recette` = ventes brutes, `depense` = COGS *séparé en 2 entrées si on veut net*. **Choix retenu** : 1 seule entrée avec `recette = ventes - cogs` si net positif, sinon `depense = cogs - ventes`. Plus lisible dans le grand livre. |
| Entrée brocante (chinage/vitrine) | `frais_brocante`       | `Entrée · Brocante du Lac`               | `depense` = `fraisEntree(brocante)`               |
| Loyer prélevé                     | `loyer`                | `Loyer · Stockage N2`                    | `depense` = montant. Déclenché par `avancerJour`. |
| Achat Gazette                     | `gazette`              | `Gazette du jour XX`                     | `depense` = `PRIX_GAZETTE`                        |
| Récompense courrier lu            | `courrier_recompense`  | `Lettre de la mère`                      | `recette` = recompense.argent                     |
| Livraison mission                 | `mission_recompense`   | `Mission · Ocarina of Time`              | `recette` = recompense.argent                     |
| Upgrade atelier/stockage/camion   | `upgrade_*`            | `Amélioration · Atelier N2`              | `depense` = coût                                  |

Le helper :

```ts
function logEntry(state: GameState, partial: Omit<LedgerEntry, 'id'|'soldeApres'|'timestamp'>): GameState {
  const ts = Date.now();
  const newBudget = state.budget + partial.recette - partial.depense;
  const entry: LedgerEntry = {
    id: makeId('ledger'),
    timestamp: ts,
    soldeApres: newBudget,
    ...partial,
  };
  return { ...state, budget: newBudget, grandLivre: [...state.grandLivre, entry] };
}
```

Toutes les mutations existantes du budget (déjà éparpillées : `acheterGazette`, `marquerCourrierLu`, `clotureChinage`, `clotureVente`, `payerLoyer`, `acheter*Upgrade`, `payerFraisBrocante` à créer) sont migrées vers ce helper. Une seule source de vérité pour le solde.

### Migration de save (best-effort)

`SAVE_VERSION` bumpé. Migration :

1. **Reconstruire le grand livre** depuis `historique[]` :
   - Pour chaque `SessionChinage` : 1 entrée `session_chinage` (depense = total achats).
   - Pour chaque `SessionVente` : 1 entrée `session_vente` (net = recettes - cogs).
   - **Ordre** : tri par `timestamp` ascendant.
   - **Solde reconstitué** : on remonte depuis `budget` actuel vers le passé pour figer le `soldeApres` de chaque entrée. Formule : `soldeApres[n] = budget - somme(recette - depense pour entrées > n)`. Cette reconstruction est imparfaite (loyer/gazette/upgrades non capturés) mais cohérente.

2. **`missions: []`** initialisé vide. Les courriers de type lettre existants ne deviennent pas des missions.

### Livraison de mission

Bouton "Livrer" dans l'onglet Missions, visible uniquement si :
- Mission `active`,
- Objet correspondant au `templateId` dans `inventaireJoueur`,
- (Si `etatMin` défini) l'objet est au moins à cet état (Mauvais < Bon < Très bon < Pristin).

`livrerMission(courrierId)` :
1. Retire le premier objet matchant de l'inventaire.
2. Crédite `recompense.argent` (via `logEntry` kind `mission_recompense`).
3. Push résolution `{ statut: 'livree', jourResolution: jourActuel }`.
4. Joue son `playCash`.

### Expiration

Dans `avancerJour`, après l'incrément :
- Pour chaque `Courrier` de type `mission` lu, sans résolution, avec `jourLimite` défini et `jourLimite < jourActuel` : push résolution `{ statut: 'expiree', jourResolution: jourActuel }`.

Pas de notification UI pour cette spec (sobre).

## UI

### `CarnetOverlay` (nouveau composant)

Fichier : `src/components/mobile/qg/overlays/CarnetOverlay.tsx`.

Structure inspirée de `CourrierSheet` : full-screen, scrim sombre `rgba(15,30,22,0.55)`, bouton ✕ rond flottant en haut à droite, scroll vertical interne.

**Stage central** = "carnet posé sur le bureau" :
- Largeur max 480px, hauteur ≈ 92% viewport.
- Fond : dégradé papier `linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)`.
- Bordure : `1px solid #b89c5e` + double inset shadow pour effet relief.
- Légère rotation `-0.4deg` pour l'effet "objet posé".
- Couverture/en-tête fixe : "Cahier de Compte" en `var(--font-display)` + sous-titre "Jour XX · Solde XXX €" en `var(--font-mono)`.

**Tabs ruban** sous l'en-tête : deux onglets `Comptes` / `Missions`. Style ruban brun, onglet actif en relief papier. Badge sur Missions = nombre de missions actives.

**Onglet Comptes**

Tableau lined-paper :
- Headers : `Date | Désignation | Recettes | Dépenses | Solde` — fond noir/brun, texte papier crème, font serif gras.
- Lignes : alternance subtile, séparateur fin `1px dotted #c8b48a`, font mono pour les chiffres, serif pour la désignation.
- Recettes en vert forêt, Dépenses en vermillon, Solde en encre noire.
- Lignes `session_*` sont expandables (tap → détail inline avec achats/ventes individuels, comme l'actuelle `DetailsChinage` / `DetailsVente`).
- Tri : plus récent en haut.
- En bas du tableau, ligne **Total** : recettes cumulées | dépenses cumulées | solde courant. Fond plus sombre.

**Onglet Missions**

Liste de cartes mission, plus récentes en haut. Chaque carte :
- En-tête : nom de l'expéditeur + badge statut (`Active` / `Livrable` / `Livrée` / `Expirée`).
- Titre de la mission (= titre du courrier).
- Encart "Demande" : nom de l'objet ciblé + état minimum si requis (ex: `Ocarina of Time · Pristin état min.`).
- Encart "Récompense" : `+XXX €`.
- Si `jourLimite` : `Avant le jour YY` (rouge si J-3 ou moins).
- Bouton "Livrer" si statut = `Livrable` (objet présent au bon état).
- Mission `livree` / `expiree` : carte estompée, sans bouton, statut affiché.

État vide :
- Comptes : "Aucune écriture." en italique serif.
- Missions : "Aucune mission reçue." en italique serif.

### Câblage

`(panorama)/layout.tsx` :
- Remplace `import { CarnetSheet }` par `import { CarnetOverlay }`.
- L'usage reste identique : `<CarnetOverlay open={carnetOuvert} onClose={...} state={state} onLivrerMission={...} />`.

`GameContext` : nouvelles actions `livrerMission(courrierId)` exposées, action `payerFraisBrocante(brocanteId)` centralisée (au lieu des mutations `budget -= fraisEntree(...)` éparpillées).

### Suppressions

- `src/app/historique/page.tsx` — page autonome supprimée.
- `src/components/mobile/QgHistorique.tsx` — composant supprimé (sa logique `resumer()` est inlinée dans `CarnetOverlay`).
- `src/components/mobile/qg/sheets/CarnetSheet.tsx` — remplacé par `CarnetOverlay`.

Aucun autre usage de `QgHistorique` n'existe (grep confirmé : seul `CarnetSheet` l'importait).

## Tests

- `migrations.test.ts` : nouveau cas de migration save N → N+1, vérifier reconstruction du grand livre depuis `historique`.
- `courrier.test.ts` : test du payload mission (sérialisation, expiration via tick `avancerJour`).
- Nouveau test unitaire : `livrerMission` retire l'objet, crédite, log entry, push résolution.
- Nouveau test unitaire : `payerFraisBrocante` log une entrée `frais_brocante`.
- Pas de test visuel pour `CarnetOverlay` (cohérent avec les autres overlays existants).

## Risques & arbitrages

- **Volume du grand livre** : à 1 entrée/transaction et ~10 transactions/semaine, on est à ~500 entrées/an. Stockage local OK, rendu OK (scroll natif). Pas de pagination prévue.
- **Reconstruction de save imparfaite** : assumé. Le grand livre devient "vrai" à partir de la migration. On documente ça via une bannière discrète "Comptes antérieurs reconstitués partiellement" dans l'onglet Comptes pour les saves migrées (drapeau `grandLivreMigreLe?: number` dans le state, optionnel).
- **Expiration silencieuse** : on choisit pas de notif pour rester sobre. Si gênant à l'usage, on ajoutera un courrier auto "Mission expirée" plus tard.
- **Mission livrable mais valeur de revente > récompense** : volontaire — c'est un dilemme de gameplay assumé (cf. brainstorming).

## Plan de livraison (haute maille)

1. Types + helper `logEntry` + migration save.
2. Refacto `GameContext` : tous les mouvements de budget passent par `logEntry`.
3. Action `payerFraisBrocante` + câblage `/chiner`, `/vitrine`.
4. Payload mission + livraison + expiration via tick.
5. Composant `CarnetOverlay` (tabs + tableau + cartes mission).
6. Câblage layout panorama + suppression `CarnetSheet` / `QgHistorique` / `/historique`.
7. Tests unitaires (migration, mission, frais brocante).
