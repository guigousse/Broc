import type { CSSProperties, ReactNode } from "react";

/** Bandeau d'étape affiché sous le header standard dans le flux vente. */
const bandeau: CSSProperties = {
  padding: "6px 16px",
  textAlign: "center",
  background: "var(--paper-200)",
  borderBottom: "1px solid var(--brass-500)",
  // Titre d'étape manuscrit (Caveat) : pas de capitales ni d'interlettrage,
  // qui dénaturent une écriture cursive.
  fontFamily: "var(--font-handwriting)",
  fontSize: 22,
  color: "var(--forest-800)",
};

/**
 * Variante « flottante » : le texte d'étape n'occupe AUCUNE place dans le flux
 * (l'image remonte donc directement sous le header) et flotte DEVANT l'image,
 * fixé juste sous le header (même ancrage que le panneau DEV). Fond transparent,
 * halo clair pour rester lisible sur n'importe quelle image. `pointerEvents:none`
 * pour ne pas bloquer les interactions avec l'image (drag des objets du coffre).
 */
const flottant: CSSProperties = {
  position: "fixed",
  top: "calc(var(--mobile-header-h) + var(--safe-top) + 6px)",
  left: 0,
  right: 0,
  textAlign: "center",
  pointerEvents: "none",
  zIndex: 40,
  fontFamily: "var(--font-handwriting)",
  fontSize: 22,
  color: "var(--forest-800)",
  textShadow:
    "0 1px 2px rgba(253,250,242,0.95), 0 0 8px rgba(253,250,242,0.85), 0 0 3px rgba(253,250,242,0.95)",
};

export function EtapeBandeau({
  children,
  floating = false,
}: {
  children: ReactNode;
  /** Si vrai : texte flottant fixe devant l'image (hors flux), sans fond. */
  floating?: boolean;
}) {
  return <div style={floating ? flottant : bandeau}>{children}</div>;
}
