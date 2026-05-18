"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DecoDivider } from "@/components/ui/DecoDivider";

interface BossUnlockModalProps {
  onClose: () => void;
}

export function BossUnlockModal({ onClose }: BossUnlockModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(15, 30, 22, 0.85)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "var(--forest-800)",
          border: "2px solid var(--brass-500)",
          padding: "32px 28px",
          textAlign: "center",
          boxShadow:
            "0 0 0 6px rgba(0,0,0,0.4), 0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            marginBottom: 20,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Star
              key={i}
              size={24}
              fill="var(--brass-300)"
              color="var(--brass-500)"
              strokeWidth={1}
            />
          ))}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--brass-300)",
            marginBottom: 12,
          }}
        >
          — annonce officielle —
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--paper-100)",
            margin: "0 0 12px",
            lineHeight: 1.15,
          }}
        >
          Le Salon des Antiquaires
          <br />
          vous ouvre ses portes
        </h2>
        <DecoDivider />
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 16,
            color: "var(--paper-200)",
            margin: "18px 0 24px",
            lineHeight: 1.5,
          }}
        >
          Drouot vous a remarqué. Les pièces uniques de votre catalogue n'attendent
          plus que vous.
        </p>
        <Button variant="primary" size="lg" onClick={onClose}>
          Entrer dans la légende
        </Button>
      </div>
    </div>
  );
}
