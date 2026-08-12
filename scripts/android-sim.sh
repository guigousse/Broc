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
# Prérequis : la toolchain du 2026-08-12 (pas d'Android Studio) —
#   JAVA_HOME=/usr/local/opt/openjdk@17
#   ANDROID_HOME=/usr/local/share/android-commandlinetools
#   NDK_HOME=$ANDROID_HOME/ndk/27.3.13750724
# et un émulateur démarré :
#   $ANDROID_HOME/emulator/emulator -avd broc-pixel6 -no-snapshot -no-boot-anim &
set -euo pipefail

cd "$(dirname "$0")/.."

# Suffixe .debug : bundle.android.debugApplicationIdSuffix dans tauri.conf.json.
# L'activité, elle, garde le package SANS suffixe (elle vient du manifeste généré).
APP_ID="com.guigousse.broc.debug"
ACTIVITE="com.guigousse.broc.MainActivity"

ADB="${ANDROID_HOME:-/usr/local/share/android-commandlinetools}/platform-tools/adb"

if ! "$ADB" devices | grep -q "device$"; then
  echo "❌ Aucun appareil/émulateur détecté. Démarre l'AVD, puis relance :"
  echo "   \$ANDROID_HOME/emulator/emulator -list-avds"
  echo "   \$ANDROID_HOME/emulator/emulator -avd broc-pixel6 -no-snapshot -no-boot-anim &"
  exit 1
fi

# Sans ça, les artefacts Rust de debug pèsent 4 Gi par cible et saturent le
# disque (trois builds tuées par « No space left on device » le 2026-08-12).
# On débogue par la webview et `adb logcat`, pas par un débogueur natif.
export CARGO_PROFILE_DEV_DEBUG=0

echo "▸ Export statique du front…"
npm run build

echo "▸ Build Android (debug, x86_64)…"
npm run tauri android build -- --debug --target x86_64

# Tauri nomme l'APK d'après le découpage d'ABI : une seule cible → « universal ».
APK=$(find src-tauri/gen/android/app/build/outputs/apk -name "*debug*.apk" | head -1)
if [ -z "$APK" ]; then
  echo "❌ APK introuvable sous src-tauri/gen/android/app/build/outputs/apk"
  exit 1
fi

echo "▸ APK : $APK ($(du -h "$APK" | cut -f1))"
"$ADB" install -r "$APK"
"$ADB" shell am start -n "$APP_ID/$ACTIVITE"

echo "✅ Lancé."
echo "   Capture :  $ADB exec-out screencap -p > /tmp/broc-android.png"
echo "   Logs    :  $ADB logcat | grep -iE 'Tauri|broc'"
