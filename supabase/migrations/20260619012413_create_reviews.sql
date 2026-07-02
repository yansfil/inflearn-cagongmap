-- 카공맵 (cagongmap) — reviews (사용자 장소 리뷰: good/normal/bad)
--
-- 사용자가 places 의 특정 장소를 3단계(good/normal/bad)로 평가한다.
-- per-user 데이터이므로 ownership = auth.uid() = user_id.
-- 장소당 1표(unique)로 강제하고, upsert 로 등급 변경/취소를 다룬다.
--
-- NOTE: 리뷰 집계는 즉시 반영이라 초기엔 select 를 public read 로 열었으나,
--       개별 리뷰 행을 공개하지 않기 위해 이후 마이그레이션
--       (reviews_privacy_and_counts) 에서 select 를 본인-only 로 조이고
--       집계는 review_counts(place_id) SECURITY DEFINER 함수로만 노출한다.

create type review_rating as enum ('good', 'normal', 'bad');

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  place_id    uuid not null references public.places (id) on delete cascade,
  rating      review_rating not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, place_id)
);

create index reviews_place_idx on public.reviews (place_id);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function set_updated_at();

alter table public.reviews enable row level security;

create policy "public read reviews" on public.reviews
  for select using (true);

create policy "insert own review" on public.reviews
  for insert with check (auth.uid() = user_id);

create policy "update own review" on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own review" on public.reviews
  for delete using (auth.uid() = user_id);
