import "./globals.css";

export const metadata = {
  title: "카공맵 — 노트북 작업하기 좋은 카페",
  description: "콘센트·와이파이·작업 적합도로 카페를 지도에서 찾는 서비스",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* DESIGN.md Typography 기준 폰트 (Pretendard) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
