"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlbumShell,
  LigneBasAlbum,
  PANNEAU_BOTTOM,
  PANNEAU_TOP,
} from "@/components/albums/AlbumShell";
import { FichePiece } from "@/components/albums/FichePiece";
import { PieceVisuel } from "@/components/pieces/PieceVisuel";
import { CATEGORIE_ALBUM, piecesDe, type PieceCollection } from "@/data/pieces";
import { albumsDe, doublons, nbPossedees } from "@/lib/albums";
import { useGame } from "@/context/GameContext";
import { useToast } from "@/components/ui/Toast";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import type { DictionnaireUI } from "@/lib/i18n/ui";

/* ── LE CLASSEUR DE CARTES ────────────────────────────────────────────────
   6 pages de 9 pochettes NUMÉROTÉES (50 cartes + 4 emplacements « à venir »
   sur la dernière page), navigables au swipe (seuil 40px, même valeur que
   `ItemSwipeDeck`) ou aux boutons ◀▶. Une pochette possédée s'ouvre en
   `FichePiece` et marque la pièce consultée (éteint sa pastille « * »).

   Même agencement que l'album de timbres depuis la recette du 2026-09-02 :
   titre centré dans l'en-tête, et la ligne compteur + pagination + Recycler
   (icône + chiffre) poussée contre la TabBar. */

const PAR_PAGE = 9;
const SWIPE_SEUIL_PX = 40;

const GAP_PX = 10;
const PADDING_PX = 12;
/** Hauteur (px) prise autour de la grille DANS le panneau : marges de la
 *  coquille, ligne d'en-tête (titre/croix) et ligne compteur + pagination +
 *  Recycler. S'ajoute au chrome de l'app (en-tête, TabBar, safe areas) pour
 *  borner la largeur de la grille : ses 3 lignes tiennent TOUJOURS dans la
 *  hauteur restante sans défiler (iPhone SE compris). Recompté à la refonte
 *  du 2026-09-02 (plus de bouton Recycler encadré) : la grille y gagne. */
const HORS_GRILLE_PX = 130;
/* Parenthèses OBLIGATOIRES : `100dvh - calc(a) + calc(b)` ajouterait la
   TabBar au lieu de la soustraire. */
const CHROME_APP = `(${PANNEAU_TOP}) - (${PANNEAU_BOTTOM})`;

/* Pleine largeur, mais plafonnée par la hauteur disponible : une grille de
   largeur W fait (W − 2·padding − 2·gap)·4/3 + 2·gap + 2·padding de haut
   (3 lignes de cases 3/4), d'où W = (H − 44)·3/4 + 44 pour H donnée.
   `minmax(0, 1fr)` : sans le `0`, la taille naturelle des images élargit les
   colonnes au-delà du conteneur (3ᵉ colonne coupée, vu le 2026-08-31). */
const grille3x3: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: GAP_PX,
  padding: PADDING_PX,
  width: "100%",
  maxWidth: `calc((100dvh - ${CHROME_APP} - ${HORS_GRILLE_PX + 2 * GAP_PX + 2 * PADDING_PX}px) * 0.75 + ${2 * GAP_PX + 2 * PADDING_PX}px)`,
  margin: "0 auto",
  boxSizing: "border-box",
  background: "var(--forest-800)",
  borderRadius: 8,
  touchAction: "pan-y",
};

/* `minWidth/minHeight: 0` + `overflow: hidden` : la case garde sa boîte 3/4
   quel que soit le contenu (une image portrait faisait 255 px au lieu de
   176 avant). */
const pochette: CSSProperties = {
  position: "relative",
  aspectRatio: "3 / 4",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  borderRadius: 6,
  padding: 6,
  display: "grid",
  placeItems: "center",
};

/** Le visuel de la carte, sorti du flux : il remplit la pochette sans peser
 *  sur sa taille. */
const visuelWrap: CSSProperties = {
  position: "absolute",
  inset: 6,
};

const pochetteBtn: CSSProperties = {
  ...pochette,
  cursor: "pointer",
};

const pointInterrogation: CSSProperties = {
  position: "absolute",
  fontFamily: "var(--font-display)",
  fontSize: 28,
  fontWeight: 700,
  color: "var(--brass-500)",
  pointerEvents: "none",
};

/** Le numéro de l'emplacement (1..54, continu à travers les pages), en bas à
 *  droite de chaque pochette et bien lisible (recette 2026-09-02) — le badge
 *  ×N des doublons lui a cédé le coin et vit en bas à gauche. */
const numeroCase: CSSProperties = {
  position: "absolute",
  bottom: 2,
  right: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 16,
  fontWeight: 700,
  color: "var(--brass-700)",
  textShadow: "0 0 2px var(--paper-100), 0 0 4px var(--paper-100)",
  pointerEvents: "none",
  zIndex: 1,
};

const badgeQuantite: CSSProperties = {
  position: "absolute",
  left: 4,
  bottom: 4,
  padding: "1px 5px",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  color: "var(--forest-800)",
  background: "linear-gradient(180deg, var(--brass-300), var(--brass-500))",
  borderRadius: 4,
  pointerEvents: "none",
};

// Même famille visuelle que le badge « * » de `CollectionGrid` (repris ici,
// pas exporté là-bas).
const newBadge: CSSProperties = {
  position: "absolute",
  top: 2,
  right: 4,
  fontFamily: "var(--font-display)",
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1,
  color: "var(--vermillion-600)",
  textShadow:
    "0 0 2px var(--paper-100), 0 0 4px var(--paper-100), 0 1px 2px rgba(0,0,0,0.45)",
  pointerEvents: "none",
};

const paginationBar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
};

/** Pousse la ligne du bas contre la TabBar, la grille reste en haut. */
const basWrap: CSSProperties = {
  marginTop: "auto",
};

const pageBtn: CSSProperties = {
  minWidth: "var(--tap-min)",
  minHeight: "var(--tap-min)",
  border: "none",
  background: "transparent",
  color: "var(--brass-300)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const pageTexte: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--brass-300)",
  minWidth: 44,
  textAlign: "center",
};

const pointsWrap: CSSProperties = {
  display: "flex",
  gap: 5,
};

const point = (actif: boolean): CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: actif ? "var(--brass-300)" : "var(--brass-700)",
});

function Pagination({
  page,
  pages,
  onChange,
  d,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
  d: DictionnaireUI;
}) {
  return (
    <div style={paginationBar}>
      <button
        type="button"
        style={pageBtn}
        aria-label={d.albums.pagePrecedente}
        disabled={page === 0}
        onClick={() => onChange(Math.max(0, page - 1))}
      >
        <ChevronLeft size={16} strokeWidth={1.6} />
      </button>
      <span style={pageTexte}>
        {page + 1} / {pages}
      </span>
      <div style={pointsWrap} aria-hidden>
        {Array.from({ length: pages }, (_, i) => (
          <span key={i} style={point(i === page)} />
        ))}
      </div>
      <button
        type="button"
        style={pageBtn}
        aria-label={d.albums.pageSuivante}
        disabled={page === pages - 1}
        onClick={() => onChange(Math.min(pages - 1, page + 1))}
      >
        <ChevronRight size={16} strokeWidth={1.6} />
      </button>
    </div>
  );
}

export function ClasseurOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { d, tr, locale } = useLangue();
  const { state, recyclerDoublonsAlbum, marquerPieceConsultee } = useGame();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [fiche, setFiche] = useState<string | null>(null);
  const startXRef = useRef<number | null>(null);

  if (!open || !state) return null;

  const album = albumsDe(state).classeur;
  const pieces = piecesDe("classeur");
  const pages = Math.ceil(pieces.length / PAR_PAGE);
  const tranche = pieces.slice(page * PAR_PAGE, page * PAR_PAGE + PAR_PAGE);
  const cases: (PieceCollection | null)[] = [
    ...tranche,
    ...Array.from({ length: PAR_PAGE - tranche.length }, () => null),
  ];

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    startXRef.current = e.clientX;
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    startXRef.current = null;
    if (dx < -SWIPE_SEUIL_PX) setPage((p) => Math.min(pages - 1, p + 1));
    else if (dx > SWIPE_SEUIL_PX) setPage((p) => Math.max(0, p - 1));
  };
  // Geste interrompu (appel, notification…) ou doigt sorti de la zone sans
  // relâcher : purge SANS tourner la page — sinon `startXRef` reste posé et
  // le PROCHAIN pointerdown ailleurs calcule un dx fantôme depuis ce vieux
  // point (M5 revue finale 2026-08-30).
  const onPointerAbandonne = () => {
    startXRef.current = null;
  };

  const recycler = () => {
    const n = recyclerDoublonsAlbum("classeur");
    toast(
      tr(n === 1 ? d.albums.recycleFaitUn : d.albums.recycleFait, {
        n,
        categorie: libelleCategorie(CATEGORIE_ALBUM.classeur, d),
      }),
      { type: "succes" },
    );
  };

  return (
    <AlbumShell
      open={open}
      onClose={onClose}
      titre={d.albums.classeurTitre}
      titreVisible
    >
      <div
        style={grille3x3}
        data-testid="page-classeur"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerAbandonne}
        onPointerLeave={onPointerAbandonne}
      >
        {cases.map((p, i) => {
          const numero = page * PAR_PAGE + i + 1;
          if (!p) {
            return (
              <div key={`vide-${i}`} style={{ ...pochette, opacity: 0.4 }}>
                <span style={numeroCase} aria-hidden>
                  {numero}
                </span>
                {d.albums.aVenir}
              </div>
            );
          }
          const possedee = (album.pieces[p.id] ?? 0) > 0;
          const quantite = album.pieces[p.id] ?? 0;
          return (
            <button
              key={p.id}
              type="button"
              data-testid="pochette"
              style={pochetteBtn}
              disabled={!possedee}
              aria-label={
                possedee
                  ? nomObjet({ templateId: p.id, nom: p.nom }, locale)
                  : d.albums.pochetteVide
              }
              onClick={() => {
                marquerPieceConsultee(p.id);
                setFiche(p.id);
              }}
            >
              <span style={numeroCase} aria-hidden>
                {numero}
              </span>
              <div style={visuelWrap}>
                <PieceVisuel id={p.id} grise={!possedee} thumb />
              </div>
              {!possedee && <span style={pointInterrogation}>?</span>}
              {quantite > 1 && (
                <span style={badgeQuantite}>
                  {tr(d.albums.doublon, { n: quantite })}
                </span>
              )}
              {album.nouvelles.includes(p.id) && (
                <span style={newBadge} aria-label={d.albums.nouveau}>
                  *
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div style={basWrap}>
        <LigneBasAlbum
          compteur={{ possedees: nbPossedees(album), total: pieces.length }}
          titre={d.albums.classeurTitre}
          doublons={doublons(album)}
          onRecycler={recycler}
        >
          <Pagination page={page} pages={pages} onChange={setPage} d={d} />
        </LigneBasAlbum>
      </div>
      {fiche && (
        <FichePiece
          id={fiche}
          quantite={album.pieces[fiche] ?? 0}
          onClose={() => setFiche(null)}
        />
      )}
    </AlbumShell>
  );
}
