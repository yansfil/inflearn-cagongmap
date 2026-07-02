-- 카공맵 (cagongmap) — place-images 업로드 경로 제한 강화
--
-- 기존 "place-images authenticated upload" 정책은 bucket_id 만 확인해서
-- 로그인 사용자가 버킷 어느 경로에나 올릴 수 있었다(경로 제한 없음).
-- UGC(리뷰 수정요청 / 새 장소 제보) 사진은 uploads/{auth.uid()}/... 규약으로
-- 올리므로, 본인 폴더에만 쓸 수 있도록 INSERT 정책을 교체한다.
--   경로 예: uploads/<uid>/<timestamp>-<filename>
--   foldername(name) = { 'uploads', '<uid>', ... }
--
-- 읽기: place-images 는 public 버킷이라 object URL GET 은 정책 없이 동작한다.
--       (광범위 SELECT 정책은 버킷 파일 나열을 허용해 이전에 제거했다.)

drop policy if exists "place-images authenticated upload" on storage.objects;

create policy "place-images uploads own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'place-images'
    and (storage.foldername(name))[1] = 'uploads'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
