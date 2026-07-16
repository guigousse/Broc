"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { NegoBar } from "@/components/mobile/NegoBar";
import { HumeurGauge } from "@/components/mobile/HumeurGauge";
import { PersonaAvatar } from "@/components/mobile/PersonaAvatar";
import type { PersonaInfo } from "@/components/mobile/PersonaInfoOverlay";
import { ouvrirNegociation } from "@/lib/negociation";
import { HUMEUR_FACHE_SEUIL } from "@/lib/personaIllustrations";
import { audioManager } from "@/lib/audio/audioManager";
import { useLangue } from "@/lib/i18n/LangueContext";
import { texteNego } from "@/lib/i18n/contenu";
import type { NegoMode, NegoPersona, NegociationState } from "@/types/game";

interface NegociationSheetProps {
  open: boolean;
  onClose: () => void;
  mode: NegoMode;
  /** Persona adverse (vendeur en achat, client en vente). */
  persona: NegoPersona;
  /** Échelle haute de la barre : prix vendeur initial (achat) ou prix demandé étal (vente). */
  echelleMax: number;
  /** Cible secrète : prixMinAccept (achat) ou prixMax (vente). Sert à initialiser si nego absent. */
  cibleSecrete: number;
  /** Prix de départ du curseur adverse — utilisé seulement pour initialiser. */
  prixDepartAdverse: number;
  /** État négo persistant ; null = première ouverture, on initialise. */
  nego: NegociationState | null;
  onUpdateNego: (nego: NegociationState) => void;
  onConclu: (prixFinal: number) => void;
  /** Calcule le prochain état de négociation pour une contre-offre du joueur
   *  (délègue à `proposerOffre` ou, en vente, à `proposerOffreVente` pour que
   *  la tolérance boostée et le sauvetage Diplomate s'appliquent réellement). */
  onProposerOffre: (nego: NegociationState, offre: number) => NegociationState;
  /** Bloc panier d'objets (entre le titre et la zone de négociation). */
  header?: ReactNode;
  /** Infos persona pour l'overlay (i). */
  personaInfo: PersonaInfo;
  /** Nom affiché en titre (sous l'avatar). Omis → pas de bandeau nom (ex. chine). */
  nomAffiche?: string;
  /** Illustration PNG du persona en humeur calme. */
  illustrationSrc?: string;
  /** Illustration PNG du persona fâché (humeur ≥ HUMEUR_FACHE_SEUIL). */
  illustrationFacheSrc?: string;
  /** Quand renseigné, remplace la zone négo par une vente directe. */
  venteDirecte?: {
    prixDirect: number;
    onAccepter: () => void;
    onRefuser: () => void;
  };
  /** Offre courante du joueur — contrôlée par la page (le dock Boniment en dépend). */
  offreJoueur: number;
  onChangeOffre: (offre: number) => void;
  /** Pass-through vers BottomSheet : laisse le dock d'atouts visible sous la sheet. */
  bottomOffset?: string;
  /** Tutoriel (première vente) : main pointeuse sur le curseur joueur. */
  tutoMainJoueur?: boolean;
}

export function NegociationSheet({
  open,
  onClose,
  mode,
  persona,
  echelleMax,
  cibleSecrete,
  prixDepartAdverse,
  nego,
  onUpdateNego,
  onConclu,
  onProposerOffre,
  header,
  personaInfo,
  nomAffiche,
  illustrationSrc,
  illustrationFacheSrc,
  venteDirecte,
  offreJoueur,
  onChangeOffre,
  bottomOffset,
  tutoMainJoueur = false,
}: NegociationSheetProps) {
  const { d, tr, locale } = useLangue();
  const [localNego, setLocalNego] = useState<NegociationState>(
    nego ?? ouvrirNegociation(mode, prixDepartAdverse, cibleSecrete),
  );

  useEffect(() => {
    if (open) {
      setLocalNego(
        nego ?? ouvrirNegociation(mode, prixDepartAdverse, cibleSecrete),
      );
    }
  }, [open, nego, mode, prixDepartAdverse, cibleSecrete]);

  const enCours = localNego.statut === "en_cours";

  const estFache =
    localNego.statut === "fache" || localNego.humeur >= HUMEUR_FACHE_SEUIL;
  const illustrationCourante =
    estFache && illustrationFacheSrc ? illustrationFacheSrc : illustrationSrc;

  const minJoueur =
    mode === "achat" ? 1 : Math.max(1, localNego.prixAdverseCourant);
  const maxJoueur =
    mode === "achat" ? localNego.prixAdverseCourant : echelleMax;

  const handleProposer = () => {
    const next = onProposerOffre(localNego, offreJoueur);
    setLocalNego(next);
    onUpdateNego(next);

    if (next.statut === "conclu") {
      audioManager.playCash();
      setTimeout(() => {
        onConclu(offreJoueur);
      }, 600);
    }
  };

  const handleAbandonner = () => {
    onClose();
  };

  const handleAcheterApresRefus = () => {
    onConclu(localNego.prixAdverseCourant);
  };

  // Texte affiché dans la bulle de dialogue
  const bubbleMessage = venteDirecte
    ? tr(d.vente.bulleJePrends, { prix: venteDirecte.prixDirect })
    : texteNego(localNego.message, locale);

  const title = venteDirecte ? d.vente.titreVente : d.vente.titreNegociation;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      bottomOffset={bottomOffset}
      topDecoration={
        <PersonaAvatar
          message={bubbleMessage}
          info={personaInfo}
          illustrationSrc={illustrationCourante}
        />
      }
    >
      {nomAffiche && (
        <div style={artDecoFrame}>
          <span style={artDecoText}>{nomAffiche}</span>
        </div>
      )}
      <div style={contentPadStyle}>
      {header && <div style={headerStyle}>{header}</div>}
      {venteDirecte ? (
        <div style={btnRowStyle}>
          <button
            type="button"
            style={btnSecondary}
            onClick={venteDirecte.onRefuser}
          >
            {d.vente.refuser}
          </button>
          <button
            type="button"
            style={btnPrimary}
            onClick={venteDirecte.onAccepter}
          >
            {tr(d.vente.vendrePrix, { prix: venteDirecte.prixDirect })}
          </button>
        </div>
      ) : (
        <>
          <div style={sectionLabel}>{d.vente.sectionNegociation}</div>
          <NegoBar
            mode={mode}
            echelleMax={echelleMax}
            prixAdverse={localNego.prixAdverseCourant}
            prixJoueur={offreJoueur}
            minJoueur={minJoueur}
            maxJoueur={maxJoueur}
            onChangeJoueur={onChangeOffre}
            readOnly={!enCours}
            tutoMainJoueur={tutoMainJoueur}
          />
          <HumeurGauge humeur={localNego.humeur} />
          <div style={btnRowStyle}>
            {localNego.statut === "refus_poli" && mode === "achat" ? (
              <button
                type="button"
                style={{ ...btnPrimary, gridColumn: "1 / -1" }}
                onClick={handleAcheterApresRefus}
              >
                {tr(d.chine.acheterPrixAffiche, {
                  prix: localNego.prixAdverseCourant,
                })}
              </button>
            ) : enCours ? (
              <>
                <button
                  type="button"
                  style={btnSecondary}
                  onClick={handleAbandonner}
                >
                  {d.chine.laisserTomber}
                </button>
                <button
                  type="button"
                  style={btnPrimary}
                  onClick={handleProposer}
                >
                  {offreRejoint(mode, offreJoueur, localNego.prixAdverseCourant)
                    ? tr(d.chine.accepterPrix, { prix: offreJoueur })
                    : tr(d.chine.proposerPrix, { prix: offreJoueur })}
                </button>
              </>
            ) : (
              <button
                type="button"
                style={{ ...btnSecondary, gridColumn: "1 / -1" }}
                onClick={onClose}
              >
                {d.commun.fermer}
              </button>
            )}
          </div>
        </>
      )}
      </div>
    </BottomSheet>
  );
}

function offreRejoint(mode: NegoMode, offre: number, prixAdverse: number): boolean {
  return mode === "achat" ? offre >= prixAdverse : offre <= prixAdverse;
}

const artDecoFrame: CSSProperties = {
  position: "relative",
  padding: "12px 48px",
  background:
    "linear-gradient(180deg, var(--brass-300) 0%, var(--brass-500) 50%, var(--brass-300) 100%)",
  borderBottom: "2px solid var(--brass-700)",
  boxShadow:
    "inset 0 0 0 2px rgba(255,243,213,0.5), inset 0 -3px 0 0 rgba(0,0,0,0.06)",
  borderRadius: "12px 12px 0 0",
  textAlign: "center",
};

const artDecoText: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 18,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  textShadow: "0 1px 0 rgba(255,243,213,0.6)",
  position: "relative",
  zIndex: 1,
};

const contentPadStyle: CSSProperties = {
  padding: "16px 16px 8px",
};

const sectionLabel: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 10,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center",
  margin: "14px 0 4px",
};

const headerStyle: CSSProperties = {
  margin: "0 0 14px",
  padding: "12px 14px",
  background: "var(--paper-300)",
  border: "1px solid var(--brass-500)",
  borderRadius: 6,
};

const btnRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1.4fr",
  gap: 6,
  marginTop: 10,
};

const btnPrimary: CSSProperties = {
  padding: "8px 6px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  cursor: "pointer",
  gridColumn: "2 / 3",
  lineHeight: 1.15,
};

const btnSecondary: CSSProperties = {
  ...btnPrimary,
  background: "var(--paper-100)",
  color: "var(--forest-800)",
  gridColumn: "1 / 2",
};
