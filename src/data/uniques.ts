import type { ObjetTemplate } from "@/data/objetTemplates";

/**
 * 6 objets UNIQUES (un par catégorie) — ne peuvent être possédés qu'une fois par partie.
 * N'apparaissent QUE dans le `poolExclusif` du boss (Grand Salon des Antiquaires).
 * Compléter le catalogue passe par leur acquisition.
 */
export const UNIQUES: ObjetTemplate[] = [
  {
    templateId: "uniq.mus.violon_paganini",
    nom: "Violon \"Il Cannone\" de Paganini",
    categorie: "Musique",
    rarete: "legendaire",
    prixRefBase: 9000,
    unique: true,
  },
  {
    templateId: "uniq.jx.prototype_de_la_toute_premiere_console_de_jeu",
    nom: "Prototype de la toute première console de jeu (1972)",
    categorie: "Jeux & Loisirs",
    rarete: "legendaire",
    prixRefBase: 6500,
    unique: true,
  },
  {
    templateId: "uniq.lv.manuscrit_voltaire",
    nom: "Manuscrit autographe de Voltaire",
    categorie: "Livres & Papeterie",
    rarete: "legendaire",
    prixRefBase: 7800,
    unique: true,
  },
  {
    templateId: "uniq.mo.bijou_marie_antoinette",
    nom: "Les bijoux de la reine",
    categorie: "Mode",
    rarete: "legendaire",
    prixRefBase: 8500,
    unique: true,
  },
  {
    templateId: "uniq.ma.vase_ming_dynasty",
    nom: "Vase porcelaine dynastie Ming",
    categorie: "Maison",
    rarete: "legendaire",
    prixRefBase: 11000,
    unique: true,
  },
  {
    templateId: "uniq.art.toile_monet_inedite",
    nom: "Toile inédite de Claude Monet",
    categorie: "Objets d'art",
    rarete: "legendaire",
    prixRefBase: 12000,
    unique: true,
  },
  {
    templateId: "uniq.br.coffre_outils_louis_xiv",
    nom: "Coffre d'outils d'ébéniste de Louis XIV",
    categorie: "Bricolage",
    rarete: "legendaire",
    prixRefBase: 5200,
    unique: true,
  },
];
