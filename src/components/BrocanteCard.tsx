"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import type { Brocante, GameState } from "@/types/game";
import { coutEntree } from "@/data/brocantes";

interface BrocanteCardProps {
  brocante: Brocante;
  state: GameState;
  debloquee: boolean;
  raisonVerrou?: string;
  destination: "chiner" | "vitrine";
}

const cardStyle: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "10px 12px",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

export function BrocanteCard({
  brocante,
  state,
  debloquee,
  raisonVerrou,
  destination,
}: BrocanteCardProps) {
  const router = useRouter();
  const entree = coutEntree(brocante);
  return (
    <article style={{ ...cardStyle, opacity: debloquee ? 1 : 0.55 }}>
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
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
            fontWeight: 700,
          }}
        >
          {brocante.nom}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            color: "var(--brass-600)",
            letterSpacing: "0.06em",
          }}
        >
          {"★".repeat(brocante.tier)}
        </span>
      </div>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 12.5,
          color: "var(--ink-500)",
          margin: "4px 0 6px",
          lineHeight: 1.3,
        }}
      >
        {brocante.description}
      </p>
      {!debloquee && raisonVerrou && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            color: "var(--vermillion-600)",
            marginBottom: 6,
            letterSpacing: "0.06em",
          }}
        >
          ⊘ {raisonVerrou}
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--brass-700)",
            letterSpacing: "0.06em",
          }}
        >
          Entrée {entree} € · {brocante.taillePool} items
        </span>
        <button
          type="button"
          disabled={!debloquee || state.budget < entree}
          onClick={() => router.push(`/${destination}/${brocante.id}`)}
          style={{
            padding: "7px 12px",
            fontFamily: "var(--font-display)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            border: "1px solid var(--brass-500)",
            background: debloquee ? "var(--forest-800)" : "var(--paper-300)",
            color: debloquee ? "var(--brass-300)" : "var(--ink-500)",
            cursor: debloquee ? "pointer" : "not-allowed",
            opacity: !debloquee || state.budget < entree ? 0.6 : 1,
          }}
        >
          {debloquee ? "Entrer" : "Fermé"}
        </button>
      </div>
    </article>
  );
}
