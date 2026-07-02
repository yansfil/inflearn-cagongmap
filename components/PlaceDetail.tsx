"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Cafe, Noise, Outlet, ReviewRating, WorkFit } from "../lib/types";
import { useAppState } from "./AppStateProvider";
import SubmissionForm from "./SubmissionForm";
import { safeHttpUrl } from "../lib/safeUrl";

// 리뷰 등급 표시용 (버튼 라벨 + 이모지). DESIGN: 큰 색 배지 금지, 선택만 강조.
const REVIEW_OPTIONS: { rating: ReviewRating; icon: string; label: string }[] = [
  { rating: "good", icon: "👍", label: "좋아요" },
  { rating: "normal", icon: "🤔", label: "보통" },
  { rating: "bad", icon: "👎", label: "별로" },
];

// 데이터의 코드값 → 한글 라벨 매핑 (KakaoMap 과 동일 규약)
const OUTLET_LABEL: Record<Outlet, string> = {
  many: "많음",
  some: "보통",
  few: "적음",
  none: "없음",
};

const WORK_FIT_LABEL: Record<WorkFit, string> = {
  good: "작업 좋음",
  ok: "작업 무난",
  bad: "작업 부적합",
};

const NOISE_LABEL: Record<Noise, string> = {
  quiet: "조용함",
  normal: "보통",
  loud: "시끄러움",
};

// Quick Check fact card 한 칸.
// positive=true 이면 pastel-mint 배경 + positive-text (좋은 조건 전용),
// 그 외에는 neutral surface-container + primary 아이콘.
interface Fact {
  icon: string;
  label: string;
  value: ReactNode;
  positive?: boolean;
}

function FactCard({ icon, label, value, positive = false }: Fact) {
  return (
    <li className={`fact${positive ? " fact--positive" : ""}`}>
      <span className="fact__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="fact__text">
        <span className="fact__label">{label}</span>
        <span className="fact__value">{value}</span>
      </span>
    </li>
  );
}

/**
 * 마커 클릭 시 열리는 상세 패널.
 * 데스크톱: 우측 사이드 패널 / 모바일: 하단 시트 (CSS 로 분기, globals.css 참고)
 * cafe 가 null 이면 닫힌 상태.
 *
 * 구성 순서(DESIGN.md Detail Panel):
 *   Hero image → 주소 → 카페명 → 지도에서 보기(네이버 보조 pill)
 *   → Quick Check → 자리/분위기 힌트(work_fit chip)
 */
interface PlaceDetailProps {
  cafe: Cafe | null;
  onClose: () => void;
}

export default function PlaceDetail({ cafe, onClose }: PlaceDetailProps) {
  const {
    isBookmarked,
    toggleBookmark,
    loadReviews,
    reviewCounts,
    myReview,
    setReview,
    user,
    openLoginPrompt,
  } = useAppState();

  const placeId = cafe?.id ?? null;
  const photoTrackRef = useRef<HTMLDivElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // 상세가 열리거나 다른 카페로 바뀌면 리뷰 집계 + 내 리뷰를 로드
  useEffect(() => {
    if (placeId) loadReviews(placeId);
  }, [placeId, loadReviews]);

  // 다른 카페로 전환되면 열려 있던 수정요청 폼을 닫는다
  useEffect(() => {
    setEditOpen(false);
    setActivePhotoIndex(0);
    photoTrackRef.current?.scrollTo({ left: 0 });
  }, [placeId]);

  function handleEditRequest() {
    if (!user) {
      openLoginPrompt();
      return;
    }
    setEditOpen(true);
  }

  if (!cafe) return null;

  const bookmarked = isBookmarked(cafe.id);
  const counts = reviewCounts(cafe.id);
  const mine = myReview(cafe.id);

  const hours = cafe.is_24h
    ? "24시간"
    : `${cafe.open_time} - ${cafe.close_time}`;

  const photos = cafe.photos ?? [];
  const hasMultiplePhotos = photos.length > 1;

  function handlePhotoScroll(event: React.UIEvent<HTMLDivElement>) {
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

  function scrollPhoto(delta: -1 | 1) {
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

  // Quick Check: 콘센트 · 소음 · 와이파이 · 영업시간 · 아메리카노
  // positive 판정은 "좋은 조건"일 때만 (DESIGN.md: 민트는 좋은 조건 전용)
  const facts: Fact[] = [
    {
      icon: "🔌",
      label: "콘센트",
      value: OUTLET_LABEL[cafe.outlet] ?? cafe.outlet,
      positive: cafe.outlet === "many",
    },
    {
      icon: "🔉",
      label: "소음",
      value: NOISE_LABEL[cafe.noise] ?? cafe.noise,
      positive: cafe.noise === "quiet",
    },
    {
      icon: "📶",
      label: "와이파이",
      value: cafe.wifi ? "있음" : "없음",
      positive: !!cafe.wifi,
    },
    {
      icon: "🕐",
      label: "영업시간",
      value: hours,
      positive: !!cafe.is_24h,
    },
  ];

  if (typeof cafe.iced_americano_price === "number") {
    facts.push({
      icon: "🧋",
      label: "아메리카노",
      value: `${cafe.iced_americano_price.toLocaleString()}원`,
      positive: false,
    });
  }

  return (
    <aside className="detail" role="dialog" aria-label={`${cafe.name} 상세`}>
      <div className="detail__actions">
        <button
          type="button"
          className={`detail__bookmark${
            bookmarked ? " detail__bookmark--on" : ""
          }`}
          onClick={() => toggleBookmark(cafe.id)}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? "북마크 해제" : "북마크"}
          title={bookmarked ? "북마크 해제" : "북마크"}
        >
          {bookmarked ? "♥" : "♡"}
        </button>
        <button className="detail__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>

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
              // eslint-disable-next-line @next/next/no-img-element
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
        {cafe.address && <p className="detail__address">{cafe.address}</p>}
        <h2 className="detail__name">{cafe.name}</h2>

        {safeHttpUrl(cafe.naver_place_url) && (
          <a
            className="detail__naver"
            href={safeHttpUrl(cafe.naver_place_url)!}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="detail__naver-mark" aria-hidden="true">
              N
            </span>
            지도에서 보기
          </a>
        )}

        <p className="detail__eyebrow">QUICK CHECK</p>
        <ul className="detail__facts">
          {facts.map((f) => (
            <FactCard key={f.label} {...f} />
          ))}
        </ul>

        <p className="detail__eyebrow">자리와 분위기</p>
        <ul className="detail__hints">
          <li className="hint-chip">
            {WORK_FIT_LABEL[cafe.work_fit] ?? cafe.work_fit}
          </li>
        </ul>

        <p className="review__title">이 카페 어땠나요</p>
        <ul className="review">
          {REVIEW_OPTIONS.map(({ rating, icon, label }) => {
            const selected = mine === rating;
            return (
              <li key={rating}>
                <button
                  type="button"
                  className={`review__btn${selected ? " review__btn--on" : ""}`}
                  aria-pressed={selected}
                  onClick={() => setReview(cafe.id, rating)}
                >
                  <span className="review__icon" aria-hidden="true">
                    {icon}
                  </span>
                  <span className="review__label">{label}</span>
                  <span className="review__count">{counts[rating]}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="detail__edit-request"
          onClick={handleEditRequest}
        >
          정보 수정 요청
        </button>
      </div>

      {editOpen && (
        <SubmissionForm
          kind="edit"
          placeId={cafe.id}
          onClose={() => setEditOpen(false)}
        />
      )}
    </aside>
  );
}
