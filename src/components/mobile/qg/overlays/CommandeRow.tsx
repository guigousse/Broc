"use client";

import { type CSSProperties } from "react";
import { getTemplate } from "@/data/objetTemplates";
import { getExpediteur } from "@/data/expediteursCourrier";
import { progressionMission } from "@/lib/missions";
import { objectifsDeMission, progressionObjectif, missionLivrable } from "@/lib/quetes/objectifs";
import { ItemImage } from "@/components/ui/ItemImage";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import { corpsCourrier, nomTemplate, nomExpediteur, personnaliteExpediteur, titreCourrier } from "@/lib/i18n/contenu";
import type { DictionnaireUI } from "@/lib/i18n/ui";
import type { Courrier, GameState, ObjectifMission } from "@/types/game";

interface Props {
  courrier: Courrier;
  state: GameState;
  ouvert: boolean;
  onToggle: () => void;
  onLivrer: () => void;
}

const row: CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, width: "100%",
  padding: "10px 12px", background: "transparent", border: "none",
  borderBottom: "1px solid rgba(110,31,31,0.18)", cursor: "pointer", textAlign: "left",
};
const avatar: CSSProperties = {
  width: 42, height: 42, borderRadius: "50%", flex: "0 0 auto",
  border: "2px solid #c8a24a", objectFit: "cover", objectPosition: "top center", background: "#d9c79a",
  display: "grid", placeItems: "center", color: "#6e1f1f",
  fontFamily: "var(--font-display)", fontSize: 16, overflow: "hidden",
};
const ligneObjectif: CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "5px 0", borderBottom: "1px dashed rgba(110,31,31,0.18)", fontSize: 12, color: "#2b2418",
};

/** Libellé localisé d'un objectif de chapitre (hors cibles "objet", déjà
 *  rendues via `cibles`). `restauration` interpole l'état minimum requis. */
function libelleObjectif(
  o: ObjectifMission,
  d: DictionnaireUI,
  tr: (gabarit: string, params?: Record<string, string | number>) => string,
): string {
  switch (o.type) {
    case "ventesCumulees":
      return d.carnet.objectifs.ventesCumulees;
    case "profitVente":
      return d.carnet.objectifs.profitVente;
    case "restauration":
      return tr(d.carnet.objectifs.restauration, { etat: libelleEtat(o.etatMin, d) });
    case "valeurCollection":
      return d.carnet.objectifs.valeurCollection;
    case "niveau":
      return d.carnet.objectifs.niveau;
    case "objet":
      return "";
  }
}

export function CommandeRow({ courrier, state, ouvert, onToggle, onLivrer }: Props) {
  const { locale, d, tr } = useLangue();
  if (courrier.payload.type !== "mission") return null;
  const p = courrier.payload;
  const exp = getExpediteur(p.expediteurId);
  const nomExp = exp ? nomExpediteur(p.expediteurId, locale) : null;
  const prog = progressionMission(p, state.inventaireJoueur);
  const reso = state.missions.find((m) => m.courrierId === courrier.id);
  const livrable = reso ? missionLivrable(p, reso, state, courrier.jourRecu) : false;
  // Progression agrégée sur TOUS les objectifs (cibles objets + objectifs non-objet),
  // pas seulement les cibles objets (`progressionMission`) : pour les chapitres sans
  // cible (ex. ventesCumulees), `prog.total` vaut 0 et donnerait un faux "0/0" /
  // une barre à largeur NaN%.
  const resoPourObjectifs = reso ?? { courrierId: courrier.id, statut: "active" as const };
  const objectifsTous = objectifsDeMission(p);
  const totalObjectifs = objectifsTous.length;
  const rempliesObjectifs = objectifsTous.filter(
    (o) => progressionObjectif(o, state, resoPourObjectifs, courrier.jourRecu).atteint,
  ).length;
  const jLimite = p.jourLimite;
  const jRestants = jLimite !== undefined ? Math.max(0, jLimite - state.jourActuel) : null;

  return (
    <div>
      <button type="button" style={row} onClick={onToggle} aria-expanded={ouvert}>
        {exp?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={exp.avatar} alt="" style={avatar} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <span style={avatar}>{nomExp?.[0] ?? "?"}</span>
        )}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 13, color: "#1a1308" }}>{titreCourrier(courrier, locale)}</span>
          <span style={{ display: "block", fontFamily: "var(--font-serif)", fontSize: 11, color: "#7a6a44" }}>
            {exp ? `${nomExp} · ${personnaliteExpediteur(p.expediteurId, locale)}` : ""}
          </span>
        </span>
        <span style={{ textAlign: "right", flex: "0 0 auto" }}>
          {livrable ? (
            <span style={{ display: "inline-block", background: "#2c5e3f", color: "#f4e9cd", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 10 }}>{d.carnet.pret}</span>
          ) : (
            <>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#8a6d2e", fontSize: 13 }}>{rempliesObjectifs}/{totalObjectifs}</span>
              {totalObjectifs > 0 && (
                <span style={{ display: "block", width: 46, height: 5, background: "#e3d7b6", borderRadius: 3, marginTop: 3, overflow: "hidden" }}>
                  <span style={{ display: "block", width: `${(rempliesObjectifs / totalObjectifs) * 100}%`, height: "100%", background: "#c8a24a" }} />
                </span>
              )}
            </>
          )}
          {jRestants !== null && (
            <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, marginTop: 2, color: jRestants <= 3 ? "#a31f1f" : "#8a7a52" }}>J−{jRestants}</span>
          )}
        </span>
      </button>

      {ouvert && (
        <div style={{ padding: "4px 14px 14px", background: "rgba(255,250,235,0.45)", borderBottom: "1px solid rgba(110,31,31,0.18)" }}>
          {corpsCourrier(courrier, locale).map((para, i) => (
            <p key={i} style={{ fontStyle: "italic", color: "#4a3f28", fontSize: 12, margin: "6px 0" }}>{para}</p>
          ))}
          <div style={{ fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6e1f1f", margin: "8px 0 4px" }}>
            {tr(d.carnet.objetsDemandes, { rempli: prog.remplies, total: prog.total })}
          </div>
          {p.cibles.map((cible, i) => {
            const tpl = getTemplate(cible.templateId);
            const ok = prog.ciblesRemplies[i];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px dashed rgba(110,31,31,0.18)", opacity: ok ? 1 : 0.7 }}>
                <span style={{ width: 30, height: 30, flex: "0 0 auto" }}>
                  <ItemImage templateId={cible.templateId} categorie={tpl?.categorie ?? "Maison"} alt="" fallbackIconSize={20} />
                </span>
                <span style={{ flex: 1, fontSize: 12, color: "#2b2418" }}>
                  {nomTemplate(cible.templateId, locale)}
                  {cible.etatMin ? <span style={{ display: "block", fontSize: 10, color: "#8a7a52" }}>{tr(d.carnet.etatMin, { etat: libelleEtat(cible.etatMin, d) })}</span> : null}
                </span>
                <span style={{ color: ok ? "#2c5e3f" : "#b3a06a", fontWeight: 700 }}>{ok ? "✓" : "○"}</span>
              </div>
            );
          })}
          {objectifsDeMission(p).filter((o) => o.type !== "objet").map((o, i) => {
            const progObj = progressionObjectif(o, state, reso ?? { courrierId: courrier.id, statut: "active" }, courrier.jourRecu);
            return (
              <div key={i} style={ligneObjectif}>
                <span>{libelleObjectif(o, d, tr)}</span>
                <span style={{ fontWeight: 700, color: progObj.atteint ? "#2c5e3f" : "#7a6a44" }}>
                  {progObj.actuel}/{progObj.cible}{o.type !== "niveau" && o.type !== "restauration" ? " €" : ""}
                </span>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            <span style={{ fontSize: 12, color: "#4a3f28" }}>{d.carnet.recompenseLabel} <b style={{ color: "#8a6d2e" }}>+{p.recompense.argent} €</b></span>
            <button
              type="button"
              onClick={onLivrer}
              disabled={!livrable}
              style={{
                background: livrable ? "#6e1f1f" : "#b3a06a", color: "#f4e9cd", border: "none",
                borderRadius: 6, padding: "8px 16px", fontFamily: "var(--font-display)", fontSize: 11,
                letterSpacing: "0.14em", textTransform: "uppercase", cursor: livrable ? "pointer" : "default",
                opacity: livrable ? 1 : 0.6,
              }}
            >
              {livrable ? d.carnet.livrer : tr(d.carnet.livrerProgress, { rempli: rempliesObjectifs, total: totalObjectifs })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
