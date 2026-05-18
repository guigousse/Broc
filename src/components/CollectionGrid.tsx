"use client";

import { useState } from "react";
import type { CollectionSlot, Objet } from "@/types/game";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { RareteBadge } from "@/components/ui/RareteBadge";
import { EtatBadge } from "@/components/ui/EtatBadge";
import { Button } from "@/components/ui/Button";

export interface CollectionGridProps {
  slots: CollectionSlot[];
  /** Objets de l'inventaire (utilisé pour proposer une donation). */
  inventaire: Objet[];
  /** Action : donner cet objet à la collection. */
  onDonner: (objetId: string) => void;
  /** Action : retirer la donation actuelle du slot. */
  onRetirer: (templateId: string) => void;
}

export function CollectionGrid({
  slots,
  inventaire,
  onDonner,
  onRetirer,
}: CollectionGridProps) {
  const [pickerForTemplate, setPickerForTemplate] = useState<string | null>(
    null,
  );

  if (slots.length === 0) {
    return (
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          color: "var(--ink-500)",
          textAlign: "center",
          padding: "24px 0",
          margin: 0,
        }}
      >
        Aucune pièce répertoriée dans cette catégorie.
      </p>
    );
  }

  const candidatsPourPicker = pickerForTemplate
    ? inventaire.filter(
        (o) => o.templateId === pickerForTemplate && !o.enRestauration,
      )
    : [];

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {slots.map((s) => (
          <SlotCard
            key={s.templateId}
            slot={s}
            inventaireMatch={inventaire.filter(
              (o) => o.templateId === s.templateId && !o.enRestauration,
            )}
            onOuvrirPicker={() => setPickerForTemplate(s.templateId)}
            onRetirer={() => onRetirer(s.templateId)}
          />
        ))}
      </div>
      {pickerForTemplate && (
        <DonationPicker
          templateId={pickerForTemplate}
          candidats={candidatsPourPicker}
          onSelect={(objetId) => {
            onDonner(objetId);
            setPickerForTemplate(null);
          }}
          onClose={() => setPickerForTemplate(null)}
        />
      )}
    </>
  );
}

function SlotCard({
  slot,
  inventaireMatch,
  onOuvrirPicker,
  onRetirer,
}: {
  slot: CollectionSlot;
  inventaireMatch: Objet[];
  onOuvrirPicker: () => void;
  onRetirer: () => void;
}) {
  const decouvert = slot.vu;
  const possedeUnJour = slot.dejaPossede;
  const donne = slot.donation !== null;
  const peutDonner = inventaireMatch.length > 0;

  const filtre = donne
    ? "none"
    : possedeUnJour
      ? "grayscale(1) opacity(0.7)"
      : decouvert
        ? "grayscale(1) opacity(0.55)"
        : "brightness(0) opacity(0.45)";

  return (
    <article
      style={{
        position: "relative",
        background: donne ? "var(--paper-200)" : "var(--paper-300)",
        border: `1px solid ${donne ? "var(--brass-500)" : "var(--paper-500)"}`,
        padding: 12,
        opacity: !decouvert && !possedeUnJour ? 0.75 : 1,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 3,
          border: "1px solid rgba(138,106,38,0.3)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          aspectRatio: "4 / 3",
          background:
            "linear-gradient(135deg, var(--paper-500) 0%, var(--brass-700) 100%)",
          border: "1px solid var(--brass-700)",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--brass-100)",
          filter: filtre,
        }}
      >
        <CategorieIcon categorie={slot.categorie} size={42} strokeWidth={1.25} />
      </div>

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: donne ? "var(--forest-800)" : "var(--ink-500)",
          lineHeight: 1.2,
          minHeight: 30,
        }}
      >
        {decouvert || possedeUnJour ? slot.nom : "???"}
      </div>

      <div
        style={{
          marginTop: 8,
          paddingTop: 7,
          borderTop: "1px dotted var(--paper-500)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {decouvert || possedeUnJour ? (
            <RareteBadge rarete={slot.rarete} />
          ) : (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.16em",
                color: "var(--ink-300)",
              }}
            >
              · ? ·
            </span>
          )}
          {donne && slot.donation && (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--forest-700)",
              }}
              title={`Valeur de la donation (état ${slot.donation.etat})`}
            >
              {slot.donation.valeur}
              <span style={{ fontSize: 10, color: "var(--brass-700)" }}>€</span>
            </span>
          )}
        </div>

        {donne && slot.donation && (
          <div
            style={{ display: "flex", justifyContent: "space-between", gap: 6 }}
          >
            <EtatBadge etat={slot.donation.etat} />
            <Button size="sm" variant="ghost" onClick={onRetirer}>
              Retirer
            </Button>
          </div>
        )}

        {!donne && (decouvert || possedeUnJour) && (
          <Button
            size="sm"
            variant={peutDonner ? "primary" : "secondary"}
            disabled={!peutDonner}
            onClick={onOuvrirPicker}
            title={
              peutDonner
                ? "Donner un objet de votre inventaire à la collection"
                : "Aucun objet correspondant dans votre inventaire"
            }
          >
            {peutDonner ? `Donner (${inventaireMatch.length})` : "Aucun en stock"}
          </Button>
        )}

        {!donne && !decouvert && !possedeUnJour && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-300)",
              fontStyle: "italic",
            }}
          >
            à découvrir
          </span>
        )}
      </div>
    </article>
  );
}

function DonationPicker({
  templateId,
  candidats,
  onSelect,
  onClose,
}: {
  templateId: string;
  candidats: Objet[];
  onSelect: (objetId: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,30,22,0.65)",
        display: "grid",
        placeItems: "center",
        padding: 20,
        zIndex: 60,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 500,
          width: "100%",
          background: "var(--paper-100)",
          border: "1px solid var(--brass-500)",
          padding: 20,
          boxShadow:
            "inset 0 0 0 4px var(--paper-100), inset 0 0 0 5px var(--brass-500), 0 24px 60px rgba(15,30,22,0.5)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          — choisir l'exemplaire à donner —
        </div>
        {candidats.length === 0 ? (
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--ink-500)",
              textAlign: "center",
              padding: "16px 0",
              margin: 0,
            }}
          >
            Aucun exemplaire en stock pour ce slot ({templateId}).
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "8px 0",
              maxHeight: 360,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {candidats.map((o) => (
              <li
                key={o.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: 10,
                  background: "var(--paper-300)",
                  border: "1px solid var(--brass-700)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                    }}
                  >
                    {o.nom}
                  </span>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <EtatBadge etat={o.etat} />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--brass-700)",
                      }}
                    >
                      valeur {o.prixReferenceReel} €
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="primary" onClick={() => onSelect(o.id)}>
                  Donner
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ textAlign: "right", marginTop: 10 }}>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
