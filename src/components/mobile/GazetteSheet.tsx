"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
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
import { estJourBraderie, prochaineBraderie } from "@/lib/evenements";
import { indicesValides, paginerSections } from "@/lib/gazettePagination";
import { getCelebriteIllustration } from "@/lib/personaIllustrations";
import { nomBrocante, nomCelebrite, nomCompetence } from "@/lib/i18n/contenu";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie, libelleJourSemaine } from "@/lib/i18n/libelles";
import type {
  CategorieObjet,
  CelebriteEvenement,
  Meteo,
  Tendance,
} from "@/types/game";

/**
 * Les trois paliers de l'arbre Vision (ids statiques générés par `expandTree` :
 * `general.vision.{numero}`) — noms résolus via l'overlay compétences (SP3),
 * nom FR canonique en fallback. Mêmes ids que `src/data/competences.ts`.
 */
const PALIERS_VISION = {
  bulletinMeteo: { id: "general.vision.1", nom: "Bulletin météo" },
  carnetMondain: { id: "general.vision.2", nom: "Carnet mondain" },
  influence: { id: "general.vision.3", nom: "Influence" },
} as const;

interface GazetteSheetProps {
  open: boolean;
  onClose: () => void;
  jourActuel: number;
  tendances: readonly Tendance[];
  categoriesConnues: ReadonlySet<CategorieObjet>;
  /** Météo des 7 jours de la semaine de jeu courante. null si non révélée. */
  meteoSemaine: Meteo[] | null;
  /** Jour de jeu du début de la semaine (Lundi). */
  jourDebutSemaine: number;
  revelerMeteo: boolean;
  celebrite: CelebriteEvenement | null;
  revelerCelebrite: boolean;
  /** Influence (compétence Vision 3) disponible et pas encore consommée aujourd'hui. */
  influenceDisponible: boolean;
  /** Relance la météo de la semaine via l'Influence. */
  onRerollMeteo: () => void;
  /** Relance la célébrité annoncée via l'Influence. */
  onRerollCelebrite: () => void;
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
  aspectRatio: "248 / 336",
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
  inset: "1.4% 8% 6% 8%",
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

/* --- zone corps (sous l'en-tête) : accueille les deux couches de pagination --- */

const corps: CSSProperties = {
  flex: 1,
  // Sans ce `minHeight: 0`, le quirk flexbox de « taille minimale
  // automatique » empêche `corps` de rétrécir sous la hauteur intrinsèque de
  // son contenu (couche visible) — il grandit alors avec le texte au lieu de
  // se caler sur l'espace qui lui est vraiment alloué. Résultat : la lecture
  // JS de `corpsEl.clientHeight` (base du calcul de pagination) renvoyait une
  // hauteur gonflée par le contenu du premier rendu au lieu de l'espace
  // réellement disponible dans le papier → pagination sous-évaluée, débord.
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  position: "relative",
};

/**
 * Couche de mesure : toutes les sections montées mais invisibles, superposées
 * en position absolue sur la zone corps (même largeur que la couche visible,
 * donc mêmes tailles `cqw`) — sert uniquement à lire `offsetHeight`.
 */
const coucheMesure: CSSProperties = {
  position: "absolute",
  inset: 0,
  visibility: "hidden",
  pointerEvents: "none",
  overflow: "hidden",
};

/**
 * Style du wrapper de mesure PAR SECTION : flex column (et non un bloc par
 * défaut) pour reproduire fidèlement le comportement de marges de la couche
 * visible (items flex directs de `corps`, pas de fusion de marges entre
 * voisins ni d'échappement de la marge du premier/dernier enfant hors du
 * wrapper). Un simple `<div>` bloc sous-évalue `offsetHeight` ici.
 */
const coucheMesureSection: CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const coucheVisible: CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

/**
 * Coin de page corné, cliquable, ombré. Cible tactile carrée PLEINE (le
 * `<button>` n'est jamais clippé — un `clip-path` sur l'élément cliquable
 * réduit le hit-testing au triangle visuel, ~15 px utiles en moins) ; le
 * triangle plié n'est que le rendu visuel, porté par un `<span>` enfant.
 */
const coinCorneBouton = (cote: "droit" | "gauche"): CSSProperties => ({
  position: "absolute",
  bottom: "1.5%",
  [cote === "droit" ? "right" : "left"]: "1.5%",
  width: "9cqw",
  height: "9cqw",
  padding: 0,
  border: "none",
  cursor: "pointer",
  background: "transparent",
  zIndex: 4,
});

/** Rendu visuel du coin corné : triangle papier replié, dégradé vers son ombre. */
const coinCorneVisuel = (cote: "droit" | "gauche"): CSSProperties => ({
  display: "block",
  width: "100%",
  height: "100%",
  clipPath:
    cote === "droit"
      ? "polygon(100% 0, 100% 100%, 0 100%)"
      : "polygon(0 0, 0 100%, 100% 100%)",
  backgroundImage:
    cote === "droit"
      ? "linear-gradient(315deg, #d8cdb4 0%, #efe7d2 45%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0) 60%)"
      : "linear-gradient(45deg, #d8cdb4 0%, #efe7d2 45%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0) 60%)",
});

const indicateurPageStyle: CSSProperties = {
  position: "absolute",
  bottom: "1.8%",
  left: "50%",
  transform: "translateX(-50%)",
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: "3cqw",
  color: "var(--ink-700)",
  zIndex: 4,
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

const influenceButton: CSSProperties = {
  display: "block",
  margin: "0.6% auto 0",
  padding: 0,
  background: "none",
  border: "none",
  fontFamily: "var(--font-mono)",
  fontSize: "2.3cqw",
  letterSpacing: "0.04em",
  color: "var(--ink-700)",
  opacity: 0.75,
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
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

/**
 * Rendu de la phrase d'annonce de célébrité (`d.gazette.celebriteAnnonce`) avec mise en
 * emphase des 3 valeurs interpolées — le gabarit reste un simple template par langue
 * (`{nom}`/`{brocante}`/`{jour}`), on découpe dessus plutôt que de coder la structure de
 * phrase en dur (qui diffère par langue).
 */
function renderCelebriteAnnonce(
  gabarit: string,
  valeurs: { nom: string; brocante: string; jour: string },
): ReactNode[] {
  const segments = gabarit.split(/(\{nom\}|\{brocante\}|\{jour\})/);
  return segments.map((segment, i) => {
    if (segment === "{nom}") {
      return (
        <strong key={i} style={{ fontStyle: "normal" }}>
          {valeurs.nom}
        </strong>
      );
    }
    if (segment === "{brocante}") {
      return (
        <strong key={i} style={{ fontStyle: "normal" }}>
          {valeurs.brocante}
        </strong>
      );
    }
    if (segment === "{jour}") {
      return (
        <strong key={i} style={{ fontStyle: "normal", textTransform: "uppercase" }}>
          {valeurs.jour}
        </strong>
      );
    }
    return <span key={i}>{segment}</span>;
  });
}

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export function GazetteSheet(props: GazetteSheetProps) {
  const {
    open,
    onClose,
    jourActuel,
    tendances,
    categoriesConnues,
    meteoSemaine,
    jourDebutSemaine,
    revelerMeteo,
    celebrite,
    revelerCelebrite,
    influenceDisponible,
    onRerollMeteo,
    onRerollCelebrite,
  } = props;
  const { d, tr, locale } = useLangue();

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

  const numeroSemaine = Math.floor((jourActuel - 1) / 7) + 1;
  const brocanteCeleb = celebrite ? getBrocanteById(celebrite.brocanteId) : null;
  // `undefined` si le nom n'est pas au catalogue des portraits : la vignette
  // « ? » d'origine reste alors le repli, plutôt qu'une image cassée.
  const portraitCeleb = celebrite ? getCelebriteIllustration(celebrite.nom) : undefined;
  const tendanceParCategorie = new Map(
    tendances.map((t) => [t.categorie, t.delta] as const),
  );

  // Sections du corps, dans l'ordre d'affichage — la braderie est
  // conditionnelle, les trois autres sont toujours présentes. Construites à
  // chaque rendu (calcul pur) ; seule `contenuKey` ci-dessous pilote la
  // re-pagination pour éviter une boucle d'effet.
  const sections: { key: string; node: ReactNode }[] = [];
  if (prochaineBraderie(jourActuel) - jourActuel <= 7) {
    sections.push({
      key: "braderie",
      node: (
        <>
          <h3 style={sectionTitle}>{d.gazette.braderieTitre}</h3>
          <p
            style={{
              margin: 0,
              padding: "0.5% 2% 1%",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "3cqw",
              lineHeight: 1.35,
              color: "var(--ink-700)",
            }}
          >
            {estJourBraderie(jourActuel)
              ? d.gazette.braderieEnCours
              : d.gazette.braderieAnnonce}
          </p>
          <SeparateurArtDeco />
        </>
      ),
    });
  }

  sections.push({
    key: "carnet",
    node: (
      <>
        <h3 style={sectionTitle}>Carnet mondain</h3>
        {revelerCelebrite && celebrite ? (
          <>
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
                overflow: "hidden",
              }}
              aria-hidden
            >
              {portraitCeleb ? (
                <img
                  src={portraitCeleb}
                  alt=""
                  data-testid="gazette-portrait-celebrite"
                  style={{
                    width: "100%",
                    height: "100%",
                    // Les portraits sont des figures DÉTOURÉES posées sur le bas
                    // du cadre — même convention que PersonaAvatar. Un `cover`
                    // recadrerait au milieu du buste.
                    objectFit: "contain",
                    objectPosition: "center bottom",
                    // Encre du journal : la vignette appartient au papier au
                    // lieu d'y être collée. Réversible en retirant cette ligne.
                    filter: "grayscale(1) sepia(0.35) contrast(1.08)",
                  }}
                />
              ) : (
                "?"
              )}
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
              {renderCelebriteAnnonce(d.gazette.celebriteAnnonce, {
                nom: nomCelebrite(celebrite.nom, locale),
                brocante: brocanteCeleb
                  ? nomBrocante(brocanteCeleb, locale)
                  : d.gazette.celebriteBrocanteInconnue,
                jour: libelleJourSemaine(celebrite.jourSemaine, d),
              })}
            </p>
          </div>
          {influenceDisponible && (
            <button
              type="button"
              onClick={onRerollCelebrite}
              style={influenceButton}
            >
              ↻ {nomCompetence(PALIERS_VISION.influence, locale)}
            </button>
          )}
          </>
        ) : (
          <p style={placeholderLock}>
            {d.sheets.debloquerAvec} <em>{nomCompetence(PALIERS_VISION.carnetMondain, locale)}</em>
          </p>
        )}

        <SeparateurArtDeco />
      </>
    ),
  });

  sections.push({
    key: "tendances",
    node: (
      <>
        <h3 style={sectionTitle}>{d.sheets.tendanceMarche}</h3>
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
                  {connu
                    ? libelleCategorie(cat, d)
                    : `${d.sheets.debloquerPrefixe} Veilleur — ${libelleCategorie(cat, d)}`}
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
      </>
    ),
  });

  sections.push({
    key: "meteo",
    node: (
      <>
        <h3 style={sectionTitle}>{d.sheets.meteoSemaineTitre}</h3>
        {revelerMeteo && meteoSemaine ? (
          <div style={{ padding: "0 2%", marginTop: "-1%" }}>
            <div style={meteoRow}>
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={`j-${i}`}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "2.6cqw",
                    letterSpacing: "0.08em",
                    textAlign: "center",
                    color: "var(--ink-700)",
                  }}
                >
                  {libelleJourSemaine(i, d)[0]}
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
                        width: "4.7cqw",
                        height: "4.7cqw",
                        display: "inline-flex",
                      }}
                    >
                      <Icon size="100%" strokeWidth={1.5} />
                    </span>
                  </div>
                );
              })}
            </div>
            {influenceDisponible && (
              <button
                type="button"
                onClick={onRerollMeteo}
                style={influenceButton}
              >
                ↻ {nomCompetence(PALIERS_VISION.influence, locale)}
              </button>
            )}
          </div>
        ) : (
          <p style={placeholderLock}>
            {d.sheets.debloquerAvec} <em>{nomCompetence(PALIERS_VISION.bulletinMeteo, locale)}</em>
          </p>
        )}
      </>
    ),
  });

  const [pages, setPages] = useState<number[][]>([sections.map((_, i) => i)]);
  const [pageIndex, setPageIndex] = useState(0);
  const mesureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const corpsRef = useRef<HTMLDivElement>(null); // zone sous l'en-tête

  // Clé de contenu : re-mesurer quand la composition change (ouverture, langue,
  // présence de l'encart braderie ou de la célébrité).
  const contenuKey = `${open}|${locale}|${sections.map((s) => s.key).join(",")}`;
  useLayoutEffect(() => {
    if (!open) return;
    setPageIndex(0);
    const corpsEl = corpsRef.current;
    if (!corpsEl) return;
    const hauteurs = mesureRefs.current
      .slice(0, sections.length)
      .map((el) => el?.offsetHeight ?? 0);
    // Marge basse : 4 % de la hauteur du papier (respiration avant le bord).
    const dispo = corpsEl.clientHeight - corpsEl.clientHeight * 0.04;
    setPages(paginerSections(hauteurs, dispo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contenuKey]);

  if (!open) return null;

  // Garde : la sheet reste montée à travers les changements de jour, et le
  // `useLayoutEffect` de repagination ne tourne qu'APRÈS ce rendu — si la
  // composition s'est réduite entre-temps (ex. l'encart braderie a disparu),
  // `pages[pageIndex]` peut encore contenir des indices hors bornes.
  const pageCourante = indicesValides(pages[pageIndex] ?? [], sections.length);

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={paperWrap}>
          <img
            src="/qg/journalouvert.webp"
            alt=""
            style={paperImg}
            draggable={false}
          />
          <div style={content}>
            {/* En-tête : N° semaine à gauche et à droite, AU-DESSUS de la bande titre */}
            <div style={headerBar}>
              <span>
                {tr(d.sheets.semaineNumero, {
                  n: String(numeroSemaine).padStart(3, "0"),
                })}
              </span>
              <span>
                {tr(d.sheets.numeroGazette, {
                  n: String(numeroSemaine).padStart(3, "0"),
                })}
              </span>
            </div>

            {/* Espace réservé au titre gravé dans le PNG */}
            <div style={titleSpacer} />

            <div ref={corpsRef} style={corps}>
              {/* Couche de mesure : toutes les sections, montées mais invisibles —
                  sert uniquement à lire leur hauteur réelle avant pagination. */}
              <div style={coucheMesure} aria-hidden>
                {sections.map((s, i) => (
                  // display:flex column (et pas un simple bloc) : la couche
                  // visible rend les enfants de chaque section comme des
                  // items flex directs de `corps` (Fragment aplati), où les
                  // marges NE FUSIONNENT PAS entre voisins. Un wrapper bloc
                  // ici sous-évaluerait la hauteur réelle (marges fusionnées
                  // entre titre/séparateur), causant un débord non détecté.
                  <div
                    key={s.key}
                    ref={(el) => {
                      mesureRefs.current[i] = el;
                    }}
                    style={coucheMesureSection}
                  >
                    {s.node}
                  </div>
                ))}
              </div>

              {/* Couche visible : seulement les sections de la page courante. */}
              <div style={coucheVisible}>
                {pageCourante.map((i) => (
                  <Fragment key={sections[i].key}>{sections[i].node}</Fragment>
                ))}
              </div>
            </div>
          </div>

          {pages.length > 1 && (
            <>
              {pageIndex < pages.length - 1 && (
                <button
                  type="button"
                  onClick={() => setPageIndex((p) => p + 1)}
                  aria-label={d.gazette.pageSuivanteAria}
                  style={coinCorneBouton("droit")}
                >
                  <span aria-hidden style={coinCorneVisuel("droit")} />
                </button>
              )}
              {pageIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setPageIndex((p) => p - 1)}
                  aria-label={d.gazette.pagePrecedenteAria}
                  style={coinCorneBouton("gauche")}
                >
                  <span aria-hidden style={coinCorneVisuel("gauche")} />
                </button>
              )}
              <span
                aria-live="polite"
                aria-label={tr(d.gazette.pageIndicateurAria, {
                  page: String(pageIndex + 1),
                  total: String(pages.length),
                })}
                style={indicateurPageStyle}
              >
                {pageIndex + 1}/{pages.length}
              </span>
            </>
          )}
        </div>
      </div>
    </>
  );
}
