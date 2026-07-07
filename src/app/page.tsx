"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BrassCorners } from "@/components/ui/BrassCorners";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ReglagesModal } from "@/components/mobile/ReglagesModal";
import { IntroPorte } from "@/components/mobile/IntroPorte";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";

/**
 * Centre mesuré de la porte d'entrée sur `facade-accueil.webp` (même mesure
 * que `IntroPorte`) : cx ≈ 51 %, cy ≈ 66 %. Réutilisé ici pour l'`object-position`
 * du fond plein écran, afin que la porte reste visible dans un cadrage 9:16.
 */
const DOOR_CX_PCT = 51;
const DOOR_CY_PCT = 66;

export default function TitleScreen() {
  const { nouvellePartie, state, isHydrated } = useGame();
  const { playClick } = useSettings();
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const [confirmNouvellePartie, setConfirmNouvellePartie] = useState(false);
  const [introEnCours, setIntroEnCours] = useState(false);
  const aSauvegarde = isHydrated && state !== null;

  const lancerNouvellePartie = () => {
    setConfirmNouvellePartie(false);
    setIntroEnCours(true);
  };

  const onIntroFinie = () => {
    // L'intro joue AVANT la création de la sauvegarde. `nouvellePartie()`
    // navigue déjà vers /bureau via router.push — surtout PAS de
    // window.location.href par-dessus : un rechargement dur couperait
    // l'effet d'auto-sauvegarde (post-commit) et perdrait la partie fraîche.
    nouvellePartie();
  };

  const onNouvellePartie = () => {
    playClick();
    if (aSauvegarde) {
      setConfirmNouvellePartie(true);
      return;
    }
    lancerNouvellePartie();
  };

  const onContinuer = () => {
    playClick();
    if (aSauvegarde) window.location.href = "/bureau";
  };

  const onReglages = () => {
    playClick();
    setReglagesOuverts(true);
  };

  if (introEnCours) {
    return <IntroPorte onFini={onIntroFinie} />;
  }

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100dvh",
        width: "100%",
        backgroundColor: "var(--forest-900)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Façade de la maison du brocanteur, en fond plein écran. */}
      <img
        src="/qg/facade-accueil.webp"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${DOOR_CX_PCT}% ${DOOR_CY_PCT}%`,
          display: "block",
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
            from 0deg at 50% 38%,
            rgba(197,160,89,0.05) 0deg 4deg,
            rgba(0,0,0,0) 4deg 12deg
          )`,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 24,
          border: "1px solid var(--brass-700)",
          boxShadow:
            "inset 0 0 0 5px transparent, inset 0 0 0 6px var(--brass-700)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 32,
          border: "1px solid var(--brass-500)",
          pointerEvents: "none",
        }}
      />
      <BrassCorners color="var(--brass-500)" inset={34} size={40} />

      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding:
            "max(40px, var(--safe-top)) 24px max(28px, var(--safe-bottom))",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <img
            src="/assets/broc-logo.png"
            width={180}
            height={180}
            alt="Broc"
            style={{
              display: "block",
              margin: "0 auto 24px",
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
            }}
          />

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color: "var(--brass-500)",
              marginBottom: 12,
              fontWeight: 600,
            }}
          >
            — une simulation de brocante —
          </div>

          <img
            src="/assets/broc-wordmark-light.svg"
            width={520}
            alt="Broc"
            style={{
              display: "block",
              margin: "0 auto 6px",
              maxWidth: "100%",
              filter:
                "drop-shadow(0 8px 20px rgba(0,0,0,0.45)) brightness(1.05)",
            }}
          />

          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 20,
              color: "var(--paper-300)",
              margin: "8px auto 0",
              maxWidth: 560,
              lineHeight: 1.4,
            }}
          >
            « Chinez, restaurez, négociez.
            <br />
            Faites parler les objets de leur siècle. »
          </p>
        </div>

        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              alignItems: "center",
            }}
          >
            <Button variant="primary" size="lg" onClick={onNouvellePartie}>
              {aSauvegarde
                ? "Recommencer une nouvelle partie"
                : "Nouvelle Partie"}
            </Button>
            <Button
              variant="secondary"
              size="md"
              disabled={!aSauvegarde}
              onClick={onContinuer}
              style={{
                background: "transparent",
                color: "var(--brass-300)",
                borderColor: "var(--brass-500)",
                boxShadow:
                  "inset 0 0 0 3px transparent, inset 0 0 0 4px var(--brass-500)",
              }}
            >
              Continuer · Sauvegarde
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReglages}
              style={{ color: "var(--brass-300)" }}
            >
              Réglages · Crédits
            </Button>
          </div>

          <div
            style={{
              marginTop: 24,
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--brass-700)",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
            }}
          >
            ver. 1.0 · saison de printemps · 1924
          </div>
        </div>
      </div>

      <ReglagesModal
        open={reglagesOuverts}
        onClose={() => setReglagesOuverts(false)}
      />
      <ConfirmModal
        open={confirmNouvellePartie}
        onClose={() => setConfirmNouvellePartie(false)}
        onConfirm={lancerNouvellePartie}
        titre="Nouvelle partie"
        confirmLabel="Recommencer"
        danger
      >
        Votre partie en cours sera définitivement écrasée : budget, inventaire,
        collection et progression seront perdus. Continuer ?
      </ConfirmModal>
    </main>
  );
}
