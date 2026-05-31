"use client";

import { useState, type CSSProperties } from "react";
import { Info } from "lucide-react";
import {
  PersonaInfoOverlay,
  type PersonaInfo,
} from "@/components/mobile/PersonaInfoOverlay";

interface PersonaAvatarProps {
  /** Texte contextuel affiché dans la bulle. */
  message: string;
  /** Données d'infos persona pour l'overlay (i). */
  info: PersonaInfo;
}

export function PersonaAvatar({ message, info }: PersonaAvatarProps) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  return (
    <>
      <div style={rowStyle}>
        <div style={avatarWrap}>
          <svg
            viewBox="0 0 80 80"
            width={84}
            height={84}
            style={svgStyle}
            aria-hidden
          >
            <circle
              cx="40"
              cy="40"
              r="38"
              fill="var(--paper-200)"
              stroke="var(--brass-700)"
              strokeWidth="2"
            />
            <circle cx="40" cy="32" r="11" fill="var(--forest-800)" />
            <path
              d="M 16 70 Q 40 50 64 70 L 64 78 L 16 78 Z"
              fill="var(--forest-800)"
            />
          </svg>
          <button
            type="button"
            onClick={() => setOverlayOpen(true)}
            aria-label="Voir les infos du persona"
            style={infoBtn}
          >
            <Info size={12} strokeWidth={2.5} />
          </button>
        </div>
        <div style={bubbleWrap}>
          <div style={tailOuter} aria-hidden />
          <div style={tailInner} aria-hidden />
          <div style={bubbleText}>{message}</div>
        </div>
      </div>
      {overlayOpen && (
        <PersonaInfoOverlay info={info} onClose={() => setOverlayOpen(false)} />
      )}
    </>
  );
}

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  margin: "0 0 12px",
};

const avatarWrap: CSSProperties = {
  position: "relative",
  flex: "0 0 auto",
  width: 84,
  height: 84,
};

const svgStyle: CSSProperties = {
  display: "block",
};

const infoBtn: CSSProperties = {
  position: "absolute",
  right: -2,
  bottom: -2,
  width: 26,
  height: 26,
  borderRadius: "50%",
  background: "var(--brass-700)",
  color: "var(--paper-100)",
  border: "2px solid var(--paper-100)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  padding: 0,
  boxShadow: "0 2px 4px rgba(0,0,0,0.22)",
};

const bubbleWrap: CSSProperties = {
  position: "relative",
  flex: 1,
  minWidth: 0,
  padding: "10px 14px",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  borderRadius: 8,
};

const tailOuter: CSSProperties = {
  position: "absolute",
  left: -9,
  top: "50%",
  width: 0,
  height: 0,
  borderTop: "9px solid transparent",
  borderBottom: "9px solid transparent",
  borderRight: "9px solid var(--brass-500)",
  transform: "translateY(-50%)",
};

const tailInner: CSSProperties = {
  position: "absolute",
  left: -7,
  top: "50%",
  width: 0,
  height: 0,
  borderTop: "8px solid transparent",
  borderBottom: "8px solid transparent",
  borderRight: "8px solid var(--paper-100)",
  transform: "translateY(-50%)",
};

const bubbleText: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 13,
  color: "var(--ink-700)",
  lineHeight: 1.4,
  minHeight: 28,
};
