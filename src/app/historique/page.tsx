"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { useGame } from "@/context/GameContext";
import type { Session, SessionChinage, SessionVente } from "@/types/game";
import type { CSSProperties } from "react";

function resumer(s: Session): { kind: string; lbl: string; pl: number } {
  if (s.type === "chinage") {
    const total = s.achats.reduce((sum, a) => sum + a.prixPaye, 0);
    return {
      kind: "Chinage",
      lbl: `${s.brocanteNom} · ${s.achats.length} acquis`,
      pl: -total,
    };
  }
  if (s.type === "vente") {
    const recettes = s.ventes.reduce((sum, v) => sum + v.prixVente, 0);
    const cogs = s.ventes.reduce((sum, v) => sum + (v.prixAchat ?? 0), 0);
    const net = recettes - cogs - s.loyer;
    return {
      kind: "Vente",
      lbl: `${s.ventes.length} vente${s.ventes.length > 1 ? "s" : ""} · stand ${s.niveauStand}`,
      pl: net,
    };
  }
  return { kind: (s as { type: string }).type, lbl: "", pl: 0 };
}

export default function HistoriquePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  if (!isHydrated || !state) return null;

  const toggle = (id: string) =>
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <MobileLayout header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}>
      {state.historique.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            color: "var(--ink-500)",
            textAlign: "center",
            padding: "40px 20px",
          }}
        >
          Aucune session enregistrée.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {state.historique.map((s) => {
            const { kind, lbl, pl } = resumer(s);
            const isOpen = expanded.has(s.id);
            return (
              <article
                key={s.id}
                style={{
                  border: "1px solid var(--brass-500)",
                  background: "var(--paper-100)",
                  boxShadow:
                    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "10px 12px",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto auto",
                    gap: 10,
                    alignItems: "baseline",
                    textAlign: "left",
                  }}
                >
                  {/* Jour XX block */}
                  <div
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
                        fontSize: 14,
                        color: "var(--forest-800)",
                      }}
                    >
                      {String(s.jour).padStart(2, "0")}
                    </strong>
                  </div>
                  {/* lbl block */}
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 13,
                      color: "var(--ink-700)",
                      lineHeight: 1.3,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 9.5,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--brass-700)",
                      }}
                    >
                      {kind}
                    </div>
                    {lbl}
                  </div>
                  {/* P&L */}
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 13,
                      color: pl >= 0 ? "var(--forest-700)" : "var(--vermillion-600)",
                    }}
                  >
                    {pl >= 0 ? "+" : ""}{pl} €
                  </div>
                  {/* Chevron */}
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--brass-500)",
                      fontSize: 14,
                    }}
                  >
                    {isOpen ? "▾" : "▸"}
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: "0 12px 12px",
                      borderTop: "1px dotted var(--paper-500)",
                    }}
                  >
                    {s.type === "chinage" ? (
                      <DetailsChinage s={s} />
                    ) : (
                      <DetailsVente s={s} />
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </MobileLayout>
  );
}

function DetailsChinage({ s }: { s: SessionChinage }) {
  return (
    <>
      <div style={detailHeader}>— Achats —</div>
      {s.achats.length === 0 ? (
        <p style={emptyDetail}>Aucun achat.</p>
      ) : (
        s.achats.map((a, i) => (
          <div key={i} style={detailRow}>
            <div style={{ flex: 1 }}>
              <div style={detailName}>{a.nom}</div>
              <div style={detailMeta}>
                {a.etat} · {a.categorie}
              </div>
            </div>
            <div style={detailPrice}>−{a.prixPaye} €</div>
          </div>
        ))
      )}
    </>
  );
}

function DetailsVente({ s }: { s: SessionVente }) {
  const recettes = s.ventes.reduce((sum, v) => sum + v.prixVente, 0);
  const cogs = s.ventes.reduce((sum, v) => sum + (v.prixAchat ?? 0), 0);
  const net = recettes - cogs - s.loyer;
  return (
    <>
      <div style={detailHeader}>— Ventes —</div>
      {s.ventes.length === 0 ? (
        <p style={emptyDetail}>Aucune vente.</p>
      ) : (
        s.ventes.map((v, i) => {
          const marge = v.prixVente - (v.prixAchat ?? 0);
          return (
            <div key={i} style={detailRow}>
              <div style={{ flex: 1 }}>
                <div style={detailName}>{v.nom}</div>
                <div style={detailMeta}>
                  {v.etat} · {v.prixAchat != null ? `${v.prixAchat} € → ` : "— → "}{v.prixVente} €
                </div>
              </div>
              <div
                style={{
                  ...detailPrice,
                  color:
                    marge >= 0 ? "var(--forest-700)" : "var(--vermillion-600)",
                }}
              >
                {marge >= 0 ? "+" : ""}{marge} €
              </div>
            </div>
          );
        })
      )}
      {s.invendus > 0 && (
        <p style={{ ...emptyDetail, marginTop: 6 }}>
          {s.invendus} invendu{s.invendus > 1 ? "s" : ""}.
        </p>
      )}
      <div
        style={{
          marginTop: 10,
          padding: "8px 0",
          borderTop: "1px solid var(--paper-500)",
          display: "grid",
          gap: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
        }}
      >
        <div style={detailSummaryRow}>
          <span>Recettes</span>
          <span style={{ color: "var(--forest-700)" }}>+{recettes} €</span>
        </div>
        <div style={detailSummaryRow}>
          <span>Coût d&apos;achat</span>
          <span style={{ color: "var(--vermillion-600)" }}>−{cogs} €</span>
        </div>
        <div style={detailSummaryRow}>
          <span>Loyer stand {s.niveauStand}</span>
          <span style={{ color: "var(--vermillion-600)" }}>−{s.loyer} €</span>
        </div>
        <div
          style={{
            ...detailSummaryRow,
            fontFamily: "var(--font-display)",
            fontSize: 13,
            paddingTop: 4,
            borderTop: "1px dotted var(--paper-500)",
          }}
        >
          <span>Bénéfice net</span>
          <span
            style={{
              color: net >= 0 ? "var(--forest-700)" : "var(--vermillion-600)",
            }}
          >
            {net >= 0 ? "+" : ""}{net} €
          </span>
        </div>
      </div>
    </>
  );
}

const detailHeader: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 9,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center",
  margin: "10px 0 4px",
};
const detailRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 0",
  borderBottom: "1px dotted var(--paper-500)",
};
const detailName: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 10.5,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  fontWeight: 700,
};
const detailMeta: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  color: "var(--ink-500)",
  marginTop: 2,
};
const detailPrice: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 12,
  color: "var(--vermillion-600)",
};
const emptyDetail: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 12,
  color: "var(--ink-500)",
  textAlign: "center",
  padding: "6px 0",
};
const detailSummaryRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
};
