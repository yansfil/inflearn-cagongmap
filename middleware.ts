import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * 세션 갱신 미들웨어.
 *
 * @supabase/ssr 는 요청마다 세션 쿠키를 재검증/갱신해야 서버 컴포넌트에서
 * auth.getUser() 가 안정적으로 동작한다. 여기서 supabase.auth.getUser() 를
 * 호출해 갱신된 세션 쿠키를 응답에 실어 준다.
 *
 * /admin 접근 보호는 T3(app/admin/layout.tsx 서버 가드)에서 처리한다.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // 세션 쿠키 재검증/갱신 (반환값은 쓰지 않지만 호출로 쿠키가 갱신된다).
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // 정적 자산·이미지 최적화 경로는 제외하고 모든 요청에서 세션을 갱신한다.
  // auth/callback 은 제외한다: 그 라우트가 code 교환으로 세션 쿠키를 직접 심는데,
  // 미들웨어의 세션 갱신 쿠키와 경합하면 방금 만든 세션이 드롭될 수 있다.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
