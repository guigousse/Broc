"use client";

import { useEffect } from "react";
import { audioManager } from "@/lib/audio/audioManager";
import { useQgObjetStyle } from "./QgScene";

interface QgPorteProps {
  onTap: () => void;
}

// La porte est déjà peinte dans le fond ; on garde seulement une zone
// invisible cliquable, dimensionnée par un aspect-ratio porte standard.
export function QgPorte({ onTap }: QgPorteProps) {
  const style = useQgObjetStyle("porte");

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
      aria-label="Porte d'entrée"
      style={{
        ...style,
        aspectRatio: "2 / 7",
      }}
    />
  );
}
