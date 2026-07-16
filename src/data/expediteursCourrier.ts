import type { CategorieObjet } from "@/types/game";

export interface ExpediteurDef {
  id: string;
  /** Nom affiché (signature, ligne du carnet). */
  nom: string;
  /** Personnalité affichée sous le titre de la quête. */
  personnalite: string;
  /** Catégorie d'objets que ce commanditaire demande (sert au sous-projet 2). */
  domaine?: CategorieObjet;
  /** Lien avec le joueur (optionnel). */
  relation?: string;
  /** Chemin du portrait (webp dans public/personas/commanditaires/). */
  avatar?: string;
  /** Formule de fin de lettre (multi-ligne ok). */
  signature: string;
}

export const EXPEDITEURS: Record<string, ExpediteurDef> = {
  maman: {
    id: "maman",
    nom: "Maman",
    personnalite: "Ta mère",
    relation: "Mère",
    avatar: "/personas/commanditaires/maman.webp",
    signature: "Avec tout mon amour,\nMaman",
  },
  "grand-pere": {
    id: "grand-pere",
    nom: "Grand-père",
    personnalite: "Antiquaire retraité",
    relation: "Grand-père",
    avatar: "/personas/commanditaires/grand-pere.webp",
    signature: "À toi de jouer, petit.\nGrand-père",
  },
  "jeux-video": {
    id: "jeux-video",
    nom: "Le Joueur du Vide-grenier",
    personnalite: "Passionné de jeux vidéo",
    domaine: "Jeux & Loisirs",
    avatar: "/personas/commanditaires/jeux-video.webp",
    signature: "À plus dans le pixel,\nLe Joueur du Vide-grenier",
  },
  "set-designer": {
    id: "set-designer",
    nom: "Clara",
    personnalite: "Set designer",
    domaine: "Maison",
    avatar: "/personas/commanditaires/set-designer.webp",
    signature: "Merci d'avance,\nClara",
  },
  mode: {
    id: "mode",
    nom: "Arianne",
    personnalite: "Designeuse de mode",
    domaine: "Mode",
    avatar: "/personas/commanditaires/mode.webp",
    signature: "Avec style,\nArianne",
  },
  art: {
    id: "art",
    nom: "Paul-Henry",
    personnalite: "Collectionneur d'art",
    domaine: "Objets d'art",
    avatar: "/personas/commanditaires/art.webp",
    signature: "Bien à vous,\nPaul-Henry",
  },
  organisateurs: {
    id: "organisateurs",
    nom: "Les Organisateurs",
    personnalite: "Comité des brocantes",
    relation: "Organisateurs",
    signature: "Au plaisir de vous y croiser,\nLes Organisateurs",
  },
};

export function getExpediteur(id: string): ExpediteurDef | null {
  return EXPEDITEURS[id] ?? null;
}
