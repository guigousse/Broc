"use client";

import { ETAGERE_LEG_MASK_LAYOUT } from "./stockageBoxesLayout";
import { useEtagereLegMaskCoord } from "./dev/QgEditContext";
import { ATELIER_X_SHIFT_VW } from "@/components/mobile/panorama/UnifiedPanorama";

/**
 * Re-rend une fenêtre verticale de l'image de fond atelier, par-dessus les
 * cartons, pour simuler que les cartons passent derrière le montant droit
 * de l'étagère. Le contenu interne est la MÊME image de fond, positionnée
 * pour s'aligner pixel-perfect avec le fond rendu en zIndex 1 par
 * UnifiedPanorama.
 */
export function EtagereLegMask() {
  const { left, bottom, width } = useEtagereLegMaskCoord();
  const { heightPct } = ETAGERE_LEG_MASK_LAYOUT;

  // Le fond atelier d'origine est positionné à left=300vw, width=300vw.
  // Pour ré-afficher la même tranche dans une fenêtre clippée à `left`,
  // on shift l'image clonée de -(left - 300)vw vers la gauche.
  const innerOffsetVw = left - ATELIER_X_SHIFT_VW;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: `${left}vw`,
        bottom: `${bottom}%`,
        width: `${width}vw`,
        height: `${heightPct}%`,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 3,
      }}
    >
      <img
        src="/atelier/fond-atelier.png"
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          // Aligne la tranche : la fenêtre commence à `left`vw du scène,
          // l'image fond a son origine à 300vw. On compense par
          // background-equivalent en CSS via translate négatif.
          left: `-${innerOffsetVw}vw`,
          // Le fond d'origine est positionné top:0, height:100% de la
          // scène. Notre fenêtre est positionnée par `bottom`, donc on
          // doit décaler verticalement pour aligner.
          // Calcul : la scène fait H, notre fenêtre top = H*(100% - bottom% - heightPct%).
          // L'image bg fond commence à top:0 et fait height:100% (= H).
          // À l'intérieur de la fenêtre, l'image doit donc être à
          // top = -H*(100% - bottom% - heightPct%) = -(94 - heightPct)% (avec bottom=6).
          // En pratique, on exprime top en % de la fenêtre, mais comme
          // height de la fenêtre est `heightPct`% de H, le top en %
          // fenêtre = -(100% - bottom% - heightPct%) * 100 / heightPct.
          top: `${(-(100 - bottom - heightPct) * 100) / heightPct}%`,
          width: "300vw",
          height: `${(100 * 100) / heightPct}%`,
          objectFit: "cover",
          objectPosition: "top center",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
