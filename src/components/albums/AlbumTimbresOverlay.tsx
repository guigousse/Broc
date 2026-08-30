"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AlbumShell } from "@/components/albums/AlbumShell";
import { FichePiece } from "@/components/albums/FichePiece";
import { PieceVisuel } from "@/components/pieces/PieceVisuel";
import {
  positionDepuisPointeur,
  yDeLigne,
  HAUTEUR_PAGE_RATIO,
  TAILLE_TIMBRE,
  type Ligne,
} from "@/components/albums/albumTimbresLayout";
import { CATEGORIE_ALBUM, getPiece, piecesDe } from "@/data/pieces";
import { albumsDe, doublons, nbPossedees, NB_LIGNES_ALBUM, NB_PAGES_ALBUM, premierePlaceLibre } from "@/lib/albums";
import { useGame } from "@/context/GameContext";
import { useToast } from "@/components/ui/Toast";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";
import { libelleCategorie } from "@/lib/i18n/libelles";
import { prefersReducedMotion } from "@/lib/transitionIris";
import type { DictionnaireUI } from "@/lib/i18n/ui";

/* ── L'ALBUM DE TIMBRES ───────────────────────────────────────────────────
   2 pages de 5 lignes aimantées : un timbre lâché sur la page s'aligne sur
   la ligne la plus proche (`ligneLaPlusProche`), son x reste libre mais
   borné pour ne jamais déborder (`xBorne`, dans `albumTimbresLayout`). Les
   timbres sans placement vivent en vrac dans le bac scrollable du bas.

   Le geste unique est le glisser au pointeur (bac → page, page → bac, ou
   page → page pour redéposer un timbre déjà posé) : un fantôme `position:
   fixed` suit le doigt, et au lâcher on regarde où le point tombe — sur la
   page (→ `poserTimbre`), sur le bac (→ `rendreTimbreAuBac`), ailleurs
   (→ rien, le timbre reste où il était). Un lâcher SANS déplacement
   (< 6 px) est un tap, pas un glisser : il ouvre la fiche, avec un bouton
   « Poser sur la page » quand le timbre est encore dans le bac (place
   trouvée par `premierePlaceLibre`, chemin identique à celui qu'un joueur
   sans geste de glisser peut suivre en entier). */

const SEUIL_TAP_PX = 6;
const GHOST_TAILLE_PX = 60;
/** Seuil vertical (px) au-delà duquel un geste démarré dans le bac est
 *  considéré comme un glisser (même s'il a autant ou plus bougé à
 *  l'horizontale) plutôt qu'un défilement natif du bac. */
const SEUIL_VERTICAL_BAC_PX = 12;

const pageWrap: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: `1 / ${HAUTEUR_PAGE_RATIO}`,
  background: "var(--forest-800)",
  borderRadius: 8,
  overflow: "hidden",
  touchAction: "pan-y",
};

const ligneTrace: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  height: 0,
  borderTop: "1px dashed var(--brass-700)",
  pointerEvents: "none",
};

/** Remise à zéro du style natif de `<button>` : ces items sont des boutons
 *  pour le clavier/VoiceOver, mais visuellement de simples cadres au tap. */
const resetBouton: CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 0,
  font: "inherit",
  color: "inherit",
};

function timbrePoseStyle(x: number, ligne: Ligne, z: number, sansTransition: boolean): CSSProperties {
  return {
    ...resetBouton,
    position: "absolute",
    left: `${x * 100}%`,
    top: `${yDeLigne(ligne) * 100}%`,
    width: `${TAILLE_TIMBRE * 100}%`,
    aspectRatio: "1",
    transform: "translate(-50%, -50%)",
    zIndex: z,
    cursor: "grab",
    touchAction: "none",
    transition: sansTransition ? undefined : "left 0.15s ease, top 0.15s ease",
  };
}

const bacWrap: CSSProperties = {
  marginTop: 12,
  display: "flex",
  gap: 10,
  overflowX: "auto",
  padding: "10px 8px",
  background: "var(--forest-800)",
  borderRadius: 8,
};

const bacItemStyle: CSSProperties = {
  ...resetBouton,
  position: "relative",
  flex: "0 0 auto",
  width: 56,
  aspectRatio: "1",
  cursor: "grab",
  // "pan-x" (pas "none") : le bac défile horizontalement au doigt — voir
  // SEUIL_VERTICAL_BAC_PX, qui laisse ce défilement natif se produire tant
  // que le geste n'est pas identifié comme un glisser vers la page.
  touchAction: "pan-x",
};

const badgeQuantite: CSSProperties = {
  position: "absolute",
  right: -2,
  bottom: -2,
  padding: "1px 5px",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  color: "var(--forest-800)",
  background: "linear-gradient(180deg, var(--brass-300), var(--brass-500))",
  borderRadius: 4,
  pointerEvents: "none",
};

const newBadge: CSSProperties = {
  position: "absolute",
  top: -4,
  right: -4,
  fontFamily: "var(--font-display)",
  fontSize: 20,
  fontWeight: 700,
  lineHeight: 1,
  color: "var(--vermillion-600)",
  textShadow:
    "0 0 2px var(--paper-100), 0 0 4px var(--paper-100), 0 1px 2px rgba(0,0,0,0.45)",
  pointerEvents: "none",
};

const fantome: CSSProperties = {
  position: "fixed",
  width: GHOST_TAILLE_PX,
  transform: "translate(-50%, -50%)",
  pointerEvents: "none",
  zIndex: 110,
};

const paginationBar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  marginTop: 12,
};

const pageBtn: CSSProperties = {
  minWidth: "var(--tap-min)",
  minHeight: "var(--tap-min)",
  border: "1px solid var(--brass-500)",
  background: "transparent",
  color: "var(--brass-300)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  borderRadius: "var(--radius-btn)",
};

const pageTexte: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--brass-300)",
  minWidth: 44,
  textAlign: "center",
};

const pointsWrap: CSSProperties = { display: "flex", gap: 5 };

const point = (actif: boolean): CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: actif ? "var(--brass-300)" : "var(--brass-700)",
});

const bacLabel: CSSProperties = {
  marginTop: 12,
  marginBottom: -6,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
};

const poserBtn: CSSProperties = {
  width: "100%",
  minHeight: "var(--tap-min)",
  marginTop: 14,
  padding: "10px 16px",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-btn)",
  background: "var(--paper-200)",
  color: "var(--ink-700)",
  cursor: "pointer",
};

function Pagination({
  page,
  onChange,
  d,
}: {
  page: 0 | 1;
  onChange: (page: 0 | 1) => void;
  d: DictionnaireUI;
}) {
  return (
    <div style={paginationBar}>
      <button
        type="button"
        style={pageBtn}
        aria-label={d.albums.pagePrecedente}
        disabled={page === 0}
        onClick={() => onChange(0)}
      >
        <ChevronLeft size={16} strokeWidth={1.6} />
      </button>
      <span style={pageTexte}>
        {page + 1} / {NB_PAGES_ALBUM}
      </span>
      <div style={pointsWrap} aria-hidden>
        {Array.from({ length: NB_PAGES_ALBUM }, (_, i) => (
          <span key={i} style={point(i === page)} />
        ))}
      </div>
      <button
        type="button"
        style={pageBtn}
        aria-label={d.albums.pageSuivante}
        disabled={page === NB_PAGES_ALBUM - 1}
        onClick={() => onChange(1)}
      >
        <ChevronRight size={16} strokeWidth={1.6} />
      </button>
    </div>
  );
}

/** Origine du geste : le bac défile nativement (`pan-x`), la page non — voir
 *  `SEUIL_VERTICAL_BAC_PX`. */
type OrigineGeste = "bac" | "page";

interface StartInfo {
  id: string;
  x: number;
  y: number;
  origine: OrigineGeste;
  /** Faux tant qu'un item du bac n'a pas franchi le seuil vertical : le
   *  fantôme n'apparaît pas, le défilement natif du bac reste libre. */
  started: boolean;
}

export function AlbumTimbresOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { d, tr, locale } = useLangue();
  const { state, recyclerDoublonsAlbum, marquerPieceConsultee, poserTimbre, rendreTimbreAuBac } = useGame();
  const { toast } = useToast();
  const [page, setPage] = useState<0 | 1>(0);
  const [fiche, setFiche] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const startRef = useRef<StartInfo | null>(null);
  const swipeStartRef = useRef<number | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const bacRef = useRef<HTMLDivElement | null>(null);

  if (!open || !state) return null;

  const album = albumsDe(state).timbres;
  const pieces = piecesDe("timbres");
  const total = pieces.length;
  const sansTransition = prefersReducedMotion();

  const idsPossedes = Object.keys(album.pieces);
  const idsBac = idsPossedes.filter((id) => !album.placements[id]);
  const idsPosesPage = idsPossedes.filter(
    (id) => album.placements[id] && album.placements[id].page === page,
  );

  /** Nom localisé + « ×N » si doublon, pour l'`aria-label` d'un timbre. */
  const ariaLabelTimbre = (id: string): string => {
    const piece = getPiece(id);
    if (!piece) return "";
    const nom = nomObjet({ templateId: id, nom: piece.nom }, locale);
    const quantite = album.pieces[id] ?? 0;
    return quantite > 1 ? `${nom} ${tr(d.albums.doublon, { n: quantite })}` : nom;
  };

  const ouvrirFiche = (id: string) => {
    marquerPieceConsultee(id);
    setFiche(id);
  };

  // Clavier/VoiceOver : le chemin pointeur (tap ≤ SEUIL_TAP_PX dans
  // onPointerUpTimbre) ouvre déjà la fiche au doigt/à la souris. `onKeyDown`
  // couvre Entrée/Espace SANS passer par `onClick` : sur souris/trackpad, un
  // `click` natif suit toujours le `mouseup` même après un glisser (la
  // capture de pointeur garde la cible) et rouvrirait la fiche par-dessus la
  // pose/le retour au bac qu'on vient de faire.
  const onKeyDownTimbre = (id: string) => (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      ouvrirFiche(id);
    }
  };

  const onPointerDownTimbre =
    (id: string, origine: OrigineGeste) => (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      // Un item posé démarre son glisser immédiatement (comme avant) ; un
      // item du bac attend le franchissement du seuil vertical, pour ne pas
      // voler le défilement horizontal natif à un simple swipe du bac.
      const started = origine === "page";
      startRef.current = { id, x: e.clientX, y: e.clientY, origine, started };
      if (started) setDrag({ id, x: e.clientX, y: e.clientY });
    };

  const onPointerMoveTimbre = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const start = startRef.current;
    if (!start) return;
    if (!start.started) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dy) <= Math.abs(dx) && Math.abs(dy) <= SEUIL_VERTICAL_BAC_PX) return;
      start.started = true;
    }
    setDrag({ id: start.id, x: e.clientX, y: e.clientY });
  };

  const onPointerUpTimbre = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const start = startRef.current;
    startRef.current = null;
    setDrag(null);
    if (!start) return;
    const distance = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (distance < SEUIL_TAP_PX) {
      ouvrirFiche(start.id);
      return;
    }
    const rectPage = pageRef.current?.getBoundingClientRect();
    const placePage = rectPage ? positionDepuisPointeur(rectPage, e.clientX, e.clientY) : null;
    if (placePage) {
      poserTimbre(start.id, page, placePage.ligne, placePage.x);
      return;
    }
    const rectBac = bacRef.current?.getBoundingClientRect();
    const dansLeBac = rectBac ? positionDepuisPointeur(rectBac, e.clientX, e.clientY) : null;
    if (dansLeBac) {
      rendreTimbreAuBac(start.id);
    }
    // Ni page ni bac : le timbre reste où il était (aucun appel).
  };

  // Geste interrompu (appel, notification, geste système) : `pointercancel`
  // ET la perte de capture qui l'accompagne (`onLostPointerCapture`, qui se
  // déclenche AUSSI après un lâcher normal réussi — idempotent puisque
  // `startRef`/`drag` sont déjà à `null` à ce moment-là). Dans tous les cas,
  // on efface l'état SANS jamais appeler `poserTimbre`/`rendreTimbreAuBac` :
  // le timbre reste où il était, le fantôme disparaît.
  const onPointerAbandonneTimbre = () => {
    startRef.current = null;
    setDrag(null);
  };

  const onSwipeDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    swipeStartRef.current = e.clientX;
  };
  const onSwipeUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (swipeStartRef.current === null) return;
    const dx = e.clientX - swipeStartRef.current;
    swipeStartRef.current = null;
    const SEUIL = 40;
    if (dx < -SEUIL) setPage(1);
    else if (dx > SEUIL) setPage(0);
  };
  // Même garde que `onPointerAbandonneTimbre` : un geste interrompu ou un
  // doigt sorti de la page sans relâcher ne doit pas laisser `swipeStartRef`
  // posé pour un lâcher tardif/fantôme (M5 revue finale 2026-08-30).
  const onSwipeAbandonne = () => {
    swipeStartRef.current = null;
  };

  const fichePlacement = fiche ? album.placements[fiche] : undefined;

  return (
    <AlbumShell
      open={open}
      onClose={onClose}
      titre={d.albums.albumTitre}
      compteur={{ possedees: nbPossedees(album), total }}
      doublons={doublons(album)}
      onRecycler={() => {
        const n = recyclerDoublonsAlbum("timbres");
        toast(
          tr(n === 1 ? d.albums.recycleFaitUn : d.albums.recycleFait, {
            n,
            categorie: libelleCategorie(CATEGORIE_ALBUM.timbres, d),
          }),
          { type: "succes" },
        );
      }}
    >
      <div
        ref={pageRef}
        data-testid="page-timbres"
        style={pageWrap}
        onPointerDown={onSwipeDown}
        onPointerUp={onSwipeUp}
        onPointerCancel={onSwipeAbandonne}
        onPointerLeave={onSwipeAbandonne}
      >
        {Array.from({ length: NB_LIGNES_ALBUM }, (_, l) => l as Ligne).map((l) => (
          <div key={l} style={{ ...ligneTrace, top: `${yDeLigne(l) * 100}%` }} />
        ))}
        {idsPosesPage.map((id) => {
          const placement = album.placements[id];
          const z = album.ordreZ.indexOf(id);
          return (
            <button
              key={id}
              type="button"
              data-testid="timbre-pose"
              data-id={id}
              aria-label={ariaLabelTimbre(id)}
              style={timbrePoseStyle(placement.x, placement.ligne, z, sansTransition)}
              onPointerDown={onPointerDownTimbre(id, "page")}
              onPointerMove={onPointerMoveTimbre}
              onPointerUp={onPointerUpTimbre}
              onPointerCancel={onPointerAbandonneTimbre}
              onLostPointerCapture={onPointerAbandonneTimbre}
              onKeyDown={onKeyDownTimbre(id)}
            >
              <PieceVisuel id={id} thumb />
            </button>
          );
        })}
      </div>
      <div style={bacLabel} aria-hidden>
        {d.albums.bac}
      </div>
      <div ref={bacRef} data-testid="bac" style={bacWrap} aria-label={d.albums.bac}>
        {idsBac.map((id) => {
          const quantite = album.pieces[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              data-testid="timbre-bac"
              data-id={id}
              aria-label={ariaLabelTimbre(id)}
              style={bacItemStyle}
              onPointerDown={onPointerDownTimbre(id, "bac")}
              onPointerMove={onPointerMoveTimbre}
              onPointerUp={onPointerUpTimbre}
              onPointerCancel={onPointerAbandonneTimbre}
              onLostPointerCapture={onPointerAbandonneTimbre}
              onKeyDown={onKeyDownTimbre(id)}
            >
              <PieceVisuel id={id} thumb />
              {quantite > 1 && (
                <span style={badgeQuantite}>{tr(d.albums.doublon, { n: quantite })}</span>
              )}
              {album.nouvelles.includes(id) && (
                <span style={newBadge} aria-hidden>
                  *
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Pagination page={page} onChange={setPage} d={d} />
      {drag && (
        <div data-testid="timbre-fantome" style={{ ...fantome, left: drag.x, top: drag.y }}>
          <PieceVisuel id={drag.id} />
        </div>
      )}
      {fiche && (
        <FichePiece id={fiche} quantite={album.pieces[fiche] ?? 0} onClose={() => setFiche(null)}>
          {fichePlacement ? (
            // Symétrie avec « Poser sur la page » : un timbre déjà posé se
            // rend au bac sans passer par le glisser (même chemin que
            // `rendreTimbreAuBac` au lâcher, mais accessible au clavier).
            <button
              type="button"
              style={poserBtn}
              onClick={() => {
                rendreTimbreAuBac(fiche);
                setFiche(null);
              }}
            >
              {d.albums.rendreAuBac}
            </button>
          ) : (
            <button
              type="button"
              style={poserBtn}
              onClick={() => {
                const place = premierePlaceLibre(albumsDe(state), page);
                poserTimbre(fiche, place.page, place.ligne, place.x);
                setFiche(null);
              }}
            >
              {d.albums.poserSurLaPage}
            </button>
          )}
        </FichePiece>
      )}
    </AlbumShell>
  );
}
