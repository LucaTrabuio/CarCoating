#!/usr/bin/env bash
# PostToolUse hook: when a `git commit` lands, drop any feature-loop
# worktree whose tip is now reachable from the current branch — the
# work is captured outside the worktree and the ~4 GB node_modules
# install is just sitting on disk. Safe by design:
#   • only touches paths matching .claude/worktrees/loop-*
#   • only removes when `git merge-base --is-ancestor` confirms the
#     worktree's HEAD is an ancestor of the current HEAD
#   • silent on no-op so it doesn't spam every commit
set -euo pipefail

INPUT="$(cat 2>/dev/null || true)"
COMMAND="$(printf '%s' "$INPUT" | /usr/bin/jq -r '.tool_input.command // ""' 2>/dev/null || true)"
[[ "$COMMAND" == *"git commit"* ]] || exit 0

REPO="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$REPO" ]] || exit 0
cd "$REPO"

CURRENT="$(git rev-parse HEAD 2>/dev/null || true)"
[[ -n "$CURRENT" ]] || exit 0

REMOVED=()
while IFS=$'\t' read -r WT_PATH WT_SHA; do
  [[ "$WT_PATH" == "$REPO" ]] && continue
  [[ "$WT_PATH" == */.claude/worktrees/loop-* ]] || continue
  [[ -n "$WT_SHA" ]] || continue
  if git merge-base --is-ancestor "$WT_SHA" "$CURRENT" 2>/dev/null; then
    if git worktree remove --force "$WT_PATH" >/dev/null 2>&1; then
      REMOVED+=("$WT_PATH")
    fi
  fi
done < <(
  git worktree list --porcelain | awk '
    /^worktree / { wt = substr($0, 10) }
    /^HEAD /     { sha = substr($0, 6); print wt "\t" sha }
  '
)

if [[ ${#REMOVED[@]} -gt 0 ]]; then
  printf '[claude/cleanup-loop-worktrees] removed %d merged worktree(s):\n' "${#REMOVED[@]}" >&2
  for p in "${REMOVED[@]}"; do printf '  • %s\n' "$p" >&2; done
fi
exit 0
