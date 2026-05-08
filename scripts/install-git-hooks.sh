#!/usr/bin/env bash
# Install car-coating's git hooks into .git/hooks. Idempotent: safe to
# re-run after pulling. We symlink so updates to scripts/git-hooks/*
# are picked up automatically.
set -euo pipefail

REPO="$(git rev-parse --show-toplevel)"
SRC="$REPO/scripts/git-hooks"
DST="$REPO/.git/hooks"

if [[ ! -d "$SRC" ]]; then
  echo "[install-git-hooks] $SRC missing — nothing to install." >&2
  exit 1
fi

mkdir -p "$DST"
installed=0
for hook in "$SRC"/*; do
  [[ -f "$hook" ]] || continue
  name="$(basename "$hook")"
  target="$DST/$name"
  # Replace existing symlink/file pointing here.
  rm -f "$target"
  ln -s "$hook" "$target"
  chmod +x "$hook"
  installed=$((installed+1))
  echo "  → installed $name"
done

echo "[install-git-hooks] linked $installed hook(s) from scripts/git-hooks/ into .git/hooks/."
echo "[install-git-hooks] override on a single commit with: git commit --no-verify"
