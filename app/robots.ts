import type { MetadataRoute } from "next";

const SITE_URL = "https://cagongmap.xyz";

/**
 * /robots.txt (Next App Router Metadata Route).
 * 일반 크롤러와 주요 AI 크롤러를 명시적으로 허용하고 사이트맵을 알린다.
 * (허용이 기본이지만, 명시하면 정책이 분명해지고 사이트맵 발견이 빨라진다.)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      // AI 검색/인용 크롤러 명시 허용
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
