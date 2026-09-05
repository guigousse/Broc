import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Garde de non-régression sur le plugin notification VENDORÉ (Android).
 *
 * Le défaut, trouvé le 2026-09-06 sur émulateur et toujours présent en amont
 * (tauri-apps/plugins-workspace, branche v2) : `requestPermissions` ne répond
 * PAS quand la permission est déjà accordée sur Android 13+. La branche `if`
 * n'est pas prise, aucun `invoke.resolve` ni `invoke.reject` n'est émis, et la
 * commande reste en suspens pour toujours.
 *
 * Conséquence, mesurée : `run_mobile_plugin` côté Rust attend la réponse par un
 * `recv()` BLOQUANT. Chaque appel immobilise donc un worker tokio
 * définitivement. Au bout de N appels — N = nombre de cœurs, 4 sur l'AVD —
 * plus AUCUNE commande asynchrone du jeu ne répond : ni les pubs, ni la
 * sauvegarde durable, et le chargement reste figé sur « Ouverture du local… ».
 *
 * Ce test lit le source Kotlin parce qu'il n'y a pas de harnais de test JVM
 * dans ce dépôt. Il ne prouve pas le comportement — la preuve est la recette
 * sur appareil — mais il empêche le défaut de revenir silencieusement le jour
 * où le plugin vendoré sera resynchronisé avec l'amont.
 */
const CHEMIN =
  "src-tauri/vendor/tauri-plugin-notification/android/src/main/java/NotificationPlugin.kt";

describe("plugin notification Android — requestPermissions répond toujours", () => {
  const source = readFileSync(CHEMIN, "utf8");
  const corps = source.match(
    /override fun requestPermissions\(invoke: Invoke\) \{([\s\S]*?)\n {2}\}/,
  )?.[1];

  it("la commande existe et a été trouvée dans le source", () => {
    expect(corps, `requestPermissions introuvable dans ${CHEMIN}`).toBeDefined();
  });

  it("répond quand la permission est déjà accordée (Android 13+)", () => {
    // Le `if (… !== GRANTED) { demander }` doit avoir un `else` qui répond,
    // sans quoi la promesse ne se règle jamais et un worker Rust est perdu.
    expect(
      corps,
      "chemin « permission déjà accordée » sans réponse : un worker Rust serait bloqué à vie",
    ).toMatch(
      /!==\s*PermissionState\.GRANTED\)\s*\{[\s\S]*?\}\s*else\s*\{[\s\S]*?(permissionState\(invoke\)|invoke\.resolve)/,
    );
  });

  it("répond aussi sous Android 12 et antérieurs", () => {
    expect(corps).toMatch(/TIRAMISU\)\s*\{\s*permissionState\(invoke\)/);
  });
});
