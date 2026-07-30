/**
 * Résolution d'un épisode brut (tel qu'écrit dans reels-prompts.json) en
 * épisode complet : objets retrouvés dans le catalogue, images localisées,
 * acheteur résolu, chute calculée.
 *
 * Module pur : le catalogue, les personas et le test d'existence de fichier
 * sont injectés.
 */
import path from "node:path";
import { CHEMINS, CHUTES_AUTO } from "./config.mjs";

const DENOUEMENTS = ["marchande", "achete", "repart"];

function resoudreItem(id, { catalogue, fichierExiste }) {
  const fiche = catalogue.get(id);
  if (!fiche) {
    throw new Error(`objet « ${id} » absent du catalogue docs/items-catalogue.csv`);
  }
  const fichier = path.join(CHEMINS.itemsImages, `${id}.webp`);
  if (!fichierExiste(fichier)) {
    throw new Error(`objet « ${id} » sans image : ${fichier} introuvable`);
  }
  return { id, nom: fiche.nom, prixTresBon: fiche.prixTresBon, fichier };
}

function resoudreChute(brut, vedette) {
  if (brut.chute !== undefined && brut.chute !== "auto") return brut.chute;
  if (brut.plan2.denouement === "achete") {
    return `Valeur réelle : ${vedette.prixTresBon} €`;
  }
  return CHUTES_AUTO[brut.plan2.denouement];
}

export function resoudreEpisode(brut, { catalogue, personas, fichierExiste }) {
  if (!DENOUEMENTS.includes(brut.plan2?.denouement)) {
    throw new Error(
      `dénouement « ${brut.plan2?.denouement} » inconnu : attendu ${DENOUEMENTS.join(", ")}`,
    );
  }

  const items = brut.items.map((id) => resoudreItem(id, { catalogue, fichierExiste }));
  const vedette = items.find((item) => item.id === brut.vedette);
  if (!vedette) {
    throw new Error(
      `vedette « ${brut.vedette} » absente de la liste d'objets de l'épisode ${brut.id}`,
    );
  }

  return {
    id: brut.id,
    items,
    vedette,
    acheteur: personas.get(brut.acheteur) ?? brut.acheteur,
    fond: brut.fond,
    accroche: brut.accroche,
    plan1: { ...brut.plan1 },
    plan2: { ...brut.plan2 },
    chute: resoudreChute(brut, vedette),
  };
}
