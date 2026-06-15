"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { getTemplate } from "@/data/objetTemplates";
import type {
  Courrier,
  CourrierPayloadMission,
  EtatObjet,
  GameState,
  LedgerEntry,
  MissionResolution,
  Session,
  SessionChinage,
  SessionVente,
} from "@/types/game";

interface CarnetOverlayProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onLivrerMission: (courrierId: string) => { ok: boolean; raison?: string };
}

type Tab = "comptes" | "missions";

const ETATS_ORDRE: EtatObjet[] = ["Mauvais", "Bon", "Très bon", "Pristin état"];

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
  maxWidth: 480,
  maxHeight: "92dvh",
  background: "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  border: "1px solid #b89c5e",
  boxShadow:
    "inset 0 0 28px rgba(120, 90, 40, 0.18), 0 12px 28px rgba(0,0,0,0.35)",
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

const tabsRow: CSSProperties = {
  display: "flex",
  borderBottom: "1px solid #b89c5e",
};

function tabStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    padding: "10px 12px",
    fontFamily: "var(--font-display)",
    fontSize: 11,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    background: active ? "#1a1308" : "transparent",
    color: active ? "#f1e4c0" : "#5e4a25",
    border: "none",
    cursor: "pointer",
    position: "relative",
  };
}

const badgeStyle: CSSProperties = {
  position: "absolute",
  top: 6,
  right: 10,
  background: "#a31f1f",
  color: "#fff",
  borderRadius: 10,
  padding: "1px 6px",
  fontSize: 9,
  fontFamily: "var(--font-mono)",
};

const contenu: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "12px 14px 18px",
};

/* ─── Comptes (tableau lined-paper) ─── */

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
};

const thStyle: CSSProperties = {
  background: "#1a1308",
  color: "#f1e4c0",
  fontFamily: "var(--font-display)",
  fontSize: 9.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  padding: "6px 6px",
  textAlign: "left",
  position: "sticky",
  top: 0,
};

const tdStyle: CSSProperties = {
  padding: "6px 6px",
  borderBottom: "1px dotted #c8b48a",
  verticalAlign: "top",
};

const totalRowStyle: CSSProperties = {
  background: "#efe2bd",
  fontFamily: "var(--font-display)",
  fontSize: 11,
};

/* ─── Helpers ─── */

function kindLabel(k: LedgerEntry["kind"]): string {
  switch (k) {
    case "session_chinage": return "Chinage";
    case "session_vente": return "Vente";
    case "frais_brocante": return "Entrée";
    case "loyer": return "Loyer";
    case "gazette": return "Gazette";
    case "courrier_recompense": return "Courrier";
    case "mission_recompense": return "Mission";
    case "upgrade_atelier": return "Atelier";
    case "upgrade_stockage": return "Stockage";
    case "upgrade_camion": return "Camion";
  }
}

function findSession(state: GameState, sessionId: string): Session | null {
  return state.historique.find((s) => s.id === sessionId) ?? null;
}

function CompteRow({
  e,
  expanded,
  onToggle,
  state,
}: {
  e: LedgerEntry;
  expanded: boolean;
  onToggle: () => void;
  state: GameState;
}) {
  const isSession = e.kind === "session_chinage" || e.kind === "session_vente";
  return (
    <>
      <tr onClick={isSession ? onToggle : undefined} style={{ cursor: isSession ? "pointer" : "default" }}>
        <td style={{ ...tdStyle, width: 36, color: "#5e4a25" }}>J{e.jour}</td>
        <td style={tdStyle}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#5e4a25" }}>
            {kindLabel(e.kind)}
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 12, color: "#1a1308" }}>
            {e.designation} {isSession ? (expanded ? "▾" : "▸") : null}
          </div>
        </td>
        <td style={{ ...tdStyle, textAlign: "right", color: "#2c5e3f", width: 56 }}>
          {e.recette > 0 ? `+${e.recette}` : ""}
        </td>
        <td style={{ ...tdStyle, textAlign: "right", color: "#a31f1f", width: 56 }}>
          {e.depense > 0 ? `−${e.depense}` : ""}
        </td>
        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "var(--font-display)", width: 60 }}>
          {e.soldeApres} €
        </td>
      </tr>
      {expanded && e.sessionId && (() => {
        const sess = findSession(state, e.sessionId);
        if (!sess) return null;
        return (
          <tr>
            <td colSpan={5} style={{ ...tdStyle, background: "rgba(255,250,235,0.5)", paddingTop: 4 }}>
              {sess.type === "chinage" ? <DetailsChinage s={sess} /> : <DetailsVente s={sess} />}
            </td>
          </tr>
        );
      })()}
    </>
  );
}

function DetailsChinage({ s }: { s: SessionChinage }) {
  return (
    <ul style={{ margin: 0, padding: "0 0 0 14px", fontFamily: "var(--font-serif)", fontSize: 11, color: "#3a2f1e" }}>
      {s.achats.map((a, i) => (
        <li key={i}>
          {a.nom} ({a.etat}) — <span style={{ color: "#a31f1f" }}>−{a.prixPaye} €</span>
        </li>
      ))}
    </ul>
  );
}

function DetailsVente({ s }: { s: SessionVente }) {
  return (
    <ul style={{ margin: 0, padding: "0 0 0 14px", fontFamily: "var(--font-serif)", fontSize: 11, color: "#3a2f1e" }}>
      {s.ventes.map((v, i) => (
        <li key={i}>
          {v.nom} ({v.etat}) — <span style={{ color: "#2c5e3f" }}>+{v.prixVente} €</span>
          {v.prixAchat != null ? ` (acheté ${v.prixAchat} €)` : ""}
        </li>
      ))}
      {s.invendus > 0 && (
        <li style={{ fontStyle: "italic", color: "#5e4a25" }}>
          {s.invendus} invendu{s.invendus > 1 ? "s" : ""}.
        </li>
      )}
    </ul>
  );
}

function OngletComptes({ state }: { state: GameState }) {
  const entries = useMemo(
    () => [...state.grandLivre].sort((a, b) => b.timestamp - a.timestamp),
    [state.grandLivre],
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  if (entries.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "30px 10px" }}>
        Aucune écriture.
      </p>
    );
  }
  const totalRec = entries.reduce((s, e) => s + e.recette, 0);
  const totalDep = entries.reduce((s, e) => s + e.depense, 0);
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>Date</th>
          <th style={thStyle}>Désignation</th>
          <th style={{ ...thStyle, textAlign: "right" }}>Recettes</th>
          <th style={{ ...thStyle, textAlign: "right" }}>Dépenses</th>
          <th style={{ ...thStyle, textAlign: "right" }}>Solde</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <CompteRow
            key={e.id}
            e={e}
            expanded={expanded.has(e.id)}
            onToggle={() => {
              setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(e.id)) next.delete(e.id);
                else next.add(e.id);
                return next;
              });
            }}
            state={state}
          />
        ))}
        <tr style={totalRowStyle}>
          <td style={tdStyle} colSpan={2}>Total</td>
          <td style={{ ...tdStyle, textAlign: "right", color: "#2c5e3f" }}>+{totalRec}</td>
          <td style={{ ...tdStyle, textAlign: "right", color: "#a31f1f" }}>−{totalDep}</td>
          <td style={{ ...tdStyle, textAlign: "right" }}>{state.budget} €</td>
        </tr>
      </tbody>
    </table>
  );
}

/* ─── Missions (cartes) ─── */

function statutLabel(s: MissionResolution["statut"], livrable: boolean): string {
  if (s === "livree") return "Livrée";
  if (s === "expiree") return "Expirée";
  return livrable ? "Livrable" : "Active";
}

function statutColor(s: MissionResolution["statut"], livrable: boolean): string {
  if (s === "livree") return "#2c5e3f";
  if (s === "expiree") return "#5e4a25";
  return livrable ? "#a31f1f" : "#5e4a25";
}

const missionCard: CSSProperties = {
  padding: "12px 14px",
  border: "1px solid #b89c5e",
  background: "rgba(255,250,235,0.65)",
  marginBottom: 12,
  borderRadius: 2,
};

function MissionCarte({
  courrier,
  reso,
  state,
  onLivrer,
}: {
  courrier: Courrier;
  reso: MissionResolution;
  state: GameState;
  onLivrer: () => void;
}) {
  if (courrier.payload.type !== "mission") return null;
  const p: CourrierPayloadMission = courrier.payload;
  const tpl = getTemplate(p.cible.templateId);
  const nomCible = tpl?.nom ?? p.cible.templateId;
  const minIdx = p.cible.etatMin ? ETATS_ORDRE.indexOf(p.cible.etatMin) : 0;
  const livrable =
    reso.statut === "active" &&
    state.inventaireJoueur.some(
      (o) =>
        o.templateId === p.cible.templateId &&
        !o.enRestauration &&
        ETATS_ORDRE.indexOf(o.etat) >= minIdx,
    );
  const grise = reso.statut !== "active";
  return (
    <article style={{ ...missionCard, opacity: grise ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "#1a1308" }}>
          {p.titre}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: statutColor(reso.statut, livrable) }}>
          {statutLabel(reso.statut, livrable)}
        </div>
      </div>
      <div style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "#5e4a25" }}>
        De : {p.expediteurId}
      </div>
      <div style={{ marginTop: 10, fontFamily: "var(--font-serif)", fontSize: 12, color: "#3a2f1e" }}>
        Demande : <strong>{nomCible}</strong>
        {p.cible.etatMin ? ` · ${p.cible.etatMin} min.` : ""}
      </div>
      <div style={{ marginTop: 4, fontFamily: "var(--font-serif)", fontSize: 12, color: "#3a2f1e" }}>
        Récompense : <strong>+{p.recompense.argent} €</strong>
      </div>
      {p.jourLimite !== undefined && (
        <div style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: p.jourLimite - state.jourActuel <= 3 ? "#a31f1f" : "#5e4a25" }}>
          Avant le jour {p.jourLimite} (J−{Math.max(0, p.jourLimite - state.jourActuel)})
        </div>
      )}
      {livrable && (
        <button
          type="button"
          onClick={onLivrer}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "8px 12px",
            background: "#1a1308",
            color: "#f1e4c0",
            border: "none",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
            borderRadius: 2,
          }}
        >
          Livrer
        </button>
      )}
    </article>
  );
}

function OngletMissions({
  state,
  onLivrer,
}: {
  state: GameState;
  onLivrer: (id: string) => void;
}) {
  const courriersById = useMemo(
    () => new Map(state.courriers.map((c) => [c.id, c])),
    [state.courriers],
  );
  const missions = useMemo(
    () => [...state.missions].sort((a, b) => {
      const ca = courriersById.get(a.courrierId);
      const cb = courriersById.get(b.courrierId);
      return (cb?.jourRecu ?? 0) - (ca?.jourRecu ?? 0);
    }),
    [state.missions, courriersById],
  );
  if (missions.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "30px 10px" }}>
        Aucune mission reçue.
      </p>
    );
  }
  return (
    <>
      {missions.map((m) => {
        const c = courriersById.get(m.courrierId);
        if (!c) return null;
        return (
          <MissionCarte
            key={m.courrierId}
            courrier={c}
            reso={m}
            state={state}
            onLivrer={() => onLivrer(m.courrierId)}
          />
        );
      })}
    </>
  );
}

/* ─── Composant principal ─── */

export function CarnetOverlay({ open, onClose, state, onLivrerMission }: CarnetOverlayProps) {
  const [tab, setTab] = useState<Tab>("comptes");

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

  const nbMissionsActives = state.missions.filter((m) => m.statut === "active").length;

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={carnet}>
          <button type="button" style={closeBtn} onClick={onClose} aria-label="Fermer">✕</button>
          <div style={enTete}>
            <h2 style={titre}>Cahier de Compte</h2>
            <div style={sousTitre}>Jour {state.jourActuel} · Solde {state.budget} €</div>
          </div>
          <div style={tabsRow}>
            <button type="button" style={tabStyle(tab === "comptes")} onClick={() => setTab("comptes")}>
              Comptes
            </button>
            <button type="button" style={tabStyle(tab === "missions")} onClick={() => setTab("missions")}>
              Missions
              {nbMissionsActives > 0 && <span style={badgeStyle}>{nbMissionsActives}</span>}
            </button>
          </div>
          <div style={contenu}>
            {tab === "comptes" ? (
              <OngletComptes state={state} />
            ) : (
              <OngletMissions state={state} onLivrer={(id) => onLivrerMission(id)} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
