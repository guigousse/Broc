import type { CSSProperties, ReactNode } from "react";

/**
 * Texte d'étape du flux vente, présenté dans le MÊME type d'encadré que la
 * description des brocantes (boîte papier + double filet laiton). N'occupe
 * aucune place dans le flux (le contenu / l'image remonte directement sous le
 * header) : chip flottant, fixé juste sous le header (même ancrage que le
 * panneau DEV). `pointerEvents:none` pour ne pas bloquer les interactions.
 */
const wrap: CSSProperties = {
  position: "fixed",
  top: "calc(var(--mobile-header-h) + var(--safe-top) + 6px)",
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none",
  zIndex: 40,
};

const chip: CSSProperties = {
  background: "rgba(245,239,225,0.95)",
  borderRadius: 6,
  // Double filet : extérieur brass-700 + intérieur brass-500 via shadow
  // (même recette que l'encadré des brocantes, à échelle réduite).
  border: "1px solid var(--brass-700)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500), 0 6px 16px rgba(20,12,0,0.4)",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  padding: "3px 18px 4px",
  // Titre d'étape manuscrit (Caveat), italique + gras.
  fontFamily: "var(--font-handwriting)",
  fontStyle: "italic",
  fontWeight: 700,
  fontSize: 24,
  lineHeight: 1.1,
  color: "var(--forest-800)",
  whiteSpace: "nowrap",
};

export function EtapeBandeau({ children }: { children: ReactNode }) {
  return (
    <div style={wrap}>
      <span style={chip}>{children}</span>
    </div>
  );
}
