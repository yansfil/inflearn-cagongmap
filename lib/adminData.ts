import "server-only";

import { requireAdmin } from "./admin";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { logger } from "./logger";
import type { PlaceRow } from "./types";

const PLACE_COLUMNS =
  "id,name,address,lat,lng,naver_place_url,open_time,close_time,is_24h,iced_americano_price,outlet,wifi,noise,work_fit,tags,photos";

/** 관리자 장소 목록 (전체, 이름순). */
export async function listPlaces(): Promise<PlaceRow[]> {
  // service_role(RLS 우회) 데이터 접근은 레이아웃 가드에만 의존하지 않고
  // 접근 지점에서 직접 관리자 재검증한다.
  const admin = await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("places")
    .select(PLACE_COLUMNS)
    .order("name");
  if (error) {
    logger.error("admin.places.list", {
      user_id: admin.id,
      outcome: "fail",
      error: error.message,
    });
    throw new Error(`장소 목록 조회 실패: ${error.message}`);
  }
  return (data ?? []) as PlaceRow[];
}

/** 단일 장소 (수정 폼용). 없으면 null. */
export async function getPlace(id: string): Promise<PlaceRow | null> {
  const admin = await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("places")
    .select(PLACE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logger.error("admin.place.get", {
      user_id: admin.id,
      place_id: id,
      outcome: "fail",
      error: error.message,
    });
    throw new Error(`장소 조회 실패: ${error.message}`);
  }
  return (data as PlaceRow | null) ?? null;
}
