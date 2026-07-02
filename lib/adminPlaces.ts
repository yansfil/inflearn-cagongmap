import type { Noise, Outlet, WifiEnum, WorkFit } from "./types";

/**
 * 장소 추가/수정 폼 데이터 파싱·검증 (순수 로직).
 *
 * Server Action 이 FormData 를 받아 이 함수로 정규화한 payload 를 만든다.
 * DB(places) 컬럼 계약에 맞춘다: 빈 문자열은 null, enum 은 허용값만, 시간은 HH:MM,
 * tags 는 쉼표 구분 배열.
 */

export const OUTLET_VALUES: Outlet[] = ["many", "some", "few", "none"];
export const WIFI_VALUES: WifiEnum[] = ["stable", "yes", "no"];
export const NOISE_VALUES: Noise[] = ["quiet", "normal", "loud"];
export const WORK_FIT_VALUES: WorkFit[] = ["good", "ok", "bad"];

export interface PlacePayload {
  name: string;
  address: string;
  lat: number;
  lng: number;
  naver_place_url: string | null;
  open_time: string | null;
  close_time: string | null;
  is_24h: boolean;
  iced_americano_price: number | null;
  outlet: Outlet | null;
  wifi: WifiEnum | null;
  noise: Noise | null;
  work_fit: WorkFit | null;
  tags: string[];
  photos: string[];
}

export class PlaceFormError extends Error {}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function optStr(v: FormDataEntryValue | null): string | null {
  const s = str(v);
  return s.length > 0 ? s : null;
}

function enumOrNull<T extends string>(
  v: FormDataEntryValue | null,
  allowed: readonly T[]
): T | null {
  const s = str(v);
  if (s.length === 0) return null;
  if (!(allowed as readonly string[]).includes(s)) {
    throw new PlaceFormError(`허용되지 않은 값입니다: ${s}`);
  }
  return s as T;
}

/** "12:00" / "12:00:00" → "12:00" (빈값은 null). */
function timeOrNull(v: FormDataEntryValue | null): string | null {
  const s = str(v);
  if (s.length === 0) return null;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    throw new PlaceFormError(`영업시간 형식이 올바르지 않습니다: ${s}`);
  }
  return s.slice(0, 5);
}

/** 쉼표/줄바꿈 구분 문자열 → 트림된 비어있지 않은 배열. */
export function parseTags(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * photos 는 hidden 필드에 JSON 문자열(URL 배열)로 담아 넘긴다.
 *
 * 주의: 파싱 실패를 조용히 [] 로 삼키면 직렬화가 깨졌을 때 "사진 없음"으로
 * 해석돼 그 장소의 모든 사진이 삭제될 수 있다. 그래서 잘못된 JSON 은
 * PlaceFormError 를 던져 저장을 막는다. (빈 문자열은 정상적인 "사진 없음".)
 */
export function parsePhotos(raw: string): string[] {
  if (!raw.trim()) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    throw new PlaceFormError("사진 데이터 형식이 올바르지 않습니다.");
  }
  if (!Array.isArray(arr)) {
    throw new PlaceFormError("사진 데이터 형식이 올바르지 않습니다.");
  }
  return arr
    .filter((u): u is string => typeof u === "string")
    .map((u) => u.trim())
    .filter((u) => u.length > 0);
}

export function parsePlaceForm(form: FormData): PlacePayload {
  const name = str(form.get("name"));
  const address = str(form.get("address"));
  if (!name) throw new PlaceFormError("이름은 필수입니다.");
  if (!address) throw new PlaceFormError("주소는 필수입니다.");

  // 빈 문자열은 Number("")===0 이라 검증을 통과해버리므로 먼저 빈 값을 거른다.
  const latRaw = str(form.get("lat"));
  const lngRaw = str(form.get("lng"));
  if (!latRaw || !lngRaw) {
    throw new PlaceFormError("좌표(lat/lng)는 필수입니다.");
  }
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new PlaceFormError("좌표(lat/lng)는 숫자여야 합니다.");
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new PlaceFormError("좌표 범위가 올바르지 않습니다(위도 -90~90, 경도 -180~180).");
  }

  const priceRaw = str(form.get("iced_americano_price"));
  let price: number | null = null;
  if (priceRaw.length > 0) {
    const n = Number(priceRaw);
    if (!Number.isFinite(n) || n < 0) {
      throw new PlaceFormError("가격은 0 이상의 숫자여야 합니다.");
    }
    price = Math.round(n);
  }

  return {
    name,
    address,
    lat,
    lng,
    naver_place_url: optStr(form.get("naver_place_url")),
    open_time: timeOrNull(form.get("open_time")),
    close_time: timeOrNull(form.get("close_time")),
    is_24h: str(form.get("is_24h")) === "on" || str(form.get("is_24h")) === "true",
    iced_americano_price: price,
    outlet: enumOrNull(form.get("outlet"), OUTLET_VALUES),
    wifi: enumOrNull(form.get("wifi"), WIFI_VALUES),
    noise: enumOrNull(form.get("noise"), NOISE_VALUES),
    work_fit: enumOrNull(form.get("work_fit"), WORK_FIT_VALUES),
    tags: parseTags(str(form.get("tags"))),
    photos: parsePhotos(str(form.get("photos"))),
  };
}
