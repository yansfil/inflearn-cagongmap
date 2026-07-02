import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 관리자 클라이언트 (service_role).
 *
 * RLS 를 우회한다. places / 제보 테이블 쓰기, 제보 전체 조회, auth.users 조회,
 * 스토리지 관리 등 관리자 전용 서버 작업에서만 쓴다.
 *
 * - server-only: 클라이언트 번들에 절대 포함되면 안 된다(키 노출 = 전체 DB 권한).
 * - Server Action / route handler / 서버 컴포넌트에서만 import.
 * - 호출부는 반드시 사전에 관리자 이메일을 재검증한 뒤 사용한다(lib/admin).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAdmin(): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL 가 설정되지 않았습니다."
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
