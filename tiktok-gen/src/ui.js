/**
 * Point d'entrée de la page : câblage du DOM. Toute la logique vit ailleurs
 * (roulette.js, catalogue.js, reglages.js, texte.js, apercu.js) — ce fichier
 * ne fait que lire les champs, écrire les réglages et rafraîchir l'aperçu.
 */
import { CATEGORIES, chargerCatalogue, filtrerCatalogue, tirerAleatoire } from "./catalogue.js";
import { CacheImages } from "./images.js";
import {
  FOND_PERSO, REGLAGES_DEFAUT, TAILLE_MAX_FOND_PERSO,
  chargerReglages, normaliserReglages, sauverReglages,
} from "./reglages.js";
import { formaterDuree, formaterInfos } from "./texte.js";
import { SonRoulette } from "./son.js";
import { Apercu, roulettePour } from "./apercu.js";
import { capacitesEnregistrement, enregistrer, partager } from "./enregistreur.js";
import { capacitesHorsLigne, rendreHorsLigne } from "./encodeur.js";

const MAX_OBJETS = 12;
const TIRAGE = 8;
/** Dit quand `sauverReglages` abandonne la photo : elle marche, mais elle ne survivra pas à la page. */
const MESSAGE_FOND_LOURD =
  "Photo trop lourde pour être mémorisée : elle sera à réimporter à la prochaine ouverture.";
/**
 * Un curseur émet un `input` par pixel parcouru. Redessiner et surtout
 * replanifier l'audio à chacun coûterait un tour de roulette par pixel : on
 * n'agit que 150 ms après le dernier mouvement (la ligne d'infos, elle, suit
 * immédiatement — elle ne dépend d'aucune image).
 */
const DELAI_CURSEUR = 150;
/** En dessous, la prise a sauté des images : on le dit plutôt que de livrer une vidéo hachée. */
const FPS_MINI = 25;
/** `?debug` expose le dernier blob sur `window` — pour les vérifications automatisées, pas pour le public. */
const DEBUG = new URLSearchParams(window.location.search).has("debug");

const $ = (id) => document.getElementById(id);

/** localStorage inaccessible en navigation privée Safari : on retombe sur une mémoire volatile. */
function stockageSur() {
  const sonde = "broc-tiktok-sonde";
  try {
    const s = window.localStorage;
    // Un aller-retour complet : en privé, Safari laisse lire mais refuse d'écrire.
    s.setItem(sonde, "1");
    s.removeItem(sonde);
    return s;
  } catch {
    const memoire = new Map();
    return {
      getItem: (k) => memoire.get(k) ?? null,
      setItem: (k, v) => memoire.set(k, v),
      removeItem: (k) => memoire.delete(k),
    };
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

  const el = {
    app: $("app"), scene: $("scene"),
    // Panneaux rendus inertes pendant une prise (le panneau d'export, lui, reste vivant).
    panneauxGeles: [...document.querySelectorAll(".panneau:not(#p-export)")],
    enregistrer: $("enregistrer"), progression: $("progression"), partager: $("partager"),
    grilleFonds: $("grille-fonds"), fondPerso: $("fond-perso"),
    compte: $("compte-objets"), categorie: $("filtre-categorie"), recherche: $("recherche"),
    aleatoire: $("aleatoire"), vider: $("vider"),
    grilleObjets: $("grille-objets"), grilleSelection: $("grille-selection"),
    son: $("son"),
    duree: $("info-duree"), fenetre: $("info-fenetre"), message: $("message"),
  };
  const curseurs = [
    { cle: "vitesse", champ: $("vitesse"), sortie: $("v-vitesse"), texte: (v) => v.toFixed(1).replace(".", ",") },
    { cle: "espacement", champ: $("espacement"), sortie: $("v-espacement"), texte: (v) => `${v} px` },
    { cle: "nbPassages", champ: $("nbPassages"), sortie: $("v-passages"), texte: (v) => String(v) },
    { cle: "largeurFlash", champ: $("largeurFlash"), sortie: $("v-flash"), texte: (v) => `${v} img` },
    { cle: "flou", champ: $("flou"), sortie: $("v-flou"), texte: (v) => (v ? `${v} px` : "aucun") },
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
      // Le bouton est la zone du doigt (44 px) ; la croix visible n'en occupe que le coin.
      const croix = document.createElement("span");
      croix.className = "croix";
      croix.textContent = "×";
      croix.setAttribute("aria-hidden", "true");
      retirer.append(croix);
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
      // Passer par definirCible : elle rafraîchit l'aperçu si besoin.
      if (reglages.cible === id) definirCible(reglages.objets[0] ?? null, { differer: true });
      dire("");
    } else {
      if (reglages.objets.length >= MAX_OBJETS) { dire(`${MAX_OBJETS} objets au maximum.`); return; }
      reglages.objets = [...reglages.objets, id];
      if (reglages.cible === null) definirCible(id, { differer: true });
      dire("");
    }
    appliquer();
  }

  function definirCible(id, { differer = false } = {}) {
    reglages.cible = id;
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
    el.son.checked = reglages.son;
  }

  /** Durée et fenêtre de pause : calcul pur, aucune image à charger — donc immédiat. */
  function majInfos() {
    const infos = formaterInfos(roulettePour(reglages, catalogue));
    el.duree.textContent = infos.duree;
    el.fenetre.textContent = infos.fenetre;
  }

  /** Ce qu'un mouvement de curseur (ou une frappe) change : trois `textContent`. */
  function majCurseurs() {
    for (const c of curseurs) c.sortie.textContent = c.texte(reglages[c.cle]);
    majInfos();
  }

  /** Ce que seul un changement de sélection ou de fond change : les 392 vignettes. */
  function majGrilles() {
    el.compte.textContent = `${reglages.objets.length} / ${MAX_OBJETS}`;
    for (const b of el.grilleFonds.children) b.classList.toggle("actif", b.dataset.fond === reglages.fond);
    for (const [id, b] of vignettesObjets) b.classList.toggle("selectionne", reglages.objets.includes(id));
    construireSelection();
  }

  function majAffichage() {
    majCurseurs();
    majGrilles();
  }

  /** Avertissement qui doit survivre au rechargement de l'aperçu (lequel vide la ligne). */
  let avertissement = "";

  function sauver() {
    // `sauverReglages` laisse tomber un fond personnalisé trop lourd pour le
    // localStorage : sans un mot, la photo disparaîtrait à la prochaine ouverture.
    avertissement = reglages.fond === FOND_PERSO
      && typeof reglages.fondPerso === "string"
      && reglages.fondPerso.length > TAILLE_MAX_FOND_PERSO
      ? MESSAGE_FOND_LOURD : "";
    try { sauverReglages(stockage, reglages); } catch (e) { console.warn("réglages non sauvegardés", e); }
    dire(avertissement);
  }

  /** Le rechargement lui-même. Passer par `rafraichirApercu`, sauf pour préparer une prise. */
  async function rechargerScene() {
    oublierPrise();                   // les réglages ont bougé : le fichier d'avant ne les montre plus.
    try {
      const { r } = await apercu.charger(reglages, catalogue);
      // Sans roulette (moins de 2 objets, pas de cible), rien à enregistrer ; et
      // pendant une prise, le bouton reste grisé quoi que dise le rechargement.
      el.enregistrer.disabled = !r || enregistrementEnCours;
      dire(avertissement);            // le chargement a abouti : plus rien à signaler.
    } catch (e) {
      el.enregistrer.disabled = true; // scène incomplète : on n'enregistre pas une image fausse.
      const texte = String(e?.message ?? e);
      dire(texte.charAt(0).toUpperCase() + texte.slice(1));
    }
  }

  let minuterieApercu = null;
  /** Promesse du rechargement en vol, s'il y en a un : la prise l'attend avant de filmer. */
  let apercuEnVol = null;

  function lancerRechargement() {
    const p = rechargerScene().finally(() => { if (apercuEnVol === p) apercuEnVol = null; });
    apercuEnVol = p;
    return p;
  }

  /**
   * Rechargement demandé par un changement de réglages. Pendant une prise, on ne
   * touche pas à la scène : l'enregistreur la filme, la remplacer sous lui
   * changerait de décor au milieu de la vidéo.
   */
  function rafraichirApercu() {
    if (enregistrementEnCours) return Promise.resolve();
    return lancerRechargement();
  }

  function planifierApercu(delai) {
    if (minuterieApercu !== null) { clearTimeout(minuterieApercu); minuterieApercu = null; }
    if (delai <= 0) { rafraichirApercu(); return; }
    minuterieApercu = setTimeout(() => { minuterieApercu = null; rafraichirApercu(); }, delai);
  }

  /**
   * Exécute tout de suite le rechargement encore différé, s'il y en a un, puis
   * attend celui déjà en vol : avant d'enregistrer, la scène doit montrer les
   * réglages courants — et surtout aucun chargement d'images ne doit aboutir en
   * pleine prise. Contourne la garde de `rafraichirApercu` : le drapeau de prise
   * est levé mais rien n'est encore filmé.
   */
  async function flusherApercu() {
    if (minuterieApercu !== null) {
      clearTimeout(minuterieApercu);
      minuterieApercu = null;
      lancerRechargement();
    }
    await apercuEnVol;
  }

  /**
   * Point de passage unique de tout changement : normalise, persiste, redessine.
   * `delai` diffère le seul rechargement de l'aperçu (curseurs et frappe) ;
   * l'écran, lui, est à jour tout de suite. `leger` saute les grilles, que ni
   * les curseurs ne touchent pas.
   */
  function appliquer({ delai = 0, leger = false } = {}) {
    reglages = normaliserReglages(reglages);
    sauver();
    if (leger) majCurseurs(); else majAffichage();
    planifierApercu(delai);
  }

  // ------------------------------------------------------------- événements

  el.categorie.addEventListener("change", appliquerFiltre);
  el.recherche.addEventListener("input", appliquerFiltre);
  el.aleatoire.addEventListener("click", tirer);
  el.vider.addEventListener("click", () => { reglages.objets = []; reglages.cible = null; dire(""); appliquer(); });

  for (const c of curseurs) {
    c.champ.addEventListener("input", () => {
      reglages[c.cle] = Number(c.champ.value);
      appliquer({ delai: DELAI_CURSEUR, leger: true });
    });
  }
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

  // ---------------------------------------------------- enregistrer / partager

  const capacites = capacitesEnregistrement();
  // Rendu hors ligne (WebCodecs) d'abord : cadence fixe, aucune image perdue, prise
  // bien plus courte que le clip. La prise en temps réel ne sert plus que de secours.
  const horsLigne = await capacitesHorsLigne();
  if (DEBUG) console.info("rendu hors ligne", horsLigne);
  // Diagnostic visible : quel chemin servira, et pourquoi (secours = pas de VideoEncoder).
  const diag = document.getElementById("diagnostic");
  if (diag) {
    diag.textContent = horsLigne.ok
      ? `rendu hors ligne ${horsLigne.codecVideo}${horsLigne.audio ? " + AAC" : ", sans AudioEncoder"}`
      : `secours temps réel (VideoEncoder ${typeof VideoEncoder === "undefined" ? "absent" : "sans H.264"})`;
  }

  /** Le fichier de la dernière prise, valable tant que les réglages n'ont pas changé. */
  let prise = null;
  /**
   * Vrai pendant la prise. Le tout premier tap de la page est un pointerdown
   * ET un click : si ce tap tombe sur « Enregistrer », le gestionnaire de
   * pointerdown relancerait l'aperçu par-dessus la boucle de l'enregistreur.
   */
  let enregistrementEnCours = false;

  function oublierPrise() {
    prise = null;
    el.partager.hidden = true;
    el.partager.disabled = true;
  }

  el.enregistrer.addEventListener("click", async () => {
    // Synchrone, avant le moindre `await` : deux taps rapprochés ne doivent lancer
    // qu'une prise (le second retombe ici même, sur le drapeau déjà levé).
    if (enregistrementEnCours || el.enregistrer.disabled) return;
    if (!horsLigne.ok && !capacites.ok) { dire(capacites.raison); return; }
    enregistrementEnCours = true;
    el.enregistrer.disabled = true;

    await flusherApercu();
    // Le clic EST le geste utilisateur : c'est ici, et nulle part ailleurs, qu'iOS
    // accepte de créer/reprendre le contexte audio dont l'enregistreur lit le flux.
    try {
      await son.demarrer();
      son.active = reglages.son;
      apercu.sonDemarre = true;
    } catch (e) {
      console.warn("son indisponible", e);   // vidéo muette plutôt que pas de vidéo.
    }

    el.app.classList.add("figee");
    for (const p of el.panneauxGeles) p.inert = true;
    oublierPrise();
    el.progression.value = 0;
    el.progression.hidden = false;
    dire(horsLigne.ok ? "Rendu en cours…" : "Enregistrement en cours… (temps réel, ne quitte pas la page)");

    try {
      if (horsLigne.ok) {
        const { blob, nomFichier, fps } = await rendreHorsLigne({
          scene: apercu.scene, r: apercu.r, son, sonActif: reglages.son, cibleId: reglages.cible,
          capacites: horsLigne, onProgression: (p) => { el.progression.value = p; },
        });
        prise = { blob, nomFichier };
        if (DEBUG) window.__dernierBlob = blob;
        el.partager.hidden = false;
        el.partager.disabled = false;
        dire(`Rendu : ${formaterDuree(apercu.r?.duree)} · ${fps} fps${horsLigne.audio ? "" : " · sans son (navigateur)"}`);
        return;
      }
      const { blob, nomFichier, fpsMoyen } = await enregistrer({
        canvas: el.scene,
        apercu,
        son,
        cibleId: reglages.cible,
        mime: capacites.mime,
        onProgression: (p) => { el.progression.value = p; },
      });
      prise = { blob, nomFichier };
      if (DEBUG) window.__dernierBlob = blob;
      el.partager.hidden = false;
      el.partager.disabled = false;
      const fps = Math.round(fpsMoyen);
      dire(fpsMoyen < FPS_MINI
        ? `Enregistrement saccadé (${fps} fps) : réenregistre en fermant les autres apps.`
        : `Enregistré en temps réel (secours, sans WebCodecs) : ${formaterDuree(apercu.r?.duree)} · ${fps} fps`);
    } catch (e) {
      dire(String(e?.message ?? e));
    } finally {
      enregistrementEnCours = false;
      el.progression.hidden = true;
      el.app.classList.remove("figee");
      for (const p of el.panneauxGeles) p.inert = false;
      el.enregistrer.disabled = !apercu.r;
    }
  });

  el.partager.addEventListener("click", async () => {
    if (!prise) return;
    el.partager.disabled = true;
    try {
      const issue = await partager(prise.blob, prise.nomFichier);
      dire({
        partage: "Vidéo partagée.",
        telechargement: `Vidéo téléchargée : ${prise.nomFichier}`,
        annule: "Partage annulé.",
      }[issue] ?? "");
    } catch (e) {
      dire(`Partage impossible : ${String(e?.message ?? e)}`);
    } finally {
      el.partager.disabled = false;
    }
  });

  // iOS n'autorise l'audio qu'après un geste : jusque-là l'aperçu tourne muet.
  document.addEventListener("pointerdown", async () => {
    try {
      await son.demarrer();
      son.active = reglages.son;
      apercu.sonDemarre = true;
      if (!enregistrementEnCours) apercu.jouer();   // l'enregistreur tient déjà le canvas.
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
