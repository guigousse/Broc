import { useState } from "react";
import type { NiveauCamion } from "@/types/game";
import { getCamion, getProchainCamion } from "@/data/camion";
import { CamionIcon } from "./CamionIcon";

interface Props {
  niveau: NiveauCamion;
  placesUtilisees: number;
  budget: number;
  onUpgrade: (niveau: NiveauCamion) => void;
}

export function ChargementHeader({ niveau, placesUtilisees, budget, onUpgrade }: Props) {
  const camion = getCamion(niveau);
  const prochain = getProchainCamion(niveau);
  const pct = Math.min(100, (placesUtilisees / camion.capacitePlaces) * 100);
  const peutUpgrade = !!prochain && budget >= (prochain.prixUpgradeVersCeNiveau ?? 0);
  const [confirm, setConfirm] = useState<boolean>(false);

  return (
    <div
      style={{
        background: "var(--paper-200)",
        borderBottom: "1px solid var(--brass-500)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <CamionIcon niveau={niveau} size={42} />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          Chargement — {camion.nom}
        </div>
        <div
          style={{
            height: 8,
            background: "var(--paper-300)",
            border: "1px solid var(--brass-500)",
            margin: "3px 0 2px",
          }}
        >
          <div style={{ height: "100%", background: "var(--forest-800)", width: `${pct}%` }} />
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            color: "var(--forest-800)",
            fontWeight: 700,
          }}
        >
          {placesUtilisees} / {camion.capacitePlaces} places
        </div>
      </div>
      {prochain && (
        <button
          type="button"
          disabled={!peutUpgrade}
          onClick={() => (confirm ? onUpgrade(prochain.niveau) : setConfirm(true))}
          style={{
            padding: "6px 10px",
            border: "1px solid var(--brass-700)",
            background: peutUpgrade ? "var(--brass-500)" : "var(--paper-300)",
            color: peutUpgrade ? "#fff" : "var(--ink-500)",
            fontFamily: "var(--font-display)",
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: peutUpgrade ? "pointer" : "not-allowed",
            lineHeight: 1.3,
          }}
        >
          {confirm ? `Confirmer · ${prochain.prixUpgradeVersCeNiveau} €` : `↑ ${prochain.nom} · ${prochain.prixUpgradeVersCeNiveau} €`}
        </button>
      )}
    </div>
  );
}
