-- 카공맵 (cagongmap) — bookmarks (사용자 장소 북마크)
-- 최종 갱신: 2026-06-16
--
-- 사용자가 places 의 특정 장소를 개인 북마크로 저장한다.
-- per-user 데이터이므로 CLAUDE.md RLS 규칙(ownership = auth.uid() = user_id,
-- 4개 정책 전부)을 이 마이그레이션 안에 함께 둔다.

-- =====================================================================
-- 1. bookmarks 테이블
-- =====================================================================
create table public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  place_id    uuid not null references public.places (id) on delete cascade,
  created_at  timestamptz not null default now(),

  -- 같은 사용자가 같은 장소를 중복 저장하지 못하게
  unique (user_id, place_id)
);

-- 사용자별 북마크 목록 조회용
create index bookmarks_user_idx on public.bookmarks (user_id);

-- =====================================================================
-- 2. RLS — 본인 북마크만 읽기/쓰기 (auth.uid() = user_id)
-- =====================================================================
alter table public.bookmarks enable row level security;

create policy "select own bookmarks" on public.bookmarks
  for select using (auth.uid() = user_id);

create policy "insert own bookmarks" on public.bookmarks
  for insert with check (auth.uid() = user_id);

create policy "update own bookmarks" on public.bookmarks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own bookmarks" on public.bookmarks
  for delete using (auth.uid() = user_id);
