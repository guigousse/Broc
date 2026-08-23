"use client";

/**
 * Bande d'onglets en tête de la Réserve (Stockage | Atelier).
 *
 * Elle REMPLACE le titre centré `— STOCKAGE —` de la carte du haut au lieu
 * de s'y ajouter : le titre devient redondant dès qu'un onglet porte le même
 * mot, et une barre de plus coûterait ~34 px sur un écran déjà serré entre le
 * header et la barre du bas.
 *
 * L'onglet actif est du même papier que la carte qu'il coiffe et n'a PAS de
 * bordure basse : l'onglet et la carte ne font qu'un. L'inactif est en retrait
 * (papier plus sombre) et porte le trait.
 *
 * Le cadenas de l'Atelier vivait dans la barre du bas ; il vit ici depuis la
 * fusion, avec exactement le même vocabulaire (icône grisée, cadenas laiton,
 * opacité réduite, un toast au tap et aucune navigation) pour que le joueur
 * reconnaisse la règle.
 */

import { Lock } from "lucide-react";
import type { CSSProperties } from "react";
import { Badge } from "@/components/mobile/Badge";
import { useLangue } from "@/lib/i18n/LangueContext";

export type OngletReserve = "stockage" | "atelier";

interface ReserveTabsProps {
  actif: OngletReserve;
  /** Faux tant que le joueur n'a pas sa première compétence Réparer. */
  atelierOuvert: boolean;
  /** Restaurations prêtes à récupérer. Ignoré si l'atelier est fermé. */
  badgeAtelier: number;
  onChoisir: (onglet: OngletReserve) => void;
  onVerrou: () => void;
}

const bande: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  // Colle la bande aux bords de la carte : les onglets touchent son liseré.
  margin: "-8px -10px 8px",
};

function ongletStyle(actif: boolean, verrouille: boolean): CSSProperties {
  return {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: "var(--tap-min)",
    padding: "8px 6px",
    border: "none",
    // L'actif ne porte pas de trait bas : il se fond dans la carte.
    borderBottom: actif ? "none" : "1px solid var(--brass-500)",
    background: actif ? "var(--paper-100)" : "var(--paper-200)",
    color: actif ? "var(--forest-800)" : "var(--brass-700)",
    fontFamily: "var(--font-display)",
    fontSize: 12,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    cursor: "pointer",
    opacity: verrouille ? 0.55 : 1,
    minWidth: 0,
  };
}

const cadenas: CSSProperties = {
  color: "var(--brass-700)",
  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
  flexShrink: 0,
};

export function ReserveTabs({
  actif,
  atelierOuvert,
  badgeAtelier,
  onChoisir,
  onVerrou,
}: ReserveTabsProps) {
  const { d } = useLangue();
  // Aucun badge sous un cadenas : un compteur clignoterait derrière une porte
  // fermée (même règle que la barre du bas).
  const badge = atelierOuvert ? badgeAtelier : 0;

  return (
    <div style={bande}>
      <button
        type="button"
        aria-current={actif === "stockage" ? "page" : undefined}
        aria-label={d.chrome.onglets.stockage}
        onClick={() => {
          if (actif !== "stockage") onChoisir("stockage");
        }}
        style={ongletStyle(actif === "stockage", false)}
      >
        {d.chrome.onglets.stockage}
      </button>

      <button
        type="button"
        data-tuto-coach="reserve-onglet-atelier"
        aria-current={actif === "atelier" ? "page" : undefined}
        aria-disabled={atelierOuvert ? undefined : true}
        aria-label={
          atelierOuvert
            ? d.chrome.onglets.atelier
            : `${d.chrome.onglets.atelier} — ${d.chrome.ongletVerrouille}`
        }
        onClick={() => {
          if (!atelierOuvert) {
            onVerrou();
            return;
          }
          if (actif !== "atelier") onChoisir("atelier");
        }}
        style={ongletStyle(actif === "atelier", !atelierOuvert)}
      >
        {!atelierOuvert && <Lock size={13} strokeWidth={2.6} style={cadenas} />}
        {d.chrome.onglets.atelier}
        {badge > 0 && <Badge count={badge} />}
      </button>
    </div>
  );
}
