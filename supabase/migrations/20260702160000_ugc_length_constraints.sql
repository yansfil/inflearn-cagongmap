-- 카공맵 (cagongmap) — UGC 서버측 길이 제한 (남용/저장소 남용 방지)
--
-- 사용자 제보(place_submissions)·수정요청(place_edit_requests)은 클라이언트에서
-- anon key 로 직접 insert 한다. 클라이언트 폼 가드는 우회 가능하므로(직접 REST 호출),
-- 서버측 유일 방어선인 DB check 제약으로 자유 텍스트 길이 상한을 강제한다.
--   - memo: 최대 1000자 (null 허용)
--   - naver_place_url: 최대 2048자 (URL 상한, submissions 만 해당 컬럼 보유)
--   - photos 배열: 최대 5장 (업로드 가드와 동일; 배열에 URL 만 무제한 담는 것 차단)
--
-- 제약 위반 insert 는 RLS 통과 여부와 무관하게 거부된다.

-- place_submissions
alter table public.place_submissions
  add constraint place_submissions_memo_len
    check (memo is null or char_length(memo) <= 1000),
  add constraint place_submissions_naver_url_len
    check (char_length(naver_place_url) <= 2048),
  add constraint place_submissions_photos_max
    check (array_length(photos, 1) is null or array_length(photos, 1) <= 5);

-- place_edit_requests
alter table public.place_edit_requests
  add constraint place_edit_requests_memo_len
    check (memo is null or char_length(memo) <= 1000),
  add constraint place_edit_requests_photos_max
    check (array_length(photos, 1) is null or array_length(photos, 1) <= 5);
