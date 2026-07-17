"use client";

import { useQgObjetStyle } from "@/components/mobile/qg/QgScene";
import { useLangue } from "@/lib/i18n/LangueContext";

/**
 * Paquet cadeau d'anniversaire (11 juin) déposé devant la porte — plat,
 * de la taille d'un vinyle, envoyé par Maman. Le tap ouvre la cérémonie.
 */
export function QgCadeau({ onTap }: { onTap: () => void }) {
  const style = useQgObjetStyle("cadeau");
  const { d } = useLangue();
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={d.qg.cadeau}
      className="tuto-main"
      style={style}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/qg/cadeau-anniversaire.webp"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </button>
  );
}
