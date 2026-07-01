"use client";

import type { CSSProperties } from "react";
import { VENDEUR_MYSTERE_ILLUSTRATION } from "@/lib/boiteMystere";

/**
 * Tiroir du vendeur mystère — même structure que ChineNegoDrawer (perso qui
 * flotte + bandeau nom pleine largeur), mais habillage « luxe » vert + laiton
 * et une seule action : regarder une pub pour ouvrir la boîte.
 */
export function ChineMystereDrawer({
  plein,
  boiteReclamee,
  onOuvrirBoite,
}: {
  plein: boolean;
  boiteReclamee: boolean;
  onOuvrirBoite: () => void;
}) {
  return (
    <div style={drawerStyle}>
      <div style={imageZone}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={VENDEUR_MYSTERE_ILLUSTRATION} alt="Vendeur mystère" style={vendeurImg} />
        <div style={rightZone}>
          {boiteReclamee ? (
            <span style={statutTexte}>Boîte déjà ouverte.</span>
          ) : plein ? (
            <span style={statutTexte}>Stockage plein</span>
          ) : (
            <button type="button" style={btnLuxe} onClick={onOuvrirBoite}>
              Regarder une pub
              <br />
              pour ouvrir
            </button>
          )}
        </div>
      </div>

      <div style={namePlateLuxe}>Vendeur mystère</div>
    </div>
  );
}

const drawerStyle: CSSProperties = {
  flex: "none",
  background: "transparent",
  maxHeight: "82vh",
  overflowY: "auto",
};

const imageZone: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-end",
  gap: 12,
  padding: "8px 16px 0",
};

const vendeurImg: CSSProperties = {
  height: "clamp(143px, 21vh, 182px)",
  width: "auto",
  objectFit: "contain",
  flex: "0 0 auto",
};

const rightZone: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-end",
};

const statutTexte: CSSProperties = {
  marginBottom: 10,
  color: "var(--brass-300)",
  fontSize: 14,
  fontFamily: "var(--font-display)",
  textShadow: "0 1px 3px rgba(0,0,0,0.5)",
};

/** Bouton luxe : vert profond + liseré laiton. */
const btnLuxe: CSSProperties = {
  marginBottom: 10,
  padding: "11px 20px",
  borderRadius: 10,
  border: "2px solid var(--brass-500)",
  background: "linear-gradient(180deg, var(--forest-700) 0%, var(--forest-900) 100%)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 14,
  lineHeight: 1.2,
  textAlign: "center",
  textShadow: "0 1px 2px rgba(0,0,0,0.45)",
  boxShadow: "inset 0 0 0 1px rgba(212,175,95,0.35)",
  cursor: "pointer",
};

/** Bandeau nom « luxe » : vert profond, liseré laiton, texte laiton. */
const namePlateLuxe: CSSProperties = {
  padding: "12px 16px",
  background: "linear-gradient(180deg, var(--forest-700) 0%, var(--forest-900) 100%)",
  borderTop: "2px solid var(--brass-500)",
  borderBottom: "2px solid var(--brass-700)",
  boxShadow: "inset 0 0 0 2px rgba(212,175,95,0.28)",
  borderRadius: "12px 12px 0 0",
  textAlign: "center",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 18,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  textShadow: "0 1px 3px rgba(0,0,0,0.55)",
};
