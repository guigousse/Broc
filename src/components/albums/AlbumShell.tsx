"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { X } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ficheBackdrop } from "@/components/ui/FicheObjet";
import { plaqueLaiton } from "@/components/ui/plaqueLaiton";
import { useLangue } from "@/lib/i18n/LangueContext";

/* ── LE CHÂSSIS PARTAGÉ DES DEUX ALBUMS ──────────────────────────────────
   Classeur de cartes et album de timbres partagent la même coquille : un
   voile plein écran (`ficheBackdrop`, repris tel quel — même famille visuelle
   que la fiche d'un objet), une carte pleine largeur avec un en-tête (titre
   gravé au laiton, compteur, bouton Recycler, croix) et le contenu (grille de
   pochettes ou pages de timbres) en `children`. Le bouton Recycler ouvre une
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

const carte: CSSProperties = {
  width: "min(420px, 94vw)",
  maxWidth: "100%",
  maxHeight: "88vh",
  overflowY: "auto",
  position: "relative",
  background: "var(--forest-900)",
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-card)",
  padding: "18px",
  boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
};

const enTete: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 14,
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
    <div
      style={ficheBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={carte} role="dialog" aria-label={titre}>
        <div style={enTete}>
          <div style={plaqueLaiton}>{titre}</div>
          <span style={compteurStyle}>
            {tr(d.albums.compteur, { n: compteur.possedees, total: compteur.total })}
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
            <button type="button" style={croixBtn} onClick={onClose} aria-label={d.commun.fermer}>
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
        {children}
      </div>
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
