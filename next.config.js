/** @type {import('next').NextConfig} */

// Supabase 출처(스토리지 이미지 + REST/RPC/Realtime). 미설정 시 CSP 에서 빠진다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseOrigin = (() => {
  try {
    return supabaseUrl ? new URL(supabaseUrl).origin : "";
  } catch {
    return "";
  }
})();

/**
 * Content-Security-Policy (Report-Only).
 *
 * 앱이 실제 쓰는 출처만 허용한다:
 *   - script: 카카오맵. loader(dapi.kakao.com)가 실제 지도 엔진 스크립트를
 *             http(s)://*.daumcdn.net 에서 2차 로드하고, 엔진이 'eval' 을 쓴다.
 *             ld+json 인라인 <script> 때문에 'unsafe-inline' 도 필요.
 *             (Report-Only 스모크로 확인: dapi.kakao.com → t1.daumcdn.net/.../kakao.js + eval)
 *   - style:  Pretendard 폰트 CSS(jsdelivr) + 컴포넌트 인라인 style 때문에 'unsafe-inline'.
 *   - img:    data:/blob: + Supabase 스토리지 + 카카오 지도 타일·마커·커서.
 *             카카오맵은 지도 타일/이미지를 http(평문) daumcdn/kakaocdn 여러
 *             서브도메인(mts., t1., map. 등)에서 받는다. Report-Only 스모크에서
 *             확인된 실제 출처에 맞춰 http/https 양쪽 + *.daumcdn/*.kakaocdn 를 허용한다.
 *   - connect: Supabase REST/RPC/Realtime(wss 포함) + 카카오 dapi.
 *
 * 우선 Report-Only 로 넣어 위반만 수집하고 실제 차단은 하지 않는다(오탐으로 앱이
 * 깨지는 것 방지). 리포트를 확인해 안전하면 이후 Content-Security-Policy 로 승격한다.
 */
function cspReportOnly() {
  const script = [
    "'self'",
    "'unsafe-inline'",
    // 카카오맵 엔진이 문자열을 JS 로 평가(eval)한다.
    "'unsafe-eval'",
    "https://dapi.kakao.com",
    // loader 가 실제 지도 엔진 스크립트를 http(s) daumcdn 에서 2차 로드한다.
    "http://*.daumcdn.net",
    "https://*.daumcdn.net",
  ];
  const style = ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"];
  const img = [
    "'self'",
    "data:",
    "blob:",
    // 카카오맵 타일/마커/커서: http·https 양쪽, daumcdn·kakaocdn 전 서브도메인.
    "http://*.daumcdn.net",
    "https://*.daumcdn.net",
    "http://*.kakaocdn.net",
    "https://*.kakaocdn.net",
  ];
  const connect = ["'self'", "https://dapi.kakao.com"];
  if (supabaseOrigin) {
    img.push(supabaseOrigin);
    connect.push(supabaseOrigin, supabaseOrigin.replace(/^https:/, "wss:"));
  }
  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    `style-src ${style.join(" ")}`,
    `img-src ${img.join(" ")}`,
    `connect-src ${connect.join(" ")}`,
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
  ].join("; ");
}

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    // 전역 보안 헤더. auth/UGC 도입에 대비한 기본 방어.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          // CSP 는 우선 Report-Only 로만 넣는다(차단 X, 위반 수집만).
          // 리포트로 안전 확인 후 Content-Security-Policy 로 승격 예정.
          {
            key: "Content-Security-Policy-Report-Only",
            value: cspReportOnly(),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
