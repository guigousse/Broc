"use client";

import type { CSSProperties } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";

interface PrixMarcheProps {
  /** Prix de référence de l'objet. Ignoré si `connue` est faux. */
  prix: number;
  /** Vrai quand la compétence Connaisseur de la catégorie est acquise. */
  connue: boolean;
}

/**
 * Le prix de marché d'un objet, tel que la fiche du stockage l'écrit.
 *
 * Tant que la valeur n'est pas connue, le libellé est ENTIER — « Prix du
 * marché : ? € » — et non un « ? » orphelin : le joueur doit comprendre
 * quelle information lui manque, pas seulement qu'il en manque une. Une fois
 * connue, le montant se suffit à lui-même.
 *
 * Composant partagé plutôt que style recopié : l'atelier écrivait la même
 * chose en petit mono gris (« valeur ? »), et les deux écrans avaient
 * silencieusement divergé.
 */
const ligne: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  color: "var(--forest-800)",
  marginTop: 4,
};

export function PrixMarche({ prix, connue }: PrixMarcheProps) {
  const { d } = useLangue();
  return (
    <div style={ligne}>
      {connue ? `${Math.round(prix)} €` : d.inventaire.prixMarcheInconnu}
    </div>
  );
}
