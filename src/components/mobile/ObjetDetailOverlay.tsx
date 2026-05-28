"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Store, X } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import type { Objet } from "@/types/game";

interface ObjetDetailOverlayProps {
  objet: Objet | null;
  open: boolean;
  onClose: () => void;
  prixMarche: number;
  onSetPrixVente: (objetId: string, prix: number) => void;
  onAjouterEtal: ((objet: Objet, prix: number) => void) | null;
  brocanteOuverteNom: string | null;
}

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 105,
  background: "rgba(15,31,24,0.78)",
  display: "grid",
  placeItems: "center",
  padding: "20px",
};

const card: CSSProperties = {
  maxWidth: 380,
  width: "100%",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
  padding: "16px",
  maxHeight: "90vh",
  overflowY: "auto",
};

const topBar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  fontWeight: 700,
  flex: 1,
};

const closeBtn: CSSProperties = {
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-700)",
  padding: 4,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

const previewWrap: CSSProperties = {
  width: 120,
  height: 120,
  margin: "8px auto 12px",
  background:
    "linear-gradient(135deg, var(--paper-500) 0%, var(--brass-700) 100%)",
  border: "1px solid var(--brass-700)",
  display: "grid",
  placeItems: "center",
};

const meta: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.12em",
  color: "var(--ink-500)",
  textAlign: "center",
  marginBottom: 16,
};

const priceGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 14,
};

const priceBox: CSSProperties = {
  border: "1px dotted var(--brass-500)",
  padding: "8px 10px",
  background: "var(--paper-200)",
};

const priceLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};

const priceValue: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  color: "var(--forest-800)",
  marginTop: 2,
};

const venteRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 14,
};

const venteInput: CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  border: "1px solid var(--brass-500)",
  background: "var(--paper-200)",
  fontFamily: "var(--font-display)",
  fontSize: 14,
  color: "var(--forest-800)",
  outline: "none",
};

const etalBtn: CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid var(--brass-500)",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

export function ObjetDetailOverlay({
  objet,
  open,
  onClose,
  prixMarche,
  onSetPrixVente,
  onAjouterEtal,
  brocanteOuverteNom,
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Détail de l'objet"
      style={backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={card}>
        <div style={topBar}>
          <div style={titleStyle}>{objet.nom}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={closeBtn}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div style={previewWrap}>
          <CategorieIcon
            categorie={objet.categorie}
            size={56}
            strokeWidth={1.2}
            color="var(--brass-100)"
          />
        </div>

        <div style={meta}>
          {objet.etat} · {objet.rarete} · {objet.categorie}
        </div>

        {enRestauration && (
          <div
            style={{
              padding: "8px 10px",
              background: "var(--paper-300)",
              border: "1px dotted var(--brass-700)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "var(--brass-700)",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            En restauration jusqu&apos;au jour {objet.enRestauration?.jourFin}
          </div>
        )}

        <div style={priceGrid}>
          <div style={priceBox}>
            <div style={priceLabel}>Prix d&apos;achat</div>
            <div style={priceValue}>
              {objet.prixAchat !== undefined ? `${objet.prixAchat} €` : "—"}
            </div>
          </div>
          <div style={priceBox}>
            <div style={priceLabel}>Prix du marché</div>
            <div style={priceValue}>{Math.round(prixMarche)} €</div>
          </div>
        </div>

        <div style={priceLabel}>Prix de vente</div>
        <div style={venteRow}>
          <input
            type="number"
            min={0}
            value={prixLocal}
            onChange={(e) => setPrixLocal(Number(e.target.value) || 0)}
            onBlur={commitPrix}
            style={venteInput}
            disabled={enRestauration}
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              color: "var(--brass-700)",
            }}
          >
            €
          </span>
        </div>

        {onAjouterEtal && !enRestauration && (
          <button
            type="button"
            onClick={() => {
              commitPrix();
              onAjouterEtal(objet, prixLocal);
              onClose();
            }}
            style={etalBtn}
          >
            <Store size={16} strokeWidth={1.5} />
            Mettre à l&apos;étal
            {brocanteOuverteNom ? ` · ${brocanteOuverteNom}` : ""}
          </button>
        )}
      </div>
    </div>
  );
}
