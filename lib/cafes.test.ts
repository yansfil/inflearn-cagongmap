import { describe, expect, it } from "vitest";
import { toCafe, trimSeconds } from "./cafes";
import type { PlaceRow } from "./types";

// places 원본 행 최소 골격. 각 테스트에서 필요한 필드만 덮어쓴다.
function makeRow(overrides: Partial<PlaceRow> = {}): PlaceRow {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    name: "테스트 카페",
    address: "서울 어딘가",
    lat: 37.5,
    lng: 127.1,
    naver_place_url: "https://map.naver.com/p/entry/place/1",
    open_time: "09:00:00",
    close_time: "22:00:00",
    is_24h: false,
    iced_americano_price: 4500,
    outlet: "many",
    wifi: "yes",
    noise: "quiet",
    work_fit: "good",
    tags: ["콘센트많음"],
    photos: ["https://example.com/1.jpg"],
    ...overrides,
  };
}

describe("trimSeconds", () => {
  it("HH:MM:SS 를 HH:MM 으로 자른다", () => {
    expect(trimSeconds("09:00:00")).toBe("09:00");
  });

  it("null 은 빈 문자열로 정규화한다", () => {
    expect(trimSeconds(null)).toBe("");
  });
});

describe("toCafe", () => {
  it("wifi 'yes'/'stable' 은 true, 'no'/null 은 false 로 매핑한다", () => {
    expect(toCafe(makeRow({ wifi: "yes" })).wifi).toBe(true);
    expect(toCafe(makeRow({ wifi: "stable" })).wifi).toBe(true);
    expect(toCafe(makeRow({ wifi: "no" })).wifi).toBe(false);
    expect(toCafe(makeRow({ wifi: null })).wifi).toBe(false);
  });

  it("open/close time 의 초를 잘라낸다", () => {
    const cafe = toCafe(makeRow({ open_time: "08:30:00", close_time: "23:45:00" }));
    expect(cafe.open_time).toBe("08:30");
    expect(cafe.close_time).toBe("23:45");
  });

  it("tags/photos 가 null 이면 빈 배열로 채운다", () => {
    const cafe = toCafe(makeRow({ tags: null, photos: null }));
    expect(cafe.tags).toEqual([]);
    expect(cafe.photos).toEqual([]);
  });

  it("식별·표시 필드를 그대로 통과시킨다", () => {
    const cafe = toCafe(makeRow({ name: "나루터", outlet: "some" }));
    expect(cafe.name).toBe("나루터");
    expect(cafe.outlet).toBe("some");
  });
});
