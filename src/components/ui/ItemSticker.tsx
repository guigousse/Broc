import type { CSSProperties } from "react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { getItemImageUrl } from "@/lib/itemImages";
import type { CategorieObjet } from "@/types/game";

interface ItemStickerProps {
  templateId: string;
  categorie: CategorieObjet;
  /** Côté en px du sticker. Défaut 60. */
  size?: number;
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

const wrapStyle = (size: number, angle: number): CSSProperties => ({
  display: "inline-flex",
  width: size,
  height: size,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transform: `rotate(${angle}deg)`,
});

const imageStyle: CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  width: "auto",
  height: "auto",
  objectFit: "contain",
  pointerEvents: "none",
  filter: stickerFilter,
};

const fallbackIconStyle: CSSProperties = {
  filter: stickerFilter,
};

export function ItemSticker({ templateId, categorie, size = 60 }: ItemStickerProps) {
  const url = getItemImageUrl(templateId);
  const angle = angleFromId(templateId);
  return (
    <span style={wrapStyle(size, angle)} aria-hidden>
      {url ? (
        <img src={url} alt="" draggable={false} style={imageStyle} />
      ) : (
        <span style={fallbackIconStyle}>
          <CategorieIcon
            categorie={categorie}
            size={Math.round(size * 0.55)}
            color="var(--brass-700)"
          />
        </span>
      )}
    </span>
  );
}
