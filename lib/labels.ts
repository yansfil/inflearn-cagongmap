import type { Cafe, Noise, Outlet, WorkFit } from "./types";

/**
 * 카페 코드 값 → 한국어 라벨 매핑.
 * 지금까지 라벨은 KakaoMap 마커/상세 UI 안에만 있어 크롤 불가능했다.
 * 서버 렌더 텍스트(접근성/SEO 리스트)와 JSON-LD 에서 공용으로 쓰기 위해 분리한다.
 */
export const OUTLET_LABEL: Record<Outlet, string> = {
  many: "콘센트 많음",
  some: "콘센트 보통",
  few: "콘센트 적음",
  none: "콘센트 없음",
};

export const NOISE_LABEL: Record<Noise, string> = {
  quiet: "조용함",
  normal: "보통",
  loud: "시끄러움",
};

export const WORK_FIT_LABEL: Record<WorkFit, string> = {
  good: "작업하기 좋음",
  ok: "작업 무난함",
  bad: "작업 부적합",
};

/** "12:00"~"00:00" 같은 영업시간 문자열. is_24h 면 24시간. */
export function formatHours(cafe: Cafe): string {
  if (cafe.is_24h) return "24시간 영업";
  if (!cafe.open_time || !cafe.close_time) return "영업시간 정보 없음";
  return `${cafe.open_time} - ${cafe.close_time}`;
}

/** "₩4,800" 형태. 없으면 빈 문자열. */
export function formatPrice(price: number | null): string {
  if (price == null) return "";
  return `₩${price.toLocaleString("ko-KR")}`;
}

/**
 * 한 카페를 한 문장으로 요약한다(AI 인용/크롤러용).
 * 예: "나루터는 서울 송파구 …에 있는 콘센트 많음·조용함 노트북 작업 카페입니다."
 */
export function cafeSentence(cafe: Cafe): string {
  const parts = [OUTLET_LABEL[cafe.outlet], NOISE_LABEL[cafe.noise]].filter(
    Boolean
  );
  const wifi = cafe.wifi ? "와이파이 제공" : "";
  const signals = [...parts, wifi].filter(Boolean).join("·");
  return `${cafe.name}은(는) ${cafe.address}에 있는 ${signals} 노트북 작업(카공) 카페입니다. 영업시간은 ${formatHours(
    cafe
  )}이며, ${WORK_FIT_LABEL[cafe.work_fit]}으로 평가되었습니다.`;
}
