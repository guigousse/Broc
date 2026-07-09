"use client";

import { useState, type CSSProperties } from "react";
import { NegoBar } from "@/components/mobile/NegoBar";
import { HumeurGauge } from "@/components/mobile/HumeurGauge";
import { proposerOffre, ouvrirNegociation, relancerNegociation } from "@/lib/negociation";
import { HUMEUR_FACHE_SEUIL } from "@/lib/personaIllustrations";
import { audioManager } from "@/lib/audio/audioManager";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomVendeur } from "@/lib/i18n/contenu";
import type { NegociationState, ObjetEnVente } from "@/types/game";

/**
 * Tiroir de négociation en bas de la carte de chine — reprend l'allure de la
 * fiche de négociation : image vendeur + actions qui « flottent » au-dessus
 * (sans fond), bandeau nom pleine largeur à coins arrondis, puis contenu crème.
 * Replié : boutons Négocier / Acheter empilés à droite de l'image. Déployé
 * (clic Négocier) : la négo s'ouvre en accordéon, ce qui fait remonter le tout.
 */
export function ChineNegoDrawer({
  item,
  budget,
  plein,
  expanded,
  illustrationSrc,
  illustrationFacheSrc,
  onExpand,
  onCollapse,
  onUpdateNego,
  onConclu,
  onAcheterDirect,
  tchatche,
}: {
  item: ObjetEnVente;
  budget: number;
  plein: boolean;
  expanded: boolean;
  illustrationSrc?: string;
  illustrationFacheSrc?: string;
  onExpand: () => void;
  onCollapse: () => void;
  onUpdateNego: (nego: NegociationState) => void;
  onConclu: (prixFinal: number) => void;
  onAcheterDirect: () => void;
  /** Active de chine « La Tchatche » (N15) : rouvre une négo fâchée/refusée. */
  tchatche?: { restantes: number; consommer: () => boolean };
}) {
  const { d, tr, locale } = useLangue();
  const { prixVendeur, statut, persona } = item;
  const acquis = statut === "achete";
  const facheInitial = item.negociation?.statut === "fache";
  const tropCher = budget < prixVendeur;
  const acheterDisabled = acquis || tropCher || plein;

  const [localNego, setLocalNego] = useState<NegociationState>(
    () =>
      item.negociation ??
      ouvrirNegociation("achat", prixVendeur, item.prixMinAccept),
  );
  const [offreJoueur, setOffreJoueur] = useState<number>(
    Math.max(1, Math.round(prixVendeur * 0.25)),
  );

  const enCours = localNego.statut === "en_cours";
  const estFache =
    localNego.statut === "fache" || localNego.humeur >= HUMEUR_FACHE_SEUIL;
  const illustrationCourante =
    estFache && illustrationFacheSrc ? illustrationFacheSrc : illustrationSrc;

  const handleProposer = () => {
    const next = proposerOffre(localNego, persona, offreJoueur);
    setLocalNego(next);
    onUpdateNego(next);
    if (next.statut === "conclu") {
      audioManager.playCash();
      setTimeout(() => onConclu(offreJoueur), 600);
    }
  };

  const handleRelancer = () => {
    if (!tchatche) return;
    // relancerNegociation renvoie l'état INCHANGÉ (identité) si le statut
    // n'est ni "fache" ni "refus_poli" — notamment "conclu" (achat raté sur
    // budget après une négo conclue, drawer refermé puis rouvert). On calcule
    // AVANT de consommer : sinon le quota persistant de La Tchatche est brûlé
    // pour un effet nul.
    const next = relancerNegociation(localNego);
    if (next === localNego) return;
    if (!tchatche.consommer()) return;
    setLocalNego(next);
    onUpdateNego(next);
  };

  return (
    <div style={drawerStyle(expanded)}>
      {/* Image + actions flottantes, sans fond, au-dessus du bandeau. */}
      <div style={imageZone}>
        {illustrationCourante && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={illustrationCourante} alt={d.chine.altVendeur} style={vendeurImg} />
        )}
        <div style={rightZone}>
          {expanded ? (
            <div style={bubble}>{localNego.message}</div>
          ) : acquis ? (
            <span style={statutTexte("var(--brass-700)")}>{d.chine.acquisStatut}</span>
          ) : facheInitial ? (
            <span style={statutTexte("var(--vermillion-600)")}>{d.chine.vendeurFache}</span>
          ) : plein ? (
            <span style={statutTexte("var(--vermillion-600)")}>{d.qg.stockagePlein}</span>
          ) : (
            <div style={peekBtnRow}>
              <button type="button" style={btn(false)} onClick={onExpand}>
                {d.chine.negocier}
              </button>
              <button
                type="button"
                style={btn(acheterDisabled)}
                disabled={acheterDisabled}
                onClick={onAcheterDirect}
              >
                {tr(d.chine.acheterPrix, { prix: prixVendeur })}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bandeau nom pleine largeur, coins hauts arrondis (comme l'ancienne fiche). */}
      <div style={namePlate}>{nomVendeur(persona.archetype, locale)}</div>

      <div style={accordionOuter(expanded)}>
        <div style={accordionInner}>
          <HumeurGauge humeur={localNego.humeur} />
          <NegoBar
            mode="achat"
            echelleMax={prixVendeur}
            prixAdverse={localNego.prixAdverseCourant}
            prixJoueur={offreJoueur}
            minJoueur={1}
            maxJoueur={localNego.prixAdverseCourant}
            onChangeJoueur={setOffreJoueur}
            readOnly={!enCours}
          />
          <div style={negoBtnRow}>
            {localNego.statut === "refus_poli" ? (
              <>
                {tchatche && (
                  <button
                    type="button"
                    style={btnSecondaryState(tchatche.restantes === 0)}
                    disabled={tchatche.restantes === 0}
                    onClick={handleRelancer}
                  >
                    💬 La Tchatche ({tchatche.restantes})
                  </button>
                )}
                <button
                  type="button"
                  style={tchatche ? btnPrimary : { ...btnPrimary, gridColumn: "1 / -1" }}
                  onClick={() => onConclu(localNego.prixAdverseCourant)}
                >
                  {tr(d.chine.acheterPrixAffiche, { prix: localNego.prixAdverseCourant })}
                </button>
              </>
            ) : enCours ? (
              <>
                <button type="button" style={btnSecondary} onClick={onCollapse}>
                  {d.chine.laisserTomber}
                </button>
                <button type="button" style={btnPrimary} onClick={handleProposer}>
                  {offreJoueur >= localNego.prixAdverseCourant
                    ? tr(d.chine.accepterPrix, { prix: offreJoueur })
                    : tr(d.chine.proposerPrix, { prix: offreJoueur })}
                </button>
              </>
            ) : (
              // Couvre "fache" ET "conclu" (drawer refermé puis rouvert après
              // un achat raté sur budget). La Tchatche ne rouvre que "fache" —
              // sur "conclu" le bouton ne doit pas apparaître (quota épuisé →
              // désactivé, mais toujours affiché avec son compteur).
              <>
                {localNego.statut === "fache" && tchatche && (
                  <button
                    type="button"
                    style={btnSecondaryState(tchatche.restantes === 0)}
                    disabled={tchatche.restantes === 0}
                    onClick={handleRelancer}
                  >
                    💬 La Tchatche ({tchatche.restantes})
                  </button>
                )}
                <button
                  type="button"
                  style={
                    localNego.statut === "fache" && tchatche
                      ? { ...btnSecondary, gridColumn: "2 / 3" }
                      : { ...btnSecondary, gridColumn: "1 / -1" }
                  }
                  onClick={onCollapse}
                >
                  {d.commun.fermer}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Replié : rien ne scrolle/bouge (touch figé). Déployé : la négo peut scroller. */
const drawerStyle = (expanded: boolean): CSSProperties => ({
  flex: "none",
  background: "transparent",
  maxHeight: "82vh",
  overflowY: expanded ? "auto" : "hidden",
  overscrollBehavior: "contain",
  touchAction: expanded ? "pan-y" : "none",
});

/** Zone image + actions sans fond : le vendeur « sort » au-dessus du bandeau. */
const imageZone: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-end",
  gap: 12,
  padding: "8px 16px 0",
};

const vendeurImg: CSSProperties = {
  height: "clamp(112px, 16vh, 148px)",
  width: "auto",
  objectFit: "contain",
  flex: "0 0 auto",
};

/** Espace entre l'image et le bord droit : on y centre le groupe de boutons,
 *  posé 10px au-dessus du bandeau. */
const rightZone: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-end",
};

/** Boutons côte à côte remplissant la largeur dispo, 10px au-dessus du bandeau. */
const peekBtnRow: CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "row",
  gap: 10,
  marginBottom: 10,
};

const bubble: CSSProperties = {
  flex: 1,
  marginBottom: 8,
  padding: "10px 12px",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  borderRadius: 8,
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 13,
  color: "var(--ink-700)",
  lineHeight: 1.4,
};

/** Bandeau nom pleine largeur, coins hauts arrondis (ancienne fiche). */
const namePlate: CSSProperties = {
  padding: "12px 16px",
  background:
    "linear-gradient(180deg, var(--brass-300) 0%, var(--brass-500) 50%, var(--brass-300) 100%)",
  borderBottom: "2px solid var(--brass-700)",
  boxShadow:
    "inset 0 0 0 2px rgba(255,243,213,0.5), inset 0 -3px 0 0 rgba(0,0,0,0.06)",
  borderRadius: "12px 12px 0 0",
  textAlign: "center",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 18,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  textShadow: "0 1px 0 rgba(255,243,213,0.6)",
};

const statutTexte = (color: string): CSSProperties => ({
  marginBottom: 10,
  color,
  fontSize: 14,
  fontFamily: "var(--font-display)",
});

/** Section négo repliable — anime la remontée (max-height 0 → ouvert). */
const accordionOuter = (expanded: boolean): CSSProperties => ({
  overflow: "hidden",
  maxHeight: expanded ? 460 : 0,
  opacity: expanded ? 1 : 0,
  transition: "max-height 320ms ease, opacity 220ms ease",
});

const accordionInner: CSSProperties = {
  background: "var(--paper-200)",
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

/** Fond blanc marbré (veinage subtil via dégradés superposés). */
const MARBRE_BLANC =
  "linear-gradient(135deg, rgba(214,222,224,0.55) 0%, rgba(255,255,255,0) 30%)," +
  "linear-gradient(30deg, rgba(200,208,210,0.4) 0%, rgba(255,255,255,0) 22%)," +
  "linear-gradient(160deg, #ffffff 0%, #f2f4f3 48%, #ffffff 60%, #e9edec 100%)";

const btnBase: CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "12px 8px",
  borderRadius: 11,
  border: "2px solid var(--brass-600)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 15,
  whiteSpace: "nowrap",
  textAlign: "center",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 2px rgba(40,25,5,0.18)",
  cursor: "pointer",
};

function btn(disabled: boolean): CSSProperties {
  return {
    ...btnBase,
    background: MARBRE_BLANC,
    color: disabled ? "var(--paper-500)" : "var(--forest-800)",
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const negoBtnRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1.4fr",
  gap: 8,
  marginTop: 2,
};

const btnPrimary: CSSProperties = {
  padding: "12px 8px",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  background: "var(--brass-500)",
  color: "var(--forest-900)",
  border: "2px solid var(--brass-500)",
  borderRadius: 10,
  cursor: "pointer",
  gridColumn: "2 / 3",
  lineHeight: 1.15,
};

const btnSecondary: CSSProperties = {
  ...btnPrimary,
  background: "transparent",
  color: "var(--forest-800)",
  gridColumn: "1 / 2",
};

/** Variante désactivée (quota d'active épuisé) : bouton toujours visible,
 *  mais grisé — reprend le pattern disabled de Flair/Fouille (opacité ~0.45). */
function btnSecondaryState(disabled: boolean): CSSProperties {
  return {
    ...btnSecondary,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
