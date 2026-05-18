import type { ObjetTemplate } from "@/data/objetTemplates";

/**
 * 6 objets UNIQUES (un par catégorie) — ne peuvent être possédés qu'une fois par partie.
 * N'apparaissent QUE dans le `poolExclusif` du boss (Salon des Antiquaires de Drouot).
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
    templateId: "uniq.jx.console_pong_1972",
    nom: "Prototype Pong, Atari 1972",
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
    nom: "Bijou ayant appartenu à Marie-Antoinette",
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
    templateId: "uniq.br.coffre_outils_louis_xiv",
    nom: "Coffre d'outils d'ébéniste de Louis XIV",
    categorie: "Bricolage",
    rarete: "legendaire",
    prixRefBase: 5200,
    unique: true,
  },
];
