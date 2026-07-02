-- 카공맵 (cagongmap) — place_edit_requests (기존 장소 정보 수정 요청)
--
-- 로그인 사용자가 기존 place 에 대한 수정 요청을 자유 메모 + 사진으로 제출한다.
-- 공개 데이터(places)에는 즉시 반영하지 않고 status='pending' 으로 쌓는다.
-- 승인/거절(pending→approved/rejected)은 운영자가 service_role 로 수동 처리.
--
-- per-user 데이터: ownership = auth.uid() = user_id. 본인은 자기 제출을
-- 조회/수정/취소할 수 있다(update/delete own). status 자체를 사용자가
-- approved 로 바꿔도 places 반영 로직이 없어 공개 데이터에 영향은 없다.

create type submission_status as enum ('pending', 'approved', 'rejected');

create table public.place_edit_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  place_id    uuid not null references public.places (id) on delete cascade,
  memo        text,
  photos      text[] not null default '{}',
  status      submission_status not null default 'pending',
  created_at  timestamptz not null default now()
);

create index place_edit_requests_status_idx on public.place_edit_requests (status);

alter table public.place_edit_requests enable row level security;

create policy "select own edit requests" on public.place_edit_requests
  for select using (auth.uid() = user_id);

create policy "insert own edit requests" on public.place_edit_requests
  for insert with check (auth.uid() = user_id);

create policy "update own edit requests" on public.place_edit_requests
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own edit requests" on public.place_edit_requests
  for delete using (auth.uid() = user_id);
