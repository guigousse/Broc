"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CatalogueGrid } from "@/components/CatalogueGrid";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { Panel } from "@/components/ui/Panel";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import {
  progressionCategorie,
  progressionGlobale,
} from "@/lib/catalogue";
import type { CategorieObjet } from "@/types/game";

export default function CataloguePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();
  const [catSelectionnee, setCatSelectionnee] = useState<CategorieObjet>(
    CATEGORIES[0],
  );

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

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
        — ouverture du catalogue…
      </main>
    );
  }

  const global = progressionGlobale(state.catalogue);
  const courante = progressionCategorie(state.catalogue, catSelectionnee);
  const entrees = state.catalogue[catSelectionnee] ?? [];

  return (
    <div
      className="bg-paper-grain"
      style={{ minHeight: "100dvh", padding: "20px 28px 32px" }}
    >
      <StatusBar jour={state.jourActuel} budget={state.budget} />

      <div
        style={{
          maxWidth: 1280,
          margin: "32px auto 0",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
          }}
        >
          <div>
            <div className="eyebrow">— catalogue des trésors —</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--forest-800)",
                margin: "4px 0 8px",
                lineHeight: 1.1,
              }}
            >
              Catalogue
            </h1>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                fontSize: 16,
                margin: 0,
                maxWidth: 540,
              }}
            >
              Chaque pièce croisée chez un vendeur ou un client apparaît grisée.
              Posséder l'objet (au moins une fois) la révèle en couleur.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
              }}
            >
              Progression : <span style={{ color: "var(--forest-800)" }}>{global.possedees} / {global.total}</span>
            </div>
            <Link href="/qg">
              <Button variant="ghost" size="sm">
                ← Retour au QG
              </Button>
            </Link>
          </div>
        </header>

        <DecoDivider />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          {CATEGORIES.map((c) => {
            const p = progressionCategorie(state.catalogue, c);
            const selected = c === catSelectionnee;
            return (
              <button
                key={c}
                onClick={() => setCatSelectionnee(c)}
                style={{
                  padding: "10px 12px",
                  background: selected ? "var(--forest-800)" : "var(--paper-100)",
                  border: `1px solid ${selected ? "var(--brass-500)" : "var(--brass-700)"}`,
                  boxShadow: selected
                    ? "inset 0 0 0 3px var(--forest-800), inset 0 0 0 4px var(--brass-500)"
                    : "0 2px 0 var(--paper-400)",
                  color: selected ? "var(--paper-200)" : "var(--ink-700)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CategorieIcon
                  categorie={c}
                  size={16}
                  color={selected ? "var(--brass-300)" : "var(--brass-700)"}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: selected ? "var(--brass-300)" : "var(--forest-800)",
                      lineHeight: 1.1,
                    }}
                  >
                    {c}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      letterSpacing: "0.12em",
                      color: selected ? "var(--brass-300)" : "var(--brass-700)",
                    }}
                  >
                    {p.possedees} / {p.total}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Panel
          eyebrow={`— ${catSelectionnee} —`}
          title={`Trésors · ${courante.possedees} / ${courante.total}`}
        >
          <CatalogueGrid entrees={entrees} />
        </Panel>
      </div>
    </div>
  );
}
