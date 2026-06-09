"use client";

interface Props {
  visuelId: string;
  x: number;
  y: number;
  scale: number;
  onChange: (next: { x: number; y: number; scale: number }) => void;
}

/**
 * Panneau flottant dev — règle position et taille du camion sur le fond garage
 * pour permettre au designer de relever les coordonnées à inscrire dans CAMIONS.
 */
export function CamionDevTool({ visuelId, x, y, scale, onChange }: Props) {
  const inputStyle = {
    width: 110,
    accentColor: "var(--vermillion-600)",
  } as const;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(82px + var(--safe-bottom))",
        right: 10,
        background: "rgba(20, 20, 20, 0.88)",
        color: "var(--brass-300)",
        padding: "8px 10px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        zIndex: 100,
        border: "1px dashed var(--vermillion-600)",
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 180,
      }}
    >
      <div
        style={{
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--vermillion-600)",
          fontSize: 9,
          marginBottom: 2,
        }}
      >
        DEV · {visuelId}
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 28 }}>X</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={x}
          onChange={(e) => onChange({ x: Number(e.target.value), y, scale })}
          style={inputStyle}
        />
        <span style={{ width: 36, textAlign: "right" }}>{x.toFixed(3)}</span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 28 }}>Y</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={y}
          onChange={(e) => onChange({ x, y: Number(e.target.value), scale })}
          style={inputStyle}
        />
        <span style={{ width: 36, textAlign: "right" }}>{y.toFixed(3)}</span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 28 }}>Sc</span>
        <input
          type="range"
          min={0.15}
          max={1.5}
          step={0.005}
          value={scale}
          onChange={(e) => onChange({ x, y, scale: Number(e.target.value) })}
          style={inputStyle}
        />
        <span style={{ width: 36, textAlign: "right" }}>{scale.toFixed(3)}</span>
      </label>
      <div
        style={{
          marginTop: 4,
          fontSize: 9,
          color: "var(--brass-500)",
          letterSpacing: "0.03em",
        }}
      >
        garageX: {x.toFixed(3)}, garageY: {y.toFixed(3)}, garageScale: {scale.toFixed(3)}
      </div>
    </div>
  );
}
