"use client";

import type { CSSProperties, ReactNode } from "react";
import { Aperture, Music2, Star } from "lucide-react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { useLangue } from "@/lib/i18n/LangueContext";
import { useSettings } from "@/context/SettingsContext";
import { INSTAGRAM_URL, TIKTOK_URL, lienNotation } from "@/lib/soutien/liens";
import { ouvrirLien } from "@/lib/soutien/ouvrir";

/**
 * La feuille « Soutenir Broc », ouverte depuis DEUX portes sans rapport : le
 * menu principal et le premier tap sur la borne d'arcade. La prop `intro`
 * porte l'accroche de la borne ; depuis le menu, elle est absente.
 *
 * Un seul composant pour les deux, donc une seule liste de liens et un seul
 * jeu de libellés à traduire. Le jour où un compte est renommé, il n'y a qu'un
 * endroit à corriger.
 */

const ligne: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "12px 10px",
  minHeight: "var(--tap-min)",
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--paper-100)",
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  letterSpacing: "0.04em",
  textAlign: "left",
  cursor: "pointer",
};

const pile: CSSProperties = { display: "grid", gap: 10 };

const separateur: CSSProperties = {
  height: 1,
  background: "var(--paper-500)",
  opacity: 0.5,
  margin: "4px 0",
};

interface SoutienSheetProps {
  open: boolean;
  onClose: () => void;
  /** Accroche posée au-dessus des boutons. Absente depuis le menu principal. */
  intro?: ReactNode;
}

export function SoutienSheet({ open, onClose, intro }: SoutienSheetProps) {
  const { d } = useLangue();
  const { playClick } = useSettings();

  // Recalculé à chaque rendu, et c'est voulu : `PLAY_STORE_ACTIF` peut basculer
  // d'une version à l'autre, et rien ici ne coûte assez cher pour être mémoïsé.
  const urlNotation = lienNotation();

  const aller = (url: string) => () => {
    playClick();
    void ouvrirLien(url);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={d.soutien.titre}>
      {intro}
      <div style={pile}>
        <button
          type="button"
          data-testid="soutien-instagram"
          style={ligne}
          onClick={aller(INSTAGRAM_URL)}
        >
          <Aperture size={18} strokeWidth={1.6} aria-hidden />
          {d.soutien.instagram}
        </button>
        <button
          type="button"
          data-testid="soutien-tiktok"
          style={ligne}
          onClick={aller(TIKTOK_URL)}
        >
          <Music2 size={18} strokeWidth={1.6} aria-hidden />
          {d.soutien.tiktok}
        </button>

        {/* Pas de fiche sur cette plateforme = pas de bouton. Un bouton qui
            ouvrirait une page inexistante est pire que pas de bouton. */}
        {urlNotation && (
          <>
            <div style={separateur} />
            <button
              type="button"
              data-testid="soutien-noter"
              style={{ ...ligne, borderColor: "var(--brass-300)" }}
              onClick={aller(urlNotation)}
            >
              <Star size={18} strokeWidth={1.6} aria-hidden />
              {d.soutien.noter}
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
