create function public.validate_backtest_source_paths()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.source_path is null then
    raise exception 'Source path is required' using errcode = '23514';
  end if;

  if new.source_path is not null
    and new.source_path <> format('%s/%s/trades.csv', new.user_id, new.id) then
    raise exception 'Invalid source path' using errcode = '23514';
  end if;

  if (new.report_filename is null) <> (new.report_path is null)
    or new.report_path is not null
      and new.report_path not like format('%s/%s/report-%%.xlsx', new.user_id, new.id) then
    raise exception 'Invalid report path' using errcode = '23514';
  end if;

  if new.report_path is null and exists (
    select 1 from public.backtest_session_metrics where session_id = new.id
  ) then
    raise exception 'A report source is required for stored metrics' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger validate_backtest_source_paths
before insert or update of source_path, report_filename, report_path
on public.backtest_sessions
for each row execute function public.validate_backtest_source_paths();

revoke execute on function public.validate_backtest_source_paths() from public;
