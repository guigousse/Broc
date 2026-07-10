# Atelier : slots en carrés (0 de base, max 3)

**Date** : 2026-07-10
**Statut** : validé par Guillaume

## Objectif

Les emplacements de restauration deviennent 3 carrés visibles en permanence
entre la bande haute et le panneau bas de la fenêtre flottante Atelier.
Une nouvelle partie n'a AUCUN slot débloqué ; chaque slot s'achète en tapant
le carré verrouillé. La section « Travaux en cours » et les onglets
Restaurations/Démantèlement disparaissent.

## Décisions validées

- **Déblocage** : tap sur le carré verrouillé (cadenas + prix) → tiroir de
  confirmation → achat. Prix : 100 € / 200 € / 500 €. Le bouton
  d'amélioration disparaît de la bande haute.
- **Slot vide** : tap → tiroir « Choisir un objet à restaurer » (liste
  restaurables actuelle : transition d'étoiles, durée, valeur avant→après,
  coût en pièces). Choisir un objet lance la restauration.
- **Slot occupé** : sticker + temps restant ; tap → tiroir détail avec
  « Terminer avec une pub » si éligible (`peutTerminerImmediat` +
  `getAdProvider`, logique reprise de Travaux en cours).
- **Slot prêt** : sticker + badge « prêt » ; tap → récupération directe +
  animation de vol existante.
- **Panneau bas** : liste démantèlement SEULE (plus d'onglets) ; le tiroir
  de confirmation de démantèlement existant est conservé.
- **Migration** : les sauvegardes existantes conservent leur niveau
  (1/2/3 slots acquis) ; défaut migration sans champ = 1 (slot gratuit
  historique). Seules les nouvelles parties démarrent à 0.

## 1. Modèle de jeu

- `GameState.niveauAtelier : 0 | 1 | 2 | 3` (= slots débloqués).
  `nouvellePartie` initialise à 0.
- `src/data/atelier.ts` :
  - `ATELIER_SLOTS: Record<0|1|2|3, number> = {0:0, 1:1, 2:2, 3:3}` ;
  - `ATELIER_UPGRADES` : 0→1 : 100 €, 1→2 : 200 €, 2→3 : 500 € ;
  - `getProchaineUpgrade(0|1|2|3)`, `getCapaciteAtelier` adaptés.
- `ameliorerAtelier` (GameContext) inchangé dans son principe (passe au
  niveau suivant si budget OK) — il devient l'action du tap sur carré
  verrouillé.
- `restaurerObjet` garde son refus quand tous les slots débloqués sont
  occupés (avec niveau 0 → refus systématique).
- `src/lib/migrations.ts` : accepte 0..3 ; une sauvegarde avec
  `niveauAtelier` ∈ {0,1,2,3} le conserve ; champ absent/invalide → 1.

## 2. Châssis

`FloatingRoomOverlay` gagne `milieu?: ReactNode` : bloc carte optionnel
entre la bande et le panneau (`flexShrink: 0`, non scrollable, même
habillage carte, entrée `broc-fade-in 320ms ease-out`). Sans la prop,
rendu inchangé (le stockage n'est pas impacté).

## 3. Composant AtelierSlots

`src/components/atelier/AtelierSlots.tsx` — rangée de 3 carrés (~76 px,
centrés, gap régulier). Props : `state` dérivés (slots débloqués, objets en
restauration avec temps restant), callbacks (`onAcheterSlot`,
`onChoisirObjet(slotIdx)`, `onTapEnCours(objet)`, `onRecuperer(objet)`).
États par carré :
- verrouillé : cadenas + prix (`100 €`…), grisé ;
- vide : « + » ;
- occupé : `ItemSticker` + temps restant (`formatDuree`) ;
- prêt : `ItemSticker` + badge « prêt ».
Mapping objets→carrés : les restaurations en cours remplissent les carrés
débloqués de gauche à droite (pas d'affectation persistée — le modèle de
jeu reste « n simultanées max »). Le temps restant se rafraîchit sur le
tick déjà utilisé par la page (interval existant de Travaux en cours).

## 4. Page atelier

- Bande haute : titre + compteur occupés/débloqués + `PiecesInventoryBar`
  (plus d'UpgradeButton ni de mention MAX).
- `milieu` = `<AtelierSlots …>`.
- Panneau = titre de section + liste démantèlement (fiches actuelles) ;
  suppression : section Travaux en cours, switch d'onglets, états
  `onglet`, listes `enCours` rendues dans le panneau (le calcul `enCours`
  reste pour les carrés).
- Tiroirs (BottomSheet, hors châssis comme aujourd'hui) :
  1. confirmation d'achat de slot (prix, budget, boutons Annuler/Acheter) ;
  2. « Choisir un objet à restaurer » : liste restaurables actuelle
     re-housée (mêmes lignes `AtelierItemRow`) ;
  3. détail restauration en cours : objet + temps restant + « Terminer
     avec une pub » si éligible ;
  4. démantèlement : existant inchangé.
- La récupération d'un objet prêt garde l'animation de vol existante
  (`recupererObjetRestaure`), déclenchée depuis le carré.

## 5. i18n

Nouvelles clés (fr/en/es) : libellés des carrés (slot verrouillé, prix,
« prêt », « + »/aria vide), titres des 3 nouveaux tiroirs, confirmation
d'achat. Purge des clés orphelines (onglets, travaux en cours, compteur
si reformulé…) après grep.

## 6. Tests

- `migrations.test.ts` : niveau 0 conservé, 1/2/3 conservés, absent → 1.
- `data/atelier` : upgrades 0→1→2→3 (prix), capacité 0..3,
  `getProchaineUpgrade(3) = null`.
- Gates habituels + vérification navigateur (achat de slot, choix d'objet,
  pub, récupération, démantèlement).

Hors périmètre : Collection (chantier suivant), équilibrage des prix
au-delà des 3 valeurs validées, affectation slot-par-slot persistée.
