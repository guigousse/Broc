import { describe, expect, it } from "vitest";
import {
  commandeAssemblage,
  commandeCarteFin,
  commandeConcat,
  commandeDerniereFrame,
  commandeHabillage,
  commandeSon,
  echapperTexte,
} from "./ffmpeg.mjs";

describe("commandeDerniereFrame", () => {
  const args = commandeDerniereFrame("/tmp/p1.mp4", "/tmp/raccord.png");

  it("lit la fin du fichier et n'extrait qu'une image", () => {
    expect(args).toContain("-sseof");
    expect(args).toContain("-update");
    expect(args.join(" ")).toContain("-frames:v 1");
  });

  it("écrase sans poser de question et cible la sortie demandée", () => {
    expect(args).toContain("-y");
    expect(args[args.length - 1]).toBe("/tmp/raccord.png");
  });

  it("prend le fichier source en entrée", () => {
    expect(args[args.indexOf("-i") + 1]).toBe("/tmp/p1.mp4");
  });
});

describe("echapperTexte", () => {
  it("échappe les caractères qui cassent drawtext", () => {
    expect(echapperTexte("Vingt-cinq : d’accord ?")).toBe("Vingt-cinq \\: d’accord ?");
    expect(echapperTexte("a%b")).toBe("a\\%b");
  });

  it("échappe la virgule, qui séparerait sinon deux filtres", () => {
    expect(echapperTexte("Bon, d’accord")).toBe("Bon\\, d’accord");
  });

  // L'apostrophe droite ne « passe » pas telle quelle dans une valeur
  // text= non quotée : elle fait basculer le lecteur de filtergraph
  // d'ffmpeg en mode chaîne quotée en plein milieu de l'option et avale
  // tout ce qui suit, jusqu'au label de sortie suivant — vérifié le
  // 2026-07-27 sur un ffmpeg réel (build ffmpeg-full). On la remplace par
  // l'apostrophe typographique, qui ne perturbe pas le lecteur.
  it("remplace l'apostrophe droite par l'apostrophe typographique, seule forme sûre pour drawtext", () => {
    expect(echapperTexte("a'b")).toBe("a’b");
    expect(echapperTexte("l'App Store")).toBe("l’App Store");
  });
});

describe("commandeAssemblage", () => {
  const args = commandeAssemblage({ p1: "/t/p1.mp4", p2: "/t/p2.mp4", sortie: "/t/joint.mp4" });
  const filtre = args[args.indexOf("-filter_complex") + 1];

  it("concatène l'image sans transition", () => {
    expect(filtre).toContain("concat=n=2:v=1:a=0");
  });

  it("fond les deux ambiances sur 0.2 s", () => {
    expect(filtre).toContain("acrossfade=d=0.2");
  });

  it("normalise en 1080x1920", () => {
    expect(filtre).toContain("1080:1920");
  });
});

describe("commandeHabillage", () => {
  const args = commandeHabillage({
    entree: "/t/joint.mp4",
    sortie: "/t/habille.mp4",
    accroche: "Elle vaut combien ?",
    sousTitres: [
      { texte: "Vous en voulez combien ?", debut: 2, fin: 5 },
      { texte: "Quarante euros.", debut: 5, fin: 8 },
    ],
  });
  const filtre = args[args.indexOf("-vf") + 1];

  it("affiche l'accroche pendant les deux premières secondes", () => {
    expect(filtre).toContain("Elle vaut combien ?");
    // Les virgules internes à between(...) doivent être échappées, sans
    // quoi le découpeur de filtergraph d'ffmpeg les prend pour des
    // séparateurs de filtres et casse la chaîne (« No such filter: '0' »,
    // vérifié le 2026-07-27 sur un ffmpeg réel).
    expect(filtre).toContain("between(t\\,0\\,2)");
  });

  it("affiche chaque sous-titre sur sa fenêtre", () => {
    expect(filtre).toContain("between(t\\,2\\,5)");
    expect(filtre).toContain("between(t\\,5\\,8)");
    expect(filtre).toContain("Quarante euros.");
  });

  it("utilise la police du jeu pour l'accroche", () => {
    expect(filtre).toContain("VerveShadow.ttf");
  });
});

describe("commandeCarteFin", () => {
  const args = commandeCarteFin({
    icone: "/t/icon.png",
    chute: "Valeur réelle : 35 €",
    signature: "Broc — Chaque objet a une histoire.",
    cta: "Bientôt sur l'App Store",
    sortie: "/t/fin.mp4",
  });

  it("dure deux secondes sur fond crème avec une piste silencieuse", () => {
    expect(args.join(" ")).toContain("color=c=0xF5EFE0:s=1080x1920");
    expect(args.join(" ")).toContain("anullsrc");
    expect(args).toContain("2");
  });

  it("écrit la chute échappée, la signature et le CTA", () => {
    const filtre = args[args.indexOf("-filter_complex") + 1];
    expect(filtre).toContain("Valeur réelle \\: 35 €");
    expect(filtre).toContain("Broc — Chaque objet a une histoire.");
    // Apostrophe droite → apostrophe typographique (voir echapperTexte).
    expect(filtre).toContain("Bientôt sur l’App Store");
  });
});

describe("commandeConcat", () => {
  it("passe par le demuxer concat", () => {
    const args = commandeConcat({ liste: "/t/liste.txt", sortie: "/t/final.mp4" });
    expect(args.join(" ")).toContain("-f concat");
    expect(args[args.length - 1]).toBe("/t/final.mp4");
  });
});

describe("commandeSon", () => {
  it("sans musique, applique seulement le fondu de sortie", () => {
    const args = commandeSon({ entree: "/t/h.mp4", musique: null, sortie: "/t/s.mp4", duree: 16 });
    const filtre = args[args.indexOf("-af") + 1];
    expect(filtre).toContain("afade=t=out");
    expect(args).not.toContain("-filter_complex");
  });

  it("avec musique, la mixe en dessous et la boucle sous les deux plans", () => {
    const args = commandeSon({
      entree: "/t/h.mp4",
      musique: "/t/lit.mp3",
      sortie: "/t/s.mp4",
      duree: 16,
    });
    const filtre = args[args.indexOf("-filter_complex") + 1];
    expect(filtre).toContain("volume=0.18");
    expect(filtre).toContain("aloop=loop=-1");
    expect(filtre).toContain("amix=inputs=2");
    expect(filtre).toContain("afade=t=out");
    expect(args[args.indexOf("-i") + 1]).toBe("/t/h.mp4");
  });

  it("recopie l'image sans la ré-encoder", () => {
    const args = commandeSon({ entree: "/t/h.mp4", musique: null, sortie: "/t/s.mp4", duree: 16 });
    expect(args.join(" ")).toContain("-c:v copy");
  });
});
