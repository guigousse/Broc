"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlbumShell,
  FOND_PAGE_ALBUM,
  LigneBasAlbum,
  PANNEAU_BOTTOM,
  PANNEAU_TOP,
} from "@/components/albums/AlbumShell";
import { FichePiece } from "@/components/albums/FichePiece";
import { PieceVisuel } from "@/components/pieces/PieceVisuel";
import { CATEGORIE_ALBUM, getPiece, piecesDe } from "@/data/pieces";
import {
  albumsDe,
  doublons,
  nbPossedees,
  slotsDuClasseur,
  NB_SLOTS_CLASSEUR,
} from "@/lib/albums";
import { useGame } from "@/context/GameContext";
import { useToast } from "@/components/ui/Toast";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import { prefersReducedMotion } from "@/lib/transitionIris";
import type { DictionnaireUI } from "@/lib/i18n/ui";

/* ── LE CLASSEUR DE CARTES ────────────────────────────────────────────────
   6 pages de 9 pochettes NUMÉROTÉES (54 emplacements pour 50 cartes),
   navigables au swipe (seuil 40px, même valeur que `ItemSwipeDeck`) ou aux
   boutons ◀▶. Une pochette occupée s'ouvre en `FichePiece` au tap et marque
   la pièce consultée (éteint sa pastille « * »).

   PLACEMENT MANUEL depuis la recette du 2026-09-03 : le fond est la même
   feuille anthracite grenée que l'album de timbres, les 9 pochettes sont
   des cases DÉLIMITÉES, et une carte se glisse au doigt d'un slot à
   l'autre — elle va PILE dans la pochette visée (pas de placement libre
   comme les timbres), échange si la pochette est occupée. La carte suit le
   doigt par un calque en portail (même mécanique que l'album de timbres :
   écriture DOM directe, aucun re-rendu par frame), la pochette visée
   s'éclaire, et le lâcher anime le calque jusqu'au centre du slot avant de
   committer `deplacerCarte`. Un lâcher hors de la grille renvoie la carte
   d'où elle vient. Par défaut (jamais déplacée), une carte occupe
   l'emplacement de son `ordre` (`slotsDuClasseur`). */

const PAR_PAGE = 9;
const SWIPE_SEUIL_PX = 40;
const SEUIL_TAP_PX = 6;
/** Durée du glissé d'arrivée : du doigt au centre du slot, puis commit. */
const DUREE_POSE_MS = 150;

const GAP_PX = 10;
const PADDING_PX = 12;
/** Hauteur (px) prise autour de la grille DANS le panneau : marges de la
 *  coquille, ligne d'en-tête (titre/croix) et ligne compteur + pagination +
 *  Recycler. S'ajoute au chrome de l'app (en-tête, TabBar, safe areas) pour
 *  borner la largeur de la grille : ses 3 lignes tiennent TOUJOURS dans la
 *  hauteur restante sans défiler (iPhone SE compris). */
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
  // La même feuille anthracite grenée que l'album de timbres (2026-09-03).
  backgroundImage: FOND_PAGE_ALBUM,
  borderRadius: 8,
  touchAction: "pan-y",
};

/* La POCHETTE : une case bien délimitée sur la feuille anthracite — liseré
   translucide, fond à peine plus clair, creux d'ombre interne. `minWidth/
   minHeight: 0` + `overflow: hidden` : la case garde sa boîte 3/4 quel que
   soit le contenu. */
const pochette: CSSProperties = {
  position: "relative",
  aspectRatio: "3 / 4",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.22)",
  borderRadius: 6,
  boxShadow: "inset 0 2px 6px rgba(0, 0, 0, 0.45)",
  padding: 5,
  display: "grid",
  placeItems: "center",
};

const POCHETTE_VISEE: CSSProperties = {
  border: "1px solid var(--brass-300)",
  boxShadow:
    "inset 0 2px 6px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--brass-300)",
};

/** Le visuel de la carte, sorti du flux : il remplit la pochette sans peser
 *  sur sa taille. */
const visuelWrap: CSSProperties = {
  position: "absolute",
  inset: 5,
};

const pochetteBtn: CSSProperties = {
  ...pochette,
  font: "inherit",
  color: "inherit",
  cursor: "grab",
  touchAction: "none",
};

/** Le numéro de l'emplacement (1..54, continu à travers les pages), en bas à
 *  droite de chaque pochette — clair sur la feuille anthracite. */
const numeroCase: CSSProperties = {
  position: "absolute",
  bottom: 2,
  right: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 16,
  fontWeight: 700,
  color: "rgba(255, 255, 255, 0.38)",
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
  zIndex: 1,
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
  zIndex: 1,
};

/** Le calque qui suit le doigt : ancré en (0,0) de l'écran, déplacé par
 *  `transform` seul (compositeur, pas de layout), sans transition. */
function calqueStyle(w: number, h: number, x: number, y: number): CSSProperties {
  return {
    position: "fixed",
    left: 0,
    top: 0,
    width: w,
    height: h,
    transform: transformCalque(x, y),
    transition: "none",
    willChange: "transform",
    filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.55))",
    pointerEvents: "none",
    zIndex: 110,
  };
}

function transformCalque(x: number, y: number): string {
  return `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
}

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

interface StartInfo {
  id: string;
  x: number;
  y: number;
  /** Faux tant que le doigt n'a pas dépassé SEUIL_TAP_PX : un lâcher avant
   *  est un tap (fiche), pas un glisser. */
  started: boolean;
}

export function ClasseurOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { d, tr, locale } = useLangue();
  const { state, recyclerDoublonsAlbum, marquerPieceConsultee, deplacerCarte } =
    useGame();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [fiche, setFiche] = useState<string | null>(null);
  // `drag` ne change qu'au début et à la fin du geste (un re-rendu chacun) :
  // entre les deux, le calque et la pochette visée sont pilotés par refs.
  const [drag, setDrag] = useState<{
    id: string;
    w: number;
    h: number;
    x: number;
    y: number;
  } | null>(null);
  const startRef = useRef<StartInfo | null>(null);
  const swipeStartRef = useRef<number | null>(null);
  const calqueRef = useRef<HTMLDivElement | null>(null);
  /** Les 9 pochettes de la page courante, pour le ciblage et l'éclairage. */
  const cellsRef = useRef<(HTMLElement | null)[]>([]);
  /** Pose en attente pendant le glissé d'arrivée : `commit` la termine
   *  (timer, nouveau geste, ou démontage). */
  const poseEnCoursRef = useRef<{
    timer: ReturnType<typeof setTimeout>;
    commit: () => void;
  } | null>(null);
  const flushPoseEnCours = () => {
    const pose = poseEnCoursRef.current;
    if (!pose) return;
    clearTimeout(pose.timer);
    pose.commit();
  };
  useEffect(() => flushPoseEnCours, []);

  if (!open || !state) return null;

  const album = albumsDe(state).classeur;
  const pieces = piecesDe("classeur");
  const pages = Math.ceil(NB_SLOTS_CLASSEUR / PAR_PAGE);
  const slots = slotsDuClasseur(album);
  /** slot global → id de la carte qui l'occupe. */
  const occupants = new Map<number, string>();
  for (const [id, slot] of Object.entries(slots)) occupants.set(slot, id);
  const sansTransition = prefersReducedMotion();

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

  const ouvrirFiche = (id: string) => {
    marquerPieceConsultee(id);
    setFiche(id);
  };

  // Clavier/VoiceOver : Entrée/Espace ouvre la fiche SANS passer par
  // `onClick` (un `click` natif suit toujours le `mouseup`, même après un
  // glisser — il rouvrirait la fiche par-dessus le déplacement).
  const onKeyDownCarte =
    (id: string) => (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        ouvrirFiche(id);
      }
    };

  /** L'index (0..8) de la pochette sous le point écran, ou -1. */
  const celluleSous = (x: number, y: number): number =>
    cellsRef.current.findIndex((el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });

  /** Éclaire la pochette visée — écriture DOM directe, hors React. */
  const eclairerVisee = (idx: number) => {
    cellsRef.current.forEach((el, i) => {
      if (!el) return;
      const vise = i === idx;
      el.dataset.vise = vise ? "true" : "false";
      el.style.border = vise
        ? (POCHETTE_VISEE.border as string)
        : (pochette.border as string);
      el.style.boxShadow = vise
        ? (POCHETTE_VISEE.boxShadow as string)
        : (pochette.boxShadow as string);
    });
  };

  const onPointerDownCarte =
    (id: string) => (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      flushPoseEnCours();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      startRef.current = { id, x: e.clientX, y: e.clientY, started: false };
    };

  const onPointerMoveCarte = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const start = startRef.current;
    if (!start) return;
    if (!start.started) {
      if (
        Math.hypot(e.clientX - start.x, e.clientY - start.y) < SEUIL_TAP_PX
      ) {
        return;
      }
      start.started = true;
      const slot = slots[start.id];
      const cellule = cellsRef.current[slot % PAR_PAGE];
      const r = cellule?.getBoundingClientRect();
      setDrag({
        id: start.id,
        w: r?.width ?? 90,
        h: r?.height ?? 120,
        x: e.clientX,
        y: e.clientY,
      });
    }
    if (calqueRef.current)
      calqueRef.current.style.transform = transformCalque(e.clientX, e.clientY);
    eclairerVisee(celluleSous(e.clientX, e.clientY));
  };

  /** Le calque glisse jusqu'à `cible` (150 ms) puis `commit` est appelé.
   *  Sans calque ou en mouvement réduit, commit immédiat. */
  const glisserPuisCommiter = (
    cible: { x: number; y: number },
    commit: () => void,
  ) => {
    const fin = () => {
      poseEnCoursRef.current = null;
      commit();
      setDrag(null);
    };
    const calque = calqueRef.current;
    if (!calque || sansTransition) {
      fin();
      return;
    }
    calque.style.transition = `transform ${DUREE_POSE_MS}ms ease`;
    calque.style.transform = transformCalque(cible.x, cible.y);
    poseEnCoursRef.current = {
      timer: setTimeout(fin, DUREE_POSE_MS),
      commit: fin,
    };
  };

  const onPointerUpCarte = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const start = startRef.current;
    startRef.current = null;
    eclairerVisee(-1);
    if (!start) {
      setDrag(null);
      return;
    }
    if (!start.started) {
      setDrag(null);
      ouvrirFiche(start.id);
      return;
    }
    const id = start.id;
    const idx = celluleSous(e.clientX, e.clientY);
    // Cible : la pochette visée, sinon retour à la pochette d'origine —
    // dans les deux cas la carte va PILE dans un slot, jamais entre deux.
    const slotCible = idx >= 0 ? page * PAR_PAGE + idx : slots[id];
    const cellule = cellsRef.current[slotCible % PAR_PAGE];
    const r = cellule?.getBoundingClientRect();
    const centre = r
      ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      : { x: e.clientX, y: e.clientY };
    glisserPuisCommiter(centre, () => {
      if (idx >= 0 && slotCible !== slots[id]) deplacerCarte(id, slotCible);
    });
  };

  // Geste interrompu (appel, notification, geste système) : `pointercancel`
  // ET la perte de capture (`onLostPointerCapture`, qui suit AUSSI un lâcher
  // réussi — idempotent, `startRef`/`drag` sont déjà nuls à ce moment-là, et
  // la pose en cours garde son calque le temps d'arriver).
  const onPointerAbandonneCarte = () => {
    if (poseEnCoursRef.current) return;
    startRef.current = null;
    setDrag(null);
    eclairerVisee(-1);
  };

  const onSwipeDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    swipeStartRef.current = e.clientX;
  };
  const onSwipeUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (swipeStartRef.current === null) return;
    const dx = e.clientX - swipeStartRef.current;
    swipeStartRef.current = null;
    if (dx < -SWIPE_SEUIL_PX) setPage((p) => Math.min(pages - 1, p + 1));
    else if (dx > SWIPE_SEUIL_PX) setPage((p) => Math.max(0, p - 1));
  };
  // Même garde que sur l'album de timbres : un geste interrompu ne doit pas
  // laisser `swipeStartRef` posé pour un lâcher fantôme (M5 revue 2026-08-30).
  const onSwipeAbandonne = () => {
    swipeStartRef.current = null;
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
        onPointerDown={onSwipeDown}
        onPointerUp={onSwipeUp}
        onPointerCancel={onSwipeAbandonne}
        onPointerLeave={onSwipeAbandonne}
      >
        {Array.from({ length: PAR_PAGE }, (_, i) => {
          const slot = page * PAR_PAGE + i;
          const numero = slot + 1;
          const id = occupants.get(slot);
          const piece = id ? getPiece(id) : null;
          if (!id || !piece) {
            return (
              <div
                key={`vide-${slot}`}
                data-testid="pochette-vide"
                aria-label={d.albums.pochetteVide}
                style={pochette}
                ref={(el) => {
                  cellsRef.current[i] = el;
                }}
              >
                <span style={numeroCase} aria-hidden>
                  {numero}
                </span>
              </div>
            );
          }
          const quantite = album.pieces[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              data-testid="pochette"
              data-id={id}
              style={drag?.id === id ? { ...pochetteBtn, opacity: 0.55 } : pochetteBtn}
              aria-label={nomObjet({ templateId: id, nom: piece.nom }, locale)}
              ref={(el) => {
                cellsRef.current[i] = el;
              }}
              onPointerDown={onPointerDownCarte(id)}
              onPointerMove={onPointerMoveCarte}
              onPointerUp={onPointerUpCarte}
              onPointerCancel={onPointerAbandonneCarte}
              onLostPointerCapture={onPointerAbandonneCarte}
              onKeyDown={onKeyDownCarte(id)}
            >
              <span style={numeroCase} aria-hidden>
                {numero}
              </span>
              <div
                style={
                  drag?.id === id ? { ...visuelWrap, opacity: 0 } : visuelWrap
                }
              >
                <PieceVisuel id={id} thumb />
              </div>
              {quantite > 1 && (
                <span style={badgeQuantite}>
                  {tr(d.albums.doublon, { n: quantite })}
                </span>
              )}
              {album.nouvelles.includes(id) && (
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
      {/* Portail sur le body : le panneau porte un `backdrop-filter`, qui
          ferait de lui le bloc conteneur de ce `position: fixed` (même piège
          que l'album de timbres, e2455a51). */}
      {drag &&
        createPortal(
          <div
            ref={calqueRef}
            data-testid="carte-fantome"
            style={calqueStyle(drag.w, drag.h, drag.x, drag.y)}
          >
            <PieceVisuel id={drag.id} />
          </div>,
          document.body,
        )}
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
