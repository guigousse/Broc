"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { ItemImage } from "@/components/ui/ItemImage";
import { useGameActions, useGameStateOnly } from "@/context/GameContext";
import { getCapaciteAtelier } from "@/data/atelier";
import type { Objet } from "@/types/game";
import { ATELIER_LAYOUT } from "./layout";

/**
 * Slots de restauration affichés au-dessus de l'établi dans le panorama.
 *
 * Trois états par slot :
 *   - vide     : cadre laiton translucide + libellé "libre".
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
  const { recupererObjetRestaure } = useGameActions();

  if (!state) return null;

  const capacite = getCapaciteAtelier(state.niveauAtelier);
  const enCours: Objet[] = state.inventaireJoueur.filter((o) => o.enRestauration);
  // Slots affichés = liste fixe de longueur `capacite`, remplie en ordre par
  // les objets en cours. Les slots restants sont vides.
  const occupants: (Objet | null)[] = Array.from({ length: capacite }, (_, i) =>
    enCours[i] ?? null,
  );

  const { centerLeft, bottom, slotSize, gap } = ATELIER_LAYOUT.slotsRangee;
  const totalWidth = capacite * slotSize + (capacite - 1) * gap;
  const startLeft = centerLeft - totalWidth / 2;

  return (
    <>
      {occupants.map((objet, i) => {
        const left = startLeft + i * (slotSize + gap);
        const style: CSSProperties = {
          position: "absolute",
          left: `${left}vw`,
          bottom: `${bottom}%`,
          width: `${slotSize}vw`,
          height: `${slotSize}vw`,
          pointerEvents: "auto",
        };
        return (
          <div key={`slot-${i}`} style={style}>
            {objet ? (
              <OccupiedSlot
                objet={objet}
                jourActuel={state.jourActuel}
                onTapEnCours={() => router.push("/atelier/gerer")}
                onRecuperer={() => recupererObjetRestaure(objet.id)}
              />
            ) : (
              <EmptySlot />
            )}
          </div>
        );
      })}
    </>
  );
}

function EmptySlot() {
  return (
    <div
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
      }}
      aria-label="Slot atelier libre"
    >
      libre
    </div>
  );
}

interface OccupiedSlotProps {
  objet: Objet;
  jourActuel: number;
  onTapEnCours: () => void;
  onRecuperer: () => void;
}

function OccupiedSlot({
  objet,
  jourActuel,
  onTapEnCours,
  onRecuperer,
}: OccupiedSlotProps) {
  const fin = objet.enRestauration!.jourFin;
  const ready = jourActuel >= fin;
  const restant = Math.max(1, fin - jourActuel);

  const wrapper: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    border: ready ? "2px solid var(--forest-700)" : "1.5px solid var(--brass-700)",
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
          ? `Récupérer ${objet.nom}`
          : `${objet.nom} en restauration, ${restant} jour${restant > 1 ? "s" : ""} restant${restant > 1 ? "s" : ""}`
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
          padding: "1px 4px",
          background: ready ? "var(--forest-700)" : "rgba(0,0,0,0.55)",
          color: "var(--paper-100)",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.05em",
          borderRadius: 3,
          lineHeight: 1.2,
        }}
      >
        {ready ? "✓" : `⏳ ${restant}j`}
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
