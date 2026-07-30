/** Sons jouables à la révélation d'une carte de chinage. */
export type SonRevelation =
  | "apparition"
  | "rarete"
  | "mystere"
  | "decouverte";

/**
 * Décide, de façon pure, quels sons jouer à la PREMIÈRE apparition d'une carte.
 * Toutes les cartes jouent l'apparition ; les objets rares/légendaires/uniques
 * y ajoutent la rareté ; la carte vendeur mystère y ajoute le mystère ; un
 * template jamais croisé y ajoute la découverte.
 *
 * Découverte et rareté se cumulent volontairement (un rare inédit mérite les
 * deux) : leurs timbres sont conçus pour se superposer, cf. playDecouverte.
 */
export function sonsRevelation(slide: {
  kind: "item" | "mystere";
  estRareOuPlus?: boolean;
  estNouveau?: boolean;
}): SonRevelation[] {
  const sons: SonRevelation[] = ["apparition"];
  if (slide.kind === "mystere") return [...sons, "mystere"];
  if (slide.estRareOuPlus) sons.push("rarete");
  if (slide.estNouveau) sons.push("decouverte");
  return sons;
}
