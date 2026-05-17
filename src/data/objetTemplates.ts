import type { CategorieObjet, Rarete } from "@/types/game";

export interface ObjetTemplate {
  templateId: string;
  nom: string;
  categorie: CategorieObjet;
  rarete: Rarete;
  /** Valeur de référence si "Très bon" */
  prixRefBase: number;
  /** Si vrai, ne peut être possédé qu'une fois par partie. */
  unique?: boolean;
}

export const OBJET_TEMPLATES: ObjetTemplate[] = [
  // Musique
  { templateId: "mus.vinyle_pink_floyd_wall", nom: "Vinyle Pink Floyd 'The Wall'", categorie: "Musique", rarete: "commun", prixRefBase: 45 },
  { templateId: "mus.vinyle_telephone_dure_limite", nom: "Vinyle Téléphone 'Dure Limite'", categorie: "Musique", rarete: "commun", prixRefBase: 20 },
  { templateId: "mus.33tours_jazz_inconnu", nom: "33 tours de jazz inconnu", categorie: "Musique", rarete: "commun", prixRefBase: 8 },
  { templateId: "mus.cd_nirvana_in_utero", nom: "Coffret CD Nirvana 'In Utero'", categorie: "Musique", rarete: "commun", prixRefBase: 18 },
  { templateId: "mus.harmonica_hohner", nom: "Harmonica chromatique Hohner", categorie: "Musique", rarete: "commun", prixRefBase: 35 },
  { templateId: "mus.guitare_classique_ancienne", nom: "Vieille guitare classique", categorie: "Musique", rarete: "rare", prixRefBase: 120 },

  // Jeux & Loisirs
  { templateId: "jx.cartouche_mario", nom: "Cartouche Super Mario Bros", categorie: "Jeux & Loisirs", rarete: "commun", prixRefBase: 80 },
  { templateId: "jx.manette_megadrive", nom: "Manette Megadrive", categorie: "Jeux & Loisirs", rarete: "commun", prixRefBase: 35 },
  { templateId: "jx.gameboy_color_violette", nom: "Game Boy Color violette", categorie: "Jeux & Loisirs", rarete: "commun", prixRefBase: 90 },
  { templateId: "jx.ps1_crash_bandicoot", nom: "Jeu PS1 'Crash Bandicoot'", categorie: "Jeux & Loisirs", rarete: "commun", prixRefBase: 40 },
  { templateId: "jx.risk_1992", nom: "Boîte 'Risk' édition 1992", categorie: "Jeux & Loisirs", rarete: "commun", prixRefBase: 25 },
  { templateId: "jx.cartes_pokemon_1ere_edition", nom: "Lot cartes Pokémon 1ère édition", categorie: "Jeux & Loisirs", rarete: "rare", prixRefBase: 220 },
  { templateId: "jx.figurine_star_wars_kenner_78", nom: "Figurine Star Wars Kenner 1978", categorie: "Jeux & Loisirs", rarete: "rare", prixRefBase: 110 },

  // Livres & Papeterie
  { templateId: "lv.monte_cristo", nom: "Roman 'Le Comte de Monte-Cristo'", categorie: "Livres & Papeterie", rarete: "commun", prixRefBase: 10 },
  { templateId: "lv.tintin_lune", nom: "BD Tintin 'On a marché sur la Lune'", categorie: "Livres & Papeterie", rarete: "commun", prixRefBase: 22 },
  { templateId: "lv.paris_match_70s", nom: "Lot de magazines Paris-Match 70s", categorie: "Livres & Papeterie", rarete: "commun", prixRefBase: 14 },
  { templateId: "lv.cartes_postales_anciennes", nom: "Cartes postales anciennes (boîte)", categorie: "Livres & Papeterie", rarete: "commun", prixRefBase: 9 },

  // Mode
  { templateId: "mo.veste_jean_delavee", nom: "Veste en jean délavée", categorie: "Mode", rarete: "commun", prixRefBase: 15 },
  { templateId: "mo.blouson_cuir_vintage", nom: "Blouson cuir vintage", categorie: "Mode", rarete: "commun", prixRefBase: 60 },
  { templateId: "mo.sac_lancel", nom: "Sac à main en cuir Lancel", categorie: "Mode", rarete: "rare", prixRefBase: 110 },
  { templateId: "mo.broche_emaillee_artdeco", nom: "Broche émaillée Art Déco", categorie: "Mode", rarete: "rare", prixRefBase: 60 },
  { templateId: "mo.chapeau_feutre_50s", nom: "Chapeau de feutre années 50", categorie: "Mode", rarete: "commun", prixRefBase: 22 },

  // Maison
  { templateId: "ma.figurine_porcelaine", nom: "Petite figurine en porcelaine", categorie: "Maison", rarete: "commun", prixRefBase: 12 },
  { templateId: "ma.boite_musique_ancienne", nom: "Boîte à musique ancienne", categorie: "Maison", rarete: "rare", prixRefBase: 55 },
  { templateId: "ma.statuette_africaine_bois", nom: "Statuette africaine en bois", categorie: "Maison", rarete: "commun", prixRefBase: 25 },
  { templateId: "ma.service_the_faience", nom: "Service à thé en faïence", categorie: "Maison", rarete: "commun", prixRefBase: 30 },
  { templateId: "ma.verres_a_pied_lot6", nom: "Lot de 6 verres à pied", categorie: "Maison", rarete: "commun", prixRefBase: 18 },
  { templateId: "ma.lampe_bureau_artdeco", nom: "Lampe de bureau Art Déco", categorie: "Maison", rarete: "rare", prixRefBase: 130 },
  { templateId: "ma.miroir_dore_fronton", nom: "Miroir doré à fronton", categorie: "Maison", rarete: "rare", prixRefBase: 140 },
  { templateId: "ma.tabouret_bois_patine", nom: "Tabouret en bois patiné", categorie: "Maison", rarete: "commun", prixRefBase: 28 },

  // Bricolage
  { templateId: "br.marteau_menuisier", nom: "Marteau de menuisier", categorie: "Bricolage", rarete: "commun", prixRefBase: 8 },
  { templateId: "br.boite_outils_complete", nom: "Boîte à outils complète", categorie: "Bricolage", rarete: "commun", prixRefBase: 45 },
  { templateId: "br.etabli_pliant_ancien", nom: "Établi pliant ancien", categorie: "Bricolage", rarete: "commun", prixRefBase: 55 },
  { templateId: "br.pince_etirer_cuivre", nom: "Pince à étirer en cuivre", categorie: "Bricolage", rarete: "commun", prixRefBase: 12 },
];
