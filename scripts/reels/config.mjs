/**
 * Constantes de la pipeline de Reels marketing.
 * Aucune logique ici : chemins, modèles, tarifs, durées.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(__dirname, "..", "..");

export const CHEMINS = {
  racine: RACINE,
  env: path.join(RACINE, ".env"),
  contenu: path.join(RACINE, "scripts", "reels-prompts.json"),
  catalogue: path.join(RACINE, "docs", "items-catalogue.csv"),
  personas: path.join(RACINE, "scripts", "clients-prompts.json"),
  itemsImages: path.join(RACINE, "public", "items"),
  masters: path.join(RACINE, "marketing", "reels", "master"),
  sorties: path.join(RACINE, "marketing", "reels", "out"),
  musique: path.join(RACINE, "marketing", "reels", "musique"),
  icone: path.join(RACINE, "public", "icon-512.png"),
  policeTitre: path.join(RACINE, "public", "fonts", "VerveShadow.ttf"),
  policeSousTitre: "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
};

export const MODELES = {
  image: {
    pro: "gemini-3-pro-image",
    flash: "gemini-2.5-flash-image",
  },
  video: {
    lite: "veo-3.1-lite-generate-preview",
    fast: "veo-3.1-fast-generate-preview",
    pro: "veo-3.1-generate-preview",
  },
};

/** Dollars par seconde di vidéo, audio inclus. Relevé le 2026-07-27 sur
 *  https://ai.google.dev/gemini-api/docs/pricing — à recaler si Google bouge. */
export const TARIFS = {
  lite: { "720p": 0.05, "1080p": 0.08 },
  fast: { "720p": 0.1, "1080p": 0.12 },
  pro: { "720p": 0.4, "1080p": 0.4 },
};

/** Dollars par image générée, même relevé. */
export const TARIFS_IMAGE = { pro: 0.134, flash: 0.039 };

export const DUREES = {
  plan: 8,
  plans: 2,
  carteFin: 2,
  fonduAudio: 0.2,
};

/** Chutes par défaut quand l'épisode déclare `"chute": "auto"`. */
export const CHUTES_AUTO = {
  marchande: "Vous auriez accepté ?",
  repart: "Trop cher ? Ou l'affaire du jour ?",
  // `achete` est calculée à partir de la cote de l'objet vedette.
};
