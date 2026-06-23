import type {
  Courrier,
  CourrierPayloadMission,
  MissionCategorie,
  MissionCible,
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
  categorie: MissionCategorie;
  cibles: MissionCible[];
  jourLimite?: number;
  recompense: { argent: number };
}): Courrier {
  const payload: CourrierPayloadMission = {
    type: "mission",
    categorie: args.categorie,
    expediteurId: args.expediteurId,
    titre: args.titre,
    corps: args.corps,
    cibles: args.cibles,
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

/** Conservé vide : les missions de démo ont été retirées au profit du
 *  générateur de quêtes + de l'arc principal (cf. src/lib/quetes/). */
export const ID_MISSIONS_TEST = [] as const;

/** Plus de missions de démo : les quêtes proviennent du générateur + de l'arc
 *  principal (cf. src/lib/quetes/). Conservé vide pour compat d'API. */
export function creerMissionsTest(_jour: number): Courrier[] {
  return [];
}

/** Injecte les missions de test dans une sauvegarde si aucune n'est déjà
 *  présente / déclenchée. Idempotent. */
export function injecterMissionsTestSiAbsentes(
  courriers: Courrier[],
  declencheursDeclenches: string[],
  jourCourant: number,
): { courriers: Courrier[]; declencheursAjoutes: string[] } {
  const dejaPresentes = new Set([...courriers.map((c) => c.id), ...declencheursDeclenches]);
  const aInjecter = creerMissionsTest(jourCourant).filter((c) => !dejaPresentes.has(c.id));
  if (aInjecter.length === 0) return { courriers, declencheursAjoutes: [] };
  return {
    courriers: [...courriers, ...aInjecter],
    declencheursAjoutes: aInjecter.map((c) => c.id),
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
