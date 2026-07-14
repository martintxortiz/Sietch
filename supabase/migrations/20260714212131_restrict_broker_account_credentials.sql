revoke select on table public.broker_accounts from authenticated;

grant select (
  id,
  user_id,
  provider,
  start_date,
  server,
  login,
  account_name,
  status,
  currency,
  balance,
  equity,
  last_synced_at,
  sync_error,
  created_at,
  updated_at
) on table public.broker_accounts to authenticated;
