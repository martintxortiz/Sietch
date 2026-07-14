alter table public.backtest_sessions
  add column account_size numeric check (account_size > 0),
  add column report_filename text
    check (report_filename is null or char_length(report_filename) between 1 and 255);

create table public.backtest_session_metrics (
  session_id uuid not null references public.backtest_sessions(id) on delete cascade,
  category text not null
    check (category in ('performance', 'trades_analysis', 'risk_adjusted')),
  metric_key text not null check (char_length(metric_key) between 1 and 80),
  metric_label text not null check (char_length(metric_label) between 1 and 120),
  scope text not null check (scope in ('all', 'long', 'short')),
  unit text not null
    check (unit in ('amount', 'percent', 'count', 'ratio', 'bars', 'duration')),
  value numeric not null,
  primary key (session_id, metric_key, scope, unit)
);

create index backtest_trades_session_exit_idx
  on public.backtest_trades (session_id, exit_at desc);

alter table public.backtest_session_metrics enable row level security;

create policy "users can read metrics from their sessions"
on public.backtest_session_metrics for select
to authenticated
using (
  exists (
    select 1
    from public.backtest_sessions
    where backtest_sessions.id = backtest_session_metrics.session_id
      and backtest_sessions.user_id = (select auth.uid())
  )
);

create policy "users can create metrics in their sessions"
on public.backtest_session_metrics for insert
to authenticated
with check (
  exists (
    select 1
    from public.backtest_sessions
    where backtest_sessions.id = backtest_session_metrics.session_id
      and backtest_sessions.user_id = (select auth.uid())
  )
);

drop function public.create_backtest_session(text, text, text, text[], text, jsonb);

create function public.create_backtest_sessions(p_sessions jsonb)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session jsonb;
  v_trades jsonb;
  v_metrics jsonb;
  v_session_id uuid;
  v_session_ids uuid[] := '{}';
  v_started_at timestamp without time zone;
  v_ended_at timestamp without time zone;
  v_trade_count integer;
  v_net_pnl numeric;
  v_pnl_percent numeric;
  v_account_size numeric;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if jsonb_typeof(p_sessions) <> 'array'
    or jsonb_array_length(p_sessions) = 0
    or jsonb_array_length(p_sessions) > 10 then
    raise exception 'Sessions must contain between 1 and 10 items'
      using errcode = '22023';
  end if;

  for v_session in select value from jsonb_array_elements(p_sessions)
  loop
    v_trades := v_session -> 'trades';
    v_metrics := coalesce(v_session -> 'metrics', '[]'::jsonb);
    v_account_size := (v_session ->> 'account_size')::numeric;

    if jsonb_typeof(v_trades) <> 'array'
      or jsonb_array_length(v_trades) = 0
      or jsonb_array_length(v_trades) > 10000 then
      raise exception 'Each session must contain between 1 and 10000 trades'
        using errcode = '22023';
    end if;

    if jsonb_typeof(v_metrics) <> 'array'
      or jsonb_array_length(v_metrics) > 500 then
      raise exception 'Each session can contain at most 500 metrics'
        using errcode = '22023';
    end if;

    if v_account_size is null or v_account_size <= 0 then
      raise exception 'Account size must be positive' using errcode = '22023';
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
    from jsonb_to_recordset(v_trades) as trade(
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
      report_filename,
      account_size,
      started_at,
      ended_at,
      period_days,
      trade_count,
      net_pnl,
      pnl_percent
    )
    values (
      v_user_id,
      btrim(v_session ->> 'name'),
      btrim(v_session ->> 'strategy'),
      upper(btrim(v_session ->> 'pair')),
      array(
        select distinct btrim(tag)
        from jsonb_array_elements_text(coalesce(v_session -> 'tags', '[]'::jsonb)) as tag
        where btrim(tag) <> ''
        limit 20
      ),
      v_session ->> 'source_filename',
      nullif(v_session ->> 'report_filename', ''),
      v_account_size,
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
    from jsonb_to_recordset(v_trades) as trade(
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

    insert into public.backtest_session_metrics (
      session_id,
      category,
      metric_key,
      metric_label,
      scope,
      unit,
      value
    )
    select
      v_session_id,
      metric.category,
      metric.metric_key,
      metric.metric_label,
      metric.scope,
      metric.unit,
      metric.value
    from jsonb_to_recordset(v_metrics) as metric(
      category text,
      metric_key text,
      metric_label text,
      scope text,
      unit text,
      value numeric
    );

    v_session_ids := array_append(v_session_ids, v_session_id);
  end loop;

  return v_session_ids;
end;
$$;

revoke all on table public.backtest_session_metrics from anon;
grant select, insert on table public.backtest_session_metrics to authenticated;

revoke execute on function public.create_backtest_sessions(jsonb) from public, anon;
grant execute on function public.create_backtest_sessions(jsonb) to authenticated;
