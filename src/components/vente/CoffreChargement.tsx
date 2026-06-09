"use client";

import { useEffect, useMemo, useState } from "react";
import type { NiveauCamion, Objet, ObjetEnVitrine } from "@/types/game";
import { getCamion, getScaleCoffre } from "@/data/camion";
import { getTemplate, tailleDe } from "@/data/objetTemplates";
import {
  buildAlphaMask,
  buildTrunkMask,
  computeOverlapsPixel,
  getCachedMask,
  getCachedTrunkMask,
  maskKey,
  type PixelItem,
  type TrunkMask,
} from "@/lib/coffre";
import { getItemImageUrl } from "@/lib/itemImages";
import { getCoffreAssets } from "@/lib/coffreAssets";
import { audioManager } from "@/lib/audio/audioManager";
import { ChargementHeader } from "./ChargementHeader";
import { CoffreCanvas } from "./CoffreCanvas";
import { CarrouselStock } from "./CarrouselStock";

const MASK_SIZE = 48;
const TRUNK_MASK_SIZE = 256;
const CLOSING_DURATION_MS = 900;

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
  onSetNiveauDev?: (n: NiveauCamion) => void;
  onValider: () => void;
  onAnnuler: () => void;
}

function buildSolidMask(size: number): Uint8Array {
  const bits = new Uint8Array(size * size);
  bits.fill(1);
  return bits;
}

export function CoffreChargement(p: Props) {
  const camion = getCamion(p.niveauCamion);
  const assets = getCoffreAssets(camion.visuelId);

  const [maskTick, setMaskTick] = useState(0);
  const [trunkMask, setTrunkMask] = useState<TrunkMask | null>(null);
  const [closing, setClosing] = useState(false);

  // Pré-chargement des alpha-masks des items présents.
  useEffect(() => {
    let cancelled = false;
    const tasks = p.coffre
      .map((ov) => getItemImageUrl(ov.objet.templateId))
      .filter((src): src is string => !!src)
      .filter((src) => !getCachedMask(maskKey(src, MASK_SIZE, 0)));
    if (tasks.length === 0) return;
    Promise.all(tasks.map((src) => buildAlphaMask(src, MASK_SIZE, 0).catch(() => null))).then(() => {
      if (!cancelled) setMaskTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [p.coffre]);

  // Collision pixel-perfect : on crop le masque strict avec les mêmes zoom +
  // center que le rendu du visuel, pour que les coords [0,1] des items dans le
  // container correspondent à la zone du contenant.
  useEffect(() => {
    if (!assets) {
      setTrunkMask(null);
      return;
    }
    const zoom = camion.displayZoom ?? 1;
    const cx = camion.displayCenterX ?? 0.5;
    const cy = camion.displayCenterY ?? 0.5;
    const cached = getCachedTrunkMask(assets.mask, TRUNK_MASK_SIZE, zoom, cx, cy);
    if (cached) {
      setTrunkMask(cached);
      return;
    }
    let cancelled = false;
    buildTrunkMask(assets.mask, TRUNK_MASK_SIZE, zoom, cx, cy)
      .then((m) => {
        if (!cancelled) setTrunkMask(m);
      })
      .catch(() => {
        if (!cancelled) setTrunkMask(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assets, camion.displayZoom, camion.displayCenterX, camion.displayCenterY]);

  const overlaps = useMemo(() => {
    void maskTick;
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
    return computeOverlapsPixel(items, trunkMask);
  }, [p.coffre, camion.capacitePlaces, maskTick, trunkMask]);

  const handlePickUp = (objetId: string) => {
    p.onAjouter(objetId, 0.5, 0.5);
  };

  const handleValider = () => {
    if (closing) return;
    setClosing(true);
    void audioManager.playCoffreFerme();
    window.setTimeout(() => {
      p.onValider();
    }, CLOSING_DURATION_MS);
  };

  const peutValider = p.coffre.length > 0 && overlaps.size === 0;

  return (
    <>
      <ChargementHeader
        niveau={p.niveauCamion}
        nbObjets={p.coffre.length}
        budget={p.budget}
        onUpgrade={p.onUpgrade}
        onSetNiveauDev={p.onSetNiveauDev}
      />
      <CoffreCanvas
        niveauCamion={p.niveauCamion}
        objets={p.coffre}
        overlaps={overlaps}
        closing={closing}
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
        {overlaps.size > 0 && !closing && (
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
            Réarrangez le coffre — certains objets ne tiennent pas.
          </p>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={p.onAnnuler}
            disabled={closing}
            style={{
              flex: 1,
              padding: "10px",
              border: "1px solid var(--brass-500)",
              background: "var(--paper-100)",
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              opacity: closing ? 0.4 : 1,
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!peutValider || closing}
            onClick={handleValider}
            style={{
              flex: 2,
              padding: "10px",
              border: "1px solid var(--brass-500)",
              background:
                peutValider && !closing ? "var(--forest-800)" : "var(--paper-300)",
              color:
                peutValider && !closing ? "var(--brass-300)" : "var(--ink-500)",
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {closing ? "Fermeture du coffre…" : "Valider le chargement"}
          </button>
        </div>
      </div>
    </>
  );
}
