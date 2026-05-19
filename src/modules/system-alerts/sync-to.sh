#!/usr/bin/env bash
# Sync the canonical system-alerts module into a consumer project.
# Usage:  ./sync-to.sh ../../apolloone-ucar
set -euo pipefail

DEST="${1:?Usage: sync-to.sh <consumer-project-root>}"
TARGET="$DEST/src/modules/system-alerts"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Syncing system-alerts → $TARGET"
mkdir -p "$TARGET"
rsync -av --delete \
  --exclude='*.sh' \
  --exclude='INTEGRATION.md' \
  "$SCRIPT_DIR/" "$TARGET/"
echo "Done."
