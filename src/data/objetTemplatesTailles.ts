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
  "mus.harmonica_hohner": "XS",
  "mus.diapason_acier": "XS",
  "mus.metronome_wittner": "XS",
  "mus.partition_chopin": "XS",
  "mus.partition_satie": "XS",
  "mus.cd_nirvana_in_utero": "XS",
  "mus.cd_daft_punk_homework": "XS",
  "mus.cd_radiohead_ok": "XS",
  "mus.cd_noir_desir_666": "XS",
  "mus.cd_iam_ecole": "XS",
  "mus.k7_audio_mixtape_90s": "XS",
  "mus.walkman_sony_wm": "XS",
  // Vinyles : pochette 33T → XS
  "mus.vinyle_pink_floyd_wall": "XS",
  "mus.vinyle_telephone_dure_limite": "XS",
  "mus.33tours_jazz_inconnu": "XS",
  "mus.vinyle_brel_amsterdam": "XS",
  "mus.vinyle_brassens_jeanne": "XS",
  "mus.vinyle_aznavour_emmenez": "XS",
  "mus.vinyle_piaf_non": "XS",
  "mus.vinyle_beatles_abbey_road": "XS",
  "mus.vinyle_stones_let_bleed": "XS",
  "mus.vinyle_bowie_ziggy": "XS",
  "mus.vinyle_zeppelin_iv": "XS",
  "mus.vinyle_dylan_blonde": "XS",
  "mus.vinyle_indochine_aventurier": "XS",
  "mus.vinyle_mylene_farmer_ainsi": "XS",
  "mus.vinyle_renaud_morgane": "XS",
  "mus.vinyle_hallyday_rock_memphis": "XS",
  "mus.vinyle_sardou_lacs": "XS",
  "mus.vinyle_goldman_envole": "XS",
  "mus.vinyle_cabrel_hors_saison": "XS",
  "mus.vinyle_gainsbourg_melody": "XS",
  "mus.vinyle_higelin_alertez": "XS",
  "mus.vinyle_balavoine_aziza": "XS",
  "mus.vinyle_souchon_foule": "XS",
  "mus.vinyle_beatles_dedicace": "XS",
  "mus.vinyle_stones_test_pressing": "XS",
  // Moyens
  "mus.radio_cassette_sanyo": "S",
  "mus.flute_traversiere_yamaha": "S",
  "mus.ukulele_soprano": "S",
  "mus.violon_atelier_mirecourt": "S",
  "mus.boite_musique_mecanique": "S",
  // Grands
  "mus.tourne_disque_thorens": "L",
  "mus.guitare_classique_ancienne": "L",
  "mus.guitare_gibson_les_paul": "L",
  "mus.guitare_fender_strato_70s": "L",
  "mus.banjo_gibson_5cordes": "L",
  "mus.accordeon_paolo_soprani": "L",
  "mus.clarinette_buffet": "L",
  "mus.saxophone_selmer_mark_vi": "L",
  "mus.theremine_moog": "L",
  "mus.synthe_moog_minimoog": "L",
  // Énorme
  "leg.mus.piano_pleyel_concert": "XL",

  // ============================================================
  // JEUX & LOISIRS
  // ============================================================
  "jx.billes_verre_lot": "XS",
  "jx.figurine_kinder_lot": "XS",
  "jx.magic_lot_revised": "XS",
  "jx.lot_yu_gi_oh": "XS",
  "jx.lot_pokemon_jungle": "XS",
  "jx.cartes_pokemon_1ere_edition": "XS",
  "jx.cartes_pokemon_japan_holo": "XS",
  "jx.figurine_star_wars_kenner_78": "XS",
  "jx.figurine_starwars_dark_vador_kenner": "XS",
  "jx.figurine_he_man_origines": "XS",
  "jx.figurine_smurfs_lot": "XS",
  "jx.yo_yo_duncan_alu": "XS",
  "jx.soldat_plomb_napoleonien": "XS",
  "jx.petite_armee_plomb": "XS",
  "jx.cartouche_chrono_trigger": "XS",
  "jx.barbie_seventies": "XS",
  "jx.dominos_os": "S",
  "jx.backgammon_cuir": "S",
  "jx.peluche_ours_steiff": "S",
  "jx.peluche_steiff_ours_1920": "S",
  "jx.poupee_porcelaine_ancienne": "S",
  "jx.lego_pirate_complete": "S",
  "jx.train_marklin_ho": "S",
  "jx.console_neogeo_aes": "S",
  "jx.borne_arcade_mini": "M",
  "jx.flipper_gottlieb_60s": "L",

  // ============================================================
  // LIVRES & PAPETERIE
  // ============================================================
  // Livres seuls — XS
  "lv.monte_cristo": "XS",
  "lv.tintin_lune": "XS",
  "lv.bovary_relie": "XS",
  "lv.zola_germinal_xixe": "XS",
  "lv.camus_etranger": "XS",
  "lv.sartre_nausee": "XS",
  "lv.colette_cheri_relie": "XS",
  "lv.duras_amant": "XS",
  "lv.asterix_gaulois_reimpr": "XS",
  "lv.asterix_zizanie": "XS",
  "lv.lucky_luke_dalton": "XS",
  "lv.spirou_marsupilami": "XS",
  "lv.bd_blueberry_lieutenant": "XS",
  "lv.bd_corto_maltese": "XS",
  "lv.bd_petit_nicolas": "XS",
  "lv.tintin_calculus": "XS",
  "lv.almanach_vermot": "XS",
  "lv.dictionnaire_robert_70s": "XS",
  "lv.atlas_michelin_60s": "XS",
  "lv.livre_recettes_curnonsky": "XS",
  "lv.cahier_ecolier_seyes": "XS",
  "lv.encrier_porcelaine_xixe": "XS",
  "lv.plume_sergent_major": "XS",
  "lv.stylo_waterman_vintage": "XS",
  "lv.stylo_montblanc_meisterstuck": "XS",
  "lv.papier_filigrane_lot": "XS",
  "lv.album_photos_velours": "XS",
  "lv.eo_petit_prince_1943": "XS",
  "lv.tintin_or_noir_1950": "XS",
  "lv.asterix_gaulois_eo_1961": "XS",
  "lv.lucky_luke_eo_1947": "XS",
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
  "mo.bague_cartier_trinity": "XS",
  "mo.boucles_oreilles_perles": "XS",
  "mo.epingle_cravate_strass": "XS",
  "mo.montre_lip_dauphine": "XS",
  "mo.montre_yema_superman": "XS",
  "mo.montre_seiko_5_vintage": "XS",
  "mo.bracelet_jonc_argent": "XS",
  "mo.collier_perles_culture": "XS",
  "mo.cravate_charvet_soie": "XS",
  "mo.cravate_club_anglaise": "XS",
  "mo.foulard_soie_motifs": "XS",
  "mo.carre_hermes_recent": "XS",
  "mo.gants_cuir_femme": "XS",
  "mo.eventail_nacre": "XS",
  "mo.casquette_gavroche_60s": "XS",
  "mo.portefeuille_lv_monogram": "XS",
  // Chapeaux, ceintures, plié
  "mo.chapeau_feutre_50s": "S",
  "mo.chapeau_panama_montecristi": "S",
  "mo.chapeau_borsalino": "S",
  "mo.ceinture_cuir_laiton": "XS",
  "mo.ceinture_hermes_h_recente": "XS",
  "mo.ombrelle_dentelle_xixe": "S",
  // Vêtements (pliés)
  "mo.veste_jean_delavee": "S",
  "mo.blouson_cuir_vintage": "S",
  "mo.robe_70s_disco": "S",
  "mo.robe_80s_epaulettes": "S",
  "mo.robe_50s_pinup": "S",
  "mo.robe_60s_mini": "S",
  "mo.jupe_plissee_60s": "S",
  "mo.pantalon_pattes_eph": "S",
  "mo.chemise_lacoste_originale": "S",
  "mo.polo_lacoste_pique": "S",
  "mo.trench_burberry_classique": "M",
  "mo.manteau_lainage_60s": "M",
  // Chaussures
  "mo.chaussures_richelieu_cuir": "S",
  "mo.escarpins_seconde_main": "S",
  "mo.bottes_camperos_cuir": "S",
  // Sacs
  "mo.sac_seventies_cuir": "S",
  "mo.sac_lancel": "S",
  "mo.sac_hermes_kelly": "S",
  "mo.sac_chanel_classic": "S",

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
  "art.sculpture_rodin_planche": "S",

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
  "br.etabli_compagnonnage_xixe": "XL",
  "br.tour_a_bois_atelier": "XL",
  "leg.br.tour_holtzapffel_xixe": "XL",
};
