"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { EtapeBandeau } from "@/components/vente/EtapeBandeau";
import { useGame } from "@/context/GameContext";
import { CoffreChargement } from "@/components/vente/CoffreChargement";
import { CoffrePricing } from "@/components/vente/CoffrePricing";
import { VITRINE_PREP_ID, vitrineEstEnPrep } from "@/lib/vitrinePrep";
import { CATEGORIES } from "@/data/categories";
import { aConnaisseurVitrine } from "@/lib/competences";
import { prixSuggere } from "@/lib/prixSuggere";
import type { CategorieObjet, NiveauCamion, ObjetEnVitrine } from "@/types/game";

// Prix par défaut = prix du marché (curseur de tarification centré sur la valeur).
const SUGGESTION_FACTEUR = 1;

/**
 * Préparation du coffre AVANT le choix de la brocante : packing puis pricing.
 * À la fin du pricing, on bascule sur l'écran de sélection (/vitrine) — c'est
 * là que la brocante est choisie, payée, et qu'on entre dans la journée.
 *
 * Le coffre est porté par `state.vitrine` avec brocanteId = VITRINE_PREP_ID,
 * ré-attribué à la vraie brocante par BrocantePanorama au clic "Continuer".
 */
export default function VitrinePrepPage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    ouvrirVitrine,
    mettreEnVitrine,
    retirerDeVitrine,
    ajusterPrixVitrine,
    ajusterPositionVitrine,
    viderVitrine,
    acheterCamion,
    setNiveauCamionDev,
  } = useGame();

  const [etape, setEtape] = useState<"packing" | "pricing">("packing");

  useEffect(() => {
    if (!isHydrated) return;
    if (!state) {
      router.replace("/");
      return;
    }
    // Vitrine déjà attribuée à une vraie brocante → on sort de la prep.
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

  const categoriesConnuesVitrine = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurVitrine(state, c)) s.add(c);
    return s;
  }, [state]);

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
    const prix = prixSuggere(
      obj,
      categoriesConnuesVitrine.has(obj.categorie),
      SUGGESTION_FACTEUR,
    );
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
      <MobileHeader budget={state.budget} />
      <EtapeBandeau>
        {etape === "packing"
          ? "1 — Préparation du coffre"
          : "2 — Tarification"}
      </EtapeBandeau>
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          // Étape tarification (liste, pas image) : on décale le contenu sous
          // le texte d'étape flottant. Packing (image) reste à fleur du header.
          paddingTop: etape === "pricing" ? 70 : 0,
        }}
      >
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
            onAnnuler={() => {
              viderVitrine();
              router.push("/bureau");
            }}
          />
        ) : (
          <CoffrePricing
            coffre={coffre}
            onAjusterPrix={ajusterPrixVitrine}
            onRetour={() => setEtape("packing")}
            onValider={() => router.push("/vitrine")}
            validerLabel="Choisir la brocante →"
            validerActif={coffre.length > 0}
            categoriesConnues={categoriesConnuesVitrine}
          />
        )}
      </main>
    </div>
  );
}
