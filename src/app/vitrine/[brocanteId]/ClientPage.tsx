"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { useGame } from "@/context/GameContext";
import { getBrocanteById, fraisEntree } from "@/data/brocantes";
import { CoffreChargement } from "@/components/vente/CoffreChargement";
import { CoffrePricing } from "@/components/vente/CoffrePricing";
import { calculerBrocantesDebloqueesParTier } from "@/lib/deblocage";
import { vitrineEstEnPrep } from "@/lib/vitrinePrep";
import { energieCourante } from "@/lib/energie";
import type { NiveauCamion, ObjetEnVitrine } from "@/types/game";

const SUGGESTION_FACTEUR = 1.4;

export default function VitrineBrocantePage() {
  const router = useRouter();
  const params = useParams<{ brocanteId: string }>();
  const {
    state,
    isHydrated,
    ouvrirVitrine,
    mettreEnVitrine,
    retirerDeVitrine,
    ajusterPrixVitrine,
    ajusterPositionVitrine,
    viderVitrine,
    payerFraisBrocante,
    acheterCamion,
    setNiveauCamionDev,
    tempsConfiance,
    consommerEnergie,
  } = useGame();

  const brocante = useMemo(() => getBrocanteById(params.brocanteId), [params.brocanteId]);
  const [etape, setEtape] = useState<"packing" | "pricing">("packing");
  // Une seule décision d'étape initiale après hydratation : si la vitrine est
  // déjà attachée à cette brocante et pleine (cas /vitrine/prep → sélection),
  // on saute directement à "pricing". Ensuite l'utilisateur peut naviguer
  // librement entre les deux étapes via les boutons Retour / Valider.
  const didDecideEtapeRef = useRef(false);
  useEffect(() => {
    if (didDecideEtapeRef.current) return;
    if (!isHydrated || !state || !brocante) return;
    const v = state.vitrine;
    if (v && v.brocanteId === brocante.id && v.objets.length > 0) {
      setEtape("pricing");
    }
    didDecideEtapeRef.current = true;
  }, [isHydrated, state, brocante]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!state) return router.replace("/");
    if (!brocante) return router.replace("/vitrine");

    const deb = calculerBrocantesDebloqueesParTier(state);
    if (!deb.get(brocante.tier)!.has(brocante.id)) {
      router.replace("/vitrine");
      return;
    }
    // Coffre encore en prep mais URL pointe sur une vraie brocante : on
    // renvoie sur l'écran de sélection plutôt que de perdre la prep en
    // recréant une vitrine vide.
    if (vitrineEstEnPrep(state)) {
      router.replace("/vitrine");
      return;
    }
    if (!state.vitrine || state.vitrine.brocanteId !== brocante.id) {
      ouvrirVitrine(brocante.id);
    }
  }, [isHydrated, state, brocante, router, ouvrirVitrine]);

  const coffre: ObjetEnVitrine[] = state?.vitrine?.objets ?? [];
  const stock = useMemo(() => {
    if (!state) return [];
    const ids = new Set(coffre.map((o) => o.objet.id));
    return state.inventaireJoueur.filter((o) => !ids.has(o.id) && !o.enRestauration);
  }, [state, coffre]);

  if (!isHydrated || !state || !brocante) {
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
        — préparation de l'étal…
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
    // Normalise dans [0, 360).
    const norm = ((angle % 360) + 360) % 360;
    ajusterPositionVitrine(objetId, ov.posX ?? 0.5, ov.posY ?? 0.5, norm);
  };

  const handleOuvrir = () => {
    const frais = fraisEntree(brocante);
    if (state.budget < frais) return;
    if (energieCourante(state, tempsConfiance() ?? Date.now()) < 1) return; // plus d'énergie
    payerFraisBrocante(brocante.id, brocante.nom, frais);
    consommerEnergie(1);
    router.push(`/vitrine/${brocante.id}/journee`);
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--paper-100)" }}>
      <ContextualHeader
        titre={etape === "packing" ? "Chargement" : "Tarification"}
        sousTitre={`${brocante.nom} · ${"★".repeat(brocante.tier)}`}
        budget={state.budget}
        onBack={() => (etape === "pricing" ? setEtape("packing") : router.push("/vitrine"))}
      />
      <main style={{ flex: 1, overflowY: "auto" }}>
        {etape === "packing" ? (
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
            onValider={() => setEtape("pricing")}
            onAnnuler={() => { viderVitrine(); router.push("/vitrine"); }}
          />
        ) : (
          <CoffrePricing
            coffre={coffre}
            onAjusterPrix={ajusterPrixVitrine}
            onRetour={() => setEtape("packing")}
            onValider={handleOuvrir}
            validerLabel={`Ouvrir l'étal · ${fraisEntree(brocante)} €`}
            validerActif={
              state.budget >= fraisEntree(brocante) &&
              coffre.length > 0 &&
              energieCourante(state, tempsConfiance() ?? Date.now()) >= 1
            }
          />
        )}
      </main>
    </div>
  );
}
