import type { GameState } from "@/types/game";
import { aGenDiplomate } from "@/lib/competences";

export type ActiveId = "flair" | "lotGarni" | "fouille" | "boniment" | "tchatche" | "criee" | "diplomate";

/** Usages par jour de jeu (rapport §04). */
export const QUOTA_ACTIVES: Record<ActiveId, number> = {
  flair: 1, lotGarni: 1, fouille: 3, boniment: 1, tchatche: 1, criee: 1, diplomate: 1,
};

/** Jalons de Niveau de Brocanteur qui offrent chaque active (Diplomate reste une compétence). */
export const NIVEAU_ACTIVES: Record<Exclude<ActiveId, "diplomate">, number> = {
  flair: 5, lotGarni: 7, fouille: 9, boniment: 13, tchatche: 15, criee: 17,
};

export type ActivesUtilisees = Partial<Record<ActiveId, { jour: number; usages: number }>>;

export function activeDebloquee(
  state: Pick<GameState, "brocanteur" | "competencesDebloquees">,
  id: ActiveId,
): boolean {
  if (id === "diplomate") return aGenDiplomate(state);
  return state.brocanteur.niveau >= NIVEAU_ACTIVES[id];
}

export function usagesRestants(actives: ActivesUtilisees | undefined, id: ActiveId, jour: number): number {
  const e = actives?.[id];
  const consommes = e && e.jour === jour ? e.usages : 0;
  return Math.max(0, QUOTA_ACTIVES[id] - consommes);
}

/** Retourne le nouveau record, ou null si le quota du jour est épuisé. Pure. */
export function consommerActive(
  actives: ActivesUtilisees | undefined,
  id: ActiveId,
  jour: number,
): ActivesUtilisees | null {
  if (usagesRestants(actives, id, jour) <= 0) return null;
  const e = actives?.[id];
  const usages = e && e.jour === jour ? e.usages + 1 : 1;
  return { ...(actives ?? {}), [id]: { jour, usages } };
}
