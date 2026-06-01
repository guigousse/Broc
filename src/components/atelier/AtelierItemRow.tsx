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
  /** Ligne contextuelle (durée, prix, etc.) — sans la transition d'état (rendue via les étoiles). */
  metaLigne: ReactNode;
  /** Zone d'action (bouton ou badge texte). Affichée à droite de la meta line. */
  action: ReactNode;
  /** Si fourni, les étoiles rendent une transition `actuel → cible`. */
  etatCible?: EtatObjet;
  /** Affiche un séparateur sous la ligne (false sur la dernière). */
  isLast: boolean;
}

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "48px 1fr",
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

/**
 * Ligne d'objet réutilisable par les 3 sections de la page Atelier
 * (Travaux en cours, Restaurations possibles, Démantèlement).
 *
 * Layout : thumb 48×48 dans la 1re colonne, contenu en pile dans la 2e
 * (nom plein-largeur, ligne d'étoiles + CategorieIcon, ligne meta + action).
 * Le bouton d'action ne squeeze plus le titre.
 *
 * Quand `etatCible` est passé, les étoiles affichent une transition
 * `actuel → cible`. Sinon, elles affichent juste l'état actuel.
 */
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginTop: 4,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>{metaLigne}</div>
          <div style={{ flex: "0 0 auto" }}>{action}</div>
        </div>
      </div>
    </div>
  );
}
