import type { CategorieObjet } from "@/types/game";

/** A → B : A domine B. Le dernier domine le premier (spec §3.4). */
export const ROUE: CategorieObjet[] = [
  "Bricolage", "Maison", "Mode", "Musique", "Livres & Papeterie", "Jeux & Loisirs", "Objets d'art",
];

export function proieDe(cat: CategorieObjet): CategorieObjet {
  const i = ROUE.indexOf(cat);
  return ROUE[(i + 1) % ROUE.length];
}

export function domine(a: CategorieObjet, b: CategorieObjet): boolean {
  return proieDe(a) === b;
}
