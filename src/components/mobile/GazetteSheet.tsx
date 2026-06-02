"use client";

import { useEffect, type CSSProperties } from "react";
import {
  Music,
  Dices,
  BookOpen,
  Shirt,
  Home,
  Palette,
  Wrench,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { METEO_ICON } from "@/data/meteos";
import { getBrocanteById } from "@/data/brocantes";
import { JOURS_SEMAINE } from "@/lib/meteo";
import { JOURS_COURT } from "@/lib/calendrier";
import type {
  CategorieObjet,
  CelebriteEvenement,
  Meteo,
  Tendance,
} from "@/types/game";

interface GazetteSheetProps {
  open: boolean;
  onClose: () => void;
  jourActuel: number;
  prochainRafraichissement: number;
  tendances: readonly Tendance[];
  categoriesConnues: ReadonlySet<CategorieObjet>;
  /** Météo des 7 jours de la semaine de jeu courante. null si non révélée. */
  meteoSemaine: Meteo[] | null;
  /** Jour de jeu du début de la semaine (Lundi). */
  jourDebutSemaine: number;
  revelerMeteo: boolean;
  celebrite: CelebriteEvenement | null;
  revelerCelebrite: boolean;
  achetee: boolean;
  onAcheter: () => void;
  budget: number;
  prixGazette: number;
}

/* ------------------------------------------------------------------ */
/* Ordre fixe des catégories + icônes                                  */
/* ------------------------------------------------------------------ */

const CATEGORIES_ORDRE: readonly CategorieObjet[] = [
  "Musique",
  "Jeux & Loisirs",
  "Livres & Papeterie",
  "Mode",
  "Maison",
  "Objets d'art",
  "Bricolage",
];

const CATEGORIE_ICON: Record<CategorieObjet, LucideIcon> = {
  Musique: Music,
  "Jeux & Loisirs": Dices,
  "Livres & Papeterie": BookOpen,
  Mode: Shirt,
  Maison: Home,
  "Objets d'art": Palette,
  Bricolage: Wrench,
};

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.55)",
  zIndex: 50,
  animation: "broc-fade-in 160ms ease",
};

const stage: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 51,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding:
    "max(40px, env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom))",
  pointerEvents: "none",
};

const paperWrap: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 380,
  aspectRatio: "248 / 320",
  pointerEvents: "auto",
  filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.45))",
  containerType: "inline-size",
};

const paperImg: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "fill",
  pointerEvents: "none",
};

const content: CSSProperties = {
  position: "absolute",
  inset: "2.5% 8% 6% 8%",
  display: "flex",
  flexDirection: "column",
  color: "var(--ink-900)",
};

/* --- en-tête : Jour / N° encadrant le titre PNG --- */

const headerBar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  fontFamily: "var(--font-display)",
  fontSize: "3.2cqw",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--ink-700)",
  marginBottom: 0,
  padding: "0 1%",
};

/* --- zone réservée au titre gravé dans le PNG --- */

const titleSpacer: CSSProperties = {
  flex: "0 0 21%",
};

/* --- séparateur Art Déco --- */

function SeparateurArtDeco() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "3%",
        margin: "2.6% 4%",
        color: "var(--ink-900)",
        opacity: 0.55,
      }}
      aria-hidden
    >
      <span
        style={{
          flex: 1,
          height: 1,
          background: "currentColor",
        }}
      />
      <svg
        viewBox="0 0 24 12"
        width="6cqw"
        height="3cqw"
        style={{ flex: "0 0 auto" }}
        fill="currentColor"
      >
        <polygon points="12,0 17,6 12,12 7,6" />
        <line
          x1="0"
          y1="6"
          x2="6"
          y2="6"
          stroke="currentColor"
          strokeWidth="0.8"
        />
        <line
          x1="18"
          y1="6"
          x2="24"
          y2="6"
          stroke="currentColor"
          strokeWidth="0.8"
        />
      </svg>
      <span
        style={{
          flex: 1,
          height: 1,
          background: "currentColor",
        }}
      />
    </div>
  );
}

/* --- titres de section --- */

const sectionTitle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "3.6cqw",
  fontWeight: 700,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  textAlign: "center",
  margin: "0 0 1.4%",
  color: "var(--ink-900)",
};

const placeholderLock: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: "2.9cqw",
  color: "var(--ink-500)",
  textAlign: "center",
  padding: "1% 4%",
  lineHeight: 1.35,
};

/* --- ligne tendance --- */

const tendanceRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: "2.5%",
  padding: "0.8% 1%",
  fontFamily: "var(--font-mono)",
  fontSize: "2.7cqw",
  borderBottom: "1px dotted rgba(0,0,0,0.18)",
};

/* --- semaine météo --- */

const meteoRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  marginTop: "0.5%",
};

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export function GazetteSheet(props: GazetteSheetProps) {
  const {
    open,
    onClose,
    jourActuel,
    prochainRafraichissement,
    tendances,
    categoriesConnues,
    meteoSemaine,
    jourDebutSemaine,
    revelerMeteo,
    celebrite,
    revelerCelebrite,
    achetee,
    onAcheter,
    budget,
    prixGazette,
  } = props;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const joursAvantRefresh = Math.max(0, prochainRafraichissement - jourActuel);
  const numeroSemaine = Math.floor((jourActuel - 1) / 7) + 1;
  const brocanteCeleb = celebrite ? getBrocanteById(celebrite.brocanteId) : null;
  const tendanceParCategorie = new Map(
    tendances.map((t) => [t.categorie, t.delta] as const),
  );

  // Floutage si non achetée — applique à toutes les sections de contenu.
  const lockedBlur: CSSProperties = !achetee
    ? { filter: "blur(6px)", opacity: 0.45, pointerEvents: "none" }
    : {};

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={paperWrap}>
          <img
            src="/qg/journalouvert.png"
            alt=""
            style={paperImg}
            draggable={false}
          />
          <div style={content}>
            {/* En-tête : Jour à gauche, N° de semaine à droite, AU-DESSUS de la bande titre */}
            <div style={headerBar}>
              <span>Jour {jourActuel}</span>
              <span>N° {String(numeroSemaine).padStart(3, "0")}</span>
            </div>

            {/* Espace réservé au titre gravé dans le PNG */}
            <div style={titleSpacer} />

            {/* Contenu floutable selon achat */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", ...lockedBlur }}>
              {/* ============== Carnet mondain ============== */}
              <h3 style={sectionTitle}>Carnet mondain</h3>
              {revelerCelebrite && celebrite ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "18% 1fr",
                    gap: "3%",
                    alignItems: "center",
                    padding: "0.5% 2% 1%",
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "1 / 1",
                      border: "1px solid rgba(0,0,0,0.4)",
                      background: "rgba(0,0,0,0.04)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-display)",
                      fontSize: "5cqw",
                      color: "var(--ink-500)",
                    }}
                    aria-hidden
                  >
                    ?
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: "3cqw",
                      lineHeight: 1.35,
                      color: "var(--ink-700)",
                    }}
                  >
                    <strong style={{ fontStyle: "normal" }}>{celebrite.nom}</strong>{" "}
                    est annoncé(e) à{" "}
                    <strong style={{ fontStyle: "normal" }}>
                      {brocanteCeleb?.nom ?? "une brocante"}
                    </strong>{" "}
                    le{" "}
                    <strong
                      style={{ fontStyle: "normal", textTransform: "uppercase" }}
                    >
                      {JOURS_SEMAINE[celebrite.jourSemaine]}
                    </strong>
                    .
                  </p>
                </div>
              ) : (
                <p style={placeholderLock}>
                  Débloquer avec <em>Carnet mondain</em>
                </p>
              )}

              <SeparateurArtDeco />

              {/* ============== Tendance du marché ============== */}
              <h3 style={sectionTitle}>Tendance du marché</h3>
              <div style={{ padding: "0 1%" }}>
                {CATEGORIES_ORDRE.map((cat) => {
                  const connu = categoriesConnues.has(cat);
                  const delta = tendanceParCategorie.get(cat);
                  const Icon = connu ? CATEGORIE_ICON[cat] : HelpCircle;
                  return (
                    <div key={cat} style={tendanceRow}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "4cqw",
                          height: "4cqw",
                          color: connu ? "var(--ink-900)" : "var(--ink-500)",
                        }}
                        aria-hidden
                      >
                        <Icon size="100%" strokeWidth={1.6} />
                      </span>
                      <span
                        style={{
                          color: connu ? "var(--ink-900)" : "var(--ink-500)",
                          fontFamily: connu
                            ? "var(--font-mono)"
                            : "var(--font-serif)",
                          fontStyle: connu ? "normal" : "italic",
                        }}
                      >
                        {connu ? cat : `Débloquer Veilleur — ${cat}`}
                      </span>
                      {connu && typeof delta === "number" ? (
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 600,
                            color:
                              delta >= 0
                                ? "var(--forest-800)"
                                : "var(--vermillion-600)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {delta >= 0 ? "↑" : "↓"} {delta > 0 ? "+" : ""}
                          {delta}%
                        </span>
                      ) : (
                        <span aria-hidden />
                      )}
                    </div>
                  );
                })}
              </div>

              <SeparateurArtDeco />

              {/* ============== Météo de la semaine ============== */}
              <h3 style={sectionTitle}>Météo de la semaine</h3>
              {revelerMeteo && meteoSemaine ? (
                <div style={{ padding: "0.5% 2%" }}>
                  <div style={meteoRow}>
                    {JOURS_COURT.map((j) => (
                      <div
                        key={`j-${j}`}
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "2.6cqw",
                          letterSpacing: "0.08em",
                          textAlign: "center",
                          color: "var(--ink-700)",
                        }}
                      >
                        {j[0]}
                      </div>
                    ))}
                  </div>
                  <div style={meteoRow}>
                    {meteoSemaine.map((m, i) => {
                      const Icon = METEO_ICON[m];
                      const jourCell = jourDebutSemaine + i;
                      const passe = jourCell < jourActuel;
                      return (
                        <div
                          key={`m-${i}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0.6cqw 0",
                            opacity: passe ? 0.42 : 1,
                            color: "var(--ink-900)",
                          }}
                          aria-hidden
                        >
                          <span
                            style={{
                              width: "5.2cqw",
                              height: "5.2cqw",
                              display: "inline-flex",
                            }}
                          >
                            <Icon size="100%" strokeWidth={1.5} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p style={placeholderLock}>
                  Débloquer avec <em>Bulletin météo</em>
                </p>
              )}

              {/* Footer : prochaine édition */}
              <div
                style={{
                  marginTop: "auto",
                  paddingTop: "2%",
                  textAlign: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "2.3cqw",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--ink-500)",
                }}
              >
                {joursAvantRefresh === 0
                  ? "Prochaine édition demain"
                  : `Prochaine édition dans ${joursAvantRefresh} jour${joursAvantRefresh > 1 ? "s" : ""}`}
              </div>
            </div>

            {/* CTA d'achat : visible uniquement si non achetée */}
            {!achetee && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: "4%",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  disabled={budget < prixGazette}
                  onClick={onAcheter}
                  style={{
                    padding: "3% 6%",
                    background:
                      budget < prixGazette
                        ? "var(--paper-500)"
                        : "var(--forest-800)",
                    color: "var(--brass-300)",
                    border: "1px solid var(--brass-500)",
                    fontFamily: "var(--font-display)",
                    fontSize: "3.4cqw",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    cursor: budget < prixGazette ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                  }}
                >
                  Acheter la gazette · {prixGazette} €
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
