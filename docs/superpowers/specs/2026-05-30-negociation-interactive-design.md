# Négociation interactive — barre à curseurs, personas vendeur, contre-offres

**Date :** 2026-05-30
**Branche cible :** branche dédiée à décider lors du plan (probablement `feat/negociation-interactive`).
**Périmètre :** la sheet de négociation côté chinage, la mécanique de réaction vendeur, l'introduction de personas vendeur sur les items.

## Objectif

La négociation actuelle est un input numérique : le joueur entre une offre, le vendeur accepte / refuse poliment / se fâche. Pas de contre-offre, pas de feedback continu, pas de personnalité. Le joueur "tente sa chance" plutôt qu'il négocie.

On la remplace par une **barre à deux curseurs** où le vendeur et le joueur convergent au fil des tours, avec une **vraie contre-offre** côté vendeur, un **archétype** qui détermine son tempérament, et une **jauge d'humeur** qui prévient avant la colère.

## 1. Mécanique de négociation

### Modèle vendeur (persona)

Chaque item sur une brocante reçoit un **persona vendeur** tiré à l'instanciation, défini par 5 paramètres :

| Paramètre | Type | Rôle |
|---|---|---|
| `margePct` | `0–1` | Marge totale lâchable : `prixMinAccept = prixVendeur × (1 − margePct)` |
| `elanPct` | `0–1` | À chaque tour, fraction du gap restant que le vendeur concède |
| `patience` | `2–6` | Nombre de tours max avant refus poli |
| `tolerancePct` | `0–1` | Seuil sous lequel une offre est insultante (déclenche colère) |
| `sangFroid` | `0–1` | Résistance à l'alea de colère en zone limite |

### 6 archétypes

| ID | Nom | Marge | Élan | Patience | Tolérance | Sang-froid |
|---|---|---|---|---|---|---|
| `naif` | Le Naïf | 0.95 | 0.90 | 4 | 0.95 | 0.90 |
| `bonhomme` | Le Bonhomme | 0.40 | 0.55 | 5 | 0.70 | 0.85 |
| `mamie` | Mamie pressée | 0.45 | 0.85 | 2 | 0.55 | 0.50 |
| `malin` | Le Malin | 0.25 | 0.20 | 5 | 0.50 | 0.80 |
| `grincheux` | Le Grincheux | 0.10 | 0.25 | 3 | 0.30 | 0.25 |
| `antiquaire` | L'Antiquaire | 0.12 | 0.45 | 4 | 0.35 | 0.95 |

Ces valeurs sont les **médianes** — chaque tirage applique un jitter de ±10 % pour la variété, sans changer le profil.

### Tirage de persona

Tirage **par item** (chaque exposant a son tempérament). La distribution dépend du `tier` de la brocante et de son `ambiance` :

- **Tier 1** : majorité Bonhomme/Mamie/Grincheux + rare Naïf.
- **Tier 2** : majorité Malin/Bonhomme + occasionnel Antiquaire.
- **Tier 3** : majorité Antiquaire/Malin, Naïf disparaît.

Pondérations exactes à figer dans `src/lib/personas.ts`. L'ambiance peut biaiser légèrement (ex: `Sélect` / `Précieux` favorisent l'Antiquaire ; `Familial` favorise le Bonhomme).

### Déroulement d'un tour

1. Le joueur déplace son curseur (acheteur) entre 1 € et le prix vendeur courant, puis tape **« Proposer »**.
2. Branchement :
   - `offre ≥ prixVendeurCourant` → **accord** au prix de l'offre.
   - `offre < tolerancePct × prixVendeurCourant` → **colère**, objet perdu pour la session.
   - sinon → tirage `Math.random() < (1 − sangFroid) × pressionTour` ? Si oui → colère prématurée. Sinon **contre-offre** :
     ```
     nouveauPrixVendeur = max(
       prixMinAccept,
       prixVendeurCourant − (prixVendeurCourant − prixMinAccept) × elanPct
     )
     ```
3. Si `tour > patience` sans accord → **refus poli** : l'objet reste achetable au prix vendeur courant, négo verrouillée.
4. L'humeur monte à chaque tour (`+1/patience`) et chaque offre proche de `tolerancePct`.

### 4 issues + abandon

| Issue | État objet | Négo |
|---|---|---|
| **Accord** | acheté | terminée |
| **Refus poli** | achetable au prix vendeur courant | verrouillée |
| **Fâché** | perdu pour la session | fermée |
| **Laisser tomber** (bouton acheteur) | reste dispo | rouvrable, **état conservé** |

## 2. UI

### Sheet de négociation

- Base : composant `BottomSheet` existant.
- Titre : `Négociation` (plus tard, suffixé par l'archétype quand la compétence Lecteur d'humeur est débloquée).
- Sous-titre : phrase narrative qui change avec l'état (proposition initiale, contre-offre, refus poli, fâcherie).

### Barre

- Pleine largeur du contenu de la sheet, hauteur ~60 px.
- Trace : 4 px, `rgba(0,0,0,0.12)`, centrée verticalement.
- **Curseur acheteur (bleu marine #2b5a8c)** : disque 36 px, prix dedans en `font-display` 11 px gras blanc, ombre douce. Label `Vous` 10 px uppercase sous le curseur.
- **Curseur vendeur (`brass-700`)** : disque 36 px, prix dedans, label `Lui`.
- **Pas de bornes 0 € / 120 € affichées**.
- Position relative : `gauche = prix / prixVendeurInitial`. Le curseur vendeur **part à droite** (100 %) à `prixVendeurInitial`. Le curseur acheteur **part à 25 %** d'une suggestion (ex: `prixMinAccept` estimé par défaut, sans fuite d'info — simplement un placement neutre).
- **Drag du curseur acheteur** : pointer + touch, **snap au pas de 1 €**. Bornes : `[1, prixVendeurCourant − 1]`.
- **Curseur vendeur non draggable** (informatif).

### Jauge d'humeur

- Sous la barre, séparée par un fin trait pointillé.
- Dégradé horizontal vert → orange → rouge.
- Pointeur noir 2×12 px.
- Emoji à droite qui change selon la zone : `😊` (0–25 %), `🙂` (25–50 %), `😐` (50–75 %), `😠` (75–100 %).
- **Visible par défaut** dans cette version. Plus tard mis derrière la compétence « Œil exercé » (hors scope de ce spec).

### Boutons

- `[ Laisser tomber ]` (secondaire) à gauche.
- `[ Proposer {prix} € ]` (primaire) à droite. Devient `[ Accepter {prix} € ]` quand le curseur acheteur atteint le prix vendeur courant (cas où le joueur accepte la dernière contre-offre).
- En cas de refus poli, les deux boutons sont masqués au profit d'un seul `[ Acheter au prix affiché — {prix} € ]`.

### Son et animation

- **Tic de drag** : à chaque pas de 1 €, son tic court (sinus ~1200 Hz, ~20 ms), throttle 30 ms pour éviter la saturation lors d'un drag rapide. Implémenté via nouvelle méthode `audioManager.playTick()` distincte de `playClick()`.
- **Contre-offre vendeur** : slide animé du curseur vendeur (300 ms ease-out) vers son nouveau prix.
- **Changement de zone humeur** : petit pop d'opacité (0.6 → 1) sur la jauge.
- **Accord** : `audioManager.playCash()` existant + snap visuel des deux curseurs au même prix.
- **Colère** : curseur vendeur fade-out + petit shake horizontal du cadre 200 ms, message rouge.
- **Refus poli** : curseur vendeur fade, message neutre.

### Persistance et reprise

- Si le joueur ferme la sheet via `Laisser tomber` ou hors-sheet, l'**état complet de la négo** (tour, humeur, curseurs, prix vendeur courant) est **conservé**.
- À la réouverture, on reprend exactement où on en était.
- Si la session de chinage se termine (sortie de la brocante), tous les états de négo de cette session sont jetés avec la session.

## 3. Intégration code

### Types (`src/types/game.ts`)

```ts
export type VendeurArchetypeId =
  | "naif" | "grincheux" | "bonhomme" | "malin" | "mamie" | "antiquaire";

export interface VendeurPersona {
  archetype: VendeurArchetypeId;
  margePct: number;
  elanPct: number;
  patience: number;
  tolerancePct: number;
  sangFroid: number;
}

export interface NegociationState {
  tour: number;
  humeur: number;
  prixVendeurCourant: number;
  derniereOffreAcheteur: number | null;
  statut: "en_cours" | "refus_poli" | "fache" | "conclu";
  /** Dernier message narratif à afficher en sous-titre. */
  message: string;
}
```

`ObjetEnVente` reçoit :
```ts
persona: VendeurPersona;
negociation: NegociationState | null;
```

### Nouveau fichier `src/lib/personas.ts`

- `PERSONAS_BASE: Record<VendeurArchetypeId, Omit<VendeurPersona, "archetype">>` — table des 6 archétypes.
- `tirerPersona(brocante: Brocante): VendeurPersona` — pondère par tier + ambiance, applique jitter ±10 %, renvoie le persona prêt.
- `calculerPrixMinAccept(persona, prixVendeur): number` — `round(prixVendeur × (1 − margePct))`.

### Refactor `src/lib/chine.ts`

- Supprimer `reagirNegociation()`, `DURCISSEMENT_PAR_TENTATIVE`, `COLERE_MONTEE_PAR_TENTATIVE`, `MESSAGES_REFUS_POLI`.
- Adapter `instancier()` pour appeler `tirerPersona()` et recalculer `prixMinAccept` depuis le persona.
- Ajouter :
  ```ts
  export function ouvrirNegociation(objet: ObjetEnVente): NegociationState
  export function proposerOffre(
    nego: NegociationState,
    persona: VendeurPersona,
    offre: number,
  ): NegociationState
  ```
  `proposerOffre` est une **fonction pure** : prend l'état + persona + offre, renvoie le nouvel état (statut, message, prix vendeur, tour incrémenté, humeur mise à jour).

### Refonte `src/components/mobile/NegociationSheet.tsx`

- Nouvelle signature :
  ```ts
  interface Props {
    open: boolean;
    onClose: () => void;
    objet: ObjetEnVente;
    onUpdateNego: (nego: NegociationState) => void;
    onAchat: (prixFinal: number) => void;
  }
  ```
- Composants internes :
  - `<NegoBar>` : barre + curseurs, gère drag, snap, tic sonore (hook `useTickSound`).
  - `<HumeurGauge>` : jauge dégradée + emoji.
- Quand `objet.negociation === null` au moment de l'ouverture, appelle `ouvrirNegociation(objet)` pour initialiser, sinon reprend l'état persistant.
- À chaque clic sur `Proposer`, appelle `proposerOffre(...)`, transmet via `onUpdateNego`, met à jour l'animation locale en conséquence.

### Audio (`src/lib/audio/audioManager.ts`)

- Nouvelle méthode `playTick()` : sinus 1200 Hz, ~20 ms, gain 0.25. Soumise à `prefs.clic`.
- Réutiliser `playCash()` pour l'accord (déjà existant côté vente).

### Page `src/app/chiner/[brocanteId]/ClientPage.tsx`

- Adapter la fiche d'item :
  - Si `objet.negociation?.statut === "refus_poli"` : remplacer le bouton « Négocier » par « Acheter — {prix} € » au prix vendeur courant. Désactiver toute relance de négo sur cet objet.
  - Si `objet.negociation?.statut === "fache"` : marquer l'objet comme indisponible pour le reste de la session.
  - Sinon : bouton « Négocier » classique qui ouvre la sheet (en passant `objet.negociation` si présent).
- Le callback `onUpdateNego` persiste l'état dans le store de session (cohérent avec la gestion actuelle des items via `setItem`).
- Le callback `onAchat` réutilise la mécanique d'achat existante avec le `prixFinal` reçu.

### Champs préparés pour la compétence (non câblés dans ce spec)

La sheet acceptera dès cette version trois props internes, branchées sur `false` par défaut :
- `revelerHumeur` — affiche/masque la jauge.
- `revelerArchetype` — affiche/masque le nom de l'archétype dans le titre.
- `revelerPrixMin` — affiche un repère filigrane sur la barre au niveau de `prixMinAccept`.

La compétence viendra brancher ces flags plus tard sans toucher au cœur de la sheet.

## 4. Hors-scope (cette itération)

- La **branche de compétence** « Lecture du vendeur » et le câblage des flags `reveler*`. Géré dans un spec séparé.
- Ajustement des **balancing** des 6 archétypes après play-test — figer les valeurs initiales du tableau ci-dessus, ajuster en suivi.
- Mémoire **persistante entre sessions** de chinage : tous les états de négo sont jetés à la sortie de la brocante (cohérent avec l'instanciation actuelle des items).
- Animations 3D ou physiques avancées (rebond, fluide). On reste sur des transitions CSS simples.

## 5. Critères de succès

- Le joueur peut faire glisser un curseur entre 1 € et le prix vendeur courant avec un retour sonore à chaque pas de 1 €.
- Une proposition déclenche une réaction visible : soit accord, soit contre-offre animée, soit refus poli, soit colère.
- L'état de la négo (tour, humeur, curseurs) survit à la fermeture/réouverture de la sheet dans la même session.
- Un refus poli n'empêche pas l'achat au prix vendeur courant.
- Une colère retire l'objet pour la session.
- Les 6 archétypes produisent des dynamiques de négo perceptiblement différentes (un Bonhomme conclut souvent, un Grincheux claque vite, un Naïf accepte des offres très basses).
