-- 카공맵 (cagongmap) — place-images 버킷 서버측 업로드 제약
--
-- 지금까지 10MB·이미지 MIME 제한은 클라이언트 가드(lib/uploads validateFiles)에만
-- 있었다. anon key 로 storage API 를 직접 호출하면 이 가드를 우회할 수 있으므로,
-- 버킷 자체에 서버측 상한을 건다(초과/비이미지 업로드는 스토리지가 거부).
--   - file_size_limit: 10MB (lib/uploads MAX_FILE_SIZE 와 일치)
--   - allowed_mime_types: jpeg/png/webp/gif (svg 는 스크립트 위험으로 제외)

update storage.buckets
set file_size_limit = 10485760,  -- 10 * 1024 * 1024
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'place-images';
