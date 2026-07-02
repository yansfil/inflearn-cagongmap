import "server-only";

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

/** user_id → email 맵을 admin auth API 로 만든다(제보 건수 규모상 전체 나열로 충분). */
async function emailMap(
  userIds: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return map;

  const supabase = getSupabaseAdmin();
  // listUsers 페이지네이션: 제보자 수가 적어 첫 페이지(기본 50)로 충분하나,
  // 안전하게 몇 페이지 돈다.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (unique.includes(u.id)) map.set(u.id, u.email ?? null);
    }
    if (data.users.length < 200) break;
  }
  return map;
}

export async function listSubmissions(): Promise<SubmissionReport[]> {
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
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("place_edit_requests")
    .select("id,user_id,place_id,memo,photos,status,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`수정 요청 목록 조회 실패: ${error.message}`);

  const rows = data ?? [];
  const emails = await emailMap(rows.map((r) => r.user_id));

  // 대상 장소명 매핑
  const placeIds = Array.from(new Set(rows.map((r) => r.place_id)));
  const placeNames = new Map<string, string>();
  if (placeIds.length > 0) {
    const { data: places } = await supabase
      .from("places")
      .select("id,name")
      .in("id", placeIds);
    for (const p of places ?? []) placeNames.set(p.id, p.name);
  }

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
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("place_edit_requests")
    .select("id,user_id,place_id,memo,photos,status,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`수정 요청 조회 실패: ${error.message}`);
  if (!data) return null;
  const emails = await emailMap([data.user_id]);
  const { data: place } = await supabase
    .from("places")
    .select("name")
    .eq("id", data.place_id)
    .maybeSingle();
  return {
    id: data.id,
    user_id: data.user_id,
    user_email: emails.get(data.user_id) ?? null,
    place_id: data.place_id,
    place_name: place?.name ?? null,
    memo: data.memo,
    photos: data.photos ?? [],
    status: data.status,
    created_at: data.created_at,
  };
}

export async function getSubmission(
  id: string
): Promise<SubmissionReport | null> {
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
