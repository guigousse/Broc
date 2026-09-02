# Duel de cartes — rapport d'équilibrage

Cibles (spec §6.4) : carte 45–55 % de victoires et ≥ 60 % de pose ; catégorie 45–55 % ; premier joueur < 55 % ; 8–14 manches en moyenne, aucune > 25 ; nuls + épuisées < 2 % ; agressif contre contrôle 45–55 %.

Commande : `npm run duel:campagne -- --graine <n> --parties 20000`

Les sorties complètes de chaque campagne (tableau des 50 cartes compris) sont
reproductibles à l'identique : la campagne est déterministe à la graine. Le
tableau des 50 cartes n'est recopié ici que dans la validation finale, pour
garder le rapport lisible.

## Campagne 0 — version 1 des cartes, compensation « 5ᵉ carte »

Graine 1 · 20000 parties

| Mesure | Valeur |
|---|---|
| Premier joueur | 74.2 % |
| Manches (moyenne / max) | 8.7 / 21 |
| Nuls / épuisées | 0.0 % / 0.0 % |
| Agressif contre contrôle | 63.0 % |

| Catégorie | Victoires |
|---|---|
| Bricolage | 49.6 % |
| Maison | 50.5 % |
| Mode | 52.8 % |
| Musique | 48.9 % |
| Livres & Papeterie | 48.4 % |
| Jeux & Loisirs | 50.0 % |
| Objets d'art | 50.2 % |

Hors cible :
- carte vinyle_des_loups_des_steppes_bark_to_be_free : pose 47 %
- carte 33tours_jazz_1 : pose 37 %
- carte guitare_classique_ancienne : pose 37 %
- carte test_pressing_des_trolling_sons : pose 47 %
- carte violon_de_maitre_cremonais_1715 : victoire 44.1 %
- carte paris_match_70s : pose 47 %
- carte le_petit_moustachu_edition_originale_1961 : pose 34 %
- carte gutenberg_feuillet : victoire 43.2 %
- carte blouson_cuir_vintage : pose 57 %
- carte chapeau_feutre_50s : victoire 55.5 %
- carte broche_emaillee_artdeco : pose 32 %
- carte sac_a_main_talaria : pose 57 %
- carte la_petite_robe_noire_chaine_1925 : victoire 56.4 %
- carte tabouret_bois_patine : pose 58 %
- carte boite_musique_ancienne : pose 48 %
- carte lampe_bureau_artdeco : pose 36 %
- carte terre_cuite_buste : pose 48 %
- carte vase_galle_signe : pose 55 %
- carte etabli_pliant_ancien : pose 55 %
- premier joueur : 74.2 %
- agressif contre contrôle : 63.0 %

Lecture : le set tient très bien sur les catégories (48,4 à 52,8 %) et sur la
durée des parties (8,7 manches, 21 au plus, aucun nul ni épuisement). Deux
familles de défauts :

1. **Le premier joueur écrase la partie (74,2 %)** — de très loin la mesure la
   plus hors cible. C'est la règle 1 (compensation du §3.1).
2. **Quinze taux de pose sous 60 %**, tous sur des cartes dont le texte coûte
   2 ou 3 points de budget (33 tours, guitare, moustachu, broche, lampe,
   terre cuite…). Ce sont exactement les cartes que l'IA classe en dernier :
   à coût égal, `phasePose` départage sur *attaque + PV*, c'est-à-dire sur le
   budget **amputé du prix du texte**. Piste retenue pour plus tard (règle
   d'IA, pas règle de carte).

## Compensation du second joueur — les trois variantes (graine 1, 20 000 parties)

Le contrôleur autorise, en plus des deux variantes du §3.1, leur **cumul**.

| Variante | Premier joueur | Manches | Agressif c. contrôle | Hors cible |
|---|---|---|---|---|
| A — 5ᵉ carte (v1) | 74,2 % | 8,7 | 63,0 % | 21 |
| B — +1 énergie au 1ᵉʳ tour, pas de 5ᵉ carte | 68,9 % | 8,7 | 67,9 % | 25 |
| **C — les deux cumulées** | **64,6 %** | 8,8 | 71,0 % | 34 |

**Décision : variante C**, la plus proche de 50 % sur le premier joueur (la
consigne du contrôleur). Effet secondaire assumé et consigné : l'énergie
supplémentaire du tour 1 profite plus aux courbes basses qu'aux courbes
hautes, donc « agressif contre contrôle » monte (63 → 71 %) et l'écart de
victoires entre cartes bon marché et cartes chères se creuse. Cet écart est
précisément ce que les règles 4 et 5 corrigent carte par carte ; le retard du
second joueur, lui, n'a plus aucun levier réglementaire une fois la
compensation choisie.

## Campagne 1 — graine 2, compensation C, cartes v1

Graine 2 · 20000 parties

| Mesure | Valeur |
|---|---|
| Premier joueur | 64.4 % |
| Manches (moyenne / max) | 8.8 / 21 |
| Nuls / épuisées | 0.0 % / 0.0 % |
| Agressif contre contrôle | 71.2 % |

| Catégorie | Victoires |
|---|---|
| Bricolage | 48.9 % |
| Maison | 51.0 % |
| Mode | 53.1 % |
| Musique | 49.4 % |
| Livres & Papeterie | 48.4 % |
| Jeux & Loisirs | 49.6 % |
| Objets d'art | 50.1 % |

Hors cible :
- carte vinyle_des_loups_des_steppes_bark_to_be_free : pose 56 %
- carte 33tours_jazz_1 : pose 37 %
- carte vinyle_stevranos_vive_la_fet_a : victoire 44.0 %
- carte guitare_classique_ancienne : pose 37 %
- carte test_pressing_des_trolling_sons : pose 56 %
- carte violon_de_maitre_cremonais_1715 : victoire 43.4 %
- carte playbox_pocket : victoire 55.4 %
- carte flipper_a_plateau_annees_60 : victoire 44.0 %
- carte cartouche_stadium_events : victoire 44.7 %
- carte paris_match_70s : pose 55 %
- carte miserables_pleiade : victoire 43.3 %
- carte le_petit_moustachu_edition_originale_1961 : pose 33 %
- carte gutenberg_feuillet : victoire 41.0 %
- carte veste_jean_delavee : victoire 55.3 %
- carte blouson_cuir_vintage : pose 58 %
- carte chapeau_feutre_50s : victoire 57.0 %
- carte broche_emaillee_artdeco : victoire 56.4 %
- carte broche_emaillee_artdeco : pose 41 %
- carte sac_a_main_talaria : pose 58 %
- carte la_petite_robe_noire_chaine_1925 : victoire 56.0 %
- carte figurine_porcelaine : victoire 55.6 %
- carte tabouret_bois_patine : pose 58 %
- carte boite_musique_ancienne : pose 56 %
- carte lampe_bureau_artdeco : pose 36 %
- carte terre_cuite_buste : pose 56 %
- carte bronze_animalier : victoire 44.7 %
- carte vase_galle_signe : pose 56 %
- carte marteau_menuisier : victoire 55.6 %
- carte etabli_pliant_ancien : pose 56 %
- carte pince_etirer_cuivre : victoire 56.9 %
- carte rabot_d_ebeniste_a_semelle_modele_605 : victoire 43.8 %
- carte coffret_ebeniste_xixe : victoire 43.8 %
- premier joueur : 64.4 %
- agressif contre contrôle : 71.2 %

### Retouches (itération 1)

| Carte | Avant → après | Règle |
|---|---|---|
| *(aucune carte)* | compensation du second joueur : 5ᵉ carte → 5ᵉ carte **et** +1 énergie au premier tour (`bonusEnergie`) | 1 |

