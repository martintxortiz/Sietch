create or replace view public.backtest_upload_calendar
with (security_invoker = true)
as
select
  (created_at at time zone 'UTC')::date as upload_date,
  count(*)::bigint as upload_count
from public.backtest_sessions
group by (created_at at time zone 'UTC')::date;

revoke all on table public.backtest_upload_calendar from anon;
grant select on table public.backtest_upload_calendar to authenticated;
