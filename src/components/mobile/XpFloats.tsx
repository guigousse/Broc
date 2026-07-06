"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

/** Durée d'affichage d'un float « +XP » avant retrait, en ms — doit matcher
 *  l'animation `broc-xp-float` (globals.css). */
export const XP_FLOAT_DUREE_MS = 900;

interface XpFloat {
  id: number;
  montant: number;
}

/** Gère la liste des floats « +XP » affichés en session (chinage, vente) :
 *  purement local, aucune dépendance au GameContext. Chaque `pousserXp`
 *  ajoute un float et programme son retrait à `XP_FLOAT_DUREE_MS`. */
export function useXpFloats(): {
  floats: ReadonlyArray<XpFloat>;
  pousserXp: (montant: number) => void;
} {
  const [floats, setFloats] = useState<XpFloat[]>([]);
  const prochainIdRef = useRef(0);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const pousserXp = useCallback((montant: number) => {
    const id = prochainIdRef.current++;
    setFloats((prev) => [...prev, { id, montant }]);
    const timeoutId = setTimeout(() => {
      timeoutsRef.current.delete(timeoutId);
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, XP_FLOAT_DUREE_MS);
    timeoutsRef.current.add(timeoutId);
  }, []);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      for (const timeoutId of timeouts) clearTimeout(timeoutId);
      timeouts.clear();
    };
  }, []);

  return { floats, pousserXp };
}

const conteneur: CSSProperties = {
  position: "fixed",
  top: "calc(var(--safe-top) + var(--mobile-header-h) + 6px)",
  right: 14,
  zIndex: 35,
  pointerEvents: "none",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  alignItems: "flex-end",
};

const float: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--brass-700)",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  padding: "1px 6px",
  animation: `broc-xp-float ${XP_FLOAT_DUREE_MS}ms ease-out forwards`,
};

/** Vue purement affichage — empile les floats « +XP » en haut à droite,
 *  sous le header mobile, sans intercepter les interactions (pointerEvents: none). */
export function XpFloatsVue({
  floats,
}: {
  floats: ReadonlyArray<{ id: number; montant: number }>;
}) {
  if (floats.length === 0) return null;
  return (
    <div style={conteneur} aria-hidden="true">
      {floats.map((f) => (
        <span key={f.id} style={float}>
          +{f.montant} XP
        </span>
      ))}
    </div>
  );
}
