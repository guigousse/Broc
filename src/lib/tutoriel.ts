import type { GameState, Objet, TutorielEtape } from "@/types/game";
import { injecterLettreMamanSiAbsente } from "@/lib/courrier";
import {
  COLIS_TUTORIEL_TAILLE,
  objetColisTutoriel,
} from "@/data/starterInventory";

/** Ordre linéaire des étapes du tutoriel guidé. */
export const ETAPES_TUTORIEL: readonly TutorielEtape[] = [
  "accueil",
  "aller-chiner",
  "premier-achat",
  "rentrer",
  "ouvrir-colis",
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
 * Maman (différée depuis la création de partie), livre les objets du colis
 * pas encore récupérés (« Passer » ne prive jamais du stock initial) et
 * passe l'étape à "termine". Depuis SP2, l'arc principal n'est plus amorcé
 * ici : une fois l'étape à "termine", `chapitrePret(state)` désigne le
 * chapitre 1 (condition "depart") et sa délivrance se fait en dialogue
 * (`accepterChapitre`). Idempotent.
 */
export function appliquerFinTutoriel(state: GameState): GameState {
  if (state.tutorielEtape === "termine") return state;
  const inj = injecterLettreMamanSiAbsente(
    state.courriers,
    state.declencheursDeclenches,
    state.jourActuel,
  );
  // Colis du tutoriel : livre le restant (rien si déjà tout récupéré).
  const livres = state.colisTutorielLivres ?? 0;
  const manquants: Objet[] = [];
  for (let i = livres; i < COLIS_TUTORIEL_TAILLE; i++) {
    manquants.push(
      objetColisTutoriel(i, [
        ...state.inventaireJoueur.map((o) => o.templateId),
        ...manquants.map((o) => o.templateId),
      ]),
    );
  }
  return {
    ...state,
    tutorielEtape: "termine",
    inventaireJoueur: [...state.inventaireJoueur, ...manquants],
    colisTutorielLivres: COLIS_TUTORIEL_TAILLE,
    courriers: inj.courriers,
    declencheursDeclenches: [
      ...state.declencheursDeclenches,
      ...inj.declencheursAjoutes,
    ],
    // Le grand-père vient de parler du carnet de commandes : le mini-tuto
    // guide vers la zone gauche du bureau puis le livre de compte.
    miniTutoCarnet: "ouvrir",
  };
}

/**
 * Doigt de swipe du mini-tuto carnet : le livre de compte est en zone
 * gauche (0) du panorama — la main flottante pointe vers la gauche tant que
 * cette zone n'est pas atteinte.
 */
export function doigtSwipeVersCarnet(
  miniTuto: GameState["miniTutoCarnet"],
  zoneActive: number,
): boolean {
  return miniTuto === "ouvrir" && zoneActive !== 0;
}
