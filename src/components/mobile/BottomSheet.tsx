"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Hauteur max en % du viewport. Défaut 88. */
  maxHeightPct?: number;
  /**
   * Décoration positionnée absolu au-dessus du bord supérieur de la sheet.
   * Utile pour qu'un personnage / avatar "sorte" du cadre vers le haut.
   * Quand fourni, le titre et le séparateur d'en-tête sont masqués et seul
   * le bouton Fermer reste accessible en haut à droite.
   */
  topDecoration?: ReactNode;
}

const scrimStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.45)",
  zIndex: 40,
  animation: "broc-fade-in 160ms ease",
};

const sheetWrap = (maxHeightPct: number): CSSProperties => ({
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 41,
  background: "var(--paper-200)",
  borderTop: "2px solid var(--forest-800)",
  borderRadius: "14px 14px 0 0",
  boxShadow: "0 -6px 18px rgba(40,25,5,0.20)",
  maxHeight: `${maxHeightPct}%`,
  display: "flex",
  flexDirection: "column",
  paddingBottom: "calc(16px + var(--safe-bottom))",
  animation: "broc-slide-up 200ms ease",
});

const handleStyle: CSSProperties = {
  width: 40,
  height: 4,
  background: "var(--paper-500)",
  borderRadius: 2,
  margin: "8px auto 6px",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 16px 8px",
  borderBottom: "1px solid var(--brass-500)",
};

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeightPct = 88,
  topDecoration,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div style={scrimStyle} onClick={onClose} aria-hidden />
      <div
        style={sheetWrap(maxHeightPct)}
        role="dialog"
        aria-modal="true"
      >
        {topDecoration ? (
          <>
            <div style={topDecorationStyle}>{topDecoration}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              style={floatingCloseBtn}
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <div style={handleStyle} aria-hidden />
            <div style={headerStyle}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                }}
              >
                {title ?? ""}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--brass-700)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                Fermer ✕
              </button>
            </div>
          </>
        )}
        <div
          style={{
            overflowY: "auto",
            padding: topDecoration ? 0 : "12px 16px",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

const topDecorationStyle: CSSProperties = {
  position: "absolute",
  top: -86,
  left: 16,
  right: 16,
  zIndex: 2,
  pointerEvents: "none",
};

const floatingCloseBtn: CSSProperties = {
  position: "absolute",
  top: 14,
  right: 10,
  zIndex: 3,
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: "var(--paper-200)",
  color: "var(--brass-700)",
  border: "1px solid var(--brass-500)",
  cursor: "pointer",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 700,
  display: "grid",
  placeItems: "center",
  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
};
