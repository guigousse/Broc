"use client";

import type { CSSProperties } from "react";
import { ItemImage } from "@/components/ui/ItemImage";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { StarRow } from "@/components/ui/StarRow";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import { getTemplate } from "@/data/objetTemplates";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import type { Objet } from "@/types/game";

interface NegoItemRowProps {
  objet: Objet;
  prix: number;
  prixLabel?: string;
}

export function NegoItemRow({ objet, prix, prixLabel }: NegoItemRowProps) {
  const { d, tr } = useLangue();
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
          <StarRow
            filled={etoileCount(objet.etat)}
            color={colors.outer}
            display="flex"
            aria-label={tr(d.chine.etatAriaLabel, { etat: libelleEtat(objet.etat, d) })}
          />
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
  fontSize: 10,
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
