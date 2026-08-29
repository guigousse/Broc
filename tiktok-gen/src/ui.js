/**
 * Point d'entrée de la page : câblage du DOM. Toute la logique vit ailleurs
 * (roulette.js, catalogue.js, reglages.js, texte.js, apercu.js) — ce fichier
 * ne fait que lire les champs, écrire les réglages et rafraîchir l'aperçu.
 */
import { CATEGORIES, chargerCatalogue, filtrerCatalogue, tirerAleatoire } from "./catalogue.js";
import { CacheImages } from "./images.js";
import {
  COULEURS_TEXTE, FOND_PERSO, POLICES, REGLAGES_DEFAUT, TAILLE_MAX_FOND_PERSO, TEXTE_MAX, TEXTES_MAX,
  chargerReglages, deplacerTexte, normaliserReglages, nouveauTexte, sauverReglages,
} from "./reglages.js";
import { formaterDuree, formaterInfos } from "./texte.js";
import { SonRoulette } from "./son.js";
import { Apercu, roulettePour } from "./apercu.js";
import { capacitesEnregistrement, enregistrer, partager } from "./enregistreur.js";
import { capacitesHorsLigne, rendreHorsLigne } from "./encodeur.js";
import { appliquerPreset, chargerPreset, nomsPresets, sauverPreset, supprimerPreset } from "./presets.js";

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
    typeVideo: $("typeVideo"), reglagesPanneau: $("p-reglages"),
    presetListe: $("preset-liste"), presetCharger: $("preset-charger"), presetSauver: $("preset-sauver"), presetSupprimer: $("preset-supprimer"),
  };
  const curseurs = [
    { cle: "vitesse", champ: $("vitesse"), sortie: $("v-vitesse"), texte: (v) => v.toFixed(1).replace(".", ",") },
    { cle: "espacement", champ: $("espacement"), sortie: $("v-espacement"), texte: (v) => `${v} px` },
    { cle: "nbPassages", champ: $("nbPassages"), sortie: $("v-passages"), texte: (v) => String(v) },
    { cle: "largeurFlash", champ: $("largeurFlash"), sortie: $("v-flash"), texte: (v) => `${v} img` },
    { cle: "flou", champ: $("flou"), sortie: $("v-flou"), texte: (v) => (v ? `${v} px` : "aucun") },
    { cle: "liseret", champ: $("liseret"), sortie: $("v-liseret"), texte: (v) => (v ? `${v} px` : "aucun") },
    { cle: "nbTours", champ: $("nbTours"), sortie: $("v-tours"), texte: (v) => String(v) },
    { cle: "dureeDefilement", champ: $("dureeDefilement"), sortie: $("v-defilement"), texte: (v) => formaterDuree(v) },
    { cle: "arretFinal", champ: $("arretFinal"), sortie: $("v-arret"), texte: (v) => formaterDuree(v) },
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
    el.typeVideo.value = reglages.type;
    el.reglagesPanneau.dataset.type = reglages.type;
    construireTextes();
  }

  /** Durée et fenêtre de pause : calcul pur, aucune image à charger — donc immédiat. */
  function majInfos() {
    const infos = formaterInfos(roulettePour(reglages, catalogue));
    el.duree.textContent = infos.duree;
    el.fenetre.textContent = infos.fenetre;
    const lib = document.getElementById("info-fenetre-libelle");
    if (lib) lib.textContent = reglages.type === "ralentie" ? "arrêt final" : "fenêtre de pause";
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
  // ------------------------------------------------------------- préréglages
  function majPresets(selection = "") {
    const noms = nomsPresets(stockage);
    el.presetListe.replaceChildren(new Option("— aucun —", ""), ...noms.map((n) => new Option(n, n)));
    el.presetListe.value = noms.includes(selection) ? selection : "";
    const choisi = el.presetListe.value !== "";
    el.presetCharger.disabled = !choisi;
    el.presetSupprimer.disabled = !choisi;
  }
  el.presetListe.addEventListener("change", () => majPresets(el.presetListe.value));
  el.presetSauver.addEventListener("click", () => {
    const nom = window.prompt("Nom du préréglage", el.presetListe.value || "");
    if (nom === null) return;
    const retenu = sauverPreset(stockage, nom, reglages);
    if (!retenu) { dire("Donne un nom au préréglage."); return; }
    majPresets(retenu);
    dire(`Préréglage « ${retenu} » enregistré.`);
  });
  el.presetCharger.addEventListener("click", () => {
    const nom = el.presetListe.value;
    const p = chargerPreset(stockage, nom);
    if (!p) { majPresets(); return; }
    reglages = appliquerPreset(reglages, p);
    peuplerChamps();
    appliquer();
    dire(`Préréglage « ${nom} » chargé.`);
  });
  el.presetSupprimer.addEventListener("click", () => {
    const nom = el.presetListe.value;
    if (!nom || !window.confirm(`Supprimer le préréglage « ${nom} » ?`)) return;
    supprimerPreset(stockage, nom);
    majPresets();
    dire(`Préréglage « ${nom} » supprimé.`);
  });
  majPresets();

  el.typeVideo.addEventListener("change", () => changerType(el.typeVideo.value));
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
        let etapeVue = null;
        const { blob, nomFichier, fps, avertissement } = await rendreHorsLigne({
          scene: apercu.scene, r: apercu.r, son, sonActif: reglages.son, cibleId: reglages.cible,
          capacites: horsLigne,
          onProgression: (p, etape) => {
            el.progression.value = p; majBarreEnregistrer(p);
            // L'étape en clair : si l'export se fige, on sait au moins à laquelle.
            if (etape && etape !== etapeVue) { etapeVue = etape; dire(`Rendu en cours… (${etape})`); }
          },
        });
        prise = { blob, nomFichier };
        if (DEBUG) window.__dernierBlob = blob;
        el.partager.hidden = false;
        el.partager.disabled = false;
        dire(`Rendu : ${formaterDuree(apercu.r?.duree)} · ${fps} fps${horsLigne.audio ? "" : " · sans son (navigateur)"}${avertissement ? ` · ⚠ ${avertissement}` : ""}`);
        return;
      }
      const { blob, nomFichier, fpsMoyen } = await enregistrer({
        canvas: el.scene,
        apercu,
        son,
        cibleId: reglages.cible,
        mime: capacites.mime,
        onProgression: (p) => { el.progression.value = p; majBarreEnregistrer(p); },
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
  // Sections rabattables : l'état de chacune survit au rechargement (confort local).
  // ------------------------------------------------------ éditeur de texte
  const listeTextes = document.getElementById("textes-liste");
  const boutonAjouterTexte = document.getElementById("texte-ajouter");
  let coucheActive = null;

  function activerCouche(id) {
    coucheActive = id;
    apercu.coucheActive = id;
    for (const carte of listeTextes.children) carte.classList.toggle("active", carte.dataset.id === id);
    apercu.redessiner();
  }

  /**
   * Une carte par calque : texte, police, taille, couleur, gras, centrer, devant/derrière, supprimer.
   * La liste montre la pile comme CapCut : la carte du HAUT est le calque le plus en avant
   * (= le dernier du tableau, dessiné en dernier).
   */
  function construireTextes() {
    const ids = new Set(reglages.textes.map((c) => c.id));
    if (!ids.has(coucheActive)) coucheActive = null;
    listeTextes.replaceChildren(...reglages.textes.map((c, i) => carteTexte(c, i)).reverse());
    boutonAjouterTexte.disabled = reglages.textes.length >= TEXTES_MAX;
    apercu.coucheActive = coucheActive;
  }

  function carteTexte(c, i) {
    const carte = document.createElement("div");
    carte.className = `carte-texte${c.id === coucheActive ? " active" : ""}`;
    carte.dataset.id = c.id;
    const maj = (patch, { delai = 0 } = {}) => {
      Object.assign(reglages.textes[i], patch);
      appliquer({ delai, leger: true });
    };
    const champ = document.createElement("input");
    champ.type = "text"; champ.maxLength = TEXTE_MAX; champ.value = c.texte; champ.placeholder = "Texte";
    champ.setAttribute("aria-label", `Texte ${i + 1}`);
    champ.addEventListener("focus", () => activerCouche(c.id));
    champ.addEventListener("input", () => maj({ texte: champ.value }, { delai: DELAI_CURSEUR }));
    const police = document.createElement("select");
    for (const p of POLICES) police.append(new Option(p, p));
    police.value = c.police;
    police.addEventListener("change", () => maj({ police: police.value }));
    const couleur = document.createElement("select");
    for (const [nom] of Object.entries(COULEURS_TEXTE)) couleur.append(new Option(nom.charAt(0).toUpperCase() + nom.slice(1), nom));
    couleur.value = c.couleur;
    couleur.addEventListener("change", () => maj({ couleur: couleur.value }));
    const gras = document.createElement("label");
    const grasCase = document.createElement("input"); grasCase.type = "checkbox"; grasCase.checked = c.gras;
    grasCase.addEventListener("change", () => maj({ gras: grasCase.checked }));
    gras.append(grasCase, " Gras");
    const taille = document.createElement("label");
    const tailleSortie = document.createElement("output"); tailleSortie.textContent = `${c.taille} px`;
    const tailleChamp = document.createElement("input");
    tailleChamp.type = "range"; tailleChamp.min = "20"; tailleChamp.max = "220"; tailleChamp.step = "2"; tailleChamp.value = String(c.taille);
    tailleChamp.addEventListener("input", () => { tailleSortie.textContent = `${tailleChamp.value} px`; maj({ taille: Number(tailleChamp.value) }, { delai: DELAI_CURSEUR }); });
    taille.append("Taille ", tailleSortie, tailleChamp);
    const centrer = document.createElement("button"); centrer.type = "button"; centrer.className = "discret"; centrer.textContent = "Centrer";
    centrer.addEventListener("click", () => maj({ x: 540 }));
    const supprimer = document.createElement("button"); supprimer.type = "button"; supprimer.className = "discret"; supprimer.textContent = "Supprimer";
    supprimer.addEventListener("click", () => { reglages.textes.splice(i, 1); appliquer({ leger: true }); construireTextes(); });
    const deplacer = (libelle, sens, enBout) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "discret"; b.textContent = libelle;
      b.disabled = enBout;
      b.setAttribute("aria-label", `${libelle} : texte ${i + 1}`);
      b.addEventListener("click", () => {
        if (!deplacerTexte(reglages.textes, c.id, sens)) return;
        coucheActive = c.id;
        appliquer({ leger: true });
        construireTextes();
      });
      return b;
    };
    const devant = deplacer("▲ Devant", +1, i === reglages.textes.length - 1);
    const derriere = deplacer("▼ Derrière", -1, i === 0);
    const ligne1 = document.createElement("div"); ligne1.className = "ligne"; ligne1.append(police, couleur);
    const ligne2 = document.createElement("div"); ligne2.className = "ligne"; ligne2.append(gras, centrer, supprimer);
    const ligne3 = document.createElement("div"); ligne3.className = "ligne"; ligne3.append(devant, derriere);
    carte.append(champ, ligne1, taille, ligne2, ligne3);
    carte.addEventListener("pointerdown", () => activerCouche(c.id));
    return carte;
  }

  boutonAjouterTexte.addEventListener("click", () => {
    if (reglages.textes.length >= TEXTES_MAX) return;
    const c = nouveauTexte();
    reglages.textes.push(c);
    coucheActive = c.id;
    appliquer({ leger: true });
    construireTextes();
    // Le nouveau calque est au-dessus de la pile : sa carte est en haut de la liste.
    listeTextes.firstElementChild?.querySelector("input[type=text]")?.focus();
  });

  // Glisser-déposer sur l'aperçu, en mode fin seulement : on déplace le calque sous le doigt.
  let glisse = null;
  el.scene.addEventListener("pointerdown", (e) => {
    if (!apercu.modeFin) return;
    const p = apercu.versCadre(e.clientX, e.clientY);
    const c = apercu.coucheSous(p.x, p.y);
    if (!c) return;
    e.preventDefault();
    el.scene.setPointerCapture(e.pointerId);
    glisse = { id: c.id, dx: c.x - p.x, dy: c.y - p.y, calque: c };
    activerCouche(c.id);
  });
  el.scene.addEventListener("pointermove", (e) => {
    if (!glisse) return;
    const p = apercu.versCadre(e.clientX, e.clientY);
    glisse.calque.x = Math.round(Math.min(1080, Math.max(0, p.x + glisse.dx)));
    glisse.calque.y = Math.round(Math.min(1920, Math.max(0, p.y + glisse.dy)));
    apercu.redessiner();
  });
  const finGlisse = () => {
    if (!glisse) return;
    const cible = reglages.textes.find((x) => x.id === glisse.id);
    if (cible) { cible.x = glisse.calque.x; cible.y = glisse.calque.y; }
    glisse = null;
    appliquer({ leger: true });
  };
  el.scene.addEventListener("pointerup", finGlisse);
  el.scene.addEventListener("pointercancel", finGlisse);

  // ------------------------------------------------- barre du bas (onglets)
  // Un seul panneau ouvert à la fois ; tap sur l'onglet actif = fermer. Mémorisé.
  const CLE_ONGLET = "broc-tiktok-gen-onglet";
  const onglets = [...document.querySelectorAll("#barre button[data-section]")];
  const feuilles = [...document.querySelectorAll(".panneau.feuille")];
  function ouvrirSection(id) {
    for (const f of feuilles) f.hidden = f.id !== id;
    for (const o of onglets) o.setAttribute("aria-pressed", String(o.dataset.section === id));
    // L'éditeur de texte travaille sur l'image finale : aperçu figé dessus, glisser-déposer actif.
    const modeTexte = id === "p-texte";
    apercu.figerFin(modeTexte);
    el.scene.classList.toggle("edition", modeTexte);
    try { stockage.setItem(CLE_ONGLET, id ?? ""); } catch { /* tant pis */ }
    const f = id && document.getElementById(id);
    if (f) f.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  for (const o of onglets) {
    o.addEventListener("click", () => {
      const deja = o.getAttribute("aria-pressed") === "true";
      ouvrirSection(deja ? null : o.dataset.section);
    });
  }
  let ongletInitial = null;
  try { ongletInitial = stockage.getItem(CLE_ONGLET) || null; } catch { /* rien */ }
  for (const f of feuilles) f.hidden = f.id !== ongletInitial;
  for (const o of onglets) o.setAttribute("aria-pressed", String(o.dataset.section === ongletInitial));
  if (ongletInitial === "p-texte") { apercu.figerFin(true); el.scene.classList.add("edition"); }

  function changerType(type) {
    reglages.type = type;
    el.typeVideo.value = type;
    el.reglagesPanneau.dataset.type = type;
    appliquer({ leger: true });
  }

  // Bouton Enregistrer de la barre : même prise que celui du panneau, même état.
  const barreEnregistrer = document.getElementById("barre-enregistrer");
  const barreEnregistrerLibelle = document.getElementById("barre-enregistrer-libelle");
  function majBarreEnregistrer(progression = null) {
    barreEnregistrer.disabled = el.enregistrer.disabled;
    barreEnregistrerLibelle.textContent = enregistrementEnCours && progression !== null
      ? `${Math.round(progression * 100)} %`
      : "Enregistrer";
  }
  new MutationObserver(() => majBarreEnregistrer()).observe(el.enregistrer, { attributes: true, attributeFilter: ["disabled"] });
  barreEnregistrer.addEventListener("click", () => el.enregistrer.click());
  majBarreEnregistrer();

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
