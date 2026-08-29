import type { PieceCollection, ThemeTimbre } from "@/data/pieces";
import type { Rarete } from "@/types/game";

const PRIX: Record<Rarete, number> = { commun: 10, rare: 40, legendaire: 150 };

type Row = [slug: string, nom: string, rarete: Rarete];
const PAR_THEME: Record<ThemeTimbre, Row[]> = {
  voyage: [
    ["paquebot_etoile_du_nord", "Paquebot « Étoile du Nord »", "commun"],
    ["ballon_monte_1870", "Ballon monté de 1870", "commun"],
    ["orient_express_quai_7", "L'Orient-Express au quai 7", "commun"],
    ["autocar_route_des_alpes", "Autocar de la Route des Alpes", "commun"],
    ["phare_de_ker_avel", "Phare de Ker-Avel", "commun"],
    ["croisiere_du_nil_1932", "Croisière du Nil, 1932", "commun"],
    ["hydravion_ligne_sud", "Hydravion de la Ligne Sud", "rare"],
    ["cremaillere_du_mont_bleu", "Train à crémaillère du Mont-Bleu", "rare"],
    ["dirigeable_aurore", "Dirigeable « Aurore »", "rare"],
    ["premier_vol_postal_1925", "Premier vol postal transsaharien (1925)", "legendaire"],
  ],
  faune: [
    ["renard_roux", "Renard roux", "commun"],
    ["herisson_d_europe", "Hérisson d'Europe", "commun"],
    ["mesange_bleue", "Mésange bleue", "commun"],
    ["cerf_en_brame", "Cerf en brame", "commun"],
    ["loutre_de_riviere", "Loutre de rivière", "commun"],
    ["chouette_hulotte", "Chouette hulotte", "commun"],
    ["lynx_boreal", "Lynx boréal", "rare"],
    ["ours_des_pyrenees", "Ours des Pyrénées", "rare"],
    ["gypaete_barbu", "Gypaète barbu", "rare"],
    ["grand_tetras_surcharge", "Grand Tétras (surcharge inversée)", "legendaire"],
  ],
  monuments: [
    ["tour_de_l_horloge", "Tour de l'Horloge", "commun"],
    ["pont_des_arts", "Pont des Arts", "commun"],
    ["phare_de_cordouan", "Phare de Cordouan", "commun"],
    ["chateau_de_chambord", "Château de Chambord", "commun"],
    ["mont_saint_michel", "Mont-Saint-Michel", "commun"],
    ["arenes_de_nimes", "Arènes de Nîmes", "commun"],
    ["viaduc_de_garabit", "Viaduc de Garabit", "rare"],
    ["opera_garnier", "Opéra Garnier", "rare"],
    ["palais_ideal", "Palais idéal du Facteur Cheval", "rare"],
    ["tour_eiffel_erreur_de_couleur", "Tour Eiffel (erreur de couleur)", "legendaire"],
  ],
  celebrites: [
    ["victor_de_la_brasse", "Victor de la Brasse, chanteur", "commun"],
    ["judith_loiseau", "Judith Loiseau, chanteuse", "commun"],
    ["paul_nazamour", "Paul Nazamour, crooner", "commun"],
    ["stevranos", "Stevranos, roi de la fête", "commun"],
    ["grand_max", "Grand Max des Combines", "commun"],
    ["bebert_bahut", "Bébert Bahut, peintre", "commun"],
    ["picassiette", "Picassiette, maître cubiste", "rare"],
    ["roland_duff", "Roland Duff, fauviste", "rare"],
    ["laluck_verrier", "Laluck, maître verrier", "rare"],
    ["ridor_couturier", "Ridor, couturier du New Look", "legendaire"],
  ],
  "culture-pop": [
    ["le_plombier_sauteur", "Le Plombier Sauteur", "commun"],
    ["foxy_crush", "Foxy Crush", "commun"],
    ["pocket_monster_jungle", "Pocket Monster — la Jungle", "commun"],
    ["dark_father", "Dark Father", "commun"],
    ["titou_cap_sur_la_lune", "Titou — Cap sur la Lune", "commun"],
    ["le_petit_moustachu", "Le Petit Moustachu", "commun"],
    ["loups_des_steppes", "Les Loups des Steppes en tournée", "rare"],
    ["trolling_sons", "Les Trolling Sons", "rare"],
    ["legende_de_solda", "La Légende de Solda", "rare"],
    ["guerre_galactique_1978", "Guerre galactique — affiche de 1978", "legendaire"],
  ],
};

export const TIMBRES: PieceCollection[] = (Object.keys(PAR_THEME) as ThemeTimbre[]).flatMap(
  (theme, ti) =>
    PAR_THEME[theme].map(([slug, nom, rarete], i) => ({
      id: `timbre.${slug}`,
      nom,
      album: "timbres" as const,
      serie: theme,
      rarete,
      prixRefBase: PRIX[rarete],
      ordre: ti * 10 + i,
    })),
);
