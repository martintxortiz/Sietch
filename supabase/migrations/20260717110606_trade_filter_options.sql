create or replace view public.backtest_trade_tag_options
with (security_invoker = true)
as
select distinct tag
from public.backtest_trades as trade
join public.backtest_sessions as session on session.id = trade.session_id
cross join lateral unnest(trade.tags) as tag
where session.archived_at is null;

revoke all on table public.backtest_trade_tag_options from anon;
grant select on table public.backtest_trade_tag_options to authenticated;
