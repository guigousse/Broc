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

**Écart assumé à l'ordre de priorité du plan.** La campagne 1 laissait
17 cartes hors de la fourchette 45–55 % de victoires — **9 sous 45 %**
(Gutenberg 41,0 ; les Misérables 43,3 ; le violon 43,4 ; le rabot 43,8 ; le
coffret d'ébéniste 43,8 ; le vinyle Stevranos 44,0 ; le flipper 44,0 ; Stadium
Events 44,7 ; le bronze animalier 44,7) et **8 au-dessus de 55 %** (le chapeau
de feutre 57,0 ; la pince 56,9 ; la broche 56,4 ; la petite robe noire 56,0 ;
la figurine de porcelaine 55,6 ; le marteau 55,6 ; Playbox 55,4 ; la veste en
jean 55,3). Par l'ordre des règles, l'itération aurait dû prendre les six plus
extrêmes — **distance à la borne la plus proche de la fourchette** (45 ou 55),
ce qui classe comme `|taux − 50| − 5` : Gutenberg (4,0), le chapeau de feutre
(2,0), la pince (1,9), les Misérables (1,7), le violon (1,6) et la broche
(1,4) ; la petite robe noire, à 1,0 — à égalité avec le vinyle Stevranos et le
flipper — arrive derrière le rabot et le coffret (1,2 chacun). Puis ne toucher
à la règle 6 qu'une fois les taux de victoire rentrés. Le choix a été de
dépenser cette itération en **expérience diagnostique** : dans le tableau
ci-dessous, trois des six retouches gagnent un point de budget (le prix de
l'effet baisse de 1) et trois déplacent un point à budget constant, ce qui
isole exactement la variable dont dépend le taux de pose. Sans cette mesure,
la retouche d'IA de l'itération 3 n'aurait été qu'une intuition — et le
contrôleur exigeait la preuve que les règles 4 à 6 ne peuvent pas atteindre la
cible de pose avant d'autoriser une retouche d'IA. Le coût de l'écart est
d'une itération sur douze, et le traitement des taux de victoire a commencé
dès l'itération 4, une fois l'IA figée : 14 retouches sur 8 de ces 17 cartes
en quatre itérations, les 9 autres étant rentrées d'elles-mêmes. Ce qui valait
mieux : les retouches faites avant le changement d'IA auraient été mesurées
contre une politique de pose qui n'existe plus.

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

## Campagne 7 — graine 8, cartes v6

### Retouches (itération 7)

| Carte | Avant → après | Règle |
|---|---|---|
| gutenberg_feuillet | 6/3 → 4/5 | 5, réallocation : les deux points gagnés par `prix 3 → 1` repassent en PV |
| pince_etirer_cuivre | 3/1 → 2/2 | 4 (1 attaque → 1 PV) |

La règle 5 ne dit pas *quelle* stat reçoit le point gagné sur le prix. Les
deux avaient été mis en attaque (itérations 4 et 5), puis l'itération 6 avait
encore échangé 1 PV contre 1 attaque : mesuré **moins bon** (44,5 → 43,3 %).
Gutenberg reprend donc ses deux points en PV : un feuillet à 3 PV mourait à
tout.

Graine 8 · 20000 parties

| Mesure | Valeur |
|---|---|
| Premier joueur | 66.8 % |
| Manches (moyenne / max) | 9.2 / 21 |
| Nuls / épuisées | 0.0 % / 0.0 % |
| Agressif contre contrôle | 60.7 % |

| Catégorie | Victoires |
|---|---|
| Bricolage | 49.6 % |
| Maison | 50.2 % |
| Mode | 52.0 % |
| Musique | 49.1 % |
| Livres & Papeterie | 49.1 % |
| Jeux & Loisirs | 50.2 % |
| Objets d'art | 50.4 % |

Hors cible :
- carte la_petite_robe_noire_chaine_1925 : victoire 56.0 %
- premier joueur : 66.8 %
- agressif contre contrôle : 60.7 %

Trois mesures hors cible sur 155 : les 50 taux de victoire et les 50 taux de
pose sont dans la cible sauf un, comme les 7 catégories, la durée des parties
et le taux de nuls.

## Validation finale — cartes v6, graines 101, 202, 303

Trois campagnes de 20 000 parties, **sans aucune retouche entre elles**.

Les mesures de diagnostic citées plus bas (parties en miroir, découpage par
famille de decks, balayage des répartitions d'une carte) ne sont pas produites
par `duel:campagne` : ce sont trois outils jetables, gardés dans le bloc-notes
de session pour être rejouables — `diag-miroir.ts`, `diag-familles.ts` et
`diag-repartitions.sh` (voir la fin du rapport).

Graine 101 · 20000 parties

| Mesure | Valeur |
|---|---|
| Premier joueur | 66.3 % |
| Manches (moyenne / max) | 9.2 / 21 |
| Nuls / fatigue / épuisées (garde de boucle) | 0.0 % / 3.0 % / 0.0 % |
| Agressif contre contrôle | 60.6 % |

| Catégorie | Victoires |
|---|---|
| Bricolage | 49.5 % |
| Maison | 50.1 % |
| Mode | 52.1 % |
| Musique | 49.2 % |
| Livres & Papeterie | 49.2 % |
| Jeux & Loisirs | 50.0 % |
| Objets d'art | 50.4 % |

Hors cible :
- carte gutenberg_feuillet : victoire 44.3 %
- carte la_petite_robe_noire_chaine_1925 : victoire 55.7 %
- premier joueur : 66.3 %
- nuls + fatigue : 3.1 %
- agressif contre contrôle : 60.6 %

Graine 202 · 20000 parties

| Mesure | Valeur |
|---|---|
| Premier joueur | 66.4 % |
| Manches (moyenne / max) | 9.2 / 21 |
| Nuls / fatigue / épuisées (garde de boucle) | 0.0 % / 2.9 % / 0.0 % |
| Agressif contre contrôle | 61.1 % |

| Catégorie | Victoires |
|---|---|
| Bricolage | 49.4 % |
| Maison | 50.3 % |
| Mode | 52.0 % |
| Musique | 49.2 % |
| Livres & Papeterie | 49.0 % |
| Jeux & Loisirs | 50.2 % |
| Objets d'art | 50.5 % |

Hors cible :
- carte gutenberg_feuillet : victoire 44.7 %
- carte la_petite_robe_noire_chaine_1925 : victoire 55.8 %
- premier joueur : 66.4 %
- nuls + fatigue : 2.9 %
- agressif contre contrôle : 61.1 %

Graine 303 · 20000 parties

| Mesure | Valeur |
|---|---|
| Premier joueur | 66.3 % |
| Manches (moyenne / max) | 9.2 / 21 |
| Nuls / fatigue / épuisées (garde de boucle) | 0.0 % / 3.0 % / 0.0 % |
| Agressif contre contrôle | 60.6 % |

| Catégorie | Victoires |
|---|---|
| Bricolage | 49.4 % |
| Maison | 50.0 % |
| Mode | 51.8 % |
| Musique | 49.2 % |
| Livres & Papeterie | 49.3 % |
| Jeux & Loisirs | 50.4 % |
| Objets d'art | 50.6 % |

Hors cible :
- carte la_petite_robe_noire_chaine_1925 : victoire 55.7 %
- premier joueur : 66.3 %
- nuls + fatigue : 3.0 %
- agressif contre contrôle : 60.6 %

### Les 50 cartes aux trois graines

| Carte | Coût | Victoires 101 / 202 / 303 | Pose 101 / 202 / 303 |
|---|---|---|---|
| vinyle_des_loups_des_steppes_bark_to_be_free | 2 | 50.2 / 50.6 / 50.4 | 76.9 / 76.5 / 76.8 |
| vinyle_grand_max_des_combines | 1 | 51.3 / 51.4 / 50.6 | 74.5 / 74.1 / 75.3 |
| 33tours_jazz_1 | 3 | 47.0 / 47.0 / 47.3 | 62.1 / 62.1 / 61.7 |
| harmonica_chromatique_de_bluesman | 2 | 52.4 / 52.7 / 52.0 | 76.1 / 76.0 / 76.6 |
| vinyle_stevranos_vive_la_fet_a | 4 | 47.1 / 46.5 / 46.4 | 66.2 / 66.6 / 66.0 |
| guitare_classique_ancienne | 3 | 47.4 / 47.3 / 47.8 | 61.7 / 61.9 / 61.8 |
| test_pressing_des_trolling_sons | 2 | 53.0 / 52.8 / 53.2 | 76.2 / 76.7 / 77.1 |
| violon_de_maitre_cremonais_1715 | 5 | 45.4 / 45.6 / 45.4 | 97.3 / 97.2 / 97.2 |
| cartouche_le_plombier_sauteur_8_bit | 1 | 51.7 / 52.6 / 52.8 | 75.6 / 75.4 / 75.3 |
| manette_megadrive | 1 | 52.5 / 53.1 / 52.9 | 76.1 / 75.0 / 76.0 |
| playbox_pocket | 2 | 53.6 / 53.9 / 53.6 | 77.6 / 76.4 / 76.4 |
| risk_1992 | 3 | 49.3 / 49.3 / 49.4 | 61.2 / 60.8 / 61.1 |
| figurine_de_guerre_galactique_1978 | 4 | 47.9 / 47.6 / 48.5 | 65.7 / 64.9 / 65.4 |
| flipper_a_plateau_annees_60 | 5 | 47.1 / 46.9 / 47.6 | 86.8 / 86.4 / 86.9 |
| cartouche_stadium_events | 4 | 47.5 / 47.8 / 48.0 | 93.9 / 94.0 / 94.4 |
| monte_cristo | 3 | 48.9 / 48.7 / 48.9 | 61.4 / 61.1 / 61.5 |
| les_aventures_de_titou_cap_sur_la_lune | 1 | 52.7 / 52.0 / 52.0 | 76.0 / 75.6 / 76.0 |
| paris_match_70s | 2 | 50.6 / 50.2 / 51.4 | 77.4 / 77.3 / 77.3 |
| miserables_pleiade | 4 | 46.3 / 45.8 / 46.5 | 65.3 / 66.1 / 66.5 |
| conte_de_l_aviateur_et_de_l_enfant_roi_edition | 2 | 50.9 / 51.7 / 51.5 | 76.3 / 76.9 / 76.4 |
| le_petit_moustachu_edition_originale_1961 | 3 | 50.5 / 50.2 / 49.5 | 61.4 / 60.6 / 60.9 |
| gutenberg_feuillet | 4 | 44.3 / 44.7 / 45.3 | 94.8 / 94.1 / 94.2 |
| veste_jean_delavee | 2 | 52.9 / 53.1 / 52.7 | 76.7 / 76.3 / 76.3 |
| blouson_cuir_vintage | 3 | 50.1 / 49.7 / 49.7 | 61.2 / 60.3 / 61.3 |
| chapeau_feutre_50s | 1 | 53.0 / 53.4 / 52.9 | 74.4 / 73.8 / 74.1 |
| robe_50s_pinup | 4 | 48.7 / 48.3 / 48.8 | 66.1 / 66.1 / 67.5 |
| broche_emaillee_artdeco | 2 | 54.0 / 53.6 / 53.3 | 75.7 / 75.9 / 76.1 |
| sac_a_main_talaria | 3 | 50.4 / 50.0 / 49.9 | 61.4 / 61.6 / 60.7 |
| la_petite_robe_noire_chaine_1925 | 5 | 55.7 / 55.8 / 55.7 | 97.4 / 98.0 / 97.7 |
| figurine_porcelaine | 1 | 52.4 / 52.2 / 52.8 | 74.4 / 74.4 / 75.2 |
| service_the_faience | 2 | 50.9 / 51.8 / 50.9 | 76.1 / 75.7 / 76.6 |
| tabouret_bois_patine | 3 | 49.6 / 49.5 / 48.8 | 61.8 / 61.9 / 61.2 |
| vase_en_cristal_baraka | 4 | 47.4 / 47.8 / 47.5 | 66.5 / 66.7 / 67.5 |
| boite_musique_ancienne | 2 | 50.3 / 50.8 / 50.5 | 76.8 / 75.0 / 76.1 |
| lampe_bureau_artdeco | 3 | 49.1 / 49.6 / 49.2 | 61.7 / 61.9 / 61.4 |
| uf_joaillier_imperial_en_email_replique | 5 | 51.2 / 50.2 / 50.5 | 97.3 / 97.5 / 97.6 |
| aquarelle_paysage_anonyme | 1 | 52.1 / 52.6 / 52.6 | 75.1 / 74.8 / 75.7 |
| terre_cuite_buste | 2 | 51.3 / 52.0 / 52.1 | 76.0 / 75.8 / 76.4 |
| masque_tribal_decoratif | 3 | 50.1 / 49.5 / 50.1 | 61.1 / 61.2 / 61.7 |
| bronze_animalier | 4 | 47.2 / 47.3 / 47.1 | 66.9 / 66.6 / 67.6 |
| vase_galle_signe | 3 | 49.4 / 49.6 / 49.2 | 60.7 / 60.4 / 60.9 |
| dessin_surrealiste_aux_montres_molles_signe | 5 | 52.5 / 52.1 / 52.2 | 85.8 / 85.5 / 85.5 |
| marteau_menuisier | 1 | 53.2 / 53.0 / 53.3 | 75.4 / 74.8 / 76.1 |
| boite_outils_complete | 3 | 49.1 / 49.2 / 49.2 | 60.5 / 60.3 / 60.7 |
| etabli_pliant_ancien | 3 | 50.2 / 50.1 / 49.9 | 60.2 / 61.3 / 60.7 |
| pince_etirer_cuivre | 2 | 53.6 / 53.8 / 53.1 | 76.7 / 76.3 / 76.8 |
| scie_egoine_de_charpentier | 4 | 47.1 / 47.2 / 47.3 | 65.8 / 65.6 / 65.8 |
| boite_d_outils_de_manufacture_signee | 5 | 49.2 / 48.7 / 48.9 | 86.0 / 85.4 / 85.8 |
| rabot_d_ebeniste_a_semelle_modele_605 | 4 | 46.7 / 46.3 / 46.6 | 65.2 / 65.2 / 66.1 |
| coffret_ebeniste_xixe | 5 | 46.6 / 46.5 / 46.8 | 85.8 / 86.2 / 86.1 |

### Bilan

| Cible (§6.4) | Résultat |
|---|---|
| Taux de victoire d'une carte, 45–55 % | **49 cartes sur 50** aux trois graines (la petite robe noire à 55,7 / 55,8 / 55,7 % ; Gutenberg à 44,3 / 44,7 % aux graines 101 et 202, dans la cible à la 303) |
| Taux de pose ≥ 60 % | **50 sur 50**, aux trois graines |
| Taux de victoire d'une catégorie, 45–55 % | **7 sur 7**, entre 48,5 et 52,3 % (le taux d'une catégorie est la moyenne non pondérée des taux de ses cartes, pas une moyenne pondérée par le nombre de parties) |
| Durée moyenne 8 à 14 manches, aucune > 25 | **9,2 manches**, 21 au plus |
| Nuls + parties épuisées < 2 % | **0,0 %** — mais ne mesurait que le garde-fou de boucle (`epuisee`, 60 manches), jamais atteint ; la pioche épuisée fatale (« fatigue »), qui décide bien des parties, n'était pas mesurée. Corrigé dans la revue finale : **nuls + fatigue résiste** (2,9 à 3,1 %), voir ci-dessous |
| Avantage du premier joueur < 55 % | **66,3 % — résiste** |
| Agressif contre contrôle 45–55 % | **60,6 à 61,1 % — résiste** |

La condition d'arrêt du plan (`horsCible` vide sur trois graines) **n'est pas
atteinte** : trois mesures globales résistent, plus une carte. Sept itérations
sur les douze autorisées ont été consommées ; les cinq restantes n'ont pas été
dépensées parce que **les règles de décision n'ont plus de coup légal** sur ce
qui reste. Le détail suit.

## Ce qui résiste, et pourquoi

### 1. L'avantage du premier joueur (66,3 %) — structurel au format

Ce n'est ni un défaut des cartes, ni un défaut des decks. Preuve : une partie
**en miroir** (les deux joueurs jouent le même deck, avec le même profil d'IA)
donne, sur 12 000 parties :

| Miroir | Premier joueur | Manches |
|---|---|---|
| agressif contre agressif | 68,7 % | 7,6 |
| prudent contre prudent | 67,4 % | 11,3 |

Et le chiffre décroît régulièrement avec la durée de la partie (miroir prudent) :

| Durée | 6–8 manches | 9–10 | 11–13 | 14–18 |
|---|---|---|---|---|
| Premier joueur | 82 % | 65–74 % | 58–64 % | 54–65 % |

Le format est une course : la vitrine tient 20 points, le plafond d'énergie
monte de 1 par tour, la partie se joue en 9 manches. Celui qui joue en premier
attaque en premier **à chaque palier d'énergie**, une avance qui ne se rattrape
pas. Il faudrait des parties de 18 manches et plus pour descendre sous 55 %,
c'est-à-dire une vitrine bien plus grosse que 20 — une **règle du §3**, que le
plan interdit de toucher.

Les trois compensations du §3.1 ont été mesurées et la meilleure est en place
(5ᵉ carte **et** +1 énergie au premier tour, cumulées) : elle a ramené la
mesure de 74,2 % à 64,6 %. Le levier réglementaire est épuisé.

**Décision qui revient à Guillaume** : assouplir la cible, ou changer une
règle du §3 (vitrine plus grosse, ou compensation plus forte que celles
prévues au §3.1).

### 2. Agressif contre contrôle (60,6 %) — propriété du générateur de decks

Le jeu de cartes, lui, est plat. En mesurant les trois familles de decks
séparément (12 000 parties chacune), le taux de victoire moyen par palier de
coût donne :

| Famille de decks | Coût 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| aléatoire | 50,6 % | 50,0 % | 49,2 % | 49,1 % | 52,3 % |
| bicolore | 50,4 % | 49,8 % | 49,6 % | 49,7 % | 51,1 % |
| **par courbe** | **60,2 %** | **60,5 %** | 49,1 % | **39,1 %** | **40,5 %** |

Dans les decks aléatoires et bicolores — 75 % de la campagne — la courbe de
coût est **plate à un point près**. L'écart n'apparaît que dans la famille
« par courbe » du §6.3, où le deck contrôle est fait de **20 cartes coûtant
toutes 3 ou plus**. Dans un format où l'énergie monte de 1 par tour et où la
partie dure 9 manches, ce deck ne peut rien jouer avant la manche 3 et a déjà
encaissé le tiers de sa vitrine : ce n'est pas un deck de contrôle, c'est un
deck injouable. Le §6.3 fige cette définition, le plan interdit d'y toucher.

Les retouches de cartes ont quand même fait descendre la mesure de 71,1 % à
60,6 % en buffant le haut de courbe et en affaiblissant le bas. Aller plus loin
demanderait de sortir les cartes de coût 4–5 de la cible 45–55 % par le haut :
une cible contre une autre.

**Décision qui revient à Guillaume** : assouplir la cible, ou redéfinir les
decks « par courbe » du §6.3 (par exemple contrôle = coûts 2 à 5, avec une
poignée de cartes bon marché pour tenir le début de partie).

### 3. La petite robe noire à chaîne (55,7 %) — un effet plus cher que le plafond

Carte légendaire de coût 5, effet à la pose : *renvoyer un objet adverse dans
la main de son propriétaire* **et** *+1 d'attaque à tous vos objets*. Elle a
été retouchée trois fois de suite par la règle 4 (4/4 → 3/5 → 2/6 → 1/7) : la
mesure n'a bougé que de 56,4 % à 55,7 %. C'est logique — sa puissance est dans
son texte, pas dans ses stats.

La règle 4 demande d'abord `prix + 1`. Elle est **bloquée** : le prix de son
effet est déjà à 4, le plafond du §5.2 pour une légendaire (et du test de
garde). La branche de repli (1 attaque → 1 PV) est allée jusqu'à 1 d'attaque ;
la règle renvoie alors à « monter le coût de 1 », impossible à 5, le maximum du
domaine. Toutes les branches sont fermées.

Le diagnostic par famille est net : 59,6 % en decks aléatoires, 57,3 % en
bicolores, 41,5 % en decks par courbe — c'est bien la carte qui est trop forte,
et c'est le tirage « par courbe » qui masque la moitié de l'écart.

**Décision qui revient à Guillaume** : relever le plafond de prix d'un effet
légendaire à 5 (§5.2), ou n'accorder qu'**une** action à cette carte au lieu de
deux (le §4.3 l'autorise : « les légendaires **au plus** deux »).

### 4. Gutenberg à 44,3 % — le même effet de bord, à 0,5 point

Feuillet de Gutenberg, légendaire de coût 4, *à la pose, piochez 2 cartes*.
Buffé deux fois par la règle 5 (prix 3 → 2 → 1, le plancher). À coût 4,
légendaire, prix 1, son budget vaut 9 points ; les PV plafonnant à 8 et
l'attaque à 6, cela fait **six** répartitions légales, et **les six** ont été
mesurées à la graine 101, sur 20 000 parties chacune :

| Stats | 1/8 | 2/7 | 3/6 | **4/5** | 5/4 | 6/3 |
|---|---|---|---|---|---|---|
| Victoires | 37,4 % | 41,0 % | 43,5 % | **44,3 %** | 44,4 % | 43,2 % |

La courbe monte jusqu'à un plateau à 44,3-44,4 % (4/5 et 5/4) puis redescend :
**aucune des six répartitions légales n'atteint 45 %**, et l'écart entre les
deux meilleures (0,1 point) est dans le bruit de mesure. Par
famille : 46,4 % en aléatoire, 47,3 % en bicolore, **35,8 %** par courbe — le
même effet de bord qu'au point 2, sur une carte de coût 4. La carte est dans la
cible dès qu'on sort de la famille « par courbe » (et elle y est déjà à la
graine 303). Piocher 2 cartes vaut peu dans un format où la ressource rare est
l'énergie et la place d'étal, pas la carte en main : le prix 1 est encore trop
cher, mais c'est le plancher du §5.2.

### 5. Nuls + fatigue (2,9 à 3,1 %) — révélé par la revue finale, pas par une retouche

Jusqu'à la revue finale, `epuisee` (le garde-fou de boucle, 60 manches) était
la seule chose mesurée sous ce nom, et il n'a jamais été atteint (0,0 % aux
trois graines, max observé 21 manches) : la cible « nuls + épuisées < 2 % »
semblait donc tenue depuis la campagne 0. Mais une partie peut aussi se
terminer par la **pioche épuisée** : un deck de 20 cartes, une pioche par tour
après la main de départ, une partie qui dure en moyenne 9,2 manches (18 tours
de joueur) — un joueur peut légitimement vider son deck avant la fin, et
chaque pioche manquée suivante inflige 1, 2, 3… dégâts à sa vitrine jusqu'à
zéro. Ce n'était mesuré nulle part avant que `ResultatPartie.fatigue`
n'existe : le taux réel, 2,9 à 3,1 % selon la graine, dépasse la cible de 2 %.

Ce n'est pas un bug — une partie tranchée par la pioche épuisée est une fin de
partie légitime, prévue par les règles du §3.2, pas un artefact du moteur. La
cible de 2 % (§6.4) a très probablement été écrite en pensant au garde-fou de
boucle (un vrai défaut, s'il se produisait) plutôt qu'à ce mode de fin normal.
Aucune règle du plan ne prévoit de retouche pour ce cas.

**Décision qui revient à Guillaume** : assouplir la cible « nuls + fatigue »,
ou juger que 3 % de parties tranchées par l'épuisement du deck est un problème
de rythme (deck trop court, ou partie trop longue pour lui) justifiant une
retouche du §3 — hors du périmètre carte par carte de ce rapport.

## Journal des versions de cartes

| Version | Itération | Campagne | Retouches |
|---|---|---|---|
| v1 | — | 0 et 1 | première version au budget (tâche 8) |
| v1 | 1 | 1 | compensation du second joueur (règle 1), aucune carte |
| v2 | 2 | 2 | 6 cartes, règle 6 (expérience décisive : la règle échoue) |
| v2 | 3 | 3 | aucune carte — retouche d'IA sur `phasePose` |
| v3 | 4 | 4 | 6 cartes, règles 4 et 5 |
| v4 | 5 | 5 | 4 cartes, règles 4 et 5 |
| v5 | 6 | 6 | 2 cartes, règles 4 et 5 |
| v6 | 7 | 7 | 2 cartes, règles 4 et 5 |

**Vocabulaire en réserve** : les actions `volMotCle` et `energie` (types §4.3)
existent dans le moteur et le type `Action`, mais aucune des 50 cartes de v6
ne les utilise — elles sont volontairement gardées de côté pour un futur
chantier de cartes jouables (au-delà du set de démonstration actuel), pas
oubliées ni mortes.

## Outils de mesure

| Outil | Ce qu'il mesure | Lancement |
|---|---|---|
| `scripts/duel-campagne.ts` (versionné) | la campagne du §6.4 | `npm run duel:campagne -- --graine <n> --parties 20000` |
| `diag-familles.ts` | par famille de decks (aléatoire / bicolore / par courbe) : avantage du premier joueur, durée, taux de victoire moyen par palier de coût, et trois cartes suivies | `npx tsx <bloc-notes>/diag-familles.ts 12000` |
| `diag-miroir.ts` | partie en miroir (même deck et même profil des deux côtés) : avantage du premier joueur, par profil et par durée de partie | `npx tsx <bloc-notes>/diag-miroir.ts` |
| `diag-repartitions.sh` | balaye les répartitions attaque/PV d'une carte à budget constant, en vérifiant le test de garde à chaque pas et en remettant `cartesDuel.ts` de git à la fin | `<bloc-notes>/diag-repartitions.sh gutenberg_feuillet 101 1/8 2/7 3/6 4/5 5/4 6/3` |

Les trois outils de diagnostic vivent dans le bloc-notes de la session
(`/private/tmp/claude-501/-Users-guillaume-dev-Projet-Broc-V2/90ced555-b692-4fb6-9f12-e71c12abccef/scratchpad`),
avec les sorties brutes de toutes les campagnes (`c0.md` … `c7.md`, `v101.md`,
`v202.md`, `v303.md`). Ils sont volontairement hors dépôt : ce sont des
instruments de la boucle d'équilibrage, pas du code du jeu. Chaque campagne,
elle, se reproduit à l'identique depuis le dépôt à sa graine.
