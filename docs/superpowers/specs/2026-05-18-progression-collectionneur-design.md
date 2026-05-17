# Progression « Carrière + Collectionneur » — Design Spec

**Date** : 2026-05-18
**Statut** : Approuvé pour implémentation
**Auteur** : Brainstorming guidé Broc

---

## 1. Vision

Donner au jeu une **boucle de progression à long terme motivante** en combinant deux moteurs :
1. Une **carrière** : progression à travers 16 brocantes classées par prestige (1–3 étoiles + 1 boss).
2. Un **collectionneur** : catalogue de type Pokédex à compléter par catégorie.

**Win condition** : le **Trophée du Chineur ultime** est remis quand **les 6 catalogues catégoriels sont complétés à 100 %**. C'est la vraie fin du jeu (avec possibilité de New Game+ ultérieurement).

---

## 2. Les 16 brocantes

### Structure

| Tier | Nombre | Composition | Spécificité |
|------|--------|-------------|-------------|
| ⭐    | 5      | 2 générales + 3 spécialisées | Communs majoritaires, 1–2 Rares |
| ⭐⭐   | 5      | 2 générales + 3 spécialisées | Rares plus fréquents, 1–2 Légendaires |
| ⭐⭐⭐  | 5      | 2 générales + 3 spécialisées | Légendaires + objets historiques |
| 🏆 Boss | 1     | « Salon des Antiquaires » | Pièces uniques (dernières du catalogue) |

### Spécialisations

Chaque brocante spécialisée a une **catégorie focus** parmi les 6 (Musique, Jeux & Loisirs, Livres & Papeterie, Mode, Maison, Bricolage). Sur les 9 brocantes spécialisées au total (3 par tier), les 6 catégories sont couvertes ; les plus populaires (Musique, Jeux & Loisirs, Maison) ont 2 brocantes spécialisées chacune (une à un tier différent).

### Conditions de déblocage

Chaque brocante a une `ConditionDeblocage` étendue :
- **Seuil de caisse minimum** (`{ type: "budget", montant: number }`).
- **Quota de vente catégoriel** (`{ type: "ventesCategorie", categorie: CategorieObjet, nombre: number }`).
- **Quota d'unlock préalable** (`{ type: "brocantesDebloquees", tier: 1|2|3, nombre: number }`) — ex. boss requiert toutes les 3⭐.
- Combinaisons via `{ type: "ET", conditions: ConditionDeblocage[] }`.

La 1ʳᵉ brocante 1⭐ est toujours `{ type: "depart" }`.

### Vendeurs : tolérance progressive

Le `prixMinAccept` (déjà existant) utilise un facteur de tolérance qui se durcit selon le tier :
- 1⭐ : `0.70 – 0.85` (vendeurs souples)
- 2⭐ : `0.78 – 0.90`
- 3⭐ : `0.85 – 0.93` (négo plus serrée)
- Boss : `0.88 – 0.95` (quasi non négociable)

Le seuil de colère et le durcissement par tentative restent identiques.

---

## 3. Système de rareté

### 3 niveaux

| Rareté      | Probabilité globale | Origine |
|-------------|---------------------|---------|
| Commun      | ~88 %               | Pool de templates partagé |
| Rare        | ~10 %               | Pool d'exclusifs de la brocante |
| Légendaire  | ~2 %                | Pool d'exclusifs de la brocante (historique réel) |

### Pool par brocante

Chaque brocante a deux pools :
- `poolCommun: ObjetTemplate[]` — peut être le pool global filtré par catégorie pour les brocantes spécialisées.
- `poolExclusif: ObjetTemplate[]` — 3–5 Rares + 1–2 Légendaires propres à la brocante.

À chaque session :
- N items tirés depuis `poolCommun`.
- Chaque item a une chance `chanceExclusif` (≈ 10–20 % selon tier) d'être remplacé par un tirage du `poolExclusif`.

### Objets uniques

Les pièces du boss (« derniers du catalogue ») sont marquées `unique: true`. Une fois acquises ou vendues, elles n'apparaissent plus jamais. Les autres objets peuvent apparaître en plusieurs copies.

### Légendaires : objets historiques

Inspirés du réel :
- Musique : *Stradivarius (1715), 78-tours signé Edith Piaf, Game Boy prototype Bullet-Proof Software*
- Jeux & Loisirs : *Cartouche Stadium Events, première édition Magic: The Gathering Alpha*
- Livres & Papeterie : *Edition originale « Les Misérables », manuscrit autographe Cocteau*
- Mode : *Robe Chanel 1925, mocassins Hermès Constance*
- Maison : *Vase Lalique « Bacchantes », œuf Fabergé Constellation*
- Bricolage : *Outils de marqueterie Boulle, scie japonaise Edo*

(Liste indicative — sera enrichie pendant l'implémentation.)

---

## 4. Catalogue (façon Pokédex)

### Structure de données

```ts
interface CatalogueEntree {
  templateId: string;       // identifiant stable de l'objet
  categorie: CategorieObjet;
  rarete: "commun" | "rare" | "legendaire";
  vu: boolean;              // croisé chez un vendeur OU client
  possede: number;          // nombre de fois possédé (0 = jamais)
  unique?: boolean;
}

interface CatalogueParCategorie {
  categorie: CategorieObjet;
  entrees: CatalogueEntree[];
  totalUnique: number;      // entrées dans la catégorie
  vues: number;
  possedees: number;        // entrées avec possede >= 1
}
```

Stocké dans `GameState.catalogue: Record<CategorieObjet, CatalogueParCategorie>`.

### Mise à jour

- **Vu** : déclenché par `setItem(prixAffiche: true)` ou apparition dans un panier client.
- **Possédé** : déclenché par `ajouterObjet()` — `possede += 1`.
- **Vendu** : reste possédé tant que `possede >= 1` (l'historique de possession ne se rétracte pas).

### Visuel (page `/catalogue`)

3 états par carte :
- **Silhouette** (filtre `brightness(0)` + opacité 0.5) — jamais croisé.
- **Grisé** (filtre `grayscale(1)` + opacité 0.7) — croisé mais pas possédé.
- **Couleur normale** — possédé une fois ou plus, avec compteur si > 1.

Layout : onglets par catégorie + grille de cartes. Progression affichée en haut : `Musique 8 / 15`.

### Accès

- Nouveau panneau au QG : *Catalogue : 23 / 87 entrées* avec bouton *Ouvrir le catalogue*.
- Nouvelle route `/catalogue`.

---

## 5. Chinage par brocante (mineur refactor)

- `/chiner` affiche les brocantes débloquées avec **étoiles** + badge de spécialisation (icône de la catégorie focus).
- Cliquer = aller chiner là-bas. Mécanique de session déjà existante, mais la session pool vient maintenant de la brocante (commun + exclusif).
- Tendances et clients restent globaux côté chinage (les vendeurs ont leur tolérance par tier).

---

## 6. Vente par brocante (refactor majeur)

### Avant

- 1 stand générique (paramétrable par niveau).
- 1 pool de clients global.

### Après

- Page `/vitrine` devient un **sélecteur de brocantes** (mêmes brocantes débloquées que `/chiner`).
- Clic = ouvrir la préparation pour cette brocante.
- État vitrine devient lié à une brocante : `state.vitrine: { brocanteId: string, objets: ObjetEnVitrine[] }` ou `state.vitrineParBrocante: Record<brocanteId, ObjetEnVitrine[]>`.
  - **Choix retenu** : `vitrine: { brocanteId, objets }` (une seule vitrine active à la fois). Si le joueur change de brocante, la précédente est vidée et les objets reviennent en stock.

### Pool de clients par tier

Les `ClientPersonnage` existants sont étiquetés `tierMin: 1 | 2 | 3 | 4`. Lors du tirage du pool en début de journée, on filtre :
- Brocante 1⭐ : `tierMin <= 1` (retraités, étudiants, familles, touristes…)
- Brocante 2⭐ : `tierMin <= 2` (ajoute amateur vintage, bibliophile, décorateur…)
- Brocante 3⭐ : `tierMin <= 3` (ajoute snob bourgeois, notable curieux, passionnée Art Déco…)
- Boss : tous (notables exclusifs en plus)

### Coût stand : `tier × taille`

| Taille \ Tier | 1⭐ | 2⭐ | 3⭐ | Boss |
|---------------|----|----|----|------|
| Petit (1-10)  | 20 € | 70 € | 220 € | 800 € |
| Standard (11-25) | 50 € | 180 € | 550 € | 2 000 € |
| Grand (26-50) | 120 € | 420 € | 1 300 € | 5 000 € |

Multiplicateurs : Standard ×2.5 du Petit, Grand ×6 du Petit. Tier ≈ ×3 à ×3.5 d'un tier à l'autre, ×3.6 vers boss.

### Avantage d'un grand stand

- **Intervalle entre clients ×0.55** (visibilité = +80 % de visites).
- **Appétit moyen ×1.10** (un grand stand attire un public légèrement plus aisé).
- (Standard : ×0.75 / ×1.05 ; Petit : ×1.0 / ×1.0 — base de référence.)

---

## 7. Progression visible (carrière)

Pas de système de "rang/titre" formel : les **arbres de compétences** existants tiennent ce rôle (niveau dans chaque arbre = expertise).

### Indicateurs au QG

- Compteur **Brocantes : X / 16**.
- Compteur **Catalogue : N / total**.
- Lien vers la nouvelle page `/catalogue`.
- Une fois le boss débloqué : badge spécial « Le Salon des Antiquaires vous attend ».

### Salle des trophées (accessible dès la 1ʳᵉ brocante 3⭐)

Nouvelle page `/trophees` accessible dès qu'une brocante 3⭐ est débloquée (avant ça, le bouton est grisé). Elle affiche :
- Brocantes débloquées avec date.
- Légendaires possédés (vitrine).
- Progression par catégorie.
- **Trophée du Chineur ultime** : badge grand format quand 100 % du catalogue est atteint, avec date de fin.

---

## 8. Plan d'implémentation (phases haut niveau)

Phase numérotée — chaque phase est implémentable de manière indépendante, l'app reste jouable entre les phases.

1. **Catalogue + rareté + page `/catalogue`** (fondation)
   - `templateId` stable sur chaque template d'objet.
   - Type `Rarete` ajouté aux templates.
   - Update `GameState` avec `catalogue`.
   - Hooks dans chiner/vente pour marquer vu/possédé.
   - Page `/catalogue` Pokédex.

2. **Refactor brocantes : tier + pool exclusif + spécialisation**
   - `Brocante` étendue : `tier`, `etoiles`, `specialisation?`, `poolExclusif`.
   - Conditions de déblocage étendues (quota catégoriel, brocantes débloquées).
   - 15 brocantes définies (5 par tier).
   - Adaptation visuelle de `/chiner` (étoiles, badges spé).

3. **Vente par brocante**
   - Refactor `state.vitrine` → `{ brocanteId, objets }`.
   - `/vitrine` devient sélecteur de brocante puis prépa.
   - Pool de clients filtré par `tierMin` de chaque persona.
   - Coût stand recalculé par tier × taille.

4. **Boss + Trophée final**
   - 16ᵉ brocante avec objets `unique: true`.
   - Page `/trophees`.
   - Trophée final déclenché à 100 % du catalogue.

5. **Balancing + UX polish**
   - Calibrage des seuils de déblocage.
   - Tooltips/notifications de progression.
   - Animations de catalogue (silhouette → grisé → couleur).

---

## 9. Risques & Caveats

- **Volume de contenu** : 6 catégories × ~10–15 templates par catégorie pour avoir un catalogue qui tient debout. Plus 15 brocantes × 3–7 exclusifs = ~60 exclusifs à scénariser/équilibrer.
- **Refactor vitrine** : casse les sauvegardes existantes (la vitrine globale devient liée à une brocante). Migration nécessaire (vider la vitrine au chargement si format ancien).
- **Balance** : les tiers 2⭐ et 3⭐ ne doivent pas devenir trivialement rentables une fois débloqués ; le coût stand + la négo plus dure doivent maintenir la tension.
- **Performance UX** : un catalogue de 60+ entrées doit rester scannable — pagination/onglets par catégorie obligatoires.

---

## 10. Hors scope (à brainstormer plus tard)

- **New Game+** : modifiers après trophée final (catalogue ×2, économie ×0.5, etc.).
- **Saisons / événements** : marchés temporaires, foires spéciales.
- **Réputation / concurrents** : système PVE-like.
- **Salle des trophées étoffée** : statistiques de carrière, records.
- **Multi-stand simultanés** : « empire » (option E du brainstorm).
