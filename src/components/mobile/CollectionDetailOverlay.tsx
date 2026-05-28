"use client";

import type { CSSProperties } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { FrameItem } from "@/components/ui/FrameItem";
import { ItemImage } from "@/components/ui/ItemImage";
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

const CARD_WIDTH = 290;

const card: CSSProperties = {
  width: CARD_WIDTH,
  maxWidth: "100%",
  position: "relative",
  background: "transparent",
};

const previewWrap: CSSProperties = {
  display: "grid",
  placeItems: "center",
  marginBottom: 40,
  position: "relative",
};

const actionCard: CSSProperties = {
  position: "relative",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-700), 0 10px 20px rgba(0,0,0,0.3)",
  padding: "18px 22px",
  display: "grid",
  gap: 10,
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
  if (!open || !slot) return null;
  const isDonne = slot.donation !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Détail de la pièce"
      style={backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={card}>
        <div style={previewWrap}>
          <FrameItem
            categorie={slot.categorie}
            titre={slot.nom}
            rarete={slot.rarete}
            unique={!!slot.unique}
            etat={slot.donation?.etat}
            size={CARD_WIDTH}
          >
            <ItemImage
              templateId={slot.templateId}
              categorie={slot.categorie}
              fit="cover"
              fallbackIconSize={100}
              fallbackIconColor="var(--brass-500)"
              alt={slot.nom}
            />
          </FrameItem>
        </div>

        <div style={actionCard}>
          {isDonne ? (
            <>
              <div style={noteText}>
                Donation : {slot.donation?.etat} ·{" "}
                {Math.round(slot.donation?.valeur ?? 0)} €
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
                  ? "Stockage plein"
                  : "Retirer de la collection"}
              </button>
            </>
          ) : (
            <>
              {candidatsCount === 0 ? (
                <div style={noteText}>
                  Aucun objet éligible dans le stock pour cette pièce.
                </div>
              ) : (
                <div style={noteText}>
                  {candidatsCount} objet{candidatsCount > 1 ? "s" : ""} dans le
                  stock pour cette pièce.
                </div>
              )}
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
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <BookOpen size={16} strokeWidth={1.6} />
                  <Plus size={12} strokeWidth={2} />
                </span>
                Ajouter à la collection
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
