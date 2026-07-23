"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { missionsLivrables } from "@/lib/quetes/objectifs";
import { SessionSummary, type SummaryItem } from "@/components/SessionSummary";
import { getBrocanteById } from "@/data/brocantes";
import { nomBrocante } from "@/lib/i18n/contenu";
import { useLangue } from "@/lib/i18n/LangueContext";
import { OngletCommandes } from "./OngletCommandes";
import { OngletComptes } from "./OngletComptes";
import type { GameState, Session } from "@/types/game";

export type OngletRegistre = "commandes" | "comptes";

interface RegistreOverlayProps {
  open: boolean;
  onglet: OngletRegistre;
  onOngletChange: (o: OngletRegistre) => void;
  onClose: () => void;
  state: GameState;
  onLivrerMission: (courrierId: string) => { ok: boolean; raison?: string };
  /** Temps de confiance (epoch ms) ; `Date.now()` à défaut. */
  tempsConfiance?: () => number | null;
  /** Commande à ouvrir (accordéon + scroll) à l'ouverture de l'onglet Commandes. */
  missionInitialeId?: string | null;
}

/* ─── styles ─── */

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.55)",
  zIndex: 50,
  animation: "broc-fade-in 160ms ease",
};

/* La fenêtre est ancrée entre le header supérieur et la TabBar : onglets
 * compris, rien ne chevauche le chrome, et la hauteur est identique quel que
 * soit l'onglet actif (le châssis remplit tout l'espace disponible). */
const stage: CSSProperties = {
  position: "fixed",
  top: "calc(var(--safe-top) + var(--mobile-header-h) + 8px)",
  left: 0,
  right: 0,
  bottom: "calc(var(--mobile-tabbar-h) + var(--safe-bottom) + 8px)",
  zIndex: 51,
  display: "flex",
  justifyContent: "center",
  padding: "0 12px",
};

const colonne: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  height: "100%",
  display: "flex",
  flexDirection: "column",
};

const carnetChassis: CSSProperties = {
  position: "relative",
  flex: 1,
  minHeight: 0,
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

const ongletsRow: CSSProperties = {
  display: "flex",
  gap: 6,
  padding: "0 18px",
  position: "relative",
  zIndex: 1,
};

const ongletBtn = (actif: boolean): CSSProperties => ({
  padding: actif ? "9px 16px 11px" : "7px 16px 9px",
  marginBottom: -2,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: actif ? "#6e1f1f" : "#7a6438",
  background: actif ? "#f4e9cd" : "#d9c79a",
  border: actif ? "2px solid #6e1f1f" : "2px solid rgba(110,31,31,0.5)",
  borderBottom: actif ? "2px solid #f4e9cd" : "2px solid #6e1f1f",
  borderRadius: "8px 8px 0 0",
  cursor: actif ? "default" : "pointer",
  alignSelf: "flex-end",
});

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

/* Stage spécifique au mode replay : conteneur scrollable plein écran
 * (SessionSummary contient son propre `min-height: 100dvh`, donc on doit
 * permettre au stage de défiler). */
const replayStage: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 51,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
};

/* Bouton de retour flottant, toujours visible en haut à gauche pendant le
 * replay (au cas où le contenu est trop long pour scroller jusqu'au bouton
 * natif du SessionSummary). */
const replayBackBtn: CSSProperties = {
  position: "fixed",
  top: "max(12px, env(safe-area-inset-top))",
  left: 12,
  zIndex: 52,
  padding: "8px 14px",
  background: "rgba(20,15,5,0.85)",
  color: "var(--brass-300)",
  border: "1px solid rgba(217,192,122,0.5)",
  borderRadius: 20,
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
};

/* ─── Composant principal ─── */

export function RegistreOverlay({
  open,
  onglet,
  onOngletChange,
  onClose,
  state,
  onLivrerMission,
  tempsConfiance,
  missionInitialeId,
}: RegistreOverlayProps) {
  const { d, tr, locale } = useLangue();
  const [replayOf, setReplayOf] = useState<Session | null>(null);

  // Livrabilité complète (cibles + objectifs) — même source que les
  // pastilles du QG, sinon une mission à objectif seul gonflerait le compteur.
  const nbLivrables = useMemo(() => missionsLivrables(state).length, [state]);

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
    const titreReplay =
      session.type === "chinage"
        ? nomBrocante(getBrocanteById(session.brocanteId) ?? { id: session.brocanteId, nom: session.brocanteNom }, locale)
        : tr(d.cahier.marcheDuJourN, { n: session.jour });
    return (
      <>
        <div style={scrim} onClick={() => setReplayOf(null)} aria-hidden />
        <div style={replayStage} role="dialog" aria-modal="true">
          <SessionSummary
            type={session.type}
            titre={titreReplay}
            items={items}
            xpGagne={session.xpGagne}
            xpBrocanteur={session.xpBrocanteur}
            retourLabel={d.cahier.retourAuCahier}
            xpReplayMode
            onRetour={() => setReplayOf(null)}
          />
        </div>
        <button
          type="button"
          onClick={() => setReplayOf(null)}
          aria-label={d.cahier.retourAuCahier}
          style={replayBackBtn}
        >
          ← {d.cahier.retour}
        </button>
      </>
    );
  }

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={colonne}>
          <div style={ongletsRow} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={onglet === "commandes"}
              style={ongletBtn(onglet === "commandes")}
              onClick={() => onOngletChange("commandes")}
            >
              {d.registre.ongletCommandes}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={onglet === "comptes"}
              style={ongletBtn(onglet === "comptes")}
              onClick={() => onOngletChange("comptes")}
            >
              {d.registre.ongletComptes}
            </button>
          </div>
          <div style={carnetChassis}>
            <button type="button" style={closeBtn} onClick={onClose} aria-label={d.carnet.fermer}>✕</button>
            <div style={enTete}>
              {onglet === "commandes" ? (
                <>
                  <h2 style={titre}>{d.carnet.titre}</h2>
                  <div style={sousTitre}>
                    {tr(d.carnet.jour, { n: state.jourActuel })}
                    {nbLivrables > 0
                      ? tr(nbLivrables > 1 ? d.carnet.livrablesSuffixe_n : d.carnet.livrablesSuffixe_un, { n: nbLivrables })
                      : ""}
                  </div>
                </>
              ) : (
                <>
                  <h2 style={titre}>{d.cahier.titre}</h2>
                  <div style={sousTitre}>{tr(d.cahier.sousTitre, { jour: state.jourActuel, budget: state.budget })}</div>
                </>
              )}
            </div>
            <div style={contenu}>
              {onglet === "commandes" ? (
                <OngletCommandes state={state} onLivrerMission={onLivrerMission} tempsConfiance={tempsConfiance} ouvertInitialId={missionInitialeId ?? null} />
              ) : (
                <OngletComptes state={state} onReplay={setReplayOf} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
