/** Lettres d'invitation de fin d'acte. Purement narratives (le déblocage réel
 *  est la condition chapitrePrincipal). SP3 : textes provisoires. */
export const INVITATIONS_ORGANISATEURS: Record<2 | 3 | 4, { titre: string; corps: string[] }> = {
  2: {
    titre: "Invitation — les marchés de la ville", // SP3 : texte provisoire
    corps: [
      "Votre étal fait parler de lui.",
      "Les marchés ★★ de la ville vous ouvrent leurs portes. Présentez cette lettre à l'entrée.",
    ],
  },
  3: {
    titre: "Invitation — les salons", // SP3 : texte provisoire
    corps: ["Votre réputation vous précède.", "Les salons ★★★ seront honorés de votre visite."],
  },
  4: {
    titre: "Invitation — le Grand Salon des Antiquaires", // SP3 : texte provisoire
    corps: ["Le Grand Salon des Antiquaires vous convie à sa prochaine édition.", "Peu y entrent. Encore moins y reviennent."],
  },
};
