"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { NegoBar } from "@/components/mobile/NegoBar";
import { HumeurGauge } from "@/components/mobile/HumeurGauge";
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
  // vente → 75 % de l'échelle (au-dessus de l'offre client, on défend son prix)
  const offreInitialeJoueur =
    mode === "achat"
      ? Math.max(1, Math.round(echelleMax * 0.25))
      : Math.max(1, Math.round(echelleMax * 0.75));

  const [offreJoueur, setOffreJoueur] = useState<number>(offreInitialeJoueur);
  useEffect(() => {
    if (open) setOffreJoueur(offreInitialeJoueur);
  }, [open, offreInitialeJoueur]);

  const enCours = localNego.statut === "en_cours";

  // Le joueur peut s'aligner exactement sur le prix adverse → bouton "Accepter".
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

  const title = "Négociation";

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <p style={subtitleStyle}>{localNego.message}</p>
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
          <button type="button" style={btnPrimary} onClick={handleAcheterApresRefus}>
            Acheter au prix affiché — {localNego.prixAdverseCourant} €
          </button>
        ) : enCours ? (
          <>
            <button type="button" style={btnSecondary} onClick={handleAbandonner}>
              Laisser tomber
            </button>
            <button type="button" style={btnPrimary} onClick={handleProposer}>
              {offreRejoint(mode, offreJoueur, localNego.prixAdverseCourant)
                ? `Accepter ${offreJoueur} €`
                : `Proposer ${offreJoueur} €`}
            </button>
          </>
        ) : (
          <button type="button" style={btnSecondary} onClick={onClose}>
            Fermer
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

function offreRejoint(mode: NegoMode, offre: number, prixAdverse: number): boolean {
  return mode === "achat" ? offre >= prixAdverse : offre <= prixAdverse;
}

const subtitleStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 13,
  color: "var(--ink-500)",
  margin: "0 0 12px",
  textAlign: "center",
  minHeight: 32,
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
