"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getTemplate } from "@/data/objetTemplates";
import { estMissionLivrable } from "@/lib/missions";
import { prochainMinuitLocalMs, prochainLundiLocalMs } from "@/lib/quetes/periode";
import { CommandeRow } from "./CommandeRow";
import type { Courrier, GameState, MissionResolution } from "@/types/game";

interface CarnetNotesOverlayProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onLivrerMission: (courrierId: string) => { ok: boolean; raison?: string };
  /** Temps de confiance (epoch ms) ; `Date.now()` à défaut. */
  tempsConfiance?: () => number | null;
}

function formatRestant(ms: number): string {
  const min = Math.max(0, Math.ceil(ms / 60000));
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
  }
  return `${min} min`;
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

const carnet: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 360,
  maxHeight: "85dvh",
  backgroundColor: "#f4e9cd",
  /* deux couches : lignes horizontales pâles (tile 24px) + dégradé crème de base. */
  backgroundImage: [
    "linear-gradient(180deg, transparent 0, transparent 21px, rgba(200,181,138,0.45) 22px, transparent 23px)",
    "linear-gradient(180deg, #f4e9cd 0%, #ecdfb6 100%)",
  ].join(", "),
  backgroundSize: "100% 24px, 100% 100%",
  backgroundRepeat: "repeat, no-repeat",
  border: "2px solid #6e1f1f",
  borderRadius: 4,
  boxShadow: "inset 0 0 30px rgba(120, 60, 40, 0.15), 0 14px 28px rgba(0,0,0,0.4)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const closeBtn: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  width: 30,
  height: 30,
  borderRadius: 15,
  background: "#6e1f1f",
  border: "1px solid #b03030",
  color: "#f4e9cd",
  fontSize: 13,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  zIndex: 2,
};

const ruban: CSSProperties = {
  position: "absolute",
  top: -6,
  left: "70%",
  width: 18,
  height: 40,
  background: "linear-gradient(180deg, #c43030 0%, #911f1f 100%)",
  borderRadius: "0 0 3px 3px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
  zIndex: 1,
  pointerEvents: "none",
};

const enTete: CSSProperties = {
  padding: "18px 20px 10px",
  textAlign: "center",
  borderBottom: "1px solid rgba(110,31,31,0.4)",
};

const titre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 18,
  letterSpacing: "0.06em",
  color: "#6e1f1f",
  margin: 0,
};

const sousTitre: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
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

const sectionLabel: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "#6e1f1f",
  textAlign: "center",
  padding: "10px 0 6px",
  borderTop: "1px dotted rgba(110,31,31,0.35)",
  marginTop: 10,
};

const sectionSousLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#7a6438",
  textAlign: "center",
  padding: "0 0 6px",
};

/* ─── tri des missions actives ─── */

function trierActives(
  missions: MissionResolution[],
  byId: Map<string, Courrier>,
  inv: GameState["inventaireJoueur"],
) {
  return [...missions].sort((a, b) => {
    const ca = byId.get(a.courrierId);
    const cb = byId.get(b.courrierId);
    const pa = ca?.payload.type === "mission" ? ca.payload : null;
    const pb = cb?.payload.type === "mission" ? cb.payload : null;
    const lva = pa && estMissionLivrable(pa, inv) ? 0 : 1;
    const lvb = pb && estMissionLivrable(pb, inv) ? 0 : 1;
    if (lva !== lvb) return lva - lvb; // livrables d'abord
    const ja = pa?.jourLimite ?? Infinity;
    const jb = pb?.jourLimite ?? Infinity;
    if (ja !== jb) return ja - jb; // échéance proche
    return (ca?.jourRecu ?? 0) - (cb?.jourRecu ?? 0);
  });
}

/* ─── Composant principal ─── */

export function CarnetNotesOverlay({ open, onClose, state, onLivrerMission, tempsConfiance }: CarnetNotesOverlayProps) {
  const [ouvertId, setOuvertId] = useState<string | null>(null);
  const [termineesVisibles, setTermineesVisibles] = useState(false);
  const [, tick] = useState(0);
  const byId = useMemo(() => new Map(state.courriers.map((c) => [c.id, c])), [state.courriers]);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const actives = useMemo(() => state.missions.filter((m) => m.statut === "active"), [state.missions]);

  const principales = useMemo(
    () =>
      trierActives(
        actives.filter((m) => {
          const c = byId.get(m.courrierId);
          return c?.payload.type === "mission" && c.payload.categorie === "principale";
        }),
        byId,
        state.inventaireJoueur,
      ),
    [actives, byId, state.inventaireJoueur],
  );

  const quotidiennes = useMemo(
    () =>
      trierActives(
        actives.filter((m) => {
          const c = byId.get(m.courrierId);
          return c?.payload.type === "mission" && c.payload.categorie === "quotidienne";
        }),
        byId,
        state.inventaireJoueur,
      ),
    [actives, byId, state.inventaireJoueur],
  );

  const hebdomadaires = useMemo(
    () =>
      trierActives(
        actives.filter((m) => {
          const c = byId.get(m.courrierId);
          return c?.payload.type === "mission" && c.payload.categorie === "hebdomadaire";
        }),
        byId,
        state.inventaireJoueur,
      ),
    [actives, byId, state.inventaireJoueur],
  );

  const terminees = useMemo(
    () =>
      [...state.missions]
        .filter((m) => m.statut !== "active")
        .sort((a, b) => (b.jourResolution ?? 0) - (a.jourResolution ?? 0)),
    [state.missions],
  );

  const nbLivrables = useMemo(
    () =>
      actives.filter((m) => {
        const c = byId.get(m.courrierId);
        return c?.payload.type === "mission" && estMissionLivrable(c.payload, state.inventaireJoueur);
      }).length,
    [actives, byId, state.inventaireJoueur],
  );

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

  if (!open) return null;

  const now = tempsConfiance?.() ?? Date.now();
  const resteQuotidien = prochainMinuitLocalMs(now) - now;
  const resteHebdo = prochainLundiLocalMs(now) - now;

  const renderSection = (label: string, liste: MissionResolution[], sousLabel?: string) => {
    if (liste.length === 0) return null;
    return (
      <>
        <div style={sectionLabel}>{label}</div>
        {sousLabel ? <div style={sectionSousLabel}>{sousLabel}</div> : null}
        {liste.map((m) => {
          const c = byId.get(m.courrierId);
          if (!c) return null;
          return (
            <CommandeRow
              key={m.courrierId}
              courrier={c}
              state={state}
              ouvert={ouvertId === m.courrierId}
              onToggle={() => setOuvertId((id) => (id === m.courrierId ? null : m.courrierId))}
              onLivrer={() => onLivrerMission(m.courrierId)}
            />
          );
        })}
      </>
    );
  };

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={carnet}>
          <div style={ruban} aria-hidden />
          <button type="button" style={closeBtn} onClick={onClose} aria-label="Fermer">✕</button>
          <div style={enTete}>
            <h2 style={titre}>Carnet de commandes</h2>
            <div style={sousTitre}>
              Jour {state.jourActuel}
              {nbLivrables > 0 ? ` · ${nbLivrables} livrable${nbLivrables > 1 ? "s" : ""}` : ""}
            </div>
          </div>
          <div style={contenu}>
            {actives.length === 0 && terminees.length === 0 ? (
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "30px 10px" }}>
                Aucune commande pour l&apos;instant.
              </p>
            ) : (
              <>
                {renderSection("Commandes principales", principales)}
                {renderSection(
                  "Commandes quotidiennes",
                  quotidiennes,
                  `Renouvellement dans ${formatRestant(resteQuotidien)}`,
                )}
                {renderSection(
                  "Commandes hebdomadaires",
                  hebdomadaires,
                  `Renouvellement dans ${formatRestant(resteHebdo)}`,
                )}
                {terminees.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setTermineesVisibles((v) => !v)}
                      style={{ ...sectionLabel, background: "none", border: "none", width: "100%", cursor: "pointer" }}
                    >
                      Terminées {termineesVisibles ? "▾" : "▸"}
                    </button>
                    {termineesVisibles &&
                      terminees.map((m) => {
                        const c = byId.get(m.courrierId);
                        if (!c || c.payload.type !== "mission") return null;
                        const tpl = getTemplate(c.payload.cibles[0]?.templateId ?? "");
                        const couleur = m.statut === "livree" ? "#2c5e3f" : "#a31f1f";
                        return (
                          <div
                            key={m.courrierId}
                            style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 14px", opacity: 0.55, fontFamily: "var(--font-serif)", fontSize: 11, color: "#3a2f1e" }}
                          >
                            <span style={{ textDecoration: "line-through" }}>
                              {c.payload.titre} — {tpl?.nom ?? ""}
                            </span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", color: couleur }}>
                              {m.statut === "livree" ? `Livrée J${m.jourResolution}` : `Expirée J${m.jourResolution}`}
                            </span>
                          </div>
                        );
                      })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
