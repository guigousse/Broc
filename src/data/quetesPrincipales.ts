import type { ConditionDeblocage, MissionCible } from "@/types/game";

export interface ChapitrePrincipal {
  id: string;
  ordre: number;
  condition: ConditionDeblocage;
  payload: {
    titre: string;
    corps: string[];
    cibles: MissionCible[];
    recompense: { argent: number };
    /** Échéance = jour d'injection + offset. Absent ⇒ pas d'échéance. */
    jourLimiteOffset?: number;
  };
}

/**
 * Arc principal : lettres écrites à l'avance par le grand-père antiquaire, avant
 * sa disparition, adressées au joueur. Ton : nostalgie + comédie sarcastique +
 * mystère. Débloquées par la progression ; la finale acquiert l'unique.
 */
export const QUETES_PRINCIPALES: ChapitrePrincipal[] = [
  {
    id: "principale_ch1",
    ordre: 1,
    condition: { type: "depart" },
    payload: {
      titre: "La dernière page du carnet",
      corps: [
        "Mon petit,",
        "Si tu lis ces lignes, c'est que la boutique est à toi — et moi, ailleurs. Ne fais pas cette tête : un antiquaire ne meurt pas, il se déplace, voilà tout.",
        "Avant de partir, j'ai une dernière lubie : retrouve ma vieille **lampe d'atelier**. Elle a éclairé quarante ans de trouvailles. Rapporte-la-moi, façon de parler.",
      ],
      cibles: [{ templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }],
      recompense: { argent: 60 },
      jourLimiteOffset: undefined,
    },
  },
  {
    id: "principale_ch2",
    ordre: 2,
    condition: { type: "brocantesDebloquees", tier: 2, nombre: 1 },
    payload: {
      titre: "Te faire un nom",
      corps: [
        "Déjà reçu chez les grands ? Pas mal, pour un débutant.",
        "Le milieu ne respecte que ceux qui ont l'œil. Dégote-moi une **belle pièce de faïence** — qu'on voie que tu sais reconnaître la qualité.",
        "(Et non, je ne te dirai pas encore où je suis. Patience.)",
      ],
      cibles: [{ templateId: "ma.pichet_faience_emaillee" }],
      recompense: { argent: 110 },
      jourLimiteOffset: undefined,
    },
  },
  {
    id: "principale_ch3",
    ordre: 3,
    condition: { type: "brocantesDebloquees", tier: 3, nombre: 1 },
    payload: {
      titre: "Les portes du beau monde",
      corps: [
        "Tiens, tiens. Les salons feutrés t'ouvrent leurs portes.",
        "Là-haut, on ne pardonne pas l'à-peu-près. Trouve-moi une **gravure en très bel état** — impeccable, tu m'entends.",
        "Ce que je cherchais se cache tout en haut de cette échelle. Comme par hasard.",
      ],
      cibles: [{ templateId: "art.gravure_jouy_paris", etatMin: "Très bon" }],
      recompense: { argent: 220 },
      jourLimiteOffset: undefined,
    },
  },
  {
    id: "principale_ch4",
    ordre: 4,
    condition: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 5000 },
        { type: "brocantesDebloquees", tier: 3, nombre: 5 },
      ],
    },
    payload: {
      titre: "L'invitation",
      corps: [
        "Le Grand Salon des Antiquaires t'a invité. Évidemment qu'il t'a invité — je l'avais prévu, petit.",
        "Tout ça, ce carnet, ces commandes… ce n'était pas pour la lampe ni la faïence. C'était pour t'amener ici. Là où tout a commencé. Là où tout s'est arrêté.",
        "Une dernière chose t'attend dans ce salon. Tu sais laquelle.",
      ],
      cibles: [],
      recompense: { argent: 150 },
      jourLimiteOffset: undefined,
    },
  },
  {
    id: "principale_ch5",
    ordre: 5,
    condition: {
      type: "ET",
      conditions: [
        { type: "valeurCollection", montant: 5000 },
        { type: "brocantesDebloquees", tier: 3, nombre: 5 },
      ],
    },
    payload: {
      titre: "Les bijoux de la reine",
      corps: [
        "Les voilà. **Les bijoux de la reine.** Ce pour quoi j'ai tout quitté, un soir, sans un mot.",
        "Mets la main dessus, et tu comprendras pourquoi je suis parti — et peut-être où me trouver.",
        "Le reste t'appartient, maintenant. Comme tout le reste.",
      ],
      cibles: [{ templateId: "uniq.mo.bijou_marie_antoinette" }],
      recompense: { argent: 500 },
      jourLimiteOffset: undefined,
    },
  },
];
