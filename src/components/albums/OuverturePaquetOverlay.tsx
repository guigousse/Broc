"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { PieceVisuel } from "@/components/pieces/PieceVisuel";
import { getPiece, type AlbumId } from "@/data/pieces";
import { nomObjet } from "@/lib/i18n/contenu";
import { useLangue } from "@/lib/i18n/LangueContext";
import { prefersReducedMotion } from "@/lib/transitionIris";
import { getRarityColors } from "@/lib/rarityColors";

/* ── LA CÉRÉMONIE D'OUVERTURE DE PAQUET ──────────────────────────────────
   Posée AU-DESSUS de la fiche d'article du Bazar (zIndex 107 > 105) : le
   joueur vient d'acheter un paquet de 3 pièces (déjà rangées en save par
   `acheterAuBazar` — cet écran ne fait qu'ANNONCER ce qui a déjà eu lieu).

   Trois emplacements face cachée. Chaque tap retourne la carte SUIVANTE
   dans l'ordre (pas nécessairement celle tapée) — et à défaut de tap, un
   minuteur de 800 ms fait la même chose tout seul. Le compteur se recalcule
   au rendu, jamais en state : « Nouveau ! » si c'est la première fois que
   cette pièce est vue (avant CE paquet ET dans les cartes déjà révélées de
   CE paquet), sinon « ×N ». `prefersReducedMotion` saute l'animation : les
   3 cartes arrivent déjà retournées. */

interface OuverturePaquetOverlayProps {
  albumId: AlbumId;
  /** Les 3 ids tirés (déjà appliqués à la save par l'appelant). */
  pieces: string[];
  /** Quantités possédées AVANT ce paquet (snapshot pris avant l'achat). */
  quantitesAvant: Record<string, number>;
  onVoirAlbum: () => void;
  onClose: () => void;
}

const DELAI_AUTO_MS = 800;
const ROTATION_MS = 400;

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 107,
  background: "rgba(10,8,4,0.78)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 24,
  padding: 20,
};

const rangee: CSSProperties = {
  display: "flex",
  gap: 16,
  perspective: 800,
};

const carteBox: CSSProperties = {
  width: "min(30vw, 108px)",
  aspectRatio: "3 / 4",
  cursor: "pointer",
  transformStyle: "preserve-3d",
  transition: `transform ${ROTATION_MS}ms ease`,
  position: "relative",
};

const faceCommune: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: 8,
  backfaceVisibility: "hidden",
  display: "grid",
  placeItems: "center",
};

const dos: CSSProperties = {
  ...faceCommune,
  background: "var(--forest-800)",
  border: "2px solid var(--brass-500)",
};

const rondDos: CSSProperties = {
  width: "62%",
  aspectRatio: "1 / 1",
  borderRadius: "50%",
  background: "linear-gradient(135deg, var(--brass-300), var(--brass-700))",
  border: "1px solid var(--brass-500)",
};

const face: CSSProperties = {
  ...faceCommune,
  background: "var(--paper-100)",
  border: "2px solid var(--brass-500)",
  transform: "rotateY(180deg)",
  padding: 6,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
};

const visuelFace: CSSProperties = { width: "70%", flex: "1 1 auto", minHeight: 0 };

const nomFace: CSSProperties = {
  fontSize: 9,
  textAlign: "center",
  color: "var(--ink-700)",
  lineHeight: 1.1,
};

const badge = (nouveau: boolean, couleur: string): CSSProperties => ({
  fontFamily: "var(--font-display)",
  fontSize: 10,
  letterSpacing: "0.06em",
  color: nouveau ? "var(--brass-700)" : couleur,
  textTransform: "uppercase",
});

const actions: CSSProperties = {
  display: "flex",
  gap: 10,
};

const boutonBase: CSSProperties = {
  minHeight: "var(--tap-min)",
  padding: "10px 20px",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-btn)",
  cursor: "pointer",
};

const boutonVoir: CSSProperties = {
  ...boutonBase,
  background: "var(--forest-800)",
  color: "var(--brass-300)",
};

const boutonRanger: CSSProperties = {
  ...boutonBase,
  background: "var(--paper-200)",
  color: "var(--ink-700)",
};

/** « Nouveau ! » si c'est la 1ʳᵉ fois — avant ce paquet, ou déjà révélée dans ce paquet. */
function compteEtNouveaute(
  pieces: string[],
  quantitesAvant: Record<string, number>,
  index: number,
): { total: number; nouveau: boolean } {
  const id = pieces[index];
  const dejaAvant = quantitesAvant[id] ?? 0;
  const dejaDansCePaquet = pieces.slice(0, index).filter((p) => p === id).length;
  const total = dejaAvant + dejaDansCePaquet + 1;
  return { total, nouveau: total === 1 };
}

export function OuverturePaquetOverlay({
  pieces,
  quantitesAvant,
  onVoirAlbum,
  onClose,
}: OuverturePaquetOverlayProps) {
  const { d, tr, locale } = useLangue();
  const [revele, setRevele] = useState(() => (prefersReducedMotion() ? pieces.length : 0));

  // Auto-avance : 800 ms SANS TAP retourne la carte suivante — pas une
  // cadence fixe depuis le montage. L'effet est keyé sur `revele` : chaque
  // révélation (manuelle OU automatique) le fait se nettoyer (annule le
  // minuteur en attente) puis se relancer avec un `setTimeout(800)` tout
  // neuf. Un tap à 750 ms annule donc le minuteur programmé pour 800 ms et
  // en repose un pour 750+800 — la carte suivante n'arrive PAS à 800 ms.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (revele >= pieces.length) return;
    const t = setTimeout(() => {
      setRevele((r) => Math.min(pieces.length, r + 1));
    }, DELAI_AUTO_MS);
    return () => clearTimeout(t);
  }, [revele, pieces.length]);

  const avancer = () => setRevele((r) => Math.min(pieces.length, r + 1));

  return (
    <div role="dialog" aria-modal="true" aria-label={d.albums.ouverture} style={backdrop}>
      <div style={rangee}>
        {pieces.map((id, i) => {
          const retournee = i < revele;
          const piece = getPiece(id);
          const { total, nouveau } = compteEtNouveaute(pieces, quantitesAvant, i);
          const couleur = piece ? getRarityColors(piece.rarete).outer : "var(--brass-300)";
          return (
            <div
              key={`${id}-${i}`}
              data-testid="carte-paquet"
              data-retournee={retournee ? "1" : "0"}
              role="button"
              tabIndex={0}
              onClick={avancer}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") avancer();
              }}
              style={{
                ...carteBox,
                transform: retournee ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              <div style={dos}>
                <div style={rondDos} />
              </div>
              {/* Le contenu de la face n'existe dans le DOM qu'UNE FOIS la carte
                  retournée : sinon le nom et le « Nouveau ! »/« ×N » seraient
                  lisibles (au lecteur d'écran, à `getByText`) avant même le
                  tap qui les révèle — `backfaceVisibility` ne cache que
                  visuellement. */}
              {retournee && piece && (
                <div style={face}>
                  <div style={visuelFace}>
                    <PieceVisuel id={id} />
                  </div>
                  <span style={nomFace}>
                    {nomObjet({ templateId: id, nom: piece.nom }, locale)}
                  </span>
                  <span style={badge(nouveau, couleur)}>
                    {nouveau ? d.albums.nouveau : tr(d.albums.doublon, { n: total })}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={actions}>
        <button type="button" style={boutonVoir} onClick={onVoirAlbum}>
          {d.albums.voir}
        </button>
        <button type="button" style={boutonRanger} onClick={onClose}>
          {d.albums.ranger}
        </button>
      </div>
    </div>
  );
}
