create table public.backtest_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  strategy text not null check (char_length(btrim(strategy)) between 1 and 80),
  pair text not null check (char_length(btrim(pair)) between 1 and 40),
  tags text[] not null default '{}',
  source_filename text not null check (char_length(source_filename) between 1 and 255),
  started_at timestamp without time zone not null,
  ended_at timestamp without time zone not null,
  period_days integer not null check (period_days >= 0),
  trade_count integer not null check (trade_count > 0),
  net_pnl numeric not null,
  pnl_percent numeric not null,
  created_at timestamptz not null default now(),
  check (ended_at >= started_at),
  check (cardinality(tags) <= 20)
);

create table public.backtest_trades (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.backtest_sessions(id) on delete cascade,
  trade_number integer not null check (trade_number > 0),
  side text not null check (side in ('long', 'short')),
  entry_at timestamp without time zone not null,
  exit_at timestamp without time zone not null,
  entry_signal text not null,
  exit_signal text not null,
  entry_price numeric not null check (entry_price >= 0),
  exit_price numeric not null check (exit_price >= 0),
  quantity numeric not null check (quantity > 0),
  position_value numeric not null check (position_value >= 0),
  net_pnl numeric not null,
  return_percent numeric not null,
  favorable_excursion numeric not null,
  favorable_excursion_percent numeric not null,
  adverse_excursion numeric not null,
  adverse_excursion_percent numeric not null,
  cumulative_pnl numeric not null,
  cumulative_pnl_percent numeric not null,
  duration_bars integer not null check (duration_bars >= 0),
  created_at timestamptz not null default now(),
  unique (session_id, trade_number),
  check (exit_at >= entry_at)
);

create index backtest_sessions_user_created_idx
  on public.backtest_sessions (user_id, created_at desc);
create index backtest_sessions_user_pair_idx
  on public.backtest_sessions (user_id, pair);
create index backtest_sessions_user_strategy_idx
  on public.backtest_sessions (user_id, strategy);
create index backtest_sessions_tags_idx
  on public.backtest_sessions using gin (tags);

alter table public.backtest_sessions enable row level security;
alter table public.backtest_trades enable row level security;

create policy "users can read their backtest sessions"
on public.backtest_sessions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can create their backtest sessions"
on public.backtest_sessions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can read trades from their sessions"
on public.backtest_trades for select
to authenticated
using (
  exists (
    select 1
    from public.backtest_sessions
    where backtest_sessions.id = backtest_trades.session_id
      and backtest_sessions.user_id = (select auth.uid())
  )
);

create policy "users can create trades in their sessions"
on public.backtest_trades for insert
to authenticated
with check (
  exists (
    select 1
    from public.backtest_sessions
    where backtest_sessions.id = backtest_trades.session_id
      and backtest_sessions.user_id = (select auth.uid())
  )
);

create or replace function public.create_backtest_session(
  p_name text,
  p_strategy text,
  p_pair text,
  p_tags text[],
  p_source_filename text,
  p_trades jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session_id uuid;
  v_started_at timestamp without time zone;
  v_ended_at timestamp without time zone;
  v_trade_count integer;
  v_net_pnl numeric;
  v_pnl_percent numeric;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if jsonb_typeof(p_trades) <> 'array'
    or jsonb_array_length(p_trades) = 0
    or jsonb_array_length(p_trades) > 10000 then
    raise exception 'Trades must contain between 1 and 10000 items'
      using errcode = '22023';
  end if;

  select
    min(trade.entry_at),
    max(trade.exit_at),
    count(*)::integer,
    coalesce(sum(trade.net_pnl), 0),
    (array_agg(trade.cumulative_pnl_percent order by trade.trade_number desc))[1]
  into
    v_started_at,
    v_ended_at,
    v_trade_count,
    v_net_pnl,
    v_pnl_percent
  from jsonb_to_recordset(p_trades) as trade(
    trade_number integer,
    entry_at timestamp without time zone,
    exit_at timestamp without time zone,
    net_pnl numeric,
    cumulative_pnl_percent numeric
  );

  insert into public.backtest_sessions (
    user_id,
    name,
    strategy,
    pair,
    tags,
    source_filename,
    started_at,
    ended_at,
    period_days,
    trade_count,
    net_pnl,
    pnl_percent
  )
  values (
    v_user_id,
    btrim(p_name),
    btrim(p_strategy),
    upper(btrim(p_pair)),
    array(
      select distinct btrim(tag)
      from unnest(coalesce(p_tags, '{}'::text[])) as tag
      where btrim(tag) <> ''
      limit 20
    ),
    p_source_filename,
    v_started_at,
    v_ended_at,
    (v_ended_at::date - v_started_at::date),
    v_trade_count,
    v_net_pnl,
    v_pnl_percent
  )
  returning id into v_session_id;

  insert into public.backtest_trades (
    session_id,
    trade_number,
    side,
    entry_at,
    exit_at,
    entry_signal,
    exit_signal,
    entry_price,
    exit_price,
    quantity,
    position_value,
    net_pnl,
    return_percent,
    favorable_excursion,
    favorable_excursion_percent,
    adverse_excursion,
    adverse_excursion_percent,
    cumulative_pnl,
    cumulative_pnl_percent,
    duration_bars
  )
  select
    v_session_id,
    trade.trade_number,
    lower(trade.side),
    trade.entry_at,
    trade.exit_at,
    trade.entry_signal,
    trade.exit_signal,
    trade.entry_price,
    trade.exit_price,
    trade.quantity,
    trade.position_value,
    trade.net_pnl,
    trade.return_percent,
    trade.favorable_excursion,
    trade.favorable_excursion_percent,
    trade.adverse_excursion,
    trade.adverse_excursion_percent,
    trade.cumulative_pnl,
    trade.cumulative_pnl_percent,
    trade.duration_bars
  from jsonb_to_recordset(p_trades) as trade(
    trade_number integer,
    side text,
    entry_at timestamp without time zone,
    exit_at timestamp without time zone,
    entry_signal text,
    exit_signal text,
    entry_price numeric,
    exit_price numeric,
    quantity numeric,
    position_value numeric,
    net_pnl numeric,
    return_percent numeric,
    favorable_excursion numeric,
    favorable_excursion_percent numeric,
    adverse_excursion numeric,
    adverse_excursion_percent numeric,
    cumulative_pnl numeric,
    cumulative_pnl_percent numeric,
    duration_bars integer
  );

  return v_session_id;
end;
$$;

revoke all on table public.backtest_sessions from anon;
revoke all on table public.backtest_trades from anon;
grant select, insert on table public.backtest_sessions to authenticated;
grant select, insert on table public.backtest_trades to authenticated;
grant usage, select on sequence public.backtest_trades_id_seq to authenticated;

revoke execute on function public.create_backtest_session(text, text, text, text[], text, jsonb)
  from public, anon;
grant execute on function public.create_backtest_session(text, text, text, text[], text, jsonb)
  to authenticated;
