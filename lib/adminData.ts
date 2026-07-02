import "server-only";

import { getSupabaseAdmin } from "./supabaseAdmin";
import type { PlaceRow } from "./types";

const PLACE_COLUMNS =
  "id,name,address,lat,lng,naver_place_url,open_time,close_time,is_24h,iced_americano_price,outlet,wifi,noise,work_fit,tags,photos";

/** 관리자 장소 목록 (전체, 이름순). */
export async function listPlaces(): Promise<PlaceRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("places")
    .select(PLACE_COLUMNS)
    .order("name");
  if (error) throw new Error(`장소 목록 조회 실패: ${error.message}`);
  return (data ?? []) as PlaceRow[];
}

/** 단일 장소 (수정 폼용). 없으면 null. */
export async function getPlace(id: string): Promise<PlaceRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("places")
    .select(PLACE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`장소 조회 실패: ${error.message}`);
  return (data as PlaceRow | null) ?? null;
}
