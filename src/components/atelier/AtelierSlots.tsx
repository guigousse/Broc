"use client";

import type { CSSProperties } from "react";
import { Lock, MonitorPlay, Plus } from "lucide-react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import {
  estPret,
  restantMs,
  formatDuree,
  angleVoileDeg,
  peutTerminerImmediat,
} from "@/lib/restauration";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";
import type { Objet } from "@/types/game";

/**
 * Rangée des 3 emplacements de restauration, affichée entre la bande et le
 * panneau de la fenêtre flottante Atelier. Composant présentational : les
 * achats/tiroirs vivent dans la page.
 * États d'un carré : verrouillé (cadenas + prix sur le prochain achetable),
 * vide (+), occupé (sticker sous un voile vert qui se retire au fil du temps,
 * décompte au centre), prêt (sticker nu + pastille « Récupérer » pulsante).
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
  /** Accélération par pub récompensée (fenêtre des 30 dernières minutes). */
  onAccelerer: (objet: Objet) => void;
  /** Une pub est déjà en vol : la pastille se fige le temps de la regarder. */
  pubEnCours: boolean;
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

/** Enveloppe d'un établi occupé : le carré, plus la pile posée par-dessus. */
const cellule: CSSProperties = {
  position: "relative",
  width: 114,
  height: 114,
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

/**
 * Voile de l'établi : un secteur vert qui part de midi et couvre le temps
 * RESTANT dans le sens horaire — la part découverte grandit donc dans
 * l'antihoraire depuis midi, comme une aiguille qui balaie le carré. À
 * `finMs` l'angle vaut 0° : il n'y a rien à retirer au passage au « prêt »,
 * le voile s'est effacé tout seul.
 *
 * L'angle passe par une variable CSS plutôt que par une chaîne recomposée :
 * une seule valeur à écrire par tick, et elle reste lisible à la mesure.
 */
const voileStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "inherit",
  pointerEvents: "none",
  background:
    "conic-gradient(from 0deg, rgba(85,117,79,0.72) 0 var(--voile-angle), transparent var(--voile-angle) 360deg)",
};

/**
 * La pile centrale du carré : décompte (ou « Récupérer ») et, dans les 30
 * dernières minutes, la pastille pub juste dessous. Les deux sont centrés
 * ENSEMBLE, d'où la colonne plutôt que deux calages indépendants.
 *
 * Elle est posée PAR-DESSUS le bouton du carré et ne capte rien : seule la
 * pastille pub y reprend les taps. Un `<button>` dans un `<button>` serait du
 * HTML invalide — c'est ce qui vaut à la cellule son enveloppe.
 */
const pileCentre: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  pointerEvents: "none",
};

/** Assise commune des pastilles de la pile : même galet, trois robes. */
const pastilleCentre: CSSProperties = {
  borderRadius: 999,
  whiteSpace: "nowrap",
};

const decompteStyle: CSSProperties = {
  ...pastilleCentre,
  fontFamily: "var(--font-mono)",
  fontSize: 15,
  letterSpacing: "0.06em",
  color: "var(--paper-100)",
  background: "rgba(28,22,12,0.62)",
  border: "1px solid rgba(241,227,191,0.35)",
  padding: "3px 9px",
};

function pastillePub(pubEnCours: boolean): CSSProperties {
  return {
    ...pastilleCentre,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontFamily: "var(--font-mono)",
    fontSize: 9,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--paper-100)",
    background: "var(--brass-600)",
    border: "1px solid var(--brass-700)",
    padding: "4px 8px",
    pointerEvents: "auto",
    cursor: pubEnCours ? "not-allowed" : "pointer",
    opacity: pubEnCours ? 0.6 : 1,
  };
}

// `broc-slot-ready-pulse` : halo vert qui s'écarte, écrit pour cet état exact.
const recupererStyle: CSSProperties = {
  ...pastilleCentre,
  fontFamily: "var(--font-display)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  background: "var(--forest-800)",
  border: "1px solid var(--forest-700)",
  padding: "7px 12px",
  animation: "broc-slot-ready-pulse 1.8s ease-in-out infinite",
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
  onAccelerer,
  pubEnCours,
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
        const accelerable =
          !!objet.enRestauration &&
          peutTerminerImmediat(objet.enRestauration, now);
        return (
          <div key={idx} style={cellule}>
            <button
              type="button"
              // Repère stable du carré : la pile centrale (décompte, pastilles)
              // vit HORS du bouton depuis qu'elle porte un bouton à elle.
              data-etabli-id={objet.id}
              style={{ ...carreBase, borderStyle: "solid", width: "100%", height: "100%" }}
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
              {!pret && objet.enRestauration && (
                <span
                  data-testid="voile-restauration"
                  style={{
                    ...voileStyle,
                    ["--voile-angle" as string]: `${angleVoileDeg(
                      objet.enRestauration,
                      now,
                    )}deg`,
                  }}
                />
              )}
            </button>
            <div style={pileCentre}>
              {pret ? (
                <span data-testid="pastille-recuperer" style={recupererStyle}>
                  {d.inventaire.recuperer}
                </span>
              ) : (
                objet.enRestauration && (
                  <span style={decompteStyle}>
                    {formatDuree(restantMs(objet.enRestauration, now))}
                  </span>
                )
              )}
              {accelerable && (
                <button
                  type="button"
                  data-testid="pastille-pub"
                  disabled={pubEnCours}
                  onClick={() => onAccelerer(objet)}
                  style={pastillePub(pubEnCours)}
                  aria-label={d.inventaire.terminerPub}
                >
                  <MonitorPlay size={12} strokeWidth={2.2} />
                  {d.inventaire.pubCourt}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
