# Négociation interactive — barre à curseurs, personas, contre-offres (achat & vente)

**Date :** 2026-05-30
**Branche cible :** branche dédiée à décider lors du plan (probablement `feat/negociation-interactive`).
**Périmètre :** la sheet de négociation en **mode achat** (chinage) ET en **mode vente** (vitrine), la mécanique commune de réaction adverse, l'introduction de personas vendeur sur les items, et l'extension du modèle client existant aux 5 axes.

## Objectif

Les deux négociations actuelles sont asymétriques et toutes deux pauvres en feedback :

- **Achat (chinage)** : input numérique, le vendeur accepte / refuse / se fâche, pas de contre-offre.
- **Vente (vitrine)** : sheet de contre-offre existante, mais sans personnalité visible, sans patience explicite et sans visualisation continue.

On les remplace toutes deux par **une seule mécanique unifiée** : une barre à deux curseurs qui convergent tour par tour, une vraie contre-offre côté adverse, des personas qui colorent le tempérament, et une jauge d'humeur qui prévient avant la colère. Le mode achat et le mode vente partagent la même UI et la même fonction pure — seuls la direction du gain et le casting de personas changent.

## 1. Mécanique de négociation (commune aux deux modes)

### Modèle persona (5 axes universels)

Chaque négociation oppose le joueur à un persona adverse, défini par 5 paramètres communs aux deux modes :

| Paramètre | Type | Rôle |
|---|---|---|
| `margePct` | `0–1` | Marge totale lâchable : écart entre prix initial du persona et son prix secret (`prixMinAccept` en achat, `prixMax` en vente) |
| `elanPct` | `0–1` | À chaque tour, fraction du gap restant que le persona concède |
| `patience` | `2–6` | Nombre de tours max avant refus poli |
| `tolerancePct` | `0–1` | Seuil sous lequel une offre est insultante (déclenche colère) |
| `sangFroid` | `0–1` | Résistance à l'alea de colère en zone limite |

Le modèle est **symétrique** : seule la direction de la concession s'inverse (le vendeur descend, le client monte).

### Archétypes — mode achat (chinage)

6 archétypes vendeur dédiés au mode achat :

| ID | Nom | Marge | Élan | Patience | Tolérance | Sang-froid |
|---|---|---|---|---|---|---|
| `naif` | Le Naïf | 0.95 | 0.90 | 4 | 0.95 | 0.90 |
| `bonhomme` | Le Bonhomme | 0.40 | 0.55 | 5 | 0.70 | 0.85 |
| `mamie` | Mamie pressée | 0.45 | 0.85 | 2 | 0.55 | 0.50 |
| `malin` | Le Malin | 0.25 | 0.20 | 5 | 0.50 | 0.80 |
| `grincheux` | Le Grincheux | 0.10 | 0.25 | 3 | 0.30 | 0.25 |
| `antiquaire` | L'Antiquaire | 0.12 | 0.45 | 4 | 0.35 | 0.95 |

Ces valeurs sont les **médianes** — chaque tirage applique un jitter de ±10 % pour la variété, sans changer le profil.

### Archétypes — mode vente (vitrine)

Les **15 archétypes clients existants** (`src/data/clients.ts`) sont **conservés** et étendus avec les nouveaux axes manquants. Mapping :

| Champ existant | Devient | Comment |
|---|---|---|
| `durete` (0–1) | `elanPct = 1 − durete × 0.7` | Plus dur = lâche moins par tour |
| (n'existe pas) | `margePct = 0.20 + (1 − durete) × 0.25` | Marge négociable côté client |
| (n'existe pas) | `patience = 3 + round((1 − durete) × 3)` | Plus dur = moins patient (3–6) |
| (n'existe pas) | `tolerancePct = 0.20 + durete × 0.30` | Plus dur = supporte moins haut |
| `appetit` (proxy) | `sangFroid = 0.5 + appetit × 0.3` | Plus avide = plus tolérant |

Le `prixMax` (cible secrète) reste inchangé : c'est le `prixMinAccept` symétrique côté vente.

Le calcul d'`offreInitiale` du client est conservé tel quel (`src/lib/vitrine.ts`) — c'est le point de départ du curseur client. La nouvelle mécanique prend le relais à partir du tour 1 (la première contre-offre joueur).

Le client `Diplomate` (compétence joueur) garde son comportement spécial : au lieu de partir fâché à la fin de la patience, il révèle son `prixMax` et offre un dernier tour bonus.

### Tirage de persona

**Mode achat** : tirage **par item** à l'instanciation (`instancier()` dans `src/lib/chine.ts`). La distribution dépend du `tier` de la brocante et de son `ambiance` :

- **Tier 1** : majorité Bonhomme/Mamie/Grincheux + rare Naïf.
- **Tier 2** : majorité Malin/Bonhomme + occasionnel Antiquaire.
- **Tier 3** : majorité Antiquaire/Malin, Naïf disparaît.

Pondérations exactes à figer dans `src/lib/personas.ts`. L'ambiance peut biaiser légèrement (ex: `Sélect` / `Précieux` favorisent l'Antiquaire ; `Familial` favorise le Bonhomme).

**Mode vente** : tirage inchangé — le client est tiré à l'arrivée à l'étal (logique existante dans `vitrine.ts`), avec son archétype et son `prixMax`.

### Déroulement d'un tour (signe générique)

On note `prixAdverseCourant` la position du curseur adverse, `cible` son prix secret (`prixMinAccept` en achat, `prixMax` en vente), et `sens` la direction de gain pour le joueur (`-1` en achat car on veut payer moins, `+1` en vente car on veut vendre plus cher).

Une **offre « rejoint »** quand elle remplit la condition d'accord :
- Achat : `offre ≥ prixAdverseCourant` (le joueur monte au prix vendeur).
- Vente : `offre ≤ prixAdverseCourant` (le joueur descend au prix client).

Branchement :
1. Le joueur déplace son curseur dans sa zone autorisée, puis tape **« Proposer »**.
2. Si l'offre rejoint → **accord** au prix de l'offre.
3. Si l'offre est insultante (`|offre − cible| > tolerancePct × cible` du mauvais côté) → **colère**.
4. Sinon → tirage `Math.random() < (1 − sangFroid) × pressionTour` ? Si oui → colère prématurée. Sinon **contre-offre** :
   ```
   nouveauPrixAdverse = adversePushVers(cible, prixAdverseCourant, elanPct)
   // Achat: max(cible, prixAdverseCourant − (prixAdverseCourant − cible) × elanPct)
   // Vente: min(cible, prixAdverseCourant + (cible − prixAdverseCourant) × elanPct)
   ```
5. Si `tour > patience` sans accord → **refus poli** : l'objet reste achetable au prix adverse courant (en achat) / le client part en silence (en vente, équivalent à un « non, merci » sans achat possible — pas d'écho côté étal).
6. L'humeur monte à chaque tour (`+1/patience`) et chaque offre proche du seuil de tolérance.

### 4 issues + abandon

**Mode achat** :

| Issue | État objet | Négo |
|---|---|---|
| **Accord** | acheté | terminée |
| **Refus poli** | achetable au prix vendeur courant | verrouillée |
| **Fâché** | perdu pour la session | fermée |
| **Laisser tomber** (bouton joueur) | reste dispo | rouvrable, **état conservé** |

**Mode vente** :

| Issue | État client | Négo |
|---|---|---|
| **Accord** | vente conclue au prix | terminée |
| **Refus poli** | client repart sans acheter, sans drame | fermée |
| **Fâché** | client repart fâché, malus éventuel de réputation (hors-scope) | fermée |
| **Laisser tomber** (bouton joueur = « tenir mon prix ») | client repart en silence | fermée |

Note vente : pas d'état persistant entre sessions, le client part dès que la sheet se ferme. La persistance ne concerne **que** le mode achat (cf. section UI).

## 2. UI

### Sheet de négociation

- Base : composant `BottomSheet` existant.
- Titre : `Négociation` (plus tard, suffixé par l'archétype quand la compétence Lecteur d'humeur est débloquée).
- Sous-titre : phrase narrative qui change avec l'état (proposition initiale, contre-offre, refus poli, fâcherie).
- **Une seule sheet partagée** entre achat et vente : `<NegociationSheet mode="achat" | "vente" ...>`.

### Barre

- Pleine largeur du contenu de la sheet, hauteur ~60 px.
- Trace : 4 px, `rgba(0,0,0,0.12)`, centrée verticalement.
- **Curseur joueur (bleu marine #2b5a8c)** : disque 36 px, prix dedans en `font-display` 11 px gras blanc, ombre douce. Label `Vous` 10 px uppercase sous le curseur. **Draggable**.
- **Curseur adverse (`brass-700`)** : disque 36 px, prix dedans, label `Lui`. Non draggable.
- **Position joueur vs adverse** :
  - Achat : adverse à droite (prix haut), joueur à gauche, drag autorisé sur `[1, prixAdverseCourant − 1]`.
  - Vente : joueur à droite (prix demandé), adverse à gauche (offre client), drag joueur sur `[prixAdverseCourant + 1, prixDemandéInitial]`. Le joueur **descend** son prix vers le client.
- **Pas de bornes** (0 €, prix max) affichées numériquement aux extrémités.
- Position relative : `gauche = prix / echelleMax` où `echelleMax` = `prixVendeurInitial` en achat, `prixDemandéInitial` en vente. Le curseur initiateur part à 100 %, le curseur offrant part à 25 % par défaut (placement neutre).
- **Drag** : pointer + touch, **snap au pas de 1 €**.

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

**Mode achat uniquement.** Si le joueur ferme la sheet via `Laisser tomber` ou hors-sheet, l'**état complet de la négo** (tour, humeur, curseurs, prix vendeur courant) est **conservé** sur `ObjetEnVente.negociation`. À la réouverture, on reprend exactement où on en était. Si la session de chinage se termine, tous les états de négo sont jetés avec la session.

**Mode vente** : pas de persistance. Le client part dès que la sheet se ferme (laisser tomber, refus, colère, accord). Pas de retour possible.

## 3. Intégration code

### Types (`src/types/game.ts`)

```ts
export type VendeurArchetypeId =
  | "naif" | "grincheux" | "bonhomme" | "malin" | "mamie" | "antiquaire";

/** Persona générique commun aux deux modes. */
export interface NegoPersona {
  /** Identifiant de l'archétype source (vendeur ou client). */
  archetype: string;
  margePct: number;
  elanPct: number;
  patience: number;
  tolerancePct: number;
  sangFroid: number;
}

/** Sens de la négociation. */
export type NegoMode = "achat" | "vente";

export interface NegociationState {
  mode: NegoMode;
  tour: number;
  humeur: number;
  prixAdverseCourant: number;
  /** Cible secrète de l'adverse : prixMinAccept (achat) ou prixMax (vente). */
  cibleSecrete: number;
  derniereOffreJoueur: number | null;
  statut: "en_cours" | "refus_poli" | "fache" | "conclu";
  message: string;
}
```

`ObjetEnVente` reçoit (mode achat uniquement) :
```ts
persona: NegoPersona;
negociation: NegociationState | null;
```

`ClientPersonnage` reçoit les nouveaux axes (mode vente) :
```ts
margePct: number;
elanPct: number;
patience: number;
tolerancePct: number;
sangFroid: number;
```
calculés au moment du tirage du client à partir de `durete` et `appetit` (voir mapping section 1).

### Nouveau fichier `src/lib/personas.ts` (côté achat)

- `PERSONAS_VENDEUR_BASE: Record<VendeurArchetypeId, Omit<NegoPersona, "archetype">>` — table des 6 archétypes vendeur.
- `tirerPersonaVendeur(brocante: Brocante): NegoPersona` — pondère par tier + ambiance, applique jitter ±10 %, renvoie le persona prêt.
- `calculerCibleSecrete(persona, prixInitial, mode): number` — `mode === "achat"` : `round(prixInitial × (1 − margePct))` ; `mode === "vente"` : utilise `prixMax` calculé par `vitrine.ts` (déjà existant) au lieu de recalculer.

### Nouveau fichier `src/lib/negociation.ts` (mécanique pure, commune)

- `ouvrirNegociation(mode: NegoMode, prixInitialAdverse: number, cibleSecrete: number, offrePremiereAdverse?: number): NegociationState` — crée l'état initial (tour 0, humeur 0, prix adverse courant, cible).
- ```ts
  proposerOffre(
    nego: NegociationState,
    persona: NegoPersona,
    offre: number,
  ): NegociationState
  ```
  **Fonction pure** : prend l'état + persona + offre, renvoie le nouvel état. Détermine le statut (accord, contre-offre, refus poli, fâché), met à jour `prixAdverseCourant`, incrémente `tour`, met à jour `humeur`, choisit un message narratif.

### Refactor `src/lib/chine.ts`

- Supprimer `reagirNegociation()`, `DURCISSEMENT_PAR_TENTATIVE`, `COLERE_MONTEE_PAR_TENTATIVE`, `MESSAGES_REFUS_POLI` (remplacés par la fonction pure dans `negociation.ts`).
- Adapter `instancier()` pour appeler `tirerPersonaVendeur()` et recalculer `prixMinAccept` depuis le persona.

### Refactor `src/lib/vitrine.ts`

- Étendre `instancierClient()` / la fonction qui matérialise le `ClientPersonnage` pour calculer les 5 axes (`margePct`, `elanPct`, `patience`, `tolerancePct`, `sangFroid`) à partir de `durete` et `appetit` (mapping figé dans la table de la section 1).
- Conserver `genererEvenementClient()` et son calcul d'`offreInitiale` (point de départ du curseur client).
- **Supprimer `reagirContreOffre()`** : remplacé par `proposerOffre()` de `negociation.ts`. Le cas `diplomate` est traité par un wrapper qui, sur statut `fache` avec `modifiers.diplomate && !revelationDejaFaite`, transforme en `refus_poli` + révèle le `prixMax` dans le sous-titre + autorise un dernier tour bonus.
- Conserver `JOURNEE_DUREE_SECONDES`, `CLIENT_INTERVALLE_MIN_SEC`, etc.

### Refonte `src/components/mobile/NegociationSheet.tsx`

- Nouvelle signature (ambidextre) :
  ```ts
  interface Props {
    open: boolean;
    onClose: () => void;
    mode: NegoMode;
    nego: NegociationState;
    persona: NegoPersona;
    prixInitialJoueur: number;   // achat: pas utilisé ; vente: prix demandé à l'étal
    onUpdateNego: (nego: NegociationState) => void;
    onConclu: (prixFinal: number) => void;
  }
  ```
- Composants internes (partagés entre les deux modes) :
  - `<NegoBar mode joueur adverse onDrag>` : barre + curseurs, gère drag, snap, tic sonore (hook `useTickSound`). Couleurs et positions adaptées au mode.
  - `<HumeurGauge humeur>` : jauge dégradée + emoji.
- À chaque clic sur `Proposer`, appelle `proposerOffre(nego, persona, offre)` (depuis `negociation.ts`), transmet via `onUpdateNego`, met à jour l'animation locale.

### Audio (`src/lib/audio/audioManager.ts`)

- Nouvelle méthode `playTick()` : sinus 1200 Hz, ~20 ms, gain 0.25. Soumise à `prefs.clic`.
- Réutiliser `playCash()` pour l'accord (déjà existant côté vente).

### Page `src/app/chiner/[brocanteId]/ClientPage.tsx` (mode achat)

- Adapter la fiche d'item :
  - Si `objet.negociation?.statut === "refus_poli"` : remplacer le bouton « Négocier » par « Acheter — {prix} € » au prix vendeur courant. Désactiver toute relance de négo sur cet objet.
  - Si `objet.negociation?.statut === "fache"` : marquer l'objet comme indisponible pour le reste de la session.
  - Sinon : bouton « Négocier » classique qui ouvre la sheet (en passant `objet.negociation` si présent, sinon initialise via `ouvrirNegociation("achat", ...)`).
- `onUpdateNego` persiste sur `ObjetEnVente.negociation` via `setItem`.
- `onConclu` réutilise la mécanique d'achat existante avec le `prixFinal` reçu.

### Page `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (mode vente)

- Remplacer l'ancienne sheet de contre-offre par la nouvelle `<NegociationSheet mode="vente" ...>`.
- À l'arrivée d'un client en mode `"negociation"`, instancier l'état initial via `ouvrirNegociation("vente", prixDemandeEtal, client.prixMax, offreInitiale)`.
- Le persona est dérivé du `ClientPersonnage` (déjà tiré par `vitrine.ts`).
- `onUpdateNego` ne persiste pas (le client part dès qu'on ferme la sheet) — l'état local de la sheet suffit pendant l'échange.
- `onConclu` réutilise la mécanique de vente existante (ajout au cash, retrait de l'étal, etc.).
- Compétence `Diplomate` : injectée via un flag `revelationAutorisee` dans les props de la sheet ; quand le statut bascule à `fache` et que le flag est `true`, on prolonge avec un dernier tour + révélation du `prixMax` (logique encapsulée dans le wrapper de `proposerOffre` côté vitrine).

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

**Mode achat** :
- Le joueur peut faire glisser un curseur entre 1 € et le prix vendeur courant avec un retour sonore à chaque pas de 1 €.
- Une proposition déclenche une réaction visible : soit accord, soit contre-offre animée, soit refus poli, soit colère.
- L'état de la négo survit à la fermeture/réouverture de la sheet dans la même session.
- Un refus poli n'empêche pas l'achat au prix vendeur courant.
- Une colère retire l'objet pour la session.
- Les 6 archétypes vendeur produisent des dynamiques perceptiblement différentes (un Bonhomme conclut souvent, un Grincheux claque vite, un Naïf accepte des offres très basses).

**Mode vente** :
- Le joueur peut faire glisser son curseur (prix demandé) entre l'offre client et son prix demandé initial, avec le même retour sonore.
- Le client contre-propose avec une montée animée de son curseur, dans le respect de la patience de son archétype.
- Les 15 archétypes clients existants conservent leur identité (Brocanteur concurrent reste dur, Retraité chineur reste pingre).
- La compétence Diplomate fonctionne toujours : sur fâcherie, le client révèle son `prixMax` et offre un dernier tour.
- Aucune persistance entre clients (chaque négo est sa propre instance).

**Commun** :
- La sheet, la barre et la jauge sont visuellement identiques en achat et en vente, seuls les libellés et la direction du gain changent.
- Aucune duplication de la mécanique : un seul `proposerOffre()` est utilisé par les deux flux.
