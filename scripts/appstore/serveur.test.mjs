import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { demarrerServeur } from "./serveur.mjs";

let racine;
let parent;
let serveur;

beforeAll(async () => {
  parent = await fs.mkdtemp(path.join(os.tmpdir(), "appstore-serveur-parent-"));
  racine = path.join(parent, "racine");
  await fs.mkdir(racine);
  await fs.writeFile(path.join(racine, "index.html"), "<h1>broc</h1>");
  await fs.mkdir(path.join(racine, "sous"));
  await fs.writeFile(path.join(racine, "sous", "index.html"), "<h1>sous</h1>");
  await fs.writeFile(path.join(racine, "a.css"), "body{}");
  // Fichier au-dessus de la racine servie (pour tester la barrière).
  await fs.writeFile(path.join(parent, "secret.txt"), "interdit");
  serveur = await demarrerServeur(racine);
});

afterAll(async () => {
  await serveur.fermer();
  await fs.rm(parent, { recursive: true, force: true });
});

describe("serveur statique de l'export", () => {
  it("sert index.html à la racine", async () => {
    const r = await fetch(serveur.url + "/");
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("broc");
  });

  it("sert l'index d'un sous-dossier (routes de l'export statique)", async () => {
    const r = await fetch(serveur.url + "/sous");
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("sous");
  });

  it("sert un fichier avec le bon type MIME", async () => {
    const r = await fetch(serveur.url + "/a.css");
    expect(r.headers.get("content-type")).toContain("text/css");
  });

  it("répond 404 sur un fichier absent", async () => {
    expect((await fetch(serveur.url + "/nope.js")).status).toBe(404);
  });

  it("refuse de remonter au-dessus de la racine (avec chemin encodé)", async () => {
    // fetch normalise /../ côté client. On utilise node:http brut avec un chemin
    // encodé (%2e = .) que le client ne normalise pas. Le serveur le décode et
    // la barrière le refuse.
    const url = new URL(serveur.url);
    const result = await new Promise((ok) => {
      http.get(
        {
          hostname: url.hostname,
          port: url.port,
          path: "/%2e%2e/secret.txt", // chemin encodé, pas normalisé par le client
        },
        (res) => {
          let body = "";
          res.on("data", (d) => {
            body += d;
          });
          res.on("end", () => {
            ok({ status: res.statusCode, body });
          });
        }
      );
    });
    // Sans la barrière, on aurait 200 avec "interdit". Avec la barrière : 404.
    expect(result.status).toBe(404);
    expect(result.body).toContain("Not found");
  });
});
