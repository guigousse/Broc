interface BrassCornersProps {
  inset?: number;
  size?: number;
  color?: string;
}

export function BrassCorners({
  inset = 8,
  size = 26,
  color = "var(--brass-500)",
}: BrassCornersProps) {
  const base: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    pointerEvents: "none",
  };
  const stroke = `1.5px solid ${color}`;
  const dot: React.CSSProperties = {
    position: "absolute",
    width: 4,
    height: 4,
    background: color,
  };
  return (
    <>
      <span style={{ ...base, top: inset, left: inset, borderTop: stroke, borderLeft: stroke }}>
        <span style={{ ...dot, top: 5, left: 5 }} />
      </span>
      <span style={{ ...base, top: inset, right: inset, borderTop: stroke, borderRight: stroke }}>
        <span style={{ ...dot, top: 5, right: 5 }} />
      </span>
      <span style={{ ...base, bottom: inset, left: inset, borderBottom: stroke, borderLeft: stroke }}>
        <span style={{ ...dot, bottom: 5, left: 5 }} />
      </span>
      <span style={{ ...base, bottom: inset, right: inset, borderBottom: stroke, borderRight: stroke }}>
        <span style={{ ...dot, bottom: 5, right: 5 }} />
      </span>
    </>
  );
}
