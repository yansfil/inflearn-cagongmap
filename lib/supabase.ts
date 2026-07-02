import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 클라이언트 (서버 컴포넌트용, anon key).
 * places 는 공개읽기 RLS 가 걸려 있어 anon 으로 select 가능.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) {
    return null;
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

export const hasSupabaseConfig = Boolean(url && anonKey);
