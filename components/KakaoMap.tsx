"use client";

import { useEffect, useRef, useState } from "react";
import type { Cafe } from "../lib/types";
import PlaceDetail from "./PlaceDetail";
import KakaoLogin from "./KakaoLogin";
import BookmarkList from "./BookmarkList";
import LoginPrompt from "./LoginPrompt";
import { AppStateProvider } from "./AppStateProvider";

// 마커용 커스텀 오버레이 HTML.
// 대표 사진이 있으면 원형 썸네일, 없으면 기본 핀 느낌의 점 마커.
function buildMarkerContent(cafe: Cafe): HTMLElement {
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
function loadKakaoSdk(appKey: string): Promise<typeof kakao> {
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

interface KakaoMapProps {
  cafes: Cafe[];
  appKey: string;
}

export default function KakaoMap({ cafes, appKey }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerElsRef = useRef<HTMLElement[]>([]);
  const selectedRef = useRef<Cafe | null>(null);
  const [selected, setSelected] = useState<Cafe | null>(null);

  // 선택된 카페 마커에만 marker--selected 토글
  function applySelected(cafe: Cafe | null) {
    const id = cafe ? String(cafe.id ?? cafe.name) : null;
    markerElsRef.current.forEach((el) => {
      el.classList.toggle("marker--selected", el.dataset.cafeId === id);
    });
  }

  // 선택 변경 시 마커 강조 갱신 (지도 재생성 없이)
  useEffect(() => {
    selectedRef.current = selected;
    applySelected(selected);
  }, [selected]);

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
        const markerEls: HTMLElement[] = [];

        cafes.forEach((cafe) => {
          const position = new kakao.maps.LatLng(cafe.lat, cafe.lng);
          bounds.extend(position);

          const content = buildMarkerContent(cafe);
          content.dataset.cafeId = String(cafe.id ?? cafe.name);
          content.addEventListener("click", () => setSelected(cafe));
          markerEls.push(content);

          const overlay = new kakao.maps.CustomOverlay({
            map,
            position,
            content,
            yAnchor: 1,
          });
          // (overlay 는 map 에 바로 표시됨)
          void overlay;
        });

        // 선택 상태를 마커 엘리먼트에 반영 (DESIGN.md: 선택만 primary 강조)
        markerElsRef.current = markerEls;
        applySelected(selectedRef.current);

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
    <AppStateProvider>
      <div className="map-wrap">
        <div id="map" ref={containerRef} />

        {/* 좌측 패널: 지도 탐색을 시작하고 개인 상태로 들어가는 entrance.
            DESIGN.md Left Panel — 브랜드 + 로그인 + 북마크 */}
        <aside className="left-panel">
          <p className="left-panel__eyebrow">WORK CAFE MAP</p>
          <h1 className="left-panel__title">카공맵</h1>
          <p className="left-panel__sub">
            오래 앉아 작업하기 좋은 카페 {cafes.length}곳
          </p>
          <div className="left-panel__auth">
            <KakaoLogin />
          </div>
          <BookmarkList cafes={cafes} onSelect={setSelected} />
        </aside>

        <PlaceDetail cafe={selected} onClose={() => setSelected(null)} />

        {/* 비로그인 사용자가 북마크를 누르면 뜨는 로그인 안내 모달 */}
        <LoginPrompt />
      </div>
    </AppStateProvider>
  );
}
