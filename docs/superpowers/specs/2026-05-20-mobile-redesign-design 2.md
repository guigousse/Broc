# Refonte mobile — Projet Broc

**Date :** 2026-05-20
**Statut :** Spec validée par brainstorming, en attente de revue utilisateur avant écriture du plan.
**Compagnon visuel utilisé :** oui — maquettes archivées dans `.superpowers/brainstorm/99745-1779300505/content/`.

---

## 1. Objectif

Refondre l'interface du jeu pour qu'elle soit **jouable et ergonomique sur smartphone** (≤ 480 px de large), tout en restant exploitable en build natif via Tauri mobile **et** en navigateur web (PWA-compatible).

C'est une **refonte mobile-first** : l'expérience desktop actuelle est *remplacée*, pas augmentée. Les layouts desktop existants (grilles 1200 px max-width, dock flottant 7 icônes) ne sont pas conservés tels quels.

## 2. Stratégie de support et cibles techniques

- **Stratégie :** mobile-first complète. Cible principale 360–414 px de largeur, portrait verrouillé. Aucune adaptation paysage prévue.
- **Cible de livraison :** PWA (Next.js actuel) + Tauri mobile, code partagé. Le design doit respecter les `safe-area-inset` iOS et le découpage portrait Android.
- **Orientation :** portrait uniquement (verrouillage à appliquer côté Tauri ; côté web : `viewport` strict + suggestion CSS `orientation: portrait`).
- **Densité visuelle :** compacte mais respirante. Gouttières 12–16 px, padding cartes 10–14 px.

## 3. Langage visuel

Conservation de la signature néo-art déco actuelle (palette parchemin / forêt / laiton, polices Cinzel + Cormorant + DM Mono, accents vermillon/velvet) **avec allègement sélectif** pour mobile :

- Les ornements lourds desktop (double inset bordure laiton + bordure externe + paper grain + brass corners) sont **simplifiés en contexte mobile** : bordure simple 1 px laiton + un seul inset de séparation à 2-3 px, paper grain réduit ou absent sur les petits éléments.
- Les coins en équerre (`BrassCorners`) **disparaissent** des éléments < 200 px ; ils restent envisageables sur les cartes plein écran (modales, bottom sheets de Gazette).
- Polices conservées, tailles ajustées : titres de section 11–13 px, corps 11–12 px, labels mono 9–10 px.
- Tokens CSS de `globals.css` conservés sans modification.

## 4. Architecture de navigation

### 4.1 Décisions structurelles

- **Suppression du dock flottant à 7 boutons** (`NavigationDock.tsx` actuel).
- **Suppression de la page Trophées** (`/trophees`) et de toute la mécanique de déblocage qui lui est liée :
  - Route `/trophees` supprimée.
  - Composant `BossUnlockModal` supprimé (et son usage dans `/qg`).
  - Champ `bossDebloqueSeen` du `GameState` supprimé (avec migration de save : on ignore le champ si présent).
  - Le trophée « Boss vaincu » est retiré de la liste des trophées affichés au QG (pas de tuile « Trophées » dans l'état des lieux).
- **Chiner retiré de la barre de navigation** : il reste exclusivement accessible via le CTA principal du QG. Cela rend le QG le point d'entrée obligatoire pour aller chiner, ce qui force le passage par la Gazette/timeline avant de partir.
- **Historique intégré au QG** : section « Dernières sessions » au bas du QG (3 dernières entrées) + lien vers `/historique` qui reste comme archive longue scrollable.

### 4.2 Bottom tab bar (5 onglets pleins, pas de « Plus »)

| Position | Onglet         | Route          | Pastille d'action                  |
|----------|----------------|----------------|------------------------------------|
| 1        | **QG**         | `/qg`          | —                                  |
| 2        | **Stockage**   | `/stockage`    | —                                  |
| 3        | **Atelier**    | `/atelier`     | Nb objets prêts à récupérer        |
| 4        | **Collection** | `/collection`  | —                                  |
| 5        | **Compétences**| `/competences` | Nb points à dépenser (tous arbres) |

- Pastilles rouges (vermillon) circulaires affichant un compteur, visibles à droite de l'icône, masquées quand le compteur vaut 0.
- Tab bar masquée sur les écrans pleins-écran d'action (`/chiner/[brocanteId]`, `/vitrine/[brocanteId]`, `/vitrine/[brocanteId]/journee`) — ces écrans ont leur propre `FAB` (« Rentrer », « Ouvrir l'étal »).

### 4.3 Header global

Conservé sur tous les écrans à navigation (QG, Stockage, Atelier, Collection, Compétences) :

- Hauteur ~52 px + safe-area-inset-top.
- Trois colonnes : `BROC` (brand laiton compact) · `Jour N°XXX` (centré) · `Caisse XXX €` (droite).
- Pas de crest géant ni de bouton « Menu » (la home est joignable via un long-press sur BROC, à confirmer en plan).

Sur les écrans d'action (Chiner session, Vitrine prep) le header devient **contextuel** :
- Trois colonnes : `‹ back` · `Titre + sous-titre` · `Caisse XXX €`.
- Le bouton de retour est un bouton « Quitter » (icône `‹` ou `✕` selon contexte).

## 5. Écrans

### 5.1 QG (`/qg`)

Layout : `Header` + `StickyTop` + `Scrollable` + `TabBar`.

**Zone sticky-top (~125 px, ne défile jamais) :**
- Eyebrow « — Quartier Général · Semaine N — »
- Timeline 7 jours (jour actuel mis en valeur en forêt-800 / laiton-300, weekends en parchemin clair)
- 2 CTA : « Chiner » primaire (66 % largeur, forêt-800/laiton) + « Exposer » secondaire (parchemin/forêt-800). « Exposer » devient « Reprendre l'étal » quand une vitrine est ouverte.

**Zone scrollable :**
- **Carte Gazette (teaser)** : titre + N° édition, 1 ligne tendance dominante, 1 ligne météo (si compétence acquise), 1 ligne carnet mondain (si compétence acquise), lien « Lire la Gazette › ». Tap → bottom sheet plein écran avec tendances complètes, météo, carnet mondain et boutons reroll Influence (cf. §6.1).
- **État des lieux** : 4 lignes (Stockage, Atelier, Compétences, Collection). Chaque ligne = icône + titre + métrique courte + pastille rouge si action requise + chevron. Tap → navigation vers la section. **Plus de tuile Trophées.**
- **Dernières sessions** : 3 dernières entrées de l'historique sous forme `[Jour XX] · [Type] · [Résumé] · [+/− €]`. Lien « Tout l'historique › » en bas qui ouvre `/historique`.

### 5.2 Chiner — Liste des brocantes (`/chiner`)

- Header contextuel (back QG · « Chiner / N brocantes ouvertes » · caisse).
- Sticky-top : pills de filtre par tier (★ / ★★ / ★★★ / Boss), une seule active à la fois.
- Scroll : liste verticale de cartes brocante (1 colonne pleine largeur).
- Carte brocante : nom + étoiles + description italique 2 lignes max + footer (coût d'entrée + nb items + bouton « Entrer »).
- Brocantes verrouillées : opacité 0.55, mention `⊘ <condition manquante>` en vermillon, bouton « Fermé » non cliquable.

### 5.3 Chiner — Session (`/chiner/[brocanteId]`)

- Header contextuel (✕ quitter · « Nom brocante / N/Total acquis · cumul payé » · caisse).
- Tab bar masquée.
- Scroll : grille **2 colonnes** d'`ObjetEnVenteCard` compactes (vs. desktop `repeat(auto-fill, minmax(240px, 1fr))`).
- Carte objet (~160 px × ~210 px) : visuel catégorie (carré 4/3) · 2 badges (état + rareté) · prix · 2 mini-boutons (« Négo » + « Acheter »).
- Carte achetée : opacité 0.4, actions masquées, mention « — Acquis — ».
- **Négociation** : tap « Négo » → bottom sheet avec input numérique pour l'offre + boutons « Annuler / Proposer » (au lieu de l'inline desktop).
- **FAB** flottant en bas (au-dessus de la safe area) : « Rentrer · fin de journée » (variante secondaire). Tap → ouvre `SessionSummary`.

### 5.4 Vitrine — Préparation (`/vitrine/[brocanteId]`)

- Header contextuel (« Vitrine / Nom brocante · ★ »).
- Tab bar masquée.
- Scroll :
  - **Panneau Stand** : niveau actuel + nom + barre capacité + coût location (3-4 lignes en haut).
  - **Liste objets exposés** : pour chaque item, miniature 36 px + nom + référence/état/rareté + champ prix éditable inline (input numérique 52 px de large).
  - **Bouton « Parcourir le stock »** pour ajouter depuis l'inventaire (ouvre une bottom sheet ou navigue vers `/stockage?picker=vitrine`, à choisir en plan).
- **2 FAB** flottants : « Annuler » (secondaire) + « Ouvrir l'étal · X € » (primaire avec coût).

### 5.5 Vitrine — Journée (`/vitrine/[brocanteId]/journee`)

Hors-scope refonte structurelle pour cette phase : le mockup détaillé n'a pas été produit. **Hypothèse de plan :** appliquer le même squelette (header contextuel + scroll de cartes ventes/refus + FAB « Clore la journée »). À confirmer pendant l'implémentation.

### 5.6 Stockage (`/stockage`)

- Header global.
- Sticky-top : eyebrow « — Stockage · <tier> — » + ligne résumé (`N / Cap obj.` à gauche, `Loyer X €/sem.` à droite) + barre de capacité + chips horizontales scrollables par catégorie (compteur par chip).
- Scroll : liste verticale (1 col) d'items inventaire (miniature 44 px + nom + état/rareté/cat + prix de référence à droite si compétence « Marchand averti » acquise sur cette catégorie).
- **Remplacement** des `CategorieAccordion` verticaux du desktop par un filtre via chips. La liste affiche uniquement la catégorie sélectionnée (ou « Tous »).

### 5.7 Atelier (`/atelier`)

- Header global.
- Sticky-top : résumé (`N en chantier` + `M prêt(s)` en vert si M > 0).
- Scroll :
  - Section « Travaux en cours » : pour chaque chantier, ligne avec nom + statut (jours restants ou « Prêt ✓ »), barre de progression, footer avec transition d'état et bouton « Récupérer » si prêt.
  - Section « Restaurations possibles » : pour chaque objet éligible, ligne avec nom + transition possible + durée/coût + bouton « Lancer ».

### 5.8 Compétences (`/competences`)

- Header global.
- Sticky-top : eyebrow + **picker d'arbres en grille 8×1** (Général + 7 catégories : Musique, Jeux & Loisirs, Livres & Papeterie, Mode, Maison, Objets d'art, Bricolage). Chaque bouton est carré (~36 px, gap 4 px sur 360 px de large), contient l'icône de catégorie et le niveau actuel (« N3 » ou « — » si jamais XP). Bouton actif inversé en forêt-800/laiton.
  - **Pastille rouge** en haut-droite du bouton si l'arbre a des points à dépenser → visibilité immédiate de tous les arbres en attente.
  - **Nom de l'arbre actif** affiché en Cinzel sous la grille pour confirmer la sélection (l'icône seule n'est pas suffisante).
  - **Carte XP** en bas du sticky-top : niveau + barre XP + points à dépenser pour l'arbre sélectionné.
- Scroll : liste verticale de cartes compétence dans l'arbre sélectionné. Chaque carte : glyphe + nom + description italique + ligne requirement (« Requis : X » ou « Verrouillée · N requis ») + bouton coût (« 1 pt », « Acquise » en patina, « Verrouillée » grisé).

### 5.9 Collection (`/collection`)

- Header global.
- Sticky-top : carte résumé valeur totale (gros chiffre Cinzel + breakdown par catégorie en italique) + chips horizontales par catégorie (compteur `donnees/total` par chip).
- Scroll : grille **3 colonnes** de slots carrés ~100 px. 3 états visuels :
  - **Silhouette** (jamais vu) : fond parchemin clair, bordure pointillée, `?` gris.
  - **Vu** (jamais possédé) : fond beige, glyphe désaturé, label « Vu ».
  - **Donné** : fond parchemin clair, bordure forêt-800, glyphe coloré, **ruban valeur** en haut-droite (forêt-800/laiton, ex. « 65 € »).
- Tap slot rempli → bottom sheet détail (description, donateur, options de retrait).
- Tap slot vide → bottom sheet `DonationPicker` (liste des items éligibles dans le stock pour donner à ce slot).

### 5.10 Historique (`/historique`)

Conservé comme **archive longue scrollable** (option A retenue lors du brainstorming). Header global + scroll de toutes les sessions chronologiquement, regroupées par jour. Pas de sticky-top dédié — le défilement est l'usage normal.

## 6. Patterns transverses

### 6.1 Bottom sheets

Pattern unifié pour :
- **Gazette plein écran** (depuis teaser QG).
- **Négociation** (depuis chaque objet en session de chinage).
- **DonationPicker** (depuis slot vide de Collection).
- **Détail collection** (depuis slot donné).

Structure : sheet attachée au bas, hauteur max 88 % du viewport, border-top 2 px forêt-800, border-radius haut 14 px, ombre vers le haut, handle gris 40 × 4 px centré, bouton « Fermer ✕ » en haut-droite. Scrim sombre (`rgba(15,30,22,0.35)`) couvre le reste de l'écran. Drag-to-dismiss à implémenter (préférer une lib légère ou geste natif).

### 6.2 Pastilles d'action

Pastille rouge circulaire (vermillon-600) affichant un compteur. Présentes sur :
- Tab bar : Atelier (objets prêts), Compétences (points à dépenser).
- Ligne « État des lieux » du QG : mêmes deux contextes.

### 6.3 FAB d'action en session

Sur écrans Chiner-session et Vitrine-prep, la tab bar est masquée et remplacée par un ou deux **FAB pleine largeur** flottants en bas (au-dessus de la safe-area), gestes d'engagement principaux. Boutons primaire (forêt/laiton) + secondaire (parchemin/laiton).

### 6.4 Layout flex column 100dvh

Tous les écrans non-action utilisent la même structure :

```
<Layout 100dvh>
  <Header />               // 52 + safe-area-top
  <StickyTop />            // contextuel par écran, hauteur variable
  <ScrollableContent />    // flex: 1, overflow-y: auto
  <TabBar />               // 60 + safe-area-bottom
</Layout>
```

Le composant `<StickyTop>` est l'élément qui change le plus selon le contexte ; les autres sont stables.

## 7. Suppressions et migrations

### 7.1 Code à supprimer

- `src/app/trophees/` (page complète).
- `src/components/BossUnlockModal.tsx`.
- `src/components/NavigationDock.tsx` (remplacé par un nouveau composant `<TabBar />`).
- Le bloc « dev cheat » du QG (`+100 €`) — à retirer en même temps que la refonte, comme déjà flaggé en commentaire (`/* à retirer avant prod */`).
- Toute utilisation des `BrassCorners` sur éléments < 200 px.

### 7.2 Migration save

- Le champ `state.bossDebloqueSeen` peut subsister dans les saves existantes → ignoré au load (compatibilité descendante, pas de migration destructive).
- Aucun autre champ n'est touché (collection, compétences, inventaire, historique, vitrine, tendances : tous inchangés).

### 7.3 Conditions de déblocage des brocantes

Les conditions actuelles (`valeurCollection`, `valeurCollectionCategorie`, etc.) sont **conservées**. Seul le déblocage de la salle des trophées (« Débloquez une brocante 3⭐ ») est retiré, car la salle n'existe plus.

## 8. Composants nouveaux ou modifiés

Composants nouveaux à créer :
- `<MobileHeader />` (header global 3 colonnes BROC / Jour / Caisse).
- `<ContextualHeader />` (header avec back + titre + caisse).
- `<StickyTop />` (composant générique qui pose la zone fixe sous le header).
- `<TabBar />` (5 onglets, pastilles d'action, masquable).
- `<BottomSheet />` (sheet réutilisable avec scrim + handle + close).
- `<GazetteTeaser />` (carte compacte pour le QG).
- `<GazetteSheet />` (contenu plein écran ouvert depuis le teaser).
- `<ActionFab />` (FAB pleine largeur, 1 ou 2 boutons).

Composants à refondre :
- `MarketTrendsPanel` → splitté en `<GazetteTeaser />` + `<GazetteSheet />`.
- `InventoryGrid` → vue liste compacte 1 col + filtre via chips, sans accordéons.
- `CollectionGrid` → grille 3 cols avec ruban valeur sur slots donnés.
- `BrocanteCard` → carte mobile compacte (header + desc + footer).
- `WeekTimeline` → version compacte 7 cases pour le sticky-top.
- `StatusBar` → remplacé par `<MobileHeader />`.

Composants supprimés :
- `NavigationDock`.
- `BossUnlockModal`.

## 9. Hors-scope explicite

- Refonte gameplay : aucune mécanique de jeu n'est modifiée (chinage, négo, restauration, donation, compétences, météo, célébrité — tout reste fonctionnellement identique).
- Refonte des données : `GameState`, données brocantes, catalogue d'objets — inchangés.
- Animations avancées (transitions de page, parallaxe) : pas nécessaires pour cette phase, à envisager plus tard si besoin.
- Internationalisation : la refonte reste en français comme actuellement.
- Build Tauri mobile : la configuration native (icônes, splash, signing) n'est pas couverte — seul le code Next.js est concerné par cette spec.

## 10. Critères de validation

- L'app est utilisable sans pincement ni zoom sur un viewport 360 × 720.
- Tous les tap targets font ≥ 40 × 40 px (idéalement 44 × 44).
- La page `/qg` charge en moins de 1 s sur mobile mid-range (pas de régression).
- Aucune horizontal-scroll involontaire sur aucun écran.
- Le scroll vertical d'un écran ne masque jamais la timeline et les CTA du QG (testé).
- La barre de navigation reste accessible au pouce (zone bottom, 60 px de haut).
- Tous les boutons d'action principale (Chiner, Exposer, Acheter, Récupérer, Lancer, Ouvrir l'étal) sont atteignables sans deux mains.
- Tests visuels manuels en simulateur iOS Safari et Chrome Android (360 px et 414 px).
- `npx tsc --noEmit` passe sans erreur.
- Toutes les routes existantes (sauf `/trophees` supprimée) répondent 200.

---

**Suite :** invocation du skill `superpowers:writing-plans` après revue utilisateur de cette spec.
