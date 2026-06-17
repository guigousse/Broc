import type { CSSProperties } from "react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { getItemImageUrl } from "@/lib/itemImages";
import type { CategorieObjet } from "@/types/game";

interface ItemVignetteKraftProps {
  templateId: string;
  categorie: CategorieObjet;
  /** Largeur en px. Défaut 52. La hauteur suit un ratio 52:60. */
  size?: number;
}

/* Texture kraft procédurale : base brun chaud + bruit subtil via radial-gradients
 * superposés. Pas d'asset, juste du CSS. */
const KRAFT_BG = [
  "radial-gradient(circle at 15% 25%, rgba(0,0,0,0.07) 0 1px, transparent 2px)",
  "radial-gradient(circle at 60% 70%, rgba(0,0,0,0.06) 0 1px, transparent 2px)",
  "radial-gradient(circle at 80% 30%, rgba(255,235,200,0.10) 0 1px, transparent 2px)",
  "radial-gradient(circle at 35% 85%, rgba(255,235,200,0.08) 0 1px, transparent 2px)",
  "linear-gradient(135deg, #9b7e44 0%, #876632 55%, #7a5a28 100%)",
].join(", ");

const wrapStyle = (size: number): CSSProperties => ({
  position: "relative",
  display: "inline-block",
  width: size,
  height: Math.round((size * 60) / 52),
  background: KRAFT_BG,
  backgroundSize: "8px 8px, 11px 11px, 6px 6px, 9px 9px, 100% 100%",
  boxShadow: "0 1px 2px rgba(0,0,0,0.22), inset 0 0 6px rgba(50,30,5,0.18)",
  flexShrink: 0,
});

const imageStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  transform: "translate(2px, 3px)",
  pointerEvents: "none",
  filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
};

const fallbackStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
};

export function ItemVignetteKraft({ templateId, categorie, size = 52 }: ItemVignetteKraftProps) {
  const url = getItemImageUrl(templateId);
  return (
    <span style={wrapStyle(size)} aria-hidden>
      {url ? (
        <img src={url} alt="" draggable={false} style={imageStyle} />
      ) : (
        <span style={fallbackStyle}>
          <CategorieIcon categorie={categorie} size={Math.round(size * 0.4)} color="#f3e6c5" />
        </span>
      )}
    </span>
  );
}
