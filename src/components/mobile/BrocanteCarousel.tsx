"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Store } from "lucide-react";
import type { Brocante, GameState } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";
import { getBrocanteImageUrl } from "@/lib/brocanteImages";
import { useLangue } from "@/lib/i18n/LangueContext";
import { descriptionBrocante, nomBrocante } from "@/lib/i18n/contenu";

interface BrocanteCarouselProps {
  brocantes: Brocante[];
  state: GameState;
  debloqueesIds: Set<string>;
  decrireConditions: (b: Brocante) => string;
  destination: "chiner" | "vitrine";
}

const wrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  alignItems: "stretch",
  minHeight: 0,
};

const scrollerStyle: CSSProperties = {
  display: "flex",
  overflowX: "auto",
  scrollSnapType: "x mandatory",
  scrollBehavior: "smooth",
  WebkitOverflowScrolling: "touch",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  position: "relative",
};

const slideStyle: CSSProperties = {
  flex: "0 0 100%",
  scrollSnapAlign: "start",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
  padding: "4px 4px 0",
  boxSizing: "border-box",
};

const imgFrame: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 320,
  aspectRatio: "1 / 1",
  border: "1.5px solid var(--brass-700)",
  background: "var(--paper-200)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500), 0 6px 14px rgba(40,25,5,0.18)",
  overflow: "hidden",
};

const arrowBtn: CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: 44,
  height: 44,
  display: "grid",
  placeItems: "center",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  borderRadius: "50%",
  cursor: "pointer",
  color: "var(--forest-800)",
  boxShadow: "0 2px 6px rgba(40,25,5,0.25)",
  zIndex: 5,
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 16,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  fontWeight: 700,
  textAlign: "center",
  lineHeight: 1.2,
};

const tierStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  color: "var(--brass-600)",
  letterSpacing: "0.1em",
  textAlign: "center",
};

const descStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 13,
  color: "var(--ink-500)",
  margin: 0,
  lineHeight: 1.4,
  textAlign: "center",
  maxWidth: 360,
};

const metaStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center",
};

const lockStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--vermillion-600)",
  letterSpacing: "0.06em",
  textAlign: "center",
  maxWidth: 360,
  lineHeight: 1.3,
};

const dotsRow: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 6,
  paddingTop: 6,
};

const dotStyle = (active: boolean): CSSProperties => ({
  width: active ? 22 : 8,
  height: 8,
  borderRadius: 4,
  background: active ? "var(--brass-500)" : "var(--paper-500)",
  transition: "width 180ms ease, background 180ms ease",
  cursor: "pointer",
  border: "none",
  padding: 0,
});

const compteurStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  color: "var(--ink-500)",
  textAlign: "center",
  marginTop: 2,
};

const enterBtn = (
  debloquee: boolean,
  peutEntrer: boolean,
): CSSProperties => ({
  width: "100%",
  maxWidth: 360,
  padding: "14px 16px",
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  background: debloquee && peutEntrer ? "var(--forest-800)" : "var(--paper-300)",
  color: debloquee && peutEntrer ? "var(--brass-300)" : "var(--ink-500)",
  cursor: debloquee && peutEntrer ? "pointer" : "not-allowed",
  opacity: !debloquee || !peutEntrer ? 0.65 : 1,
  boxShadow:
    debloquee && peutEntrer
      ? "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500), 0 4px 10px rgba(40,25,5,0.25)"
      : "none",
  margin: "8px auto 0",
  display: "block",
});

export function BrocanteCarousel({
  brocantes,
  state,
  debloqueesIds,
  decrireConditions,
  destination,
}: BrocanteCarouselProps) {
  const router = useRouter();
  const { d, tr, locale } = useLangue();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Réinitialise l'index courant quand la liste change (changement de tier)
  useEffect(() => {
    setActiveIdx(0);
    scrollerRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [brocantes]);

  const goTo = (i: number) => {
    const node = scrollerRef.current;
    if (!node) return;
    const clamped = Math.max(0, Math.min(brocantes.length - 1, i));
    node.scrollTo({ left: clamped * node.clientWidth, behavior: "smooth" });
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeIdx && idx >= 0 && idx < brocantes.length) {
      setActiveIdx(idx);
    }
  };

  if (brocantes.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 12px",
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          color: "var(--ink-500)",
        }}
      >
        {d.chine.aucuneBrocanteTier}
      </div>
    );
  }

  const current = brocantes[activeIdx];
  const currentDebloquee = debloqueesIds.has(current.id);
  const currentEntree = fraisEntree(current);
  const currentPeutEntrer = state.budget >= currentEntree;

  return (
    <div style={wrapStyle}>
      <div style={{ position: "relative" }}>
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          style={scrollerStyle}
          aria-roledescription={d.chine.roleCarrousel}
        >
          {brocantes.map((b) => {
            const debloquee = debloqueesIds.has(b.id);
            const raison = debloquee ? undefined : decrireConditions(b);
            const imageUrl = getBrocanteImageUrl(b.id);
            return (
              <article key={b.id} style={slideStyle} aria-roledescription={d.chine.roleSlide}>
                <div style={imgFrame}>
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={nomBrocante(b, locale)}
                      fill
                      sizes="(max-width: 600px) 86vw, 320px"
                      style={{
                        objectFit: "cover",
                        filter: debloquee
                          ? undefined
                          : "grayscale(1) brightness(0.95)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        background:
                          "linear-gradient(135deg, var(--paper-300) 0%, var(--brass-700) 100%)",
                      }}
                    >
                      <Store size={64} strokeWidth={1.2} color="var(--brass-100)" />
                    </div>
                  )}
                </div>

                <h2 style={titleStyle}>{nomBrocante(b, locale)}</h2>
                <div style={tierStyle}>{"★".repeat(b.tier)}</div>
                <p style={descStyle}>{descriptionBrocante(b, locale)}</p>
                <div style={metaStyle}>
                  {tr(d.chine.metaBrocante, {
                    taille: b.taillePool,
                    prix: fraisEntree(b),
                  })}
                </div>
                {!debloquee && raison && (
                  <div style={lockStyle}>⊘ {raison}</div>
                )}
              </article>
            );
          })}
        </div>

        {/* Flèches latérales (utiles tablette / desktop) */}
        {activeIdx > 0 && (
          <button
            type="button"
            onClick={() => goTo(activeIdx - 1)}
            aria-label={d.chine.brocantePrecedente}
            style={{ ...arrowBtn, left: 4 }}
          >
            <ChevronLeft size={20} strokeWidth={1.6} />
          </button>
        )}
        {activeIdx < brocantes.length - 1 && (
          <button
            type="button"
            onClick={() => goTo(activeIdx + 1)}
            aria-label={d.chine.brocanteSuivante}
            style={{ ...arrowBtn, right: 4 }}
          >
            <ChevronRight size={20} strokeWidth={1.6} />
          </button>
        )}
      </div>

      {/* Indicateurs de pagination */}
      <div>
        <div style={dotsRow}>
          {brocantes.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => goTo(i)}
              style={dotStyle(i === activeIdx)}
              aria-label={tr(d.chine.allerBrocante, { n: i + 1 })}
            />
          ))}
        </div>
        <div style={compteurStyle} aria-hidden>
          {activeIdx + 1} / {brocantes.length}
        </div>
      </div>

      {/* Bouton ENTRER (toujours pour la brocante actuellement visible) */}
      <button
        type="button"
        disabled={!currentDebloquee || !currentPeutEntrer}
        onClick={() => router.push(`/${destination}/${current.id}`)}
        style={enterBtn(currentDebloquee, currentPeutEntrer)}
      >
        {currentDebloquee
          ? currentPeutEntrer
            ? d.chine.entrer
            : d.chine.fondsInsuffisants
          : d.chine.ferme}
      </button>
    </div>
  );
}
