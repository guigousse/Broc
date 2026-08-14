"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { BookOpen, CalendarDays, CalendarRange } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { missionLivrable } from "@/lib/quetes/objectifs";
import { prochainMinuitLocalMs, prochainLundiLocalMs } from "@/lib/quetes/periode";
import { NIVEAU_QUETES_PERIODIQUES } from "@/lib/quetes/settlePeriodiques";
import { chapitrePret } from "@/lib/quetes/principales";
import { useCarnetSections, type CleSection } from "./useCarnetSections";
import { SectionRetractable } from "./SectionRetractable";
import { CarteHistoire } from "./CarteHistoire";
import { LigneQuete } from "./LigneQuete";
import { useCeremonieLivraison } from "./useCeremonieLivraison";
import type { Courrier, GameState, MissionResolution } from "@/types/game";

interface CarnetOverlayProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onLivrerMission: (courrierId: string) => { ok: boolean; raison?: string };
  /** Temps de confiance (epoch ms) ; `Date.now()` à défaut. */
  tempsConfiance?: () => number | null;
  /** Quête à ouvrir d'office (badge livrable tapé) : section + ligne dépliées, scroll. */
  missionInitialeId?: string | null;
  onChapitreLivre?: (courrierId: string) => void;
}

function formatRestant(ms: number): string {
  const min = Math.max(0, Math.ceil(ms / 60000));
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
  }
  return `${min} min`;
}

/* ─── tri des missions actives (transposé de OngletCommandes.tsx) ─── */

function trierActives(
  missions: MissionResolution[],
  byId: Map<string, Courrier>,
  state: GameState,
  /** Commande en cours de cérémonie : traitée comme rang 0 (livrable) même si
   *  elle est déjà « livree » côté state — sinon elle dégringole dans la
   *  liste pendant l'envol des jetons, sous les yeux du joueur. */
  ceremonieId?: string | null,
) {
  // ⚠ `missionLivrable`, PAS `estMissionLivrable` seule : une quête chiffrée
  // (`cibles: []`) est vacuously "toutes ses cibles remplies" (0 === 0) et
  // dégringolerait en tête de liste sans jamais être réellement livrable
  // (même piège que le compteur d'en-tête, cf. lib/quetes/objectifs.ts).
  return [...missions].sort((a, b) => {
    const ca = byId.get(a.courrierId);
    const cb = byId.get(b.courrierId);
    const pa = ca?.payload.type === "mission" ? ca.payload : null;
    const pb = cb?.payload.type === "mission" ? cb.payload : null;
    const lva = a.courrierId === ceremonieId || (pa && ca && missionLivrable(pa, a, state, ca.jourRecu)) ? 0 : 1;
    const lvb = b.courrierId === ceremonieId || (pb && cb && missionLivrable(pb, b, state, cb.jourRecu)) ? 0 : 1;
    if (lva !== lvb) return lva - lvb; // livrables d'abord
    const ja = pa?.jourLimite ?? Infinity;
    const jb = pb?.jourLimite ?? Infinity;
    if (ja !== jb) return ja - jb; // échéance proche
    return (ca?.jourRecu ?? 0) - (cb?.jourRecu ?? 0);
  });
}

/* ─── styles (jetons uniquement) ─── */

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.55)",
  zIndex: 50,
  animation: "broc-fade-in 160ms ease",
};

/* La fenêtre est ancrée entre le header supérieur et la TabBar, comme
 * l'ancien `RegistreOverlay` — rien ne chevauche le chrome. */
const stage: CSSProperties = {
  position: "fixed",
  top: "calc(var(--safe-top) + var(--mobile-header-h) + 8px)",
  left: 0,
  right: 0,
  bottom: "calc(var(--mobile-tabbar-h) + var(--safe-bottom) + 8px)",
  zIndex: 51,
  display: "flex",
  justifyContent: "center",
  padding: "0 12px",
};

const colonne: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  height: "100%",
  display: "flex",
  flexDirection: "column",
};

const chassis: CSSProperties = {
  position: "relative",
  flex: 1,
  minHeight: 0,
  background: "var(--paper-200)",
  border: "1px solid var(--brass-500)",
  borderRadius: 8,
  boxShadow: "0 14px 28px rgba(15,30,22,0.4)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

/* Marque-page décoratif planté en haut du carnet, dans l'esprit du châssis
 * relié en cuir des autres fenêtres du QG. */
const marquePage: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 28,
  width: 20,
  height: 30,
  background: "var(--brass-500)",
  borderRadius: "0 0 5px 5px",
  boxShadow: "0 3px 6px rgba(15,30,22,0.35)",
  zIndex: 2,
};

const closeBtn: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  width: 30,
  height: 30,
  borderRadius: 15,
  background: "var(--brass-700)",
  border: "1px solid var(--brass-500)",
  color: "var(--paper-100)",
  fontSize: 13,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  zIndex: 2,
};

const enTete: CSSProperties = {
  padding: "18px 20px 10px",
  textAlign: "center",
  borderBottom: "1px solid var(--brass-500)",
};

const titreStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 18,
  letterSpacing: "0.06em",
  color: "var(--ink-900)",
  margin: 0,
};

const sousTitreStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--ink-500)",
  marginTop: 4,
};

const corps: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "0 14px 18px",
};

const ligneEtatStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  color: "var(--ink-500)",
  textAlign: "center",
  padding: "24px 10px",
  margin: 0,
};

/**
 * Le châssis du carnet : assemble le voile, la fenêtre calée entre header et
 * TabBar (repris de `RegistreOverlay`), et les trois sections rétractables.
 * Remplace l'ancien registre à onglets — plus d'onglet Comptes, plus de
 * replay `SessionSummary`, plus de section Terminées.
 */
export function CarnetOverlay({
  open,
  onClose,
  state,
  onLivrerMission,
  tempsConfiance,
  missionInitialeId,
  onChapitreLivre,
}: CarnetOverlayProps) {
  const { d, tr } = useLangue();
  const { estRepliee, basculer } = useCarnetSections();
  const { ceremonieId, lancer } = useCeremonieLivraison({
    state,
    onLivrerMission,
    tempsConfiance,
    onChapitreLivre,
  });

  /** Quête périodique dépliée (accordéon, une seule à la fois). */
  const [ouvertId, setOuvertId] = useState<string | null>(missionInitialeId ?? null);
  const [, tick] = useState(0);

  const byId = useMemo(() => new Map(state.courriers.map((c) => [c.id, c])), [state.courriers]);

  // Minuteur du renouvellement des sections périodiques (« Renouvellement dans t »).
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Chrome repris de RegistreOverlay : verrou du défilement du body + Échap.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Ouverture ciblée (badge livrable tapé, ou commande que le grand-père
  // vient d'inscrire dans le carnet resté ouvert) : la déplier et l'amener
  // dans la zone visible. `ouvertId` étant initialisé au seul montage, la
  // resynchro ici est ce qui couvre le cas « le carnet était déjà ouvert ».
  useEffect(() => {
    if (!missionInitialeId) return;
    setOuvertId(missionInitialeId);
    const el = Array.from(document.querySelectorAll<HTMLElement>("[data-commande-id]")).find(
      (n) => n.dataset.commandeId === missionInitialeId,
    );
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "start" });
  }, [missionInitialeId]);

  // La commande en cérémonie est déjà « livree » dans le state : on la garde
  // parmi les actives le temps que les jetons rejoignent le header.
  const actives = useMemo(
    () => state.missions.filter((m) => m.statut === "active" || m.courrierId === ceremonieId),
    [state.missions, ceremonieId],
  );

  // Chapitre courant de la trame : au plus un seul actif à la fois (la trame
  // avance un chapitre à la fois, cf. `chapitrePret`). `null` dans DEUX cas
  // bien différents : soit le chapitre suivant n'a pas encore été accepté
  // (le joueur n'a pas tapé la pastille du grand-père depuis la livraison du
  // précédent — la trame continue, silence provisoire), soit les seize
  // chapitres sont déjà livrés (la trame est réellement finie). Ces deux
  // absences ne doivent PAS produire le même rendu : `histoireFinie`
  // ci-dessous les distingue via `chapitrePret`, la même fonction qui arme la
  // pastille du grand-père — sans elle, la ligne de clôture mentirait au
  // joueur à chacune des quinze transitions entre deux chapitres.
  const chapitreActuel = useMemo(() => {
    for (const m of actives) {
      const c = byId.get(m.courrierId);
      if (c?.payload.type === "mission" && c.payload.categorie === "principale") return c;
    }
    return null;
  }, [actives, byId]);

  const histoireFinie = useMemo(
    () => chapitreActuel === null && chapitrePret(state) === null,
    [chapitreActuel, state],
  );

  const quotidiennes = useMemo(
    () =>
      trierActives(
        actives.filter((m) => {
          const c = byId.get(m.courrierId);
          return c?.payload.type === "mission" && c.payload.categorie === "quotidienne";
        }),
        byId,
        state,
        ceremonieId,
      ),
    [actives, byId, state, ceremonieId],
  );

  const hebdomadaires = useMemo(
    () =>
      trierActives(
        actives.filter((m) => {
          const c = byId.get(m.courrierId);
          return c?.payload.type === "mission" && c.payload.categorie === "hebdomadaire";
        }),
        byId,
        state,
        ceremonieId,
      ),
    [actives, byId, state, ceremonieId],
  );

  // Section de la quête visée : le SEUL cas où la préférence de repli
  // mémorisée (useCarnetSections) est outrepassée — jamais persisté, un
  // recalcul pur à chaque rendu.
  const cibleSection = useMemo<CleSection | null>(() => {
    if (!missionInitialeId) return null;
    const c = byId.get(missionInitialeId);
    if (c?.payload.type !== "mission") return null;
    if (c.payload.categorie === "principale") return "histoire";
    if (c.payload.categorie === "quotidienne") return "quotidiennes";
    if (c.payload.categorie === "hebdomadaire") return "hebdomadaires";
    return null;
  }, [missionInitialeId, byId]);

  const replieeEffective = (cle: CleSection): boolean => (cle === cibleSection ? false : estRepliee(cle));

  const now = tempsConfiance?.() ?? Date.now();
  const resteQuotidien = prochainMinuitLocalMs(now) - now;
  const resteHebdo = prochainLundiLocalMs(now) - now;
  const periodiquesDeverrouillees = state.brocanteur.niveau >= NIVEAU_QUETES_PERIODIQUES;

  if (!open) return null;

  /** Compteur d'en-tête repliée : `faits` compte les quêtes de la section dont
   *  les objectifs sont au complet (y compris celle en cérémonie, encore
   *  affichée le temps de l'envol) ; `pretes` en est le sous-ensemble qui
   *  attend encore le tap du joueur (exclut la quête déjà en cérémonie,
   *  déjà en cours de livraison). */
  function compteurSection(liste: MissionResolution[]) {
    let faits = 0;
    let pretes = 0;
    for (const m of liste) {
      const c = byId.get(m.courrierId);
      if (c?.payload.type !== "mission") continue;
      // ⚠ `missionLivrable`, PAS `estMissionLivrable` seule : cf. le garde-fou
      // documenté dans lib/quetes/objectifs.ts — une quête chiffrée (`cibles: []`)
      // aurait `remplies === 0 === cibles.length`, donc "livrable" à 0 % de
      // progression, et le compteur replié annoncerait « prête » à tort.
      const complet = m.courrierId === ceremonieId || missionLivrable(c.payload, m, state, c.jourRecu);
      if (!complet) continue;
      faits += 1;
      if (m.courrierId !== ceremonieId) pretes += 1;
    }
    return { total: liste.length, faits, pretes };
  }

  function renderLigne(m: MissionResolution) {
    const c = byId.get(m.courrierId);
    if (!c) return null;
    return (
      <LigneQuete
        key={m.courrierId}
        courrier={c}
        state={state}
        ouvert={ouvertId === m.courrierId}
        onToggle={() => setOuvertId((id) => (id === m.courrierId ? null : m.courrierId))}
        onLivrer={() => lancer(m.courrierId)}
        enCeremonie={ceremonieId === m.courrierId}
        // Cérémonie d'une AUTRE commande en cours : `lancer` refuserait le tap
        // en silence — mieux vaut griser le pavé.
        livrerVerrouille={ceremonieId !== null && ceremonieId !== m.courrierId}
      />
    );
  }

  const ligneVerrou = (
    <p style={ligneEtatStyle}>{tr(d.carnet.sectionVerrouilleeNiveau, { n: NIVEAU_QUETES_PERIODIQUES })}</p>
  );

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={colonne}>
          <div style={chassis}>
            <span aria-hidden style={marquePage} />
            <button type="button" style={closeBtn} onClick={onClose} aria-label={d.carnet.fermer}>✕</button>
            <div style={enTete}>
              <h2 style={titreStyle}>{d.carnet.carnetTitre}</h2>
              <div style={sousTitreStyle}>{tr(d.carnet.jour, { n: state.jourActuel })}</div>
            </div>
            <div style={corps}>
              <SectionRetractable
                cle="histoire"
                icone={BookOpen}
                titre={d.carnet.sectionHistoire}
                repliee={replieeEffective("histoire")}
                onBasculer={() => basculer("histoire")}
              >
                {chapitreActuel ? (
                  <CarteHistoire
                    courrier={chapitreActuel}
                    state={state}
                    onLivrer={() => lancer(chapitreActuel.id)}
                    enCeremonie={ceremonieId === chapitreActuel.id}
                    livrerVerrouille={ceremonieId !== null && ceremonieId !== chapitreActuel.id}
                  />
                ) : histoireFinie ? (
                  <p style={ligneEtatStyle}>{d.carnet.histoireTerminee}</p>
                ) : null}
              </SectionRetractable>

              <SectionRetractable
                cle="quotidiennes"
                icone={CalendarDays}
                titre={d.carnet.sectionQuotidiennes}
                sousTitre={
                  periodiquesDeverrouillees
                    ? tr(d.carnet.renouvellement, { t: formatRestant(resteQuotidien) })
                    : undefined
                }
                compteur={compteurSection(quotidiennes)}
                repliee={replieeEffective("quotidiennes")}
                onBasculer={() => basculer("quotidiennes")}
              >
                {periodiquesDeverrouillees ? quotidiennes.map(renderLigne) : ligneVerrou}
              </SectionRetractable>

              <SectionRetractable
                cle="hebdomadaires"
                icone={CalendarRange}
                titre={d.carnet.sectionHebdomadaires}
                sousTitre={
                  periodiquesDeverrouillees
                    ? tr(d.carnet.renouvellement, { t: formatRestant(resteHebdo) })
                    : undefined
                }
                compteur={compteurSection(hebdomadaires)}
                repliee={replieeEffective("hebdomadaires")}
                onBasculer={() => basculer("hebdomadaires")}
              >
                {periodiquesDeverrouillees ? hebdomadaires.map(renderLigne) : ligneVerrou}
              </SectionRetractable>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
