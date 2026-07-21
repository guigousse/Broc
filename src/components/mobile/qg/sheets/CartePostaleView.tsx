"use client";

import { useState, type CSSProperties } from "react";
import type { CartePostale } from "@/data/cartesPostales";
import { useLangue } from "@/lib/i18n/LangueContext";
import { corpsCourrier, titreCourrier } from "@/lib/i18n/contenu";
import type { Courrier } from "@/types/game";

interface CartePostaleViewProps {
  courrier: Courrier;
  carte: CartePostale;
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const conteneur: CSSProperties = {
  width: "100%",
  maxWidth: 420,
  aspectRatio: "3 / 2",
  perspective: 1200,
  margin: "0 0 18px",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

const interne = (verso: boolean): CSSProperties => ({
  position: "relative",
  width: "100%",
  height: "100%",
  transformStyle: "preserve-3d",
  transition: "transform 600ms cubic-bezier(0.4, 0.1, 0.2, 1)",
  transform: verso ? "rotateY(180deg)" : "rotateY(0deg)",
});

const face: CSSProperties = {
  position: "absolute",
  inset: 0,
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  borderRadius: 6,
  overflow: "hidden",
  // Liseré blanc cassé de carte postale.
  border: "6px solid #f8f3e6",
  background: "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  boxShadow: "inset 0 0 28px rgba(120, 90, 40, 0.12), 0 6px 16px rgba(0,0,0,0.3)",
};

const faceVerso: CSSProperties = {
  ...face,
  transform: "rotateY(180deg)",
  display: "flex",
  flexDirection: "column",
  padding: "8px 14px 10px",
  overflowY: "auto",
};

const imgRecto: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const fallbackRecto: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  fontFamily: "var(--font-display)",
  fontSize: 17,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#7a6335",
  textAlign: "center",
  padding: 12,
};

const indice: CSSProperties = {
  position: "absolute",
  right: 10,
  bottom: 8,
  padding: "3px 10px",
  borderRadius: 999,
  background: "rgba(20,15,5,0.55)",
  color: "#f1e4c0",
  fontFamily: "var(--font-display)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  pointerEvents: "none",
};

const enTeteVerso: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  minHeight: 66,
  marginBottom: 4,
};

const titreVerso: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  margin: "6px 0 0",
  color: "var(--ink-700)",
  borderBottom: "1px dotted #a88f5a",
  paddingBottom: 4,
  alignSelf: "flex-end",
};

const corpsVerso: CSSProperties = {
  fontFamily: "var(--font-handwriting)",
  fontSize: 14.5,
  lineHeight: 1.32,
  color: "#3a2f1e",
  margin: "0 0 7px",
  textAlign: "left",
};

// Dernier paragraphe = signature du grand-père, penchée comme les lettres.
const corpsSignature: CSSProperties = {
  ...corpsVerso,
  textAlign: "right",
  fontSize: 16,
  color: "#2a2008",
  transform: "rotate(-2deg)",
  transformOrigin: "right center",
  margin: 0,
};

/* ------------------------------------------------------------------ */
/* Timbre dessiné en code : bord dentelé, vignette, cachet postal.     */
/* ------------------------------------------------------------------ */

const ENCRE_CACHET = "#3c3358";

function Timbre({ teinte, cachet }: { teinte: string; cachet: string }) {
  return (
    <div data-testid="timbre" style={{ position: "relative", flexShrink: 0, marginLeft: 40 }}>
      <svg width={54} height={64} viewBox="0 0 54 64" aria-hidden>
        <rect x={1} y={1} width={52} height={62} fill="#fdfaf2" stroke="#d8cdae" strokeWidth={1} />
        {/* Perforations : cercles couleur papier sur le pourtour. */}
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <circle cx={3 + i * 8} cy={1} r={2.3} fill="#f4e9cd" />
            <circle cx={3 + i * 8} cy={63} r={2.3} fill="#f4e9cd" />
          </g>
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i}>
            <circle cx={1} cy={3.5 + i * 8} r={2.3} fill="#f4e9cd" />
            <circle cx={53} cy={3.5 + i * 8} r={2.3} fill="#f4e9cd" />
          </g>
        ))}
        {/* Vignette colorée : soleil + vague, façon timbre de voyage. */}
        <rect x={8} y={7} width={38} height={44} fill={teinte} />
        <circle cx={27} cy={22} r={7} fill="rgba(255,252,240,0.85)" />
        <path
          d="M12 41 q 7.5 -7 15 0 t 15 0"
          stroke="rgba(255,252,240,0.75)"
          strokeWidth={2.2}
          fill="none"
        />
        <text
          x={27}
          y={59.5}
          textAnchor="middle"
          fontSize={6}
          fill="#7a6335"
          fontFamily="var(--font-display)"
          letterSpacing={1.5}
        >
          POSTES
        </text>
      </svg>
      {/* Cachet postal : cercles + nom de ville + oblitération ondulée. */}
      <svg
        width={70}
        height={64}
        viewBox="0 0 70 64"
        aria-hidden
        style={{ position: "absolute", left: -40, top: 4, opacity: 0.62 }}
      >
        <g stroke={ENCRE_CACHET} fill="none" transform="rotate(-12 35 32)">
          <circle cx={35} cy={32} r={20} strokeWidth={1.6} />
          <circle cx={35} cy={32} r={14.5} strokeWidth={0.8} />
          <path d="M0 24 q 6 -4 12 0" strokeWidth={1.3} />
          <path d="M-2 31 q 6 -4 12 0" strokeWidth={1.3} />
          <path d="M0 38 q 6 -4 12 0" strokeWidth={1.3} />
        </g>
        <text
          x={35}
          y={30.5}
          textAnchor="middle"
          fontSize={7}
          fill={ENCRE_CACHET}
          fontFamily="var(--font-display)"
          letterSpacing={1}
          transform="rotate(-12 35 32)"
        >
          {cachet}
        </text>
        <text
          x={35}
          y={40}
          textAnchor="middle"
          fontSize={5.5}
          fill={ENCRE_CACHET}
          fontFamily="var(--font-display)"
          transform="rotate(-12 35 32)"
        >
          POSTES
        </text>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export function CartePostaleView({ courrier, carte }: CartePostaleViewProps) {
  const { d, locale } = useLangue();
  const [verso, setVerso] = useState(false);
  const [imgKo, setImgKo] = useState(false);

  const titre = titreCourrier(courrier, locale);
  const corps = corpsCourrier(courrier, locale);
  const basculer = () => setVerso((v) => !v);

  return (
    <div
      data-testid="carte-postale"
      role="button"
      tabIndex={0}
      aria-pressed={verso}
      aria-label={d.sheets.retournerCarte}
      style={conteneur}
      onClick={basculer}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          basculer();
        }
      }}
    >
      <div style={interne(verso)}>
        <div style={face}>
          {imgKo ? (
            <div data-testid="recto-fallback" style={fallbackRecto}>
              {titre}
            </div>
          ) : (
            <img
              src={carte.illustration}
              alt={titre}
              style={imgRecto}
              onError={() => setImgKo(true)}
            />
          )}
          {!verso && <div style={indice}>{d.sheets.toucherPourRetourner}</div>}
        </div>
        <div style={faceVerso}>
          <div style={enTeteVerso}>
            <h3 style={titreVerso}>{titre}</h3>
            {carte.cachet && (
              <Timbre teinte={carte.couleurTimbre ?? "#8a7443"} cachet={carte.cachet} />
            )}
          </div>
          {corps.map((para, i) => (
            <p key={i} style={i === corps.length - 1 ? corpsSignature : corpsVerso}>
              {para}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
