create or replace view public.backtest_session_explorer
with (security_invoker = true)
as
select
  session.id,
  session.name,
  session.strategy_id,
  strategy.name as strategy_name,
  session.pair,
  session.tags,
  session.period_days,
  session.trade_count,
  session.pnl_percent,
  session.created_at,
  session.account_size,
  session.report_filename,
  session.report_path
from public.backtest_sessions as session
join public.strategies as strategy on strategy.id = session.strategy_id
where session.archived_at is null;

create or replace view public.backtest_session_filter_options
with (security_invoker = true)
as
select distinct 'pairs'::text as kind, session.pair as value
from public.backtest_sessions as session
where session.archived_at is null
union all
select distinct 'strategies'::text as kind, strategy.name as value
from public.backtest_sessions as session
join public.strategies as strategy on strategy.id = session.strategy_id
where session.archived_at is null
union all
select distinct 'tags'::text as kind, tag as value
from public.backtest_sessions as session
cross join lateral unnest(session.tags) as tag
where session.archived_at is null;

revoke all on table public.backtest_session_explorer from anon;
revoke all on table public.backtest_session_filter_options from anon;
grant select on table public.backtest_session_explorer to authenticated;
grant select on table public.backtest_session_filter_options to authenticated;
