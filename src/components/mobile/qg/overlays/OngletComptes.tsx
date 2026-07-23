"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { agregerJournees, libelleJournee, type JourneeHistorique } from "@/lib/historiqueJournalier";
import type { Courrier, GameState, Session } from "@/types/game";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleLedger } from "@/lib/i18n/libelles";
import { tr, type DictionnaireUI } from "@/lib/i18n/ui";
import type { Locale } from "@/lib/i18n/locales";

interface OngletComptesProps {
  state: GameState;
  /** Le replay (SessionSummary plein écran) est géré par le RegistreOverlay. */
  onReplay: (session: Session) => void;
}

/* ─── styles ─── */

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

function typeLabel(t: JourneeHistorique["type"], d: DictionnaireUI): string {
  if (t === "chinage") return d.cahier.typeChinage;
  if (t === "vente") return d.cahier.typeVente;
  return d.cahier.typeRepos;
}

/* ─── Détail repos (inline) ─── */

function DetailRepos({
  journee,
  d,
  locale,
  courriers,
}: {
  journee: JourneeHistorique;
  d: DictionnaireUI;
  locale: Locale;
  courriers: Courrier[];
}) {
  return (
    <div style={{ padding: "8px 12px 12px", background: "rgba(255,250,235,0.5)" }}>
      <ul style={{ margin: 0, padding: "0 0 0 14px", fontFamily: "var(--font-serif)", fontSize: 12, color: "#3a2f1e" }}>
        {journee.entries.map((e) => (
          <li key={e.id}>
            {libelleLedger(e, d, locale, courriers)}
            {e.recette > 0 ? <span style={{ color: "#2c5e3f" }}> +{e.recette} €</span> : null}
            {e.depense > 0 ? <span style={{ color: "#a31f1f" }}> −{e.depense} €</span> : null}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 6, fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
        {tr(d.cahier.soldeApres, { solde: journee.soldeFin })}
      </div>
    </div>
  );
}

/* ─── Onglet Comptes (contenu scrollable du registre) ─── */

export function OngletComptes({ state, onReplay }: OngletComptesProps) {
  const { d, locale } = useLangue();
  const [reposExpanded, setReposExpanded] = useState<Set<number>>(new Set());
  const journees = useMemo(() => agregerJournees(state.grandLivre, state.historique), [state.grandLivre, state.historique]);

  if (journees.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "30px 10px" }}>
        {d.cahier.aucuneEcriture}
      </p>
    );
  }

  return (
    <>
      {journees.map((j) => {
        const peutReplay = j.session !== null;
        const isExpanded = reposExpanded.has(j.jour);
        return (
          <div key={j.jour}>
            <div
              style={ligneStyle}
              onClick={() => {
                if (peutReplay) onReplay(j.session as Session);
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
                <div style={typeCellule}>{typeLabel(j.type, d)}</div>
                <div style={libelleCellule}>{libelleJournee(j, d, locale)}</div>
              </span>
              <span style={netStyle(j.net)}>
                {j.net > 0 ? `+${j.net}` : j.net} €
              </span>
              <span style={{ color: "#5e4a25" }}>
                {!peutReplay && isExpanded ? "▾" : "▸"}
              </span>
            </div>
            {!peutReplay && isExpanded && (
              <DetailRepos journee={j} d={d} locale={locale} courriers={state.courriers} />
            )}
          </div>
        );
      })}
    </>
  );
}
