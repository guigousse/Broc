import type { CSSProperties, ReactNode } from "react";

/**
 * Texte d'étape du flux vente : il n'occupe AUCUNE place dans le flux (le
 * contenu / l'image remonte donc directement sous le header) et flotte DEVANT,
 * fixé juste sous le header (même ancrage que le panneau DEV). Fond transparent,
 * sans halo. `pointerEvents:none` pour ne pas bloquer les interactions (drag des
 * objets du coffre, scroll de la liste, etc.).
 */
const etapeTexte: CSSProperties = {
  position: "fixed",
  top: "calc(var(--mobile-header-h) + var(--safe-top) + 6px)",
  left: 0,
  right: 0,
  textAlign: "center",
  pointerEvents: "none",
  zIndex: 40,
  // Titre d'étape manuscrit (Caveat) : pas de capitales ni d'interlettrage,
  // qui dénaturent une écriture cursive. Laiton clair, italique + gras.
  fontFamily: "var(--font-handwriting)",
  fontStyle: "italic",
  fontWeight: 700,
  fontSize: 24,
  color: "var(--brass-300)",
};

export function EtapeBandeau({ children }: { children: ReactNode }) {
  return <div style={etapeTexte}>{children}</div>;
}
