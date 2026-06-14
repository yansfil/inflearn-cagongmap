"use client";

import { useEffect, useRef, useState } from "react";

// 데이터의 코드값 → 한글 라벨 매핑 (KakaoMap 과 동일 규약)
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

/**
 * 마커 클릭 시 열리는 상세 패널.
 * 데스크톱: 우측 사이드 패널 / 모바일: 하단 시트 (CSS 로 분기, globals.css 참고)
 * cafe 가 null 이면 닫힌 상태.
 */
export default function PlaceDetail({ cafe, onClose }) {
  const placeId = cafe?.id ?? null;
  const photoTrackRef = useRef(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    setActivePhotoIndex(0);
    photoTrackRef.current?.scrollTo({ left: 0 });
  }, [placeId]);

  if (!cafe) return null;

  const attrs = [
    `콘센트 ${OUTLET_LABEL[cafe.outlet] ?? cafe.outlet}`,
    cafe.wifi ? "와이파이 있음" : "와이파이 없음",
    WORK_FIT_LABEL[cafe.work_fit] ?? cafe.work_fit,
    NOISE_LABEL[cafe.noise] ?? cafe.noise,
  ];

  const hours = cafe.is_24h
    ? "24시간"
    : `${cafe.open_time} - ${cafe.close_time}`;

  const photos = cafe.photos ?? [];
  const hasMultiplePhotos = photos.length > 1;

  function handlePhotoScroll(event) {
    const { clientWidth, scrollLeft } = event.currentTarget;
    if (!clientWidth || photos.length <= 1) return;

    const nextIndex = Math.min(
      photos.length - 1,
      Math.max(0, Math.round(scrollLeft / clientWidth))
    );

    setActivePhotoIndex((current) =>
      current === nextIndex ? current : nextIndex
    );
  }

  function scrollPhoto(delta) {
    if (!hasMultiplePhotos) return;

    const track = photoTrackRef.current;
    const currentIndex =
      track && track.clientWidth
        ? Math.round(track.scrollLeft / track.clientWidth)
        : activePhotoIndex;
    const nextIndex = Math.min(
      photos.length - 1,
      Math.max(0, currentIndex + delta)
    );

    if (track) {
      track.scrollTo({
        left: track.clientWidth * nextIndex,
        behavior: "auto",
      });
    }

    setActivePhotoIndex(nextIndex);
  }

  return (
    <aside className="detail" role="dialog" aria-label={`${cafe.name} 상세`}>
      <button className="detail__close" onClick={onClose} aria-label="닫기">
        ✕
      </button>

      <div className="detail__gallery">
        <div
          ref={photoTrackRef}
          className="detail__photos"
          role="region"
          aria-label={
            photos.length > 0
              ? `${cafe.name} 사진 ${photos.length}장`
              : `${cafe.name} 사진`
          }
          tabIndex={photos.length > 1 ? 0 : undefined}
          onScroll={handlePhotoScroll}
        >
          {photos.length > 0 ? (
            photos.map((url, index) => (
              <img
                key={`${url}-${index}`}
                className="detail__photo"
                src={url}
                alt={`${cafe.name} 사진 ${index + 1}`}
                loading="lazy"
              />
            ))
          ) : (
            <div className="detail__photos-empty">등록된 사진이 없습니다</div>
          )}
        </div>

        {hasMultiplePhotos && (
          <>
            <div className="detail__photo-controls" aria-label="사진 이동">
              <button
                type="button"
                className="detail__photo-nav"
                onClick={() => scrollPhoto(-1)}
                disabled={activePhotoIndex === 0}
                aria-label="이전 사진"
              >
                &lt;
              </button>
              <button
                type="button"
                className="detail__photo-nav"
                onClick={() => scrollPhoto(1)}
                disabled={activePhotoIndex === photos.length - 1}
                aria-label="다음 사진"
              >
                &gt;
              </button>
            </div>
            <span className="detail__photo-count" aria-live="polite">
              {activePhotoIndex + 1} / {photos.length}
            </span>
          </>
        )}
      </div>

      <div className="detail__body">
        <h2 className="detail__name">{cafe.name}</h2>
        {cafe.address && (
          <p className="detail__address">{cafe.address}</p>
        )}

        <ul className="detail__attrs">
          {attrs.map((a) => (
            <li key={a} className="detail__attr">
              {a}
            </li>
          ))}
        </ul>

        <p className="detail__hours">영업시간 {hours}</p>

        {typeof cafe.iced_americano_price === "number" && (
          <p className="detail__price">
            아이스 아메리카노 {cafe.iced_americano_price.toLocaleString()}원
          </p>
        )}

        {cafe.naver_place_url && (
          <a
            className="detail__link"
            href={cafe.naver_place_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            네이버에서 보기 →
          </a>
        )}
      </div>
    </aside>
  );
}
