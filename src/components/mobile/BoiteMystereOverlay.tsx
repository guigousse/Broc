"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Gift, X } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { useToast } from "@/components/ui/Toast";
import { getAdProvider } from "@/lib/ads/adProvider";
import { audioManager } from "@/lib/audio/audioManager";
import {
  tirerContenuBoite,
  BOITE_MYSTERE_IMAGE,
  BOITE_MYSTERE_OUVERTE_IMAGE,
} from "@/lib/boiteMystere";
import { stockageEstPlein } from "@/lib/stockage";
import { ItemCard } from "@/components/ui/ItemCard";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";
import type { Brocante, Objet } from "@/types/game";

const VIBRATION_MS = 1500;
const ECLOSION_MS = 1000;

type Phase = "sealed" | "vibration" | "eclosion" | "reveal";

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

const sceneStyle: CSSProperties = {
  position: "relative",
  height: 210,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 8,
};

const auraStyle: CSSProperties = {
  position: "absolute",
  width: 230,
  height: 230,
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(255,214,120,0.65) 0%, rgba(255,190,80,0.22) 45%, rgba(255,190,80,0) 70%)",
  filter: "blur(3px)",
  pointerEvents: "none",
};

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
  const { d, locale } = useLangue();
  const [enCours, setEnCours] = useState(false);
  const [phase, setPhase] = useState<Phase>("sealed");
  const [objet, setObjet] = useState<Objet | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
    },
    [],
  );

  if (!state) return null;

  const ouvrir = async () => {
    if (enCours || phase !== "sealed") return;
    // Ne jamais gâcher une pub : si le stock est plein, on bloque avant.
    if (stockageEstPlein(state)) {
      toast(d.sheets.toastStockagePlein, {
        type: "info",
      });
      return;
    }
    setEnCours(true);
    try {
      const { rewarded } = await getAdProvider().showRewardedAd();
      if (!rewarded) return; // pub non terminée : la boîte reste ouvrable
      const gagne = tirerContenuBoite(brocante);
      if (!reclamerBoiteMystere(gagne)) {
        toast(d.sheets.toastStockagePlein, {
          type: "info",
        });
        return;
      }
      setObjet(gagne);
      // Séquence : secousse (fermée) → apogée/éclosion (ouverte + item) → révélation.
      setPhase("vibration");
      timersRef.current.push(
        setTimeout(() => {
          setPhase("eclosion");
          audioManager.playCash();
        }, VIBRATION_MS),
        setTimeout(() => setPhase("reveal"), VIBRATION_MS + ECLOSION_MS),
      );
    } catch {
      toast(d.sheets.erreurPub, { type: "erreur" });
    } finally {
      setEnCours(false);
    }
  };

  const enAnimation = phase === "vibration" || phase === "eclosion";

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label={d.commun.fermer}
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

        {phase === "reveal" && objet ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BOITE_MYSTERE_OUVERTE_IMAGE}
              alt={d.sheets.boiteMystereOuverteAlt}
              style={{ width: 150, height: "auto", margin: "0 auto 6px", display: "block" }}
            />
            <h2 style={{ fontSize: 18, margin: "4px 0 12px" }}>
              {d.sheets.tuAsTrouve}
            </h2>
            <div style={{ maxWidth: 180, margin: "0 auto 14px" }}>
              <ItemCard
                templateId={objet.templateId}
                categorie={objet.categorie}
                etat={objet.etat}
                rarete={objet.rarete}
                nom={nomObjet(objet, locale)}
              />
            </div>
            <p style={{ fontSize: 12, color: "var(--brass-200)", margin: "0 0 14px" }}>
              {d.sheets.ajouteAuStock}
            </p>
            <button onClick={onClaimed} style={boutonStyle(false)}>
              {d.sheets.parfait}
            </button>
          </>
        ) : enAnimation ? (
          <>
            <div style={sceneStyle}>
              {/* Aura qui émane autour de la boîte. */}
              <div
                style={{
                  ...auraStyle,
                  animation:
                    phase === "vibration"
                      ? `boite-aura ${VIBRATION_MS}ms ease-in forwards`
                      : "boite-aura-pulse 900ms ease-in-out infinite",
                }}
              />
              {/* Flash à l'apogée (ouverture). */}
              {phase === "eclosion" && (
                <div
                  style={{
                    position: "absolute",
                    width: 270,
                    height: 270,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(255,246,224,0.95) 0%, rgba(255,224,150,0) 65%)",
                    animation: "boite-flash 700ms ease-out forwards",
                    pointerEvents: "none",
                  }}
                />
              )}
              {/* La boîte : fermée qui vibre, puis ouverte. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  phase === "vibration"
                    ? BOITE_MYSTERE_IMAGE
                    : BOITE_MYSTERE_OUVERTE_IMAGE
                }
                alt={d.sheets.boiteMystereTitre}
                style={{
                  width: 180,
                  height: "auto",
                  display: "block",
                  position: "relative",
                  zIndex: 1,
                  animation:
                    phase === "vibration"
                      ? `boite-secousse ${VIBRATION_MS}ms cubic-bezier(0.36,0,0.66,1) forwards`
                      : undefined,
                }}
              />
              {/* L'item sort de l'ouverture en grossissant. */}
              {phase === "eclosion" && objet && (
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    width: 122,
                    height: 122,
                    zIndex: 2,
                    animation: "item-sort-boite 1s ease-out forwards",
                    pointerEvents: "none",
                  }}
                >
                  <ItemSticker
                    templateId={objet.templateId}
                    categorie={objet.categorie}
                    fill
                    tilt={false}
                    eager
                    outlinePx={2.5}
                  />
                </div>
              )}
            </div>
            <p style={{ fontSize: 13, color: "var(--brass-200)", margin: 0 }}>
              {phase === "vibration" ? d.sheets.boiteSouvre : "✨"}
            </p>
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BOITE_MYSTERE_IMAGE}
              alt={d.sheets.boiteMystereTitre}
              style={{
                width: 170,
                height: "auto",
                margin: "0 auto 10px",
                display: "block",
              }}
            />
            <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>
              {d.sheets.boiteMystereTitre}
            </h2>
            <p style={{ fontSize: 13, color: "var(--brass-200)", margin: "0 0 16px" }}>
              {d.sheets.boiteDescription}
            </p>
            <button
              onClick={ouvrir}
              disabled={enCours}
              style={boutonStyle(enCours)}
            >
              <Gift size={16} />
              {enCours ? d.sheets.ouverture : d.sheets.regarderPubPourOuvrir}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
