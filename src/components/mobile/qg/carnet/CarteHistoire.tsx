"use client";

import { type CSSProperties } from "react";
import { Coins, Gem, Package, TrendingUp, type LucideIcon } from "lucide-react";
import { getTemplate } from "@/data/objetTemplates";
import { progressionMission } from "@/lib/missions";
import { objectifsDeMission, progressionObjectif, missionLivrable } from "@/lib/quetes/objectifs";
import { ICONE_FORME, type FormeQuete } from "@/lib/quetes/formes";
import { useLangue } from "@/lib/i18n/LangueContext";
import { titreCourrier, corpsCourrier, nomTemplate } from "@/lib/i18n/contenu";
import { recompenseEffective } from "@/lib/recompenses";
import { libelleObjectif, objectifEnEuros } from "./objectifs";
import { PhotoScotchee } from "./PhotoScotchee";
import { PaveRecompense } from "./PaveRecompense";
import type { Courrier, GameState, ObjectifMission } from "@/types/game";

interface Props {
  courrier: Courrier;
  state: GameState;
  onLivrer: () => void;
  enCeremonie?: boolean;
  /** Cérémonie d'une AUTRE quête en cours : pavé grisé (tap refusé). */
  livrerVerrouille?: boolean;
}

/**
 * Composants Lucide indexés par leur PROPRE nom — même pont que `LigneQuete`
 * entre `ICONE_FORME` (noms de chaînes) et les composants réels. Dupliqué ici
 * plutôt que partagé : les deux cartes sont volontairement indépendantes,
 * seule la FORME du problème (progression d'objectifs) est commune.
 */
const ICONES_LUCIDE: Record<string, LucideIcon> = { Gem, TrendingUp, Coins, Package };

/** Déduit la forme de quête (au sens `ICONE_FORME`) depuis le type du premier
 *  objectif non-"objet". Même logique que `LigneQuete.tsx` (voir son
 *  commentaire) : les types hors périmètre périodique n'ont pas de forme. */
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

/** Une étape déjà livrée dans le fil, avec son courrier (persistant : les
 *  chapitres de trame ne sont jamais purgés, contrairement aux périodiques). */
interface EtapeLivree {
  courrier: Courrier;
  jourResolution: number;
}

/**
 * Les deux derniers chapitres livrés avant celui en cours, triés
 * chronologiquement (le plus ancien des deux en premier). Au tout premier
 * chapitre, retourne un tableau vide — c'est le cas normal, pas dégradé.
 */
function chapitresRecents(state: GameState, courrierActuelId: string): EtapeLivree[] {
  const livres: EtapeLivree[] = [];
  for (const m of state.missions) {
    if (m.statut !== "livree" || m.courrierId === courrierActuelId) continue;
    const c = state.courriers.find((cc) => cc.id === m.courrierId);
    if (!c || c.payload.type !== "mission" || c.payload.categorie !== "principale") continue;
    livres.push({ courrier: c, jourResolution: m.jourResolution ?? 0 });
  }
  livres.sort((a, b) => b.jourResolution - a.jourResolution);
  return livres.slice(0, 2).reverse();
}

const carte: CSSProperties = {
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  borderRadius: 8,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};
const enteteWrap: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
};
const colonnePolaroid: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 6,
  flex: "0 0 auto",
};
const secondairesWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
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
const colonneTexte: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};
const surtitreStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};
const titreStyle: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-display)",
  fontSize: 18,
  fontWeight: 800,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
  color: "var(--ink-900)",
  lineHeight: 1.2,
};
const premierePhraseStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 13,
  lineHeight: 1.4,
  color: "var(--ink-700)",
};
const objectifBlock: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  paddingTop: 10,
  borderTop: "1px dashed var(--brass-500)",
};
const objectifTexte: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};
const objectifLabel: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 13,
  color: "var(--ink-700)",
};
const barreWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
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
};
const filWrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  paddingTop: 6,
  borderTop: "1px dashed var(--brass-500)",
};
const etapeLigne = (couleur: string, poids: number, style: "normal" | "italic" = "normal"): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 0",
  fontFamily: "var(--font-serif)",
  fontSize: 13,
  fontStyle: style,
  fontWeight: poids,
  color: couleur,
});
const marqueurStyle: CSSProperties = {
  flex: "0 0 auto",
  width: 16,
  textAlign: "center",
};

/**
 * Carte de la trame principale (« la carte d'histoire ») : un polaroïd de
 * l'objet demandé par le grand-père, l'objectif du chapitre en cours avec sa
 * barre, le pavé de récompense, puis le fil des chapitres — les deux derniers
 * livrés, celui en cours (◉), et « ??? ». Une seule à l'écran à la fois
 * (`chapitrePret` refuse d'offrir le suivant tant que le précédent n'est pas
 * livré) : contrairement à `LigneQuete`, pas de dépliage/repliage.
 */
export function CarteHistoire({ courrier, state, onLivrer, enCeremonie = false, livrerVerrouille = false }: Props) {
  const { locale, d, tr } = useLangue();
  if (courrier.payload.type !== "mission") return null;
  const p = courrier.payload;
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
  /** Étiquette de l'objectif : le libellé du premier objectif chiffré s'il y
   *  en a un, sinon (cibles pures) le décompte des objets demandés — mêmes
   *  garde-fous 0/0 que `LigneQuete`. */
  const labelObjectif = premierObjectifNonObjet
    ? libelleObjectif(premierObjectifNonObjet, d, tr)
    : tr(d.carnet.objetsDemandes, { rempli: accompli ? prog.total : prog.remplies, total: prog.total });

  const bandeauPret = livrable || accompli;
  const paveVerrouille = accompli || livrerVerrouille;

  const forme = premierObjectifNonObjet ? formeDepuisObjectif(premierObjectifNonObjet.type) : null;
  const nomIconeForme = forme ? ICONE_FORME[forme] : null;
  const IconeForme = nomIconeForme ? ICONES_LUCIDE[nomIconeForme] : null;
  const iconeAccompli = accompli || (progPremierObjectif?.atteint ?? false);

  const fil = chapitresRecents(state, courrier.id);

  return (
    <div data-commande-id={courrier.id} style={carte}>
      <div style={enteteWrap}>
        <span style={colonnePolaroid}>
          {p.cibles.length > 0 ? (
            <>
              <PhotoScotchee
                templateId={p.cibles[0].templateId}
                categorie={getTemplate(p.cibles[0].templateId)?.categorie ?? "Maison"}
                taille={84}
                inclinaison={-3}
                accompli={accompli || prog.ciblesRemplies[0]}
                alt={nomTemplate(p.cibles[0].templateId, locale)}
              />
              {p.cibles.length > 1 && (
                <span style={secondairesWrap}>
                  {p.cibles.slice(1, 4).map((cible, i) => {
                    const tpl = getTemplate(cible.templateId);
                    return (
                      <PhotoScotchee
                        key={i}
                        templateId={cible.templateId}
                        categorie={tpl?.categorie ?? "Maison"}
                        taille={40}
                        inclinaison={i % 2 === 0 ? 3 : -2}
                        accompli={accompli || prog.ciblesRemplies[i + 1]}
                        alt={nomTemplate(cible.templateId, locale)}
                      />
                    );
                  })}
                  {p.cibles.length > 4 && (
                    <span style={plusPastille} data-testid="apercu-plus">+{p.cibles.length - 4}</span>
                  )}
                </span>
              )}
            </>
          ) : (
            <PhotoScotchee
              icone={IconeForme ?? undefined}
              taille={84}
              accompli={iconeAccompli}
            />
          )}
        </span>
        <span style={colonneTexte}>
          <span style={surtitreStyle}>{d.carnet.histoireSurtitre}</span>
          <span style={titreStyle}>{titreCourrier(courrier, locale)}</span>
          <span style={premierePhraseStyle}>{corpsCourrier(courrier, locale)[0] ?? ""}</span>
        </span>
      </div>

      <div style={objectifBlock}>
        <span style={objectifTexte}>
          <span style={surtitreStyle}>{d.carnet.histoireObjectifActuel}</span>
          <span style={objectifLabel}>{labelObjectif}</span>
          <span style={barreWrap}>
            <span style={barreFond}>
              <span data-testid="progression-barre" style={barreRemplissage(pct)} />
            </span>
            <span data-testid="progression-compteur" style={compteurStyle}>{compteur}</span>
          </span>
        </span>
        <span style={colonnePave}>
          <PaveRecompense
            recompense={rEff}
            livrable={bandeauPret}
            verrouille={paveVerrouille}
            onLivrer={onLivrer}
          />
        </span>
      </div>

      <div style={filWrap}>
        {fil.map((etape) => (
          <span key={etape.courrier.id} data-etape-fil style={etapeLigne("var(--ink-500)", 400)}>
            <span aria-hidden style={marqueurStyle}>✓</span>
            <span>{titreCourrier(etape.courrier, locale)}</span>
          </span>
        ))}
        <span data-etape-fil style={etapeLigne("var(--ink-900)", 700)}>
          <span aria-hidden style={marqueurStyle}>◉</span>
          <span>{titreCourrier(courrier, locale)}</span>
        </span>
        <span data-etape-fil style={etapeLigne("var(--ink-300)", 400, "italic")}>
          <span aria-hidden style={marqueurStyle}>?</span>
          <span>{d.carnet.histoireInconnu}</span>
        </span>
      </div>
    </div>
  );
}
