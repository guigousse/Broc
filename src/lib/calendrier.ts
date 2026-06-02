/**
 * Calendrier réel du jeu. Le Jour 1 correspond au vendredi 6 juin 1924.
 *
 * Toutes les opérations passent par des dates UTC pour éviter les décalages
 * de fuseau horaire.
 */

/** Année du début du jeu. */
export const ANNEE_DEBUT = 1924;

/** Date du Jour 1 du jeu (UTC). */
export const DATE_JOUR_1 = new Date(Date.UTC(1924, 5, 6)); // 6 juin 1924

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/** Renvoie la date réelle correspondant à un jour de jeu (1, 2, 3…). */
export function dateForJour(jour: number): Date {
  const ms = DATE_JOUR_1.getTime() + (jour - 1) * MS_PAR_JOUR;
  return new Date(ms);
}

/** Renvoie le jour de jeu correspondant à une date réelle (UTC). */
export function jourForDate(date: Date): number {
  const ms = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return Math.round((ms - DATE_JOUR_1.getTime()) / MS_PAR_JOUR) + 1;
}

/** Index du jour de la semaine (0 = Lundi … 6 = Dimanche). */
export function indexJourSemaineReel(jour: number): number {
  // JS : 0 = Dimanche → 6 = Samedi. On remet Lundi = 0.
  const d = dateForJour(jour).getUTCDay();
  return (d + 6) % 7;
}

export const JOURS_COURT = [
  "LUN",
  "MAR",
  "MER",
  "JEU",
  "VEN",
  "SAM",
  "DIM",
] as const;

export const JOURS_LONG = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

export const MOIS_LONG = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

export function labelJourCourt(jour: number): string {
  return JOURS_COURT[indexJourSemaineReel(jour)];
}

export function labelJourLong(jour: number): string {
  return JOURS_LONG[indexJourSemaineReel(jour)];
}

/** Format : « Vendredi 6 juin 1924 ». */
export function formatDateLongue(jour: number): string {
  const d = dateForJour(jour);
  return `${labelJourLong(jour)} ${d.getUTCDate()} ${MOIS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Renvoie les infos nécessaires pour rendre une grille mensuelle :
 * - `mois`, `annee` : du jour fourni
 * - `nbJours` : nombre de jours dans le mois
 * - `decalageDebut` : nombre de cases vides avant le 1er (Lundi = 0).
 */
export function infosMois(jour: number): {
  mois: number;
  annee: number;
  nbJours: number;
  decalageDebut: number;
} {
  const d = dateForJour(jour);
  const annee = d.getUTCFullYear();
  const mois = d.getUTCMonth();
  const debutMois = new Date(Date.UTC(annee, mois, 1));
  const finMois = new Date(Date.UTC(annee, mois + 1, 0));
  const decalageDebut = (debutMois.getUTCDay() + 6) % 7;
  return {
    mois,
    annee,
    nbJours: finMois.getUTCDate(),
    decalageDebut,
  };
}
