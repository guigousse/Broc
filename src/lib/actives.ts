import type { GameState } from "@/types/game";
import { aGenDiplomate } from "@/lib/competences";

export type ActiveId = "flair" | "lotGarni" | "fouille" | "boniment" | "tchatche" | "criee" | "diplomate";

/** Liste fermée des ids d'atouts (validation des saves). */
export const ACTIVE_IDS: readonly ActiveId[] = [
  "flair", "lotGarni", "fouille", "boniment", "tchatche", "criee", "diplomate",
];

/**
 * Échelle des atouts sur 100 niveaux (décision 2026-07-10) : déblocage tous
 * les 5 niveaux (N5→30), puis 2ᵉ usage quotidien (N35→60), puis 3ᵉ (N65→90).
 * Diplomate reste une compétence (Négociation P3) à 1 usage fixe.
 */
export const NIVEAU_ACTIVES: Record<Exclude<ActiveId, "diplomate">, number> = {
  flair: 5, lotGarni: 10, fouille: 15, boniment: 20, tchatche: 25, criee: 30,
};

export const NIVEAU_USAGE_2: Record<Exclude<ActiveId, "diplomate">, number> = {
  flair: 35, lotGarni: 40, fouille: 45, boniment: 50, tchatche: 55, criee: 60,
};

export const NIVEAU_USAGE_3: Record<Exclude<ActiveId, "diplomate">, number> = {
  flair: 65, lotGarni: 70, fouille: 75, boniment: 80, tchatche: 85, criee: 90,
};

/** Usages par jour d'un atout au niveau de Brocanteur donné (1 → 2 → 3). */
export function quotaActives(id: ActiveId, niveau: number): number {
  if (id === "diplomate") return 1;
  return (
    1 +
    (niveau >= NIVEAU_USAGE_2[id] ? 1 : 0) +
    (niveau >= NIVEAU_USAGE_3[id] ? 1 : 0)
  );
}

export type ActivesUtilisees = Partial<Record<ActiveId, { jour: number; usages: number }>>;

export function activeDebloquee(
  state: Pick<GameState, "brocanteur" | "competencesDebloquees">,
  id: ActiveId,
): boolean {
  if (id === "diplomate") return aGenDiplomate(state);
  return state.brocanteur.niveau >= NIVEAU_ACTIVES[id];
}

export function usagesRestants(
  actives: ActivesUtilisees | undefined,
  id: ActiveId,
  jour: number,
  niveau: number,
): number {
  const e = actives?.[id];
  const consommes = e && e.jour === jour ? e.usages : 0;
  return Math.max(0, quotaActives(id, niveau) - consommes);
}

/** Retourne le nouveau record, ou null si le quota du jour est épuisé. Pure. */
export function consommerActive(
  actives: ActivesUtilisees | undefined,
  id: ActiveId,
  jour: number,
  niveau: number,
): ActivesUtilisees | null {
  if (usagesRestants(actives, id, jour, niveau) <= 0) return null;
  const e = actives?.[id];
  const usages = e && e.jour === jour ? e.usages + 1 : 1;
  return { ...(actives ?? {}), [id]: { jour, usages } };
}
