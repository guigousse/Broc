import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { demarrerServeur } from "./serveur.mjs";

let racine;
let serveur;

beforeAll(async () => {
  racine = await fs.mkdtemp(path.join(os.tmpdir(), "appstore-serveur-"));
  await fs.writeFile(path.join(racine, "index.html"), "<h1>broc</h1>");
  await fs.mkdir(path.join(racine, "sous"));
  await fs.writeFile(path.join(racine, "sous", "index.html"), "<h1>sous</h1>");
  await fs.writeFile(path.join(racine, "a.css"), "body{}");
  serveur = await demarrerServeur(racine);
});

afterAll(async () => {
  await serveur.fermer();
  await fs.rm(racine, { recursive: true, force: true });
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

  it("refuse de remonter au-dessus de la racine", async () => {
    const r = await fetch(serveur.url + "/../../etc/passwd");
    expect([400, 403, 404]).toContain(r.status);
  });
});
