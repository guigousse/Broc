"use client";

import { FloatingActionBar } from "@/components/mobile/qg/FloatingActionBar";
import { FloatingActionButton } from "@/components/mobile/qg/FloatingActionButton";

interface PorteSheetProps {
  open: boolean;
  onClose: () => void;
  vitrineActive: boolean;
  onChiner: () => void;
  onVitrine: () => void;
  /** Si vrai, le chinage est bloqué (stockage plein) : bouton grisé + avertissement. */
  chinerDesactive?: boolean;
}

export function PorteSheet({
  open,
  onClose,
  onChiner,
  onVitrine,
  chinerDesactive = false,
}: PorteSheetProps) {
  return (
    <FloatingActionBar open={open} onClose={onClose}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        {chinerDesactive && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--vermillion-500)",
              whiteSpace: "nowrap",
            }}
          >
            Stockage plein
          </span>
        )}
        <FloatingActionButton
          onClick={onChiner}
          disabled={chinerDesactive}
          minWidth={140}
        >
          Chiner
        </FloatingActionButton>
      </div>
      <FloatingActionButton
        onClick={onVitrine}
        variant="secondary"
        minWidth={140}
      >
        Étaler
      </FloatingActionButton>
    </FloatingActionBar>
  );
}
