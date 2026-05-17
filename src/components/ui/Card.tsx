import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  innerHairline?: boolean;
}

export function Card({
  children,
  innerHairline = true,
  style,
  ...rest
}: CardProps) {
  const merged: CSSProperties = {
    position: "relative",
    background: "var(--paper-300)",
    border: "1px solid var(--brass-500)",
    padding: 14,
    boxShadow:
      "0 2px 0 var(--paper-400), 0 4px 10px rgba(40,25,5,0.08)",
    ...style,
  };
  return (
    <div {...rest} style={merged}>
      {innerHairline && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 3,
            border: "1px solid rgba(138,106,38,0.4)",
            pointerEvents: "none",
          }}
        />
      )}
      {children}
    </div>
  );
}
