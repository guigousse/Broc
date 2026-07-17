import type { GameState, Objet } from "@/types/game";
import { getTemplate } from "@/data/objetTemplates";

/**
 * Événement d'anniversaire du joueur : le 11 juin ingame (jour 6 — le jeu
 * démarre le vendredi 6 juin 1924, cf. src/lib/calendrier.ts), Maman envoie
 * un paquet cadeau plat contenant le 33 tours de jazz. Sa récupération
 * déclenche le mini-tutoriel des vinyles (stockage → collection →
 * gramophone), suivi par `GameState.miniTutoVinyle`.
 */

/** Jour de jeu du 11 juin 1924 (jour 1 = 6 juin). */
export const JOUR_ANNIVERSAIRE = 6;

/** Déclencheur one-shot posé à la récupération du cadeau. */
export const ID_DECLENCHEUR_CADEAU = "cadeau_anniversaire";

/** Le vinyle offert par Maman. */
export const TEMPLATE_VINYLE_CADEAU = "mus.33tours_jazz_1";

/** Préfixes des templates « vinyle » (jouables au gramophone une fois en collection). */
const VINYLE_PREFIXES = ["mus.vinyle_", "mus.33tours_"];

export function estVinyle(templateId: string): boolean {
  return VINYLE_PREFIXES.some((p) => templateId.startsWith(p));
}

/**
 * Le cadeau est visible au QG : anniversaire atteint, tutoriel terminé
 * (jamais pendant le parcours guidé), et pas encore récupéré. `>=` plutôt
 * que `===` : les parties déjà au-delà du jour 6 le reçoivent aussi.
 */
export function cadeauAnniversaireVisible(
  state: Pick<GameState, "jourActuel" | "tutorielEtape" | "declencheursDeclenches">,
): boolean {
  return (
    state.tutorielEtape === "termine" &&
    state.jourActuel >= JOUR_ANNIVERSAIRE &&
    !state.declencheursDeclenches.includes(ID_DECLENCHEUR_CADEAU)
  );
}

/** Instancie le vinyle du cadeau (état Très bon — c'est un cadeau soigné). */
export function objetCadeauAnniversaire(): Objet {
  const tpl = getTemplate(TEMPLATE_VINYLE_CADEAU);
  if (!tpl) throw new Error(`template introuvable : ${TEMPLATE_VINYLE_CADEAU}`);
  return {
    id: crypto.randomUUID(),
    templateId: tpl.templateId,
    nom: tpl.nom,
    categorie: tpl.categorie,
    rarete: tpl.rarete,
    etat: "Très bon",
    prixReferenceReel: tpl.prixRefBase,
  };
}
