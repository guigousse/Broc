"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";
import { getTemplate } from "@/data/objetTemplates";
import type { JeuArcade } from "@/lib/bazar/arcade";

/** Seuil de swipe, en px. Le même qu'au chinage : le geste doit se ressembler. */
const SWIPE_SEUIL_PX = 40;

const crt: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "#04140b",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  // Le look CRT vient d'ICI et non d'une police : aucune police pixel ne
  // couvre le grec, et les titres des jeux sont traduits en quatre langues.
  fontFamily: "ui-monospace, Menlo, monospace",
  color: "#b7ffd6",
};

const balayage: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background:
    "repeating-linear-gradient(0deg, rgba(0,0,0,0.30) 0 1px, transparent 1px 3px)",
};

const zoneJeu: CSSProperties = {
  flex: 1,
  position: "relative",
  overflow: "hidden",
  touchAction: "pan-y",
};

const neige: CSSProperties = {
  position: "absolute",
  inset: 0,
  opacity: 0.5,
  background:
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 2px)," +
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.13) 0 1px, transparent 1px 3px)," +
    "repeating-linear-gradient(23deg, rgba(255,255,255,0.07) 0 2px, transparent 2px 5px)",
  animation: "broc-arcade-neige 220ms steps(2) infinite",
};

const barre: CSSProperties = {
  flex: "none",
  padding: "5px 4px 7px",
  background: "rgba(0,0,0,0.45)",
  borderTop: "1px solid rgba(125,252,174,0.25)",
  textAlign: "center",
};

const pilote: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 6px",
  marginTop: 2,
};

function flecheStyle(eteinte: boolean): CSSProperties {
  return {
    background: "transparent",
    border: "none",
    padding: "2px 4px",
    cursor: eteinte ? "default" : "pointer",
    color: eteinte ? "#1f5c39" : "#8dffbe",
    filter: eteinte ? "none" : "drop-shadow(0 0 8px rgba(125,252,174,0.55))",
    lineHeight: 0,
  };
}

interface EcranArcadeProps {
  jeux: JeuArcade[];
}

/**
 * Le contenu du CRT : un jeu à la fois.
 *
 * Sans géométrie propre — il remplit son conteneur, et c'est
 * `BorneArcadeEcran` qui décide où ce conteneur se trouve dans la façade.
 * Cette séparation est ce qui permet de tester le carrousel sous jsdom, qui
 * n'a pas de layout du tout.
 */
export function EcranArcade({ jeux }: EcranArcadeProps) {
  const { d, locale } = useLangue();
  const [index, setIndex] = useState(0);
  const departXRef = useRef<number | null>(null);

  const idx = Math.min(index, Math.max(0, jeux.length - 1));
  const jeu = jeux[idx];
  const template = jeu ? getTemplate(jeu.templateId) : undefined;
  const auDebut = idx === 0;
  const aLaFin = idx === jeux.length - 1;

  const aller = (delta: number) => {
    setIndex((i) => Math.min(jeux.length - 1, Math.max(0, i + delta)));
  };

  const onPointerDown = (e: PointerEvent) => {
    departXRef.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (departXRef.current === null) return;
    const dx = e.clientX - departXRef.current;
    departXRef.current = null;
    if (Math.abs(dx) > SWIPE_SEUIL_PX) aller(dx < 0 ? 1 : -1);
  };
  const onPointerCancel = () => {
    departXRef.current = null;
  };

  const titre =
    jeu?.trouve && template
      ? nomObjet({ templateId: template.templateId, nom: template.nom }, locale).toUpperCase()
      : "???";

  return (
    <div style={crt}>
      <div
        style={zoneJeu}
        data-testid="arcade-zone"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {jeu?.trouve ? (
          // `alt=""` : le titre juste en dessous porte déjà l'information, et
          // il est dans une région vivante. Deux annonces pour une seule
          // image feraient bégayer le lecteur d'écran.
          <img
            data-testid="arcade-capture"
            src={`/bazar/arcade/${jeu.templateId}.webp`}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              // Une capture pixel art doit rester en gros pixels carrés :
              // le lissage par défaut la transformerait en bouillie.
              imageRendering: "pixelated",
            }}
          />
        ) : (
          <>
            {/* La capture n'est PAS rendue puis masquée : elle n'est pas
                demandée du tout. Une image posée dans le DOM se voit dans
                l'onglet réseau, et le contenu à découvrir fuiterait. */}
            <div style={neige} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#7dfcae",
                fontSize: 12,
                letterSpacing: "0.22em",
              }}
            >
              {d.bazar.bornePasDeSignal}
            </div>
          </>
        )}
      </div>

      <div style={barre}>
        <div
          data-testid="arcade-titre"
          aria-live="polite"
          style={{
            fontSize: 13,
            letterSpacing: jeu?.trouve ? "0.09em" : "0.3em",
            color: jeu?.trouve ? "#b7ffd6" : "#3f9d68",
          }}
        >
          {titre}
        </div>
        <div style={pilote}>
          <button
            type="button"
            aria-label={d.bazar.borneJeuPrecedent}
            onClick={() => aller(-1)}
            disabled={auDebut}
            style={flecheStyle(auDebut)}
          >
            <ChevronLeft size={34} />
          </button>
          <span
            data-testid="arcade-compteur"
            style={{ color: "#3f9d68", fontSize: 10, letterSpacing: "0.18em" }}
          >
            {String(idx + 1).padStart(2, "0")} / {String(jeux.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            aria-label={d.bazar.borneJeuSuivant}
            onClick={() => aller(1)}
            disabled={aLaFin}
            style={flecheStyle(aLaFin)}
          >
            <ChevronRight size={34} />
          </button>
        </div>
      </div>

      <div style={balayage} />
    </div>
  );
}
