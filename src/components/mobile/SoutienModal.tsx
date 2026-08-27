"use client";

import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { useSettingsSafe } from "@/context/SettingsContext";
import { BoutonsSoutien } from "@/components/mobile/BoutonsSoutien";

/**
 * La page « Soutenir Broc » du menu principal : même habillage que Réglages
 * et Crédits — écran-titre flouté derrière, encadré vert flottant devant —
 * puis les trois boutons de soutien en dessous, à même le fond.
 *
 * La borne d'arcade garde sa feuille (`SoutienSheet`) : elle s'ouvre au-dessus
 * d'un jeu, pas d'un menu. Les deux partagent `BoutonsSoutien`.
 */

interface SoutienModalProps {
  open: boolean;
  onClose: () => void;
}

const wrap: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: "rgba(15,31,24,0.35)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  paddingTop: "var(--safe-top)",
  paddingBottom: "var(--safe-bottom)",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
};

const topBar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.32em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  fontWeight: 700,
};

const closeBtn: CSSProperties = {
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-300)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  minWidth: "var(--tap-min)",
  minHeight: "var(--tap-min)",
};

const carte: CSSProperties = {
  background: "var(--forest-800)",
  border: "1px solid var(--brass-500)",
  // Un seul filet, pas le double liseré des cartes de Réglages : le texte de
  // remerciement se lit mieux sans cadre dans le cadre.
  boxShadow: "0 16px 32px rgba(0,0,0,0.38)",
  borderRadius: "var(--radius-card)",
  padding: "16px 18px",
  margin: "10px 24px 0",
};

const sectionTitle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 12.5,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  margin: "0 0 16px",
};

/* Corps de lecture, pas de légende : Cormorant est une garalde fine, elle
   demande de la taille et du gras pour rester lisible sur un fond sombre —
   17px en 500, sur du `paper-100` plutôt que du `paper-300`. */
const paragraphe: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 17,
  fontWeight: 500,
  lineHeight: 1.72,
  letterSpacing: "0.005em",
  color: "var(--paper-100)",
  margin: "0 0 10px",
};

const boutons: CSSProperties = { padding: "14px 24px 24px" };

export function SoutienModal({ open, onClose }: SoutienModalProps) {
  const { d } = useLangue();
  const { playClick } = useSettingsSafe();

  if (!open) return null;

  const onFermer = () => {
    playClick();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={d.soutien.titre}
      style={wrap}
    >
      <div style={topBar}>
        <h2 style={titleStyle}>{d.soutien.titre}</h2>
        <button
          type="button"
          onClick={onFermer}
          aria-label={d.commun.fermer}
          style={closeBtn}
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <section style={carte} aria-label={d.soutien.merciTitre}>
        <h3 style={sectionTitle}>{d.soutien.merciTitre}</h3>
        <p style={paragraphe}>{d.soutien.merciCorps}</p>
        <p style={paragraphe}>{d.soutien.merciPartage}</p>
        <p style={{ ...paragraphe, marginBottom: 0 }}>{d.soutien.merciAvis}</p>
      </section>

      <div style={boutons}>
        <BoutonsSoutien avecChat />
      </div>
    </div>
  );
}
