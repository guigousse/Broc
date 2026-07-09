"use client";

import type { CSSProperties, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { StarRow } from "@/components/ui/StarRow";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import { getTemplate } from "@/data/objetTemplates";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie, libelleEtat } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
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
  gridTemplateColumns: "56px 1fr auto",
  gap: 10,
  alignItems: "center",
  padding: "14px 12px",
};

const thumbBase: CSSProperties = {
  width: 56,
  height: 56,
  display: "grid",
  placeItems: "center",
};

function renderStars(count: number, color: string): ReactNode {
  return <StarRow filled={count} color={color} />;
}

export function AtelierItemRow({
  objet,
  metaLigne,
  action,
  etatCible,
  isLast,
}: AtelierItemRowProps) {
  const { d, tr, locale } = useLangue();
  const isUnique = !!getTemplate(objet.templateId)?.unique;
  const rarityColors = getRarityColors(objet.rarete, isUnique);
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
      <div data-atelier-thumb style={thumbBase}>
        <ItemSticker
          templateId={objet.templateId}
          categorie={objet.categorie}
          fill
          tilt={false}
          variant="normal"
          thumb
          eager
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
          {nomObjet(objet, locale)}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
          }}
          aria-label={
            targetStars !== null && etatCible !== undefined
              ? tr(d.inventaire.transitionEtatAria, {
                  etat: libelleEtat(objet.etat, d),
                  cible: libelleEtat(etatCible, d),
                  categorie: libelleCategorie(objet.categorie, d),
                })
              : tr(d.inventaire.etatCategorieAria, {
                  etat: libelleEtat(objet.etat, d),
                  categorie: libelleCategorie(objet.categorie, d),
                })
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
