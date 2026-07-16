"use client";

import { useEffect } from "react";
import { audioManager } from "@/lib/audio/audioManager";
import { useLangue } from "@/lib/i18n/LangueContext";
import { useQgObjetStyle } from "./QgScene";

interface QgPorteProps {
  onTap: () => void;
  /** Tutoriel : met la porte en surbrillance (pulsation) quand elle est
   * l'action attendue de l'étape courante. */
  pulse?: boolean;
}

// La porte est déjà peinte dans le fond ; on garde seulement une zone
// invisible cliquable, dimensionnée par un aspect-ratio porte standard.
export function QgPorte({ onTap, pulse = false }: QgPorteProps) {
  const style = useQgObjetStyle("porte");
  const { d } = useLangue();

  // Précharge des bruits de porte pour un déclenchement instantané au tap.
  useEffect(() => {
    void audioManager.preload([
      "/sounds/door-open.mp3",
      "/sounds/door-close.mp3",
    ]);
  }, []);

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={d.qg.porteEntree}
      className={pulse ? "tuto-pulse" : undefined}
      style={{
        ...style,
        aspectRatio: "2 / 7",
      }}
    />
  );
}
