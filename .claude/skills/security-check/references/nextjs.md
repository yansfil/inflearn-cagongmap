# Next.js 보안 점검 체크리스트

App Router / Pages Router 웹 앱에서 자주 뚫리는 지점. 정적 검사 때 이 목록으로 훑고,
동적 점검 때 해당 경로를 찔러본다.

## 인증·인가 진입점

- **Server Action** (`"use server"`): 각 액션 **첫 줄**에서 인증·인가를 재확인하는가.
  레이아웃/미들웨어 가드는 방어의 이중화일 뿐, Server Action 은 URL 없이 직접 호출될 수
  있어 **자체 가드가 없으면 무방비**다. `revalidate`/`redirect` 앞에 가드가 있는지 본다.
- **Route Handler** (`app/**/route.ts`, `pages/api/**`): 핸들러마다 세션 확인 +
  권한 확인이 있는가. `GET` 은 열어두고 `POST` 만 막는 식의 누락을 찾는다.
- **middleware.ts**: 무엇을 하는가. 흔한 함정 — 미들웨어가 **세션 갱신만** 하고 접근
  차단은 안 하는데 이를 "보호됨"으로 오해하는 경우. `matcher` 에서 **제외된 경로**
  (`auth/callback`, 정적 자산)가 보호 대상이면 안 되는지 확인한다.
- **레이아웃 가드**(`app/admin/layout.tsx` 등): 서버 컴포넌트에서 리다이렉트하는가.
  이건 route 진입은 막지만, 같은 데이터를 쓰는 **Server Action·API 는 별도로** 막아야
  한다(가드는 라우트를 따라다니지 capability 를 따라다니지 않는다).

## 시크릿·환경변수 노출

- `NEXT_PUBLIC_` 접두사가 붙은 값은 **클라이언트 번들에 그대로 노출**된다. 여기에
  service_role·secret·private key 가 붙어 있으면 치명적. anon/publishable key 만 허용.
- server-only 모듈(`import "server-only"`)이 클라이언트 컴포넌트(`"use client"`)에서
  import 되는 경로가 있는지. 있으면 빌드가 시크릿을 번들에 넣을 수 있다.
- `.env.local` / `.env*` 가 `.gitignore` 에 있고 git 에 추적되지 않는지
  (`git ls-files --error-unmatch .env.local`, `git log --all -- .env.local`).
- `next.config.js` 의 `env`/`publicRuntimeConfig` 로 시크릿이 새는지.

## IDOR·mass assignment

- 동적 세그먼트(`[id]`, `[slug]`)로 데이터를 조회·수정하는 페이지/액션이 **소유자 확인
  없이** id 만으로 접근하면 IDOR 후보. 동적 점검에서 남의 id 로 찔러본다.
- `FormData`/JSON body 를 통째로 DB 에 반영하는 액션 — `user_id`·`role`·`status`·
  `price` 같은 필드를 클라이언트가 덮어쓸 수 있는지. 허용 필드 화이트리스트가 있는지.

## 응답 과다 노출

- 서버 컴포넌트/API 가 필요한 컬럼만 select 하는가, 아니면 `select *` 로 이메일·내부 id·
  다른 사용자 정보까지 내려주는가.
- 관리자용 조회(예: 제보자 이메일)가 일반 사용자 응답 경로로 새지 않는지.

## 보안 헤더 / CSP

- `next.config.js` `headers()` 에 기본 보안 헤더가 있는가:
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`(또는 CSP frame-ancestors),
  `Referrer-Policy`, `Permissions-Policy`.
- **CSP**: 없으면 XSS 방어선이 약하다. 도입 시 앱이 깨지기 쉬우므로 **`Content-Security-
  Policy-Report-Only` 로 먼저** 넣어 위반을 수집한 뒤 enforce 로 승격하는 걸 권한다.
  실기동(로컬/운영)에서 브라우저 콘솔의 CSP 위반을 확인해 정책을 실제 출처에 맞춘다
  (외부 SDK·폰트·이미지 CDN·API origin 이 흔한 누락 지점).

## 동적 점검 스니펫

```bash
# 비로그인 보호 페이지 접근 → 리다이렉트/차단 확인
curl -sI https://<host>/admin | grep -iE "HTTP/|location"

# 보안 헤더 확인
curl -sI https://<host>/ | grep -iE "content-security-policy|x-frame|x-content-type|referrer-policy|permissions-policy"

# 에러 응답이 스택/내부경로 흘리는지 (없는 리소스·깨진 입력 유도)
curl -s https://<host>/api/<endpoint>?id=___invalid___ | head -c 400
```

로그인 세션이 필요한 IDOR·admin API 점검은 브라우저 자동화(예: `playwright-cli`)로
세션을 잡은 뒤 fetch 로 상태코드를 확인한다. 쓰기(수정/삭제)는 파괴 금지 규칙을 지킨다.
