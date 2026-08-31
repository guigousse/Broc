"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { X } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { plaqueLaiton } from "@/components/ui/plaqueLaiton";
import { useLangue } from "@/lib/i18n/LangueContext";

/* ── LE CHÂSSIS PARTAGÉ DES DEUX ALBUMS ──────────────────────────────────
   Classeur de cartes et album de timbres partagent la même coquille : un
   CALQUE FIXE, bureau flouté visible derrière, calé ENTRE l'en-tête du haut et
   la TabBar (mêmes bornes que
   `CarnetOverlay` / `FloatingRoomOverlay`, pour que les deux restent
   accessibles — retour de Guillaume 2026-08-31), pas une carte bordée qui
   défile. Dedans : le titre gravé au laiton seul sur sa ligne, centré,
   juste sous l'en-tête ; puis compteur, bouton Recycler et croix ; puis le
   contenu (grille de pochettes ou pages de timbres) en `children`, dans une
   zone `flex: 1` qui ne défile pas. Le bouton Recycler ouvre une
   confirmation avant de débiter les doublons — action irréversible. */

interface AlbumShellProps {
  open: boolean;
  onClose: () => void;
  titre: string;
  compteur: { possedees: number; total: number };
  doublons: number;
  onRecycler: () => void;
  children: ReactNode;
}

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

const ligneTitre: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginBottom: 10,
};

const ligneActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 12,
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

const croixBtn: CSSProperties = {
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

export function AlbumShell({
  open,
  onClose,
  titre,
  compteur,
  doublons,
  onRecycler,
  children,
}: AlbumShellProps) {
  const { d, tr } = useLangue();
  const [confirmOuvert, setConfirmOuvert] = useState(false);
  if (!open) return null;
  const libelleRecycler = tr(d.albums.recycler, { n: doublons });

  return (
    <div style={panneau} role="dialog" aria-label={titre}>
      <div style={ligneTitre}>
        <div style={plaqueLaiton}>{titre}</div>
      </div>
      <div style={ligneActions}>
        <span style={compteurStyle}>
          {tr(d.albums.compteur, {
            n: compteur.possedees,
            total: compteur.total,
          })}
        </span>
        <div style={actions}>
          {/* Masqué pendant la confirmation : évite deux boutons « Recycler »
             concurrents dans l'arbre d'accessibilité (celui de la modale
             reprend le même libellé). */}
          {!confirmOuvert && (
            <button
              type="button"
              style={recyclerBtn}
              disabled={doublons === 0}
              onClick={() => setConfirmOuvert(true)}
            >
              {libelleRecycler}
            </button>
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
      <ConfirmModal
        open={confirmOuvert}
        onClose={() => setConfirmOuvert(false)}
        onConfirm={onRecycler}
        titre={titre}
        confirmLabel={libelleRecycler}
      >
        {tr(d.albums.recyclerConfirm, { n: doublons })}
      </ConfirmModal>
    </div>
  );
}
