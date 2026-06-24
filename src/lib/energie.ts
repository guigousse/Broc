import type { GameState } from "@/types/game";

export const ENERGIE_MAX = 5;
export const RECHARGE_INTERVAL_MS = 30 * 60 * 1000; // 30 min
export const PUBS_MAX_PAR_JOUR = 10;
export const ENERGIE_PAR_PUB = 1;

/** Sous-ensemble de GameState manipulé par ce module (facilite tests + appels). */
export type EnergieState = Pick<
  GameState,
  "energie" | "energieDerniereMaj" | "pubsRecharge"
>;

/** Clé de jour calendaire local `YYYY-MM-DD` à partir d'un epoch ms. */
export function cleJour(now: number): string {
  const d = new Date(now);
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

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

/** Compteur de pubs du jour de confiance courant (reset implicite si nouveau jour). */
export function compteursPubs(
  state: EnergieState,
  now: number,
): { compte: number; restant: number } {
  const compte =
    state.pubsRecharge.jourCle === cleJour(now) ? state.pubsRecharge.compte : 0;
  return { compte, restant: Math.max(0, PUBS_MAX_PAR_JOUR - compte) };
}

export function peutRegarderPub(state: EnergieState, now: number): boolean {
  return compteursPubs(state, now).restant > 0;
}
