import type { PieceCollection } from "@/data/pieces";
import type { CategorieObjet, Rarete } from "@/types/game";

const PRIX: Record<Rarete, number> = { commun: 10, rare: 40, legendaire: 150 };

// [source, nom, rarete, serie] — 30 communes / 15 rares / 5 légendaires, ordre = ordre des pochettes.
// Le NOM est celui de la CARTE, pas de l'objet : l'objet devenu petit monstre, détourné par un jeu
// de mots (« la Borgne d'arcade », « l'Encrieur », « Service hanthé » — décision Guillaume 2026-09-04).
// Les autres langues ont leur propre jeu de mots dans `contenu/<locale>/cartes.ts`.
type Row = [source: string, nom: string, rarete: Rarete, serie: CategorieObjet];
const ROWS: Row[] = [
  // Musique — 5 c, 2 r, 1 l
  ["mus.radio_cassette_annees_80", "Radio-Cassecou années 80", "commun", "Musique"],
  ["mus.tourne_disque_a_courroie_vintage", "Tourment-disque vintage", "commun", "Musique"],
  ["mus.metronome_mecanique_a_pyramide", "Monstronome à pyramide", "commun", "Musique"],
  ["mus.harmonica_chromatique_de_bluesman", "Harmonicroc de bluesman", "commun", "Musique"],
  ["mus.ukulele_soprano", "Ukulélaid soprano", "commun", "Musique"],
  ["mus.guitare_classique_ancienne", "Guitarasque classique", "rare", "Musique"],
  ["mus.saxophone_alto_professionnel", "Saxophobe alto", "rare", "Musique"],
  ["leg.mus.violon_de_maitre_cremonais_1715", "Violent crémonais (1715)", "legendaire", "Musique"],
  // Jeux & Loisirs — 4 c, 2 r, 1 l
  ["jx.ours_en_peluche_mohair_recent", "Nounours-garou en mohair", "commun", "Jeux & Loisirs"],
  ["jx.manette_megadrive", "Mordnette 16-bit", "commun", "Jeux & Loisirs"],
  ["jx.yo_yo_duncan_alu", "Yo-Yeux de compétition", "commun", "Jeux & Loisirs"],
  ["jx.boite_de_construction_metallique_no_3", "Boîte de destruction métallique n°3", "commun", "Jeux & Loisirs"],
  ["jx.borne_arcade_mini", "Borgne d'arcade", "rare", "Jeux & Loisirs"],
  ["jx.flipper_a_plateau_annees_60", "Flippeur années 60", "rare", "Jeux & Loisirs"],
  ["leg.jx.baby_foot_de_competition_minibon_homologue", "Baby-fou de compétition", "legendaire", "Jeux & Loisirs"],
  // Livres & Papeterie — 4 c, 2 r, 1 l
  ["lv.encrier_porcelaine_xixe", "Encrieur en porcelaine", "commun", "Livres & Papeterie"],
  ["lv.lampe_huile_biblio", "Lampe à hurle", "commun", "Livres & Papeterie"],
  ["lv.stylo_waterman_vintage", "Stylo à rêves noirs", "commun", "Livres & Papeterie"],
  ["lv.coffret_loupes_lecture", "Coffret de loups", "commun", "Livres & Papeterie"],
  ["lv.stylo_plume_haut_de_gamme_a_l_etoile_blanche_d", "Stylo à l'étoile blême", "rare", "Livres & Papeterie"],
  ["lv.encrier_argent_xixe", "Écrieur en argent", "rare", "Livres & Papeterie"],
  ["leg.lv.manuscrit_enlumine_xve", "Manus-cri enluminé", "legendaire", "Livres & Papeterie"],
  // Mode — 4 c, 2 r, 1 l
  ["mo.bottes_camperos_cuir", "Bottes croc-peros", "commun", "Mode"],
  ["mo.montre_doree_vintage", "Monstre dorée", "commun", "Mode"],
  ["mo.chapeau_feutre_50s", "Chapeau de fauve", "commun", "Mode"],
  ["mo.robe_50s_pinup", "Robe pince-up", "commun", "Mode"],
  ["mo.veste_smoking_msg", "Veste smog-king", "rare", "Mode"],
  ["mo.sac_a_main_talaria", "Sac à mains Talaria", "rare", "Mode"],
  ["leg.mo.la_petite_robe_noire_chaine_1925", "Petite robe noire enchaînée (1925)", "legendaire", "Mode"],
  // Maison — 4 c, 2 r, 1 l
  ["ma.cafetiere_emaillee_50s", "Cafetueuse émaillée", "commun", "Maison"],
  ["ma.service_the_faience", "Service hanthé", "commun", "Maison"],
  ["ma.tabouret_bois_patine", "Tabourreau patiné", "commun", "Maison"],
  ["ma.vase_en_cristal_baraka", "Vase en cristal bagarreur", "commun", "Maison"],
  ["ma.boite_musique_ancienne", "Boîte à mordsique", "rare", "Maison"],
  ["ma.lampe_bureau_artdeco", "Lampe Art Décroc", "rare", "Maison"],
  ["leg.ma.uf_joaillier_imperial_en_email_replique", "Œuf vampirial en émail", "legendaire", "Maison"],
  // Objets d'art — 4 c, 2 r
  ["art.vase_art_deco_bebert_germain", "Vase Art Dévoro", "commun", "Objets d'art"],
  ["art.boite_marqueterie_florentine", "Boîte de mordqueterie", "commun", "Objets d'art"],
  ["art.masque_tribal_decoratif", "Masque terrible", "commun", "Objets d'art"],
  ["art.bronze_animalier", "Bronze anormalier", "commun", "Objets d'art"],
  ["art.vase_galle_signe", "Vase galleux signé", "rare", "Objets d'art"],
  ["art.vase_en_verre_moule_laluck_signe", "Vase Lalouche signé", "rare", "Objets d'art"],
  // Bricolage — 5 c, 3 r
  ["br.marteau_menuisier", "Marteau de menacier", "commun", "Bricolage"],
  ["br.boite_outils_complete", "Boîte à goules", "commun", "Bricolage"],
  ["br.etabli_pliant_ancien", "Diabli pliant", "commun", "Bricolage"],
  ["br.enclume_petit_modele", "Engloutume d'établi", "commun", "Bricolage"],
  ["br.scie_egoine_de_charpentier", "Scie égoïste", "commun", "Bricolage"],
  ["br.boite_d_outils_de_manufacture_signee", "Boîte de malfacture signée", "rare", "Bricolage"],
  ["br.rabot_d_ebeniste_a_semelle_modele_605", "Crabot d'ébéniste", "rare", "Bricolage"],
  ["br.machine_a_coudre_en_fonte_a_pedale_xixe", "Machine à mordre en fonte", "rare", "Bricolage"],
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
