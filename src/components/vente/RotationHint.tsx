"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** Affiche le hint (coffre-trace-deux, tant que Valider reste bloqué). */
  actif: boolean;
}

// Masquage temporaire à l'interaction : dès que le joueur touche l'écran, il
// n'a plus besoin de la leçon — elle revient si rien ne se passe pendant
// IDLE_MS (il a peut-être lâché son geste, ou change d'idée entre-temps).
const IDLE_MS = 8000;

const mainStyleBase = {
  position: "absolute" as const,
  top: "50%",
  width: 26,
  height: 26,
  background: "url('/tutoriel/main-pointeuse.webp') no-repeat center / contain",
  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35))",
  pointerEvents: "none" as const,
};

/**
 * Hint pédagogique décoratif « un doigt déplace, deux doigts tournent »,
 * superposé au coffre pendant l'étape `coffre-trace-deux` tant que la
 * seconde trace n'est pas encore posée. Un objet fantôme glisse d'abord
 * sous une main seule (phase 1 — glisser à un doigt), puis une seconde main
 * rejoint en fondu et le groupe entier pivote de 0 à 40° (phase 2 —
 * pincer-tourner à deux doigts) : la même distinction gestuelle que celle
 * attendue sur le vrai coffre. Purement visuel : `pointerEvents: none` de
 * bout en bout, aucune logique de jeu ni lecture de la trace réelle.
 */
export function RotationHint({ actif }: Props) {
  const [masque, setMasque] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!actif) return;
    const onPointerDown = () => {
      setMasque(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setMasque(false), IDLE_MS);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [actif]);

  if (!actif || masque) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
        zIndex: 2,
      }}
    >
      {/* Groupe animé (translate puis rotate, cf. globals.css) — l'objet
          fantôme et les deux mains bougent comme un seul bloc, la main B
          restant à sa place au moment où elle apparaît en fondu. */}
      <div
        className="broc-rotation-hint"
        style={{ position: "relative", width: 64, height: 64 }}
      >
        {/* Objet fantôme — carré arrondi semi-transparent, sans identité
            (pas le vrai objet de la trace : ce hint est générique). */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 14,
            background: "rgba(255, 255, 255, 0.32)",
            border: "2px solid rgba(255, 255, 255, 0.55)",
          }}
        />
        {/* Main A — présente dès la phase 1, déplace l'objet à un doigt. */}
        <div
          style={{
            ...mainStyleBase,
            left: -20,
            transform: "translateY(-50%)",
          }}
        />
        {/* Main B — rejoint en fondu à la phase 2, mains en pince pour
            tourner l'objet à deux doigts (asset miroir côté droit). */}
        <div
          className="broc-rotation-hint-main2"
          style={{
            ...mainStyleBase,
            right: -20,
            transform: "translateY(-50%) scaleX(-1)",
          }}
        />
      </div>
    </div>
  );
}
