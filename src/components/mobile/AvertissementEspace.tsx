"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { espaceLibre } from "@/lib/storage/pontNatif";

/**
 * Tâche 9 : le pendant PRÉVENTIF de la Tâche 8 (bandeau + modale d'échec de
 * sauvegarde). Là où la Tâche 8 réagit à une écriture déjà en échec, celui-ci
 * avertit AVANT que le disque soit assez plein pour casser la sauvegarde,
 * pendant qu'agir (libérer de la place) est encore possible.
 *
 * Mesure une seule fois par lancement — pas à chaque sauvegarde, l'espace
 * disque ne bouge pas assez vite pour justifier une mesure répétée, et
 * `volumeAvailableCapacityForImportantUsageKey` (Swift, StockagePlugin.swift)
 * n'a pas vocation à être un poll.
 */

/**
 * Seuil sous lequel on avertit. Volontairement une constante nommée, jamais
 * un littéral en ligne : débattu à 200 Mo / 50 Mo / 5 Mo en recette, 50 Mo
 * retenu comme compromis — plus haut, on avertirait des téléphones sains (et
 * on grillerait la crédibilité de CETTE alerte comme celle de la Tâche 8) ;
 * plus bas, on avertirait au moment même où l'échec de sauvegarde survient,
 * ce qui n'a plus rien de préventif.
 */
export const SEUIL_ESPACE_LIBRE_OCTETS = 50 * 1024 * 1024;

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

export function AvertissementEspace() {
  const { d } = useLangue();
  const [alerte, setAlerte] = useState(false);
  const [ferme, setFerme] = useState(false);
  // Garde la mesure à UNE fois par lancement même si l'effet ci-dessous
  // venait à se redéclencher (StrictMode, changement de dépendances futur) :
  // le tableau de dépendances vide suffit déjà en pratique, cette ref est la
  // ceinture-et-bretelles qui rend l'invariant explicite et vérifiable.
  const mesureFaite = useRef(false);

  useEffect(() => {
    if (mesureFaite.current) return;
    mesureFaite.current = true;
    espaceLibre()
      .then((octets) => {
        if (octets !== null && octets < SEUIL_ESPACE_LIBRE_OCTETS) setAlerte(true);
      })
      // Une mesure qui échoue (plateforme sans pont natif disponible,
      // commande rejetée) ne doit jamais faire planter le jeu ni afficher un
      // faux avertissement — silence, comme un `null`.
      .catch(() => {});
  }, []);

  if (!alerte || ferme) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={d.raisons.espaceTitre}
      style={backdropStyle}
    >
      <div style={cardStyle}>
        <div style={titreStyle}>{d.raisons.espaceTitre}</div>
        <div style={corpsStyle}>{d.raisons.espaceCorps}</div>
        <button type="button" style={boutonStyle} onClick={() => setFerme(true)}>
          {d.raisons.espaceBouton}
        </button>
      </div>
    </div>
  );
}
