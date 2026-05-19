"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { InventoryGrid } from "@/components/InventoryGrid";
import { StatusBar } from "@/components/StatusBar";
import { Panel } from "@/components/ui/Panel";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { getStockageTier } from "@/data/stockage";
import { aConnaisseurVitrine } from "@/lib/competences";
import type { CategorieObjet } from "@/types/game";

export default function StockagePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const categoriesConnuesVitrine = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurVitrine(state, c)) s.add(c);
    return s;
  }, [state]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — inventaire du stock…
      </main>
    );
  }

  const tier = getStockageTier(state.inventaireJoueur.length);
  const joursAvantLoyer = Math.max(
    0,
    state.prochainRafraichissementTendances - state.jourActuel,
  );

  return (
    <div
      className="bg-paper-grain"
      style={{ minHeight: "100dvh", padding: "20px 28px 32px" }}
    >
      <StatusBar jour={state.jourActuel} budget={state.budget} />

      <div style={{ marginTop: 22 }}>
        <Panel
          eyebrow="— stockage —"
          title={`${tier.nom} · ${state.inventaireJoueur.length} objet${
            state.inventaireJoueur.length > 1 ? "s" : ""
          }`}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: 8,
              padding: "8px 10px",
              marginBottom: 12,
              background: "var(--paper-300)",
              border: "1px dashed var(--brass-700)",
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              letterSpacing: "0.06em",
              color: "var(--ink-500)",
            }}
          >
            <span>
              Loyer hebdo{" "}
              <strong style={{ color: "var(--forest-800)" }}>
                {tier.loyerHebdo} €
              </strong>{" "}
              · prélèvement{" "}
              {joursAvantLoyer === 0
                ? "demain"
                : `dans ${joursAvantLoyer} jour${joursAvantLoyer > 1 ? "s" : ""}`}
            </span>
            {state.dernierLoyer && (
              <span style={{ color: "var(--vermillion-600)" }}>
                dernier loyer −{state.dernierLoyer.montant} € (
                {state.dernierLoyer.tierNom})
              </span>
            )}
          </div>
          <InventoryGrid
            objets={state.inventaireJoueur}
            categoriesConnues={categoriesConnuesVitrine}
          />
        </Panel>
      </div>
    </div>
  );
}
