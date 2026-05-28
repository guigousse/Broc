import type { Rarete } from "@/types/game";

export interface RarityColors {
  /** Couleur de bordure dominante. */
  outer: string;
  /** Couleur mid-tone pour fills et filets internes. */
  inner: string;
  /** Couleur claire pour halos et accents lumineux. */
  accent: string;
  /** Tinte d'ombre portée (rgba). */
  shadow: string;
  /** Dégradé pour les thumbnails (45deg : accent → outer). */
  thumbBg: string;
  /** Couleur d'icône sur thumb. */
  thumbIcon: string;
  /** Niveau de prestige visuel : 0=sobre, 1=ornements bas, 2=or rayonnant, 3=halo unique. */
  prestige: 0 | 1 | 2 | 3;
  /** Libellé court pour debug / a11y. */
  label: string;
}

export function getRarityColors(
  rarete: Rarete,
  unique = false,
): RarityColors {
  if (unique) {
    return {
      outer: "#2E5F7F",
      inner: "#5BA8C9",
      accent: "#A8E0F0",
      shadow: "rgba(46,95,127,0.5)",
      thumbBg:
        "linear-gradient(135deg, #A8E0F0 0%, #5BA8C9 55%, #2E5F7F 100%)",
      thumbIcon: "#FBF7EE",
      prestige: 3,
      label: "unique",
    };
  }
  switch (rarete) {
    case "legendaire":
      return {
        outer: "#B8881A",
        inner: "#E8C657",
        accent: "#FFE48F",
        shadow: "rgba(184,136,26,0.45)",
        thumbBg:
          "linear-gradient(135deg, #FFE48F 0%, #E8C657 50%, #B8881A 100%)",
        thumbIcon: "#3D2A05",
        prestige: 2,
        label: "legendaire",
      };
    case "rare":
      return {
        outer: "#4F5C6B",
        inner: "#9BA8B5",
        accent: "#D4DCE3",
        shadow: "rgba(79,92,107,0.4)",
        thumbBg:
          "linear-gradient(135deg, #D4DCE3 0%, #9BA8B5 50%, #4F5C6B 100%)",
        thumbIcon: "#1B2530",
        prestige: 1,
        label: "rare",
      };
    case "commun":
    default:
      return {
        outer: "#5D3F1F",
        inner: "#8C6B3E",
        accent: "#B89968",
        shadow: "rgba(93,63,31,0.3)",
        thumbBg:
          "linear-gradient(135deg, #B89968 0%, #8C6B3E 50%, #5D3F1F 100%)",
        thumbIcon: "#FBF7EE",
        prestige: 0,
        label: "commun",
      };
  }
}
