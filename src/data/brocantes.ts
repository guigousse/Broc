import type { Brocante, BrocanteTier } from "@/types/game";

/**
 * Droit d'entrée payé à chaque session (chinage OU vente), par tier.
 */
export const FRAIS_ENTREE: Record<BrocanteTier, number> = {
  1: 5,
  2: 10,
  3: 25,
  4: 50,
};

export function fraisEntree(brocante: Brocante): number {
  if (brocante.id === "vide-grenier-quartier") return 0;
  return FRAIS_ENTREE[brocante.tier];
}

export const BROCANTES: Brocante[] = [
  // ============================================================
  // TIER 1 — 5 brocantes (2 générales + 3 spécialisées)
  // ============================================================
  {
    id: "vide-grenier-quartier",
    nom: "Vide-grenier du quartier",
    description:
      "Quelques tables dépliées sur la place. Petits prix, peu de pépites, mais on doit bien commencer quelque part.",
    ambiance: "Familial",
    tier: 1,
    etoiles: 1,
    taillePool: 6,
    poolExclusif: [],
    conditionDeblocage: { type: "depart" },
  },
  {
    id: "marche-aux-puces-dimanche",
    nom: "Marché aux puces du dimanche",
    description:
      "Le grand rendez-vous des chineurs. Plus de monde, plus de choix, des vendeurs plus malins.",
    ambiance: "Dense",
    tier: 1,
    etoiles: 1,
    taillePool: 8,
    poolExclusif: [],
    conditionDeblocage: { type: "valeurCollection", montant: 30 },
  },
  {
    id: "bouquinerie-plein-air",
    nom: "Bouquinerie de plein air",
    description:
      "Des cartons de livres alignés sur des tréteaux. Les amateurs s'y attardent des heures.",
    ambiance: "Studieux",
    tier: 1,
    etoiles: 1,
    specialisation: "Livres & Papeterie",
    taillePool: 7,
    poolExclusif: [],
    conditionDeblocage: { type: "valeurCollectionCategorie", categorie: "Livres & Papeterie", montant: 20 },
  },
  {
    id: "vide-dressing-centre",
    nom: "Vide-dressing du centre",
    description:
      "Penderies déballées sur des portants. Vintage seventies, sacs cabossés, broches oubliées.",
    ambiance: "Coloré",
    tier: 1,
    etoiles: 1,
    specialisation: "Mode",
    taillePool: 7,
    poolExclusif: [],
    conditionDeblocage: { type: "valeurCollectionCategorie", categorie: "Mode", montant: 30 },
  },
  {
    id: "brocante-club-jeux",
    nom: "Brocante du club de jeux",
    description:
      "Cartouches NES dans des bacs, boîtes de plateaux empilées. Les nostalgiques s'y croisent.",
    ambiance: "Geek",
    tier: 1,
    etoiles: 1,
    specialisation: "Jeux & Loisirs",
    taillePool: 7,
    poolExclusif: [],
    conditionDeblocage: { type: "valeurCollectionCategorie", categorie: "Jeux & Loisirs", montant: 40 },
  },

  // ============================================================
  // TIER 2 — 5 brocantes (2 générales + 3 spécialisées)
  // ============================================================
  {
    id: "deballage-collectionneurs",
    nom: "Déballage des collectionneurs",
    description:
      "Réservé aux portefeuilles bien garnis. Les pièces rares y circulent, mais à quel prix ?",
    ambiance: "Sélect",
    tier: 2,
    etoiles: 2,
    taillePool: 9,
    poolExclusif: [],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 250 },
        { type: "brocantesDebloquees", tier: 1, nombre: 3 },
      ],
    },
  },
  {
    id: "marche-saint-ouen",
    nom: "Marché Saint-Ouen",
    description:
      "Le mythique marché aux puces. Antiquaires patentés, prix qui piquent, pépites possibles.",
    ambiance: "Historique",
    tier: 2,
    etoiles: 2,
    taillePool: 10,
    poolExclusif: [],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 350 },
        { type: "valeurCollectionCategorie", categorie: "Maison", montant: 100 },
      ],
    },
  },
  {
    id: "disquaire-independant",
    nom: "Disquaire indépendant",
    description:
      "Une cave sombre, des bacs à perte de vue, un patron qui connaît chaque pochette.",
    ambiance: "Vinyle",
    tier: 2,
    etoiles: 2,
    specialisation: "Musique",
    taillePool: 8,
    poolExclusif: [],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 300 },
        { type: "valeurCollectionCategorie", categorie: "Musique", montant: 100 },
      ],
    },
  },
  {
    id: "atelier-bricoleur",
    nom: "Atelier du bricoleur",
    description:
      "Vieux outils en pagaille, scies japonaises et tournevis d'avant-guerre.",
    ambiance: "Sciure",
    tier: 2,
    etoiles: 2,
    specialisation: "Bricolage",
    taillePool: 8,
    poolExclusif: [],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 280 },
        { type: "valeurCollectionCategorie", categorie: "Bricolage", montant: 80 },
      ],
    },
  },
  {
    id: "marche-antiquaires-bibelots",
    nom: "Marché des antiquaires (bibelots)",
    description:
      "Vitrines fermées à clé, vendeurs qui sortent les pièces avec des gants.",
    ambiance: "Précieux",
    tier: 2,
    etoiles: 2,
    specialisation: "Maison",
    taillePool: 9,
    poolExclusif: [],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 350 },
        { type: "valeurCollectionCategorie", categorie: "Maison", montant: 130 },
      ],
    },
  },

  // ============================================================
  // TIER 3 — 5 brocantes (2 générales + 3 spécialisées)
  // Les LÉGENDAIRES vivent ici (poolExclusif).
  // ============================================================
  {
    id: "foire-chatou",
    nom: "Foire de Chatou",
    description:
      "Deux fois par an, l'Île des Impressionnistes accueille la fine fleur du métier.",
    ambiance: "Mondain",
    tier: 3,
    etoiles: 3,
    taillePool: 10,
    // Légendaires des catégories non couvertes par les spé 3⭐ : Jeux + Livres
    poolExclusif: [
      "leg.jx.cartouche_stadium_events",
      "leg.jx.babyfoot_bonzini_itsf",
      "leg.jx.cartouche_nwc_1990",
      "leg.lv.miserables_originale",
      "leg.lv.gutenberg_feuillet",
      "leg.lv.manuscrit_enlumine_xve",
    ],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 1000 },
        { type: "brocantesDebloquees", tier: 2, nombre: 5 },
      ],
    },
  },
  {
    id: "salon-grands-collectionneurs",
    nom: "Salon des grands collectionneurs",
    description:
      "Cercle fermé, sur invitation. Les pièces les plus rares y trouvent leur écrin.",
    ambiance: "Confidentiel",
    tier: 3,
    etoiles: 3,
    taillePool: 9,
    // Légendaire Bricolage (le 6e, non couvert par spé 3⭐)
    poolExclusif: [
      "leg.br.scie_japonaise_edo",
      "leg.br.coffret_compagnon_signe",
      "leg.br.tour_holtzapffel_xixe",
    ],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 1500 },
        { type: "brocantesDebloquees", tier: 2, nombre: 5 },
      ],
    },
  },
  {
    id: "drouot-mode-couture",
    nom: "Drouot — Mode et Couture",
    description:
      "Ventes thématiques où passent les grandes pièces : robes signées, sacs iconiques.",
    ambiance: "Couture",
    tier: 3,
    etoiles: 3,
    specialisation: "Mode",
    taillePool: 8,
    poolExclusif: [
      "leg.mo.robe_chanel_1925",
      "leg.mo.dior_new_look_1955",
      "leg.mo.birkin_himalaya",
    ],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 1200 },
        { type: "valeurCollectionCategorie", categorie: "Mode", montant: 400 },
      ],
    },
  },
  {
    id: "salon-violon-ancien",
    nom: "Salon du violon ancien",
    description:
      "Luthiers, conservateurs, virtuoses. Le silence y vaut de l'or, les instruments aussi.",
    ambiance: "Lutherie",
    tier: 3,
    etoiles: 3,
    specialisation: "Musique",
    taillePool: 7,
    poolExclusif: [
      "leg.mus.stradivarius",
      "leg.mus.piano_pleyel_concert",
      "leg.mus.guitare_hendrix_provenance",
    ],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 1400 },
        { type: "valeurCollectionCategorie", categorie: "Musique", montant: 500 },
      ],
    },
  },
  {
    id: "galerie-arts-decoratifs",
    nom: "Galerie des arts décoratifs",
    description:
      "Faïence, cristal, dorures. Les pièces sont signées, les prix font tousser.",
    ambiance: "Galerie",
    tier: 3,
    etoiles: 3,
    specialisation: "Maison",
    taillePool: 8,
    poolExclusif: [
      "leg.ma.oeuf_faberge",
      "leg.ma.tapis_savonnerie_xviie",
      "leg.ma.pendule_louis_xiv_boulle",
    ],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 1600 },
        { type: "valeurCollectionCategorie", categorie: "Maison", montant: 600 },
      ],
    },
  },
  {
    id: "galerie-tableaux-sculptures",
    nom: "Galerie Drouot — Tableaux & Sculptures",
    description:
      "Cadres dorés au mur, sculptures sur socles. On y entre comme à l'opéra, on en sort plus pauvre, parfois plus riche.",
    ambiance: "Galerie",
    tier: 3,
    etoiles: 3,
    specialisation: "Objets d'art",
    taillePool: 8,
    poolExclusif: [
      "leg.art.dessin_picasso_etude",
      "leg.art.dessin_matisse_etude",
      "leg.art.toile_chagall_attribuee",
    ],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 1400 },
        { type: "valeurCollectionCategorie", categorie: "Objets d'art", montant: 350 },
      ],
    },
  },

  // ============================================================
  // BOSS — Salon des Antiquaires (tier 4)
  // Toutes les pièces UNIQUES du catalogue y résident.
  // ============================================================
  {
    id: "salon-antiquaires-drouot",
    nom: "Salon des Antiquaires de Drouot",
    description:
      "Le saint des saints. Les plus grands collectionneurs s'y croisent, les pièces uniques y trouvent leur dernier passage.",
    ambiance: "Mythique",
    tier: 4,
    etoiles: 4,
    taillePool: 12,
    poolExclusif: [
      "uniq.mus.violon_paganini",
      "uniq.jx.console_pong_1972",
      "uniq.lv.manuscrit_voltaire",
      "uniq.mo.bijou_marie_antoinette",
      "uniq.ma.vase_ming_dynasty",
      "uniq.art.toile_monet_inedite",
      "uniq.br.coffre_outils_louis_xiv",
    ],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 5000 },
        { type: "brocantesDebloquees", tier: 3, nombre: 5 },
      ],
    },
  },
];

export function getBrocanteById(id: string): Brocante | undefined {
  return BROCANTES.find((b) => b.id === id);
}

export function brocantesParTier(tier: 1 | 2 | 3 | 4): Brocante[] {
  return BROCANTES.filter((b) => b.tier === tier);
}
