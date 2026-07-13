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
import { templateDejaPossede } from "@/lib/collection";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/components/ui/Toast";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomBrocante } from "@/lib/i18n/contenu";
import { libelleActive } from "@/lib/i18n/libelles";
import { fraisEntree, getBrocanteById } from "@/data/brocantes";
import {
  calculerBrocantesDebloqueesParTier,
  estDebloquee,
} from "@/lib/deblocage";
import { genererRemplacement, genererSession, uniquesExclusDuChinage } from "@/lib/chine";
import { activeDebloquee, usagesRestants } from "@/lib/actives";
import { aConnaisseurChinage } from "@/lib/competences";
import { energieCourante } from "@/lib/energie";
import { placeRestante, stockageEstPlein } from "@/lib/stockage";
import { nbBoitesReclamees, tenterApparition } from "@/lib/boiteMystere";
import { BoiteMystereOverlay } from "@/components/mobile/BoiteMystereOverlay";
import { indexJourSemaine } from "@/lib/meteo";
import { useXpFloats, XpFloatsVue } from "@/components/mobile/XpFloats";
import {
  XP_ACHAT_BROCANTEUR,
  multiplicateurXPRarete,
  XP_DECOUVERTE_COLLECTION,
  XP_NEGO_BROCANTEUR,
} from "@/lib/xp";
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
    gagnerXPBrocanteur,
    marquerVuTemplate,
    marquerDejaPossedeTemplate,
    payerFraisBrocante,
    tempsConfiance,
    consommerEnergie,
    utiliserActive,
  } = useGame();
  const { startCrowd, stopCrowd } = useSettings();
  const { toast } = useToast();
  const { d, tr, locale } = useLangue();
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
  /** Le Flair (N5) : révèle la cote pour toute la session une fois activé (portée session, pas de persistance). */
  const [flairActif, setFlairActif] = useState(false);

  const { floats, pousserXp } = useXpFloats();

  const gagnerXPLocal = (montant: number) => {
    gagnerXPBrocanteur(montant);
    setXpBrocanteurSession((prev) => prev + montant);
    pousserXp(montant);
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
        toast(d.chine.plusEnergieToast, {
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
      toast(tr(d.chine.droitEntreePaye, { frais }), { type: "info" });
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
  }, [isHydrated, state, brocante, router, items, payerFraisBrocante, tempsConfiance, consommerEnergie, toast, d, tr]);

  const estRareOuPlus = (it: ObjetEnVente): boolean =>
    it.objet.rarete !== "commun" ||
    getTemplate(it.objet.templateId)?.unique === true;

  const slides: ChineSlide[] = useMemo(() => {
    const liste: ChineSlide[] = [];
    if (vendeurPresent) liste.push({ kind: "mystere" });
    for (const it of (items ?? []).filter((x) => x.statut !== "refuse")) {
      liste.push({
        kind: "item",
        item: it,
        estRareOuPlus: estRareOuPlus(it),
        coteConnue: flairActif || (state ? aConnaisseurChinage(state, it.objet.categorie) : false),
        dejaPossede: state ? templateDejaPossede(state.collection, it.objet.templateId) : false,
      });
    }
    return liste;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendeurPresent, items, state, flairActif]);

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
        {d.chine.installationEtals}
      </main>
    );
  }

  const plein = stockageEstPlein(state);

  const setItem = (id: string, patch: Partial<ObjetEnVente>) =>
    setItems((prev) =>
      prev ? prev.map((it) => (it.id === id ? { ...it, ...patch } : it)) : prev,
    );

  /** Le Flair (N5) : révèle la cote de tout l'étal pour le reste de la session. */
  const jouerFlair = () => {
    if (utiliserActive("flair")) setFlairActif(true);
  };

  /** La Fouille (N9) : remplace l'objet ciblé par un nouveau tirage. */
  const jouerFouille = (it: ObjetEnVente) => {
    if (!items) return;
    if (!utiliserActive("fouille")) return;
    const remplacement = genererRemplacement(
      it,
      items,
      state.tendances,
      brocante,
      state.celebriteActuelle,
      uniquesExclusDuChinage(state),
    );
    setItems((prev) => (prev ? prev.map((x) => (x.id === it.id ? remplacement : x)) : prev));
  };

  /** Achat au prix affiché (bouton direct). */
  const handleAcheter = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    handleAchatAuPrix(it, it.prixVendeur);
  };

  /** Achat à un prix personnalisé (depuis la négo ou le bouton direct). */
  const handleAchatAuPrix = (it: ObjetEnVente, prix: number) => {
    if (state.budget < prix) {
      toast(d.chine.caisseRefuse, { type: "erreur" });
      return;
    }
    ajusterBudget(-prix);
    ajouterObjet({ ...it.objet, prixAchat: prix });
    // Aligne l'accumulateur d'affichage sur le +10 de découverte crédité
    // atomiquement par le GameContext (première possession du template).
    const estDecouverte = !templateDejaPossede(state.collection, it.objet.templateId);
    marquerDejaPossedeTemplate(it.objet.templateId);
    if (estDecouverte) {
      setXpBrocanteurSession((prev) => prev + XP_DECOUVERTE_COLLECTION);
      pousserXp(XP_DECOUVERTE_COLLECTION);
    }
    gagnerXPLocal(
      XP_ACHAT_BROCANTEUR *
        multiplicateurXPRarete(
          it.objet.rarete,
          !!getTemplate(it.objet.templateId)?.unique,
        ),
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
    toast(tr(d.chine.acquisPour, { prix }), { type: "succes" });
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
        xpGagne: {},
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
        titre={nomBrocante(brocante, locale)}
        items={achats.map((a) => ({
          templateId: a.templateId,
          nom: a.nom,
          categorie: a.categorie,
          prix: a.prixPaye,
        }))}
        xpGagne={{}}
        xpBrocanteur={xpBrocanteurSession}
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
      <XpFloatsVue floats={floats} />
      {activeDebloquee(state, "flair") && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "6px 14px",
            background: "var(--forest-800)",
            borderBottom: "1px solid var(--brass-700)",
          }}
        >
          <button
            type="button"
            onClick={jouerFlair}
            disabled={flairActif || usagesRestants(state.activesUtilisees, "flair", state.jourActuel, state.brocanteur.niveau) <= 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "1.5px solid var(--brass-500)",
              borderRadius: 8,
              color: "var(--brass-300)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(10px, 2.6vw, 12px)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: "4px 10px",
              cursor:
                flairActif || usagesRestants(state.activesUtilisees, "flair", state.jourActuel, state.brocanteur.niveau) <= 0
                  ? "default"
                  : "pointer",
              opacity:
                flairActif || usagesRestants(state.activesUtilisees, "flair", state.jourActuel, state.brocanteur.niveau) <= 0
                  ? 0.4
                  : 1,
            }}
          >
            🔍 {libelleActive("flair", d)} ({usagesRestants(state.activesUtilisees, "flair", state.jourActuel, state.brocanteur.niveau)})
          </button>
        </div>
      )}
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
            fouilleDebloquee={activeDebloquee(state, "fouille")}
            fouilleRestants={usagesRestants(state.activesUtilisees, "fouille", state.jourActuel, state.brocanteur.niveau)}
            onFouille={jouerFouille}
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
                  gagnerXPLocal(XP_NEGO_BROCANTEUR);
                  setNegoOuverte(null);
                }}
                onAcheterDirect={() => handleAcheter(item.id)}
                tchatche={
                  activeDebloquee(state, "tchatche")
                    ? {
                        restantes: usagesRestants(state.activesUtilisees, "tchatche", state.jourActuel, state.brocanteur.niveau),
                        consommer: () => utiliserActive("tchatche"),
                      }
                    : undefined
                }
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
