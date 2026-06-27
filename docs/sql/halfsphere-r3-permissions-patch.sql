-- HalfSphere R3 permission patch.
-- Safe to run after docs/sql/halfsphere-central-membership.sql.
-- Adds product grants, SGSYEN seed data, plan feature flags, and a safer free activation RPC.

alter table public.hs_products enable row level security;
alter table public.hs_user_profiles enable row level security;
alter table public.hs_membership_plans enable row level security;
alter table public.hs_subscriptions enable row level security;
alter table public.hs_membership_events enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.hs_products, public.hs_membership_plans to anon, authenticated;
grant select on public.hs_user_profiles, public.hs_subscriptions,
  public.hs_membership_events, public.hs_current_memberships to authenticated;

insert into public.hs_products (code, name, public_name) values
  ('halfsphere', 'HalfSphere', 'HS Auth'),
  ('gyenbox', 'GyenBox', 'GyenBox'),
  ('gsyen', 'GSYEN', 'GSYEN'),
  ('sgsyen', 'SGSYEN', 'SGSYEN')
on conflict (code) do update set
  name = excluded.name,
  public_name = excluded.public_name,
  is_active = true,
  updated_at = now();

insert into public.hs_membership_plans (
  product_code, code, name, description, storage_quota_bytes,
  monthly_price_cents, annual_price_cents, max_devices,
  max_file_size_bytes, ai_credits_monthly, features, sort_order
) values
  (
    'halfsphere', 'free', 'Free', 'Base HalfSphere account.',
    0, 0, 0, 1, 0, 0,
    '{"auth":true,"admin_console":false}'::jsonb,
    10
  ),
  (
    'gyenbox', 'free', 'Free', 'Starter private sync box.',
    10737418240, 0, 0, 1, 1073741824, 50,
    '{"desktop_sync":true,"web_upload":true,"share_links":true,"ai_search":false,"version_history_days":7}'::jsonb,
    10
  ),
  (
    'gyenbox', 'plus', 'Plus', 'Personal file territory with more storage.',
    107374182400, 999, 9900, 3, 10737418240, 500,
    '{"desktop_sync":true,"web_upload":true,"share_links":true,"ai_search":true,"version_history_days":30}'::jsonb,
    20
  ),
  (
    'gyenbox', 'professional', 'Professional', 'Power-user sync, share, and AI search.',
    1099511627776, 1999, 19900, 10, 53687091200, 5000,
    '{"desktop_sync":true,"web_upload":true,"share_links":true,"ai_search":true,"priority_sync":true,"version_history_days":180}'::jsonb,
    30
  ),
  (
    'gyenbox', 'business', 'Business', 'Team territory with pooled storage.',
    5497558138880, 4999, 49900, 50, 107374182400, 25000,
    '{"desktop_sync":true,"web_upload":true,"share_links":true,"ai_search":true,"team_admin":true,"priority_sync":true,"version_history_days":365}'::jsonb,
    40
  ),
  (
    'gsyen', 'free', 'Free', 'Starter GSYEN access.',
    0, 0, 0, 1, 0, 50,
    '{"ai_chat":true,"advanced_models":false,"workspace_count":1,"export":true}'::jsonb,
    10
  ),
  (
    'gsyen', 'plus', 'Plus', 'Expanded GSYEN workspace access.',
    0, 999, 9900, 3, 0, 500,
    '{"ai_chat":true,"advanced_models":true,"workspace_count":5,"export":true}'::jsonb,
    20
  ),
  (
    'sgsyen', 'free', 'Free', 'Starter SGSYEN access.',
    0, 0, 0, 1, 0, 50,
    '{"ai_chat":true,"advanced_models":false,"workspace_count":1,"export":true}'::jsonb,
    10
  ),
  (
    'sgsyen', 'plus', 'Plus', 'Expanded SGSYEN access.',
    0, 999, 9900, 3, 0, 500,
    '{"ai_chat":true,"advanced_models":true,"workspace_count":5,"export":true}'::jsonb,
    20
  )
on conflict (product_code, code) do update set
  name = excluded.name,
  description = excluded.description,
  storage_quota_bytes = excluded.storage_quota_bytes,
  monthly_price_cents = excluded.monthly_price_cents,
  annual_price_cents = excluded.annual_price_cents,
  max_devices = excluded.max_devices,
  max_file_size_bytes = excluded.max_file_size_bytes,
  ai_credits_monthly = excluded.ai_credits_monthly,
  features = excluded.features,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

create or replace function public.hs_activate_free_membership(target_product_code text)
returns public.hs_current_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  plan_row public.hs_membership_plans%rowtype;
  result_row public.hs_current_memberships%rowtype;
  inserted_subscription_id uuid;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  if target_product_code not in ('halfsphere', 'gyenbox', 'gsyen', 'sgsyen') then
    raise exception 'free activation is not enabled for product %', target_product_code;
  end if;

  select * into plan_row
  from public.hs_membership_plans
  where product_code = target_product_code and code = 'free' and is_active = true
  limit 1;

  if plan_row.id is null then
    raise exception 'free plan not found for product %', target_product_code;
  end if;

  insert into public.hs_user_profiles (user_id, email)
  select current_user_id, u.email from auth.users u where u.id = current_user_id
  on conflict (user_id) do update set email = excluded.email, updated_at = now();

  insert into public.hs_subscriptions (user_id, product_code, plan_id, status, provider)
  select current_user_id, target_product_code, plan_row.id, 'active', 'manual'
  where not exists (
    select 1 from public.hs_subscriptions
    where user_id = current_user_id
      and product_code = target_product_code
      and status in ('trialing', 'active', 'past_due')
  )
  returning id into inserted_subscription_id;

  if inserted_subscription_id is not null then
    insert into public.hs_membership_events (user_id, product_code, event_type, next_plan_code)
    values (current_user_id, target_product_code, 'free_membership_activated', 'free');
  end if;

  select * into result_row
  from public.hs_current_memberships
  where user_id = current_user_id and product_code = target_product_code
  limit 1;

  return result_row;
end;
$$;

revoke all on function public.hs_activate_free_membership(text) from public;
grant execute on function public.hs_activate_free_membership(text) to authenticated;
