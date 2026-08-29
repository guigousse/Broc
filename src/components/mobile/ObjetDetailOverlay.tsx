"use client";

import type { CSSProperties } from "react";
import { FicheObjet, ficheBackdrop } from "@/components/ui/FicheObjet";
import { getTemplate } from "@/data/objetTemplates";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";
import type { Objet } from "@/types/game";

interface ObjetDetailOverlayProps {
  objet: Objet | null;
  open: boolean;
  onClose: () => void;
  prixMarche: number;
  /** Prix marché visible ? Vrai si compétence Connaisseur Vitrine débloquée pour cette catégorie. */
  prixMarcheConnu: boolean;
}

/**
 * Les bannières d'exception (en restauration, pièce unique) — sur le voile,
 * donc écrites en laiton clair et cernées d'un simple filet.
 */
const banniere: CSSProperties = {
  marginTop: 12,
  padding: "8px 10px",
  border: "1px dotted var(--brass-500)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  lineHeight: 1.5,
  letterSpacing: "0.08em",
  color: "var(--brass-300)",
  textAlign: "center",
};

/**
 * La fiche d'un objet du stockage : la mise en page commune (`FicheObjet`),
 * la valeur étant le prix du marché — masqué en « ? € » tant que Connaisseur
 * n'est pas débloqué pour la catégorie.
 */
export function ObjetDetailOverlay({
  objet,
  open,
  onClose,
  prixMarche,
  prixMarcheConnu,
}: ObjetDetailOverlayProps) {
  const { d, locale } = useLangue();

  if (!open || !objet) return null;

  const enRestauration = !!objet.enRestauration;
  const isUnique = !!getTemplate(objet.templateId)?.unique;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={d.inventaire.detailObjet}
      style={ficheBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <FicheObjet
        templateId={objet.templateId}
        categorie={objet.categorie}
        nom={nomObjet(objet, locale)}
        rarete={objet.rarete}
        unique={isUnique}
        etat={objet.etat}
        prixMarche={prixMarcheConnu ? `${Math.round(prixMarche)} €` : "? €"}
        prixAchat={objet.prixAchat}
        onClose={onClose}
      >
        {enRestauration && (
          <div style={banniere}>{d.inventaire.enRestaurationAtelier}</div>
        )}

        {/* Une pièce unique sort du carrousel de chargement du coffre sans
            rien dire ; c'est ici que le joueur vient chercher pourquoi. */}
        {isUnique && <div style={banniere}>{d.raisons.pieceUniqueProtegee}</div>}
      </FicheObjet>
    </div>
  );
}
