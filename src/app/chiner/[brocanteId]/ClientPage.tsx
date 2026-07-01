"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SessionSummary } from "@/components/SessionSummary";
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { NegociationSheet } from "@/components/mobile/NegociationSheet";
import {
  getVendeurIllustration,
  getVendeurIllustrationFache,
} from "@/lib/personaIllustrations";
import { ItemSwipeDeck } from "@/components/mobile/chine/ItemSwipeDeck";
import type { ChineSlide } from "@/components/mobile/chine/ChineSlide";
import { getTemplate } from "@/data/objetTemplates";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/components/ui/Toast";
import { fraisEntree, getBrocanteById } from "@/data/brocantes";
import {
  calculerBrocantesDebloqueesParTier,
  estDebloquee,
} from "@/lib/deblocage";
import { genererSession } from "@/lib/chine";
import { energieCourante } from "@/lib/energie";
import { placeRestante, stockageEstPlein } from "@/lib/stockage";
import { nbBoitesReclamees, tenterApparition } from "@/lib/boiteMystere";
import { BoiteMystereOverlay } from "@/components/mobile/BoiteMystereOverlay";
import { indexJourSemaine } from "@/lib/meteo";
import {
  TREE_GENERAL,
  XP_ACHAT_OBJET,
  XP_NEGOCIATION_REUSSIE_GENERAL,
  catTreeId,
} from "@/data/competences";
import type { AchatHistorique, ObjetEnVente } from "@/types/game";

export default function SessionChinePage() {
  const router = useRouter();
  const params = useParams<{ brocanteId: string }>();
  const {
    state,
    isHydrated,
    ajouterObjet,
    ajusterBudget,
    avancerJour,
    enregistrerSession,
    gagnerXP,
    marquerVuTemplate,
    marquerDejaPossedeTemplate,
    payerFraisBrocante,
    tempsConfiance,
    consommerEnergie,
  } = useGame();
  const { startCrowd, stopCrowd } = useSettings();
  const { toast } = useToast();
  useEffect(() => {
    startCrowd();
    return () => stopCrowd();
  }, [startCrowd, stopCrowd]);

  const brocante = useMemo(
    () => getBrocanteById(params.brocanteId),
    [params.brocanteId],
  );

  const [items, setItems] = useState<ObjetEnVente[] | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [achats, setAchats] = useState<AchatHistorique[]>([]);
  /** Garde synchrone — empêche un double-enregistrement de la session. */
  const sessionEnregistreeRef = useRef(false);
  /** Garde synchrone — empêche le double-paiement du droit d'entrée (StrictMode). */
  const entreePayeeRef = useRef(false);
  /** Affiche le résumé de session avant retour au QG. */
  const [resumeOuvert, setResumeOuvert] = useState(false);
  /** XP gagnée localement durant la session, par arbre. */
  const [xpSession, setXpSession] = useState<Record<string, number>>({});
  /** ID de l'objet dont la négociation est ouverte dans le BottomSheet. */
  const [negoOuverte, setNegoOuverte] = useState<string | null>(null);
  /** Le vendeur mystère est-il présent dans cette session (tiré à l'entrée) ? */
  const [vendeurPresent, setVendeurPresent] = useState(false);
  /** La modale de la boîte mystère est-elle ouverte ? */
  const [boiteOuverte, setBoiteOuverte] = useState(false);
  /** Vrai une fois la boîte mystère réclamée dans cette session (masque le bouton pub). */
  const [boiteReclamee, setBoiteReclamee] = useState(false);

  const gagnerXPLocal = (treeId: string, montant: number) => {
    gagnerXP(treeId, montant);
    setXpSession((prev) => ({
      ...prev,
      [treeId]: (prev[treeId] ?? 0) + montant,
    }));
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (!state) return router.replace("/");
    if (!brocante) return router.replace("/chiner");
    // La condition de déblocage n'est vérifiée qu'à l'entrée — une fois sur place
    // le joueur ne peut plus être expulsé (par exemple si son solde redescend).
    if (items === null && !entreePayeeRef.current) {
      // Le map en cascade est indispensable : sans lui, les conditions
      // `brocantesDebloquees` sont toujours fausses et la brocante (pourtant
      // affichée débloquée dans la liste) renvoie aussitôt vers /chiner.
      if (!estDebloquee(brocante, state, calculerBrocantesDebloqueesParTier(state))) {
        return router.replace("/chiner");
      }
      const frais = fraisEntree(brocante);
      if (state.budget < frais) {
        return router.replace(`/chiner?raison=budget&id=${brocante.id}`);
      }
      if (energieCourante(state, tempsConfiance() ?? Date.now()) < 1) {
        toast("Plus d'énergie — attends la recharge ou regarde une pub.", {
          type: "info",
        });
        return router.replace(`/chiner?raison=energie&id=${brocante.id}`);
      }
      entreePayeeRef.current = true;
      payerFraisBrocante(brocante.id, brocante.nom, frais);
      consommerEnergie(1);
      const jourSemaine = indexJourSemaine(state.jourActuel);
      const celebriteAujourdhui =
        state.celebriteActuelle &&
        state.celebriteActuelle.brocanteId === brocante.id &&
        state.celebriteActuelle.jourSemaine === jourSemaine
          ? state.celebriteActuelle
          : null;
      const session = genererSession(
        brocante.taillePool,
        state.tendances,
        brocante,
        celebriteAujourdhui,
      );
      setItems(session);
      setFlash(`Droit d'entrée payé : ${frais} €.`);
      for (const it of session) {
        marquerVuTemplate(it.objet.templateId);
      }
      // Vendeur mystère : tirage à probabilité décroissante (1/10, puis ÷2 par
      // boîte déjà réclamée aujourd'hui). N'apparaît que s'il reste de la place
      // (jamais de pub gâchée).
      const nReclamees = nbBoitesReclamees(state, state.jourActuel);
      if (placeRestante(state) >= 1 && tenterApparition(nReclamees)) {
        setVendeurPresent(true);
      }
    }
  }, [isHydrated, state, brocante, router, items, payerFraisBrocante, tempsConfiance, consommerEnergie, toast]);

  const estRareOuPlus = (it: ObjetEnVente): boolean =>
    it.objet.rarete !== "commun" ||
    getTemplate(it.objet.templateId)?.unique === true;

  const slides: ChineSlide[] = useMemo(() => {
    const liste: ChineSlide[] = [];
    if (vendeurPresent) liste.push({ kind: "mystere" });
    for (const it of (items ?? []).filter((x) => x.statut !== "refuse")) {
      liste.push({ kind: "item", item: it, estRareOuPlus: estRareOuPlus(it) });
    }
    return liste;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendeurPresent, items]);

  /** Item dont la négociation est ouverte (pour la feuille unique). */
  const itemEnNego = (items ?? []).find((x) => x.id === negoOuverte) ?? null;

  if (!isHydrated || !state || !brocante || items === null) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — installation des étals…
      </main>
    );
  }

  const plein = stockageEstPlein(state);

  const setItem = (id: string, patch: Partial<ObjetEnVente>) =>
    setItems((prev) =>
      prev ? prev.map((it) => (it.id === id ? { ...it, ...patch } : it)) : prev,
    );

  /** Achat au prix affiché (bouton direct). */
  const handleAcheter = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    handleAchatAuPrix(it, it.prixVendeur);
  };

  /** Achat à un prix personnalisé (depuis la négo ou le bouton direct). */
  const handleAchatAuPrix = (it: ObjetEnVente, prix: number) => {
    if (state.budget < prix) {
      setFlash("La caisse refuse — fonds insuffisants.");
      return;
    }
    ajusterBudget(-prix);
    ajouterObjet({ ...it.objet, prixAchat: prix });
    marquerDejaPossedeTemplate(it.objet.templateId);
    gagnerXPLocal(catTreeId(it.objet.categorie), XP_ACHAT_OBJET);
    setItem(it.id, { statut: "achete" });
    setAchats((prev) => [
      ...prev,
      {
        templateId: it.objet.templateId,
        nom: it.objet.nom,
        categorie: it.objet.categorie,
        etat: it.objet.etat,
        prixReferenceReel: it.objet.prixReferenceReel,
        prixPaye: prix,
      },
    ]);
    setFlash(`Acquis pour ${prix} €. Noté dans le carnet.`);
  };

  const handleRentrer = () => {
    setResumeOuvert(true);
  };

  const handleRetourQg = () => {
    if (sessionEnregistreeRef.current) {
      router.push("/bureau");
      return;
    }
    sessionEnregistreeRef.current = true;
    if (brocante && state) {
      enregistrerSession({
        id: crypto.randomUUID(),
        type: "chinage",
        jour: state.jourActuel,
        timestamp: Date.now(),
        brocanteId: brocante.id,
        brocanteNom: brocante.nom,
        achats,
        xpGagne: xpSession,
      });
    }
    avancerJour();
    router.push("/bureau");
  };

  if (resumeOuvert) {
    return (
      <SessionSummary
        type="chinage"
        titre={brocante.nom}
        items={achats.map((a) => ({
          templateId: a.templateId,
          nom: a.nom,
          categorie: a.categorie,
          prix: a.prixPaye,
        }))}
        xpGagne={xpSession}
        onRetour={handleRetourQg}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper-100)",
      }}
    >
      <ContextualHeader
        titre={brocante.nom}
        sousTitre={`${achats.length}${items ? ` / ${items.length}` : ""} acquis · ${achats.reduce((s, a) => s + a.prixPaye, 0)} €`}
        budget={state.budget}
        onBack={handleRentrer}
        backIcon="close"
      />
      <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {flash && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--brass-100)",
              border: "1px solid var(--brass-700)",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--ink-700)",
            }}
          >
            « {flash} »
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0 }}>
          <ItemSwipeDeck
            slides={slides}
            budget={state.budget}
            plein={plein}
            boiteReclamee={boiteReclamee}
            onAcheter={(item) => handleAcheter(item.id)}
            onNegocier={(item) => setNegoOuverte(item.id)}
            onOuvrirBoite={() => setBoiteOuverte(true)}
          />
        </div>
      </main>

      {itemEnNego && (
        <NegociationSheet
          open={negoOuverte === itemEnNego.id}
          onClose={() => setNegoOuverte(null)}
          mode="achat"
          persona={itemEnNego.persona}
          echelleMax={itemEnNego.prixVendeur}
          cibleSecrete={itemEnNego.prixMinAccept}
          prixDepartAdverse={itemEnNego.negociation?.prixAdverseCourant ?? itemEnNego.prixVendeur}
          nego={itemEnNego.negociation}
          nomAffiche="Un vendeur"
          illustrationSrc={getVendeurIllustration(itemEnNego.persona.archetype)}
          illustrationFacheSrc={getVendeurIllustrationFache(itemEnNego.persona.archetype)}
          personaInfo={{
            archetypeNom: undefined,
            revelePersona: false,
            releveBourse: false,
            oeilAiguise: false,
          }}
          onUpdateNego={(nego) => setItem(itemEnNego.id, { negociation: nego })}
          onConclu={(prixFinal) => {
            handleAchatAuPrix(itemEnNego, prixFinal);
            gagnerXPLocal(TREE_GENERAL, XP_NEGOCIATION_REUSSIE_GENERAL);
            setNegoOuverte(null);
          }}
        />
      )}
      {boiteOuverte && (
        <BoiteMystereOverlay
          brocante={brocante}
          onClose={() => setBoiteOuverte(false)}
          onClaimed={() => {
            setBoiteOuverte(false);
            setBoiteReclamee(true);
          }}
        />
      )}
    </div>
  );
}
