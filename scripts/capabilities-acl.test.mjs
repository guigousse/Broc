import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Filet contre l'oubli d'ACL — la panne la plus silencieuse de ce dépôt.
 *
 * L'ACL de Tauri v2 est DENY-BY-DEFAULT : une commande qu'aucune capability
 * n'active est rejetée avant même d'atteindre le Rust. Enregistrer un plugin
 * dans `src-tauri/src/lib.rs` ne suffit donc pas ; il faut aussi lui accorder
 * ses permissions dans `src-tauri/capabilities/default.json`. Rien ne le
 * signale : `cargo check`, `npm run build` et la suite vitest passent tous, et
 * la panne n'apparaît que sur appareil.
 *
 * C'est arrivé DEUX fois :
 *  - `c71c45e1 fix(haptique): accorder la permission ACL, sans quoi rien ne
 *    vibrait` ;
 *  - le plugin `stockage` (chantier « sauvegarde durable »), dont l'absence de
 *    `stockage:default` aurait livré un jeu qui ne sauvegarde NULLE PART.
 *
 * Ce test relie les deux fichiers pour qu'il n'y ait pas de troisième fois.
 */

const RACINE = process.cwd();
const LIB_RS = path.join(RACINE, "src-tauri", "src", "lib.rs");
const CAPABILITIES = path.join(
  RACINE,
  "src-tauri",
  "capabilities",
  "default.json",
);

/**
 * Les plugins enregistrés par `.plugin(tauri_plugin_X::init())`. Le nom de
 * crate `tauri_plugin_x_y` correspond à l'identifiant d'ACL `x-y`.
 */
function pluginsEnregistres() {
  const source = readFileSync(LIB_RS, "utf8");
  const noms = new Set();
  for (const m of source.matchAll(/tauri_plugin_([a-z0-9_]+)\s*::\s*init\s*\(/g)) {
    noms.add(m[1].replaceAll("_", "-"));
  }
  return [...noms].sort();
}

/** Les préfixes de plugin réellement autorisés (`stockage:default` → `stockage`). */
function pluginsAutorises() {
  const capa = JSON.parse(readFileSync(CAPABILITIES, "utf8"));
  return new Set(
    (capa.permissions ?? []).map((p) => String(p).split(":")[0]),
  );
}

describe("ACL Tauri : capabilities contre plugins enregistrés", () => {
  it("trouve bien des plugins dans lib.rs (garde contre un motif qui ne matche plus rien)", () => {
    expect(pluginsEnregistres().length).toBeGreaterThan(0);
  });

  it("chaque plugin enregistré dans lib.rs a une permission dans default.json", () => {
    const autorises = pluginsAutorises();
    const sansAcl = pluginsEnregistres().filter((n) => !autorises.has(n));
    expect(
      sansAcl,
      `Plugins enregistrés sans aucune permission ACL : ${sansAcl.join(", ")}. ` +
        "L'ACL de Tauri v2 est deny-by-default — leurs commandes seront rejetées " +
        "sur appareil, en silence. Ajouter « <plugin>:default » (ou la permission " +
        "fine voulue) dans src-tauri/capabilities/default.json.",
    ).toEqual([]);
  });
});
