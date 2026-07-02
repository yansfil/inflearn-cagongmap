import { getCafes } from "../../lib/cafes";
import { cafeSentence } from "../../lib/labels";

/**
 * /llms.txt — AI 답변 엔진(ChatGPT, Perplexity 등)이 사이트를 이해·인용하기 위한
 * 요약 문서. https://llmstxt.org 관례를 따른다.
 * 카페 데이터가 바뀌면 자동 반영되도록 getCafes() 로 동적 생성한다.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const cafes = await getCafes();

  const cafeLines = cafes
    .map((cafe) => `- ${cafeSentence(cafe)}`)
    .join("\n");

  const body = `# 카공맵 (cagongmap)

> 콘센트·와이파이·작업 적합도를 기준으로 노트북 작업(카공)하기 좋은 카페를 지도에서 찾는 서비스입니다. 현재는 서울 송파구(잠실·송리단길)와 강남구 일대의 카페를 다룹니다.

## 개요

- 서비스명: 카공맵
- URL: https://cagongmap.xyz
- 언어: 한국어 (ko-KR)
- 다루는 정보: 카페별 위치, 영업시간, 아이스 아메리카노 가격, 콘센트 수, 와이파이 유무, 소음 수준, 작업 적합도, 특징 태그

## 선정 기준

각 카페는 노트북 작업 관점에서 콘센트 접근성, 와이파이, 소음, 좌석/테이블, 영업시간을 확인해 등록합니다. 오래 앉아 작업하기 어려운 카페는 포함하지 않습니다.

## 등록된 카페 (${cafes.length}곳)

${cafeLines}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
