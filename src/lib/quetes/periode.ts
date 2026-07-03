/** Périodes en temps réel, en fuseau LOCAL de l'appareil. `now` = epoch ms. */

function deuxChiffres(n: number): string {
  return String(n).padStart(2, "0");
}

/** "YYYY-MM-DD" du jour local. */
export function cleJourLocal(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}`;
}

/** Epoch ms du prochain minuit local (strictement après `now`). */
export function prochainMinuitLocalMs(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0); // minuit du jour suivant, en local
  return d.getTime();
}

/** "YYYY-Www" (semaine ISO, lundi = début ; le jeudi fixe l'année ISO). */
export function cleSemaineLocale(now: number): string {
  const src = new Date(now);
  const date = new Date(src.getFullYear(), src.getMonth(), src.getDate());
  const jour = (date.getDay() + 6) % 7; // lundi=0 … dimanche=6
  date.setDate(date.getDate() - jour + 3); // jeudi de cette semaine
  const anneeISO = date.getFullYear();
  const premierJeudi = new Date(anneeISO, 0, 4);
  const decalPremier = (premierJeudi.getDay() + 6) % 7;
  premierJeudi.setDate(premierJeudi.getDate() - decalPremier + 3);
  const semaine =
    1 +
    Math.round(
      (date.getTime() - premierJeudi.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
  return `${anneeISO}-W${deuxChiffres(semaine)}`;
}

/** Epoch ms du prochain lundi 00:00 local (strictement après `now`). */
export function prochainLundiLocalMs(now: number): number {
  const d = new Date(now);
  const jour = (d.getDay() + 6) % 7; // lundi=0
  const dans = jour === 0 ? 7 : 7 - jour; // si lundi, le prochain est dans 7 j
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + dans,
    0,
    0,
    0,
    0,
  ).getTime();
}

/**
 * Reporte un instant "minuit local" à `heure`:`minute` du même jour. Passe par
 * `setHours` (et non une addition de ms) pour rester correct autour d'un
 * changement d'heure DST.
 */
export function plusHeureLocale(minuitMs: number, heure: number, minute = 0): number {
  const d = new Date(minuitMs);
  d.setHours(heure, minute, 0, 0);
  return d.getTime();
}

/** Minuit local du jour courant (peut être déjà passé si `now` est plus tard dans la journée). */
export function minuitLocalMs(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Minuit local de la veille d'un instant donné (ex : dimanche = veille du prochain lundi). */
export function veilleMs(dateMs: number): number {
  const d = new Date(dateMs);
  d.setDate(d.getDate() - 1);
  return d.getTime();
}
