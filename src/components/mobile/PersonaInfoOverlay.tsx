"use client";

import type { CSSProperties, ReactNode } from "react";
import { Lock } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { DictionnaireUI } from "@/lib/i18n/ui";

export interface PersonaInfo {
  /** Nom propre du persona (révélé par Lecteur d'âmes). */
  nom?: string;
  /** Nom de l'archétype (« Le Grincheux », « Retraité chineur », …). */
  archetypeNom?: string;
  /** Phrase d'ambiance (révélée par Lecteur d'âmes). */
  ambiance?: string;
  /** Classe de bourse (révélée par Estimateur de bourse). */
  bourse?: "petite" | "moyenne" | "grosse";
  /** Prix max secret (révélé par Œil aiguisé). */
  prixMax?: number;
  /** Flags de révélation par compétence. */
  revelePersona: boolean;
  releveBourse: boolean;
  oeilAiguise: boolean;
}

interface PersonaInfoOverlayProps {
  info: PersonaInfo;
  onClose: () => void;
}

function bourseLabel(
  b: "petite" | "moyenne" | "grosse" | undefined,
  d: DictionnaireUI,
): string {
  if (b === "petite") return d.chine.bourseSymbolPetite;
  if (b === "moyenne") return d.chine.bourseSymbolMoyenne;
  if (b === "grosse") return d.chine.bourseSymbolGrosse;
  return "—";
}

export function PersonaInfoOverlay({ info, onClose }: PersonaInfoOverlayProps) {
  const { d, tr } = useLangue();
  return (
    <div style={scrim} onClick={onClose} role="presentation">
      <div
        style={card}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={cardHeader}>
          <span style={cardTitle}>{d.chine.infosPersonnage}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={d.commun.fermer}
            style={closeBtn}
          >
            ✕
          </button>
        </div>
        <PalierRow
          title="Lecteur d'âmes"
          unlocked={info.revelePersona}
          lockedText={d.chine.voirNomAmbiance}
        >
          <div style={lineMain}>{info.nom ?? "—"}</div>
          {info.archetypeNom && (
            <div style={lineSub}>— {info.archetypeNom} —</div>
          )}
          {info.ambiance && <div style={lineAmbiance}>{info.ambiance}</div>}
        </PalierRow>
        <PalierRow
          title="Estimateur de bourse"
          unlocked={info.releveBourse}
          lockedText={d.chine.lireClasseBourse}
        >
          <div style={lineMain}>{bourseLabel(info.bourse, d)}</div>
        </PalierRow>
        <PalierRow
          title="Œil aiguisé"
          unlocked={info.oeilAiguise}
          lockedText={d.chine.lirePrixMax}
        >
          <div style={lineMain}>
            {tr(d.chine.prixMaxLabel, {
              valeur: info.prixMax !== undefined ? `${info.prixMax} €` : "—",
            })}
          </div>
        </PalierRow>
      </div>
    </div>
  );
}

function PalierRow({
  title,
  unlocked,
  lockedText,
  children,
}: {
  title: string;
  unlocked: boolean;
  lockedText: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        ...palierRow,
        opacity: unlocked ? 1 : 0.55,
      }}
    >
      <div style={palierHead}>
        {!unlocked && <Lock size={11} strokeWidth={2} />}
        <span style={palierTitle}>{title}</span>
      </div>
      <div style={palierBody}>
        {unlocked ? children : <span style={lockedTextStyle}>{lockedText}</span>}
      </div>
    </div>
  );
}

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.55)",
  zIndex: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const card: CSSProperties = {
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow: "0 10px 30px rgba(15,30,22,0.4)",
  padding: 18,
  width: "100%",
  maxWidth: 360,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const cardHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: 10,
  borderBottom: "1px solid var(--brass-500)",
  marginBottom: 6,
};

const cardTitle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
};

const closeBtn: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--brass-700)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 4,
};

const palierRow: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "10px 0",
  borderBottom: "1px dashed rgba(0,0,0,0.12)",
};

const palierHead: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const palierTitle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};

const palierBody: CSSProperties = {
  paddingLeft: 4,
};

const lineMain: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--forest-800)",
};

const lineSub: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 10,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  marginTop: 4,
};

const lineAmbiance: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 13,
  color: "var(--ink-500)",
  marginTop: 4,
};

const lockedTextStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 12,
  color: "var(--ink-500)",
};
