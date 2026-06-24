import type { GameState } from "@/types/game";

export const ENERGIE_MAX = 5;
export const RECHARGE_INTERVAL_MS = 30 * 60 * 1000; // 30 min
export const ENERGIE_PAR_PUB = 1;

/** Sous-ensemble de GameState manipulé par ce module (facilite tests + appels). */
export type EnergieState = Pick<
  GameState,
  "energie" | "energieDerniereMaj"
>;

/**
 * Crédite l'énergie écoulée depuis l'ancre. `now` = TEMPS DE CONFIANCE (epoch ms),
 * jamais l'horloge brute. Fonction pure.
 */
export function settleEnergie(
  state: EnergieState,
  now: number,
): { energie: number; energieDerniereMaj: number } {
  const { energie, energieDerniereMaj } = state;
  // Anti-recul : temps de confiance antérieur à l'ancre → ré-ancre, pas de crédit.
  if (now < energieDerniereMaj) {
    return { energie, energieDerniereMaj: now };
  }
  // Déjà plein : pas de banque de temps, l'ancre suit `now`.
  if (energie >= ENERGIE_MAX) {
    return { energie: ENERGIE_MAX, energieDerniereMaj: now };
  }
  const gagne = Math.floor((now - energieDerniereMaj) / RECHARGE_INTERVAL_MS);
  if (gagne <= 0) {
    return { energie, energieDerniereMaj };
  }
  const nouvelle = Math.min(ENERGIE_MAX, energie + gagne);
  const ancre =
    nouvelle >= ENERGIE_MAX
      ? now
      : energieDerniereMaj + gagne * RECHARGE_INTERVAL_MS;
  return { energie: nouvelle, energieDerniereMaj: ancre };
}

/** Énergie courante effective (après settle), pour l'affichage et les décisions.
 *  `now` = temps effectif (ancre monotone, corrigée par le temps de confiance
 *  quand le réseau est dispo ; cf. lib/temps + GameContext). */
export function energieCourante(state: EnergieState, now: number): number {
  return settleEnergie(state, now).energie;
}

/** Secondes avant le prochain +1, ou null si déjà plein. */
export function secondesAvantProchaine(
  state: EnergieState,
  now: number,
): number | null {
  const settled = settleEnergie(state, now);
  if (settled.energie >= ENERGIE_MAX) return null;
  const prochaine = settled.energieDerniereMaj + RECHARGE_INTERVAL_MS;
  return Math.max(0, Math.ceil((prochaine - now) / 1000));
}

/** Secondes avant d'atteindre ENERGIE_MAX, ou null si déjà plein. */
export function secondesAvantPlein(
  state: EnergieState,
  now: number,
): number | null {
  const courante = energieCourante(state, now);
  if (courante >= ENERGIE_MAX) return null;
  const prochaine = secondesAvantProchaine(state, now) ?? 0;
  const paliersRestants = ENERGIE_MAX - courante - 1; // paliers pleins après le prochain +1
  return prochaine + paliersRestants * (RECHARGE_INTERVAL_MS / 1000);
}

