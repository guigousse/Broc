"use client";

import { useMemo } from "react";
import type { NiveauCamion, Objet, ObjetEnVitrine, TailleObjet } from "@/types/game";
import { PLACES_PAR_TAILLE } from "@/types/game";
import { getCamion } from "@/data/camion";
import { getTemplate, tailleDe } from "@/data/objetTemplates";
import { capaciteSuffit, placesUtilisees } from "@/lib/coffre";
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

  const places = useMemo(() => {
    const items = p.coffre
      .map((ov) => getTemplate(ov.objet.templateId))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map((t) => ({ taille: tailleDe(t) }));
    return placesUtilisees(items);
  }, [p.coffre]);

  // MVP : pas de détection live d'overlap (alpha-mask coûte en perf à chaque move) ;
  // contrainte places à l'ajout, contour rouge non câblé pour l'instant.
  const overlaps = new Set<string>();

  const handlePickUp = (objetId: string, _clientX: number, _clientY: number) => {
    const obj = p.stock.find((o) => o.id === objetId);
    if (!obj) return;
    const tpl = getTemplate(obj.templateId);
    if (!tpl) return;
    const t: TailleObjet = tailleDe(tpl);
    const placesItem = PLACES_PAR_TAILLE[t];
    if (!capaciteSuffit(places, placesItem, camion.capacitePlaces)) return;
    p.onAjouter(objetId, 0.5, 0.5);
  };

  const peutValider = p.coffre.length > 0;

  return (
    <>
      <ChargementHeader
        niveau={p.niveauCamion}
        placesUtilisees={places}
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
          gap: 10,
        }}
      >
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
    </>
  );
}
