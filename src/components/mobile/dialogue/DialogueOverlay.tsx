"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { DialogueSequence, HumeurPnj } from "@/data/dialogues";
import { lignesDialogue } from "@/lib/i18n/contenu";
import { useLangue } from "@/lib/i18n/LangueContext";
import { namePlateStyle } from "@/components/ui/namePlate";

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

/* Retour device 2026-07-17 : le portrait est un cercle SÉPARÉ de la bulle.
   Révisé 2026-07-27 : le médaillon rognait le détourage de l'illustration et
   volait ~94 px à la bulle. Le portrait devient une image détourée en grand,
   posée sur le bandeau nom — même langage que le vendeur du tiroir de chinage
   (ChineNegoDrawer) — et la bulle prend toute la largeur, marge 12px. */
const colonne: CSSProperties = {
  margin: "0 12px calc(16px + var(--safe-bottom, 0px))",
  display: "flex",
  flexDirection: "column",
};

/* Seul réglage à bouger si le personnage doit grandir ou rétrécir sur device.
   Les portraits du grand-père sont carrés, mais de côté variable : de 319px
   (songeur) à 446px (emu). À 190px de haut, songeur est la source la plus
   agrandie — le premier candidat si le rendu paraît mou. */
const portraitStyle: CSSProperties = {
  alignSelf: "flex-start",
  marginLeft: 8,
  height: "clamp(140px, 20vh, 190px)",
  width: "auto",
  objectFit: "contain",
  display: "block",
  filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))",
};

/* overflow:hidden — le bandeau est à coins droits et se fait rogner par la
   carte : un seul rayon à maintenir. */
const carte: CSSProperties = {
  borderRadius: 14,
  overflow: "hidden",
  // flexShrink:0 — avec overflow:hidden, min-height:auto ne joue plus (Flexbox
  // §4.5) : sans ce verrou, un écran court écraserait la carte au lieu de
  // déborder, rognant silencieusement le texte du dialogue.
  flexShrink: 0,
  background: "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  border: "1px solid #b89c5e",
  boxShadow: "inset 0 0 28px rgba(120,90,40,0.18), 0 6px 16px rgba(0,0,0,0.35)",
};

const bandeau = namePlateStyle("0");

const corps: CSSProperties = {
  padding: "14px 16px 12px",
};

const texteStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 21,
  fontWeight: 500,
  lineHeight: 1.45,
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
      <div style={colonne}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portraits[ligne.humeur]} alt="" draggable={false} style={portraitStyle} />
        <div style={carte}>
          <div style={bandeau}>{nom}</div>
          <div style={corps}>
            <div style={texteStyle}>{texte}</div>
            <div style={suiteStyle} aria-hidden>
              {derniere ? "✦" : "▼"}
            </div>
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
