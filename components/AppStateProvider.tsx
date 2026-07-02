"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "../lib/supabaseBrowser";
import type { ReviewCounts, ReviewRating } from "../lib/types";

const EMPTY_COUNTS: ReviewCounts = { good: 0, normal: 0, bad: 0 };

interface AppState {
  supabase: SupabaseClient | null;
  user: User | null;
  authReady: boolean;
  bookmarkIds: Set<string>;
  toggleBookmark: (placeId: string) => Promise<boolean>;
  isBookmarked: (placeId: string) => boolean;
  loginPromptOpen: boolean;
  openLoginPrompt: () => void;
  closeLoginPrompt: () => void;
  // 리뷰: 장소별 공개 집계 + 내가 누른 등급
  loadReviews: (placeId: string) => Promise<void>;
  reviewCounts: (placeId: string) => ReviewCounts;
  myReview: (placeId: string) => ReviewRating | null;
  setReview: (placeId: string, rating: ReviewRating) => Promise<boolean>;
}

/**
 * 앱 전역 상태: 로그인 사용자 + 북마크 + 로그인 안내 모달.
 *
 * - 상세 패널의 하트와 좌측 북마크 리스트가 같은 북마크 상태를 봐야 하므로
 *   여기서 한 번만 들고 공유한다.
 * - 비로그인 사용자가 하트를 누르면 loginPromptOpen 을 켜서 모달을 띄운다.
 * - 북마크는 place_id(Set) 로만 들고, 표시용 카페 정보는 cafes 배열에서 매칭한다.
 */
const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowser();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  // 북마크된 place_id 집합
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(() => new Set());
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  // 리뷰: 장소별 공개 집계(place_id → counts) + 내 리뷰(place_id → rating)
  const [countsByPlace, setCountsByPlace] = useState<
    Record<string, ReviewCounts>
  >({});
  const [myReviewByPlace, setMyReviewByPlace] = useState<
    Record<string, ReviewRating | null>
  >({});

  // 세션 추적
  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  // 로그인 사용자의 북마크 로드 (로그아웃 시 비움)
  const loadBookmarks = useCallback(async () => {
    if (!supabase || !user) {
      setBookmarkIds(new Set());
      return;
    }
    const { data, error } = await supabase
      .from("bookmarks")
      .select("place_id");
    if (error) {
      // eslint-disable-next-line no-console
      console.error("북마크 조회 실패:", error.message);
      return;
    }
    setBookmarkIds(
      new Set((data as { place_id: string }[]).map((row) => row.place_id))
    );
  }, [supabase, user]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // 로그인 사용자가 바뀌면 "내 리뷰" 상태를 비운다(집계는 공개라 유지 가능하나
  // 내 선택은 사용자 귀속이므로 초기화). 상세를 다시 열면 loadReviews 로 재로드.
  useEffect(() => {
    setMyReviewByPlace({});
  }, [user]);

  // 북마크 토글. 비로그인이면 로그인 모달을 띄우고 false 반환.
  const toggleBookmark = useCallback(
    async (placeId: string): Promise<boolean> => {
      if (!user) {
        setLoginPromptOpen(true);
        return false;
      }
      if (!supabase || !placeId) return false;

      const isBookmarked = bookmarkIds.has(placeId);

      // 낙관적 업데이트
      setBookmarkIds((prev) => {
        const next = new Set(prev);
        if (isBookmarked) next.delete(placeId);
        else next.add(placeId);
        return next;
      });

      if (isBookmarked) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("place_id", placeId);
        if (error) {
          // 실패 시 롤백
          setBookmarkIds((prev) => new Set(prev).add(placeId));
          // eslint-disable-next-line no-console
          console.error("북마크 삭제 실패:", error.message);
        }
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .insert({ user_id: user.id, place_id: placeId });
        if (error) {
          setBookmarkIds((prev) => {
            const next = new Set(prev);
            next.delete(placeId);
            return next;
          });
          // eslint-disable-next-line no-console
          console.error("북마크 추가 실패:", error.message);
        }
      }
      return true;
    },
    [supabase, user, bookmarkIds]
  );

  // 상세가 열릴 때 장소별 공개 집계 + (로그인 시) 내 리뷰를 로드.
  const loadReviews = useCallback(
    async (placeId: string) => {
      if (!supabase || !placeId) return;

      // 공개 집계: review_counts(place_id) SECURITY DEFINER RPC (개별 행 비공개)
      const { data: counts, error: countsErr } = await supabase.rpc(
        "review_counts",
        { p_place_id: placeId }
      );
      if (countsErr) {
        // eslint-disable-next-line no-console
        console.error("리뷰 집계 조회 실패:", countsErr.message);
      } else {
        const row = Array.isArray(counts) ? counts[0] : counts;
        setCountsByPlace((prev) => ({
          ...prev,
          [placeId]: {
            good: Number(row?.good ?? 0),
            normal: Number(row?.normal ?? 0),
            bad: Number(row?.bad ?? 0),
          },
        }));
      }

      // 내 리뷰: 로그인 상태에서만 (RLS 로 본인 행만 보임)
      if (user) {
        const { data: mine, error: mineErr } = await supabase
          .from("reviews")
          .select("rating")
          .eq("place_id", placeId)
          .maybeSingle();
        if (mineErr) {
          // eslint-disable-next-line no-console
          console.error("내 리뷰 조회 실패:", mineErr.message);
        } else {
          setMyReviewByPlace((prev) => ({
            ...prev,
            [placeId]: (mine?.rating as ReviewRating | undefined) ?? null,
          }));
        }
      }
    },
    [supabase, user]
  );

  // 리뷰 등급 upsert. 같은 등급 재선택 시 취소(삭제), 다른 등급이면 변경.
  // 낙관적으로 집계·내 선택을 갱신하고 실패 시 롤백. 비로그인은 모달.
  const setReview = useCallback(
    async (placeId: string, rating: ReviewRating): Promise<boolean> => {
      if (!user) {
        setLoginPromptOpen(true);
        return false;
      }
      if (!supabase || !placeId) return false;

      const prevRating = myReviewByPlace[placeId] ?? null;
      const prevCounts = countsByPlace[placeId] ?? EMPTY_COUNTS;
      const nextRating: ReviewRating | null =
        prevRating === rating ? null : rating; // 같은 등급 재클릭 → 취소

      // 낙관적 집계 갱신: 이전 등급 -1, 새 등급 +1
      const nextCounts: ReviewCounts = { ...prevCounts };
      if (prevRating) nextCounts[prevRating] = Math.max(0, nextCounts[prevRating] - 1);
      if (nextRating) nextCounts[nextRating] = nextCounts[nextRating] + 1;

      setMyReviewByPlace((prev) => ({ ...prev, [placeId]: nextRating }));
      setCountsByPlace((prev) => ({ ...prev, [placeId]: nextCounts }));

      const rollback = () => {
        setMyReviewByPlace((prev) => ({ ...prev, [placeId]: prevRating }));
        setCountsByPlace((prev) => ({ ...prev, [placeId]: prevCounts }));
      };

      if (nextRating === null) {
        // 취소: 내 리뷰 삭제
        const { error } = await supabase
          .from("reviews")
          .delete()
          .eq("user_id", user.id)
          .eq("place_id", placeId);
        if (error) {
          rollback();
          // eslint-disable-next-line no-console
          console.error("리뷰 삭제 실패:", error.message);
          return false;
        }
      } else {
        // 신규/변경: (user_id, place_id) unique 기준 upsert
        const { error } = await supabase
          .from("reviews")
          .upsert(
            { user_id: user.id, place_id: placeId, rating: nextRating },
            { onConflict: "user_id,place_id" }
          );
        if (error) {
          rollback();
          // eslint-disable-next-line no-console
          console.error("리뷰 저장 실패:", error.message);
          return false;
        }
      }
      return true;
    },
    [supabase, user, myReviewByPlace, countsByPlace]
  );

  const value = useMemo<AppState>(
    () => ({
      supabase,
      user,
      authReady,
      bookmarkIds,
      toggleBookmark,
      isBookmarked: (placeId: string) => bookmarkIds.has(placeId),
      loginPromptOpen,
      openLoginPrompt: () => setLoginPromptOpen(true),
      closeLoginPrompt: () => setLoginPromptOpen(false),
      loadReviews,
      reviewCounts: (placeId: string) => countsByPlace[placeId] ?? EMPTY_COUNTS,
      myReview: (placeId: string) => myReviewByPlace[placeId] ?? null,
      setReview,
    }),
    [
      supabase,
      user,
      authReady,
      bookmarkIds,
      toggleBookmark,
      loginPromptOpen,
      loadReviews,
      setReview,
      countsByPlace,
      myReviewByPlace,
    ]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}
