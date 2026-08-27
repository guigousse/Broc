import type { CSSProperties, ReactNode } from "react";

/**
 * LE TAMPON ENCREUR — le mot posé en diagonale sur un objet, comme un cachet.
 *
 * Né dans la chine (« VENDU », « VENDEUR FÂCHÉ », « STOCK PLEIN ») et partagé
 * depuis que l'étal du Bazar en a besoin (2026-08-26) : un article acheté y
 * reste en noir et blanc sous son cachet, et il devait s'y lire exactement
 * comme dans la chine — c'est le même geste de jeu, la même annonce.
 *
 * Deux calques, et chacun a sa raison : le CADRE occupe toute la boîte pour
 * centrer le cachet sur la vignette sans dépendre de sa taille, et il est
 * transparent aux gestes (`pointerEvents: none`) — un tampon posé au milieu
 * d'une carte que l'on fait glisser du doigt avalerait le geste.
 *
 * Décoratif (`aria-hidden`) : le mot est déjà dans le nom accessible de ce
 * qu'il tamponne, et un lecteur d'écran ne doit pas l'entendre deux fois.
 */
export function TamponEncreur({
  encre,
  taille = 20,
  children,
}: {
  /** Couleur de l'encre — cadre et texte la partagent. */
  encre: string;
  /** Corps du texte en px. Défaut 20, la taille de la chine. */
  taille?: number;
  children: ReactNode;
}) {
  return (
    <span style={calque} data-testid="tampon" aria-hidden>
      <span style={cachet(encre, taille)}>{children}</span>
    </span>
  );
}

/** Calque centrant le tampon sur l'objet, sans gêner les gestes. */
const calque: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
  zIndex: 2,
};

/** Le cachet : cadre + texte de la couleur d'encre, posé en diagonale. */
const cachet = (encre: string, taille: number): CSSProperties => ({
  transform: "rotate(-18deg)",
  border: `3px solid ${encre}`,
  borderRadius: 8,
  padding: "4px 14px",
  fontFamily: "var(--font-display)",
  fontWeight: 800,
  fontSize: taille,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  color: encre,
  background: "rgba(250,243,224,0.62)",
  boxShadow: "0 1px 6px rgba(0,0,0,0.35)",
});
