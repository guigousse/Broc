/** Sons jouables à la révélation d'une carte de chinage. */
export type SonRevelation = "apparition" | "rarete" | "mystere";

/**
 * Décide, de façon pure, quels sons jouer à la PREMIÈRE apparition d'une carte.
 * Toutes les cartes jouent l'apparition ; les objets rares/légendaires/uniques
 * y ajoutent la rareté ; la carte vendeur mystère y ajoute le mystère.
 */
export function sonsRevelation(slide: {
  kind: "item" | "mystere";
  estRareOuPlus?: boolean;
}): SonRevelation[] {
  const sons: SonRevelation[] = ["apparition"];
  if (slide.kind === "mystere") sons.push("mystere");
  else if (slide.estRareOuPlus) sons.push("rarete");
  return sons;
}
