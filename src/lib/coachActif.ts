/**
 * Un TutorielCoach est-il ouvert ? La bannière du tutoriel s'y abonne pour
 * se masquer pendant une visite guidée : sa découpe lumineuse laissait
 * sinon transparaître la bannière (z 90 < voile 100) — jusqu'à faire
 * croire que « Passer le tutoriel » était la cible (recette 2026-08-09).
 */
let coachOuvert = false;
const abonnes = new Set<() => void>();

export function getCoachOuvert(): boolean {
  return coachOuvert;
}

export function setCoachOuvert(ouvert: boolean): void {
  if (ouvert === coachOuvert) return;
  coachOuvert = ouvert;
  for (const cb of abonnes) cb();
}

export function subscribeCoachOuvert(cb: () => void): () => void {
  abonnes.add(cb);
  return () => abonnes.delete(cb);
}
