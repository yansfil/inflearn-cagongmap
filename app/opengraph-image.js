import { ImageResponse } from "next/og";

// DESIGN.md 톤: warm surface 배경, primary 브릭 강조, 조용한 위계
export const alt = "카공맵 - 노트북 작업하기 좋은 카페를 지도에서";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#fffaf8",
          padding: "96px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            color: "#88484a",
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "0.12em",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "9999px",
              background: "#88484a",
              color: "#fffef9",
              fontSize: "30px",
              fontWeight: 800,
            }}
          >
            카
          </div>
          WORK CAFE MAP
        </div>
        <div
          style={{
            marginTop: "40px",
            color: "#211b1a",
            fontSize: "92px",
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          노트북 작업하기 좋은 카페
        </div>
        <div
          style={{
            marginTop: "28px",
            color: "#5b504d",
            fontSize: "40px",
            fontWeight: 500,
          }}
        >
          콘센트·와이파이·작업 적합도로 지도에서 찾는 카공맵
        </div>
      </div>
    ),
    { ...size }
  );
}
