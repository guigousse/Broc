import type { CategorieObjet, Rarete, TailleObjet } from "@/types/game";
import { LEGENDAIRES } from "@/data/legendaires";
import { UNIQUES } from "@/data/uniques";
import { TAILLES_OVERRIDE } from "@/data/objetTemplatesTailles";
import { QUETES_PRINCIPALES } from "@/data/quetesPrincipales";

export interface ObjetTemplate {
  templateId: string;
  nom: string;
  categorie: CategorieObjet;
  rarete: Rarete;
  /** Valeur de référence si "Très bon" */
  prixRefBase: number;
  /** Si vrai, ne peut être possédé qu'une fois par partie. */
  unique?: boolean;
  /** Taille (XS→XL). Si omis, default par catégorie via `tailleDe()`. */
  taille?: TailleObjet;
}

type Row = [templateId: string, nom: string, prixRefBase: number];

function section(
  categorie: CategorieObjet,
  rarete: Rarete,
  rows: Row[],
): ObjetTemplate[] {
  return rows.map(([templateId, nom, prixRefBase]) => ({
    templateId,
    nom,
    categorie,
    rarete,
    prixRefBase,
  }));
}

// ============================================================
// MUSIQUE — 40 communs + 12 rares
// ============================================================
const MUSIQUE_C: Row[] = [
  ["mus.vinyle_des_loups_des_steppes_bark_to_be_free", "Vinyle des Loups des Steppes — 'Bark to Be Free'", 45],
  ["mus.vinyle_grand_max_des_combines", "Vinyle Babylone — 'Sur mon île'", 20],
  ["mus.33tours_jazz_1", "33 tours de jazz inconnu", 8],
  ["mus.coffret_cd_grunge_beatitude", "Coffret CD grunge 'Béatitude'", 18],
  ["mus.harmonica_chromatique_de_bluesman", "Harmonica chromatique de bluesman", 35],
  ["mus.vinyle_stevranos_vive_la_fet_a", "Vinyle Stevranos 'Vive la fêt(a)'", 22],
  ["mus.vinyle_victor_de_la_brasse_bibelot", "Vinyle Victor de la Brasse 'Bibelot'", 24],
  ["mus.vinyle_paul_nazamour_demain_enfin", "Vinyle Paul Nazamour 'Demain enfin'", 18],
  ["mus.vinyle_judith_loiseau_oui_je_regrette_tout", "Vinyle Judith Loiseau 'Oui, je regrette tout'", 28],
  ["mus.vinyle_des_scarabees_passage_cloute", "Vinyle des Scarabées — 'Bet it Heal'", 55],
  ["mus.vinyle_des_trolling_sons_bet_it_heal", "Vinyle des Trolling Sons — 'Unsatisfying'", 50],
  ["mus.vinyle_du_david_bah_oui_comete", "Vinyle du David — 'Bah oui'", 60],
  ["mus.vinyle_free_robot_des_punkbot", "Vinyle 'Free Robot' des PunkBot", 45],
  ["mus.33tours_jazz_2", "33 tours de jazz (II)", 40],
  ["mus.33tours_jazz_3", "33 tours de jazz (III)", 24],
  ["mus.vinyle_de_la_rousse_mystique_ainsi_soit_elle", "Vinyle de la Rousse Mystique — 'Ainsi soit-elle'", 26],
  ["mus.vinyle_renaut_megane_sans_toit", "Vinyle Rénaut 'Mégane sans toit'", 18],
  ["mus.vinyle_hollyday_caillou_a_woippy", "Vinyle Hollyday 'Caillou à Woippy'", 22],
  ["mus.vinyle_les_pates_carbonnara_michele_sardaigna", "Vinyle 'Les Pâtes Carbonnara' — Michele Sardaigna", 20],
  ["mus.vinyle_silverguy_moi_au_volant", "Vinyle Silverguy 'Moi au volant'", 16],
  ["mus.vinyle_francois_cabriol_hors_piste", "Vinyle François Cabriol 'Hors-Piste'", 18],
  ["mus.vinyle_concept_laga_jagavaganaigase_du_dandy_a", "Vinyle concept — 'Laga Jagavaganaigase' du Dandy à la Gitane", 70],
  ["mus.vinyle_classique_incontournable_classique", "Vinyle 'Classique incontournable' — Classique", 22],
  ["mus.vinyle_miguel_pavane_la_zizanie", "Vinyle Miguel Pavane 'La Zizanie'", 18],
  ["mus.vinyle_whale_song_son_terrestre_n1", "Vinyle 'Whale Song' — Son terrestre n°1", 14],
  ["mus.cd_bad_luck_des_punkbot", "CD 'Bad Luck' des PunkBot", 14],
  ["mus.cd_ok_ai_frequencies", "CD 'OK AI' — Frequencies", 16],
  ["mus.cd_club_67_souhait_obscur", "CD 'Club 67' — Souhait Obscur", 12],
  ["mus.cd_le_micro_argente_nou", "CD 'Le Micro Argenté' — Nou", 22],
  ["mus.k7_audio_mixtape_90s", "K7 mixtape années 90", 8],
  ["mus.baladeur_a_cassette_annees_80", "Baladeur à cassette années 80", 40],
  ["mus.radio_cassette_annees_80", "Radio-cassette années 80", 30],
  ["mus.tourne_disque_a_courroie_vintage", "Tourne-disque à courroie vintage", 90],
  ["mus.partition_chopin", "Partitions de Chopin reliées", 25],
  ["mus.partition_satie", "Partitions Erik Satie", 18],
  ["mus.metronome_mecanique_a_pyramide", "Métronome mécanique à pyramide", 35],
  ["mus.diapason_acier", "Diapason en acier d'orchestre", 12],
  ["mus.flute_traversiere_argentee", "Flûte traversière argentée", 80],
  ["mus.clarinette_en_ebene", "Clarinette en ébène", 90],
  ["mus.ukulele_soprano", "Ukulélé soprano en koa", 40],
];

const MUSIQUE_R: Row[] = [
  ["mus.guitare_classique_ancienne", "Vieille guitare classique", 120],
  ["mus.vinyle_collector_de_vagabond_horizon_celeste", "Vinyle collector de Vagabond — 'Horizon Céleste'", 280],
  ["mus.test_pressing_des_trolling_sons", "Test pressing des Trolling Sons", 200],
  ["mus.guitare_electrique_a_corps_plein_modele_legend", "Guitare électrique à corps plein, modèle légende (1980s)", 450],
  ["mus.guitare_electrique_a_trois_micros_solid_body_1", "Guitare électrique à trois micros, solid body (1970s)", 380],
  ["mus.accordeon_italien_signe", "Accordéon italien signé", 200],
  ["mus.banjo_5_cordes_ancien", "Banjo 5 cordes ancien", 240],
  ["mus.violon_atelier_mirecourt", "Violon d'atelier — Mirecourt XIXe", 320],
  ["mus.theremine_a_antennes", "Thérémine à antennes", 280],
  ["mus.synthetiseur_analogique_mini_1970", "Synthétiseur analogique 'Mini' (1970)", 600],
  ["mus.boite_musique_mecanique", "Boîte à musique mécanique à cylindre", 180],
  ["mus.saxophone_alto_professionnel", "Saxophone alto professionnel", 700],
];

// ============================================================
// JEUX & LOISIRS — 40 communs + 12 rares
// ============================================================
const JEUX_C: Row[] = [
  ["jx.cartouche_le_plombier_sauteur_8_bit", "Cartouche 'Le Plombier Sauteur' (8-bit)", 80],
  ["jx.manette_megadrive", "Manette de console 16-bit", 35],
  ["jx.playbox_pocket", "PlayBox Pocket", 90],
  ["jx.jeu_foxy_crush_32_bit", "Jeu 'Foxy Crush' (32-bit)", 40],
  ["jx.risk_1992", "Jeu 'Krise' (1992)", 25],
  ["jx.cartouche_la_legende_de_solda_8_bit", "Cartouche 'La Légende de Solda' (8-bit)", 60],
  ["jx.cartouche_bluebot_8_bit", "Cartouche 'Bluebot' (8-bit)", 45],
  ["jx.cartouche_turbo_herisson_16_bit", "Cartouche 'Turbo Hérisson' (16-bit)", 30],
  ["jx.cartouche_street_castagne_ii_16_bit", "Cartouche 'Street Castagne II' (16-bit)", 38],
  ["jx.super_console_16_bit_complete", "Super Console 16-bit complète", 95],
  ["jx.console_familiale_8_bit_japonaise", "Console familiale 8-bit japonaise", 110],
  ["jx.console_de_salon_a_cartouches_annees_70", "Console de salon à cartouches (années 70)", 85],
  ["jx.console_128_bit_reve_complete", "Console 128-bit 'Rêve' complète", 70],
  ["jx.console_de_salon_128_bit_avec_jeux", "Console de salon 128-bit avec jeux", 60],
  ["jx.manette_vibraduo", "Manette Vibraduo", 18],
  ["jx.manette_tetrapod_64_bit", "Manette Tetrapod (64-bit)", 25],
  ["jx.jeu_le_manoir_du_mal_32_bit", "Jeu 'Le Manoir du Mal' (32-bit)", 35],
  ["jx.jeu_engrenage_de_metal_infiltration_32_bit", "Jeu 'Engrenage de Métal' — infiltration (32-bit)", 40],
  ["jx.jeu_d_aventure_japonais_128_bit", "Jeu d'aventure japonais (128-bit)", 60],
  ["jx.jeu_solda_flute_temporelle_aventure_3d_64_bit", "Jeu 'Solda — Flûte temporelle' (aventure 3D 64-bit)", 55],
  ["jx.lot_de_cartes_l_assemblee_des_mages", "Lot de cartes 'L'Assemblée des Mages'", 80],
  ["jx.lot_de_cartes_de_yo_hi_ah", "Lot de cartes de Yo-Hi-ah", 35],
  ["jx.cartes_pocket_monster_set_jungle", "Cartes 'Pocket Monster' — set Jungle", 60],
  ["jx.jeu_magnatimmo_annees_80", "Jeu Magnatimmo (années 80)", 22],
  ["jx.jeu_question_pour_un_fromage_culture_generale", "Jeu 'Question pour un fromage' (culture générale)", 18],
  ["jx.jeu_kicekatue_mr_mayonnaise_vintage", "Jeu 'Kicékatué Mr. Mayonnaise ?' (vintage)", 20],
  ["jx.jeu_de_cartes_long_trajet_annees_60", "Jeu de cartes 'Long Trajet' (années 60)", 14],
  ["jx.petits_chevaux_bois", "Jeu des Petits Chevaux en bois", 18],
  ["jx.echecs_buis_acajou", "Jeu d'échecs en buis et acajou", 45],
  ["jx.backgammon_cuir", "Backgammon en cuir bordeaux", 55],
  ["jx.dominos_os", "Boîte de dominos en os", 28],
  ["jx.yo_yo_duncan_alu", "Yo-yo de compétition en aluminium", 18],
  ["jx.billes_verre_lot", "Lot de billes en verre anciennes", 12],
  ["jx.soldat_plomb_napoleonien", "Soldat de plomb napoléonien", 22],
  ["jx.petite_armee_plomb", "Lot de soldats de plomb (10 pièces)", 55],
  ["jx.ours_en_peluche_mohair_recent", "Ours en peluche mohair (récent)", 65],
  ["jx.poupee_porcelaine_ancienne", "Poupée en porcelaine ancienne", 50],
  ["jx.poupee_barberousse_annees_70", "Poupée Barberousse années 70", 45],
  ["jx.lot_de_figurines_de_spountch", "Lot de figurines de Spountch", 28],
  ["jx.lot_de_figurines_d_ufs_surprises", "Lot de figurines d'œufs surprises", 22],
];

const JEUX_R: Row[] = [
  ["jx.cartes_pocket_monster_1ere_edition", "Cartes 'Pocket Monster' 1ère édition", 220],
  ["jx.figurine_de_guerre_galactique_1978", "Figurine de Guerre galactique (1978)", 110],
  ["jx.figurine_de_dark_father_1977", "Figurine de Dark Father (1977)", 180],
  ["jx.flipper_a_plateau_annees_60", "Flipper à plateau années 60", 750],
  ["jx.borne_arcade_mini", "Mini borne d'arcade — Envahisseurs de l'Espace", 280],
  ["jx.cartes_pocket_monster_holographiques_japonaise", "Cartes 'Pocket Monster' holographiques japonaises", 360],
  ["jx.cartouche_gachette_du_temps_rpg_16_bit", "Cartouche 'Gâchette du Temps' (RPG 16-bit)", 200],
  ["jx.console_d_arcade_domestique_neo", "Console d'arcade domestique 'Néo'", 600],
  ["jx.train_electrique_ho_de_precision", "Train électrique HO de précision", 320],
  ["jx.grand_set_de_briques_pirates_complet", "Grand set de briques 'Pirates' complet", 180],
  ["jx.figurine_du_capitaine_muscle_origines", "Figurine du Capitaine Muscle (origines)", 140],
  ["jx.ours_en_peluche_mohair_annees_1920", "Ours en peluche mohair années 1920", 280],
];

// ============================================================
// LIVRES & PAPETERIE — 40 communs + 12 rares
// ============================================================
const LIVRES_C: Row[] = [
  ["lv.monte_cristo", "Roman 'Le Comte de Monte-Cristo'", 10],
  ["lv.les_aventures_de_titou_cap_sur_la_lune", "Les Aventures de Titou — 'Cap sur la Lune'", 22],
  ["lv.paris_match_70s", "Lot de magazines d'actualité 70s", 14],
  ["lv.cartes_postales_anciennes", "Cartes postales anciennes (boîte)", 9],
  ["lv.miserables_pleiade", "Les Misérables — reliure prestige cuir", 50],
  ["lv.rouge_noir_coffret", "Le Rouge et le Noir — coffret", 12],
  ["lv.bovary_relie", "Madame Bovary, édition reliée", 18],
  ["lv.proust_recherche_folio", "À la Recherche du temps perdu (coffret)", 70],
  ["lv.zola_germinal_xixe", "Germinal, édition XIXe", 35],
  ["lv.camus_etranger", "L'Étranger — Camus (réimpression)", 25],
  ["lv.sartre_nausee", "La Nausée — Sartre", 18],
  ["lv.colette_cheri_relie", "Chéri — Colette, relié", 22],
  ["lv.simone_beauvoir_deuxieme", "Le Deuxième Sexe (édition 60s)", 24],
  ["lv.duras_amant", "L'Amant — Marguerite Duras", 14],
  ["lv.le_petit_moustachu_reimpression", "Le Petit Moustachu (réimpression)", 30],
  ["lv.le_petit_moustachu_zbeul_au_village", "Le Petit Moustachu — 'Zbeul au Village'", 22],
  ["lv.funky_look_les_freres_bandots", "Funky Look — 'Les Frères Bandots'", 18],
  ["lv.roupille_et_queue_longue", "Roupille et Queue-longue", 20],
  ["lv.le_lieutenant_du_far_west", "Le Lieutenant du Far West", 26],
  ["lv.le_marin_reveur_la_ballade", "Le Marin Rêveur — 'La Ballade'", 30],
  ["lv.les_histoires_du_petit_ecolier", "Les Histoires du Petit Écolier", 16],
  ["lv.encyclopedie_quillet_lot", "Lot d'encyclopédies anciennes", 35],
  ["lv.larousse_universel_2vol", "Encyclopédie universelle 2 volumes", 22],
  ["lv.dictionnaire_robert_70s", "Dictionnaire Bébert (1973)", 14],
  ["lv.atlas_michelin_60s", "Atlas routier Supermiche", 18],
  ["lv.livre_recettes_curnonsky", "Livre de recettes gastronomiques", 28],
  ["lv.livres_scolaires_anciens", "Lot de livres scolaires anciens", 12],
  ["lv.cahier_ecolier_seyes", "Cahier d'écolier Seyès années 50", 8],
  ["lv.encrier_porcelaine_xixe", "Encrier en porcelaine XIXe", 30],
  ["lv.plume_sergent_major", "Boîte de plumes d'écolier", 14],
  ["lv.stylo_waterman_vintage", "Stylo plume à réservoir vintage", 75],
  ["lv.papier_filigrane_lot", "Lot de papier filigrané ancien", 18],
  ["lv.magazine_geo_lot", "Lot de magazines de voyage années 80", 12],
  ["lv.magazine_lui_60s", "Lot de magazines de charme années 60", 22],
  ["lv.les_aventures_de_titou_l_affaire_du_professeur", "Les Aventures de Titou — 'L'Affaire du Professeur' (1956)", 65],
  ["lv.almanach_vermot", "Almanach humoristique ancien", 15],
  ["lv.carte_marine_xixe", "Carte marine XIXe encadrée", 45],
  ["lv.lampe_huile_biblio", "Lampe à huile de bibliothèque", 38],
  ["lv.coffret_loupes_lecture", "Coffret de loupes de lecture en laiton", 28],
  ["lv.album_photos_velours", "Album photos relié velours", 24],
];

const LIVRES_R: Row[] = [
  ["lv.conte_de_l_aviateur_et_de_l_enfant_roi_edition", "Conte de l'Aviateur et de l'Enfant-Roi (édition 1943)", 380],
  ["lv.les_aventures_de_titou_petrole_1950", "Les Aventures de Titou — 'Pétrole' (1950)", 220],
  ["lv.le_petit_moustachu_edition_originale_1961", "Le Petit Moustachu — édition originale 1961", 280],
  ["lv.funky_look_premier_album_1947", "Funky Look — premier album 1947", 240],
  ["lv.proust_swann_dedicace", "Du côté de chez Swann (dédicacé)", 350],
  ["lv.hugo_legende_relie_cuir", "La Légende des siècles — reliure cuir XIXe", 200],
  ["lv.atlas_diderot_planche", "Planche de l'Encyclopédie de Diderot", 180],
  ["lv.livre_heures_xviie", "Livre d'heures du XVIIe siècle", 600],
  ["lv.bible_olivetan_xvie", "Bible Olivetan édition XVIe", 900],
  ["lv.cartes_postales_belle_epoque_rare", "Lot cartes postales Belle Époque (rare)", 140],
  ["lv.stylo_plume_haut_de_gamme_a_l_etoile_blanche_d", "Stylo plume haut de gamme à l'étoile blanche (doré)", 280],
  ["lv.encrier_argent_xixe", "Encrier en argent massif XIXe", 220],
];

// ============================================================
// MODE — 40 communs + 12 rares
// ============================================================
const MODE_C: Row[] = [
  ["mo.veste_jean_delavee", "Veste en jean délavée", 15],
  ["mo.blouson_cuir_vintage", "Blouson cuir vintage", 60],
  ["mo.chapeau_feutre_50s", "Chapeau de feutre années 50", 22],
  ["mo.robe_70s_disco", "Robe disco années 70", 22],
  ["mo.robe_80s_epaulettes", "Robe à épaulettes années 80", 25],
  ["mo.robe_50s_pinup", "Robe pin-up années 50", 38],
  ["mo.robe_60s_mini", "Mini-robe années 60", 28],
  ["mo.jupe_plissee_60s", "Jupe plissée années 60", 18],
  ["mo.pantalon_pattes_eph", "Pantalon pattes d'éph années 70", 16],
  ["mo.chemise_golgothor_70s", "Chemise Golgothor (70s)", 22],
  ["mo.polo_golgothor", "Polo Golgothor", 18],
  ["mo.trench_coat_berrybeurre", "Trench-coat BerryBeurré", 90],
  ["mo.manteau_lainage_60s", "Manteau en lainage des années 60", 35],
  ["mo.chaussures_richelieu_cuir", "Souliers Richelieu en cuir vintage", 38],
  ["mo.escarpins_seconde_main", "Escarpins de marque seconde main", 70],
  ["mo.bottes_camperos_cuir", "Bottes camperos en cuir", 45],
  ["mo.sac_seventies_cuir", "Sac à main seventies en cuir", 32],
  ["mo.ceinture_cuir_laiton", "Ceinture cuir à boucle laiton", 16],
  ["mo.foulard_soie_motifs", "Foulard en soie à motifs", 22],
  ["mo.carre_de_soie_talaria_recent", "Carré de soie Talaria (récent)", 80],
  ["mo.chapeau_panama_montecristi", "Panama Montecristi récent", 55],
  ["mo.chapeau_de_feutre_italien_a_large_bord", "Chapeau de feutre italien à large bord", 60],
  ["mo.casquette_gavroche_60s", "Casquette gavroche années 60", 14],
  ["mo.gants_cuir_femme", "Gants de cuir façon dame", 12],
  ["mo.ombrelle_en_dentelle_xixe", "Ombrelle en dentelle XIXe", 28],
  ["mo.eventail_nacre", "Éventail en nacre", 35],
  ["mo.broche_pinup_strass", "Broche pin-up en strass", 22],
  ["mo.broche_camee_xixe", "Broche camée XIXe", 38],
  ["mo.bracelet_jonc_argent", "Bracelet jonc en argent ancien", 30],
  ["mo.collier_perles_culture", "Collier de perles de culture", 45],
  ["mo.bague_chevaliere_argent", "Bague chevalière en argent", 35],
  ["mo.boucles_oreilles_perles", "Boucles d'oreilles perles", 24],
  ["mo.epingle_cravate_strass", "Épingle à cravate à strass", 22],
  ["mo.montre_doree_vintage", "Montre dorée vintage", 55],
  ["mo.montre_de_plongee_vintage", "Montre de plongée vintage", 70],
  ["mo.montre_automatique_vintage", "Montre automatique vintage", 50],
  ["mo.cravate_en_soie_de_luxe", "Cravate en soie de luxe", 38],
  ["mo.cravate_club_anglaise", "Cravate club anglaise", 14],
  ["mo.ceinture_talaria", "Ceinture Talaria", 90],
  ["mo.portefeuille_polis_futton", "Portefeuille Polis Futton", 80],
];

const MODE_R: Row[] = [
  ["mo.sac_a_main_cancel", "Sac à main Cancel", 110],
  ["mo.broche_emaillee_artdeco", "Broche émaillée Art Déco", 60],
  ["mo.sac_a_main_talaria", "Sac à main Talaria", 600],
  ["mo.sac_chaine", "Sac Chaîné", 480],
  ["mo.sac_cedrine_tempome", "Sac Cédrine Tempôme", 220],
  ["mo.manteau_berrybeurre", "Manteau BerryBeurré", 280],
  ["mo.tailleur_chaine_annees_70", "Tailleur Chaîné (années 70)", 360],
  ["mo.chemise_ridor", "Chemise Ridor", 180],
  ["mo.veste_smoking_msg", "Veste smoking MSG", 420],
  ["mo.collier_a_motifs_trefle_porte_bonheur", "Collier à motifs trèfle porte-bonheur", 700],
  ["mo.bague_a_trois_anneaux_d_or_occasion", "Bague à trois anneaux d'or (occasion)", 600],
  ["mo.carre_de_soie_talaria_ancien", "Carré de soie Talaria (ancien)", 240],
];

// ============================================================
// MAISON — 40 communs + 12 rares
// ============================================================
const MAISON_C: Row[] = [
  ["ma.figurine_porcelaine", "Petite figurine en porcelaine", 12],
  ["ma.statuette_africaine_bois", "Statuette africaine en bois", 25],
  ["ma.service_the_faience", "Service à thé en faïence", 30],
  ["ma.verres_a_pied_lot6", "Lot de 6 verres à pied", 18],
  ["ma.tabouret_bois_patine", "Tabouret en bois patiné", 28],
  ["ma.vase_en_cristal_baraka", "Vase en cristal Baraka", 90],
  ["ma.vase_en_verre_moule_laluck_recent", "Vase en verre moulé Laluck (récent)", 110],
  ["ma.carafe_cristal_taille", "Carafe en cristal taillé", 35],
  ["ma.service_porcelaine_limoges", "Service en porcelaine de Limoges 12 couverts", 80],
  ["ma.plat_faience_olympe", "Plat 'Olympe' en faïence", 30],
  ["ma.saliere_argent_minerve", "Salière en argent (Minerve)", 28],
  ["ma.timbale_argent_bapteme", "Timbale d'argent de baptême", 35],
  ["ma.coupe_emaillee_longwy", "Coupe à fruits aux émaux de Longwy", 45],
  ["ma.plat_en_ceramique_de_vallauris_signe_picassiet", "Plat en céramique de Vallauris signé Picassiette", 70],
  ["ma.cendrier_en_pate_de_cristal_dome", "Cendrier en pâte de cristal Dôme", 60],
  ["ma.menagere_en_metal_argente_24_pieces", "Ménagère en métal argenté 24 pièces", 140],
  ["ma.service_the_chinois", "Service à thé chinois en porcelaine", 38],
  ["ma.tasses_porcelaine_paris", "Lot de tasses 'Porcelaine de Paris'", 22],
  ["ma.pichet_faience_emaillee", "Pichet en faïence émaillée", 18],
  ["ma.bougeoirs_laiton_louisxv", "Paire de bougeoirs en laiton Louis XV", 55],
  ["ma.horloge_carillon_westminster", "Horloge carillon Westminster", 70],
  ["ma.pendule_marbre_xixe", "Pendule cheminée en marbre XIXe", 110],
  ["ma.pendule_voyage_laiton", "Pendule de voyage en laiton", 50],
  ["ma.miroir_psyche", "Miroir psyché de chambre", 80],
  ["ma.miroir_baroque_petit", "Miroir baroque doré (petit)", 55],
  ["ma.gueridon_salon", "Guéridon de salon ancien", 90],
  ["ma.coffre_chinois_laque", "Coffre chinois en laque", 70],
  ["ma.service_liqueur_cristal", "Service à liqueur en cristal taillé", 38],
  ["ma.bonbonniere_porcelaine", "Bonbonnière en porcelaine", 22],
  ["ma.saliere_poivriere_argent", "Paire salière-poivrière en argent", 45],
  ["ma.plateau_marqueterie", "Plateau en marqueterie", 28],
  ["ma.nature_morte_xixe_cadre", "Tableau nature morte XIXe (cadre doré)", 60],
  ["ma.pendulette_bronze", "Pendulette de voyage en bronze", 70],
  ["ma.lampe_petrole_ancienne", "Lampe à pétrole ancienne", 35],
  ["ma.lampe_globe_opaline", "Lampe à globe d'opaline", 55],
  ["ma.service_cafe_faience", "Service café faïence (6 personnes)", 24],
  ["ma.saladier_verre_boheme", "Saladier en verre de Bohême", 30],
  ["ma.cafetiere_emaillee_50s", "Cafetière émaillée des années 50", 18],
  ["ma.seau_a_glace_plaque", "Seau à glace en argent plaqué", 38],
  ["ma.lustre_bronze_cristal_petit", "Petit lustre bronze et cristal", 95],
];

const MAISON_R: Row[] = [
  ["ma.boite_musique_ancienne", "Boîte à musique ancienne", 55],
  ["ma.lampe_bureau_artdeco", "Lampe de bureau Art Déco", 130],
  ["ma.miroir_dore_fronton", "Miroir doré à fronton", 140],
  ["ma.service_a_the_en_porcelaine_de_saxe_6_tasses", "Service à thé en porcelaine de Saxe 6 tasses", 380],
  ["ma.vase_en_pate_de_verre_dome_signe", "Vase en pâte de verre Dôme (signé)", 280],
  ["ma.lustre_en_cristal_baraka", "Lustre en cristal Baraka", 600],
  ["ma.commode_louis_xv_marqueterie", "Commode Louis XV en marqueterie", 900],
  ["ma.tapis_persan_ispahan", "Tapis persan Ispahan ancien", 700],
  ["ma.pendule_d_horloger_braguette_signee", "Pendule d'horloger Braguette, signée", 1200],
  ["ma.candelabre_argent_5branches", "Candélabre 5 branches en argent massif", 480],
  ["ma.menagere_en_argent_massif_36_pieces", "Ménagère en argent massif 36 pièces", 600],
  ["ma.bibliotheque_louis_philippe", "Bibliothèque Louis-Philippe en acajou", 450],
];

// ============================================================
// OBJETS D'ART — 40 communs + 12 rares
// ============================================================
const ART_C: Row[] = [
  ["art.aquarelle_paysage_anonyme", "Aquarelle de paysage (anonyme XIXe)", 30],
  ["art.gravure_ancienne_xixe", "Gravure ancienne du XIXe siècle", 22],
  ["art.terre_cuite_buste", "Petit buste en terre cuite", 38],
  ["art.serigraphie_pop_signee", "Sérigraphie pop-art signée", 55],
  ["art.masque_tribal_decoratif", "Masque tribal décoratif", 28],
  ["art.bronze_animalier", "Bronze animalier signé", 75],
  ["art.aquarelle_marine_xixe", "Aquarelle marine du XIXe", 35],
  ["art.aquarelle_paysage_provencal", "Aquarelle paysage provençal", 32],
  ["art.pastel_portrait_femme", "Pastel — portrait de femme", 40],
  ["art.dessin_fusain_atelier", "Dessin au fusain (atelier)", 25],
  ["art.lithographie_signee_xxe", "Lithographie signée du XXe", 50],
  ["art.lithographie_de_chacal_planche", "Lithographie de Chacal (planche)", 95],
  ["art.gravure_durer_reimpr", "Gravure Dürer (réimpression)", 28],
  ["art.gravure_jouy_paris", "Gravure 'Vue de Paris' Jouy", 22],
  ["art.estampe_hokusai_edition", "Estampe japonaise Hokusai (édition)", 60],
  ["art.estampe_hiroshige_paysage", "Estampe Hiroshige — paysage", 55],
  ["art.terre_cuite_putto", "Terre cuite — putto", 38],
  ["art.terre_cuite_femme_classique", "Femme classique en terre cuite", 42],
  ["art.bronze_buste_voltaire", "Buste de Voltaire en bronze", 90],
  ["art.bronze_barye_style", "Bronze signé style Barye", 95],
  ["art.bronze_petite_danseuse", "Petit bronze 'Danseuse'", 80],
  ["art.platre_atelier_torse", "Plâtre d'atelier — torse", 22],
  ["art.masque_inuit_inspiration", "Masque décoratif d'inspiration Inuit", 32],
  ["art.statue_bouddha_pierre", "Statue de Bouddha en pierre", 60],
  ["art.statuette_egyptienne_inspi", "Statuette d'inspiration égyptienne", 35],
  ["art.huile_anonyme_xixe", "Huile sur toile anonyme XIXe", 50],
  ["art.peinture_naive_paysanne", "Peinture naïve — scène paysanne", 28],
  ["art.nature_morte_xixe_cadre", "Nature morte XIXe encadrée", 70],
  ["art.portrait_bourgeois_xixe", "Portrait à l'huile (bourgeois XIXe)", 65],
  ["art.icone_orthodoxe_bois", "Icône orthodoxe sur bois", 45],
  ["art.icone_russe_doree", "Icône russe dorée", 80],
  ["art.plaque_email_limoges", "Plaque émaillée religieuse", 38],
  ["art.vase_art_deco_bebert_germain", "Vase Art Déco Bébert Germain", 75],
  ["art.coupe_emaillee_longwy_art", "Coupe en faïence aux émaux de Longwy", 32],
  ["art.boite_laquee_japonaise", "Boîte laquée japonaise (Edo récent)", 55],
  ["art.petite_sculpture_ivoire", "Petite sculpture en ivoire", 90],
  ["art.miniature_portrait_dame", "Miniature — portrait de dame", 28],
  ["art.assiette_decorative_signee_picassiette", "Assiette décorative signée Picassiette", 22],
  ["art.eventail_chinois_peint", "Éventail chinois peint à la main", 45],
  ["art.boite_marqueterie_florentine", "Boîte de marqueterie florentine", 38],
];

const ART_R: Row[] = [
  ["art.dessin_signe_ecole_francaise", "Dessin signé d'école française", 180],
  ["art.vase_galle_signe", "Vase Émile Gallé signé", 260],
  ["art.lithographie_cubiste_signee_picassiette_planch", "Lithographie cubiste signée Picassiette (planche)", 380],
  ["art.dessin_surrealiste_aux_montres_molles_signe", "Dessin surréaliste aux montres molles (signé)", 480],
  ["art.gravure_rembrandt_reimpr", "Gravure Rembrandt (réimpression originale)", 240],
  ["art.bronze_d_atelier_aux_silhouettes_filiformes_pl", "Bronze d'atelier aux silhouettes filiformes (planche)", 600],
  ["art.huile_corot_attribuee", "Huile attribuée à Corot", 700],
  ["art.vase_en_verre_moule_laluck_signe", "Vase en verre moulé Laluck (signé)", 280],
  ["art.petite_sculpture_rondin_planche", "Petite sculpture Rondin (planche)", 800],
  ["art.estampe_cubiste_signee_picassiette", "Estampe cubiste signée Picassiette", 450],
  ["art.aquarelle_fauviste_de_roland_duff_signee", "Aquarelle fauviste de Roland Duff (signée)", 350],
  ["art.toile_expressionniste_de_bebert_bahut_signee", "Toile expressionniste de Bébert Bahut (signée)", 600],
];

// ============================================================
// BRICOLAGE — 40 communs + 12 rares
// ============================================================
const BRICOLAGE_C: Row[] = [
  ["br.marteau_menuisier", "Marteau de menuisier", 8],
  ["br.boite_outils_complete", "Boîte à outils complète", 45],
  ["br.etabli_pliant_ancien", "Établi pliant ancien", 55],
  ["br.pince_etirer_cuivre", "Pince à étirer en cuivre", 12],
  ["br.scie_egoine_de_charpentier", "Scie égoïne de charpentier", 14],
  ["br.scie_arc_charpentier", "Scie d'arc de charpentier", 18],
  ["br.scie_japonaise_recente", "Scie japonaise (Ryoba récente)", 30],
  ["br.marteau_arracheur", "Marteau arracheur de clous", 12],
  ["br.masse_fer_forge", "Masse en fer forgé", 14],
  ["br.tournevis_lot_ancien", "Lot de tournevis anciens", 14],
  ["br.cle_anglaise_old", "Clé anglaise ancienne (BTP)", 12],
  ["br.cle_a_molette_ancienne", "Clé à molette ancienne", 10],
  ["br.niveau_a_bulle_laiton", "Niveau à bulle en laiton", 22],
  ["br.metre_pliant_bois_2m", "Mètre pliant en bois 2 m", 8],
  ["br.equerre_metallique", "Équerre métallique de menuisier", 14],
  ["br.pied_a_coulisse_acier", "Pied à coulisse en acier", 28],
  ["br.perceuse_a_manivelle", "Perceuse manuelle à manivelle", 30],
  ["br.fer_a_souder_vintage", "Fer à souder vintage (1970)", 22],
  ["br.boite_quincaillerie_metal", "Boîte de quincaillerie en métal", 18],
  ["br.lot_vis_clous_anciens", "Lot de vis et clous anciens", 8],
  ["br.enclume_petit_modele", "Petite enclume d'établi", 60],
  ["br.etau_de_table_regulier", "Étau de table régulier", 28],
  ["br.lampe_baladeuse_atelier", "Lampe baladeuse d'atelier", 18],
  ["br.etabli_chene_atelier", "Établi de chêne d'atelier", 90],
  ["br.caisse_outils_chene", "Caisse à outils en chêne ancienne", 38],
  ["br.lot_limes_charpentier", "Lot de limes de charpentier", 16],
  ["br.ciseaux_a_bois_lot", "Lot de ciseaux à bois (5 pièces)", 28],
  ["br.varlope_chene", "Varlope en chêne ancienne", 30],
  ["br.rabot_metallique_n4_d_ebeniste", "Rabot métallique n°4 d'ébéniste", 35],
  ["br.rabot_bois_artisanal", "Rabot artisanal en bois", 22],
  ["br.gouge_sculpteur_lot", "Lot de gouges de sculpteur", 38],
  ["br.trusquin_acajou_laiton", "Trusquin acajou et laiton", 28],
  ["br.compas_charpentier_xixe", "Compas de charpentier XIXe", 32],
  ["br.mortaisier_acier", "Mortaisier acier ancien", 22],
  ["br.tariere_charpentier", "Tarière de charpentier", 24],
  ["br.tenailles_forgeron", "Tenailles de forgeron", 18],
  ["br.serre_joints_lot", "Lot de serre-joints en fer", 28],
  ["br.plane_charronnier", "Plane de charronnier", 32],
  ["br.marteau_horloger", "Marteau d'horloger", 16],
  ["br.tournevis_horloger_lot", "Lot de tournevis d'horloger", 22],
];

const BRICOLAGE_R: Row[] = [
  ["br.boite_d_outils_de_manufacture_signee", "Boîte d'outils de manufacture (signée)", 220],
  ["br.scie_a_dos_de_menuisier_n7_ancienne", "Scie à dos de menuisier n°7 ancienne", 180],
  ["br.rabot_d_ebeniste_a_semelle_modele_605", "Rabot d'ébéniste à semelle (modèle 605)", 280],
  ["br.coffret_ebeniste_xixe", "Coffret d'outils d'ébéniste XIXe", 380],
  ["br.etabli_de_compagnonnage_xixe", "Établi de compagnonnage XIXe", 600],
  ["br.machine_a_coudre_en_fonte_a_pedale_xixe", "Machine à coudre en fonte à pédale XIXe", 240],
  ["br.tour_a_bois_atelier", "Tour à bois d'atelier ancien", 320],
  ["br.enclume_grande_forge", "Grande enclume de forge", 300],
  ["br.lot_d_outils_de_compagnon_du_tour_de_france", "Lot d'outils de compagnon du tour de France", 480],
  ["br.coffret_dessin_industriel", "Coffret de dessin industriel laiton", 200],
  ["br.tariere_grande_xviiie", "Grande tarière XVIIIe", 180],
  ["br.balance_romaine_fonte", "Balance romaine en fonte ancienne", 160],
];

// ============================================================
// AGRÉGATION
// ============================================================
export const OBJET_TEMPLATES: ObjetTemplate[] = [
  ...section("Musique", "commun", MUSIQUE_C),
  ...section("Musique", "rare", MUSIQUE_R),
  ...section("Jeux & Loisirs", "commun", JEUX_C),
  ...section("Jeux & Loisirs", "rare", JEUX_R),
  ...section("Livres & Papeterie", "commun", LIVRES_C),
  ...section("Livres & Papeterie", "rare", LIVRES_R),
  ...section("Mode", "commun", MODE_C),
  ...section("Mode", "rare", MODE_R),
  ...section("Maison", "commun", MAISON_C),
  ...section("Maison", "rare", MAISON_R),
  ...section("Objets d'art", "commun", ART_C),
  ...section("Objets d'art", "rare", ART_R),
  ...section("Bricolage", "commun", BRICOLAGE_C),
  ...section("Bricolage", "rare", BRICOLAGE_R),
];

export { LEGENDAIRES };

/**
 * Pool de base communs + rares (sans légendaires ni uniques).
 * Conservé pour compatibilité — préférer `poolPourTier()` qui intègre les
 * légendaires et le gating par tier.
 */
export const POOL_COMMUN_GENERIQUE: ObjetTemplate[] = OBJET_TEMPLATES;

/** Pool complet (communs + rares + légendaires) utilisé en chinage. Hors uniques (boss-only). */
const POOL_CHINAGE: ObjetTemplate[] = [...OBJET_TEMPLATES, ...LEGENDAIRES];

/**
 * Tier minimum à partir duquel chaque template peut apparaître en chinage.
 * Calcul : par couple (catégorie, rareté), on trie par `prixRefBase` et on
 * découpe en 3 buckets égaux (1/3 le moins cher → tier 1, etc.).
 * Conséquence :
 *  - 1⭐ → 1/3 des communs, 1/3 des rares, 1/3 des légendaires (les moins chers).
 *  - 2⭐ → 2/3 de chaque rareté (cumulatif).
 *  - 3⭐ et + → tout le catalogue.
 *  Les uniques restent boss-only (gérés via `poolExclusif`).
 */
const TIER_MIN_PAR_TEMPLATE: Map<string, 1 | 2 | 3> = (() => {
  const map = new Map<string, 1 | 2 | 3>();
  const buckets = new Map<string, ObjetTemplate[]>();
  for (const t of POOL_CHINAGE) {
    const key = `${t.categorie}|${t.rarete}`;
    const liste = buckets.get(key);
    if (liste) liste.push(t);
    else buckets.set(key, [t]);
  }
  for (const liste of buckets.values()) {
    const tries = [...liste].sort((a, b) => a.prixRefBase - b.prixRefBase);
    const tiers = tries.length / 3;
    const seuil1 = Math.floor(tiers);
    const seuil2 = Math.floor(2 * tiers);
    tries.forEach((t, i) => {
      const tier: 1 | 2 | 3 = i < seuil1 ? 1 : i < seuil2 ? 2 : 3;
      map.set(t.templateId, tier);
    });
  }
  // Garantie de la spec trame : les objets-cibles des chapitres principaux
  // doivent être trouvables dans le tier de l'acte qui les demande, sinon
  // soft-lock (ex. la lampe du ch1 classée tier 2 par le découpage en
  // terciles de prix ci-dessus, alors que le tier 2 est gaté par le ch4).
  // On clampe donc leur tier minimum au tier de l'acte (1/2/3) — seulement
  // pour les templates présents dans la map (donc dans POOL_CHINAGE) : les
  // uniques (ex. bijou du ch11) ne sont pas dans POOL_CHINAGE et restent
  // boss-only via `poolExclusif`.
  for (const chapitre of QUETES_PRINCIPALES) {
    for (const objectif of chapitre.payload.objectifs) {
      if (objectif.type !== "objet") continue;
      const actuel = map.get(objectif.templateId);
      if (actuel === undefined) continue;
      const acte = chapitre.acte;
      map.set(objectif.templateId, Math.min(actuel, acte) as 1 | 2 | 3);
    }
  }
  return map;
})();

export function tierMinTemplate(templateId: string): 1 | 2 | 3 {
  return TIER_MIN_PAR_TEMPLATE.get(templateId) ?? 1;
}

/** Pool de chinage filtré pour un tier donné (cumulatif, inclut légendaires). */
export function poolPourTier(tier: 1 | 2 | 3 | 4): ObjetTemplate[] {
  if (tier >= 3) return POOL_CHINAGE;
  return POOL_CHINAGE.filter((t) => tierMinTemplate(t.templateId) <= tier);
}

export const ALL_TEMPLATES: ObjetTemplate[] = [...OBJET_TEMPLATES, ...LEGENDAIRES, ...UNIQUES];

/** Résout un templateId vers son template (incluant les légendaires). */
export function getTemplate(templateId: string): ObjetTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.templateId === templateId);
}

const TAILLE_DEFAUT: Record<CategorieObjet, TailleObjet> = {
  "Musique": "S",
  "Jeux & Loisirs": "S",
  "Livres & Papeterie": "S",
  "Mode": "S",
  "Maison": "M",
  "Objets d'art": "M",
  "Bricolage": "S",
};

export function tailleDe(t: ObjetTemplate): TailleObjet {
  return t.taille ?? TAILLES_OVERRIDE[t.templateId] ?? TAILLE_DEFAUT[t.categorie];
}
