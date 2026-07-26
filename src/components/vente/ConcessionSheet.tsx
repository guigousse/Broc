"use client";

import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import type { CamionConfig, TailleCoffre } from "@/data/camion";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { getCoffreAssets } from "@/lib/coffreAssets";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { DictionnaireUI } from "@/lib/i18n/ui";
import { nomCamion } from "@/lib/i18n/contenu";

export interface ConcessionSheetProps {
  open: boolean;
  onClose: () => void;
  actuel: CamionConfig;
  prochain: CamionConfig;
  budget: number;
  onAcheter: () => void;
}

const corpsStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
};

/** Rangée « véhicule actuel → véhicule visé », les deux vus de profil. */
const comparatifStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
};

const vignetteStyle: CSSProperties = {
  flex: "1 1 0",
  minWidth: 0,
  maxWidth: 150,
  aspectRatio: "2.3 / 1",
  objectFit: "contain",
};

/** Colonne centrale : la taille visée, puis la flèche juste dessous. */
const passageStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  flex: "0 0 auto",
};

const tailleVisee: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  textAlign: "center",
  whiteSpace: "nowrap",
};

const flecheStyle: CSSProperties = {
  display: "flex",
  color: "var(--brass-700)",
};

const boutonStyle = (peut: boolean): CSSProperties => ({
  width: "100%",
  minHeight: 46,
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-btn)",
  background: peut ? "var(--forest-800)" : "var(--paper-200)",
  color: peut ? "var(--brass-300)" : "var(--ink-300)",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: peut ? "pointer" : "not-allowed",
  opacity: peut ? 1 : 0.5,
});

const manqueStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 12,
  color: "var(--vermillion-600)",
  margin: 0,
};

/** Libellé de la taille de coffre visée. */
const LIBELLE_TAILLE: Record<TailleCoffre, keyof DictionnaireUI["vente"]> = {
  petit: "coffrePetit",
  moyen: "coffreMoyen",
  grand: "coffreGrand",
};

/**
 * Fiche du véhicule suivant : les deux véhicules de profil de part et d'autre
 * d'une flèche, la taille de coffre visée au-dessus, puis le prix et l'achat.
 * Décide seule de l'état de son bouton à partir du budget reçu.
 */
export function ConcessionSheet(p: ConcessionSheetProps) {
  const { d, tr, locale } = useLangue();

  const prix = p.prochain.prixUpgradeVersCeNiveau ?? 0;
  const peut = p.budget >= prix;
  const manque = prix - p.budget;
  const profilActuel = getCoffreAssets(p.actuel.visuelId)?.profil ?? null;
  const profilProchain = getCoffreAssets(p.prochain.visuelId)?.profil ?? null;

  return (
    <BottomSheet
      open={p.open}
      onClose={p.onClose}
      title={nomCamion(p.prochain, locale)}
      // Sans bottomOffset, la sheet (z-index 40) passerait sous la barre
      // d'actions fixe de l'écran de chargement (z-index 50).
      bottomOffset="calc(var(--mobile-tabbar-h) + var(--safe-bottom))"
    >
      <div style={corpsStyle}>
        <div style={comparatifStyle}>
          {profilActuel && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profilActuel}
              alt={nomCamion(p.actuel, locale)}
              draggable={false}
              style={vignetteStyle}
            />
          )}

          <span style={passageStyle}>
            {/* La taille visée plutôt qu'un nombre de places : le rapport
                entre `capacitePlaces` et ce qui tient vraiment n'est pas
                linéaire, un chiffre exact induirait en erreur. */}
            <span style={tailleVisee}>
              {d.vente[LIBELLE_TAILLE[p.prochain.tailleCoffre]]}
            </span>
            <span style={flecheStyle} aria-hidden>
              <ArrowRight size={22} strokeWidth={2} />
            </span>
          </span>

          {profilProchain && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profilProchain}
              alt={nomCamion(p.prochain, locale)}
              draggable={false}
              style={vignetteStyle}
            />
          )}
        </div>

        <button
          type="button"
          disabled={!peut}
          onClick={p.onAcheter}
          style={boutonStyle(peut)}
        >
          {tr(d.vente.acheterVehicule, { prix })}
        </button>

        {!peut && <p style={manqueStyle}>{tr(d.vente.manqueSomme, { somme: manque })}</p>}
      </div>
    </BottomSheet>
  );
}
