"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { CategoriePicker } from "@/components/mobile/CategoriePicker";
import { InventoryGrid } from "@/components/InventoryGrid";
import { ObjetDetailOverlay } from "@/components/mobile/ObjetDetailOverlay";
import { ConfirmReplaceModal } from "@/components/mobile/ConfirmReplaceModal";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { getStockageTier } from "@/data/stockage";
import { aConnaisseurVitrine } from "@/lib/competences";
import {
  atelierStatusPourObjet,
  collectionStatusPourObjet,
  prochaineEtatCible,
} from "@/lib/atelier";
import { getBrocanteById } from "@/data/brocantes";
import type { CategorieObjet, EtatObjet, Objet } from "@/types/game";

export default function StockagePage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    mettreEnVitrine,
    restaurerObjet,
    donnerACollection,
    definirPrixVenteSouhaite,
  } = useGame();
  const [filtre, setFiltre] = useState<CategorieObjet | null>(null);
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
        — ouverture du stockage…
      </main>
    );
  }

  const tier = getStockageTier(state.inventaireJoueur.length);
  const ratio = state.inventaireJoueur.length / tier.capaciteMax;

  const atelierStatus = (o: Objet) => atelierStatusPourObjet(state, o);
  const collectionStatus = (o: Objet) => collectionStatusPourObjet(state, o);

  const envoyerAtelier = (o: Objet) => {
    const cible = prochaineEtatCible(o.etat);
    if (!cible) return;
    const res = restaurerObjet(o.id, cible);
    if (res.ok) setFlash(`${o.nom} envoyé à l'atelier.`);
    else setFlash(`Impossible : ${res.raison ?? "condition non remplie"}`);
    setTimeout(() => setFlash(null), 2500);
  };

  const envoyerCollection = (o: Objet) => {
    const status = collectionStatusPourObjet(state, o);
    if (!status.disponible && !status.necessiteConfirmation) return;
    if (status.necessiteConfirmation && status.ancienneDonation) {
      setAskReplace({ objet: o, ancienne: status.ancienneDonation });
      return;
    }
    const res = donnerACollection(o.id);
    if (res.ok) setFlash(`${o.nom} ajouté à la collection.`);
    else setFlash(`Impossible : ${res.raison ?? "condition non remplie"}`);
    setTimeout(() => setFlash(null), 2500);
  };

  const confirmerReplace = () => {
    if (!askReplace) return;
    const res = donnerACollection(askReplace.objet.id);
    if (res.ok) setFlash("Donation remplacée.");
    else setFlash(`Impossible : ${res.raison ?? "condition non remplie"}`);
    setTimeout(() => setFlash(null), 2500);
  };

  const ajouterAEtal = state.vitrine
    ? (o: Objet, prix: number) => mettreEnVitrine(o.id, prix)
    : null;

  const brocanteOuverteNom = state.vitrine
    ? (getBrocanteById(state.vitrine.brocanteId)?.nom ?? null)
    : null;

  return (
    <>
      <MobileLayout
        header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
        stickyTop={
          <StickyTop>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 9,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
                textAlign: "center",
                marginBottom: 6,
              }}
            >
              — Stockage · {tier.nom} —
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 17,
                  color: "var(--forest-800)",
                }}
              >
                {state.inventaireJoueur.length} / {tier.capaciteMax} obj.
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--brass-700)",
                }}
              >
                Loyer {tier.loyerHebdo} €/sem.
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "var(--paper-300)",
                border: "1px solid var(--brass-500)",
                margin: "6px 0 8px",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background:
                    ratio >= 1
                      ? "var(--vermillion-600)"
                      : "var(--forest-800)",
                  width: `${Math.min(100, Math.round(ratio * 100))}%`,
                }}
              />
            </div>
            <CategoriePicker
              selection={filtre}
              onChange={setFiltre}
              comptesParCat={comptes}
              total={state.inventaireJoueur.length}
            />
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
                nom: askReplace.objet.nom,
                etat: askReplace.objet.etat,
                valeur: askReplace.objet.prixReferenceReel,
              }
            : { nom: "", etat: "Bon", valeur: 0 }
        }
        ancienneDonation={
          askReplace ? askReplace.ancienne : { etat: "Bon", valeur: 0 }
        }
      />
    </>
  );
}
