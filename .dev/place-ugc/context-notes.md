# Context Notes: 장소 UGC

코드베이스 탐색으로 확인한 사실. 구현 시 재탐색 없이 이걸 근거로 진행.

## 인증 / 게이팅 (이미 존재, 재사용)

- `components/AppStateProvider.tsx`: 전역 상태 provider. `supabase`(브라우저 클라이언트), `user`, `authReady`, `bookmarkIds`, `toggleBookmark`, `isBookmarked`, `loginPromptOpen`, `openLoginPrompt`, `closeLoginPrompt` 제공. 세션은 `supabase.auth.getSession()` + `onAuthStateChange` 로 추적.
- **북마크 쓰기 패턴(그대로 복제할 것)**: 낙관적 업데이트 → `supabase.from("bookmarks").insert/delete(...)` → 실패 시 롤백. 비로그인이면 `setLoginPromptOpen(true)` 후 return. (AppStateProvider.tsx:87-134)
- `components/LoginPrompt.tsx`: `loginPromptOpen` 으로 열리는 카카오 로그인 모달. 문구가 "BOOKMARK" 로 하드코딩돼 있음 → 리뷰/제보에도 재사용하려면 문맥 문구를 파라미터화하거나 그대로 두되 무방한지 판단.
- `components/KakaoLogin.tsx`: 로그인/로그아웃 버튼. OAuth provider = `kakao`, `redirectTo: window.location.origin` (implicit 방식).
- `lib/supabaseBrowser.ts`: `getSupabaseBrowser()` — persistSession/autoRefresh/detectSessionInUrl 켜진 브라우저 클라이언트. env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## UI 마운트 지점

- `components/KakaoMap.tsx`: 최상위 `<AppStateProvider>` 안에 `<aside className="left-panel">`(line 149) 이 있고 그 안에 eyebrow/title/sub → `left-panel__auth`(KakaoLogin) → `<BookmarkList cafes onSelect={setSelected} />`(line 158). 그 형제로 `<PlaceDetail cafe={selected} onClose=... />`(line 161), `<LoginPrompt />`(line 164).
  - **"좌측 패널 하단" = `BookmarkList` 아래, 이 `aside` 안**에 '새 장소 제보' 진입을 추가.
- `components/PlaceDetail.tsx`: 마커 클릭 시 열리는 상세(우측 패널/모바일 하단시트). `useAppState()` 로 `isBookmarked`/`toggleBookmark` 사용. 구성: photos → address → name → 네이버 링크 → QUICK CHECK(FactCard) → 자리와 분위기(work_fit chip). `detail__actions` 에 북마크 하트·닫기 버튼. **리뷰 UI·'정보 수정 요청' 진입을 여기에 추가.**
- `components/BookmarkList.tsx`: `<section className="bookmark-panel">`. 참고용 클래스 네이밍 규약.

## 데이터 계층 규약

- 마이그레이션: `supabase/migrations/<version>_<snake>.sql`, 새 파일로만 추가(적용된 파일 편집 금지). 현재: `..._create_places_schema.sql`, `..._seed_places.sql`, `..._create_bookmarks.sql`.
- `places`: public read(`for select using(true)`), 쓰기는 service_role(RLS 우회). 컬럼에 `photos text[] not null default '{}'` 이미 존재 → URL 배열 규약이 이미 있음.
- **per-user 테이블 RLS 규약(CLAUDE.md)**: RLS on 기본, ownership = `auth.uid() = user_id`. SELECT/DELETE `using`, INSERT `with check`, UPDATE 는 using+with check 둘 다. **RLS-enable 과 정책은 같은 마이그레이션에.**
- `bookmarks` 마이그레이션(`..._create_bookmarks.sql`)이 4정책 정본 예시. `unique(user_id, place_id)` + `bookmarks_user_idx` 패턴 참고.
- `create extension if not exists "pgcrypto"` 로 `gen_random_uuid()` 이미 사용 가능.

## 리뷰 집계 read 경로 (핵심 설계)

- 리뷰는 per-user 테이블이라 본인-only RLS 면 타인 것 합산 불가. → `SECURITY DEFINER` 함수 `get_review_counts()` 로 `(place_id, good, normal, bad)` 만 반환하고 `anon`/`authenticated` 에 execute grant. 개별 `user_id`/행은 절대 노출하지 말 것.
- 대안(전체 리뷰 공개 select)은 프라이버시상 채택 안 함.

## 타입 / 클라이언트 계약

- `lib/types.ts`: `Cafe`(정규화, wifi:boolean), `PlaceRow`(원본). enum 타입 `Outlet`/`WorkFit`/`Noise`/`WifiEnum` 여기 정의. 리뷰/제출 타입 추가 위치.
- `lib/cafes.ts`: `getCafes()`(서버 전용, `getSupabase()` 사용), `toCafe()`(row→Cafe). 카페 로딩 계약은 건드리지 말 것.
- `Cafe.id` = places uuid (리뷰/수정요청의 place_id FK 로 사용).

## Storage (기존 버킷 재사용 — 신설 금지)

- **기존 `place-images` 버킷을 쓴다.** (사용자 지시) 실제 확인값(2026-07-02):
  - 버킷 1개: `place-images`, `public=true`, `file_size_limit=null`, `allowed_mime_types=null`.
  - storage.objects 정책 1개뿐: `"place-images authenticated upload"`, cmd=INSERT, roles=`{authenticated}`, with_check=`(bucket_id = 'place-images')`. **경로 제한 없음** → 로그인 사용자가 버킷 어디에나 업로드 가능. SELECT 정책은 없지만 버킷이 public 이라 읽기는 됨.
- 업로드 경로 규약: `uploads/{auth.uid()}/{timestamp}-{filename}`.
- storage RLS 강화: `bucket_id='place-images' and (storage.foldername(name))[1]='uploads' and (storage.foldername(name))[2]=auth.uid()::text`. 기존 열린 INSERT 정책을 이 경로 제한 버전으로 **교체**하는 게 기본안(D3). 코드베이스에 storage 업로드 사용처 grep 0건이라 교체 영향 없음 — 착수 시 재확인.
- 정책은 마이그레이션(SQL)으로 남겨 단일 진실원 유지. 버킷 생성 DDL 은 넣지 말 것(이미 존재).

## 검증 도구

- 브라우저: `.claude/skills/playwright-cli/` (playwright-cli). Kakao 키 없으면 `app/page.tsx` 가 지도 대신 "카카오맵 키가 필요합니다" 안내로 short-circuit → 스모크가 리뷰 UI 까지 못 감. 스모크 전 `.env.local` 키 유무 확인.
- 린트/타입: `npm run lint`(next lint), `npx tsc --noEmit`. 테스트는 `lib/cafes.test.ts` 존재(별도 러너 확인 필요).
- Supabase: `mcp__supabase__list_tables`/`execute_sql`/`list_migrations`/`list_storage_buckets`/`get_advisors`.

## 주의

- em dash 금지(하이픈), 커밋 co-author 자동 추가 금지(CLAUDE.md user scope).
- UI/CSS 변경 전 `DESIGN.md` 먼저 읽기 — 색/간격/컴포넌트/말투 표준 우선.
- 커밋은 main 에 직접, 의미 단위마다. (CLAUDE.md git workflow)
