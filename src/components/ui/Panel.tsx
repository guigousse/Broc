import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
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
  /** Si défini, le panneau devient cliquable (sert de gros bouton). */
  onClick?: () => void;
  disabled?: boolean;
  /** Titre d'aide affiché au survol (utile quand disabled). */
  title2?: string;
}

export function Panel({
  children,
  title,
  eyebrow,
  dark = false,
  padding = 22,
  style,
  className,
  onClick,
  disabled = false,
  title2,
}: PanelProps) {
  const bg = dark ? "var(--forest-800)" : "var(--paper-100)";
  const fg = dark ? "var(--paper-200)" : "var(--ink-700)";
  const clickable = !!onClick && !disabled;

  const handleKey = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (!clickable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <section
      className={className}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-disabled={disabled || undefined}
      title={title2}
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? handleKey : undefined}
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
        cursor: clickable ? "pointer" : disabled && onClick ? "not-allowed" : "default",
        opacity: disabled ? 0.55 : 1,
        transition: "transform 140ms ease, box-shadow 140ms ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!clickable) return;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        if (!clickable) return;
        e.currentTarget.style.transform = "translateY(0)";
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
