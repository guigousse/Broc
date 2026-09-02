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

## Campagne 2 — graine 3, cartes v2

Itération 2 : règle 6 (pose < 60 %) sur les six cartes les moins posées de la
campagne 1, en gardant le budget exact.

### Retouches (itération 2)

| Carte | Avant → après | Règle |
|---|---|---|
| le_petit_moustachu | 2/3, effet prix 2 → 2/4, effet prix 1 | 6 (effet : prix − 1, +1 PV) |
| lampe_bureau_artdeco | 2/3, effet prix 2 → 2/4, effet prix 1 | 6 (effet : prix − 1, +1 PV) |
| guitare_classique_ancienne | 2/3, effet prix 2 → 2/4, effet prix 1 | 6 (effet : prix − 1, +1 PV) |
| 33tours_jazz_1 | 2/3 → 3/2 | 6 (1 PV contre 1 attaque) |
| paris_match_70s | 1/2 → 2/1 | 6 (1 PV contre 1 attaque) |
| vinyle_des_loups_des_steppes | 1/2 → 2/1 | 6 (1 PV contre 1 attaque) |

Graine 3 · 20000 parties

| Mesure | Valeur |
|---|---|
| Premier joueur | 64.8 % |
| Manches (moyenne / max) | 8.6 / 21 |
| Nuls / épuisées | 0.0 % / 0.0 % |
| Agressif contre contrôle | 75.9 % |

| Catégorie | Victoires |
|---|---|
| Bricolage | 48.2 % |
| Maison | 51.1 % |
| Mode | 53.3 % |
| Musique | 49.9 % |
| Livres & Papeterie | 48.6 % |
| Jeux & Loisirs | 49.6 % |
| Objets d'art | 49.8 % |

Hors cible :
- carte vinyle_des_loups_des_steppes_bark_to_be_free : pose 55 %
- carte 33tours_jazz_1 : pose 27 %
- carte harmonica_chromatique_de_bluesman : victoire 55.4 %
- carte vinyle_stevranos_vive_la_fet_a : victoire 43.6 %
- carte guitare_classique_ancienne : pose 51 %
- carte test_pressing_des_trolling_sons : victoire 55.4 %
- carte test_pressing_des_trolling_sons : pose 55 %
- carte violon_de_maitre_cremonais_1715 : victoire 42.1 %
- carte cartouche_le_plombier_sauteur_8_bit : victoire 55.7 %
- carte manette_megadrive : victoire 55.5 %
- carte playbox_pocket : victoire 56.6 %
- carte figurine_de_guerre_galactique_1978 : victoire 44.4 %
- carte flipper_a_plateau_annees_60 : victoire 43.0 %
- carte cartouche_stadium_events : victoire 43.8 %
- carte paris_match_70s : pose 54 %
- carte miserables_pleiade : victoire 41.7 %
- carte le_petit_moustachu_edition_originale_1961 : pose 48 %
- carte gutenberg_feuillet : victoire 40.0 %
- carte veste_jean_delavee : victoire 56.9 %
- carte blouson_cuir_vintage : pose 49 %
- carte chapeau_feutre_50s : victoire 58.0 %
- carte broche_emaillee_artdeco : victoire 57.5 %
- carte broche_emaillee_artdeco : pose 40 %
- carte sac_a_main_talaria : pose 50 %
- carte la_petite_robe_noire_chaine_1925 : victoire 55.5 %
- carte figurine_porcelaine : victoire 56.3 %
- carte tabouret_bois_patine : pose 50 %
- carte vase_en_cristal_baraka : victoire 44.8 %
- carte boite_musique_ancienne : pose 55 %
- carte lampe_bureau_artdeco : pose 49 %
- carte aquarelle_paysage_anonyme : victoire 55.5 %
- carte terre_cuite_buste : pose 54 %
- carte bronze_animalier : victoire 43.1 %
- carte vase_galle_signe : pose 48 %
- carte marteau_menuisier : victoire 56.3 %
- carte etabli_pliant_ancien : pose 48 %
- carte pince_etirer_cuivre : victoire 57.3 %
- carte scie_egoine_de_charpentier : victoire 43.9 %
- carte boite_d_outils_de_manufacture_signee : victoire 45.0 %
- carte rabot_d_ebeniste_a_semelle_modele_605 : victoire 42.4 %
- carte coffret_ebeniste_xixe : victoire 42.5 %
- premier joueur : 64.8 %
- agressif contre contrôle : 75.9 %

### Ce que la campagne 2 démontre (et qui déclenche la retouche d'IA)

C'est l'expérience décisive : la règle 6 ne peut pas atteindre sa cible.

| Carte | Retouche | Pose avant → après |
|---|---|---|
| le_petit_moustachu | +1 au total attaque + PV | 33 % → 48 % |
| lampe_bureau_artdeco | +1 au total attaque + PV | 36 % → 49 % |
| guitare_classique_ancienne | +1 au total attaque + PV | 37 % → 51 % |
| 33tours_jazz_1 | total inchangé (1 PV → 1 attaque) | 37 % → **27 %** |
| paris_match_70s | total inchangé (1 PV → 1 attaque) | 55 % → 54 % |
| vinyle_des_loups | total inchangé (1 PV → 1 attaque) | 56 % → 55 % |

Et, sans qu'on y ait touché, les autres cartes de coût 3 **reculent** :
blouson 58 → 49 %, sac à main 58 → 50 %, tabouret 58 → 50 %, établi 56 → 48 %,
vase Gallé 56 → 48 %. Le total de mesures hors cible passe de 34 à 43.

Trois faits :

1. **À budget constant, déplacer un point ne change rien au taux de pose** (les
   trois dernières lignes). Le taux de pose ne dépend donc pas des stats.
2. **Ce qui le fait bouger, c'est le total `attaque + PV`**, parce que c'est la
   clé de tri de `phasePose` à coût égal — donc le budget *amputé du prix du
   texte*. Une carte à effet cher est structurellement reléguée en fin de main.
3. **Le taux de pose est à somme nulle dans un palier de coût** : l'étal ne
   tient que 4 objets, l'énergie est bornée ; faire monter une carte de coût 3
   en fait descendre une autre d'autant.

Aucune retouche de carte ne peut donc régler la pose : c'est une politique
d'IA. Le contrôleur l'a prévu — la suite est une retouche d'IA, pas de carte.

## Campagne 3 — graine 4, cartes v2, IA retouchée

### Retouche d'IA (itération 3) — `phasePose`

Avant : poser à répétition la carte la plus chère payable, départagée à coût
égal par `attaque + PV`.

Après : à chaque pose, chercher le **meilleur lot** parmi les sous-ensembles de
la main (`meilleurLot`, 128 au plus puisque la main tient en 7 cartes) —

- celui qui **dépense le plus d'énergie** (la version gloutonne laissait
  perdre de l'énergie : boîte à outils à 3 plutôt que deux cartes à 2) ;
- à égalité, celui qui **vaut le plus cher en budget** (`attaque + PV + prix du
  texte`, §5.1 — le texte cesse d'être invisible) ;
- **moins 1 point par carte posée** : une place d'étal sur quatre est une
  ressource rare. Sans cette taxe, empiler des petites cartes bat toujours une
  grosse (le budget par point d'énergie décroît : 3 · 2,5 · 2,33 · 2,25 · 2,2)
  et l'IA noie son étal.

Ni la limite d'étal (4), ni la limite de main, ni aucune règle du §3 n'ont
bougé. Quatre variantes ont été mesurées à la graine 4 avant de trancher :

| Variante de `phasePose` | Premier joueur | Agressif c. contrôle | Pose moyenne | Cartes sous 60 % de pose |
|---|---|---|---|---|
| v2 (gloutonne, `attaque + PV`) | 64,8 %¹ | 75,9 %¹ | — | 14 |
| max énergie, puis budget brut | 62,9 % | 68,2 % | 74,2 % | ~20 (tout le coût 3 et le coût 4) |
| max énergie, puis moins de cartes | 65,9 % | 70,5 % | 70,6 % | 5 |
| **max énergie, puis budget − 1 par place** | **64,6 %** | **71,1 %** | **71,8 %** | **3** |

¹ à la graine 3 (campagne 2).

La deuxième variante gagne sur les mesures globales mais laisse tout le milieu
de courbe sous la cible ; la quatrième est retenue parce qu'elle ne laisse que
trois cartes de coût 3 juste sous la barre (60 %), à portée d'un allongement
des parties.

Graine 4 · 20000 parties

| Mesure | Valeur |
|---|---|
| Premier joueur | 64.6 % |
| Manches (moyenne / max) | 8.9 / 21 |
| Nuls / épuisées | 0.0 % / 0.0 % |
| Agressif contre contrôle | 71.1 % |

| Catégorie | Victoires |
|---|---|
| Bricolage | 48.7 % |
| Maison | 50.2 % |
| Mode | 53.9 % |
| Musique | 49.1 % |
| Livres & Papeterie | 48.8 % |
| Jeux & Loisirs | 49.7 % |
| Objets d'art | 50.2 % |

Hors cible :
- carte vinyle_stevranos_vive_la_fet_a : victoire 43.7 %
- carte violon_de_maitre_cremonais_1715 : victoire 42.3 %
- carte playbox_pocket : victoire 55.3 %
- carte figurine_de_guerre_galactique_1978 : victoire 44.8 %
- carte flipper_a_plateau_annees_60 : victoire 44.4 %
- carte miserables_pleiade : victoire 43.0 %
- carte le_petit_moustachu_edition_originale_1961 : pose 60 %
- carte gutenberg_feuillet : victoire 40.7 %
- carte veste_jean_delavee : victoire 56.1 %
- carte chapeau_feutre_50s : victoire 57.5 %
- carte broche_emaillee_artdeco : victoire 58.3 %
- carte la_petite_robe_noire_chaine_1925 : victoire 58.2 %
- carte bronze_animalier : victoire 44.7 %
- carte vase_galle_signe : pose 60 %
- carte marteau_menuisier : victoire 55.0 %
- carte boite_outils_complete : pose 60 %
- carte pince_etirer_cuivre : victoire 56.6 %
- carte scie_egoine_de_charpentier : victoire 44.9 %
- carte rabot_d_ebeniste_a_semelle_modele_605 : victoire 44.0 %
- carte coffret_ebeniste_xixe : victoire 44.2 %
- premier joueur : 64.6 %
- agressif contre contrôle : 71.1 %

## Campagne 4 — graine 5, cartes v3

### Retouches (itération 4) — les six taux de victoire les plus extrêmes

| Carte | Avant → après | Règle |
|---|---|---|
| gutenberg_feuillet | 3/4, effet prix 3 → 4/4, prix 2 | 5 (prix − 1, +1 point de stat) |
| violon_de_maitre_cremonais | 4/5, prix 3 → 5/5, prix 2 | 5 (prix − 1, +1 point de stat) |
| miserables_pleiade | 3/4 → 4/3 | 5 (1 PV → 1 attaque) |
| chapeau_feutre_50s | 2/1 → 1/2 | 4 (1 attaque → 1 PV) |
| broche_emaillee_artdeco | 1/1 → 0/2 | 4 (1 attaque → 1 PV) |
| la_petite_robe_noire | 4/4 → 3/5 | 4 (1 attaque → 1 PV) |

Deux notes de lecture des règles :

- pour la broche et la petite robe noire, la première branche de la règle 4
  (`prix + 1`) est **interdite par le test de garde** : une rare plafonne à 3,
  une légendaire à 4 (spec §5.2), et elles y sont déjà. On tombe donc sur la
  branche « déplacer 1 point d'attaque vers les PV » ;
- la branche finale de la règle 4 (monter le coût en échangeant avec une carte
  de coût voisin sous-performante) n'a jamais pu s'appliquer : aucune carte de
  coût voisin n'était sous 45 % au moment voulu.

Graine 5 · 20000 parties

| Mesure | Valeur |
|---|---|
| Premier joueur | 65.3 % |
| Manches (moyenne / max) | 9.1 / 21 |
| Nuls / épuisées | 0.0 % / 0.0 % |
| Agressif contre contrôle | 63.9 % |

| Catégorie | Victoires |
|---|---|
| Bricolage | 49.5 % |
| Maison | 50.5 % |
| Mode | 52.8 % |
| Musique | 49.2 % |
| Livres & Papeterie | 49.0 % |
| Jeux & Loisirs | 49.5 % |
| Objets d'art | 50.1 % |

Hors cible :
- carte violon_de_maitre_cremonais_1715 : victoire 44.0 %
- carte cartouche_stadium_events : victoire 44.9 %
- carte monte_cristo : pose 60 %
- carte gutenberg_feuillet : victoire 43.1 %
- carte la_petite_robe_noire_chaine_1925 : victoire 58.7 %
- carte boite_outils_complete : pose 60 %
- premier joueur : 65.3 %
- agressif contre contrôle : 63.9 %

De 22 mesures hors cible à 8. « Agressif contre contrôle » descend de 71,1 à
63,9 % : buffer le haut de courbe et affaiblir le bas travaille dans le bon
sens.

## Campagne 5 — graine 6, cartes v4

### Retouches (itération 5)

| Carte | Avant → après | Règle |
|---|---|---|
| la_petite_robe_noire | 3/5 → 2/6 | 4 (1 attaque → 1 PV) |
| gutenberg_feuillet | 4/4, prix 2 → 5/4, prix 1 | 5 (prix − 1, +1 point de stat) |
| violon_de_maitre_cremonais | 5/5, prix 2 → 6/5, prix 1 | 5 (prix − 1, +1 point de stat) |
| cartouche_stadium_events | 2/4, prix 4 → 3/4, prix 3 | 5 (prix − 1, +1 point de stat) |

Graine 6 · 20000 parties

| Mesure | Valeur |
|---|---|
| Premier joueur | 65.6 % |
| Manches (moyenne / max) | 9.1 / 21 |
| Nuls / épuisées | 0.0 % / 0.0 % |
| Agressif contre contrôle | 63.4 % |

| Catégorie | Victoires |
|---|---|
| Bricolage | 49.0 % |
| Maison | 50.1 % |
| Mode | 52.4 % |
| Musique | 49.3 % |
| Livres & Papeterie | 49.4 % |
| Jeux & Loisirs | 50.3 % |
| Objets d'art | 50.2 % |

Hors cible :
- carte violon_de_maitre_cremonais_1715 : victoire 44.7 %
- carte gutenberg_feuillet : victoire 44.5 %
- carte la_petite_robe_noire_chaine_1925 : victoire 56.3 %
- premier joueur : 65.6 %
- agressif contre contrôle : 63.4 %

Les deux derniers taux de pose rentrent dans la cible. Restent trois cartes,
toutes légendaires, et les deux mesures globales.

## Campagne 6 — graine 7, cartes v5

### Retouches (itération 6)

| Carte | Avant → après | Règle |
|---|---|---|
| la_petite_robe_noire | 2/6 → 1/7 | 4 (1 attaque → 1 PV) |
| gutenberg_feuillet | 5/4 → 6/3 | 5 (1 PV → 1 attaque) |

Le violon n'est **plus retouchable** : son prix est au plancher (1, imposé par
le test de garde) et son attaque au plafond du domaine (6). Il est laissé tel
quel — et il rentre dans la cible à cette campagne.

Graine 7 · 20000 parties

| Mesure | Valeur |
|---|---|
| Premier joueur | 65.7 % |
| Manches (moyenne / max) | 9.0 / 21 |
| Nuls / épuisées | 0.0 % / 0.0 % |
| Agressif contre contrôle | 64.1 % |

| Catégorie | Victoires |
|---|---|
| Bricolage | 49.4 % |
| Maison | 50.2 % |
| Mode | 52.1 % |
| Musique | 49.4 % |
| Livres & Papeterie | 49.1 % |
| Jeux & Loisirs | 50.3 % |
| Objets d'art | 50.1 % |

Hors cible :
- carte gutenberg_feuillet : victoire 43.3 %
- carte la_petite_robe_noire_chaine_1925 : victoire 55.1 %
- carte boite_outils_complete : pose 60 %
- carte pince_etirer_cuivre : victoire 55.3 %
- premier joueur : 65.7 %
- agressif contre contrôle : 64.1 %
