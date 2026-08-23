"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";
import { getTemplate } from "@/data/objetTemplates";
import { audioManager } from "@/lib/audio/audioManager";
import type { JeuArcade } from "@/lib/bazar/arcade";
import { arcadeAudioUrl } from "@/lib/bazar/arcadeAudio";

/** Seuil de swipe, en px. Le même qu'au chinage : le geste doit se ressembler. */
const SWIPE_SEUIL_PX = 40;

const crt: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "#04140b",
  overflow: "hidden",
  // Conteneur de requête CSS : `PLAY` et `FÉFÉ GAMES` se dimensionnent en
  // `cqh`, proportionnels à la hauteur RÉELLE du trou (mesurée en px par
  // `BorneArcadeEcran`), pas à une police. `containerType: "size"` (et non
  // `"inline-size"`) est nécessaire pour que `cqh` se résolve : sans lui,
  // seul `cqw` existerait.
  containerType: "size",
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

// Remplit TOUT le trou du CRT — la barre de titre se pose PAR-DESSUS, en
// `position: absolute` elle aussi, comme le bandeau de score d'une vraie
// borne. Avant, cette zone était `flex: 1` dans une colonne et cédait sa
// hauteur du bas à la barre : le format de la capture n'avait plus rien à
// voir avec la forme du trou. Ce n'est plus le cas.
const zoneJeu: CSSProperties = {
  position: "absolute",
  inset: 0,
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

// Posée PAR-DESSUS `zoneJeu` (rendue après elle dans le JSX, donc dessus à
// l'écran sans avoir besoin de z-index) : son fond semi-opaque existait déjà
// et prend enfin son sens, comme le bandeau de score d'une vraie borne.
const barre: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
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

// « PLAY » et « FÉFÉ GAMES » : posés en HTML par-dessus la capture, pas
// peints dans l'image (voir `generate-captures-arcade.mjs`) — restylables
// sans régénérer une image, et nets à toute résolution au lieu d'être
// pixelisés deux fois. Ni l'un ni l'autre n'est jamais traduit (ce sont des
// mentions de marque, pas un titre de jeu), donc la pile monospace du
// système suffit ici — c'est elle qui donne le look CRT à tout l'écran.
// L'ombre portée sombre et épaisse (plusieurs décalages + un flou) fait
// office de contour : elle doit tenir aussi bien sur le manoir hanté (fond
// très sombre) que sur le chantier du plombier (fond très clair).
const overlayTexteBase: CSSProperties = {
  position: "absolute",
  left: "50%",
  transform: "translate(-50%, -50%)",
  color: "#ffc93c",
  fontWeight: 900,
  letterSpacing: "0.14em",
  whiteSpace: "nowrap",
  pointerEvents: "none",
  textShadow:
    "0 0 3px #241000, 0 0 6px #241000, 2px 2px 0 #241000, -2px -2px 0 #241000, " +
    "2px -2px 0 #241000, -2px 2px 0 #241000, 0 3px 8px rgba(0,0,0,0.7)",
};

const texteFefe: CSSProperties = {
  ...overlayTexteBase,
  top: "12%",
  fontSize: "4.5cqh",
};

const textePlay: CSSProperties = {
  ...overlayTexteBase,
  top: "62%",
  fontSize: "12cqh",
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

  // La bande-son suit le jeu affiché, et cet écran est le SEUL à savoir lequel
  // c'est. `BorneArcadeEcran` ne le monte que quand la borne est ouverte, donc
  // son cycle de vie est exactement celui du meuble allumé.
  const pisteCourante = jeu?.trouve ? jeu.templateId : null;

  useEffect(() => {
    if (!pisteCourante) {
      // « PAS DE SIGNAL » est muet, pour la même raison que sa capture n'est
      // pas dans le DOM : rien ne doit trahir un jeu pas encore trouvé.
      audioManager.stopArcade();
      return;
    }
    // Allumage ou changement de cartouche : c'est le manager qui tranche,
    // selon qu'une piste tourne déjà. Cet écran n'a donc rien à retenir entre
    // deux swipes — et rien à faire de particulier au premier rendu.
    void audioManager.playArcadeTrack(arcadeAudioUrl(pisteCourante));
  }, [pisteCourante]);

  // Effet SÉPARÉ, sans dépendance : le nettoyage de celui du dessus se
  // rejouerait à chaque changement de jeu et couperait la piste qu'on vient
  // tout juste de lancer. Ici il ne tourne qu'au démontage — c'est-à-dire à la
  // fermeture de la borne, quelle qu'en soit la façon (croix, Échap, voile).
  useEffect(() => () => audioManager.stopArcade(), []);

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
          <>
            {/* `alt=""` : le titre juste en dessous porte déjà l'information,
                et il est dans une région vivante. Deux annonces pour une
                seule image feraient bégayer le lecteur d'écran. */}
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
            {/* Décor de l'écran, pas de l'information : le titre du jeu et
                les boutons sont déjà annoncés ailleurs. Les faire lire
                ajouterait du bruit. */}
            <div data-testid="arcade-texte-fefe" aria-hidden="true" style={texteFefe}>
              FÉFÉ GAMES
            </div>
            <div data-testid="arcade-texte-play" aria-hidden="true" style={textePlay}>
              PLAY
            </div>
          </>
        ) : (
          <>
            {/* La capture n'est PAS rendue puis masquée : elle n'est pas
                demandée du tout. Une image posée dans le DOM se voit dans
                l'onglet réseau, et le contenu à découvrir fuiterait. */}
            <div style={neige} />
            {/* Colonne, et non plus une seule ligne centrée : la neige disait
                que le jeu manque, jamais COMMENT l'allumer. La marche à
                suivre se pose donc juste dessous, dans le vert plus sourd
                d'un sous-titre de borne — le message d'état reste le premier
                lu, l'indice se donne à qui s'attarde. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                // Marge latérale : l'indice est une phrase entière dans les
                // quatre langues (le grec est le plus long) et le trou du CRT
                // est étroit. Sans elle, il touche les deux bords.
                padding: "0 10px",
                color: "#7dfcae",
                fontSize: 12,
                letterSpacing: "0.22em",
              }}
            >
              {d.bazar.bornePasDeSignal}
              <span
                data-testid="arcade-indice"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  lineHeight: 1.5,
                  color: "#4fbf85",
                  textAlign: "center",
                }}
              >
                {d.bazar.borneIndiceCartouche}
              </span>
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
