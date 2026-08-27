"use client";

import { useEffect, type CSSProperties } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { useSettingsSafe } from "@/context/SettingsContext";
import { lienNotation } from "@/lib/soutien/liens";
import { ouvrirLien } from "@/lib/soutien/ouvrir";
import { CoeurPixel } from "./CoeurPixel";

/**
 * La demande de soutien de la borne d'arcade — un overlay POSÉ DEVANT LA
 * BORNE, dans le vocabulaire de la borne : fond de tube cathodique, liseré
 * vert, police 8-bit, lignes de balayage. La feuille papier d'avant (une
 * `BottomSheet` de brocante) faisait sortir le joueur du meuble qu'il venait
 * de toucher ; ici, c'est la machine qui répond.
 *
 * Un seul bouton, celui de l'avis. Les réseaux sociaux vivent à la page
 * « Soutenir » du menu : les empiler ici transformait une pichenette en
 * formulaire.
 *
 * ⚠ RÈGLE NON NÉGOCIABLE, la même qu'ailleurs : « laisser un avis » ouvre la
 * FICHE du store (`lienNotation()`), JAMAIS la feuille de notation native.
 * Google l'interdit nommément et sanctionne la fiche, pas un test rouge.
 * Voir `src/lib/soutien/notation.ts`.
 */

interface SoutienBorneOverlayProps {
  open: boolean;
  onClose: () => void;
}

const VERT = "#7dfcae";
const VERT_PALE = "#b7ffd6";
const TUBE = "#04140b";

/* Pas de voile noir : le flou de profondeur du reste de l'appli (Réglages,
   Crédits, Parties, et l'écran de la borne juste dessous). Le décor recule
   sans disparaître — on garde la sensation d'être DEVANT la borne, pas
   devant un trou noir. Le voile forêt à 0,35 est celui des autres overlays. */
const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  background: "rgba(15,31,24,0.35)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  display: "grid",
  placeItems: "center",
  padding: "calc(16px + var(--safe-top)) 16px calc(16px + var(--safe-bottom))",
  animation: "broc-fade-in 160ms ease",
};

/* Pas un pixel de rayon : un cadre arcade est carré. Le double liseré est
   obtenu à l'ombre (vert, noir, vert) — c'est la bordure de tube d'une borne,
   pas la moulure laiton du reste du jeu. */
const cadre: CSSProperties = {
  position: "relative",
  width: "min(100%, 340px)",
  maxHeight: "100%",
  overflowY: "auto",
  background: TUBE,
  border: `3px solid ${VERT}`,
  borderRadius: 0,
  boxShadow: `0 0 0 3px ${TUBE}, 0 0 0 6px rgba(125,252,174,0.35), 0 18px 40px rgba(0,0,0,0.6)`,
  padding: "20px 16px 18px",
  fontFamily: "var(--font-arcade)",
  color: VERT_PALE,
  textAlign: "center",
};

const balayage: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background:
    "repeating-linear-gradient(0deg, rgba(0,0,0,0.30) 0 1px, transparent 1px 3px)",
};

/* La blague est la seule phrase en 8-bit : cette police est large, trois
   lignes suffisent à la faire lire, six l'auraient rendue pénible.

   ⚠ DANS UNE FONTE PIXEL, LE GRAS SE FAIT À LA TAILLE, PAS À LA GRAISSE.
   Press Start 2P n'existe qu'en poids 400 ; `fontWeight: 700` en fabrique un
   gras synthétique et un doublage à l'ombre (essayé, mesuré à l'écran)
   épaissit tellement le trait — 1 px de décalage pour ~1,9 px de trait — que
   les contreformes se bouchent : les lettres redeviennent des taches. On
   monte donc le corps, et la présence vient d'un halo de tube, qui lui ne
   touche pas à la forme des glyphes. */
const blague: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.75,
  color: VERT,
  margin: "0 0 16px",
  textTransform: "uppercase",
  textShadow: "0 0 10px rgba(125,252,174,0.55)",
};

/* Le corps repasse en monospace : le pixel est un décor, pas une punition. */
const corps: CSSProperties = {
  fontFamily: "ui-monospace, Menlo, monospace",
  fontSize: 13,
  lineHeight: 1.65,
  color: VERT_PALE,
  margin: "0 0 18px",
  textAlign: "left",
};

const bouton: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  width: "100%",
  minHeight: "var(--tap-min)",
  padding: "14px 12px",
  background: VERT,
  color: TUBE,
  border: `3px solid ${TUBE}`,
  boxShadow: `0 0 0 3px ${VERT}`,
  borderRadius: 0,
  fontFamily: "var(--font-arcade)",
  fontSize: 13,
  lineHeight: 1.6,
  textTransform: "uppercase",
  cursor: "pointer",
};

const fermer: CSSProperties = {
  marginTop: 16,
  background: "transparent",
  border: "none",
  color: VERT,
  fontFamily: "var(--font-arcade)",
  fontSize: 9,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  minHeight: "var(--tap-min)",
  padding: "8px 12px",
};

export function SoutienBorneOverlay({ open, onClose }: SoutienBorneOverlayProps) {
  const { d } = useLangue();
  // `useSettingsSafe` et pas `useSettings` : cet overlay est monté par
  // `EcranArcade`, au fond de l'arbre de la borne, et exiger un
  // `SettingsProvider` pour un simple clic rendrait fragile le test de
  // chacun de ses ancêtres.
  const { playClick } = useSettingsSafe();
  const urlNotation = lienNotation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Capture + stopPropagation : la borne écoute Échap elle aussi, sur
      // `window`. Sans ça, une seule touche refermait l'overlay ET le meuble
      // d'un coup. Même parade que l'ancienne `BottomSheet`.
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const onFermer = () => {
    playClick();
    onClose();
  };

  return (
    <div
      style={scrim}
      onClick={onFermer}
      role="dialog"
      aria-modal="true"
      aria-label={d.soutien.titre}
      data-testid="soutien-borne"
    >
      {/* Le clic sur le cadre ne doit pas refermer : seul le fond le fait. */}
      <div style={cadre} onClick={(e) => e.stopPropagation()}>
        <p style={blague} data-testid="soutien-borne-blague">
          {d.soutien.borneBlague}
        </p>
        <p style={corps}>{d.soutien.borneSuite}</p>

        {/* Pas de fiche sur cette plateforme = pas de bouton. Un bouton qui
            ouvrirait une page inexistante est pire que pas de bouton. */}
        {urlNotation && (
          <button
            type="button"
            data-testid="soutien-noter"
            style={bouton}
            onClick={() => {
              playClick();
              void ouvrirLien(urlNotation);
            }}
          >
            <CoeurPixel />
            {d.soutien.noter}
          </button>
        )}

        <button type="button" style={fermer} onClick={onFermer}>
          {d.commun.fermer}
        </button>
        <div style={balayage} aria-hidden />
      </div>
    </div>
  );
}
