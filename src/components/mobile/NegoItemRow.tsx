"use client";

import type { CSSProperties } from "react";
import { Star } from "lucide-react";
import { ItemImage } from "@/components/ui/ItemImage";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { getRarityColors } from "@/lib/rarityColors";
import { getTemplate } from "@/data/objetTemplates";
import type { EtatObjet, Objet } from "@/types/game";

interface NegoItemRowProps {
  objet: Objet;
  prix: number;
  prixLabel?: string;
}

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

export function NegoItemRow({ objet, prix, prixLabel }: NegoItemRowProps) {
  const isUnique = !!getTemplate(objet.templateId)?.unique;
  const colors = getRarityColors(objet.rarete, isUnique);

  return (
    <div style={wrap}>
      <div
        style={{
          ...thumbStyle,
          background: colors.thumbBg,
          border: `1px solid ${colors.outer}`,
        }}
      >
        <ItemImage
          templateId={objet.templateId}
          categorie={objet.categorie}
          fit="cover"
          fallbackIconSize={24}
          fallbackIconColor={colors.thumbIcon}
          alt={objet.nom}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={nomStyle}>{objet.nom}</div>
        <div style={metaRow}>
          <span style={{ display: "flex", gap: 1 }} aria-label={`État : ${objet.etat}`}>
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                size={12}
                strokeWidth={1.8}
                fill={i < etoileCount(objet.etat) ? colors.outer : "transparent"}
                color={colors.outer}
              />
            ))}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            <CategorieIcon
              categorie={objet.categorie}
              size={14}
              strokeWidth={1.5}
              color="var(--brass-700)"
            />
          </span>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        {prixLabel && <div style={labelStyle}>{prixLabel}</div>}
        <div style={prixStyle}>
          {prix}
          <span style={{ fontSize: 11, color: "var(--brass-700)", marginLeft: 2 }}>
            €
          </span>
        </div>
      </div>
    </div>
  );
}

const wrap: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "56px 1fr auto",
  gap: 12,
  alignItems: "center",
};

const thumbStyle: CSSProperties = {
  width: 56,
  height: 56,
  display: "grid",
  placeItems: "center",
};

const nomStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  fontWeight: 700,
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
};

const metaRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 4,
};

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  marginBottom: 2,
};

const prixStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 16,
  color: "var(--forest-800)",
};
