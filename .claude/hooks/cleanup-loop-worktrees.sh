#!/usr/bin/env bash
# PostToolUse hook: when a `git commit` lands, drop feature-loop
# worktrees that THIS session created and whose work is now reachable
# from the current branch HEAD.
#
# Safety properties:
#   • only ever touches paths matching .claude/worktrees/loop-*
#   • only removes a worktree when it has a `.claude/.session-owner`
#     file matching the current Claude Code session id — so a
#     concurrent session committing in the same repo cannot delete
#     another session's live worktree
#   • only removes when `git merge-base --is-ancestor` confirms the
#     worktree's HEAD is already an ancestor of the current HEAD (so
#     in-flight work isn't dropped). NOTE: a fresh worktree's HEAD is
#     trivially an ancestor of its base, so the ownership check above
#     is what actually prevents accidental cleanup of new worktrees.
#   • silent on no-op so it doesn't spam every commit
#
# Worktrees with NO .session-owner marker (legacy ones created before
# this hook learned about ownership) are treated as un-owned and left
# alone — clean them up by hand once you're sure they're idle.
set -euo pipefail

INPUT="$(cat 2>/dev/null || true)"

# Only react to `git commit` Bash invocations.
COMMAND="$(printf '%s' "$INPUT" | /usr/bin/jq -r '.tool_input.command // ""' 2>/dev/null || true)"
[[ "$COMMAND" == *"git commit"* ]] || exit 0

# Determine the current session id. Hook stdin is canonical; fall back
# to the env var Claude Code exports into every shell.
SESSION_ID="$(printf '%s' "$INPUT" | /usr/bin/jq -r '.session_id // ""' 2>/dev/null || true)"
[[ -z "$SESSION_ID" ]] && SESSION_ID="${CLAUDE_CODE_SESSION_ID:-}"
if [[ -z "$SESSION_ID" ]]; then
  # Without a session id we cannot safely identify which worktrees
  # this session owns. Bail out — better to leak ~4 GB than to delete
  # a teammate's in-flight work.
  exit 0
fi

REPO="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$REPO" ]] || exit 0
cd "$REPO"

CURRENT="$(git rev-parse HEAD 2>/dev/null || true)"
[[ -n "$CURRENT" ]] || exit 0

REMOVED=()
SKIPPED_FOREIGN=()
SKIPPED_UNOWNED=()

while IFS=$'\t' read -r WT_PATH WT_SHA; do
  [[ "$WT_PATH" == "$REPO" ]] && continue
  [[ "$WT_PATH" == */.claude/worktrees/loop-* ]] || continue
  [[ -n "$WT_SHA" ]] || continue

  OWNER_FILE="$WT_PATH/.claude/.session-owner"
  if [[ ! -f "$OWNER_FILE" ]]; then
    SKIPPED_UNOWNED+=("$WT_PATH")
    continue
  fi
  OWNER="$(tr -d '[:space:]' < "$OWNER_FILE" 2>/dev/null || true)"
  if [[ "$OWNER" != "$SESSION_ID" ]]; then
    SKIPPED_FOREIGN+=("$WT_PATH")
    continue
  fi

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
  printf '[claude/cleanup-loop-worktrees] removed %d merged worktree(s) owned by this session:\n' "${#REMOVED[@]}" >&2
  for p in "${REMOVED[@]}"; do printf '  • %s\n' "$p" >&2; done
fi
# Foreign / unowned cases are deliberately silent on the happy path.
# Uncomment to debug:
#   for p in "${SKIPPED_FOREIGN[@]:-}"; do printf '[claude/cleanup-loop-worktrees] skipped foreign: %s\n' "$p" >&2; done
#   for p in "${SKIPPED_UNOWNED[@]:-}"; do printf '[claude/cleanup-loop-worktrees] skipped unowned: %s\n' "$p" >&2; done

exit 0
