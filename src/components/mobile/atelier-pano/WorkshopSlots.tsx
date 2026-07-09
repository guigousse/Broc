"use client";

import { useRouter } from "next/navigation";
import { useLangue } from "@/lib/i18n/LangueContext";
import { Hourglass } from "lucide-react";
import type { CSSProperties } from "react";
import { ItemImage } from "@/components/ui/ItemImage";
import { useGameActions, useGameStateOnly } from "@/context/GameContext";
import { useAtelierSlotCoord } from "@/components/mobile/qg/dev/QgEditContext";
import { getCapaciteAtelier } from "@/data/atelier";
import { estPret, restantMs } from "@/lib/restauration";
import { nomObjet } from "@/lib/i18n/contenu";
import type { Objet } from "@/types/game";
import { ATELIER_SLOT_GAP_VW } from "./slotsLayout";

/**
 * Slots de restauration affichés au-dessus de l'établi dans le panorama
 * unifié. Position pilotée par `ATELIER_SLOT_LAYOUT["atelier-slot"]`, éditable
 * via l'outil QG edit (`?qgedit=1`). Coords absolues dans le panorama (shift
 * +300vw inclus) — rendu comme enfant direct d'UnifiedPanorama.
 *
 * Trois états par slot :
 *   - vide     : cadre pointillé laiton + libellé "libre".
 *   - en cours : PNG de l'objet + voile sombre + badge sablier "Xj".
 *                Tap → /atelier/gerer.
 *   - prêt     : PNG sans voile + bordure verte pulsante + pill "Récupérer".
 *                Tap → recupererObjetRestaure → l'objet réintègre le stock.
 *
 * Nombre de slots = getCapaciteAtelier(niveauAtelier) (1/2/3).
 */
export function WorkshopSlots() {
  const router = useRouter();
  const { state } = useGameStateOnly();
  const { recupererObjetRestaure, tempsConfiance } = useGameActions();
  const slotCoord = useAtelierSlotCoord("atelier-slot");

  if (!state) return null;

  const now = tempsConfiance() ?? Date.now();
  const capacite = getCapaciteAtelier(state.niveauAtelier);
  const enCours: Objet[] = state.inventaireJoueur.filter(
    (o) => o.enRestauration,
  );
  const occupants: (Objet | null)[] = Array.from({ length: capacite }, (_, i) =>
    enCours[i] ?? null,
  );

  const { left, bottom, width } = slotCoord;

  return (
    <>
      {occupants.map((objet, i) => {
        const slotLeft = left + i * (width + ATELIER_SLOT_GAP_VW);
        const style: CSSProperties = {
          position: "absolute",
          left: `${slotLeft}vw`,
          bottom: `${bottom}%`,
          width: `${width}vw`,
          height: `${width}vw`,
          pointerEvents: "auto",
          // Au-dessus des chats baladeurs (zIndex 2) et hotspots.
          zIndex: 5,
        };
        return (
          <div key={`slot-${i}`} style={style}>
            {objet ? (
              <OccupiedSlot
                objet={objet}
                now={now}
                onTapEnCours={() => router.push("/atelier/gerer")}
                onRecuperer={() => recupererObjetRestaure(objet.id)}
              />
            ) : (
              <EmptySlot onTap={() => router.push("/atelier/gerer")} />
            )}
          </div>
        );
      })}
    </>
  );
}

function EmptySlot({ onTap }: { onTap: () => void }) {
  const { d } = useLangue();
  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        width: "100%",
        height: "100%",
        border: "2px dashed var(--brass-500)",
        background: "rgba(255, 250, 240, 0.7)",
        borderRadius: 4,
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--brass-700)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        padding: 0,
        margin: 0,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
      aria-label={d.qg.ouvrirAtelierSlotLibre}
    >
      {d.qg.slotLibre}
    </button>
  );
}

interface OccupiedSlotProps {
  objet: Objet;
  now: number;
  onTapEnCours: () => void;
  onRecuperer: () => void;
}

/** Libellé compact du temps restant : « 3h », « 12min » ou « <1min ». */
function formatRestant(ms: number): string {
  const min = Math.ceil(ms / 60000);
  if (min <= 0) return "<1min";
  if (min < 60) return `${min}min`;
  return `${Math.ceil(min / 60)}h`;
}

function OccupiedSlot({
  objet,
  now,
  onTapEnCours,
  onRecuperer,
}: OccupiedSlotProps) {
  const { d, tr, locale } = useLangue();
  const enRest = objet.enRestauration!;
  const ready = estPret(enRest, now);
  const restant = formatRestant(restantMs(enRest, now));
  const nom = nomObjet(objet, locale);

  const wrapper: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    border: ready
      ? "2px solid var(--forest-700)"
      : "1.5px solid var(--brass-700)",
    background: "rgba(255, 250, 240, 0.6)",
    borderRadius: 4,
    padding: 0,
    margin: 0,
    overflow: "hidden",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    animation: ready
      ? "broc-slot-ready-pulse 1.6s ease-in-out infinite"
      : undefined,
  };

  return (
    <button
      type="button"
      onClick={ready ? onRecuperer : onTapEnCours}
      aria-label={
        ready
          ? tr(d.inventaire.recupererAria, { nom })
          : tr(d.inventaire.enRestaurationAria, { nom, restant })
      }
      style={wrapper}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: ready ? 1 : 0.85,
        }}
      >
        <ItemImage
          templateId={objet.templateId}
          categorie={objet.categorie}
          fit="contain"
          fallbackIconSize={24}
          padded
        />
      </div>
      {!ready && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(76, 60, 40, 0.28)",
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 3,
          bottom: 3,
          padding: "2px 5px",
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          background: ready ? "var(--forest-700)" : "rgba(0,0,0,0.6)",
          color: "var(--paper-100)",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.05em",
          borderRadius: 3,
          lineHeight: 1,
        }}
      >
        {ready ? "✓" : (
          <>
            <Hourglass size={10} strokeWidth={2} aria-hidden />
            {restant}
          </>
        )}
      </div>
      {ready && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            bottom: 4,
            transform: "translateX(-50%)",
            padding: "2px 6px",
            background: "var(--forest-800)",
            color: "var(--paper-100)",
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            borderRadius: 3,
            border: "1px solid var(--brass-500)",
            whiteSpace: "nowrap",
            lineHeight: 1.2,
          }}
        >
          Récupérer
        </div>
      )}
    </button>
  );
}
