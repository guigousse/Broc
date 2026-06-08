"use client";

import { useEffect, useMemo, useState } from "react";
import type { NiveauCamion, Objet, ObjetEnVitrine } from "@/types/game";
import { getCamion, getScaleCoffre } from "@/data/camion";
import { getTemplate, tailleDe } from "@/data/objetTemplates";
import {
  buildAlphaMask,
  cacheMask,
  computeOverlapsPixel,
  computeOverlaps,
  getCachedMask,
  maskKey,
  type PixelItem,
} from "@/lib/coffre";
import { getItemImageUrl } from "@/lib/itemImages";
import { ChargementHeader } from "./ChargementHeader";
import { CoffreCanvas } from "./CoffreCanvas";
import { CarrouselStock } from "./CarrouselStock";

const MASK_SIZE = 48; // résolution du masque alpha pour la collision

interface Props {
  niveauCamion: NiveauCamion;
  budget: number;
  stock: Objet[];
  coffre: ObjetEnVitrine[];
  onAjouter: (objetId: string, posX: number, posY: number) => void;
  onMove: (objetId: string, posX: number, posY: number) => void;
  onRotate: (objetId: string, angle: number) => void;
  onRetirer: (objetId: string) => void;
  onUpgrade: (n: NiveauCamion) => void;
  onValider: () => void;
  onAnnuler: () => void;
}

/** Masque de remplacement (carré plein) pour les items sans image. */
function buildSolidMask(size: number): Uint8Array {
  const bits = new Uint8Array(size * size);
  bits.fill(1);
  return bits;
}

export function CoffreChargement(p: Props) {
  const camion = getCamion(p.niveauCamion);
  // Bump pour re-render quand de nouveaux masques sont chargés en cache.
  const [maskTick, setMaskTick] = useState(0);

  // Préchargement des alpha-masks pour les items présents dans le coffre.
  useEffect(() => {
    let cancelled = false;
    const tasks = p.coffre
      .map((ov) => getItemImageUrl(ov.objet.templateId))
      .filter((src): src is string => !!src)
      .filter((src) => !getCachedMask(maskKey(src, MASK_SIZE, 0)));
    if (tasks.length === 0) return;
    Promise.all(
      tasks.map((src) =>
        buildAlphaMask(src, MASK_SIZE, 0).catch(() => null),
      ),
    ).then(() => {
      if (!cancelled) setMaskTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [p.coffre]);

  // Construit les PixelItem à partir du coffre.
  const overlaps = useMemo(() => {
    void maskTick; // force la dépendance
    const items: PixelItem[] = [];
    for (const ov of p.coffre) {
      const tpl = getTemplate(ov.objet.templateId);
      if (!tpl) continue;
      const taille = tailleDe(tpl);
      const scale = getScaleCoffre(taille, camion.capacitePlaces);
      const src = getItemImageUrl(ov.objet.templateId);
      let mask: Uint8Array | undefined;
      if (src) mask = getCachedMask(maskKey(src, MASK_SIZE, 0));
      if (!mask) mask = buildSolidMask(MASK_SIZE);
      items.push({
        id: ov.objet.id,
        cx: ov.posX ?? 0.5,
        cy: ov.posY ?? 0.5,
        scale,
        rot: ov.rotation ?? 0,
        mask,
        maskSize: MASK_SIZE,
      });
    }
    // Si AUCUN masque alpha n'est encore en cache, fallback rapide bbox
    // (évite que l'écran soit tout rouge en attendant les images).
    return computeOverlapsPixel(items);
  }, [p.coffre, camion.capacitePlaces, maskTick]);

  // Note : `computeOverlaps` reste importé pour fallback bbox éventuel (non utilisé en MVP).
  void computeOverlaps;
  void cacheMask;

  const handlePickUp = (objetId: string, _clientX: number, _clientY: number) => {
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
