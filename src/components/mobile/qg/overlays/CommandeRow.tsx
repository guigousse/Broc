"use client";

import { type CSSProperties } from "react";
import { getTemplate } from "@/data/objetTemplates";
import { getExpediteur } from "@/data/expediteursCourrier";
import { progressionMission } from "@/lib/missions";
import { objectifsDeMission, progressionObjectif, missionLivrable } from "@/lib/quetes/objectifs";
import { ItemImage } from "@/components/ui/ItemImage";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import { corpsCourrier, nomTemplate, nomExpediteur, titreCourrier } from "@/lib/i18n/contenu";
import { recompenseEffective } from "@/lib/recompenses";
import { RecompenseJetons } from "@/components/mobile/qg/RecompenseJetons";
import type { DictionnaireUI } from "@/lib/i18n/ui";
import type { Courrier, GameState, ObjectifMission } from "@/types/game";

interface Props {
  courrier: Courrier;
  state: GameState;
  ouvert: boolean;
  onToggle: () => void;
  onLivrer: () => void;
  enCeremonie?: boolean;
  /** Cérémonie d'une AUTRE commande en cours : bouton Livrer grisé (tap refusé). */
  livrerVerrouille?: boolean;
}

const carte: CSSProperties = {
  background: "rgba(255,250,235,0.6)",
  border: "1px solid rgba(110,31,31,0.35)",
  borderRadius: 6,
  margin: "8px 0",
  overflow: "hidden",
};
const row: CSSProperties = {
  position: "relative",
  display: "flex", alignItems: "stretch", gap: 12, width: "100%",
  padding: "12px 12px 10px", background: "transparent", border: "none",
  cursor: "pointer", textAlign: "left",
};
const avatar: CSSProperties = {
  width: 92, height: 92, borderRadius: 14, flex: "0 0 auto",
  border: "2px solid #c8a24a", boxShadow: "inset 0 0 0 2px #f4e9cd",
  objectFit: "cover", objectPosition: "top center", background: "#d9c79a",
  display: "grid", placeItems: "center", color: "#6e1f1f",
  fontFamily: "var(--font-display)", fontSize: 32, overflow: "hidden",
};
/* Colonne centrale : hauteur calée sur l'avatar (92px) — le titre s'aligne
 * sur le haut de la photo, les vignettes (marginTop auto) sur son bas. */
const blocCentral: CSSProperties = {
  flex: 1, minWidth: 0, minHeight: 92,
  display: "flex", flexDirection: "column",
};
const apercuRow: CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, marginTop: "auto",
  paddingTop: 8, flexWrap: "wrap",
};
const apercuVignette: CSSProperties = {
  position: "relative", width: 44, height: 44,
  background: "#fdf8ec", border: "1px solid rgba(110,31,31,0.25)", borderRadius: 4,
};
const apercuBadge = (ok: boolean): CSSProperties => ({
  position: "absolute", top: -6, right: -6, width: 15, height: 15,
  borderRadius: 8, display: "grid", placeItems: "center",
  fontSize: 9, fontWeight: 700, color: "#f4e9cd",
  background: ok ? "#2c5e3f" : "#b3a06a",
});
const apercuPlus: CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#7a6438",
  background: "#eadfc0", border: "1px solid rgba(110,31,31,0.25)",
  borderRadius: 4, padding: "2px 5px",
};
const apercuObjectif: CSSProperties = {
  display: "block", fontFamily: "var(--font-mono)", fontSize: 10,
  color: "#7a6438", marginTop: "auto", paddingTop: 8,
};
const ligneObjectif: CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "6px 0", borderBottom: "1px dashed rgba(110,31,31,0.18)", fontSize: 14, color: "#2b2418",
};
const pastilleEcheance = (urgent: boolean): CSSProperties => ({
  position: "absolute", top: 10, right: 12,
  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
  color: urgent ? "#f4e9cd" : "#8a7a52",
  background: urgent ? "#a31f1f" : "transparent",
  border: urgent ? "none" : "1px solid rgba(138,122,82,0.5)",
  borderRadius: 9, padding: "1px 7px",
});
const barreWrap: CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 8,
};
const barreFond: CSSProperties = {
  flex: 1, height: 7, background: "#e3d7b6", borderRadius: 4, overflow: "hidden",
  boxShadow: "inset 0 1px 2px rgba(110,31,31,0.18)",
};
const barreRemplissage = (pct: number): CSSProperties => ({
  display: "block", width: `${pct}%`, height: "100%",
  background: "linear-gradient(180deg, #d9b45e, #c8a24a)",
  transition: "width 300ms ease",
});
const compteurStyle: CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
  color: "#8a6d2e", whiteSpace: "nowrap",
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

export function CommandeRow({
  courrier, state, ouvert, onToggle, onLivrer,
  enCeremonie = false, livrerVerrouille = false,
}: Props) {
  const { locale, d, tr } = useLangue();
  if (courrier.payload.type !== "mission") return null;
  const p = courrier.payload;
  const exp = getExpediteur(p.expediteurId);
  const nomExp = exp ? nomExpediteur(p.expediteurId, locale) : null;
  const prog = progressionMission(p, state.inventaireJoueur);
  const reso = state.missions.find((m) => m.courrierId === courrier.id);
  const livrable = reso ? missionLivrable(p, reso, state, courrier.jourRecu) : false;
  /**
   * Cérémonie en cours : le state est DÉJÀ post-livraison (objets consommés,
   * mission « livree »), donc tous les calculs de progression ci-dessous
   * retomberaient à zéro — badges ○, barre vide, « Prêt ✓ » → « Récompense »,
   * bouton « Livrer (0/1) » grisé — pile à l'instant du payoff. On force donc
   * l'affichage « accompli » tant que la carte est maintenue à l'écran.
   */
  const accompli = enCeremonie;
  const rEff = recompenseEffective(p);
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
  const premierObjectifNonObjet = objectifsTous.find((o) => o.type !== "objet") ?? null;
  const progPremierObjectif = premierObjectifNonObjet
    ? progressionObjectif(premierObjectifNonObjet, state, resoPourObjectifs, courrier.jourRecu)
    : null;
  // Progression affichée : objectif chiffré unique (aucune cible objet, un
  // seul objectif non-objet) → « actuel / cible € » fin-grain ; sinon agrégat
  // « remplies / total » (mêmes garde-fous 0/0-NaN qu'avant).
  const objectifChiffre =
    p.cibles.length === 0 && objectifsTous.length === 1 ? premierObjectifNonObjet : null;
  const pct = accompli
    ? 100
    : objectifChiffre && progPremierObjectif
    ? Math.min(100, (progPremierObjectif.actuel / Math.max(1, progPremierObjectif.cible)) * 100)
    : totalObjectifs > 0 ? (rempliesObjectifs / totalObjectifs) * 100 : 0;
  const compteur = objectifChiffre && progPremierObjectif
    ? `${accompli ? progPremierObjectif.cible : progPremierObjectif.actuel} / ${progPremierObjectif.cible}${objectifChiffre.type !== "niveau" && objectifChiffre.type !== "restauration" ? " €" : ""}`
    : `${accompli ? totalObjectifs : rempliesObjectifs}/${totalObjectifs}`;
  /** Libellé/état du bandeau : livrable, ou maintenu « accompli » en cérémonie. */
  const bandeauPret = livrable || accompli;
  /** Le bouton Livrer n'accepte le tap que hors cérémonie (la sienne ou une autre). */
  const boutonActif = livrable && !accompli && !livrerVerrouille;

  return (
    <div style={carte}>
      <button type="button" style={row} onClick={onToggle} aria-expanded={ouvert}>
        {exp?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={exp.avatar} alt="" style={avatar} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <span style={avatar}>{nomExp?.[0] ?? "?"}</span>
        )}
        <span style={blocCentral}>
          <span style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 15, color: "#1a1308", lineHeight: 1.25, paddingRight: jRestants !== null ? 44 : 0 }}>
            {titreCourrier(courrier, locale)}
          </span>
          <span style={{ display: "block", fontFamily: "var(--font-serif)", fontSize: 11, color: "#7a6a44" }}>
            {nomExp ?? ""}
          </span>
          {p.cibles.length > 0 ? (
            <span style={apercuRow}>
              {p.cibles.slice(0, 4).map((cible, i) => {
                const tpl = getTemplate(cible.templateId);
                const ok = accompli || prog.ciblesRemplies[i];
                return (
                  <span key={i} style={apercuVignette} data-testid="apercu-cible">
                    <ItemImage templateId={cible.templateId} categorie={tpl?.categorie ?? "Maison"} alt="" fallbackIconSize={26} />
                    <span style={apercuBadge(!!ok)} aria-hidden>{ok ? "✓" : "○"}</span>
                  </span>
                );
              })}
              {p.cibles.length > 4 && (
                <span style={apercuPlus} data-testid="apercu-plus">+{p.cibles.length - 4}</span>
              )}
            </span>
          ) : premierObjectifNonObjet ? (
            <span style={apercuObjectif}>{libelleObjectif(premierObjectifNonObjet, d, tr)}</span>
          ) : null}
          <span style={barreWrap}>
            <span style={barreFond}>
              <span data-testid="progression-barre" style={barreRemplissage(pct)} />
            </span>
            <span data-testid="progression-compteur" style={compteurStyle}>{compteur}</span>
          </span>
        </span>
        {jRestants !== null && (
          <span style={pastilleEcheance(jRestants <= 3)}>J−{jRestants}</span>
        )}
      </button>
      <RecompenseJetons
        recompense={rEff}
        variante="bandeau"
        label={bandeauPret ? d.carnet.pret : d.carnet.recompenseLabel}
        allume={bandeauPret}
      />

      {ouvert && (
        <div style={{ padding: "4px 14px 14px", background: "rgba(255,250,235,0.45)", borderTop: "1px dashed rgba(110,31,31,0.25)" }}>
          {corpsCourrier(courrier, locale).map((para, i) => (
            <p key={i} style={{ fontStyle: "italic", color: "#4a3f28", fontSize: 14, lineHeight: 1.45, margin: "8px 0" }}>{para}</p>
          ))}
          <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6e1f1f", margin: "10px 0 4px" }}>
            {tr(d.carnet.objetsDemandes, { rempli: accompli ? prog.total : prog.remplies, total: prog.total })}
          </div>
          {p.cibles.map((cible, i) => {
            const tpl = getTemplate(cible.templateId);
            const ok = accompli || prog.ciblesRemplies[i];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px dashed rgba(110,31,31,0.18)", opacity: ok ? 1 : 0.7 }}>
                <span style={{ width: 52, height: 52, flex: "0 0 auto" }}>
                  <ItemImage templateId={cible.templateId} categorie={tpl?.categorie ?? "Maison"} alt="" fallbackIconSize={30} />
                </span>
                <span style={{ flex: 1, fontSize: 14, color: "#2b2418" }}>
                  {nomTemplate(cible.templateId, locale)}
                  {cible.etatMin ? <span style={{ display: "block", fontSize: 12, color: "#8a7a52" }}>{tr(d.carnet.etatMin, { etat: libelleEtat(cible.etatMin, d) })}</span> : null}
                </span>
                <span style={{ color: ok ? "#2c5e3f" : "#b3a06a", fontWeight: 700, fontSize: 16 }}>{ok ? "✓" : "○"}</span>
              </div>
            );
          })}
          {objectifsDeMission(p).filter((o) => o.type !== "objet").map((o, i) => {
            const progObj = progressionObjectif(o, state, reso ?? { courrierId: courrier.id, statut: "active" }, courrier.jourRecu);
            const atteint = accompli || progObj.atteint;
            return (
              <div key={i} style={ligneObjectif}>
                <span>{libelleObjectif(o, d, tr)}</span>
                <span style={{ fontWeight: 700, color: atteint ? "#2c5e3f" : "#7a6a44" }}>
                  {accompli ? progObj.cible : progObj.actuel}/{progObj.cible}{o.type !== "niveau" && o.type !== "restauration" ? " €" : ""}
                </span>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button
              type="button"
              onClick={onLivrer}
              disabled={!boutonActif}
              style={{
                background: accompli ? "#2c5e3f" : boutonActif ? "#6e1f1f" : "#b3a06a", color: "#f4e9cd", border: "none",
                borderRadius: 6, padding: "8px 16px", fontFamily: "var(--font-display)", fontSize: 11,
                letterSpacing: "0.14em", textTransform: "uppercase", cursor: boutonActif ? "pointer" : "default",
                opacity: accompli || boutonActif ? 1 : 0.6,
              }}
            >
              {accompli
                ? d.carnet.pret
                : livrable
                ? d.carnet.livrer
                : tr(d.carnet.livrerProgress, { rempli: rempliesObjectifs, total: totalObjectifs })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
