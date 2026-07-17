create or replace view public.strategy_explorer
with (security_invoker = true)
as
select
  strategy.id,
  strategy.user_id,
  strategy.name,
  strategy.description,
  strategy.tags,
  strategy.archived_at,
  strategy.created_at,
  coalesce(stats.session_count, 0)::bigint as session_count,
  coalesce(stats.trade_count, 0)::bigint as trade_count,
  coalesce(stats.net_pnl, 0)::numeric as net_pnl,
  coalesce(stats.win_rate, 0)::numeric as win_rate,
  coalesce(stats.pairs, '{}')::text[] as pairs,
  coalesce((
    select avg(session.pnl_percent)
    from public.backtest_sessions as session
    where session.strategy_id = strategy.id
      and session.archived_at is null
  ), 0)::numeric as pnl_percent
from public.strategies as strategy
left join lateral (
  select
    count(distinct session.id) as session_count,
    count(trade.id) as trade_count,
    coalesce(sum(trade.net_pnl), 0) as net_pnl,
    case
      when count(trade.id) = 0 then 0
      else count(trade.id) filter (where trade.net_pnl > 0)::numeric / count(trade.id)
    end as win_rate,
    array_agg(distinct session.pair) filter (where session.pair is not null) as pairs
  from public.backtest_sessions as session
  left join public.backtest_trades as trade on trade.session_id = session.id
  where session.strategy_id = strategy.id
    and session.archived_at is null
) as stats on true;
