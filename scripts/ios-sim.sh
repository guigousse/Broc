#!/usr/bin/env bash
# Lance Broc sur un simulateur iOS SANS passer par l'étape "archive" de
# `tauri ios dev` — celle-ci est cassée sur Mac Intel (Tauri force l'arch
# x86_64 du simulateur sur une archive *device* arm64 → ARCHIVE FAILED code 65).
#
# Workflow :
#   1. BUILD (rare, seulement quand le code Rust change) :
#        npm run tauri ios dev "iPhone 16 Pro"
#      → compile le .app simulateur (SUCCÈS) puis échoue sur l'archive
#        (erreur attendue, ignore-la). Le .app est prêt dans DerivedData.
#   2. RUN (fréquent) :
#        ./scripts/ios-sim.sh "iPad Pro 13-inch (M4)"
#      → sert l'export statique out/ sur :3000, installe le dernier .app
#        construit + lance sur le simu choisi.
#
# ⚠ NE PAS servir `next dev` au webview : dans WKWebView les chunks du
#   serveur de dev Next 16/Turbopack ne terminent jamais de charger
#   (0/24, requêtes pendantes sans erreur) → page rendue mais React
#   jamais hydraté, boutons morts. Diagnostiqué le 2026-07-24. Le webview
#   doit recevoir l'export statique (`npm run build` → out/), comme en prod.
#   Après un changement de front : relancer `npm run build` puis ce script.
#
# Usage : ./scripts/ios-sim.sh ["Nom du simulateur"]   (défaut : iPhone 16 Pro)
set -euo pipefail

SIM="${1:-iPhone 16 Pro}"
BUNDLE_ID="com.guigousse.broc"

# Dernier .app simulateur construit (toutes DerivedData confondues).
APP=$(ls -dt "$HOME"/Library/Developer/Xcode/DerivedData/app-*/Build/Products/debug-iphonesimulator/Broc.app 2>/dev/null | head -1 || true)
if [ -z "${APP:-}" ]; then
  echo "❌ Aucun Broc.app simulateur trouvé."
  echo "   Construis-le d'abord :  npm run tauri ios dev \"$SIM\""
  echo "   (l'erreur 'ARCHIVE FAILED' à la fin est normale sur Mac Intel — le .app est quand même produit)"
  exit 1
fi
echo "📦 App : $APP"

# Export statique servi sur :3000 (voir l'avertissement en tête de script).
if [ ! -f out/index.html ]; then
  echo "❌ out/index.html introuvable. Construis l'export d'abord :  npm run build"
  exit 1
fi
if ! curl -s -o /dev/null --max-time 2 http://localhost:3000; then
  echo "▶︎ Serveur statique sur out/ (npx serve)…"
  ( npx serve out -l 3000 > /tmp/serve-out.log 2>&1 & )
  until curl -s -o /dev/null --max-time 2 http://localhost:3000; do sleep 1; done
else
  echo "ℹ︎ Un serveur écoute déjà sur :3000 — vérifie que c'est bien out/ (pas next dev)."
fi
echo "✅ Serveur prêt (localhost:3000)"

# Boot + install + launch.
open -a Simulator || true
xcrun simctl boot "$SIM" 2>/dev/null || true
xcrun simctl bootstatus "$SIM" -b >/dev/null 2>&1 || true
echo "📲 Installation sur « $SIM »…"
xcrun simctl install "$SIM" "$APP"
xcrun simctl launch "$SIM" "$BUNDLE_ID"
echo "🚀 Broc lancé sur « $SIM »."
echo "   Pour une capture :  xcrun simctl io \"$SIM\" screenshot /tmp/broc.png"
