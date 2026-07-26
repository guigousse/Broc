"use client";

import type { CSSProperties } from "react";
import { ArrowUp } from "lucide-react";
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
  /** Prix du palier suivant, affiché sur l'étiquette. Sans objet si `ameliorable` est faux. */
  prix: number;
  /**
   * Le budget couvre-t-il le prochain palier ? Ternit l'étiquette SANS
   * désactiver le bouton : consulter ce qu'on ne peut pas encore s'offrir
   * entretient l'envie, là où un bouton mort n'expliquerait rien.
   */
  peutPayer: boolean;
  /** Séquence de départ en cours : estompé et inopérant. */
  inerte: boolean;
  onOuvrir: () => void;
}

const boutonStyle = (inerte: boolean, ameliorable: boolean): CSSProperties => ({
  position: "relative",
  // Pas de cadre : la voiture EST le bouton. Elle occupe la hauteur de la
  // barre, et sa largeur suit son propre format (les profils sont en ~2,4:1)
  // pour rester lisible à cette taille.
  height: "100%",
  width: "calc(var(--mobile-tabbar-h) * 2.15)",
  maxWidth: "46%",
  flex: "0 0 auto",
  padding: "4px 0",
  border: "none",
  background: "transparent",
  cursor: inerte || !ameliorable ? "not-allowed" : "pointer",
  // La voiture n'est JAMAIS désaturée : c'est le bien du joueur, il doit la
  // reconnaître en couleur à tous les paliers. L'unique variation est le
  // fondu de la séquence de départ, que la barre entière subit.
  opacity: inerte ? 0.4 : 1,
});

const vehiculeStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  pointerEvents: "none",
};

/** Zone centrée sur l'image qui porte l'étiquette de prix. */
const zoneEtiquette: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
};

const etiquetteStyle = (peutPayer: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 1,
  padding: "3px 6px",
  borderRadius: 3,
  background: "var(--forest-800)",
  border: `1px solid ${peutPayer ? "var(--brass-500)" : "var(--brass-700)"}`,
  color: peutPayer ? "var(--brass-300)" : "var(--ink-300)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  lineHeight: 1,
  letterSpacing: "0.02em",
  whiteSpace: "nowrap",
  // Décolle l'étiquette de la carrosserie sur laquelle elle est posée.
  boxShadow: "0 1px 4px rgba(15,30,22,0.85)",
});

/**
 * Bouton central de la barre d'actions du chargement : le véhicule possédé
 * vu de profil, avec le prix du palier suivant en étiquette par-dessus.
 * Purement présentationnel — il ne connaît ni le GameState, ni le budget
 * brut, ni l'achat, ni s'il existe un palier suivant (`ameliorable` le lui
 * dit). Au palier max, l'étiquette disparaît : il n'y a plus rien à acheter,
 * et la voiture reste seule, en couleur, comme un trophée.
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
      // nomme le bouton » : ici il n'y a aucun texte annonçable en propre,
      // seulement une image et un prix. Sans label, VoiceOver annoncerait
      // « 200 € » sans dire de quoi il s'agit.
      // Au palier max, « Améliorer » ne convient plus : rien à améliorer.
      aria-label={p.ameliorable ? d.vente.ameliorerVehicule : d.vente.vehiculeAuMaximum}
      style={boutonStyle(p.inerte, p.ameliorable)}
    >
      {visuel && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={visuel} alt="" draggable={false} style={vehiculeStyle} />
      )}
      {p.ameliorable && (
        // Palier max : l'étiquette disparaît — elle annoncerait un achat qui
        // n'existe plus.
        <span style={zoneEtiquette} aria-hidden>
          <span style={etiquetteStyle(p.peutPayer)}>
            <ArrowUp size={12} strokeWidth={2.6} />
            {p.prix} €
          </span>
        </span>
      )}
    </button>
  );
}
