"use client";

import { useEffect, useRef } from "react";

// 데이터의 코드값 → 한글 라벨 매핑
const OUTLET_LABEL = {
  many: "많음",
  some: "보통",
  few: "적음",
  none: "없음",
};

const WORK_FIT_LABEL = {
  good: "작업 좋음",
  ok: "작업 무난",
  bad: "작업 부적합",
};

const NOISE_LABEL = {
  quiet: "조용함",
  normal: "보통",
  loud: "시끄러움",
};

// 인포윈도우에 들어갈 HTML 문자열 생성
function buildInfoContent(cafe) {
  const attrs = [
    `콘센트 ${OUTLET_LABEL[cafe.outlet] ?? cafe.outlet}`,
    cafe.wifi ? "와이파이 있음" : "와이파이 없음",
    WORK_FIT_LABEL[cafe.work_fit] ?? cafe.work_fit,
    NOISE_LABEL[cafe.noise] ?? cafe.noise,
  ].join(" · ");

  const hours = cafe.is_24h
    ? "24시간"
    : `${cafe.open_time} - ${cafe.close_time}`;

  const link = cafe.naver_place_url
    ? `<a class="iw__link" href="${cafe.naver_place_url}" target="_blank" rel="noopener noreferrer">네이버에서 보기 →</a>`
    : "";

  return `
    <div class="iw">
      <div class="iw__name">${cafe.name}</div>
      <div class="iw__attrs">${attrs}</div>
      <div class="iw__hours">영업시간 ${hours}</div>
      ${link}
    </div>
  `;
}

// 카카오 SDK 스크립트를 한 번만 로드 (autoload=false 로 수동 init)
function loadKakaoSdk(appKey) {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) {
      resolve(window.kakao);
      return;
    }

    const existing = document.getElementById("kakao-map-sdk");
    if (existing) {
      existing.addEventListener("load", () =>
        window.kakao.maps.load(() => resolve(window.kakao))
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    script.onerror = () =>
      reject(new Error("카카오맵 SDK 로드에 실패했습니다."));
    document.head.appendChild(script);
  });
}

export default function KakaoMap({ cafes, appKey }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    loadKakaoSdk(appKey)
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;

        // 초기 중심: 데이터가 몰린 잠실/송파 일대
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(37.508, 127.1),
          level: 6,
        });

        // 한 번에 하나의 인포윈도우만 열리도록 공유
        const infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });
        const bounds = new kakao.maps.LatLngBounds();

        cafes.forEach((cafe) => {
          const position = new kakao.maps.LatLng(cafe.lat, cafe.lng);
          bounds.extend(position);

          const marker = new kakao.maps.Marker({ map, position, title: cafe.name });

          kakao.maps.event.addListener(marker, "click", () => {
            infowindow.setContent(buildInfoContent(cafe));
            infowindow.open(map, marker);
          });
        });

        // 지도 클릭 시 인포윈도우 닫기
        kakao.maps.event.addListener(map, "click", () => infowindow.close());

        // 모든 마커가 한눈에 들어오도록 범위 맞춤
        if (cafes.length > 0) {
          map.setBounds(bounds);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
      });

    return () => {
      cancelled = true;
    };
  }, [cafes, appKey]);

  return <div id="map" ref={containerRef} />;
}
