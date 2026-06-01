"use client";

import type { CSSProperties, ReactNode } from "react";
import { Star } from "lucide-react";
import { ItemImage } from "@/components/ui/ItemImage";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { getRarityColors } from "@/lib/rarityColors";
import { getTemplate } from "@/data/objetTemplates";
import type { EtatObjet, Objet } from "@/types/game";

interface AtelierItemRowProps {
  objet: Objet;
  /** Ligne contextuelle (état → cible, durée, prix, etc.). */
  metaLigne: ReactNode;
  /** Zone d'action à droite (bouton ou badge texte). */
  action: ReactNode;
  /** Affiche un séparateur sous la ligne (false sur la dernière). */
  isLast: boolean;
}

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "48px 1fr auto",
  gap: 10,
  alignItems: "center",
  padding: "10px 12px",
};

const thumbBase: CSSProperties = {
  width: 48,
  height: 48,
  display: "grid",
  placeItems: "center",
};

function etoileCount(etat: EtatObjet): number {
  switch (etat) {
    case "Mauvais":
      return 0;
    case "Bon":
      return 1;
    case "Très bon":
      return 2;
    case "Pristin état":
      return 3;
  }
}

/**
 * Ligne d'objet réutilisable par les 3 sections de la page Atelier
 * (Travaux en cours, Restaurations possibles, Démantèlement).
 * Layout calqué sur `StockageItemRow` (thumb 48×48 + nom + étoiles +
 * CategorieIcon) mais sans swipe — l'action droite est toujours visible.
 */
export function AtelierItemRow({
  objet,
  metaLigne,
  action,
  isLast,
}: AtelierItemRowProps) {
  const isUnique = !!getTemplate(objet.templateId)?.unique;
  const rarityColors = getRarityColors(objet.rarete, isUnique);
  const thumbStyle: CSSProperties = {
    ...thumbBase,
    background: rarityColors.thumbBg,
    border: `1px solid ${rarityColors.outer}`,
  };

  return (
    <div
      style={{
        ...row,
        borderBottom: isLast ? "none" : "1px dotted var(--paper-500)",
      }}
    >
      <div style={thumbStyle}>
        <ItemImage
          templateId={objet.templateId}
          categorie={objet.categorie}
          fit="cover"
          fallbackIconSize={20}
          fallbackIconColor={rarityColors.thumbIcon}
          alt={objet.nom}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {objet.nom}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
          }}
          aria-label={`État ${objet.etat}, catégorie ${objet.categorie}`}
        >
          <span style={{ display: "flex", gap: 1 }} aria-label={`État : ${objet.etat}`}>
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                size={12}
                strokeWidth={1.8}
                fill={
                  i < etoileCount(objet.etat)
                    ? rarityColors.outer
                    : "transparent"
                }
                color={rarityColors.outer}
              />
            ))}
          </span>
          <CategorieIcon
            categorie={objet.categorie}
            size={14}
            strokeWidth={1.5}
            color="var(--brass-700)"
          />
        </div>
        <div style={{ marginTop: 4 }}>{metaLigne}</div>
      </div>
      <div>{action}</div>
    </div>
  );
}
