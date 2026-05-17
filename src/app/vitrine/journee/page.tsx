"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { EtatBadge } from "@/components/ui/EtatBadge";
import { SessionSummary } from "@/components/SessionSummary";
import { Panel } from "@/components/ui/Panel";
import { useGame } from "@/context/GameContext";
import {
  JOURNEE_DUREE_SECONDES,
  classeBourse,
  genererClientEvent,
  prochainIntervalleClient,
  reagirContreOffre,
  type ClientEvent,
  type VitrineModifiers,
} from "@/lib/vitrine";
import { genererPoolClients, type ClientPersonnage } from "@/data/clients";
import { niveauRequis } from "@/data/standLevels";
import {
  TREE_GENERAL,
  XP_NEGOCIATION_REUSSIE_GENERAL,
  XP_VENTE_OBJET,
  catTreeId,
} from "@/data/competences";
import {
  aGenBonneReputation,
  aGenDiplomate,
  aGenEstimateurBourse,
  aGenLecteurAmes,
  aGenOeilAiguise,
  aGenPresentationSoignee,
  aGenStandRenomme,
  aGenVerbeDOr,
  aGenVerbeHaut,
  bonusPassionCategorie,
  bonusSeuilColereCategorie,
} from "@/lib/competences";
import { CATEGORIES } from "@/data/categories";
import type {
  CategorieObjet,
  StandLevel,
  VenteHistorique,
} from "@/types/game";

const TICK_MS = 100;

interface EntreeJournal {
  id: string;
  heure: string;
  texte: string;
  ton: "vente" | "echec" | "info";
}

export default function VitrineJourneePage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    vendreDeVitrine,
    viderVitrine,
    avancerJour,
    enregistrerSession,
    gagnerXP,
  } = useGame();

  // Modifiers issus des compétences (calculés à la première occurrence où state est dispo)
  const modifiersRef = useRef<VitrineModifiers | null>(null);
  if (state && modifiersRef.current === null) {
    const bonusPassionParCategorie = new Map<CategorieObjet, number>();
    const bonusSeuilColereParCategorie = new Map<CategorieObjet, number>();
    for (const c of CATEGORIES) {
      const p = bonusPassionCategorie(state, c);
      if (p > 0) bonusPassionParCategorie.set(c, p);
      const s = bonusSeuilColereCategorie(state, c);
      if (s > 0) bonusSeuilColereParCategorie.set(c, s);
    }
    const seuilColere = aGenVerbeDOr(state)
      ? 1.6
      : aGenVerbeHaut(state)
        ? 1.4
        : 1.2;
    modifiersRef.current = {
      bonusPassionParCategorie,
      bonusSeuilColereParCategorie,
      seuilColere,
      intervalleMultiplier: aGenPresentationSoignee(state) ? 0.75 : 1,
      revelePersona: aGenLecteurAmes(state),
      releveBourse: aGenEstimateurBourse(state),
      oeilAiguise: aGenOeilAiguise(state),
      diplomate: aGenDiplomate(state),
      clientGarantiFancy: aGenStandRenomme(state),
      bonneReputation: aGenBonneReputation(state),
    };
  }

  const [tempsRestant, setTempsRestant] = useState(JOURNEE_DUREE_SECONDES);
  const [prochainClient, setProchainClient] = useState(() =>
    prochainIntervalleClient(modifiersRef.current?.intervalleMultiplier ?? 1),
  );
  const [clientActuel, setClientActuel] = useState<ClientEvent | null>(null);
  const [journal, setJournal] = useState<EntreeJournal[]>([]);
  const [contreOffre, setContreOffre] = useState<number>(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [journeeFinie, setJourneeFinie] = useState(false);
  const [ventesEffectuees, setVentesEffectuees] = useState<VenteHistorique[]>([]);
  const [fancyClientApparu, setFancyClientApparu] = useState(false);
  const [revelationFaite, setRevelationFaite] = useState(false);
  const [bravoTout, setBravoTout] = useState(false);
  const [xpSession, setXpSession] = useState<Record<string, number>>({});

  const gagnerXPLocal = (treeId: string, montant: number) => {
    gagnerXP(treeId, montant);
    setXpSession((prev) => ({
      ...prev,
      [treeId]: (prev[treeId] ?? 0) + montant,
    }));
  };
  const fancyClientApparuRef = useRef(false);
  fancyClientApparuRef.current = fancyClientApparu;
  const tempsRestantRef = useRef(JOURNEE_DUREE_SECONDES);
  /** Garde synchrone — empêche que terminerJournee s'exécute plus d'une fois. */
  const journeeTermineeRef = useRef(false);
  /** Pool de personnages pré-tirés pour la session, consommé séquentiellement. */
  const poolRef = useRef<ClientPersonnage[]>([]);
  const poolIndexRef = useRef(0);
  if (poolRef.current.length === 0) {
    poolRef.current = genererPoolClients(20);
  }

  // Snapshot du stand au montage (avant que la vitrine soit modifiée par les ventes)
  const standSnapshot = useRef<{ niveau: StandLevel; loyer: number; tailleInitiale: number } | null>(null);
  useEffect(() => {
    if (standSnapshot.current !== null) return;
    if (!state || state.vitrine.length === 0) return;
    const conf = niveauRequis(state.vitrine.length);
    if (conf) {
      standSnapshot.current = {
        niveau: conf.niveau,
        loyer: conf.loyer,
        tailleInitiale: state.vitrine.length,
      };
    }
  }, [state]);

  // Refs pour éviter les closures stale dans l'intervalle
  const vitrineRef = useRef(state?.vitrine ?? []);
  vitrineRef.current = state?.vitrine ?? [];

  const tendancesRef = useRef(state?.tendances ?? []);
  tendancesRef.current = state?.tendances ?? [];

  const clientActuelRef = useRef<ClientEvent | null>(null);
  clientActuelRef.current = clientActuel;

  useEffect(() => {
    if (!isHydrated) return;
    if (!state) {
      router.replace("/");
      return;
    }
    if (state.vitrine.length === 0 && !journeeFinie) {
      router.replace("/vitrine");
    }
  }, [isHydrated, state, router, journeeFinie]);

  const ajouterJournal = useCallback((entree: Omit<EntreeJournal, "id">) => {
    setJournal((prev) => [
      ...prev,
      { ...entree, id: crypto.randomUUID() },
    ]);
  }, []);

  const heureCourante = useCallback(() => {
    const ecoule = JOURNEE_DUREE_SECONDES - tempsRestant;
    const heuresJeu = 9 + Math.floor((ecoule / JOURNEE_DUREE_SECONDES) * 8);
    const minutes = Math.floor(((ecoule / JOURNEE_DUREE_SECONDES) * 8 * 60) % 60);
    return `${String(heuresJeu).padStart(2, "0")}h${String(minutes).padStart(2, "0")}`;
  }, [tempsRestant]);

  const terminerJournee = useCallback(() => {
    if (journeeTermineeRef.current) return;
    journeeTermineeRef.current = true;
    setJourneeFinie(true);
    setClientActuel(null);

    // Enregistre la session avant de vider la vitrine
    if (standSnapshot.current) {
      const tailleInvendus = state?.vitrine.length ?? 0;
      enregistrerSession({
        id: crypto.randomUUID(),
        type: "vente",
        jour: state?.jourActuel ?? 0,
        timestamp: Date.now(),
        niveauStand: standSnapshot.current.niveau,
        loyer: standSnapshot.current.loyer,
        ventes: ventesEffectuees,
        invendus: tailleInvendus,
      });
    }

    viderVitrine();
    avancerJour();
  }, [journeeFinie, viderVitrine, avancerJour, enregistrerSession, state, ventesEffectuees]);

  // Boucle de tick : décrémente le temps et déclenche les clients
  useEffect(() => {
    if (journeeFinie) return;

    const id = window.setInterval(() => {
      // En pause si un client est devant nous
      if (clientActuelRef.current) return;

      setTempsRestant((t) => {
        const next = Math.max(0, t - TICK_MS / 1000);
        tempsRestantRef.current = next;
        if (next === 0) {
          window.setTimeout(() => terminerJournee(), 0);
        }
        return next;
      });

      setProchainClient((p) => {
        const next = p - TICK_MS / 1000;
        if (next <= 0) {
          const mods = modifiersRef.current ?? undefined;
          const tempsEcoulePct =
            1 - tempsRestantRef.current / JOURNEE_DUREE_SECONDES;
          const forceFancy =
            !!mods?.clientGarantiFancy &&
            !fancyClientApparuRef.current &&
            tempsEcoulePct >= 0.5;
          // Tire le prochain personnage du pool (en boucle si épuisé)
          const personnage =
            poolRef.current[
              poolIndexRef.current % poolRef.current.length
            ];
          poolIndexRef.current += 1;
          const ev = personnage
            ? genererClientEvent(
                personnage,
                vitrineRef.current,
                tendancesRef.current,
                mods,
                { fancy: forceFancy },
              )
            : null;
          if (ev) {
            if (ev.fancy) setFancyClientApparu(true);
            setClientActuel(ev);
            setRevelationFaite(false);
            setContreOffre(Math.round((ev.prixDemande + ev.offreInitiale) / 2));
          }
          return prochainIntervalleClient(mods?.intervalleMultiplier ?? 1);
        }
        return next;
      });
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [journeeFinie, terminerJournee]);

  // Si la vitrine se vide en cours de journée, on marque le "bravo" et on termine.
  useEffect(() => {
    if (
      !journeeFinie &&
      isHydrated &&
      state &&
      state.vitrine.length === 0 &&
      tempsRestant < JOURNEE_DUREE_SECONDES
    ) {
      setBravoTout(true);
      ajouterJournal({
        heure: heureCourante(),
        texte: "Plus rien à vendre — étal totalement écoulé !",
        ton: "vente",
      });
      terminerJournee();
    }
  }, [state, isHydrated, journeeFinie, tempsRestant, terminerJournee, ajouterJournal, heureCourante]);

  if (!isHydrated || !state) {
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
        — installation du stand…
      </main>
    );
  }

  const enregistrerVentes = (ev: ClientEvent, prixTotal: number) => {
    // Répartit prixTotal sur les objets au prorata de leur prixVente affiché.
    const totalDemande = ev.prixDemande;
    const ratio = totalDemande > 0 ? prixTotal / totalDemande : 1;
    const nouvelles: VenteHistorique[] = ev.panier.map((p) => ({
      nom: p.objet.nom,
      categorie: p.objet.categorie,
      etat: p.objet.etat,
      prixReferenceReel: p.objet.prixReferenceReel,
      prixVente: Math.round(p.prixVente * ratio),
      prixAchat: p.objet.prixAchat ?? null,
    }));
    setVentesEffectuees((prev) => [...prev, ...nouvelles]);
    // XP par objet vendu, par catégorie
    for (const p of ev.panier) {
      gagnerXPLocal(catTreeId(p.objet.categorie), XP_VENTE_OBJET);
    }
  };

  const handleAccepterAchatDirect = (ev: ClientEvent) => {
    vendreDeVitrine(
      ev.panier.map((p) => p.objet.id),
      ev.prixDemande,
    );
    enregistrerVentes(ev, ev.prixDemande);
    ajouterJournal({
      heure: heureCourante(),
      texte: `${ev.persona.nom} achète ${describePanier(ev)} pour ${ev.prixDemande} €.`,
      ton: "vente",
    });
    setClientActuel(null);
    setFeedback(null);
  };

  const handleAccepterOffreClient = (ev: ClientEvent) => {
    vendreDeVitrine(
      ev.panier.map((p) => p.objet.id),
      ev.offreInitiale,
    );
    enregistrerVentes(ev, ev.offreInitiale);
    gagnerXPLocal(TREE_GENERAL, XP_NEGOCIATION_REUSSIE_GENERAL);
    ajouterJournal({
      heure: heureCourante(),
      texte: `${ev.persona.nom} repart avec ${describePanier(ev)} à ${ev.offreInitiale} € (négocié).`,
      ton: "vente",
    });
    setClientActuel(null);
    setFeedback(null);
  };

  const handleRefuser = (ev: ClientEvent) => {
    ajouterJournal({
      heure: heureCourante(),
      texte: `${ev.persona.nom} s'éloigne sans rien acheter.`,
      ton: "info",
    });
    setClientActuel(null);
    setFeedback(null);
  };

  const handleContreOffre = (ev: ClientEvent) => {
    const res = reagirContreOffre(
      contreOffre,
      ev,
      modifiersRef.current ?? undefined,
      { revelationDejaFaite: revelationFaite },
    );
    if (res.revelation) {
      setRevelationFaite(true);
      setFeedback(res.message);
      return;
    }
    if (res.accepte) {
      vendreDeVitrine(
        ev.panier.map((p) => p.objet.id),
        res.prixFinal,
      );
      enregistrerVentes(ev, res.prixFinal);
      gagnerXPLocal(TREE_GENERAL, XP_NEGOCIATION_REUSSIE_GENERAL);
      ajouterJournal({
        heure: heureCourante(),
        texte: `${ev.persona.nom} accepte ${describePanier(ev)} à ${res.prixFinal} €.`,
        ton: "vente",
      });
      setClientActuel(null);
      setFeedback(null);
    } else if (res.fache) {
      ajouterJournal({
        heure: heureCourante(),
        texte: res.message,
        ton: "echec",
      });
      setClientActuel(null);
      setFeedback(null);
    } else {
      setFeedback(res.message);
    }
  };

  const handleFermerEnAvance = () => {
    ajouterJournal({
      heure: heureCourante(),
      texte: "Vous baissez le rideau plus tôt que prévu.",
      ton: "info",
    });
    terminerJournee();
  };

  const handleRetourQg = () => {
    router.push("/qg");
  };

  const progress = (1 - tempsRestant / JOURNEE_DUREE_SECONDES) * 100;
  const totalVentes = journal
    .filter((j) => j.ton === "vente")
    .length;

  if (journeeFinie) {
    return (
      <SessionSummary
        type="vente"
        titre={
          bravoTout
            ? "Bravo ! Étal vidé"
            : `Journée terminée · ${totalVentes} vente${totalVentes > 1 ? "s" : ""}`
        }
        sousTitre={
          bravoTout
            ? undefined
            : totalVentes === 0
              ? "La journée se termine sans la moindre vente."
              : undefined
        }
        bravo={bravoTout}
        items={ventesEffectuees.map((v) => ({
          nom: v.nom,
          categorie: v.categorie,
          prix: v.prixVente,
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
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Colonne principale : le stand */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Panel
            eyebrow="— ouverture des halles —"
            title={journeeFinie ? "Journée terminée" : `Vitrine · ${heureCourante()}`}
          >
            {!journeeFinie && (
              <Horloge
                tempsRestant={tempsRestant}
                progress={progress}
              />
            )}

            {state.vitrine.length === 0 && !journeeFinie ? (
              <p
                style={{
                  textAlign: "center",
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  color: "var(--ink-500)",
                  marginTop: 24,
                }}
              >
                Votre étal est vide. Les badauds passent leur chemin.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                {state.vitrine.map((e) => (
                  <ArticleSurEtal
                    key={e.objet.id}
                    nom={e.objet.nom}
                    categorie={e.objet.categorie}
                    prix={e.prixVente}
                  />
                ))}
              </div>
            )}

            {!journeeFinie && (
              <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
                <Button variant="secondary" size="sm" onClick={handleFermerEnAvance}>
                  Baisser le rideau
                </Button>
              </div>
            )}

            {journeeFinie && (
              <FinDeJournee
                ventes={totalVentes}
                onRetour={handleRetourQg}
              />
            )}
          </Panel>
        </div>

        {/* Colonne journal */}
        <Panel eyebrow="— carnet du chineur —" title="Journal de bord">
          {journal.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                fontSize: 14,
                textAlign: "center",
                margin: "20px 0",
              }}
            >
              Rien n'est encore arrivé.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[...journal].reverse().map((j, i, arr) => (
                <li
                  key={j.id}
                  style={{
                    padding: "8px 0",
                    borderBottom:
                      i < arr.length - 1
                        ? "1px dotted var(--paper-500)"
                        : "none",
                    display: "flex",
                    gap: 10,
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      color: "var(--brass-700)",
                      textTransform: "uppercase",
                      flexShrink: 0,
                      width: 48,
                    }}
                  >
                    {j.heure}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: j.ton === "info" ? "italic" : "normal",
                      fontSize: 13.5,
                      lineHeight: 1.4,
                      color:
                        j.ton === "vente"
                          ? "var(--forest-700)"
                          : j.ton === "echec"
                          ? "var(--vermillion-600)"
                          : "var(--ink-700)",
                    }}
                  >
                    {j.texte}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {clientActuel && !journeeFinie && (
        <ClientModal
          ev={clientActuel}
          contreOffre={contreOffre}
          feedback={feedback}
          revelePersona={modifiersRef.current?.revelePersona ?? false}
          releveBourse={modifiersRef.current?.releveBourse ?? false}
          oeilAiguise={
            (modifiersRef.current?.oeilAiguise ?? false) || revelationFaite
          }
          revelationFaite={revelationFaite}
          onContreOffreChange={setContreOffre}
          onAccepterDirect={() => handleAccepterAchatDirect(clientActuel)}
          onAccepterOffre={() => handleAccepterOffreClient(clientActuel)}
          onContreOffrir={() => handleContreOffre(clientActuel)}
          onRefuser={() => handleRefuser(clientActuel)}
        />
      )}
    </div>
  );
}

function describePanier(ev: ClientEvent): string {
  if (ev.panier.length === 1) return `« ${ev.panier[0].objet.nom} »`;
  return `${ev.panier.length} objets`;
}

function Horloge({
  tempsRestant,
  progress,
}: {
  tempsRestant: number;
  progress: number;
}) {
  const sec = Math.ceil(tempsRestant);
  return (
    <div style={{ marginTop: 6 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
        }}
      >
        <span>Temps restant</span>
        <span>{sec}s</span>
      </div>
      <div
        style={{
          height: 6,
          background: "var(--paper-400)",
          marginTop: 6,
          border: "1px solid var(--brass-700)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${progress}%`,
            background: "var(--forest-700)",
            transition: "width 100ms linear",
          }}
        />
      </div>
    </div>
  );
}

function ArticleSurEtal({
  nom,
  categorie,
  prix,
}: {
  nom: string;
  categorie: CategorieObjet;
  prix: number;
}) {
  return (
    <article
      style={{
        position: "relative",
        background: "var(--paper-300)",
        border: "1px solid var(--brass-500)",
        padding: 10,
        boxShadow: "0 2px 0 var(--paper-400)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
        }}
      >
        <CategorieIcon
          categorie={categorie}
          size={14}
          color="var(--brass-700)"
        />
        {categorie}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--forest-800)",
          marginTop: 4,
          lineHeight: 1.2,
        }}
      >
        {nom}
      </div>
      <div
        style={{
          marginTop: 8,
          paddingTop: 6,
          borderTop: "1px dotted var(--paper-500)",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 18,
          color: "var(--forest-800)",
          textAlign: "right",
        }}
      >
        {prix}
        <span style={{ fontSize: 11, color: "var(--brass-700)" }}>€</span>
      </div>
    </article>
  );
}

function ClientModal({
  ev,
  contreOffre,
  feedback,
  revelePersona,
  releveBourse,
  oeilAiguise,
  revelationFaite,
  onContreOffreChange,
  onAccepterDirect,
  onAccepterOffre,
  onContreOffrir,
  onRefuser,
}: {
  ev: ClientEvent;
  contreOffre: number;
  feedback: string | null;
  revelePersona: boolean;
  releveBourse: boolean;
  oeilAiguise: boolean;
  revelationFaite: boolean;
  onContreOffreChange: (v: number) => void;
  onAccepterDirect: () => void;
  onAccepterOffre: () => void;
  onContreOffrir: () => void;
  onRefuser: () => void;
}) {
  const bourseLabel = (() => {
    const c = classeBourse(ev.persona);
    if (c === "petite") return "◦ petite bourse";
    if (c === "moyenne") return "◇ bourse moyenne";
    return "◆ grosse bourse";
  })();
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,30,22,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        style={{
          position: "relative",
          background: "var(--paper-200)",
          backgroundImage: "url(/assets/paper-grain.svg)",
          backgroundSize: "320px 320px",
          border: "1px solid var(--brass-500)",
          boxShadow:
            "inset 0 0 0 4px var(--paper-200), inset 0 0 0 5px var(--brass-500), 0 24px 60px rgba(15,30,22,0.5)",
          padding: "28px 32px",
          maxWidth: 540,
          width: "100%",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontSize: 10,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: ev.fancy ? "var(--vermillion-600)" : "var(--brass-700)",
            fontWeight: 600,
          }}
        >
          — {ev.fancy ? "une bourse rondelette s'approche" : "un client s'approche"} —
        </div>
        <h2
          style={{
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
            margin: "6px 0 4px",
            lineHeight: 1.1,
          }}
        >
          {revelePersona ? ev.persona.nom : "Un inconnu"}
        </h2>
        {revelePersona && (
          <>
            <div
              style={{
                textAlign: "center",
                fontFamily: "var(--font-display)",
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
                margin: "0 0 6px",
              }}
            >
              — {ev.persona.archetypeNom} —
            </div>
            <p
              style={{
                textAlign: "center",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 14,
                color: "var(--ink-500)",
                margin: "0 0 8px",
              }}
            >
              {ev.persona.ambiance}
            </p>
          </>
        )}
        {releveBourse && (
          <p
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              margin: "0 0 12px",
            }}
            title="Compétence Estimateur de bourse"
          >
            {bourseLabel}
          </p>
        )}

        <DecoDivider />

        {oeilAiguise && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              border: `1px ${revelationFaite ? "solid" : "dashed"} var(--brass-700)`,
              background: revelationFaite
                ? "rgba(163, 59, 42, 0.08)"
                : "var(--paper-300)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "var(--ink-700)",
            }}
            title={
              revelationFaite
                ? "Diplomate — le client a révélé son plafond"
                : "Compétence Œil aiguisé"
            }
          >
            <span style={{ color: "var(--brass-700)" }}>
              {revelationFaite ? "PLAFOND LÂCHÉ" : "PRIX MAX LU"}
            </span>
            <span style={{ color: "var(--forest-700)", fontWeight: 700 }}>
              {ev.prixMax} €
            </span>
          </div>
        )}

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {ev.panier.map((p) => (
            <div
              key={p.objet.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: "var(--paper-300)",
                border: "1px solid var(--brass-700)",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: 13,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--forest-800)",
                  }}
                >
                  {p.objet.nom}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <EtatBadge etat={p.objet.etat} />
                </div>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--forest-800)",
                }}
              >
                {p.prixVente}
                <span style={{ fontSize: 11, color: "var(--brass-700)" }}>€</span>
              </span>
            </div>
          ))}
        </div>

        {ev.mode === "achat-direct" ? (
          <div style={{ marginTop: 18 }}>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                color: "var(--ink-700)",
                margin: "0 0 14px",
              }}
            >
              « Je prends. Voici {ev.prixDemande} €. »
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="md" onClick={onRefuser}>
                Refuser
              </Button>
              <Button variant="primary" size="md" onClick={onAccepterDirect}>
                Vendre · {ev.prixDemande} €
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                color: "var(--ink-700)",
                margin: "0 0 14px",
              }}
            >
              « Pour tout cela ? Je vous en propose{" "}
              <strong style={{ color: "var(--forest-800)" }}>{ev.offreInitiale} €</strong>.
              Vous demandez {ev.prixDemande} €, c'est un peu raide. »
            </p>

            {feedback && (
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 14,
                  color: "var(--vermillion-600)",
                  margin: "0 0 12px",
                }}
              >
                {feedback}
              </p>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--brass-700)",
                }}
              >
                Votre contre-offre
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--paper-300)",
                  border: "1px solid var(--brass-700)",
                  padding: "4px 10px",
                }}
              >
                <input
                  type="number"
                  min={1}
                  value={contreOffre}
                  onChange={(e) =>
                    onContreOffreChange(Math.max(1, Number(e.target.value) || 1))
                  }
                  style={{
                    width: 80,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 18,
                    color: "var(--forest-800)",
                    textAlign: "right",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    color: "var(--brass-700)",
                    marginLeft: 4,
                  }}
                >
                  €
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <Button variant="ghost" size="md" onClick={onRefuser}>
                Refuser
              </Button>
              <Button variant="secondary" size="md" onClick={onAccepterOffre}>
                Accepter · {ev.offreInitiale} €
              </Button>
              <Button variant="primary" size="md" onClick={onContreOffrir}>
                Contre-offre · {contreOffre} €
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FinDeJournee({
  ventes,
  onRetour,
}: {
  ventes: number;
  onRetour: () => void;
}) {
  return (
    <div style={{ marginTop: 24, textAlign: "center" }}>
      <DecoDivider />
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 17,
          color: "var(--ink-700)",
          margin: "18px 0 8px",
        }}
      >
        {ventes === 0
          ? "La journée se termine sans la moindre vente."
          : ventes === 1
          ? "Une seule vente aujourd'hui. C'est un début."
          : `${ventes} ventes inscrites au carnet.`}
      </p>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
          marginBottom: 18,
        }}
      >
        Les invendus retournent dans votre vitrine privée.
      </p>
      <Button variant="primary" size="lg" onClick={onRetour}>
        Rentrer au QG
      </Button>
    </div>
  );
}
