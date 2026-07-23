"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { estMissionLivrable } from "@/lib/missions";
import { prochainMinuitLocalMs, prochainLundiLocalMs } from "@/lib/quetes/periode";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomTemplate, titreCourrier } from "@/lib/i18n/contenu";
import { CommandeRow } from "./CommandeRow";
import type { Courrier, GameState, MissionResolution } from "@/types/game";

interface OngletCommandesProps {
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

/* ─── Onglet Commandes (contenu scrollable du registre) ─── */

export function OngletCommandes({ state, onLivrerMission, tempsConfiance }: OngletCommandesProps) {
  const { locale, d, tr } = useLangue();
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

  if (actives.length === 0 && terminees.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "30px 10px" }}>
        {d.carnet.aucuneCommande}
      </p>
    );
  }

  return (
    <>
      {renderSection(d.carnet.sectionPrincipales, principales)}
      {renderSection(
        d.carnet.sectionQuotidiennes,
        quotidiennes,
        tr(d.carnet.renouvellement, { t: formatRestant(resteQuotidien) }),
      )}
      {renderSection(
        d.carnet.sectionHebdomadaires,
        hebdomadaires,
        tr(d.carnet.renouvellement, { t: formatRestant(resteHebdo) }),
      )}
      {terminees.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setTermineesVisibles((v) => !v)}
            style={{ ...sectionLabel, background: "none", border: "none", width: "100%", cursor: "pointer" }}
          >
            {d.carnet.terminees} {termineesVisibles ? "▾" : "▸"}
          </button>
          {termineesVisibles &&
            terminees.map((m) => {
              const c = byId.get(m.courrierId);
              if (!c || c.payload.type !== "mission") return null;
              const cibleTemplateId = c.payload.cibles[0]?.templateId;
              const couleur = m.statut === "livree" ? "#2c5e3f" : "#a31f1f";
              return (
                <div
                  key={m.courrierId}
                  style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 14px", opacity: 0.55, fontFamily: "var(--font-serif)", fontSize: 11, color: "#3a2f1e" }}
                >
                  <span style={{ textDecoration: "line-through" }}>
                    {titreCourrier(c, locale)} —{" "}
                    {cibleTemplateId ? nomTemplate(cibleTemplateId, locale) : ""}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", color: couleur }}>
                    {m.statut === "livree"
                      ? tr(d.carnet.livreeJour, { n: m.jourResolution ?? 0 })
                      : tr(d.carnet.expireeJour, { n: m.jourResolution ?? 0 })}
                  </span>
                </div>
              );
            })}
        </>
      )}
    </>
  );
}
