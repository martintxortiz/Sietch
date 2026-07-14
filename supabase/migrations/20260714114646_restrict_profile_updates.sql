revoke update on table public.users from authenticated;
grant update (display_name, avatar_url) on table public.users to authenticated;
