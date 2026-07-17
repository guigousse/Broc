"use client";

import { useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Objet } from "@/types/game";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { StarRow } from "@/components/ui/StarRow";
import { flyToTab } from "@/lib/flyAnimation";
import { getItemImageUrl } from "@/lib/itemImages";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";

interface ColisOverlayProps {
  /** Objet en cours de révélation (null = overlay fermé). */
  objet: Objet | null;
  /** Rang de l'objet dans le colis (1-based) et taille du colis. */
  numero: number;
  total: number;
  /** « Récupérer » tapé : le vol vers Stockage est joué, au parent de révéler
   *  le suivant ou de clore la cérémonie. */
  onRecuperer: () => void;
}

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 110,
  background: "rgba(15, 30, 22, 0.72)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  padding: "24px 16px calc(24px + var(--safe-bottom, 0px))",
};

const titreColis: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
};

const nomStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 18,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--paper-100)",
  textAlign: "center",
  textShadow: "0 1px 4px rgba(0,0,0,0.65)",
};

const stickerImg: CSSProperties = {
  width: "min(224px, 60vw)",
  aspectRatio: "1 / 1",
};

const etatRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const etatLabel: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 14,
  color: "var(--paper-100)",
};

const compteur: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.12em",
  color: "var(--brass-300)",
};

const btnRecuperer: CSSProperties = {
  marginTop: 6,
  minWidth: 180,
  padding: "13px 24px",
  borderRadius: 12,
  border: "2px solid var(--brass-500)",
  background: "var(--brass-500)",
  color: "var(--forest-800)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
};

/**
 * Cérémonie d'ouverture du colis du tutoriel : chaque objet apparaît en
 * grossissant (sticker die-cut, nom au-dessus, état en dessous) ;
 * « Récupérer » l'envoie voler vers l'onglet Stockage (son d'ajout
 * existant via flyToTab) puis le parent révèle le suivant.
 */
export function ColisOverlay({ objet, numero, total, onRecuperer }: ColisOverlayProps) {
  const { d, tr, locale } = useLangue();
  const stickerRef = useRef<HTMLDivElement>(null);
  if (!objet || typeof document === "undefined") return null;

  const rarity = getRarityColors(objet.rarete);

  const recuperer = () => {
    const el = stickerRef.current;
    if (el) {
      flyToTab({
        fromRect: el.getBoundingClientRect(),
        imageUrl: getItemImageUrl(objet.templateId),
        fallbackBg: rarity.thumbBg,
        borderColor: rarity.outer,
        targetSelector: `[data-fly-target="/stockage"]`,
      });
    }
    onRecuperer();
  };

  return createPortal(
    <div style={scrim} role="dialog" aria-modal="true" aria-label={d.tutoriel.colisTitre}>
      <div style={titreColis}>{d.tutoriel.colisTitre}</div>
      {/* key = objet.id : relance l'animation d'apparition à chaque objet. */}
      <div
        key={objet.id}
        className="colis-pop"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
      >
        <div style={nomStyle}>{nomObjet(objet, locale)}</div>
        <div ref={stickerRef} style={stickerImg}>
          <ItemSticker
            templateId={objet.templateId}
            categorie={objet.categorie}
            fill
            tilt={false}
            eager
            outlinePx={3}
          />
        </div>
        <div style={etatRow}>
          <StarRow
            filled={etoileCount(objet.etat)}
            color={rarity.outer}
            size={18}
            gap={3}
            dropShadow
            emptyFill="rgba(255,243,213,0.35)"
            display="flex"
            aria-label={tr(d.chine.etatAriaLabel, { etat: libelleEtat(objet.etat, d) })}
          />
          <span style={etatLabel}>{libelleEtat(objet.etat, d)}</span>
        </div>
      </div>
      <div style={compteur}>{numero}/{total}</div>
      <button type="button" style={btnRecuperer} onClick={recuperer}>
        {d.tutoriel.colisRecuperer}
      </button>
    </div>,
    document.body,
  );
}
