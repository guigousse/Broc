"use client";

import type { CSSProperties } from "react";
import {
  LogoAppStore,
  LogoGooglePlay,
  LogoInstagram,
  LogoTikTok,
} from "@/components/mobile/LogosMarques";
import { useLangue } from "@/lib/i18n/LangueContext";
import { useSettingsSafe } from "@/context/SettingsContext";
import { INSTAGRAM_URL, TIKTOK_URL, lienNotation } from "@/lib/soutien/liens";
import { ouvrirLien } from "@/lib/soutien/ouvrir";
import { ChatPose } from "@/components/mobile/ChatPose";

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

const base: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  width: "100%",
  padding: "14px 16px",
  minHeight: "var(--tap-min)",
  borderRadius: 6,
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  textAlign: "left",
  cursor: "pointer",
};

/* Deux fonds, une seule règle : les réseaux se fondent dans le décor, et le
   bouton d'avis prend le CONTRE-PIED de ce décor. C'est lui qu'on demande
   vraiment ; il doit se voir sans qu'on ajoute une couleur d'accent que la
   palette du jeu n'a pas. Sur la page du menu (fond vert sombre) il est donc
   crème, et sur la feuille de la borne (papier) il est vert. */
const bouton = (surPapier: boolean): CSSProperties => ({
  ...base,
  background: surPapier ? "transparent" : "var(--forest-800)",
  color: surPapier ? "var(--forest-800)" : "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  boxShadow: surPapier
    ? "none"
    : "0 6px 14px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,225,160,0.20)",
});

const boutonAvis = (surPapier: boolean): CSSProperties => ({
  ...base,
  background: surPapier ? "var(--forest-800)" : "var(--paper-100)",
  color: surPapier ? "var(--brass-300)" : "var(--forest-800)",
  border: "2px solid var(--brass-600)",
  fontWeight: 700,
  boxShadow: surPapier
    ? "0 6px 16px rgba(40,25,5,0.30)"
    : "0 8px 20px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.6)",
});

const pile: CSSProperties = { display: "grid", gap: 10 };

/* Il descend aussi : l'espace au-dessus le détache du duo de réseaux et laisse
   la place au chat. */
const zoneAvis: CSSProperties = { marginTop: 14 };

/** Libellé centré dans l'espace restant à droite de l'icône (comme au menu). */
const libelle: CSSProperties = { flex: 1, textAlign: "center" };

interface BoutonsSoutienProps {
  /** Pose le chat sur le bord du bouton d'avis (page du menu). */
  avecChat?: boolean;
  /** Habillage pour un fond clair — la feuille de la borne d'arcade. */
  surPapier?: boolean;
}

export function BoutonsSoutien({
  avecChat = false,
  surPapier = false,
}: BoutonsSoutienProps) {
  const { d } = useLangue();
  // `useSettingsSafe`, PAS `useSettings` : ces boutons sont montés en
  // permanence (feuille fermée) par `EcranArcade`, au fond de l'arbre de la
  // borne. Exiger un `SettingsProvider` juste pour le son du clic rendrait
  // fragile le test de chaque ancêtre qui monte cet écran.
  const { playClick } = useSettingsSafe();

  // Recalculé à chaque rendu, et c'est voulu : `PLAY_STORE_ACTIF` peut basculer
  // d'une version à l'autre, et rien ici ne coûte assez cher pour être mémoïsé.
  const urlNotation = lienNotation();
  // La marque du store se DÉDUIT de l'adresse : `lienNotation()` a déjà
  // tranché la plateforme (et la fiche Play peut rester fermée). Refaire le
  // test ici, c'est prendre le risque que les deux divergent un jour.
  const surPlay = urlNotation
    ? urlNotation.startsWith("market://") || urlNotation.includes("play.google.com")
    : false;

  const aller = (url: string) => () => {
    playClick();
    void ouvrirLien(url);
  };

  return (
    <div style={pile}>
      <button
        type="button"
        data-testid="soutien-instagram"
        style={bouton(surPapier)}
        onClick={aller(INSTAGRAM_URL)}
      >
        <LogoInstagram />
        <span style={libelle}>{d.soutien.instagram}</span>
      </button>
      <button
        type="button"
        data-testid="soutien-tiktok"
        style={bouton(surPapier)}
        onClick={aller(TIKTOK_URL)}
      >
        <LogoTikTok />
        <span style={libelle}>{d.soutien.tiktok}</span>
      </button>

      {/* Pas de fiche sur cette plateforme = pas de bouton. Un bouton qui
          ouvrirait une page inexistante est pire que pas de bouton. */}
      {urlNotation && (
        <div style={zoneAvis}>
          {avecChat && <ChatPose />}
          <button
            type="button"
            data-testid="soutien-noter"
            style={boutonAvis(surPapier)}
            onClick={aller(urlNotation)}
          >
            {surPlay ? <LogoGooglePlay /> : <LogoAppStore />}
            <span style={libelle}>{d.soutien.noter}</span>
          </button>
        </div>
      )}
    </div>
  );
}
