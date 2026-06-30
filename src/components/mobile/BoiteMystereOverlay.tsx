"use client";

import { useState, type CSSProperties } from "react";
import { Gift, X } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { useToast } from "@/components/ui/Toast";
import { getAdProvider } from "@/lib/ads/adProvider";
import {
  tirerContenuBoite,
  VENDEUR_MYSTERE_ILLUSTRATION,
} from "@/lib/boiteMystere";
import { stockageEstPlein } from "@/lib/stockage";
import { ItemCard } from "@/components/ui/ItemCard";
import type { Brocante, Objet } from "@/types/game";

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
  maxWidth: 340,
  background: "var(--forest-800)",
  border: "3px solid var(--brass-500)",
  borderRadius: 14,
  padding: "18px 16px",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  position: "relative",
  textAlign: "center",
};

const boutonStyle = (disabled: boolean): CSSProperties => ({
  width: "100%",
  padding: "12px",
  borderRadius: 10,
  border: "2px solid var(--brass-500)",
  background: disabled ? "var(--forest-700)" : "var(--brass-500)",
  color: disabled ? "var(--brass-700)" : "var(--forest-900)",
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
});

export function BoiteMystereOverlay({
  brocante,
  onClose,
  onClaimed,
}: {
  brocante: Brocante;
  onClose: () => void;
  onClaimed: () => void;
}) {
  const { state, reclamerBoiteMystere } = useGame();
  const { toast } = useToast();
  const [enCours, setEnCours] = useState(false);
  const [objet, setObjet] = useState<Objet | null>(null);

  if (!state) return null;

  const ouvrir = async () => {
    if (enCours || objet) return;
    // Ne jamais gâcher une pub : si le stock est plein, on bloque avant.
    if (stockageEstPlein(state)) {
      toast("Stockage plein — fais de la place avant d'ouvrir la boîte.", {
        type: "info",
      });
      return;
    }
    setEnCours(true);
    try {
      const { rewarded } = await getAdProvider().showRewardedAd();
      if (!rewarded) return; // pub non terminée : la boîte reste ouvrable
      const gagne = tirerContenuBoite(brocante);
      reclamerBoiteMystere(gagne);
      setObjet(gagne);
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

        {objet ? (
          <>
            <h2 style={{ fontSize: 18, margin: "4px 0 12px" }}>
              Tu as trouvé&nbsp;:
            </h2>
            <div style={{ maxWidth: 180, margin: "0 auto 14px" }}>
              <ItemCard
                templateId={objet.templateId}
                categorie={objet.categorie}
                etat={objet.etat}
                rarete={objet.rarete}
                nom={objet.nom}
              />
            </div>
            <p style={{ fontSize: 12, color: "var(--brass-200)", margin: "0 0 14px" }}>
              Ajouté à ton stock.
            </p>
            <button onClick={onClaimed} style={boutonStyle(false)}>
              Parfait !
            </button>
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={VENDEUR_MYSTERE_ILLUSTRATION}
              alt="Vendeur mystère"
              style={{
                width: 140,
                height: "auto",
                margin: "0 auto 10px",
                display: "block",
                borderRadius: 10,
              }}
            />
            <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>Vendeur mystère</h2>
            <p style={{ fontSize: 13, color: "var(--brass-200)", margin: "0 0 16px" }}>
              Une boîte scellée… personne ne sait ce qu'elle cache. Regarde une
              pub pour l'ouvrir.
            </p>
            <button
              onClick={ouvrir}
              disabled={enCours}
              style={boutonStyle(enCours)}
            >
              <Gift size={16} />
              {enCours ? "Ouverture…" : "Regarder une pub pour ouvrir"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
