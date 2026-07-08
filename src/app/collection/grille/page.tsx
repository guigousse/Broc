"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { CategoriePicker } from "@/components/mobile/CategoriePicker";
import { PageHeaderBar } from "@/components/mobile/PageHeaderBar";
import { CollectionGrid } from "@/components/CollectionGrid";
import { ColonnesSlider } from "@/components/mobile/ColonnesSlider";
import { useColonnesCollection } from "@/lib/useColonnesCollection";
import { CollectionDetailOverlay } from "@/components/mobile/CollectionDetailOverlay";
import { DonationPickerSheet } from "@/components/mobile/DonationPickerSheet";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SkeletonScreen } from "@/components/ui/SkeletonScreen";
import { useToast } from "@/components/ui/Toast";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { stockageEstPlein } from "@/lib/stockage";
import { valeurDonation } from "@/lib/collection";
import { aConnaisseurVitrine } from "@/lib/competences";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import type { CategorieObjet, CollectionSlot, Objet } from "@/types/game";

export default function CollectionPage() {
  const router = useRouter();
  const { d, tr } = useLangue();
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
  const [colonnes, setColonnes] = useColonnesCollection();

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

  const categoriesConnuesVitrine = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurVitrine(state, c)) s.add(c);
    return s;
  }, [state]);

  if (!isHydrated || !state) {
    return <SkeletonScreen label={d.inventaire.consultationCollection} />;
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

  const labelGauche = filtre ?? d.inventaire.total;
  const valeurAffichee = filtre
    ? (valeursParCat[filtre] ?? 0)
    : Object.values(valeursParCat).reduce((s, v) => s + v, 0);
  const plein = stockageEstPlein(state);

  return (
  <>
    <MobileLayout
      scrollPaddingBottom={56}
      header={<MobileHeader budget={state.budget} />}
      stickyTop={
        <StickyTop>
          <PageHeaderBar
            title={d.chrome.onglets.collection}
            align="center"
            left={
              <button
                type="button"
                aria-label={d.inventaire.retourCabinet}
                onClick={() => router.push("/collection")}
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 32,
                  height: 32,
                  border: "1px solid var(--brass-500)",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--forest-800)",
                }}
              >
                <ChevronLeft size={18} strokeWidth={1.6} />
              </button>
            }
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
      <div
        style={{
          // Pleine largeur : annule le padding 12px du <main> du MobileLayout.
          margin: "-12px -12px 0",
          padding: "12px 0 4px",
          background: "var(--wood-light)",
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
    </MobileLayout>
    <ColonnesSlider value={colonnes} onChange={setColonnes} />
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
          toast(d.inventaire.reprisDansStock, { type: "info" });
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
      categoriesConnues={categoriesConnuesVitrine}
    />
    <ConfirmModal
      open={objetADonner !== null}
      onClose={() => setObjetADonner(null)}
      onConfirm={() => {
        if (!objetADonner) return;
        // La valeur créditée ne change pas ; seul son affichage est masqué
        // si la valeur de marché de la catégorie n'est pas encore connue.
        const valeurConnue = categoriesConnuesVitrine.has(objetADonner.categorie);
        const valeur = valeurDonation(
          objetADonner.etat,
          objetADonner.prixReferenceReel,
        );
        const res = donnerACollection(objetADonner.id);
        if (res.ok) {
          setPickerOuvert(false);
          setSlotActif(null);
          toast(
            valeurConnue
              ? tr(d.inventaire.donneCollectionValeur, { valeur })
              : d.inventaire.donneCollection,
            { type: "succes" },
          );
        }
      }}
      titre={d.inventaire.donnerALaCollection}
      confirmLabel={d.inventaire.donner}
    >
      {objetADonner && (
        <>
          {tr(d.inventaire.donationCorpsDebut, {
            nom: objetADonner.nom,
            etat: libelleEtat(objetADonner.etat, d),
          })}{" "}
          {categoriesConnuesVitrine.has(objetADonner.categorie)
            ? tr(d.inventaire.donationCorpsAvecValeur, {
                valeur: valeurDonation(
                  objetADonner.etat,
                  objetADonner.prixReferenceReel,
                ),
              })
            : d.inventaire.donationCorpsSansValeur}
          {slotActif?.donation ? d.inventaire.donationCorpsRemplacement : ""}
        </>
      )}
    </ConfirmModal>
  </>
  );
}
