"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { qgPct } from "@/components/mobile/qg/layout";
import { BAZAR_LAYOUT, type BazarObjetKey } from "./bazarLayout";

interface ArticleBazarProps {
  cle: BazarObjetKey;
  visuel: ReactNode;
  libelle: string;
  prix: number;
  jetons: number;
  onAcheter: () => void;
}

/**
 * Un article posé dans la scène : son visuel, son étiquette de prix, et
 * l'état « hors de portée ». Le bouton reste `disabled` quand la bourse ne
 * suit pas (l'achat ne doit pas partir), mais c'est le CONTENEUR qui porte le
 * tap : sans ça, la boutique ne répondrait rien du tout au joueur sans jetons
 * — le défaut relevé à la recette du 2026-08-20.
 */
export function ArticleBazar({ cle, visuel, libelle, prix, jetons, onAcheter }: ArticleBazarProps) {
  const { d, tr } = useLangue();
  const [bulle, setBulle] = useState(false);
  const horsDePortee = jetons < prix;
  const manque = prix - jetons;
  const coord = BAZAR_LAYOUT.objets[cle];

  const style: CSSProperties = {
    position: "absolute",
    left: `${qgPct(coord.left)}%`,
    bottom: `${coord.bottom}%`,
    width: `${qgPct(coord.width)}%`,
    pointerEvents: "auto",
    display: "grid",
    justifyItems: "center",
    gap: 2,
    filter: horsDePortee ? "grayscale(1) opacity(0.65)" : undefined,
  };

  return (
    <div
      style={style}
      data-testid={`article-${cle}`}
      onClick={() => horsDePortee && setBulle(true)}
    >
      <button
        type="button"
        aria-label={libelle}
        disabled={horsDePortee}
        onClick={onAcheter}
        style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
      >
        {visuel}
      </button>
      <span
        style={{
          fontSize: "0.7rem",
          color: "var(--brass-700)",
          textDecoration: horsDePortee ? "line-through" : "none",
          whiteSpace: "nowrap",
        }}
      >
        {tr(prix > 1 ? d.bazar.prixJetons : d.bazar.prixJetonUn, { n: prix })}
      </span>
      {bulle && horsDePortee && (
        <span role="status" style={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}>
          {tr(manque > 1 ? d.bazar.manqueJetons : d.bazar.manqueJetonUn, { n: manque })}
        </span>
      )}
    </div>
  );
}
