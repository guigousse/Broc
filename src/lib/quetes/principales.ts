import { creerCourrierMission } from "@/lib/courrier";
import {
  calculerBrocantesDebloqueesParTier,
  evaluerCondition,
} from "@/lib/deblocage";
import { QUETES_PRINCIPALES, type ChapitrePrincipal } from "@/data/quetesPrincipales";
import type { Courrier, GameState } from "@/types/game";

function enCourrier(ch: ChapitrePrincipal, jour: number): Courrier {
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
      ...(ch.payload.jourLimiteOffset !== undefined
        ? { jourLimite: jour + ch.payload.jourLimiteOffset }
        : {}),
    }),
    lu: true,
  };
}

/**
 * Injecte le prochain chapitre principal si sa condition est remplie et que le
 * chapitre précédent est livré. Retourne les courriers à ajouter (0 ou 1).
 * Idempotent : ne réinjecte jamais un chapitre déjà présent.
 */
export function debloquerQuetesPrincipales(state: GameState, jour: number): Courrier[] {
  const presents = new Set(state.courriers.map((c) => c.id));
  const livrees = new Set(
    state.missions.filter((m) => m.statut === "livree").map((m) => m.courrierId),
  );
  const parTier = calculerBrocantesDebloqueesParTier(state);
  const chapitres = [...QUETES_PRINCIPALES].sort((a, b) => a.ordre - b.ordre);

  for (const ch of chapitres) {
    if (presents.has(ch.id)) continue; // déjà injecté → on s'arrête à la première lacune
    const precedent = chapitres.find((c) => c.ordre === ch.ordre - 1);
    if (precedent && !livrees.has(precedent.id)) return []; // précédent pas encore livré
    if (!evaluerCondition(ch.condition, state, parTier)) return []; // condition non remplie
    return [enCourrier(ch, jour)];
  }
  return [];
}
