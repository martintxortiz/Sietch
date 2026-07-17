alter table public.strategies
  add column if not exists tags text[] not null default '{}',
  add column if not exists archived_at timestamptz;

alter table public.strategies
  drop constraint if exists strategies_tags_limit,
  add constraint strategies_tags_limit check (cardinality(tags) <= 20);

create index if not exists strategies_user_archived_idx
  on public.strategies (user_id, archived_at, created_at desc);

create or replace function public.validate_active_backtest_strategy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.strategy_id is distinct from old.strategy_id then
    if not exists (
      select 1
      from public.strategies
      where id = new.strategy_id
        and user_id = new.user_id
        and archived_at is null
    ) then
      raise exception 'Choose an active strategy' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_active_backtest_strategy on public.backtest_sessions;
create trigger validate_active_backtest_strategy
before insert or update of strategy_id on public.backtest_sessions
for each row execute function public.validate_active_backtest_strategy();

create policy "users can delete their strategies"
on public.strategies for delete
to authenticated
using ((select auth.uid()) = user_id);

grant update (name, description, tags, archived_at)
  on table public.strategies to authenticated;
grant delete on table public.strategies to authenticated;

create or replace function public.archive_strategy(p_strategy_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.strategies
  set archived_at = now()
  where id = p_strategy_id
    and user_id = (select auth.uid())
    and archived_at is null;

  if not found then
    raise exception 'Active strategy not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.delete_strategy(p_strategy_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.backtest_sessions
    where strategy_id = p_strategy_id
      and user_id = (select auth.uid())
  ) then
    raise exception 'Archive this strategy instead; it is used by existing sessions'
      using errcode = '23503';
  end if;

  delete from public.strategies
  where id = p_strategy_id
    and user_id = (select auth.uid());

  if not found then
    raise exception 'Strategy not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.archive_strategy(uuid) from public, anon;
grant execute on function public.archive_strategy(uuid) to authenticated;
revoke execute on function public.delete_strategy(uuid) from public, anon;
grant execute on function public.delete_strategy(uuid) to authenticated;
