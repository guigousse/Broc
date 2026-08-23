"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReserveShell } from "./ReserveShell";
import { useVerrouReserve } from "./useVerrouReserve";
import { CategoriePicker } from "@/components/mobile/CategoriePicker";
import { InventoryGrid } from "@/components/InventoryGrid";
import { ObjetDetailOverlay } from "@/components/mobile/ObjetDetailOverlay";
import { ConfirmReplaceModal } from "@/components/mobile/ConfirmReplaceModal";
import { TutorielCoach } from "@/components/mobile/tutoriel/TutorielCoach";
import { useGame, useGameActions } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import {
  getProchaineUpgradeStockage,
  getStockageTierParNiveau,
} from "@/data/stockage";
import { getCapaciteStockage, totalEnStock } from "@/lib/stockage";
import { UpgradeButton } from "@/components/mobile/UpgradeButton";
import { aConnaisseurVitrine } from "@/lib/competences";
import { collectionStatusPourObjet } from "@/lib/atelier";
import { donCollectionPermis } from "@/lib/tutoriel";
import { PELUCHE_TEMPLATE_ID } from "@/data/tutorielScenario";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet, nomStockageTier } from "@/lib/i18n/contenu";
import type { CategorieObjet, EtatObjet, Objet } from "@/types/game";

export function StockageContenu() {
  return (
    <Suspense fallback={null}>
      <StockageContenuInner />
    </Suspense>
  );
}

function StockageContenuInner() {
  const searchParams = useSearchParams();
  const { d, tr, locale } = useLangue();
  const { atelierOuvert, badgeAtelier, onVerrou } = useVerrouReserve();
  const {
    state,
    isHydrated,
    donnerACollection,
    ameliorerStockage,
  } = useGame();
  const { avancerTutoriel } = useGameActions();
  const etape = state?.tutorielEtape;
  // Visite guidée du stockage (tutoriel v2) : l'arrivée sur la page depuis
  // la TabBar déclenche le coach en 4 temps (cf. Step 1 du brief T10).
  useEffect(() => {
    if (etape === "stockage-ouvrir") avancerTutoriel("stockage-focus");
  }, [etape, avancerTutoriel]);
  // Pré-filtre optionnel depuis ?cat= (deep-link de catégorie).
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
  const collectionStatus = useCallback(
    (o: Objet) =>
      state
        ? collectionStatusPourObjet(state, o)
        : { disponible: false, necessiteConfirmation: false },
    [state],
  );

  const envoyerCollection = useCallback(
    (o: Objet) => {
      if (!state) return;
      // Tutoriel : seule la peluche désignée peut rejoindre la collection,
      // et uniquement à l'étape dédiée — les autres boutons restent inertes.
      if (!donCollectionPermis(state.tutorielEtape, o.templateId)) return;
      const status = collectionStatusPourObjet(state, o);
      if (!status.disponible && !status.necessiteConfirmation) return;
      if (status.necessiteConfirmation && status.ancienneDonation) {
        setAskReplace({ objet: o, ancienne: status.ancienneDonation });
        return;
      }
      const res = donnerACollection(o.id);
      if (res.ok) {
        setFlash(
          tr(d.inventaire.flashAjouteCollection, { nom: nomObjet(o, locale) }),
        );
        if (state.tutorielEtape === "collection-envoyer")
          avancerTutoriel("collection-lecon");
      } else
        setFlash(
          tr(d.inventaire.impossibleRaison, {
            raison: res.raison ?? d.inventaire.conditionNonRemplie,
          }),
        );
      setTimeout(() => setFlash(null), 2500);
    },
    [state, donnerACollection, d, tr, locale, avancerTutoriel],
  );

  // Le layout (qg) gate le rendu (redirect + écran d'attente) : ce garde
  // ne sert qu'au narrowing TypeScript.
  if (!isHydrated || !state) return null;

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

  return (
    <>
      <ReserveShell
        onglet="stockage"
        atelierOuvert={atelierOuvert}
        badgeAtelier={badgeAtelier}
        onVerrou={onVerrou}
        bande={
          <>
            {/* Le titre `— STOCKAGE —` a cédé la place à la bande d'onglets
                (cf. ReserveTabs) ; ses deux zones latérales restent, dans le
                même conteneur que le mode « left » de PageHeaderBar. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  minWidth: 0,
                }}
              >
                {/* La découpe du coach cible ce div interne (le texte), pas
                    le wrapper flex qui l'entoure : ce dernier s'étire sur
                    toute la largeur disponible du PageHeaderBar, ce qui
                    englobait une zone bien plus large que le libellé
                    (recette 2026-08-09). L'attribut data seul ne change
                    rien au rendu hors tutoriel. */}
                <div
                  data-tuto-coach="stockage-capacite"
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
              </div>
              <div data-tuto-coach="stockage-amelioration">
                {(() => {
                  const up = getProchaineUpgradeStockage(
                    state.niveauStockage,
                  );
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
              </div>
            </div>
            <div data-tuto-coach="stockage-categories" style={{ marginTop: 4 }}>
              <CategoriePicker
                selection={filtre}
                onChange={setFiltre}
                comptesParCat={comptes}
                total={state.inventaireJoueur.length}
              />
            </div>
          </>
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
          onEnvoyerCollection={envoyerCollection}
          mainVinyles={state?.miniTutoVinyle === "ajouter"}
          mainTemplateId={etape === "collection-envoyer" ? PELUCHE_TEMPLATE_ID : null}
          // Visite guidée du stockage : la 1ʳᵉ ligne porte les 3 cibles du
          // coach (étoiles/thème/bouton), cf. TutorielCoach ci-dessous.
          cibleCoachPremiereLigne={etape === "stockage-focus"}
          collectionStatus={collectionStatus}
        />
      </ReserveShell>

      {etape === "stockage-focus" && (
        <TutorielCoach
          etapes={[
            { cible: "stockage-capacite", texte: d.tutoriel.coachStockageCapacite },
            { cible: "stockage-categories", texte: d.tutoriel.coachStockageCategories },
            { cible: "stockage-etat", texte: d.tutoriel.coachStockageEtat },
            { cible: "stockage-theme", texte: d.tutoriel.coachStockageTheme },
            { cible: "stockage-bouton", texte: d.tutoriel.coachStockageBouton },
            { cible: "stockage-amelioration", texte: d.tutoriel.coachStockageAmelioration },
            { cible: "reserve-onglet-atelier", texte: d.tutoriel.coachStockageAtelier },
          ]}
          onFini={() => avancerTutoriel("collection-envoyer")}
        />
      )}

      <ObjetDetailOverlay
        objet={objetOuvert}
        open={objetOuvert !== null}
        onClose={() => setObjetOuvert(null)}
        prixMarche={objetOuvert?.prixReferenceReel ?? 0}
        prixMarcheConnu={
          objetOuvert ? categoriesConnuesVitrine.has(objetOuvert.categorie) : false
        }
      />

      <ConfirmReplaceModal
        open={askReplace !== null}
        onClose={() => setAskReplace(null)}
        onConfirm={confirmerReplace}
        objet={askReplace?.objet ?? null}
        ancienEtat={askReplace?.ancienne.etat ?? null}
      />
    </>
  );
}
