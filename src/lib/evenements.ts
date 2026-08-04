import { dateForJour, jourForDate } from "@/lib/calendrier";
import type { Brocante } from "@/types/game";

/**
 * Événements du calendrier de jeu (spec 2026-08-04-evenements-calendaires).
 * Tout est exprimé en JOURS DE JEU (compteur linéaire, jour 1 = vendredi
 * 6 juin — cf. calendrier.ts). Aucun événement n'est calé sur la date réelle.
 */

/** Id de la brocante événementielle (entrée permanente de BROCANTES). */
export const ID_GRANDE_BRADERIE = "grande-braderie";

export function estGrandeBraderie(brocante: Pick<Brocante, "id">): boolean {
  return brocante.id === ID_GRANDE_BRADERIE;
}

/** Jour de jeu du premier samedi de septembre de l'année interne donnée. */
export function samediBraderie(annee: number): number {
  for (let n = 1; n <= 7; n++) {
    const d = new Date(Date.UTC(annee, 8, n));
    if (d.getUTCDay() === 6) return jourForDate(d);
  }
  /* istanbul ignore next -- une semaine contient toujours un samedi */
  throw new Error("septembre sans samedi");
}

/** Vrai si `jour` est l'un des deux jours de la Grande Braderie. */
export function estJourBraderie(jour: number): boolean {
  const samedi = samediBraderie(dateForJour(jour).getUTCFullYear());
  return jour === samedi || jour === samedi + 1;
}

/** Samedi de la braderie en cours (samedi/dimanche inclus) ou de la prochaine. */
export function prochaineBraderie(jour: number): number {
  const annee = dateForJour(jour).getUTCFullYear();
  const samedi = samediBraderie(annee);
  return jour <= samedi + 1 ? samedi : samediBraderie(annee + 1);
}
