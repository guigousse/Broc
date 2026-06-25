import { creerCourrierMission } from "@/lib/courrier";
import { EXPEDITEURS } from "@/data/expediteursCourrier";
import type { ObjetTemplate } from "@/data/objetTemplates";
import type { Courrier, GameState, MissionCible } from "@/types/game";
import { objetsAtteignables } from "./atteignables";
import { calculerRecompense } from "./recompense";
import { genererTexte } from "./textes";

export type TypePeriodique = "quotidienne" | "hebdomadaire";

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Génère UNE commande périodique en évitant les templateId déjà pris dans `pris`. */
function genererUne(
  state: GameState,
  type: TypePeriodique,
  id: string,
  pris: Set<string>,
  rng: () => number,
): Courrier | null {
  const pool = objetsAtteignables(state).filter((t) => !pris.has(t.templateId));
  if (pool.length === 0) return null;

  const commanditaires = Object.values(EXPEDITEURS).filter(
    (e) => e.id !== "maman" && e.id !== "grand-pere" && e.domaine,
  );
  const candidats = commanditaires.filter((e) => pool.some((t) => t.categorie === e.domaine));
  const exp = candidats.length > 0 ? pick(candidats, rng) : pick(commanditaires, rng);
  const poolDomaine = pool.filter((t) => t.categorie === exp.domaine);
  const poolCible = poolDomaine.length > 0 ? poolDomaine : pool;

  // Quotidienne = 1 cible ; hebdomadaire = 2-3 cibles (plus dure).
  const nbVoulu = type === "quotidienne" ? 1 : 2 + Math.floor(rng() * 2);
  const choisis: ObjetTemplate[] = [];
  const restant = [...poolCible];
  for (let i = 0; i < nbVoulu && restant.length > 0; i++) {
    choisis.push(restant.splice(Math.floor(rng() * restant.length), 1)[0]);
  }
  if (choisis.length === 0) return null;
  for (const t of choisis) pris.add(t.templateId);

  // Hebdo plus exigeante : état minimum « Très bon » avec proba.
  const etatMin = type === "hebdomadaire" && rng() < 0.5 ? ("Très bon" as const) : undefined;
  const cibles: MissionCible[] = choisis.map((t) => ({
    templateId: t.templateId,
    ...(etatMin ? { etatMin } : {}),
  }));
  const templates = new Map(choisis.map((t) => [t.templateId, t]));
  const recompense = { argent: calculerRecompense(cibles, templates) };
  const texte = genererTexte(exp.id, choisis.map((t) => t.nom), etatMin, rng);

  return {
    ...creerCourrierMission({
      id,
      jour: state.jourActuel,
      expediteurId: exp.id,
      titre: texte.titre,
      corps: texte.corps,
      categorie: type,
      cibles,
      recompense,
    }),
    lu: true,
  };
}

/** Génère le lot de 3 commandes du type pour la période `cle`. IDs déterministes. */
export function genererLot(
  state: GameState,
  type: TypePeriodique,
  cle: string,
  rng: () => number = Math.random,
): Courrier[] {
  const prefixe = type === "quotidienne" ? "quo" : "heb";
  const pris = new Set<string>();
  const lot: Courrier[] = [];
  for (let i = 0; i < 3; i++) {
    const c = genererUne(state, type, `${prefixe}_${cle}_${i}`, pris, rng);
    if (c) lot.push(c);
  }
  return lot;
}
