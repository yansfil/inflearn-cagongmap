-- 카공맵 (cagongmap) — place_submissions (새 장소 제보)
--
-- 로그인 사용자가 목록에 없는 카페를 네이버 URL + 사진 여러 장 + 메모로 제보한다.
-- places 에 즉시 반영하지 않고 status='pending' 으로 쌓는다. 좌표/주소 보강 및
-- 승인은 운영자가 service_role 로 수동 처리(이번 범위 밖).
--
-- 제보는 특정 place 에 종속되지 않으므로 place_id 가 없다.
-- per-user 데이터: ownership = auth.uid() = user_id.

create table public.place_submissions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  naver_place_url text not null,
  memo            text,
  photos          text[] not null default '{}',
  status          submission_status not null default 'pending',
  created_at      timestamptz not null default now()
);

create index place_submissions_status_idx on public.place_submissions (status);

alter table public.place_submissions enable row level security;

create policy "select own submissions" on public.place_submissions
  for select using (auth.uid() = user_id);

create policy "insert own submissions" on public.place_submissions
  for insert with check (auth.uid() = user_id);

create policy "update own submissions" on public.place_submissions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own submissions" on public.place_submissions
  for delete using (auth.uid() = user_id);
