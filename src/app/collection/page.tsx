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
import { useGame, useGameActions } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { stockageEstPlein } from "@/lib/stockage";
import { valeurDonation } from "@/lib/collection";
import { aConnaisseurVitrine } from "@/lib/competences";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import { nomObjet, nomExpediteur } from "@/lib/i18n/contenu";
import { TutorielCoach } from "@/components/mobile/tutoriel/TutorielCoach";
import { DialogueOverlay } from "@/components/mobile/dialogue/DialogueOverlay";
import { SEQUENCES_TUTORIEL, GRAND_PERE_PORTRAITS } from "@/data/dialogues";
import { PELUCHE_TEMPLATE_ID } from "@/data/tutorielScenario";
import { setCoachOuvert } from "@/lib/coachActif";
import type { CategorieObjet, CollectionSlot, Objet } from "@/types/game";

/**
 * Réserve basse du <main> défilant (barre d'onglets + safe area). La planche
 * de bois s'y étend, compensée par une marge négative de même valeur — donc à
 * hauteur de défilement inchangée : sans ça, la texture s'arrêtait sous la
 * dernière étagère et laissait une bande claire jusqu'à la barre d'onglets.
 */
const RESERVE_BAS = "calc(var(--mobile-tabbar-h) + var(--safe-bottom))";

/**
 * Machine locale de la leçon « collection-lecon » : 3 bulles de coach, puis
 * filtre guidé → scroll auto + main sur la case → détail (bouton retirer
 * montré) → dialogue de conclusion. Remontage en cours de leçon = repart à
 * "coach" (fail-open, cohérent avec le reste du tutoriel).
 */
type PhaseLecon = "coach" | "filtre" | "case" | "detail" | "dialogue";

export default function CollectionPage() {
  const router = useRouter();
  const { d, tr, locale } = useLangue();
  const {
    state,
    isHydrated,
    donnerACollection,
    retirerDeCollection,
    marquerVuDansCollection,
  } = useGame();
  const { avancerTutoriel } = useGameActions();
  const { toast } = useToast();
  const [filtre, setFiltre] = useState<CategorieObjet | null>(null);
  const [slotActif, setSlotActif] = useState<CollectionSlot | null>(null);
  const [pickerOuvert, setPickerOuvert] = useState(false);
  const [objetADonner, setObjetADonner] = useState<Objet | null>(null);
  const [phaseLecon, setPhaseLecon] = useState<PhaseLecon>("coach");
  const etape = state?.tutorielEtape;
  const enLecon = etape === "collection-lecon";

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  // Masque la bannière de tutoriel (cf. TutorielBanniere/coachActif) pendant
  // TOUTE la leçon guidée sauf la phase finale "dialogue" (déjà couverte par
  // le DialogueOverlay, z-index 120, qui recouvre tout). Sans ça : 1) sa
  // consigne périmée (« Ouvre la Collection… », déjà fait) reste affichée
  // pendant les phases interactives filtre/case/detail, et 2) elle empiète
  // sur la bande où tombe la main "tuto-main-haut" au-dessus des pastilles.
  // Les TutorielCoach des phases "coach"/"detail" publient aussi
  // setCoachOuvert eux-mêmes (leur propre montage/démontage) — sans
  // conflit : `setCoachOuvert` est idempotent (no-op si même valeur), et
  // React exécute TOUS les cleanups d'un commit avant TOUTE nouvelle
  // exécution d'effet, donc à la transition coach→filtre (où le
  // TutorielCoach démonte et republierait `false`), cet effet-ci républie
  // `true` dans la même passe avant que la bannière n'ait pu se re-rendre
  // visible — jamais de flash.
  useEffect(() => {
    if (!enLecon || phaseLecon === "dialogue") return;
    setCoachOuvert(true);
    return () => setCoachOuvert(false);
  }, [enLecon, phaseLecon]);

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
      header={<MobileHeader budget={state.budget} jetons={state.jetons} />}
      stickyTop={
        <StickyTop>
          <PageHeaderBar
            title={d.chrome.onglets.collection}
            align="center"
            right={
              <div
                data-tuto-coach="collection-valeur"
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
              onChange={(c) => {
                if (enLecon) {
                  // Phase "filtre" : seule "Jeux & Loisirs" fait avancer la
                  // leçon ; les autres taps sont ignorés. Aux autres phases
                  // de la leçon, le picker est inerte.
                  if (phaseLecon !== "filtre" || c !== "Jeux & Loisirs") return;
                  setFiltre(c);
                  setPhaseLecon("case");
                  return;
                }
                setFiltre(c);
              }}
              comptesParCat={comptes}
              total={Object.values(comptes).reduce((s, v) => s + (v ?? 0), 0)}
              totauxParCat={totauxParCat}
              totalGlobal={Object.values(totauxParCat).reduce(
                (s, v) => s + (v ?? 0),
                0,
              )}
              nouveautesParCat={nouveautesParCat}
              mainCategorie={
                enLecon && phaseLecon === "filtre" ? "Jeux & Loisirs" : null
              }
            />
          </div>
        </StickyTop>
      }
    >
      <div
        style={{
          // Pleine largeur : annule le padding 12px du <main> du MobileLayout.
          // En bas, le bois recouvre la réserve du <main> (cf. RESERVE_BAS).
          margin: `-12px -12px calc(-1 * (${RESERVE_BAS}))`,
          padding: `12px 0 calc(4px + ${RESERVE_BAS})`,
          background: "var(--wood-light)",
        }}
      >
        <CollectionGrid
          slots={slotsFiltres}
          enStockIds={enStockIds}
          onTap={(s) => {
            if (enLecon) {
              // Hors phase "case", la grille est inerte ; en phase "case",
              // seule la peluche répond (les autres cases sont ignorées).
              if (phaseLecon !== "case") return;
              if (s.templateId !== PELUCHE_TEMPLATE_ID) return;
              setPhaseLecon("detail");
            }
            if (s.vu && s.vuDansCollection === false) {
              marquerVuDansCollection(s.templateId);
            }
            setSlotActif(s);
          }}
          scrollVersTemplateId={
            enLecon && phaseLecon === "case" ? PELUCHE_TEMPLATE_ID : null
          }
          mainTemplateId={
            enLecon && phaseLecon === "case" ? PELUCHE_TEMPLATE_ID : null
          }
        />
      </div>
    </MobileLayout>
    {enLecon && phaseLecon === "coach" && (
      <TutorielCoach
        /* Deux bulles, pas trois : la valeur et ce qu'elle débloque disaient
           la même chose en deux temps, et la troisième — sans cible — coupait
           l'élan par un voile plein sans rien à regarder. */
        etapes={[
          { cible: "collection-case", texte: d.tutoriel.coachCollectionCase },
          { cible: "collection-valeur", texte: d.tutoriel.coachCollectionValeur },
        ]}
        onFini={() => setPhaseLecon("filtre")}
      />
    )}
    {enLecon && phaseLecon === "detail" && (
      <TutorielCoach
        etapes={[
          {
            cible: "collection-retirer",
            texte: d.tutoriel.coachCollectionRetirer,
          },
        ]}
        onFini={() => {
          setSlotActif(null);
          setPhaseLecon("dialogue");
        }}
      />
    )}
    {enLecon && phaseLecon === "dialogue" && (
      <DialogueOverlay
        sequence={SEQUENCES_TUTORIEL.tuto_collection_lecon}
        nom={nomExpediteur("grand-pere", locale)}
        portraits={GRAND_PERE_PORTRAITS}
        onFini={() => avancerTutoriel("ouvrir-colis")}
      />
    )}
    <CollectionDetailOverlay
      open={slotActif !== null && !pickerOuvert}
      onClose={() => setSlotActif(null)}
      slot={slotActif}
      candidatsCount={candidats.length}
      retirerDisabled={plein}
      retirerInerte={enLecon && phaseLecon === "detail"}
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
            nom: nomObjet(objetADonner, locale),
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
