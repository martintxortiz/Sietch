alter table public.backtest_trades
  add column if not exists tags text[] not null default '{}';

alter table public.backtest_trades
  drop constraint if exists backtest_trades_tags_limit,
  add constraint backtest_trades_tags_limit check (cardinality(tags) <= 20);

grant update (entry_signal, exit_signal, tags)
  on table public.backtest_trades to authenticated;

create index if not exists backtest_trades_session_entry_idx
  on public.backtest_trades (session_id, entry_at desc, id desc);

create index if not exists backtest_trades_tags_idx
  on public.backtest_trades using gin (tags);

create or replace view public.backtest_trade_explorer
with (security_invoker = true)
as
select
  trade.id,
  trade.session_id,
  trade.trade_number,
  trade.side,
  trade.entry_at,
  trade.exit_at,
  trade.entry_signal,
  trade.exit_signal,
  trade.net_pnl,
  trade.tags,
  session.name as session_name,
  session.pair,
  session.tags as session_tags,
  session.strategy_id,
  strategy.name as strategy_name
from public.backtest_trades as trade
join public.backtest_sessions as session on session.id = trade.session_id
join public.strategies as strategy on strategy.id = session.strategy_id
where session.archived_at is null;

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
  coalesce(stats.pairs, '{}')::text[] as pairs
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

revoke all on table public.backtest_trade_explorer from anon;
revoke all on table public.strategy_explorer from anon;
grant select on table public.backtest_trade_explorer to authenticated;
grant select on table public.strategy_explorer to authenticated;
