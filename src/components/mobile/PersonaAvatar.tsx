"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { Info } from "lucide-react";
import {
  PersonaInfoOverlay,
  type PersonaInfo,
} from "@/components/mobile/PersonaInfoOverlay";
import { useLangue } from "@/lib/i18n/LangueContext";

interface PersonaAvatarProps {
  /** Texte contextuel affiché dans la bulle. */
  message: string;
  /** Données d'infos persona pour l'overlay (i). */
  info: PersonaInfo;
  /** Illustration PNG du personnage. Si absent, fallback SVG schématique. */
  illustrationSrc?: string;
  /** Aura dorée animée derrière le portrait (apparition d'une célébrité). */
  aura?: boolean;
}

const AVATAR_SIZE = 138;

export function PersonaAvatar({ message, info, illustrationSrc, aura }: PersonaAvatarProps) {
  const { d } = useLangue();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [illustrationFailed, setIllustrationFailed] = useState(false);
  const showIllustration = illustrationSrc && !illustrationFailed;
  return (
    <>
      <div style={rowStyle}>
        <div style={avatarWrap}>
          {aura && <div style={auraStyle} data-testid="aura-celebrite" aria-hidden />}
          {showIllustration ? (
            <Image
              src={illustrationSrc}
              alt=""
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              style={illustrationStyle}
              onError={() => setIllustrationFailed(true)}
              priority
            />
          ) : (
          <svg
            viewBox="0 0 80 80"
            width={AVATAR_SIZE}
            height={AVATAR_SIZE}
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
          )}
          <button
            type="button"
            onClick={() => setOverlayOpen(true)}
            aria-label={d.chine.voirInfosPersonaAria}
            style={infoBtn}
          >
            <Info size={12} strokeWidth={2.5} />
          </button>
        </div>
        {message && (
          <div style={bubbleWrap}>
            <div style={tailOuter} aria-hidden />
            <div style={tailInner} aria-hidden />
            <span style={bubbleText}>{message}</span>
          </div>
        )}
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
};

const avatarWrap: CSSProperties = {
  position: "relative",
  flex: "0 0 auto",
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  pointerEvents: "auto",
};

/* Halo doré derrière le portrait de célébrité : deux nappes radiales (cœur
   chaud + voile large), animées en respiration douce. */
const auraStyle: CSSProperties = {
  position: "absolute",
  inset: -18,
  borderRadius: "50%",
  background:
    "radial-gradient(circle at 50% 42%, rgba(255,223,128,0.85) 0%, rgba(255,196,64,0.45) 38%, rgba(255,180,40,0.18) 62%, rgba(255,180,40,0) 78%)",
  filter: "blur(2px)",
  animation: "broc-celebrite-aura 2.4s ease-in-out infinite",
  pointerEvents: "none",
};

const svgStyle: CSSProperties = {
  display: "block",
  filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.25))",
};

const illustrationStyle: CSSProperties = {
  display: "block",
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  objectFit: "contain",
  // Ancrage en bas : les variantes calme/fâchée d'un même persona sont
  // coupées à des hauteurs différentes ; centrées, la plus courte « saute »
  // vers le haut au changement d'humeur. Le bas du sujet est l'ancre commune
  // (cf. straightenBottom dans generate-client-personas.mjs).
  objectPosition: "center bottom",
  filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.25))",
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
  pointerEvents: "auto",
};

const bubbleWrap: CSSProperties = {
  position: "relative",
  display: "inline-block",
  maxWidth: "70%",
  padding: "10px 14px",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  borderRadius: 14,
  boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
  pointerEvents: "auto",
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
  fontSize: 16,
  color: "var(--ink-700)",
  lineHeight: 1.35,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};
