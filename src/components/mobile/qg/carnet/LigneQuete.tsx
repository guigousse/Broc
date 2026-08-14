"use client";

import { type CSSProperties } from "react";
import { Coins, Gem, Package, TrendingUp, type LucideIcon } from "lucide-react";
import { getTemplate } from "@/data/objetTemplates";
import { getExpediteur } from "@/data/expediteursCourrier";
import { ItemImage } from "@/components/ui/ItemImage";
import { progressionMission } from "@/lib/missions";
import { objectifsDeMission, progressionObjectif, missionLivrable } from "@/lib/quetes/objectifs";
import { ICONE_FORME, type FormeQuete } from "@/lib/quetes/formes";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import { corpsCourrier, nomTemplate, nomExpediteur, titreCourrier } from "@/lib/i18n/contenu";
import { recompenseEffective } from "@/lib/recompenses";
import { libelleObjectif, objectifEnEuros } from "./objectifs";
import { PhotoScotchee } from "./PhotoScotchee";
import { PaveRecompense } from "./PaveRecompense";
import type { Courrier, GameState, ObjectifMission } from "@/types/game";

interface Props {
  courrier: Courrier;
  state: GameState;
  ouvert: boolean;
  onToggle: () => void;
  onLivrer: () => void;
  enCeremonie?: boolean;
  /** Cérémonie d'une AUTRE quête en cours : pavé grisé (tap refusé). */
  livrerVerrouille?: boolean;
}

/**
 * Composants Lucide indexés par leur PROPRE nom — c'est le seul pont dont on a
 * besoin entre `ICONE_FORME` (qui donne des noms de chaînes, source de vérité
 * côté ①) et les composants réels : on ne recopie pas la table forme→icône,
 * on résout juste le nom qu'elle rend.
 */
const ICONES_LUCIDE: Record<string, LucideIcon> = { Gem, TrendingUp, Coins, Package };

/**
 * Déduit la forme de quête (au sens `ICONE_FORME`) depuis le type du premier
 * objectif non-"objet". Les types hors périmètre périodique (`restauration`,
 * `valeurCollection`, `niveau`) n'ont pas de forme — `null`, cadre vide plutôt
 * qu'une exception : une quête périodique ne les porte jamais, mais la ligne
 * ne doit pas se briser si un jour elle le fait.
 */
function formeDepuisObjectif(type: ObjectifMission["type"]): FormeQuete | null {
  switch (type) {
    case "objetsRares":
      return "objetsRares";
    case "beneficeCumule":
      return "beneficeCumule";
    case "ventesCumulees":
      return "chiffreAffaires";
    case "profitVente":
      return "profitVente";
    case "ventesCategorie":
      return "ventesCategorie";
    default:
      return null;
  }
}

const carte: CSSProperties = {
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  borderRadius: 6,
  margin: "8px 0",
  overflow: "hidden",
};
const ligneWrap: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "stretch",
  gap: 10,
  padding: "10px 10px 10px 8px",
};
const zoneTogglee: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flex: 1,
  minWidth: 0,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  textAlign: "left",
  font: "inherit",
  color: "inherit",
};
const colonneGauche: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  flex: "0 0 auto",
};
const plusPastille: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--ink-500)",
  background: "var(--paper-300)",
  border: "1px solid var(--brass-500)",
  borderRadius: 4,
  padding: "2px 6px",
};
const colonneCentre: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 3,
};
const titreStyle: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-display)",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--ink-900)",
  lineHeight: 1.25,
};
const demandeStyle: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-serif)",
  fontSize: 12,
  color: "var(--ink-500)",
};
const barreWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 4,
};
const barreFond: CSSProperties = {
  flex: 1,
  height: 6,
  background: "var(--paper-300)",
  borderRadius: 4,
  overflow: "hidden",
};
const barreRemplissage = (pct: number): CSSProperties => ({
  display: "block",
  width: `${pct}%`,
  height: "100%",
  background: "var(--brass-500)",
  transition: "width 300ms ease",
});
const compteurStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--ink-500)",
  whiteSpace: "nowrap",
};
const colonnePave: CSSProperties = {
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
};
const detailWrap: CSSProperties = {
  padding: "4px 14px 14px",
  background: "var(--paper-200)",
  borderTop: "1px dashed var(--brass-500)",
};
const paragrapheStyle: CSSProperties = {
  fontStyle: "italic",
  color: "var(--ink-700)",
  fontSize: 14,
  lineHeight: 1.45,
  margin: "8px 0",
};
const sousTitreDetail: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-700)",
  margin: "10px 0 4px",
};
const ligneCible: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "7px 0",
  borderBottom: "1px dashed var(--paper-400)",
};
const ligneObjectifDetail: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "6px 0",
  borderBottom: "1px dashed var(--paper-400)",
  fontSize: 14,
  color: "var(--ink-700)",
};

/**
 * Ligne d'une quête périodique (quotidienne/hebdomadaire) dans le carnet.
 * Remplace `CommandeRow` pour ces quêtes-là. Deux cibles tapables distinctes
 * dans la même ligne : le corps (titre + progression) déplie/replie via
 * `onToggle`, le pavé de droite (`PaveRecompense`) livre via `onLivrer` — il
 * N'EST PAS enfant du bouton de dépliage.
 */
export function LigneQuete({
  courrier,
  state,
  ouvert,
  onToggle,
  onLivrer,
  enCeremonie = false,
  livrerVerrouille = false,
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
   * retomberaient à zéro pile à l'instant du payoff. On force donc
   * l'affichage « accompli » tant que la carte est maintenue à l'écran.
   */
  const accompli = enCeremonie;
  const rEff = recompenseEffective(p);
  // Progression agrégée sur TOUS les objectifs (cibles objets + objectifs non-objet),
  // pas seulement les cibles objets (`progressionMission`) : pour les quêtes sans
  // cible (ex. beneficeCumule), `prog.total` vaut 0 et donnerait un faux "0/0" /
  // une barre à largeur NaN%.
  const resoPourObjectifs = reso ?? { courrierId: courrier.id, statut: "active" as const };
  const objectifsTous = objectifsDeMission(p);
  const totalObjectifs = objectifsTous.length;
  const rempliesObjectifs = objectifsTous.filter(
    (o) => progressionObjectif(o, state, resoPourObjectifs, courrier.jourRecu).atteint,
  ).length;
  const premierObjectifNonObjet = objectifsTous.find((o) => o.type !== "objet") ?? null;
  const progPremierObjectif = premierObjectifNonObjet
    ? progressionObjectif(premierObjectifNonObjet, state, resoPourObjectifs, courrier.jourRecu)
    : null;
  /**
   * « La demande en une ligne » (brief). Sans cible, le visuel de gauche est
   * une icône générique (`beneficeCumule` et `chiffreAffaires` PARTAGENT
   * `TrendingUp` dans `ICONE_FORME`) : sans ce libellé, une quête de marge et
   * une quête de chiffre d'affaires sont visuellement indiscernables au
   * premier coup d'œil, alors que les titres de gabarit ne le sont pas non
   * plus (pure saveur, pas le nom de la métrique). Avec des cibles, la photo
   * de l'objet suffit à lever l'ambiguïté : on garde l'expéditeur.
   */
  const demandeAffichee =
    p.cibles.length === 0 && premierObjectifNonObjet
      ? libelleObjectif(premierObjectifNonObjet, d, tr)
      : nomExp ?? "";
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
    ? `${accompli ? progPremierObjectif.cible : progPremierObjectif.actuel} / ${progPremierObjectif.cible}${objectifEnEuros(objectifChiffre.type) ? " €" : ""}`
    : `${accompli ? totalObjectifs : rempliesObjectifs}/${totalObjectifs}`;
  /** Le pavé s'allume dès que c'est livrable, ou de force en cérémonie (le
   *  state post-livraison ferait retomber `livrable` à false pile au payoff). */
  const bandeauPret = livrable || accompli;
  /** Verrouillé pendant SA PROPRE cérémonie (déjà livrée, un second tap serait
   *  une double livraison) ou pendant celle d'une autre quête. */
  const paveVerrouille = accompli || livrerVerrouille;

  // Visuel de gauche : une photo par cible (jusqu'à 4, puis « +n »), sinon
  // l'icône Lucide de la forme du premier objectif chiffré.
  const forme = premierObjectifNonObjet ? formeDepuisObjectif(premierObjectifNonObjet.type) : null;
  const nomIconeForme = forme ? ICONE_FORME[forme] : null;
  const IconeForme = nomIconeForme ? ICONES_LUCIDE[nomIconeForme] : null;
  const iconeAccompli = accompli || (progPremierObjectif?.atteint ?? false);

  return (
    <div data-commande-id={courrier.id} style={carte}>
      <div style={ligneWrap}>
        <button type="button" style={zoneTogglee} onClick={onToggle} aria-expanded={ouvert}>
          <span style={colonneGauche}>
            {p.cibles.length > 0 ? (
              <>
                {p.cibles.slice(0, 4).map((cible, i) => {
                  const tpl = getTemplate(cible.templateId);
                  const ok = accompli || prog.ciblesRemplies[i];
                  return (
                    <PhotoScotchee
                      key={i}
                      templateId={cible.templateId}
                      categorie={tpl?.categorie ?? "Maison"}
                      taille={56}
                      inclinaison={i % 2 === 0 ? -3 : 2}
                      accompli={ok}
                      alt={nomTemplate(cible.templateId, locale)}
                    />
                  );
                })}
                {p.cibles.length > 4 && (
                  <span style={plusPastille} data-testid="apercu-plus">+{p.cibles.length - 4}</span>
                )}
              </>
            ) : (
              <PhotoScotchee
                icone={IconeForme ?? undefined}
                taille={56}
                accompli={iconeAccompli}
              />
            )}
          </span>
          <span style={colonneCentre}>
            <span style={titreStyle}>{titreCourrier(courrier, locale)}</span>
            <span style={demandeStyle} data-testid="ligne-demande">{demandeAffichee}</span>
            <span style={barreWrap}>
              <span style={barreFond}>
                <span data-testid="progression-barre" style={barreRemplissage(pct)} />
              </span>
              <span data-testid="progression-compteur" style={compteurStyle}>{compteur}</span>
            </span>
          </span>
        </button>
        <div style={colonnePave}>
          <PaveRecompense
            recompense={rEff}
            livrable={bandeauPret}
            verrouille={paveVerrouille}
            onLivrer={onLivrer}
          />
        </div>
      </div>

      {ouvert && (
        <div style={detailWrap}>
          {corpsCourrier(courrier, locale).map((para, i) => (
            <p key={i} style={paragrapheStyle}>{para}</p>
          ))}
          {p.cibles.length > 0 && (
            <>
              <div style={sousTitreDetail}>
                {tr(d.carnet.objetsDemandes, { rempli: accompli ? prog.total : prog.remplies, total: prog.total })}
              </div>
              {p.cibles.map((cible, i) => {
                const tpl = getTemplate(cible.templateId);
                const ok = accompli || prog.ciblesRemplies[i];
                return (
                  <div key={i} style={{ ...ligneCible, opacity: ok ? 1 : 0.7 }}>
                    <span style={{ width: 48, height: 48, flex: "0 0 auto" }}>
                      <ItemImage templateId={cible.templateId} categorie={tpl?.categorie ?? "Maison"} alt="" fallbackIconSize={26} />
                    </span>
                    <span style={{ flex: 1, fontSize: 14, color: "var(--ink-700)" }}>
                      {nomTemplate(cible.templateId, locale)}
                      {cible.etatMin ? (
                        <span style={{ display: "block", fontSize: 12, color: "var(--ink-500)" }}>
                          {tr(d.carnet.etatMin, { etat: libelleEtat(cible.etatMin, d) })}
                        </span>
                      ) : null}
                    </span>
                    <span style={{ color: ok ? "var(--patina-500)" : "var(--ink-300)", fontWeight: 700, fontSize: 16 }}>
                      {ok ? "✓" : "○"}
                    </span>
                  </div>
                );
              })}
            </>
          )}
          {objectifsDeMission(p).filter((o) => o.type !== "objet").map((o, i) => {
            const progObj = progressionObjectif(o, state, resoPourObjectifs, courrier.jourRecu);
            const atteint = accompli || progObj.atteint;
            return (
              <div key={i} style={ligneObjectifDetail}>
                <span>{libelleObjectif(o, d, tr)}</span>
                <span data-testid="objectif-detail-compteur" style={{ fontWeight: 700, color: atteint ? "var(--patina-500)" : "var(--ink-500)" }}>
                  {accompli ? progObj.cible : progObj.actuel}/{progObj.cible}{objectifEnEuros(o.type) ? " €" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
