import { INVITATIONS_ORGANISATEURS } from "@/data/invitationsOrganisateurs";
import type {
  Courrier,
  CourrierGabaritParams,
  CourrierPayloadMission,
  MissionCategorie,
  MissionCible,
  MissionResolution,
  ObjectifMission,
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
        "Alors ça y est : ton grand-père t'a confié la boutique ! Marcel ne me l'a dit qu'après, évidemment — tu le connais. Je crois qu'il n'a jamais été aussi fier, même s'il bougonnera si tu le lui répètes.",
        "Je glisse **150 €** dans l'enveloppe pour t'aider à démarrer. Offre-toi une belle pièce pour ta vitrine, ou garde-les pour les jours creux.",
        "Veille un peu sur lui, veux-tu ? Et viens me voir quand tu auras une minute.",
      ],
      recompense: { argent: 150 },
    },
  };
}

/**
 * Lettre d'invitation de fin d'acte (tier 2 : marchés ★★, tier 3 : salons ★★★,
 * tier 4 : Grand Salon des Antiquaires), expédiée par les Organisateurs.
 * Purement narrative (sans récompense) : le déblocage réel est porté par la
 * condition `chapitrePrincipal` (cf. `src/lib/deblocage.ts`). Id stable
 * `invitation_tier{N}` pour une idempotence simple côté appelants.
 */
export function creerLettreInvitation(tier: 2 | 3 | 4, jour: number): Courrier {
  const { titre, corps } = INVITATIONS_ORGANISATEURS[tier];
  return {
    id: `invitation_tier${tier}`,
    type: "lettre",
    jourRecu: jour,
    lu: false,
    payload: {
      type: "lettre",
      expediteurId: "organisateurs",
      titre,
      corps,
    },
  };
}

/**
 * Ajoute la lettre d'invitation du `tier` donné aux `courriers` si elle n'y
 * est pas déjà (idempotent), sans effet si `tier` est `undefined` (chapitre
 * sans invitation — retourne alors `courriers` tel quel, même référence).
 * Utilisé par `accepterChapitre` (chapitres narratifs, ex. ch10) et par
 * `GameContext.livrerMission` (chapitres à objectifs, ex. ch4/ch8).
 */
export function injecterLettreInvitationSiDue(
  courriers: Courrier[],
  tier: 2 | 3 | 4 | undefined,
  jour: number,
): Courrier[] {
  if (tier === undefined) return courriers;
  const id = `invitation_tier${tier}`;
  if (courriers.some((c) => c.id === id)) return courriers;
  return [...courriers, creerLettreInvitation(tier, jour)];
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
  conserverCibles?: boolean;
  gabaritId?: string;
  gabaritParams?: CourrierGabaritParams;
  /** Objectifs génériques (SP2 trame). Cf. `CourrierPayloadMission.objectifs`. */
  objectifs?: ObjectifMission[];
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
    ...(args.conserverCibles ? { conserverCibles: true } : {}),
    ...(args.gabaritId !== undefined ? { gabaritId: args.gabaritId } : {}),
    ...(args.gabaritParams !== undefined ? { gabaritParams: args.gabaritParams } : {}),
    ...(args.objectifs !== undefined ? { objectifs: args.objectifs } : {}),
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
