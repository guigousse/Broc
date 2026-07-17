"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { DialogueSequence, HumeurPnj } from "@/data/dialogues";
import { lignesDialogue } from "@/lib/i18n/contenu";
import { useLangue } from "@/lib/i18n/LangueContext";

interface DialogueOverlayProps {
  /** Séquence à jouer, ou null (rien n'est rendu). */
  sequence: DialogueSequence | null;
  /** Nom affiché du PNJ (déjà localisé par l'appelant). */
  nom: string;
  /** Portrait par humeur. */
  portraits: Record<HumeurPnj, string>;
  /** Appelé après le tap sur la dernière ligne. */
  onFini: () => void;
}

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 120,
  background: "rgba(15, 30, 22, 0.45)",
  border: "none",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  cursor: "pointer",
  width: "100%",
  textAlign: "inherit",
};

/* Retour device 2026-07-17 : le portrait est un cercle SÉPARÉ de la bulle —
   rangée avatar + bulle, alignée en bas, chacun avec son propre cadre. */
const rangee: CSSProperties = {
  margin: "0 12px calc(16px + var(--safe-bottom, 0px))",
  display: "flex",
  gap: 10,
  alignItems: "flex-end",
};

const carte: CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "14px 16px 12px",
  borderRadius: 14,
  background: "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  border: "1px solid #b89c5e",
  boxShadow: "inset 0 0 28px rgba(120,90,40,0.18), 0 6px 16px rgba(0,0,0,0.35)",
};

const portraitStyle: CSSProperties = {
  width: 84,
  height: 84,
  borderRadius: "50%",
  border: "2px solid #b89c5e",
  objectFit: "cover",
  flexShrink: 0,
  background: "#e7d6a8",
  boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
};

const nomStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.10em",
  color: "var(--ink-700)",
  marginBottom: 4,
};

const texteStyle: CSSProperties = {
  fontFamily: "var(--font-handwriting)",
  fontSize: 18,
  lineHeight: 1.35,
  color: "#3a2f1e",
};

const suiteStyle: CSSProperties = {
  fontSize: 12,
  color: "#7a6337",
  textAlign: "right",
  marginTop: 6,
};

export function DialogueOverlay({
  sequence,
  nom,
  portraits,
  onFini,
}: DialogueOverlayProps) {
  const { locale, d } = useLangue();
  const [index, setIndex] = useState(0);

  // Nouvelle séquence → repartir de la première ligne.
  useEffect(() => {
    setIndex(0);
  }, [sequence?.id]);

  if (!sequence || typeof document === "undefined") return null;

  const lignes = lignesDialogue(sequence, locale);
  const ligne = sequence.lignes[Math.min(index, sequence.lignes.length - 1)];
  const texte = lignes[Math.min(index, lignes.length - 1)];
  const derniere = index >= lignes.length - 1;

  const avancer = () => {
    if (derniere) onFini();
    else setIndex((i) => i + 1);
  };

  return createPortal(
    <button type="button" style={scrim} onClick={avancer}>
      <div style={rangee}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portraits[ligne.humeur]} alt="" draggable={false} style={portraitStyle} />
        <div style={carte}>
          <div style={nomStyle}>{nom}</div>
          <div style={texteStyle}>{texte}</div>
          <div style={suiteStyle} aria-hidden>
            {derniere ? "✦" : "▼"}
          </div>
        </div>
      </div>
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      >
        {d.menu.continuer}
      </span>
    </button>,
    document.body,
  );
}
