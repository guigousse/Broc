#!/usr/bin/env bash
# Vérifie qu'un crate compile en cible Android (émulateur x86_64 par défaut) sans
# passer par Gradle. Usage : scripts/android-cargo-check.sh [-p crate] [cible]
#
# L'environnement est celui documenté dans docs/android/2026-08-12-publication-play.md :
# le NDK fournit le compilateur C, l'archiveur et l'éditeur de liens de la cible.
set -euo pipefail
cd "$(dirname "$0")/../src-tauri"

CIBLE="${CIBLE:-x86_64-linux-android}"
NDK="${NDK_HOME:-${ANDROID_HOME:-/usr/local/share/android-commandlinetools}/ndk/27.3.13750724}"
OUTILS="$NDK/toolchains/llvm/prebuilt/darwin-x86_64/bin"
# Le triplet du NDK diffère du triplet Rust pour armv7 uniquement.
TRIPLET_NDK="$CIBLE"
[ "$CIBLE" = "armv7-linux-androideabi" ] && TRIPLET_NDK="armv7a-linux-androideabi"
CIBLE_ENV="$(echo "$CIBLE" | tr '[:lower:]-' '[:upper:]_')"
CIBLE_MIN="$(echo "$CIBLE" | tr '-' '_')"

export "CC_${CIBLE_MIN}=$OUTILS/${TRIPLET_NDK}24-clang"
export "AR_${CIBLE_MIN}=$OUTILS/llvm-ar"
export "CARGO_TARGET_${CIBLE_ENV}_LINKER=$OUTILS/${TRIPLET_NDK}24-clang"
export CARGO_PROFILE_DEV_DEBUG=0

exec cargo check --target "$CIBLE" "$@"
