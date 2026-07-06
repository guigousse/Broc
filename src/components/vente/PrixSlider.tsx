"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";

interface PrixSliderProps {
  /** Prix de vente courant (poignée mobile). */
  value: number;
  /** Valeur de marché (pastille fixe, centre de l'échelle = 0 %). */
  marche: number;
  /** Prix d'achat de l'objet (pastille fixe). Masquée si absent. */
  achat?: number | null;
  /** Amplitude en % de part et d'autre du marché (défaut 100 → -100 %…+100 %). */
  ampPct?: number;
  /**
   * Faux si le joueur n'a pas Connaisseur 2 pour cette catégorie : la pastille
   * « valeur » (et tout texte affichant la référence) est masquée. La géométrie
   * de l'échelle reste ancrée sur `marche` en interne — compromis assumé, elle
   * ne fuit pas de valeur lisible. Défaut `true` pour ne pas casser les usages
   * existants.
   */
  marcheConnu?: boolean;
  onChange: (prix: number) => void;
}

const COL_VENTE = "var(--nego-joueur)";
const COL_VALEUR = "var(--brass-700)";
const COL_ACHAT = "var(--ink-500)";

/**
 * Curseur de prix façon « négociation » avec trois pastilles : valeur de marché
 * et prix d'achat (fixes, repères) + prix de vente (poignée glissable). Le prix
 * s'affiche au centre de chaque cercle. Échelle bornée à ±ampPct autour du marché.
 */
export function PrixSlider({
  value,
  marche,
  achat,
  ampPct = 100,
  marcheConnu = true,
  onChange,
}: PrixSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const lastRef = useRef(value);
  useEffect(() => {
    lastRef.current = value;
  }, [value]);

  const ref = Math.max(1, Math.round(marche));
  const min = Math.max(1, Math.round(ref * (1 - ampPct / 100)));
  const max = Math.max(min + 1, Math.round(ref * (1 + ampPct / 100)));
  const ratioOf = (p: number) => Math.min(1, Math.max(0, (p - min) / (max - min)));

  useEffect(() => {
    if (!dragging) return;
    const move = (clientX: number) => {
      const t = trackRef.current;
      if (!t) return;
      const rect = t.getBoundingClientRect();
      const r = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const prix = Math.round(min + r * (max - min));
      if (prix !== lastRef.current) {
        lastRef.current = prix;
        onChange(prix);
      }
    };
    const onMove = (e: globalThis.PointerEvent) => move(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, min, max, onChange]);

  return (
    <div style={row}>
      <span style={endLabel}>−{ampPct} %</span>
      <div ref={trackRef} style={track}>
        <div style={line} />

        {marcheConnu && (
          <Pastille ratio={ratioOf(ref)} color={COL_VALEUR} size={34} label="valeur" labelPos="above">
            {ref}€
          </Pastille>
        )}

        {typeof achat === "number" && achat > 0 && (
          <Pastille ratio={ratioOf(achat)} color={COL_ACHAT} size={34} label="achat" labelPos="above">
            {achat}€
          </Pastille>
        )}

        <Pastille
          ratio={ratioOf(value)}
          color={dragging ? "var(--forest-700)" : COL_VENTE}
          size={40}
          label="vente"
          labelPos="below"
          z={3}
          onPointerDown={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
        >
          {value}€
        </Pastille>
      </div>
      <span style={endLabel}>+{ampPct} %</span>
    </div>
  );
}

function Pastille({
  ratio,
  color,
  size,
  label,
  labelPos,
  z = 1,
  onPointerDown,
  children,
}: {
  ratio: number;
  color: string;
  size: number;
  label: string;
  labelPos: "above" | "below";
  z?: number;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  const draggable = !!onPointerDown;
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        top: "50%",
        left: `${ratio * 100}%`,
        transform: "translate(-50%, -50%)",
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: color,
        color: "var(--paper-100)",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: size >= 40 ? 11 : 10,
        boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
        userSelect: "none",
        zIndex: z,
        ...(draggable
          ? { touchAction: "none", cursor: "grab" }
          : { pointerEvents: "none" }),
      }}
    >
      {children}
      <span
        style={{
          position: "absolute",
          ...(labelPos === "above"
            ? { bottom: "calc(100% + 3px)" }
            : { top: "calc(100% + 3px)" }),
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-500)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
    </div>
  );
}

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 4px",
};

const endLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  color: "var(--ink-500)",
  letterSpacing: "0.04em",
  flexShrink: 0,
};

const track: CSSProperties = {
  position: "relative",
  flex: 1,
  height: 64,
};

const line: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: 0,
  right: 0,
  height: 6,
  transform: "translateY(-50%)",
  borderRadius: 3,
  background: "rgba(0, 0, 0, 0.12)",
};
