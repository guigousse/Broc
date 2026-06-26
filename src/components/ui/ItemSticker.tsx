import type { CSSProperties } from "react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { getItemImageUrl } from "@/lib/itemImages";
import type { CategorieObjet } from "@/types/game";

/** État visuel du sticker dans la collection. */
export type StickerVariant = "normal" | "grise" | "silhouette";

interface ItemStickerProps {
  templateId: string;
  categorie: CategorieObjet;
  /** Côté en px du sticker. Défaut 60. Ignoré si `fill`. */
  size?: number;
  /** Si vrai, le sticker remplit son parent (le parent impose une boîte carrée). */
  fill?: boolean;
  /** Rendu : normal, grisé (vu non possédé) ou silhouette noire (non découvert). */
  variant?: StickerVariant;
  /** Couleur du halo de rareté (dégradé radial derrière le sticker). Aucun halo si absent. */
  halo?: string;
}

/** Angle déterministe en degrés dans ~[-3, +3] à partir du templateId, pour
 *  qu'un même item garde toujours la même inclinaison sans recourir à
 *  `Math.random` (qui casserait l'hydratation SSR). */
function angleFromId(templateId: string): number {
  let hash = 0;
  for (let i = 0; i < templateId.length; i += 1) {
    hash = (hash * 31 + templateId.charCodeAt(i)) | 0;
  }
  return ((hash % 70) - 35) / 10; // -3.5° → +3.4°
}

/** Halo blanc autour de la silhouette alpha + ombre portée chaude.
 *  L'empilement de 8 drop-shadow décale l'alpha dans toutes les directions :
 *  l'union des halos forme un contour épais ~2 px. Le dernier drop-shadow
 *  ajoute l'ombre projetée sur la page. */
const stickerFilter = [
  "drop-shadow( 1.5px  0    0 #fdfaf2)",
  "drop-shadow(-1.5px  0    0 #fdfaf2)",
  "drop-shadow( 0     1.5px 0 #fdfaf2)",
  "drop-shadow( 0    -1.5px 0 #fdfaf2)",
  "drop-shadow( 1px   1px   0 #fdfaf2)",
  "drop-shadow(-1px   1px   0 #fdfaf2)",
  "drop-shadow( 1px  -1px   0 #fdfaf2)",
  "drop-shadow(-1px  -1px   0 #fdfaf2)",
  "drop-shadow( 0     2px   3px rgba(40,25,5,0.35))",
].join(" ");

/** Filtre appliqué à l'image/icône selon la variante. */
function variantFilter(variant: StickerVariant): string {
  if (variant === "silhouette") return `brightness(0) ${stickerFilter}`;
  if (variant === "grise")
    return `grayscale(1) brightness(1.3) contrast(0.75) opacity(0.55) ${stickerFilter}`;
  return stickerFilter;
}

const wrapStyle = (
  size: number,
  angle: number,
  fill: boolean,
): CSSProperties => ({
  position: "relative",
  display: "inline-flex",
  width: fill ? "100%" : size,
  height: fill ? "100%" : size,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transform: `rotate(${angle}deg)`,
});

/** Glow radial de rareté, derrière le sticker, débordant légèrement. */
const haloStyle = (color: string): CSSProperties => ({
  position: "absolute",
  inset: "-16%",
  borderRadius: "50%",
  background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
  opacity: 0.55,
  filter: "blur(3px)",
  pointerEvents: "none",
  zIndex: 0,
});

const imageStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: "100%",
  maxHeight: "100%",
  width: "auto",
  height: "auto",
  objectFit: "contain",
  pointerEvents: "none",
};

export function ItemSticker({
  templateId,
  categorie,
  size = 60,
  fill = false,
  variant = "normal",
  halo,
}: ItemStickerProps) {
  const url = getItemImageUrl(templateId);
  const angle = angleFromId(templateId);
  const filter = variantFilter(variant);
  return (
    <span style={wrapStyle(size, angle, fill)} aria-hidden>
      {halo ? <span style={haloStyle(halo)} /> : null}
      {url ? (
        <img
          src={url}
          alt=""
          draggable={false}
          style={{ ...imageStyle, filter }}
        />
      ) : (
        <span style={{ position: "relative", zIndex: 1, filter }}>
          <CategorieIcon
            categorie={categorie}
            size={Math.round((fill ? 56 : size) * 0.55)}
            color="var(--brass-700)"
          />
        </span>
      )}
    </span>
  );
}
