"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { useGame } from "@/context/GameContext";
import type { Session } from "@/types/game";

function resumer(s: Session): { kind: string; lbl: string; pl: number } {
  if (s.type === "chinage") {
    const total = s.achats.reduce((sum, a) => sum + a.prixPaye, 0);
    return {
      kind: "Chinage",
      lbl: `${s.brocanteNom} · ${s.achats.length} acqui${s.achats.length > 1 ? "s" : "s"}`,
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

export default function HistoriquePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  if (!isHydrated || !state) {
    return null;
  }

  return (
    <MobileLayout
      header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
    >
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
            return (
              <article
                key={s.id}
                style={{
                  border: "1px solid var(--brass-500)",
                  background: "var(--paper-100)",
                  padding: "10px 12px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 10,
                  alignItems: "baseline",
                  boxShadow:
                    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
                }}
              >
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
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    color:
                      pl >= 0
                        ? "var(--forest-700)"
                        : "var(--vermillion-600)",
                  }}
                >
                  {pl >= 0 ? "+" : ""}
                  {pl} €
                </div>
              </article>
            );
          })}
        </div>
      )}
    </MobileLayout>
  );
}
