"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { CategoriePicker } from "@/components/mobile/CategoriePicker";
import { InventoryGrid } from "@/components/InventoryGrid";
import { ObjetDetailOverlay } from "@/components/mobile/ObjetDetailOverlay";
import { ConfirmReplaceModal } from "@/components/mobile/ConfirmReplaceModal";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import {
  getProchaineUpgradeStockage,
  getStockageTierParNiveau,
} from "@/data/stockage";
import { getCapaciteStockage, totalEnStock } from "@/lib/stockage";
import { PageHeaderBar } from "@/components/mobile/PageHeaderBar";
import { UpgradeButton } from "@/components/mobile/UpgradeButton";
import { aConnaisseurVitrine } from "@/lib/competences";
import {
  atelierStatusPourObjet,
  collectionStatusPourObjet,
  prochaineEtatCible,
} from "@/lib/atelier";
import { getBrocanteById } from "@/data/brocantes";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomBrocante, nomObjet, nomStockageTier } from "@/lib/i18n/contenu";
import type { CategorieObjet, EtatObjet, Objet } from "@/types/game";

export default function StockagePage() {
  return (
    <Suspense fallback={null}>
      <StockagePageInner />
    </Suspense>
  );
}

function StockagePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { d, tr, locale } = useLangue();
  const {
    state,
    isHydrated,
    mettreEnVitrine,
    restaurerObjet,
    donnerACollection,
    definirPrixVenteSouhaite,
    ameliorerStockage,
  } = useGame();
  // Pré-filtre depuis ?cat= (ex. carton catégorie cliqué depuis le panorama).
  // Garde une valeur seulement si la catégorie est valide.
  const initialFiltre = useMemo<CategorieObjet | null>(() => {
    const raw = searchParams.get("cat");
    if (!raw) return null;
    return (CATEGORIES as string[]).includes(raw)
      ? (raw as CategorieObjet)
      : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [filtre, setFiltre] = useState<CategorieObjet | null>(initialFiltre);
  const [objetOuvert, setObjetOuvert] = useState<Objet | null>(null);
  const [askReplace, setAskReplace] = useState<{
    objet: Objet;
    ancienne: { etat: EtatObjet; valeur: number };
  } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const categoriesConnuesVitrine = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurVitrine(state, c)) s.add(c);
    return s;
  }, [state]);

  const objetsFiltres = useMemo(() => {
    if (!state) return [];
    return filtre
      ? state.inventaireJoueur.filter((o) => o.categorie === filtre)
      : state.inventaireJoueur;
  }, [state, filtre]);

  const comptes = useMemo(() => {
    const acc: Partial<Record<CategorieObjet, number>> = {};
    if (!state) return acc;
    for (const o of state.inventaireJoueur) {
      acc[o.categorie] = (acc[o.categorie] ?? 0) + 1;
    }
    return acc;
  }, [state]);

  // Callbacks stabilisés (useCallback) pour que les StockageItemRow mémoïsées
  // ne re-rendent pas quand seul l'état local de la page change (flash,
  // overlay ouvert, filtre…).
  const atelierStatus = useCallback(
    (o: Objet) =>
      state ? atelierStatusPourObjet(state, o) : { disponible: false },
    [state],
  );
  const collectionStatus = useCallback(
    (o: Objet) =>
      state
        ? collectionStatusPourObjet(state, o)
        : { disponible: false, necessiteConfirmation: false },
    [state],
  );

  const envoyerAtelier = useCallback(
    (o: Objet) => {
      const cible = prochaineEtatCible(o.etat);
      if (!cible) return;
      const res = restaurerObjet(o.id, cible);
      if (res.ok)
        setFlash(
          tr(d.inventaire.flashEnvoyeAtelier, { nom: nomObjet(o, locale) }),
        );
      else
        setFlash(
          tr(d.inventaire.impossibleRaison, {
            raison: res.raison ?? d.inventaire.conditionNonRemplie,
          }),
        );
      setTimeout(() => setFlash(null), 2500);
    },
    [restaurerObjet, d, tr, locale],
  );

  const envoyerCollection = useCallback(
    (o: Objet) => {
      if (!state) return;
      const status = collectionStatusPourObjet(state, o);
      if (!status.disponible && !status.necessiteConfirmation) return;
      if (status.necessiteConfirmation && status.ancienneDonation) {
        setAskReplace({ objet: o, ancienne: status.ancienneDonation });
        return;
      }
      const res = donnerACollection(o.id);
      if (res.ok)
        setFlash(
          tr(d.inventaire.flashAjouteCollection, { nom: nomObjet(o, locale) }),
        );
      else
        setFlash(
          tr(d.inventaire.impossibleRaison, {
            raison: res.raison ?? d.inventaire.conditionNonRemplie,
          }),
        );
      setTimeout(() => setFlash(null), 2500);
    },
    [state, donnerACollection, d, tr, locale],
  );

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
        {d.inventaire.ouvertureStockage}
      </main>
    );
  }

  const tier = getStockageTierParNiveau(state.niveauStockage);
  const capacite = getCapaciteStockage(state);

  const confirmerReplace = () => {
    if (!askReplace) return;
    const res = donnerACollection(askReplace.objet.id);
    if (res.ok) setFlash(d.inventaire.donationRemplacee);
    else
      setFlash(
        tr(d.inventaire.impossibleRaison, {
          raison: res.raison ?? d.inventaire.conditionNonRemplie,
        }),
      );
    setTimeout(() => setFlash(null), 2500);
  };

  const ajouterAEtal = state.vitrine
    ? (o: Objet, prix: number) => mettreEnVitrine(o.id, prix)
    : null;

  const brocanteOuverte = state.vitrine
    ? getBrocanteById(state.vitrine.brocanteId)
    : null;
  const brocanteOuverteNom = brocanteOuverte
    ? nomBrocante(brocanteOuverte, locale)
    : null;

  return (
    <>
      <MobileLayout
        header={<MobileHeader budget={state.budget} />}
        stickyTop={
          <StickyTop>
            <PageHeaderBar
              title={d.chrome.onglets.stockage}
              left={
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 12,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {nomStockageTier(tier, locale)} {totalEnStock(state)}/{capacite}
                  </div>
                  {tier.loyerHebdo > 0 && (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        color: "var(--ink-500)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {tr(d.inventaire.loyerHebdo, { n: tier.loyerHebdo })}
                    </div>
                  )}
                </div>
              }
              right={(() => {
                const up = getProchaineUpgradeStockage(state.niveauStockage);
                if (!up) {
                  return (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--brass-700)",
                        padding: "6px 10px",
                      }}
                    >
                      {d.inventaire.max}
                    </span>
                  );
                }
                return (
                  <UpgradeButton
                    niveauCible={up.niveauCible}
                    cout={up.cout}
                    peut={state.budget >= up.cout}
                    onUpgrade={() => {
                      const res = ameliorerStockage();
                      if (!res.ok)
                        setFlash(res.raison ?? d.inventaire.impossible);
                      else
                        setFlash(
                          tr(d.inventaire.stockageAmeliore, {
                            niveau: up.niveauCible,
                          }),
                        );
                      setTimeout(() => setFlash(null), 2500);
                    }}
                  />
                );
              })()}
            />
            <div style={{ marginTop: 4 }}>
              <CategoriePicker
                selection={filtre}
                onChange={setFiltre}
                comptesParCat={comptes}
                total={state.inventaireJoueur.length}
              />
            </div>
          </StickyTop>
        }
      >
        {flash && (
          <div
            role="status"
            style={{
              padding: "8px 12px",
              background: "var(--paper-100)",
              border: "1px solid var(--brass-500)",
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {flash}
          </div>
        )}
        <InventoryGrid
          objets={objetsFiltres}
          categoriesConnues={categoriesConnuesVitrine}
          onTapObjet={setObjetOuvert}
          onEnvoyerAtelier={envoyerAtelier}
          onEnvoyerCollection={envoyerCollection}
          atelierStatus={atelierStatus}
          collectionStatus={collectionStatus}
        />
      </MobileLayout>

      <ObjetDetailOverlay
        objet={objetOuvert}
        open={objetOuvert !== null}
        onClose={() => setObjetOuvert(null)}
        prixMarche={objetOuvert?.prixReferenceReel ?? 0}
        prixMarcheConnu={
          objetOuvert ? categoriesConnuesVitrine.has(objetOuvert.categorie) : false
        }
        onSetPrixVente={definirPrixVenteSouhaite}
        onAjouterEtal={ajouterAEtal}
        brocanteOuverteNom={brocanteOuverteNom}
      />

      <ConfirmReplaceModal
        open={askReplace !== null}
        onClose={() => setAskReplace(null)}
        onConfirm={confirmerReplace}
        nouvelObjet={
          askReplace
            ? {
                nom: nomObjet(askReplace.objet, locale),
                etat: askReplace.objet.etat,
                valeur: categoriesConnuesVitrine.has(askReplace.objet.categorie)
                  ? askReplace.objet.prixReferenceReel
                  : null,
              }
            : { nom: "", etat: "Bon", valeur: 0 }
        }
        ancienneDonation={
          askReplace
            ? {
                etat: askReplace.ancienne.etat,
                valeur: categoriesConnuesVitrine.has(askReplace.objet.categorie)
                  ? askReplace.ancienne.valeur
                  : null,
              }
            : { etat: "Bon", valeur: 0 }
        }
      />
    </>
  );
}
