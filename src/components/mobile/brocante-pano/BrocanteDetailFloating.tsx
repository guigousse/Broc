"use client";

import { Lock, Package, Search, Wallet, Zap } from "lucide-react";
import { useState, type CSSProperties } from "react";
import type { Brocante, CategorieObjet, CollectionSlot } from "@/types/game";
import { fraisEntree } from "@/data/brocantes";
import { BONUS_SPECIALISATION_CLIENT, bourseMoyenne } from "@/lib/vitrine";
import type { ConditionInfo } from "@/lib/deblocage";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomBrocante } from "@/lib/i18n/contenu";
import { libelleCategorie } from "@/lib/i18n/libelles";
import { initCollection } from "@/lib/collection";
import { CATEGORY_ICONS } from "./categoryIcons";
import { CornerOrnament } from "@/components/mobile/CornerOrnament";
import { plaqueLaiton } from "@/components/ui/plaqueLaiton";
import { ObjetsTrouvablesSheet } from "./ObjetsTrouvablesSheet";

interface BrocanteDetailFloatingProps {
  brocante: Brocante;
  debloquee: boolean;
  /** Le joueur a-t-il assez de budget ? Influence la couleur du prix. */
  peutEntrer: boolean;
  /** Conditions atomiques + drapeau "satisfaite" (uniquement si !debloquee). */
  conditions: ConditionInfo[];
  /** Contexte : chinage (nb d'objets à chiner) ou vente (bourse moyenne des clients). */
  destination: "chiner" | "vitrine";
  /** Vente sur bourse à thème : le coffre contient des objets hors thème
   *  (bloque Continuer, un message explique la règle et sa contrepartie). */
  coffreHorsTheme?: boolean;
  /** Collection du joueur — pilote les silhouettes de la loupe (mode chiner). */
  collection?: Record<CategorieObjet, CollectionSlot[]>;
}

const cardStyle: CSSProperties = {
  pointerEvents: "auto",
  position: "relative",
  background: "rgba(245,239,225,0.95)",
  borderRadius: 6,
  // Double filet : extérieur brass-700 + intérieur brass-500 via shadow.
  border: "1px solid var(--brass-700)",
  boxShadow:
    "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px var(--brass-500), 0 8px 22px rgba(20,12,0,0.45)",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  padding: "14px 18px 12px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  maxWidth: 480,
  margin: "0 auto",
  overflow: "visible",
  boxSizing: "border-box",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-brocante-title)",
  fontSize: 20,
  fontWeight: 400,
  color: "var(--brass-500)",
  textShadow: "0 1px 0 rgba(255,235,180,0.4), 0 1px 2px rgba(80,50,10,0.25)",
  textAlign: "center",
  margin: 0,
  lineHeight: 1.1,
  letterSpacing: "0.01em",
  textWrap: "balance",
};

// Filet doré séparateur — fin, centré, gradient.
const goldRuleStyle: CSSProperties = {
  width: "70%",
  height: 1,
  background:
    "linear-gradient(90deg, transparent 0%, var(--brass-500) 20%, var(--brass-500) 80%, transparent 100%)",
  margin: "6px 0 2px",
};

/** Variante grisée du titre quand la brocante est verrouillée. */
const titleStyleLocked: CSSProperties = {
  ...titleStyle,
  color: "#6b6657",
  textShadow: "0 1px 0 rgba(255,255,255,0.35)",
  filter: "saturate(0.4)",
};








const fraisPlusStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 700,
  opacity: 0.55,
};

// Cachet thème circulaire — intégré dans la meta row à droite du prix.
const themeCachetStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background:
    "radial-gradient(circle at 30% 28%, #f0d18b 0%, #c89c4e 55%, #8a6429 100%)",
  border: "1.5px solid var(--brass-700)",
  display: "grid",
  placeItems: "center",
  color: "#3a2410",
  boxShadow:
    "0 2px 4px rgba(20,12,0,0.45), inset 0 1px 0 rgba(255,235,180,0.45)",
  flexShrink: 0,
};

// ── Carte de chinage (2026-08-28) : plaque de laiton + 4 cellules ──────────
const plaqueStyle: CSSProperties = {
  ...plaqueLaiton,
  width: "100%",
  boxSizing: "border-box",
  color: "var(--forest-900)",
  fontSize: 14,
  padding: "10px 18px",
};

const cellulesStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1.2fr 1fr auto",
  alignItems: "start",
  gap: 8,
  width: "100%",
  marginTop: 8,
};

/** Vente : trois cellules, pas de loupe. */
const cellulesVenteStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1.2fr 1fr",
  alignItems: "start",
  gap: 8,
  width: "100%",
  marginTop: 8,
};

const celluleStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 5,
  minWidth: 0,
};

const celluleLabelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  fontWeight: 700,
};

const celluleValeurStyle = (alerte = false): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily: "var(--font-display)",
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "0.04em",
  lineHeight: "32px",
  color: alerte ? "var(--vermillion-600)" : "var(--ink-900)",
  whiteSpace: "nowrap",
});

const themeVideStyle: CSSProperties = {
  ...celluleValeurStyle(),
  color: "var(--brass-700)",
  opacity: 0.6,
};

// La loupe « ? » : un bouton rond de laiton, au gabarit du cachet thème.
const loupeBtnStyle: CSSProperties = {
  ...themeCachetStyle,
  position: "relative",
  width: 36,
  height: 36,
  cursor: "pointer",
  padding: 0,
  font: "inherit",
};

const loupeInterrogation: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-62%, -62%)",
  fontFamily: "var(--font-display)",
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1,
  color: "#3a2410",
  pointerEvents: "none",
};

/** Vente sur bourse à thème : « Appétit +10 % sur Musique ». */
const appetitStyle: CSSProperties = {
  ...celluleLabelStyle,
  marginTop: 8,
  textAlign: "center",
  letterSpacing: "0.14em",
};

// Coffre hors thème : la plaque reste, un cadenas de laiton prend la place
// des cellules, et la règle tient en deux mots (« Musique uniquement »).
const cadenasStyle: CSSProperties = {
  color: "var(--brass-700)",
  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
  marginTop: 10,
};

const themeUniquementStyle: CSSProperties = {
  margin: "4px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontWeight: 700,
  textAlign: "center",
  color: "var(--vermillion-600)",
};

const conditionsListStyle: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "4px 0 0",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  alignItems: "center",
};

const conditionItemBase: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 700,
};

const conditionItemStyle = (met: boolean): CSSProperties => ({
  ...conditionItemBase,
  // Convention standard : vert (couleur forest du thème) = palier atteint,
  // rouge vermillon = palier encore manquant.
  color: met ? "var(--forest-700)" : "var(--vermillion-600)",
});

export function BrocanteDetailFloating({
  brocante,
  debloquee,
  peutEntrer,
  conditions,
  destination,
  coffreHorsTheme = false,
  collection,
}: BrocanteDetailFloatingProps) {
  const { d, tr, locale } = useLangue();
  const [loupeOuverte, setLoupeOuverte] = useState(false);
  const ThemeIcon = brocante.specialisation
    ? CATEGORY_ICONS[brocante.specialisation]
    : null;

  // --- Layout VERROUILLÉ : nom gris + liste des conditions colorées ---
  if (!debloquee) {
    return (
      <aside style={cardStyle} aria-live="polite">
        <CornerOrnament position="tl" />
        <CornerOrnament position="tr" />
        <CornerOrnament position="bl" />
        <CornerOrnament position="br" />
        <h2 style={titleStyleLocked}>{nomBrocante(brocante, locale)}</h2>
        <div style={goldRuleStyle} aria-hidden />
        <ul style={conditionsListStyle}>
          {conditions.map((c, i) => (
            <li key={i} style={conditionItemStyle(c.met)}>
              {c.text}
            </li>
          ))}
        </ul>
      </aside>
    );
  }

  // --- Layout CHINAGE (2026-08-28) : plaque de laiton, puis Taille / Entrée /
  // Thème / loupe. Pas de description : la scène du panorama la raconte déjà.
  if (destination === "chiner") {
    return (
      <>
        <aside style={cardStyle} aria-live="polite">
          <CornerOrnament position="tl" />
          <CornerOrnament position="tr" />
          <CornerOrnament position="bl" />
          <CornerOrnament position="br" />
          <h2 style={plaqueStyle} data-testid="brocante-plaque">
            {nomBrocante(brocante, locale)}
          </h2>
          <div style={cellulesStyle}>
            <div style={celluleStyle}>
              <span style={celluleLabelStyle}>{d.chine.tailleLabel}</span>
              <span
                style={celluleValeurStyle()}
                data-testid="brocante-taille"
                aria-label={tr(d.chine.taillePoolItems, {
                  n: brocante.taillePool,
                })}
              >
                {brocante.taillePool}
                <Package size={16} strokeWidth={1.8} aria-hidden />
              </span>
            </div>
            <div style={celluleStyle}>
              <span style={celluleLabelStyle}>{d.chine.entreeLabel}</span>
              <span
                style={celluleValeurStyle(!peutEntrer)}
                data-testid="brocante-entree"
                aria-label={tr(d.chine.entreeAria, {
                  prix: fraisEntree(brocante),
                })}
              >
                {fraisEntree(brocante)} €<span style={fraisPlusStyle}>+</span>
                <Zap size={14} strokeWidth={2} aria-hidden />
              </span>
            </div>
            <div style={celluleStyle}>
              <span style={celluleLabelStyle}>{d.chine.themeLabel}</span>
              {ThemeIcon ? (
                <div
                  style={themeCachetStyle}
                  data-testid="brocante-theme"
                  aria-label={tr(d.chine.themeAria, {
                    theme: brocante.specialisation
                      ? libelleCategorie(brocante.specialisation, d)
                      : "",
                  })}
                >
                  <ThemeIcon size={18} strokeWidth={2} />
                </div>
              ) : (
                <span
                  style={themeVideStyle}
                  data-testid="brocante-theme"
                  aria-hidden
                >
                  —
                </span>
              )}
            </div>
            <div style={celluleStyle}>
              <span style={celluleLabelStyle} aria-hidden>
                &nbsp;
              </span>
              <button
                type="button"
                style={loupeBtnStyle}
                onClick={() => setLoupeOuverte(true)}
                aria-label={d.chine.objetsTrouvablesAria}
              >
                <Search size={20} strokeWidth={2} aria-hidden />
                <span style={loupeInterrogation} aria-hidden>
                  ?
                </span>
              </button>
            </div>
          </div>
        </aside>
        {/* Hors de la carte : son backdrop-filter ferait d'elle le bloc de
          confinement de la sheet `position: fixed`, qui s'ouvrirait DEDANS.
          Et la couche flottante est en pointer-events: none (propriété
          héritée) : sans ce div, la sheet ne recevrait aucun tap. */}
        <div style={{ pointerEvents: "auto" }}>
          <ObjetsTrouvablesSheet
            open={loupeOuverte}
            onClose={() => setLoupeOuverte(false)}
            brocante={brocante}
            collection={collection ?? EMPTY_COLLECTION}
          />
        </div>
      </>
    );
  }

  // --- Layout VENTE (2026-08-29) : même plaque, Budgets moyens / Entrée /
  // Thème ; « Appétit +x % » si spécialisée ; cadenas si le coffre sort du thème.
  const spe = brocante.specialisation;
  const categorie = spe ? libelleCategorie(spe, d) : "";
  return (
    <aside style={cardStyle} aria-live="polite">
      <CornerOrnament position="tl" />
      <CornerOrnament position="tr" />
      <CornerOrnament position="bl" />
      <CornerOrnament position="br" />
      <h2
        style={coffreHorsTheme ? { ...plaqueStyle, filter: "saturate(0.4)" } : plaqueStyle}
        data-testid="brocante-plaque"
      >
        {nomBrocante(brocante, locale)}
      </h2>
      {coffreHorsTheme && spe ? (
        <>
          <Lock
            size={28}
            strokeWidth={2.2}
            style={cadenasStyle}
            data-testid="brocante-cadenas"
            aria-hidden
          />
          <p style={themeUniquementStyle} role="alert">
            {tr(d.chine.themeUniquement, { categorie })}
          </p>
        </>
      ) : (
        <>
          <div style={cellulesVenteStyle}>
            <div style={celluleStyle}>
              <span style={celluleLabelStyle}>{d.chine.budgetsLabel}</span>
              <span
                style={celluleValeurStyle()}
                data-testid="brocante-budget"
                aria-label={tr(d.chine.bourseMoyenneClientsAria, {
                  valeur: bourseMoyenne(brocante),
                })}
              >
                {bourseMoyenne(brocante)} €
                <Wallet size={16} strokeWidth={1.8} aria-hidden />
              </span>
            </div>
            <div style={celluleStyle}>
              <span style={celluleLabelStyle}>{d.chine.entreeLabel}</span>
              <span
                style={celluleValeurStyle(!peutEntrer)}
                data-testid="brocante-entree"
                aria-label={tr(d.chine.entreeAria, {
                  prix: fraisEntree(brocante),
                })}
              >
                {fraisEntree(brocante)} €<span style={fraisPlusStyle}>+</span>
                <Zap size={14} strokeWidth={2} aria-hidden />
              </span>
            </div>
            <div style={celluleStyle}>
              <span style={celluleLabelStyle}>{d.chine.themeLabel}</span>
              {ThemeIcon ? (
                <div
                  style={themeCachetStyle}
                  data-testid="brocante-theme"
                  aria-label={tr(d.chine.themeAria, { theme: categorie })}
                >
                  <ThemeIcon size={18} strokeWidth={2} />
                </div>
              ) : (
                <span style={themeVideStyle} data-testid="brocante-theme" aria-hidden>
                  —
                </span>
              )}
            </div>
          </div>
          {spe && (
            <p style={appetitStyle} data-testid="brocante-appetit">
              {tr(d.chine.appetitTheme, {
                pct: Math.round((BONUS_SPECIALISATION_CLIENT - 1) * 100),
                categorie,
              })}
            </p>
          )}
        </>
      )}
    </aside>
  );
}

const EMPTY_COLLECTION = initCollection();

