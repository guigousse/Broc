/**
 * Séquences de dialogue du grand-père (SP1 trame scénaristique).
 * FR = langue source ; overlays EN/ES dans src/lib/i18n/contenu/{en,es}/dialogues.ts.
 * Les ids sont stables (jamais en save, mais clés d'overlay i18n).
 */

export type HumeurPnj = "souriant" | "emu" | "songeur" | "rieur";

export interface DialogueLigne {
  texte: string;
  humeur: HumeurPnj;
}

export interface DialogueSequence {
  id: string;
  lignes: DialogueLigne[];
}

/** Portraits par humeur (assets provisoires en Task 12, définitifs à générer). */
export const GRAND_PERE_PORTRAITS: Record<HumeurPnj, string> = {
  souriant: "/personas/grand-pere/souriant.webp",
  emu: "/personas/grand-pere/emu.webp",
  songeur: "/personas/grand-pere/songeur.webp",
  rieur: "/personas/grand-pere/rieur.webp",
};

export const SEQUENCES_TUTORIEL: Record<string, DialogueSequence> = {
  tuto_accueil: {
    id: "tuto_accueil",
    lignes: [
      { humeur: "souriant", texte: "Te voilà enfin ! Entre, entre… Attention à la pile de journaux, elle est là depuis 1987." },
      { humeur: "emu", texte: "Cinquante ans que je tiens cette boutique. Chaque objet ici a une histoire… et mes genoux aussi, hélas." },
      { humeur: "songeur", texte: "Il est temps que je passe la main. Et c'est toi que j'ai choisi. Ne fais pas cette tête — tu vas adorer." },
      { humeur: "souriant", texte: "On commence par le commencement : la brocante. La porte est par là, suis-moi." },
    ],
  },
  tuto_chine_entree: {
    id: "tuto_chine_entree",
    lignes: [
      { humeur: "souriant", texte: "Ah, l'odeur des vieilleries au petit matin… Regarde les étals : glisse d'un objet à l'autre, prends ton temps." },
      { humeur: "songeur", texte: "Quand un objet te parle, négocie — ou achète-le au prix affiché si le cœur t'en dit. Vas-y, choisis-en un." },
    ],
  },
  tuto_achat_fait: {
    id: "tuto_achat_fait",
    lignes: [
      { humeur: "rieur", texte: "Bien joué ! Ta grand-mère aurait marchandé deux sous de moins, mais c'est un début." },
      { humeur: "souriant", texte: "Allez, on rentre. Passe par la sortie, ton trésor sous le bras." },
    ],
  },
  tuto_retour: {
    id: "tuto_retour",
    lignes: [
      { humeur: "souriant", texte: "Chiner, c'est le plaisir. Vendre, c'est le métier. Repasse la porte — et cette fois, on étale." },
    ],
  },
  tuto_vente_entree: {
    id: "tuto_vente_entree",
    lignes: [
      { humeur: "songeur", texte: "Les clients vont venir. Écoute-les, laisse-les parler… et ne lâche jamais ton prix trop vite." },
    ],
  },
  tuto_vente_faite: {
    id: "tuto_vente_faite",
    lignes: [
      { humeur: "rieur", texte: "Et voilà ta première vente ! Le tiroir-caisse qui chante, ça ne s'oublie jamais." },
      { humeur: "souriant", texte: "Referme l'étal quand tu veux, et rentrons. J'ai quelque chose pour toi à la maison." },
    ],
  },
  tuto_conclusion: {
    id: "tuto_conclusion",
    lignes: [
      { humeur: "emu", texte: "Tu as l'œil, et la main… il ne te manque que les années. La boutique est entre de bonnes mains." },
      { humeur: "souriant", texte: "Tiens : mon carnet de commandes. Les gens y notent ce qu'ils cherchent — regarde-le souvent." },
      { humeur: "songeur", texte: "Et le facteur est passé : une lettre de ta mère, je crois. Allez, au travail… je reste dans mon fauteuil, si tu as besoin de moi." },
    ],
  },
};

/** Petites phrases quand on tape le grand-père hors tutoriel (rotation par jour). */
export const AMBIANCE_GRAND_PERE: DialogueSequence[] = [
  {
    id: "amb_gp_fauteuil",
    lignes: [{ humeur: "souriant", texte: "Ce fauteuil et moi, on a le même âge. Lui, il grince moins." }],
  },
  {
    id: "amb_gp_objets",
    lignes: [{ humeur: "songeur", texte: "Chaque objet attend quelqu'un. Notre métier, c'est de les présenter." }],
  },
  {
    id: "amb_gp_grandmere",
    lignes: [{ humeur: "rieur", texte: "De mon temps, on négociait dès le petit-déjeuner. Ta grand-mère gagnait toujours." }],
  },
  {
    id: "amb_gp_fier",
    lignes: [{ humeur: "emu", texte: "Je suis fier de toi, tu sais. Je ne le dirai qu'une fois, alors profites-en." }],
  },
];

export const TOUTES_SEQUENCES: DialogueSequence[] = [
  ...Object.values(SEQUENCES_TUTORIEL),
  ...AMBIANCE_GRAND_PERE,
];
