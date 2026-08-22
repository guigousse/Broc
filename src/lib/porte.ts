import { energieCourante, type EnergieState } from "@/lib/energie";
import { VITRINE_PREP_ID } from "@/lib/vitrinePrep";
import type { GameState } from "@/types/game";

/** Ce qu'il faut savoir de la partie pour choisir une sortie. */
export type EtatPorte = EnergieState & Pick<GameState, "vitrine">;

/**
 * Où mène un bouton de la porte — ou ce qui l'en empêche.
 *
 * Ce n'est pas une navigation : c'est une DÉCISION, séparée de son exécution
 * pour qu'elle se teste sans routeur et qu'elle se prenne au même endroit
 * depuis les deux portes du jeu.
 */
export type DestinationPorte =
  | { type: "route"; href: string }
  | { type: "energieInsuffisante" };

/**
 * Les sorties de la porte, du bureau comme du Bazar.
 *
 * Elles vivaient inline dans le layout du QG, seule porte qui les proposait.
 * La porte du Bazar offre les mêmes choix depuis le 2026-08-23, et deux copies
 * d'une règle qui pèse une reprise de journée et une jauge d'énergie auraient
 * fini par diverger — c'est la sorte de dérive qu'on ne voit qu'en recette,
 * sur le chemin qu'on emprunte le moins.
 */
export function destinationChiner(etat: EtatPorte, maintenant: number): DestinationPorte {
  if (energieCourante(etat, maintenant) < 1) return { type: "energieInsuffisante" };
  return { type: "route", href: "/chiner" };
}

export function destinationEtaler(etat: EtatPorte, maintenant: number): DestinationPorte {
  const v = etat.vitrine;
  // La vitrine se teste AVANT la jauge : une journée déjà commencée a déjà
  // consommé son énergie, et la reprendre ne se paie pas une seconde fois.
  if (v && v.brocanteId !== VITRINE_PREP_ID) {
    return { type: "route", href: `/vitrine/${v.brocanteId}/journee` };
  }
  if (energieCourante(etat, maintenant) < 1) return { type: "energieInsuffisante" };
  return { type: "route", href: "/vitrine/prep" };
}
