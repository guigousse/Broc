"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { useGame } from "@/context/GameContext";
import { getBrocanteById, fraisEntree, brocantesParTier } from "@/data/brocantes";
import { CoffreChargement } from "@/components/vente/CoffreChargement";
import { CoffrePricing } from "@/components/vente/CoffrePricing";
import { estDebloquee } from "@/lib/deblocage";
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
    ajusterBudget,
    acheterCamion,
  } = useGame();

  const brocante = useMemo(() => getBrocanteById(params.brocanteId), [params.brocanteId]);
  const [etape, setEtape] = useState<"packing" | "pricing">("packing");

  useEffect(() => {
    if (!isHydrated) return;
    if (!state) return router.replace("/");
    if (!brocante) return router.replace("/vitrine");

    const deb = new Map<1 | 2 | 3 | 4, Set<string>>([
      [1, new Set()], [2, new Set()], [3, new Set()], [4, new Set()],
    ]);
    for (const tier of [1, 2, 3, 4] as const) {
      for (const b of brocantesParTier(tier)) {
        if (estDebloquee(b, state, deb)) deb.get(tier)!.add(b.id);
      }
    }
    if (!deb.get(brocante.tier)!.has(brocante.id)) {
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

  const handleRotate = (objetId: string) => {
    const ov = coffre.find((o) => o.objet.id === objetId);
    if (!ov) return;
    const next = (((ov.rotation ?? 0) + 90) % 360) as 0 | 90 | 180 | 270;
    ajusterPositionVitrine(objetId, ov.posX ?? 0.5, ov.posY ?? 0.5, next);
  };

  const handleOuvrir = () => {
    const frais = fraisEntree(brocante);
    if (state.budget < frais) return;
    ajusterBudget(-frais);
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
            onValider={() => setEtape("pricing")}
            onAnnuler={() => { viderVitrine(); router.push("/vitrine"); }}
          />
        ) : (
          <CoffrePricing
            brocante={brocante}
            budget={state.budget}
            coffre={coffre}
            onAjusterPrix={ajusterPrixVitrine}
            onRetour={() => setEtape("packing")}
            onOuvrir={handleOuvrir}
          />
        )}
      </main>
    </div>
  );
}
