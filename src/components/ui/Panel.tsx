import type { CSSProperties, ReactNode } from "react";
import { BrassCorners } from "./BrassCorners";
import { DecoDivider } from "./DecoDivider";

interface PanelProps {
  children: ReactNode;
  title?: ReactNode;
  eyebrow?: ReactNode;
  dark?: boolean;
  padding?: number;
  style?: CSSProperties;
  className?: string;
}

export function Panel({
  children,
  title,
  eyebrow,
  dark = false,
  padding = 22,
  style,
  className,
}: PanelProps) {
  const bg = dark ? "var(--forest-800)" : "var(--paper-100)";
  const fg = dark ? "var(--paper-200)" : "var(--ink-700)";

  return (
    <section
      className={className}
      style={{
        position: "relative",
        background: bg,
        backgroundImage: dark
          ? "url(/assets/grain-overlay.svg)"
          : "url(/assets/paper-grain.svg)",
        backgroundSize: "320px 320px",
        border: "1px solid var(--brass-500)",
        boxShadow: dark
          ? "0 8px 28px rgba(15,30,22,0.35), inset 0 0 0 4px var(--forest-800), inset 0 0 0 5px var(--brass-700)"
          : "inset 0 0 0 4px var(--paper-100), inset 0 0 0 5px var(--brass-500), 0 2px 0 var(--paper-400), 0 6px 14px rgba(40,25,5,0.10)",
        color: fg,
        padding,
        ...style,
      }}
    >
      <BrassCorners color={dark ? "var(--brass-500)" : "var(--brass-600)"} />
      {(eyebrow || title) && (
        <header style={{ textAlign: "center", marginBottom: 14 }}>
          {eyebrow && (
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 10,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: dark ? "var(--brass-300)" : "var(--brass-700)",
                fontWeight: 600,
              }}
            >
              {eyebrow}
            </div>
          )}
          {title && (
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: dark ? "var(--paper-200)" : "var(--forest-800)",
                fontWeight: 700,
                margin: "4px 0 8px",
              }}
            >
              {title}
            </h2>
          )}
          <DecoDivider />
        </header>
      )}
      {children}
    </section>
  );
}
