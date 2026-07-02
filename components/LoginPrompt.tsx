"use client";

import { useAppState } from "./AppStateProvider";

/**
 * 비로그인 사용자가 북마크(하트)를 눌렀을 때 뜨는 로그인 안내 모달.
 * loginPromptOpen 상태(AppStateProvider)로 제어된다.
 */
export default function LoginPrompt() {
  const { supabase, loginPromptOpen, closeLoginPrompt } = useAppState();

  if (!loginPromptOpen) return null;

  async function handleLogin() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: window.location.origin },
    });
  }

  return (
    <div
      className="login-modal"
      role="dialog"
      aria-modal="true"
      aria-label="로그인이 필요합니다"
      onClick={closeLoginPrompt}
    >
      <div
        className="login-modal__box"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="login-modal__close"
          onClick={closeLoginPrompt}
          aria-label="닫기"
        >
          ✕
        </button>
        <p className="login-modal__eyebrow">BOOKMARK</p>
        <h2 className="login-modal__title">로그인하고 카페를 저장하세요</h2>
        <p className="login-modal__desc">
          마음에 드는 카페를 북마크하려면 로그인이 필요합니다.
        </p>
        <button
          type="button"
          className="kakao-login"
          onClick={handleLogin}
        >
          <span className="kakao-login__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 1.5C4.86 1.5 1.5 4.16 1.5 7.44c0 2.12 1.42 3.98 3.56 5.03-.16.57-.57 2.06-.65 2.38-.1.4.15.4.31.29.13-.09 2.05-1.39 2.88-1.96.45.06.92.1 1.4.1 4.14 0 7.5-2.66 7.5-5.94S13.14 1.5 9 1.5Z"
                fill="rgba(0,0,0,0.85)"
              />
            </svg>
          </span>
          카카오 로그인
        </button>
      </div>
    </div>
  );
}
