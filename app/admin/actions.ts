"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../lib/admin";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";
import { parsePlaceForm } from "../../lib/adminPlaces";
import {
  UPLOAD_BUCKET,
  UploadError,
  validateFiles,
  uploadFilesToPrefix,
} from "../../lib/uploads";

/**
 * 관리자 운영 콘솔의 데이터 변경 Server Action 모음.
 *
 * 규칙(모든 액션 공통):
 *  - 첫 줄에서 requireAdmin() 으로 서버에서 관리자 재검증(미들웨어와 무관하게 방어).
 *  - 쓰기는 service_role(getSupabaseAdmin) 로 수행해 RLS 를 우회한다.
 *  - 클라이언트는 이 액션만 호출하고, Supabase 를 직접 쓰지 않는다.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** 새 장소 추가. 성공 시 목록으로 리다이렉트. submissionId 가 있으면 제보를 approved 로. */
export async function createPlaceAction(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  await requireAdmin();

  let payload;
  try {
    payload = parsePlaceForm(form);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const submissionId = (form.get("submission_id") as string) || null;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("places")
    .insert({ ...payload, verified_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: `장소 추가 실패: ${error.message}` };
  }

  // 제보에서 넘어온 경우: 해당 제보를 approved 로 (저장 성공 시점에만).
  // 이 UPDATE 가 실패하면 place 는 생겼는데 제보는 pending 으로 남아 재승인 시
  // 장소가 중복 생성될 수 있으므로, 실패를 삼키지 않고 관리자에게 알린다.
  if (submissionId) {
    const { error: subErr } = await supabase
      .from("place_submissions")
      .update({ status: "approved" })
      .eq("id", submissionId);
    if (subErr) {
      return {
        ok: false,
        error: `장소는 추가됐지만 제보 승인 처리에 실패했습니다(중복 승인 주의): ${subErr.message}`,
      };
    }
    // 제보 목록 캐시를 무효화해 돌아왔을 때 승인 상태가 반영되게 한다.
    revalidatePath("/admin/reports");
  }

  revalidatePath("/admin/places");
  revalidatePath("/");
  redirect(`/admin/places?created=${data.id}`);
}

/** 기존 장소 수정. editRequestId 가 있으면 저장 성공 시 그 수정요청을 approved 로. */
export async function updatePlaceAction(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const id = (form.get("id") as string) || "";
  if (!id) return { ok: false, error: "장소 id 가 없습니다." };

  let payload;
  try {
    payload = parsePlaceForm(form);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const editRequestId = (form.get("edit_request_id") as string) || null;
  const supabase = getSupabaseAdmin();

  // 삭제/교체된 관리자 사진 정리를 위해 기존 photos 를 먼저 읽는다.
  // 이 읽기가 실패하면 cleanup 이 빈 배열을 받아 지운 사진의 스토리지 객체가
  // 고아로 남으므로, 실패 시 수정 자체를 진행하지 않고 중단한다.
  const { data: existing, error: readErr } = await supabase
    .from("places")
    .select("photos")
    .eq("id", id)
    .maybeSingle();

  if (readErr) {
    return { ok: false, error: `기존 장소 조회 실패: ${readErr.message}` };
  }

  const { error } = await supabase
    .from("places")
    .update({ ...payload, verified_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, error: `장소 수정 실패: ${error.message}` };
  }

  await cleanupRemovedPhotos(
    supabase,
    (existing?.photos as string[] | null) ?? [],
    payload.photos
  );

  if (editRequestId) {
    const { error: reqErr } = await supabase
      .from("place_edit_requests")
      .update({ status: "approved" })
      .eq("id", editRequestId);
    if (reqErr) {
      return {
        ok: false,
        error: `장소는 수정됐지만 수정 요청 승인 처리에 실패했습니다: ${reqErr.message}`,
      };
    }
    revalidatePath("/admin/reports");
  }

  revalidatePath("/admin/places");
  // 방금 수정한 장소의 편집 페이지 캐시를 무효화한다.
  // (안 하면 다시 "수정" 진입 시 Router Cache 가 이전 값을 보여줘 새로고침 전까지 stale)
  revalidatePath(`/admin/places/${id}/edit`);
  revalidatePath("/");
  redirect(`/admin/places?updated=${id}`);
}

/**
 * place-images public URL 에서 스토리지 객체 경로를 뽑는다.
 * 예: https://<proj>.supabase.co/storage/v1/object/public/place-images/places/<id>/x.jpg
 *     → places/<id>/x.jpg  (place-images 버킷 소속 URL 만 대상)
 */
function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${UPLOAD_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const path = url.slice(i + marker.length).split("?")[0];
  // 관리자 업로드 경로(places/)만 정리 대상으로 삼는다(사용자 uploads/ 는 건드리지 않음).
  return path.startsWith("places/") ? decodeURIComponent(path) : null;
}

/** oldPhotos 중 newPhotos 에 없는 관리자 업로드 사진을 스토리지에서 지운다. */
async function cleanupRemovedPhotos(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  oldPhotos: string[],
  newPhotos: string[]
): Promise<void> {
  const kept = new Set(newPhotos);
  const removedPaths = oldPhotos
    .filter((u) => !kept.has(u))
    .map(storagePathFromUrl)
    .filter((p): p is string => p !== null);
  if (removedPaths.length > 0) {
    await supabase.storage.from(UPLOAD_BUCKET).remove(removedPaths);
  }
}

export interface UploadResult {
  ok: boolean;
  urls?: string[];
  error?: string;
}

/** 제보 반려: status=rejected 로만 바꾸고 행은 남긴다(삭제 없음). */
export async function rejectSubmissionAction(
  id: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("place_submissions")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) return { ok: false, error: `반려 실패: ${error.message}` };
  revalidatePath("/admin/reports");
  return { ok: true };
}

/** 수정 요청 반려: status=rejected 로만 바꾸고 행은 남긴다. */
export async function rejectEditRequestAction(
  id: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("place_edit_requests")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) return { ok: false, error: `반려 실패: ${error.message}` };
  revalidatePath("/admin/reports");
  return { ok: true };
}

/**
 * 관리자 장소 사진 업로드.
 *
 * service_role 로 place-images 버킷의 places/{uuid}/ 경로에 올린다(개인
 * uploads/{uid}/ 경로 제약과 무관). public 버킷이라 반환 URL 을 places.photos 에
 * 그대로 담는다. 검증(MIME/용량/장수)·업로드·부분 실패 정리는 lib/uploads 의
 * validateFiles / uploadFilesToPrefix 를 재사용한다(사용자 업로드와 동일 규칙).
 */
export async function uploadAdminPhotosAction(
  form: FormData
): Promise<UploadResult> {
  await requireAdmin();

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return { ok: false, error: "선택된 파일이 없습니다." };

  const supabase = getSupabaseAdmin();
  try {
    validateFiles(files);
    const uploaded = await uploadFilesToPrefix(
      supabase,
      `places/${crypto.randomUUID()}`,
      files
    );
    return { ok: true, urls: uploaded.map((u) => u.url) };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof UploadError ? e.message : `사진 업로드 실패: ${(e as Error).message}`,
    };
  }
}
