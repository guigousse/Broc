import type { CSSProperties } from "react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { getItemImageUrl, getItemThumbUrl } from "@/lib/itemImages";
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
  /** Légère inclinaison déterministe (défaut true). Mettre false pour un rendu droit. */
  tilt?: boolean;
  /**
   * Si vrai, charge la vignette (~384 px) plutôt que le plein format (~1600 px).
   * À activer dans les grilles/listes denses pour éviter l'explosion mémoire ;
   * laisser false pour les vues plein écran (overlay détail).
   */
  thumb?: boolean;
  /**
   * Si vrai, l'image charge immédiatement (`loading="eager"`) au lieu de
   * `lazy`. À activer dans les listes virtualisées (la virtualisation borne
   * déjà le nombre de cellules montées) pour éviter le fondu « pop-in ».
   */
  eager?: boolean;
  /** Épaisseur (px) du contour die-cut blanc. Défaut 1.5. */
  outlinePx?: number;
  /** URL d'image directe (bypasse `getItemImageUrl`) — ex. boîte mystère. */
  srcOverride?: string;
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

/** Ombre portée chaude (sans contour). */
const ombrePortee = "drop-shadow( 0 2px 3px rgba(40,25,5,0.35))";

/** Contour blanc die-cut autour de la silhouette alpha + ombre portée.
 *  4 drop-shadow cardinaux (au lieu de 8) décalent l'alpha dans les 4 directions :
 *  leur union forme un contour ~1.5 px. Le passage de 8 à 4 passes de filtre
 *  par cellule réduit nettement le coût GPU au scroll des grilles denses. */
function contourBlanc(px: number): string {
  return [
    `drop-shadow( ${px}px  0    0 #fdfaf2)`,
    `drop-shadow(-${px}px  0    0 #fdfaf2)`,
    `drop-shadow( 0     ${px}px 0 #fdfaf2)`,
    `drop-shadow( 0    -${px}px 0 #fdfaf2)`,
    ombrePortee,
  ].join(" ");
}

/** Filtre appliqué à l'image/icône selon la variante. Silhouette = noir + contour blanc. */
function variantFilter(variant: StickerVariant, outlinePx: number): string {
  const contour = contourBlanc(outlinePx);
  if (variant === "silhouette") return `brightness(0) ${contour}`;
  if (variant === "grise")
    return `grayscale(1) brightness(1.3) contrast(0.75) opacity(0.55) ${contour}`;
  return contour;
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

/** Style de l'image : en mode `fill`, l'image est SORTIE DU FLUX
 *  (`position:absolute; inset:0`) et contrainte par `objectFit:contain`.
 *  Hors-flux, sa taille intrinsèque ne peut JAMAIS pousser la cellule : le
 *  carré `aspect-ratio:1/1` du parent est respecté sur tous les moteurs (iOS
 *  WebKit laissait sinon un PNG très haut — violon, guitare — agrandir la
 *  rangée). Hors `fill`, l'image reste dans le flux, centrée à sa taille. */
function imageStyle(fill: boolean, filter: string): CSSProperties {
  return {
    zIndex: 1,
    objectFit: "contain",
    pointerEvents: "none",
    filter,
    ...(fill
      ? {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }
      : {
          position: "relative",
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
        }),
  };
}

export function ItemSticker({
  templateId,
  categorie,
  size = 60,
  fill = false,
  variant = "normal",
  tilt = true,
  thumb = false,
  eager = false,
  outlinePx = 1.5,
  srcOverride,
}: ItemStickerProps) {
  const url =
    srcOverride ??
    (thumb ? getItemThumbUrl(templateId) : getItemImageUrl(templateId));
  const angle = tilt ? angleFromId(templateId) : 0;
  const filter = variantFilter(variant, outlinePx);
  return (
    <span style={wrapStyle(size, angle, fill)} aria-hidden>
      {url ? (
        <img
          src={url}
          alt=""
          draggable={false}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          style={imageStyle(fill, filter)}
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
