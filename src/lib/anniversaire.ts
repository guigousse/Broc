import type { EtatObjet, GameState, Objet } from "@/types/game";
import { getTemplate } from "@/data/objetTemplates";
import { VINYLE_AUDIO_URLS } from "@/data/vinylesAudio";
import { ANNEE_DEBUT, jourForDate } from "@/lib/calendrier";
import { FACTEUR_ETAT } from "@/lib/etat";

/**
 * Événement d'anniversaire du joueur : chaque 11 juin ingame (jour 6 la
 * première année — le jeu démarre le vendredi 6 juin 1924, cf.
 * src/lib/calendrier.ts), Maman envoie un paquet cadeau. La première année,
 * il contient le 33 tours de jazz et sa récupération déclenche le
 * mini-tutoriel des vinyles (stockage → collection → gramophone), suivi par
 * `GameState.miniTutoVinyle`. Les années suivantes offrent d'autres vinyles.
 */

/** Jour de jeu du 11 juin 1924 (jour 1 = 6 juin). Alias historique de jourAnniversaire(1). */
export const JOUR_ANNIVERSAIRE = 6;

/** Déclencheur one-shot posé à la récupération du cadeau de l'année 1. */
export const ID_DECLENCHEUR_CADEAU = "cadeau_anniversaire";

/** Préfixes des templates « vinyle » (jouables au gramophone une fois en collection). */
const VINYLE_PREFIXES = ["mus.vinyle_", "mus.33tours_"];

export function estVinyle(templateId: string): boolean {
  return VINYLE_PREFIXES.some((p) => templateId.startsWith(p));
}

/**
 * Vinyles offerts par Maman, dans l'ordre des années. Tant qu'un vinyle de
 * cette liste n'a pas été offert, il est EXCLU de tous les tirages de chine
 * (genererSession, La Fouille, boîte mystère) — cf. vinylesCadeauxExclus.
 */
export const VINYLES_CADEAU_PAR_ANNEE = [
  "mus.33tours_jazz_1",
  "mus.vinyle_whale_song_son_terrestre_n1",
  "mus.vinyle_free_robot_des_punkbot",
] as const;

/** Le vinyle offert par Maman la première année. */
export const TEMPLATE_VINYLE_CADEAU = VINYLES_CADEAU_PAR_ANNEE[0];

/** Année 1 garde son id historique (saves existantes). */
export function idDeclencheurCadeau(annee: number): string {
  return annee === 1 ? ID_DECLENCHEUR_CADEAU : `cadeau_anniversaire_a${annee}`;
}

/** Jour de jeu du 11 juin de la n-ième année (année 1 = jour 6). */
export function jourAnniversaire(annee: number): number {
  return jourForDate(new Date(Date.UTC(ANNEE_DEBUT + annee - 1, 5, 11)));
}

export function nbAnniversairesAtteints(jourActuel: number): number {
  let n = 0;
  while (jourAnniversaire(n + 1) <= jourActuel) n += 1;
  return n;
}

/**
 * Année du plus ancien cadeau d'anniversaire non récupéré (un seul paquet à
 * la fois), ou null. `>=` implicite : une partie au-delà d'un 11 juin reçoit
 * le cadeau en retard, comme l'an 1 historiquement.
 */
export function cadeauEnAttente(
  state: Pick<GameState, "jourActuel" | "tutorielEtape" | "declencheursDeclenches">,
): number | null {
  if (state.tutorielEtape !== "termine") return null;
  const atteints = nbAnniversairesAtteints(state.jourActuel);
  for (let annee = 1; annee <= atteints; annee++) {
    if (!state.declencheursDeclenches.includes(idDeclencheurCadeau(annee))) {
      return annee;
    }
  }
  return null;
}

/**
 * Le cadeau est visible au QG : anniversaire atteint, tutoriel terminé
 * (jamais pendant le parcours guidé), et pas encore récupéré.
 */
export function cadeauAnniversaireVisible(
  state: Pick<GameState, "jourActuel" | "tutorielEtape" | "declencheursDeclenches">,
): boolean {
  return cadeauEnAttente(state) !== null;
}

/** Vinyles possédés : stockage, coffre de vitrine, et collection (donnés). */
export function vinylesPossedes(
  state: Pick<GameState, "inventaireJoueur" | "vitrine" | "collection">,
): Set<string> {
  const possedes = new Set<string>();
  for (const o of state.inventaireJoueur) {
    if (estVinyle(o.templateId)) possedes.add(o.templateId);
  }
  for (const ov of state.vitrine?.objets ?? []) {
    if (estVinyle(ov.objet.templateId)) possedes.add(ov.objet.templateId);
  }
  for (const slots of Object.values(state.collection)) {
    for (const slot of slots ?? []) {
      if (slot.donation !== null && estVinyle(slot.templateId)) {
        possedes.add(slot.templateId);
      }
    }
  }
  return possedes;
}

/** Vinyles cadeau encore exclusifs — à unir aux exclusions de chinage. */
export function vinylesCadeauxExclus(
  state: Pick<GameState, "declencheursDeclenches">,
): Set<string> {
  const exclus = new Set<string>();
  VINYLES_CADEAU_PAR_ANNEE.forEach((templateId, i) => {
    if (!state.declencheursDeclenches.includes(idDeclencheurCadeau(i + 1))) {
      exclus.add(templateId);
    }
  });
  return exclus;
}

/**
 * Instancie le cadeau de l'année donnée. Années 1-3 : templates fixes
 * (Très bon pour l'an 1 — lié au mini-tuto restauration — puis Pristin).
 * Année 4+ : un vinyle non possédé, en Pristin ; à 24/24, doublon aléatoire
 * (jamais de repli énergie : l'IAP énergie infinie le viderait de sens).
 */
export function objetCadeauAnniversaire(
  annee: number,
  state: Pick<GameState, "inventaireJoueur" | "vitrine" | "collection">,
): Objet {
  let templateId: string;
  if (annee <= VINYLES_CADEAU_PAR_ANNEE.length) {
    templateId = VINYLES_CADEAU_PAR_ANNEE[annee - 1];
  } else {
    const tous = Object.keys(VINYLE_AUDIO_URLS);
    const possedes = vinylesPossedes(state);
    const candidats = tous.filter((id) => !possedes.has(id));
    const source = candidats.length > 0 ? candidats : tous;
    templateId = source[Math.floor(Math.random() * source.length)];
  }
  const tpl = getTemplate(templateId);
  if (!tpl) throw new Error(`template introuvable : ${templateId}`);
  const etat: EtatObjet = annee === 1 ? "Très bon" : "Pristin état";
  return {
    id: crypto.randomUUID(),
    templateId: tpl.templateId,
    nom: tpl.nom,
    categorie: tpl.categorie,
    rarete: tpl.rarete,
    etat,
    prixReferenceReel: Math.max(1, Math.round(tpl.prixRefBase * FACTEUR_ETAT[etat])),
  };
}

/**
 * Doigt de swipe du mini-tuto vinyles : en arrivant sur le bureau on
 * atterrit zone « porte » (1) alors que le gramophone est en zone
 * « repos » (2) — la main flottante pointe vers la droite tant que la
 * zone repos n'est pas atteinte (correct aussi depuis la zone 0).
 */
export function doigtSwipeVersGramophone(
  miniTuto: GameState["miniTutoVinyle"],
  zoneActive: number,
): boolean {
  return miniTuto === "ecouter" && zoneActive !== 2;
}
