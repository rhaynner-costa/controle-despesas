#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VERSION="$(node -p "require('./package.json').version")"
OUTPUT_APK="controle-despesa-${VERSION}.apk"

echo "Iniciando build do APK para a versão ${VERSION}..."

rm -rf android/app/build/generated/assets/react/release

GRADLE_ARGS=(-p android)

if [[ -n "${GRADLE_USER_HOME:-}" ]]; then
  GRADLE_ARGS+=(--gradle-user-home "$GRADLE_USER_HOME")
elif [[ -d "/Volumes/extFiles/Android/.gradle" ]]; then
  GRADLE_ARGS+=(--gradle-user-home "/Volumes/extFiles/Android/.gradle")
fi

if [[ -n "${JAVA_HOME:-}" ]]; then
  GRADLE_ARGS+=("-Dorg.gradle.java.home=${JAVA_HOME}")
elif [[ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]]; then
  GRADLE_ARGS+=("-Dorg.gradle.java.home=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home")
fi

./android/gradlew "${GRADLE_ARGS[@]}" assembleRelease

cp android/app/build/outputs/apk/release/app-release.apk "./${OUTPUT_APK}"

echo "APK gerado com sucesso: ./${OUTPUT_APK}"
