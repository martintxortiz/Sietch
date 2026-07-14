create schema if not exists private;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.settings enable row level security;

create policy "users can read their profile"
on public.users for select
to authenticated
using ((select auth.uid()) = id);

create policy "users can update their profile"
on public.users for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "users can read their settings"
on public.settings for select
to authenticated
using ((select auth.uid()) = user_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(split_part(new.email, '@', 1), ''),
        'User'
      ),
      80
    ),
    left(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
        nullif(new.raw_user_meta_data ->> 'picture', '')
      ),
      2048
    )
  );

  insert into public.settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row execute function private.set_updated_at();

create trigger settings_set_updated_at
before update on public.settings
for each row execute function private.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

grant select, update on table public.users to authenticated;
grant select on table public.settings to authenticated;
