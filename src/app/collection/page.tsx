"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CollectionGrid } from "@/components/CollectionGrid";
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
} from "@/lib/collection";
import type { CategorieObjet } from "@/types/game";

export default function CollectionPage() {
  const router = useRouter();
  const { state, isHydrated, donnerACollection, retirerDeCollection } = useGame();
  const [catSelectionnee, setCatSelectionnee] = useState<CategorieObjet>(
    CATEGORIES[0],
  );
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const global = useMemo(
    () => (state ? progressionGlobale(state.collection) : null),
    [state],
  );
  const courante = useMemo(
    () => (state ? progressionCategorie(state.collection, catSelectionnee) : null),
    [state, catSelectionnee],
  );

  if (!isHydrated || !state || !global || !courante) {
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
        — ouverture de la collection…
      </main>
    );
  }

  const slots = state.collection[catSelectionnee] ?? [];

  const handleDonner = (objetId: string) => {
    const res = donnerACollection(objetId);
    setFlash(res.ok ? "Donation enregistrée." : res.raison ?? "Erreur.");
  };
  const handleRetirer = (templateId: string) => {
    const res = retirerDeCollection(templateId);
    setFlash(res.ok ? "Objet retiré et remis en inventaire." : res.raison ?? "Erreur.");
  };

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
            <div className="eyebrow">— collection personnelle —</div>
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
              Collection
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
              Donnez des objets de votre inventaire pour garnir vos slots. La valeur
              totale (état pondéré) débloque les brocantes prestigieuses.
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
              Valeur totale :{" "}
              <span style={{ color: "var(--forest-800)" }}>
                {global.valeur.toLocaleString("fr-FR")} €
              </span>
              {" · "}
              {global.donnees} / {global.total} slot
              {global.total > 1 ? "s" : ""}
            </div>
            <Link href="/qg">
              <Button variant="ghost" size="sm">
                ← Retour au QG
              </Button>
            </Link>
          </div>
        </header>

        <DecoDivider />

        {flash && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--paper-100)",
              border: "1px solid var(--brass-500)",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--ink-700)",
              textAlign: "center",
            }}
          >
            {flash}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
            gap: 10,
          }}
        >
          {CATEGORIES.map((c) => {
            const p = progressionCategorie(state.collection, c);
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
                    {p.donnees} / {p.total} · {p.valeur} €
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Panel
          eyebrow={`— ${catSelectionnee} —`}
          title={`${courante.donnees} / ${courante.total} · ${courante.valeur.toLocaleString("fr-FR")} €`}
        >
          <CollectionGrid
            slots={slots}
            inventaire={state.inventaireJoueur}
            onDonner={handleDonner}
            onRetirer={handleRetirer}
          />
        </Panel>
      </div>
    </div>
  );
}
