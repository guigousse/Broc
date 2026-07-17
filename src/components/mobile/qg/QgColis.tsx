"use client";

import { useQgObjetStyle } from "@/components/mobile/qg/QgScene";
import { useLangue } from "@/lib/i18n/LangueContext";

/**
 * Colis du grand-père, posé devant la porte pendant l'étape « ouvrir-colis »
 * du tutoriel. Le tap ouvre la cérémonie d'ouverture (ColisOverlay).
 */
export function QgColis({ onTap }: { onTap: () => void }) {
  const style = useQgObjetStyle("colis");
  const { d } = useLangue();
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={d.qg.colis}
      className="tuto-main"
      style={style}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/qg/colis.webp"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </button>
  );
}
