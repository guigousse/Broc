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
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SkeletonScreen } from "@/components/ui/SkeletonScreen";
import { useToast } from "@/components/ui/Toast";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { stockageEstPlein } from "@/lib/stockage";
import { valeurDonation } from "@/lib/collection";
import type { CategorieObjet, CollectionSlot, Objet } from "@/types/game";

export default function CollectionPage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    donnerACollection,
    retirerDeCollection,
    marquerVuDansCollection,
  } = useGame();
  const { toast } = useToast();
  const [filtre, setFiltre] = useState<CategorieObjet | null>(null);
  const [slotActif, setSlotActif] = useState<CollectionSlot | null>(null);
  const [pickerOuvert, setPickerOuvert] = useState(false);
  const [objetADonner, setObjetADonner] = useState<Objet | null>(null);

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

  const enStockIds = useMemo(
    () => new Set((state?.inventaireJoueur ?? []).map((o) => o.templateId)),
    [state],
  );

  if (!isHydrated || !state) {
    return <SkeletonScreen label="— consultation de la collection…" />;
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
      header={<MobileHeader budget={state.budget} />}
      stickyTop={
        <StickyTop>
          <PageHeaderBar
            title="Collection"
            align="left"
            right={
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
                title={`${labelGauche} · ${valeurAffichee} €`}
              >
                {labelGauche} · {valeurAffichee} €
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
        enStockIds={enStockIds}
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
