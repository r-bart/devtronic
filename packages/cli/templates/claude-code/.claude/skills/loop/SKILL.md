---
name: loop
description: Orchestrates the autonomous convergence loop from loop.manifest.yaml — humans sign the DoD and the ship, the machine converges the middle under gates. Claude Code only.
allowed-tools: Workflow, Task, Read, Write, Bash, Glob, Grep, AskUserQuestion
argument-hint: "[feature|--resume]"
---

# Loop — Autonomous Convergence Harness

Drive `$ARGUMENTS` to done by reading `loop.manifest.yaml` and running the human/machine
**barbell**: humans sign the two ends (the DoD up front, the ship at the back); the machine
converges everything in between under gates that never tire.

This skill is the **orchestration** layer. Policy lives in the manifest; deterministic
mechanism (validate, dry-run, ownership signal, gate command) lives in `devtronic loop`.
Do not re-implement those here — call the CLI.

## When to Use

- A spec is signed and its DoD exists as tests (`/generate-tests` has run).
- You want the middle loop (implement → converge) to run without a human per turn.

**Skip for:** quick one-file changes (`/quick`), or when no `loop.manifest.yaml` exists
(the loop is inert by design — run `devtronic init` or author a manifest first).

---

## The two contracts it consumes

| Contract | Set by | Says |
|----------|--------|------|
| **DoD** (per feature) | `/generate-tests` → `dod.as_tests` | *done* |
| **Standards** (per repo) | `/calibrate` → gate lists | *…and done to our bar* |

The machine is only as good as its gates. If the standards contract is thin, expect a
lower quality floor — that is a manifest problem, not a loop problem.

---

## Procedure

```
-1. PREFLIGHT    resolve the devtronic CLI (this loop shells out to it)
0. VALIDATE      devtronic loop --validate   (abort on failure)
1. PREVIEW       devtronic loop --dry-run    (show the plan; confirm in HITL)
2. CLEAN TREE    refuse to take ownership over uncommitted human WIP (FR-7)
3. PER PHASE     owner:human  → AskUserQuestion (STOP)
                 owner:machine → own tree, converge, release
4. TRACE         append every iteration to thoughts/loop/<feature>.trace.md
5. RELEASE       clear ownership on exit / completion / error / abort
```

### Step -1 — Preflight (resolve the CLI)

Every step below shells out to `devtronic loop …`, so first resolve how to invoke it:

```bash
if command -v devtronic >/dev/null 2>&1; then DT="devtronic";
elif command -v npx >/dev/null 2>&1; then DT="npx --no-install devtronic";
else echo "install the CLI: npm i -g devtronic"; fi
```

Use `$DT` (i.e. `devtronic` or `npx --no-install devtronic`) for every command in this
skill. If neither resolves, **stop and tell the human** to install it (`npm i -g devtronic`)
— the loop cannot run without the CLI. (Installing devtronic as a dev dependency also works;
`npx --no-install` will find it in `node_modules/.bin`.)

### Step 0 — Validate

```bash
devtronic loop --validate
```
Non-zero exit → print the reported problems and **stop**. Never run against an invalid
manifest.

### Step 1 — Preview

```bash
devtronic loop --dry-run
```
Show the phase/gate/budget plan. In HITL mode, confirm with the human before proceeding.
In AFK mode, log it and continue.

### Step 2 — Clean-tree guard (FR-7)

Before the **first `owner:machine` phase** takes ownership:

```bash
git status --porcelain
```
Non-empty → **refuse to start**. Tell the human to commit or stash their WIP, then re-run.
The loop must never converge on top of uncommitted human work. (This is a hard guard hit
live during this harness's own development — respect it.)

### Step 3 — Per phase, branch on owner

Read the phases in order from the manifest (the dry-run shows them).

**`owner: human` → STOP.** Use `AskUserQuestion` to get the signature this phase needs
(sign the DoD, or QA + approve the ship). Do not auto-approve:
- **HITL:** ask and wait.
- **AFK:** by default, **hard-stop and notify** — auto-approving the DoD or ship signature
  defeats the barbell. Only skip if the manifest explicitly opts in.

**`owner: machine` → converge.** Take ownership, run the middle loop, release:

```bash
devtronic loop --own <phase> --owner machine        # write sentinel (heartbeat)
```

Then loop until the phase exits or the budget is exhausted:

```
repeat (bounded by budget.max_iterations):
  refresh ownership heartbeat:  devtronic loop --own <phase> --owner machine
  make progress toward the phase exit condition
  run Tier ① (every iteration, fail-fast):
      GATE=$(devtronic loop --gate-cmd) || { escalate: manifest problem, do NOT treat as pass }
      [ -n "$GATE" ] || { escalate: no gate command resolved, do NOT treat as pass }
      eval "$GATE"                            # objective gates — must be green
      any non-zero (gate failure OR empty/failed gate-cmd) → analyze, fix, next iteration
      # never let an empty gate-cmd fail open: `eval ""` returns 0, which would
      # silently count as "gates passed". Guard it like stop-guard.sh does.
  if exit condition met → break
```

**Barrier before advancing.** At the phase boundary, mark the barrier so the ambient Stop
gate enforces Tier ① green (the loop no longer holds the stop condition here):

```bash
devtronic loop --own <phase> --owner machine --at-barrier
```
Run Tier ① once more; it must be green to cross.

**Tier ② (subjective) at the barrier — adversarial fan-out.** For each subjective gate,
spawn multiple independent reviewers via `Task`/`Workflow`, each prompted to **refute** the
work (not bless it). Majority-refute → the finding stands → drop back into the middle loop
to fix. Diverse lenses beat repetition: correctness, security, architecture boundaries.

**Budget & escalation.** Bound the middle loop by `budget.max_iterations`. On exhaustion,
follow `budget.on_exhausted` (default `replan-then-human`): re-plan once; if still not
converged, **escalate to the human** — do not spin.

### Step 4 — Trace (FR-8)

Append a human-readable entry to `thoughts/loop/<feature>.trace.md` **every iteration**:
timestamp, phase, iteration N, gates run + verdicts, Tier ② refutations, escalations. This
is what the human reads at the ship gate — QA should be *confirm*, not *reverse-engineer the
diff*. Without the trace the barbell's right end is blind.

### Step 5 — Release

On phase exit, completion, error, **or** abort, relinquish ownership so the ambient hooks
guard the human again:

```bash
devtronic loop --release
```
If anything throws or you bail out, still release (or the returning human is stuck behind a
Stop gate that never guards — the crash-lifecycle sweep will eventually reclaim it, but
release explicitly).

---

## Backlog mode — the loop of loops (`/loop --backlog`)

Drive a **whole backlog** of ready features unattended: converge each in its own worktree,
park it for your ship-signature, advance the next. Same barbell, at queue scale — you sign
each item's DoD (up front, batched) and each item's ship (as it converges); the machine
automates the orchestration in between.

**Eligibility (front-loaded).** Only *ready* items run: those whose `/backlog` entry points
at a signed spec **and** a DoD test manifest (`- Spec:` / `- DoD:` bullets). Prep those in a
batch first (`/spec` + `/generate-tests`) — the loop never runs `/spec` mid-run.

**The deterministic spine is the CLI; this skill only sequences it.** Never hand-manage
worktrees, ledger state, or budget in prose — call `devtronic loop --backlog …`.

```
0. PREVIEW     devtronic loop --backlog --dry-run     (eligible order + caps)
1. LOOP        while items remain:
     id=$(devtronic loop --backlog --next)            (next eligible; empty → done)
     [ -n "$id" ] || break
     devtronic loop --backlog --take "$id" --spent <Δtokens> --width <n> --budget <n>
       ├─ exit 0  → took it (worktree + sentinel created)
       ├─ exit 3  → AT CAPACITY (width/budget) — do NOT error; wait, drain a sign, retry
       └─ exit 1  → real error (not ready / unsafe id)
     run the inner loop for this item IN ITS WORKTREE (.loop-worktrees/<id>):
        cd .loop-worktrees/<id> && <inner /loop for the item's spec/DoD>
     on convergence:  devtronic loop --backlog --park "$id" --spent <Δtokens>
     on non-converge: devtronic loop --backlog --quarantine "$id"   (fail-soft; continue)
2. DRAIN       report the parked queue; the human signs out of session (below)
```

**Bounds (FR-7) are enforced by the CLI, not by trust.** `--take` itself refuses (exit 3)
when the width cap (default 3 in-flight) or the token budget is reached — so even a buggy
orchestrator can't spawn unbounded worktrees or spend. Treat exit 3 as back-pressure: stop
launching, let in-flight items finish (or drain a human sign), then retry. Pass the run's
`--width`/`--budget` and report incremental `--spent` (Δ tokens since the last call, via
`Workflow.budget.spent()`); the ledger accumulates them.

**Park-ahead, never block.** After `--park`, advance to the next item — do not wait for the
human. Parked items accumulate (up to the width cap) as a sign-queue.

**Fail-soft (FR-8).** A non-converging item is `--quarantine`d (worktree kept, reported) and
the loop continues with the rest. One bad item never halts the backlog.

**The human drains out of session (FR-9) — never auto-sign:**
```
devtronic loop --backlog --status            # the parked sign-queue + done/quarantined
devtronic loop --backlog --sign <item>       # QA the item's worktree, then ship + release
devtronic loop --backlog --abort             # quarantine all in-flight, release worktrees
```

> Add `.loop-worktrees/` to `.gitignore` — it holds transient per-item worktrees.

## `--resume`

`/loop --resume` continues an interrupted run:
1. Read the ownership signal (`.claude/.loop-owner`) and the last checkpoint (`thoughts/`).
2. Read the tail of `thoughts/loop/<feature>.trace.md` for where it stopped.
3. Re-validate the manifest, then re-enter the phase loop at the recorded phase.

---

## Coexistence with the ambient hooks

The `Stop` hook subordinates to this loop **only** while an `owner:machine` phase is in
flight and not at a barrier — that is the sentinel's whole job. You do not disable hooks;
you own the tree for a while and then hand it back. With no manifest and no active loop, the
hooks behave exactly as they always have.

## Guardrails

- **Never** auto-sign the DoD or the ship (human ends of the barbell).
- **Never** start on a dirty tree (Step 2).
- **Always** release ownership when done or on error (Step 5).
- The manifest is the single source of truth for gates — don't re-guess them here.
- Known open holes until Phase 4 (LFD): the same machine writes and optimizes the DoD
  tests (Goodhart), and AFK token/$ cost is unbounded. The human ship sign-off is the
  current backstop — respect it.
