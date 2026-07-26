"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NiveauCamion, Objet, ObjetEnVitrine } from "@/types/game";
import { getCamion, getProchainCamion, getScaleCoffre } from "@/data/camion";
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
import { getItemThumbUrl } from "@/lib/itemImages";
import { getCoffreAssets } from "@/lib/coffreAssets";
import { audioManager } from "@/lib/audio/audioManager";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomCamion } from "@/lib/i18n/contenu";
import {
  RELEVE_BASCULE_MS,
  RELEVE_DUREE_MS,
  RELEVE_FONDU_ENTREE_MS,
  RELEVE_FONDU_SORTIE_MS,
  RELEVE_PAUSE_MS,
  opaciteReleve,
} from "@/lib/releveVehicule";
import { CoffreCanvas } from "./CoffreCanvas";
import { BoutonConcession } from "./BoutonConcession";
import { ConcessionSheet } from "./ConcessionSheet";
import { CarrouselStock } from "./CarrouselStock";
import { DevPanel } from "./DevPanel";
import { OUTILS_DEV } from "@/lib/outilsDev";

// Dev only — panneau dev (switcher camion + sliders position/scale). Verrouillé
// hors développement par OUTILS_DEV : jamais visible en prod / TestFlight /
// App Store (constante repliée à false à la compilation, code éliminé).
const DEV_PANEL = OUTILS_DEV;

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
  /** Tutoriel : main pointeuse sur le carrousel (coffre vide) puis sur Valider. */
  tuto?: boolean;
}

function buildSolidMask(size: number): Uint8Array {
  const bits = new Uint8Array(size * size);
  bits.fill(1);
  return bits;
}

export function CoffreChargement(p: Props) {
  const { d, tr, locale } = useLangue();
  const camion = getCamion(p.niveauCamion);
  const assets = getCoffreAssets(camion.visuelId);

  const [maskTick, setMaskTick] = useState(0);
  const [trunkMask, setTrunkMask] = useState<TrunkMask | null>(null);
  const [closing, setClosing] = useState(false);
  const [sheetOuverte, setSheetOuverte] = useState(false);
  const [bandeauReleve, setBandeauReleve] = useState<string | null>(null);
  const releveRafRef = useRef<number | null>(null);
  const releveTimersRef = useRef<number[]>([]);

  // Pré-chargement des alpha-masks des items présents.
  useEffect(() => {
    let cancelled = false;
    const tasks = p.coffre
      .map((ov) => getItemThumbUrl(ov.objet.templateId))
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
      const src = getItemThumbUrl(ov.objet.templateId);
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

  // Ajout depuis le carrousel (retour device 2026-07-17) : tap simple →
  // centre du coffre ; maintien/tirer → l'objet suit le doigt (fantôme) et
  // se dépose là où on le lâche (relâché hors du coffre → annulé).
  const conteneurCoffreRef = useRef<HTMLDivElement | null>(null);
  const [dragObjet, setDragObjet] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const handleTap = (objetId: string) => {
    p.onAjouter(objetId, 0.5, 0.5);
  };

  const handleDragStart = (objetId: string, x: number, y: number) => {
    dragIdRef.current = objetId;
    setDragObjet({ id: objetId, x, y });
  };

  const handleDragMove = (x: number, y: number) => {
    setDragObjet((d) => (d ? { ...d, x, y } : d));
  };

  const handleDragEnd = (x: number, y: number) => {
    const id = dragIdRef.current;
    dragIdRef.current = null;
    setDragObjet(null);
    if (!id) return;
    const rect = conteneurCoffreRef.current?.getBoundingClientRect();
    if (
      rect &&
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    ) {
      const px = Math.max(0.05, Math.min(0.95, (x - rect.left) / rect.width));
      const py = Math.max(0.05, Math.min(0.95, (y - rect.top) / rect.height));
      p.onAjouter(id, px, py);
    }
  };

  // Pendant le drag : bloque le scroll natif (carrousel/page) — sans quoi
  // iOS reprend la main sur les mouvements horizontaux et coupe le geste.
  const dragEnCours = dragObjet !== null;
  useEffect(() => {
    if (!dragEnCours) return;
    const bloque = (ev: TouchEvent) => ev.preventDefault();
    document.addEventListener("touchmove", bloque, { passive: false });
    return () => document.removeEventListener("touchmove", bloque);
  }, [dragEnCours]);

  /** Coupe la séquence en cours et rétablit l'état final. */
  const arreterReleve = useCallback(() => {
    if (releveRafRef.current !== null) {
      cancelAnimationFrame(releveRafRef.current);
      releveRafRef.current = null;
    }
    for (const id of releveTimersRef.current) window.clearTimeout(id);
    releveTimersRef.current = [];
    setTruckOpacity(1);
    setBandeauReleve(null);
  }, []);

  /**
   * Relève du véhicule. `onUpgrade` n'est PAS appelé au clic mais à
   * RELEVE_BASCULE_MS, quand l'opacité est nulle : sinon l'état basculerait
   * tout de suite et c'est le nouveau véhicule qu'on verrait s'effacer.
   */
  const lancerReleve = useCallback(
    (niveauCible: NiveauCamion, nom: string, places: number) => {
      // Une relève qui démarre coupe d'abord celle qui tournerait encore
      // (double-tap sur Acheter, pancarte rouverte pendant la relève) :
      // sans ça, la boucle rAF précédente continue à piloter l'opacité en
      // roue libre, hors de tout contrôle, en plus d'empiler ses minuteurs.
      arreterReleve();
      const debut = performance.now();

      releveTimersRef.current.push(
        window.setTimeout(() => p.onUpgrade(niveauCible), RELEVE_BASCULE_MS),
        window.setTimeout(() => {
          setBandeauReleve(tr(d.vente.vehiculeAcquis, { nom, n: places }));
          void audioManager.playDepartVoiture(RELEVE_FONDU_ENTREE_MS);
        }, RELEVE_FONDU_SORTIE_MS + RELEVE_PAUSE_MS),
        window.setTimeout(() => {
          setBandeauReleve(null);
          // Séquence allée à son terme sans saut : les trois minuteurs
          // ci-dessus ont déjà tous été honorés, plus rien à annuler.
          releveTimersRef.current = [];
        }, RELEVE_DUREE_MS + 600),
      );

      const tick = (now: number) => {
        const t = now - debut;
        setTruckOpacity(opaciteReleve(t));
        if (t < RELEVE_DUREE_MS) {
          releveRafRef.current = requestAnimationFrame(tick);
        } else {
          releveRafRef.current = null;
        }
      };
      releveRafRef.current = requestAnimationFrame(tick);
    },
    [arreterReleve, p.onUpgrade, d, tr],
  );

  const handleValider = () => {
    // Le tween de départ capture la géométrie du véhicule au clic (camion
    // courant) : le déclencher pendant une relève le ferait partir de
    // l'ancien véhicule alors que l'état bascule déjà vers le nouveau.
    if (closing || releveRafRef.current !== null) return;
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
      arreterReleve();
    },
    [arreterReleve],
  );

  const peutValider = p.coffre.length > 0 && overlaps.size === 0;

  const prochainCamion = getProchainCamion(p.niveauCamion);
  const prixProchain = prochainCamion?.prixUpgradeVersCeNiveau ?? 0;
  // Le bouton se retire quand il n'y a plus de palier et pendant le tutoriel
  // — la main de guidage désigne déjà le carrousel puis Valider, un second
  // appel du regard brouillerait la leçon. Il reste en place pendant `closing`
  // en revanche : faire disparaître un enfant de la barre au moment où le
  // joueur tape « Valider » ferait sauter la mise en page.
  const concessionVisible = prochainCamion !== null && p.tuto !== true;

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
        conteneurRef={conteneurCoffreRef}
      />
      <CarrouselStock
        stock={p.stock}
        onTap={handleTap}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        tutoMain={p.tuto === true && p.coffre.length === 0}
      />
      {/* Fantôme de drag : l'objet suit le doigt, à la taille qu'il aura
          dans le coffre. */}
      {dragObjet &&
        (() => {
          const obj = p.stock.find((o) => o.id === dragObjet.id);
          if (!obj) return null;
          const tplDrag = getTemplate(obj.templateId);
          const tailleDrag = tplDrag ? tailleDe(tplDrag) : "S";
          const largeurCoffre =
            conteneurCoffreRef.current?.getBoundingClientRect().width ?? 280;
          const cote = getScaleCoffre(tailleDrag, camion.capacitePlaces) * largeurCoffre;
          const src = getItemThumbUrl(obj.templateId);
          return (
            <div
              aria-hidden
              style={{
                position: "fixed",
                left: dragObjet.x,
                top: dragObjet.y,
                width: cote,
                height: cote,
                translate: "-50% -50%",
                pointerEvents: "none",
                zIndex: 200,
                filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.45))",
              }}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : null}
            </div>
          );
        })()}
      {prochainCamion && (
        <ConcessionSheet
          // La barre d'actions du bas (zIndex 50) passe au-dessus du scrim
          // et du corps de la ConcessionSheet (zIndex 40/41 dans
          // BottomSheet) : « Valider » reste tapable fiche ouverte. On
          // dérive donc l'ouverture du même garde que le panneau plutôt
          // que de compter sur un onClose/onAcheter manuel à chaque
          // chemin de sortie (ex. handleValider ne fermait pas la fiche).
          open={sheetOuverte && !closing}
          onClose={() => setSheetOuverte(false)}
          actuel={camion}
          prochain={prochainCamion}
          budget={p.budget}
          onAcheter={() => {
            setSheetOuverte(false);
            lancerReleve(
              prochainCamion.niveau,
              nomCamion(prochainCamion, locale),
              prochainCamion.capacitePlaces,
            );
          }}
        />
      )}
      {bandeauReleve && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // Calque transparent aux pointeurs : sans ça il passe au-dessus
            // de la barre d'actions (zIndex 50) et avale « Valider » ainsi
            // que le drag des objets déjà chargés pendant toute la relève.
            // Seul le bandeau lui-même (ci-dessous) redevient une cible.
            pointerEvents: "none",
            background: "transparent",
          }}
        >
          {/* Le libellé (« Break — 16 places », etc.) nomme déjà le bouton :
              pas d'aria-label, qui l'écraserait et l'appauvrirait. */}
          <button
            type="button"
            onClick={arreterReleve}
            style={{
              pointerEvents: "auto",
              cursor: "pointer",
              // Neutralise le rendu natif d'un <button>.
              appearance: "none",
              WebkitAppearance: "none",
              font: "inherit",
              margin: 0,
              padding: "8px 16px",
              background: "rgba(15,30,22,0.85)",
              border: "1px solid var(--brass-500)",
              borderRadius: 3,
              color: "var(--brass-100)",
              fontFamily: "var(--font-display)",
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {bandeauReleve}
          </button>
        </div>
      )}
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
            {d.vente.reorganiserCoffre}
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
          {d.vente.retourMagasin}
        </button>
        {concessionVisible && (
          <BoutonConcession
            actuel={camion}
            peutPayer={p.budget >= prixProchain}
            inerte={closing}
            onOuvrir={() => setSheetOuverte(true)}
          />
        )}
        <button
          type="button"
          disabled={!peutValider || closing}
          onClick={handleValider}
          className={p.tuto && peutValider && !closing ? "tuto-main" : undefined}
          style={{
            flex: 1,
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
          {closing ? d.vente.fermetureEnCours : d.vente.validerChargement}
        </button>
      </div>
    </>
  );
}
