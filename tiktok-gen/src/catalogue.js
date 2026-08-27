/** Catalogue d'objets pour le générateur TikTok : filtrage, tirage, chargement. Aucune dépendance au DOM. */
export const CATEGORIES = ["Musique", "Jeux & Loisirs", "Livres & Papeterie", "Mode", "Maison", "Objets d'art", "Bricolage"];

/** Aplatit une chaîne pour une comparaison insensible aux accents et à la casse. */
const plat = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filtrerCatalogue(entrees, { categorie = "", recherche = "" } = {}) {
  const cat = String(categorie ?? "");
  const q = plat(String(recherche ?? "").trim());
  return entrees.filter((e) => (!cat || e.categorie === cat) && (!q || plat(e.nom).includes(q)));
}

/** Tire `n` entrées distinctes (mélange partiel type Fisher-Yates), plafonné à la taille du catalogue. */
export function tirerAleatoire(entrees, n, alea = Math.random) {
  const reste = [...entrees];
  const out = [];
  while (out.length < n && reste.length) {
    const idx = Math.min(reste.length - 1, Math.floor(alea() * reste.length));
    out.push(reste.splice(idx, 1)[0]);
  }
  return out;
}

export async function chargerCatalogue(fetchFn = fetch) {
  const rep = await fetchFn("assets/catalogue.json");
  if (!rep.ok) throw new Error(`catalogue.json : ${rep.status}`);
  return rep.json();
}
