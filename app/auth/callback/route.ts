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
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

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
