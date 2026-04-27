---
name: feature-loop
description: Run a non-trivial implementation task through the four-agent feedback loop (Planner → Generator → Evaluator/Fixer → Tester) with git-worktree isolation in car-coating. Auto-trigger when the user asks to implement a new feature, build a multi-file change, fix a non-trivial bug, refactor across files, or add a new admin handler / API route / page-builder block / page that touches more than one file. Skip for one-line edits, doc-only changes, typo fixes, rename-only changes, questions about the codebase, and pure exploration. If unsure, ask the user once whether to run through the loop or do it directly.
---

# Feature loop (car-coating)

You are running the four-agent feedback loop for car-coating. Stay
strict — the value of the loop comes from each agent doing only its
job. Do not collapse roles, do not skip agents, do not let the
Generator run tests, do not let the Tester edit code.

## When this skill fires

Auto-trigger conditions (the description above handles matching, but
apply judgement):

- ✅ Multi-file feature ("add X to admin", "implement Y page", "wire up Z")
- ✅ Bug fix that needs e2e or unit verification
- ✅ Refactor touching more than one file with behaviour to preserve
- ✅ New API route, new admin handler, new page-builder block, new
  Zod schema + handler pair
- ❌ One-line edits, typo fixes, rename-only changes
- ❌ Doc-only changes (`*.md`), comment-only changes
- ❌ Pure config / copy edits with no logic change
- ❌ Questions, code reading, planning discussions without commitment

If unsure, ask the user once: **"Run this through the feature loop, or
do it directly?"**

## Steps

### 1. Set up the worktree

Create a worktree under `.claude/worktrees/loop-<timestamp>/` from the
current branch. All four agents operate against this worktree path.

```bash
ts=$(date +%Y%m%d-%H%M%S)
worktree=".claude/worktrees/loop-$ts"
git worktree add "$worktree" HEAD
# Install deps so the Tester can run npm scripts / vitest / playwright
(cd "$worktree" && npm install --prefer-offline --no-audit --no-fund)
```

If the host has Playwright browsers cached they'll be reused
automatically. If `npx playwright test` later reports missing
browsers, surface it to the user and ask whether to run
`npx playwright install` (it's a global state change).

If a worktree from a prior aborted run still exists, ask the user
before reusing or removing it.

Record the **absolute** worktree path. Pass it to every subagent in
their prompt.

### 2. Plan

Call the `planner` subagent. Pass:

- The user's task verbatim
- The absolute worktree path
- A note that the plan must end with a Playwright and/or Vitest test
  plan, and that any new mutating handler must list its security
  guardrails (auth role, Zod schema, sanitizer, escape helpers).

If the Planner returns a `STOP` (architectural / security question),
surface it to the user verbatim and end the skill — do not loop
around it.

### 3. Generate

Call the `generator` subagent. Pass:

- The Planner's full plan
- The absolute worktree path
- (On retry only) the Evaluator's `KICK_BACK` findings or the Tester's
  failure report from the previous iteration

If the Generator returns a `STOP`, surface to user and end.

### 4. Evaluate

Call the `evaluator` subagent. Pass:

- The Planner's plan
- The Generator's report
- The absolute worktree path

Branch on the verdict:

- `APPROVE` → step 5
- `FIXED` → step 5 (Evaluator already patched things)
- `KICK_BACK` → back to step 3 with findings; increment iteration
  counter
- `ESCALATE` → surface to user and end

### 5. Test

Call the `tester` subagent. Pass:

- The absolute worktree path
- (On retry) the previous Tester run's failure signature

Branch on the status:

- `GREEN` → step 6 (loop complete)
- `LINT_FAIL` / `BUILD_FAIL` / `VITEST_FAIL` / `E2E_FAIL` → back to
  step 3 with the failure report; increment iteration counter
- `SETUP_FAIL` → fix the worktree setup (e.g. re-run `npm install`)
  and retry once; if it still fails, escalate

### 6. Loop control

Track across iterations:

- **Same-failure counter.** If the Tester reports the same root-cause
  failure (same file, same error class) for **3 consecutive iterations**,
  STOP and escalate to the user with what was tried, what kept
  breaking, and the current hypothesis.
- **Iteration cap.** Hard stop at **8 total Generator invocations**
  regardless of failure pattern. Escalate.

### 7. Wrap up (on green)

When Tester reports `GREEN` and Evaluator's last verdict was `APPROVE`
or `FIXED`:

1. Show the user a concise summary:
   - What changed (files + one-line per file)
   - Why (one line, from the plan's Goal)
   - Test status (lint ✓ build ✓ vitest ✓ playwright ✓ with counts)
   - Worktree path
2. Do **not** auto-merge the worktree back, and do **not** auto-commit.
   Ask: "Merge this into your branch and commit, leave the worktree
   for review, or discard?"
3. If the user says merge/commit, use the project's commit format
   (see global `CLAUDE.md` § "Commit messages"): subject ≤72 chars,
   imperative; body explains the *why*; bulleted list of concrete
   changes; **no `Co-Authored-By` trailer**.

## Hard rules during the loop

- **Never skip the Evaluator**, even on a small change. The whole
  point is the rule check — and for car-coating, the security
  guardrail check.
- **Never let the Generator run lint / build / tests itself.** That
  is the Tester's role.
- **Never let the Tester edit files.** Findings only.
- **If any agent asks the user a question** (architectural decision,
  security uncertainty, ambiguous requirement, blocking finding),
  STOP the loop and surface the question verbatim. Do not answer for
  the user.
- **Read `CLAUDE.md` and `AGENTS.md` once at the start** so all rule
  references resolve.
- **Never use destructive git operations** on the worktree without
  asking, even to "recover" from a bad iteration.
