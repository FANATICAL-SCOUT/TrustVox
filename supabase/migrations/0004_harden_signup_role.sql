-- TrustVox — Phase 8.1 · Migration 0004: harden signup role assignment (security fix)
--
-- SECURITY: the previous handle_new_user() trusted raw_user_meta_data->>'role',
-- which is attacker-controlled (it comes from the client's supabase.auth.signUp
-- options.data). That let anyone self-register as 'admin'. New accounts are now
-- ALWAYS created as 'user'. Privileged roles (client, admin) are assigned only
-- through a trusted server path using the secret key:
--   • client registration → the 8.2 signup route sets role='client' server-side
--   • admin               → seeded / promoted deliberately, never self-service
--
-- display_name is still taken from metadata (non-privileged, cosmetic).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    'user'  -- always least-privilege; role is elevated only via a trusted path
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
