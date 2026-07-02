import type { MetadataRoute } from "next";

const SITE_URL = "https://cagongmap.xyz";

/**
 * /sitemap.xml (Next App Router Metadata Route).
 * 현재는 단일 라우트(홈)만 존재한다. 카페별 상세 페이지(/cafes/[slug]) 등이
 * 생기면 lib/cafes 의 getCafes() 를 재사용해 여기에 추가한다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
