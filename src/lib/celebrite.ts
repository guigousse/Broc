import type { CelebriteEvenement } from "@/types/game";
import type { ClientPersonnage } from "@/data/clients";
import { calculerAxesNego } from "@/data/clients";
import { BROCANTES } from "@/data/brocantes";
import { CELEBRITES } from "@/data/celebrites";
import { PERIODE_TENDANCES_JOURS } from "@/lib/tendances";

/**
 * Tire une célébrité aléatoire posée sur une brocante non-boss (tier 1–3),
 * un jour précis de la semaine. Le joueur n'a le boost de chinage que ce
 * jour-là sur cette brocante.
 */
export function tirerCelebrite(): CelebriteEvenement {
  const candidats = BROCANTES.filter((b) => b.tier < 4);
  const brocante = candidats[Math.floor(Math.random() * candidats.length)];
  const nom = CELEBRITES[Math.floor(Math.random() * CELEBRITES.length)];
  const jourSemaine = Math.floor(Math.random() * PERIODE_TENDANCES_JOURS);
  return { brocanteId: brocante.id, nom, jourSemaine };
}

/**
 * Construit un `ClientPersonnage` à partir d'une célébrité — utilisé pour
 * la faire apparaître à la vente. Très grosse bourse, peu de marchandage,
 * forte propension à acheter plusieurs pièces d'un coup.
 */
/**
 * Bourse de la célébrité : bien au-dessus de la classe « grosse » (2 000 €) —
 * c'est le meilleur client du jeu — sans rendre liquides les pièces à 5 chiffres.
 */
export const BOURSE_CELEBRITE = 6000;

export function buildCelebritePersonnage(c: CelebriteEvenement): ClientPersonnage {
  const appetitMin = 1.8;
  const appetitMax = 2.5;
  const durete = 0.1;
  const appetitMoyen = (appetitMin + appetitMax) / 2;
  const axes = calculerAxesNego(durete, appetitMoyen);
  return {
    id: `celebrite.${c.brocanteId}.${c.jourSemaine}.${c.nom}`,
    archetypeId: "celebrite",
    archetypeNom: "Célébrité",
    nom: c.nom,
    ambiance: "Entre escortée d'un photographe ; la rumeur la précède.",
    appetitMin,
    appetitMax,
    durete,
    chanceMulti: 0.7,
    categoriesPreferees: [],
    categoriesEvitees: [],
    bonusPreference: 0.3,
    malusEvitement: 0.2,
    tierMin: 1,
    bourseMax: BOURSE_CELEBRITE,
    ...axes,
  };
}
