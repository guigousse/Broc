import { creerCourrierMission, injecterLettreInvitationSiDue } from "@/lib/courrier";
import { appendLedger } from "@/lib/grandLivre";
import {
  appliquerGainXPBrocanteur,
  POINTS_BONUS_CHAPITRE,
  XP_QUETE_PRINCIPALE,
} from "@/lib/xp";
import { calculerBrocantesDebloqueesParTier, evaluerCondition } from "@/lib/deblocage";
import { QUETES_PRINCIPALES, chapitreParId, type ChapitrePrincipal } from "@/data/quetesPrincipales";
import type { Courrier, GameState, MissionResolution } from "@/types/game";

/**
 * Prochain chapitre de la trame délivrable par le grand-père (pastille « ! »
 * du QG, câblée en Task 9), ou `null` si aucun n'est dû pour l'instant.
 *
 * Règles : `null` tant que le tutoriel guidé n'est pas terminé ; sinon, on
 * cherche — dans l'ordre — le premier chapitre pas encore présent (aucun
 * courrier créé) dont le chapitre précédent est livré ET dont la condition
 * propre est remplie. La trame avance un chapitre à la fois : dès qu'un
 * chapitre est accepté (`accepterChapitre`), il devient « présent » et ne
 * peut plus être reproposé, même si un chapitre ultérieur devenait éligible.
 */
export function chapitrePret(state: GameState): ChapitrePrincipal | null {
  if (state.tutorielEtape !== "termine") return null;
  const presents = new Set(state.courriers.map((c) => c.id));
  const livres = new Set(
    state.missions.filter((m) => m.statut === "livree").map((m) => m.courrierId),
  );
  const parTier = calculerBrocantesDebloqueesParTier(state);
  const chapitres = [...QUETES_PRINCIPALES].sort((a, b) => a.ordre - b.ordre);

  for (const ch of chapitres) {
    if (presents.has(ch.id)) continue; // déjà délivré → on avance au suivant
    const precedent = chapitres.find((c) => c.ordre === ch.ordre - 1);
    if (precedent && !livres.has(precedent.id)) return null; // précédent pas encore livré
    return evaluerCondition(ch.condition, state, parTier) ? ch : null;
  }
  return null; // les 12 chapitres sont déjà délivrés
}

/** Construit le Courrier (marqué lu) porté par un chapitre de la trame. */
function courrierDeChapitre(ch: ChapitrePrincipal, jour: number): Courrier {
  return {
    ...creerCourrierMission({
      id: ch.id,
      jour,
      expediteurId: "grand-pere",
      titre: ch.payload.titre,
      corps: ch.payload.corps,
      categorie: "principale",
      cibles: ch.payload.cibles,
      recompense: ch.payload.recompense,
      objectifs: ch.payload.objectifs,
      ...(ch.payload.conserverCibles ? { conserverCibles: true } : {}),
    }),
    lu: true,
  };
}

/**
 * Accepte un chapitre de la trame (déclenché en fin du dialogue de
 * délivrance avec le grand-père) : crée le courrier (marqué lu) et la
 * mission associée avec `timestampAcceptation` (borne basse des objectifs
 * cumulatifs, ex. ventes réalisées APRÈS acceptation).
 *
 * Un chapitre narratif (`payload.objectifs` vide, ex. l'invitation ou la
 * remise des clés) est livré immédiatement : ledger `mission_recompense`,
 * XP `XP_QUETE_PRINCIPALE` et bonus `POINTS_BONUS_CHAPITRE`. Si `ch.invitationTier`
 * est défini (ex. ch10), la lettre d'invitation correspondante est injectée
 * dans la foulée (cf. `injecterLettreInvitationSiDue`). Pour les chapitres à
 * objectifs qui portent aussi une invitation (ex. ch4, ch8), l'injection a
 * lieu à la livraison réelle de la mission, dans `GameContext.livrerMission`.
 *
 * Pur et idempotent : si le chapitre est inconnu ou déjà présent (courrier
 * existant), le state est renvoyé tel quel (même référence).
 */
export function accepterChapitre(
  state: GameState,
  chapitreId: string,
  timestamp: number,
): GameState {
  const ch = chapitreParId(chapitreId);
  if (!ch || state.courriers.some((c) => c.id === ch.id)) return state;

  const courrier = courrierDeChapitre(ch, state.jourActuel);
  const narratif = ch.payload.objectifs.length === 0;
  const mission: MissionResolution = {
    courrierId: ch.id,
    statut: narratif ? "livree" : "active",
    timestampAcceptation: timestamp,
    ...(narratif ? { jourResolution: state.jourActuel } : {}),
  };

  let next: GameState = {
    ...state,
    courriers: [...state.courriers, courrier],
    missions: [...state.missions, mission],
  };

  if (narratif) {
    next = appendLedger(next, {
      jour: next.jourActuel,
      kind: "mission_recompense",
      designation: `Mission · ${ch.payload.titre}`,
      recette: ch.payload.recompense.argent,
      depense: 0,
      courrierId: ch.id,
      params: { courrierId: ch.id, templateIds: [] },
    });
    const avecXP = appliquerGainXPBrocanteur(next.brocanteur, XP_QUETE_PRINCIPALE);
    next = {
      ...next,
      brocanteur: {
        ...avecXP,
        pointsDisponibles: avecXP.pointsDisponibles + POINTS_BONUS_CHAPITRE,
      },
      courriers: injecterLettreInvitationSiDue(next.courriers, ch.invitationTier, next.jourActuel),
    };
  }

  return next;
}
