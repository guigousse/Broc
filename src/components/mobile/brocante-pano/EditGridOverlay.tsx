"use client";

import type { CSSProperties } from "react";

/**
 * Grille fine de positionnement pour le mode édition.
 *
 *  - Pas mineur : 1 % de la scène (lignes très claires).
 *  - Pas majeur : 5 % (lignes plus visibles).
 *
 * Le SVG occupe 100 % de la scène et passe sous les cadres / poignées
 * grâce à un z-index volontairement bas (10) ; `pointer-events: none`
 * pour ne pas voler les clics.
 */
const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 10,
  // Combinaison de 4 gradients : verticales / horizontales × mineurs / majeurs.
  backgroundImage: [
    // Minor verticals (every 1%)
    "repeating-linear-gradient(90deg, rgba(60,40,10,0.10) 0 1px, transparent 1px calc(1%))",
    // Minor horizontals (every 1%)
    "repeating-linear-gradient(0deg, rgba(60,40,10,0.10) 0 1px, transparent 1px calc(1%))",
    // Major verticals (every 5%)
    "repeating-linear-gradient(90deg, rgba(180,120,30,0.32) 0 1px, transparent 1px calc(5%))",
    // Major horizontals (every 5%)
    "repeating-linear-gradient(0deg, rgba(180,120,30,0.32) 0 1px, transparent 1px calc(5%))",
  ].join(", "),
};

export function EditGridOverlay() {
  return <div aria-hidden style={overlayStyle} />;
}
