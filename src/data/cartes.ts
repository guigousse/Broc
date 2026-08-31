import type { PieceCollection } from "@/data/pieces";
import type { CategorieObjet, Rarete } from "@/types/game";

const PRIX: Record<Rarete, number> = { commun: 10, rare: 40, legendaire: 150 };

// [source, nom, rarete] — 30 communes / 15 rares / 5 légendaires, ordre = ordre des pochettes.
type Row = [source: string, nom: string, rarete: Rarete, serie: CategorieObjet];
const ROWS: Row[] = [
  // Musique — 5 c, 2 r, 1 l
  ["mus.vinyle_des_loups_des_steppes_bark_to_be_free", "Vinyle des Loups des Steppes — 'Bark to Be Free'", "commun", "Musique"],
  ["mus.vinyle_grand_max_des_combines", "Vinyle Babylone — 'Sur mon île'", "commun", "Musique"],
  ["mus.33tours_jazz_1", "33 tours de jazz inconnu", "commun", "Musique"],
  ["mus.harmonica_chromatique_de_bluesman", "Harmonica chromatique de bluesman", "commun", "Musique"],
  ["mus.vinyle_stevranos_vive_la_fet_a", "Vinyle Stevranos 'Vive la fêt(a)'", "commun", "Musique"],
  ["mus.guitare_classique_ancienne", "Vieille guitare classique", "rare", "Musique"],
  ["mus.test_pressing_des_trolling_sons", "Test pressing des Trolling Sons", "rare", "Musique"],
  ["leg.mus.violon_de_maitre_cremonais_1715", "Violon de maître crémonais (1715)", "legendaire", "Musique"],
  // Jeux & Loisirs — 4 c, 2 r, 1 l
  ["jx.cartouche_le_plombier_sauteur_8_bit", "Cartouche 'Le Plombier Sauteur' (8-bit)", "commun", "Jeux & Loisirs"],
  ["jx.manette_megadrive", "Manette de console 16-bit", "commun", "Jeux & Loisirs"],
  ["jx.playbox_pocket", "PlayBox Pocket", "commun", "Jeux & Loisirs"],
  ["jx.risk_1992", "Jeu 'Krise' (1992)", "commun", "Jeux & Loisirs"],
  ["jx.figurine_de_guerre_galactique_1978", "Figurine de Guerre galactique (1978)", "rare", "Jeux & Loisirs"],
  ["jx.flipper_a_plateau_annees_60", "Flipper à plateau années 60", "rare", "Jeux & Loisirs"],
  ["leg.jx.cartouche_stadium_events", "Cartouche 8-bit de sport ultra-rare", "legendaire", "Jeux & Loisirs"],
  // Livres & Papeterie — 4 c, 2 r, 1 l
  ["lv.monte_cristo", "Roman 'Le Comte de Monte-Cristo'", "commun", "Livres & Papeterie"],
  ["lv.les_aventures_de_titou_cap_sur_la_lune", "Les Aventures de Titou — 'Cap sur la Lune'", "commun", "Livres & Papeterie"],
  ["lv.paris_match_70s", "Lot de magazines d'actualité 70s", "commun", "Livres & Papeterie"],
  ["lv.miserables_pleiade", "Les Misérables — reliure prestige cuir", "commun", "Livres & Papeterie"],
  ["lv.conte_de_l_aviateur_et_de_l_enfant_roi_edition", "Conte de l'Aviateur et de l'Enfant-Roi (édition 1943)", "rare", "Livres & Papeterie"],
  ["lv.le_petit_moustachu_edition_originale_1961", "Le Petit Moustachu — édition originale 1961", "rare", "Livres & Papeterie"],
  ["leg.lv.gutenberg_feuillet", "Feuillet original Bible de Gutenberg", "legendaire", "Livres & Papeterie"],
  // Mode — 4 c, 2 r, 1 l
  ["mo.veste_jean_delavee", "Veste en jean délavée", "commun", "Mode"],
  ["mo.blouson_cuir_vintage", "Blouson cuir vintage", "commun", "Mode"],
  ["mo.chapeau_feutre_50s", "Chapeau de feutre années 50", "commun", "Mode"],
  ["mo.robe_50s_pinup", "Robe pin-up années 50", "commun", "Mode"],
  ["mo.broche_emaillee_artdeco", "Broche émaillée Art Déco", "rare", "Mode"],
  ["mo.sac_a_main_talaria", "Sac à main Talaria", "rare", "Mode"],
  ["leg.mo.la_petite_robe_noire_chaine_1925", "La petite robe noire Chaîné (1925)", "legendaire", "Mode"],
  // Maison — 4 c, 2 r, 1 l
  ["ma.figurine_porcelaine", "Petite figurine en porcelaine", "commun", "Maison"],
  ["ma.service_the_faience", "Service à thé en faïence", "commun", "Maison"],
  ["ma.tabouret_bois_patine", "Tabouret en bois patiné", "commun", "Maison"],
  ["ma.vase_en_cristal_baraka", "Vase en cristal Baraka", "commun", "Maison"],
  ["ma.boite_musique_ancienne", "Boîte à musique ancienne", "rare", "Maison"],
  ["ma.lampe_bureau_artdeco", "Lampe de bureau Art Déco", "rare", "Maison"],
  ["leg.ma.uf_joaillier_imperial_en_email_replique", "Œuf joaillier impérial en émail (réplique)", "legendaire", "Maison"],
  // Objets d'art — 4 c, 2 r
  ["art.aquarelle_paysage_anonyme", "Aquarelle de paysage (anonyme XIXe)", "commun", "Objets d'art"],
  ["art.terre_cuite_buste", "Petit buste en terre cuite", "commun", "Objets d'art"],
  ["art.masque_tribal_decoratif", "Masque tribal décoratif", "commun", "Objets d'art"],
  ["art.bronze_animalier", "Bronze animalier signé", "commun", "Objets d'art"],
  ["art.vase_galle_signe", "Vase Émile Gallé signé", "rare", "Objets d'art"],
  ["art.dessin_surrealiste_aux_montres_molles_signe", "Dessin surréaliste aux montres molles (signé)", "rare", "Objets d'art"],
  // Bricolage — 5 c, 3 r
  ["br.marteau_menuisier", "Marteau de menuisier", "commun", "Bricolage"],
  ["br.boite_outils_complete", "Boîte à outils complète", "commun", "Bricolage"],
  ["br.etabli_pliant_ancien", "Établi pliant ancien", "commun", "Bricolage"],
  ["br.pince_etirer_cuivre", "Pince à étirer en cuivre", "commun", "Bricolage"],
  ["br.scie_egoine_de_charpentier", "Scie égoïne de charpentier", "commun", "Bricolage"],
  ["br.boite_d_outils_de_manufacture_signee", "Boîte d'outils de manufacture (signée)", "rare", "Bricolage"],
  ["br.rabot_d_ebeniste_a_semelle_modele_605", "Rabot d'ébéniste à semelle (modèle 605)", "rare", "Bricolage"],
  ["br.coffret_ebeniste_xixe", "Coffret d'outils d'ébéniste XIXe", "rare", "Bricolage"],
];

/** `leg.mus.x` → `x`, `br.x` → `x`. */
export function slugDeSource(source: string): string {
  return source.replace(/^leg\./, "").replace(/^[a-z]+\./, "");
}

export const CARTES: PieceCollection[] = ROWS.map(([source, nom, rarete, serie], ordre) => ({
  id: `carte.${slugDeSource(source)}`,
  nom,
  album: "classeur",
  serie,
  rarete,
  prixRefBase: PRIX[rarete],
  source,
  ordre,
}));
