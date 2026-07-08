"use client";

import { collectionObjetStyle } from "./layout";
import { useLangue } from "@/lib/i18n/LangueContext";

interface CollectionVitrineProps {
  onTap: () => void;
}

/**
 * Hotspot de la vitrine du cabinet : ouvre la grille Collection (overlay).
 * Décor statique — la vitrine dessinée ne reflète pas les objets possédés.
 */
export function CollectionVitrine({ onTap }: CollectionVitrineProps) {
  const { d } = useLangue();
  return (
    <button
      type="button"
      aria-label={d.qg.ouvrirCollection}
      onClick={onTap}
      style={collectionObjetStyle("vitrine")}
    />
  );
}
