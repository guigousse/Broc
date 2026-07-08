"use client";

import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";

interface CreditsModalProps {
  open: boolean;
  onClose: () => void;
}

/* Même habillage que l'overlay Parties : écran-titre flouté derrière,
   carte papier flottante devant. */

const wrap: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: "rgba(15,31,24,0.35)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  paddingTop: "var(--safe-top)",
  paddingBottom: "var(--safe-bottom)",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
};

const topBar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.32em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  fontWeight: 700,
};

const closeBtn: CSSProperties = {
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-300)",
  padding: 6,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

const carte: CSSProperties = {
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "0 16px 32px rgba(0,0,0,0.38), inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
  borderRadius: "var(--radius-card)",
  padding: "24px 16px",
  margin: "18px 24px 0",
  textAlign: "center",
};

const ligneTitre: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 17,
  color: "var(--ink-700)",
  marginBottom: 10,
};

const lignesMono: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  lineHeight: 1.9,
};

export function CreditsModal({ open, onClose }: CreditsModalProps) {
  const { d } = useLangue();

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={d.credits.titre} style={wrap}>
      <div style={topBar}>
        <h2 style={titleStyle}>{d.credits.titre}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={d.commun.fermer}
          style={closeBtn}
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div style={carte}>
        <div style={ligneTitre}>{d.credits.baseline}</div>
        <div style={lignesMono}>
          <div>{d.credits.concu}</div>
          <div>{d.credits.version}</div>
          <div style={{ marginTop: 8 }}>
            <a
              href="/privacy"
              style={{ color: "var(--brass-700)", textDecoration: "underline" }}
            >
              {d.credits.confidentialite}
            </a>
            {" · "}
            <a
              href="/mentions-legales"
              style={{ color: "var(--brass-700)", textDecoration: "underline" }}
            >
              {d.credits.mentionsLegales}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
