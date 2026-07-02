# PRD: 장소 UGC (리뷰 · 수정 요청 · 신규 제보)

## Summary

로그인한 사용자가 카공맵에 세 가지 방식으로 기여할 수 있게 한다.

1. 기존 장소를 **good / normal / bad** 3단계로 리뷰 (장소당 1표, 수정 가능, 집계 즉시 반영)
2. 기존 장소에 대한 **정보 수정 요청** 제출 (자유 메모 + 사진, `pending` 상태로 저장)
3. **새 장소 제보** 제출 (네이버 URL + 사진 여러 장 + 메모, `pending` 상태로 저장)

세 기능 모두 로그인 필수다. 수정 요청·신규 제보는 공개 데이터(`places`)에 즉시 반영하지 않고 `status = pending` 으로 쌓아 두며, 승인/거절은 이번 범위 밖(운영자가 SQL·Supabase 대시보드에서 수동)이다.

## Problem And Goal

운영자 시드(약 9개)만으로는 데이터 신선도와 커버리지가 부족하다. 사용자 기여를 받되, 지도에 노출되는 공개 데이터(`places`)의 신뢰도는 운영자 검토로 지켜야 한다.

- **Goal**: 로그인 사용자가 리뷰·수정요청·신규제보를 남길 수 있는 최소 경로를 만든다. 리뷰는 텍스트·사진 없는 3단계 평가라 즉시 반영해도 안전하므로 바로 집계에 반영하고, 사진/메모가 붙는 수정요청·신규제보는 `pending` 으로만 받는다.
- **Non-Goal**: 운영자 승인 UI와 승인→`places` 자동 반영 로직은 이번에 만들지 않는다.

## Users And Use Cases

- **로그인 사용자 (카카오 OAuth)**: 지도/상세를 보다가 방문 경험을 리뷰하거나, 잘못된 정보 수정을 요청하거나, 목록에 없는 카페를 제보한다.
- **운영자**: 이번 범위에서는 앱 UI가 아니라 Supabase 대시보드/SQL 로 `pending` 제출물을 확인하고 수동 반영한다.

## Pre-Work

- 인증은 이미 구현됨: `components/AppStateProvider.tsx`(세션·`user`·`supabase`), `components/KakaoLogin.tsx`, `components/LoginPrompt.tsx`. 비로그인 게이팅은 `openLoginPrompt()` + `LoginPrompt` 모달 패턴을 그대로 재사용한다.
- 사용자 데이터 쓰기 패턴은 `bookmarks` 를 그대로 따른다: 브라우저 Supabase 클라이언트에서 RLS(`auth.uid() = user_id`)로 직접 insert, 낙관적 업데이트.
- DB 규칙은 `CLAUDE.md` 의 RLS 4정책 규약과 마이그레이션 규약(신규 파일 추가, `supabase/migrations/` 가 단일 진실원)을 따른다.
- 사진 저장은 **기존 `place-images` 버킷(public)** 을 재사용한다. 새 버킷은 만들지 않는다(D3 확정). 업로드 경로는 `uploads/{uid}/...`.

## Non-Goals

- 운영자 승인/거절 UI (`/admin` 등) — 이번 범위 밖.
- 승인 시 수정요청·신규제보를 `places` 에 자동 반영하는 로직.
- 리뷰의 메모/코멘트, 개별 리뷰 목록 노출 (집계 카운트만 보여준다).
- 수정 요청의 필드별(콘센트/와이파이/영업시간 등) 구조화 입력 — 자유 메모 + 사진만.
- 제보 인센티브(포인트·뱃지), 신고, 중복 제보 감지.
- 신규 제보 시 좌표/주소를 사용자에게 필수로 받는 것 — 좌표 보강은 승인 단계 운영자 몫.

## Requirements

### 데이터 계층

- **R1**: `reviews` 테이블을 신설한다. 컬럼: `id`, `user_id`(FK `auth.users`), `place_id`(FK `places`), `rating`(enum `good`/`normal`/`bad`), `created_at`, `updated_at`. `unique(user_id, place_id)` 로 장소당 1표를 강제한다.
- **R2**: `reviews` 에 RLS 를 켜고, 본인 행에 대한 `insert`/`update`/`delete`/`select` 4정책을 `auth.uid() = user_id` 로 건다 (`bookmarks` 와 동일). 단, 타인 리뷰까지 합산해야 하므로 집계는 본인-only select 로 불가능하다 → **R3** 로 해결한다.
- **R3**: 장소별 리뷰 집계를 공개로 읽을 수 있는 경로를 둔다. `SECURITY DEFINER` 함수 `get_review_counts()` 를 만들어 `(place_id, good, normal, bad)` 를 반환하고 `anon`/`authenticated` 에 실행 권한을 부여한다. (개별 리뷰 행은 공개하지 않고 카운트만 노출한다.)
- **R4**: `place_edit_requests` 테이블을 신설한다. 컬럼: `id`, `user_id`, `place_id`(FK `places`), `note`(text), `photos`(text[]), `status`(enum `pending`/`approved`/`rejected`, 기본 `pending`), `created_at`. RLS 를 켜고 본인 행 `insert`/`select` 정책을 건다. `update`/`delete` 는 정책을 만들지 않아 사용자가 상태를 바꿀 수 없게 한다(승인은 service_role 로 우회).
- **R5**: `place_reports` 테이블(신규 장소 제보)을 신설한다. 컬럼: `id`, `user_id`, `naver_place_url`(text, not null), `note`(text), `photos`(text[]), `status`(enum, 기본 `pending`), `created_at`. RLS·정책은 R4 와 동일 규약.
- **R6**: 사진은 **기존 `place-images` 버킷을 재사용**한다(새 버킷 신설 금지). 업로드 경로는 `uploads/{auth.uid()}/{timestamp}-{filename}` 규약으로 통일한다. 버킷은 이미 public read 이므로 읽기는 그대로 된다. 업로드 쓰기는 인증 사용자가 **`uploads/{자기 uid}/` 경로에만** 가능하도록 storage RLS 를 강화한다(기존 정책은 `bucket_id='place-images'` 조건만 있어 경로 제한이 없음). 강화 여부/방식은 Open Decision D3 참조.

### 리뷰 (즉시 반영)

- **R7**: 상세 패널(`PlaceDetail`)에 good/normal/bad 리뷰 UI 를 추가한다. 각 등급의 **공개 집계 카운트**와 **내가 선택한 값**을 함께 표시한다.
- **R8**: 로그인 사용자가 등급을 누르면 `reviews` 에 upsert(장소당 1표)한다. 이미 같은 등급이면 취소(삭제), 다른 등급이면 등급 변경. 낙관적 업데이트로 집계·내 선택이 즉시 갱신되고, 실패 시 롤백한다.
- **R9**: 비로그인 사용자가 리뷰를 누르면 `openLoginPrompt()` 로 로그인 모달을 띄우고 서버에는 아무것도 쓰지 않는다.

### 수정 요청 (pending)

- **R10**: 상세 패널에 '정보 수정 요청' 진입(버튼)을 추가한다. 폼은 **자유 메모(text)** 와 **사진 첨부**를 받는다. 제출 시 사진을 `place-images` 버킷 `uploads/{uid}/` 경로에 업로드하고 얻은 public URL 들을 `photos` 에, 나머지를 `place_edit_requests` 에 `status='pending'` 으로 insert 한다.
- **R11**: 수정 요청 제출은 `places` 및 지도에 어떤 변화도 만들지 않는다.
- **R12**: 비로그인 사용자가 진입을 시도하면 로그인 모달을 띄우고 서버에 아무것도 쓰지 않는다.

### 신규 제보 (pending)

- **R13**: 좌측 패널(`KakaoMap.tsx` 의 `<aside className="left-panel">`) **하단, `BookmarkList` 아래**에 '새 장소 제보' 진입(버튼)을 추가한다.
- **R14**: 제보 폼은 **네이버 URL(필수)**, **사진 여러 장**, **메모**를 받는다. 제출 시 사진을 `place-images` 버킷 `uploads/{uid}/` 경로에 업로드하고, `place_reports` 에 `status='pending'` 으로 insert 한다. 네이버 URL 이 비어 있으면 제출을 막는다.
- **R15**: 신규 제보 제출은 `places` 및 지도에 어떤 변화도 만들지 않는다.
- **R16**: 비로그인 사용자가 진입을 시도하면 로그인 모달을 띄우고 서버에 아무것도 쓰지 않는다.

### 횡단

- **R17**: 새로 추가하는 UI 는 `DESIGN.md` 의 색/간격/톤 표준을 따른다. 기존 상세 패널·좌측 패널의 클래스 네이밍 규약과 결을 맞춘다.
- **R18**: 사진 업로드에는 클라이언트 측 개수/용량 가드를 둔다(예: 최대 장수 제한, 이미지 MIME 만 허용). 정확한 값은 구현 시 DESIGN/UX 상식선으로 정하되 PRD 상 "무제한 업로드 금지"를 만족해야 한다.

## Acceptance Criteria

- **AC1** (R1, R2): `reviews` 테이블이 존재하고 RLS 가 켜져 있으며 4정책이 걸려 있다. 같은 `(user_id, place_id)` 로 두 번 insert 하면 unique 위반으로 거부된다. — `mcp__supabase__list_tables` / `execute_sql` 로 확인.
- **AC2** (R3): `select * from get_review_counts()` 를 anon 권한으로 실행하면 장소별 good/normal/bad 카운트가 반환된다. 개별 `reviews` 행은 타 사용자 세션에서 select 되지 않는다.
- **AC3** (R4, R5): `place_edit_requests`, `place_reports` 테이블이 존재하고 RLS 가 켜져 있으며 본인 `insert`/`select` 정책만 있고 사용자용 `update`/`delete` 정책은 없다. — `list_tables` / policy 조회로 확인.
- **AC4** (R6): 새 버킷이 만들어지지 않고 기존 `place-images` 버킷을 쓴다. 인증 사용자가 `uploads/{자기 uid}/파일` 경로엔 업로드되고, `uploads/{다른 uid}/` 경로엔 업로드가 거부된다(D3 로 강화 채택 시). — `list_storage_buckets`(버킷 1개 유지) + storage 정책 확인, 브라우저 업로드 스모크.
- **AC5** (R7, R8): 상세 패널에서 good 을 누르면 내 선택이 good 으로 바뀌고 good 카운트가 +1 되어 즉시 보인다. good 을 다시 누르면 취소되어 -1. bad 를 누르면 good→bad 로 옮겨간다(good -1, bad +1). 새로고침 후에도 내 선택과 집계가 유지된다.
- **AC6** (R9, R12, R16): 로그아웃 상태에서 리뷰/수정요청/신규제보를 각각 시도하면 로그인 모달이 뜨고, 네트워크 상 insert/upload 요청이 발생하지 않는다.
- **AC7** (R10, R11): 로그인 상태에서 메모+사진으로 수정 요청을 제출하면 `place_edit_requests` 에 `status='pending'` 행이 1개 생기고 `photos` 에 업로드된 public URL 이 들어간다. 같은 장소의 지도 마커·상세 내용은 변하지 않는다. — DB row 확인.
- **AC8** (R13, R14, R15): 좌측 패널 `BookmarkList` 아래에 '새 장소 제보' 진입이 보인다. 네이버 URL 없이 제출하면 막히고, 채워서 제출하면 `place_reports` 에 `status='pending'` 행이 생긴다. 지도/`places` 는 변하지 않는다.
- **AC9** (R18): 이미지가 아닌 파일이나 상한을 넘는 장수는 업로드 폼에서 거부된다.
- **AC10** (R17): 새 UI 가 기존 상세/좌측 패널과 시각적으로 일관된다(사람이 확인).

## Verification - Agent

- `mcp__supabase__list_migrations` / `list_tables` / `execute_sql` 로 테이블·enum·RLS 정책·`get_review_counts` 함수·unique 제약 존재를 확인.
- `mcp__supabase__list_storage_buckets` 와 storage 정책 조회로 `place-images` 버킷(신설 없음)·`uploads/{uid}/` 경로 정책 확인.
- `mcp__supabase__get_advisors` (security) 로 RLS 미설정/공개 노출 경고가 없는지 확인.
- `npx tsc --noEmit` 와 `npm run lint` (`next lint`) 통과.
- playwright-cli 스모크: 비로그인 3액션 → 로그인 모달, 로그인 후 리뷰 즉시 반영·수정요청/제보 pending 생성.
  - 브라우저 검증은 `.claude/skills/playwright-cli/` 를 사용한다. Kakao 키가 없으면 지도 대신 안내 화면이 뜨므로, 스모크 전 `.env.local` 키 유무를 먼저 확인하고 없으면 human 검증으로 넘긴다.

## Verification - Human

- 실제 카카오 로그인 후 상세에서 good/normal/bad 를 눌러 집계가 즉시 바뀌고 새로고침 후 유지되는지 확인.
- 사진을 실제로 첨부해 수정요청·신규제보를 제출하고, Supabase 대시보드에서 `pending` 행과 Storage 업로드 파일을 확인.
- 새 UI 가 `DESIGN.md` 톤·색·간격에 맞는지 눈으로 확인 (AC10).

## Technical Structure And Changes

**신규 마이그레이션** (`supabase/migrations/`, 새 파일로만 추가):
- `<version>_create_reviews.sql` — `review_rating` enum, `reviews` 테이블, RLS 4정책, `get_review_counts()` SECURITY DEFINER 함수 + 실행 권한.
- `<version>_create_place_edit_requests.sql` — `submission_status` enum(공유 가능), `place_edit_requests` 테이블, RLS + 본인 insert/select 정책.
- `<version>_create_place_reports.sql` — `place_reports` 테이블, RLS + 본인 insert/select 정책.
- `<version>_place_images_upload_policy.sql` — **버킷 신설 없음**. 기존 `place-images` 버킷의 storage.objects 에 `uploads/{uid}/` 경로 기반 INSERT(및 필요 시 UPDATE/DELETE) RLS 강화. (기존 열린 INSERT 정책 `place-images authenticated upload` 를 교체/보강할지 D3 에서 확정.)

**클라이언트**:
- `components/AppStateProvider.tsx` — 리뷰 상태(내 리뷰 map, 집계) + `setReview()` 를 `bookmarks` 패턴으로 추가하는 것을 검토. (집계는 `get_review_counts` 로드) — 리뷰가 여러 컴포넌트에서 공유되지 않으면 `PlaceDetail` 로컬로 둘 수도 있으나, 상세 재열림/일관성 위해 provider 권장.
- `components/PlaceDetail.tsx` — 리뷰 UI + '정보 수정 요청' 진입/폼.
- `components/KakaoMap.tsx` 좌측 `aside` — `BookmarkList` 아래 '새 장소 제보' 진입 추가.
- 신규 컴포넌트: 수정요청 폼, 신규제보 폼, 사진 업로드 유틸(`lib/uploads.ts` 등).
- `lib/types.ts` — 리뷰/제출 관련 타입 추가.
- `app/globals.css` (또는 기존 CSS 위치) — 새 UI 스타일 (DESIGN.md 준수).

**변경 없음**: `places` 테이블 스키마, `lib/cafes.ts` 의 카페 로딩 계약, 지도 마커 렌더링은 그대로 둔다.

## Tasks

- **T1**: `reviews` 마이그레이션 작성 — enum + 테이블 + unique + RLS 4정책 + `get_review_counts()` + grant. `apply_migration` 로 적용. (req: R1, R2, R3) (ac: AC1, AC2)
- **T2**: `place_edit_requests` 마이그레이션 — enum + 테이블 + RLS + 본인 insert/select 정책. (req: R4) (ac: AC3)
- **T3**: `place_reports` 마이그레이션 — 테이블 + RLS + 본인 insert/select 정책. (req: R5) (ac: AC3) (after: T2)
- **T4**: 기존 `place-images` 버킷에 대해 `uploads/{uid}/` 경로 기반 storage RLS 강화(D3 결정 반영). 새 버킷은 만들지 않는다. (req: R6) (ac: AC4)
- **T5**: 사진 업로드 유틸 작성 — 이미지 MIME·장수 가드, `place-images` 버킷 `uploads/{uid}/` 경로 업로드, public URL 반환. (req: R6, R18) (ac: AC4, AC9) (after: T4)
- **T6**: `AppStateProvider` 에 리뷰 상태·집계·`setReview()` 추가(또는 PlaceDetail 로컬 결정). `get_review_counts` 로드. (req: R7, R8) (ac: AC5) (after: T1)
- **T7**: `PlaceDetail` 에 good/normal/bad 리뷰 UI(집계+내 선택) + 로그인 게이팅. (req: R7, R8, R9, R17) (ac: AC5, AC6, AC10) (after: T6)
- **T8**: `PlaceDetail` 에 '정보 수정 요청' 진입 + 메모/사진 폼, 제출 시 업로드+insert, 로그인 게이팅. (req: R10, R11, R12, R17) (ac: AC6, AC7, AC10) (after: T5)
- **T9**: 좌측 패널 `BookmarkList` 아래 '새 장소 제보' 진입 + 네이버URL/사진/메모 폼, URL 필수 검증, 제출 시 업로드+insert, 로그인 게이팅. (req: R13, R14, R15, R16, R17) (ac: AC6, AC8, AC10) (after: T5)
- **T10**: 검증 — `tsc`/`lint`, supabase advisors, playwright-cli 스모크(키 있으면). 결과 보고. (req: 전체) (ac: AC1-AC9)

## Risks And Open Decisions

- **리뷰 집계 read 경로**: 본인-only RLS 로는 타인 리뷰 합산 불가 → `get_review_counts()` SECURITY DEFINER 로 해결(개별 행 비공개, 카운트만). 대안(공개 select 정책으로 전체 리뷰 노출)은 프라이버시상 채택 안 함. 구현 시 함수가 개별 `user_id` 를 절대 반환하지 않도록 주의.
- **`AppStateProvider` vs 로컬 상태**: 리뷰 상태를 provider 로 올릴지 PlaceDetail 로컬로 둘지는 T6 에서 확정. 상세 재열림 일관성·집계 재사용을 이유로 provider 권장하되, 과설계면 로컬 허용.
- **Storage 버킷/경로 규약**: 새 버킷 안 만든다. 기존 `place-images`(public) 안 `uploads/{auth.uid()}/{timestamp}-{filename}` 로 통일. storage RLS 는 `(storage.foldername(name))[1] = 'uploads' and (storage.foldername(name))[2] = auth.uid()::text` 패턴으로 본인 폴더 제한.
- **D3 — 기존 열린 업로드 정책 처리 (확정: 교체)**: 현재 `place-images` 의 `authenticated` INSERT 정책(`"place-images authenticated upload"`)은 조건이 `bucket_id='place-images'` 뿐이라 경로 제한이 없다. 이번에 이 정책을 **drop 하고 `uploads/{uid}/` 경로 제한 버전으로 교체**한다(사용자 승인 완료). 코드베이스에 storage 업로드 사용처 grep 0건이라 회귀 위험 없음.
- **키 부재 환경**: Kakao 키가 없으면 지도 대신 안내 화면이 떠 브라우저 스모크가 리뷰 UI 까지 못 간다. 이 경우 agent 검증은 DB/타입/lint 까지, 나머지는 human 검증.
- **업로드 상한 수치**: R18 의 정확한 장수/용량은 미확정(구현자 재량, 무제한 금지만 계약). 필요 시 DESIGN/UX 로 조정.

## Implementation Result Report Contract

구현 완료 시 다음을 보고한다.

- 적용된 마이그레이션 파일명과 `apply_migration` 결과, `list_tables`/policy 로 확인한 테이블·정책·함수·버킷 상태.
- `get_review_counts()` 실행 결과 샘플과 "개별 리뷰 행이 타 사용자에게 안 보임" 확인 근거.
- `tsc`/`lint` 결과, `get_advisors(security)` 결과(경고 유무).
- playwright-cli 스모크 수행 여부와 결과(또는 키 부재로 human 검증 이관 사실).
- AC1-AC10 각각에 대해 충족/미충족/human-대기 상태.
- 남은 위험·미결정 사항(업로드 상한 수치, provider 여부 결정 결과 등).
