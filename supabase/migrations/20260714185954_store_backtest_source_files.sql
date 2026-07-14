alter table public.backtest_sessions
  add column source_path text,
  add column report_path text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'backtest-imports',
  'backtest-imports',
  false,
  26214400,
  array[
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
);

create policy "users can read their backtest imports"
on storage.objects for select
to authenticated
using (
  bucket_id = 'backtest-imports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "users can upload their backtest imports"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'backtest-imports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "users can delete their backtest imports"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'backtest-imports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop function public.create_backtest_session(text, uuid, text, text[], text, jsonb, numeric);
drop function public.update_backtest_session(uuid, text, uuid, text, text[], numeric, text, jsonb);

create function public.create_backtest_session(
  p_session_id uuid,
  p_name text,
  p_strategy_id uuid,
  p_pair text,
  p_tags text[],
  p_source_filename text,
  p_source_path text,
  p_trades jsonb,
  p_account_size numeric default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_started_at timestamp without time zone;
  v_ended_at timestamp without time zone;
  v_trade_count integer;
  v_net_pnl numeric;
  v_pnl_percent numeric;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_session_id is null
    or p_source_path is null
    or p_source_path <> format('%s/%s/trades.csv', v_user_id, p_session_id) then
    raise exception 'Invalid source path' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.strategies
    where id = p_strategy_id and user_id = v_user_id
  ) then
    raise exception 'Choose one of your strategies' using errcode = '42501';
  end if;

  if p_account_size is not null and p_account_size <= 0 then
    raise exception 'Account size must be positive' using errcode = '22023';
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
    id,
    user_id,
    name,
    strategy_id,
    pair,
    tags,
    source_filename,
    source_path,
    account_size,
    started_at,
    ended_at,
    period_days,
    trade_count,
    net_pnl,
    pnl_percent
  )
  values (
    p_session_id,
    v_user_id,
    btrim(p_name),
    p_strategy_id,
    upper(btrim(p_pair)),
    array(
      select distinct btrim(tag)
      from unnest(coalesce(p_tags, '{}'::text[])) as tag
      where btrim(tag) <> ''
      limit 20
    ),
    p_source_filename,
    p_source_path,
    p_account_size,
    v_started_at,
    v_ended_at,
    (v_ended_at::date - v_started_at::date),
    v_trade_count,
    v_net_pnl,
    v_pnl_percent
  );

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
    p_session_id,
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

  return p_session_id;
end;
$$;

create function public.update_backtest_session(
  p_session_id uuid,
  p_name text,
  p_strategy_id uuid,
  p_pair text,
  p_tags text[],
  p_account_size numeric,
  p_report_filename text default null,
  p_report_path text default null,
  p_metrics jsonb default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_trade_count integer;
  v_report_trade_count numeric;
  v_report_account_size numeric;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select trade_count into v_trade_count
  from public.backtest_sessions
  where id = p_session_id and user_id = v_user_id;

  if not found then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.strategies
    where id = p_strategy_id and user_id = v_user_id
  ) then
    raise exception 'Choose one of your strategies' using errcode = '42501';
  end if;

  if p_metrics is not null then
    if jsonb_typeof(p_metrics) <> 'array'
      or jsonb_array_length(p_metrics) = 0
      or jsonb_array_length(p_metrics) > 500 then
      raise exception 'Report metrics must contain between 1 and 500 items'
        using errcode = '22023';
    end if;

    select
      max(metric.value) filter (
        where metric.metric_key = 'total_trades'
          and metric.scope = 'all'
          and metric.unit = 'count'
      ),
      max(metric.value) filter (
        where metric.metric_key = 'initial_capital'
          and metric.scope = 'all'
          and metric.unit = 'amount'
      )
    into v_report_trade_count, v_report_account_size
    from jsonb_to_recordset(p_metrics) as metric(
      metric_key text,
      scope text,
      unit text,
      value numeric
    );

    if v_report_trade_count is null or v_report_trade_count <> v_trade_count then
      raise exception 'The XLSX does not match this session trade count'
        using errcode = '22023';
    end if;

    if v_report_account_size is null or v_report_account_size <= 0 then
      raise exception 'The XLSX initial capital is invalid' using errcode = '22023';
    end if;

    if nullif(p_report_filename, '') is null
      or p_report_path is null
      or p_report_path not like format('%s/%s/report-%%.xlsx', v_user_id, p_session_id) then
      raise exception 'Invalid report file' using errcode = '22023';
    end if;

    p_account_size := v_report_account_size;
  elsif p_account_size is not null and p_account_size <= 0 then
    raise exception 'Account size must be positive' using errcode = '22023';
  end if;

  update public.backtest_sessions
  set
    name = btrim(p_name),
    strategy_id = p_strategy_id,
    pair = upper(btrim(p_pair)),
    tags = array(
      select distinct btrim(tag)
      from unnest(coalesce(p_tags, '{}'::text[])) as tag
      where btrim(tag) <> ''
      limit 20
    ),
    account_size = p_account_size,
    report_filename = case
      when p_metrics is null then report_filename
      else p_report_filename
    end,
    report_path = case
      when p_metrics is null then report_path
      else p_report_path
    end
  where id = p_session_id and user_id = v_user_id;

  if p_metrics is not null then
    delete from public.backtest_session_metrics
    where session_id = p_session_id;

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
      p_session_id,
      metric.category,
      metric.metric_key,
      metric.metric_label,
      metric.scope,
      metric.unit,
      metric.value
    from jsonb_to_recordset(p_metrics) as metric(
      category text,
      metric_key text,
      metric_label text,
      scope text,
      unit text,
      value numeric
    );
  end if;
end;
$$;

grant update (
  name,
  strategy_id,
  pair,
  tags,
  account_size,
  report_filename,
  report_path,
  archived_at
) on table public.backtest_sessions to authenticated;

revoke execute on function public.create_backtest_session(uuid, text, uuid, text, text[], text, text, jsonb, numeric)
  from public, anon;
grant execute on function public.create_backtest_session(uuid, text, uuid, text, text[], text, text, jsonb, numeric)
  to authenticated;

revoke execute on function public.update_backtest_session(uuid, text, uuid, text, text[], numeric, text, text, jsonb)
  from public, anon;
grant execute on function public.update_backtest_session(uuid, text, uuid, text, text[], numeric, text, text, jsonb)
  to authenticated;
