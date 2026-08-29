"use client";

import type { CSSProperties } from "react";
import type { Brocante, CategorieObjet, CollectionSlot } from "@/types/game";
import { objetsDesTiersPrecedents, objetsTrouvables } from "@/lib/chine";
import { templateDonne, templateVu } from "@/lib/collection";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomBrocante, nomTemplate } from "@/lib/i18n/contenu";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { ItemSticker, type StickerVariant } from "@/components/ui/ItemSticker";

interface ObjetsTrouvablesSheetProps {
  open: boolean;
  onClose: () => void;
  brocante: Brocante;
  collection: Record<CategorieObjet, CollectionSlot[]>;
}

const sousTitre: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center",
};

const tiersPrecedents: CSSProperties = {
  ...sousTitre,
  color: "var(--ink-500)",
  marginTop: 3,
};

const entete: CSSProperties = { marginBottom: 10 };

/** Rangés droits sur une étagère de 4 colonnes. */
const grille: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "14px 6px",
  padding: "6px 8px 12px",
};

const TAILLE_STICKER = 68;

const carte: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
};

const nomStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 10.5,
  lineHeight: 1.15,
  color: "var(--ink-700)",
  textAlign: "center",
  minHeight: 24,
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
};

/** « ★ », « ★ et ★★ » : les tiers en dessous du natif, en étoiles pleines. */
function etoilesDesTiersPrecedents(tier: number, et: string): string {
  const natif = Math.min(tier, 3);
  const parts: string[] = [];
  for (let t = 1; t < natif; t += 1) parts.push("★".repeat(t));
  return parts.join(` ${et} `);
}

function varianteDe(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
): StickerVariant {
  if (templateDonne(collection, templateId)) return "normal";
  if (templateVu(collection, templateId)) return "grise";
  return "silhouette";
}

export function ObjetsTrouvablesSheet({
  open,
  onClose,
  brocante,
  collection,
}: ObjetsTrouvablesSheetProps) {
  const { d, tr, locale } = useLangue();
  if (!open) return null;
  const liste = objetsTrouvables(brocante);
  const nPrecedents = objetsDesTiersPrecedents(brocante);
  return (
    <BottomSheet open onClose={onClose} title={nomBrocante(brocante, locale)}>
      <div style={entete}>
        <p style={sousTitre}>
          {tr(d.chine.objetsTrouvablesSousTitre, { n: liste.length })}
        </p>
        {nPrecedents > 0 && (
          <p style={tiersPrecedents} data-testid="trouvables-tiers-precedents">
            {tr(d.chine.objetsTrouvablesTiersPrecedents, {
              n: nPrecedents,
              etoiles: etoilesDesTiersPrecedents(brocante.tier, d.chine.objetsTrouvablesEt),
            })}
          </p>
        )}
      </div>
      <div style={grille} data-testid="trouvables-liste">
        {liste.map((t) => {
          const variant = varianteDe(collection, t.templateId);
          return (
            <div
              key={t.templateId}
              style={carte}
              data-testid="trouvable"
              data-template={t.templateId}
              data-variant={variant}
            >
              <ItemSticker
                templateId={t.templateId}
                categorie={t.categorie}
                size={TAILLE_STICKER}
                variant={variant}
                tilt={false}
                thumb
              />
              <span style={nomStyle}>
                {variant === "silhouette" ? "" : nomTemplate(t.templateId, locale)}
              </span>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
