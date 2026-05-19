import type { ObjetTemplate } from "@/data/objetTemplates";

/**
 * Templates légendaires inspirés du réel. 3 par catégorie.
 * Ces objets ont une probabilité de tirage très faible (~2 %) et n'apparaissent
 * que via le `poolExclusif` des brocantes 3⭐.
 */
export const LEGENDAIRES: ObjetTemplate[] = [
  // Musique
  { templateId: "leg.mus.stradivarius", nom: "Violon Stradivarius (1715)", categorie: "Musique", rarete: "legendaire", prixRefBase: 4500 },
  { templateId: "leg.mus.piano_pleyel_concert", nom: "Piano Pleyel de concert (1900)", categorie: "Musique", rarete: "legendaire", prixRefBase: 3800 },
  { templateId: "leg.mus.guitare_hendrix_provenance", nom: "Guitare avec provenance Hendrix", categorie: "Musique", rarete: "legendaire", prixRefBase: 5200 },

  // Jeux & Loisirs
  { templateId: "leg.jx.cartouche_stadium_events", nom: "Cartouche NES 'Stadium Events'", categorie: "Jeux & Loisirs", rarete: "legendaire", prixRefBase: 3800 },
  { templateId: "leg.jx.babyfoot_bonzini_itsf", nom: "Baby-foot Bonzini ITSF (compétition)", categorie: "Jeux & Loisirs", rarete: "legendaire", prixRefBase: 2200 },
  { templateId: "leg.jx.cartouche_nwc_1990", nom: "Cartouche Nintendo World Championships 1990", categorie: "Jeux & Loisirs", rarete: "legendaire", prixRefBase: 4200 },

  // Livres & Papeterie
  { templateId: "leg.lv.miserables_originale", nom: "Édition originale 'Les Misérables' (1862)", categorie: "Livres & Papeterie", rarete: "legendaire", prixRefBase: 2200 },
  { templateId: "leg.lv.gutenberg_feuillet", nom: "Feuillet original Bible de Gutenberg", categorie: "Livres & Papeterie", rarete: "legendaire", prixRefBase: 6500 },
  { templateId: "leg.lv.manuscrit_enlumine_xve", nom: "Manuscrit enluminé du XVe siècle", categorie: "Livres & Papeterie", rarete: "legendaire", prixRefBase: 4200 },

  // Mode
  { templateId: "leg.mo.robe_chanel_1925", nom: "Robe Chanel n°5 originale (1925)", categorie: "Mode", rarete: "legendaire", prixRefBase: 3000 },
  { templateId: "leg.mo.dior_new_look_1955", nom: "Robe haute couture Dior 'New Look' (1955)", categorie: "Mode", rarete: "legendaire", prixRefBase: 3500 },
  { templateId: "leg.mo.birkin_himalaya", nom: "Sac Birkin Himalaya (provenance)", categorie: "Mode", rarete: "legendaire", prixRefBase: 4500 },

  // Maison
  { templateId: "leg.ma.oeuf_faberge", nom: "Œuf de Fabergé (réplique impériale)", categorie: "Maison", rarete: "legendaire", prixRefBase: 5500 },
  { templateId: "leg.ma.tapis_savonnerie_xviie", nom: "Tapis de la Savonnerie (XVIIe)", categorie: "Maison", rarete: "legendaire", prixRefBase: 4800 },
  { templateId: "leg.ma.pendule_louis_xiv_boulle", nom: "Pendule Louis XIV en marqueterie Boulle", categorie: "Maison", rarete: "legendaire", prixRefBase: 4200 },

  // Objets d'art
  { templateId: "leg.art.dessin_picasso_etude", nom: "Dessin signé Picasso (étude)", categorie: "Objets d'art", rarete: "legendaire", prixRefBase: 4800 },
  { templateId: "leg.art.dessin_matisse_etude", nom: "Dessin signé Henri Matisse (étude)", categorie: "Objets d'art", rarete: "legendaire", prixRefBase: 4200 },
  { templateId: "leg.art.toile_chagall_attribuee", nom: "Toile attribuée à Marc Chagall (étude)", categorie: "Objets d'art", rarete: "legendaire", prixRefBase: 5500 },

  // Bricolage
  { templateId: "leg.br.scie_japonaise_edo", nom: "Scie japonaise période Edo", categorie: "Bricolage", rarete: "legendaire", prixRefBase: 800 },
  { templateId: "leg.br.coffret_compagnon_signe", nom: "Coffret de Compagnon du Devoir signé", categorie: "Bricolage", rarete: "legendaire", prixRefBase: 2200 },
  { templateId: "leg.br.tour_holtzapffel_xixe", nom: "Tour à métaux Holtzapffel (XIXe)", categorie: "Bricolage", rarete: "legendaire", prixRefBase: 3800 },
];
