"use client";

import type { CSSProperties } from "react";
import { Aperture, Music2, Star } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { useSettingsSafe } from "@/context/SettingsContext";
import { INSTAGRAM_URL, TIKTOK_URL, lienNotation } from "@/lib/soutien/liens";
import { ouvrirLien } from "@/lib/soutien/ouvrir";

/**
 * Les trois portes de sortie du soutien (Instagram, TikTok, fiche du store),
 * partagées par les DEUX entrées : la page « Soutenir » du menu principal
 * (`SoutienModal`) et la feuille de la borne d'arcade (`SoutienSheet`).
 *
 * Un seul endroit pour les liens, un seul jeu de `data-testid`, un seul
 * habillage — celui des boutons du menu d'accueil : fond vert, bordure et
 * texte laiton. L'ancien habillage (fond transparent, texte `paper-100`)
 * posait du blanc cassé sur du papier : illisible sur appareil.
 */

const bouton: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: "14px 16px",
  minHeight: "var(--tap-min)",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  borderRadius: 6,
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.20em",
  textTransform: "uppercase",
  textAlign: "left",
  cursor: "pointer",
  boxShadow:
    "0 6px 14px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,225,160,0.20)",
};

const pile: CSSProperties = { display: "grid", gap: 12 };

/** Libellé centré dans l'espace restant à droite de l'icône (comme au menu). */
const libelle: CSSProperties = { flex: 1, textAlign: "center" };

export function BoutonsSoutien() {
  const { d } = useLangue();
  // `useSettingsSafe`, PAS `useSettings` : ces boutons sont montés en
  // permanence (feuille fermée) par `EcranArcade`, au fond de l'arbre de la
  // borne. Exiger un `SettingsProvider` juste pour le son du clic rendrait
  // fragile le test de chaque ancêtre qui monte cet écran.
  const { playClick } = useSettingsSafe();

  // Recalculé à chaque rendu, et c'est voulu : `PLAY_STORE_ACTIF` peut basculer
  // d'une version à l'autre, et rien ici ne coûte assez cher pour être mémoïsé.
  const urlNotation = lienNotation();

  const aller = (url: string) => () => {
    playClick();
    void ouvrirLien(url);
  };

  return (
    <div style={pile}>
      <button
        type="button"
        data-testid="soutien-instagram"
        style={bouton}
        onClick={aller(INSTAGRAM_URL)}
      >
        <Aperture size={18} strokeWidth={1.6} aria-hidden />
        <span style={libelle}>{d.soutien.instagram}</span>
      </button>
      <button
        type="button"
        data-testid="soutien-tiktok"
        style={bouton}
        onClick={aller(TIKTOK_URL)}
      >
        <Music2 size={18} strokeWidth={1.6} aria-hidden />
        <span style={libelle}>{d.soutien.tiktok}</span>
      </button>

      {/* Pas de fiche sur cette plateforme = pas de bouton. Un bouton qui
          ouvrirait une page inexistante est pire que pas de bouton. */}
      {urlNotation && (
        <button
          type="button"
          data-testid="soutien-noter"
          style={{ ...bouton, borderColor: "var(--brass-300)" }}
          onClick={aller(urlNotation)}
        >
          <Star size={18} strokeWidth={1.6} aria-hidden />
          <span style={libelle}>{d.soutien.noter}</span>
        </button>
      )}
    </div>
  );
}
