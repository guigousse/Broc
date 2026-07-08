"use client";

import { useLangue } from "@/lib/i18n/LangueContext";
import { useQgObjetStyle } from "./QgScene";

interface QgPorteRevuesProps {
  /** Si vrai, la Gazette a été achetée pour l'édition courante → asset "plein". */
  gazetteAchetee: boolean;
  onTap: () => void;
}

export function QgPorteRevues({ gazetteAchetee, onTap }: QgPorteRevuesProps) {
  const style = useQgObjetStyle("porteRevues");
  const { d } = useLangue();
  const src = gazetteAchetee ? "/qg/porte-revues-plein.webp" : "/qg/porte-revues-vide.webp";
  const label = gazetteAchetee
    ? d.qg.porteRevuesLire
    : d.qg.porteRevuesAcheter;
  return (
    <button type="button" onClick={onTap} aria-label={label} style={style}>
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </button>
  );
}
