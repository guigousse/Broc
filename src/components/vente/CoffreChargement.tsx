"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { CoffreCanvas } from "./CoffreCanvas";
import { CarrouselStock } from "./CarrouselStock";
import { DevPanel } from "./DevPanel";

// Dev only — affiche le panneau dev (switcher + sliders position/scale).
const DEV_PANEL = true;

const MASK_SIZE = 48;
const TRUNK_MASK_SIZE = 256;
// Séquence de validation : tout doit terminer à 5 000 ms.
//  0 – 500 ms   : le coffre se ferme (son playCoffreFerme).
//  500 ms       : le bruit du moteur démarre (playDepartVoiture).
//  1 500 ms     : la voiture commence à avancer (tween).
//  5 000 ms     : fin du tween + fondu son/opacité → onValider.
const CLOSING_DURATION_MS = 500;
const DEPART_DELAY_MS = 1000; // attente entre fin de fermeture et début du tween
const DEPART_DURATION_MS = 3500;
const DEPART_TARGET = { x: 0.5, y: 0.5, scale: 0.03 } as const;

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

  // Collision pixel-perfect : masque strict mappé sur l'image entière.
  useEffect(() => {
    if (!assets) {
      setTrunkMask(null);
      return;
    }
    const cached = getCachedTrunkMask(assets.mask, TRUNK_MASK_SIZE);
    if (cached) {
      setTrunkMask(cached);
      return;
    }
    let cancelled = false;
    buildTrunkMask(assets.mask, TRUNK_MASK_SIZE)
      .then((m) => {
        if (!cancelled) setTrunkMask(m);
      })
      .catch(() => {
        if (!cancelled) setTrunkMask(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assets]);

  // Override dev de la position/scale du camion sur le garage. Clé = visuelId.
  const [devOverrides, setDevOverrides] = useState<
    Record<string, { x: number; y: number; scale: number }>
  >({});
  const currentOverride = devOverrides[camion.visuelId] ?? null;

  // Animation de départ (la voiture s'éloigne en perspective).
  const [departOverride, setDepartOverride] = useState<
    { x: number; y: number; scale: number } | null
  >(null);
  const [truckOpacity, setTruckOpacity] = useState(1);
  const departRafRef = useRef<number | null>(null);

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
    // Le bruit du moteur démarre à la fin de la fermeture du coffre
    // (CLOSING_DURATION_MS) et tourne jusqu'à la fin de l'animation.
    window.setTimeout(() => {
      const audioDurationMs = DEPART_DELAY_MS + DEPART_DURATION_MS;
      void audioManager.playDepartVoiture(audioDurationMs);
    }, CLOSING_DURATION_MS);

    // Après la fermeture du coffre + un délai d'attente, on enchaîne sur le
    // tween visuel de la voiture qui s'éloigne.
    window.setTimeout(() => {
      const startX = camion.garageX;
      const startY = camion.garageY;
      const startScale = camion.garageScale;
      const startedAt = performance.now();

      const tick = (now: number) => {
        const t = Math.min(1, (now - startedAt) / DEPART_DURATION_MS);
        // Ease-in-out cubique pour un mouvement plus fluide.
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        setDepartOverride({
          x: startX + (DEPART_TARGET.x - startX) * eased,
          y: startY + (DEPART_TARGET.y - startY) * eased,
          scale: startScale + (DEPART_TARGET.scale - startScale) * eased,
        });
        // Sur la dernière seconde, fondu d'opacité 1 → 0.
        const fadeStart = (DEPART_DURATION_MS - 1000) / DEPART_DURATION_MS;
        setTruckOpacity(t < fadeStart ? 1 : Math.max(0, (1 - t) / (1 - fadeStart)));
        if (t < 1) {
          departRafRef.current = requestAnimationFrame(tick);
        } else {
          departRafRef.current = null;
          p.onValider();
        }
      };
      departRafRef.current = requestAnimationFrame(tick);
    }, CLOSING_DURATION_MS + DEPART_DELAY_MS);
  };

  useEffect(
    () => () => {
      if (departRafRef.current !== null) {
        cancelAnimationFrame(departRafRef.current);
        departRafRef.current = null;
      }
    },
    [],
  );

  const peutValider = p.coffre.length > 0 && overlaps.size === 0;

  return (
    <>
      {DEV_PANEL && p.onSetNiveauDev && (
        <DevPanel
          niveau={p.niveauCamion}
          visuelId={camion.visuelId}
          x={currentOverride?.x ?? camion.garageX}
          y={currentOverride?.y ?? camion.garageY}
          scale={currentOverride?.scale ?? camion.garageScale}
          onSetNiveauDev={p.onSetNiveauDev}
          onChange={(next) =>
            setDevOverrides((prev) => ({ ...prev, [camion.visuelId]: next }))
          }
        />
      )}
      <CoffreCanvas
        niveauCamion={p.niveauCamion}
        objets={p.coffre}
        overlaps={overlaps}
        closing={closing}
        devOverride={departOverride ?? currentOverride}
        truckOpacity={truckOpacity}
        onMove={p.onMove}
        onRotate={p.onRotate}
        onRetour={p.onRetirer}
      />
      <CarrouselStock stock={p.stock} onPickUp={handlePickUp} />
      {/* Spacer pour libérer la zone occupée par la barre fixed du bas
          (même hauteur que la TabBar du QG). */}
      <div
        style={{ height: "calc(var(--mobile-tabbar-h) + var(--safe-bottom))" }}
        aria-hidden
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: "calc(var(--mobile-tabbar-h) + var(--safe-bottom))",
          paddingLeft: 12,
          paddingRight: 12,
          paddingBottom: "var(--safe-bottom)",
          background: "var(--forest-800)",
          // Liseré doré en intersection avec la partie supérieure (mirroir du header BROC).
          borderTop: "2px solid var(--brass-500)",
          boxShadow: "0 -1px 0 var(--brass-300), 0 -8px 16px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          zIndex: 50,
        }}
      >
        {overlaps.size > 0 && !closing && (
          <p
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: -22,
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 11,
              color: "var(--vermillion-600)",
              textAlign: "center",
              margin: 0,
            }}
          >
            Réarrangez le coffre — certains objets ne tiennent pas.
          </p>
        )}
        <button
          type="button"
          onClick={p.onAnnuler}
          disabled={closing}
          style={{
            flex: 1,
            height: "calc(100% - 8px)",
            border: "1px solid var(--brass-500)",
            background: "transparent",
            color: "var(--brass-300)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            opacity: closing ? 0.4 : 1,
            cursor: closing ? "not-allowed" : "pointer",
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
            height: "calc(100% - 8px)",
            border: "1px solid var(--brass-500)",
            background:
              peutValider && !closing ? "var(--brass-500)" : "transparent",
            color:
              peutValider && !closing ? "var(--forest-800)" : "var(--ink-500)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontWeight: 700,
            cursor: peutValider && !closing ? "pointer" : "not-allowed",
          }}
        >
          {closing ? "Fermeture…" : "Valider le chargement"}
        </button>
      </div>
    </>
  );
}
