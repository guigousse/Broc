"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { ItemCard } from "@/components/ui/ItemCard";
import { SessionSummary } from "@/components/SessionSummary";
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { ActionFab } from "@/components/mobile/ActionFab";
import { NegociationSheet } from "@/components/mobile/NegociationSheet";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { coutEntree, getBrocanteById } from "@/data/brocantes";
import { estDebloquee } from "@/lib/deblocage";
import { genererSession, reagirNegociation } from "@/lib/chine";
import { stockageEstPlein } from "@/lib/stockage";
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
  } = useGame();
  const { startCrowd, stopCrowd } = useSettings();
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
  /** Négociation en cours par objet : id → offre saisie. */
  const [negoEnCours, setNegoEnCours] = useState<Record<string, number>>({});
  /** Affiche le résumé de session avant retour au QG. */
  const [resumeOuvert, setResumeOuvert] = useState(false);
  /** XP gagnée localement durant la session, par arbre. */
  const [xpSession, setXpSession] = useState<Record<string, number>>({});
  /** ID de l'objet dont la négociation est ouverte dans le BottomSheet. */
  const [negoOuverte, setNegoOuverte] = useState<string | null>(null);

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
      if (!estDebloquee(brocante, state)) return router.replace("/chiner");
      const frais = coutEntree(brocante);
      if (state.budget < frais) {
        return router.replace(`/chiner?raison=budget&id=${brocante.id}`);
      }
      entreePayeeRef.current = true;
      ajusterBudget(-frais);
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
    }
  }, [isHydrated, state, brocante, router, items, ajusterBudget]);

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

  const handleFermerNego = (id: string) => {
    setNegoEnCours((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  /**
   * Propose une offre directement (offre passée en argument, pas lue depuis negoEnCours).
   * Utilisé par NegociationSheet pour éviter le problème de batching React.
   */
  const handleProposerOffre = (id: string, offre: number) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const res = reagirNegociation(
      offre,
      { prixVendeur: it.prixVendeur, prixMinAccept: it.prixMinAccept },
      it.negociationsTentees,
    );
    if (res.accepte) {
      setItem(id, {
        prixVendeur: res.prixFinal,
        prixMinAccept: res.prixFinal,
        negociationsTentees: it.negociationsTentees + 1,
        statut: "disponible",
      });
      handleFermerNego(id);
      gagnerXPLocal(TREE_GENERAL, XP_NEGOCIATION_REUSSIE_GENERAL);
    } else if (res.fache) {
      setItem(id, {
        negociationsTentees: it.negociationsTentees + 1,
        statut: "refuse",
      });
      handleFermerNego(id);
    } else {
      // Refus poli
      setItem(id, { negociationsTentees: it.negociationsTentees + 1 });
    }
    setFlash(res.message);
  };

  const handleAcheter = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if (state.budget < it.prixVendeur) {
      setFlash("La caisse refuse — fonds insuffisants.");
      return;
    }
    ajusterBudget(-it.prixVendeur);
    ajouterObjet({ ...it.objet, prixAchat: it.prixVendeur });
    marquerDejaPossedeTemplate(it.objet.templateId);
    gagnerXPLocal(catTreeId(it.objet.categorie), XP_ACHAT_OBJET);
    setItem(id, { statut: "achete" });
    setAchats((prev) => [
      ...prev,
      {
        nom: it.objet.nom,
        categorie: it.objet.categorie,
        etat: it.objet.etat,
        prixReferenceReel: it.objet.prixReferenceReel,
        prixPaye: it.prixVendeur,
      },
    ]);
    setFlash(`Acquis pour ${it.prixVendeur} €. Noté dans le carnet.`);
  };

  const handleRentrer = () => {
    setResumeOuvert(true);
  };

  const handleRetourQg = () => {
    if (sessionEnregistreeRef.current) {
      router.push("/qg");
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
      });
    }
    avancerJour();
    router.push("/qg");
  };

  if (resumeOuvert) {
    return (
      <SessionSummary
        type="chinage"
        titre={brocante.nom}
        sousTitre={`${achats.length} pièce${achats.length > 1 ? "s" : ""} ramenée${achats.length > 1 ? "s" : ""} de la chine.`}
        items={achats.map((a) => ({
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
      <main
        style={{
          flex: 1,
          padding: `12px 12px calc(80px + var(--safe-bottom))`,
          overflowY: "auto",
        }}
      >
        {flash && (
          <div
            style={{
              padding: "10px 12px",
              background: "var(--brass-100)",
              border: "1px solid var(--brass-700)",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--ink-700)",
              marginBottom: 10,
            }}
          >
            « {flash} »
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {(items ?? []).map((it) => (
            <ObjetCardMobile
              key={it.id}
              item={it}
              budget={state.budget}
              plein={plein}
              onNegocier={() => setNegoOuverte(it.id)}
              onAcheter={() => handleAcheter(it.id)}
            />
          ))}
        </div>
      </main>

      {plein && (
        <div
          role="status"
          style={{
            padding: "8px 12px",
            background: "var(--vermillion-600)",
            color: "var(--paper-100)",
            border: "1px solid var(--velvet-700)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Stockage plein
        </div>
      )}
      <ActionFab
        buttons={[
          {
            label: "Rentrer · fin de journée",
            variant: "secondary",
            onClick: handleRentrer,
          },
        ]}
      />

      {negoOuverte && (() => {
        const it = (items ?? []).find((i) => i.id === negoOuverte);
        if (!it) return null;
        return (
          <NegociationSheet
            open
            onClose={() => setNegoOuverte(null)}
            prixAffiche={it.prixVendeur}
            offreInitiale={Math.round(it.prixVendeur * 0.8)}
            onProposer={(offre) => {
              handleProposerOffre(it.id, offre);
              setNegoOuverte(null);
            }}
          />
        );
      })()}
    </div>
  );
}

function ObjetCardMobile({
  item,
  budget,
  plein,
  onNegocier,
  onAcheter,
}: {
  item: ObjetEnVente;
  budget: number;
  plein: boolean;
  onNegocier: () => void;
  onAcheter: () => void;
}) {
  const { objet, prixVendeur, statut } = item;
  const tropCher = budget < prixVendeur;

  if (statut === "achete") {
    return (
      <ItemCard
        templateId={objet.templateId}
        categorie={objet.categorie}
        etat={objet.etat}
        rarete={objet.rarete}
        nom={objet.nom}
        dimmed
        footer={
          <div
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-500)",
              padding: "4px 0",
            }}
          >
            — Acquis —
          </div>
        }
      />
    );
  }

  return (
    <ItemCard
      templateId={objet.templateId}
      categorie={objet.categorie}
      etat={objet.etat}
      rarete={objet.rarete}
      nom={objet.nom}
      style={
        statut === "refuse"
          ? { borderColor: "var(--vermillion-600)" }
          : undefined
      }
      footer={
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.06em",
              color: "var(--ink-500)",
              padding: "2px 4px",
            }}
          >
            <span>
              {item.negociationsTentees > 0
                ? "Prix négocié :"
                : "Prix demandé :"}
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14,
                fontWeight: 700,
                color: tropCher ? "var(--vermillion-600)" : "var(--forest-800)",
              }}
            >
              {prixVendeur} €
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <button
              type="button"
              onClick={onNegocier}
              disabled={plein}
              style={{
                ...miniBtn(false),
                opacity: plein ? 0.45 : 1,
                cursor: plein ? "not-allowed" : "pointer",
              }}
            >
              Négo
            </button>
            <button
              type="button"
              onClick={onAcheter}
              disabled={tropCher || plein}
              style={{
                ...miniBtn(true),
                opacity: tropCher || plein ? 0.45 : 1,
                cursor: tropCher || plein ? "not-allowed" : "pointer",
                ...(item.negociationsTentees > 0 && !tropCher && !plein
                  ? {
                      background: "var(--brass-700)",
                      color: "var(--paper-100)",
                      boxShadow:
                        "inset 0 0 0 1px var(--brass-700), 0 0 0 2px var(--brass-300), 0 2px 6px rgba(176,136,56,0.45)",
                      animation: "broc-pulse 1.6s ease-in-out infinite",
                    }
                  : {}),
              }}
            >
              Acheter
            </button>
          </div>
        </>
      }
    />
  );
}

const miniBtn = (primary: boolean): CSSProperties => ({
  padding: "6px 0",
  textAlign: "center",
  fontFamily: "var(--font-display)",
  fontSize: 8.5,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  background: primary ? "var(--forest-800)" : "var(--paper-100)",
  color: primary ? "var(--brass-300)" : "var(--forest-800)",
  cursor: "pointer",
});
