"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { Brocante, GameState } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";
import { getBrocanteImageUrl } from "@/lib/brocanteImages";
import { Store } from "lucide-react";

interface BrocanteCardProps {
  brocante: Brocante;
  state: GameState;
  debloquee: boolean;
  raisonVerrou?: string;
  destination: "chiner" | "vitrine";
}

const cardStyle: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: 10,
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: 12,
  alignItems: "stretch",
};

const imageBoxStyle: CSSProperties = {
  width: 96,
  aspectRatio: "1 / 1",
  position: "relative",
  background:
    "linear-gradient(135deg, var(--paper-300) 0%, var(--brass-700) 100%)",
  border: "1px solid var(--brass-700)",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  flexShrink: 0,
};

const colTextStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  fontWeight: 700,
  lineHeight: 1.2,
};

const tierStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  color: "var(--brass-600)",
  letterSpacing: "0.06em",
  whiteSpace: "nowrap",
};

const descStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 12,
  color: "var(--ink-500)",
  margin: 0,
  lineHeight: 1.25,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const metaStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  color: "var(--brass-700)",
  letterSpacing: "0.08em",
};

const lockStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--vermillion-600)",
  letterSpacing: "0.06em",
  lineHeight: 1.2,
};

const btnStyle = (debloquee: boolean, peutEntrer: boolean): CSSProperties => ({
  padding: "7px 12px",
  fontFamily: "var(--font-display)",
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  background: debloquee ? "var(--forest-800)" : "var(--paper-300)",
  color: debloquee ? "var(--brass-300)" : "var(--ink-500)",
  cursor: debloquee && peutEntrer ? "pointer" : "not-allowed",
  opacity: !debloquee || !peutEntrer ? 0.6 : 1,
  alignSelf: "flex-end",
  marginTop: "auto",
});

export function BrocanteCard({
  brocante,
  state,
  debloquee,
  raisonVerrou,
  destination,
}: BrocanteCardProps) {
  const router = useRouter();
  const entree = fraisEntree(brocante);
  const peutEntrer = state.budget >= entree;
  const imageUrl = getBrocanteImageUrl(brocante.id);

  return (
    <article style={{ ...cardStyle, opacity: debloquee ? 1 : 0.6 }}>
      {/* Image carrée à gauche */}
      <div style={imageBoxStyle}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={brocante.nom}
            fill
            sizes="96px"
            style={{
              objectFit: "cover",
              filter: debloquee ? undefined : "grayscale(1) brightness(0.85)",
            }}
          />
        ) : (
          <Store
            size={36}
            strokeWidth={1.2}
            color="var(--brass-100)"
            aria-hidden
          />
        )}
      </div>

      {/* Bloc texte à droite */}
      <div style={colTextStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 6,
          }}
        >
          <span style={titleStyle}>{brocante.nom}</span>
          <span style={tierStyle}>{"★".repeat(brocante.tier)}</span>
        </div>

        <p style={descStyle}>{brocante.description}</p>

        <div style={metaStyle}>
          {brocante.taillePool} items · entrée {entree} €
        </div>

        {!debloquee && raisonVerrou && (
          <div style={lockStyle}>⊘ {raisonVerrou}</div>
        )}

        <button
          type="button"
          disabled={!debloquee || !peutEntrer}
          onClick={() => router.push(`/${destination}/${brocante.id}`)}
          style={btnStyle(debloquee, peutEntrer)}
        >
          {debloquee ? "Entrer" : "Fermé"}
        </button>
      </div>
    </article>
  );
}
