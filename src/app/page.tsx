"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FolderOpen, Info, Play, Plus, Settings } from "lucide-react";
import { ReglagesModal } from "@/components/mobile/ReglagesModal";
import { CreditsModal } from "@/components/mobile/CreditsModal";
import { PartiesModal } from "@/components/mobile/PartiesModal";
import { IntroPorte } from "@/components/mobile/IntroPorte";
import { IrisFermeture } from "@/components/mobile/IrisTransition";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { useLangue } from "@/lib/i18n/LangueContext";
import { audioManager } from "@/lib/audio/audioManager";
import { demarrerMusiqueTitre } from "@/lib/audio/titreJazz";
import {
  DUREE_FADE_REDUIT_MS,
  DUREE_FERMETURE_MS,
  PORTE_CX_PCT,
  PORTE_CY_PCT,
  pointPorteEcran,
  poserFlagIris,
  prefersReducedMotion,
} from "@/lib/transitionIris";
import {
  changerSlotActif,
  premierSlotLibre,
  slotActif,
  type NumeroSlot,
} from "@/lib/storage/slots";

/**
 * Bouton du menu d'accueil : même habillage que les boutons Chiner/Étaler
 * du QG (FloatingActionButton primaire), avec l'icône de la fonction calée
 * à gauche et le libellé justifié à droite.
 */
function BoutonMenu({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: 210,
        padding: "14px 16px",
        background: "var(--forest-800)",
        color: "var(--brass-300)",
        border: "1px solid var(--brass-500)",
        borderRadius: 6,
        fontFamily: "var(--font-display)",
        fontSize: 12,
        letterSpacing: "0.20em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled
          ? "none"
          : "0 6px 14px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,225,160,0.20)",
        ...(disabled ? { opacity: 0.45, filter: "grayscale(0.6)" } : {}),
      }}
    >
      {icon}
      {/* Libellé centré dans l'espace restant à droite de l'icône. */}
      <span style={{ flex: 1, textAlign: "center" }}>{label}</span>
    </button>
  );
}

/**
 * Parallaxe façon fond d'écran iPhone : la façade (légèrement zoomée pour
 * garder des marges) glisse à l'inverse de l'inclinaison du téléphone.
 * iOS 13+ exige une permission demandée DANS un geste utilisateur →
 * on s'abonne au premier pointerdown quand `requestPermission` existe.
 * Sans capteur (desktop) ou permission refusée : image simplement statique.
 */
function useTiltParallax(maxPx: number) {
  const ref = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window))
      return;

    let raf = 0;
    let running = false;
    let baseBeta: number | null = null;
    let baseGamma: number | null = null;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;

    const tick = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      if (ref.current) {
        ref.current.style.transform = `scale(1.08) translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      // La première mesure sert de position de repos : on ne bouge que
      // sur l'écart d'inclinaison, pas sur l'angle absolu de tenue.
      if (baseBeta === null || baseGamma === null) {
        baseBeta = e.beta;
        baseGamma = e.gamma;
      }
      const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
      targetX = (clamp(e.gamma - baseGamma, 18) / 18) * -maxPx;
      targetY = (clamp(e.beta - baseBeta, 18) / 18) * -maxPx;
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    const subscribe = () => {
      window.addEventListener("deviceorientation", onOrient);
    };

    const doe = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    const demanderPermission = () => {
      window.removeEventListener("pointerdown", demanderPermission);
      doe
        .requestPermission?.()
        .then((r) => {
          if (r === "granted") subscribe();
        })
        .catch(() => {});
    };

    if (typeof doe.requestPermission === "function") {
      window.addEventListener("pointerdown", demanderPermission, {
        passive: true,
      });
    } else {
      subscribe();
    }

    return () => {
      window.removeEventListener("pointerdown", demanderPermission);
      window.removeEventListener("deviceorientation", onOrient);
      cancelAnimationFrame(raf);
    };
  }, [maxPx]);

  return ref;
}

export default function TitleScreen() {
  const { nouvellePartie, state, isHydrated, reset, detacherPartie } = useGame();
  const { playClick } = useSettings();
  const { d } = useLangue();
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const [creditsOuverts, setCreditsOuverts] = useState(false);
  const [partiesModal, setPartiesModal] = useState<
    "gestion" | "choisir-ecrasement" | null
  >(null);
  const [introEnCours, setIntroEnCours] = useState(false);
  const aSauvegarde = isHydrated && state !== null;
  // Slot visé par le démarrage en cours, appliqué seulement à la fin de
  // l'intro (voir `onIntroFinie`) — jamais lu pendant l'intro elle-même.
  const slotCibleRef = useRef<NumeroSlot | null>(null);
  const facadeRef = useTiltParallax(14);

  // Fermeture d'iris en cours : point d'ancrage (la porte à l'écran) et
  // action à jouer une fois l'écran noir. L'overlay IrisFermeture bloque
  // toute interaction pendant la fermeture (pointer-events + z-index).
  const [iris, setIris] = useState<{
    x: number;
    y: number;
    apresNoir: () => void;
  } | null>(null);

  const lancerIrisVers = (apresNoir: () => void) => {
    // La musique du titre suit exactement la fermeture de l'iris (fondu de
    // même durée) ; au noir, le rechargement dur coupe ce qui reste.
    audioManager.fadeOutVinylBus(
      prefersReducedMotion() ? DUREE_FADE_REDUIT_MS : DUREE_FERMETURE_MS,
    );
    setIris({ ...pointPorteEcran(facadeRef.current), apresNoir });
  };

  // Ambiance de rue (comme le QG, reprise telle quelle au bureau) + jazz du
  // titre : crépitement puis les 3 vinyles en boucle (cf. titreJazz).
  // L'autoplay peut être refusé avant le premier geste (iOS/desktop) : on
  // retente au premier pointerdown si rien ne joue encore. Au démontage on
  // n'arrête que l'ENCHAÎNEMENT — la coupure du son est le travail du fondu
  // des départs en partie (lancerIrisVers / IntroPorte).
  useEffect(() => {
    void audioManager.startAmbience();
    let arreter = demarrerMusiqueTitre(audioManager);
    const relance = () => {
      if (audioManager.vinylEnLecture()) return;
      arreter();
      arreter = demarrerMusiqueTitre(audioManager);
    };
    window.addEventListener("pointerdown", relance, { once: true });
    return () => {
      window.removeEventListener("pointerdown", relance);
      arreter();
    };
  }, []);

  const onIntroFinie = () => {
    // La bascule de slot est DIFFÉRÉE jusqu'ici (et pas faite en amont dans
    // `demarrerSurSlot`) : pendant les ~2,4 s de l'intro (600 ms de
    // contemplation + 1 800 ms d'iris), le GameContext de
    // cet écran-titre reste monté sur l'ANCIEN slot actif, avec son tick
    // (/60 s) et ses handlers focus/visibilitychange toujours vivants. Si le
    // slot actif changeait avant la fin de l'intro, un de ces déclencheurs
    // pourrait auto-sauvegarder l'état de l'ancienne partie DANS le nouveau
    // slot cible (déjà « actif » en storage) — corruption transitoire, et
    // permanente si l'appli est tuée pendant l'intro. En repoussant la
    // bascule ici, bascule + création (`nouvellePartie()`) sont atomiques :
    // aucun tick de l'ancien contexte ne peut plus s'intercaler entre les
    // deux. `nouvellePartie()` navigue déjà vers /bureau via router.push —
    // surtout PAS de window.location.href par-dessus : un rechargement dur
    // couperait l'effet d'auto-sauvegarde (post-commit) et perdrait la
    // partie fraîche.
    changerSlotActif(slotCibleRef.current ?? slotActif());
    nouvellePartie();
  };

  // Mémorise le slot visé et lance l'intro — la bascule effective est
  // différée à `onIntroFinie` (voir son commentaire). Partagé par le
  // premier-emplacement-libre direct et par les deux issues de la modal
  // Parties (« Nouvelle partie ici » / « Écraser »).
  const demarrerSurSlot = (n: NumeroSlot) => {
    slotCibleRef.current = n;
    setPartiesModal(null);
    setIntroEnCours(true);
  };

  const onNouvellePartie = () => {
    playClick();
    const libre = premierSlotLibre();
    if (libre !== null) {
      demarrerSurSlot(libre);
      return;
    }
    // Les 3 emplacements sont pleins : la modal Parties gère le choix de
    // l'écrasement (avec sa propre confirmation) — plus de ConfirmModal ici.
    setPartiesModal("choisir-ecrasement");
  };

  const onContinuer = () => {
    if (!aSauvegarde || iris) return;
    playClick();
    lancerIrisVers(() => {
      // Le flag déclenche la réouverture d'iris côté bureau (IrisArrivee) ;
      // le rechargement dur se déroule entièrement sous le noir.
      poserFlagIris();
      window.location.href = "/bureau";
    });
  };

  const onLancerSlot = (n: NumeroSlot) => {
    if (iris) return;
    playClick();
    setPartiesModal(null);
    lancerIrisVers(() => {
      // Ordre CRITIQUE (même course que l'ancien onJouer de PartiesModal) :
      // pendant la fermeture (DUREE_FERMETURE_MS), le GameContext de cet écran reste
      // monté sur l'ANCIEN slot actif — la bascule n'a lieu qu'au noir,
      // détachement d'abord, navigation aussitôt après, pour qu'aucun tick
      // d'auto-sauvegarde ne puisse écrire dans le slot fraîchement activé.
      detacherPartie();
      changerSlotActif(n);
      poserFlagIris();
      window.location.href = "/bureau";
    });
  };

  const onReglages = () => {
    playClick();
    setReglagesOuverts(true);
  };

  const onCredits = () => {
    playClick();
    setCreditsOuverts(true);
  };

  const onParties = () => {
    playClick();
    setPartiesModal("gestion");
  };

  if (introEnCours) {
    return <IntroPorte onFini={onIntroFinie} />;
  }

  return (
    <main
      style={{
        position: "relative",
        height: "100dvh",
        width: "100%",
        backgroundColor: "var(--forest-900)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Façade de la maison du brocanteur, en fond plein écran.
          Pré-zoomée (scale 1.08) pour que la parallaxe au gyroscope ne
          découvre jamais les bords. */}
      <img
        ref={facadeRef}
        src="/qg/facade-accueil.webp"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${PORTE_CX_PCT}% ${PORTE_CY_PCT}%`,
          display: "block",
          transform: "scale(1.08)",
          willChange: "transform",
        }}
        draggable={false}
      />

      {/* Voile de lisibilité : sombre en bas (zone des boutons), léger en haut. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(to top, rgba(15,31,24,0.88) 0%, rgba(15,31,24,0.35) 45%, rgba(15,31,24,0.15) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Grain existant, conservé par-dessus le voile. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/assets/grain-overlay.svg)",
          backgroundSize: "320px 320px",
          pointerEvents: "none",
        }}
      />

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-conic-gradient(
            from 0deg at 50% 10%,
            rgba(197,160,89,0.09) 0deg 4deg,
            rgba(0,0,0,0) 4deg 12deg
          )`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding:
            "max(40px, var(--safe-top)) 24px max(28px, var(--safe-bottom))",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 720,
            // Respiration sous la barre de statut iOS.
            margin: "18px auto 0",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-broc-title)",
              fontWeight: 400,
              fontSize: "clamp(64px, 22vw, 104px)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              color: "var(--paper-100)",
              margin: 0,
              textShadow: "0 8px 20px rgba(0,0,0,0.45)",
            }}
          >
            Broc
          </h1>
        </div>

        {/* Menu : 5 boutons superposés, centrés à l'écran, tous au format
            du bouton Continuer (icône à gauche, libellé à droite). */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
          }}
        >
          <BoutonMenu
            icon={<Play size={17} strokeWidth={2} aria-hidden />}
            label={d.menu.continuer}
            onClick={onContinuer}
            disabled={!aSauvegarde}
          />
          <BoutonMenu
            icon={<Plus size={17} strokeWidth={2} aria-hidden />}
            label={d.menu.nouvellePartie}
            onClick={onNouvellePartie}
          />
          <BoutonMenu
            icon={<FolderOpen size={17} strokeWidth={2} aria-hidden />}
            label={d.menu.charger}
            onClick={onParties}
          />
          <BoutonMenu
            icon={<Settings size={17} strokeWidth={2} aria-hidden />}
            label={d.menu.reglages}
            onClick={onReglages}
          />
          <BoutonMenu
            icon={<Info size={17} strokeWidth={2} aria-hidden />}
            label={d.menu.credits}
            onClick={onCredits}
          />
        </div>
      </div>

      <ReglagesModal
        open={reglagesOuverts}
        onClose={() => setReglagesOuverts(false)}
      />
      <CreditsModal
        open={creditsOuverts}
        onClose={() => setCreditsOuverts(false)}
      />
      <PartiesModal
        open={partiesModal !== null}
        onClose={() => setPartiesModal(null)}
        mode={partiesModal ?? "gestion"}
        onNouvellePartie={demarrerSurSlot}
        onAvantSuppressionActive={reset}
        onLancer={onLancerSlot}
      />

      {iris && <IrisFermeture cx={iris.x} cy={iris.y} onNoir={iris.apresNoir} />}
    </main>
  );
}
