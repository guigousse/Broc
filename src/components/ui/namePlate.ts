import type { CSSProperties } from "react";

/**
 * Bandeau nom en laiton, rayon paramétrable — l'identité visuelle commune
 * aux personnages qui parlent : vendeur du tiroir de chinage, grand-père des
 * dialogues de trame.
 *
 * `radius` : valeur CSS de `border-radius`. Le tiroir de chinage passe
 * "12px 12px 0 0" ; le dialogue passe "0" car sa carte, en `overflow: hidden`,
 * rogne déjà le bandeau à son propre rayon.
 */
export function namePlateStyle(radius: CSSProperties["borderRadius"]): CSSProperties {
  return {
    padding: "9px 16px",
    background:
      "linear-gradient(180deg, var(--brass-300) 0%, var(--brass-500) 50%, var(--brass-300) 100%)",
    borderBottom: "2px solid var(--brass-700)",
    boxShadow:
      "inset 0 0 0 2px rgba(255,243,213,0.5), inset 0 -3px 0 0 rgba(0,0,0,0.06)",
    borderRadius: radius,
    textAlign: "center",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "var(--forest-800)",
    textShadow: "0 1px 0 rgba(255,243,213,0.6)",
  };
}
