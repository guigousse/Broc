"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PieceVisuel } from "@/components/pieces/PieceVisuel";
import { getPiece } from "@/data/pieces";
import { audioManager } from "@/lib/audio/audioManager";
import { flyToTab } from "@/lib/flyAnimation";
import { useLangue } from "@/lib/i18n/LangueContext";
import { prefersReducedMotion } from "@/lib/transitionIris";
import { getRarityColors } from "@/lib/rarityColors";
import { compteEtNouveaute } from "./compteEtNouveaute";
import { useGlisser } from "./useGlisser";

/* ── L'OUVERTURE D'UNE POCHETTE DE TIMBRES ────────────────────────────────
   Posée AU-DESSUS de la fiche d'article du Bazar (zIndex 107 > 105). Les 3
   timbres sont DÉJÀ rangés en save par `acheterAuBazar` : cet écran ne fait
   qu'annoncer ce qui a eu lieu — à sa manière, décidée par Guillaume le
   2026-09-05, différente du booster Brocomon :

   1. « fermee » : l'enveloppe scellée, en grand, avec la main du tutoriel
      qui MONTE sur le rabat. Un glisser VERS LE HAUT d'au moins
      SEUIL_OUVERTURE_PX l'ouvre (bruit de papier) ; un tap, un glisser
      horizontal ou vers le bas ne font que secouer la main. Entrée/Espace
      ouvrent au clavier.
   2. « ouverte » : le rabat se soulève, puis les 3 timbres SORTENT de
      l'enveloppe À TOUR DE RÔLE et viennent s'aligner en grand devant
      elle. Chacun joue son son de rareté À L'INSTANT OÙ IL SE POSE (et la
      cloche de découverte s'il est inédit), pas au départ. Rien à taper :
      la sortie s'enchaîne d'elle-même.
   3. Les 3 posés : badges « Nouveau ! » / « ×N » et Ranger, qui efface le
      voile et fait s'envoler les timbres un à un vers l'onglet Collection
      (là où vit l'album), puis ferme la cérémonie après le dernier vol.

   `prefersReducedMotion` saute tout : les 3 timbres sont alignés d'emblée,
   sans son. ─────────────────────────────────────────────────────────────── */

interface OuverturePochetteTimbresOverlayProps {
  /** Les 3 ids tirés (déjà appliqués à la save par l'appelant). */
  pieces: string[];
  /** Quantités possédées AVANT cette pochette (snapshot pris avant l'achat). */
  quantitesAvant: Record<string, number>;
  onClose: () => void;
}

type Phase = "fermee" | "ouverte";

/** Glisser minimal VERS LE HAUT, en px, pour soulever le rabat. */
export const SEUIL_OUVERTURE_PX = 40;
/** Le rabat qui se soulève, avant que le premier timbre ne sorte. */
export const DUREE_RABAT_MS = 450;
/** Un timbre MONTE hors de l'enveloppe (petit, derrière le masque), puis
 *  REDESCEND devant elle en grandissant jusqu'à sa place ; puis l'écart
 *  avant le suivant. */
export const DUREE_MONTEE_MS = 380;
export const DUREE_DESCENTE_MS = 450;
export const ECART_TIMBRES_MS = 150;
/** Les timbres alignés s'envolent un à un : écart entre deux départs, et durée d'un vol. */
export const ECART_ENVOL_MS = 220;
export const DUREE_ENVOL_MS = 620;
const CIBLE_ENVOL = '[data-fly-target="/collection"]';

/** Le ratio du visuel `public/timbres/pochette.webp` (1564 × 2098). */
const RATIO_POCHETTE = "1564 / 2098";
/** Le bas du rabat (sceau compris), en % de la pochette : c'est lui qui se soulève. */
const HAUTEUR_RABAT_PCT = 28;
const POCHETTE_SRC = "/timbres/pochette.webp";
const GAP_RANGEE_PX = 10;

/** Le rabat ouvert : replié au-dessus de la charnière, incliné vers le spectateur. */
const ANGLE_OUVERT_DEG = 150;
const CLIP_RABAT = `inset(0 0 ${100 - HAUTEUR_RABAT_PCT}% 0)`;
const CLIP_CORPS = `inset(${HAUTEUR_RABAT_PCT}% 0 0 0)`;

/** L'intérieur de l'enveloppe, sous le rabat : le fond bleu sombre, et les
 *  deux rebords latéraux (les parois de côté) un peu plus clairs. Calé sur
 *  la charnière (le bord haut de la boîte) pour que le rabat ouvert s'y
 *  raccorde. */
const interieur: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  height: `${HAUTEUR_RABAT_PCT + 1}%`,
  background:
    "linear-gradient(90deg, #4d6b9c 0, #4d6b9c 5%, #1b3358 5%, #1b3358 95%, #4d6b9c 95%, #4d6b9c 100%)",
  borderRadius: "4% 4% 0 0",
  // Ombres internes : la profondeur de la poche, plus sombre au fond et le
  // long des parois (retour Guillaume 2026-09-05).
  boxShadow:
    "inset 0 16px 20px rgba(0,0,0,0.5), inset 14px 0 16px rgba(0,0,0,0.35), inset -14px 0 16px rgba(0,0,0,0.35)",
};

/** Le MASQUE : une copie de la partie basse de l'enveloppe (celle qui ne
 *  bouge pas), posée AU-DESSUS des timbres tant qu'ils sont dedans — c'est
 *  elle qui les cache, et c'est par le haut qu'ils en sortent. Sans ombre
 *  portée (l'original en a déjà une). Montée seulement une fois le rabat
 *  levé : pendant sa rotation vers la caméra, le rabat passe devant le
 *  corps et le masque le cacherait. */
const masqueCorps: CSSProperties = {
  position: "absolute",
  inset: 0,
  clipPath: CLIP_CORPS,
  WebkitClipPath: CLIP_CORPS,
  zIndex: 4,
  pointerEvents: "none",
};

/* Où est un timbre par rapport à sa place finale, en fractions de la
   HAUTEUR de la scène (l'enveloppe) : la rangée est calée à 62 %, le timbre
   part du CŒUR de la poche vers 48 % (caché derrière le masque, il ne se
   voit qu'en traversant l'ouverture), et l'ouverture, une fois franchie,
   est vers −8 %. */
const RANGEE_TOP_PCT = 62;
const HAUTEUR_SCENE = "calc(min(62vw, 250px) * 1.3414)";
const decalageY = (pct: number) => `calc(${HAUTEUR_SCENE} * ${(pct - RANGEE_TOP_PCT) / 100})`;

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 107,
  background: "rgba(10,8,4,0.8)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 28,
  padding: 20,
  overflow: "hidden",
};

/** La scène = la boîte de l'enveloppe ; les timbres s'alignent devant, en bas. */
const scene: CSSProperties = {
  position: "relative",
  width: "min(62vw, 250px)",
  aspectRatio: RATIO_POCHETTE,
};

const pochetteBox: CSSProperties = {
  position: "absolute",
  inset: 0,
  cursor: "grab",
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
  outline: "none",
  // En vraie 3D (retour Guillaume 2026-09-05) : le rabat pivote VERS LA
  // CAMÉRA autour de sa charnière (le bord haut), son bord libre se
  // rapproche donc s'élargit, et il passe DEVANT le corps (z > 0).
  perspective: 620,
  perspectiveOrigin: "50% 20%",
  transformStyle: "preserve-3d",
};

const calque = (clip: string): CSSProperties => ({
  position: "absolute",
  inset: 0,
  clipPath: clip,
  WebkitClipPath: clip,
  willChange: "transform",
});

const imagePochette: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
  filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.55))",
  pointerEvents: "none",
};

/* La main du tutoriel, l'index posé sur le rabat, qui MONTE en boucle :
   l'image pointe vers la droite, on la tourne d'un quart de tour pour que
   l'index pointe vers le haut. */
const MAIN_LARGEUR_PX = 88;
const MAIN_HAUTEUR_PX = 36;
const mainOuverture = (secousse: number): CSSProperties => ({
  position: "absolute",
  left: "50%",
  top: `${HAUTEUR_RABAT_PCT}%`,
  width: MAIN_LARGEUR_PX,
  height: MAIN_HAUTEUR_PX,
  marginLeft: -MAIN_HAUTEUR_PX / 2,
  transformOrigin: `${MAIN_LARGEUR_PX - 8}px 50%`,
  background: "url('/tutoriel/main-pointeuse.webp') no-repeat center / contain",
  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
  animation: `broc-main-ouverture ${secousse > 0 ? "1.1s" : "1.8s"} ease-in-out infinite`,
  pointerEvents: "none",
  zIndex: 4,
});

/** La rangée des 3 timbres, DEVANT l'enveloppe, calée sur son tiers bas. */
/* La rangée n'a NI transform NI z-index : elle ne doit pas créer de
   contexte d'empilement, chaque timbre règle lui-même s'il est sous le
   masque (dedans, en montée) ou dessus (en descente, posé). */
const rangee: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: `${RANGEE_TOP_PCT}%`,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: GAP_RANGEE_PX,
};

type EtapeTimbre = "dedans" | "haut" | "pose";

/** Le timbre en trois étapes : DEDANS (petit, au cœur de la poche, sous le
 *  masque), HAUT (sorti par l'ouverture, encore petit), POSÉ (à sa place,
 *  grand, devant l'enveloppe). Les translations sont en % de sa largeur
 *  (vers le centre de la rangée) et en fraction de la hauteur de la scène. */
const timbreColonne = (etape: EtapeTimbre, rang: number): CSSProperties => {
  const versCentre = `calc(${1 - rang} * (100% + ${GAP_RANGEE_PX}px))`;
  const base: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    width: "min(29vw, 118px)",
    flex: "0 0 auto",
    position: "relative",
  };
  if (etape === "dedans") {
    return {
      ...base,
      zIndex: 2,
      transform: `translate(${versCentre}, ${decalageY(48)}) scale(0.42)`,
      transition: "none",
    };
  }
  if (etape === "haut") {
    return {
      ...base,
      zIndex: 2,
      transform: `translate(${versCentre}, ${decalageY(-8)}) scale(0.42)`,
      transition: `transform ${DUREE_MONTEE_MS}ms ease-in`,
    };
  }
  return {
    ...base,
    zIndex: 6,
    transform: "none",
    transition: `transform ${DUREE_DESCENTE_MS}ms cubic-bezier(.2,.8,.3,1)`,
  };
};

const timbreBox: CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.55))",
};

const badge = (nouveau: boolean, couleur: string): CSSProperties => ({
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.08em",
  color: nouveau ? "var(--brass-300)" : couleur,
  textTransform: "uppercase",
  minHeight: 14,
  lineHeight: "16px",
  textShadow: "0 1px 2px rgba(0,0,0,0.7)",
});

const actions: CSSProperties = {
  display: "flex",
  gap: 10,
  animation: "broc-fade-in 300ms ease both",
};

const boutonRanger: CSSProperties = {
  minHeight: "var(--tap-min)",
  padding: "10px 20px",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-btn)",
  cursor: "pointer",
  background: "var(--paper-200)",
  color: "var(--ink-700)",
};

const KEYFRAMES = `
@keyframes broc-main-ouverture {
  0% { transform: rotate(-90deg) translateX(0); opacity: 0; }
  12% { opacity: 1; }
  78% { opacity: 1; }
  100% { transform: rotate(-90deg) translateX(70px); opacity: 0; }
}
@keyframes broc-voile-out {
  to { opacity: 0; }
}`;

export function OuverturePochetteTimbresOverlay({
  pieces,
  quantitesAvant,
  onClose,
}: OuverturePochetteTimbresOverlayProps) {
  const { d, tr } = useLangue();
  const [reduit] = useState(() => prefersReducedMotion());
  const [phase, setPhase] = useState<Phase>(reduit ? "ouverte" : "fermee");
  // La sortie des timbres : `sortis` ont commencé à monter, `hauts` ont
  // franchi l'ouverture, `poses` sont arrivés à leur place. Le rabat doit
  // être soulevé avant le 1ᵉʳ.
  const [rabatLeve, setRabatLeve] = useState(reduit);
  const [sortis, setSortis] = useState(reduit ? pieces.length : 0);
  const [hauts, setHauts] = useState(reduit ? pieces.length : 0);
  const [poses, setPoses] = useState(reduit ? pieces.length : 0);
  const [secousse, setSecousse] = useState(0);
  const [envol, setEnvol] = useState(false);
  const timbresRef = useRef<(HTMLElement | null)[]>([]);

  const infos = (i: number) => {
    const id = pieces[i];
    const piece = getPiece(id);
    const { total, nouveau } = compteEtNouveaute(pieces, quantitesAvant, i);
    const couleur = piece ? getRarityColors(piece.rarete).outer : "var(--brass-300)";
    const libelle = nouveau ? d.albums.nouveau : tr(d.albums.doublon, { n: total });
    return { id, piece, nouveau, couleur, libelle };
  };

  const ouvrirEnveloppe = () => {
    if (phase !== "fermee") return;
    setPhase("ouverte");
    void audioManager.playPaper();
  };

  // Le rabat se soulève, puis le premier timbre sort.
  useEffect(() => {
    if (phase !== "ouverte" || rabatLeve) return;
    const t = setTimeout(() => {
      setRabatLeve(true);
      setSortis(1);
    }, DUREE_RABAT_MS);
    return () => clearTimeout(t);
  }, [phase, rabatLeve]);

  // Un timbre qui monte franchit l'ouverture au bout de DUREE_MONTEE_MS…
  useEffect(() => {
    if (reduit || sortis <= hauts) return;
    const t = setTimeout(() => setHauts(hauts + 1), DUREE_MONTEE_MS);
    return () => clearTimeout(t);
  }, [reduit, sortis, hauts]);

  // …puis redescend devant l'enveloppe et se pose : son son de rareté (et
  // la cloche s'il est inédit) sonnent À CE MOMENT-LÀ.
  const infosRef = useRef(infos);
  infosRef.current = infos;
  useEffect(() => {
    if (reduit || hauts <= poses) return;
    const t = setTimeout(() => {
      const { piece, nouveau } = infosRef.current(poses);
      if (piece) audioManager.playRevelationCarte(piece.rarete);
      if (nouveau) audioManager.playDecouverte();
      setPoses(poses + 1);
    }, DUREE_DESCENTE_MS);
    return () => clearTimeout(t);
  }, [reduit, hauts, poses]);

  // Le suivant sort une fois le précédent posé.
  useEffect(() => {
    if (reduit || !rabatLeve || sortis !== poses || sortis >= pieces.length) return;
    const t = setTimeout(() => setSortis(sortis + 1), ECART_TIMBRES_MS);
    return () => clearTimeout(t);
  }, [reduit, rabatLeve, sortis, poses, pieces.length]);

  const tousPoses = poses >= pieces.length;

  const ranger = () => {
    if (envol) return;
    setEnvol(true);
    const timbres = timbresRef.current.filter((el): el is HTMLElement => el !== null);
    timbres.forEach((el, i) => {
      const depart = () =>
        flyToTab({
          fromRect: el.getBoundingClientRect(),
          imageUrl: null,
          cloneDe: el,
          sansCadre: true,
          fallbackBg: "transparent",
          borderColor: "transparent",
          targetSelector: CIBLE_ENVOL,
          duration: DUREE_ENVOL_MS,
        });
      if (i === 0) depart();
      else window.setTimeout(depart, i * ECART_ENVOL_MS);
    });
    const dernier = Math.max(0, timbres.length - 1) * ECART_ENVOL_MS + DUREE_ENVOL_MS;
    window.setTimeout(onClose, dernier);
  };

  const glisser = useGlisser(
    (ddx, ddy) => {
      if (ddy > -SEUIL_OUVERTURE_PX || Math.abs(ddx) > Math.abs(ddy)) return false;
      ouvrirEnveloppe();
      return true;
    },
    () => setSecousse((n) => n + 1),
  );

  /* Le rabat : un GROUPE en 3D (recto = l'image, verso = du papier bleu
     uni) qui tourne autour de son bord haut — il suit le doigt qui le
     soulève, puis bascule tout à fait à l'ouverture et montre son verso
     au-dessus de l'enveloppe. Le corps ne bouge pas. */
  const styleGroupeRabat = (): CSSProperties => {
    const base: CSSProperties = {
      position: "absolute",
      inset: 0,
      transformOrigin: "50% 0%",
      transformStyle: "preserve-3d",
      willChange: "transform",
    };
    // Angle POSITIF : le bord libre du rabat vient vers le spectateur.
    if (phase === "ouverte") {
      return { ...base, transform: `rotateX(${ANGLE_OUVERT_DEG}deg)`, transition: `transform ${DUREE_RABAT_MS}ms ease-in-out` };
    }
    const angle = Math.max(0, Math.min(70, -glisser.dy));
    return {
      ...base,
      transform: `rotateX(${angle}deg)`,
      transition: glisser.enCours ? "none" : "transform 200ms ease",
    };
  };
  const faceRabat: CSSProperties = {
    ...calque(CLIP_RABAT),
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
  };
  const versoRabat: CSSProperties = {
    ...faceRabat,
    // Retourné autour du CENTRE DU RABAT, pas de la boîte entière : sinon
    // le verso partait à l'opposé et réapparaissait tout en haut de l'écran
    // (vu au banc 2026-09-05).
    transformOrigin: `50% ${HAUTEUR_RABAT_PCT / 2}%`,
    transform: "rotateX(180deg)",
    background: "linear-gradient(180deg, #2d4a7a 0%, #3a5a8c 100%)",
    borderRadius: "4% 4% 0 0",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={d.albums.ouverture}
      style={{
        ...backdrop,
        ...(envol
          ? { animation: `broc-voile-out ${DUREE_ENVOL_MS}ms ease both`, pointerEvents: "none" }
          : {}),
      }}
    >
      <style>{KEYFRAMES}</style>

      <div style={scene}>
        <div
          data-testid="pochette"
          data-phase={phase}
          role="button"
          tabIndex={phase === "fermee" ? 0 : -1}
          aria-label={d.albums.ouvrirPochette}
          style={pochetteBox}
          {...(phase === "fermee" ? glisser.handlers : {})}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              ouvrirEnveloppe();
            }
          }}
        >
          {/* L'INTÉRIEUR de l'enveloppe, sous le rabat : le dessin n'a rien
              derrière son rabat (c'est le rabat lui-même), et une fois
              soulevé il laissait un trou — la paroi du fond, en bleu plus
              sombre, garde l'enveloppe entière (banc 2026-09-05). */}
          <div style={interieur} aria-hidden />
          <div style={calque(CLIP_CORPS)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={POCHETTE_SRC} alt="" draggable={false} style={imagePochette} />
          </div>
          <div style={styleGroupeRabat()}>
            <div style={faceRabat}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={POCHETTE_SRC} alt="" draggable={false} style={imagePochette} />
            </div>
            <div style={versoRabat} aria-hidden />
          </div>
          {phase === "fermee" && (
            <div key={secousse} data-testid="main-ouverture" aria-hidden style={mainOuverture(secousse)} />
          )}
        </div>

        {rabatLeve && (
          <div data-testid="masque-enveloppe" aria-hidden style={masqueCorps}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={POCHETTE_SRC} alt="" draggable={false} style={{ ...imagePochette, filter: "none" }} />
          </div>
        )}

        {/* Les timbres : chacun n'existe dans le DOM qu'une fois SORTI (son
            nom et son badge ne se lisent pas avant), et sort PAR LE HAUT de
            l'enveloppe avant de passer devant elle. */}
        <div style={rangee}>
          {pieces.map((id, i) => {
            // Une place VIDE tant que le timbre n'est pas sorti : la rangée
            // garde ses 3 colonnes, sinon le flex recentre les timbres déjà
            // posés à chaque arrivée (vu au banc : ils glissaient de côté) et
            // le trajet « vers le centre » partait du mauvais endroit.
            if (i >= sortis) {
              return <div key={`${id}-${i}`} aria-hidden style={{ width: "min(29vw, 118px)", flex: "0 0 auto" }} />;
            }
            const pose = i < poses;
            const etape: EtapeTimbre = pose ? "pose" : i < hauts ? "haut" : "dedans";
            const { piece, nouveau, couleur, libelle } = infos(i);
            return (
              <div
                key={`${id}-${i}`}
                data-testid="timbre-paquet"
                data-pose={pose ? "1" : "0"}
                data-etape={etape}
                style={{ ...timbreColonne(etape, i), ...(envol ? { visibility: "hidden" } : {}) }}
              >
                <div
                  ref={(el) => {
                    timbresRef.current[i] = el;
                  }}
                  style={timbreBox}
                >
                  {piece && <PieceVisuel id={id} />}
                </div>
                <span style={badge(nouveau, couleur)}>{pose ? libelle : " "}</span>
              </div>
            );
          })}
        </div>
      </div>

      {tousPoses && !envol && (
        <div style={actions}>
          <button type="button" style={boutonRanger} onClick={ranger}>
            {d.albums.ranger}
          </button>
        </div>
      )}
    </div>
  );
}
