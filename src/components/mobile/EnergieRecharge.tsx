"use client";

import { Zap, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useGame, useGameActions } from "@/context/GameContext";
import {
  ENERGIE_MAX,
  energieCourante,
  secondesAvantProchaine,
} from "@/lib/energie";
import { getAdProvider } from "@/lib/ads/adProvider";

function formatMMSS(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 320,
  background: "var(--forest-800)",
  border: "3px solid var(--brass-500)",
  borderRadius: 14,
  padding: "18px 16px",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  position: "relative",
};

export function EnergieRecharge({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const { tempsConfiance, crediterEnergiePub } = useGameActions();
  const [enCours, setEnCours] = useState(false);
  const [, force] = useState(0);

  // Tick local 1 s pour le minuteur (sans réécrire le state global).
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!state) return null;
  const now = tempsConfiance() ?? Date.now();
  const energie = energieCourante(state, now);
  const restantSec = secondesAvantProchaine(state, now);
  const pubIndisponible = enCours;

  const regarderPub = async () => {
    if (pubIndisponible) return;
    setEnCours(true);
    try {
      const { rewarded } = await getAdProvider().showRewardedAd();
      if (rewarded) crediterEnergiePub();
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "transparent",
            border: "none",
            color: "var(--brass-700)",
            cursor: "pointer",
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Zap size={22} strokeWidth={2.5} />
          <strong style={{ fontSize: 22 }}>
            {energie}
            <span style={{ color: "var(--brass-700)" }}>/{ENERGIE_MAX}</span>
          </strong>
        </div>

        <p style={{ fontSize: 13, color: "var(--brass-200)", margin: "0 0 14px" }}>
          {restantSec === null
            ? "Énergie au maximum."
            : `Prochaine ⚡ dans ${formatMMSS(restantSec)}`}
        </p>

        <button
          onClick={regarderPub}
          disabled={pubIndisponible}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            border: "2px solid var(--brass-500)",
            background: pubIndisponible ? "var(--forest-700)" : "var(--brass-500)",
            color: pubIndisponible ? "var(--brass-700)" : "var(--forest-900)",
            fontWeight: 700,
            cursor: pubIndisponible ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Zap size={16} />
          {enCours ? "Pub en cours…" : "Regarder une pub — +1 ⚡"}
        </button>
      </div>
    </div>
  );
}
