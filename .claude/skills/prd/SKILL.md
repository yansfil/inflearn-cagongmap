---
name: prd
description: |
  Use when the user asks for a PRD, implementation-ready requirements, or wants
  to turn clarify output into a scoped build document with requirements,
  acceptance criteria, tasks, and verification.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Write
  - Edit
  - AskUserQuestion
---

# prd

Use this skill to write a PRD that an implementation agent can execute.

The PRD is a handoff document. Do not implement code while using this skill.

## Output Location

Save PRD artifacts under `.dev/<topic-slug>/` unless the project has a stronger
local convention or the user asks for a different location.

Default files:

- `.dev/<topic-slug>/prd.md`
- `.dev/<topic-slug>/checklist.md`
- `.dev/<topic-slug>/context-notes.md`

If the topic slug is unclear, choose a short kebab-case slug from the feature
name and state it before writing files.

## Inputs

Prefer one of these inputs:

- A clarify handoff summary.
- A user-provided feature request with enough detail.
- Existing project docs such as `CLAUDE.md`, `AGENTS.md`, `README.md`, specs, or
  adjacent PRDs.

If major ambiguity remains, ask one blocking question or recommend running
`/clarify` first.

## Workflow

1. Explore the codebase as needed before writing - read relevant project
   guidance, code, and config so the PRD is grounded in how the project actually
   works.
2. Define the problem, goal, users, and current scope.
3. Separate scope from non-goals.
4. Note expected technical structure changes at a high level.
5. Write numbered, testable requirements.
6. Write acceptance criteria that can be checked by a person, command, browser,
   API response, database row, or log.
7. Derive tasks from the requirements. Do not invent hidden scope in tasks.
8. Define agent verification and human verification separately.
9. End with an implementation result report contract.

## Required PRD Shape

```md
# PRD: <feature>

## Summary

## Technical Structure And Changes

## Pre-Work

## Problem And Goal

## Users And Use Cases

## Scope

## Non-Goals

## Requirements

## Acceptance Criteria

## Tasks

## Verification - Agent

## Verification - Human

## Risks And Open Decisions

## Implementation Result Report Contract
```

## Rules

- Write the PRD in Korean. Keep the section headings from Required PRD Shape
  as-is, but write all prose, requirements, acceptance criteria, and tasks in
  Korean.
- Requirements must describe observable behavior.
- Acceptance criteria must have a verification path.
- Tasks must trace back to requirements or verification.
- If there is no expected structural change, say so explicitly.
- Keep the PRD implementation-ready, not marketing-oriented.
- Do not expand the MVP because a related idea seems useful.
