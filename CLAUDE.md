# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

카공맵 (cagongmap) — a service for finding laptop-work-friendly cafes on a map. Renders seed cafes from `data/cafes.json` as markers on a Kakao Map. Current stage is **map + markers only**; filters, list view, login, and UGC reporting are deferred (see `docs/scope.md`).

## Repository layout convention

`docs/` is for **documentation only** (Markdown: scope, specs, notes). Do **not** put executable artifacts there — SQL migrations belong in `supabase/migrations/`, seed/runtime data in `data/`. (Historically `schema.sql`/`seed.sql` lived in `docs/`; they've since moved to `supabase/migrations/`.)

## Commands

Package manager is **npm** (`package-lock.json`).

- `npm install` — install dependencies
- `npm run dev` — dev server on **port 3030** (hardcoded via `next dev -p 3030`)
- `npm run build` / `npm start` — production build / serve (also port 3030)

Note: in this environment `npm` may be shell-aliased to `pnpm`. If a `pnpm-lock.yaml` reappears after install, the alias hijacked the command — call the real npm by its absolute path instead.

There is no test suite or configured linter beyond `next lint`.

## Database (Supabase)

A Supabase Postgres project backs the data layer. The `places` table (verified live cafes) is seeded from `data/cafes.json`.

- **Migrations live in `supabase/migrations/`** — one `.sql` per migration, named `<version>_<snake_case>.sql`. File version prefixes are matched to what's actually applied on the remote (via `list_migrations`), so the CLI treats local and remote as the same state.
- Current migrations: `…_create_places_schema.sql` (enums, `places` table, indexes, `updated_at` trigger, public-read RLS) and `…_seed_places.sql` (the 9 cafes).
- The JSON→table mapping is non-obvious: `wifi: true → 'yes'`, and there is **no 카공 허용 column** (only laptop-friendly cafes are seeded, so every row would be true — see the Data schema caveat below).
- When changing schema, add a **new** migration file rather than editing an applied one; keep `supabase/migrations/` as the single source of truth for DB state. Do not hand-write the file under `docs/`.

## Kakao Map key (required to see markers)

The app needs `NEXT_PUBLIC_KAKAO_MAP_KEY` (Kakao JavaScript key) in `.env.local`. Copy `.env.local.example` → `.env.local` and fill it. The Kakao app must register `http://localhost:3030` under Platform > Web, or the SDK fails to load. Without a real key, `app/page.js` short-circuits to a "키가 필요합니다" notice screen instead of the map — this is expected, not a bug.

## Architecture

Next.js 14 App Router. The one non-obvious flow is the **server→client split for the map**:

- `app/page.js` is a **server component**. It reads `data/cafes.json` via `lib/cafes.js` (uses `node:fs`, server-only), checks the Kakao key, and either renders the notice screen or passes `cafes` + `appKey` as props to `KakaoMap`.
- `components/KakaoMap.jsx` is `'use client'`. It dynamically injects the Kakao SDK `<script>` with `autoload=false` then `kakao.maps.load(...)` (loaded once, guarded by a `kakao-map-sdk` script id), creates the map, places one marker per cafe, and wires a single shared `InfoWindow`. Initial view uses `setBounds` over all markers (fallback center ~Jamsil/Songpa).

Data label mapping (`outlet`/`work_fit`/`noise` code → Korean) lives in `KakaoMap.jsx`. Marker detail link points to the cafe's `naver_place_url` — i.e. **map is Kakao, detail link is Naver** by design.

## Data schema caveat

`data/cafes.json` (operator-seeded, ~9 cafes) does **not** match the schema in `docs/scope.md`. scope.md specifies 4-level `outlet`, 3-level `wifi`, and a **카공 허용 (welcome/allowed/tolerated/banned)** field that scope calls the most differentiating asset — but the actual JSON has simplified `outlet` (`many`/`some`), boolean `wifi`, and **no 카공 허용 field**. When extending data or filters, reconcile this gap rather than assuming scope.md reflects reality.

## Design work

Before changing any UI or CSS, **read `DESIGN.md` first**.

- DESIGN.md's color, spacing, component, and tone (말투) standards take precedence.
- If a change requires conflicting with those standards, **explain the reason first** before making it.
