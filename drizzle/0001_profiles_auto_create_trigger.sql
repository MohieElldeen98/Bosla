-- Automatic profile creation — the authoritative mechanism (see
-- docs/authentication-architecture.md "Profile lifecycle"). A trigger on
-- `auth.users` guarantees a profile row exists no matter how the identity
-- was created (password sign-up, OAuth, magic link, admin invite, the
-- Supabase dashboard) — never dependent on our application code running.
--
-- Idempotent via ON CONFLICT (user_id) DO NOTHING: if application code
-- (ProfileService.bootstrapProfile) already inserted the row in the same
-- request, or this trigger fires twice for any reason, no duplicate is
-- ever created and no error is raised.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    user_id,
    email,
    full_name,
    profession,
    country,
    language,
    role,
    status
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'profession',
    new.raw_user_meta_data ->> 'country',
    coalesce(new.raw_user_meta_data ->> 'language', 'en'),
    'student',
    'pending'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
