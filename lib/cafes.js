import { getSupabase } from "./supabase";

/**
 * "HH:MM:SS" → "HH:MM" (Postgres time 은 초까지 반환, 표시에는 분까지면 충분)
 */
function trimSeconds(t) {
  if (!t) return t;
  return t.slice(0, 5);
}

/**
 * places 한 행을 기존 cafes.json 형태로 정규화.
 * 클라이언트(KakaoMap)는 wifi:boolean, time:"HH:MM" 계약을 그대로 기대한다.
 *   - wifi enum('yes'|'stable'|'no') → boolean
 *   - open_time/close_time 초 잘라내기
 */
function toCafe(row) {
  return {
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
    wifi: row.wifi !== "no", // 'yes'/'stable' → true, 'no'/null → false
    noise: row.noise,
    work_fit: row.work_fit,
    tags: row.tags ?? [],
  };
}

/**
 * Supabase places 테이블을 읽어 카페 배열을 반환한다.
 * 서버 컴포넌트에서만 호출.
 * Supabase 설정이 없으면 빈 배열을 반환(지도는 빈 상태로 그려짐).
 */
export async function getCafes() {
  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("places")
    .select(
      "name,address,lat,lng,naver_place_url,open_time,close_time,is_24h,iced_americano_price,outlet,wifi,noise,work_fit,tags"
    )
    .order("name");

  if (error) {
    // eslint-disable-next-line no-console
    console.error("places 조회 실패:", error.message);
    return [];
  }

  return data.map(toCafe);
}
