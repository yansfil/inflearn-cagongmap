/**
 * 앱 전역에서 공유하는 카페 도메인 타입.
 *
 * 주의: 이 타입은 `docs/scope.md` 가 아니라 **실제 데이터 shape**(places 테이블 /
 * data/cafes.json)를 반영한다. scope.md 는 4단계 outlet·3단계 wifi·카공허용 필드를
 * 말하지만 실제 데이터는 단순화돼 있다(CLAUDE.md "Data schema caveat" 참고).
 */

/** 콘센트 정도. 실데이터는 many/some 만 쓰지만 라벨 매핑상 few/none 도 허용. */
export type Outlet = "many" | "some" | "few" | "none";

/** 작업 적합도. */
export type WorkFit = "good" | "ok" | "bad";

/** 소음 수준. */
export type Noise = "quiet" | "normal" | "loud";

/** places 원본 행의 wifi enum. lib/cafes 에서 boolean 으로 정규화된다. */
export type WifiEnum = "yes" | "stable" | "no";

/**
 * 클라이언트(KakaoMap 등)가 소비하는 정규화된 카페.
 * wifi 는 boolean, open_time/close_time 은 "HH:MM" 계약.
 */
export interface Cafe {
  /** places uuid — 북마크 연결에 필요 */
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  naver_place_url: string;
  open_time: string;
  close_time: string;
  is_24h: boolean;
  iced_americano_price: number | null;
  outlet: Outlet;
  wifi: boolean;
  noise: Noise;
  work_fit: WorkFit;
  tags: string[];
  photos: string[];
}

/** 리뷰 등급 (reviews.rating enum). */
export type ReviewRating = "good" | "normal" | "bad";

/** 장소별 리뷰 집계 (review_counts(place_id) RPC 반환). */
export interface ReviewCounts {
  good: number;
  normal: number;
  bad: number;
}

/** Supabase places 테이블에서 select 한 원본 행(정규화 전). */
export interface PlaceRow {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  naver_place_url: string;
  open_time: string | null;
  close_time: string | null;
  is_24h: boolean;
  iced_americano_price: number | null;
  outlet: Outlet;
  wifi: WifiEnum | null;
  noise: Noise;
  work_fit: WorkFit;
  tags: string[] | null;
  photos: string[] | null;
}
