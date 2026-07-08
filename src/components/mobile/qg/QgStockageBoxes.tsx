"use client";

import { useRouter } from "next/navigation";
import { useLangue } from "@/lib/i18n/LangueContext";
import {
  STOCKAGE_BOX_ORDER,
  STOCKAGE_BOXES_LAYOUT,
  type StockageBoxKey,
} from "./stockageBoxesLayout";
import { useStockageBoxCoord } from "./dev/QgEditContext";

interface OneBoxProps {
  boxKey: StockageBoxKey;
}

function OneBox({ boxKey }: OneBoxProps) {
  const router = useRouter();
  const { left, bottom, width } = useStockageBoxCoord(boxKey);
  const { d, tr } = useLangue();
  const def = STOCKAGE_BOXES_LAYOUT[boxKey];

  function handleClick() {
    const q = def.categorie ? `?cat=${encodeURIComponent(def.categorie)}` : "";
    router.push(`/stockage/gerer${q}`);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={tr(d.qg.ouvrirStockage, { label: def.label })}
      style={{
        position: "absolute",
        left: `${left}vw`,
        bottom: `${bottom}%`,
        width: `${width}vw`,
        height: "auto",
        padding: 0,
        margin: 0,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        pointerEvents: "auto",
        WebkitTapHighlightColor: "transparent",
        display: "block",
      }}
    >
      <img
        src={def.src}
        alt=""
        draggable={false}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          userSelect: "none",
          // Aligne le carton sur la palette du décor :
          //   - brightness 0.78  : assombrit pour matcher les cartons en
          //     haut de l'étagère (peints en brun mat dans le fond).
          //   - saturate 0.82    : retire la dominante peach/orange un
          //     peu trop pétante du PNG d'origine.
          //   - contrast 1.05    : récupère un peu de tenue sur les
          //     traits noirs après l'assombrissement.
          //   - sepia 0.08       : pousse légèrement vers le brun chaud
          //     du carton kraft des cartons de fond.
          //   - drop-shadow      : ancrage au sol/étagère.
          filter:
            "brightness(0.78) saturate(0.82) contrast(1.05) sepia(0.08) drop-shadow(0 2px 3px rgba(0,0,0,0.42))",
        }}
      />
    </button>
  );
}

/**
 * Rend les 8 cartons cliquables sur l'étagère stockage du panorama.
 * Chaque carton ouvre /stockage/gerer pré-filtré sur sa catégorie.
 */
export function QgStockageBoxes() {
  return (
    <>
      {STOCKAGE_BOX_ORDER.map((k) => (
        <OneBox key={k} boxKey={k} />
      ))}
    </>
  );
}
