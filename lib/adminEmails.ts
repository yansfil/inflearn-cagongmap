/**
 * 관리자 이메일 판별 (순수 로직, 서버 전용 의존성 없음).
 *
 * ADMIN_EMAILS(쉼표 구분, 서버 전용 env)에 포함된 이메일만 관리자다.
 * 서버 전용 세션 확인(getAdminUser/requireAdmin)은 lib/admin 에 있고, 여기의
 * 순수 함수를 재사용한다. server-only 의존성이 없어 단위 테스트가 가능하다.
 */

/** ADMIN_EMAILS 를 정규화된 소문자 이메일 집합으로 파싱. */
export function parseAdminEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0)
  );
}

/** 주어진 이메일이 관리자 목록에 있는지. 대소문자·공백 무시. */
export function isAdminEmail(
  email: string | null | undefined,
  raw: string | undefined = process.env.ADMIN_EMAILS
): boolean {
  if (!email) return false;
  return parseAdminEmails(raw).has(email.trim().toLowerCase());
}
