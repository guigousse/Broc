"use client";

import type { CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { ItemImage } from "@/components/ui/ItemImage";
import { getRarityColors } from "@/lib/rarityColors";
import { getTemplate } from "@/data/objetTemplates";
import type { CollectionSlot, Objet } from "@/types/game";

interface DonationPickerSheetProps {
  open: boolean;
  onClose: () => void;
  slot: CollectionSlot | null;
  candidats: Objet[];
  onDonner: (objetId: string) => void;
  onRetirer?: () => void;
  /** Si true, bouton "Retirer" grisé avec libellé "Stockage plein". */
  retirerDisabled?: boolean;
}

const itemStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px 1fr auto",
  gap: 10,
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px dotted var(--paper-500)",
};

const thumbBase: CSSProperties = {
  width: 44,
  height: 44,
  overflow: "hidden",
};

export function DonationPickerSheet({
  open,
  onClose,
  slot,
  candidats,
  onDonner,
  onRetirer,
  retirerDisabled = false,
}: DonationPickerSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={slot ? slot.nom : "Donation"}
    >
      {slot?.donation && (
        <div
          style={{
            border: "1px solid var(--forest-800)",
            background: "var(--brass-100)",
            padding: "10px 12px",
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--ink-700)",
            }}
          >
            Slot rempli — valeur {Math.round(slot.donation.valeur)} €
          </span>
          {onRetirer && (
            <button
              type="button"
              onClick={retirerDisabled ? undefined : onRetirer}
              disabled={retirerDisabled}
              style={{
                padding: "8px 12px",
                minHeight: 40,
                fontFamily: "var(--font-display)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                border: "1px solid var(--vermillion-600)",
                borderRadius: "var(--radius-btn)",
                background: "var(--paper-100)",
                color: "var(--vermillion-600)",
                cursor: retirerDisabled ? "not-allowed" : "pointer",
                opacity: retirerDisabled ? 0.45 : 1,
                filter: retirerDisabled ? "grayscale(0.65)" : undefined,
              }}
            >
              {retirerDisabled ? "Stockage plein" : "Retirer"}
            </button>
          )}
        </div>
      )}

      {candidats.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            color: "var(--ink-500)",
            textAlign: "center",
            padding: "16px 0",
          }}
        >
          Aucun objet éligible dans le stock pour cet emplacement.
        </p>
      ) : (
        candidats.map((o) => {
          const c = getRarityColors(
            o.rarete,
            !!getTemplate(o.templateId)?.unique,
          );
          return (
          <div key={o.id} style={itemStyle}>
            <div
              style={{
                ...thumbBase,
                background: c.thumbBg,
                border: `1px solid ${c.outer}`,
              }}
            >
              <ItemImage
                templateId={o.templateId}
                categorie={o.categorie}
                fit="cover"
                fallbackIconSize={20}
                fallbackIconColor={c.thumbIcon}
                alt={o.nom}
              />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                  fontWeight: 700,
                }}
              >
                {o.nom}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  color: "var(--ink-500)",
                }}
              >
                {o.etat} · {o.rarete} · {Math.round(o.prixReferenceReel)} €
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDonner(o.id)}
              style={{
                padding: "8px 14px",
                minHeight: 40,
                fontFamily: "var(--font-display)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                border: "1px solid var(--brass-500)",
                borderRadius: "var(--radius-btn)",
                background: "var(--forest-800)",
                color: "var(--brass-300)",
                cursor: "pointer",
              }}
            >
              Donner
            </button>
          </div>
          );
        })
      )}
    </BottomSheet>
  );
}
