create policy "users can update trades from their sessions"
on public.backtest_trades for update
to authenticated
using (
  exists (
    select 1
    from public.backtest_sessions
    where backtest_sessions.id = backtest_trades.session_id
      and backtest_sessions.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.backtest_sessions
    where backtest_sessions.id = backtest_trades.session_id
      and backtest_sessions.user_id = (select auth.uid())
  )
);

grant update (entry_signal, exit_signal)
  on table public.backtest_trades to authenticated;
