"use client";

import { useEffect, useRef, useState } from "react";
import PlaceDetail from "./PlaceDetail";

// 마커용 커스텀 오버레이 HTML.
// 대표 사진이 있으면 원형 썸네일, 없으면 기본 핀 느낌의 점 마커.
function buildMarkerContent(cafe) {
  const thumb = cafe.photos?.[0];
  const wrap = document.createElement("div");
  wrap.className = "marker";
  wrap.title = cafe.name;

  if (thumb) {
    wrap.classList.add("marker--photo");
    const img = document.createElement("img");
    img.className = "marker__img";
    img.src = thumb;
    img.alt = cafe.name;
    wrap.appendChild(img);
  } else {
    wrap.classList.add("marker--pin");
  }

  return wrap;
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
  const [selected, setSelected] = useState(null);

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

        const bounds = new kakao.maps.LatLngBounds();

        cafes.forEach((cafe) => {
          const position = new kakao.maps.LatLng(cafe.lat, cafe.lng);
          bounds.extend(position);

          const content = buildMarkerContent(cafe);
          content.addEventListener("click", () => setSelected(cafe));

          const overlay = new kakao.maps.CustomOverlay({
            map,
            position,
            content,
            yAnchor: 1,
          });
          // (overlay 는 map 에 바로 표시됨)
          void overlay;
        });

        // 지도 클릭(빈 곳) 시 상세 패널 닫기
        kakao.maps.event.addListener(map, "click", () => setSelected(null));

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

  return (
    <div className="map-wrap">
      <div id="map" ref={containerRef} />
      <PlaceDetail cafe={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
