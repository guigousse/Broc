import type { TailleObjet } from "@/types/game";

/**
 * Overrides explicites de taille par templateId.
 * Tout ce qui n'est pas listé tombe sur le défaut par catégorie.
 *
 * Repères (côté coffre = 1 unité) :
 *   XS ≈ tient dans une main fermée (clé, bijou, billes, cassette, CD)
 *   S  ≈ tient dans une main ouverte (livre, tasse, vinyle, petit cadre)
 *   M  ≈ deux mains (lampe, radio, machine à écrire, vinyle 33T encadré)
 *   L  ≈ encombrant à porter (chaise, lampe sur pied, instrument à cordes)
 *   XL ≈ plus grand que soi (piano, armoire, tour à métaux)
 */
export const TAILLES_OVERRIDE: Record<string, TailleObjet> = {
  // ============================================================
  // MUSIQUE
  // ============================================================
  // Petits — instruments à vent, accessoires, supports physiques
  "mus.harmonica_chromatique_de_bluesman": "XS",
  "mus.diapason_acier": "XS",
  "mus.metronome_mecanique_a_pyramide": "XS",
  "mus.partition_chopin": "XS",
  "mus.partition_satie": "XS",
  "mus.coffret_cd_grunge_beatitude": "XS",
  "mus.cd_bad_luck_des_punkbot": "XS",
  "mus.cd_ok_ai_frequencies": "XS",
  "mus.cd_club_67_souhait_obscur": "XS",
  "mus.cd_le_micro_argente_nou": "XS",
  "mus.k7_audio_mixtape_90s": "XS",
  "mus.baladeur_a_cassette_annees_80": "XS",
  // Vinyles : pochette 33T → XS
  "mus.vinyle_le_mur_des_flamants_roses": "XS",
  "mus.vinyle_grand_max_des_combines": "XS",
  "mus.33tours_jazz_inconnu": "XS",
  "mus.vinyle_stevranos_vive_la_fet_a": "XS",
  "mus.vinyle_victor_de_la_brasse_bibelot": "XS",
  "mus.vinyle_paul_nazamour_demain_enfin": "XS",
  "mus.vinyle_judith_loiseau_oui_je_regrette_tout": "XS",
  "mus.vinyle_des_scarabees_passage_cloute": "XS",
  "mus.vinyle_des_trolling_sons_bet_it_heal": "XS",
  "mus.vinyle_du_david_bah_oui_comete": "XS",
  "mus.vinyle_du_led_guirlande_escalator_du_paradis": "XS",
  "mus.vinyle_du_ryan_sober_blonde_ou_brune": "XS",
  "mus.vinyle_new_wave_l_explorateur": "XS",
  "mus.vinyle_de_la_rousse_mystique_ainsi_soit_elle": "XS",
  "mus.vinyle_renaut_megane_sans_toit": "XS",
  "mus.vinyle_hollyday_caillou_a_woippy": "XS",
  "mus.vinyle_les_pates_carbonnara_michele_sardaigna": "XS",
  "mus.vinyle_silverguy_moi_au_volant": "XS",
  "mus.vinyle_francois_cabriol_hors_piste": "XS",
  "mus.vinyle_concept_laga_jagavaganaigase_du_dandy_a": "XS",
  "mus.vinyle_classique_incontournable_classique": "XS",
  "mus.vinyle_miguel_pavane_la_zizanie": "XS",
  "mus.vinyle_whale_song_son_terrestre_n1": "XS",
  "mus.vinyle_des_scarabees_dedicace_album_solo": "XS",
  "mus.test_pressing_des_trolling_sons": "XS",
  // Moyens
  "mus.radio_cassette_annees_80": "S",
  "mus.flute_traversiere_argentee": "S",
  "mus.ukulele_soprano": "S",
  "mus.violon_atelier_mirecourt": "S",
  "mus.boite_musique_mecanique": "S",
  // Grands
  "mus.tourne_disque_a_courroie_vintage": "L",
  "mus.guitare_classique_ancienne": "L",
  "mus.guitare_electrique_a_corps_plein_modele_legend": "L",
  "mus.guitare_electrique_a_trois_micros_solid_body_1": "L",
  "mus.banjo_5_cordes_ancien": "L",
  "mus.accordeon_italien_signe": "L",
  "mus.clarinette_en_ebene": "L",
  "mus.saxophone_alto_professionnel": "L",
  "mus.theremine_a_antennes": "L",
  "mus.synthetiseur_analogique_mini_1970": "L",
  // Énorme
  "leg.mus.piano_a_queue_de_concert_1900": "XL",

  // ============================================================
  // JEUX & LOISIRS
  // ============================================================
  "jx.billes_verre_lot": "XS",
  "jx.lot_de_figurines_d_ufs_surprises": "XS",
  "jx.lot_de_cartes_l_assemblee_des_mages": "XS",
  "jx.lot_de_cartes_de_yo_hi_ah": "XS",
  "jx.cartes_pocket_monster_set_jungle": "XS",
  "jx.cartes_pocket_monster_1ere_edition": "XS",
  "jx.cartes_pocket_monster_holographiques_japonaise": "XS",
  "jx.figurine_de_guerre_galactique_1978": "XS",
  "jx.figurine_de_dark_father_1977": "XS",
  "jx.figurine_du_capitaine_muscle_origines": "XS",
  "jx.lot_de_figurines_de_spountch": "XS",
  "jx.yo_yo_duncan_alu": "XS",
  "jx.soldat_plomb_napoleonien": "XS",
  "jx.petite_armee_plomb": "XS",
  "jx.cartouche_gachette_du_temps_rpg_16_bit": "XS",
  "jx.poupee_barberousse_annees_70": "XS",
  "jx.dominos_os": "S",
  "jx.backgammon_cuir": "S",
  "jx.ours_en_peluche_mohair_recent": "S",
  "jx.ours_en_peluche_mohair_annees_1920": "S",
  "jx.poupee_porcelaine_ancienne": "S",
  "jx.grand_set_de_briques_pirates_complet": "S",
  "jx.train_electrique_ho_de_precision": "S",
  "jx.console_d_arcade_domestique_neo": "S",
  "jx.borne_arcade_mini": "M",
  "jx.flipper_a_plateau_annees_60": "L",

  // ============================================================
  // LIVRES & PAPETERIE
  // ============================================================
  // Livres seuls — XS
  "lv.monte_cristo": "XS",
  "lv.les_aventures_de_titou_cap_sur_la_lune": "XS",
  "lv.bovary_relie": "XS",
  "lv.zola_germinal_xixe": "XS",
  "lv.camus_etranger": "XS",
  "lv.sartre_nausee": "XS",
  "lv.colette_cheri_relie": "XS",
  "lv.duras_amant": "XS",
  "lv.le_petit_moustachu_reimpression": "XS",
  "lv.le_petit_moustachu_zbeul_au_village": "XS",
  "lv.funky_look_les_freres_bandots": "XS",
  "lv.roupille_et_queue_longue": "XS",
  "lv.le_lieutenant_du_far_west": "XS",
  "lv.le_marin_reveur_la_ballade": "XS",
  "lv.les_histoires_du_petit_ecolier": "XS",
  "lv.les_aventures_de_titou_l_affaire_du_professeur": "XS",
  "lv.almanach_vermot": "XS",
  "lv.dictionnaire_robert_70s": "XS",
  "lv.atlas_michelin_60s": "XS",
  "lv.livre_recettes_curnonsky": "XS",
  "lv.cahier_ecolier_seyes": "XS",
  "lv.encrier_porcelaine_xixe": "XS",
  "lv.plume_sergent_major": "XS",
  "lv.stylo_waterman_vintage": "XS",
  "lv.stylo_plume_haut_de_gamme_a_l_etoile_blanche_d": "XS",
  "lv.papier_filigrane_lot": "XS",
  "lv.album_photos_velours": "XS",
  "lv.conte_de_l_aviateur_et_de_l_enfant_roi_edition": "XS",
  "lv.les_aventures_de_titou_petrole_1950": "XS",
  "lv.le_petit_moustachu_edition_originale_1961": "XS",
  "lv.funky_look_premier_album_1947": "XS",
  "lv.proust_swann_dedicace": "XS",
  "lv.livre_heures_xviie": "XS",
  "lv.encrier_argent_xixe": "XS",
  "lv.cartes_postales_anciennes": "XS",
  "lv.cartes_postales_belle_epoque_rare": "XS",
  "lv.atlas_diderot_planche": "XS",
  // Lots et magazines empilés → S
  "lv.paris_match_70s": "S",
  "lv.miserables_pleiade": "S",
  "lv.rouge_noir_coffret": "S",
  "lv.proust_recherche_folio": "S",
  "lv.simone_beauvoir_deuxieme": "S",
  "lv.encyclopedie_quillet_lot": "S",
  "lv.larousse_universel_2vol": "S",
  "lv.livres_scolaires_anciens": "S",
  "lv.magazine_geo_lot": "S",
  "lv.magazine_lui_60s": "S",
  "lv.bible_olivetan_xvie": "S",
  "lv.hugo_legende_relie_cuir": "S",
  "lv.coffret_loupes_lecture": "S",
  // Encadrés / lampes
  "lv.carte_marine_xixe": "M",
  "lv.lampe_huile_biblio": "S",

  // ============================================================
  // MODE
  // ============================================================
  // Tout petit — bijoux & accessoires
  "mo.broche_pinup_strass": "XS",
  "mo.broche_camee_xixe": "XS",
  "mo.broche_emaillee_artdeco": "XS",
  "mo.bague_chevaliere_argent": "XS",
  "mo.bague_a_trois_anneaux_d_or_occasion": "XS",
  "mo.boucles_oreilles_perles": "XS",
  "mo.epingle_cravate_strass": "XS",
  "mo.montre_doree_vintage": "XS",
  "mo.montre_de_plongee_vintage": "XS",
  "mo.montre_automatique_vintage": "XS",
  "mo.bracelet_jonc_argent": "XS",
  "mo.collier_perles_culture": "XS",
  "mo.cravate_en_soie_de_luxe": "XS",
  "mo.cravate_club_anglaise": "XS",
  "mo.foulard_soie_motifs": "XS",
  "mo.carre_de_soie_talaria_recent": "XS",
  "mo.gants_cuir_femme": "XS",
  "mo.eventail_nacre": "XS",
  "mo.casquette_gavroche_60s": "XS",
  "mo.portefeuille_polis_futton": "XS",
  // Chapeaux, ceintures, plié
  "mo.chapeau_feutre_50s": "S",
  "mo.chapeau_panama_montecristi": "S",
  "mo.chapeau_de_feutre_italien_a_large_bord": "S",
  "mo.ceinture_cuir_laiton": "XS",
  "mo.ceinture_talaria": "XS",
  "mo.ombrelle_en_dentelle_xixe": "S",
  // Vêtements (pliés)
  "mo.veste_jean_delavee": "S",
  "mo.blouson_cuir_vintage": "S",
  "mo.robe_70s_disco": "S",
  "mo.robe_80s_epaulettes": "S",
  "mo.robe_50s_pinup": "S",
  "mo.robe_60s_mini": "S",
  "mo.jupe_plissee_60s": "S",
  "mo.pantalon_pattes_eph": "S",
  "mo.chemise_golgothor_70s": "S",
  "mo.polo_golgothor": "S",
  "mo.trench_coat_berrybeurre": "M",
  "mo.manteau_lainage_60s": "M",
  // Chaussures
  "mo.chaussures_richelieu_cuir": "S",
  "mo.escarpins_seconde_main": "S",
  "mo.bottes_camperos_cuir": "S",
  // Sacs
  "mo.sac_seventies_cuir": "S",
  "mo.sac_a_main_cancel": "S",
  "mo.sac_a_main_talaria": "S",
  "mo.sac_chaine": "S",

  // ============================================================
  // MAISON
  // ============================================================
  // Petits objets
  "ma.figurine_porcelaine": "XS",
  // Bibliothèque, mobilier
  "ma.bibliotheque_louis_philippe": "L",
  "ma.miroir_psyche": "L",
  "ma.miroir_dore_fronton": "L",
  "ma.miroir_baroque_petit": "M",
  "ma.gueridon_salon": "L",
  "ma.commode_louis_xv_marqueterie": "XL",

  // ============================================================
  // OBJETS D'ART
  // ============================================================
  "art.petite_sculpture_ivoire": "XS",
  "art.petite_sculpture_rondin_planche": "S",

  // ============================================================
  // BRICOLAGE
  // ============================================================
  // Petits outils
  "br.cle_anglaise_old": "XS",
  "br.cle_a_molette_ancienne": "XS",
  "br.marteau_arracheur": "XS",
  "br.marteau_horloger": "XS",
  "br.marteau_menuisier": "XS",
  "br.masse_fer_forge": "XS",
  "br.scie_arc_charpentier": "S",
  "br.compas_charpentier_xixe": "XS",
  "br.equerre_metallique": "XS",
  "br.metre_pliant_bois_2m": "XS",
  "br.fer_a_souder_vintage": "XS",
  "br.tariere_charpentier": "S",
  "br.tenailles_forgeron": "XS",
  "br.lot_limes_charpentier": "XS",
  "br.lot_vis_clous_anciens": "XS",
  "br.ciseaux_a_bois_lot": "XS",
  "br.gouge_sculpteur_lot": "XS",
  "br.mortaisier_acier": "S",
  "br.etau_de_table_regulier": "S",
  "br.balance_romaine_fonte": "S",
  // Boîtes et coffrets
  "br.boite_outils_complete": "S",
  "br.boite_quincaillerie_metal": "S",
  "br.caisse_outils_chene": "M",
  "br.coffret_dessin_industriel": "S",
  "br.coffret_ebeniste_xixe": "M",
  // Gros
  "br.lampe_baladeuse_atelier": "S",
  "br.enclume_petit_modele": "L",
  "br.enclume_grande_forge": "L",
  "br.etabli_pliant_ancien": "L",
  "br.etabli_chene_atelier": "L",
  "br.etabli_de_compagnonnage_xixe": "XL",
  "br.tour_a_bois_atelier": "XL",
  "leg.br.tour_a_metaux_d_orfevre_de_prestige_xixe": "XL",
};
