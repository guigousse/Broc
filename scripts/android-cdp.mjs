#!/usr/bin/env node
// Évalue une expression JS dans la WebView de BROC (build debug) sur l'émulateur.
//
// Usage : node scripts/android-cdp.mjs "document.title"
//         node scripts/android-cdp.mjs --forward          # pose le forward adb et sort
//
// Prérequis : l'app debug tourne. Le forward adb est posé automatiquement si
// `adb` est trouvé (ANDROID_HOME), sinon le faire à la main :
//   PID=$(adb shell pidof com.guigousse.broc.debug | tr -d '\r')
//   adb forward tcp:9222 localabstract:webview_devtools_remote_$PID
// Node ≥ 22 (WebSocket global). C'est ainsi qu'on MESURE au lieu de juger une
// capture (cf. docs/android/2026-08-12-recette-emulateur.md, « Outillage »).
import { execFileSync } from "node:child_process";

const ADB = `${process.env.ANDROID_HOME ?? "/usr/local/share/android-commandlinetools"}/platform-tools/adb`;
const PAQUET = "com.guigousse.broc.debug";

function poserForward() {
  const pid = execFileSync(ADB, ["shell", "pidof", PAQUET]).toString().trim();
  if (!pid) throw new Error(`${PAQUET} ne tourne pas sur l'appareil`);
  execFileSync(ADB, ["forward", "tcp:9222", `localabstract:webview_devtools_remote_${pid}`]);
  return pid;
}

const args = process.argv.slice(2);
if (args[0] === "--forward") {
  console.log(`forward posé (pid ${poserForward()})`);
  process.exit(0);
}
const expression = args[0] ?? "location.href";

try {
  poserForward();
} catch (e) {
  console.error(`(forward adb non posé : ${e.message})`);
}

// ⚠ Le SDK Google Mobile Ads ouvre ses propres WebViews cachées
// (googleads.g.doubleclick.net/mads/…), listées AVANT celle du jeu. Évaluer
// dedans écrit dans le mauvais localStorage, et un `location.reload()` y est
// pris pour un clic sur une pub (Chrome s'ouvre). On ne cible que le jeu.
const pages = await (await fetch("http://localhost:9222/json")).json();
const page = pages.find((p) => p.type === "page" && /^https?:\/\/tauri\.localhost/.test(p.url));
if (!page) throw new Error("Page du jeu introuvable en CDP (tauri.localhost) — le forward adb est-il posé ?");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => {
  ws.onopen = r;
  ws.onerror = j;
});
ws.send(
  JSON.stringify({
    id: 1,
    method: "Runtime.evaluate",
    params: { expression, awaitPromise: true, returnByValue: true },
  }),
);
const msg = await new Promise((r) => (ws.onmessage = (e) => r(JSON.parse(e.data))));
const res = msg.result?.result;
if (msg.result?.exceptionDetails) {
  console.error(JSON.stringify(msg.result.exceptionDetails, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(res?.value ?? res, null, 2));
}
ws.close();
