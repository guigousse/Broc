"use client";

import { useMemo } from "react";
import type { NiveauCamion, Objet, ObjetEnVitrine } from "@/types/game";
import { getCamion, getScaleCoffre } from "@/data/camion";
import { getTemplate, tailleDe } from "@/data/objetTemplates";
import { computeOverlaps } from "@/lib/coffre";
import { ChargementHeader } from "./ChargementHeader";
import { CoffreCanvas } from "./CoffreCanvas";
import { CarrouselStock } from "./CarrouselStock";

interface Props {
  niveauCamion: NiveauCamion;
  budget: number;
  stock: Objet[];
  coffre: ObjetEnVitrine[];
  onAjouter: (objetId: string, posX: number, posY: number) => void;
  onMove: (objetId: string, posX: number, posY: number) => void;
  onRotate: (objetId: string) => void;
  onRetirer: (objetId: string) => void;
  onUpgrade: (n: NiveauCamion) => void;
  onValider: () => void;
  onAnnuler: () => void;
}

export function CoffreChargement(p: Props) {
  const camion = getCamion(p.niveauCamion);

  // Live overlap detection : bbox-based pour la perf, déclenchée à chaque move.
  const overlaps = useMemo(() => {
    const items = p.coffre
      .map((ov) => {
        const tpl = getTemplate(ov.objet.templateId);
        if (!tpl) return null;
        const taille = tailleDe(tpl);
        return {
          id: ov.objet.id,
          posX: ov.posX ?? 0.5,
          posY: ov.posY ?? 0.5,
          scale: getScaleCoffre(taille, camion.capacitePlaces),
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    return computeOverlaps(items);
  }, [p.coffre, camion.capacitePlaces]);

  const handlePickUp = (objetId: string, _clientX: number, _clientY: number) => {
    // Plus de contrainte "places" : tant que l'objet rentre visuellement, c'est OK.
    // L'overlap est signalé en rouge, à charge du joueur de réarranger.
    p.onAjouter(objetId, 0.5, 0.5);
  };

  const peutValider = p.coffre.length > 0 && overlaps.size === 0;

  return (
    <>
      <ChargementHeader
        niveau={p.niveauCamion}
        nbObjets={p.coffre.length}
        budget={p.budget}
        onUpgrade={p.onUpgrade}
      />
      <CoffreCanvas
        niveauCamion={p.niveauCamion}
        objets={p.coffre}
        overlaps={overlaps}
        onMove={p.onMove}
        onRotate={p.onRotate}
        onRetour={p.onRetirer}
      />
      <CarrouselStock stock={p.stock} onPickUp={handlePickUp} />
      <div
        style={{
          position: "sticky",
          bottom: 0,
          padding: "10px 14px calc(10px + var(--safe-bottom))",
          background: "var(--paper-100)",
          borderTop: "1px solid var(--brass-500)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {overlaps.size > 0 && (
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 11.5,
              color: "var(--vermillion-600)",
              textAlign: "center",
              margin: 0,
            }}
          >
            Réarrangez le coffre — certains objets se chevauchent.
          </p>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={p.onAnnuler}
            style={{
              flex: 1,
              padding: "10px",
              border: "1px solid var(--brass-500)",
              background: "var(--paper-100)",
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!peutValider}
            onClick={p.onValider}
            style={{
              flex: 2,
              padding: "10px",
              border: "1px solid var(--brass-500)",
              background: peutValider ? "var(--forest-800)" : "var(--paper-300)",
              color: peutValider ? "var(--brass-300)" : "var(--ink-500)",
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Valider le chargement
          </button>
        </div>
      </div>
    </>
  );
}
