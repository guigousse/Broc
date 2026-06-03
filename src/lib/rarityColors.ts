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
    // Violet pastel
    return {
      outer: "#B89AD9",
      inner: "#C3A8DE",
      accent: "#E5D5F1",
      shadow: "rgba(184,154,217,0.4)",
      thumbBg:
        "linear-gradient(135deg, #E5D5F1 0%, #D0BBE6 100%)",
      thumbIcon: "#4B2A6B",
      prestige: 3,
      label: "unique",
    };
  }
  switch (rarete) {
    case "legendaire":
      // Rouge pastel
      return {
        outer: "#D9A0A0",
        inner: "#E0B0B0",
        accent: "#F4D9D9",
        shadow: "rgba(217,160,160,0.4)",
        thumbBg:
          "linear-gradient(135deg, #F4D9D9 0%, #E8BFBF 100%)",
        thumbIcon: "#6B2E2E",
        prestige: 2,
        label: "legendaire",
      };
    case "rare":
      // Bleu pastel
      return {
        outer: "#8FB2D0",
        inner: "#A8C2D9",
        accent: "#DCEAF3",
        shadow: "rgba(143,178,208,0.35)",
        thumbBg:
          "linear-gradient(135deg, #DCEAF3 0%, #C0D6E8 100%)",
        thumbIcon: "#2E4F6B",
        prestige: 1,
        label: "rare",
      };
    case "commun":
    default:
      // Blanc cassé / beige
      return {
        outer: "#C9B98C",
        inner: "#D9C9A0",
        accent: "#F4ECD6",
        shadow: "rgba(201,185,140,0.3)",
        thumbBg:
          "linear-gradient(135deg, #F4ECD6 0%, #E6D9B4 100%)",
        thumbIcon: "#5D4F1F",
        prestige: 0,
        label: "commun",
      };
  }
}
