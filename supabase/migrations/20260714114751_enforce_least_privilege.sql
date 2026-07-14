revoke all on table public.users from anon;
revoke all on table public.settings from anon;
revoke execute on function private.set_updated_at() from public, anon, authenticated;
revoke execute on function private.handle_new_user() from public, anon, authenticated;
