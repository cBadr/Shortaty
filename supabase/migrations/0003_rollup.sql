-- ============================================================
-- Daily rollup helper — called by a Vercel Cron job
-- ============================================================
create or replace function public.rollup_clicks_daily(
  p_from timestamptz default (now() - interval '2 days'),
  p_to   timestamptz default now()
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  -- Clear the affected day(s) and re-aggregate
  delete from public.clicks_daily
   where day >= (p_from at time zone 'UTC')::date
     and day <= (p_to   at time zone 'UTC')::date;

  insert into public.clicks_daily (
    link_id, day, country, os, device_type, total, unique_visitors, bots
  )
  select
    link_id,
    (clicked_at at time zone 'UTC')::date as day,
    coalesce(country, '')      as country,
    coalesce(os, '')           as os,
    coalesce(device_type, '')  as device_type,
    count(*)                                                  as total,
    count(*) filter (where is_unique)                         as unique_visitors,
    count(*) filter (where is_bot)                            as bots
  from public.clicks
  where clicked_at >= p_from
    and clicked_at <= p_to
  group by link_id, day, country, os, device_type;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;
