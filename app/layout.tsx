import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteGraph } from "../lib/structuredData";

const siteUrl = "https://cagongmap.xyz";
const title = "카공맵 - 노트북 작업하기 좋은 카페";
const description =
  "콘센트·와이파이·작업 적합도로 카페를 지도에서 찾는 서비스";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | 카공맵",
  },
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "카공맵",
    locale: "ko_KR",
    url: siteUrl,
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* DESIGN.md Typography 기준 폰트 (Pretendard) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        {/* 사이트 정체성 구조화 데이터 (WebSite + Organization) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteGraph()) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
