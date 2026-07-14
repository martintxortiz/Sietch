create function public.import_backtest_session(
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
  if (p_metrics is null) <> (p_report_path is null)
    or (p_report_filename is null) <> (p_report_path is null) then
    raise exception 'Upload the CSV alone or the CSV and XLSX together'
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

  if p_metrics is not null then
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
  end if;

  return p_session_id;
end;
$$;

revoke execute on function public.import_backtest_session(
  uuid, text, uuid, text, text[], text, text, jsonb, text, text, jsonb, numeric
) from public, anon;

grant execute on function public.import_backtest_session(
  uuid, text, uuid, text, text[], text, text, jsonb, text, text, jsonb, numeric
) to authenticated;
