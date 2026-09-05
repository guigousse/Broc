"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronsRight } from "lucide-react";
import { CarteDuel } from "@/components/pieces/CarteDuel";
import { RATIO_CARTE } from "@/data/duel/gabaritCarte";
import { getPiece } from "@/data/pieces";
import { SON_DECHIRURE_PAQUET, audioManager } from "@/lib/audio/audioManager";
import { flyToTab } from "@/lib/flyAnimation";
import { useLangue } from "@/lib/i18n/LangueContext";
import { prefersReducedMotion } from "@/lib/transitionIris";
import { getRarityColors } from "@/lib/rarityColors";
import { compteEtNouveaute } from "./compteEtNouveaute";
import { useGlisser } from "./useGlisser";

/* ── L'OUVERTURE D'UN PAQUET BROCOMON ─────────────────────────────────────
   Posée AU-DESSUS de la fiche d'article du Bazar (zIndex 107 > 105). Les 3
   cartes sont DÉJÀ rangées en save par `acheterAuBazar` : cet écran ne fait
   qu'annoncer ce qui a eu lieu — mais il le fait en quatre temps, parce
   qu'ouvrir un booster est tout le plaisir de l'achat :

   1. « scelle » : le paquet fermé, en grand, avec l'invite à GLISSER.
      Un glisser horizontal d'au moins SEUIL_DECHIRURE_PX déchire le haut ;
      un simple tap ne fait que secouer l'invite (le geste s'apprend en le
      ratant, pas en lisant). Entrée/Espace déchirent au clavier.
   2. « dechire » : bruit de sac plastique, la bande du haut s'envole, le
      bas du paquet glisse vers le bas et découvre la PILE des cartes, de
      dos, derrière. Un minuteur (pas `transitionend`, muet en jsdom et
      capricieux quand deux calques transitionnent) passe à la suite.
   3. « revelation » : UNE carte à la fois, en grand, façon TCG Pocket. La
      première attend un tap pour se retourner ; un glisser vers la DROITE
      l'envoie hors champ et la suivante monte de la pile puis se retourne
      toute seule. Chaque retournement joue le son de sa rareté (de plus en
      plus épique) et, pour une carte jamais vue, la cloche de découverte.
   4. « resume » : les 3 cartes face visible en rangée, avec leur badge
      « Nouveau ! » / « ×N », puis Ranger : le voile s'efface et les cartes
      s'envolent UNE À UNE vers l'onglet Collection (là où vit le classeur),
      la cérémonie se ferme après le dernier vol. C'est le joueur qui
      révèle : aucune auto-avance au minuteur, sauf le retournement de la
      carte qui vient d'arriver.

   `prefersReducedMotion` saute tout : le résumé arrive d'emblée, sans son,
   comme la cérémonie des timbres arrive retournée. ─────────────────────── */

interface OuverturePaquetCartesOverlayProps {
  /** Les 3 ids tirés (déjà appliqués à la save par l'appelant). */
  pieces: string[];
  /** Quantités possédées AVANT ce paquet (snapshot pris avant l'achat). */
  quantitesAvant: Record<string, number>;
  onClose: () => void;
}

type Phase = "scelle" | "dechire" | "revelation" | "resume";

/** Glisser minimal, en px, pour que le geste compte comme une déchirure. */
export const SEUIL_DECHIRURE_PX = 40;
/** Glisser minimal VERS LA DROITE, en px, pour passer à la carte suivante. */
export const SEUIL_SUIVANTE_PX = 60;
/** Durée totale de la phase « dechire » (bande qui s'envole + bas qui glisse). */
export const DUREE_DECHIRURE_MS = 900;
/** La carte qui sort vers la droite, puis le délai avant que la suivante se retourne. */
export const DUREE_SORTIE_MS = 320;
export const DELAI_RETOURNEMENT_MS = 380;
/** Les cartes du résumé s'envolent une à une : écart entre deux départs, et durée d'un vol. */
export const ECART_ENVOL_MS = 220;
export const DUREE_ENVOL_MS = 620;
const ROTATION_MS = 460;
const CIBLE_ENVOL = '[data-fly-target="/collection"]';

/** Hauteur de la bande arrachée, en % du paquet : juste sous le sceau crénelé. */
const HAUTEUR_BANDE_PCT = 7;
/** Le ratio du visuel `public/cartes/paquet.webp` (1331 × 2154). */
const RATIO_PAQUET = "1331 / 2154";
const PAQUET_SRC = "/cartes/paquet.webp";
const DOS_SRC = "/cartes/dos.webp";
const GAP_RANGEE_PX = 12;

/* La déchirure n'est pas droite : un zigzag de quelques dixièmes de
   pour cent, le même sur les deux calques (l'un le suit par le haut,
   l'autre par le bas) pour que les deux bords s'emboîtent. */
function bordDechire(): string[] {
  const pts: string[] = [];
  for (let x = 0; x <= 100; x += 4) {
    const y = HAUTEUR_BANDE_PCT + ((x / 4) % 2 === 0 ? -0.5 : 0.5);
    pts.push(`${x}% ${y}%`);
  }
  return pts;
}
const BORD = bordDechire();
const CLIP_HAUT = `polygon(0% 0%, 100% 0%, ${[...BORD].reverse().join(", ")})`;
const CLIP_BAS = `polygon(${BORD.join(", ")}, 100% 100%, 0% 100%)`;

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

/** La scène = la boîte de la GRANDE carte ; le paquet est centré dedans. */
const scene: CSSProperties = {
  position: "relative",
  width: "min(74vw, 330px)",
  aspectRatio: RATIO_CARTE,
};

const paquetBox: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: "76%",
  aspectRatio: RATIO_PAQUET,
  transform: "translate(-50%, -50%)",
  zIndex: 3,
  cursor: "grab",
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
  outline: "none",
};

const calque = (clip: string): CSSProperties => ({
  position: "absolute",
  inset: 0,
  clipPath: clip,
  WebkitClipPath: clip,
  willChange: "transform",
});

const imagePaquet: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
  filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.55))",
  pointerEvents: "none",
};

/* L'invite : la main pointeuse du tutoriel, l'index posé sur la ligne de
   déchirure, qui la parcourt de gauche à droite en boucle (retour Guillaume
   2026-09-05 — la pastille de texte est partie, le libellé reste au lecteur
   d'écran). L'image pointe vers la droite : son bout d'index est à droite,
   on le cale sur la ligne en décalant la main d'une largeur vers la gauche. */
const MAIN_LARGEUR_PX = 88;
const MAIN_HAUTEUR_PX = 36;
const mainDechirure = (secousse: number): CSSProperties => ({
  position: "absolute",
  left: 0,
  top: `${HAUTEUR_BANDE_PCT}%`,
  width: MAIN_LARGEUR_PX,
  height: MAIN_HAUTEUR_PX,
  marginTop: -4,
  marginLeft: -MAIN_LARGEUR_PX + 10,
  background: "url('/tutoriel/main-pointeuse.webp') no-repeat center / contain",
  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
  animation: `broc-main-dechirure ${secousse > 0 ? "1.1s" : "1.8s"} ease-in-out infinite`,
  pointerEvents: "none",
  zIndex: 4,
});

const faceCommune: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "4.5%",
  overflow: "hidden",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
};

const dos: CSSProperties = {
  ...faceCommune,
  backgroundImage: `url(${DOS_SRC})`,
  backgroundSize: "100% 100%",
};

const face: CSSProperties = {
  ...faceCommune,
  transform: "rotateY(180deg)",
};

const carteBox3D: CSSProperties = {
  position: "absolute",
  inset: 0,
  transformStyle: "preserve-3d",
  transition: `transform ${ROTATION_MS}ms ease`,
};

/** La grande carte : la boîte de la scène entière, avec une perspective. */
const grandeCarteBase: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  perspective: 1100,
  cursor: "pointer",
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
  outline: "none",
  willChange: "transform",
};

/** Les cartes restantes, de dos, décalées derrière la grande — et réduites
 *  comme elle tant qu'elles sont « dans » le paquet (recette 2026-09-05 :
 *  à pleine taille elles dépassaient du paquet pendant la déchirure). */
const ECHELLE_DANS_PAQUET = 0.72;
const carteDePile = (rang: number, dansPaquet: boolean): CSSProperties => ({
  ...dos,
  zIndex: 1,
  transform: dansPaquet
    ? `scale(${ECHELLE_DANS_PAQUET})`
    : `translate(${rang * 7}px, ${rang * -7}px) rotate(${rang * 2.5}deg)`,
  transition: "transform 450ms cubic-bezier(.2,.8,.3,1)",
  boxShadow: "0 6px 14px rgba(0,0,0,0.45)",
});

const sousCarte: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 12px)",
  left: 0,
  right: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  pointerEvents: "none",
};

const badge = (nouveau: boolean, couleur: string, grand: boolean): CSSProperties => ({
  fontFamily: "var(--font-display)",
  fontSize: grand ? 15 : 11,
  letterSpacing: grand ? "0.14em" : "0.08em",
  color: nouveau ? "var(--brass-300)" : couleur,
  textTransform: "uppercase",
  minHeight: 14,
  lineHeight: "16px",
  textShadow: "0 1px 2px rgba(0,0,0,0.7)",
});

const indiceSuivante: CSSProperties = {
  color: "var(--brass-300)",
  opacity: 0.85,
  animation: "broc-paquet-suivante 1.1s ease-in-out infinite",
};

const rangee: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: GAP_RANGEE_PX,
};

const carteResume = (i: number): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  width: "min(29vw, 118px)",
  flex: "0 0 auto",
  animation: `broc-resume-carte-in 420ms cubic-bezier(.2,.8,.3,1) ${i * 110}ms both`,
});

const carteResumeBox: CSSProperties = {
  width: "100%",
  aspectRatio: RATIO_CARTE,
  borderRadius: "4.5%",
  overflow: "hidden",
  boxShadow: "0 6px 14px rgba(0,0,0,0.5)",
};

const actions: CSSProperties = {
  display: "flex",
  gap: 10,
  animation: "broc-fade-in 300ms ease 450ms both",
};

const boutonBase: CSSProperties = {
  minHeight: "var(--tap-min)",
  padding: "10px 20px",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-btn)",
  cursor: "pointer",
};

const boutonRanger: CSSProperties = {
  ...boutonBase,
  background: "var(--paper-200)",
  color: "var(--ink-700)",
};

const KEYFRAMES = `
@keyframes broc-main-dechirure {
  0% { transform: translateX(0); opacity: 0; }
  12% { opacity: 1; }
  78% { opacity: 1; }
  100% { transform: translateX(${MAIN_LARGEUR_PX + 150}px); opacity: 0; }
}
@keyframes broc-voile-out {
  to { opacity: 0; }
}
@keyframes broc-paquet-suivante {
  0%, 100% { transform: translateX(-4px); opacity: 0.55; }
  50% { transform: translateX(6px); opacity: 1; }
}
@keyframes broc-resume-carte-in {
  from { opacity: 0; transform: translateY(24px) scale(0.85); }
  to { opacity: 1; transform: none; }
}`;

export function OuverturePaquetCartesOverlay({
  pieces,
  quantitesAvant,
  onClose,
}: OuverturePaquetCartesOverlayProps) {
  const { d, tr } = useLangue();
  const [reduit] = useState(() => prefersReducedMotion());
  const [phase, setPhase] = useState<Phase>(reduit ? "resume" : "scelle");
  // La révélation : quelle carte est en grand, si elle est retournée, si
  // elle est en train de sortir vers la droite, si elle vient d'arriver
  // (→ retournement automatique).
  const [index, setIndex] = useState(0);
  const [retournee, setRetournee] = useState(false);
  const [sortie, setSortie] = useState(false);
  const [arrivee, setArrivee] = useState(false);
  const [secousse, setSecousse] = useState(0);
  // Le résumé s'en va : les cartes s'envolent une à une, le voile s'efface,
  // et la cérémonie se ferme après le dernier vol.
  const [envol, setEnvol] = useState(false);
  const cartesResumeRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    void audioManager.preload([SON_DECHIRURE_PAQUET]);
  }, []);

  const infosCarte = (i: number) => {
    const id = pieces[i];
    const piece = getPiece(id);
    const { total, nouveau } = compteEtNouveaute(pieces, quantitesAvant, i);
    const couleur = piece ? getRarityColors(piece.rarete).outer : "var(--brass-300)";
    const libelle = nouveau ? d.albums.nouveau : tr(d.albums.doublon, { n: total });
    return { id, piece, nouveau, couleur, libelle };
  };

  const dechirer = () => {
    if (phase !== "scelle") return;
    setPhase("dechire");
    void audioManager.playDechirurePaquet();
  };

  // Déchirure → la première carte se présente, de dos.
  useEffect(() => {
    if (phase !== "dechire") return;
    const t = setTimeout(() => setPhase("revelation"), DUREE_DECHIRURE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const retourner = () => {
    if (phase !== "revelation" || retournee || sortie) return;
    setRetournee(true);
    setArrivee(false);
    const { piece, nouveau } = infosCarte(index);
    if (piece) audioManager.playRevelationCarte(piece.rarete);
    if (nouveau) audioManager.playDecouverte();
  };

  // La carte sort vers la droite, puis la suivante arrive (ou le résumé).
  useEffect(() => {
    if (!sortie) return;
    const t = setTimeout(() => {
      setSortie(false);
      if (index + 1 >= pieces.length) {
        setPhase("resume");
        return;
      }
      setIndex(index + 1);
      setRetournee(false);
      setArrivee(true);
    }, DUREE_SORTIE_MS);
    return () => clearTimeout(t);
  }, [sortie, index, pieces.length]);

  // La carte qui vient d'arriver se retourne toute seule.
  const retournerRef = useRef(retourner);
  retournerRef.current = retourner;
  useEffect(() => {
    if (!arrivee) return;
    const t = setTimeout(() => retournerRef.current(), DELAI_RETOURNEMENT_MS);
    return () => clearTimeout(t);
  }, [arrivee, index]);

  const ranger = () => {
    if (envol) return;
    setEnvol(true);
    const cartes = cartesResumeRef.current.filter((el): el is HTMLElement => el !== null);
    cartes.forEach((el, i) => {
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
    const dernier = Math.max(0, cartes.length - 1) * ECART_ENVOL_MS + DUREE_ENVOL_MS;
    window.setTimeout(onClose, dernier);
  };

  const glisserPaquet = useGlisser(
    (delta) => {
      if (Math.abs(delta) < SEUIL_DECHIRURE_PX) return false;
      dechirer();
      return true;
    },
    () => setSecousse((n) => n + 1),
  );

  const glisserCarte = useGlisser((delta) => {
    if (!retournee || sortie || delta < SEUIL_SUIVANTE_PX) return false;
    setSortie(true);
    return true;
  });

  const styleCalqueHaut = (): CSSProperties => {
    if (phase === "dechire") {
      return {
        ...calque(CLIP_HAUT),
        transform: "translate(140%, -60%) rotate(-28deg)",
        opacity: 0,
        transition: "transform 450ms ease-in, opacity 450ms ease-in",
      };
    }
    // Pendant le glisser, la bande suit le doigt sans transition ; relâchée
    // trop tôt, elle revient en place en glissant.
    const dx = Math.max(-60, Math.min(60, glisserPaquet.dx));
    return {
      ...calque(CLIP_HAUT),
      transform: `translateX(${dx}px)`,
      transition: glisserPaquet.enCours ? "none" : "transform 200ms ease",
    };
  };

  const styleCalqueBas = (): CSSProperties => ({
    ...calque(CLIP_BAS),
    ...(phase === "dechire"
      ? {
          transform: "translateY(120%)",
          opacity: 0,
          transition: "transform 600ms ease-in 220ms, opacity 400ms ease-in 420ms",
        }
      : {}),
  });

  /* La grande carte : dans le paquet (réduite, derrière) pendant la
     déchirure ; pleine taille ensuite ; suit le doigt vers la droite, et
     s'envole quand le glisser est validé. */
  const styleGrandeCarte = (): CSSProperties => {
    if (phase === "dechire") {
      return { ...grandeCarteBase, zIndex: 1, transform: `scale(${ECHELLE_DANS_PAQUET})`, transition: "none" };
    }
    if (sortie) {
      return {
        ...grandeCarteBase,
        transform: "translateX(130%) rotate(14deg)",
        opacity: 0,
        transition: `transform ${DUREE_SORTIE_MS}ms ease-in, opacity ${DUREE_SORTIE_MS}ms ease-in`,
      };
    }
    const dx = retournee ? Math.max(0, glisserCarte.dx) : 0;
    return {
      ...grandeCarteBase,
      transform: `translateX(${dx}px) rotate(${dx / 18}deg)`,
      transition: glisserCarte.enCours ? "none" : "transform 450ms cubic-bezier(.2,.8,.3,1)",
    };
  };

  const courante = phase === "revelation" || phase === "dechire" ? infosCarte(index) : null;
  const restantes = pieces.length - index - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={d.albums.ouverture}
      style={{
        ...backdrop,
        // Pendant l'envol, le voile s'efface pour montrer où vont les cartes
        // (l'onglet Collection), et ne retient plus aucun tap.
        ...(envol
          ? { animation: `broc-voile-out ${DUREE_ENVOL_MS}ms ease both`, pointerEvents: "none" }
          : {}),
      }}
    >
      <style>{KEYFRAMES}</style>

      {phase !== "resume" && (
        <div style={scene}>
          {/* La pile des cartes restantes, de dos, derrière la grande. */}
          {courante &&
            Array.from({ length: restantes }, (_, k) => (
              <div key={k} aria-hidden style={carteDePile(restantes - k, phase === "dechire")} />
            ))}

          {courante && (
            <div
              data-testid="grande-carte"
              data-index={index}
              data-retournee={retournee ? "1" : "0"}
              role="button"
              tabIndex={phase === "revelation" ? 0 : -1}
              aria-hidden={phase !== "revelation"}
              onClick={retourner}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!retournee) retourner();
                  else if (!sortie) setSortie(true);
                }
              }}
              {...glisserCarte.handlers}
              style={styleGrandeCarte()}
            >
              <div style={{ ...carteBox3D, transform: retournee ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                <div style={dos} />
                {/* La face n'existe dans le DOM qu'UNE FOIS la carte
                    retournée : `backfaceVisibility` ne cache que
                    visuellement, pas au lecteur d'écran. */}
                {retournee && courante.piece && (
                  <div style={face}>
                    <CarteDuel id={courante.id} />
                  </div>
                )}
              </div>
              <div style={sousCarte}>
                <span style={badge(courante.nouveau, courante.couleur, true)}>
                  {retournee ? courante.libelle : " "}
                </span>
                {retournee && !sortie && (
                  <ChevronsRight size={22} aria-hidden style={indiceSuivante} />
                )}
              </div>
            </div>
          )}

          {(phase === "scelle" || phase === "dechire") && (
            <div
              data-testid="paquet-scelle"
              data-phase={phase}
              role="button"
              tabIndex={0}
              aria-label={d.albums.dechirer}
              style={paquetBox}
              {...glisserPaquet.handlers}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  dechirer();
                }
              }}
            >
              <div style={styleCalqueBas()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={PAQUET_SRC} alt="" draggable={false} style={imagePaquet} />
              </div>
              <div style={styleCalqueHaut()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={PAQUET_SRC} alt="" draggable={false} style={imagePaquet} />
              </div>
              {phase === "scelle" && (
                <div
                  key={secousse}
                  data-testid="main-dechirure"
                  aria-hidden
                  style={mainDechirure(secousse)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {phase === "resume" && (
        <>
          <div style={rangee}>
            {pieces.map((id, i) => {
              const { piece, nouveau, couleur, libelle } = infosCarte(i);
              return (
                <div
                  key={`${id}-${i}`}
                  data-testid="carte-paquet"
                  data-retournee="1"
                  style={{ ...carteResume(i), ...(envol ? { visibility: "hidden" } : {}) }}
                >
                  <div
                    ref={(el) => {
                      cartesResumeRef.current[i] = el;
                    }}
                    style={carteResumeBox}
                  >
                    {piece && <CarteDuel id={id} thumb />}
                  </div>
                  <span style={badge(nouveau, couleur, false)}>{libelle}</span>
                </div>
              );
            })}
          </div>
          {!envol && (
            <div style={actions}>
              <button type="button" style={boutonRanger} onClick={ranger}>
                {d.albums.ranger}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
