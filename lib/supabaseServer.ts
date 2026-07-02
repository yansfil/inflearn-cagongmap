import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 클라이언트 (서버 컴포넌트 / Server Action / route handler 용, @supabase/ssr).
 *
 * 브라우저가 심은 세션 쿠키를 읽어 auth.getUser() 로 로그인 사용자를 서버에서
 * 확인한다. anon key 를 쓰므로 RLS 가 그대로 적용된다(공개 읽기/본인 데이터).
 * places/제보 테이블에 RLS 를 우회해 써야 하는 관리자 작업은 lib/supabaseAdmin
 * (service_role) 을 쓴다.
 *
 * 주의: 서버 컴포넌트에서는 쿠키 set 이 불가(read-only)라 set/remove 에서 나는
 * 예외를 무시한다. 세션 갱신 쿠키 반영은 middleware 가 담당한다.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseServer(): SupabaseClient | null {
  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서 호출되면 쿠키 set 이 막혀 예외가 난다.
          // 세션 쿠키 갱신은 middleware 에서 처리하므로 무시해도 된다.
        }
      },
    },
  });
}
