#!/usr/bin/env bash
set -euo pipefail

REPO="openslaq/openslaq"
CONF="apps/desktop/src-tauri/tauri.conf.json"

# Read version from tauri.conf.json
VERSION=$(grep '"version"' "$CONF" | head -1 | sed 's/.*"version": *"//;s/".*//')
TAG="v${VERSION}"

echo "==> Building OpenSlaq Desktop ${TAG}"

# Require signing key
if [ -z "${TAURI_SIGNING_PRIVATE_KEY:-}" ]; then
  echo "ERROR: TAURI_SIGNING_PRIVATE_KEY env var is required."
  echo "  export TAURI_SIGNING_PRIVATE_KEY=\"\$(cat ~/.tauri/openslaq.key)\""
  echo "  export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=\"your-password\""
  exit 1
fi

# Build
echo "==> Running tauri build..."
cd apps/desktop
bunx @tauri-apps/cli build
cd ../..

# Locate artifacts
BUNDLE_DIR="apps/desktop/src-tauri/target/release/bundle"
DMG=$(find "$BUNDLE_DIR/dmg" -name "*.dmg" | head -1)
APP_TAR=$(find "$BUNDLE_DIR/macos" -name "*.app.tar.gz" | head -1)
APP_SIG="${APP_TAR}.sig"

if [ -z "$DMG" ] || [ -z "$APP_TAR" ] || [ ! -f "$APP_SIG" ]; then
  echo "ERROR: Could not find expected build artifacts."
  echo "  DMG: ${DMG:-not found}"
  echo "  APP_TAR: ${APP_TAR:-not found}"
  echo "  APP_SIG: ${APP_SIG:-not found}"
  exit 1
fi

echo "==> Found artifacts:"
echo "  DMG: $DMG"
echo "  APP_TAR: $APP_TAR"
echo "  APP_SIG: $APP_SIG"

# Read signature
SIGNATURE=$(cat "$APP_SIG")
APP_TAR_FILENAME=$(basename "$APP_TAR")
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Generate latest.json for Tauri updater
cat > latest.json <<EOF
{
  "version": "${VERSION}",
  "pub_date": "${PUB_DATE}",
  "platforms": {
    "darwin-aarch64": {
      "signature": "${SIGNATURE}",
      "url": "https://github.com/${REPO}/releases/download/${TAG}/${APP_TAR_FILENAME}"
    },
    "darwin-x86_64": {
      "signature": "${SIGNATURE}",
      "url": "https://github.com/${REPO}/releases/download/${TAG}/${APP_TAR_FILENAME}"
    }
  }
}
EOF

echo "==> Generated latest.json"

# Create GitHub release and upload artifacts
echo "==> Creating GitHub release ${TAG}..."
gh release create "$TAG" \
  --repo "$REPO" \
  --title "OpenSlaq Desktop ${VERSION}" \
  --notes "Desktop app release ${VERSION}" \
  "$DMG" \
  "$APP_TAR" \
  "$APP_SIG" \
  latest.json

rm -f latest.json

echo "==> Released ${TAG} to https://github.com/${REPO}/releases/tag/${TAG}"
