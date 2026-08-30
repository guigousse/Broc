"use client";

import { useLangue } from "@/lib/i18n/LangueContext";
import { useQgObjetStyle } from "./QgScene";

interface QgCarnetProps {
  onTap: () => void;
}

/**
 * Le livre de comptes posé sur la table du bureau. Disparu le 2026-08-23
 * (Task 6, l'onglet Quêtes devenant le seul chemin vers le carnet), il
 * revient le 2026-08-30 (Task 14) avec un rôle différent : ouvrir la sheet
 * « Mes albums » (classeur de cartes / album de timbres), pas le carnet de
 * quêtes.
 */
export function QgCarnet({ onTap }: QgCarnetProps) {
  const style = useQgObjetStyle("carnet");
  const { d } = useLangue();
  return (
    <button type="button" onClick={onTap} aria-label={d.albums.mesAlbums} style={style}>
      <img
        src="/qg/carnet.webp"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </button>
  );
}
