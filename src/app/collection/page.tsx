"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { CategoriePicker } from "@/components/mobile/CategoriePicker";
import { PageHeaderBar } from "@/components/mobile/PageHeaderBar";
import { CollectionGrid } from "@/components/CollectionGrid";
import { CollectionDetailOverlay } from "@/components/mobile/CollectionDetailOverlay";
import { DonationPickerSheet } from "@/components/mobile/DonationPickerSheet";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
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

  // Nouveautés non consultées par catégorie (slot vu mais vuDansCollection=false)
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
  const possedeAffiche = filtre
    ? (comptes[filtre] ?? 0)
    : Object.values(comptes).reduce((s, v) => s + (v ?? 0), 0);
  const totalAffiche = filtre
    ? (totauxParCat[filtre] ?? 0)
    : Object.values(totauxParCat).reduce((s, v) => s + (v ?? 0), 0);

  const plein = stockageEstPlein(state);

  return (
  <>
    <MobileLayout
      header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
      stickyTop={
        <StickyTop>
          <PageHeaderBar
            title="Collection"
            left={
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={`${labelGauche} ${valeurAffichee} €`}
              >
                {labelGauche} {valeurAffichee} €
              </div>
            }
            right={
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--brass-700)",
                  letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                }}
              >
                {possedeAffiche}/{totalAffiche}
              </div>
            }
          />
          <div style={{ marginTop: 4 }}>
            <CategoriePicker
              selection={filtre}
              onChange={setFiltre}
              comptesParCat={comptes}
              total={Object.values(comptes).reduce((s, v) => s + (v ?? 0), 0)}
              totauxParCat={totauxParCat}
              totalGlobal={Object.values(totauxParCat).reduce(
                (s, v) => s + (v ?? 0),
                0,
              )}
              nouveautesParCat={nouveautesParCat}
            />
          </div>
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
