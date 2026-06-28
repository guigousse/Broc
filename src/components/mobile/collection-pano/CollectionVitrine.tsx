"use client";

import { collectionObjetStyle } from "./layout";

interface CollectionVitrineProps {
  onTap: () => void;
}

/**
 * Hotspot de la vitrine du cabinet : ouvre la grille Collection (overlay).
 * Décor statique — la vitrine dessinée ne reflète pas les objets possédés.
 */
export function CollectionVitrine({ onTap }: CollectionVitrineProps) {
  return (
    <button
      type="button"
      aria-label="Ouvrir la collection"
      onClick={onTap}
      style={collectionObjetStyle("vitrine")}
    />
  );
}
