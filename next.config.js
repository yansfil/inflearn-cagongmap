/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    // 전역 보안 헤더. auth/UGC 도입에 대비한 기본 방어.
    // CSP 는 카카오맵 SDK·jsdelivr 폰트·Supabase 등 외부 출처가 많아
    // 잘못 설정 시 앱이 깨질 수 있어 지금은 넣지 않는다(별도 검증 후 추가).
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
        ],
      },
    ];
  },
};

module.exports = nextConfig;
