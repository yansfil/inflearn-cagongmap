# 카공맵 (cagongmap)

> 노트북 들고 카페 가서 "여기 콘센트 있나? 눈치 안 보이나?" 를 매번 검색하지 않게 만드는 서비스.
> 지도에서 카공하기 좋은 카페를 찾고, 로그인해서 북마크하고, 사용자가 제보하면 운영자가 승인한다.

**바이브코딩 강의 실습 프로젝트입니다. → [강의 보러 가기](https://www.grabity.me/courses/vibecoding)**

빈 폴더에서 시작해 실제로 배포할 수 있는 수준의 서비스 하나를 끝까지 만듭니다.

---

## 무엇을 만드나

- **지도** - 카카오맵 위 카페 마커, 클릭하면 콘센트 / 와이파이 / 소음 / 영업시간 / 사진
- **로그인 & 북마크** - 카카오 로그인, 마음에 든 카페 저장 (남의 북마크는 DB 레벨에서 차단)
- **제보** - 리뷰, 정보 수정 요청, 새 카페 제보
- **운영 콘솔** (`/admin`) - 제보 승인·반려, 장소 관리
- 그 밖에 SEO, 보안, 로깅, 테스트까지 실제 서비스에 필요한 것들

## 기술 스택

Next.js 14 (App Router) / TypeScript / Supabase (DB·인증·스토리지) / 카카오맵 SDK / Tailwind + shadcn/ui

---

## 시작하기

**필요한 것:** Node.js 18+, [카카오 디벨로퍼스](https://developers.kakao.com) 계정, [Supabase](https://supabase.com) 계정 (둘 다 무료)

1. **카카오** - JavaScript 키 발급 + 플랫폼 > Web 에 `http://localhost:3030` 등록
2. **Supabase** - 프로젝트 생성 → Kakao 로그인 provider 활성화 → `supabase/migrations/` SQL 순서대로 실행
3. **환경변수**

   ```bash
   cp .env.local.example .env.local
   ```

   `.env.local` 에 카카오 키, Supabase URL / anon 키 / service_role 키, 내 이메일(`ADMIN_EMAILS`) 을 채웁니다.
   각 값을 어디서 가져오는지는 `.env.local.example` 주석에 적어뒀습니다.

4. **실행**

   ```bash
   npm install
   npm run dev   # http://localhost:3030
   ```

그 외 명령: `npm test` (테스트), `npm run typecheck`, `npm run lint`, `npm run build`

---

## 강의 순서 = 커밋 순서

커밋 하나가 강의 한 단계입니다.

```bash
git log --oneline --reverse
```

프로젝트 초기화 → Supabase 연결 → 디자인 → 카카오 로그인 → 북마크(RLS) → 테스트 기반 → UGC 제보 → SEO → 관리자 콘솔 → 보안 → 로깅.

특정 시점 코드가 궁금하면 `git checkout <커밋해시>` 로 그때로 돌아가 보세요.

### 코드는 이 순서로 읽으면 됩니다

1. `app/page.tsx` - 서버에서 카페를 읽어 클라이언트로 넘긴다 (서버/클라이언트 경계)
2. `components/KakaoMap.tsx` - 지도와 마커 (`'use client'`)
3. `app/auth/callback/route.ts` - 로그인 코드를 세션 쿠키로 바꾸는 곳
4. `supabase/migrations/*_create_bookmarks.sql` - RLS 정책 예제
5. `app/admin/actions.ts` - 관리자 전용 서버 액션

---

## 실습하다 막히면

| 증상 | 해결 |
|---|---|
| "카카오맵 키가 필요합니다" 화면만 뜬다 | `.env.local` 채우고 **개발 서버 재시작** |
| 지도 자체가 안 뜬다 | 카카오 앱에 `http://localhost:3030` 도메인 등록했는지 확인 |
| 지도는 뜨는데 마커가 없다 | Supabase 환경변수 + 시드 마이그레이션 적용 여부 확인 |
| 로그인 눌렀는데 그냥 홈으로 돌아온다 | `redirectTo` 가 `/auth/callback` 을 가리켜야 합니다 (아래 참고) |
| `/admin` 이 홈으로 튕긴다 | `ADMIN_EMAILS` 가 카카오 계정 이메일과 같은지 확인 |
| 내 북마크가 계속 비어 있다 | RLS 정책 누락 (아래 참고) |

### 강의에서 꼭 짚는 두 가지 함정

**1. 로그인이 조용히 실패한다.**
`signInWithOAuth` 의 `redirectTo` 는 반드시 `/auth/callback` 을 거쳐야 합니다.
그냥 홈으로 돌려보내면 `?code=` 가 세션으로 교환되지 못하고 버려지는데, **에러가 안 납니다.** 그냥 로그아웃 상태로 남습니다.

**2. RLS 를 켜고 정책을 안 쓰면 전부 막힌다.**
사용자 데이터 테이블은 RLS 를 켜는 게 기본이고, 켰다면 select / insert / update / delete 정책을 같은 마이그레이션에 함께 씁니다.
정책이 없으면 아무도 아무것도 못 읽습니다. 그것도 조용히 빈 배열로요.

---

## 직접 해보기

강의를 다 들었다면 하나 골라 붙여 보세요.

1. **필터** - 콘센트 / 와이파이 / 소음으로 마커 거르기
2. **리스트 뷰** - 지금 보는 지도 영역 안의 카페만 목록으로
3. **"최근 확인됨"** - 정보가 언제 검증됐는지 표시, 오래된 건 흐리게
4. **카공 허용 필드** - `docs/scope.md` 가 "가장 차별화되는 데이터" 라고 한 항목인데 아직 스키마에 없습니다. 마이그레이션부터 필터까지 직접
5. **제보 알림** - 새 제보가 들어오면 운영자에게 슬랙/메일

---

## 함께 보기

- `docs/scope.md` - 왜 이 기능부터 만들었고 무엇을 미뤘는지
- `DESIGN.md` - 색·타이포·간격 토큰. UI 건드리기 전에 먼저
- `CLAUDE.md` - AI 코딩 에이전트에게 주는 프로젝트 규칙
