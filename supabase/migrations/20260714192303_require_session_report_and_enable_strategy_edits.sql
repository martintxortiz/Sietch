create policy "users can update their strategies"
on public.strategies for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant update (name, description) on table public.strategies to authenticated;

create or replace function public.import_backtest_session(
  p_session_id uuid,
  p_name text,
  p_strategy_id uuid,
  p_pair text,
  p_tags text[],
  p_source_filename text,
  p_source_path text,
  p_trades jsonb,
  p_report_filename text default null,
  p_report_path text default null,
  p_metrics jsonb default null,
  p_account_size numeric default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_metrics is null
    or p_report_path is null
    or nullif(btrim(p_report_filename), '') is null then
    raise exception 'Both the TradingView CSV and XLSX are required'
      using errcode = '22023';
  end if;

  perform public.create_backtest_session(
    p_session_id,
    p_name,
    p_strategy_id,
    p_pair,
    p_tags,
    p_source_filename,
    p_source_path,
    p_trades,
    p_account_size
  );

  perform public.update_backtest_session(
    p_session_id,
    p_name,
    p_strategy_id,
    p_pair,
    p_tags,
    p_account_size,
    p_report_filename,
    p_report_path,
    p_metrics
  );

  return p_session_id;
end;
$$;
