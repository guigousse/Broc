"use client";

import type { CSSProperties } from "react";
import { Wrench } from "lucide-react";
import type { CamionConfig } from "@/data/camion";
import { getCoffreAssets } from "@/lib/coffreAssets";
import { useLangue } from "@/lib/i18n/LangueContext";

export interface BoutonConcessionProps {
  /** Véhicule possédé — c'est lui qu'on montre, pas le palier suivant. */
  actuel: CamionConfig;
  /**
   * Y a-t-il un palier supérieur à proposer ? Purement transmis par le
   * parent : ce composant reste présentationnel, il ne déduit rien du
   * GameState (pas de recalcul de `getProchainCamion` ici).
   */
  ameliorable: boolean;
  /**
   * Le budget couvre-t-il le prochain palier ? Grise SANS désactiver :
   * consulter ce qu'on ne peut pas encore s'offrir entretient l'envie,
   * là où un bouton mort n'expliquerait rien. Sans objet si `ameliorable`
   * est faux.
   */
  peutPayer: boolean;
  /** Séquence de départ en cours : estompé et inopérant. */
  inerte: boolean;
  onOuvrir: () => void;
}

const boutonStyle = (
  peutPayer: boolean,
  inerte: boolean,
  ameliorable: boolean,
): CSSProperties => ({
  position: "relative",
  // Pas de cadre : la voiture EST le bouton. Elle occupe toute la hauteur de
  // la barre, et sa largeur suit son propre format (les profils sont en ~2,4:1)
  // pour qu'elle reste lisible à cette taille.
  height: "100%",
  width: "calc(var(--mobile-tabbar-h) * 2.4)",
  maxWidth: "48%",
  flex: "0 0 auto",
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: inerte || !ameliorable ? "not-allowed" : "pointer",
  // Palier max : grisaille totale et permanente (trophée), volontairement
  // plus marquée que le simple manque de budget (`peutPayer` faux, encore
  // tapable) — les deux états ne doivent pas se confondre.
  opacity: !ameliorable ? 0.5 : inerte ? 0.4 : peutPayer ? 1 : 0.55,
  filter: !ameliorable ? "grayscale(1)" : peutPayer ? undefined : "grayscale(0.7)",
});

const vehiculeStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  pointerEvents: "none",
};

const cleStyle: CSSProperties = {
  // Centrée sur l'image : sans cadre, un coin n'accroche plus le regard.
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--brass-300)",
  // La pastille sombre garde la clé lisible sur une carrosserie claire.
  filter: "drop-shadow(0 1px 3px rgba(15,30,22,0.9))",
  pointerEvents: "none",
};

const pastilleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: "50%",
  background: "var(--forest-800)",
  border: "1px solid var(--brass-500)",
};

/**
 * Bouton central de la barre d'actions du chargement : le véhicule possédé
 * vu de profil, une clé à molette par-dessus. Purement présentationnel — il
 * ne connaît ni le GameState, ni le budget brut, ni l'achat, ni s'il existe
 * un palier suivant (`ameliorable` le lui dit). Au palier max, il reste
 * monté mais devient un trophée : grisé, sans clé, inopérant.
 */
export function BoutonConcession(p: BoutonConcessionProps) {
  const { d } = useLangue();
  const visuel = getCoffreAssets(p.actuel.visuelId)?.profil ?? null;

  return (
    <button
      type="button"
      disabled={p.inerte || !p.ameliorable}
      onClick={p.onOuvrir}
      // Exception assumée à la règle « pas d'aria-label quand le contenu
      // nomme le bouton » : ici il n'y a aucun texte, seulement une image
      // et une icône. Sans label, VoiceOver annonce « bouton » et rien d'autre.
      // Au palier max, « Améliorer » ne convient plus : rien à améliorer.
      aria-label={p.ameliorable ? d.vente.ameliorerVehicule : d.vente.vehiculeAuMaximum}
      style={boutonStyle(p.peutPayer, p.inerte, p.ameliorable)}
    >
      {visuel && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={visuel} alt="" draggable={false} style={vehiculeStyle} />
      )}
      {p.ameliorable && (
        // Palier max : la clé disparaît — elle promettrait une amélioration
        // qui n'existe plus. Le véhicule seul reste, en trophée.
        <span style={cleStyle} aria-hidden>
          <span style={pastilleStyle}>
            <Wrench size={15} strokeWidth={2.4} />
          </span>
        </span>
      )}
    </button>
  );
}
