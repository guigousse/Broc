# Vente — Préparation de l'étal façon "coffre de camion"

**Date :** 2026-06-08
**Branche cible :** `feat/vente-coffre-camion`

## Objectif

Remplacer l'écran de préparation de l'étal (`/vitrine/[brocanteId]`) — aujourd'hui une liste statique "Disponibles dans le stock → Ajouter" — par un mini-jeu de packing : le joueur glisse-dépose les objets de son stock dans le coffre carré d'une camionnette. La taille du visuel de chaque objet est proportionnelle à sa taille réelle (un piano remplit une grande zone, une casquette une petite). La hitbox est pixel-perfect (uniquement les pixels opaques comptent). Le joueur peut faire pivoter un objet à 90° (tap long). Une seconde étape, similaire à l'écran actuel, permet ensuite de fixer les prix.

Le système de **niveau de stand** (`STAND_LEVELS`) est supprimé : le coffre du camion remplace cette mécanique. Le coût du jour devient un **frais d'entrée fixe par étoile** de brocante. Le camion possède 4 niveaux d'upgrade (4L → break → utilitaire → fourgon), achetables directement depuis l'écran de chargement.

## 1. Modèle de données

### 1.1 Tailles des objets

**Fichier :** `src/data/objetTemplates.ts`

Ajouter un champ `taille: TailleObjet` à chaque entrée du catalogue.

```ts
export type TailleObjet = "XS" | "S" | "M" | "L" | "XL";

export const PLACES_PAR_TAILLE: Record<TailleObjet, number> = {
  XS: 1,
  S:  2,
  M:  4,
  L:  6,
  XL: 9,
};

// Le scale visuel dépend du coffre courant : on garde la cohérence
// "1 XL = la totalité du coffre N1" et on adapte par rapport à la capacité.
export function getScaleCoffre(
  taille: TailleObjet,
  capacitePlaces: number,
): number {
  return Math.sqrt(PLACES_PAR_TAILLE[taille] / capacitePlaces);
}
```

En N1 (9 places) : XS ≈ 0,33 / S ≈ 0,47 / M ≈ 0,67 / L ≈ 0,82 / XL = 1,00.
En N4 (36 places) : XS ≈ 0,17 / S ≈ 0,24 / M ≈ 0,33 / L ≈ 0,41 / XL = 0,50.
→ un piano (XL) prend tout le coffre N1 mais seulement un quart du coffre N4. Le `cotePixels` du coffre reste constant (largeur écran) ; c'est uniquement la **densité** qui change. Le joueur ressent l'upgrade par l'icône, le label, et le fait que ses objets rétrécissent visuellement et libèrent de la place.

Chaque template existant reçoit une taille (travail manuel — voir la phase 0 du plan d'implémentation). Heuristique :
- XS : pièce de monnaie, clé, stylo, vinyle 45T, montre.
- S  : livre, tasse, bouteille, casquette, bibelot.
- M  : tableau moyen, radio, machine à écrire, vinyle 33T.
- L  : lampe, chaise, instrument à vent, grosse sculpture.
- XL : piano, gros meuble, vélo, instrument volumineux.

### 1.2 Camion

**Fichier nouveau :** `src/data/camion.ts`

```ts
export type NiveauCamion = 1 | 2 | 3 | 4;

export interface CamionConfig {
  niveau: NiveauCamion;
  nom: string;            // "4L", "Break", "Utilitaire", "Fourgon"
  cotePixels: number;     // côté du coffre carré, en px à 1× (~ 280)
  capacitePlaces: number; // somme max de PLACES_PAR_TAILLE
  prixUpgradeVersCeNiveau: number | null; // null pour N1
}

export const CAMIONS: readonly CamionConfig[] = [
  { niveau: 1, nom: "4L",         cotePixels: 280, capacitePlaces: 9,  prixUpgradeVersCeNiveau: null },
  { niveau: 2, nom: "Break",      cotePixels: 280, capacitePlaces: 16, prixUpgradeVersCeNiveau: 150 },
  { niveau: 3, nom: "Utilitaire", cotePixels: 280, capacitePlaces: 25, prixUpgradeVersCeNiveau: 500 },
  { niveau: 4, nom: "Fourgon",    cotePixels: 280, capacitePlaces: 36, prixUpgradeVersCeNiveau: 1500 },
];

export function getCamion(n: NiveauCamion): CamionConfig {
  return CAMIONS[n - 1];
}

export function getProchainCamion(n: NiveauCamion): CamionConfig | null {
  return n < 4 ? CAMIONS[n] : null;
}
```

> **Note design :** le `cotePixels` reste identique pour les 4 niveaux à l'écran (toujours plein écran carré). Ce qui change, c'est la **densité de places** : un coffre N4 expose la même surface visuelle qu'un N1 mais admet plus d'objets simultanément, parce que chaque place visuelle vaut moins en "places". En pratique, on garde l'unité `1 place ≈ 1/capacitePlaces × surface du coffre` et on adapte les tailles visuelles des objets en conséquence (voir §3.4).

### 1.3 Frais d'entrée (chinage ET vente — barème unifié)

**Fichier :** `src/data/brocantes.ts` — on remplace les valeurs existantes de `COUT_ENTREE_PAR_TIER` par le nouveau barème, et on renomme la constante en `FRAIS_ENTREE` pour refléter le double usage (chinage + vente).

```ts
import type { Brocante, BrocanteTier } from "@/types/game";

/**
 * Droit d'entrée payé à chaque session (chinage OU vente), par tier.
 */
export const FRAIS_ENTREE: Record<BrocanteTier, number> = {
  1: 5,
  2: 10,
  3: 25,
  4: 50,
};

export function fraisEntree(brocante: Brocante): number {
  if (brocante.id === "vide-grenier-quartier") return 0; // exception préservée
  return FRAIS_ENTREE[brocante.tier];
}
```

> **Changement de balance** : l'ancien barème chinage (5/20/60/150) descend à (5/10/25/50). Conséquence : chiner devient moins punitif, surtout en tier 3/4. Si l'équilibre du chinage en souffre, ajuster ailleurs (e.g. prix d'achat, fenêtre de négociation).

L'ancien nom `coutEntree(brocante)` est renommé `fraisEntree(brocante)`. Mettre à jour les importeurs :
- `src/app/chiner/[brocanteId]/ClientPage.tsx` (`coutEntree` → `fraisEntree`)
- `src/components/BrocanteCard.tsx`
- `src/components/mobile/BrocanteCarousel.tsx`

La matrice `COUTS_STAND` et le système `STAND_LEVELS` (`src/data/standLevels.ts`) sont **supprimés** ainsi que toutes leurs références dans le code (voir §4).

### 1.4 GameState

**Fichier :** `src/types/game.ts`

```ts
export interface GameState {
  // ... existant
  niveauCamion: 1 | 2 | 3 | 4; // nouveau, défaut 1
  // pas de brouillon persisté : le coffre est vide à chaque ouverture
}
```

L'interface `VitrineActive` reçoit une donnée par objet pour persister sa position et son orientation **pendant la session de préparation** (entre l'étape 1 et l'étape 2) :

```ts
export interface ObjetEnVitrine {
  objet: Objet;
  prixVente: number;
  /** Position du centre dans le coffre, en pourcentage du côté (0..1). Optionnel pour rétro-compat. */
  posX?: number;
  posY?: number;
  /** Rotation, en multiples de 90°. Optionnel pour rétro-compat. */
  rotation?: 0 | 90 | 180 | 270;
}
```

Anciennes saves : valeurs par défaut `0.5 / 0.5 / 0` à la lecture. Une vitrine "ancienne" ne fait que transiter par l'étape 2 (pricing) — les positions ne sont jamais affichées sur un coffre.

### 1.5 Suppressions

- `STAND_LEVELS`, `STAND_UPGRADES?` → supprimés.
- `COUTS_STAND`, `coutStand()`, `niveauRequis()`, `configParNiveau()`, `CAPACITE_MAX_GLOBALE` → supprimés.
- `StandLevel`, `StandConfig` → supprimés des types.
- Champ `niveauStand` dans `SessionVente.niveauStand` → remplacé par `niveauCamion` (snapshot du niveau lors de la session).

## 2. Architecture composants

### 2.1 Page principale

`src/app/vitrine/[brocanteId]/ClientPage.tsx` devient un **wizard à deux étapes** :

```
ClientPage (state machine: 'packing' | 'pricing')
├─ étape 1 : <CoffreChargement>
└─ étape 2 : <CoffrePricing>
```

L'état `etape` est local au composant — pas dans `GameState`. Si le joueur quitte la page, le coffre est perdu (cf. décision "pas de brouillon").

### 2.2 Étape 1 — Chargement du coffre

`src/components/vente/CoffreChargement.tsx`

```
CoffreChargement
├─ <ChargementHeader>       // visuel camion + barre X/Y + bouton upgrade
├─ <CoffreCanvas>           // zone carrée + objets posés (drag, rotate)
├─ <CarrouselStock>         // scroll horizontal du stock non placé
└─ <ActionFab>              // "Valider le chargement"
```

> Les **frais d'entrée** ne sont pas affichés ici — ils apparaissent uniquement à l'étape 2 (Pricing), portés par le bouton "Ouvrir l'étal · {prix} €".

`ChargementHeader` :
- Icône SVG simplifiée du camion (4L / Break / etc.).
- Label `Chargement — ${camion.nom}`.
- Barre de progression : `placesUtilisees / capacitePlaces` (texte sous la barre).
- Bouton "↑ {prochainNom} · {prix} €", désactivé si budget insuffisant ou si déjà N4.

`CoffreCanvas` :
- Zone carrée pleine largeur (avec gap de 12 px à gauche/droite).
- Background "coffre ouvert" stylisé (texture bois, ombre interne).
- Chaque objet posé est un `<ItemDansCoffre>` absolu positionné par `posX` / `posY` (% du côté), avec scale image `SCALE_PAR_TAILLE[taille]`.
- Drag & drop natif (pointer events).
- Tap long (300 ms) sur un objet posé → rotation +90° avec animation.

### 2.3 Étape 2 — Pricing

`src/components/vente/CoffrePricing.tsx`

Réplique du look actuel :
- Header contextuel "Tarification".
- Liste des objets du coffre (tous ceux placés en étape 1), avec :
  - Miniature + nom + état + rareté (comme aujourd'hui).
  - Input prix (prérempli à `prixRéf × 1,4`).
- En bas, deux boutons :
  - "← Retour au coffre" → retour étape 1 avec disposition conservée.
  - "Ouvrir l'étal · {fraisEntree} €" → applique `ajusterBudget(-fraisEntree)` et `router.push('/vitrine/[id]/journee')`.

### 2.4 Composants partagés

`src/components/vente/ItemDansCoffre.tsx` — sprite draggable, gère pointer events, rotate, halo de validation.
`src/components/vente/ItemEnCarrousel.tsx` — vignette draggable depuis le carrousel vers le coffre.
`src/components/vente/CamionIcon.tsx` — SVG paramétré par niveau.

## 3. Mécaniques

### 3.1 Drag & drop

Implémentation native (pas de lib externe) avec `pointerdown` / `pointermove` / `pointerup` sur l'élément racine `CoffreCanvas`. L'objet sélectionné suit le pointeur à un offset constant (l'écart capturé entre le centre de l'objet et le point de tap initial). Sur `pointerup` :
1. Si le centre de l'objet est dans le coffre **et** l'objet rentre (cf. 3.3), il est commit à la position finale.
2. Sinon, l'objet rebascule en carrousel (avec animation de retour).

Pour un objet **déjà** dans le coffre dragué vers le carrousel : il est retiré et remis au stock.

### 3.2 Rotation

`pointerdown` lance un timer 300 ms. Si le pointeur ne bouge pas (< 5 px) avant la fin du timer, on déclenche la rotation : `rotation = (rotation + 90) % 360`. Vibration haptique légère (`navigator.vibrate?.(20)`) en feedback. Le bitmask est swappé (cf. 3.3) et le check de fit est relancé : si la nouvelle orientation overlap, l'objet revient à la rotation précédente avec contour rouge.

### 3.3 Hitbox pixel-perfect

À l'import d'une image d'objet (au premier rendu dans le coffre), on calcule un **alpha mask** :
1. Image chargée dans un `<canvas>` off-screen aux dimensions visuelles cibles.
2. On lit `getImageData()`, on génère un `Uint8Array` (1 octet par pixel, 0 = transparent, 1 = opaque).
3. Le masque est mis en cache dans une `Map<string, Uint8Array>` keyed par `${templateId}:${rotation}:${scale}` pour éviter le recalcul.

Pour les **4 rotations**, on précalcule à la demande (lazy) les 4 masques.

**Collision** entre deux objets posés A et B :
1. Calculer l'intersection de leurs bounding boxes (rapide).
2. Si vide → pas d'overlap.
3. Sinon, pour chaque pixel du rectangle d'intersection, lire le bit correspondant dans le masque de A **et** de B. Si les deux sont opaques sur le même pixel → overlap.

**Collision contre les bords du coffre** : on vérifie qu'aucun pixel opaque du masque n'est en dehors du carré.

**Tolérance** : si l'objet dépasse de < 3 px d'un côté, on snap automatiquement à l'intérieur.

**Performance** : O(W × H) pour chaque test d'intersection (W, H = côté de la bbox d'intersection). Avec ~30 objets et résolutions ~200×200, négligeable (testé < 5 ms par drag).

### 3.4 Capacité "places" vs. fit visuel

Deux contraintes coexistent :
- **Places** : `Σ PLACES_PAR_TAILLE[taille] ≤ capacitePlaces`. Si on tente de drop un objet qui ferait dépasser, refus avec message "Pas assez de place dans le coffre".
- **Visuel** : même si les places sont OK, l'objet doit physiquement tenir (pas d'overlap, pas de débord).

La barre `X/Y places` reflète uniquement la contrainte places. Le contour rouge live signale les conflits visuels.

> **Justification du double système** : sans la contrainte places, un joueur pourrait théoriquement empiler des XS à l'infini dans le moindre interstice. Sans la contrainte visuelle, le packing visuel perd tout intérêt. Les deux sont complémentaires et l'UX les distingue clairement (texte vs. couleur).

### 3.5 Upgrade du camion

Tap sur "↑ {nom} · {prix} €" → modale de confirmation simple :
> "Acheter une {nom} pour {prix} € ?"

Confirmé → `ajusterBudget(-prix)` et `setNiveauCamion(prochain)`. La taille visuelle des objets dans le coffre est recalculée immédiatement (ils peuvent rétrécir si le coffre N+1 a plus de capacité-places → chaque place vaut moins de pixels). Si la nouvelle disposition entraîne des overlaps imprévus, les objets concernés clignotent en rouge ; le joueur doit les replacer manuellement avant de valider le chargement.

> **Note :** ce cas est marginal en MVP (le joueur upgrade généralement avant de poser des objets). On accepte la friction.

### 3.6 Frais d'entrée

À la validation finale (bouton "Ouvrir l'étal"), on prélève `fraisEntree(brocante)` du budget. Si budget insuffisant, le bouton est désactivé avec un message "La caisse n'a pas de quoi payer l'entrée."

Côté chinage (`src/app/chiner/[brocanteId]/ClientPage.tsx`), la logique existante est conservée : `fraisEntree(brocante)` remplace `coutEntree(brocante)` à la ligne 85.

## 4. Migrations / suppressions

### 4.1 Fichiers supprimés
- `src/data/standLevels.ts` — tout son contenu.

### 4.2 Imports à mettre à jour
- `src/app/vitrine/[brocanteId]/ClientPage.tsx` : réécriture complète.
- Tout fichier qui importe de `@/data/standLevels` : grep et adapter.
- `SessionVente.niveauStand: StandLevel` → `niveauCamion: NiveauCamion`. Migration des saves : mapper l'ancien `niveauStand` (1/2/3) sur `niveauCamion` (1/2/3) — choix arbitraire, l'historique reste interprétable.

### 4.3 GameContext
Ajouter :
- `state.niveauCamion` (défaut 1, migration : `1`).
- Action `acheterCamion(niveau: NiveauCamion)` : vérifie budget, vérifie que `niveau === niveauActuel + 1`, applique.
- Modifier `mettreEnVitrine(objetId, prixVente, posX, posY, rotation)` pour persister la position et la rotation.
- Modifier `viderVitrine` : vide aussi posX/posY/rotation (rien de spécial à faire vu que c'est dans `objets`).

### 4.4 Tests
- `src/lib/__test-fixtures__` : s'assurer que les fixtures n'utilisent plus `niveauStand`.
- Nouveau test unitaire `src/lib/coffre.test.ts` : pack/unpack, collision pixel-perfect (cas évidents), capacité places.

## 5. Edge cases

| Cas | Comportement |
|---|---|
| Stock vide | Carrousel affiche "Aucun objet à charger. Allez chiner !" |
| Coffre vide + tentative "Valider" | Bouton désactivé ("Coffre vide") |
| Tentative drop pendant que budget < fraisEntree | Étape 1 OK ; bouton "Ouvrir l'étal" désactivé en étape 2 |
| Item en restauration | Filtré du carrousel (déjà géré dans `stockDisponible`) |
| Retour navigateur depuis étape 2 | Retour étape 1 (le coffre est conservé tant qu'on est sur la page) |
| Quitte la page (`router.push`) | Coffre perdu (pas de brouillon) |
| Tente d'upgrader avec budget insuffisant | Bouton désactivé avec tooltip "Budget insuffisant" |
| Upgrade réduit visuellement les objets et crée des overlaps | Objets en conflit clignotent en rouge, "Valider" désactivé tant que résolu |
| Image template sans masque alpha pré-calculable (chargement échoue) | Fallback : bbox rectangulaire (collision rectangle) avec warning console |

## 6. UX / interactions résumé

- Carrousel trié par catégorie puis nom (pas de filtre pour MVP).
- Drag : feedback visuel immédiat (objet suit le doigt, ombre dynamique).
- Drop valide : halo vert 200 ms + snap doux.
- Drop invalide : rebond carrousel + vibration 40 ms.
- Tap long sur item posé : rotation +90°.
- Tap simple sur item posé : pas d'action en MVP (le prix est dans l'étape 2).
- Drag d'un item posé vers le carrousel : retour stockage.

## 7. Hors scope MVP

- Filtres / recherche dans le carrousel.
- Auto-pack glouton.
- Recharger la dernière configuration.
- Rotation libre (non multiple de 90°).
- Multiple niveaux d'upgrade dans la même session (rare mais autorisé techniquement).
- Animation d'ouverture du coffre.
- Brouillon persistant à travers les sessions.
- Pixel-art / rendu 3D du camion : un SVG plat suffit en MVP.

## 8. Critères de succès

- Le joueur peut placer 5 objets de tailles variées dans un coffre N1 en < 30 s.
- L'overlap pixel-perfect détecte correctement les conflits sur 20 cas de test (rouge si overlap, vert sinon).
- La barre "X / Y places" est cohérente avec l'état du coffre à tout moment.
- L'upgrade du camion est visible immédiatement (icône change, capacité augmente).
- La transition étape 1 → étape 2 → étape "journée" est fluide, sans perte de données.
- Aucune référence à `STAND_LEVELS` ne subsiste dans la codebase.
