"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { NegoBar } from "@/components/mobile/NegoBar";
import { HumeurGauge } from "@/components/mobile/HumeurGauge";
import { namePlateStyle } from "@/components/ui/namePlate";
import { proposerOffre, ouvrirNegociation, ALEA_NEGO_SCRIPTEE } from "@/lib/negociation";
import { temperamentDe } from "@/data/temperaments";
import { HUMEUR_FACHE_SEUIL } from "@/lib/personaIllustrations";
import { audioManager } from "@/lib/audio/audioManager";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomVendeur, texteNego } from "@/lib/i18n/contenu";
import type { NegociationState, ObjetEnVente } from "@/types/game";
import type { RoleScenario } from "@/data/tutorielScenario";

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
  prixMinEffectif,
  tutoGuide = false,
  scriptTuto = null,
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
  /** Plancher vendeur effectif (Marchandage appliqué) — item.prixMinAccept sinon. */
  prixMinEffectif?: number;
  /** Tutoriel (premier achat) : main pointeuse sur « Négocier » puis sur le curseur. */
  tutoGuide?: boolean;
  /** Tutoriel scripté : impose le chemin (négo bloquée/forcée, achat direct
   *  bloqué/forcé) et borne l'offre initiale + le curseur joueur. */
  scriptTuto?: { role: RoleScenario; bornes?: { min: number; max: number } } | null;
}) {
  const { d, tr, locale } = useLangue();
  const { prixVendeur, statut, persona } = item;
  const acquis = statut === "achete";
  const facheInitial = item.negociation?.statut === "fache";
  const tropCher = budget < prixVendeur;
  const acheterDisabled = acquis || tropCher || plein;

  const roleTuto = scriptTuto?.role ?? null;
  const bornes = scriptTuto?.bornes ?? null;
  const negocierBloque = roleTuto === "achat-direct" || roleTuto === "decor";
  const acheterBloqueTuto = roleTuto !== null && roleTuto !== "achat-direct";

  const [localNego, setLocalNego] = useState<NegociationState>(
    () =>
      item.negociation ??
      ouvrirNegociation(
        "achat",
        prixVendeur,
        prixMinEffectif ?? item.prixMinAccept,
        temperamentDe(persona.archetype),
      ),
  );
  const [offreJoueur, setOffreJoueur] = useState<number>(() =>
    Math.min(
      bornes?.max ?? Infinity,
      Math.max(bornes?.min ?? 1, Math.round(prixVendeur * 0.25)),
    ),
  );

  // Resynchronise quand la négo change de l'EXTÉRIEUR (relance Tchatche depuis
  // le dock). Garde anti-boucle : onUpdateNego republie l'objet localNego
  // lui-même (même référence), donc seule une écriture externe déclenche.
  useEffect(() => {
    if (item.negociation && item.negociation !== localNego) {
      setLocalNego(item.negociation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.negociation]);

  const enCours = localNego.statut === "en_cours";
  const estFache =
    localNego.statut === "fache" || localNego.humeur >= HUMEUR_FACHE_SEUIL;
  const illustrationCourante =
    estFache && illustrationFacheSrc ? illustrationFacheSrc : illustrationSrc;

  const handleProposer = () => {
    const next = proposerOffre(
      localNego,
      persona,
      offreJoueur,
      scriptTuto ? ALEA_NEGO_SCRIPTEE : undefined,
    );
    setLocalNego(next);
    onUpdateNego(next);
    if (next.statut === "conclu") {
      audioManager.playCash();
      setTimeout(() => onConclu(offreJoueur), 600);
    }
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
            <div style={bubble}>
              <span style={bubbleTailOuter} aria-hidden />
              <span style={bubbleTailInner} aria-hidden />
              {texteNego(localNego.message, locale)}
            </div>
          ) : acquis ? (
            /* Visuel porté par le tampon « Vendu » sur le sticker (retour
               device : « Acquis » faisait doublon). Le tampon étant
               `aria-hidden`, cette annonce invisible est la SEULE trace qui
               reste pour un lecteur d'écran — même règle que le fâché. */
            <span style={srOnly}>{d.chine.tamponVendu}</span>
          ) : facheInitial ? (
            /* Visuel porté par le tampon « Vendeur fâché » sur le sticker ;
               on ne garde ici que l'annonce pour les lecteurs d'écran. */
            <span style={srOnly}>{d.chine.vendeurFache}</span>
          ) : plein ? (
            /* Idem : le texte rouge passait inaperçu à l'écran, le tampon
               « Stock plein » le remplace sur l'objet lui-même. */
            <span style={srOnly}>{d.chine.tamponStockPlein}</span>
          ) : (
            <div style={peekBtnRow}>
              <button
                type="button"
                className={tutoGuide && !negocierBloque ? "tuto-main" : undefined}
                style={btn(negocierBloque)}
                disabled={negocierBloque}
                onClick={onExpand}
              >
                {d.chine.negocier}
              </button>
              <button
                type="button"
                className={
                  tutoGuide && roleTuto === "achat-direct" ? "tuto-main" : undefined
                }
                style={{ ...btn(acheterDisabled || acheterBloqueTuto), flex: 1.3 }}
                disabled={acheterDisabled || acheterBloqueTuto}
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
            minJoueur={bornes?.min ?? 1}
            maxJoueur={Math.min(bornes?.max ?? Infinity, localNego.prixAdverseCourant)}
            onChangeJoueur={setOffreJoueur}
            readOnly={!enCours}
            tutoMainJoueur={tutoGuide && expanded}
          />
          <div style={negoBtnRow}>
            {localNego.statut === "refus_poli" ? (
              <button
                type="button"
                style={{ ...btnPrimaryDisablable(plein), gridColumn: "1 / -1" }}
                disabled={plein}
                onClick={() => onConclu(localNego.prixAdverseCourant)}
              >
                {tr(d.chine.acheterPrixAffiche, { prix: localNego.prixAdverseCourant })}
              </button>
            ) : enCours ? (
              <>
                <button type="button" style={btnSecondary} onClick={onCollapse}>
                  {d.chine.laisserTomber}
                </button>
                {/* Stockage plein : tout chemin qui peut conclure la négo est
                    coupé — l'achat échouerait (garde atomique acheterObjet). */}
                <button
                  type="button"
                  style={btnPrimaryDisablable(plein)}
                  disabled={plein}
                  onClick={handleProposer}
                >
                  {offreJoueur >= localNego.prixAdverseCourant
                    ? tr(d.chine.accepterPrix, { prix: offreJoueur })
                    : tr(d.chine.proposerPrix, { prix: offreJoueur })}
                </button>
              </>
            ) : (
              // Couvre "fache" ET "conclu" (drawer refermé puis rouvert après
              // un achat raté sur budget). La relance fâché/refus vit dans le
              // dock de compétences (La Tchatche).
              <button
                type="button"
                style={{ ...btnSecondary, gridColumn: "1 / -1" }}
                onClick={onCollapse}
              >
                {d.commun.fermer}
              </button>
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

/* Bulle de dialogue du vendeur : cadre arrondi + pointe vers son portrait
   (à gauche), même langage visuel que la bulle de vente (PersonaAvatar). */
const bubble: CSSProperties = {
  position: "relative",
  flex: 1,
  marginBottom: 8,
  padding: "12px 14px",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  borderRadius: 14,
  boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 16,
  color: "var(--ink-700)",
  lineHeight: 1.35,
};

const bubbleTailOuter: CSSProperties = {
  position: "absolute",
  left: -9,
  top: "50%",
  width: 0,
  height: 0,
  borderTop: "9px solid transparent",
  borderBottom: "9px solid transparent",
  borderRight: "9px solid var(--brass-500)",
  transform: "translateY(-50%)",
};

const bubbleTailInner: CSSProperties = {
  position: "absolute",
  left: -7,
  top: "50%",
  width: 0,
  height: 0,
  borderTop: "8px solid transparent",
  borderBottom: "8px solid transparent",
  borderRight: "8px solid var(--paper-100)",
  transform: "translateY(-50%)",
};

/** Bandeau nom pleine largeur, coins hauts arrondis (ancienne fiche). */
const namePlate = namePlateStyle("12px 12px 0 0");


/** Texte présent pour les lecteurs d'écran mais invisible à l'écran. */
const srOnly: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
};

/** Section négo repliable — anime la remontée (max-height 0 → ouvert). */
const accordionOuter = (expanded: boolean): CSSProperties => ({
  overflow: "hidden",
  maxHeight: expanded ? 460 : 0,
  opacity: expanded ? 1 : 0,
  transition: "max-height 320ms ease, opacity 220ms ease",
});

const accordionInner: CSSProperties = {
  background: "var(--paper-200)",
  // Resserré (padding + gap) pour rapprocher jauge d'humeur ↔ curseurs de prix
  // ↔ boutons, et rendre de la hauteur à l'objet pendant la négo.
  padding: "8px 16px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
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
  fontSize: "clamp(12px, 3.4vw, 15px)",
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

const btnPrimaryDisablable = (disabled: boolean): CSSProperties => ({
  ...btnPrimary,
  opacity: disabled ? 0.55 : 1,
  cursor: disabled ? "not-allowed" : "pointer",
});

const btnSecondary: CSSProperties = {
  ...btnPrimary,
  background: "transparent",
  color: "var(--forest-800)",
  gridColumn: "1 / 2",
};
