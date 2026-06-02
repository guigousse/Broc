"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";

interface FloatingActionBarProps {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  /** Texte optionnel affiché au-dessus des boutons (ex. message bloquant). */
  message?: ReactNode;
}

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.40)",
  zIndex: 50,
  animation: "broc-fade-in 160ms ease",
};

const wrap: CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 51,
  // padding-bottom inclut la hauteur de la tab bar + safe-area pour que
  // les boutons restent au-dessus du bandeau inférieur.
  padding:
    "0 16px calc(16px + var(--mobile-tabbar-h) + env(safe-area-inset-bottom))",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  pointerEvents: "none",
};

const buttonRow: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "center",
  width: "100%",
  maxWidth: 480,
};

const messageBox: CSSProperties = {
  pointerEvents: "auto",
  background: "rgba(15,30,22,0.85)",
  color: "var(--brass-100)",
  border: "1px solid var(--brass-500)",
  borderRadius: 4,
  padding: "10px 14px",
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 13,
  textAlign: "center",
  maxWidth: 320,
  lineHeight: 1.4,
};

export function FloatingActionBar({
  open,
  onClose,
  children,
  message,
}: FloatingActionBarProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={wrap} role="dialog" aria-modal="true">
        {message && <div style={messageBox}>{message}</div>}
        {children && <div style={buttonRow}>{children}</div>}
      </div>
    </>
  );
}
