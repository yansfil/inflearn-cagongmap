# Checklist: 관리자 운영 콘솔 (제보 처리 · 장소 관리)

## Tasks

- [ ] T1 `@supabase/ssr` 도입 - 브라우저/서버 클라이언트 헬퍼, 카카오 OAuth code flow + `app/auth/callback` 라우트, `middleware.ts` 세션 갱신, `AppStateProvider`/`KakaoLogin` 조정 (req: R1, R2) (ac: AC1)
- [ ] T2 서버 전용 env·헬퍼 - `.env.local.example` 에 `SUPABASE_SERVICE_ROLE_KEY`·`ADMIN_EMAILS` 추가, `lib/supabaseAdmin.ts`(server-only), `lib/admin.ts`(`isAdminEmail`·가드) + 단위 테스트 (req: R2, R4) (ac: AC3) (after: T1)
- [ ] T3 `/admin` 접근 보호 - 미들웨어/레이아웃에서 비관리자 차단, `app/admin/layout.tsx` (req: R3) (ac: AC2) (after: T1, T2)
- [ ] T4 Tailwind + shadcn/ui 를 `/admin` 스코프로 설정(table·dialog·form·button), 공개 화면 스타일 누수 방지 (req: R16) (ac: AC9) (after: T3)
- [ ] T5 장소 CRUD Server Action + 페이지 - `places` insert/update(관리자 재검증), `/admin/places`·`/new`·`/[id]/edit`, 모든 편집 필드 + enum 라벨 (req: R4, R10, R11, R12) (ac: AC3, AC7) (after: T4)
- [ ] T6 사진 업로드/교체/삭제 Server Action(`service_role`, 검증 재사용) + 폼 UI, `places.photos`·스토리지 동기화 (req: R4, R13, R14, R15) (ac: AC8) (after: T5)
- [ ] T7 제보 화면 `/admin/reports` - 두 표 + status 필터 + 최신순, 제보 전체 조회(service_role) (req: R4, R5, R6) (ac: AC3, AC4) (after: T4)
- [ ] T8 제보 상세 dialog - 사진·메모·URL·제보자·생성시각, 수정요청은 대상 장소 포함 (req: R7) (ac: AC5) (after: T7)
- [ ] T9 승인/반려 흐름 - 승인 시 프리필 폼 이동(신규→new, 수정요청→edit), 폼 저장 성공 시 status=approved, 반려 시 status=rejected(행 유지) (req: R8, R9) (ac: AC6) (after: T5, T6, T8)
- [ ] T10 검증 - typecheck/lint/test 통과, grep 으로 클라이언트 직접 쓰기·service_role 노출 없음, 브라우저 흐름 스모크 (req: R2, R4) (ac: AC1, AC3, AC7, AC8, AC9) (after: T9)

## Acceptance Criteria

- [ ] AC1 카카오 로그인 후 서버에서 `auth.getUser()` 가 사용자 반환, 공개 화면 기능(로그인/로그아웃·즐겨찾기·리뷰·제보) 회귀 없음
- [ ] AC2 비로그인은 `/admin` 리다이렉트, 비관리자 계정 거부, 관리자 계정 허용
- [ ] AC3 클라이언트에 `SUPABASE_SERVICE_ROLE_KEY`·제보/`places` 직접 쓰기 없음, mutation Server Action 마다 관리자 재검증 존재
- [ ] AC4 `/admin/reports` 두 종류 표 표시, status 필터 반영, 기본 최신순
- [ ] AC5 row 클릭 dialog 에 사진·메모·URL·제보자·생성시각(수정요청은 대상 장소 포함) 표시
- [ ] AC6 새 제보 승인→`/new` 프리필, 수정요청 승인→`/[id]/edit` 프리필, 저장 성공 후 status=approved(저장 전 pending), 반려 시 status=rejected 이고 행 유지
- [ ] AC7 `/admin/places` 추가 시 새 `places` 행 생성·공개 지도 반영, 수정 시 변경 필드 DB 반영
- [ ] AC8 사진 업로드 시 `places.photos`·스토리지에 반영, 삭제 시 둘 다 제거, 공개 상세 렌더 정상
- [ ] AC9 `/admin` 이 shadcn 으로 렌더, 공개 홈 시각 회귀 없음

## Human Checks

- [ ] 카카오 개발자 콘솔에 Redirect URI(`http://localhost:3030/auth/callback`) 등록 확인
- [ ] `ADMIN_EMAILS` 값 확정 및 카카오 로그인이 실제로 그 이메일을 반환하는지 확인(이메일 미제공 시 user id allowlist 로 대체 결정)
- [ ] `.env.local` 에 `SUPABASE_SERVICE_ROLE_KEY` 주입
- [ ] 공개 화면(즐겨찾기·리뷰·제보) 브라우저 회귀 확인
- [ ] 제보 dialog→승인→프리필 저장→status 전환→지도 반영 전체 흐름 확인
