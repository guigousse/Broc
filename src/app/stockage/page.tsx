"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { CategorieChips } from "@/components/mobile/CategorieChips";
import { InventoryGrid } from "@/components/InventoryGrid";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { getStockageTier } from "@/data/stockage";
import { aConnaisseurVitrine } from "@/lib/competences";
import type { CategorieObjet, Objet } from "@/types/game";

export default function StockagePage() {
  const router = useRouter();
  const { state, isHydrated, mettreEnVitrine } = useGame();
  const [filtre, setFiltre] = useState<CategorieObjet | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const categoriesConnuesVitrine = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurVitrine(state, c)) s.add(c);
    return s;
  }, [state]);

  const objetsFiltres = useMemo(() => {
    if (!state) return [];
    return filtre
      ? state.inventaireJoueur.filter((o) => o.categorie === filtre)
      : state.inventaireJoueur;
  }, [state, filtre]);

  const comptes = useMemo(() => {
    const acc: Partial<Record<CategorieObjet, number>> = {};
    if (!state) return acc;
    for (const o of state.inventaireJoueur) {
      acc[o.categorie] = (acc[o.categorie] ?? 0) + 1;
    }
    return acc;
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
          fontSize: 12,
        }}
      >
        — ouverture du stockage…
      </main>
    );
  }

  const tier = getStockageTier(state.inventaireJoueur.length);
  const ratio = state.inventaireJoueur.length / tier.capaciteMax;

  const ajouterAVitrine = state.vitrine
    ? (o: Objet) => {
        const prix = Math.max(1, Math.round(o.prixReferenceReel * 1.4));
        mettreEnVitrine(o.id, prix);
      }
    : undefined;

  return (
    <MobileLayout
      header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
      stickyTop={
        <StickyTop>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 9,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              textAlign: "center",
              marginBottom: 6,
            }}
          >
            — Stockage · {tier.nom} —
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                color: "var(--forest-800)",
              }}
            >
              {state.inventaireJoueur.length} / {tier.capaciteMax} obj.
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
              }}
            >
              Loyer {tier.loyerHebdo} €/sem.
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: "var(--paper-300)",
              border: "1px solid var(--brass-500)",
              margin: "6px 0 8px",
            }}
          >
            <div
              style={{
                height: "100%",
                background:
                  ratio >= 1
                    ? "var(--vermillion-600)"
                    : "var(--forest-800)",
                width: `${Math.min(100, Math.round(ratio * 100))}%`,
              }}
            />
          </div>
          <CategorieChips
            categories={CATEGORIES}
            selection={filtre}
            onChange={setFiltre}
            comptesParCat={comptes}
            total={state.inventaireJoueur.length}
          />
        </StickyTop>
      }
    >
      {state.vitrine && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
            textAlign: "center",
            padding: "6px 12px",
            marginBottom: 8,
            border: "1px solid var(--brass-500)",
            background: "var(--paper-100)",
          }}
        >
          Vitrine ouverte · tap → Étal pour exposer
        </div>
      )}
      <InventoryGrid
        objets={objetsFiltres}
        categoriesConnues={categoriesConnuesVitrine}
        onAjouterVitrine={ajouterAVitrine}
      />
    </MobileLayout>
  );
}
