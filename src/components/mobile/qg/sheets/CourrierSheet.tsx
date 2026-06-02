"use client";

import { useEffect, useMemo, type CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { getExpediteur } from "@/data/expediteursCourrier";
import { useSettings } from "@/context/SettingsContext";
import type { Courrier } from "@/types/game";

interface CourrierSheetProps {
  open: boolean;
  onClose: () => void;
  courriers: Courrier[];
  onMarquerLu: (id: string) => void;
}

/* ---------- Styles ---------- */

const lettreCard: CSSProperties = {
  position: "relative",
  background:
    "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  border: "1px solid #b89c5e",
  boxShadow:
    "inset 0 0 28px rgba(120, 90, 40, 0.18), 0 2px 6px rgba(0,0,0,0.12)",
  padding: "22px 22px 18px",
  margin: "6px 2px 28px",
  borderRadius: 2,
  // Coins légèrement abîmés simulés via clip-path subtil
};

const tagLettre: CSSProperties = {
  display: "inline-block",
  padding: "3px 10px",
  background: "var(--brass-700)",
  color: "var(--paper-100)",
  fontFamily: "var(--font-display)",
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  marginBottom: 12,
};

const tagHuissier: CSSProperties = {
  ...tagLettre,
  background: "var(--vermillion-600)",
};

const titreLettre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  margin: "0 0 14px",
  color: "var(--ink-700)",
  borderBottom: "1px dotted #a88f5a",
  paddingBottom: 8,
};

const corpsLettre: CSSProperties = {
  fontFamily: "var(--font-handwriting)",
  fontSize: 20,
  lineHeight: 1.45,
  color: "#3a2f1e",
  margin: "0 0 4px",
  textIndent: "1.6em",
  textAlign: "justify",
};

const corpsLettrePremier: CSSProperties = {
  ...corpsLettre,
  textIndent: 0,
};

const signatureLettre: CSSProperties = {
  fontFamily: "var(--font-handwriting)",
  fontSize: 22,
  lineHeight: 1.3,
  marginTop: 16,
  paddingRight: 8,
  whiteSpace: "pre-line",
  textAlign: "right",
  color: "#2a2008",
  transform: "rotate(-2deg)",
  transformOrigin: "right center",
};

const huissierCard: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: 12,
  marginBottom: 10,
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

const closeBtn: CSSProperties = {
  marginTop: 8,
  padding: "6px 12px",
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-700)",
  fontFamily: "var(--font-display)",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const recupererWrap: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginTop: -14,
  marginBottom: 18,
  position: "relative",
  zIndex: 2,
};

const recupererBtn: CSSProperties = {
  padding: "12px 22px",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  borderRadius: 4,
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow:
    "0 4px 10px rgba(40,25,5,0.30), inset 0 1px 0 rgba(255,225,160,0.18)",
};

/* ---------- Rendus par type ---------- */

function renderHuissier(c: Courrier) {
  if (c.payload.type !== "huissier") return null;
  const p = c.payload;
  const total = p.saisies.reduce((s, x) => s + x.montantRecupere, 0);
  return (
    <>
      <span style={tagHuissier}>Lettre de l'huissier</span>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 13,
          lineHeight: 1.4,
        }}
      >
        Dette de {Math.abs(p.detteAvantSaisie)} € après loyer.{" "}
        {p.saisies.length} bien{p.saisies.length > 1 ? "s" : ""} saisi
        {p.saisies.length > 1 ? "s" : ""} pour {total} €.
      </p>
      {p.saisies.length > 0 && (
        <ul
          style={{
            margin: "6px 0 0 16px",
            padding: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
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
  const relation = exp ? exp.relation : "Inconnu";
  return (
    <>
      <span style={tagLettre}>Lettre — {relation}</span>
      <h3 style={titreLettre}>{p.titre}</h3>
      {p.corps.map((para, i) => (
        <p key={i} style={i === 0 ? corpsLettrePremier : corpsLettre}>
          {para}
        </p>
      ))}
      {exp && <div style={signatureLettre}>{exp.signature}</div>}
    </>
  );
}

/* ---------- Composant ---------- */

export function CourrierSheet({
  open,
  onClose,
  courriers,
  onMarquerLu,
}: CourrierSheetProps) {
  const { playClick, playCash, playPaper } = useSettings();

  const nonLus = useMemo(
    () =>
      courriers
        .filter((c) => !c.lu)
        .sort((a, b) => b.jourRecu - a.jourRecu),
    [courriers],
  );

  // Bruit de papier à l'ouverture (s'il y a au moins une lettre à montrer).
  useEffect(() => {
    if (!open) return;
    if (nonLus.length === 0) return;
    playPaper();
    // On ne rejoue pas le bruit si la liste change pendant que la sheet est
    // ouverte (lecture d'une lettre), seulement à l'ouverture initiale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-close quand il ne reste plus aucune lettre non lue.
  useEffect(() => {
    if (!open) return;
    if (nonLus.length > 0) return;
    onClose();
  }, [open, nonLus.length, onClose]);

  if (!open || nonLus.length === 0) return null;

  return (
    <BottomSheet open={open} onClose={onClose} title="— Courrier du jour —">
      {nonLus.map((c) => {
        const recompenseArgent =
          c.payload.type === "lettre" && c.payload.recompense?.argent;
        if (c.type === "huissier") {
          return (
            <div key={c.id} style={huissierCard}>
              {renderHuissier(c)}
              <button
                type="button"
                style={closeBtn}
                onClick={() => {
                  playClick();
                  onMarquerLu(c.id);
                }}
              >
                Compris ✕
              </button>
            </div>
          );
        }
        return (
          <div key={c.id}>
            <article style={lettreCard}>{renderLettre(c)}</article>
            <div style={recupererWrap}>
              {recompenseArgent ? (
                <button
                  type="button"
                  style={recupererBtn}
                  onClick={() => {
                    playCash();
                    onMarquerLu(c.id);
                  }}
                >
                  Récupérer {recompenseArgent} €
                </button>
              ) : (
                <button
                  type="button"
                  style={recupererBtn}
                  onClick={() => {
                    playClick();
                    onMarquerLu(c.id);
                  }}
                >
                  Compris
                </button>
              )}
            </div>
          </div>
        );
      })}
    </BottomSheet>
  );
}
