# 카공맵 (cagongmap)

노트북 작업하기 좋은 카페를 지도에서 찾는 서비스. 카카오맵 위에 시드 카페를 마커로 표시한다.

> 현재 단계: **지도에 마커 표시까지**. 필터 / 리스트 / 로그인 / 제보는 다음 단계 (`docs/scope.md` 참고).

## 기술 스택

- Next.js 14 (App Router)
- 카카오맵 JavaScript SDK
- 데이터: `data/cafes.json` (운영자 시드, 현재 9개)

## 실행

### 1. 카카오맵 키 설정

1. [카카오 디벨로퍼스](https://developers.kakao.com) > 내 애플리케이션 > 앱 키 > **JavaScript 키** 발급
2. **플랫폼 > Web** 에 `http://localhost:3030` 도메인 등록
3. 키를 환경변수에 등록:

```bash
cp .env.local.example .env.local
# .env.local 을 열어 NEXT_PUBLIC_KAKAO_MAP_KEY 값을 실제 키로 채운다
```

### 2. 의존성 설치 & 개발 서버

```bash
npm install
npm run dev
```

→ http://localhost:3030 접속. 잠실·송파 일대 카페 마커가 표시되고, 마커 클릭 시 속성·영업시간·네이버 링크가 뜬다.

## 구조

```
app/
  layout.js        루트 레이아웃
  page.js          서버에서 cafes.json 로드 → KakaoMap 에 전달
  globals.css      지도 풀스크린 + 인포윈도우 스타일
components/
  KakaoMap.jsx     SDK 로드, 마커 + 인포윈도우 렌더 ('use client')
lib/
  cafes.js         cafes.json 로드 헬퍼 (서버 전용)
data/
  cafes.json       카페 시드 데이터
docs/
  scope.md         MVP 범위 논의 문서
```

## 데이터 스키마 (현재)

| 필드 | 값 |
|---|---|
| `name`, `address`, `lat`, `lng` | 기본 정보 / 좌표 |
| `outlet` | `many` / `some` (콘센트) |
| `wifi` | `true` / `false` |
| `noise` | `quiet` / `normal` / `loud` |
| `work_fit` | `good` / `ok` / `bad` (작업 적합도) |
| `open_time`, `close_time`, `is_24h` | 영업시간 |
| `iced_americano_price` | 아메리카노 가격 |
| `naver_place_url` | 상세 링크 (네이버) |
| `tags` | 자유 태그 배열 |

> `docs/scope.md` 가 명시한 **카공 허용(환영/허용/눈치/금지)** 필드는 아직 데이터에 없음. 다음 단계에서 추가 예정.
