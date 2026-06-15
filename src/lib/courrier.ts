import type {
  Courrier,
  CourrierPayloadMission,
  EtatObjet,
  MissionResolution,
} from "@/types/game";

/** ID stable du déclencheur « lettre starter de Maman ». */
export const ID_LETTRE_MAMAN_DEBUT = "lettre_maman_debut";

/** Lettre offerte au tout début du jeu : 150 € d'argent de poche. */
export function creerLettreMamanDebut(jour: number): Courrier {
  return {
    id: ID_LETTRE_MAMAN_DEBUT,
    type: "lettre",
    jourRecu: jour,
    lu: false,
    payload: {
      type: "lettre",
      expediteurId: "maman",
      titre: "Pour bien démarrer",
      corps: [
        "Mon cher enfant,",
        "Je sais que tu te lances dans cette nouvelle aventure de chineur, et je suis si fière de toi. Le marché aux puces est un monde merveilleux mais exigeant — sois patient, observe, apprends.",
        "Je glisse dans cette enveloppe **150 €** pour t'aider à démarrer. Achète-toi un bel objet pour ta première vitrine, ou garde-les pour les jours plus difficiles.",
        "Pense à venir me voir quand tu auras un moment.",
      ],
      recompense: { argent: 150 },
    },
  };
}

/**
 * Filtre les anciens courriers d'huissier des sauvegardes existantes
 * (système supprimé), tout en conservant les autres lettres.
 */
export function migrerCourriers(existants: Courrier[] | undefined): Courrier[] {
  if (!Array.isArray(existants)) return [];
  return existants.filter(
    (c) => (c as { type?: string }).type !== "huissier",
  );
}

/**
 * Injecte la lettre starter de Maman dans une sauvegarde existante si elle
 * n'a jamais été distribuée (ni dans les courriers, ni dans les déclencheurs).
 * Retourne `{ courriers, declencheursAjoutes }`.
 */
export function injecterLettreMamanSiAbsente(
  courriers: Courrier[],
  declencheursDeclenches: string[],
  jourCourant: number,
): { courriers: Courrier[]; declencheursAjoutes: string[] } {
  const dejaDeclenchee =
    declencheursDeclenches.includes(ID_LETTRE_MAMAN_DEBUT) ||
    courriers.some((c) => c.id === ID_LETTRE_MAMAN_DEBUT);
  if (dejaDeclenchee) {
    return { courriers, declencheursAjoutes: [] };
  }
  return {
    courriers: [...courriers, creerLettreMamanDebut(jourCourant)],
    declencheursAjoutes: [ID_LETTRE_MAMAN_DEBUT],
  };
}

/** Crée un Courrier de type mission. */
export function creerCourrierMission(args: {
  id: string;
  jour: number;
  expediteurId: string;
  titre: string;
  corps: string[];
  cible: { templateId: string; etatMin?: EtatObjet };
  jourLimite?: number;
  recompense: { argent: number };
}): Courrier {
  const payload: CourrierPayloadMission = {
    type: "mission",
    expediteurId: args.expediteurId,
    titre: args.titre,
    corps: args.corps,
    cible: args.cible,
    recompense: args.recompense,
    ...(args.jourLimite !== undefined ? { jourLimite: args.jourLimite } : {}),
  };
  return {
    id: args.id,
    type: "mission",
    jourRecu: args.jour,
    lu: false,
    payload,
  };
}

/**
 * Marque comme expirées les missions actives dont le courrier porte un
 * `jourLimite` dépassé. Retourne un nouveau tableau.
 */
export function expireMissions(
  missions: MissionResolution[],
  courriers: Courrier[],
  jourActuel: number,
): MissionResolution[] {
  const indexCourrier = new Map(courriers.map((c) => [c.id, c]));
  return missions.map((m) => {
    if (m.statut !== "active") return m;
    const c = indexCourrier.get(m.courrierId);
    if (!c || c.payload.type !== "mission") return m;
    const limite = c.payload.jourLimite;
    if (typeof limite !== "number") return m;
    if (jourActuel <= limite) return m;
    return { ...m, statut: "expiree", jourResolution: jourActuel };
  });
}
