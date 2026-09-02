import { MAIN_MAX, type EtatPartie } from "@/lib/duel/etat";

/** Mute `e` (déjà cloné par l'appelant public). */
export function piocher(e: EtatPartie, j: 0 | 1, n: number): void {
  const joueur = e.joueurs[j];
  for (let i = 0; i < n; i++) {
    const id = joueur.deck.shift();
    if (id === undefined) {
      joueur.echecsPioche += 1;
      joueur.vitrine -= joueur.echecsPioche;
      e.journal.push(`J${j} fatigue ${joueur.echecsPioche}`);
    } else if (joueur.main.length >= MAIN_MAX) {
      joueur.casse.push(id);
      e.journal.push(`J${j} brûle ${id}`);
    } else {
      joueur.main.push(id);
    }
  }
}

export function verifierFin(e: EtatPartie): void {
  if (e.fini) return;
  const [a, b] = e.joueurs;
  if (a.vitrine <= 0 && b.vitrine <= 0) e.fini = { vainqueur: null };
  else if (a.vitrine <= 0) e.fini = { vainqueur: 1 };
  else if (b.vitrine <= 0) e.fini = { vainqueur: 0 };
}
