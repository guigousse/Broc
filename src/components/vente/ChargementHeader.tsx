import { useEffect, useState } from "react";
import type { NiveauCamion } from "@/types/game";
import { CAMIONS, getCamion, getProchainCamion } from "@/data/camion";
import { CamionIcon } from "./CamionIcon";

// Dev only — set à false pour cacher le bouton de switch des coffres.
const DEV_COFFRE_SWITCH = true;

interface Props {
  niveau: NiveauCamion;
  nbObjets: number;
  budget: number;
  onUpgrade: (niveau: NiveauCamion) => void;
  onSetNiveauDev?: (niveau: NiveauCamion) => void;
}

export function ChargementHeader({
  niveau,
  nbObjets,
  budget,
  onUpgrade,
  onSetNiveauDev,
}: Props) {
  const camion = getCamion(niveau);
  const prochain = getProchainCamion(niveau);
  const peutUpgrade = !!prochain && budget >= (prochain.prixUpgradeVersCeNiveau ?? 0);
  const [confirm, setConfirm] = useState<boolean>(false);

  // Reset l'état "Confirmer" si le niveau change (après upgrade).
  useEffect(() => {
    setConfirm(false);
  }, [niveau]);

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
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          Chargement — {camion.nom}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 13,
            color: "var(--forest-800)",
            fontWeight: 700,
            marginTop: 2,
          }}
        >
          {nbObjets} objet{nbObjets > 1 ? "s" : ""} chargé{nbObjets > 1 ? "s" : ""}
        </div>
      </div>
      {DEV_COFFRE_SWITCH && onSetNiveauDev && (
        <button
          type="button"
          onClick={() => {
            const next = (((niveau - 1) + 1) % CAMIONS.length) + 1;
            onSetNiveauDev(next as NiveauCamion);
          }}
          aria-label="Dev: cycle camion level"
          style={{
            padding: "6px 8px",
            border: "1px dashed var(--vermillion-600)",
            background: "var(--paper-100)",
            color: "var(--vermillion-600)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            lineHeight: 1.2,
            marginRight: 4,
          }}
        >
          DEV
          <br />
          N{niveau}
        </button>
      )}
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
            fontSize: 10,
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
