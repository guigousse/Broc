"use client";

import type { CSSProperties } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { BrassCorners } from "@/components/ui/BrassCorners";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import type { CollectionSlot } from "@/types/game";

interface CollectionDetailOverlayProps {
  open: boolean;
  onClose: () => void;
  slot: CollectionSlot | null;
  /** Nombre d'objets éligibles dans l'inventaire pour ce slot. */
  candidatsCount: number;
  /** Si vrai, bouton Retirer désactivé (stockage plein). */
  retirerDisabled?: boolean;
  /** Appelé lorsqu'on demande à ajouter une donation (ouvre le picker). */
  onAjouter: () => void;
  /** Appelé lorsqu'on demande à retirer la donation. */
  onRetirer: () => void;
}

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 105,
  background: "rgba(15,31,24,0.82)",
  display: "grid",
  placeItems: "center",
  padding: "20px",
};

const card: CSSProperties = {
  width: "min(300px, 88vw)",
  maxWidth: "100%",
  position: "relative",
  display: "grid",
  gap: 14,
};

/** Bandeau titre : fond vert, coins Art Déco laiton, police lisible de l'app. */
const titleBar: CSSProperties = {
  position: "relative",
  background: "var(--forest-800)",
  border: "1px solid var(--brass-500)",
  padding: "12px 28px",
  textAlign: "center",
};

const titleText: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 16,
  letterSpacing: "0.04em",
  color: "var(--brass-300)",
  lineHeight: 1.2,
};

/** Cadre de l'item : fond bois (comme la collection) + coins Art Déco laiton. */
const itemFrame: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "1 / 1",
  background: "var(--wood-light)",
  border: "1.5px solid var(--brass-500)",
  boxShadow:
    "0 10px 20px rgba(0,0,0,0.3), inset 0 0 22px rgba(40,25,5,0.18)",
  display: "grid",
  placeItems: "center",
  padding: "16%",
  boxSizing: "border-box",
};

const actionCard: CSSProperties = {
  position: "relative",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-700), 0 10px 20px rgba(0,0,0,0.3)",
  padding: "16px 22px",
  display: "grid",
  gap: 10,
};

const infoLine: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.06em",
  color: "var(--forest-800)",
  textAlign: "center",
};

const btnBase: CSSProperties = {
  width: "100%",
  padding: "14px 12px",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
};

const noteText: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  color: "var(--brass-700)",
  textAlign: "center",
};

export function CollectionDetailOverlay({
  open,
  onClose,
  slot,
  candidatsCount,
  retirerDisabled = false,
  onAjouter,
  onRetirer,
}: CollectionDetailOverlayProps) {
  const { d, tr } = useLangue();
  if (!open || !slot) return null;
  const isDonne = slot.donation !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={d.inventaire.detailPiece}
      style={backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={card}>
        {/* 1. Bandeau titre */}
        <div style={titleBar}>
          <BrassCorners inset={5} size={16} color="var(--brass-500)" />
          <span style={titleText}>{slot.nom}</span>
        </div>

        {/* 2. Cadre item (fond bois) — sticker grisé si non possédé */}
        <div style={itemFrame}>
          <BrassCorners inset={6} size={22} color="var(--brass-500)" />
          <ItemSticker
            templateId={slot.templateId}
            categorie={slot.categorie}
            fill
            tilt={false}
            variant={isDonne ? "normal" : "grise"}
          />
        </div>

        {/* 3. Encadré info + action */}
        <div style={actionCard}>
          {isDonne ? (
            <>
              <div style={infoLine}>
                {tr(d.chine.etatAriaLabel, {
                  etat: slot.donation ? libelleEtat(slot.donation.etat, d) : "",
                })}
              </div>
              <div style={infoLine}>
                {tr(d.inventaire.valeurLigne, {
                  n: Math.round(slot.donation?.valeur ?? 0),
                })}
              </div>
              <button
                type="button"
                onClick={retirerDisabled ? undefined : onRetirer}
                disabled={retirerDisabled}
                style={{
                  ...btnBase,
                  background: retirerDisabled
                    ? "var(--paper-200)"
                    : "var(--paper-100)",
                  color: retirerDisabled
                    ? "var(--ink-500)"
                    : "var(--vermillion-600)",
                  borderColor: retirerDisabled
                    ? "var(--brass-500)"
                    : "var(--vermillion-600)",
                  cursor: retirerDisabled ? "not-allowed" : "pointer",
                  opacity: retirerDisabled ? 0.55 : 1,
                }}
              >
                <Trash2 size={16} strokeWidth={1.6} />
                {retirerDisabled
                  ? d.qg.stockagePlein
                  : d.inventaire.retirerDeCollection}
              </button>
            </>
          ) : (
            <>
              <div style={noteText}>
                {candidatsCount === 0
                  ? d.inventaire.aucunCandidatPiece
                  : tr(
                      candidatsCount > 1
                        ? d.inventaire.candidatsPiecePluriel
                        : d.inventaire.candidatsPieceUn,
                      { n: candidatsCount },
                    )}
              </div>
              <button
                type="button"
                onClick={candidatsCount === 0 ? undefined : onAjouter}
                disabled={candidatsCount === 0}
                style={{
                  ...btnBase,
                  background:
                    candidatsCount === 0
                      ? "var(--paper-200)"
                      : "var(--forest-800)",
                  color:
                    candidatsCount === 0
                      ? "var(--ink-500)"
                      : "var(--brass-300)",
                  cursor: candidatsCount === 0 ? "not-allowed" : "pointer",
                  opacity: candidatsCount === 0 ? 0.55 : 1,
                }}
              >
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <BookOpen size={16} strokeWidth={1.6} />
                  <Plus size={12} strokeWidth={2} />
                </span>
                {d.inventaire.ajouterALaCollection}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
