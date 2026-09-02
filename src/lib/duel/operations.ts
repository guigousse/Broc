import { domine } from "@/data/duel/roue";
import { getPiece } from "@/data/pieces";
import type { CategorieObjet } from "@/types/game";
import { MAIN_MAX, trouverObjet, type EtatPartie, type ObjetEnJeu } from "@/lib/duel/etat";

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

export function categorieDe(id: string): CategorieObjet {
  return getPiece(id)!.serie as CategorieObjet;
}

/** Applique `n` dégâts à l'objet `uid` (Solide déduit). Rend le dégât réellement subi. Mute `e`. */
export function infligerDegats(e: EtatPartie, uid: number, n: number): number {
  const t = trouverObjet(e, uid);
  if (!t) return 0;
  const reel = Math.max(0, n - (t.objet.motsCles.includes("solide") ? 1 : 0));
  t.objet.pv -= reel;
  return reel;
}

/** Bonus de roue : +1 si `attaquant` domine `cible`. */
export function degatsDAttaque(attaquant: ObjetEnJeu, cible: ObjetEnJeu): number {
  return attaquant.attaque + (domine(categorieDe(attaquant.id), categorieDe(cible.id)) ? 1 : 0);
}

/** Retire les objets à 0 PV (actif d'abord, gauche à droite) et rend la liste des cassés. Mute `e`. */
export function retirerCasses(e: EtatPartie): { joueur: 0 | 1; objet: ObjetEnJeu }[] {
  const casses: { joueur: 0 | 1; objet: ObjetEnJeu }[] = [];
  for (const j of [e.actif, e.actif === 0 ? 1 : 0] as const) {
    const joueur = e.joueurs[j];
    const vivants: ObjetEnJeu[] = [];
    for (const o of joueur.etal) {
      if (o.pv <= 0) { casses.push({ joueur: j, objet: o }); joueur.casse.push(o.id); e.journal.push(`J${j} casse ${o.id}`); }
      else vivants.push(o);
    }
    joueur.etal = vivants;
  }
  return casses;
}
