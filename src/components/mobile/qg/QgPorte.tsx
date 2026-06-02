"use client";

import { useQgObjetStyle } from "./QgScene";

interface QgPorteProps {
  onTap: () => void;
}

// La porte est déjà peinte dans le fond ; on garde seulement une zone
// invisible cliquable, dimensionnée par un aspect-ratio porte standard.
export function QgPorte({ onTap }: QgPorteProps) {
  const style = useQgObjetStyle("porte");
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
