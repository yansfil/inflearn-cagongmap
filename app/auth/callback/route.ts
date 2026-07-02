import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * 카카오 OAuth code flow 콜백.
 *
 * signInWithOAuth({ provider: "kakao" }) 로 카카오에 다녀오면 여기로 code 와
 * 함께 돌아온다. code 를 세션으로 교환해 응답 쿠키에 세션을 심고, next(또는 홈)로
 * 리다이렉트한다. 세션이 쿠키에 있어야 서버 컴포넌트/미들웨어/Server Action 이
 * 로그인 사용자를 인식한다.
 */

/**
 * next 파라미터를 같은 origin 상대경로로만 정규화한다.
 * "/foo?bar" 처럼 단일 슬래시로 시작하는 경로만 허용하고,
 * "//evil.com"(프로토콜 상대) · "https://evil.com"(절대) 등은 "/" 로 대체한다.
 */
function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // open redirect 방지: 같은 origin 의 상대경로("/...")만 허용한다.
  // "//evil.com" 이나 "https://evil.com" 같은 절대/프로토콜상대 URL 은 "/" 로 강제.
  const next = safeNextPath(url.searchParams.get("next"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!code || !supabaseUrl || !anonKey) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

  const redirectTo = new URL(next, url.origin);
  const response = NextResponse.redirect(redirectTo);
  const cookieStore = cookies();

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/?auth_error=1", url.origin));
  }

  return response;
}
