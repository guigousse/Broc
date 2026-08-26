"use client";

import { MonitorPlay, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useGame, useGameActions } from "@/context/GameContext";
import {
  ENERGIE_MAX,
  energieCourante,
  pubsEnergieRestantes,
  secondesAvantProchaine,
} from "@/lib/energie";
import { getAdProvider, EMPLACEMENTS_PUB, pubDisponible } from "@/lib/ads/adProvider";
import { useToastSafe } from "@/components/ui/Toast";
import { CartelPub } from "@/components/ui/CartelPub";
import { audioManager } from "@/lib/audio/audioManager";
import { useLangue } from "@/lib/i18n/LangueContext";
import { useEnergieInfinie, definirEnergieInfinie } from "@/lib/iap/energieInfinie";
import { getIapProvider, achatDisponible } from "@/lib/iap/iapProvider";
import { logEvenement } from "@/lib/analytics/contexte";
import { EVENEMENTS } from "@/lib/analytics/analytics";

/** Course de l'aiguille du galvanomètre : -60° (0 ⚡) → +60° (max), clampée. */
export function angleAiguille(energie: number, max: number): number {
  const ratio = max > 0 ? Math.min(Math.max(energie / max, 0), 1) : 0;
  return -60 + ratio * 120;
}

function formatMMSS(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const MACHINE_IMG = "/qg/machine-energie.webp";
export const MACHINE_IMG_INFINIE = "/qg/machine-energie-infinie.webp";
/** Timings de la célébration d'achat — le flash n°1 pique à swapMs. */
export const CELEBRATION = { swapMs: 90, dureeMs: 1500 } as const;

/** Zones posées sur l'illustration, en % de la carte (calibrées sur le rendu). */
const ZONE_CADRAN = { cx: 50.1, cy: 24.2, r: 12 };
/** Pastille compteur n/5 + minuteur, sous le cadran. */
const ZONE_COMPTEUR_TOP = 40;
/** Cartel-bouton pub, centré sur les portes du bas de la machine. */
const ZONE_PLAQUE = { left: 27, top: 66, width: 46, height: 11 };
/** Le levier peint (colonne droite) : zone de tap redondante vers la même action. */
const ZONE_LEVIER = { left: 70, top: 34, width: 20, height: 32 };
/** Bouton d'achat « Énergie infinie », juste sous le cartel pub (sur les portes). */
const ZONE_ACHAT = { left: 20, top: 79.5, width: 60, height: 11 };

/** Durée de la salve de tremblement APRÈS la pub, avant le crédit + étincelles + son. */
const SALVE_FINALE_MS = 600;

/** Décalages des étincelles (précalculés : pas de Math.random au rendu). */
const ETINCELLES: ReadonlyArray<{ dx: number; dy: number; delai: number }> = [
  { dx: -46, dy: -38, delai: 0 },
  { dx: 42, dy: -52, delai: 60 },
  { dx: -28, dy: -64, delai: 120 },
  { dx: 56, dy: -20, delai: 40 },
  { dx: -60, dy: -10, delai: 100 },
  { dx: 30, dy: -70, delai: 160 },
];

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

/** Bandeau d'alerte AU-DESSUS de la fenêtre machine (mode « sortie refusée »). */
const alerteBandeauStyle: CSSProperties = {
  width: "100%",
  maxWidth: 340,
  marginBottom: 12,
  padding: "9px 12px",
  borderRadius: 6,
  background: "var(--vermillion-600)",
  border: "1px solid rgba(0,0,0,0.35)",
  boxShadow: "0 3px 10px rgba(0,0,0,0.45)",
  color: "var(--paper-100)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "clamp(12px, 3.4vw, 14px)",
  letterSpacing: "0.04em",
  textAlign: "center",
  animation: "broc-shake 240ms linear 2",
};

const carteStyle = (tremble: boolean): CSSProperties => ({
  position: "relative",
  width: "100%",
  maxWidth: 340,
  aspectRatio: "3 / 4",
  borderRadius: 14,
  overflow: "hidden",
  border: "3px solid var(--brass-500)",
  boxShadow: "0 18px 48px rgba(0,0,0,0.55)",
  animation: tremble ? "broc-shake 240ms linear infinite" : undefined,
});

const cadranStyle: CSSProperties = {
  position: "absolute",
  left: `${ZONE_CADRAN.cx - ZONE_CADRAN.r}%`,
  // Dans `top`, un % s'évalue contre la hauteur ; carte 3:4 → x % de largeur
  // = x × 3/4 % de hauteur.
  top: `calc(${ZONE_CADRAN.cy}% - ${ZONE_CADRAN.r}% * 3 / 4)`,
  width: `${ZONE_CADRAN.r * 2}%`,
  aspectRatio: "1 / 1",
  pointerEvents: "none",
};

const compteurStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: `${ZONE_COMPTEUR_TOP}%`,
  transform: "translateX(-50%)",
  padding: "6px 14px",
  borderRadius: 12,
  background: "var(--forest-800)",
  border: "1px solid var(--brass-700)",
  textAlign: "center",
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  textShadow: "0 1px 4px rgba(0,0,0,0.8)",
  pointerEvents: "none",
  whiteSpace: "nowrap",
};

/** Bouton premium : verre sombre électrique, liseré et libellé néon bleuté. */
const boutonAchatStyle = (enCours: boolean): CSSProperties => ({
  position: "absolute",
  left: `${ZONE_ACHAT.left}%`,
  top: `${ZONE_ACHAT.top}%`,
  width: `${ZONE_ACHAT.width}%`,
  height: `${ZONE_ACHAT.height}%`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 10px",
  borderRadius: 10,
  background: "linear-gradient(180deg, rgba(10,30,48,0.92), rgba(4,12,20,0.95))",
  border: "1.5px solid rgba(89,215,255,0.85)",
  boxShadow: enCours
    ? "0 0 6px rgba(89,215,255,0.3), inset 0 0 8px rgba(89,215,255,0.15)"
    : "0 0 10px rgba(89,215,255,0.55), 0 0 26px rgba(56,160,255,0.35), inset 0 0 10px rgba(89,215,255,0.22)",
  color: "#aef4ff",
  textShadow: "0 0 5px rgba(140,235,255,0.95), 0 0 14px rgba(70,190,255,0.65)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "clamp(12px, 3.4vw, 14px)",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
  cursor: enCours ? "default" : "pointer",
  opacity: enCours ? 0.55 : 1,
});

/** Zone de tap invisible sur le levier peint (redondante : cachée de l'a11y). */
const levierTapStyle = (indisponible: boolean): CSSProperties => ({
  position: "absolute",
  left: `${ZONE_LEVIER.left}%`,
  top: `${ZONE_LEVIER.top}%`,
  width: `${ZONE_LEVIER.width}%`,
  height: `${ZONE_LEVIER.height}%`,
  cursor: indisponible ? "default" : "pointer",
});

export function EnergieRecharge({
  onClose,
  alerte,
}: {
  onClose: () => void;
  /** Message d'alerte contextuel (ex : « Pas assez d'énergie pour cette sortie ! »)
   *  affiché en bandeau sur la machine — utilisé quand la modale pope suite à
   *  une action bloquée par le manque d'énergie. */
  alerte?: string;
}) {
  const { state } = useGame();
  const { tempsConfiance, crediterEnergiePub } = useGameActions();
  const [enCours, setEnCours] = useState(false);
  const [salve, setSalve] = useState(false);
  const [etincelles, setEtincelles] = useState(false);
  const [, force] = useState(0);
  /** Récompense obtenue mais pas encore créditée (la salve la retient ~600 ms). */
  const creditEnAttente = useRef(false);
  const { d, tr } = useLangue();
  const { toast } = useToastSafe();
  const infinie = useEnergieInfinie();
  const [prix, setPrix] = useState<string | null>(null);
  const [achatEnCours, setAchatEnCours] = useState(false);
  /** Célébration d'achat : flash + machine encore en habillage normal pendant swapMs. */
  const [celebration, setCelebration] = useState(false);
  const [imageInfinie, setImageInfinie] = useState(false);
  const timerSwap = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const timerFin = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Nettoyage des timers de célébration au démontage.
  useEffect(
    () => () => {
      if (timerSwap.current) clearTimeout(timerSwap.current);
      if (timerFin.current) clearTimeout(timerFin.current);
    },
    [],
  );

  // Vu du paywall IAP, une fois par ouverture. `alerte` distingue le joueur
  // bloqué à la sortie (porte/vitrine faute d'énergie) de celui qui vient
  // volontairement depuis le cadran d'énergie de l'en-tête — c'est la seule
  // origine que cet écran connaît déjà, pas besoin de faire remonter un prop
  // dédié depuis chaque appelant.
  useEffect(() => {
    // Propriétaire de l'énergie infinie : cet écran n'affiche plus aucun
    // paywall (pas de bouton d'achat), donc rien à comptabiliser comme « vu ».
    if (infinie) return;
    logEvenement(EVENEMENTS.iapEcranVu, {
      source: alerte ? "sortie-bloquee" : "en-tete",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infinie]);

  // Prix localisé au montage — non-acheteur seulement (StoreKit / stub).
  useEffect(() => {
    if (infinie || !achatDisponible()) return;
    let annule = false;
    getIapProvider()
      .obtenirPrix()
      .then((p) => {
        if (!annule) setPrix(p);
      })
      .catch(() => {}); // hors-ligne : le bouton reste sans prix, l'achat re-tentera
    return () => {
      annule = true;
    };
  }, [infinie]);

  // Tick local 1 s pour le minuteur (sans réécrire le state global).
  // Inutile en mode énergie infinie : le minuteur cède la place au libellé ∞.
  useEffect(() => {
    if (infinie) return;
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [infinie]);

  // Coupe la gerbe d'étincelles après l'animation.
  useEffect(() => {
    if (!etincelles) return;
    const id = window.setTimeout(() => setEtincelles(false), 900);
    return () => window.clearTimeout(id);
  }, [etincelles]);

  // Fin de la salve post-pub : crédit +1 ⚡ (bond d'aiguille) + étincelles + son.
  useEffect(() => {
    if (!salve) return;
    const id = window.setTimeout(() => {
      setSalve(false);
      if (creditEnAttente.current) {
        creditEnAttente.current = false;
        crediterEnergiePub();
        setEtincelles(true);
        void audioManager.playRecharge();
      }
    }, SALVE_FINALE_MS);
    return () => window.clearTimeout(id);
  }, [salve, crediterEnergiePub]);

  // Filet : modale fermée pendant la salve → la récompense est créditée quand même.
  useEffect(
    () => () => {
      if (creditEnAttente.current) {
        creditEnAttente.current = false;
        crediterEnergiePub();
      }
    },
    [crediterEnergiePub],
  );

  if (!state) return null;
  const now = tempsConfiance() ?? Date.now();
  const energieMax = ENERGIE_MAX;
  const energie = energieCourante(state, now, energieMax);
  const restantSec = secondesAvantProchaine(state, now, energieMax);
  const pubsRestantes = pubsEnergieRestantes(state.pubsEnergie, now);
  // Quota épuisé OU énergie déjà pleine : on bloque AVANT de lancer la pub
  // (jamais de pub gâchée). Bloqué aussi pendant la salve finale : un 2e
  // visionnage lancé à ce moment écraserait le crédit en attente du premier.
  const energiePleine = energie >= energieMax;
  const pubIndisponible = enCours || salve || energiePleine || pubsRestantes <= 0;
  // Android tant que le plugin AdMob Kotlin n'existe pas : aucune pub n'est
  // proposée du tout — ni cartel, ni levier. La recharge par le temps suffit
  // à faire tourner la modale.
  const pubProposee = pubDisponible();

  const regarderPub = async () => {
    if (pubIndisponible) return;
    setEnCours(true);
    try {
      const { rewarded } = await getAdProvider().showRewardedAd(EMPLACEMENTS_PUB.energie);
      if (rewarded) {
        // Le tremblement continue en salve finale ; le crédit, les étincelles
        // et le son partent ensemble à la fin de la salve.
        creditEnAttente.current = true;
        setSalve(true);
      }
    } catch {
      toast(d.sheets.erreurPub, { type: "erreur" });
    } finally {
      setEnCours(false);
    }
  };

  const acheterEnergieInfinie = async () => {
    if (achatEnCours) return;
    setAchatEnCours(true);
    // Précharge l'image ∞ dès le lancement de l'achat : le sheet Apple laisse
    // plusieurs secondes, largement de quoi décoder le webp avant le swap.
    new Image().src = MACHINE_IMG_INFINIE;
    try {
      const statut = await getIapProvider().acheter();
      if (statut === "achete") {
        // Unique écrivain du drapeau ; GameContext cale la jauge via l'événement.
        definirEnergieInfinie(true);
        setCelebration(true);
        setEtincelles(true);
        // Synchro son/flash : tout part dans le même tick.
        void audioManager.playEclair();
        void audioManager.playRecharge();
        timerSwap.current = setTimeout(() => setImageInfinie(true), CELEBRATION.swapMs);
        timerFin.current = setTimeout(() => setCelebration(false), CELEBRATION.dureeMs);
        toast(d.chrome.achatReussi, { type: "succes" });
      } else if (statut === "pending") {
        toast(d.chrome.achatEnAttente);
      }
      // "annule" : silence (fermeture volontaire du sheet Apple).
    } catch {
      toast(d.chrome.erreurAchat, { type: "erreur" });
    } finally {
      setAchatEnCours(false);
    }
  };

  const angle = angleAiguille(infinie ? energieMax : energie, energieMax);
  const graduations = Array.from({ length: energieMax + 1 }, (_, i) =>
    angleAiguille(i, energieMax),
  );
  // L'alerte ne vit que tant que l'énergie est à zéro : dès la première
  // recharge, le bandeau disparaît et le cartel cesse de pulser.
  const alerteActive = !!alerte && energie < 1;
  // Acheteur qui rouvre (infinie vrai, célébration fausse) → image ∞ directe.
  // Achat en cours (infinie vrai, célébration vraie) → image d'origine jusqu'au swap.
  const machineSrc = infinie && (imageInfinie || !celebration) ? MACHINE_IMG_INFINIE : MACHINE_IMG;

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      {/* Bandeau d'alerte AU-DESSUS de la fenêtre machine. */}
      {alerteActive && (
        <div role="alert" style={alerteBandeauStyle} onClick={(e) => e.stopPropagation()}>
          {alerte}
        </div>
      )}
      <div style={carteStyle(enCours || salve)} onClick={(e) => e.stopPropagation()}>
        {/* La machine du savant fou — l'illustration EST la carte. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={machineSrc}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Voile de flash de la célébration d'achat : trois éclairs, synchro son. */}
        {celebration && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 5,
              background:
                "radial-gradient(circle at 50% 30%, rgba(210,240,255,1), rgba(120,190,255,0.9))",
              opacity: 0,
              animation: `broc-flash-eclair ${CELEBRATION.dureeMs}ms linear both`,
            }}
          />
        )}

        <button
          onClick={onClose}
          aria-label={d.commun.fermer}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 2,
            background: "rgba(15,30,22,0.55)",
            border: "1px solid var(--brass-700)",
            borderRadius: 999,
            width: "var(--tap-min)",
            height: "var(--tap-min)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--brass-300)",
            cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>

        {/* Galvanomètre posé sur le cadran vide de l'illustration.
            Absent en mode énergie infinie : le cadran ∞ est peint dans l'image. */}
        {!infinie && (
          <div style={cadranStyle}>
            <svg viewBox="-50 -50 100 100" style={{ width: "100%", height: "100%" }}>
              {/* Graduations 0→max le long de l'arc de course. */}
              {graduations.map((a, i) => (
                <g key={i} transform={`rotate(${a})`}>
                  <line
                    x1={0}
                    y1={-40}
                    x2={0}
                    y2={i === 0 || i === graduations.length - 1 ? -31 : -34}
                    stroke="var(--forest-800)"
                    strokeWidth={i === graduations.length - 1 ? 3 : 2}
                    strokeLinecap="round"
                  />
                </g>
              ))}
              {/* Aiguille — transition ressort quand l'énergie monte. */}
              <g
                data-testid="aiguille-energie"
                transform={`rotate(${angle})`}
                style={{ transition: "transform 600ms cubic-bezier(0.2, 1.6, 0.4, 1)" }}
              >
                <line
                  x1={0}
                  y1={8}
                  x2={0}
                  y2={-36}
                  stroke="var(--vermillion-600)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              </g>
              <circle r={5} fill="var(--brass-500)" stroke="var(--forest-800)" strokeWidth={1.5} />
            </svg>
          </div>
        )}

        {/* Compteur n/max + minuteur, sous le cadran.
            Absent en mode énergie infinie : l'image porte le ∞. */}
        {!infinie && (
          <div style={compteurStyle}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <span>
                {energie}
                <span style={{ opacity: 0.6 }}>/{energieMax}</span>
              </span>
              <Zap size={17} strokeWidth={2.5} />
            </div>
            <div style={{ fontSize: 11, marginTop: 2 }}>
              {restantSec === null
                ? d.chrome.energieAuMaximum
                : tr(d.chrome.prochaineEnergieDans, { temps: formatMMSS(restantSec) })}
            </div>
          </div>
        )}

        {/* Le cartel laiton : LE bouton pub (accessible). Le libellé visuel est
            une icône de visionnage ; le nom accessible reste la chaîne i18n.
            Absent en mode énergie infinie : plus rien à regarder pour recharger. */}
        {!infinie && pubProposee && (
          <CartelPub
            onClick={regarderPub}
            indisponible={pubIndisponible}
            pulse={alerteActive && !pubIndisponible}
            ariaLabel={!pubIndisponible ? d.chrome.regarderPub : undefined}
            style={{
              position: "absolute",
              left: `${ZONE_PLAQUE.left}%`,
              top: `${ZONE_PLAQUE.top}%`,
              width: `${ZONE_PLAQUE.width}%`,
              height: `${ZONE_PLAQUE.height}%`,
            }}
          >
            {enCours || salve
              ? d.chrome.pubEnCours
              : energiePleine
                ? d.chrome.energieAuMaximum
                : pubsRestantes <= 0
                  ? d.chrome.pubEpuisee
                  : (
                    <span
                      aria-hidden
                      style={{
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <MonitorPlay size={22} strokeWidth={2.2} />
                      {"+1"}
                      <Zap size={16} strokeWidth={2.5} />
                    </span>
                  )}
          </CartelPub>
        )}

        {/* Le levier peint : zone de tap redondante, invisible pour l'a11y.
            Absent en mode énergie infinie (rien à créditer). */}
        {!infinie && pubProposee && (
          <div aria-hidden style={levierTapStyle(pubIndisponible)} onClick={regarderPub} />
        )}

        {/* Bouton d'achat « Énergie infinie » — juste sous le cartel pub.
            Achat non-consommable unique : disparaît dès que le drapeau est actif. */}
        {!infinie && achatDisponible() && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void acheterEnergieInfinie();
            }}
            disabled={achatEnCours}
            style={boutonAchatStyle(achatEnCours)}
          >
            {tr(d.chrome.acheterEnergieInfinie, { prix: prix ?? "…" })}
          </button>
        )}

        {/* Gerbe d'étincelles à la récompense (au niveau du cadran). */}
        {etincelles &&
          ETINCELLES.map((e, i) => (
            <span
              key={i}
              aria-hidden
              style={
                {
                  position: "absolute",
                  left: `${ZONE_CADRAN.cx}%`,
                  top: `${ZONE_CADRAN.cy}%`,
                  fontSize: 18,
                  pointerEvents: "none",
                  animation: `broc-spark 700ms ease-out ${e.delai}ms both`,
                  "--dx": `${e.dx}px`,
                  "--dy": `${e.dy}px`,
                } as CSSProperties
              }
            >
              ⚡
            </span>
          ))}
      </div>

    </div>
  );
}
