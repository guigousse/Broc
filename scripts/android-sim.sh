#!/usr/bin/env bash
# Build + installation + lancement de BROC sur un émulateur Android.
#
# Jumeau de scripts/ios-sim.sh. On sert l'export statique (out/), jamais
# `next dev` : le serveur de dev est inutilisable en webview mobile (chunks
# Turbopack qui ne terminent jamais de charger → React jamais hydraté,
# diagnostiqué le 2026-07-24 sur WKWebView, même piège attendu ici).
# Après un changement de front : relancer ce script (il rebuild l'export).
#
# Usage : ./scripts/android-sim.sh
# Prérequis : un émulateur démarré (Android Studio → Device Manager),
#             $ANDROID_HOME et $NDK_HOME définis.
set -euo pipefail

cd "$(dirname "$0")/.."

# Suffixe .debug : bundle.android.debugApplicationIdSuffix dans tauri.conf.json.
APP_ID="com.guigousse.broc.debug"

if ! adb devices | grep -q "device$"; then
  echo "❌ Aucun appareil/émulateur détecté. Démarre un AVD, puis relance."
  echo "   emulator -list-avds        # pour voir les AVD disponibles"
  echo "   emulator -avd <nom> &      # pour en démarrer un"
  exit 1
fi

echo "▸ Export statique du front…"
npm run build

echo "▸ Build Android (debug, x86_64)…"
npm run tauri android build -- --debug --target x86_64

APK=$(find src-tauri/gen/android/app/build/outputs/apk -name "*x86_64*debug*.apk" | head -1)
if [ -z "$APK" ]; then
  echo "❌ APK introuvable sous src-tauri/gen/android/app/build/outputs/apk"
  exit 1
fi

echo "▸ APK : $APK ($(du -h "$APK" | cut -f1))"
adb install -r "$APK"
adb shell am start -n "$APP_ID/.MainActivity"

echo "✅ Lancé."
echo "   Capture :  adb exec-out screencap -p > /tmp/broc-android.png"
echo "   Logs    :  adb logcat | grep -i broc"
