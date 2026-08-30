"use client";

import { FloatingActionBar } from "@/components/mobile/qg/FloatingActionBar";
import { FloatingActionButton } from "@/components/mobile/qg/FloatingActionButton";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { AlbumId } from "@/data/pieces";
import type { AlbumsState } from "@/types/game";

interface AlbumsSheetProps {
  open: boolean;
  onClose: () => void;
  albums: AlbumsState;
  onOuvrir: (album: AlbumId) => void;
}

/**
 * Sheet « Mes albums », ouverte depuis le livre de comptes (`QgCarnet`) posé
 * sur le bureau. Un bouton par album : actif s'il est déjà acheté (au
 * Bazar), sinon désactivé avec le suffixe « — Au Bazar » — l'achat ne se
 * fait pas d'ici.
 */
export function AlbumsSheet({ open, onClose, albums, onOuvrir }: AlbumsSheetProps) {
  const { d } = useLangue();
  return (
    <FloatingActionBar open={open} onClose={onClose}>
      <FloatingActionButton
        onClick={() => onOuvrir("classeur")}
        disabled={!albums.classeur.achete}
      >
        {albums.classeur.achete
          ? d.albums.classeurTitre
          : `${d.albums.classeurTitre} — ${d.albums.auBazar}`}
      </FloatingActionButton>
      <FloatingActionButton
        onClick={() => onOuvrir("timbres")}
        disabled={!albums.timbres.achete}
      >
        {albums.timbres.achete
          ? d.albums.albumTitre
          : `${d.albums.albumTitre} — ${d.albums.auBazar}`}
      </FloatingActionButton>
    </FloatingActionBar>
  );
}
