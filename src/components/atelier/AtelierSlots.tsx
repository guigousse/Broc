"use client";

import type { CSSProperties } from "react";
import { Lock, Plus } from "lucide-react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { estPret, restantMs, formatDuree } from "@/lib/restauration";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";
import type { Objet } from "@/types/game";

/**
 * Rangée des 3 emplacements de restauration, affichée entre la bande et le
 * panneau de la fenêtre flottante Atelier. Composant présentational : les
 * achats/tiroirs vivent dans la page.
 * États d'un carré : verrouillé (cadenas + prix sur le prochain achetable),
 * vide (+), occupé (sticker + temps restant), prêt (sticker + badge).
 */

interface AtelierSlotsProps {
  slotsDebloques: 0 | 1 | 2 | 3;
  enCours: Objet[];
  now: number;
  prochaineUpgrade: { cout: number } | null;
  onAcheterSlot: () => void;
  onSlotVide: () => void;
  onEnCours: (objet: Objet) => void;
  onRecuperer: (objet: Objet) => void;
}

/* Répartition équidistante : un tiers de la largeur par slot, chaque
   carré centré dans son tiers — les carrés sont indépendants (pas
   d'encadré commun, ils posent sur le fond flouté). */
const rangee: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  placeItems: "center",
};

// 114 = ancien 76 agrandi de 50 %.
const carreBase: CSSProperties = {
  width: 114,
  height: 114,
  display: "grid",
  placeItems: "center",
  position: "relative",
  border: "1px dashed var(--brass-500)",
  borderRadius: "var(--radius-card)",
  background: "var(--paper-200)",
  boxShadow: "0 10px 22px rgba(0,0,0,0.32)",
  padding: 0,
  cursor: "pointer",
};

const carreVerrouille: CSSProperties = {
  ...carreBase,
  opacity: 0.6,
  background: "var(--paper-500)",
};

const prixStyle: CSSProperties = {
  position: "absolute",
  bottom: 6,
  left: 0,
  right: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  color: "var(--forest-800)",
  textAlign: "center",
};

const tempsStyle: CSSProperties = {
  position: "absolute",
  bottom: 2,
  left: 0,
  right: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: "0.06em",
  color: "var(--ink-700)",
  textAlign: "center",
  background: "rgba(241,227,191,0.85)",
  padding: "1px 0",
};

const badgePret: CSSProperties = {
  ...tempsStyle,
  color: "var(--paper-100)",
  background: "var(--forest-700)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
};

export function AtelierSlots({
  slotsDebloques,
  enCours,
  now,
  prochaineUpgrade,
  onAcheterSlot,
  onSlotVide,
  onEnCours,
  onRecuperer,
}: AtelierSlotsProps) {
  const { d, tr, locale } = useLangue();

  return (
    // data-fly-target="travaux" : cible de l'animation de vol quand une
    // restauration démarre (l'objet « entre » dans la rangée de slots).
    <div style={rangee} data-fly-target="travaux">
      {[0, 1, 2].map((idx) => {
        // Verrouillé : au-delà des slots débloqués.
        if (idx >= slotsDebloques) {
          const premierVerrouille = idx === slotsDebloques;
          return (
            <button
              key={idx}
              type="button"
              style={carreVerrouille}
              onClick={onAcheterSlot}
              aria-label={
                premierVerrouille && prochaineUpgrade
                  ? tr(d.inventaire.slotVerrouilleAcheterAria, {
                      cout: prochaineUpgrade.cout,
                    })
                  : d.inventaire.slotVerrouilleAria
              }
            >
              <Lock size={32} strokeWidth={1.6} color="var(--ink-500)" />
              {premierVerrouille && prochaineUpgrade && (
                <span style={prixStyle}>{prochaineUpgrade.cout} €</span>
              )}
            </button>
          );
        }
        const objet = enCours[idx];
        // Vide : débloqué sans restauration mappée.
        if (!objet) {
          return (
            <button
              key={idx}
              type="button"
              style={carreBase}
              onClick={onSlotVide}
              aria-label={d.inventaire.slotVideAria}
            >
              <Plus size={38} strokeWidth={1.6} color="var(--brass-700)" />
            </button>
          );
        }
        const pret = objet.enRestauration
          ? estPret(objet.enRestauration, now)
          : false;
        return (
          <button
            key={idx}
            type="button"
            style={{ ...carreBase, borderStyle: "solid" }}
            onClick={() => (pret ? onRecuperer(objet) : onEnCours(objet))}
            aria-label={tr(
              pret
                ? d.inventaire.slotPretAria
                : d.inventaire.slotEnCoursAria,
              { nom: nomObjet(objet, locale) },
            )}
          >
            <ItemSticker
              templateId={objet.templateId}
              categorie={objet.categorie}
              fill
              tilt={false}
              variant="normal"
              thumb
              eager
            />
            {pret ? (
              <span style={badgePret}>{d.inventaire.pret}</span>
            ) : (
              objet.enRestauration && (
                <span style={tempsStyle}>
                  {formatDuree(restantMs(objet.enRestauration, now))}
                </span>
              )
            )}
          </button>
        );
      })}
    </div>
  );
}
