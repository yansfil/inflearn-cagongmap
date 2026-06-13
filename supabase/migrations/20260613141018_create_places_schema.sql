-- 카공맵 (cagongmap) — Supabase / Postgres 스키마 초안
-- 최종 갱신: 2026-06-13
--
-- 설계 근거:
--   1. 기본 데이터: data/cafes.json (운영자 시드, ~9개) 의 실제 필드를 기준으로 함.
--   2. 콘센트·와이파이 속성을 enum 으로 정규화.
--      → '카공 허용'은 별도 필드로 두지 않음: 카공 가능한 장소만 데이터로 넣으므로
--        모든 행이 항상 true 라 필터·컬럼으로서 의미가 없음.
--
-- JSON ↔ scope.md 격차 정리 (CLAUDE.md 의 data schema caveat):
--   - outlet:   JSON 은 many/some 2단계, scope 는 4단계(many/some/few/none).
--               → 4단계 enum 으로 통일하고 마이그레이션 시 many/some 만 채움.
--   - wifi:     JSON 은 boolean, scope 는 3단계(stable/yes/no).
--               → 3단계 enum 으로 통일, boolean true → 'yes' 로 매핑.
--
-- 제보(UGC)는 MVP 이후 단계. 추후 별도 제보 테이블을 추가해 검토 후 places 에 반영.

-- =====================================================================
-- 0. 확장
-- =====================================================================
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- =====================================================================
-- 1. ENUM 타입 (콘센트·와이파이 핵심 속성 + 작업 적합도/소음)
-- =====================================================================
create type outlet_level   as enum ('many', 'some', 'few', 'none');   -- 콘센트: 많음/보통/적음/없음
create type wifi_level     as enum ('stable', 'yes', 'no');           -- 와이파이: 있음·안정/있음/없음
create type noise_level    as enum ('quiet', 'normal', 'loud');       -- 소음 (JSON: quiet/normal)
create type work_fit_level as enum ('good', 'ok', 'bad');             -- 작업 적합도 (JSON: good/ok)

-- =====================================================================
-- 2. places — 검증된 라이브 장소 (지도에 노출되는 단일 진실원)
-- =====================================================================
create table places (
  id                  uuid primary key default gen_random_uuid(),

  -- 위치 (필수, 지도 핀)
  name                text not null,
  address             text not null,
  lat                 double precision not null,
  lng                 double precision not null,
  naver_place_url     text,                 -- 상세 링크 (지도는 카카오, 상세는 네이버)

  -- 영업
  open_time           time,                 -- JSON "12:00" 등
  close_time          time,                 -- 자정 넘김은 is_24h / 텍스트로 보강
  is_24h              boolean not null default false,
  iced_americano_price integer,             -- 원 단위, 가격대 가늠용

  -- 핵심 속성 (scope.md) — 카공 허용은 별도 필드 없음(아래 NOTE)
  -- NOTE: 카공 가능한 장소만 데이터로 넣으므로 '카공 허용'은 전 행 true.
  --       필터/컬럼으로 두지 않고, 데이터 수집 단계의 입력 기준으로만 적용.
  outlet              outlet_level,
  wifi                wifi_level,

  -- 부가 속성
  noise               noise_level,
  work_fit            work_fit_level,
  tags                text[] not null default '{}',  -- ["넓은매장","콘센트많음",...]
  photos              text[] not null default '{}',  -- 사진 URL 1~2장 (scope: 분위기)

  -- 신선도 / 메타
  verified_at         timestamptz,          -- "최근 확인됨" 타임스탬프 (scope)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index places_geo_idx     on places (lat, lng);  -- 권역/지도 범위 조회
create index places_outlet_idx  on places (outlet);    -- 핵심 필터 1
create index places_wifi_idx    on places (wifi);      -- 핵심 필터 2

-- =====================================================================
-- 3. updated_at 자동 갱신 트리거
-- =====================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger places_set_updated_at
  before update on places
  for each row execute function set_updated_at();

-- =====================================================================
-- 4. RLS (Supabase) — 라이브 데이터는 공개 읽기, 쓰기는 운영자만
-- =====================================================================
alter table places enable row level security;

-- 장소: 누구나 읽기 (지도 노출). 쓰기는 service_role(운영자)만 → RLS 우회.
create policy places_public_read on places
  for select using (true);
