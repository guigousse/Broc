import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { getTemplate, tailleDe } from "@/data/objetTemplates";
import { getCamion, getScaleCoffre } from "@/data/camion";
import { calculerPrixMinAcceptDepuisPersona } from "@/lib/personas";
import { getClientIllustration } from "@/lib/personaIllustrations";
import {
  acheteurDeLEtape, COLIS_TUTORIEL_SCRIPTE, PELUCHE_TEMPLATE_ID, personnageScenario,
  PREFILL_COFFRE_TUTORIEL, PRIX_CONSEILLES_TUTORIEL, SESSION_TUTORIEL, SESSION_VENTE_TUTORIEL,
  TEMPLATES_VERROUILLES_TUTORIEL, TOLERANCE_PRIX_CONSEILLE, TRACES_TUTORIEL,
} from "./tutorielScenario";
import {
  deckVerrouille, donCollectionPermis, indexObjetScenario,
  ongletTutorielPermis, scenarioDeLEtape,
} from "@/lib/tutoriel";
import { getItemThumbUrl, ITEMS_WITH_IMAGE } from "@/lib/itemImages";
import { ALEA_NEGO_SCRIPTEE, ouvrirNegociation, proposerOffre } from "@/lib/negociation";
import { genererSessionScriptee } from "@/lib/chine";
import { getCoffreAssets } from "@/lib/coffreAssets";
import {
  computeOverlapsPixel, containRect, type PixelItem, type TrunkMask,
} from "@/lib/coffre";

describe("SESSION_TUTORIEL", () => {
  it("contient 6 objets aux templates connus, illustrés, sans doublon", () => {
    expect(SESSION_TUTORIEL).toHaveLength(6);
    const ids = SESSION_TUTORIEL.map((s) => s.templateId);
    expect(new Set(ids).size).toBe(6);
    for (const s of SESSION_TUTORIEL) {
      expect(getTemplate(s.templateId), s.templateId).toBeDefined();
      expect(ITEMS_WITH_IMAGE.has(s.templateId), s.templateId).toBe(true);
    }
  });
  it("suit l'ordre des rôles : échec, direct, réussite ×2, décor ×2", () => {
    expect(SESSION_TUTORIEL.map((s) => s.role)).toEqual([
      "nego-echec", "achat-direct", "nego-reussie", "nego-reussie", "decor", "decor",
    ]);
  });
  it("la peluche est le 4e objet et part en collection", () => {
    expect(SESSION_TUTORIEL[3].templateId).toBe(PELUCHE_TEMPLATE_ID);
  });
  it("l'échec est garanti : toute offre bornée est insultante au tour 1", () => {
    const s = SESSION_TUTORIEL[0];
    const seuil = s.prixVendeur * (1 - s.persona.tolerancePct);
    expect(s.bornesOffre!.max).toBeLessThan(seuil);
  });
  it("les réussites sont garanties : min ≥ prix plancher et jamais d'insulte", () => {
    for (const s of SESSION_TUTORIEL.filter((x) => x.role === "nego-reussie")) {
      const plancher = calculerPrixMinAcceptDepuisPersona(s.persona, s.prixVendeur);
      expect(s.bornesOffre!.min).toBeGreaterThanOrEqual(plancher);
      // pire cas d'insulte : prix adverse au plus haut (tour 1)
      expect(s.bornesOffre!.min).toBeGreaterThanOrEqual(
        s.prixVendeur * (1 - s.persona.tolerancePct),
      );
      expect(s.bornesOffre!.max).toBeLessThan(s.prixVendeur);
    }
  });
  it("le budget initial couvre large les 3 achats au pire prix", () => {
    const pire = SESSION_TUTORIEL[1].prixVendeur +
      SESSION_TUTORIEL[2].bornesOffre!.max + SESSION_TUTORIEL[3].bornesOffre!.max;
    expect(pire).toBeLessThanOrEqual(120); // INITIAL_BUDGET = 150, marge 30
  });
  it("la valeur de donation de la peluche franchit le seuil de 30 €", () => {
    const tpl = getTemplate(PELUCHE_TEMPLATE_ID)!;
    // état "Très bon" → prixReferenceReel = prixRefBase ; prime donation 1.1
    expect(SESSION_TUTORIEL[3].etat).toBe("Très bon");
    expect(Math.round(tpl.prixRefBase * 1.1)).toBeGreaterThanOrEqual(30);
  });
});

describe("TRACES_TUTORIEL", () => {
  it("vise la manette (pivotée, démo du grand-père) puis la carafe (remontée)", () => {
    expect(TRACES_TUTORIEL[0]).toMatchObject({ templateId: "jx.manette_vibraduo", rotation: 25 });
    expect(TRACES_TUTORIEL[1].templateId).toBe("ma.carafe_cristal_taille");
    expect(TRACES_TUTORIEL[1].rotation).toBeGreaterThanOrEqual(30);
  });
  it("reste dans les bornes du coffre sans se chevaucher", () => {
    for (const t of TRACES_TUTORIEL) {
      expect(t.posX).toBeGreaterThan(0.12); expect(t.posX).toBeLessThan(0.88);
      expect(t.posY).toBeGreaterThan(0.12); expect(t.posY).toBeLessThan(0.88);
    }
    const [a, b] = TRACES_TUTORIEL;
    expect(Math.hypot(a.posX - b.posX, a.posY - b.posY)).toBeGreaterThan(0.2);
  });
});

describe("helpers d'étape", () => {
  it("scenarioDeLEtape mappe les 4 étapes scriptées", () => {
    expect(scenarioDeLEtape("chine-nego-echec")).toBe(SESSION_TUTORIEL[0]);
    expect(scenarioDeLEtape("chine-achat-direct")).toBe(SESSION_TUTORIEL[1]);
    expect(scenarioDeLEtape("chine-nego-un")).toBe(SESSION_TUTORIEL[2]);
    expect(scenarioDeLEtape("chine-nego-deux")).toBe(SESSION_TUTORIEL[3]);
    expect(scenarioDeLEtape("chine-sortir")).toBeNull();
    expect(indexObjetScenario("chine-nego-deux")).toBe(3);
  });
  it("deckVerrouille : vrai sur les 4 étapes scriptées, faux ensuite", () => {
    expect(deckVerrouille("chine-nego-echec")).toBe(true);
    expect(deckVerrouille("chine-sortir")).toBe(false);
    expect(deckVerrouille("termine")).toBe(false);
  });
  it("ongletTutorielPermis guide stockage → collection → bureau", () => {
    expect(ongletTutorielPermis("stockage-ouvrir")).toBe("/stockage");
    expect(ongletTutorielPermis("stockage-focus")).toBe("/stockage");
    expect(ongletTutorielPermis("collection-envoyer")).toBe("/stockage");
    expect(ongletTutorielPermis("collection-lecon")).toBe("/collection");
    expect(ongletTutorielPermis("preparer-etal")).toBe("/bureau");
    expect(ongletTutorielPermis("accueil")).toBeNull();
    expect(ongletTutorielPermis("termine")).toBeNull();
  });
  it("donCollectionPermis : seule la peluche pendant collection-envoyer, tout hors tuto", () => {
    expect(donCollectionPermis("collection-envoyer", PELUCHE_TEMPLATE_ID)).toBe(true);
    expect(donCollectionPermis("collection-envoyer", "ma.carafe_cristal_taille")).toBe(false);
    expect(donCollectionPermis("stockage-focus", PELUCHE_TEMPLATE_ID)).toBe(false);
    expect(donCollectionPermis("termine", "ma.carafe_cristal_taille")).toBe(true);
  });
});

describe("garanties de négo du scénario", () => {
  it("objet 1 : TOUTE offre bornée fâche le vendeur au tour 1", () => {
    const s = SESSION_TUTORIEL[0];
    const it = genererSessionScriptee()[0];
    for (let offre = s.bornesOffre!.min; offre <= s.bornesOffre!.max; offre++) {
      const nego = proposerOffre(
        ouvrirNegociation("achat", it.prixVendeur, it.prixMinAccept),
        s.persona, offre, ALEA_NEGO_SCRIPTEE,
      );
      expect(nego.statut, `offre ${offre}`).toBe("fache");
    }
  });
  it.each([[2], [3]])("objet %d : aucune suite d'offres bornées ne peut échouer", (idx) => {
    const s = SESSION_TUTORIEL[idx];
    const it = genererSessionScriptee()[idx];
    // Pire stratégie pour l'accord : offrir la borne MIN à chaque tour
    // (une offre plus haute conclut plus tôt). La trajectoire adverse est
    // déterministe : il suffit de la dérouler.
    let nego = ouvrirNegociation("achat", it.prixVendeur, it.prixMinAccept);
    let tours = 0;
    while (nego.statut === "en_cours" && tours < 10) {
      nego = proposerOffre(nego, s.persona, s.bornesOffre!.min, ALEA_NEGO_SCRIPTEE);
      tours++;
      expect(["en_cours", "conclu"], `tour ${tours}`).toContain(nego.statut);
    }
    expect(nego.statut).toBe("conclu");
    expect(tours).toBeLessThanOrEqual(s.persona.patience);
    // Et l'insulte est impossible sur TOUTE la plage au prix adverse le plus
    // haut (tour 1) — les prix suivants ne font que baisser le seuil.
    expect(s.bornesOffre!.min).toBeGreaterThanOrEqual(
      it.prixVendeur * (1 - s.persona.tolerancePct),
    );
  });
});

describe("COLIS_TUTORIEL_SCRIPTE", () => {
  it("5 objets connus, illustrés, petits, 4 communs + 1 rare en dernier", () => {
    expect(COLIS_TUTORIEL_SCRIPTE).toHaveLength(5);
    const dejaVus = new Set([...SESSION_TUTORIEL.map((s) => s.templateId), PELUCHE_TEMPLATE_ID]);
    for (const o of COLIS_TUTORIEL_SCRIPTE) {
      const t = getTemplate(o.templateId);
      expect(t, o.templateId).toBeDefined();
      expect(ITEMS_WITH_IMAGE.has(o.templateId), o.templateId).toBe(true);
      expect(["XS", "S", "M"], o.templateId).toContain(tailleDe(t!));
      expect(dejaVus.has(o.templateId), o.templateId).toBe(false);
    }
    expect(COLIS_TUTORIEL_SCRIPTE.slice(0, 4).every((o) => getTemplate(o.templateId)!.rarete === "commun")).toBe(true);
    expect(getTemplate(COLIS_TUTORIEL_SCRIPTE[4].templateId)!.rarete).toBe("rare");
  });
});

describe("PREFILL_COFFRE_TUTORIEL", () => {
  it("3 objets pris dans le colis, avec un prix affiché", () => {
    expect(PREFILL_COFFRE_TUTORIEL).toHaveLength(3);
    const colisIds = new Set(COLIS_TUTORIEL_SCRIPTE.map((o) => o.templateId));
    for (const p of PREFILL_COFFRE_TUTORIEL) {
      expect(colisIds.has(p.templateId), p.templateId).toBe(true);
      expect(p.prixVente).toBeGreaterThan(0);
    }
  });
});

describe("TEMPLATES_VERROUILLES_TUTORIEL — invariant anti-cul-de-sac (Task 8, revue)", () => {
  it("verrouille le préfill ET la manette posée par la démo (trace 0)", () => {
    // La manette n'est plus posée par le joueur (démo du grand-père) : une
    // fois dans le coffre, elle doit être aussi immuable que le préfill,
    // sinon un tap malencontreux sur la carafe (qui atterrit au centre
    // 0.5/0.5, proche de la trace manette 0.47/0.49) peut la déloger — et
    // plus aucun chemin ne la repose (exclue du carrousel, cf.
    // `ajoutsAutorisesTemplateIds` côté prep/page.tsx). Cette assertion
    // ÉCHOUE sur le code d'avant le fix (seul le préfill était verrouillé).
    expect(TEMPLATES_VERROUILLES_TUTORIEL.has(TRACES_TUTORIEL[0].templateId)).toBe(true);
    for (const p of PREFILL_COFFRE_TUTORIEL) {
      expect(TEMPLATES_VERROUILLES_TUTORIEL.has(p.templateId), p.templateId).toBe(true);
    }
  });

  it("ne verrouille PAS la carafe (trace 1) — elle reste posée et déplaçable par le joueur", () => {
    expect(TEMPLATES_VERROUILLES_TUTORIEL.has(TRACES_TUTORIEL[1].templateId)).toBe(false);
  });
});

/*
 * === Oracle géométrique (sharp, hors navigateur) ==========================
 *
 * La garde bbox/disque (ancienne version de ce fichier) comparait des
 * disques de rayon 0.16 à des empreintes réelles bien plus grandes (un objet
 * "S" fait ~0.333 de côté dans le coffre "rogers", cf. `getScaleCoffre("S", 9)`)
 * et ne testait AUCUN chevauchement préfill↔préfill : elle ne pouvait pas
 * prouver la géométrie, seulement repousser une évidence grossière — un
 * triplet préfill entièrement hors du coffre (cas réellement rencontré en
 * v3) passait cette garde sans broncher.
 *
 * Ce bloc reconstruit hors navigateur (via `sharp`) les MÊMES masques que le
 * moteur du coffre (`src/lib/coffre.ts` + `CoffreChargement.tsx`) :
 *   - masque alpha 48×48 de la vignette de chaque objet, en rendu "contain"
 *     (`containRect`, importé de `coffre.ts` — pas de rotation dans le
 *     masque : la rotation réelle s'applique séparément, via `PixelItem.rot`,
 *     exactement comme en production) ;
 *   - masque du contenant 256×256 depuis `rogers-mask.webp` (le camion du
 *     tutoriel), luma > 200 = intérieur autorisé — même seuil que
 *     `buildTrunkMask`.
 * Puis il appelle LA MÊME fonction que la prod, `computeOverlapsPixel`, sur
 * les 3 objets du préfill + les 2 traces : un Set vide prouve d'un coup (a)
 * chaque objet 100% dans le coffre, (b) zéro chevauchement préfill↔préfill,
 * (c) zéro chevauchement préfill↔traces et (d) zéro chevauchement
 * trace↔trace — aux positions ET rotations exactes du scénario.
 *
 * Le coffre "rogers" (N1, 9 places) est petit : le triplet préfill est
 * SATURÉ — il n'a quasiment aucune marge contre le bord du contenant.
 * Toute future modification d'une position (préfill ou trace) DOIT repasser
 * par ce test avant d'être committée — ne jamais réajuster une coordonnée
 * "à l'œil".
 */

const MASK_SIZE = 48; // aligné sur CoffreChargement.tsx (MASK_SIZE)
const TRUNK_SIZE = 256; // aligné sur CoffreChargement.tsx (TRUNK_MASK_SIZE)
const PUBLIC_DIR = path.join(process.cwd(), "public");

/** Reconstruit hors navigateur le masque alpha "contain" que produirait
 *  `buildAlphaMask(src, size, 0)` (src/lib/coffre.ts) — toujours à rotation
 *  0 : la rotation réelle est appliquée séparément via `PixelItem.rot`. */
async function buildAlphaMaskNode(relUrl: string, size: number): Promise<Uint8Array> {
  const img = sharp(path.join(PUBLIC_DIR, relUrl));
  const meta = await img.metadata();
  const { dw, dh } = containRect(meta.width ?? size, meta.height ?? size, size);
  const rw = Math.max(1, Math.round(dw));
  const rh = Math.max(1, Math.round(dh));
  const resized = await img.resize(rw, rh, { fit: "fill" }).ensureAlpha().raw().toBuffer();
  const bits = new Uint8Array(size * size);
  const offX = Math.round((size - rw) / 2);
  const offY = Math.round((size - rh) / 2);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      if (resized[(y * rw + x) * 4 + 3] <= 16) continue; // même seuil que buildAlphaMask
      const gx = x + offX;
      const gy = y + offY;
      if (gx < 0 || gx >= size || gy < 0 || gy >= size) continue;
      bits[gy * size + gx] = 1;
    }
  }
  return bits;
}

/** Reconstruit hors navigateur le masque du contenant que produirait
 *  `buildTrunkMask(src, size)` (zoom=1 : étirement plein cadre, sans crop —
 *  le coffre "rogers" du tutoriel n'a pas de zoom). */
async function buildTrunkMaskNode(relUrl: string, size: number): Promise<TrunkMask> {
  const raw = await sharp(path.join(PUBLIC_DIR, relUrl))
    .resize(size, size, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const bits = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const r = raw[i * 4];
    const g = raw[i * 4 + 1];
    const b = raw[i * 4 + 2];
    const a = raw[i * 4 + 3];
    bits[i] = a > 32 && (r + g + b) / 3 > 200 ? 1 : 0; // même seuil que buildTrunkMask
  }
  return { bits, size };
}

describe("géométrie du coffre v3 — oracle pixel-perfect (sharp)", () => {
  it("préfill + traces : 100% dans le coffre, zéro chevauchement (préfill↔préfill, préfill↔traces, trace↔trace)", async () => {
    const camion = getCamion(1); // "Rogers" — camion du tutoriel
    const assets = getCoffreAssets(camion.visuelId);
    expect(assets, camion.visuelId).toBeTruthy();
    const trunk = await buildTrunkMaskNode(assets!.mask, TRUNK_SIZE);

    const objetsAVerifier = [
      ...PREFILL_COFFRE_TUTORIEL.map((p) => ({
        id: p.templateId, templateId: p.templateId, posX: p.posX, posY: p.posY, rotation: p.rotation,
      })),
      ...TRACES_TUTORIEL.map((t) => ({
        id: `trace:${t.templateId}`, templateId: t.templateId, posX: t.posX, posY: t.posY, rotation: t.rotation,
      })),
    ];

    const masks = new Map<string, Uint8Array>();
    for (const o of objetsAVerifier) {
      if (masks.has(o.templateId)) continue;
      const url = getItemThumbUrl(o.templateId);
      expect(url, o.templateId).toBeTruthy();
      masks.set(o.templateId, await buildAlphaMaskNode(url!, MASK_SIZE));
    }

    const items: PixelItem[] = objetsAVerifier.map((o) => {
      const tpl = getTemplate(o.templateId)!;
      return {
        id: o.id,
        cx: o.posX,
        cy: o.posY,
        scale: getScaleCoffre(tailleDe(tpl), camion.capacitePlaces),
        rot: o.rotation,
        mask: masks.get(o.templateId)!,
        maskSize: MASK_SIZE,
      };
    });

    const overlaps = computeOverlapsPixel(items, trunk);
    expect([...overlaps]).toEqual([]);
  });
});

describe("traces v3", () => {
  it("manette pivotée (démo), carafe remontée", () => {
    expect(TRACES_TUTORIEL[0].rotation).toBeGreaterThanOrEqual(20);
    expect(TRACES_TUTORIEL[1].posY).toBeLessThanOrEqual(0.45);
  });
});

describe("PRIX_CONSEILLES_TUTORIEL", () => {
  it("couvre manette et carafe, dans l'échelle du PrixSlider (1..2×réf)", () => {
    const manette = getTemplate("jx.manette_vibraduo")!;
    const carafe = getTemplate("ma.carafe_cristal_taille")!;
    // états scriptés du chinage : manette Très bon (réf 18), carafe Bon (réf 21)
    expect(PRIX_CONSEILLES_TUTORIEL["jx.manette_vibraduo"]).toBeLessThanOrEqual(18 * 2);
    expect(PRIX_CONSEILLES_TUTORIEL["ma.carafe_cristal_taille"]).toBeLessThanOrEqual(21 * 2);
    expect(TOLERANCE_PRIX_CONSEILLE).toBeGreaterThan(0);
    void manette; void carafe;
  });
});

describe("SESSION_VENTE_TUTORIEL — garanties", () => {
  it("3 acheteurs résolus (personnage nommé + portrait) visant des objets du coffre", () => {
    expect(SESSION_VENTE_TUTORIEL).toHaveLength(3);
    for (const a of SESSION_VENTE_TUTORIEL) {
      const p = personnageScenario(a);
      expect(getClientIllustration(p.id), p.nom).toBeDefined();
      expect(["jx.manette_vibraduo", "ma.carafe_cristal_taille"]).toContain(a.templateIdCible);
    }
    expect(SESSION_VENTE_TUTORIEL.map((a) => a.mode)).toEqual(["negociation", "achat-direct", "negociation"]);
  });
  it("acheteurDeLEtape mappe les 3 étapes de vente", () => {
    expect(acheteurDeLEtape("vente-refus")).toBe(SESSION_VENTE_TUTORIEL[0]);
    expect(acheteurDeLEtape("vente-directe")).toBe(SESSION_VENTE_TUTORIEL[1]);
    expect(acheteurDeLEtape("vente-nego")).toBe(SESSION_VENTE_TUTORIEL[2]);
    expect(acheteurDeLEtape("conclusion")).toBeNull();
  });
  it("radin : AUCUNE offre bornée ne peut conclure ni insulter", () => {
    const a = SESSION_VENTE_TUTORIEL[0];
    // borne min > prixMax → jamais d'accord (offreRejoint vente : offre ≤ prixAdverse ≤ prixMax)
    expect(a.bornesOffre!.min).toBeGreaterThan(a.prixMax);
    // pire cas d'insulte : prixAdverse au plus bas (tour 1 = offreInitiale)
    expect(a.bornesOffre!.max).toBeLessThanOrEqual(a.offreInitiale! * (1 + a.persona.tolerancePct));
    // déroulé complet : quelle que soit l'offre constante, fin en refus_poli (patience), jamais conclu/fache
    for (let offre = a.bornesOffre!.min; offre <= a.bornesOffre!.max; offre++) {
      let nego = ouvrirNegociation("vente", a.offreInitiale!, a.prixMax);
      let tours = 0;
      while (nego.statut === "en_cours" && tours < 12) {
        nego = proposerOffre(nego, a.persona, offre, ALEA_NEGO_SCRIPTEE);
        tours++;
      }
      expect(nego.statut, `offre ${offre}`).toBe("refus_poli");
    }
  });
  it("négociatrice : la stratégie borne MAX (la plus lente) conclut dans la patience", () => {
    const a = SESSION_VENTE_TUTORIEL[2];
    expect(a.prixMax).toBeGreaterThanOrEqual(a.bornesOffre!.max); // alignement toujours atteignable
    let nego = ouvrirNegociation("vente", a.offreInitiale!, a.prixMax);
    let tours = 0;
    while (nego.statut === "en_cours" && tours < 10) {
      nego = proposerOffre(nego, a.persona, a.bornesOffre!.max, ALEA_NEGO_SCRIPTEE);
      tours++;
      expect(["en_cours", "conclu"], `tour ${tours}`).toContain(nego.statut);
    }
    expect(nego.statut).toBe("conclu");
    expect(tours).toBeLessThanOrEqual(a.persona.patience);
    // et jamais d'insulte sur la plage au prix adverse le plus bas
    expect(a.bornesOffre!.max).toBeLessThanOrEqual(a.offreInitiale! * (1 + a.persona.tolerancePct));
  });
  it("cohérence prix : l'ami paie le prix conseillé de la manette, le radin ne peut pas payer la carafe", () => {
    expect(SESSION_VENTE_TUTORIEL[1].prixMax).toBeGreaterThanOrEqual(PRIX_CONSEILLES_TUTORIEL["jx.manette_vibraduo"]);
    expect(SESSION_VENTE_TUTORIEL[0].prixMax).toBeLessThan(PRIX_CONSEILLES_TUTORIEL["ma.carafe_cristal_taille"]);
  });
});
