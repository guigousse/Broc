"use client";

import { useEffect, type CSSProperties } from "react";
import { audioManager } from "@/lib/audio/audioManager";
import { useLangue } from "@/lib/i18n/LangueContext";
import { useQgObjet } from "./dev/QgEditContext";

interface QgCourrierProps {
  nbNonLus: number;
  onTap: () => void;
}

const letterBase: CSSProperties = {
  position: "absolute",
  bottom: 0,
  width: "100%",
  height: "auto",
  display: "block",
};

export function QgCourrier({ nbNonLus, onTap }: QgCourrierProps) {
  const { left, bottom, width } = useQgObjet("courrier");
  const { d, tr } = useLangue();

  // Précharge le buffer du bruit papier pour qu'il joue instantanément au tap.
  useEffect(() => {
    void audioManager.preload(["/sounds/paper.mp3"]);
  }, []);

  if (nbNonLus <= 0) return null;
  // 1 lettre → single envelope ; 2+ → pile multilettre.
  const src = nbNonLus === 1 ? "/qg/lettre.webp" : "/qg/multilettre.webp";
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={tr(
        nbNonLus > 1 ? d.qg.lettresNonLues : d.qg.lettreNonLue,
        { n: nbNonLus },
      )}
      style={{
        position: "absolute",
        left: `${left}vw`,
        bottom: `${bottom}%`,
        width: `${width}vw`,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: nbNonLus > 0 ? "pointer" : "default",
        pointerEvents: nbNonLus > 0 ? "auto" : "none",
        opacity: nbNonLus > 0 ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={letterBase}
      />
    </button>
  );
}
