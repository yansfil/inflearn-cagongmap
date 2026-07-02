"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 클라이언트 (브라우저용, @supabase/ssr).
 *
 * createBrowserClient 는 세션을 **쿠키**에 저장한다(과거 localStorage 방식에서
 * 전환). 같은 쿠키를 서버 컴포넌트/미들웨어/Server Action 이 읽어 auth.getUser()
 * 로 로그인 사용자를 서버에서 확인할 수 있다.
 *
 * 카카오 로그인은 code flow: signInWithOAuth → 카카오 → /auth/callback 에서
 * code 를 세션으로 교환한다(KakaoLogin.tsx, app/auth/callback/route.ts 참고).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (!url || !anonKey) {
    return null;
  }
  if (!browserClient) {
    browserClient = createBrowserClient(url, anonKey);
  }
  return browserClient;
}
