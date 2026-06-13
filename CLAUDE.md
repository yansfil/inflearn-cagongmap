# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

카공맵 (cagongmap) — a service for finding laptop-work-friendly cafes on a map. Renders seed cafes from `data/cafes.json` as markers on a Kakao Map. Current stage is **map + markers only**; filters, list view, login, and UGC reporting are deferred (see `docs/scope.md`).

## Commands

Package manager is **npm** (`package-lock.json`).

- `npm install` — install dependencies
- `npm run dev` — dev server on **port 3030** (hardcoded via `next dev -p 3030`)
- `npm run build` / `npm start` — production build / serve (also port 3030)

Note: in this environment `npm` may be shell-aliased to `pnpm`. If a `pnpm-lock.yaml` reappears after install, the alias hijacked the command — call the real npm by its absolute path instead.

There is no test suite or configured linter beyond `next lint`.

## Kakao Map key (required to see markers)

The app needs `NEXT_PUBLIC_KAKAO_MAP_KEY` (Kakao JavaScript key) in `.env.local`. Copy `.env.local.example` → `.env.local` and fill it. The Kakao app must register `http://localhost:3030` under Platform > Web, or the SDK fails to load. Without a real key, `app/page.js` short-circuits to a "키가 필요합니다" notice screen instead of the map — this is expected, not a bug.

## Architecture

Next.js 14 App Router. The one non-obvious flow is the **server→client split for the map**:

- `app/page.js` is a **server component**. It reads `data/cafes.json` via `lib/cafes.js` (uses `node:fs`, server-only), checks the Kakao key, and either renders the notice screen or passes `cafes` + `appKey` as props to `KakaoMap`.
- `components/KakaoMap.jsx` is `'use client'`. It dynamically injects the Kakao SDK `<script>` with `autoload=false` then `kakao.maps.load(...)` (loaded once, guarded by a `kakao-map-sdk` script id), creates the map, places one marker per cafe, and wires a single shared `InfoWindow`. Initial view uses `setBounds` over all markers (fallback center ~Jamsil/Songpa).

Data label mapping (`outlet`/`work_fit`/`noise` code → Korean) lives in `KakaoMap.jsx`. Marker detail link points to the cafe's `naver_place_url` — i.e. **map is Kakao, detail link is Naver** by design.

## Data schema caveat

`data/cafes.json` (operator-seeded, ~9 cafes) does **not** match the schema in `docs/scope.md`. scope.md specifies 4-level `outlet`, 3-level `wifi`, and a **카공 허용 (welcome/allowed/tolerated/banned)** field that scope calls the most differentiating asset — but the actual JSON has simplified `outlet` (`many`/`some`), boolean `wifi`, and **no 카공 허용 field**. When extending data or filters, reconcile this gap rather than assuming scope.md reflects reality.
