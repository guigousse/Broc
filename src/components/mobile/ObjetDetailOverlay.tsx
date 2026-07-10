"use client";

import type { CSSProperties } from "react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { StarRow } from "@/components/ui/StarRow";
import { getTemplate } from "@/data/objetTemplates";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie, libelleEtat, libelleRarete } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import type { Objet } from "@/types/game";

interface ObjetDetailOverlayProps {
  objet: Objet | null;
  open: boolean;
  onClose: () => void;
  prixMarche: number;
  /** Prix marché visible ? Vrai si compétence Connaisseur Vitrine débloquée pour cette catégorie. */
  prixMarcheConnu: boolean;
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
  width: "min(263px, 75vw)",
  height: "min(263px, 75vw)",
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
}: ObjetDetailOverlayProps) {
  const { d, locale } = useLangue();

  if (!open || !objet) return null;

  const enRestauration = !!objet.enRestauration;
  const isUnique = !!getTemplate(objet.templateId)?.unique;
  const rarityColors = getRarityColors(objet.rarete, isUnique);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={d.inventaire.detailObjet}
      style={backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
            <span style={prixLabel}>{d.inventaire.rareteMot}</span>
            <span style={{ ...prixValue, color: rarityColors.outer }}>
              {libelleRarete(objet.rarete, d)}
            </span>
          </div>

          <div style={prixRow}>
            <span style={prixLabel}>{d.inventaire.prixMarche}</span>
            <span style={prixValue}>
              {prixMarcheConnu ? `${Math.round(prixMarche)} €` : "? €"}
            </span>
          </div>

          <div style={prixRowLast}>
            <span style={prixLabel}>{d.inventaire.prixAchat}</span>
            <span style={prixValue}>
              {objet.prixAchat !== undefined ? `${objet.prixAchat} €` : "— €"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
