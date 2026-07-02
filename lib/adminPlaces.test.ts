import { describe, expect, it } from "vitest";
import {
  parsePhotos,
  parsePlaceForm,
  parseTags,
  PlaceFormError,
} from "./adminPlaces";

function makeForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const base = {
    name: "테스트 카페",
    address: "서울 송파구",
    lat: "37.5",
    lng: "127.1",
    naver_place_url: " https://map.naver.com/p/entry/place/1 ",
    open_time: "09:30:00",
    close_time: "22:00",
    iced_americano_price: "4500.4",
    outlet: "many",
    wifi: "stable",
    noise: "quiet",
    work_fit: "good",
    tags: "콘센트많음, 조용함\n넓은좌석",
    photos: JSON.stringify(["https://example.com/1.jpg", 42, ""]),
  };

  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    form.set(key, value);
  }
  return form;
}

describe("parseTags", () => {
  it("쉼표와 줄바꿈을 나누고 빈 항목을 버린다", () => {
    expect(parseTags(" 콘센트많음, , 조용함\n넓은좌석 ")).toEqual([
      "콘센트많음",
      "조용함",
      "넓은좌석",
    ]);
  });
});

describe("parsePhotos", () => {
  it("JSON 문자열에서 비어있지 않은 문자열 URL만 남긴다", () => {
    expect(parsePhotos(JSON.stringify([" a.jpg ", 1, null, "", "b.jpg"])))
      .toEqual(["a.jpg", "b.jpg"]);
  });

  it("빈 값이나 깨진 JSON은 빈 배열로 정규화한다", () => {
    expect(parsePhotos("")).toEqual([]);
    expect(parsePhotos("{")).toEqual([]);
  });
});

describe("parsePlaceForm", () => {
  it("폼 값을 DB payload 형태로 정규화한다", () => {
    const payload = parsePlaceForm(makeForm({ is_24h: "on" }));

    expect(payload).toMatchObject({
      name: "테스트 카페",
      address: "서울 송파구",
      lat: 37.5,
      lng: 127.1,
      naver_place_url: "https://map.naver.com/p/entry/place/1",
      open_time: "09:30",
      close_time: "22:00",
      is_24h: true,
      iced_americano_price: 4500,
      outlet: "many",
      wifi: "stable",
      noise: "quiet",
      work_fit: "good",
      tags: ["콘센트많음", "조용함", "넓은좌석"],
      photos: ["https://example.com/1.jpg"],
    });
  });

  it("필수값과 숫자 좌표를 검증한다", () => {
    expect(() => parsePlaceForm(makeForm({ name: "" }))).toThrow(PlaceFormError);
    expect(() => parsePlaceForm(makeForm({ lat: "abc" }))).toThrow(
      "좌표(lat/lng)는 숫자여야 합니다."
    );
  });

  it("enum, 시간, 가격의 허용 범위를 검증한다", () => {
    expect(() => parsePlaceForm(makeForm({ outlet: "lots" }))).toThrow(
      "허용되지 않은 값입니다: lots"
    );
    expect(() => parsePlaceForm(makeForm({ open_time: "9:30" }))).toThrow(
      "영업시간 형식이 올바르지 않습니다: 9:30"
    );
    expect(() =>
      parsePlaceForm(makeForm({ iced_americano_price: "-1" }))
    ).toThrow("가격은 0 이상의 숫자여야 합니다.");
  });
});
