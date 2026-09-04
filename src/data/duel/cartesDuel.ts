import type { Effet, StatsDuel } from "@/data/duel/types";

const E = (declencheur: Effet["declencheur"], prix: number, ...actions: Effet["actions"]): Effet => ({
  type: "effet", declencheur, actions, prix,
});

/** Version 6 (2026-09-02), campagne 7 : Gutenberg reprend ses deux points en PV, la pince perd 1 attaque. Historique dans docs/superpowers/duel/rapport-equilibrage.md. */
export const CARTES_DUEL: Record<string, StatsDuel> = {
  // ── Musique (8) : pioche, gains d'attaque alliés ──
  "carte.radio_cassette_annees_80": { cout: 2, attaque: 2, pv: 1, texte: { type: "cri", variante: "pioche" } },
  "carte.tourne_disque_a_courroie_vintage": { cout: 1, attaque: 1, pv: 2 },
  "carte.metronome_mecanique_a_pyramide": { cout: 3, attaque: 3, pv: 2, texte: { type: "cri", variante: "pioche" } },
  "carte.harmonica_chromatique_de_bluesman": { cout: 2, attaque: 2, pv: 2, texte: { type: "prompt" } },
  "carte.ukulele_soprano": { cout: 4, attaque: 4, pv: 5 },
  "carte.guitare_classique_ancienne": { cout: 3, attaque: 2, pv: 4, texte: E("attaque", 1, { type: "pioche", valeur: 1 }) },
  "carte.saxophone_alto_professionnel": { cout: 2, attaque: 1, pv: 2, texte: E("pose", 2, { type: "gain", stat: "attaque", cible: "allies", valeur: 1 }) },
  "carte.violon_de_maitre_cremonais_1715": { cout: 5, attaque: 6, pv: 5, texte: E("debutTour", 1, { type: "gain", stat: "attaque", cible: "alliesCategorie", categorie: "Musique", valeur: 1 }) },

  // ── Jeux & Loisirs (7) : Prompt, Fragile, bon marché ──
  "carte.ours_en_peluche_mohair_recent": { cout: 1, attaque: 1, pv: 1, texte: { type: "prompt" } },
  "carte.manette_megadrive": { cout: 1, attaque: 3, pv: 2, texte: { type: "fragile" } },
  "carte.yo_yo_duncan_alu": { cout: 2, attaque: 2, pv: 2, texte: { type: "prompt" } },
  "carte.boite_de_construction_metallique_no_3": { cout: 3, attaque: 5, pv: 4, texte: { type: "fragile" } },
  "carte.borne_arcade_mini": { cout: 4, attaque: 3, pv: 4, texte: E("pose", 2, { type: "degats", cible: "objetAdverse", valeur: 2 }) },
  "carte.flipper_a_plateau_annees_60": { cout: 5, attaque: 3, pv: 6, texte: E("blesse", 2, { type: "degats", cible: "vitrineAdverse", valeur: 2 }) },
  "carte.baby_foot_de_competition_minibon_homologue": { cout: 4, attaque: 3, pv: 4, texte: E("pose", 3, { type: "degats", cible: "tousObjetsAdverses", valeur: 1 }, { type: "pioche", valeur: 1 }) },

  // ── Livres & Papeterie (7) : dégâts directs, pioche, contrôle ──
  "carte.encrier_porcelaine_xixe": { cout: 3, attaque: 3, pv: 4 },
  "carte.lampe_huile_biblio": { cout: 1, attaque: 1, pv: 1, texte: { type: "cri", variante: "degat" } },
  "carte.stylo_waterman_vintage": { cout: 2, attaque: 2, pv: 1, texte: { type: "cri", variante: "pioche" } },
  "carte.coffret_loupes_lecture": { cout: 4, attaque: 4, pv: 3, texte: { type: "solide" } },
  "carte.stylo_plume_haut_de_gamme_a_l_etoile_blanche_d": { cout: 2, attaque: 2, pv: 2, texte: E("casse", 1, { type: "pioche", valeur: 1 }) },
  "carte.encrier_argent_xixe": { cout: 3, attaque: 2, pv: 4, texte: E("pose", 1, { type: "degats", cible: "objetAdverse", valeur: 2 }) },
  "carte.manuscrit_enlumine_xve": { cout: 4, attaque: 4, pv: 5, texte: E("pose", 1, { type: "pioche", valeur: 2 }) },

  // ── Mode (7) : Ruse, retour en main, tempo ──
  "carte.bottes_camperos_cuir": { cout: 2, attaque: 2, pv: 2, texte: { type: "ruse" } },
  "carte.montre_doree_vintage": { cout: 3, attaque: 3, pv: 3, texte: { type: "ruse" } },
  "carte.chapeau_feutre_50s": { cout: 1, attaque: 1, pv: 2 },
  "carte.robe_50s_pinup": { cout: 4, attaque: 4, pv: 4, texte: { type: "cri", variante: "soin" } },
  "carte.veste_smoking_msg": { cout: 2, attaque: 0, pv: 2, texte: E("pose", 3, { type: "retourEnMain" }) },
  "carte.sac_a_main_talaria": { cout: 3, attaque: 2, pv: 4, texte: E("attaque", 1, { type: "gain", stat: "attaque", cible: "soi", valeur: 1 }) },
  "carte.la_petite_robe_noire_chaine_1925": { cout: 5, attaque: 1, pv: 7, texte: E("pose", 4, { type: "retourEnMain" }, { type: "gain", stat: "attaque", cible: "allies", valeur: 1 }) },

  // ── Maison (7) : PV hauts, Barrage, soin ──
  "carte.cafetiere_emaillee_50s": { cout: 1, attaque: 1, pv: 1, texte: { type: "barrage" } },
  "carte.service_the_faience": { cout: 2, attaque: 1, pv: 3, texte: { type: "cri", variante: "soin" } },
  "carte.tabouret_bois_patine": { cout: 3, attaque: 2, pv: 4, texte: { type: "barrage" } },
  "carte.vase_en_cristal_baraka": { cout: 4, attaque: 3, pv: 5, texte: { type: "barrage" } },
  "carte.boite_musique_ancienne": { cout: 2, attaque: 1, pv: 2, texte: E("debutTour", 2, { type: "soinVitrine", valeur: 1 }) },
  "carte.lampe_bureau_artdeco": { cout: 3, attaque: 2, pv: 4, texte: E("pose", 1, { type: "gain", stat: "pv", cible: "allies", valeur: 1 }) },
  "carte.uf_joaillier_imperial_en_email_replique": { cout: 5, attaque: 3, pv: 5, texte: E("pose", 4, { type: "soinVitrine", valeur: 4 }, { type: "gain", stat: "pv", cible: "allies", valeur: 2 }) },

  // ── Objets d'art (6) : Solide, valeur brute ──
  "carte.vase_art_deco_bebert_germain": { cout: 1, attaque: 1, pv: 2 },
  "carte.boite_marqueterie_florentine": { cout: 2, attaque: 1, pv: 2, texte: { type: "solide" } },
  "carte.masque_tribal_decoratif": { cout: 3, attaque: 3, pv: 4 },
  "carte.bronze_animalier": { cout: 4, attaque: 3, pv: 4, texte: { type: "solide" } },
  "carte.vase_galle_signe": { cout: 3, attaque: 2, pv: 4, texte: E("blesse", 1, { type: "soinVitrine", valeur: 2 }) },
  "carte.vase_en_verre_moule_laluck_signe": { cout: 5, attaque: 3, pv: 5, texte: E("pose", 3, { type: "degats", cible: "tousObjetsAdverses", valeur: 2 }) },

  // ── Bricolage (8) : attaque haute, Prompt ──
  "carte.marteau_menuisier": { cout: 1, attaque: 2, pv: 1 },
  "carte.boite_outils_complete": { cout: 3, attaque: 3, pv: 4 },
  "carte.etabli_pliant_ancien": { cout: 3, attaque: 3, pv: 3, texte: { type: "prompt" } },
  "carte.enclume_petit_modele": { cout: 2, attaque: 2, pv: 2, texte: { type: "prompt" } },
  "carte.scie_egoine_de_charpentier": { cout: 4, attaque: 5, pv: 4 },
  "carte.boite_d_outils_de_manufacture_signee": { cout: 5, attaque: 4, pv: 4, texte: E("casse", 3, { type: "degats", cible: "tousObjetsAdverses", valeur: 2 }) },
  "carte.rabot_d_ebeniste_a_semelle_modele_605": { cout: 4, attaque: 4, pv: 3, texte: E("attaque", 2, { type: "degats", cible: "vitrineAdverse", valeur: 1 }) },
  "carte.machine_a_coudre_en_fonte_a_pedale_xixe": { cout: 5, attaque: 5, pv: 4, texte: E("debutTour", 2, { type: "gain", stat: "attaque", cible: "soi", valeur: 1 }) },
};

export function statsDuel(id: string): StatsDuel {
  const s = CARTES_DUEL[id];
  if (!s) throw new Error(`Carte de duel inconnue : ${id}`);
  return s;
}
