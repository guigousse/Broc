"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useGameStateOnly } from "@/context/GameContext";
import { useLangue } from "@/lib/i18n/LangueContext";
import { tr } from "@/lib/i18n/ui";
import { estRoutePartie } from "@/lib/routesPartie";

/**
 * Tâche 8 : le défaut réellement vécu par le joueur. L'ancien toast (2,5 s,
 * `TOAST_DUREE_MS`) et sa garde `saveEnEchecRef` ne donnaient qu'UN SEUL
 * signal pour toute la durée d'un échec de sauvegarde — un joueur a ainsi
 * perdu une heure de jeu sans plus jamais être averti. Ici : un bandeau qui
 * ne s'efface jamais tant que l'échec persiste, puis une modale qui
 * escalade au bout de deux minutes et revient rappeler toutes les cinq
 * minutes si elle a été fermée sans que l'échec se résolve.
 */

/** Délai d'échec avant l'ouverture de la modale d'escalade. */
export const DELAI_MODALE_MS = 120_000;
/** Après fermeture, délai avant que la modale revienne rappeler le joueur. */
export const RAPPEL_MODALE_MS = 300_000;

// Relecture de l'horloge : inutile de battre à la seconde pour un seuil de
// deux minutes.
const INTERVALLE_HORLOGE_MS = 10_000;

// Même gouttière que `TutorielBanniere` (dupliquée à dessein, cf. son
// commentaire GOUTTIERE_PX — modules indépendants du chrome global).
const GOUTTIERE_PX = 6;

const bandeauStyle: CSSProperties = {
  position: "fixed",
  // Empilé SOUS la bannière de tutoriel (zIndex 90) : `--tuto-banniere-h`
  // (0 hors tutoriel, mesurée gouttières comprises sinon) ajoute sa hauteur
  // réelle au même point d'ancrage — cf. TutorielBanniere.tsx:21-27 et son
  // usage déjà établi dans FloatingRoomOverlay.tsx. Une perte de sauvegarde
  // prime visuellement sur une consigne de tutoriel.
  top: `calc(var(--safe-top, 0px) + var(--mobile-header-h) + ${GOUTTIERE_PX}px + var(--tuto-banniere-h, 0px))`,
  left: 12,
  right: 12,
  zIndex: 91,
  padding: "8px 12px",
  borderRadius: 8,
  background: "var(--vermillion-700, #6e2417)",
  border: "1px solid var(--vermillion-400, #d9765f)",
  color: "#fdf1ec",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.3,
  textAlign: "center",
  // Revue Tâche 8 (finding 1) : sans ça, la bande occupe le même rectangle
  // que StickyTop/le cadre du Bazar (safe-top + header + 6px, pleine
  // largeur) et devient une zone morte — untappable — pendant toute la
  // durée (potentiellement illimitée) d'un échec de sauvegarde. Un bandeau
  // purement informatif ne doit jamais voler les taps sous lui, comme
  // `TutorielBanniere` (cf. son `wrap.pointerEvents`).
  pointerEvents: "none",
};

const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 120,
  background: "rgba(15,31,24,0.82)",
  display: "grid",
  placeItems: "center",
  padding: 20,
};

const cardStyle: CSSProperties = {
  maxWidth: 360,
  width: "100%",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
  padding: 20,
  borderRadius: "var(--radius-card)",
};

const titreStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--vermillion-700, #6e2417)",
  textAlign: "center",
  marginBottom: 14,
};

const corpsStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 15,
  lineHeight: 1.45,
  color: "var(--ink-700)",
  marginBottom: 18,
};

const boutonStyle: CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "10px 12px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  cursor: "pointer",
  borderRadius: "var(--radius-btn)",
};

/**
 * Bandeau persistant + modale d'escalade de l'échec de sauvegarde. Gaté sur
 * `estRoutePartie` comme tout composant du layout racine : le contexte de
 * jeu garde la save du slot actif chargée hors partie (menu, mentions
 * légales), un composant qui ne se fierait qu'à `etatSauvegarde` s'y
 * afficherait donc aussi (déjà arrivé deux fois : bannière tutoriel
 * 2026-07-17, level-up 2026-07-25).
 */
export function BandeauSauvegarde() {
  const pathname = usePathname();
  const { etatSauvegarde } = useGameStateOnly();
  const { d } = useLangue();
  const [maintenant, setMaintenant] = useState(() => Date.now());
  // Horodatage de la dernière fermeture manuelle de la modale ; `null` tant
  // qu'elle n'a jamais été fermée pour l'échec en cours.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const routePartie = estRoutePartie(pathname);
  const enEchec = etatSauvegarde.enEchec;
  const depuis = enEchec ? etatSauvegarde.depuis : null;

  useEffect(() => {
    if (!enEchec || !routePartie) return;
    setMaintenant(Date.now());
    const id = window.setInterval(() => setMaintenant(Date.now()), INTERVALLE_HORLOGE_MS);
    return () => window.clearInterval(id);
  }, [enEchec, routePartie]);

  // Une nouvelle panne (nouveau `depuis`) efface le rappel de la précédente :
  // la modale doit pouvoir se rouvrir à SES deux minutes, pas hériter du
  // dernier « J'ai compris » d'un échec antérieur déjà résolu.
  useEffect(() => {
    setDismissedAt(null);
  }, [depuis]);

  if (!routePartie || !enEchec) return null;

  const genre = etatSauvegarde.genre;
  const ecoule = maintenant - etatSauvegarde.depuis;
  const minutes = Math.floor(ecoule / 60_000);
  const modaleDue = ecoule >= DELAI_MODALE_MS;
  const rappelPasse = dismissedAt === null || maintenant - dismissedAt >= RAPPEL_MODALE_MS;
  const modaleOuverte = modaleDue && rappelPasse;

  const texteDepuis =
    minutes === 1
      ? d.raisons.sauvegardeModaleDepuisUn
      : tr(d.raisons.sauvegardeModaleDepuisN, { minutes });
  const texteGenre =
    genre === "disque_plein"
      ? d.raisons.sauvegardeModaleDisquePlein
      : d.raisons.sauvegardeModaleIo;

  return (
    <>
      <div role="status" style={bandeauStyle}>
        {d.raisons.sauvegardeBandeau}
      </div>
      {modaleOuverte && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={d.raisons.sauvegardeModaleTitre}
          style={backdropStyle}
        >
          <div style={cardStyle}>
            <div style={titreStyle}>{d.raisons.sauvegardeModaleTitre}</div>
            <div style={corpsStyle}>
              <p>{texteDepuis}</p>
              <p>{texteGenre}</p>
            </div>
            <button
              type="button"
              style={boutonStyle}
              onClick={() => setDismissedAt(Date.now())}
            >
              {d.raisons.sauvegardeModaleBouton}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
