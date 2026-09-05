/**
 * Le compteur d'une pièce révélée dans un paquet : « Nouveau ! » si c'est la
 * 1ʳᵉ fois qu'on la voit — avant CE paquet ET dans les pièces qui le
 * précèdent dans CE paquet —, sinon le total possédé « ×N ». Se recalcule au
 * rendu, jamais en state : l'ordre du paquet fait foi, pas l'ordre des taps.
 */
export function compteEtNouveaute(
  pieces: string[],
  quantitesAvant: Record<string, number>,
  index: number,
): { total: number; nouveau: boolean } {
  const id = pieces[index];
  const dejaAvant = quantitesAvant[id] ?? 0;
  const dejaDansCePaquet = pieces.slice(0, index).filter((p) => p === id).length;
  const total = dejaAvant + dejaDansCePaquet + 1;
  return { total, nouveau: total === 1 };
}
