import { creerCourrierMission } from "@/lib/courrier";
import { EXPEDITEURS } from "@/data/expediteursCourrier";
import type { ObjetTemplate } from "@/data/objetTemplates";
import type { Courrier, GameState, MissionCible } from "@/types/game";
import { objetsAtteignables } from "./atteignables";
import { capSecondaires, niveauProgression } from "./progression";
import { calculerRecompense } from "./recompense";
import { genererTexte } from "./textes";

/** Probabilité de générer une quête un jour donné (sous le cap). */
const P_GEN = 0.3;

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** templateId déjà demandés par une quête active (pour éviter les doublons). */
function templateIdsActifs(state: GameState): Set<string> {
  const ids = new Set<string>();
  const actifs = new Set(state.missions.filter((m) => m.statut === "active").map((m) => m.courrierId));
  for (const c of state.courriers) {
    if (!actifs.has(c.id) || c.payload.type !== "mission") continue;
    for (const cible of c.payload.cibles) ids.add(cible.templateId);
  }
  return ids;
}

export function genererQueteSecondaire(
  state: GameState,
  jour: number,
  rng: () => number = Math.random,
): Courrier | null {
  const actives = state.missions.filter((m) => {
    if (m.statut !== "active") return false;
    const c = state.courriers.find((x) => x.id === m.courrierId);
    return c?.payload.type === "mission" && c.payload.categorie === "secondaire";
  });
  if (actives.length >= capSecondaires(state)) return null;
  if (rng() >= P_GEN) return null;

  const dejaDemandes = templateIdsActifs(state);
  const pool = objetsAtteignables(state).filter((t) => !dejaDemandes.has(t.templateId));
  if (pool.length === 0) return null;

  // Commanditaire : un dont le domaine a des objets dans le pool (hors maman/grand-pere).
  const commanditaires = Object.values(EXPEDITEURS).filter(
    (e) => e.id !== "maman" && e.id !== "grand-pere" && e.domaine,
  );
  const candidats = commanditaires.filter((e) => pool.some((t) => t.categorie === e.domaine));
  const exp = candidats.length > 0 ? pick(candidats, rng) : pick(commanditaires, rng);

  const poolDomaine = pool.filter((t) => t.categorie === exp.domaine);
  const poolCible = poolDomaine.length > 0 ? poolDomaine : pool;

  // Difficulté progressive.
  const { tierMax } = niveauProgression(state);
  const nbCibles = tierMax >= 3 ? 1 + Math.floor(rng() * 3) : 1; // 1 (tier 1-2) ; 1-3 (tier 3-4)
  const choisis: ObjetTemplate[] = [];
  const restant = [...poolCible];
  for (let i = 0; i < nbCibles && restant.length > 0; i++) {
    const idx = Math.floor(rng() * restant.length);
    choisis.push(restant.splice(idx, 1)[0]);
  }
  const etatMin = tierMax >= 3 && rng() < 0.4 ? ("Très bon" as const) : undefined;
  const cibles: MissionCible[] = choisis.map((t) => ({
    templateId: t.templateId,
    ...(etatMin ? { etatMin } : {}),
  }));

  const templates = new Map(choisis.map((t) => [t.templateId, t]));
  const recompense = { argent: calculerRecompense(cibles, templates) };
  const jourLimite = jour + 14 + Math.floor(rng() * 8); // 14-21

  const texte = genererTexte(exp.id, choisis.map((t) => t.nom), etatMin, rng);
  const id = `sec_${jour}_${state.courriers.length}`;

  return {
    ...creerCourrierMission({
      id,
      jour,
      expediteurId: exp.id,
      titre: texte.titre,
      corps: texte.corps,
      categorie: "secondaire",
      cibles,
      jourLimite,
      recompense,
    }),
    lu: true,
  };
}
