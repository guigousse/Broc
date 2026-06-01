"use client";

import type { CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import type { Courrier } from "@/types/game";

interface CourrierSheetProps {
  open: boolean;
  onClose: () => void;
  courriers: Courrier[];
  onMarquerLu: (id: string) => void;
}

const card: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: 12,
  marginBottom: 10,
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

const tag: CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  background: "var(--vermillion-600)",
  color: "var(--paper-100)",
  fontFamily: "var(--font-display)",
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const closeBtn: CSSProperties = {
  marginTop: 8,
  padding: "6px 12px",
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-700)",
  fontFamily: "var(--font-display)",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
};

function renderHuissier(c: Courrier) {
  if (c.payload.type !== "huissier") return null;
  const p = c.payload;
  const total = p.saisies.reduce((s, x) => s + x.montantRecupere, 0);
  return (
    <>
      <span style={tag}>Lettre de l'huissier</span>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 13,
          lineHeight: 1.4,
        }}
      >
        Dette de {Math.abs(p.detteAvantSaisie)} € après loyer.{" "}
        {p.saisies.length} bien{p.saisies.length > 1 ? "s" : ""} saisi
        {p.saisies.length > 1 ? "s" : ""} pour {total} €.
      </p>
      {p.saisies.length > 0 && (
        <ul
          style={{
            margin: "6px 0 0 16px",
            padding: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
          }}
        >
          {p.saisies.map((s, i) => (
            <li key={i}>
              {s.nom} ({s.type === "inventaire" ? "stock" : "collection"}) —{" "}
              {s.montantRecupere} € (valeur {s.valeur} €)
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function CourrierSheet({
  open,
  onClose,
  courriers,
  onMarquerLu,
}: CourrierSheetProps) {
  const nonLus = courriers
    .filter((c) => !c.lu)
    .sort((a, b) => b.jourRecu - a.jourRecu);
  return (
    <BottomSheet open={open} onClose={onClose} title="— Courrier du jour —">
      {nonLus.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--ink-500)",
            textAlign: "center",
            padding: "20px 0",
          }}
        >
          Aucune nouvelle lettre.
        </p>
      ) : (
        nonLus.map((c) => (
          <div key={c.id} style={card}>
            {c.type === "huissier" ? renderHuissier(c) : null}
            <button
              type="button"
              style={closeBtn}
              onClick={() => onMarquerLu(c.id)}
            >
              Compris ✕
            </button>
          </div>
        ))
      )}
    </BottomSheet>
  );
}
