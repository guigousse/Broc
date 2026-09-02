import type { Rarete } from "@/types/game";
import type { TexteDuel } from "@/data/duel/types";

export function budgetDe(cout: number, rarete: Rarete): number {
  return 2 * cout + 1 + (rarete === "legendaire" ? 1 : 0);
}

const PRIX_MOT_CLE: Record<string, number> = {
  barrage: 1, prompt: 1, solide: 2, ruse: 1, fragile: -2,
  "cri.pioche": 2, "cri.degat": 1, "cri.soin": 1,
};

/** Prix retiré du budget de stats. Un effet porte son prix dans la donnée. */
export function prixTexte(texte: TexteDuel | undefined): number {
  if (!texte) return 0;
  if (texte.type === "effet") return texte.prix;
  if (texte.type === "cri") return PRIX_MOT_CLE[`cri.${texte.variante}`];
  return PRIX_MOT_CLE[texte.type];
}
