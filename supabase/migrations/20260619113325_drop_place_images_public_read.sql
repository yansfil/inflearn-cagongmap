-- 카공맵 (cagongmap) — place-images 광범위 SELECT 정책 제거
--
-- public 버킷이라 object URL GET 은 정책 없이 동작한다. 광범위 SELECT 정책은
-- 버킷 전체 파일 나열을 허용해(advisor: public_bucket_allows_listing) 제거한다.
drop policy if exists "place-images public read" on storage.objects;
