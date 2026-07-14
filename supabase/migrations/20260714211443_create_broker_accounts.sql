create table public.broker_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('metatrader5')),
  start_date date not null default current_date check (start_date <= current_date),
  server text not null check (char_length(btrim(server)) between 1 and 120),
  login text not null check (login ~ '^[0-9]{1,32}$'),
  credential_secret_id uuid not null,
  account_name text check (account_name is null or char_length(account_name) <= 160),
  status text not null default 'pending' check (status in ('pending', 'connected', 'error')),
  currency text check (currency is null or char_length(currency) <= 16),
  balance numeric,
  equity numeric,
  last_synced_at timestamptz,
  sync_error text check (sync_error is null or char_length(sync_error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, server, login)
);

create index broker_accounts_user_created_idx
  on public.broker_accounts (user_id, created_at desc);

create table public.broker_deals (
  account_id uuid not null references public.broker_accounts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  provider_deal_id text not null,
  provider_order_id text,
  provider_position_id text,
  executed_at timestamptz not null,
  time_msc bigint not null,
  type smallint not null,
  entry smallint not null,
  reason smallint not null,
  symbol text not null,
  volume numeric not null,
  price numeric not null,
  commission numeric not null default 0,
  swap numeric not null default 0,
  profit numeric not null default 0,
  fee numeric not null default 0,
  magic bigint not null default 0,
  comment text not null default '',
  external_id text not null default '',
  raw jsonb not null default '{}'::jsonb check (jsonb_typeof(raw) = 'object'),
  created_at timestamptz not null default now(),
  primary key (account_id, provider_deal_id)
);

create index broker_deals_user_executed_idx
  on public.broker_deals (user_id, executed_at desc);

create index broker_deals_account_executed_idx
  on public.broker_deals (account_id, executed_at desc);

alter table public.broker_accounts enable row level security;
alter table public.broker_deals enable row level security;

create policy "users can read their broker accounts"
on public.broker_accounts for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can read their broker deals"
on public.broker_deals for select
to authenticated
using ((select auth.uid()) = user_id);

create trigger broker_accounts_set_updated_at
before update on public.broker_accounts
for each row execute function private.set_updated_at();

create function public.create_broker_account(
  p_provider text,
  p_start_date date,
  p_server text,
  p_login text,
  p_investor_password text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := gen_random_uuid();
  owner_id uuid := auth.uid();
  secret_id uuid;
begin
  if owner_id is null then
    raise exception 'Authentication required';
  end if;

  if p_provider <> 'metatrader5' then
    raise exception 'Unsupported broker provider';
  end if;

  if p_start_date is null or p_start_date > current_date then
    raise exception 'Start date must be today or earlier';
  end if;

  if char_length(btrim(coalesce(p_server, ''))) not between 1 and 120 then
    raise exception 'Server is required';
  end if;

  if coalesce(p_login, '') !~ '^[0-9]{1,32}$' then
    raise exception 'Login must contain only numbers';
  end if;

  if char_length(coalesce(p_investor_password, '')) not between 1 and 256 then
    raise exception 'Investor password is required';
  end if;

  secret_id := vault.create_secret(
    p_investor_password,
    'broker-account-' || account_id::text,
    'Backview broker investor password'
  );

  insert into public.broker_accounts (
    id,
    user_id,
    provider,
    start_date,
    server,
    login,
    credential_secret_id
  ) values (
    account_id,
    owner_id,
    p_provider,
    p_start_date,
    btrim(p_server),
    p_login,
    secret_id
  );

  return account_id;
end;
$$;

create function public.worker_broker_accounts()
returns table (
  account_id uuid,
  user_id uuid,
  provider text,
  start_date date,
  server text,
  login text,
  investor_password text,
  last_synced_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    account.id,
    account.user_id,
    account.provider,
    account.start_date,
    account.server,
    account.login,
    secret.decrypted_secret,
    account.last_synced_at
  from public.broker_accounts as account
  join vault.decrypted_secrets as secret
    on secret.id = account.credential_secret_id
  order by account.created_at;
$$;

create function private.delete_broker_account_secret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets where id = old.credential_secret_id;
  return old;
end;
$$;

create trigger broker_accounts_delete_secret
after delete on public.broker_accounts
for each row execute function private.delete_broker_account_secret();

revoke all on table public.broker_accounts from public, anon;
revoke all on table public.broker_deals from public, anon;
grant select on table public.broker_accounts to authenticated;
grant select on table public.broker_deals to authenticated;
grant select, insert, update, delete on table public.broker_accounts to service_role;
grant select, insert, update, delete on table public.broker_deals to service_role;

revoke execute on function public.create_broker_account(text, date, text, text, text)
  from public, anon;
grant execute on function public.create_broker_account(text, date, text, text, text)
  to authenticated;

revoke execute on function public.worker_broker_accounts()
  from public, anon, authenticated;
grant execute on function public.worker_broker_accounts()
  to service_role;

revoke execute on function private.delete_broker_account_secret()
  from public, anon, authenticated;
