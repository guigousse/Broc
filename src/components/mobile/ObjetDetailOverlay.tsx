"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { FrameItem } from "@/components/ui/FrameItem";
import { ItemImage } from "@/components/ui/ItemImage";
import { getTemplate } from "@/data/objetTemplates";
import type { Objet } from "@/types/game";

interface ObjetDetailOverlayProps {
  objet: Objet | null;
  open: boolean;
  onClose: () => void;
  prixMarche: number;
  /** Prix marché visible ? Vrai si compétence Connaisseur Vitrine débloquée pour cette catégorie. */
  prixMarcheConnu: boolean;
  onSetPrixVente: (objetId: string, prix: number) => void;
  onAjouterEtal: ((objet: Objet, prix: number) => void) | null;
  brocanteOuverteNom: string | null;
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

const CARD_WIDTH = "min(290px, 86vw)";

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

const prixCard: CSSProperties = {
  position: "relative",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-700), 0 10px 20px rgba(0,0,0,0.3)",
  padding: "20px 22px",
};

const prixRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  padding: "10px 0",
  borderBottom: "1px dotted var(--brass-500)",
};

const prixRowLast: CSSProperties = {
  ...prixRow,
  borderBottom: "none",
};

const prixLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};

const prixValue: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  color: "var(--forest-800)",
  fontWeight: 600,
};

const venteInput: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  color: "var(--forest-800)",
  fontWeight: 600,
  border: "none",
  borderBottom: "1px solid var(--brass-500)",
  background: "transparent",
  textAlign: "right",
  width: 64,
  outline: "none",
  padding: "2px 4px",
};

const stepBtn = (disabled: boolean): CSSProperties => ({
  width: 44,
  height: 44,
  minWidth: 44,
  display: "grid",
  placeItems: "center",
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  color: "var(--forest-800)",
  fontFamily: "var(--font-display)",
  fontSize: 20,
  fontWeight: 600,
  lineHeight: 1,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.45 : 1,
  padding: 0,
});

const restaurationBanner: CSSProperties = {
  padding: "8px 10px",
  background: "var(--paper-200)",
  border: "1px dotted var(--brass-700)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.12em",
  color: "var(--brass-700)",
  textAlign: "center",
  marginBottom: 12,
};

export function ObjetDetailOverlay({
  objet,
  open,
  onClose,
  prixMarche,
  prixMarcheConnu,
  onSetPrixVente,
}: ObjetDetailOverlayProps) {
  const [prixLocal, setPrixLocal] = useState<number>(0);

  useEffect(() => {
    if (!objet) return;
    const defaut =
      objet.prixVenteSouhaite ?? Math.max(1, Math.round(prixMarche * 1.4));
    setPrixLocal(defaut);
  }, [objet, prixMarche]);

  if (!open || !objet) return null;

  const commitPrix = () => {
    if (!objet) return;
    onSetPrixVente(objet.id, prixLocal);
  };

  const enRestauration = !!objet.enRestauration;

  const ajusterPrix = (delta: number) => {
    if (!objet || enRestauration) return;
    const next = Math.max(0, prixLocal + delta);
    setPrixLocal(next);
    onSetPrixVente(objet.id, next);
  };
  const isUnique = !!getTemplate(objet.templateId)?.unique;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Détail de l'objet"
      style={backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          commitPrix();
          onClose();
        }
      }}
    >
      <div style={card}>
        <div style={previewWrap}>
          <FrameItem
            categorie={objet.categorie}
            titre={objet.nom}
            rarete={objet.rarete}
            unique={isUnique}
            etat={objet.etat}
            size={CARD_WIDTH}
          >
            <ItemImage
              templateId={objet.templateId}
              categorie={objet.categorie}
              fit="cover"
              fallbackIconSize={100}
              fallbackIconColor="var(--brass-500)"
              alt={objet.nom}
            />
          </FrameItem>
        </div>

        <div style={prixCard}>
          {enRestauration && (
            <div style={restaurationBanner}>
              En restauration jusqu&apos;au jour {objet.enRestauration?.jourFin}
            </div>
          )}

          <div style={prixRow}>
            <span style={prixLabel}>Prix du marché</span>
            <span style={prixValue}>
              {prixMarcheConnu ? `${Math.round(prixMarche)} €` : "? €"}
            </span>
          </div>

          <div style={prixRow}>
            <span style={prixLabel}>Prix d&apos;achat</span>
            <span style={prixValue}>
              {objet.prixAchat !== undefined ? `${objet.prixAchat} €` : "— €"}
            </span>
          </div>

          <div
            style={{
              ...prixRowLast,
              flexDirection: "column",
              alignItems: "stretch",
              gap: 8,
            }}
          >
            <span style={prixLabel}>Prix de vente</span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => ajusterPrix(-5)}
                disabled={enRestauration}
                style={stepBtn(enRestauration)}
                aria-label="Diminuer le prix de vente de 5 €"
              >
                −
              </button>
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <input
                  type="number"
                  min={0}
                  value={prixLocal}
                  onChange={(e) => setPrixLocal(Number(e.target.value) || 0)}
                  onBlur={commitPrix}
                  style={venteInput}
                  disabled={enRestauration}
                  aria-label="Prix de vente"
                />
                <span style={prixValue}>€</span>
              </span>
              <button
                type="button"
                onClick={() => ajusterPrix(5)}
                disabled={enRestauration}
                style={stepBtn(enRestauration)}
                aria-label="Augmenter le prix de vente de 5 €"
              >
                +
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
