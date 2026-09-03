"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Recycle, X } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useLangue } from "@/lib/i18n/LangueContext";

/* ── LE CHÂSSIS PARTAGÉ DES DEUX ALBUMS ──────────────────────────────────
   Classeur de cartes et album de timbres partagent la même coquille : un
   CALQUE FIXE, bureau flouté visible derrière, calé ENTRE l'en-tête du haut et
   la TabBar (mêmes bornes que
   `CarnetOverlay` / `FloatingRoomOverlay`, pour que les deux restent
   accessibles — retour de Guillaume 2026-08-31), pas une carte bordée qui
   défile. Dedans : la ligne d'en-tête (compteur, titre centré si
   `titreVisible` — l'album de timbres l'a repris à la recette du 2026-09-02,
   le classeur reste sans titre visible et le nom reste l'aria-label du
   dialog —, bouton Recycler et croix) ; puis le contenu (grille de pochettes
   ou pages de timbres) en `children`, dans une zone `flex: 1` qui ne défile
   pas.

   Le bouton Recycler vit dans `RecyclerBouton` (exporté) : bouton encadré
   d'en-tête par défaut, ou icône + chiffre (`icone`) qu'un album place où il
   veut — les timbres le posent à droite de leur pagination. Dans les deux
   cas il ouvre une confirmation avant de débiter les doublons — action
   irréversible. Sans `onRecycler`, la coquille n'en rend AUCUN : c'est à
   l'album de rendre le sien. */

interface AlbumShellProps {
  open: boolean;
  onClose: () => void;
  titre: string;
  /** Affiche `titre` au centre de la ligne d'en-tête. */
  titreVisible?: boolean;
  /** Sans lui, pas de compteur dans l'en-tête : l'album de timbres rend le
   *  sien à gauche de sa pagination (recette 2026-09-02). */
  compteur?: { possedees: number; total: number };
  doublons?: number;
  onRecycler?: () => void;
  children: ReactNode;
}

/** Grain de papier par-dessus l'anthracite (recette 2026-09-03) : bruit SVG
 *  `feTurbulence` en blanc très faible, répété en tuile — la feuille
 *  cartonnée d'un vrai album n'est jamais parfaitement lisse. Partagé par la
 *  page de timbres et la grille du classeur. */
const GRAIN_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>`,
);
export const FOND_PAGE_ALBUM = `url("data:image/svg+xml,${GRAIN_SVG}"), linear-gradient(180deg, #2b2b2f 0%, #1c1c1f 100%)`;

export const PANNEAU_TOP =
  "calc(var(--safe-top) + var(--mobile-header-h) + var(--tuto-banniere-h, 0px))";
export const PANNEAU_BOTTOM =
  "calc(var(--mobile-tabbar-h) + var(--safe-bottom))";

const panneau: CSSProperties = {
  position: "fixed",
  top: PANNEAU_TOP,
  bottom: PANNEAU_BOTTOM,
  left: 0,
  right: 0,
  // Au-dessus de l'en-tête sticky et de la TabBar (30), sous les fiches
  // modales (FichePiece 106, ConfirmModal 110).
  zIndex: 35,
  display: "flex",
  flexDirection: "column",
  // Un calque SUR le bureau, comme les menus : le bureau reste visible,
  // flouté (même voile que FloatingRoomOverlay) — pas une page opaque.
  background: "rgba(15,31,24,0.35)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  padding: "10px 12px 12px",
  overflow: "hidden",
};

/** La zone des `children` : prend tout ce qui reste sous l'en-tête, sans
 *  défiler — c'est aux albums de tenir dans la hauteur donnée. */
const contenu: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};

const ligneActions: CSSProperties = {
  // `relative` : le titre centré est posé en absolu sur toute la largeur,
  // pour être au CENTRE de l'écran, pas au centre de l'espace que compteur
  // et croix veulent bien lui laisser.
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 12,
};

const titreStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  textAlign: "center",
  fontFamily: "var(--font-display)",
  // Plus gras et plus grand (recette 2026-09-02) : c'est le titre de la
  // scène, pas une mention de coin.
  fontSize: 17,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  pointerEvents: "none",
};

const compteurStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.08em",
  color: "var(--brass-300)",
  whiteSpace: "nowrap",
};

const actions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  // À droite même quand il est seul sur la ligne (timbres : le compteur est
  // parti à gauche de la pagination, le titre est en absolu).
  marginLeft: "auto",
};

const recyclerBtn: CSSProperties = {
  minHeight: "var(--tap-min)",
  padding: "8px 12px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-btn)",
  background: "var(--paper-200)",
  color: "var(--ink-700)",
  cursor: "pointer",
};

/** L'icône de recyclage nue + le chiffre des doublons (0 compris), en gras
 *  et bien visible (recette 2026-09-02). */
const recyclerIconeBtn: CSSProperties = {
  minWidth: "var(--tap-min)",
  minHeight: "var(--tap-min)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "none",
  background: "transparent",
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};

/** Cadre réduit (recette 2026-09-02) : la croix reste la cible, son carré ne
 *  doit pas peser autant qu'un bouton d'action. */
const croixBtn: CSSProperties = {
  width: 32,
  height: 32,
  border: "1px solid var(--brass-500)",
  background: "transparent",
  color: "var(--brass-300)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  borderRadius: "var(--radius-btn)",
};

export function AlbumShell({
  open,
  onClose,
  titre,
  titreVisible = false,
  compteur,
  doublons = 0,
  onRecycler,
  children,
}: AlbumShellProps) {
  const { d, tr } = useLangue();
  if (!open) return null;

  return (
    <div style={panneau} role="dialog" aria-label={titre}>
      <div style={ligneActions}>
        {compteur && (
          <span style={compteurStyle}>
            {tr(d.albums.compteur, {
              n: compteur.possedees,
              total: compteur.total,
            })}
          </span>
        )}
        {titreVisible && <span style={titreStyle}>{titre}</span>}
        <div style={actions}>
          {onRecycler && (
            <RecyclerBouton
              titre={titre}
              doublons={doublons}
              onRecycler={onRecycler}
            />
          )}
          <button
            type="button"
            style={croixBtn}
            onClick={onClose}
            aria-label={d.commun.fermer}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div style={contenu}>{children}</div>
    </div>
  );
}

/** Pagination au centre (children), compteur « x/50 » à sa gauche, Recycler
 *  (icône + chiffre) à sa droite : la ligne du bas des deux albums. */
const ligneBas: CSSProperties = {
  position: "relative",
  marginTop: 4,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const compteurCoin: CSSProperties = {
  position: "absolute",
  left: 0,
  top: "50%",
  transform: "translateY(-50%)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.08em",
  color: "var(--brass-300)",
  whiteSpace: "nowrap",
};

const recyclerCoin: CSSProperties = {
  position: "absolute",
  right: 0,
  top: "50%",
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
};

interface LigneBasAlbumProps {
  compteur: { possedees: number; total: number };
  /** Le titre de l'album, repris par la confirmation du Recycler. */
  titre: string;
  doublons: number;
  onRecycler: () => void;
  /** La pagination de l'album, au centre. */
  children: ReactNode;
  /** Un bouton (ou plus) affiché avant le Recycler, dans le même coin. */
  avantRecycler?: ReactNode;
}

export function LigneBasAlbum({
  compteur,
  titre,
  doublons,
  onRecycler,
  children,
  avantRecycler,
}: LigneBasAlbumProps) {
  const { d, tr } = useLangue();
  return (
    <div style={ligneBas}>
      <span style={compteurCoin}>
        {tr(d.albums.compteur, {
          n: compteur.possedees,
          total: compteur.total,
        })}
      </span>
      {children}
      <div style={recyclerCoin}>
        {avantRecycler}
        <RecyclerBouton
          icone
          titre={titre}
          doublons={doublons}
          onRecycler={onRecycler}
        />
      </div>
    </div>
  );
}

interface RecyclerBoutonProps {
  /** Le titre de l'album, repris par la modale de confirmation. */
  titre: string;
  doublons: number;
  onRecycler: () => void;
  /** Icône de recyclage + chiffre plutôt que le bouton encadré d'en-tête. */
  icone?: boolean;
}

/** Le déclencheur du recyclage et SA confirmation, autoportants : chaque
 *  album le pose où il veut (en-tête du classeur, droite de la pagination
 *  des timbres). */
export function RecyclerBouton({
  titre,
  doublons,
  onRecycler,
  icone = false,
}: RecyclerBoutonProps) {
  const { d, tr } = useLangue();
  const [confirmOuvert, setConfirmOuvert] = useState(false);
  const libelle = tr(d.albums.recycler, { n: doublons });

  return (
    <>
      {/* Masqué pendant la confirmation : évite deux boutons « Recycler »
         concurrents dans l'arbre d'accessibilité (celui de la modale
         reprend le même libellé). */}
      {!confirmOuvert && (
        <button
          type="button"
          style={
            icone
              ? { ...recyclerIconeBtn, opacity: doublons === 0 ? 0.45 : 1 }
              : recyclerBtn
          }
          disabled={doublons === 0}
          aria-label={icone ? libelle : undefined}
          onClick={() => setConfirmOuvert(true)}
        >
          {icone ? (
            <>
              <Recycle size={22} strokeWidth={2.4} aria-hidden />
              <span>{doublons}</span>
            </>
          ) : (
            libelle
          )}
        </button>
      )}
      <ConfirmModal
        open={confirmOuvert}
        onClose={() => setConfirmOuvert(false)}
        onConfirm={onRecycler}
        titre={titre}
        confirmLabel={libelle}
      >
        {tr(d.albums.recyclerConfirm, { n: doublons })}
      </ConfirmModal>
    </>
  );
}
