---
name: monitoring
description: >-
  운영 중인 웹 서비스의 최근 상태(기본 24시간)를 서비스 운영 데이터·배포 플랫폼·백엔드
  로그 세 영역에서 점검하고, 결과를 "정상 / 주의 / 확인 필요"로 요약한 뒤 사람이 바로
  봐야 할 것과 재현·조사가 필요한 것으로 나눠 보고한다. 사용자가 "운영 상태", "모니터링",
  "헬스 체크", "서비스 상태 확인", "최근 N시간 상태", "지금 문제 없어?", "대시보드",
  "monitoring / health check / ops status" 같은 요청을 하거나, 배포 후 상태를 확인하려
  할 때 이 skill 을 사용한다. Vercel·Supabase 스택을 기본 대상으로 하되 다른 스택에도
  일반 원칙을 적용한다. 조회 전용(비파괴) 점검만 수행한다.
---

# 서비스 운영 모니터링 (monitoring)

운영 중인 서비스의 최근 상태를 **읽기 전용으로** 점검하고, 사람이 바로 행동할 수 있게
정리한다. 목표는 로그를 나열하는 게 아니라 **"지금 정상인가, 사람이 손대야 할 게 있는가"**
를 명확히 판정하는 것이다.

이 skill 은 세 영역을 본다:

- **서비스 운영 데이터** — 신규 가입, 미처리 제보/요청 등 사람이 처리해야 하는 큐가
  쌓였는가. (DB 실측)
- **배포 플랫폼** — production 배포가 정상인가, 런타임 에러·5XX 가 나는가. (Vercel)
- **백엔드 로그** — 인증 실패, 저장/조회 에러, 권한(RLS)으로 막힌 요청이 있는가. (Supabase)

## 원칙

- **조회 전용.** insert/update/delete/DDL 을 하지 않는다. 상태를 바꾸지 않고 읽기만 한다.
  발견한 문제를 고치는 것은 이 skill 의 일이 아니다. 보고까지가 범위이고, 수정은 사용자가
  결정한 뒤 별도로 한다.
- **판정부터.** 로그 덤프가 아니라 **정상/주의/확인 필요** 판정을 먼저 낸다.
- **사람이 바로 볼 것을 분리한다.** "지금 클릭 한 번으로 처리할 것"과 "재현·조사가 필요한
  것"을 섞지 않는다.
- **기본 창은 최근 24시간.** 사용자가 다른 기간(1h, 7d 등)을 말하면 그에 맞춘다.
- **에러 0건도 근거를 남긴다.** "에러 없음"은 조회 결과가 비어 있음을 확인한 결과여야지,
  조회를 안 해서 없는 게 아니다.

## 절차

### 0. 도구 로드

MCP 도구가 deferred 라면 **한 번의 ToolSearch 로** 필요한 것을 모두 로드한다. 기본 세트:

```
select:mcp__supabase__list_tables,mcp__supabase__execute_sql,mcp__supabase__get_logs,mcp__supabase__get_advisors,mcp__vercel__list_projects,mcp__vercel__list_deployments,mcp__vercel__get_runtime_errors,mcp__vercel__get_runtime_logs,mcp__vercel__list_teams
```

### 1. 대상 파악

- **Vercel**: `list_teams` → `list_projects(teamId)` 로 팀/프로젝트 ID 를 얻는다.
  `.vercel/project.json` 이 있으면 거기서 바로 읽는다.
- **Supabase**: `list_tables(verbose:true)` 로 테이블·컬럼(특히 `created_at`, `status`
  같은 시각·상태 컬럼)을 확인한다. 이걸 알아야 "최근 24h", "미처리(pending)" 를 정확히
  집계할 수 있다.

이 단계는 서로 의존이 없으니 **병렬로** 호출한다.

### 2. 세 영역 병렬 조회

한 번에 병렬로 던진다. 서로 결과를 기다릴 필요가 없다.

**서비스 운영 데이터 (`execute_sql`)** — 한 방의 SQL 로 핵심 지표를 모은다. 이 프로젝트
기준 예시(스키마에 맞게 조정):

```sql
select 'new_users_24h' as metric, count(*)::text as value
from auth.users where created_at > now() - interval '24 hours'
union all select 'submissions_pending', count(*)::text
from public.place_submissions where status = 'pending'
union all select 'edit_requests_pending', count(*)::text
from public.place_edit_requests where status = 'pending';
-- + 24h 신규 제보/수정요청/리뷰 등 활동 지표
```

핵심은 **사람이 처리해야 하는 큐**(`status = 'pending'` 인 제보·수정요청)와 **24시간
활동량**(가입·제보·리뷰)을 구분해서 뽑는 것.

**배포 플랫폼 (Vercel)**
- `list_deployments(projectId, teamId)` — 최신 production 배포의 `state`(READY 여야
  정상), 커밋 메시지, 실패 배포 유무.
- `get_runtime_errors(projectId, teamId, since:"24h")` — 그룹핑된 런타임 에러 클러스터.
- `get_runtime_logs(..., environment:"production", group_by:"statusCode", since:"24h")`
  — 5XX/4XX 상태코드 분포. 비어 있으면 서버리스 에러 없음.

**백엔드 로그 (Supabase `get_logs`)** — 서비스별로 조회:
- `auth` — login/token 이 200 인가, 실패(4xx/5xx) 가 있는가.
- `api` — REST 요청 중 에러 상태코드, RLS 로 막힌 403/401 흔적.
- `postgres` — `error_severity: ERROR` 로그(문법 오류·제약 위반 등). 관리용 일회성
  쿼리 오류는 사용자 트래픽과 구분한다.
- `storage` — 업로드/조회 실패. (필요 시)

### 3. (선택) advisor 로 미결 리스크 확인

`get_advisors(type:"security")`, 필요하면 `type:"performance"`. 장애는 아니지만 사람이
결정해야 할 미결 항목(RLS 누락, 노출된 함수, 비밀번호 보호 등)을 "확인 필요" 로 넣는다.
이미 알려진/의도된 설계(예: 집계용 SECURITY DEFINER RPC)는 그렇게 표시해 소음을 줄인다.

### 4. 판정

세 영역을 종합해 전체 상태를 하나로 판정한다:

- **🟢 정상** — 배포 READY, 런타임/5XX 에러 0건, 인증·DB·스토리지 실패 없음, 처리
  대기 큐 없음(또는 정상 범위).
- **🟡 주의** — 장애는 없지만 사람이 곧 처리해야 할 것이 있음(미처리 제보/요청 누적,
  비차단 보안 warning, 봇 트래픽 급증 등).
- **🔴 확인 필요** — 실제 장애 신호(배포 ERROR/실패, 런타임·5XX 에러 발생, 인증/DB
  실패 로그, RLS 거부 급증). 재현·조사가 필요.

## 출력 형식

항상 이 구조로 보고한다:

```
# {서비스명} 운영 상태 — 최근 {기간}

## 전체 상태: 🟢 정상 / 🟡 주의 / 🔴 확인 필요
(한 문장 근거)

## 영역별 요약
1. 서비스 운영 데이터 — 가입/제보/수정요청/활동 (표)
2. 배포 플랫폼 — 최신 배포 state, 런타임 에러 수, 5XX 수
3. 백엔드 로그 — Auth / DB / Storage / RLS 결과

## 바로 볼 것
사람이 지금 클릭 한 번으로 처리할 것. 없으면 "없음" 이라고 명시.
(예: 미처리 수정 요청 1건 → /admin/reports 에서 처리)

## 재현 / 조사가 필요한 항목
장애 신호나 판단이 필요한 미결 리스크. 각 항목에 실위험 수준을 붙인다.
없으면 "실장애 없음" 이라고 명시.
```

**바로 볼 것**과 **재현/조사가 필요한 항목**을 반드시 나눈다. 전자는 "지금 처리 가능한
운영 액션", 후자는 "원인 파악이나 사람의 판단이 필요한 것"이다. 둘을 섞으면 사람이 뭘
먼저 해야 할지 흐려진다.

마지막에 후속 액션(대기 큐 내용 조회, 특정 에러 재현 등)을 **제안만** 하고, 사용자가
요청하기 전에 상태를 바꾸는 조치는 하지 않는다.

## 다른 스택에 적용할 때

Vercel/Supabase 가 아니면 같은 세 렌즈를 그 스택의 도구로 매핑한다: 배포 플랫폼(Netlify/
Fly/Cloud Run 등)의 배포 상태·에러율, 로그 수집기(CloudWatch/Datadog/Sentry)의 에러·
지연, 운영 DB 의 처리 대기 큐. 도구가 없으면 무엇을 못 봤는지 **명시**하고, 본 것만으로
판정하지 않는다.
