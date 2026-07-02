"use client";

import type { User } from "@supabase/supabase-js";
import { useAppState } from "./AppStateProvider";

// 카카오 user_metadata 에서 표시용 이름/이메일/아바타를 뽑는다.
// (provider 별 키가 다를 수 있어 흔한 키들을 순서대로 본다)
function readProfile(user: User) {
  const m = user?.user_metadata ?? {};
  const name =
    m.name || m.full_name || m.nickname || m.preferred_username || "사용자";
  const email = user?.email || m.email || "";
  const avatar = m.avatar_url || m.picture || "";
  return { name, email, avatar };
}

export default function KakaoLogin() {
  const { supabase, user, authReady } = useAppState();

  async function handleLogin() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        // code flow: 카카오 → /auth/callback 에서 code 를 세션으로 교환한다.
        // next 로 로그인 시작 위치를 넘겨 돌아올 곳을 지정한다(관리자 로그인 후
        // /admin 복귀 등).
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`,
      },
    });
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  // Supabase 미설정 시: 안내만 노출
  if (!supabase) {
    return (
      <p className="auth__hint">
        Supabase 환경변수가 없어 로그인을 사용할 수 없습니다.
      </p>
    );
  }

  if (!authReady) {
    return <div className="auth__skeleton" aria-hidden="true" />;
  }

  if (user) {
    const { name, email, avatar } = readProfile(user);
    return (
      <div className="auth-user">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="auth-user__avatar" src={avatar} alt="" />
        ) : (
          <div className="auth-user__avatar auth-user__avatar--fallback">
            {name.slice(0, 1)}
          </div>
        )}
        <div className="auth-user__meta">
          <span className="auth-user__name">{name}</span>
          {email ? <span className="auth-user__email">{email}</span> : null}
        </div>
        <button
          type="button"
          className="auth-user__logout"
          onClick={handleLogout}
          aria-label="로그아웃"
          title="로그아웃"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="kakao-login" onClick={handleLogin}>
      <span className="kakao-login__icon" aria-hidden="true">
        {/* 카카오 말풍선 심볼 */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 1.5C4.86 1.5 1.5 4.16 1.5 7.44c0 2.12 1.42 3.98 3.56 5.03-.16.57-.57 2.06-.65 2.38-.1.4.15.4.31.29.13-.09 2.05-1.39 2.88-1.96.45.06.92.1 1.4.1 4.14 0 7.5-2.66 7.5-5.94S13.14 1.5 9 1.5Z"
            fill="rgba(0,0,0,0.85)"
          />
        </svg>
      </span>
      카카오 로그인
    </button>
  );
}
