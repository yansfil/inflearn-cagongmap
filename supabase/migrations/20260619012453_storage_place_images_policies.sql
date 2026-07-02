-- 카공맵 (cagongmap) — place-images Storage 정책 초안
--
-- 사진 업로드는 기존 place-images 버킷(public)을 재사용한다.
-- 이 마이그레이션은 초기안: 로그인 사용자면 버킷에 업로드 가능(경로 제한 없음),
-- 공개 read 정책. 경로 제한(uploads/{uid}/) 강화는 이후 마이그레이션에서 다룬다.

drop policy if exists "place-images authenticated upload" on storage.objects;
create policy "place-images authenticated upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'place-images');

drop policy if exists "place-images public read" on storage.objects;
create policy "place-images public read"
  on storage.objects for select
  using (bucket_id = 'place-images');
