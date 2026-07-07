"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ReglagesModal } from "@/components/mobile/ReglagesModal";
import { PartiesModal } from "@/components/mobile/PartiesModal";
import { IntroPorte } from "@/components/mobile/IntroPorte";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import {
  changerSlotActif,
  premierSlotLibre,
  slotActif,
  type NumeroSlot,
} from "@/lib/storage/slots";

/**
 * Centre mesuré de la porte d'entrée sur `facade-accueil.webp` (même mesure
 * que `IntroPorte`) : cx ≈ 51 %, cy ≈ 66 %. Réutilisé ici pour l'`object-position`
 * du fond plein écran, afin que la porte reste visible dans un cadrage 9:16.
 */
const DOOR_CX_PCT = 51;
const DOOR_CY_PCT = 66;

export default function TitleScreen() {
  const { nouvellePartie, state, isHydrated, reset, detacherPartie } = useGame();
  const { playClick } = useSettings();
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const [partiesModal, setPartiesModal] = useState<
    "gestion" | "choisir-ecrasement" | null
  >(null);
  const [introEnCours, setIntroEnCours] = useState(false);
  const aSauvegarde = isHydrated && state !== null;
  // Slot visé par le démarrage en cours, appliqué seulement à la fin de
  // l'intro (voir `onIntroFinie`) — jamais lu pendant l'intro elle-même.
  const slotCibleRef = useRef<NumeroSlot | null>(null);

  const onIntroFinie = () => {
    // La bascule de slot est DIFFÉRÉE jusqu'ici (et pas faite en amont dans
    // `demarrerSurSlot`) : pendant les ~3,3 s de l'intro, le GameContext de
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
    playClick();
    if (aSauvegarde) window.location.href = "/bureau";
  };

  const onReglages = () => {
    playClick();
    setReglagesOuverts(true);
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
              {aSauvegarde ? "Nouvelle partie" : "Nouvelle Partie"}
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
            <div style={{ display: "flex", gap: 4 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={onParties}
                style={{ color: "var(--brass-300)" }}
              >
                Parties
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
      <PartiesModal
        open={partiesModal !== null}
        onClose={() => setPartiesModal(null)}
        mode={partiesModal ?? "gestion"}
        onNouvellePartie={demarrerSurSlot}
        onAvantSuppressionActive={reset}
        onAvantBascule={detacherPartie}
      />
    </main>
  );
}
