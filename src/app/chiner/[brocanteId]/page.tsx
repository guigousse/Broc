"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { EtatBadge } from "@/components/ui/EtatBadge";
import { SessionSummary } from "@/components/SessionSummary";
import { useGame } from "@/context/GameContext";
import { getBrocanteById } from "@/data/brocantes";
import { estDebloquee } from "@/lib/deblocage";
import { genererSession, reagirNegociation } from "@/lib/chine";
import { aConnaisseurChinage } from "@/lib/competences";
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
  } = useGame();

  const brocante = useMemo(
    () => getBrocanteById(params.brocanteId),
    [params.brocanteId],
  );

  const [items, setItems] = useState<ObjetEnVente[] | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [achats, setAchats] = useState<AchatHistorique[]>([]);
  /** Garde synchrone — empêche un double-enregistrement de la session. */
  const sessionEnregistreeRef = useRef(false);
  /** Négociation en cours par objet : id → offre saisie. */
  const [negoEnCours, setNegoEnCours] = useState<Record<string, number>>({});
  /** Affiche le résumé de session avant retour au QG. */
  const [resumeOuvert, setResumeOuvert] = useState(false);
  /** XP gagnée localement durant la session, par arbre. */
  const [xpSession, setXpSession] = useState<Record<string, number>>({});

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
    if (items === null) {
      if (!estDebloquee(brocante, state)) return router.replace("/chiner");
      setItems(genererSession(brocante.taillePool, state.tendances));
    }
  }, [isHydrated, state, brocante, router, items]);

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

  const setItem = (id: string, patch: Partial<ObjetEnVente>) =>
    setItems((prev) =>
      prev ? prev.map((it) => (it.id === id ? { ...it, ...patch } : it)) : prev,
    );

  const handleDemanderPrix = (id: string) => setItem(id, { prixAffiche: true });

  const handleOuvrirNego = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    setNegoEnCours((prev) => ({
      ...prev,
      [id]: prev[id] ?? Math.max(1, Math.round(it.prixVendeur * 0.75)),
    }));
    if (!it.prixAffiche) setItem(id, { prixAffiche: true });
  };

  const handleFermerNego = (id: string) => {
    setNegoEnCours((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleChangerOffre = (id: string, valeur: number) => {
    setNegoEnCours((prev) => ({ ...prev, [id]: Math.max(1, valeur) }));
  };

  const handleProposer = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const offre = negoEnCours[id];
    if (!offre) return;
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
      // Refus poli : on garde la nego ouverte pour retenter
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
      className="bg-paper-grain"
      style={{ minHeight: "100dvh", padding: "20px 28px 32px" }}
    >
      <StatusBar jour={state.jourActuel} budget={state.budget} />

      <div
        style={{
          maxWidth: 1280,
          margin: "32px auto 0",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
          }}
        >
          <div>
            <div className="eyebrow">— {brocante.ambiance} —</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--forest-800)",
                margin: "4px 0 8px",
                lineHeight: 1.1,
              }}
            >
              {brocante.nom}
            </h1>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                fontSize: 16,
                margin: 0,
                maxWidth: 540,
              }}
            >
              {brocante.description}
            </p>
          </div>
          <Button variant="secondary" size="md" onClick={handleRentrer}>
            Rentrer · Fin de journée
          </Button>
        </header>

        {flash && (
          <div
            style={{
              padding: "12px 16px",
              background: "var(--paper-100)",
              border: "1px solid var(--brass-500)",
              boxShadow:
                "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px var(--brass-700)",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 15,
              color: "var(--ink-700)",
            }}
          >
            « {flash} »
          </div>
        )}

        <DecoDivider />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {items.map((it) => (
            <ObjetEnVenteCard
              key={it.id}
              item={it}
              budget={state.budget}
              oeilExerce={aConnaisseurChinage(state, it.objet.categorie)}
              negoOffre={negoEnCours[it.id]}
              onDemanderPrix={() => handleDemanderPrix(it.id)}
              onOuvrirNego={() => handleOuvrirNego(it.id)}
              onAnnulerNego={() => handleFermerNego(it.id)}
              onChangerOffre={(v) => handleChangerOffre(it.id, v)}
              onProposer={() => handleProposer(it.id)}
              onAcheter={() => handleAcheter(it.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ObjetEnVenteCardProps {
  item: ObjetEnVente;
  budget: number;
  oeilExerce: boolean;
  negoOffre: number | undefined;
  onDemanderPrix: () => void;
  onOuvrirNego: () => void;
  onAnnulerNego: () => void;
  onChangerOffre: (v: number) => void;
  onProposer: () => void;
  onAcheter: () => void;
}

function ObjetEnVenteCard({
  item,
  budget,
  oeilExerce,
  negoOffre,
  onDemanderPrix,
  onOuvrirNego,
  onAnnulerNego,
  onChangerOffre,
  onProposer,
  onAcheter,
}: ObjetEnVenteCardProps) {
  const { objet, prixAffiche, prixVendeur, statut, negociationsTentees } = item;
  const tropCher = budget < prixVendeur;
  const ref = `N°${item.id.slice(0, 6).toUpperCase()}`;
  const negoOuverte = negoOffre !== undefined;

  return (
    <article
      style={{
        position: "relative",
        background: "var(--paper-300)",
        border: `1px solid ${
          statut === "refuse" ? "var(--vermillion-600)" : "var(--brass-500)"
        }`,
        padding: 14,
        boxShadow:
          statut === "achete"
            ? "inset 0 0 0 1px var(--forest-800)"
            : "0 2px 0 var(--paper-400), 0 4px 10px rgba(40,25,5,0.08)",
        opacity: statut === "achete" ? 0.6 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 3,
          border: "1px solid rgba(138,106,38,0.4)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          aspectRatio: "4/3",
          background:
            "linear-gradient(135deg, var(--paper-500) 0%, var(--brass-700) 100%)",
          border: "1px solid var(--brass-700)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          color: "var(--brass-100)",
        }}
      >
        <CategorieIcon
          categorie={objet.categorie}
          size={36}
          strokeWidth={1.25}
          color="var(--brass-100)"
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          {objet.categorie}
        </span>
      </div>

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          color: "var(--brass-700)",
          letterSpacing: "0.08em",
        }}
      >
        {ref}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--forest-800)",
          lineHeight: 1.2,
        }}
      >
        {objet.nom}
      </div>

      {oeilExerce && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "var(--brass-700)",
          }}
          title="Compétence Œil exercé"
        >
          <span>RÉF.</span>
          <span style={{ color: "var(--forest-700)" }}>
            {objet.prixReferenceReel} €
          </span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 8,
          borderTop: "1px dotted var(--paper-500)",
        }}
      >
        <EtatBadge etat={objet.etat} />
        {prixAffiche ? (
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 20,
              color: "var(--forest-800)",
            }}
          >
            {prixVendeur}
            <span style={{ fontSize: 11, color: "var(--brass-700)" }}>€</span>
          </span>
        ) : (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--ink-500)",
              fontStyle: "italic",
            }}
          >
            sans étiquette
          </span>
        )}
      </div>

      {negoOuverte && statut === "disponible" && (
        <div
          style={{
            marginTop: 4,
            padding: 8,
            background: "var(--paper-100)",
            border: "1px solid var(--brass-700)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
                flex: 1,
              }}
            >
              Votre offre
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--paper-300)",
                border: "1px solid var(--brass-700)",
                padding: "2px 6px",
              }}
            >
              <input
                type="number"
                min={1}
                value={negoOffre}
                onChange={(e) =>
                  onChangerOffre(Math.max(1, Number(e.target.value) || 1))
                }
                style={{
                  width: 60,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--forest-800)",
                  textAlign: "right",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  color: "var(--brass-700)",
                  marginLeft: 3,
                }}
              >
                €
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button size="sm" onClick={onProposer}>
              Proposer
            </Button>
            <Button size="sm" variant="ghost" onClick={onAnnulerNego}>
              Annuler
            </Button>
          </div>
          {negociationsTentees > 0 && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.14em",
                color: "var(--ink-500)",
                fontStyle: "italic",
              }}
            >
              {negociationsTentees} tentative
              {negociationsTentees > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {!negoOuverte && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 4,
          }}
        >
          {statut === "achete" && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--forest-700)",
              }}
            >
              ✦ acquis
            </span>
          )}
          {statut === "refuse" && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--vermillion-600)",
                fontStyle: "italic",
              }}
            >
              vendeur fâché
            </span>
          )}

          {statut === "disponible" && !prixAffiche && (
            <Button size="sm" variant="secondary" onClick={onDemanderPrix}>
              Demander le prix
            </Button>
          )}
          {statut === "disponible" && prixAffiche && (
            <>
              <Button size="sm" onClick={onAcheter} disabled={tropCher}>
                Acquérir · {prixVendeur} €
              </Button>
              <Button size="sm" variant="secondary" onClick={onOuvrirNego}>
                Négocier
              </Button>
            </>
          )}
        </div>
      )}
    </article>
  );
}
