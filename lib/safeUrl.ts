/**
 * 사용자 입력 URL 을 링크(href)로 렌더하기 전 스킴을 검증한다.
 *
 * 왜 필요한가: 제보(place_submissions)의 naver_place_url 은 사용자 입력이고, 폼의
 * <input type="url"> 은 클라이언트 가드일 뿐이라 anon key 로 REST insert 를 직접
 * 호출하면 우회된다. 검증 없이 `<a href={url}>` 로 렌더하면 `javascript:...` URI 가
 * 저장돼 관리자가 클릭하는 순간 관리자 세션에서 스크립트가 실행되는 저장형 XSS 가
 * 된다(admin 화면은 service_role 급 능력을 쓰므로 영향이 크다).
 *
 * 그래서 href 로 쓸 값은 반드시 이 함수를 통과시키고, null 이면 링크가 아니라
 * 평문 텍스트로 표시한다. `javascript:`·`data:`·`vbscript:` 등 스크립트 실행 가능
 * 스킴을 배제하고 `http:`/`https:` 만 허용한다.
 */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  // URL 파서로 스킴을 정규화해 판단한다. 상대 URL 등 파싱 실패는 링크로 쓰지 않는다.
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  return trimmed;
}
