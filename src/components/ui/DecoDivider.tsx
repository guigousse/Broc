import type { ReactNode } from "react";

interface DecoDividerProps {
  children?: ReactNode;
  color?: string;
}

export function DecoDivider({
  children = "◆",
  color = "var(--brass-500)",
}: DecoDividerProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, color }}>
      <span
        style={{
          flex: 1,
          height: 0,
          borderTop: `1px solid ${color}`,
          boxShadow: `0 3px 0 -2px ${color}`,
        }}
      />
      <span style={{ fontFamily: "var(--font-display)", fontSize: 14 }}>
        {children}
      </span>
      <span
        style={{
          flex: 1,
          height: 0,
          borderTop: `1px solid ${color}`,
          boxShadow: `0 3px 0 -2px ${color}`,
        }}
      />
    </div>
  );
}
