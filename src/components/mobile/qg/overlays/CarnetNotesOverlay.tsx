"use client";

import { useEffect, useMemo, type CSSProperties } from "react";
import { getTemplate } from "@/data/objetTemplates";
import { estMissionLivrable } from "@/lib/missions";
import type {
  Courrier,
  CourrierPayloadMission,
  GameState,
  MissionResolution,
} from "@/types/game";

interface CarnetNotesOverlayProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onLivrerMission: (courrierId: string) => { ok: boolean; raison?: string };
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

const carteActive: CSSProperties = {
  padding: "10px 12px",
  border: "1px solid rgba(110,31,31,0.3)",
  background: "rgba(255,250,235,0.5)",
  marginBottom: 10,
  borderRadius: 2,
};

const carteTerminee: CSSProperties = {
  padding: "6px 12px",
  marginBottom: 6,
  borderRadius: 2,
  opacity: 0.55,
  fontFamily: "var(--font-serif)",
  fontSize: 11,
  color: "#3a2f1e",
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
};

const livrerBtn: CSSProperties = {
  marginTop: 10,
  width: "100%",
  padding: "8px 12px",
  background: "#6e1f1f",
  color: "#f4e9cd",
  border: "none",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  cursor: "pointer",
  borderRadius: 2,
};

/* ─── Cartes ─── */

function MissionActiveCarte({
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
  const cible0 = p.cibles[0];
  const tpl = getTemplate(cible0?.templateId ?? "");
  const nomCible = tpl?.nom ?? cible0?.templateId ?? "";
  const livrable = reso.statut === "active" && estMissionLivrable(p, state.inventaireJoueur);
  return (
    <article style={livrable ? { ...carteActive, borderColor: "#6e1f1f" } : carteActive}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "#1a1308" }}>{p.titre}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: livrable ? "#6e1f1f" : "#5e4a25" }}>
          {livrable ? "Livrable" : "Active"}
        </div>
      </div>
      <div style={{ marginTop: 6, fontFamily: "var(--font-serif)", fontSize: 11, color: "#3a2f1e" }}>
        Demande : <strong>{nomCible}</strong>
        {cible0?.etatMin ? ` · ${cible0.etatMin} min.` : ""}
      </div>
      <div style={{ marginTop: 2, fontFamily: "var(--font-serif)", fontSize: 11, color: "#3a2f1e" }}>
        Récompense : <strong>+{p.recompense.argent} €</strong>
      </div>
      {p.jourLimite !== undefined && (
        <div style={{ marginTop: 2, fontFamily: "var(--font-mono)", fontSize: 10, color: p.jourLimite - state.jourActuel <= 3 ? "#a31f1f" : "#5e4a25" }}>
          Avant le jour {p.jourLimite} (J−{Math.max(0, p.jourLimite - state.jourActuel)})
        </div>
      )}
      {livrable && (
        <button type="button" onClick={onLivrer} style={livrerBtn}>
          Livrer
        </button>
      )}
    </article>
  );
}

function MissionTermineeCarte({
  courrier,
  reso,
}: {
  courrier: Courrier;
  reso: MissionResolution;
}) {
  if (courrier.payload.type !== "mission") return null;
  const p = courrier.payload;
  const cible0 = p.cibles[0];
  const tpl = getTemplate(cible0?.templateId ?? "");
  const nomCible = tpl?.nom ?? cible0?.templateId ?? "";
  const couleurStatut = reso.statut === "livree" ? "#2c5e3f" : "#a31f1f";
  const libelleStatut = reso.statut === "livree" ? `Livrée J${reso.jourResolution}` : `Expirée J${reso.jourResolution}`;
  return (
    <div style={carteTerminee}>
      <span style={{ textDecoration: "line-through" }}>
        {p.titre} — {nomCible}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: couleurStatut }}>
        {libelleStatut}
      </span>
    </div>
  );
}

/* ─── Composant principal ─── */

export function CarnetNotesOverlay({ open, onClose, state, onLivrerMission }: CarnetNotesOverlayProps) {
  const courriersById = useMemo(() => new Map(state.courriers.map((c) => [c.id, c])), [state.courriers]);
  const actives = useMemo(
    () =>
      [...state.missions]
        .filter((m) => m.statut === "active")
        .sort((a, b) => {
          const ca = courriersById.get(a.courrierId);
          const cb = courriersById.get(b.courrierId);
          const la = ca && ca.payload.type === "mission" ? ca.payload.jourLimite ?? Infinity : Infinity;
          const lb = cb && cb.payload.type === "mission" ? cb.payload.jourLimite ?? Infinity : Infinity;
          if (la !== lb) return la - lb;
          return (ca?.jourRecu ?? 0) - (cb?.jourRecu ?? 0);
        }),
    [state.missions, courriersById],
  );
  const terminees = useMemo(
    () =>
      [...state.missions]
        .filter((m) => m.statut !== "active")
        .sort((a, b) => (b.jourResolution ?? 0) - (a.jourResolution ?? 0)),
    [state.missions],
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

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={carnet}>
          <div style={ruban} aria-hidden />
          <button type="button" style={closeBtn} onClick={onClose} aria-label="Fermer">✕</button>
          <div style={enTete}>
            <h2 style={titre}>Carnet de commande</h2>
            <div style={sousTitre}>Jour {state.jourActuel}</div>
          </div>
          <div style={contenu}>
            {state.missions.length === 0 ? (
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "30px 10px" }}>
                Aucune mission reçue pour l'instant.
              </p>
            ) : (
              <>
                <div style={{ ...sectionLabel, marginTop: 0, borderTop: "none" }}>— En cours —</div>
                {actives.length === 0 ? (
                  <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "6px 10px" }}>
                    Aucune mission en cours.
                  </p>
                ) : (
                  actives.map((m) => {
                    const c = courriersById.get(m.courrierId);
                    if (!c) return null;
                    return (
                      <MissionActiveCarte
                        key={m.courrierId}
                        courrier={c}
                        reso={m}
                        state={state}
                        onLivrer={() => onLivrerMission(m.courrierId)}
                      />
                    );
                  })
                )}
                {terminees.length > 0 && (
                  <>
                    <div style={sectionLabel}>— Terminées —</div>
                    {terminees.map((m) => {
                      const c = courriersById.get(m.courrierId);
                      if (!c) return null;
                      return <MissionTermineeCarte key={m.courrierId} courrier={c} reso={m} />;
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
