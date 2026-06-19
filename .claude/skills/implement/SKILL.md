---
name: implement
description: |
  Use when the user asks Claude Code to execute an approved PRD or scoped task.
  Read the requirements, create a live checklist, implement the smallest safe
  changes, and keep acceptance criteria and verification evidence tracked.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Write
  - Edit
  - Task
  - TodoWrite
  - AskUserQuestion
---

# implement

Use this skill to implement an approved PRD or a clearly scoped task end to end.

This is the execution counterpart to `prd`.

`implement` owns the loop that drives a task to done, including fixing. It does
not reimplement verification: it delegates judgment to `verify` as the gate of
its loop (see Final Verification). `verify` stays the single source of truth for
*how* to judge done, and can still be run standalone for an independent audit on
any diff.

## Inputs

When the task came from `prd`, read the artifacts under `.dev/<topic-slug>/`:

- `prd.md` - the contract: scope, non-goals, requirements, acceptance criteria,
  tasks, and the verification plan. The acceptance criteria are the rubric the
  verifier checks against.
- `checklist.md` - the task checklist. Adopt it as the live checklist instead of
  regenerating one.
- `context-notes.md` - project grounding. Read it to avoid re-exploring what
  `prd` already established.

If those artifacts do not exist (the user handed a scoped task, linked spec, or
request directly), fall back to that single source document and build the
checklist from it.

## Readiness Check

Before editing code:

1. Read the inputs above (the `.dev/<slug>/` artifacts, or the single source
   document on the fallback path).
2. Identify scope, non-goals, requirements, acceptance criteria, and
   verification.
3. Check `git status --short`.
4. Read the actual files likely to be touched.
5. Stop and ask if required pre-work, credentials, product decisions, destructive
   data changes, or structural approval are missing.

## Live Checklist

Adopt `checklist.md` as the working checklist when it exists. Otherwise create
one from the source document.

Track:

- requirements
- acceptance criteria
- implementation tasks
- verification commands
- browser or runtime QA scenarios
- human checks

Do not mark a task complete until its acceptance criteria have evidence or a
concrete blocker.

## Implementation Loop

For each task:

1. Re-read the relevant files.
2. Make the smallest change that satisfies the mapped requirement.
3. Avoid unrelated refactors.
4. Preserve user-owned worktree changes.
5. Run the smallest useful check after meaningful edits.
6. Record evidence as you go.

If a new task is needed, add it only when it maps to an approved requirement or
is pure verification/release hygiene. Ask before adding new product scope or
materially changing the approved structure.

## Final Verification

Finish the implementation first. Then, once, delegate the completion verdict to
an independent verifier instead of judging it yourself.

The same context that wrote the change is the worst judge of it. So when the
build is done, spawn a fresh verifier that did not write the code and let it
judge against the acceptance criteria.

1. Spawn one independent verifier subagent with the `Task` tool. Give it:
   - the acceptance criteria from `prd.md` (or the task) as its rubric,
   - the changed scope (`git status --short` / the diff) and relevant files,
   - the evidence you collected while building.
   Instruct it to follow the `verify` skill: judge each acceptance criterion with
   the right verification level, report evidence, and return a per-criterion
   verdict. The verifier is **report-only - it does not modify code**.
2. Read the verdict.
   - All criteria Pass -> done.
   - Any Fail -> fix the concrete gap (file, line, failing case) the verifier
     named, then run the verifier once more to confirm. Stop after that second
     pass; if it still fails, report the remaining gap rather than looping.
   - Blocked -> stop and report the blocker that needs a human or a decision.

Do not claim completion on a verdict you produced yourself, on skipped
verification, or on a weaker target than the criteria asked for. Report the
concrete gap.

## Final Report

```md
## Status

Done | Partially Done | Blocked

## Changed

- ...

## Acceptance Criteria

- AC1: Met | Not Met | Blocked - evidence

## Verification

- Command or scenario:
- Result:

## Human Check

- ...

## Risks

- ...
```
