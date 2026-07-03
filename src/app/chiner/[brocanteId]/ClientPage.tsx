"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SessionSummary } from "@/components/SessionSummary";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { ChineNegoDrawer } from "@/components/mobile/chine/ChineNegoDrawer";
import { getBrocanteImageUrl } from "@/lib/brocanteImages";
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
import { genererSession, uniquesExclusDuChinage } from "@/lib/chine";
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
import {
  XP_ACHAT_BROCANTEUR,
  XP_DECOUVERTE_COLLECTION,
  XP_NEGO_BROCANTEUR,
} from "@/lib/xp";
import type { AchatHistorique, CategorieObjet, ObjetEnVente } from "@/types/game";

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
    gagnerXPBrocanteur,
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
  const brocanteBg = brocante ? getBrocanteImageUrl(brocante.id) : null;

  const [items, setItems] = useState<ObjetEnVente[] | null>(null);
  const [achats, setAchats] = useState<AchatHistorique[]>([]);
  /** Garde synchrone — empêche un double-enregistrement de la session. */
  const sessionEnregistreeRef = useRef(false);
  /** Garde synchrone — empêche le double-paiement du droit d'entrée (StrictMode). */
  const entreePayeeRef = useRef(false);
  /** Affiche le résumé de session avant retour au QG. */
  const [resumeOuvert, setResumeOuvert] = useState(false);
  /** XP gagnée localement durant la session, par arbre. */
  const [xpSession, setXpSession] = useState<Record<string, number>>({});
  /** XP de Brocanteur gagnée localement durant la session. */
  const [xpBrocanteurSession, setXpBrocanteurSession] = useState(0);
  /** ID de l'objet dont la négociation est ouverte dans le BottomSheet. */
  const [negoOuverte, setNegoOuverte] = useState<string | null>(null);
  /** Le vendeur mystère est-il présent dans cette session (tiré à l'entrée) ? */
  const [vendeurPresent, setVendeurPresent] = useState(false);
  /** La modale de la boîte mystère est-elle ouverte ? */
  const [boiteOuverte, setBoiteOuverte] = useState(false);
  /** Vrai une fois la boîte mystère réclamée dans cette session (masque le bouton pub). */
  const [boiteReclamee, setBoiteReclamee] = useState(false);

  const gagnerXPLocal = (
    treeId: string,
    montantArbre: number,
    montantBrocanteur: number,
    categorie?: CategorieObjet,
  ) => {
    gagnerXP(treeId, montantArbre);
    gagnerXPBrocanteur(montantBrocanteur, categorie);
    setXpBrocanteurSession((prev) => prev + montantBrocanteur);
    setXpSession((prev) => ({
      ...prev,
      [treeId]: (prev[treeId] ?? 0) + montantArbre,
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
        uniquesExclusDuChinage(state),
      );
      setItems(session);
      toast(`Droit d'entrée payé : ${frais} €.`, { type: "info" });
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
      toast("La caisse refuse — fonds insuffisants.", { type: "erreur" });
      return;
    }
    ajusterBudget(-prix);
    ajouterObjet({ ...it.objet, prixAchat: prix });
    // Aligne l'accumulateur d'affichage sur le +10 de découverte crédité
    // atomiquement par le GameContext (première possession du template).
    const estDecouverte = !Object.values(state.collection).some((slots) =>
      slots.some((s) => s.templateId === it.objet.templateId && s.dejaPossede),
    );
    marquerDejaPossedeTemplate(it.objet.templateId);
    if (estDecouverte) {
      setXpBrocanteurSession((prev) => prev + XP_DECOUVERTE_COLLECTION);
    }
    gagnerXPLocal(
      catTreeId(it.objet.categorie),
      XP_ACHAT_OBJET,
      XP_ACHAT_BROCANTEUR,
      it.objet.categorie,
    );
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
    toast(`Acquis pour ${prix} €. Noté dans le carnet.`, { type: "succes" });
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
        xpBrocanteur: xpBrocanteurSession,
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
        height: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper-100)",
      }}
    >
      <MobileHeader budget={state.budget} />
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          background: "var(--paper-100)",
        }}
      >
        {brocanteBg && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              backgroundImage: `linear-gradient(rgba(15,30,22,0.42), rgba(15,30,22,0.42)), url("${brocanteBg}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(7px)",
              transform: "scale(1.08)",
            }}
          />
        )}
        <div style={{ flex: 1, minHeight: 0, position: "relative", zIndex: 1 }}>
          <ItemSwipeDeck
            slides={slides}
            plein={plein}
            boiteReclamee={boiteReclamee}
            onOuvrirBoite={() => setBoiteOuverte(true)}
            onQuitter={handleRentrer}
            onNavigate={() => setNegoOuverte(null)}
            renderNegoDrawer={(item) => (
              <ChineNegoDrawer
                key={item.id}
                item={item}
                budget={state.budget}
                plein={plein}
                expanded={negoOuverte === item.id}
                illustrationSrc={getVendeurIllustration(item.persona.archetype)}
                illustrationFacheSrc={getVendeurIllustrationFache(item.persona.archetype)}
                onExpand={() => setNegoOuverte(item.id)}
                onCollapse={() => setNegoOuverte(null)}
                onUpdateNego={(nego) => setItem(item.id, { negociation: nego })}
                onConclu={(prixFinal) => {
                  handleAchatAuPrix(item, prixFinal);
                  gagnerXPLocal(
                    TREE_GENERAL,
                    XP_NEGOCIATION_REUSSIE_GENERAL,
                    XP_NEGO_BROCANTEUR,
                  );
                  setNegoOuverte(null);
                }}
                onAcheterDirect={() => handleAcheter(item.id)}
              />
            )}
          />
        </div>
      </main>

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
