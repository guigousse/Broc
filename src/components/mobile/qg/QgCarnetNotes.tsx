"use client";

import type { CSSProperties } from "react";
import { useQgObjetStyle } from "./QgScene";

interface QgCarnetNotesProps {
  /** Nombre de missions actives non livrables → affiche un coin corné. */
  nbActives: number;
  /** Nombre de missions livrables → affiche un ruban marque-page rouge. */
  nbLivrables: number;
  onTap: () => void;
}

const rubanStyle: CSSProperties = {
  position: "absolute",
  top: "-6%",
  right: "18%",
  width: "10%",
  height: "26%",
  background: "linear-gradient(180deg, #c43030 0%, #911f1f 100%)",
  borderRadius: "0 0 2px 2px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
  pointerEvents: "none",
};

const coinStyle: CSSProperties = {
  position: "absolute",
  bottom: "8%",
  right: "8%",
  width: 0,
  height: 0,
  borderLeft: "10px solid transparent",
  borderBottom: "10px solid rgba(255,245,210,0.85)",
  filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
  pointerEvents: "none",
};

export function QgCarnetNotes({ nbActives, nbLivrables, onTap }: QgCarnetNotesProps) {
  const baseStyle = useQgObjetStyle("carnetRouge");
  const total = nbActives + nbLivrables;
  const label = total === 0
    ? "Carnet de notes — aucune mission"
    : `Carnet de notes — ${total} mission${total > 1 ? "s" : ""}`;
  return (
    <button type="button" onClick={onTap} aria-label={label} style={{ ...baseStyle, position: "absolute" }}>
      <img
        src="/qg/carnet-rouge.webp"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
      {nbLivrables > 0 && <span style={rubanStyle} aria-hidden />}
      {nbLivrables === 0 && nbActives > 0 && <span style={coinStyle} aria-hidden />}
    </button>
  );
}
