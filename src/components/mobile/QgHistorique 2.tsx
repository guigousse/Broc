"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import type { GameState, Session } from "@/types/game";

interface QgHistoriqueProps {
  state: GameState;
}

const cardStyle: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "4px 12px",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

function resumer(s: Session): { kind: string; lbl: string; pl: number } {
  if (s.type === "chinage") {
    const total = s.achats.reduce((sum, a) => sum + a.prixPaye, 0);
    return {
      kind: "Chinage",
      lbl: `${s.brocanteNom} · ${s.achats.length} acquis${s.achats.length > 1 ? "" : ""}`,
      pl: -total,
    };
  }
  if (s.type === "vente") {
    const total = s.ventes.reduce((sum, v) => sum + v.prixVente, 0);
    return {
      kind: "Vente",
      lbl: `${s.ventes.length} vente${s.ventes.length > 1 ? "s" : ""}`,
      pl: total,
    };
  }
  return { kind: (s as { type: string }).type, lbl: "", pl: 0 };
}

export function QgHistorique({ state }: QgHistoriqueProps) {
  const router = useRouter();
  const recents = state.historique.slice(0, 3);
  if (recents.length === 0) {
    return (
      <section style={cardStyle}>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 12.5,
            color: "var(--ink-500)",
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          Aucune session enregistrée.
        </p>
      </section>
    );
  }
  return (
    <section aria-label="Dernières sessions" style={cardStyle}>
      {recents.map((s) => {
        const { kind, lbl, pl } = resumer(s);
        return (
          <div
            key={s.id}
            style={{
              padding: "8px 0",
              borderBottom: "1px dotted var(--paper-500)",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 10,
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
                textAlign: "center",
                minWidth: 38,
              }}
            >
              Jour
              <strong
                style={{
                  display: "block",
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  color: "var(--forest-800)",
                }}
              >
                {String(s.jour).padStart(2, "0")}
              </strong>
            </span>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 12.5,
                color: "var(--ink-700)",
                lineHeight: 1.3,
              }}
            >
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-display)",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--brass-700)",
                }}
              >
                {kind}
              </span>
              {lbl}
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 12,
                color: pl >= 0 ? "var(--forest-700)" : "var(--vermillion-600)",
              }}
            >
              {pl >= 0 ? "+" : ""}
              {pl} €
            </span>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => router.push("/historique")}
        style={{
          width: "100%",
          padding: "8px 0",
          background: "transparent",
          border: "none",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
          cursor: "pointer",
        }}
      >
        Tout l'historique ›
      </button>
    </section>
  );
}
