"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { NegoBar } from "@/components/mobile/NegoBar";
import { HumeurGauge } from "@/components/mobile/HumeurGauge";
import { PersonaAvatar } from "@/components/mobile/PersonaAvatar";
import type { PersonaInfo } from "@/components/mobile/PersonaInfoOverlay";
import { proposerOffre, ouvrirNegociation } from "@/lib/negociation";
import { audioManager } from "@/lib/audio/audioManager";
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
  /** Bloc panier d'objets (entre le titre et la zone de négociation). */
  header?: ReactNode;
  /** Infos persona pour l'overlay (i). */
  personaInfo: PersonaInfo;
  /** Nom affiché en titre (sous l'avatar). */
  nomAffiche: string;
  /** Quand renseigné, remplace la zone négo par une vente directe. */
  venteDirecte?: {
    prixDirect: number;
    onAccepter: () => void;
    onRefuser: () => void;
  };
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
  header,
  personaInfo,
  nomAffiche,
  venteDirecte,
}: NegociationSheetProps) {
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

  // Position de départ du curseur joueur :
  // achat → 25 % de l'échelle (proposition basse neutre)
  // vente → bord droit (prix demandé), on défend son prix
  const offreInitialeJoueur =
    mode === "achat"
      ? Math.max(1, Math.round(echelleMax * 0.25))
      : echelleMax;

  const [offreJoueur, setOffreJoueur] = useState<number>(offreInitialeJoueur);
  useEffect(() => {
    if (open) setOffreJoueur(offreInitialeJoueur);
  }, [open, offreInitialeJoueur]);

  const enCours = localNego.statut === "en_cours";

  const minJoueur =
    mode === "achat" ? 1 : Math.max(1, localNego.prixAdverseCourant);
  const maxJoueur =
    mode === "achat" ? localNego.prixAdverseCourant : echelleMax;

  const handleProposer = () => {
    const next = proposerOffre(localNego, persona, offreJoueur);
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
    ? `« Je prends. Voici ${venteDirecte.prixDirect} €. »`
    : localNego.message;

  const title = venteDirecte ? "Vente" : "Négociation";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      topDecoration={<PersonaAvatar message={bubbleMessage} info={personaInfo} />}
    >
      <div style={artDecoFrame}>
        <div style={artDecoCornerTL} aria-hidden />
        <div style={artDecoCornerTR} aria-hidden />
        <div style={artDecoCornerBL} aria-hidden />
        <div style={artDecoCornerBR} aria-hidden />
        <span style={artDecoText}>{nomAffiche}</span>
      </div>
      {header && <div style={headerStyle}>{header}</div>}
      {venteDirecte ? (
        <div style={btnRowStyle}>
          <button
            type="button"
            style={btnSecondary}
            onClick={venteDirecte.onRefuser}
          >
            Refuser
          </button>
          <button
            type="button"
            style={btnPrimary}
            onClick={venteDirecte.onAccepter}
          >
            Vendre · {venteDirecte.prixDirect} €
          </button>
        </div>
      ) : (
        <>
          <div style={sectionLabel}>— Négociation —</div>
          <NegoBar
            mode={mode}
            echelleMax={echelleMax}
            prixAdverse={localNego.prixAdverseCourant}
            prixJoueur={offreJoueur}
            minJoueur={minJoueur}
            maxJoueur={maxJoueur}
            onChangeJoueur={setOffreJoueur}
            readOnly={!enCours}
          />
          <HumeurGauge humeur={localNego.humeur} />
          <div style={btnRowStyle}>
            {localNego.statut === "refus_poli" && mode === "achat" ? (
              <button
                type="button"
                style={{ ...btnPrimary, gridColumn: "1 / -1" }}
                onClick={handleAcheterApresRefus}
              >
                Acheter au prix affiché — {localNego.prixAdverseCourant} €
              </button>
            ) : enCours ? (
              <>
                <button
                  type="button"
                  style={btnSecondary}
                  onClick={handleAbandonner}
                >
                  Laisser tomber
                </button>
                <button
                  type="button"
                  style={btnPrimary}
                  onClick={handleProposer}
                >
                  {offreRejoint(mode, offreJoueur, localNego.prixAdverseCourant)
                    ? `Accepter ${offreJoueur} €`
                    : `Proposer ${offreJoueur} €`}
                </button>
              </>
            ) : (
              <button
                type="button"
                style={{ ...btnSecondary, gridColumn: "1 / -1" }}
                onClick={onClose}
              >
                Fermer
              </button>
            )}
          </div>
        </>
      )}
    </BottomSheet>
  );
}

function offreRejoint(mode: NegoMode, offre: number, prixAdverse: number): boolean {
  return mode === "achat" ? offre >= prixAdverse : offre <= prixAdverse;
}

const nomStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 20,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  textAlign: "center",
  margin: "4px 0 12px",
  lineHeight: 1.15,
};

const artDecoFrame: CSSProperties = {
  position: "relative",
  margin: "0 0 14px",
  padding: "10px 36px",
  background:
    "linear-gradient(180deg, var(--brass-300) 0%, var(--brass-500) 50%, var(--brass-300) 100%)",
  border: "1.5px solid var(--brass-700)",
  boxShadow:
    "inset 0 0 0 2px rgba(255,243,213,0.55), inset 0 0 0 3px var(--brass-700)",
  textAlign: "center",
};

const artDecoCornerBase: CSSProperties = {
  position: "absolute",
  width: 8,
  height: 8,
  background: "var(--forest-800)",
  transform: "rotate(45deg)",
};

const artDecoCornerTL: CSSProperties = {
  ...artDecoCornerBase,
  top: -5,
  left: 14,
};

const artDecoCornerTR: CSSProperties = {
  ...artDecoCornerBase,
  top: -5,
  right: 14,
};

const artDecoCornerBL: CSSProperties = {
  ...artDecoCornerBase,
  bottom: -5,
  left: 14,
};

const artDecoCornerBR: CSSProperties = {
  ...artDecoCornerBase,
  bottom: -5,
  right: 14,
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
  gap: 8,
  marginTop: 18,
};

const btnPrimary: CSSProperties = {
  padding: "12px 8px",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  cursor: "pointer",
  gridColumn: "2 / 3",
};

const btnSecondary: CSSProperties = {
  ...btnPrimary,
  background: "var(--paper-100)",
  color: "var(--forest-800)",
  gridColumn: "1 / 2",
};
