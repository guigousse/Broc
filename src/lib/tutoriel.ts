import type { GameState, Objet, TutorielEtape } from "@/types/game";
import { injecterLettreMamanSiAbsente } from "@/lib/courrier";
import { COLIS_TUTORIEL_TAILLE, objetColisTutoriel } from "@/data/starterInventory";
import {
  SESSION_TUTORIEL, PELUCHE_TEMPLATE_ID, type ObjetScenario,
} from "@/data/tutorielScenario";

/** Ordre linéaire des étapes du tutoriel guidé (v3, brocante scriptée). */
export const ETAPES_TUTORIEL: readonly TutorielEtape[] = [
  "accueil",
  "aller-chiner",
  "chine-nego-echec",
  "chine-achat-direct",
  "chine-nego-un",
  "chine-nego-deux",
  "chine-sortir",
  "stockage-ouvrir",
  "stockage-focus",
  "collection-envoyer",
  "collection-lecon",
  "ouvrir-colis",
  "preparer-etal",
  "coffre-trace-un",
  "coffre-trace-deux",
  "vente-refus",
  "vente-directe",
  "vente-nego",
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
 * "termine". Depuis la brocante scriptée (v3), le colis du grand-père est
 * livré DANS le tutoriel (étape "ouvrir-colis") — mais le bouton « Passer »
 * saute directement à "termine" sans traverser cette étape : cette fonction
 * re-livre le RELIQUAT du colis scripté (fail-open), pour qu'aucun joueur
 * ne perde les objets qu'il n'a pas eu l'occasion d'ouvrir un par un.
 * Idempotent une fois livré (colisTutorielLivres déjà au maximum). Depuis
 * SP2, l'arc principal n'est plus amorcé ici non plus : une fois l'étape à
 * "termine", `chapitrePret(state)` désigne le chapitre 1 (condition
 * "depart") et sa délivrance se fait en dialogue (`accepterChapitre`).
 */
export function appliquerFinTutoriel(state: GameState): GameState {
  if (state.tutorielEtape === "termine") return state;
  const inj = injecterLettreMamanSiAbsente(
    state.courriers,
    state.declencheursDeclenches,
    state.jourActuel,
  );
  const livres = state.colisTutorielLivres ?? 0;
  const manquants: Objet[] = [];
  for (let i = livres; i < COLIS_TUTORIEL_TAILLE; i++) {
    manquants.push(objetColisTutoriel(i));
  }
  return {
    ...state,
    tutorielEtape: "termine",
    courriers: inj.courriers,
    declencheursDeclenches: [
      ...state.declencheursDeclenches,
      ...inj.declencheursAjoutes,
    ],
    inventaireJoueur: [...state.inventaireJoueur, ...manquants],
    colisTutorielLivres: COLIS_TUTORIEL_TAILLE,
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

/**
 * Vrai quand l'ouverture du carnet doit délivrer le chapitre du grand-père.
 * Fin du tutoriel : la main flottante guide jusqu'au carnet, et c'est son
 * ouverture — pas la pastille du bureau — qui déclenche le dialogue de la
 * lampe, dont la commande vient s'inscrire dans la page restée ouverte.
 * Le type du 2e paramètre est écrit en littéral plutôt qu'importé du
 * composant `RegistreOverlay` : `src/lib` ne dépend pas de l'UI.
 */
export function chapitreDuCarnetDu(
  miniTuto: GameState["miniTutoCarnet"],
  registreOuvert: "commandes" | "comptes" | null,
): boolean {
  return miniTuto === "ouvrir" && registreOuvert === "commandes";
}

/* === Scénario brocante scriptée ====================================== */

/** Étapes de chine scriptée, dans l'ordre du deck (index = objet du scénario). */
const ETAPES_CHINE_SCRIPTEE: readonly TutorielEtape[] = [
  "chine-nego-echec", "chine-achat-direct", "chine-nego-un", "chine-nego-deux",
];

export function indexObjetScenario(etape: TutorielEtape): 0 | 1 | 2 | 3 | null {
  const i = ETAPES_CHINE_SCRIPTEE.indexOf(etape);
  return i === -1 ? null : (i as 0 | 1 | 2 | 3);
}

export function scenarioDeLEtape(etape: TutorielEtape): ObjetScenario | null {
  const i = indexObjetScenario(etape);
  return i === null ? null : SESSION_TUTORIEL[i];
}

/** Deck verrouillé sur la carte active pendant les 4 étapes scriptées. */
export function deckVerrouille(etape: TutorielEtape): boolean {
  return indexObjetScenario(etape) !== null;
}

/**
 * Onglet de TabBar autorisé (et pointé par la main) pendant le tutoriel.
 * null = aucun onglet permis (comportement historique : taps inertes).
 */
export function ongletTutorielPermis(
  etape: TutorielEtape,
): "/stockage" | "/collection" | "/bureau" | null {
  switch (etape) {
    case "stockage-ouvrir":
    case "stockage-focus":
    case "collection-envoyer":
      return "/stockage";
    case "collection-lecon":
      return "/collection";
    case "ouvrir-colis":
    case "preparer-etal":
      return "/bureau";
    default:
      return null;
  }
}

/**
 * La porte du bureau pulse uniquement quand la franchir est l'action
 * prescrite. Elle reste TAPABLE sur un ensemble plus large (portePermise,
 * anti-soft-lock) — le pulse parasite au retour du chinage venait de la
 * confusion des deux rôles (recette 2026-08-09).
 */
export function portePulse(etape: TutorielEtape): boolean {
  switch (etape) {
    case "aller-chiner":
    case "chine-nego-echec":
    case "chine-achat-direct":
    case "chine-nego-un":
    case "chine-nego-deux":
    case "preparer-etal":
    case "vente-refus":
    case "vente-directe":
    case "vente-nego":
      return true;
    default:
      return false;
  }
}

/**
 * Pendant le tutoriel, seule la peluche désignée par le grand-père peut
 * rejoindre la collection — et uniquement à l'étape dédiée.
 */
export function donCollectionPermis(
  etape: TutorielEtape,
  templateId: string,
): boolean {
  if (etape === "termine") return true;
  return etape === "collection-envoyer" && templateId === PELUCHE_TEMPLATE_ID;
}
