"use client";

import { qgObjetStyle } from "./QgScene";

interface QgPorteProps {
  onTap: () => void;
}

// La porte est déjà peinte dans le fond ; on garde seulement une zone
// invisible cliquable, dimensionnée par un aspect-ratio porte standard.
export function QgPorte({ onTap }: QgPorteProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Porte d'entrée"
      style={{
        ...qgObjetStyle("porte"),
        aspectRatio: "2 / 7",
      }}
    />
  );
}
