# PRD: 관리자 운영 콘솔 (제보 처리 · 장소 관리)

## Summary

카공맵에 운영자 전용 화면 `/admin/reports`, `/admin/places` 를 추가한다.
사용자가 보낸 UGC(새 카페 제보 `place_submissions`, 정보 수정 요청 `place_edit_requests`)를 운영자가 검토한 뒤, 지도에 노출되는 `places` 데이터로 반영한다.
접근은 관리자 이메일 계정만 가능하며, 데이터 변경(승인 · 반려 · 장소 추가 · 수정)은 클라이언트에서 Supabase 를 직접 호출하지 않고 Next.js Server Action + `service_role` 로만 처리한다.

## Problem And Goal

지금은 UGC 테이블(`place_submissions`, `place_edit_requests`)에 제보가 쌓이지만, 운영자가 이를 검토하거나 안전하게 `places` 로 반영할 화면이 없다.
`places` 쓰기는 `service_role` 만 허용하는 RLS 라 클라이언트에서 반영할 수도 없다.
목표는 운영자 1인이 (1) 쌓인 제보를 한눈에 보고, (2) 승인 시 제보 내용이 프리필된 장소 폼으로 이어져 좌표 · 속성을 보강해 `places` 에 반영하고, (3) 장소 사진을 직접 업로드 · 교체 · 삭제할 수 있게 하는 것이다.

## Users And Use Cases

- **운영자(관리자 이메일 소유자) 1인**.
  - 새로 들어온 제보 목록을 status 별로 확인한다.
  - 제보 row 를 눌러 사진 · 메모 · URL · 제보자 · 생성 시각을 dialog 로 본다.
  - 새 카페 제보를 승인하면 장소 추가 폼(제보 내용 프리필)으로 이동해 저장한다.
  - 정보 수정 요청을 승인하면 해당 장소 수정 폼(제보 내용 프리필)으로 이동해 저장한다.
  - 부적절한 제보는 반려한다(목록에는 남는다).
  - 장소 목록에서 기존 장소를 직접 추가 · 수정하고 사진을 관리한다.
- **비관리자 / 비로그인 사용자**: `/admin` 하위 어디에도 접근할 수 없어야 한다.

## Pre-Work

이 기능은 기존 인증 · 데이터 접근 방식을 바꾸는 선행 작업이 필요하다. 아래를 먼저 처리한다.

1. **인증을 `@supabase/ssr` 쿠키 세션으로 앱 전체 통일** (clarify 결정).
   - 현재 로그인은 카카오 OAuth **implicit** 방식이라 세션이 브라우저(localStorage)에만 있고 서버에서 사용자를 알 수 없다.
   - 카카오 OAuth 를 **code flow + `/auth/callback` 라우트**로 전환하고, `@supabase/ssr` 로 세션을 쿠키에 저장한다.
   - 서버 컴포넌트 · 미들웨어 · Server Action 이 `auth.getUser()` 로 서버에서 사용자를 확인할 수 있어야 한다.
   - 기존 공개 화면(즐겨찾기 · 리뷰 · 제보 등)의 로그인 · 로그아웃 · 세션 유지가 회귀 없이 계속 동작해야 한다.
2. **서버 전용 env 추가**: `SUPABASE_SERVICE_ROLE_KEY`(비공개, `NEXT_PUBLIC_` 접두사 금지), `ADMIN_EMAILS`(쉼표 구분 관리자 이메일 목록). `.env.local.example` 에 주석과 함께 항목 추가.
3. **관리자용 서버 Supabase 헬퍼**: `service_role` 키로 만든 클라이언트를 서버 전용 모듈에서만 export 한다. 이 모듈은 클라이언트 번들에 포함되면 안 된다(`import "server-only"` 등으로 가드).

## Non-Goals

- 반려 사유 텍스트(`review_note`) 저장 — 이번 범위 밖. 필요 시 후속 마이그레이션.
- 공개 지도 화면의 UI 를 Tailwind/shadcn 으로 재작성하는 리팩터링 — 공개 화면은 기존 손수 작성 CSS/DESIGN.md 그대로 유지.
- 복수 관리자 role 체계 · 권한 등급 — 이메일 allowlist 단일 레벨만.
- 제보 목록의 고급 검색 · 정렬 · 무한 스크롤 — status 필터 + 최신순만.
- 지도 좌표를 주소로부터 자동 지오코딩 — 운영자가 폼에서 직접 입력/보정.

## Requirements

### 인증 · 권한

- **R1** 앱 전체 로그인이 `@supabase/ssr` 쿠키 세션으로 동작한다. 카카오 OAuth 는 code flow + `/auth/callback` 라우트로 세션을 확립하며, 로그인 후 서버 컴포넌트에서 `auth.getUser()` 로 사용자를 읽을 수 있다.
- **R2** 기존 공개 화면 기능(카카오 로그인/로그아웃, 즐겨찾기 토글, 리뷰 등급, 제보/수정요청 제출)이 회귀 없이 동작한다.
- **R3** `/admin` 및 그 하위 모든 경로는 미들웨어(또는 레이아웃 서버 가드)에서 보호된다. 비로그인 사용자는 로그인으로, 로그인했지만 `ADMIN_EMAILS` 에 없는 사용자는 접근 거부(예: 홈으로 리다이렉트 또는 403 화면)된다.
- **R4** 모든 데이터 변경(제보 승인/반려, 장소 추가/수정, 사진 업로드/교체/삭제)은 Server Action 에서 수행되며, 각 Server Action 은 시작 시 서버에서 관리자 이메일을 재검증한다(미들웨어만 믿지 않는다). 클라이언트 코드에서 `places`/제보 테이블에 대한 Supabase 쓰기 직접 호출은 없다.

### 제보 화면 `/admin/reports`

- **R5** 새 카페 제보(`place_submissions`)와 정보 수정 요청(`place_edit_requests`)을 각각 표(table)로 보여준다. 각 표는 최소한 제보자 · 생성 시각 · status · 요약(수정요청은 대상 장소명)을 열로 갖는다.
- **R6** status(`pending`/`approved`/`rejected`)로 필터링할 수 있고, 기본 정렬은 최신순(생성 시각 내림차순)이다.
- **R7** row 를 누르면 dialog 가 열려 사진(썸네일/원본), 메모, URL(제보는 `naver_place_url`), 제보자, 생성 시각을 보여준다. 수정 요청은 대상 장소 정보도 함께 보여준다.
- **R8** dialog 에서 **승인**과 **반려** 액션을 제공한다.
  - 새 카페 제보 승인 → 장소 추가 폼(`/admin/places/new`)으로 이동하며, 제보의 `naver_place_url` · 메모 · 사진이 폼에 프리필된다.
  - 정보 수정 요청 승인 → 해당 장소 수정 폼(`/admin/places/[id]/edit`)으로 이동하며, 기존 장소 값 위에 제보의 메모 · 사진이 프리필/후보로 표시된다.
  - 반려 → 해당 제보 `status` 를 `rejected` 로 바꾸고 목록에 남긴다(행 삭제 없음).
- **R9** 제보의 최종 "승인 완료"(`status='approved'`) 처리는 프리필된 장소 폼에서 **실제 저장이 성공한 시점**에 이뤄진다. 폼으로만 이동하고 저장하지 않으면 제보는 여전히 검토 대상 상태로 남는다.

### 장소 관리 `/admin/places`

- **R10** 지도에 노출되는 `places` 전체 목록을 표로 보여준다(이름 · 주소 · outlet/wifi 등 핵심 속성 · 사진 유무). 목록에서 개별 장소 수정으로 진입할 수 있고, "장소 추가" 진입점이 있다.
- **R11** 장소 추가/수정 폼은 `places` 스키마의 편집 가능한 필드를 모두 다룬다: `name`, `address`, `lat`, `lng`, `naver_place_url`, `open_time`, `close_time`, `is_24h`, `iced_americano_price`, `outlet`(enum), `wifi`(enum), `noise`(enum), `work_fit`(enum), `tags`(문자열 배열), `photos`. enum 필드는 `lib/labels.ts` 의 한국어 라벨로 선택지를 노출한다.
- **R12** 저장은 Server Action 으로 `places` 를 insert(추가) 또는 update(수정)한다. 성공 시 목록으로 돌아가고, 반영된 값이 즉시 조회된다.

### 사진 업로드 · 관리

- **R13** 장소 추가/수정 폼에서 사진을 직접 업로드할 수 있다. 업로드는 Server Action + `service_role` 로 `place-images` 버킷의 관리자용 경로(예: `places/{placeId}/...`, 신규 추가 시에는 저장 시점에 placeId 확정)에 저장한다. 업로드 검증(이미지 MIME 만, 파일당 10MB 이하, 장수 상한)은 `lib/uploads.ts` 규칙을 재사용/준수한다.
- **R14** 기존 사진을 추가 · 교체 · 삭제할 수 있다. 삭제/교체 시 `places.photos` URL 배열에서 제거하고, 스토리지의 해당 객체도 정리한다.
- **R15** 사진 URL 은 `places.photos`(text[]) 계약을 유지한다(공개 화면 `KakaoMap`/상세가 이 배열을 그대로 소비).

### UI

- **R16** `/admin` 하위 화면은 Tailwind CSS + shadcn/ui 를 사용한다(테이블 · dialog · form · button 등). 공개 지도 화면은 기존 CSS 를 건드리지 않는다. Tailwind 스코프가 공개 화면 스타일에 누수되지 않도록 구성한다.

## Acceptance Criteria

- **AC1** (R1, R2) 개발 서버에서 카카오 로그인 후, 서버 컴포넌트/Server Action 에서 `auth.getUser()` 가 로그인 사용자를 반환한다. 로그인/로그아웃, 즐겨찾기 토글, 리뷰 등급 저장, 제보 제출이 기존과 동일하게 성공한다(브라우저 확인).
- **AC2** (R3) 비로그인 상태로 `/admin/reports` 접근 시 로그인/거부로 리다이렉트된다. `ADMIN_EMAILS` 에 없는 계정으로 로그인해 접근 시 거부된다. 관리자 계정은 접근된다.
- **AC3** (R4) 클라이언트 번들 · 클라이언트 컴포넌트에 `places`/`place_submissions`/`place_edit_requests` 쓰기(`insert`/`update`/`delete`) 또는 `SUPABASE_SERVICE_ROLE_KEY` 참조가 없다(grep 으로 확인). 각 mutation Server Action 첫 부분에 관리자 이메일 검증 코드가 있다.
- **AC4** (R5, R6) `/admin/reports` 에서 두 종류의 제보가 표로 보이고, status 필터 변경 시 목록이 그에 맞게 바뀌며, 기본은 최신순이다.
- **AC5** (R7) row 클릭 시 dialog 에 사진 · 메모 · URL · 제보자 · 생성 시각이 표시된다(수정 요청은 대상 장소 정보 포함).
- **AC6** (R8, R9) 새 카페 제보 승인 → `/admin/places/new` 에 제보값이 프리필된다. 수정 요청 승인 → `/admin/places/[id]/edit` 에 기존값+제보값이 프리필된다. 폼 저장이 성공한 뒤 해당 제보의 DB `status` 가 `approved` 로 바뀐다. 저장 전에는 `pending` 그대로다. 반려 시 `status` 가 `rejected` 로 바뀌고 row 는 남는다.
- **AC7** (R10, R11, R12) `/admin/places` 목록에서 장소를 추가하면 새 `places` 행이 생기고 공개 지도 데이터(`getCafes`)에 나타난다. 기존 장소 수정 시 변경 필드가 DB 행에 반영된다(DB 조회로 확인).
- **AC8** (R13, R14, R15) 장소 폼에서 사진을 올리면 `places.photos` 에 URL 이 추가되고 스토리지에 객체가 존재한다. 사진 삭제 시 배열과 스토리지에서 사라진다. 공개 상세에서 남은 사진이 정상 렌더된다.
- **AC9** (R16) `/admin` 화면이 shadcn/ui 컴포넌트로 렌더되고, 공개 홈(`/`) 의 기존 스타일/레이아웃이 시각적으로 회귀하지 않는다(브라우저 확인).

## Verification - Agent

- `npm run typecheck` 통과.
- `npm run lint` 통과.
- `npm run test`(vitest) 통과 — 기존 `lib/cafes.test.ts` 회귀 없음. 새로 추가한 순수 로직(예: 관리자 이메일 판별, 제보→폼 매핑 함수)이 있으면 단위 테스트 포함.
- grep 확인: 클라이언트 컴포넌트/번들에 `SUPABASE_SERVICE_ROLE_KEY` 및 제보/`places` 직접 쓰기 없음(AC3).
- Server Action mutation 마다 관리자 이메일 재검증 존재(AC3).

## Verification - Human

- 카카오 계정으로 로그인 후 공개 화면 기능(즐겨찾기 · 리뷰 · 제보) 정상 동작 확인(AC1).
- 관리자 아닌 계정으로 `/admin` 접근 차단, 관리자 계정으로 접근 허용 확인(AC2).
- 제보 dialog 표시 → 승인 → 프리필 폼 저장 → 제보 status approved 전환 → 지도에 장소 반영까지 한 번에 흐름 확인(AC5, AC6, AC7).
- 사진 업로드/교체/삭제 후 공개 상세에서 사진 확인(AC8).
- 공개 홈 시각 회귀 없음 확인(AC9).

## Technical Structure And Changes

**신규**

- `middleware.ts` — `/admin` 보호 + 세션 갱신(`@supabase/ssr`).
- `app/auth/callback/route.ts` — OAuth code 교환 → 쿠키 세션.
- `lib/supabaseServer.ts` — 쿠키 기반 서버 클라이언트(RLS 적용, `auth.getUser()`용).
- `lib/supabaseAdmin.ts` — `service_role` 클라이언트, `server-only` 가드.
- `lib/admin.ts` — `ADMIN_EMAILS` 파싱 · `isAdminEmail()` · Server Action 가드 헬퍼(단위 테스트 대상).
- `app/admin/layout.tsx` — Tailwind/shadcn 스코프 진입점 + 서버 가드.
- `app/admin/reports/page.tsx` (+ 제보 표/dialog 클라이언트 컴포넌트).
- `app/admin/places/page.tsx`, `app/admin/places/new/page.tsx`, `app/admin/places/[id]/edit/page.tsx` (+ 장소 폼 컴포넌트).
- `app/admin/actions.ts`(또는 도메인별 분리) — 승인/반려/장소 CRUD/사진 관리 Server Action.
- `components/ui/*` — shadcn 컴포넌트.
- Tailwind 설정(`tailwind.config.*`, `postcss.config.*`, `components.json`), `/admin` 전용 CSS 진입.

**변경**

- `lib/supabaseBrowser.ts` / `components/AppStateProvider.tsx` / `components/KakaoLogin.tsx` — `@supabase/ssr` 브라우저 클라이언트 + code flow 로 조정(R1, R2).
- `.env.local.example` — `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS` 추가.
- `package.json` — `@supabase/ssr`, Tailwind/shadcn 관련 devDependencies 추가.
- 필요 시 `place_submissions`/`place_edit_requests` 를 관리자가 전체 조회하는 경로 — **`service_role` 서버 조회로 처리**(RLS 는 유지, 새 정책 추가하지 않음). 스키마 변경 없음.

**스키마**: 이번 범위에서 마이그레이션 추가는 없다(반려 사유 컬럼은 Non-Goal). 만약 사진 관리용 스토리지 경로 정책이 필요하면 `service_role` 사용으로 정책 없이 처리하는 것을 우선한다.

## Tasks

- **T1** `@supabase/ssr` 도입: 브라우저/서버 클라이언트 헬퍼 작성, 카카오 OAuth code flow + `app/auth/callback` 라우트, `middleware.ts` 세션 갱신. `AppStateProvider`/`KakaoLogin` 조정. (req: R1, R2) (ac: AC1)
- **T2** 서버 전용 env 및 헬퍼: `.env.local.example` 에 `SUPABASE_SERVICE_ROLE_KEY`·`ADMIN_EMAILS` 추가, `lib/supabaseAdmin.ts`(server-only), `lib/admin.ts`(`isAdminEmail`·가드) + 단위 테스트. (req: R2, R4) (ac: AC3) (after: T1)
- **T3** `/admin` 접근 보호: 미들웨어/레이아웃에서 비관리자 차단, `app/admin/layout.tsx`. (req: R3) (ac: AC2) (after: T1, T2)
- **T4** Tailwind + shadcn/ui 를 `/admin` 스코프로 설정(table·dialog·form·button 등), 공개 화면 스타일 누수 방지. (req: R16) (ac: AC9) (after: T3)
- **T5** 장소 CRUD Server Action: `places` insert/update(관리자 재검증) + 목록/폼 페이지(`/admin/places`, `/new`, `/[id]/edit`), 모든 편집 필드 + enum 라벨. (req: R4, R10, R11, R12) (ac: AC3, AC7) (after: T4)
- **T6** 사진 업로드/교체/삭제 Server Action(`service_role`, 검증 재사용) + 폼 UI, `places.photos` 배열·스토리지 동기화. (req: R4, R13, R14, R15) (ac: AC8) (after: T5)
- **T7** 제보 화면 `/admin/reports`: 두 표 + status 필터 + 최신순, 제보 전체 조회(service_role). (req: R4, R5, R6) (ac: AC3, AC4) (after: T4)
- **T8** 제보 상세 dialog(사진·메모·URL·제보자·생성시각, 수정요청은 대상 장소 포함). (req: R7) (ac: AC5) (after: T7)
- **T9** 승인/반려 흐름: 승인 시 프리필 폼으로 이동(신규→new, 수정요청→edit), 폼 저장 성공 시 제보 status=approved, 반려 시 status=rejected(행 유지). (req: R8, R9) (ac: AC6) (after: T5, T6, T8)
- **T10** 검증: typecheck/lint/test 통과, grep 으로 클라이언트 직접 쓰기·service_role 노출 없음 확인, 브라우저 흐름 스모크. (req: R2, R4) (ac: AC1, AC3, AC7, AC8, AC9) (after: T9)

## Risks And Open Decisions

- **카카오 OAuth code flow 전환 리스크**: implicit → code flow 로 바꾸면 카카오 개발자 콘솔의 Redirect URI(`/auth/callback`) 등록이 필요할 수 있다. 로컬(`http://localhost:3030/auth/callback`) 등록 여부를 사람이 확인해야 한다.
- **관리자 이메일 값 확정 필요**: `ADMIN_EMAILS` 기본값. clarify 단계 후보는 `tansfil@gmail.com` 이나, 카카오 로그인 시 반환되는 이메일과 실제로 일치하는지(카카오 계정 이메일 제공 동의 여부) 사람이 확인해야 한다. 이메일이 없으면 이메일 기반 allowlist 대신 user id allowlist 로 대체 결정 필요.
- **신규 장소 사진 경로의 placeId**: 추가 폼은 저장 전 placeId 가 없다. 저장 시 먼저 `places` insert 로 id 를 확보한 뒤 사진을 `places/{id}/` 로 이동/업로드하는 순서로 처리(구현 시 트랜잭션적 정리 주의).
- **RLS 유지 원칙**: 관리자 전체 조회는 새 RLS 정책이 아니라 `service_role` 서버 조회로 한다(CLAUDE.md RLS 원칙과 "관리자 운영 정책은 서버 코드에서 관리" 결정 준수).

## Implementation Result Report Contract

구현 완료 시 다음을 보고한다.

- 완료된 Task(T1~T10) 및 각 Task 가 충족한 Requirement/AC 매핑.
- `npm run typecheck` / `npm run lint` / `npm run test` 실제 출력 결과(통과/실패).
- grep 검증 결과(클라이언트 직접 쓰기 · `SUPABASE_SERVICE_ROLE_KEY` 노출 없음).
- 브라우저 스모크 결과: 관리자 접근 제어, 제보 dialog→승인→프리필 저장→status 전환→지도 반영, 사진 업로드/삭제.
- 신규/변경 파일 목록.
- 사람이 처리해야 할 항목(카카오 Redirect URI 등록, `ADMIN_EMAILS`/`SUPABASE_SERVICE_ROLE_KEY` 값 주입) 명시.
- 미해결 이슈 · 스코프에서 제외한 항목.
