"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { StarRow } from "@/components/ui/StarRow";
import { getTemplate } from "@/data/objetTemplates";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie, libelleEtat } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
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
  marginBottom: 28,
  position: "relative",
};

/* L'objet est présenté en sticker (découpe autocollant), plus de cadre. */
const stickerBox: CSSProperties = {
  width: "min(210px, 60vw)",
  height: "min(210px, 60vw)",
};

const titreCard: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  fontWeight: 700,
  textAlign: "center",
  paddingBottom: 10,
  borderBottom: "1px dotted var(--brass-500)",
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
  const { d, locale } = useLangue();
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
      aria-label={d.inventaire.detailObjet}
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
          <div style={stickerBox}>
            <ItemSticker
              templateId={objet.templateId}
              categorie={objet.categorie}
              fill
              tilt={false}
              variant="normal"
              eager
            />
          </div>
        </div>

        <div style={prixCard}>
          <div style={titreCard}>{nomObjet(objet, locale)}</div>

          {enRestauration && (
            <div style={restaurationBanner}>
              {d.inventaire.enRestaurationAtelier}
            </div>
          )}

          <div style={prixRow}>
            <span style={prixLabel}>{d.inventaire.etatMot}</span>
            <span
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <StarRow
                filled={etoileCount(objet.etat)}
                color={getRarityColors(objet.rarete, isUnique).outer}
                size={13}
              />
              <span style={prixValue}>{libelleEtat(objet.etat, d)}</span>
            </span>
          </div>

          <div style={prixRow}>
            <span style={prixLabel}>{d.inventaire.themeMot}</span>
            <span
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <CategorieIcon
                categorie={objet.categorie}
                size={15}
                strokeWidth={1.5}
                color="var(--brass-700)"
              />
              <span style={prixValue}>
                {libelleCategorie(objet.categorie, d)}
              </span>
            </span>
          </div>

          <div style={prixRow}>
            <span style={prixLabel}>{d.inventaire.prixMarche}</span>
            <span style={prixValue}>
              {prixMarcheConnu ? `${Math.round(prixMarche)} €` : "? €"}
            </span>
          </div>

          <div style={prixRow}>
            <span style={prixLabel}>{d.inventaire.prixAchat}</span>
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
            <span style={prixLabel}>{d.inventaire.prixVente}</span>
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
                aria-label={d.inventaire.diminuerPrixVente}
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
                  aria-label={d.inventaire.prixVente}
                />
                <span style={prixValue}>€</span>
              </span>
              <button
                type="button"
                onClick={() => ajusterPrix(5)}
                disabled={enRestauration}
                style={stepBtn(enRestauration)}
                aria-label={d.inventaire.augmenterPrixVente}
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
