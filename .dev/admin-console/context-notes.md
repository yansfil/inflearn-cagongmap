# Context Notes: 관리자 운영 콘솔

구현 에이전트가 다시 탐색하지 않도록, 코드베이스 조사에서 확인한 근거를 정리한다.

## 인증 현황 (가장 중요한 제약)

- 로그인은 **카카오 OAuth implicit 방식**. `components/KakaoLogin.tsx` 에서 `signInWithOAuth({ provider: "kakao", options: { redirectTo: window.location.origin } })`.
- 브라우저 클라이언트 `lib/supabaseBrowser.ts` 는 `@supabase/supabase-js` `createClient` 에 `persistSession/autoRefreshToken/detectSessionInUrl` 로 **localStorage 세션**. 서버는 사용자 세션을 알 수 없다.
- `components/AppStateProvider.tsx` 가 `getSupabaseBrowser()` 로 세션·유저·북마크·리뷰 상태를 전역 관리. `@supabase/ssr` 전환 시 여기의 세션 추적(`getSession`/`onAuthStateChange`)을 유지해야 함.
- 서버 읽기용 `lib/supabase.ts` 는 anon key + `persistSession:false`. `getCafes()`(`lib/cafes.ts`)가 이걸로 `places` 를 공개 읽기.
- **middleware 없음**(루트/`app` 에 `middleware.*` 파일 없음).
- `@supabase/ssr` 미설치. `@supabase/supabase-js@^2.108.1` 만 있음.

## 데이터 계층

- `places` 스키마: `supabase/migrations/20260613141018_create_places_schema.sql`.
  - 컬럼: `id, name, address, lat, lng, naver_place_url, open_time(time), close_time(time), is_24h(bool), iced_americano_price(int, 원), outlet(outlet_level), wifi(wifi_level), noise(noise_level), work_fit(work_fit_level), tags(text[]), photos(text[]), verified_at, created_at, updated_at`.
  - enum: `outlet_level(many/some/few/none)`, `wifi_level(stable/yes/no)`, `noise_level(quiet/normal/loud)`, `work_fit_level(good/ok/bad)`.
  - **RLS: 공개 읽기(`using(true)`), 쓰기는 `service_role` 만**(정책 없음 → anon/authenticated 쓰기 불가). `places_set_updated_at` 트리거로 `updated_at` 자동 갱신.
- enum 한국어 라벨: `lib/labels.ts` (`OUTLET_LABEL`, `NOISE_LABEL`, `WORK_FIT_LABEL`). `wifi` 는 boolean 으로 정규화되는데(`toCafe`: `'yes'|'stable'→true`), **폼에서는 enum 3값을 그대로 편집**해야 한다(계층 주의).
- 도메인 타입: `lib/types.ts` — `PlaceRow`(DB 원본, wifi enum), `Cafe`(정규화, wifi boolean). 폼은 `PlaceRow` 계층에 가깝게 다루는 것이 자연스럽다.
- `data/cafes.json`(9개)은 시드용. 실제 소스는 `places` 테이블(마이그레이션 `20260613141053_seed_places.sql`).

## UGC 테이블 (제보)

- `place_submissions` (새 카페 제보): `id, user_id, naver_place_url(not null), memo, photos(text[]), status(submission_status), created_at`. `place_id` 없음. **per-user RLS**(본인 것만 select/insert/update/delete). status 인덱스 있음.
- `place_edit_requests` (수정 요청): `id, user_id, place_id(→places), memo, photos(text[]), status, created_at`. per-user RLS.
- `submission_status` enum: `pending/approved/rejected`.
- **관리자 전체 조회는 RLS 로는 막혀 있다** → `service_role` 서버 조회로 처리(새 정책 추가하지 않음, CLAUDE.md RLS 원칙 준수).
- 제보자 표시용 이름/이메일은 `auth.users` 에서 `service_role` 로 조회해야 함(제보 테이블엔 user_id 만).

## 스토리지 / 사진

- 버킷 `place-images` (**public**). object URL GET 은 정책 없이 동작(광범위 SELECT 정책은 제거됨: `20260619113325`).
- INSERT 정책(`20260702103000_place_images_uploads_path_policy.sql`): authenticated 는 `uploads/{auth.uid()}/...` **본인 폴더만**. → 관리자 장소 사진은 이 제약과 무관하게 **service_role 로 `places/{placeId}/`** 같은 경로에 업로드(RLS 우회).
- 업로드 유틸 `lib/uploads.ts`: `UPLOAD_BUCKET='place-images'`, `ALLOWED_IMAGE_TYPES`(jpeg/png/webp/gif, svg 제외), `MAX_FILE_SIZE=10MB`, `MAX_FILES=5`, `uploadPhotosWithPaths`, `removeUploadedPhotos`. 검증 규칙 재사용.
- `places.photos`(text[]) 는 URL 배열 계약 — `KakaoMap`/상세가 그대로 소비. 유지 필수.

## 빌드 / 도구

- **npm** (`package-lock.json`). 환경에서 npm 이 pnpm 으로 alias 될 수 있음 → 그러면 절대경로 npm 사용(CLAUDE.md).
- 스크립트: `dev`(port 3030), `build`, `start`, `lint`(next lint), `typecheck`(tsc --noEmit), `test`(vitest run). pre-commit hook(husky)으로 typecheck·lint·test 실행됨.
- **Tailwind/shadcn 미설치**, `components.json` 없음, `components/ui/` 없음. 공개 화면은 손수 작성 CSS(`app/globals.css`, BEM 류 클래스). → `/admin` 스코프로만 Tailwind 도입, 공개 스타일 누수 금지.
- Next.js 14.2.5 App Router. `app/` 에 route handlers 존재(`robots.ts`, `sitemap.ts`, `llms.txt/route.ts`, `opengraph-image.js`) — callback route 추가 패턴 참고 가능.
- 기존 테스트: `lib/cafes.test.ts`.

## 규칙 (CLAUDE.md / 유저 스코프)

- feature 커밋·푸시는 **main 직접**. 의미 단위마다 커밋 후 `origin/main` push.
- UI 변경 전 `DESIGN.md` 먼저 읽기(공개 화면 한정으로 적용; `/admin` 은 shadcn 이지만 톤/말투는 참고).
- 새 user-data 테이블은 RLS 4정책 필수 — 단 이번엔 새 user-data 테이블을 추가하지 않음(스키마 변경 없음).
- em dash 금지(하이픈). 커밋 co-author 명시 요청 없으면 추가 금지. 긴 마크다운은 문장마다 줄바꿈.
- Server Action mutation 은 미들웨어만 믿지 말고 **각 액션에서 관리자 이메일 재검증**.
