"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { CategoriePicker } from "@/components/mobile/CategoriePicker";
import { CollectionGrid } from "@/components/CollectionGrid";
import { CollectionDetailOverlay } from "@/components/mobile/CollectionDetailOverlay";
import { DonationPickerSheet } from "@/components/mobile/DonationPickerSheet";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { progressionGlobale } from "@/lib/collection";
import { stockageEstPlein } from "@/lib/stockage";
import type { CategorieObjet, CollectionSlot } from "@/types/game";

export default function CollectionPage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    donnerACollection,
    retirerDeCollection,
    marquerVuDansCollection,
  } = useGame();
  const [filtre, setFiltre] = useState<CategorieObjet | null>(null);
  const [slotActif, setSlotActif] = useState<CollectionSlot | null>(null);
  const [pickerOuvert, setPickerOuvert] = useState(false);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

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

  const candidats = useMemo(() => {
    if (!state || !slotActif) return [];
    return state.inventaireJoueur.filter((o) => o.templateId === slotActif.templateId);
  }, [state, slotActif]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          fontSize: 12,
        }}
      >
        — consultation de la collection…
      </main>
    );
  }

  const global = progressionGlobale(state.collection);

  // valeurParCategorie(collection, cat) takes one cat at a time — compute map inline
  const valeurs = CATEGORIES.reduce(
    (acc, c) => {
      acc[c] = (state.collection[c] ?? []).reduce(
        (s, slot) => s + (slot.donation?.valeur ?? 0),
        0,
      );
      return acc;
    },
    {} as Record<CategorieObjet, number>,
  );

  const breakdown = CATEGORIES.filter((c) => (valeurs[c] ?? 0) > 0)
    .sort((a, b) => (valeurs[b] ?? 0) - (valeurs[a] ?? 0))
    .slice(0, 3)
    .map((c) => `${c} ${Math.round(valeurs[c] ?? 0)} €`)
    .join(" · ");

  // Totaux par catégorie (slots possibles, peu importe l'état découvert/donné)
  const totauxParCat = CATEGORIES.reduce(
    (acc, c) => {
      acc[c] = (state.collection[c] ?? []).length;
      return acc;
    },
    {} as Record<CategorieObjet, number>,
  );

  // Sélection courante : valeur + libellé du bandeau
  const bandeauLabel = filtre ? filtre : "Valeur totale";
  const bandeauValeur = filtre ? valeurs[filtre] ?? 0 : global.valeur;

  const plein = stockageEstPlein(state);

  return (
  <>
    <MobileLayout
      header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
      stickyTop={
        <StickyTop>
          <div
            style={{
              border: "1px solid var(--brass-500)",
              padding: "8px 12px",
              background: "var(--paper-100)",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
              }}
            >
              — {bandeauLabel} —
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                color: "var(--forest-800)",
                letterSpacing: "0.04em",
              }}
            >
              {Math.round(bandeauValeur).toLocaleString("fr-FR")} €
            </div>
            {!filtre && breakdown && (
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 11.5,
                  color: "var(--ink-500)",
                  marginTop: 4,
                }}
              >
                {breakdown}
              </div>
            )}
          </div>
          <CategoriePicker
            selection={filtre}
            onChange={setFiltre}
            comptesParCat={comptes}
            total={global.donnees}
            totauxParCat={totauxParCat}
            totalGlobal={CATEGORIES.reduce(
              (s, c) => s + (state.collection[c]?.length ?? 0),
              0,
            )}
          />
        </StickyTop>
      }
    >
      <CollectionGrid
        slots={slotsFiltres}
        onTap={(s) => {
          if (s.vu && s.vuDansCollection === false) {
            marquerVuDansCollection(s.templateId);
          }
          setSlotActif(s);
        }}
      />
    </MobileLayout>
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
        if (res.ok) setSlotActif(null);
      }}
    />
    <DonationPickerSheet
      open={pickerOuvert}
      onClose={() => setPickerOuvert(false)}
      slot={slotActif}
      candidats={candidats}
      onDonner={(objetId) => {
        const res = donnerACollection(objetId);
        if (res.ok) {
          setPickerOuvert(false);
          setSlotActif(null);
        }
      }}
      retirerDisabled={plein}
    />
  </>
  );
}
