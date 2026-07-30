"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CalendarDays, CalendarRange, FolderOpen } from "lucide-react";
import { estMissionLivrable } from "@/lib/missions";
import { prochainMinuitLocalMs, prochainLundiLocalMs } from "@/lib/quetes/periode";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomTemplate, titreCourrier } from "@/lib/i18n/contenu";
import { CIBLES_VOL, phasesLivraison, type JetonVol } from "@/lib/quetes/ceremonieLivraison";
import { recompenseEffective } from "@/lib/recompenses";
import { energieCourante } from "@/lib/energie";
import { flyToTab } from "@/lib/flyAnimation";
import {
  degelerBudgetAffichage,
  degelerEnergieAffichage,
  degelerXpAffichage,
  gelerBudgetAffichage,
  gelerEnergieAffichage,
  gelerXpAffichage,
} from "@/lib/affichageGele";
import { CommandeRow } from "./CommandeRow";
import type { Courrier, GameState, MissionResolution } from "@/types/game";

interface OngletCommandesProps {
  state: GameState;
  onLivrerMission: (courrierId: string) => { ok: boolean; raison?: string };
  /** Temps de confiance (epoch ms) ; `Date.now()` à défaut. */
  tempsConfiance?: () => number | null;
  /** Commande dépliée d'office (badge livrable tapé) + scroll jusqu'à elle. */
  ouvertInitialId?: string | null;
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

/* ─── styles ─── */

/* En-tête de section repliable, alignée à gauche (icône, libellé (n), chevron à droite). */
const sectionToggle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  fontFamily: "var(--font-display)",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#6e1f1f",
  textAlign: "left",
  padding: "14px 2px 6px",
  marginTop: 6,
  background: "none",
  border: "none",
  borderTop: "1px dotted rgba(110,31,31,0.35)",
  cursor: "pointer",
};

const sectionChevron: CSSProperties = { marginLeft: "auto", fontSize: 12, color: "#8a6d2e" };

/** Fond du clone en vol, au teint du jeton (cf. JETON_STYLES de RecompenseJetons). */
const FONDS_JETON: Record<JetonVol, string> = {
  argent: "radial-gradient(circle at 35% 30%, #b03030, #6e1f1f)",
  xp: "radial-gradient(circle at 35% 30%, #efe3c0, #c8a24a)",
  energie: "radial-gradient(circle at 35% 30%, #4a8a63, #2c5e3f)",
};

/** Durée du fondu de retrait de la carte livrée, en ms. */
const FONDU_SORTIE_MS = 300;

const sectionSousLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#7a6438",
  textAlign: "left",
  padding: "0 2px 6px",
};

/* ─── tri des missions actives ─── */

function trierActives(
  missions: MissionResolution[],
  byId: Map<string, Courrier>,
  inv: GameState["inventaireJoueur"],
) {
  return [...missions].sort((a, b) => {
    const ca = byId.get(a.courrierId);
    const cb = byId.get(b.courrierId);
    const pa = ca?.payload.type === "mission" ? ca.payload : null;
    const pb = cb?.payload.type === "mission" ? cb.payload : null;
    const lva = pa && estMissionLivrable(pa, inv) ? 0 : 1;
    const lvb = pb && estMissionLivrable(pb, inv) ? 0 : 1;
    if (lva !== lvb) return lva - lvb; // livrables d'abord
    const ja = pa?.jourLimite ?? Infinity;
    const jb = pb?.jourLimite ?? Infinity;
    if (ja !== jb) return ja - jb; // échéance proche
    return (ca?.jourRecu ?? 0) - (cb?.jourRecu ?? 0);
  });
}

/* ─── Onglet Commandes (contenu scrollable du registre) ─── */

export function OngletCommandes({ state, onLivrerMission, tempsConfiance, ouvertInitialId }: OngletCommandesProps) {
  const { locale, d, tr } = useLangue();
  const [ouvertId, setOuvertId] = useState<string | null>(ouvertInitialId ?? null);
  const [termineesVisibles, setTermineesVisibles] = useState(false);
  /** Sections repliées (toutes dépliées par défaut). */
  const [sectionsRepliees, setSectionsRepliees] = useState<Set<string>>(new Set());

  const toggleSection = (cle: string) =>
    setSectionsRepliees((prev) => {
      const next = new Set(prev);
      if (next.has(cle)) next.delete(cle);
      else next.add(cle);
      return next;
    });
  const [, tick] = useState(0);
  /** Commande dont la cérémonie de livraison est en cours (carte maintenue). */
  const [ceremonieId, setCeremonieId] = useState<string | null>(null);
  /** Timers de la cérémonie en cours (annulés au démontage). */
  const timersRef = useRef<number[]>([]);
  const byId = useMemo(() => new Map(state.courriers.map((c) => [c.id, c])), [state.courriers]);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Démontage (carnet refermé) en pleine cérémonie : couper les timers et
  // rendre leurs vraies valeurs aux compteurs du header, sinon ils resteraient
  // figés pour toute la partie.
  useEffect(
    () => () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
      degelerXpAffichage();
      degelerBudgetAffichage();
      degelerEnergieAffichage();
    },
    [],
  );

  // Commande visée (badge livrable tapé, ou commande que le grand-père vient
  // d'inscrire dans le carnet resté ouvert) : la déplier et l'amener dans la
  // zone visible. `ouvertId` étant initialisé au seul montage, la resynchro
  // ici est ce qui couvre le cas « le carnet était déjà ouvert ».
  useEffect(() => {
    if (!ouvertInitialId) return;
    setOuvertId(ouvertInitialId);
    const el = Array.from(document.querySelectorAll<HTMLElement>("[data-commande-id]")).find(
      (n) => n.dataset.commandeId === ouvertInitialId,
    );
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "start" });
  }, [ouvertInitialId]);

  // La commande en cérémonie est déjà « livree » dans le state : on la garde
  // parmi les actives le temps que les jetons rejoignent le header.
  const actives = useMemo(
    () => state.missions.filter((m) => m.statut === "active" || m.courrierId === ceremonieId),
    [state.missions, ceremonieId],
  );

  const principales = useMemo(
    () =>
      trierActives(
        actives.filter((m) => {
          const c = byId.get(m.courrierId);
          return c?.payload.type === "mission" && c.payload.categorie === "principale";
        }),
        byId,
        state.inventaireJoueur,
      ),
    [actives, byId, state.inventaireJoueur],
  );

  const quotidiennes = useMemo(
    () =>
      trierActives(
        actives.filter((m) => {
          const c = byId.get(m.courrierId);
          return c?.payload.type === "mission" && c.payload.categorie === "quotidienne";
        }),
        byId,
        state.inventaireJoueur,
      ),
    [actives, byId, state.inventaireJoueur],
  );

  const hebdomadaires = useMemo(
    () =>
      trierActives(
        actives.filter((m) => {
          const c = byId.get(m.courrierId);
          return c?.payload.type === "mission" && c.payload.categorie === "hebdomadaire";
        }),
        byId,
        state.inventaireJoueur,
      ),
    [actives, byId, state.inventaireJoueur],
  );

  const terminees = useMemo(
    () =>
      [...state.missions]
        // Pas la commande en cérémonie : elle est encore rendue au-dessus, en
        // actives — elle ne doit pas figurer deux fois dans le carnet.
        .filter((m) => m.statut !== "active" && m.courrierId !== ceremonieId)
        .sort((a, b) => (b.jourResolution ?? 0) - (a.jourResolution ?? 0)),
    [state.missions, ceremonieId],
  );

  const now = tempsConfiance?.() ?? Date.now();
  const resteQuotidien = prochainMinuitLocalMs(now) - now;
  const resteHebdo = prochainLundiLocalMs(now) - now;

  /**
   * Cérémonie de livraison — déclenchée UNIQUEMENT par le tap sur « Livrer »,
   * jamais depuis un effet (StrictMode monterait deux fois et enverrait les
   * jetons en double).
   *
   * L'ordre est : capture des valeurs d'AVANT → livraison réelle (le state est
   * crédité tout de suite, rien n'est perdu si l'app meurt) → gel de
   * l'affichage des trois compteurs → frise de vols, chaque atterrissage
   * dégelant son compteur → retrait de la carte en fondu.
   */
  const lancerLivraison = (courrierId: string) => {
    const courrier = byId.get(courrierId);
    if (!courrier || courrier.payload.type !== "mission" || ceremonieId) return;
    const rEff = recompenseEffective(courrier.payload);
    const maintenant = tempsConfiance?.() ?? Date.now();
    const avant = {
      brocanteur: state.brocanteur,
      budget: state.budget,
      energie: energieCourante(state, maintenant),
    };
    const res = onLivrerMission(courrierId);
    if (!res.ok) return;
    // On ne gèle QUE les compteurs dont le jeton va voler : `phasesLivraison`
    // n'émet d'atterrissage — donc de dégel — que pour les gains non nuls, et un
    // gain nul est le cas courant (aucune quête ne donne d'énergie aujourd'hui,
    // et `argent: 0` est légal). Geler sans dégel prévu figerait le compteur
    // pour toute la partie.
    if (rEff.xp > 0) gelerXpAffichage(avant.brocanteur);
    if (rEff.argent > 0) gelerBudgetAffichage(avant.budget);
    if (rEff.energie > 0) gelerEnergieAffichage(avant.energie);
    setCeremonieId(courrierId);

    // Les timers de la cérémonie précédente ont tous tiré (le garde-fou
    // `ceremonieId` interdit le chevauchement) : la liste peut repartir à vide.
    timersRef.current = [];
    const racine = document.querySelector(`[data-commande-id="${courrierId}"]`);
    for (const { at, etape } of phasesLivraison(rEff)) {
      const t = window.setTimeout(() => {
        if (etape.type === "envol") {
          // Carte dépliée = DEUX bandeaux de récompense, donc deux jumeaux par
          // jeton : masquer les deux, sinon le jeton du détail reste visible
          // pendant que son clone s'envole.
          const jumeaux = racine
            ? Array.from(racine.querySelectorAll<HTMLElement>(`[data-jeton="${etape.jeton}"]`))
            : [];
          for (const j of jumeaux) j.style.visibility = "hidden";
          const jeton = jumeaux[0] ?? null;
          flyToTab({
            fromRect: (jeton ?? racine ?? document.body).getBoundingClientRect(),
            imageUrl: null,
            fallbackBg: FONDS_JETON[etape.jeton],
            borderColor: "#c8a24a",
            targetSelector: CIBLES_VOL[etape.jeton],
          });
        } else if (etape.type === "atterrissage") {
          if (etape.jeton === "xp") degelerXpAffichage();
          else if (etape.jeton === "energie") degelerEnergieAffichage();
          else degelerBudgetAffichage();
        } else {
          // Filet : quoi qu'il arrive, aucun compteur ne reste gelé après la
          // cérémonie (les dégels sont idempotents et sans effet si rien n'est
          // gelé). Double ceinture avec le gel conditionnel ci-dessus.
          degelerXpAffichage();
          degelerBudgetAffichage();
          degelerEnergieAffichage();
          // La carte se fond / se rétracte avant de quitter la liste.
          const el = document.querySelector<HTMLElement>(`[data-commande-id="${courrierId}"]`);
          if (el) {
            el.style.transition = `opacity ${FONDU_SORTIE_MS}ms ease, max-height ${FONDU_SORTIE_MS}ms ease`;
            el.style.overflow = "hidden";
            el.style.maxHeight = `${el.offsetHeight}px`;
            requestAnimationFrame(() => {
              el.style.opacity = "0";
              el.style.maxHeight = "0";
            });
          }
          const tFin = window.setTimeout(() => setCeremonieId(null), FONDU_SORTIE_MS + 20);
          timersRef.current.push(tFin);
        }
      }, at);
      timersRef.current.push(t);
    }
  };

  const renderSection = (
    cle: string,
    icone: ReactNode,
    label: string,
    liste: MissionResolution[],
    sousLabel?: string,
  ) => {
    if (liste.length === 0) return null;
    const repliee = sectionsRepliees.has(cle);
    return (
      <>
        <button
          type="button"
          style={sectionToggle}
          onClick={() => toggleSection(cle)}
          aria-expanded={!repliee}
        >
          {icone}
          <span>{label} ({liste.length})</span>
          <span style={sectionChevron} aria-hidden>{repliee ? "▸" : "▾"}</span>
        </button>
        {!repliee && (
          <>
            {sousLabel ? <div style={sectionSousLabel}>{sousLabel}</div> : null}
            {liste.map((m) => {
              const c = byId.get(m.courrierId);
              if (!c) return null;
              return (
                <div key={m.courrierId} data-commande-id={m.courrierId}>
                  <CommandeRow
                    courrier={c}
                    state={state}
                    ouvert={ouvertId === m.courrierId}
                    onToggle={() => setOuvertId((id) => (id === m.courrierId ? null : m.courrierId))}
                    onLivrer={() => lancerLivraison(m.courrierId)}
                    enCeremonie={ceremonieId === m.courrierId}
                    // Cérémonie d'une AUTRE commande en cours : `lancerLivraison`
                    // refuserait le tap en silence — mieux vaut griser le bouton.
                    livrerVerrouille={ceremonieId !== null && ceremonieId !== m.courrierId}
                  />
                </div>
              );
            })}
          </>
        )}
      </>
    );
  };

  if (actives.length === 0 && terminees.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "30px 10px" }}>
        {d.carnet.aucuneCommande}
      </p>
    );
  }

  return (
    <>
      {renderSection("principales", <FolderOpen size={15} aria-hidden />, d.carnet.sectionPrincipales, principales)}
      {renderSection(
        "quotidiennes",
        <CalendarDays size={15} aria-hidden />,
        d.carnet.sectionQuotidiennes,
        quotidiennes,
        tr(d.carnet.renouvellement, { t: formatRestant(resteQuotidien) }),
      )}
      {renderSection(
        "hebdomadaires",
        <CalendarRange size={15} aria-hidden />,
        d.carnet.sectionHebdomadaires,
        hebdomadaires,
        tr(d.carnet.renouvellement, { t: formatRestant(resteHebdo) }),
      )}
      {terminees.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setTermineesVisibles((v) => !v)}
            style={sectionToggle}
            aria-expanded={termineesVisibles}
          >
            <span>{d.carnet.terminees}</span>
            <span style={sectionChevron} aria-hidden>{termineesVisibles ? "▾" : "▸"}</span>
          </button>
          {termineesVisibles &&
            terminees.map((m) => {
              const c = byId.get(m.courrierId);
              if (!c || c.payload.type !== "mission") return null;
              const cibleTemplateId = c.payload.cibles[0]?.templateId;
              const couleur = m.statut === "livree" ? "#2c5e3f" : "#a31f1f";
              return (
                <div
                  key={m.courrierId}
                  style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 14px", opacity: 0.55, fontFamily: "var(--font-serif)", fontSize: 11, color: "#3a2f1e" }}
                >
                  <span style={{ textDecoration: "line-through" }}>
                    {titreCourrier(c, locale)} —{" "}
                    {cibleTemplateId ? nomTemplate(cibleTemplateId, locale) : ""}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", color: couleur }}>
                    {m.statut === "livree"
                      ? tr(d.carnet.livreeJour, { n: m.jourResolution ?? 0 })
                      : tr(d.carnet.expireeJour, { n: m.jourResolution ?? 0 })}
                  </span>
                </div>
              );
            })}
        </>
      )}
    </>
  );
}
