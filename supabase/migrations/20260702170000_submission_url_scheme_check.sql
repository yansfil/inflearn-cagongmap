-- 카공맵 (cagongmap) — 제보 URL 스킴 제약 (저장형 XSS 근본 차단)
--
-- place_submissions.naver_place_url 은 사용자 입력이고 클라이언트에서 anon key 로
-- 직접 insert 된다. 폼의 <input type="url"> 은 우회 가능하므로, 검증 없이 admin
-- 화면에서 <a href> 로 렌더하면 `javascript:...` URI 저장형 XSS 가 된다(관리자 세션
-- 컨텍스트 실행). 렌더 지점(lib/safeHttpUrl)에서 이미 막지만, 서버측에서도 근본적으로
-- http(s) 스킴만 저장되도록 DB check 제약을 건다(방어의 이중화 + 데이터 자체를 깨끗하게).
--
-- 기존 길이 제약(20260702160000)은 유지하고, 스킴 제약만 추가한다.

alter table public.place_submissions
  add constraint place_submissions_naver_url_scheme
    check (naver_place_url ~* '^https?://');
