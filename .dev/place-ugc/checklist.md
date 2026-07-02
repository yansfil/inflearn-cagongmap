# Checklist: 장소 UGC (리뷰 · 수정 요청 · 신규 제보)

> 상태: 구현 완료. 독립 verifier Pass. AC5/AC7/AC8 의 "로그인 후 실제 제출" 라운드트립만
> 카카오 OAuth 세션 필요로 Human Check 로 남음(코드·DB 경로는 검증됨).
>
> DB 발견: reviews/place_edit_requests/place_submissions/`review_counts` 함수는 원격에
> 2026-06-19 이미 적용돼 있었고 로컬 마이그레이션 파일만 없었다. 이번에 그 SQL 을
> 로컬 `supabase/migrations/` 로 복원하고, storage 경로 제한만 신규로 적용했다.
> 실제 이름: 제보 테이블 = `place_submissions`(PRD의 place_reports 아님), 컬럼 `memo`,
> 집계 함수 = `review_counts(place_id)`(get_review_counts 아님).

## Tasks

- [x] T1 `reviews` (enum + `unique(user_id,place_id)` + RLS 4정책 + `review_counts(place_id)` SECURITY DEFINER + grant) — 원격 기적용(20260619012413/113106), 로컬 복원 (req: R1, R2, R3) (ac: AC1, AC2)
- [x] T2 `place_edit_requests` (memo, RLS 4정책) — 원격 기적용(20260619012424), 로컬 복원 (req: R4) (ac: AC3)
- [x] T3 `place_submissions` (naver_place_url not null, memo) — 원격 기적용(20260619012444), 로컬 복원 (req: R5) (ac: AC3)
- [x] T4 `place-images` storage INSERT 를 `uploads/{uid}/` 경로 제한으로 교체(D3) — 신규 apply(20260702103000) (req: R6) (ac: AC4)
- [x] T5 `lib/uploads.ts`: MIME·5장·10MB 가드, `place-images` `uploads/{uid}/` 업로드, public URL (req: R6, R18) (ac: AC4, AC9)
- [x] T6 `AppStateProvider` 리뷰 상태·집계·`setReview()`(upsert/취소/롤백) + `review_counts` RPC 로드 (req: R7, R8) (ac: AC5)
- [x] T7 `PlaceDetail` good/normal/bad 리뷰 UI(집계+내 선택) + 로그인 게이팅 (req: R7, R8, R9, R17) (ac: AC5, AC6, AC10)
- [x] T8 `PlaceDetail` '정보 수정 요청' + `SubmissionForm(edit)` + 업로드/insert + 게이팅 (req: R10, R11, R12, R17) (ac: AC6, AC7, AC10)
- [x] T9 `ReportEntry`(좌측 패널 BookmarkList 아래) + `SubmissionForm(report)` URL 필수 + 업로드/insert + 게이팅 (req: R13-R17) (ac: AC6, AC8, AC10)
- [x] T10 검증: tsc/lint/advisors/playwright-cli 스모크 + 독립 verifier Pass (req: 전체) (ac: AC1-AC9)

## Acceptance Criteria

- [x] AC1 `reviews` 존재 + RLS on + 4정책, unique(user_id, place_id)
- [x] AC2 `review_counts(place_id)` 집계 반환, 개별 리뷰 행 비공개(select own RLS)
- [x] AC3 `place_edit_requests`·`place_submissions` 존재 + RLS on + 본인 정책 (원격 실제는 4정책; update/delete own 은 수용된 설계)
- [x] AC4 새 버킷 없음(place-images 1개), INSERT 정책 `uploads/{auth.uid()}/` 본인 폴더 제한
- [~] AC5 리뷰 즉시 반영·취소·이동·유지 — 로직·게이팅 검증, 로그인 후 persist 라운드트립은 Human Check
- [x] AC6 로그아웃 3액션 → 로그인 모달, insert/upload 없음 (브라우저 재현)
- [~] AC7 수정요청 pending 행 + photos URL — 코드·RLS 경로 검증, 실제 제출은 Human Check
- [~] AC8 좌측 패널 노출·URL 필수 검증 확인; 실제 place_submissions pending 행 생성은 Human Check
- [x] AC9 비이미지·5장 초과 거부 (validateFiles, pick + upload 이중 가드)
- [x] AC10 새 UI 시각적 일관 (전용 CSS, 라이브 렌더 확인; DESIGN.md 픽셀 대조는 Human)

## Human Checks

- [ ] 실제 카카오 로그인 후 리뷰 즉시 반영·새로고침 유지 확인 (AC5)
- [ ] 사진 첨부해 수정요청·신규제보 제출 → Supabase 대시보드에서 pending 행·Storage 파일 확인 (AC7, AC8)
- [ ] 새 UI 가 DESIGN.md 톤·색·간격에 부합 (AC10)
