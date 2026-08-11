/**
 * Une séquence de DialogueOverlay est-elle affichée ? LevelUpOverlay s'y
 * abonne pour différer sa fanfare de niveau : sans cette garde, la
 * célébration (souvent en attente depuis la journée de vente, une route de
 * session) éclatait par-dessus le dialogue du grand-père au retour au bureau
 * (recette 2026-08-08).
 */
let dialogueOuvert = false;
const abonnes = new Set<() => void>();

export function getDialogueActif(): boolean {
  return dialogueOuvert;
}

export function setDialogueActif(ouvert: boolean): void {
  if (ouvert === dialogueOuvert) return;
  dialogueOuvert = ouvert;
  for (const cb of abonnes) cb();
}

export function subscribeDialogueActif(cb: () => void): () => void {
  abonnes.add(cb);
  return () => abonnes.delete(cb);
}
