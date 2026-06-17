"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { agregerJournees, type JourneeHistorique } from "@/lib/historiqueJournalier";
import type { GameState, Session } from "@/types/game";
import { SessionSummary, type SummaryItem } from "@/components/SessionSummary";

interface CahierDeCompteOverlayProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
}

/* ─── styles ─── */

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
  display: "grid",
  placeItems: "center",
  padding: "max(16px, env(safe-area-inset-top)) 12px max(16px, env(safe-area-inset-bottom))",
};

const cahier: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 480,
  maxHeight: "92dvh",
  background: "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  border: "1px solid #b89c5e",
  boxShadow: "inset 0 0 28px rgba(120,90,40,0.18), 0 12px 28px rgba(0,0,0,0.35)",
  borderRadius: 3,
  transform: "rotate(-0.4deg)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const closeBtn: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  width: 32,
  height: 32,
  borderRadius: 16,
  background: "rgba(20,15,5,0.45)",
  border: "1px solid rgba(217,192,122,0.5)",
  color: "var(--brass-300)",
  fontSize: 14,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  zIndex: 2,
};

const enTete: CSSProperties = {
  padding: "18px 20px 8px",
  borderBottom: "2px solid #1a1308",
  textAlign: "center",
};

const titre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  letterSpacing: "0.04em",
  color: "#1a1308",
  margin: 0,
};

const sousTitre: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#5e4a25",
  marginTop: 4,
};

const contenu: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "12px 14px 18px",
};

const ligneStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "36px 1fr auto 18px",
  alignItems: "center",
  gap: 8,
  padding: "10px 6px",
  borderBottom: "1px dotted #c8b48a",
  cursor: "pointer",
};

const jourCellule: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "#5e4a25",
};

const typeCellule: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 9,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#5e4a25",
};

const libelleCellule: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 12,
  color: "#1a1308",
};

function netStyle(net: number): CSSProperties {
  return {
    fontFamily: "var(--font-display)",
    fontSize: 13,
    color: net > 0 ? "#2c5e3f" : net < 0 ? "#a31f1f" : "#5e4a25",
    fontWeight: Math.abs(net) >= 100 ? 700 : 400,
  };
}

function typeLabel(t: JourneeHistorique["type"]): string {
  if (t === "chinage") return "Chinage";
  if (t === "vente") return "Vente";
  return "Repos";
}

/* ─── Détail repos (inline) ─── */

function DetailRepos({ journee }: { journee: JourneeHistorique }) {
  return (
    <div style={{ padding: "8px 12px 12px", background: "rgba(255,250,235,0.5)" }}>
      <ul style={{ margin: 0, padding: "0 0 0 14px", fontFamily: "var(--font-serif)", fontSize: 12, color: "#3a2f1e" }}>
        {journee.entries.map((e) => (
          <li key={e.id}>
            {e.designation}
            {e.recette > 0 ? <span style={{ color: "#2c5e3f" }}> +{e.recette} €</span> : null}
            {e.depense > 0 ? <span style={{ color: "#a31f1f" }}> −{e.depense} €</span> : null}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 6, fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
        Solde après : {journee.soldeFin} €
      </div>
    </div>
  );
}

/* ─── Composant principal ─── */

export function CahierDeCompteOverlay({ open, onClose, state }: CahierDeCompteOverlayProps) {
  const [reposExpanded, setReposExpanded] = useState<Set<number>>(new Set());
  const [replayOf, setReplayOf] = useState<Session | null>(null);
  const journees = useMemo(() => agregerJournees(state.grandLivre, state.historique), [state.grandLivre, state.historique]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (replayOf) setReplayOf(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, replayOf]);

  if (!open) return null;

  if (replayOf) {
    const session = replayOf;
    const items: SummaryItem[] =
      session.type === "chinage"
        ? session.achats.map((a) => ({ templateId: a.templateId, nom: a.nom, categorie: a.categorie, prix: a.prixPaye }))
        : session.ventes.map((v) => ({ templateId: v.templateId, nom: v.nom, categorie: v.categorie, prix: v.prixVente }));
    const titreReplay = session.type === "chinage" ? session.brocanteNom : `Marché du jour J${session.jour}`;
    return (
      <>
        <div style={scrim} onClick={() => setReplayOf(null)} aria-hidden />
        <div style={stage} role="dialog" aria-modal="true">
          <SessionSummary
            type={session.type}
            titre={titreReplay}
            items={items}
            xpGagne={session.xpGagne}
            retourLabel="Retour au Cahier"
            xpReplayMode
            onRetour={() => setReplayOf(null)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={cahier}>
          <button type="button" style={closeBtn} onClick={onClose} aria-label="Fermer">✕</button>
          <div style={enTete}>
            <h2 style={titre}>Cahier de Compte</h2>
            <div style={sousTitre}>Jour {state.jourActuel} · Solde {state.budget} €</div>
          </div>
          <div style={contenu}>
            {journees.length === 0 ? (
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "30px 10px" }}>
                Aucune écriture.
              </p>
            ) : (
              journees.map((j) => {
                const peutReplay = j.session !== null;
                const isExpanded = reposExpanded.has(j.jour);
                return (
                  <div key={j.jour}>
                    <div
                      style={ligneStyle}
                      onClick={() => {
                        if (peutReplay) setReplayOf(j.session);
                        else {
                          setReposExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(j.jour)) next.delete(j.jour);
                            else next.add(j.jour);
                            return next;
                          });
                        }
                      }}
                    >
                      <span style={jourCellule}>J{j.jour}</span>
                      <span>
                        <div style={typeCellule}>{typeLabel(j.type)}</div>
                        <div style={libelleCellule}>{j.libelle}</div>
                      </span>
                      <span style={netStyle(j.net)}>
                        {j.net > 0 ? `+${j.net}` : j.net} €
                      </span>
                      <span style={{ color: "#5e4a25" }}>
                        {!peutReplay && isExpanded ? "▾" : "▸"}
                      </span>
                    </div>
                    {!peutReplay && isExpanded && <DetailRepos journee={j} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
