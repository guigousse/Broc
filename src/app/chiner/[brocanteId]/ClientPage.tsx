"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { ItemCard } from "@/components/ui/ItemCard";
import { SessionSummary } from "@/components/SessionSummary";
import { ContextualHeader } from "@/components/mobile/ContextualHeader";
import { ActionFab } from "@/components/mobile/ActionFab";
import { NegociationSheet } from "@/components/mobile/NegociationSheet";
import {
  getVendeurIllustration,
  getVendeurIllustrationFache,
} from "@/lib/personaIllustrations";
import { NegoItemRow } from "@/components/mobile/NegoItemRow";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { fraisEntree, getBrocanteById } from "@/data/brocantes";
import {
  calculerBrocantesDebloqueesParTier,
  estDebloquee,
} from "@/lib/deblocage";
import { genererSession } from "@/lib/chine";
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
    payerFraisBrocante,
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
      entreePayeeRef.current = true;
      payerFraisBrocante(brocante.id, brocante.nom, frais);
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
  }, [isHydrated, state, brocante, router, items, payerFraisBrocante]);

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
            gridTemplateColumns: "repeat(auto-fill, minmax(var(--card-w), 1fr))",
            gap: "var(--gutter)",
          }}
        >
          {(items ?? []).filter((it) => it.statut !== "refuse").map((it) => (
            <ObjetCardMobile
              key={it.id}
              item={it}
              budget={state.budget}
              plein={plein}
              onNegocier={() => setNegoOuverte(it.id)}
              onAcheter={() => handleAcheter(it.id)}
              onAcheterApresRefusPoli={() => {
                const prixFinal = it.negociation?.prixAdverseCourant ?? it.prixVendeur;
                handleAchatAuPrix(it, prixFinal);
              }}
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
            onClick: handleRentrer,
          },
        ]}
      />

      {(items ?? []).map((it) => (
        <NegociationSheet
          key={it.id}
          open={negoOuverte === it.id}
          onClose={() => setNegoOuverte(null)}
          mode="achat"
          persona={it.persona}
          echelleMax={it.prixVendeur}
          cibleSecrete={it.prixMinAccept}
          prixDepartAdverse={it.negociation?.prixAdverseCourant ?? it.prixVendeur}
          nego={it.negociation}
          nomAffiche="Un vendeur"
          illustrationSrc={getVendeurIllustration(it.persona.archetype)}
          illustrationFacheSrc={getVendeurIllustrationFache(it.persona.archetype)}
          personaInfo={{
            archetypeNom: undefined,
            revelePersona: false,
            releveBourse: false,
            oeilAiguise: false,
          }}
          header={
            <NegoItemRow
              objet={it.objet}
              prix={it.prixVendeur}
              prixLabel="Prix affiché"
            />
          }
          onUpdateNego={(nego) => {
            setItem(it.id, { negociation: nego });
          }}
          onConclu={(prixFinal) => {
            handleAchatAuPrix(it, prixFinal);
            gagnerXPLocal(TREE_GENERAL, XP_NEGOCIATION_REUSSIE_GENERAL);
            setNegoOuverte(null);
          }}
        />
      ))}
    </div>
  );
}

function ObjetCardMobile({
  item,
  budget,
  plein,
  onNegocier,
  onAcheter,
  onAcheterApresRefusPoli,
}: {
  item: ObjetEnVente;
  budget: number;
  plein: boolean;
  onNegocier: () => void;
  onAcheter: () => void;
  onAcheterApresRefusPoli: () => void;
}) {
  const { objet, prixVendeur, statut } = item;
  const tropCher = budget < prixVendeur;
  const refusPoli = item.negociation?.statut === "refus_poli";
  const fache = item.negociation?.statut === "fache";

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

  if (fache) {
    return (
      <div style={{ position: "relative" }}>
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
              — Indisponible —
            </div>
          }
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              transform: "rotate(-18deg)",
              color: "var(--vermillion-600)",
              fontFamily: "var(--font-display)",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              border: "2px solid var(--vermillion-600)",
              padding: "5px 12px",
              background: "rgba(255, 245, 232, 0.85)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
              whiteSpace: "nowrap",
            }}
          >
            Vendeur fâché
          </span>
        </div>
      </div>
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
            {refusPoli ? (
              <button
                type="button"
                onClick={onAcheterApresRefusPoli}
                disabled={tropCher || plein}
                style={{
                  ...miniBtn(true),
                  gridColumn: "1 / -1",
                  opacity: tropCher || plein ? 0.45 : 1,
                  cursor: tropCher || plein ? "not-allowed" : "pointer",
                  background: "var(--brass-700)",
                  color: "var(--paper-100)",
                }}
              >
                Acheter — {item.negociation?.prixAdverseCourant ?? prixVendeur} €
              </button>
            ) : (
              <>
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
              </>
            )}
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
