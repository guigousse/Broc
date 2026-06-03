"use client";

import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, Star } from "lucide-react";
import { ItemImage } from "@/components/ui/ItemImage";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { getRarityColors } from "@/lib/rarityColors";
import { getTemplate } from "@/data/objetTemplates";
import type { EtatObjet, Objet } from "@/types/game";

interface AtelierItemRowProps {
  objet: Objet;
  /** Ligne contextuelle (durée, prix, etc.). */
  metaLigne: ReactNode;
  /** Zone d'action (bouton ou badge texte). Verticalement centrée à droite. */
  action: ReactNode;
  /** Si fourni, les étoiles rendent une transition `actuel → cible`. */
  etatCible?: EtatObjet;
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

function renderStars(count: number, color: string): ReactNode {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          size={12}
          strokeWidth={1.8}
          fill={i < count ? color : "transparent"}
          color={color}
        />
      ))}
    </span>
  );
}

export function AtelierItemRow({
  objet,
  metaLigne,
  action,
  etatCible,
  isLast,
}: AtelierItemRowProps) {
  const isUnique = !!getTemplate(objet.templateId)?.unique;
  const rarityColors = getRarityColors(objet.rarete, isUnique);
  const thumbStyle: CSSProperties = {
    ...thumbBase,
    background: rarityColors.thumbBg,
    border: `1px solid ${rarityColors.outer}`,
  };
  const currentStars = etoileCount(objet.etat);
  const targetStars = etatCible !== undefined ? etoileCount(etatCible) : null;

  return (
    <div
      data-atelier-row
      data-objet-id={objet.id}
      style={{
        ...row,
        borderBottom: isLast ? "none" : "1px dotted var(--paper-500)",
      }}
    >
      <div data-atelier-thumb style={thumbStyle}>
        <ItemImage
          templateId={objet.templateId}
          categorie={objet.categorie}
          fit="contain"
          fallbackIconSize={20}
          fallbackIconColor={rarityColors.thumbIcon}
          alt={objet.nom}
          padded
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
            gap: 6,
            marginTop: 4,
          }}
          aria-label={
            targetStars !== null
              ? `Transition d'état : ${objet.etat} vers ${etatCible}, catégorie ${objet.categorie}`
              : `État ${objet.etat}, catégorie ${objet.categorie}`
          }
        >
          {renderStars(currentStars, rarityColors.outer)}
          {targetStars !== null && (
            <>
              <ArrowRight
                size={11}
                strokeWidth={2}
                color="var(--brass-700)"
              />
              {renderStars(targetStars, rarityColors.outer)}
            </>
          )}
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
