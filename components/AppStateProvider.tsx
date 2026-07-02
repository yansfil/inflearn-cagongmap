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
    }),
    [supabase, user, authReady, bookmarkIds, toggleBookmark, loginPromptOpen]
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
