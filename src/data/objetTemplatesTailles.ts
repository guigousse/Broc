import type { TailleObjet } from "@/types/game";

/**
 * Overrides explicites de taille par templateId.
 * Tout ce qui n'est pas listé tombe sur le défaut par catégorie.
 * À enrichir progressivement à mesure que des items "sentent faux" en jeu.
 *
 * Repères (côté coffre = 1 unité) :
 *   XS ≈ tient dans une main fermée (clé, montre, broche, billes)
 *   S  ≈ tient dans une main ouverte (livre, tasse, bouteille)
 *   M  ≈ deux mains (radio, machine à écrire, vinyle 33T encadré)
 *   L  ≈ encombrant à porter (chaise, lampe sur pied, instrument à vent)
 *   XL ≈ plus grand que soi (piano, armoire, vélo, tour à métaux)
 */
export const TAILLES_OVERRIDE: Record<string, TailleObjet> = {
  // ============================================================
  // XS — objets minuscules (tiennent dans la main fermée)
  // ============================================================
  // Musique
  "mus.harmonica_hohner": "XS",
  "mus.diapason_acier": "XS",
  // Jeux & loisirs
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
  // Livres & papeterie
  "lv.cartes_postales_anciennes": "XS",
  "lv.cartes_postales_belle_epoque_rare": "XS",
  "lv.stylo_waterman_vintage": "XS",
  "lv.stylo_montblanc_meisterstuck": "XS",
  // Mode (bijouterie + accessoires)
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
  // Bricolage (petits outils)
  "br.cle_anglaise_old": "XS",
  "br.cle_a_molette_ancienne": "XS",
  // Maison
  "ma.figurine_porcelaine": "XS",

  // ============================================================
  // L — objets manifestement encombrants (deux mains, posables au sol)
  // ============================================================
  "mus.tourne_disque_thorens": "L",
  "mus.guitare_classique_ancienne": "L",
  "mus.guitare_gibson_les_paul": "L",
  "mus.guitare_fender_strato_70s": "L",
  "mus.accordeon_paolo_soprani": "L",
  "mus.saxophone_selmer_mark_vi": "L",
  "mus.clarinette_buffet": "L",
  "br.etabli_pliant_ancien": "L",
  "br.etabli_chene_atelier": "L",
  "br.enclume_petit_modele": "L",
  "br.enclume_grande_forge": "L",
  "jx.flipper_gottlieb_60s": "L",
  "ma.bibliotheque_louis_philippe": "L",
  "ma.miroir_psyche": "L",
  "ma.miroir_dore_fronton": "L",
  "ma.gueridon_salon": "L",

  // ============================================================
  // XL — pianos, gros mobilier, machines
  // ============================================================
  "leg.mus.piano_pleyel_concert": "XL",
  "br.etabli_compagnonnage_xixe": "XL",
  "br.tour_a_bois_atelier": "XL",
  "leg.br.tour_holtzapffel_xixe": "XL",
  "ma.commode_louis_xv_marqueterie": "XL",
};
