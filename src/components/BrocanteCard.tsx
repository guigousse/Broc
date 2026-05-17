"use client";

import Link from "next/link";
import { useState } from "react";
import type { Brocante } from "@/types/game";
import { descriptionCondition } from "@/lib/deblocage";

interface BrocanteCardProps {
  brocante: Brocante;
  debloquee: boolean;
}

export function BrocanteCard({ brocante, debloquee }: BrocanteCardProps) {
  const [hover, setHover] = useState(false);

  const content = (
    <article
      onMouseEnter={() => debloquee && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        background: "var(--paper-100)",
        backgroundImage: "url(/assets/paper-grain.svg)",
        backgroundSize: "320px 320px",
        border: "1px solid var(--brass-500)",
        padding: 20,
        boxShadow: hover
          ? "0 4px 0 var(--paper-400), 0 10px 20px rgba(40,25,5,0.18), inset 0 0 0 4px var(--paper-100), inset 0 0 0 5px var(--brass-500)"
          : "0 2px 0 var(--paper-400), 0 6px 14px rgba(40,25,5,0.10), inset 0 0 0 4px var(--paper-100), inset 0 0 0 5px var(--brass-500)",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: "all 220ms cubic-bezier(0.85, 0, 0.15, 1)",
        opacity: debloquee ? 1 : 0.55,
        cursor: debloquee ? "pointer" : "not-allowed",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {brocante.nom}
        </h3>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
            whiteSpace: "nowrap",
          }}
        >
          {brocante.ambiance}
        </span>
      </header>

      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 14,
          color: "var(--ink-500)",
          lineHeight: 1.45,
          margin: 0,
          flex: 1,
        }}
      >
        {brocante.description}
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          paddingTop: 10,
          borderTop: "1px dotted var(--paper-500)",
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          letterSpacing: "0.06em",
        }}
      >
        <span style={{ color: "var(--ink-500)" }}>
          ~{brocante.taillePool} obj.
        </span>
        <span
          style={{
            color: debloquee ? "var(--forest-700)" : "var(--brass-700)",
            fontStyle: debloquee ? "normal" : "italic",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
          }}
        >
          {debloquee
            ? "— ouvert —"
            : descriptionCondition(brocante.conditionDeblocage)}
        </span>
      </div>
    </article>
  );

  if (!debloquee) return <div aria-disabled>{content}</div>;

  return (
    <Link
      href={`/chiner/${brocante.id}`}
      style={{ display: "block", textDecoration: "none", color: "inherit", height: "100%" }}
    >
      {content}
    </Link>
  );
}
