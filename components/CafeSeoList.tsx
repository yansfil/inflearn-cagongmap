import type { Cafe } from "../lib/types";
import {
  OUTLET_LABEL,
  NOISE_LABEL,
  WORK_FIT_LABEL,
  formatHours,
  formatPrice,
} from "../lib/labels";

/**
 * 크롤러/AI/스크린리더용 서버 렌더 카페 리스트.
 *
 * 왜 필요한가: 모든 카페 정보(이름·주소·속성)가 KakaoMap(클라이언트 컴포넌트)
 * 마커 안에만 있어 크롤 가능한 HTML 텍스트로 노출되지 않는다. 이 컴포넌트는
 * 같은 데이터를 시맨틱 HTML 로 서버 렌더한다.
 *
 * DESIGN.md 는 "후보 카페 리스트를 화면에 다시 쌓지 말 것"(map-first)을
 * 요구하므로, 이 리스트는 .sr-only 로 시각적으로 숨긴다. display:none 이 아니라
 * 화면 밖 배치라 클로킹이 아니며(같은 사실을 노출), 접근성 트리에 남는다.
 */
export default function CafeSeoList({ cafes }: { cafes: Cafe[] }) {
  if (cafes.length === 0) return null;

  return (
    <section className="sr-only" aria-label="노트북 작업하기 좋은 카페 목록">
      <h2>노트북 작업(카공)하기 좋은 카페 {cafes.length}곳</h2>
      <p>
        콘센트·와이파이·소음·작업 적합도를 확인해 오래 앉아 작업하기 좋은 카페만
        등록합니다. 현재 서울 송파구·강남구 일대를 다룹니다.
      </p>
      <ul>
        {cafes.map((cafe) => (
          <li key={cafe.id ?? cafe.name}>
            <h3>{cafe.name}</h3>
            <p>주소: {cafe.address}</p>
            <p>영업시간: {formatHours(cafe)}</p>
            {formatPrice(cafe.iced_americano_price) && (
              <p>아이스 아메리카노: {formatPrice(cafe.iced_americano_price)}</p>
            )}
            <p>콘센트: {OUTLET_LABEL[cafe.outlet]}</p>
            <p>와이파이: {cafe.wifi ? "제공" : "확인 필요"}</p>
            <p>소음: {NOISE_LABEL[cafe.noise]}</p>
            <p>작업 적합도: {WORK_FIT_LABEL[cafe.work_fit]}</p>
            {cafe.tags.length > 0 && <p>특징: {cafe.tags.join(", ")}</p>}
            <p>
              <a href={cafe.naver_place_url}>{cafe.name} 네이버 지도에서 보기</a>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
