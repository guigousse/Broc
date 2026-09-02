import { albumDe } from "@/data/pieces";

/** Ids dont l'art définitif est livré dans public/cartes/ ou public/timbres/.
 *  Les 50 timbres : pipeline `scripts/generate-timbres.mjs` (gabarit commun +
 *  planches 3×3 Gemini découpées), 2026-09-02. Les cartes restent à faire. */
export const PIECES_AVEC_IMAGE: ReadonlySet<string> = new Set<string>([
  "timbre.arenes_de_nimes",
  "timbre.autocar_route_des_alpes",
  "timbre.ballon_monte_1870",
  "timbre.bebert_bahut",
  "timbre.cerf_en_brame",
  "timbre.chateau_de_chambord",
  "timbre.chouette_hulotte",
  "timbre.cremaillere_du_mont_bleu",
  "timbre.croisiere_du_nil_1932",
  "timbre.dark_father",
  "timbre.dirigeable_aurore",
  "timbre.foxy_crush",
  "timbre.grand_max",
  "timbre.grand_tetras_surcharge",
  "timbre.guerre_galactique_1978",
  "timbre.gypaete_barbu",
  "timbre.herisson_d_europe",
  "timbre.hydravion_ligne_sud",
  "timbre.judith_loiseau",
  "timbre.laluck_verrier",
  "timbre.le_petit_moustachu",
  "timbre.le_plombier_sauteur",
  "timbre.legende_de_solda",
  "timbre.loups_des_steppes",
  "timbre.loutre_de_riviere",
  "timbre.lynx_boreal",
  "timbre.mesange_bleue",
  "timbre.mont_saint_michel",
  "timbre.opera_garnier",
  "timbre.orient_express_quai_7",
  "timbre.ours_des_pyrenees",
  "timbre.palais_ideal",
  "timbre.paquebot_etoile_du_nord",
  "timbre.paul_nazamour",
  "timbre.phare_de_cordouan",
  "timbre.phare_de_ker_avel",
  "timbre.picassiette",
  "timbre.pocket_monster_jungle",
  "timbre.pont_des_arts",
  "timbre.premier_vol_postal_1925",
  "timbre.renard_roux",
  "timbre.ridor_couturier",
  "timbre.roland_duff",
  "timbre.stevranos",
  "timbre.titou_cap_sur_la_lune",
  "timbre.tour_de_l_horloge",
  "timbre.tour_eiffel_erreur_de_couleur",
  "timbre.trolling_sons",
  "timbre.viaduc_de_garabit",
  "timbre.victor_de_la_brasse",
]);

export function pieceImageSrc(id: string, declarees: ReadonlySet<string> = PIECES_AVEC_IMAGE): string | null {
  if (!declarees.has(id)) return null;
  const album = albumDe(id);
  if (album === "classeur") return `/cartes/${id}.webp`;
  if (album === "timbres") return `/timbres/${id}.webp`;
  return null;
}
