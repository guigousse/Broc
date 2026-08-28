"use client";

import type { CSSProperties } from "react";
import type { Brocante, CategorieObjet, CollectionSlot } from "@/types/game";
import { objetsTrouvables } from "@/lib/chine";
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
  margin: "0 0 10px",
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center",
};

/**
 * « Un peu en vrac » : pas de grille. Les stickers coulent en rangées
 * (`flex-wrap`) et chacun se décale de quelques pixels et s'incline selon
 * son id — toujours au même endroit d'une ouverture à l'autre, comme des
 * pièces posées sur une nappe et non rangées sur une étagère.
 */
const vrac: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "14px 10px",
  padding: "6px 8px 12px",
};

const TAILLE_STICKER = 68;

const carte: CSSProperties = {
  width: TAILLE_STICKER + 12,
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

function hash(id: string): number {
  let h = 7;
  for (let i = 0; i < id.length; i += 1) h = (h * 33 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Décalage (±5 px) et inclinaison (±7°) déterministes, propres à l'objet. */
function poseEnVrac(templateId: string): string {
  const h = hash(templateId);
  const dx = (h % 11) - 5;
  const dy = ((h >> 4) % 9) - 4;
  const rot = (((h >> 8) % 15) - 7) * 1;
  return `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
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
  return (
    <BottomSheet open onClose={onClose} title={nomBrocante(brocante, locale)}>
      <p style={sousTitre}>
        {tr(d.chine.objetsTrouvablesSousTitre, { n: liste.length })}
      </p>
      <div style={vrac} data-testid="trouvables-liste">
        {liste.map((t) => {
          const variant = varianteDe(collection, t.templateId);
          return (
            <div
              key={t.templateId}
              style={{ ...carte, transform: poseEnVrac(t.templateId) }}
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
