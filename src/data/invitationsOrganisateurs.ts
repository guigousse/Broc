/** Lettres d'invitation de fin d'acte. Purement narratives (le déblocage réel
 *  est la condition chapitrePrincipal). */
export const INVITATIONS_ORGANISATEURS: Record<2 | 3 | 4, { titre: string; corps: string[] }> = {
  2: {
    titre: "Invitation aux marchés de la ville",
    corps: [
      "Votre étal ne passe plus inaperçu : plusieurs de nos exposants nous ont parlé de vous.",
      "Les **marchés ★★ de la ville** vous sont désormais ouverts. Présentez-vous à l'entrée — votre nom suffira.",
    ],
  },
  3: {
    titre: "Invitation aux salons",
    corps: [
      "Votre réputation vous précède — c'est une chose rare, et nous savons la reconnaître.",
      "Les **salons ★★★** seront honorés de votre visite. Tenue correcte appréciée, œil aiguisé exigé.",
    ],
  },
  4: {
    titre: "Le Grand Salon des Antiquaires",
    corps: [
      "Peu de noms entrent au **Grand Salon**. Le vôtre vient d'y être inscrit.",
      "Nous vous attendons. Certains y cherchent des trésors ; les plus sages y trouvent des histoires.",
    ],
  },
};
