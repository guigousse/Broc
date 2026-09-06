#!/usr/bin/env node
// Injecte une sauvegarde dans le localStorage de BROC (build debug) sur
// l'émulateur, via CDP, puis recharge la page. Le fichier de la save est le
// JSON d'un slot (cf. scripts/gen-save-demo.ts) ; `--energie N` surcharge
// l'énergie pour recetter la machine (une jauge pleine ne propose pas de pub).
//
// Usage : node scripts/android-inject-save.mjs chemin/save.json [--energie 2] [--slot 1]
//
// Pourquoi localStorage : sur Android, le fichier durable (tauri-plugin-stockage)
// n'est qu'une copie ; le jeu LIT localStorage au démarrage
// (docs/android/2026-08-12-publication-play.md, recette du 2026-08-26).
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ADB = `${process.env.ANDROID_HOME ?? "/usr/local/share/android-commandlinetools"}/platform-tools/adb`;
const PAQUET = "com.guigousse.broc.debug";

const args = process.argv.slice(2);
const chemin = args.find((a) => !a.startsWith("--"));
if (!chemin) {
  console.error("usage : android-inject-save.mjs save.json [--energie N] [--slot N]");
  process.exit(2);
}
const opt = (nom, defaut) => {
  const i = args.indexOf(`--${nom}`);
  return i !== -1 ? args[i + 1] : defaut;
};
const slot = Number(opt("slot", "1"));
const save = JSON.parse(readFileSync(chemin, "utf8"));
const energie = opt("energie", null);
if (energie !== null) save.energie = Number(energie);
save.energieDerniereMaj = Date.now();

// La copie durable (tauri-plugin-stockage, à la RACINE du conteneur) est
// relue au démarrage et l'emporte sur un localStorage plus ancien : sans
// l'effacer, la partie injectée est écrasée par la précédente (constaté le
// 2026-09-05, énergie revenue à 5/5). `run-as` suffit sur une build debug.
try {
  execFileSync(ADB, ["shell", "run-as", PAQUET, "rm", "-f", `slot-${slot}.json`, "slots.json"]);
} catch (e) {
  console.error(`(copie durable non effacée : ${e.message})`);
}

const pid = execFileSync(ADB, ["shell", "pidof", PAQUET]).toString().trim();
if (!pid) throw new Error(`${PAQUET} ne tourne pas`);
execFileSync(ADB, ["forward", "tcp:9222", `localabstract:webview_devtools_remote_${pid}`]);

// ⚠ Ne cibler QUE la page du jeu : le SDK pub expose ses WebViews cachées
// avant elle (cf. android-cdp.mjs).
const pages = await (await fetch("http://localhost:9222/json")).json();
const page = pages.find((p) => p.type === "page" && /^https?:\/\/tauri\.localhost/.test(p.url));
if (!page) throw new Error("Page du jeu introuvable en CDP (tauri.localhost)");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => {
  ws.onopen = r;
  ws.onerror = j;
});

const index = {
  actif: slot,
  slots: {
    1: null,
    2: null,
    3: null,
    [slot]: { nom: "Recette AdMob", derniereSession: Date.now() },
  },
};
const expression = `(() => {
  const s = ${JSON.stringify(JSON.stringify(save))};
  localStorage.setItem('projet-broc:slot:${slot}:v1', s);
  localStorage.setItem('projet-broc:slot:${slot}:v1:backup', s);
  localStorage.setItem('projet-broc:slots:v1', ${JSON.stringify(JSON.stringify(index))});
  // Par le MENU, pas location.reload() : un rechargement à froid sur /bureau
  // reste figé sur « Ouverture du local… » (recette du 2026-09-05).
  setTimeout(() => location.replace('/'), 100);
  return 'save injectée (' + s.length + ' o), retour au menu';
})()`;
ws.send(
  JSON.stringify({
    id: 1,
    method: "Runtime.evaluate",
    params: { expression, returnByValue: true },
  }),
);
const msg = await new Promise((r) => (ws.onmessage = (e) => r(JSON.parse(e.data))));
console.log(msg.result?.result?.value ?? JSON.stringify(msg));
ws.close();
