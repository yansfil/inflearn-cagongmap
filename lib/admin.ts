import { getSupabaseServer } from "./supabaseServer";
import { isAdminEmail } from "./adminEmails";

/**
 * 관리자 권한 판별 (서버 세션 확인).
 *
 * 순수 판별(parseAdminEmails/isAdminEmail)은 lib/adminEmails 에 있고,
 * 여기서는 쿠키 세션 사용자를 확인하는 서버 전용 헬퍼를 제공한다.
 * 미들웨어와 각 Server Action 이 공통으로 이 판별을 쓴다(이중 검증).
 */
export { isAdminEmail, parseAdminEmails } from "./adminEmails";

export interface AdminUser {
  id: string;
  email: string;
}

/**
 * 현재 쿠키 세션의 사용자가 관리자인지 서버에서 확인한다.
 * 관리자면 { id, email } 을 반환하고, 아니면 null.
 *
 * 서버 컴포넌트(레이아웃 가드)와 Server Action(mutation 가드)에서 공용으로 쓴다.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAdminEmail(user.email)) {
    return null;
  }
  return { id: user.id, email: user.email };
}

/**
 * Server Action 진입점 가드. 관리자가 아니면 예외를 던진다.
 * mutation 액션 첫 줄에서 호출해 미들웨어와 무관하게 서버에서 재검증한다.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return admin;
}
