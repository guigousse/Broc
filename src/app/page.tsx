"use client";

import { Button } from "@/components/ui/Button";
import { BrassCorners } from "@/components/ui/BrassCorners";
import { useGame } from "@/context/GameContext";

export default function TitleScreen() {
  const { nouvellePartie, state, isHydrated } = useGame();
  const aSauvegarde = isHydrated && state !== null;

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100dvh",
        width: "100%",
        backgroundColor: "var(--forest-900)",
        backgroundImage:
          "radial-gradient(ellipse at 50% 35%, rgba(40,74,56,0.7) 0%, rgba(15,31,24,0) 65%), url(/assets/grain-overlay.svg)",
        backgroundSize: "cover, 320px 320px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: "40px 24px",
      }}
    >
      {/* Sunburst rays */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-conic-gradient(
            from 0deg at 50% 38%,
            rgba(197,160,89,0.05) 0deg 4deg,
            rgba(0,0,0,0) 4deg 12deg
          )`,
          pointerEvents: "none",
        }}
      />

      {/* Brass frame outer */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 24,
          border: "1px solid var(--brass-700)",
          boxShadow: "inset 0 0 0 5px transparent, inset 0 0 0 6px var(--brass-700)",
          pointerEvents: "none",
        }}
      />
      {/* Brass frame inner */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 32,
          border: "1px solid var(--brass-500)",
          pointerEvents: "none",
        }}
      />
      <BrassCorners color="var(--brass-500)" inset={34} size={40} />

      <div
        style={{
          position: "relative",
          textAlign: "center",
          maxWidth: 720,
          padding: "0 20px",
        }}
      >
        <img
          src="/assets/broc-crest-light.svg"
          width={120}
          height={120}
          alt=""
          style={{
            display: "block",
            margin: "0 auto 24px",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
          }}
        />

        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: "var(--brass-500)",
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          — une simulation de brocante —
        </div>

        <img
          src="/assets/broc-wordmark-light.svg"
          width={520}
          alt="Broc"
          style={{
            display: "block",
            margin: "0 auto 6px",
            maxWidth: "100%",
            filter:
              "drop-shadow(0 8px 20px rgba(0,0,0,0.45)) brightness(1.05)",
          }}
        />

        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 20,
            color: "var(--paper-300)",
            margin: "8px auto 36px",
            maxWidth: 560,
            lineHeight: 1.4,
          }}
        >
          « Chinez, restaurez, négociez.
          <br />
          Faites parler les objets de leur siècle. »
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            alignItems: "center",
          }}
        >
          <Button variant="primary" size="lg" onClick={nouvellePartie}>
            Nouvelle Partie
          </Button>
          <Button
            variant="secondary"
            size="md"
            disabled={!aSauvegarde}
            onClick={() => aSauvegarde && (window.location.href = "/qg")}
            style={{
              background: "transparent",
              color: "var(--brass-300)",
              borderColor: "var(--brass-500)",
              boxShadow:
                "inset 0 0 0 3px transparent, inset 0 0 0 4px var(--brass-500)",
            }}
          >
            Continuer · Sauvegarde
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled
            style={{ color: "var(--brass-300)" }}
          >
            Réglages · Crédits
          </Button>
        </div>

        <div
          style={{
            marginTop: 48,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--brass-700)",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
          }}
        >
          ver. 0.1 · saison de printemps · 1924
        </div>
      </div>
    </main>
  );
}
