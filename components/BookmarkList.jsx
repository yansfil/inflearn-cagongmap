"use client";

import { useAppState } from "./AppStateProvider";

/**
 * 좌측 패널의 북마크 목록 (로그인 버튼 하단).
 * - 로그인 안 했으면 렌더링하지 않는다.
 * - 항목 클릭 시 해당 카페 상세 패널을 연다(onSelect).
 *
 * @param {{cafes: Array, onSelect: (cafe) => void}} props
 */
export default function BookmarkList({ cafes, onSelect }) {
  const { user, bookmarkIds } = useAppState();

  // 로그인 전에는 북마크 UI 자체를 숨긴다 (DESIGN.md)
  if (!user) return null;

  // 북마크된 place_id → cafe 객체로 매칭 (현재 지도에 있는 장소만)
  const bookmarked = cafes.filter((c) => bookmarkIds.has(c.id));

  return (
    <section className="bookmark-panel" aria-label="내 북마크">
      <p className="bookmark-panel__eyebrow">BOOKMARKS</p>
      <div className="bookmark-panel__head">
        <h2 className="bookmark-panel__title">내 북마크</h2>
        <span className="bookmark-panel__count">{bookmarked.length}</span>
      </div>

      {bookmarked.length === 0 ? (
        <p className="bookmark-panel__empty">
          상세 패널의 하트를 눌러 카페를 저장해 보세요.
        </p>
      ) : (
        <ul className="bookmark-panel__list">
          {bookmarked.map((cafe) => (
            <li key={cafe.id}>
              <button
                type="button"
                className="bookmark-item"
                onClick={() => onSelect(cafe)}
              >
                {cafe.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="bookmark-item__thumb"
                    src={cafe.photos[0]}
                    alt=""
                  />
                ) : (
                  <span className="bookmark-item__thumb bookmark-item__thumb--empty" />
                )}
                <span className="bookmark-item__meta">
                  <span className="bookmark-item__name">{cafe.name}</span>
                  {cafe.address ? (
                    <span className="bookmark-item__addr">{cafe.address}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
