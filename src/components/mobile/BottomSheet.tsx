"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Hauteur max en % du viewport. Défaut 88. */
  maxHeightPct?: number;
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
  background: "var(--paper-100)",
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
      <div style={sheetWrap(maxHeightPct)} role="dialog" aria-modal="true">
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
        <div style={{ overflowY: "auto", padding: "12px 16px" }}>{children}</div>
      </div>
    </>
  );
}
