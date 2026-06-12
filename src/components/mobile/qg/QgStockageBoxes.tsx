"use client";

import { useRouter } from "next/navigation";
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
  const def = STOCKAGE_BOXES_LAYOUT[boxKey];

  function handleClick() {
    const q = def.categorie ? `?cat=${encodeURIComponent(def.categorie)}` : "";
    router.push(`/stockage/gerer${q}`);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Ouvrir le stockage : ${def.label}`}
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
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))",
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
