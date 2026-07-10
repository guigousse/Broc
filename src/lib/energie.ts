import type { GameState } from "@/types/game";

/** Énergie maximale — FIXE (décision 2026-07-10 : plus de bonus de niveau). */
export const ENERGIE_MAX = 5;
export const RECHARGE_INTERVAL_MS = 30 * 60 * 1000; // 30 min
export const ENERGIE_PAR_PUB = 1;

/** Jalons du Niveau de Brocanteur qui étendent l'énergie max (D3). */

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
  energieMax: number = ENERGIE_MAX,
): { energie: number; energieDerniereMaj: number } {
  const { energie, energieDerniereMaj } = state;
  // Anti-recul : temps de confiance antérieur à l'ancre → ré-ancre, pas de crédit.
  if (now < energieDerniereMaj) {
    return { energie, energieDerniereMaj: now };
  }
  // Déjà plein : pas de banque de temps, l'ancre suit `now`.
  if (energie >= energieMax) {
    return { energie: energieMax, energieDerniereMaj: now };
  }
  const gagne = Math.floor((now - energieDerniereMaj) / RECHARGE_INTERVAL_MS);
  if (gagne <= 0) {
    return { energie, energieDerniereMaj };
  }
  const nouvelle = Math.min(energieMax, energie + gagne);
  const ancre =
    nouvelle >= energieMax
      ? now
      : energieDerniereMaj + gagne * RECHARGE_INTERVAL_MS;
  return { energie: nouvelle, energieDerniereMaj: ancre };
}

/** Énergie courante effective (après settle), pour l'affichage et les décisions.
 *  `now` = temps effectif (ancre monotone, corrigée par le temps de confiance
 *  quand le réseau est dispo ; cf. lib/temps + GameContext). */
export function energieCourante(
  state: EnergieState,
  now: number,
  energieMax: number = ENERGIE_MAX,
): number {
  return settleEnergie(state, now, energieMax).energie;
}

/** Secondes avant le prochain +1, ou null si déjà plein. */
export function secondesAvantProchaine(
  state: EnergieState,
  now: number,
  energieMax: number = ENERGIE_MAX,
): number | null {
  const settled = settleEnergie(state, now, energieMax);
  if (settled.energie >= energieMax) return null;
  const prochaine = settled.energieDerniereMaj + RECHARGE_INTERVAL_MS;
  return Math.max(0, Math.ceil((prochaine - now) / 1000));
}

/** Secondes avant d'atteindre `energieMax`, ou null si déjà plein. */
export function secondesAvantPlein(
  state: EnergieState,
  now: number,
  energieMax: number = ENERGIE_MAX,
): number | null {
  const courante = energieCourante(state, now, energieMax);
  if (courante >= energieMax) return null;
  const prochaine = secondesAvantProchaine(state, now, energieMax) ?? 0;
  const paliersRestants = energieMax - courante - 1; // paliers pleins après le prochain +1
  return prochaine + paliersRestants * (RECHARGE_INTERVAL_MS / 1000);
}


/* === Pubs énergie : plafond quotidien ================================== */

/**
 * Nombre max de pubs « +1 énergie » par jour calendaire local. Plafond large
 * (relevé de 5 à 20 le 2026-07-06, demande Guillaume) : garde-fou d'hygiène
 * vis-à-vis des régies (trafic répétitif = invalid traffic), silencieux côté
 * UI — le compteur restant n'est plus affiché.
 */
export const PUBS_ENERGIE_MAX_PAR_JOUR = 20;

/** Compteur du jour : clé de jour local (YYYY-MM-DD) + nombre de pubs vues. */
export type PubsEnergieJour = { cle: string; n: number };

/** Clé de jour calendaire local — même convention que les quêtes quotidiennes. */
function cleJour(now: number): string {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Pubs énergie encore disponibles aujourd'hui. `now` = temps de confiance. */
export function pubsEnergieRestantes(
  pubs: PubsEnergieJour | undefined,
  now: number,
): number {
  const n = pubs && pubs.cle === cleJour(now) ? pubs.n : 0;
  return Math.max(0, PUBS_ENERGIE_MAX_PAR_JOUR - n);
}

/** Enregistre une pub vue (bascule de compteur si le jour a changé). */
export function enregistrerPubEnergie(
  pubs: PubsEnergieJour | undefined,
  now: number,
): PubsEnergieJour {
  const cle = cleJour(now);
  const n = pubs && pubs.cle === cle ? pubs.n : 0;
  return { cle, n: n + 1 };
}
