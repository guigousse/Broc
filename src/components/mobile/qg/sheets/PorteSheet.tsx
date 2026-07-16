"use client";

import { FloatingActionBar } from "@/components/mobile/qg/FloatingActionBar";
import { FloatingActionButton } from "@/components/mobile/qg/FloatingActionButton";
import { useLangue } from "@/lib/i18n/LangueContext";

interface PorteSheetProps {
  open: boolean;
  onClose: () => void;
  vitrineActive: boolean;
  onChiner: () => void;
  onVitrine: () => void;
  /** Si vrai, le chinage est bloqué (stockage plein) : bouton grisé + avertissement. */
  chinerDesactive?: boolean;
  /** Tutoriel : force le choix Chiner (pulse) et désactive Étaler. */
  tutoChiner?: boolean;
  /** Tutoriel : force le choix Étaler (pulse) et désactive Chiner. */
  tutoEtaler?: boolean;
}

export function PorteSheet({
  open,
  onClose,
  onChiner,
  onVitrine,
  chinerDesactive = false,
  tutoChiner = false,
  tutoEtaler = false,
}: PorteSheetProps) {
  const { d } = useLangue();
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
            {d.qg.stockagePlein}
          </span>
        )}
        <span
          className={tutoChiner ? "tuto-pulse" : undefined}
          style={{ display: "inline-block", borderRadius: 12 }}
        >
          <FloatingActionButton
            onClick={onChiner}
            disabled={chinerDesactive || tutoEtaler}
            minWidth={140}
          >
            {d.qg.chiner}
          </FloatingActionButton>
        </span>
      </div>
      <span
        className={tutoEtaler ? "tuto-pulse" : undefined}
        style={{ display: "inline-block", borderRadius: 12 }}
      >
        <FloatingActionButton
          onClick={onVitrine}
          variant="secondary"
          disabled={tutoChiner}
          minWidth={140}
        >
          {d.qg.etaler}
        </FloatingActionButton>
      </span>
    </FloatingActionBar>
  );
}
