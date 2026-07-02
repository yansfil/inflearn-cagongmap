import type { Cafe } from "./types";
import { OUTLET_LABEL, formatHours, formatPrice } from "./labels";

const SITE_URL = "https://cagongmap.xyz";

/**
 * 사이트 정체성 그래프(WebSite + Organization).
 * 정적이므로 layout 에서 렌더한다.
 * 내부 검색 엔드포인트가 없으므로 SearchAction 은 넣지 않는다.
 */
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "카공맵",
        description: "콘센트·와이파이·작업 적합도로 카페를 지도에서 찾는 서비스",
        inLanguage: "ko-KR",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "카공맵",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/opengraph-image`,
        },
      },
    ],
  };
}

/** "HH:MM" → "HH:MM" 그대로. schema opens/closes 는 24h 이면 00:00-23:59. */
function openingHours(cafe: Cafe) {
  if (cafe.is_24h) {
    return { "@type": "OpeningHoursSpecification", opens: "00:00", closes: "23:59" };
  }
  if (!cafe.open_time || !cafe.close_time) return undefined;
  return {
    "@type": "OpeningHoursSpecification",
    opens: cafe.open_time,
    closes: cafe.close_time,
  };
}

/**
 * 카페 목록을 ItemList<CafeOrCoffeeShop> JSON-LD 로 변환.
 * data/places 에 실제로 있는 필드만 사용한다(리뷰/평점/전화 등 없는 값은 넣지 않음).
 */
export function cafeItemList(cafes: Cafe[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "노트북 작업하기 좋은 카페",
    numberOfItems: cafes.length,
    itemListElement: cafes.map((cafe, i) => {
      const item: Record<string, unknown> = {
        "@type": "CafeOrCoffeeShop",
        name: cafe.name,
        address: {
          "@type": "PostalAddress",
          streetAddress: cafe.address,
          addressCountry: "KR",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: cafe.lat,
          longitude: cafe.lng,
        },
        url: cafe.naver_place_url,
        amenityFeature: [
          {
            "@type": "LocationFeatureSpecification",
            name: OUTLET_LABEL[cafe.outlet],
            value: true,
          },
          {
            "@type": "LocationFeatureSpecification",
            name: "무선 인터넷(Wi-Fi)",
            value: cafe.wifi,
          },
        ],
      };

      const hours = openingHours(cafe);
      if (hours) item.openingHoursSpecification = hours;

      const price = formatPrice(cafe.iced_americano_price);
      if (price) item.priceRange = price;

      if (cafe.photos?.length) item.image = cafe.photos;

      return {
        "@type": "ListItem",
        position: i + 1,
        item,
      };
    }),
  };
}

export { formatHours };
