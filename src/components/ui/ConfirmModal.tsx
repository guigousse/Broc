"use client";

import type { CSSProperties, ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titre: string;
  /** Corps du message (texte ou noeuds React). */
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style "danger" sur le bouton de confirmation (action destructive). */
  danger?: boolean;
}

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 110,
  background: "rgba(15,31,24,0.78)",
  display: "grid",
  placeItems: "center",
  padding: "20px",
};

const card: CSSProperties = {
  maxWidth: 360,
  width: "100%",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
  padding: "20px",
  borderRadius: "var(--radius-card)",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center",
  marginBottom: 16,
};

const bodyStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 15,
  lineHeight: 1.45,
  color: "var(--ink-700)",
  marginBottom: 18,
};

const btn = (variant: "ghost" | "primary" | "danger"): CSSProperties => ({
  flex: 1,
  minHeight: 44,
  padding: "10px 12px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  border:
    variant === "danger"
      ? "1px solid var(--velvet-700)"
      : "1px solid var(--brass-500)",
  background:
    variant === "danger"
      ? "var(--vermillion-600)"
      : variant === "primary"
        ? "var(--forest-800)"
        : "var(--paper-200)",
  color:
    variant === "danger"
      ? "var(--paper-100)"
      : variant === "primary"
        ? "var(--brass-300)"
        : "var(--ink-700)",
  cursor: "pointer",
  borderRadius: "var(--radius-btn)",
});

/**
 * Modale de confirmation générique au style du jeu — remplace les
 * `window.confirm()` natifs (incohérents avec le thème, non stylables).
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  titre,
  children,
  confirmLabel,
  cancelLabel,
  danger = false,
}: ConfirmModalProps) {
  const { d } = useLangue();
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titre}
      style={backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={card}>
        <div style={titleStyle}>— {titre} —</div>
        <div style={bodyStyle}>{children}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={btn("ghost")}>
            {cancelLabel ?? d.commun.annuler}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={btn(danger ? "danger" : "primary")}
          >
            {confirmLabel ?? d.commun.confirmer}
          </button>
        </div>
      </div>
    </div>
  );
}
