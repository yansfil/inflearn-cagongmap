import "server-only";

import { requireAdmin } from "./admin";
import { getSupabaseAdmin } from "./supabaseAdmin";

/**
 * 관리자 제보 조회 (service_role, RLS 우회).
 *
 * place_submissions(새 카페 제보) / place_edit_requests(정보 수정 요청)를
 * 전체 조회하고, 제보자 이메일(auth.users)과 수정요청 대상 장소명(places)을
 * 붙여 표시용으로 만든다.
 */

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface SubmissionReport {
  id: string;
  user_id: string;
  user_email: string | null;
  naver_place_url: string;
  memo: string | null;
  photos: string[];
  status: SubmissionStatus;
  created_at: string;
}

export interface EditRequestReport {
  id: string;
  user_id: string;
  user_email: string | null;
  place_id: string;
  place_name: string | null;
  memo: string | null;
  photos: string[];
  status: SubmissionStatus;
  created_at: string;
}

/**
 * user_id → email 맵을 admin auth API 로 만든다.
 *
 * 필요한 user_id 만 getUserById 로 직접 조회한다(전체 사용자 나열 X).
 * 전체 나열은 O(전체 사용자)이고 사용자가 많으면 페이지 캡에 걸려 일부 이메일이
 * 누락됐다. 여기서는 O(제보자 수)이며 각 조회를 동시에 돌린다.
 */
async function emailMap(
  userIds: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return map;

  const supabase = getSupabaseAdmin();
  const results = await Promise.all(
    unique.map(async (id) => {
      const { data, error } = await supabase.auth.admin.getUserById(id);
      return { id, email: error ? null : data.user?.email ?? null };
    })
  );
  for (const { id, email } of results) map.set(id, email);
  return map;
}

export async function listSubmissions(): Promise<SubmissionReport[]> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("place_submissions")
    .select("id,user_id,naver_place_url,memo,photos,status,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`제보 목록 조회 실패: ${error.message}`);

  const rows = data ?? [];
  const emails = await emailMap(rows.map((r) => r.user_id));

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    user_email: emails.get(r.user_id) ?? null,
    naver_place_url: r.naver_place_url,
    memo: r.memo,
    photos: r.photos ?? [],
    status: r.status,
    created_at: r.created_at,
  }));
}

export async function listEditRequests(): Promise<EditRequestReport[]> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("place_edit_requests")
    .select("id,user_id,place_id,memo,photos,status,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`수정 요청 목록 조회 실패: ${error.message}`);

  const rows = data ?? [];
  const placeIds = Array.from(new Set(rows.map((r) => r.place_id)));

  // 이메일 조회와 대상 장소명 조회는 서로 독립적이라 동시에 돌린다.
  const [emails, places] = await Promise.all([
    emailMap(rows.map((r) => r.user_id)),
    placeIds.length > 0
      ? supabase.from("places").select("id,name").in("id", placeIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const placeNames = new Map<string, string>();
  for (const p of places.data ?? []) placeNames.set(p.id, p.name);

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    user_email: emails.get(r.user_id) ?? null,
    place_id: r.place_id,
    place_name: placeNames.get(r.place_id) ?? null,
    memo: r.memo,
    photos: r.photos ?? [],
    status: r.status,
    created_at: r.created_at,
  }));
}

export async function getEditRequest(
  id: string
): Promise<EditRequestReport | null> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("place_edit_requests")
    .select("id,user_id,place_id,memo,photos,status,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`수정 요청 조회 실패: ${error.message}`);
  if (!data) return null;
  const [emails, place] = await Promise.all([
    emailMap([data.user_id]),
    supabase.from("places").select("name").eq("id", data.place_id).maybeSingle(),
  ]);
  return {
    id: data.id,
    user_id: data.user_id,
    user_email: emails.get(data.user_id) ?? null,
    place_id: data.place_id,
    place_name: place.data?.name ?? null,
    memo: data.memo,
    photos: data.photos ?? [],
    status: data.status,
    created_at: data.created_at,
  };
}

export async function getSubmission(
  id: string
): Promise<SubmissionReport | null> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("place_submissions")
    .select("id,user_id,naver_place_url,memo,photos,status,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`제보 조회 실패: ${error.message}`);
  if (!data) return null;
  const emails = await emailMap([data.user_id]);
  return {
    id: data.id,
    user_id: data.user_id,
    user_email: emails.get(data.user_id) ?? null,
    naver_place_url: data.naver_place_url,
    memo: data.memo,
    photos: data.photos ?? [],
    status: data.status,
    created_at: data.created_at,
  };
}
