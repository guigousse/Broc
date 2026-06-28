"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { CategoriePicker } from "@/components/mobile/CategoriePicker";
import { CollectionGrid } from "@/components/CollectionGrid";
import { ColonnesSlider } from "@/components/mobile/ColonnesSlider";
import { useColonnesCollection } from "@/lib/useColonnesCollection";
import { CollectionDetailOverlay } from "@/components/mobile/CollectionDetailOverlay";
import { DonationPickerSheet } from "@/components/mobile/DonationPickerSheet";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { stockageEstPlein } from "@/lib/stockage";
import { valeurDonation } from "@/lib/collection";
import type { CategorieObjet, CollectionSlot, Objet } from "@/types/game";

interface CollectionGridOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function CollectionGridOverlay({ open, onClose }: CollectionGridOverlayProps) {
  const {
    state,
    donnerACollection,
    retirerDeCollection,
    marquerVuDansCollection,
  } = useGame();
  const { toast } = useToast();
  const [filtre, setFiltre] = useState<CategorieObjet | null>(null);
  const [slotActif, setSlotActif] = useState<CollectionSlot | null>(null);
  const [pickerOuvert, setPickerOuvert] = useState(false);
  const [objetADonner, setObjetADonner] = useState<Objet | null>(null);
  const [colonnes, setColonnes] = useColonnesCollection();

  const slotsFiltres: CollectionSlot[] = useMemo(() => {
    if (!state) return [];
    if (filtre) return state.collection[filtre] ?? [];
    return CATEGORIES.flatMap((c) => state.collection[c] ?? []);
  }, [state, filtre]);

  const comptes = useMemo(() => {
    const acc: Partial<Record<CategorieObjet, number>> = {};
    if (!state) return acc;
    for (const c of CATEGORIES)
      acc[c] = (state.collection[c] ?? []).filter((s) => s.donation !== null).length;
    return acc;
  }, [state]);

  const totauxParCat = useMemo(() => {
    const acc: Partial<Record<CategorieObjet, number>> = {};
    if (!state) return acc;
    for (const c of CATEGORIES) acc[c] = (state.collection[c] ?? []).length;
    return acc;
  }, [state]);

  const valeursParCat = useMemo(() => {
    const acc: Partial<Record<CategorieObjet, number>> = {};
    if (!state) return acc;
    for (const c of CATEGORIES) {
      acc[c] = (state.collection[c] ?? []).reduce(
        (s, slot) => s + (slot.donation?.valeur ?? 0),
        0,
      );
    }
    return acc;
  }, [state]);

  const candidats = useMemo(() => {
    if (!state || !slotActif) return [];
    return state.inventaireJoueur.filter((o) => o.templateId === slotActif.templateId);
  }, [state, slotActif]);

  const enStockIds = useMemo(
    () => new Set((state?.inventaireJoueur ?? []).map((o) => o.templateId)),
    [state],
  );

  if (!open || !state) return null;

  const nouveautesParCat = CATEGORIES.reduce(
    (acc, c) => {
      acc[c] = (state.collection[c] ?? []).some(
        (s) => s.vu && s.vuDansCollection === false,
      );
      return acc;
    },
    {} as Record<CategorieObjet, boolean>,
  );

  const labelGauche = filtre ?? "Total";
  const valeurAffichee = filtre
    ? (valeursParCat[filtre] ?? 0)
    : Object.values(valeursParCat).reduce((s, v) => s + v, 0);
  const plein = stockageEstPlein(state);

  return (
    <>
      <div
        role="dialog"
        aria-label="Collection"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "var(--wood-light)",
          display: "flex",
          flexDirection: "column",
          paddingTop: "var(--safe-top)",
          paddingBottom: "var(--safe-bottom)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "10px 12px",
            background: "var(--paper)",
            borderBottom: "2px solid var(--brass-500)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
            }}
          >
            Collection
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              marginLeft: "auto",
            }}
          >
            {labelGauche} · {valeurAffichee} €
          </span>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            style={{
              display: "grid",
              placeItems: "center",
              width: 34,
              height: 34,
              border: "1px solid var(--brass-500)",
              background: "transparent",
              cursor: "pointer",
              color: "var(--forest-800)",
            }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: "6px 12px 0" }}>
          <CategoriePicker
            selection={filtre}
            onChange={setFiltre}
            comptesParCat={comptes}
            total={Object.values(comptes).reduce((s, v) => s + (v ?? 0), 0)}
            totauxParCat={totauxParCat}
            totalGlobal={Object.values(totauxParCat).reduce((s, v) => s + (v ?? 0), 0)}
            nouveautesParCat={nouveautesParCat}
          />
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "12px 0 56px",
          }}
        >
          <CollectionGrid
            slots={slotsFiltres}
            colonnes={colonnes}
            enStockIds={enStockIds}
            onTap={(s) => {
              if (s.vu && s.vuDansCollection === false) {
                marquerVuDansCollection(s.templateId);
              }
              setSlotActif(s);
            }}
          />
        </div>
        <ColonnesSlider value={colonnes} onChange={setColonnes} />
      </div>

      <CollectionDetailOverlay
        open={slotActif !== null && !pickerOuvert}
        onClose={() => setSlotActif(null)}
        slot={slotActif}
        candidatsCount={candidats.length}
        retirerDisabled={plein}
        onAjouter={() => setPickerOuvert(true)}
        onRetirer={() => {
          if (!slotActif?.donation) return;
          const res = retirerDeCollection(slotActif.templateId);
          if (res.ok) {
            setSlotActif(null);
            toast("Repris dans le stock", { type: "info" });
          }
        }}
      />
      <DonationPickerSheet
        open={pickerOuvert}
        onClose={() => setPickerOuvert(false)}
        slot={slotActif}
        candidats={candidats}
        onDonner={(objetId) => {
          const objet = candidats.find((o) => o.id === objetId) ?? null;
          setObjetADonner(objet);
        }}
        retirerDisabled={plein}
      />
      <ConfirmModal
        open={objetADonner !== null}
        onClose={() => setObjetADonner(null)}
        onConfirm={() => {
          if (!objetADonner) return;
          const valeur = valeurDonation(
            objetADonner.etat,
            objetADonner.prixReferenceReel,
          );
          const res = donnerACollection(objetADonner.id);
          if (res.ok) {
            setPickerOuvert(false);
            setSlotActif(null);
            toast(`Donné à la collection — +${valeur} € de valeur`, {
              type: "succes",
            });
          }
        }}
        titre="Donner à la collection"
        confirmLabel="Donner"
      >
        {objetADonner && (
          <>
            « {objetADonner.nom} » ({objetADonner.etat}) quittera votre stock et
            rejoindra la collection pour{" "}
            {valeurDonation(objetADonner.etat, objetADonner.prixReferenceReel)} €
            de valeur.
            {slotActif?.donation
              ? " L'exemplaire déjà exposé reviendra dans votre inventaire."
              : ""}
          </>
        )}
      </ConfirmModal>
    </>
  );
}
