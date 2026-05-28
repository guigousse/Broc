"use client";

import type { CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
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

const thumbStyle: CSSProperties = {
  width: 44,
  height: 44,
  background:
    "linear-gradient(135deg, var(--paper-500) 0%, var(--brass-700) 100%)",
  border: "1px solid var(--brass-700)",
  display: "grid",
  placeItems: "center",
  color: "var(--brass-100)",
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
                padding: "6px 10px",
                fontFamily: "var(--font-display)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                border: "1px solid var(--vermillion-600)",
                background: "var(--paper-100)",
                color: "var(--vermillion-600)",
                cursor: retirerDisabled ? "not-allowed" : "pointer",
                opacity: retirerDisabled ? 0.45 : 1,
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
        candidats.map((o) => (
          <div key={o.id} style={itemStyle}>
            <div style={thumbStyle}>
              <CategorieIcon
                categorie={o.categorie}
                size={20}
                strokeWidth={1.5}
                color="var(--brass-100)"
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
                  fontSize: 9.5,
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
                padding: "6px 10px",
                fontFamily: "var(--font-display)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                border: "1px solid var(--brass-500)",
                background: "var(--forest-800)",
                color: "var(--brass-300)",
                cursor: "pointer",
              }}
            >
              Donner
            </button>
          </div>
        ))
      )}
    </BottomSheet>
  );
}
