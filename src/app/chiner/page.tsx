"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrocanteCard } from "@/components/BrocanteCard";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { useGame } from "@/context/GameContext";
import { BROCANTES, brocantesParTier } from "@/data/brocantes";
import { estDebloquee } from "@/lib/deblocage";

export default function ChinerListePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();

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
        — préparation des halles…
      </main>
    );
  }

  // Résolution des conditions par tier croissant : tier 1 d'abord, puis 2, puis 3, puis 4
  const debloqueesParTier = new Map<1 | 2 | 3 | 4, Set<string>>([
    [1, new Set<string>()],
    [2, new Set<string>()],
    [3, new Set<string>()],
    [4, new Set<string>()],
  ]);
  for (const tier of [1, 2, 3, 4] as const) {
    for (const b of brocantesParTier(tier)) {
      if (estDebloquee(b, state, debloqueesParTier)) {
        debloqueesParTier.get(tier)!.add(b.id);
      }
    }
  }

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
            <div className="eyebrow">— terrains de chine —</div>
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
              Où chinerez-vous ?
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
              Une sortie consomme un jour. Les meilleures pièces ne vous attendront
              pas indéfiniment.
            </p>
          </div>
          <Link href="/qg">
            <Button variant="ghost" size="sm">
              ← Retour au QG
            </Button>
          </Link>
        </header>

        <DecoDivider />

        {([1, 2, 3, 4] as const).map((tier) => {
          const brocantesTier = brocantesParTier(tier);
          return (
            <section
              key={tier}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <h2
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                  margin: 0,
                  paddingBottom: 6,
                  borderBottom: "1px solid var(--brass-700)",
                }}
              >
                <span style={{ color: "var(--brass-500)" }}>
                  {"★".repeat(tier)}
                </span>
                <span>
                  {tier === 1
                    ? "Brocantes de quartier"
                    : tier === 2
                      ? "Marchés réputés"
                      : tier === 3
                        ? "Salons et galeries"
                        : "Le Salon ultime"}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    color: "var(--brass-700)",
                  }}
                >
                  {debloqueesParTier.get(tier)!.size} / {brocantesTier.length} débloquées
                </span>
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 18,
                }}
              >
                {brocantesTier.map((b) => (
                  <BrocanteCard
                    key={b.id}
                    brocante={b}
                    debloquee={debloqueesParTier.get(tier)!.has(b.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
