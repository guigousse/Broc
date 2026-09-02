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
  compteur: { possedees: number; total: number };
  doublons?: number;
  onRecycler?: () => void;
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
  fontSize: 13,
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

/** L'icône de recyclage nue + le chiffre des doublons (0 compris). */
const recyclerIconeBtn: CSSProperties = {
  minWidth: "var(--tap-min)",
  minHeight: "var(--tap-min)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  border: "none",
  background: "transparent",
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
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
        <span style={compteurStyle}>
          {tr(d.albums.compteur, {
            n: compteur.possedees,
            total: compteur.total,
          })}
        </span>
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
              <Recycle size={16} strokeWidth={1.6} aria-hidden />
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
