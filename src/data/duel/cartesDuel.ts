import type { Effet, StatsDuel } from "@/data/duel/types";

const E = (declencheur: Effet["declencheur"], prix: number, ...actions: Effet["actions"]): Effet => ({
  type: "effet", declencheur, actions, prix,
});

/** Version 2 (2026-09-02), campagne 2 : règle 6 (pose) sur les six cartes les moins posées. Historique dans docs/superpowers/duel/rapport-equilibrage.md. */
export const CARTES_DUEL: Record<string, StatsDuel> = {
  // ── Musique (8) : pioche, gains d'attaque alliés ──
  "carte.vinyle_des_loups_des_steppes_bark_to_be_free": { cout: 2, attaque: 2, pv: 1, texte: { type: "cri", variante: "pioche" } },
  "carte.vinyle_grand_max_des_combines": { cout: 1, attaque: 1, pv: 2 },
  "carte.33tours_jazz_1": { cout: 3, attaque: 3, pv: 2, texte: { type: "cri", variante: "pioche" } },
  "carte.harmonica_chromatique_de_bluesman": { cout: 2, attaque: 2, pv: 2, texte: { type: "prompt" } },
  "carte.vinyle_stevranos_vive_la_fet_a": { cout: 4, attaque: 4, pv: 5 },
  "carte.guitare_classique_ancienne": { cout: 3, attaque: 2, pv: 4, texte: E("attaque", 1, { type: "pioche", valeur: 1 }) },
  "carte.test_pressing_des_trolling_sons": { cout: 2, attaque: 1, pv: 2, texte: E("pose", 2, { type: "gain", stat: "attaque", cible: "allies", valeur: 1 }) },
  "carte.violon_de_maitre_cremonais_1715": { cout: 5, attaque: 4, pv: 5, texte: E("debutTour", 3, { type: "gain", stat: "attaque", cible: "alliesCategorie", categorie: "Musique", valeur: 1 }) },

  // ── Jeux & Loisirs (7) : Prompt, Fragile, bon marché ──
  "carte.cartouche_le_plombier_sauteur_8_bit": { cout: 1, attaque: 1, pv: 1, texte: { type: "prompt" } },
  "carte.manette_megadrive": { cout: 1, attaque: 3, pv: 2, texte: { type: "fragile" } },
  "carte.playbox_pocket": { cout: 2, attaque: 2, pv: 2, texte: { type: "prompt" } },
  "carte.risk_1992": { cout: 3, attaque: 5, pv: 4, texte: { type: "fragile" } },
  "carte.figurine_de_guerre_galactique_1978": { cout: 4, attaque: 3, pv: 4, texte: E("pose", 2, { type: "degats", cible: "objetAdverse", valeur: 2 }) },
  "carte.flipper_a_plateau_annees_60": { cout: 5, attaque: 3, pv: 6, texte: E("blesse", 2, { type: "degats", cible: "vitrineAdverse", valeur: 2 }) },
  "carte.cartouche_stadium_events": { cout: 4, attaque: 2, pv: 4, texte: E("pose", 4, { type: "degats", cible: "tousObjetsAdverses", valeur: 1 }, { type: "pioche", valeur: 1 }) },

  // ── Livres & Papeterie (7) : dégâts directs, pioche, contrôle ──
  "carte.monte_cristo": { cout: 3, attaque: 3, pv: 4 },
  "carte.les_aventures_de_titou_cap_sur_la_lune": { cout: 1, attaque: 1, pv: 1, texte: { type: "cri", variante: "degat" } },
  "carte.paris_match_70s": { cout: 2, attaque: 2, pv: 1, texte: { type: "cri", variante: "pioche" } },
  "carte.miserables_pleiade": { cout: 4, attaque: 3, pv: 4, texte: { type: "solide" } },
  "carte.conte_de_l_aviateur_et_de_l_enfant_roi_edition": { cout: 2, attaque: 2, pv: 2, texte: E("casse", 1, { type: "pioche", valeur: 1 }) },
  "carte.le_petit_moustachu_edition_originale_1961": { cout: 3, attaque: 2, pv: 4, texte: E("pose", 1, { type: "degats", cible: "objetAdverse", valeur: 2 }) },
  "carte.gutenberg_feuillet": { cout: 4, attaque: 3, pv: 4, texte: E("pose", 3, { type: "pioche", valeur: 2 }) },

  // ── Mode (7) : Ruse, retour en main, tempo ──
  "carte.veste_jean_delavee": { cout: 2, attaque: 2, pv: 2, texte: { type: "ruse" } },
  "carte.blouson_cuir_vintage": { cout: 3, attaque: 3, pv: 3, texte: { type: "ruse" } },
  "carte.chapeau_feutre_50s": { cout: 1, attaque: 2, pv: 1 },
  "carte.robe_50s_pinup": { cout: 4, attaque: 4, pv: 4, texte: { type: "cri", variante: "soin" } },
  "carte.broche_emaillee_artdeco": { cout: 2, attaque: 1, pv: 1, texte: E("pose", 3, { type: "retourEnMain" }) },
  "carte.sac_a_main_talaria": { cout: 3, attaque: 2, pv: 4, texte: E("attaque", 1, { type: "gain", stat: "attaque", cible: "soi", valeur: 1 }) },
  "carte.la_petite_robe_noire_chaine_1925": { cout: 5, attaque: 4, pv: 4, texte: E("pose", 4, { type: "retourEnMain" }, { type: "gain", stat: "attaque", cible: "allies", valeur: 1 }) },

  // ── Maison (7) : PV hauts, Barrage, soin ──
  "carte.figurine_porcelaine": { cout: 1, attaque: 1, pv: 1, texte: { type: "barrage" } },
  "carte.service_the_faience": { cout: 2, attaque: 1, pv: 3, texte: { type: "cri", variante: "soin" } },
  "carte.tabouret_bois_patine": { cout: 3, attaque: 2, pv: 4, texte: { type: "barrage" } },
  "carte.vase_en_cristal_baraka": { cout: 4, attaque: 3, pv: 5, texte: { type: "barrage" } },
  "carte.boite_musique_ancienne": { cout: 2, attaque: 1, pv: 2, texte: E("debutTour", 2, { type: "soinVitrine", valeur: 1 }) },
  "carte.lampe_bureau_artdeco": { cout: 3, attaque: 2, pv: 4, texte: E("pose", 1, { type: "gain", stat: "pv", cible: "allies", valeur: 1 }) },
  "carte.uf_joaillier_imperial_en_email_replique": { cout: 5, attaque: 3, pv: 5, texte: E("pose", 4, { type: "soinVitrine", valeur: 4 }, { type: "gain", stat: "pv", cible: "allies", valeur: 2 }) },

  // ── Objets d'art (6) : Solide, valeur brute ──
  "carte.aquarelle_paysage_anonyme": { cout: 1, attaque: 1, pv: 2 },
  "carte.terre_cuite_buste": { cout: 2, attaque: 1, pv: 2, texte: { type: "solide" } },
  "carte.masque_tribal_decoratif": { cout: 3, attaque: 3, pv: 4 },
  "carte.bronze_animalier": { cout: 4, attaque: 3, pv: 4, texte: { type: "solide" } },
  "carte.vase_galle_signe": { cout: 3, attaque: 2, pv: 4, texte: E("blesse", 1, { type: "soinVitrine", valeur: 2 }) },
  "carte.dessin_surrealiste_aux_montres_molles_signe": { cout: 5, attaque: 3, pv: 5, texte: E("pose", 3, { type: "degats", cible: "tousObjetsAdverses", valeur: 2 }) },

  // ── Bricolage (8) : attaque haute, Prompt ──
  "carte.marteau_menuisier": { cout: 1, attaque: 2, pv: 1 },
  "carte.boite_outils_complete": { cout: 3, attaque: 3, pv: 4 },
  "carte.etabli_pliant_ancien": { cout: 3, attaque: 3, pv: 3, texte: { type: "prompt" } },
  "carte.pince_etirer_cuivre": { cout: 2, attaque: 3, pv: 1, texte: { type: "prompt" } },
  "carte.scie_egoine_de_charpentier": { cout: 4, attaque: 5, pv: 4 },
  "carte.boite_d_outils_de_manufacture_signee": { cout: 5, attaque: 4, pv: 4, texte: E("casse", 3, { type: "degats", cible: "tousObjetsAdverses", valeur: 2 }) },
  "carte.rabot_d_ebeniste_a_semelle_modele_605": { cout: 4, attaque: 4, pv: 3, texte: E("attaque", 2, { type: "degats", cible: "vitrineAdverse", valeur: 1 }) },
  "carte.coffret_ebeniste_xixe": { cout: 5, attaque: 5, pv: 4, texte: E("debutTour", 2, { type: "gain", stat: "attaque", cible: "soi", valeur: 1 }) },
};

export function statsDuel(id: string): StatsDuel {
  const s = CARTES_DUEL[id];
  if (!s) throw new Error(`Carte de duel inconnue : ${id}`);
  return s;
}
