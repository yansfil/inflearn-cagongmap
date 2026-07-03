# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

카공맵 (cagongmap) — a service for finding laptop-work-friendly cafes on a map. Renders seed cafes from `data/cafes.json` as markers on a Kakao Map. Current stage is **map + markers only**; filters, list view, login, and UGC reporting are deferred (see `docs/scope.md`).

## Communication

이 저장소에서 사용자와 질의응답할 때는 **반드시 한국어로 답한다**.
사용자가 명시적으로 영어 답변을 요청하지 않는 한, 설명, 진행 상황 공유, 오류 보고, 최종 답변 모두 한국어로 작성한다.
기술 용어와 코드 식별자는 원문을 유지해도 되지만, 판단과 설명은 한국어로 분명하고 직접적으로 말한다.

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

### RLS (Row Level Security)

When creating any table that holds **per-user data**, follow these rules:

- **RLS is on by default.** Every user-data table starts with `alter table ... enable row level security;`. Do not ship a user-data table with RLS off.
- **Ownership is `auth.uid() = user_id`.** If the table has a `user_id` column, policies must restrict access to the owner's own rows via `auth.uid() = user_id`.
- **Design all four policies up front.** When adding a new table, write the `SELECT` / `INSERT` / `UPDATE` / `DELETE` policies it needs together in the same migration — don't add RLS-enable now and policies later.
  - `SELECT` / `DELETE`: `using (auth.uid() = user_id)`.
  - `INSERT`: `with check (auth.uid() = user_id)`.
  - `UPDATE`: review **both** `using` and `with check` — `using` controls which rows can be updated, `with check` controls what the row may become. Default to `auth.uid() = user_id` for both so a user can neither edit others' rows nor reassign ownership away from themselves.
- **RLS-enable and policies go in the same migration.** Before considering a migration done, verify it contains both the `enable row level security` statement *and* the policy SQL for that table. A migration with the table + RLS enabled but no policies (which silently denies all access) is a bug.

```sql
-- template for a per-user table
alter table public.my_table enable row level security;

create policy "select own" on public.my_table
  for select using (auth.uid() = user_id);
create policy "insert own" on public.my_table
  for insert with check (auth.uid() = user_id);
create policy "update own" on public.my_table
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.my_table
  for delete using (auth.uid() = user_id);
```

## Auth (@supabase/ssr, Kakao code flow)

Login uses **`@supabase/ssr` cookie sessions** with Kakao OAuth **code flow** (not the old implicit/localStorage flow).

- Any `signInWithOAuth` call must set `redirectTo` to `${window.location.origin}/auth/callback?next=<path>`. Returning straight to `origin` leaves the PKCE `?code=` unexchanged and **login silently fails** (this exact miss broke `LoginPrompt.tsx` once). The code exchange lives only in `app/auth/callback/route.ts`.
- Browser client: `lib/supabaseBrowser.ts` (`createBrowserClient`). Server client: `lib/supabaseServer.ts` (`createServerClient`, `server-only`); read the user with `getSupabaseServer()` → `auth.getUser()`.
- `middleware.ts` refreshes the session on each request, but its matcher **excludes `/auth/callback`** so the callback route stays the sole cookie authority for the code exchange.

## Admin console (/admin)

- Access is restricted to `ADMIN_EMAILS` (server-only env, comma-separated). `SUPABASE_SERVICE_ROLE_KEY` is server-only and lives **only** in `lib/supabaseAdmin.ts` (`import "server-only"`).
- Every admin data access - Server Action mutations **and** service_role reads (`lib/adminData.ts`, `lib/adminReports.ts`) - must call `requireAdmin()` at its start. The `/admin` layout guard is defense-in-depth, not the sole gate: the guard travels with the service_role capability, not the route.
- Admin write access is enforced in **server code, not by adding RLS policies**. RLS stays as designed; client code never writes to `places`/제보 tables directly (all mutations go through Server Actions in `app/admin/actions.ts`).

## Logging (관측 로그)

주요 로직에는 서버 구조화 로그를 남긴다. 로거는 **`lib/logger.ts`** (`import "server-only"`, `logger.{debug,info,warn,error}(event, ctx)`)이며 한 줄 JSON 을 출력한다.

- **무엇에 남기나.** 관측이 필요한 주요 흐름: 데이터 **저장·수정·삭제**(장소/제보/수정요청 mutation), **로그인**(OAuth 콜백의 code 교환 성공/실패), **외부 API 호출**(Supabase DB·Storage·Auth admin API 등 네트워크 경계를 넘는 호출). 단순 화면 렌더나 순수 계산에는 남기지 않는다.
- **서버에서 남긴다.** 클라이언트 콘솔 로그는 로그 수집기로 가지 않으므로 관측 대상이 될 수 없다. 관측이 필요한 이벤트는 **반드시 서버**(Server Action / route handler / 서버 컴포넌트)에서 `logger` 로 남긴다. 사용자 제보 insert 처럼 현재 브라우저에서 직접 Supabase 를 호출하는 흐름은, 관측이 필요해지면 Server Action 으로 옮겨 서버에서 로그를 남긴다. 클라이언트의 `console.error` 는 UI 디버깅용으로만 두고 관측 근거로 삼지 않는다.
- **구조화해서 남긴다.** 각 로그는 다음을 필드로 갖는다: **시간**(`time`, 로거가 자동), **흐름**(`event`, 점 표기 예: `admin.place.create`, `auth.callback`), **추적값**(`request_id`, 행위 주체 `user_id` — 있을 때만), **결과**(`outcome: "ok" | "fail"` 등), 그리고 `duration_ms` 같은 부가 필드. 하나의 요청 흐름은 같은 `request_id` 로 이어붙인다(`newRequestId()`).
- **레벨을 환경으로 거른다.** 최소 레벨은 `LOG_LEVEL`(있으면 우선), 없으면 `NODE_ENV === "production"` → `info`, 그 외 → `debug`. 즉 **운영에서 `debug` 는 출력되지 않는다.** 상세 추적은 `debug`, 정상 이벤트는 `info`, 복구 가능한 문제는 `warn`, 실패는 `error` 로 남긴다.
- **민감정보는 남기지 않는다.** API 키·토큰·비밀번호·쿠키·service_role, 그리고 이메일/전화 **전체 값**은 로그에 넣지 않는다. 로거가 민감 키 이름과 문자열 속 이메일을 자동 마스킹하지만, 애초에 넘기지 않는 것이 원칙이다. 주체 식별은 이메일이 아니라 `user_id`(uuid)로 한다.

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

### Building UI

- **Prefer shadcn/ui + Tailwind CSS** for new UI. Reuse the existing primitives in `components/ui/*` (button, card, table, dialog, input, select, etc.) instead of hand-rolling equivalents; add a new shadcn component to `components/ui/` when one is missing rather than reimplementing it inline.
- Map DESIGN.md's tokens (color, spacing, radius, tone) onto the Tailwind theme / shadcn CSS variables so the two stay in sync - DESIGN.md remains the source of truth for visual decisions, shadcn/Tailwind is the implementation.
- **Tailwind/shadcn is currently scoped to `/admin`** (`tailwind.config.ts` content globs + `preflight: false` + `.admin-root` CSS variables in `app/admin/admin.css`), so it does not leak into the public map screens (which use hand-written CSS in `app/globals.css`). If you introduce shadcn/Tailwind on a public screen, extend that scoping deliberately and verify the public bundle (`app/layout.css`) does not pick up admin tokens.

## Browser verification

For browser-based verification (UI smoke tests, checking that a change works in the real app), use **playwright-cli**. It's installed globally and its skill is connected at `.claude/skills/playwright-cli/`.

## Git workflow

For now, **feature development commits and pushes go directly to `main`** — do not create feature branches.

- Commit each time a meaningful unit of work finishes (don't batch unrelated changes into one big commit).
- After committing, push to `origin/main`.
