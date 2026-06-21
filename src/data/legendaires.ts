import type { ObjetTemplate } from "@/data/objetTemplates";

/**
 * Templates légendaires inspirés du réel. 3 par catégorie.
 * Ces objets ont une probabilité de tirage très faible (~2 %) et n'apparaissent
 * que via le `poolExclusif` des brocantes 3⭐.
 */
export const LEGENDAIRES: ObjetTemplate[] = [
  // Musique
  { templateId: "leg.mus.violon_de_maitre_cremonais_1715", nom: "Violon de maître crémonais (1715)", categorie: "Musique", rarete: "legendaire", prixRefBase: 4500 },
  { templateId: "leg.mus.piano_a_queue_de_concert_1900", nom: "Piano à queue de concert (1900)", categorie: "Musique", rarete: "legendaire", prixRefBase: 3800 },
  { templateId: "leg.mus.guitare_de_legende_de_johny_perdrix_jouee_a_l", nom: "Guitare de légende de Johny Perdrix, jouée à l'envers (provenance)", categorie: "Musique", rarete: "legendaire", prixRefBase: 5200 },

  // Jeux & Loisirs
  { templateId: "leg.jx.cartouche_stadium_events", nom: "Cartouche 8-bit de sport ultra-rare", categorie: "Jeux & Loisirs", rarete: "legendaire", prixRefBase: 3800 },
  { templateId: "leg.jx.baby_foot_de_competition_minibon_homologue", nom: "Baby-foot de compétition MiniBon (homologué)", categorie: "Jeux & Loisirs", rarete: "legendaire", prixRefBase: 2200 },
  { templateId: "leg.jx.cartouche_nwc_1990", nom: "Cartouche du Championnat Mondial 1990 (collector)", categorie: "Jeux & Loisirs", rarete: "legendaire", prixRefBase: 4200 },

  // Livres & Papeterie
  { templateId: "leg.lv.miserables_originale", nom: "Édition originale 'Les Misérables' (1862)", categorie: "Livres & Papeterie", rarete: "legendaire", prixRefBase: 2200 },
  { templateId: "leg.lv.gutenberg_feuillet", nom: "Feuillet original Bible de Gutenberg", categorie: "Livres & Papeterie", rarete: "legendaire", prixRefBase: 6500 },
  { templateId: "leg.lv.manuscrit_enlumine_xve", nom: "Manuscrit enluminé du XVe siècle", categorie: "Livres & Papeterie", rarete: "legendaire", prixRefBase: 4200 },

  // Mode
  { templateId: "leg.mo.la_petite_robe_noire_chaine_1925", nom: "La petite robe noire Chaîné (1925)", categorie: "Mode", rarete: "legendaire", prixRefBase: 3000 },
  { templateId: "leg.mo.robe_ridor_new_look_1955", nom: "Robe Ridor 'New Look' (1955)", categorie: "Mode", rarete: "legendaire", prixRefBase: 3500 },
  { templateId: "leg.mo.birkin_himalaya", nom: "Sac à main d'exception de grande sellerie (provenance)", categorie: "Mode", rarete: "legendaire", prixRefBase: 4500 },

  // Maison
  { templateId: "leg.ma.uf_joaillier_imperial_en_email_replique", nom: "Œuf joaillier impérial en émail (réplique)", categorie: "Maison", rarete: "legendaire", prixRefBase: 5500 },
  { templateId: "leg.ma.tapis_savonnerie_xviie", nom: "Tapis de la Savonnerie (XVIIe)", categorie: "Maison", rarete: "legendaire", prixRefBase: 4800 },
  { templateId: "leg.ma.pendule_louis_xiv_boulle", nom: "Pendule Louis XIV en marqueterie Boulle", categorie: "Maison", rarete: "legendaire", prixRefBase: 4200 },

  // Objets d'art
  { templateId: "leg.art.dessin_cubiste_signe_picassiette_etude", nom: "Dessin cubiste signé Picassiette (étude)", categorie: "Objets d'art", rarete: "legendaire", prixRefBase: 4800 },
  { templateId: "leg.art.dessin_fauviste_aux_gouaches_decoupees_etude", nom: "Dessin fauviste aux gouaches découpées (étude)", categorie: "Objets d'art", rarete: "legendaire", prixRefBase: 4200 },
  { templateId: "leg.art.toile_onirique_de_chacal_etude", nom: "Toile onirique de Chacal (étude)", categorie: "Objets d'art", rarete: "legendaire", prixRefBase: 5500 },

  // Bricolage
  { templateId: "leg.br.scie_japonaise_edo", nom: "Scie japonaise période Edo", categorie: "Bricolage", rarete: "legendaire", prixRefBase: 800 },
  { templateId: "leg.br.coffret_d_outils_de_compagnon", nom: "Coffret d'outils de compagnon", categorie: "Bricolage", rarete: "legendaire", prixRefBase: 2200 },
  { templateId: "leg.br.tour_a_metaux_d_orfevre_de_prestige_xixe", nom: "Tour à métaux d'orfèvre de prestige (XIXe)", categorie: "Bricolage", rarete: "legendaire", prixRefBase: 3800 },
];
