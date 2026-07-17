import type { GameState, TutorielEtape } from "@/types/game";
import { injecterLettreMamanSiAbsente } from "@/lib/courrier";

/** Ordre linéaire des étapes du tutoriel guidé. */
export const ETAPES_TUTORIEL: readonly TutorielEtape[] = [
  "accueil",
  "aller-chiner",
  "premier-achat",
  "rentrer",
  "preparer-etal",
  "premiere-vente",
  "conclusion",
  "termine",
];

export function tutorielActif(
  state: Pick<GameState, "tutorielEtape">,
): boolean {
  return state.tutorielEtape !== "termine";
}

export function etapeSuivante(etape: TutorielEtape): TutorielEtape {
  const i = ETAPES_TUTORIEL.indexOf(etape);
  return ETAPES_TUTORIEL[Math.min(i + 1, ETAPES_TUTORIEL.length - 1)];
}

/**
 * Clôt le tutoriel (fin normale OU bouton « Passer ») : injecte la lettre de
 * Maman (différée depuis la création de partie) et passe l'étape à
 * "termine". Depuis SP2, l'arc principal n'est plus amorcé ici : une fois
 * l'étape à "termine", `chapitrePret(state)` désigne le chapitre 1 (condition
 * "depart") et sa délivrance se fait en dialogue (`accepterChapitre`).
 * Pur et idempotent.
 */
export function appliquerFinTutoriel(state: GameState): GameState {
  if (state.tutorielEtape === "termine") return state;
  const inj = injecterLettreMamanSiAbsente(
    state.courriers,
    state.declencheursDeclenches,
    state.jourActuel,
  );
  return {
    ...state,
    tutorielEtape: "termine",
    courriers: inj.courriers,
    declencheursDeclenches: [
      ...state.declencheursDeclenches,
      ...inj.declencheursAjoutes,
    ],
  };
}
