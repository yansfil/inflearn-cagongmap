-- 카공맵 (cagongmap) — 리뷰 프라이버시 조정 + 집계 함수
--
-- reviews.select 를 public read 에서 본인-only 로 조인다. 대신 장소별 집계는
-- review_counts(place_id) SECURITY DEFINER 함수로만 노출해, 개별 리뷰 행
-- (누가 무엇을 눌렀는지)을 공개하지 않으면서 good/normal/bad 카운트만 읽게 한다.

drop policy if exists "public read reviews" on public.reviews;

create policy "select own review" on public.reviews
  for select using (auth.uid() = user_id);

create or replace function public.review_counts(p_place_id uuid)
returns table (good bigint, normal bigint, bad bigint)
language sql
security definer
set search_path = public
as $$
  select
    count(*) filter (where rating = 'good')   as good,
    count(*) filter (where rating = 'normal') as normal,
    count(*) filter (where rating = 'bad')    as bad
  from public.reviews
  where place_id = p_place_id;
$$;

grant execute on function public.review_counts(uuid) to anon, authenticated;
