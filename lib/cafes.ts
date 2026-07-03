import { getSupabase } from "./supabase";
import { logger } from "./logger";
import type { Cafe, PlaceRow } from "./types";

/**
 * "HH:MM:SS" → "HH:MM" (Postgres time 은 초까지 반환, 표시에는 분까지면 충분)
 */
export function trimSeconds(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

/**
 * places 한 행을 기존 cafes.json 형태로 정규화.
 * 클라이언트(KakaoMap)는 wifi:boolean, time:"HH:MM" 계약을 그대로 기대한다.
 *   - wifi enum('yes'|'stable'|'no') → boolean
 *   - open_time/close_time 초 잘라내기
 */
export function toCafe(row: PlaceRow): Cafe {
  return {
    id: row.id, // places uuid — 북마크 연결에 필요
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    naver_place_url: row.naver_place_url,
    open_time: trimSeconds(row.open_time),
    close_time: trimSeconds(row.close_time),
    is_24h: row.is_24h,
    iced_americano_price: row.iced_americano_price,
    outlet: row.outlet,
    wifi: row.wifi === "yes" || row.wifi === "stable", // 'yes'/'stable' → true, 'no'/null → false
    noise: row.noise,
    work_fit: row.work_fit,
    tags: row.tags ?? [],
    photos: row.photos ?? [],
  };
}

/**
 * Supabase places 테이블을 읽어 카페 배열을 반환한다.
 * 서버 컴포넌트에서만 호출.
 * Supabase 설정이 없으면 빈 배열을 반환(지도는 빈 상태로 그려짐).
 */
export async function getCafes(): Promise<Cafe[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  const startedAt = Date.now();
  // 외부 API 호출(Supabase DB): 공개 지도의 카페 목록 조회.
  const { data, error } = await supabase
    .from("places")
    .select(
      "id,name,address,lat,lng,naver_place_url,open_time,close_time,is_24h,iced_americano_price,outlet,wifi,noise,work_fit,tags,photos"
    )
    .order("name");

  if (error) {
    logger.error("places.list", {
      outcome: "fail",
      duration_ms: Date.now() - startedAt,
      error: error.message,
    });
    return [];
  }

  const cafes = (data as PlaceRow[]).map(toCafe);
  // 정상 조회는 상세 추적용 debug — 운영(info 이상)에서는 출력되지 않는다.
  logger.debug("places.list", {
    outcome: "ok",
    count: cafes.length,
    duration_ms: Date.now() - startedAt,
  });
  return cafes;
}
