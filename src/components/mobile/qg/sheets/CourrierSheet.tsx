"use client";

import {
  useEffect,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import { getExpediteur } from "@/data/expediteursCourrier";
import { useSettings } from "@/context/SettingsContext";
import type { Courrier } from "@/types/game";

interface CourrierSheetProps {
  open: boolean;
  onClose: () => void;
  courriers: Courrier[];
  onMarquerLu: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/* Markdown ultra-minimal : **gras** seulement.                       */
/* ------------------------------------------------------------------ */
function renderParaText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <strong key={match.index} style={{ fontWeight: 700 }}>
        {match[1]}
      </strong>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.55)",
  zIndex: 50,
  animation: "broc-fade-in 160ms ease",
};

const stage: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 51,
  display: "flex",
  flexDirection: "column",
  padding: "max(24px, env(safe-area-inset-top)) 16px 0",
  overflow: "hidden",
};

const closeIconBtn: CSSProperties = {
  position: "absolute",
  top: "max(12px, env(safe-area-inset-top))",
  right: 12,
  width: 36,
  height: 36,
  borderRadius: 18,
  background: "rgba(20,15,5,0.45)",
  border: "1px solid rgba(217,192,122,0.5)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  fontSize: 14,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
  zIndex: 52,
};

const scrollArea: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  paddingBottom: 110, // place pour le bouton fixe en bas
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const lettreCard: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 420,
  background:
    "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  border: "1px solid #b89c5e",
  boxShadow:
    "inset 0 0 28px rgba(120, 90, 40, 0.18), 0 6px 16px rgba(0,0,0,0.25)",
  padding: "18px 20px 16px",
  margin: "0 0 18px",
  borderRadius: 2,
};

const titreLettre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  margin: "0 0 12px",
  color: "var(--ink-700)",
  borderBottom: "1px dotted #a88f5a",
  paddingBottom: 6,
};

const corpsLettre: CSSProperties = {
  fontFamily: "var(--font-handwriting)",
  fontSize: 17,
  lineHeight: 1.4,
  color: "#3a2f1e",
  margin: "0 0 2px",
  textIndent: "1.6em",
  textAlign: "left",
};

const corpsLettrePremier: CSSProperties = {
  ...corpsLettre,
  textIndent: 0,
};

const signatureLettre: CSSProperties = {
  fontFamily: "var(--font-handwriting)",
  fontSize: 20,
  lineHeight: 1.3,
  marginTop: 12,
  paddingRight: 6,
  whiteSpace: "pre-line",
  textAlign: "right",
  color: "#2a2008",
  transform: "rotate(-2deg)",
  transformOrigin: "right center",
};

const bottomBar: CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
  background:
    "linear-gradient(to top, rgba(15,30,22,0.85), rgba(15,30,22,0))",
  display: "flex",
  justifyContent: "center",
  zIndex: 52,
  pointerEvents: "none",
};

const actionBtn: CSSProperties = {
  pointerEvents: "auto",
  minWidth: 220,
  padding: "14px 26px",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  borderRadius: 6,
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.20em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow:
    "0 6px 14px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,225,160,0.20)",
};

/* Cas huissier (gardé sobre, en cohérence visuelle). */
const huissierCard: CSSProperties = {
  width: "100%",
  maxWidth: 420,
  border: "1px solid var(--vermillion-600)",
  background: "var(--paper-100)",
  padding: 16,
  marginBottom: 18,
};

/* ------------------------------------------------------------------ */
/* Rendus                                                              */
/* ------------------------------------------------------------------ */

function renderHuissier(c: Courrier) {
  if (c.payload.type !== "huissier") return null;
  const p = c.payload;
  const total = p.saisies.reduce((s, x) => s + x.montantRecupere, 0);
  return (
    <>
      <h3 style={{ ...titreLettre, color: "var(--vermillion-600)" }}>
        Lettre de l'huissier
      </h3>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 14,
          lineHeight: 1.45,
          color: "var(--ink-700)",
        }}
      >
        Dette de{" "}
        <strong style={{ fontWeight: 700 }}>
          {Math.abs(p.detteAvantSaisie)} €
        </strong>{" "}
        après loyer. {p.saisies.length} bien
        {p.saisies.length > 1 ? "s" : ""} saisi
        {p.saisies.length > 1 ? "s" : ""} pour{" "}
        <strong style={{ fontWeight: 700 }}>{total} €</strong>.
      </p>
      {p.saisies.length > 0 && (
        <ul
          style={{
            margin: "8px 0 0 16px",
            padding: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-500)",
          }}
        >
          {p.saisies.map((s, i) => (
            <li key={i}>
              {s.nom} ({s.type === "inventaire" ? "stock" : "collection"}) —{" "}
              {s.montantRecupere} € (valeur {s.valeur} €)
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function renderLettre(c: Courrier) {
  if (c.payload.type !== "lettre") return null;
  const p = c.payload;
  const exp = getExpediteur(p.expediteurId);
  return (
    <>
      <h3 style={titreLettre}>{p.titre}</h3>
      {p.corps.map((para, i) => (
        <p key={i} style={i === 0 ? corpsLettrePremier : corpsLettre}>
          {renderParaText(para)}
        </p>
      ))}
      {exp && <div style={signatureLettre}>{exp.signature}</div>}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export function CourrierSheet({
  open,
  onClose,
  courriers,
  onMarquerLu,
}: CourrierSheetProps) {
  const { playClick, playCash } = useSettings();

  const nonLus = useMemo(
    () =>
      courriers
        .filter((c) => !c.lu)
        .sort((a, b) => b.jourRecu - a.jourRecu),
    [courriers],
  );

  // Auto-close quand la pile est vide.
  useEffect(() => {
    if (!open) return;
    if (nonLus.length > 0) return;
    onClose();
  }, [open, nonLus.length, onClose]);

  // Bloque le scroll du body pendant l'ouverture.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || nonLus.length === 0) return null;

  // On affiche une lettre à la fois (la plus récente) pour permettre un
  // unique bouton d'action fixé en bas.
  const courant = nonLus[0];
  const recompenseArgent =
    courant.payload.type === "lettre" && courant.payload.recompense?.argent;

  const handleValider = () => {
    if (recompenseArgent) {
      playCash();
    } else {
      playClick();
    }
    onMarquerLu(courant.id);
  };

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <button
          type="button"
          style={closeIconBtn}
          onClick={onClose}
          aria-label="Fermer"
        >
          ✕
        </button>
        <div style={scrollArea}>
          {courant.type === "huissier" ? (
            <div style={huissierCard}>{renderHuissier(courant)}</div>
          ) : (
            <article style={lettreCard}>{renderLettre(courant)}</article>
          )}
        </div>
        <div style={bottomBar}>
          <button type="button" style={actionBtn} onClick={handleValider}>
            {recompenseArgent
              ? `Récupérer ${recompenseArgent} €`
              : "Compris"}
          </button>
        </div>
      </div>
    </>
  );
}
