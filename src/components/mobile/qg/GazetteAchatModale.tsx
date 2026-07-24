"use client";

import { type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLangue } from "@/lib/i18n/LangueContext";

interface GazetteAchatModaleProps {
  open: boolean;
  prix: number;
  budget: number;
  onAcheter: () => void;
  onRefuser: () => void;
  /** Tap sur le fond : referme sans refuser (le journal reste au sol). */
  onClose: () => void;
}

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 120,
  background: "rgba(15, 30, 22, 0.45)",
  display: "grid",
  placeItems: "center",
  padding: 24,
};

const carte: CSSProperties = {
  width: "100%",
  maxWidth: 320,
  padding: "18px 18px 14px",
  borderRadius: 14,
  background: "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  border: "1px solid #b89c5e",
  boxShadow: "inset 0 0 28px rgba(120,90,40,0.18), 0 6px 16px rgba(0,0,0,0.35)",
  textAlign: "center",
};

const titre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 18,
  color: "#3a2f1e",
  margin: "0 0 6px",
};

const texte: CSSProperties = {
  fontFamily: "var(--font-handwriting)",
  fontSize: 17,
  lineHeight: 1.35,
  color: "#3a2f1e",
  margin: "0 0 14px",
};

const rangeeBoutons: CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "center",
};

const bouton: CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #b89c5e",
  fontFamily: "var(--font-display)",
  fontSize: 14,
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

export function GazetteAchatModale({
  open,
  prix,
  budget,
  onAcheter,
  onRefuser,
  onClose,
}: GazetteAchatModaleProps) {
  const { d, tr } = useLangue();
  if (!open || typeof document === "undefined") return null;
  const insuffisant = budget < prix;
  return createPortal(
    <div style={scrim} onClick={onClose} role="dialog" aria-modal="true">
      <div style={carte} onClick={(e) => e.stopPropagation()}>
        <h2 style={titre}>{d.qg.gazetteModaleTitre}</h2>
        <p style={texte}>{d.qg.gazetteModaleTexte}</p>
        <div style={rangeeBoutons}>
          <button
            type="button"
            style={{
              ...bouton,
              background: insuffisant ? "#cbbc95" : "#2c5e3f",
              color: insuffisant ? "#8a7a55" : "#f4e9cd",
              cursor: insuffisant ? "not-allowed" : "pointer",
            }}
            disabled={insuffisant}
            onClick={onAcheter}
          >
            {tr(d.sheets.acheterGazette, { prix })}
          </button>
          <button
            type="button"
            style={{ ...bouton, background: "#e7d6a8", color: "#6e1f1f" }}
            onClick={onRefuser}
          >
            {d.qg.gazetteModaleRefuser}
          </button>
        </div>
        {insuffisant && (
          <p style={{ ...texte, margin: "10px 0 0", color: "#7a2e1d" }}>
            {d.qg.gazetteModaleBudget}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
