import Link from "next/link";
import { BrassCorners } from "@/components/ui/BrassCorners";
import { Button } from "@/components/ui/Button";

interface StatusBarProps {
  jour: number;
  budget: number;
}

export function StatusBar({ jour, budget }: StatusBarProps) {
  return (
    <header
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 20,
        padding: "10px 16px",
        background: "var(--forest-800)",
        backgroundImage: "url(/assets/grain-overlay.svg)",
        backgroundSize: "320px 320px",
        border: "1px solid var(--brass-500)",
        boxShadow:
          "inset 0 0 0 3px var(--forest-800), inset 0 0 0 4px var(--brass-700)",
        color: "var(--paper-200)",
        position: "relative",
      }}
    >
      <BrassCorners color="var(--brass-500)" inset={6} size={18} />

      <Link
        href="/qg"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingLeft: 14,
          textDecoration: "none",
        }}
      >
        <img src="/assets/broc-crest-light.svg" width={38} height={38} alt="Crest" />
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--brass-300)",
              lineHeight: 1,
            }}
          >
            Broc
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              marginTop: 3,
            }}
          >
            quartier général
          </div>
        </div>
      </Link>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "var(--brass-300)",
          }}
        >
          — Jour de Marché —
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--paper-100)",
            fontWeight: 600,
            marginTop: 2,
          }}
        >
          N°{String(jour).padStart(3, "0")}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 18,
          alignItems: "center",
          paddingRight: 14,
        }}
      >
        <Stat label="Caisse" value={`${budget.toLocaleString("fr-FR")} €`} accent />
        <span style={{ width: 1, height: 30, background: "var(--brass-700)" }} />
        <Link href="/">
          <Button
            variant="secondary"
            size="sm"
            style={{
              background: "transparent",
              color: "var(--brass-300)",
              borderColor: "var(--brass-500)",
              boxShadow:
                "inset 0 0 0 3px transparent, inset 0 0 0 4px var(--brass-500)",
            }}
          >
            Menu
          </Button>
        </Link>
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div style={{ textAlign: "right" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 17,
          color: accent ? "var(--brass-300)" : "var(--paper-200)",
          letterSpacing: "0.04em",
        }}
      >
        {value}
      </div>
    </div>
  );
}
