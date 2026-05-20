"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { CategorieChips } from "@/components/mobile/CategorieChips";
import { CollectionGrid } from "@/components/CollectionGrid";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { progressionGlobale } from "@/lib/collection";
import type { CategorieObjet, CollectionSlot } from "@/types/game";

export default function CollectionPage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();
  const [filtre, setFiltre] = useState<CategorieObjet | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const slotsFiltres: CollectionSlot[] = useMemo(() => {
    if (!state) return [];
    if (filtre) return state.collection[filtre] ?? [];
    return CATEGORIES.flatMap((c) => state.collection[c] ?? []);
  }, [state, filtre]);

  const comptes = useMemo(() => {
    const acc: Partial<Record<CategorieObjet, number>> = {};
    if (!state) return acc;
    for (const c of CATEGORIES)
      acc[c] = (state.collection[c] ?? []).filter((s) => s.donation !== null).length;
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
        — consultation de la collection…
      </main>
    );
  }

  const global = progressionGlobale(state.collection);

  // valeurParCategorie(collection, cat) takes one cat at a time — compute map inline
  const valeurs = CATEGORIES.reduce(
    (acc, c) => {
      acc[c] = (state.collection[c] ?? []).reduce(
        (s, slot) => s + (slot.donation?.valeur ?? 0),
        0,
      );
      return acc;
    },
    {} as Record<CategorieObjet, number>,
  );

  const breakdown = CATEGORIES.filter((c) => (valeurs[c] ?? 0) > 0)
    .sort((a, b) => (valeurs[b] ?? 0) - (valeurs[a] ?? 0))
    .slice(0, 3)
    .map((c) => `${c} ${Math.round(valeurs[c] ?? 0)} €`)
    .join(" · ");

  return (
    <MobileLayout
      header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
      stickyTop={
        <StickyTop>
          <div
            style={{
              border: "1px solid var(--brass-500)",
              padding: "8px 12px",
              background: "var(--paper-100)",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
              }}
            >
              — Valeur totale —
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                color: "var(--forest-800)",
                letterSpacing: "0.04em",
              }}
            >
              {Math.round(global.valeur).toLocaleString("fr-FR")} €
            </div>
            {breakdown && (
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 11.5,
                  color: "var(--ink-500)",
                  marginTop: 4,
                }}
              >
                {breakdown}
              </div>
            )}
          </div>
          <CategorieChips
            categories={CATEGORIES}
            selection={filtre}
            onChange={setFiltre}
            comptesParCat={comptes}
            total={global.donnees}
          />
        </StickyTop>
      }
    >
      <CollectionGrid slots={slotsFiltres} />
    </MobileLayout>
  );
}
