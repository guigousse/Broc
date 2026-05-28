# Stockage — refonte UX (swipe actions, overlay détail, atelier multi-slots)

**Date :** 2026-05-28
**Branche cible :** `feat/stockage-ux`
**Périmètre :** Page Stockage, composant inventaire, overlay détail objet, nouvelles règles atelier (capacité + durées).

## Objectif

1. Nettoyer le Stockage : suppression du bandeau "Vitrine ouverte" et du bouton inline "→ ÉTAL".
2. Chaque ligne d'objet devient swipable (glisser vers la gauche) pour révéler deux actions carrées : **Atelier** (réparer) et **Collection** (donner).
3. Un tap sur la ligne ouvre un **overlay de détail** (aperçu agrandi, prix achat / marché / vente éditable, bouton "→ Étal" avec icône `Store` de lucide).
4. Le prix de vente fixé dans l'overlay est persisté sur l'objet (`prixVenteSouhaite`), et utilisé par défaut à la mise à l'étal.
5. Introduction d'une **capacité finie d'atelier** (1 / 2 / 3 slots) avec amélioration payante depuis la page Atelier.
6. **Nouvelles durées de restauration** basées sur la transition d'état (7 / 14 / 28 j), la compétence "Maître Réparer" divisant par 2 (arrondi sup).

## 1. Page Stockage — épurer

**Fichier :** `src/app/stockage/page.tsx`

- **Supprimer** intégralement le bloc `state.vitrine && (...)` (lignes 149-166 actuelles) qui affiche "Vitrine ouverte · tap → Étal pour exposer".
- Ne plus passer `onAjouterVitrine` à `InventoryGrid` (le bouton inline disparaît).
- Ajouter un état local pour l'overlay : `const [objetOuvert, setObjetOuvert] = useState<Objet | null>(null)`.
- Passer un callback `onTapObjet={setObjetOuvert}` à la nouvelle grille.
- Rendre l'overlay `<ObjetDetailOverlay objet={objetOuvert} onClose={() => setObjetOuvert(null)} />` après `<InventoryGrid />`.

## 2. Composant `StockageItemRow` (swipe-actions)

**Fichier nouveau :** `src/components/mobile/StockageItemRow.tsx`

Une ligne d'objet à part qui gère elle-même son état swipe. Remplace le rendu interne de `InventoryGrid` pour les items du stockage. `InventoryGrid` est refactorisé pour utiliser ce composant.

### Props

```ts
interface StockageItemRowProps {
  objet: Objet;
  valeurConnue: boolean;
  atelier: {
    disponible: boolean;        // false si plein, déjà en resto, déjà Pristin, ou compétence manquante
    raison?: string;            // tooltip / label désactivé
  };
  collection: {
    disponible: boolean;        // false si même templateId+etat déjà dans collection
    necessiteConfirmation: boolean; // true si même templateId mais etat différent
  };
  onTap: (objet: Objet) => void;
  onEnvoyerAtelier: (objet: Objet) => void;
  onEnvoyerCollection: (objet: Objet) => void;
  isLast: boolean;
}
```

### Comportement swipe

- `useRef` sur le conteneur racine avec position relative, débordement masqué horizontalement.
- Tracker `touchStart.x` au `onPointerDown`.
- `onPointerMove` : calculer `deltaX = pointer.x - start.x`, ne traiter que les mouvements horizontaux (si `|deltaX| > |deltaY|` au début). Limiter à `[−ACTIONS_WIDTH, 0]`. Appliquer `transform: translateX(deltaX)` sur la couche contenu.
- `onPointerUp` :
  - Si `deltaX < −SNAP_THRESHOLD` (par ex. −60 px) → snap ouvert (`translateX(−ACTIONS_WIDTH)`).
  - Sinon → snap fermé (`translateX(0)`).
  - Si `|deltaX| < TAP_THRESHOLD` (par ex. 8 px) → considéré comme un tap : appeler `onTap(objet)` et fermer.
- État géré localement avec `useState<{ dragX: number; snapped: "open" | "closed" }>`.
- Largeur des actions : `ACTIONS_WIDTH = 112` (2 × 56px).
- Transitions CSS : `transition: transform 180ms ease` quand pas en drag.

### Couches

- **Background actions** (à droite, fixes) : deux boutons carrés 56×56 :
  - Atelier (icône lucide `Wrench`) — fond `--brass-600`, blanc, ou désactivé `--paper-500`.
  - Collection (icône lucide `BookOpen` ou `Album`) — fond `--forest-700`, blanc, ou désactivé `--paper-500`.
- **Foreground** : le contenu de la ligne (thumbnail + nom + état/rareté/cat + prix réf). Identique à l'actuel sans le bouton "→ ÉTAL".

### Click bouton désactivé

Le clic sur un bouton désactivé ne déclenche pas le callback, mais on peut afficher un toast/flash bref via `setFlash(raison)`. Pour MVP : aucun feedback (juste pointer-events: none + opacity 0.4). Le détail / raison sera visible dans l'overlay si besoin.

## 3. `InventoryGrid` refactorisé

**Fichier :** `src/components/InventoryGrid.tsx`

- Retirer la prop `onAjouterVitrine`.
- Nouveau type de prop :

```ts
interface InventoryGridProps {
  objets: Objet[];
  categoriesConnues: ReadonlySet<CategorieObjet>;
  onTapObjet: (objet: Objet) => void;
  onEnvoyerAtelier: (objet: Objet) => void;
  onEnvoyerCollection: (objet: Objet) => void;
  /** Pour chaque objet, dispo + raison atelier */
  atelierStatus: (objet: Objet) => { disponible: boolean; raison?: string };
  /** Pour chaque objet, dispo + nécessité de confirmation collection */
  collectionStatus: (objet: Objet) => { disponible: boolean; necessiteConfirmation: boolean };
}
```

- À l'intérieur, rendre les objets via `<StockageItemRow ... />`.

## 4. Overlay détail objet

**Fichier nouveau :** `src/components/mobile/ObjetDetailOverlay.tsx`

### Props

```ts
interface ObjetDetailOverlayProps {
  objet: Objet | null;
  open: boolean;
  onClose: () => void;
  /** Pour afficher le prix marché (réel + tendances). */
  prixMarche: number;
  /** Mettre à jour le prix de vente souhaité sur l'objet. */
  onSetPrixVente: (objetId: string, prix: number) => void;
  /** Ajouter à la vitrine (au prix de vente souhaité ou défaut). null si pas de vitrine ouverte. */
  onAjouterEtal: ((objet: Objet, prix: number) => void) | null;
  /** Label de la vitrine ouverte (nom de brocante) pour l'info. */
  brocanteOuverteNom: string | null;
}
```

### Structure

- Modale plein écran (BottomSheet existant, ou fixed inset 0). On utilise un overlay centré façon `<dialog>` : fond `rgba(15,31,24,0.78)`, contenu centré.
- Header : nom de l'objet (font-display, 14 px), bouton ✕.
- Aperçu agrandi : `CategorieIcon` 120×120 dans un carré `--paper-100` bordé `--brass-500` (identique au thumbnail mais agrandi).
- Méta : `Etat · Rareté · Catégorie` en mono 11 px.
- Section infos prix (grille 2 colonnes) :
  - **Prix d'achat** : `objet.prixAchat ?? "—"` €. (Pas connu sur objets starter.)
  - **Prix du marché** : `prixMarche` € (passé en prop, calculé par la page = `prixReferenceReel` × tendance catégorie + autres effets si applicables — pour MVP : `prixReferenceReel`).
- Section prix de vente :
  - Input number avec label "Prix de vente". Valeur initiale = `objet.prixVenteSouhaite ?? Math.max(1, Math.round(prixMarche * 1.4))`.
  - À chaque `onChange` (debounce 300 ms ou onBlur), appeler `onSetPrixVente(objet.id, val)`.
- Bouton "→ Étal" (icône `Store` de lucide à gauche, label "Mettre à l'étal · brocante X") :
  - Activé seulement si `onAjouterEtal !== null` (vitrine ouverte) ET l'objet n'est pas en restauration.
  - Au clic : `onAjouterEtal(objet, prixActuel)` puis `onClose()`.
- Si l'objet est en restauration : afficher une bande info "En restauration jusqu'au jour N".

## 5. Modifications `Objet` type

**Fichier :** `src/types/game.ts`

Ajouter un champ optionnel sur `Objet` :

```ts
export interface Objet {
  // ... existant
  /** Prix de vente fixé par le joueur. Si défini, utilisé par défaut à la mise à l'étal. */
  prixVenteSouhaite?: number;
}
```

Aucun autre champ n'est touché.

## 6. Atelier — capacité finie

**Fichier nouveau :** `src/data/atelier.ts`

```ts
export const ATELIER_SLOTS: Record<1 | 2 | 3, number> = {
  1: 1,
  2: 2,
  3: 3,
};

export interface AtelierUpgrade {
  niveauActuel: 1 | 2;
  niveauCible: 2 | 3;
  cout: number;
}

export const ATELIER_UPGRADES: AtelierUpgrade[] = [
  { niveauActuel: 1, niveauCible: 2, cout: 500 },
  { niveauActuel: 2, niveauCible: 3, cout: 2000 },
];

export function getProchaineUpgrade(niveau: 1 | 2 | 3): AtelierUpgrade | null {
  if (niveau === 1) return ATELIER_UPGRADES[0];
  if (niveau === 2) return ATELIER_UPGRADES[1];
  return null;
}
```

**Fichier :** `src/types/game.ts`

Ajouter sur `GameState` :

```ts
/** Niveau de l'atelier (nombre de slots = niveau). Par défaut 1. */
niveauAtelier: 1 | 2 | 3;
```

**Migration :** dans `GameContext.tsx` au chargement des saves anciennes : si `niveauAtelier === undefined`, le forcer à `1`. Sur `nouvellePartie()`, init à `1`.

## 7. Nouvelle action `ameliorerAtelier`

**Fichier :** `src/context/GameContext.tsx`

Ajouter à l'interface et à la valeur exposée :

```ts
ameliorerAtelier: () => { ok: boolean; raison?: string };
```

Implémentation :

```ts
const ameliorerAtelier = useCallback((): { ok: boolean; raison?: string } => {
  const current = stateRef.current;
  if (!current) return { ok: false, raison: "Pas de partie." };
  const upgrade = getProchaineUpgrade(current.niveauAtelier);
  if (!upgrade) return { ok: false, raison: "Atelier déjà au maximum." };
  if (current.budget < upgrade.cout)
    return { ok: false, raison: `Il manque ${upgrade.cout - current.budget} €.` };
  setState((prev) =>
    prev
      ? {
          ...prev,
          budget: prev.budget - upgrade.cout,
          niveauAtelier: upgrade.niveauCible,
        }
      : prev,
  );
  return { ok: true };
}, []);
```

## 8. `restaurerObjet` — check capacité

**Fichier :** `src/context/GameContext.tsx`

Dans la fonction `restaurerObjet` existante (vers ligne 715), ajouter une vérification avant les autres :

```ts
const nbEnCours = current.inventaireJoueur.filter((o) => o.enRestauration).length;
const capacite = ATELIER_SLOTS[current.niveauAtelier];
if (nbEnCours >= capacite)
  return {
    ok: false,
    raison: `Atelier plein (${nbEnCours}/${capacite} slot${capacite > 1 ? "s" : ""}).`,
  };
```

## 9. Durées de restauration

**Fichier :** `src/lib/competences.ts`

Remplacer la signature actuelle :

```ts
export function dureeRestauration(state: GameState, cat: CategorieObjet): number
```

par :

```ts
export function dureeRestauration(
  state: GameState,
  cat: CategorieObjet,
  etatCible: EtatObjet,
): number {
  const baseParCible: Partial<Record<EtatObjet, number>> = {
    Bon: 7,
    "Très bon": 14,
    "Pristin état": 28,
  };
  const base = baseParCible[etatCible] ?? 7;
  if (aMaitreReparer(state, cat)) return Math.ceil(base / 2);
  return base;
}
```

Mettre à jour les callsites (Atelier page) pour passer l'`etatCible`. La logique d'enchaînement Mauvais→Bon→Très bon→Pristin reste inchangée.

## 10. Modification `mettreEnVitrine`

**Fichier :** `src/context/GameContext.tsx`

La fonction actuelle prend `(objetId, prixVente)`. Pas de changement de signature, mais le callsite (Stockage) calculera la valeur via `objet.prixVenteSouhaite ?? Math.round(objet.prixReferenceReel * 1.4)`.

Ajouter une nouvelle action :

```ts
definirPrixVenteSouhaite: (objetId: string, prix: number) => void;
```

Implémentation simple : mise à jour de l'objet dans `inventaireJoueur`. Si `prix <= 0`, retirer le champ (`prixVenteSouhaite = undefined`).

## 11. Page Atelier — UI capacité + upgrade

**Fichier :** `src/app/atelier/page.tsx`

- Afficher la capacité sous le compteur "X en chantier" : `· {capacite} slot{s}`.
- Ajouter un bloc "Améliorer l'atelier" :
  - Si `niveauAtelier === 3` : libellé "Atelier au maximum (3 slots)".
  - Sinon : un bouton "Améliorer (LVL N → LVL N+1) · {cout} €" avec couleur laiton. `disabled` si budget < cout.
  - Au clic : `ameliorerAtelier()`. Flash success/fail.
- Adapter les appels `dureeRestauration(state, cat)` en `dureeRestauration(state, cat, etatCible)`.
- Bloquer le lancement d'une restauration si capacité atteinte (le check côté state empêche déjà, mais l'UI doit aussi griser le bouton "Restaurer" → "Bon"/"Très bon"/"Pristin").

## 12. Statuts atelier / collection (page Stockage)

**Fichier :** `src/app/stockage/page.tsx`

Calculer dans la page (mémoïsé) deux fonctions :

```ts
function atelierStatus(o: Objet): { disponible: boolean; raison?: string } {
  if (o.enRestauration) return { disponible: false, raison: "Déjà en cours." };
  if (o.etat === "Pristin état") return { disponible: false, raison: "Déjà en parfait état." };
  const nbEnCours = state.inventaireJoueur.filter((x) => x.enRestauration).length;
  if (nbEnCours >= ATELIER_SLOTS[state.niveauAtelier])
    return { disponible: false, raison: "Atelier plein." };
  // Chemin de restauration possible ?
  const cible = prochaineEtatCible(o.etat); // helper local : Mauvais→Bon, Bon→Très bon, Très bon→Pristin
  if (!cible) return { disponible: false, raison: "Non restaurable." };
  const skill = peutRestaurerTransition(state, o.categorie, o.etat); // helper sur les 3 paliers de réparer
  if (!skill) return { disponible: false, raison: "Compétence Réparer manquante." };
  return { disponible: true };
}

function collectionStatus(o: Objet): { disponible: boolean; necessiteConfirmation: boolean } {
  if (o.enRestauration) return { disponible: false, necessiteConfirmation: false };
  // Trouver le slot correspondant au templateId
  const slot = trouverSlot(state.collection, o.templateId);
  if (!slot) return { disponible: true, necessiteConfirmation: false };
  if (slot.donation === null) return { disponible: true, necessiteConfirmation: false };
  // Slot déjà rempli
  if (slot.donation.etat === o.etat) {
    return { disponible: false, necessiteConfirmation: false }; // exactement le même → grisé
  }
  return { disponible: true, necessiteConfirmation: true }; // différent état → confirmation
}
```

`prochaineEtatCible`, `peutRestaurerTransition`, `trouverSlot` : helpers locaux ou dans `src/lib/atelier.ts` / `src/lib/collection.ts` selon emplacement.

### Confirmation remplacement — modale custom

Nouveau composant `src/components/mobile/ConfirmReplaceModal.tsx` :

```ts
interface ConfirmReplaceModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  nouvelObjet: { nom: string; etat: EtatObjet; valeur: number };
  ancienneDonation: { etat: EtatObjet; valeur: number };
}
```

Esthétique : modale centrée façon `<dialog>`, fond `rgba(15,31,24,0.78)`, contenu carte parchemin (`--paper-100` + frame laiton). Contenu :

- Titre : `— REMPLACER LA DONATION ? —` (font-display, brass-700).
- Corps (font-serif) :  
  *« {nom} est déjà dans votre collection en {ancien.etat} (valeur {ancien.valeur} €).  
  Le remplacer par votre nouvel exemplaire en {nouvel.etat} ({nouvel.valeur} €) ?  
  L'ancien reviendra dans votre inventaire. »*
- Deux boutons sur une rangée :
  - "Annuler" (style ghost, paper-200).
  - "Remplacer" (style primary forest-800, brass-300).

État local dans `src/app/stockage/page.tsx` : `const [askReplace, setAskReplace] = useState<Objet | null>(null)`. Sur clic Collection avec `necessiteConfirmation`, ouvrir la modale. Sur confirm, appel `donnerACollection(objet.id)` et fermer.

## 13. Stockage : statuts injectés dans `InventoryGrid`

La page passera `atelierStatus={atelierStatus}` et `collectionStatus={collectionStatus}` à `InventoryGrid`, qui propage à chaque `StockageItemRow`.

## 14. Prix marché dans l'overlay

Pour MVP, `prixMarche = objet.prixReferenceReel`. Une seconde itération pourra ajuster selon les tendances de la catégorie. Pas dans ce périmètre.

## Hors-scope

- Affichage du loyer atelier (pas de loyer, juste un cout d'upgrade).
- Animation visuelle des actions du swipe (juste le translate suffit).
- Drag-to-dismiss sur l'overlay (close par ✕ + clic backdrop).
- Recalcul du prix marché en fonction des tendances catégorie (MVP utilise `prixReferenceReel`).
- Sons de swipe / d'ouverture overlay.

## Fichiers touchés

**Création :**
- `src/components/mobile/StockageItemRow.tsx`
- `src/components/mobile/ObjetDetailOverlay.tsx`
- `src/components/mobile/ConfirmReplaceModal.tsx`
- `src/data/atelier.ts`
- `src/lib/atelier.ts` (helpers `prochaineEtatCible`, `peutRestaurerTransition`, `trouverSlotCollection`, `getCapaciteAtelier`)

**Modification :**
- `src/types/game.ts` — ajout `prixVenteSouhaite` sur Objet, `niveauAtelier` sur GameState.
- `src/context/GameContext.tsx` — `nouvellePartie` init niveauAtelier=1, migration save, `ameliorerAtelier`, `definirPrixVenteSouhaite`, check capacité dans `restaurerObjet`.
- `src/lib/competences.ts` — signature `dureeRestauration(state, cat, etatCible)`.
- `src/app/atelier/page.tsx` — capacité affichée, bouton upgrade, appels `dureeRestauration` mis à jour.
- `src/app/stockage/page.tsx` — suppression banner, plus de `onAjouterVitrine`, calculs statuts, overlay détail.
- `src/components/InventoryGrid.tsx` — refactor pour utiliser `StockageItemRow`.

## Critères d'acceptation

- [ ] Bandeau "Vitrine ouverte" supprimé du Stockage.
- [ ] Bouton "→ ÉTAL" inline supprimé des lignes.
- [ ] Swipe gauche sur une ligne révèle 2 boutons (Atelier + Collection). Ferme par swipe droit ou en cliquant ailleurs.
- [ ] Atelier grisé si plein OU déjà en cours OU déjà Pristin OU compétence manquante.
- [ ] Collection grisée si même templateId+etat déjà donné.
- [ ] Collection avec etat différent : confirm "Remplacer par le nouveau ?" — si oui, ancienne donation revient en inventaire.
- [ ] Tap sur une ligne (sans drag) ouvre l'overlay détail.
- [ ] Overlay affiche : aperçu agrandi, prix achat / marché / vente éditable.
- [ ] Modifier le prix de vente persiste sur l'objet.
- [ ] Bouton "→ Étal" (icône `Store` lucide) dans l'overlay : ajoute à la vitrine ouverte au prix fixé.
- [ ] Si vitrine non ouverte, bouton "→ Étal" indisponible/caché.
- [ ] Atelier : 1 slot par défaut. Lancer 1 restauration → toutes les lignes Stockage voient leur bouton Atelier grisé jusqu'à libération.
- [ ] Atelier : bouton "Améliorer" affiche LVL 2 (500 €) puis LVL 3 (2000 €), puis "Maximum".
- [ ] Durées : Mauvais→Bon = 7 j, Bon→Très bon = 14 j, Très bon→Pristin = 28 j. Avec Maître Réparer débloqué : 4 / 7 / 14 j.
- [ ] Save legacy sans `niveauAtelier` charge à 1.
- [ ] `npx tsc --noEmit` 0 erreur ; `npm run build` succès.
