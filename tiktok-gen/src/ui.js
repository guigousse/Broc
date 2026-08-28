/**
 * Point d'entrée de la page : câblage du DOM. Toute la logique vit ailleurs
 * (roulette.js, catalogue.js, reglages.js, texte.js, apercu.js) — ce fichier
 * ne fait que lire les champs, écrire les réglages et rafraîchir l'aperçu.
 */
import { CATEGORIES, chargerCatalogue, filtrerCatalogue, tirerAleatoire } from "./catalogue.js";
import { CacheImages } from "./images.js";
import {
  REGLAGES_DEFAUT, chargerReglages, consigneParDefaut, normaliserReglages, sauverReglages,
} from "./reglages.js";
import { formaterInfos, nomCourt } from "./texte.js";
import { SonRoulette } from "./son.js";
import { Apercu } from "./apercu.js";

const MAX_OBJETS = 12;
const TIRAGE = 8;
const FOND_PERSO = "perso";

const $ = (id) => document.getElementById(id);

/** localStorage inaccessible en navigation privée Safari : on retombe sur une mémoire volatile. */
function stockageSur() {
  try {
    const s = window.localStorage;
    s.getItem("");
    return s;
  } catch {
    const memoire = new Map();
    return { getItem: (k) => memoire.get(k) ?? null, setItem: (k, v) => memoire.set(k, v) };
  }
}

async function chargerFontes() {
  try {
    const fontes = await Promise.all([
      new FontFace("Cinzel", "url(assets/fonts/cinzel.woff2)").load(),
      new FontFace("Verve Shadow", "url(assets/fonts/VerveShadow.ttf)").load(),
    ]);
    fontes.forEach((f) => document.fonts.add(f));
  } catch (e) {
    console.warn("fontes indisponibles", e);
  }
}

async function demarrer() {
  const stockage = stockageSur();
  const cache = new CacheImages();
  const son = new SonRoulette();
  const apercu = new Apercu($("scene"), cache, son);

  await chargerFontes();
  const [catalogue, fonds] = await Promise.all([
    chargerCatalogue(),
    fetch("assets/fonds.json").then((r) => r.json()),
  ]);
  const parId = new Map(catalogue.map((e) => [e.id, e]));

  let reglages = chargerReglages(stockage);
  // Vrai tant que la consigne n'a pas été retouchée à la main : on peut la régénérer.
  let consigneAuto = reglages.consigne === REGLAGES_DEFAUT.consigne;

  const el = {
    grilleFonds: $("grille-fonds"), fondPerso: $("fond-perso"),
    compte: $("compte-objets"), categorie: $("filtre-categorie"), recherche: $("recherche"),
    aleatoire: $("aleatoire"), vider: $("vider"),
    grilleObjets: $("grille-objets"), grilleSelection: $("grille-selection"),
    consigne: $("consigne"), son: $("son"),
    duree: $("info-duree"), fenetre: $("info-fenetre"), message: $("message"),
  };
  const curseurs = [
    { cle: "vitesse", champ: $("vitesse"), sortie: $("v-vitesse"), texte: (v) => v.toFixed(1).replace(".", ",") },
    { cle: "espacement", champ: $("espacement"), sortie: $("v-espacement"), texte: (v) => `${v} px` },
    { cle: "nbPassages", champ: $("nbPassages"), sortie: $("v-passages"), texte: (v) => String(v) },
    { cle: "largeurFlash", champ: $("largeurFlash"), sortie: $("v-flash"), texte: (v) => `${v} img` },
  ];

  const dire = (texte) => { el.message.textContent = texte; };

  // ---------------------------------------------------------------- grilles

  for (const c of CATEGORIES) el.categorie.append(new Option(c, c));

  function construireGrilleFonds() {
    el.grilleFonds.replaceChildren();
    const noms = reglages.fondPerso ? [FOND_PERSO, ...fonds] : fonds;
    for (const nom of noms) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "vignette fond";
      b.dataset.fond = nom;
      const img = document.createElement("img");
      img.loading = "lazy";
      img.alt = nom === FOND_PERSO ? "Photo" : nom;
      img.src = nom === FOND_PERSO ? reglages.fondPerso : `assets/fonds/${nom}.webp`;
      b.append(img);
      if (nom === FOND_PERSO) {
        const t = document.createElement("span");
        t.className = "etiquette";
        t.textContent = "Photo";
        b.append(t);
      }
      b.addEventListener("click", () => { reglages.fond = nom; appliquer(); });
      el.grilleFonds.append(b);
    }
  }

  // Les 392 vignettes sont construites une fois ; le filtre ne fait que masquer.
  const vignettesObjets = new Map();
  for (const e of catalogue) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "vignette objet";
    b.dataset.id = e.id;
    b.title = e.nom;
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = e.nom;
    img.src = `assets/thumbs/${e.id}.webp`;
    b.append(img);
    b.addEventListener("click", () => basculerObjet(e.id));
    vignettesObjets.set(e.id, b);
    el.grilleObjets.append(b);
  }

  function appliquerFiltre() {
    const visibles = new Set(
      filtrerCatalogue(catalogue, { categorie: el.categorie.value, recherche: el.recherche.value }).map((e) => e.id),
    );
    for (const [id, b] of vignettesObjets) b.hidden = !visibles.has(id);
    return visibles;
  }

  function construireSelection() {
    el.grilleSelection.replaceChildren();
    for (const id of reglages.objets) {
      const entree = parId.get(id);
      const bloc = document.createElement("div");
      bloc.className = `vignette selection${id === reglages.cible ? " cible" : ""}`;
      bloc.dataset.id = id;

      const choisir = document.createElement("button");
      choisir.type = "button";
      choisir.className = "choisir";
      choisir.title = entree ? `Cible : ${entree.nom}` : id;
      const img = document.createElement("img");
      img.loading = "lazy";
      img.alt = entree?.nom ?? id;
      img.src = `assets/thumbs/${id}.webp`;
      choisir.append(img);
      choisir.addEventListener("click", () => definirCible(id));

      const retirer = document.createElement("button");
      retirer.type = "button";
      retirer.className = "retirer";
      retirer.textContent = "×";
      retirer.setAttribute("aria-label", `Retirer ${entree?.nom ?? id}`);
      retirer.addEventListener("click", () => basculerObjet(id));

      bloc.append(choisir, retirer);
      el.grilleSelection.append(bloc);
    }
  }

  // ------------------------------------------------------------- sélection

  function basculerObjet(id) {
    if (reglages.objets.includes(id)) {
      reglages.objets = reglages.objets.filter((x) => x !== id);
      if (reglages.cible === id) reglages.cible = reglages.objets[0] ?? null;
      dire("");
    } else {
      if (reglages.objets.length >= MAX_OBJETS) { dire(`${MAX_OBJETS} objets au maximum.`); return; }
      reglages.objets = [...reglages.objets, id];
      if (reglages.cible === null) definirCible(id, { differer: true });
      dire("");
    }
    appliquer();
  }

  /** La cible fixe aussi la consigne, tant que celle-ci n'a pas été écrite à la main. */
  function definirCible(id, { differer = false } = {}) {
    reglages.cible = id;
    if (consigneAuto) {
      const entree = parId.get(id);
      if (entree) {
        reglages.consigne = consigneParDefaut(nomCourt(entree.nom));
        el.consigne.value = reglages.consigne;
      }
    }
    if (!differer) appliquer();
  }

  function tirer() {
    const visibles = filtrerCatalogue(catalogue, { categorie: el.categorie.value, recherche: el.recherche.value });
    const tires = tirerAleatoire(visibles, TIRAGE).map((e) => e.id);
    if (!tires.length) { dire("Aucun objet ne correspond au filtre."); return; }
    reglages.objets = tires;
    if (!tires.includes(reglages.cible)) definirCible(tires[0], { differer: true });
    dire("");
    appliquer();
  }

  // ------------------------------------------------- réglages → écran → aperçu

  function peuplerChamps() {
    for (const c of curseurs) c.champ.value = String(reglages[c.cle]);
    el.consigne.value = reglages.consigne;
    el.son.checked = reglages.son;
  }

  function majAffichage() {
    for (const c of curseurs) c.sortie.textContent = c.texte(reglages[c.cle]);
    el.compte.textContent = `${reglages.objets.length} / ${MAX_OBJETS}`;
    for (const b of el.grilleFonds.children) b.classList.toggle("actif", b.dataset.fond === reglages.fond);
    for (const [id, b] of vignettesObjets) b.classList.toggle("selectionne", reglages.objets.includes(id));
    construireSelection();
  }

  function sauver() {
    try { sauverReglages(stockage, reglages); } catch (e) { console.warn("réglages non sauvegardés", e); }
  }

  async function rafraichirApercu() {
    try {
      const { r } = await apercu.charger(reglages, catalogue);
      const infos = formaterInfos(r);
      el.duree.textContent = infos.duree;
      el.fenetre.textContent = infos.fenetre;
    } catch (e) {
      const texte = String(e?.message ?? e);
      dire(texte.charAt(0).toUpperCase() + texte.slice(1));
    }
  }

  /** Point de passage unique de tout changement : normalise, persiste, redessine. */
  function appliquer() {
    reglages = normaliserReglages(reglages);
    sauver();
    majAffichage();
    rafraichirApercu();
  }

  // ------------------------------------------------------------- événements

  el.categorie.addEventListener("change", appliquerFiltre);
  el.recherche.addEventListener("input", appliquerFiltre);
  el.aleatoire.addEventListener("click", tirer);
  el.vider.addEventListener("click", () => { reglages.objets = []; reglages.cible = null; dire(""); appliquer(); });

  for (const c of curseurs) {
    c.champ.addEventListener("input", () => { reglages[c.cle] = Number(c.champ.value); appliquer(); });
  }
  el.consigne.addEventListener("input", () => {
    consigneAuto = false;               // dès qu'il écrit, la consigne lui appartient.
    reglages.consigne = el.consigne.value;
    appliquer();
  });
  el.son.addEventListener("change", () => {
    reglages.son = el.son.checked;
    son.active = reglages.son;
    appliquer();
  });

  el.fondPerso.addEventListener("change", () => {
    const fichier = el.fondPerso.files?.[0];
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      reglages.fondPerso = String(lecteur.result);
      reglages.fond = FOND_PERSO;
      construireGrilleFonds();
      appliquer();
    };
    lecteur.onerror = () => dire("Photo illisible.");
    lecteur.readAsDataURL(fichier);
  });

  // iOS n'autorise l'audio qu'après un geste : jusque-là l'aperçu tourne muet.
  document.addEventListener("pointerdown", async () => {
    try {
      await son.demarrer();
      son.active = reglages.son;
      apercu.sonDemarre = true;
      apercu.jouer();
    } catch (e) {
      console.warn("son indisponible", e);
    }
  }, { once: true });

  // ------------------------------------------------------------- démarrage

  construireGrilleFonds();
  appliquerFiltre();
  peuplerChamps();
  majAffichage();
  await rafraichirApercu();
  apercu.jouer();
}

demarrer().catch((e) => {
  console.error(e);
  const m = document.getElementById("message");
  if (m) m.textContent = `Erreur de chargement : ${e.message}`;
});
