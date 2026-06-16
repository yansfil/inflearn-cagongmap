"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Supabase 클라이언트 (브라우저용).
 * 로그인 세션을 브라우저에 유지·자동 갱신해야 하므로
 * persistSession / autoRefreshToken 을 켠다.
 * (서버 컴포넌트용 lib/supabase.js 는 persistSession:false 라 별도로 둔다.)
 *
 * 카카오 로그인은 implicit 방식: redirectTo 로 돌아온 URL 의 토큰을
 * supabase-js 가 detectSessionInUrl 로 자동 세션화한다.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient = null;

export function getSupabaseBrowser() {
  if (!url || !anonKey) {
    return null;
  }
  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}
