"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { useGame } from "@/context/GameContext";
import { CoffreChargement } from "@/components/vente/CoffreChargement";
import { VITRINE_PREP_ID, vitrineEstEnPrep } from "@/lib/vitrinePrep";
import type { NiveauCamion, ObjetEnVitrine } from "@/types/game";

const SUGGESTION_FACTEUR = 1.4;

/**
 * Étape "préparation du coffre" sans brocante choisie. L'utilisateur charge
 * son camion ; le coffre est créé avec brocanteId = VITRINE_PREP_ID. À la
 * validation, on bascule sur l'écran de sélection de brocante (/vitrine).
 *
 * Si une vitrine est déjà attachée à une vraie brocante (pas en prep), on
 * redirige vers /vitrine/[id] pour respecter le flow existant.
 */
export default function VitrinePrepPage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    ouvrirVitrine,
    mettreEnVitrine,
    retirerDeVitrine,
    ajusterPositionVitrine,
    viderVitrine,
    acheterCamion,
    setNiveauCamionDev,
  } = useGame();

  useEffect(() => {
    if (!isHydrated) return;
    if (!state) {
      router.replace("/");
      return;
    }
    // Vitrine attachée à une vraie brocante → on sort de la prep.
    if (state.vitrine && !vitrineEstEnPrep(state)) {
      router.replace(`/vitrine/${state.vitrine.brocanteId}`);
      return;
    }
    if (!state.vitrine) {
      ouvrirVitrine(VITRINE_PREP_ID);
    }
  }, [isHydrated, state, router, ouvrirVitrine]);

  const coffre: ObjetEnVitrine[] = state?.vitrine?.objets ?? [];
  const stock = useMemo(() => {
    if (!state) return [];
    const ids = new Set(coffre.map((o) => o.objet.id));
    return state.inventaireJoueur.filter(
      (o) => !ids.has(o.id) && !o.enRestauration,
    );
  }, [state, coffre]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — préparation du coffre…
      </main>
    );
  }

  const handleAjouter = (objetId: string, posX: number, posY: number) => {
    const obj = state.inventaireJoueur.find((o) => o.id === objetId);
    if (!obj) return;
    const prix =
      obj.prixVenteSouhaite ??
      Math.max(1, Math.round(obj.prixReferenceReel * SUGGESTION_FACTEUR));
    mettreEnVitrine(objetId, prix, posX, posY, 0);
  };

  const handleRotate = (objetId: string, angle: number) => {
    const ov = coffre.find((o) => o.objet.id === objetId);
    if (!ov) return;
    const norm = ((angle % 360) + 360) % 360;
    ajusterPositionVitrine(objetId, ov.posX ?? 0.5, ov.posY ?? 0.5, norm);
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper-100)",
      }}
    >
      <ContextualHeader
        titre="Chargement"
        sousTitre="Préparation du coffre"
        budget={state.budget}
        onBack={() => router.push("/bureau")}
      />
      <main style={{ flex: 1, overflowY: "auto" }}>
        <CoffreChargement
          niveauCamion={state.niveauCamion as NiveauCamion}
          budget={state.budget}
          stock={stock}
          coffre={coffre}
          onAjouter={handleAjouter}
          onMove={(id, x, y) => {
            const ov = coffre.find((o) => o.objet.id === id);
            if (!ov) return;
            ajusterPositionVitrine(id, x, y, ov.rotation ?? 0);
          }}
          onRotate={handleRotate}
          onRetirer={retirerDeVitrine}
          onUpgrade={acheterCamion}
          onSetNiveauDev={setNiveauCamionDev}
          onValider={() => router.push("/vitrine")}
          onAnnuler={() => {
            viderVitrine();
            router.push("/bureau");
          }}
        />
      </main>
    </div>
  );
}
