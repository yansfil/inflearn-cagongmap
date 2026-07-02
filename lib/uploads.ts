import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 사용자 업로드 사진을 기존 `place-images` 버킷의 `uploads/{uid}/` 경로에 올린다.
 *
 * - 버킷은 public 이라 업로드 후 얻는 public URL 을 그대로 places.photos 규약
 *   (URL 배열)에 넣을 수 있다.
 * - storage RLS 가 `uploads/{auth.uid()}/...` 본인 폴더만 INSERT 허용하므로
 *   경로 규약(BUCKET/uploads/{uid}/{timestamp}-{name})을 반드시 지킨다.
 * - 클라이언트 가드: 이미지 MIME 만, 파일당 용량 상한, 개수 상한.
 */

export const UPLOAD_BUCKET = "place-images";

/** 이미지 MIME 만 허용 (svg 는 스크립트 위험이 있어 제외) */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** 파일당 용량 상한 (10MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** 한 번에 올릴 수 있는 최대 장수 */
export const MAX_FILES = 5;

export class UploadError extends Error {}

export interface UploadedPhoto {
  path: string;
  url: string;
}

/**
 * 선택된 파일들을 업로드 전에 검사한다. 문제가 있으면 UploadError 를 던진다.
 * (폼에서 제출 전에 호출해 사용자에게 사유를 보여줄 수 있다.)
 */
export function validateFiles(files: File[]): void {
  if (files.length > MAX_FILES) {
    throw new UploadError(`사진은 최대 ${MAX_FILES}장까지 올릴 수 있습니다.`);
  }
  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      throw new UploadError("이미지 파일(jpg, png, webp, gif)만 올릴 수 있습니다.");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new UploadError("사진 한 장은 10MB 이하만 올릴 수 있습니다.");
    }
  }
}

/** 파일명에서 경로에 안전한 확장자만 남긴다. */
function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const rand = Math.random().toString(36).slice(2, 8);
  return ext ? `${Date.now()}-${rand}.${ext}` : `${Date.now()}-${rand}`;
}

/**
 * 파일들을 uploads/{userId}/ 아래에 올리고 public URL 배열을 반환한다.
 * 하나라도 실패하면 UploadError 를 던진다(부분 성공은 호출부에서 무시 가능).
 */
export async function uploadPhotos(
  supabase: SupabaseClient,
  userId: string,
  files: File[]
): Promise<string[]> {
  const uploaded = await uploadPhotosWithPaths(supabase, userId, files);
  return uploaded.map((photo) => photo.url);
}

export async function uploadPhotosWithPaths(
  supabase: SupabaseClient,
  userId: string,
  files: File[]
): Promise<UploadedPhoto[]> {
  validateFiles(files);

  const uploaded: UploadedPhoto[] = [];
  for (const file of files) {
    const path = `uploads/${userId}/${safeName(file.name)}`;
    const { error } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      await removeUploadedPhotos(
        supabase,
        uploaded.map((photo) => photo.path)
      );
      throw new UploadError(`사진 업로드에 실패했습니다: ${error.message}`);
    }
    const { data } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
    uploaded.push({ path, url: data.publicUrl });
  }
  return uploaded;
}

export async function removeUploadedPhotos(
  supabase: SupabaseClient,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(UPLOAD_BUCKET).remove(paths);
  if (error) {
    // eslint-disable-next-line no-console
    console.error("업로드된 사진 정리 실패:", error.message);
  }
}
