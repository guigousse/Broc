"use client";

import type { CSSProperties } from "react";
import { Gamepad2, Landmark, PawPrint, Plane, Star, type LucideIcon } from "lucide-react";
import { getPiece, type PieceCollection, type ThemeTimbre } from "@/data/pieces";
import { getItemImageUrl, getItemThumbUrl } from "@/lib/itemImages";
import { pieceImageSrc } from "@/lib/pieceImages";
import { getRarityColors } from "@/lib/rarityColors";

export const ICONE_THEME_TIMBRE: Record<ThemeTimbre, LucideIcon> = {
  voyage: Plane, faune: PawPrint, monuments: Landmark, celebrites: Star, "culture-pop": Gamepad2,
};
export const COULEUR_THEME_TIMBRE: Record<ThemeTimbre, string> = {
  voyage: "#6f9ac2", faune: "#7da36a", monuments: "#c9a86a", celebrites: "#c27a8a", "culture-pop": "#8a7ac2",
};

interface Props { id: string; size?: number; grise?: boolean; thumb?: boolean }

export function PieceVisuel({ id, size, grise = false, thumb = false }: Props) {
  const piece = getPiece(id);
  const src = pieceImageSrc(id);
  const box: CSSProperties = {
    width: size ?? "100%", height: size ?? "100%", position: "relative",
    filter: grise ? "grayscale(1) opacity(0.55)" : undefined,
  };
  if (!piece) return <div data-testid="piece-visuel" data-piece-source="placeholder" style={box} />;
  if (src) {
    return (
      <div data-testid="piece-visuel" data-piece-source="image" style={box}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    );
  }
  return (
    <div data-testid="piece-visuel" data-piece-source="placeholder" style={box}>
      {piece.album === "classeur" ? <CartePlaceholder piece={piece} thumb={thumb} /> : <TimbrePlaceholder piece={piece} />}
    </div>
  );
}

/** Carte à jouer : l'objet source « toonifié » par un filtre, dans un cadre teinté par la rareté. */
function CartePlaceholder({ piece, thumb }: { piece: PieceCollection; thumb: boolean }) {
  const couleurs = getRarityColors(piece.rarete);
  const src = piece.source ? (thumb ? (getItemThumbUrl(piece.source) ?? getItemImageUrl(piece.source)) : getItemImageUrl(piece.source)) : null;
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: "6%", border: `3px solid ${couleurs.outer}`, background: "var(--paper-100)", boxSizing: "border-box", padding: "8%", display: "grid", placeItems: "center", overflow: "hidden" }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" draggable={false} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: "saturate(1.4) contrast(1.1)" }} />
      )}
    </div>
  );
}

/** Timbre : rectangle dentelé (masque SVG), fond du thème, icône, numéro. */
function TimbrePlaceholder({ piece }: { piece: PieceCollection }) {
  const theme = piece.serie as ThemeTimbre;
  const Icone = ICONE_THEME_TIMBRE[theme];
  const fond = COULEUR_THEME_TIMBRE[theme];
  // Dentelure : 8 dents par côté, dessinées par des cercles blancs sur le bord.
  const dents: string[] = [];
  for (let i = 0; i < 8; i++) {
    const p = 6.25 + i * 12.5;
    dents.push(`<circle cx="${p}" cy="0" r="4"/>`, `<circle cx="${p}" cy="100" r="4"/>`, `<circle cx="0" cy="${p}" r="4"/>`, `<circle cx="100" cy="${p}" r="4"/>`);
  }
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "grid", placeItems: "center" }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: "absolute", inset: 0 }} aria-hidden>
        <rect x="0" y="0" width="100" height="100" fill="var(--paper-100)" />
        <g fill="#e8dcc4" dangerouslySetInnerHTML={{ __html: dents.join("") }} />
        <rect x="9" y="9" width="82" height="82" fill={fond} stroke={getRarityColors(piece.rarete).outer} strokeWidth="2" />
        <text x="88" y="88" fontSize="11" textAnchor="end" fill="#fff" fontFamily="var(--font-display)">{piece.ordre + 1}</text>
      </svg>
      <Icone size={28} color="#fff" style={{ position: "relative" }} />
    </div>
  );
}
